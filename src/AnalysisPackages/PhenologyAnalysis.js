import React from "react";
import L from "leaflet"
import { BarLoader } from "react-spinners"
import { RadioButton } from "../CustomRadio/CustomRadio"
import "./AnalysisPackages.css";
import withSharedAnalysisCharacteristics from "./AnalysisPackage"

const SB_URL = "https://www.sciencebase.gov/catalog/item/5b96d589e4b0702d0e82700a?format=json"

let sb_properties = {
    "title": "Phenology Forecasts"
}

let baseLegendUrl = "https://geoserver.usanpn.org/geoserver/gdd/wms?service=wms&request=GetLegendGraphic&format=image%2Fpng"

let layers = [
     {
        title: "Phenocasts",
        layer: L.tileLayer.wms(
            "https://geoserver.usanpn.org/geoserver/gdd/wms",
            {
                format: "image/png",
                opacity: .5,
                transparent: true
            }
        ),
        legend: {
            imageUrl: ""
        },
        checked: true,
        hideCheckbox: true
    }
]

class PhenologyAnalysisPackage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            dates: [{ name: 'Current', date: new Date() }, { name: 'Six-Day', date: new Date(new Date().getTime() + 6 * 86400000) }],
            charts: [],
            refs: [],
            error: false,
            loading: false,
            canSubmit: false,
            didSubmit: false,
            selectedIndex: 0
        }

        this.getCharts = this.getCharts.bind(this)
        this.getFetchForDate = this.getFetchForDate.bind(this)
        this.getFetch = this.getFetch.bind(this)
        this.submitAnalysis = this.submitAnalysis.bind(this)
        this.clearCharts = this.clearCharts.bind(this)
        this.print = this.print.bind(this)
        this.getFormattedDate = this.getFormattedDate.bind(this)
        this.toggleRadioBtn = this.toggleRadioBtn.bind(this)
        this.turnOnLayer = this.turnOnLayer.bind(this)
        this.featureChange = this.featureChange.bind(this)
        this.createUniqueBapContents = this.createUniqueBapContents.bind(this)
    }

    componentDidMount() {
        this.props.onRef(this)
        this.featureChange()
        if (this.props.initBap) {
            this.setState({
                didSubmit: this.props.initBap.didSubmit,
                selectedIndex : this.props.initBap.selectedIndex
            })
            if (this.props.initBap.didSubmit) {
                setTimeout(() => this.submitAnalysis(), 3000)
            }
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.feature !== this.props.feature) {
            this.clearCharts()
            this.featureChange()
        }
        this.props.setShareState({
            didSubmit: this.state.didSubmit,
            selectedIndex : this.state.selectedIndex
        })
    }

    featureChange() {
        if (this.props.feature) {
            if(this.props.feature.properties.feature_id.includes('OBIS_Areas')){
                this.props.isEnabled(false)
                this.props.canOpen(false)
            }
            else {
                this.props.isEnabled(true)
                this.props.canOpen(true)
                this.submitAnalysis()
            }
        }
        else {
            this.props.canOpen(false)
            this.props.isEnabled(true)
        }
    }

    clearCharts() {
        this.setState({
            data: null,
            charts: [],
            refs: [],
            canSubmit: false,
            didSubmit: false
        })
    }

    turnOnLayer(layer, style, date) {
        layers[0]["legend"]["imageUrl"] = baseLegendUrl + `&layer=${layer}&style=${style}`

        // this will get flipped to turn on the layer in analysysPackage 
        layers[0].checked = false
        this.props.toggleLayer(layers[0])

        layers[0]["layer"].setParams({
            layers: layer,
            styles: style,
            time: this.getFormattedDate(date)
        })
    }

    toggleRadioBtn(index) {
        this.getCharts(this.state.data, index)
        this.setState({
            selectedIndex : index
        })
    }

    getFormattedDate(date) {
        const year = date.getFullYear()
        let month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`
    }


    getFetchForDate(url, date) {
        const formattedDate = this.getFormattedDate(date)
        return fetch(`${url}&date=${formattedDate}`)
            .then(res => { return res.json() },
                (error) => {
                    this.setState({
                        error: true
                    });
                })
    }

    getFetch(url) {
        return fetch(url)
            .then(res => { return res.text() })
            .then(str => new DOMParser().parseFromString(str, 'text/xml'))
            .catch(error => {
                this.setState({
                    error: true
                });
            })
    }

    submitAnalysis() {

        const htmlCollectionForEach = (collection, cb) => {
            for(let i = 0; i < collection.length; i++) {
                const el = collection[i]
                cb(el)
            }
        }

        const parseSld = sld => {
            let sldJson = {
                layer: sld.getElementsByTagName('sld:Name')[0].textContent,
                styles: []
            }
            const userStyles = sld.getElementsByTagName('sld:UserStyle')
            htmlCollectionForEach(userStyles, style => {
                const name = style.getElementsByTagName('sld:Name')[0].textContent
                const title = style.getElementsByTagName('sld:Title')[0].textContent
                const styles = []
                htmlCollectionForEach(style.getElementsByTagName('sld:ColorMapEntry'), colorMapEntry => {
                    const attributes = colorMapEntry.attributes
                    const label = attributes.label.textContent
                    if (!label || label === 'ignore') {
                        return
                    }
                    styles.push({
                        label: label,
                        color: attributes.color.textContent,
                        quantity: attributes.quantity.textContent
                    })
                })
                sldJson.styles.push({
                    name: name,
                    title: title,
                    colorMapEntries: styles
                })
            })
            return sldJson
        }

        this.setState({
            loading: true,
            error: false
        })
        let fetches = [
            this.getFetch(`http://geoserver.usanpn.org/geoserver/gdd/wms?layers=agdd&request=GetStyles&service=wms&version=1.1.1`),
            this.getFetch(`http://geoserver.usanpn.org/geoserver/gdd/wms?layers=agdd_50f&request=GetStyles&service=wms&version=1.1.1`)
        ]
        Promise.all(fetches).then(results => {
            if (results) {
                const slds = results.map(res => {
                    return parseSld(res)
                })
                this.setState({
                    data: slds,
                    loading: false,
                    didSubmit: true
                }, () => {
                    this.getCharts(this.state.data, this.state.selectedIndex)
                })
            } else {
                this.props.isEnabled(false)
                this.props.canOpen(false)
            }
        })
    }

    /**
     * Loop through the charts defined in the state.
     * Create the chart id, data, and config as documented in the chart type.
     * @param {Object {}} data
     */
    getCharts(data, idx) {
        let selectedIndex = idx;
        if (!selectedIndex) selectedIndex = 0;

        try {

            const getControl = (timeLabel, layerName, date, style, i) => {
                return (
                    <div key={`${layerName}${i}`} className="nbm-flex-row-no-padding" style={{ borderBottom: "1px solid gray" }}>
                        <div>{`${timeLabel}  ${this.getFormattedDate(date)}`}</div>
                        <div style={{ justifyContent: "center", paddingRight: "5px" }} className="nbm-flex-column">
                            <RadioButton
                                isChecked={(selectedIndex === i)}
                                value={[layerName, style, date]}
                                index={i}
                                handler={this.toggleRadioBtn.bind(this)}
                            />
                        </div>
                    </div>
                )
            }

            let chartData = [
                {
                    name: 'agdd_50f',
                    times: [
                        {label: 'Current'},
                        {label: 'Six-Day'}
                    ],
                    species: [
                        {name: 'Apple Maggot'},
                        {name: 'Emerald Ash Borer'},
                        {name: 'Lilac Borer'},
                        {name: 'Winter Moth'}
                    ]
                },
                {
                    name: 'agdd',
                    times: [
                        {label: 'Current'},
                        {label: 'Six-Day'}
                    ],
                    species: [
                        {name: 'Hemlock Woolly Adelgid'}
                    ]
                }
            ]

            let charts = []
            let refs = []
            let i = 0;
            chartData.forEach(layer => {
                const layerName = layer.name
                const sld = data.find(sld => sld.layer === layerName)
                layer.species.forEach(species => {
                    const speciesName = species.name
                    const styleName = speciesName.toLowerCase().replace(/\s/g, '_')
                    const controls = []
                    layer.times.forEach(time => {
                        const timeLabel = time.label
                        const timeIndex = timeLabel === 'Current' ? 0 : 1
                        const date = this.state.dates[timeIndex].date
                        controls.push(getControl(timeLabel, layerName, date, styleName, i))
                        if (selectedIndex === i) {
                            this.turnOnLayer(layerName, styleName, date)
                        }
                        i++
                    })
                    const styles = []
                    if (sld) {
                        const style = sld.styles.find(s => s.name === styleName)
                        if (style) {
                            style.colorMapEntries.forEach(colorMapEntry => {
                                styles.push((
                                    <div key={`${style}_${colorMapEntry.quantity}`} className="mb-2">
                                        <div className="d-inline-block mr-2" style={{width:'20px', height:'20px', backgroundColor: colorMapEntry.color}}>&nbsp;</div>
                                        <div className="d-inline">{colorMapEntry.label}</div>
                                    </div>
                                ))
                            })
                        }
                    }
                    let chartId = `PHENO_${speciesName.replace(/\s/g, '')}`
                    charts.push(
                        <div key={chartId}>
                        <div className="title">{speciesName}</div>
                        {
                            styles.length ? 
                                (<div className="m-4 p-2" style={{border: '1px solid gray'}}>
                                    {styles}
                                </div>) :
                                (<div className="text-center">
                                    <img src={baseLegendUrl + `&layer=${layerName}&style=${styleName}`} alt="Legend" style={{maxWidth: '100%'}}></img>
                                </div>)
                        }
                        {controls}
                        </div>
                    )
                })
            })
            this.setState({
                charts: charts,
                refs: refs
            })

        }
        catch (error) {
            console.log(error)
            this.setState({
                error: true,
                loading: false
            });
            return null
        }
    }

    print() {
        if (this.state.refs.length && this.props.isOpen) {
            let charts = []
            for (let i = 0; i < this.state.refs.length; i++) {
                charts.push(this.state.refs[i].print(this.state.refs[i].props.id))
            }

            return Promise.all(charts.flat()).then(contents => {
                let content = []
                content.push({ stack: this.props.getSBItemForPrint() })

                for (let i = 0; i < this.state.refs.length; i += 2) {
                    content.push({ text: this.state.refs[i].props.config.chart.title, style: 'chartTitle', margin: [5, 5, 5, 5] })
                    content.push({
                        columns: [
                            {
                                width: 'auto',
                                stack: [
                                    { image: contents[i], alignment: 'center', width: 250, height: 110 }
                                ]
                            },
                            {
                                width: 'auto',
                                stack: [
                                    { image: contents[i + 1], alignment: 'center', width: 250, height: 110 }
                                ]
                            }
                        ]
                    })
                }
                content.push({ text: 'Phenology Forecasts data were provided by the', style: 'annotation', margin: [5, 10, 5, 0] })
                content.push({ text: 'USA National Phenology Network', style: 'annotationLink', margin: [5, 0, 5, 0], link: 'https://www.usanpn.org' })
                content.push({ text: `Data retrieved ${new Date().toDateString()}`, style: 'annotation', margin: [5, 0, 5, 0] })

                return content
            })
        }
        return []
    }

    createUniqueBapContents() {
        return (
            <div>
                {this.props.getAnalysisLayers()}
                {this.props.handleBapError(this.state.error)}
                <div className="chartsDiv p-2">
                    {this.state.charts}
                    <div className="chart-footers" >
                        <div className="anotations">
                            Phenology Forecasts data were provided by the <a href="https://www.usanpn.org">USA National Phenology Network</a>, data retrieved {new Date().toDateString()}
                            <br></br>
                            <br></br>
                            <a target={"_blank"} href={"https://geoserver.usanpn.org/geoserver/si-x/wms?request=GetCapabilities&service=WMS&layers=agdd_50f,agdd"}>https://geoserver.usanpn.org/geoserver/si-x/wms?request=GetCapabilities&amp;service=WMS&amp;layers=agdd_50f,agdd</a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    render() {
        return (
            <div>
                <BarLoader width={100} widthUnit={"%"} color={"white"} loading={this.state.loading} />
                {this.props.getBapContents(this.createUniqueBapContents)}
            </div>

        )
    }


}
const PhenologyAnalysis = withSharedAnalysisCharacteristics(
    PhenologyAnalysisPackage,
    layers,
    sb_properties,
    SB_URL);

export default PhenologyAnalysis;
