import React from "react";
import L from "leaflet"
import { BarLoader } from "react-spinners"
import { TiledMapLayer } from "esri-leaflet";

import withSharedAnalysisCharacteristics from "./AnalysisPackage"
import PieChart from "../Charts/PieChart"
import TableChart from "../Charts/TableChart"

import "./AnalysisPackages.css";

const SB_URL = "https://www.sciencebase.gov/catalog/item/5b86d48ce4b0702d0e7962b5?format=json"
const SPECIES_URL = process.env.REACT_APP_BIS_API + "/api/v1/gapmetrics/species/protection?feature_id=";

let sb_properties = {
    "title": "Protection Status of Terrestrial Vertebrate Species"
}

const layers = {
    gap_status: {
        title: "PAD-US v1.4 GAP Status Code",
        layer: new TiledMapLayer({
            url: "https://gis1.usgs.gov/arcgis/rest/services/PADUS1_4/GAP_Status_Code/MapServer",
            opacity: .5
        }),
        checked: false
    },
    species_range: {
        title: "Species Range",
        layer: L.tileLayer.wms(
            "https://www.sciencebase.gov/geoserver/CONUS_Range_2001/wms",
            {
                format: "image/png",
                opacity: .5,
                transparent: true
            }
        ),
        checked: false,
        hideCheckbox: true
    },
    habitat_map: {
        title: "Habitat Map",
        layer: L.tileLayer.wms(
            "https://www.sciencebase.gov/geoserver/CONUS_HabMap_2001/wms",
            {
                format: "image/png",
                opacity: .5,
                transparent: true
            }
        ),
        checked: false,
        hideCheckbox: true
    }
}

class SpeciesProtectionAnalysisPackage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            charts: {
                gap12: { id: "", config: {}, data: null },
                gap123: { id: "", config: {}, data: null },
                gapTable: { id: "", config: {}, data: null }
            },
            data: null,
            taxaLetter: "ALL",
            gapStatus: "ALL",
            gapRange: "ALL",
            enabledLayers: {
                nfhp_service: false
            },
            layers: layers,
            value: []
        }

        this.getCharts = this.getCharts.bind(this)
        this.onSpeciesChanged = this.onSpeciesChanged.bind(this)
        this.resetSppTable = this.resetSppTable.bind(this)
        this.filterTableData = this.filterTableData.bind(this)
        this.changeFilter = this.changeFilter.bind(this)
    }

    componentDidUpdate(prevProps) {
        if (this.props.feature &&
            this.props.feature.properties.feature_id &&
            (!prevProps.feature || this.props.feature.properties.feature_id !== prevProps.feature.properties.feature_id)) {
            this.setState({
                loading: true
            })
            fetch(SPECIES_URL + this.props.feature.properties.feature_id)
                .then(res => res.json())
                .then(
                    (result) => {
                        if (result && result.success) {
                            const charts = this.getCharts(result.result)
                            this.setState({
                                charts: charts,
                                data: result.result,
                                loading: false,
                            })
                            this.props.isEnabled(true)
                            this.props.canOpen(true)
                        } else {
                            this.setState({
                                charts: {
                                    gap12: { id: "", config: {}, data: null },
                                    gap123: { id: "", config: {}, data: null },
                                    gapTable: { id: "", config: {}, data: null }
                                },
                                enabledLayers: {
                                    nfhp_service: false,
                                    loading: false
                                },
                            })
                            this.props.isEnabled(false)
                            this.props.canOpen(false)
                            this.props.resetAnalysisLayers()
                        }
                    },
                    (error) => {
                        this.setState({
                            error,
                            loading: false
                        });
                    }
                )
        }

        if (prevProps.priorityBap !== this.props.priorityBap) {
            if (this.props.priorityBap !== this.props.bapId) {
                let l = layers;
                let that = this;
                Object.keys(l).forEach(function(key) {
                    l[key].checked = false
                    if (that.inputRefs) {
                        that.inputRefs[key].checked = false
                    }
                })

                this.setState({
                    layers: l
                })
            }
        }
    }

    changeFilter(e, layerKey) {
        let otherKey = layerKey === "species_range" ? "habitat_map" : "species_range"
        let layer = this.state.layers[layerKey]
        layer.layer.setParams({
            layers: e.currentTarget.value
        })

        this.props.inputRefs[layerKey].checked = true
        this.props.inputRefs[otherKey].checked = false
        this.props.updateBapLayers()
    }

    getCharts(data) {
        let that = this;
        let charts = {}
        let dataTemplate = {
            status_1_2: [
                { color: 'rgb(102,0,0)', count: 0, name: '< 1%', percent: 0.0, status: 'status_1_2_group', range: '<1' },
                { color: 'rgb(255,0,0)', count: 0, name: '1 - 10%', percent: 0.0, status: 'status_1_2_group', range: '1-10' },
                { color: 'rgb(237,203,98)', count: 0, name: '10 - 17%', percent: 0.0, status: 'status_1_2_group', range: '10-17' },
                { color: 'rgb(156,203,25)', count: 0, name: '17 - 50%', percent: 0.0, status: 'status_1_2_group', range: '17-50' },
                { color: 'rgb(34,139,34)', count: 0, name: '> 50%', percent: 0.0, status: 'status_1_2_group', range: '>50' },
            ],
            status_1_2_3: [
                { color: 'rgb(102,0,0)', count: 0, name: '< 1%', percent: 0.0, status: 'status_1_2_3_group', range: '<1' },
                { color: 'rgb(255,0,0)', count: 0, name: '1 - 10%', percent: 0.0, status: 'status_1_2_3_group', range: '1-10' },
                { color: 'rgb(237,203,98)', count: 0, name: '10 - 17%', percent: 0.0, status: 'status_1_2_3_group', range: '10-17' },
                { color: 'rgb(156,203,25)', count: 0, name: '17 - 50%', percent: 0.0, status: 'status_1_2_3_group', range: '17-50' },
                { color: 'rgb(34,139,34)', count: 0, name: '> 50%', percent: 0.0, status: 'status_1_2_3_group', range: '>50' },
            ],
            species: {
                all: [],
                amphibian_species: [],
                bird_species: [],
                mammal_species: [],
                reptile_species: []
            }
        }

        for (let row of data) {
            let c = {
                common_name: row.spp_comname ? row.spp_comname : "",
                scientific_name: row.spp_sciname ? row.spp_sciname : "",
                status_1_2: row.gapstat12perc,
                status_1_2_3: row.gapstat123perc,
                taxaletter: row.taxa,
                sppcode: row.sppcode,
                status_1_2_group: row.gapstat12group,
                status_1_2_3_group: row.gapstat123group
            }
            dataTemplate.species.all.push(c)
            if (c.taxaletter === 'A') dataTemplate.species.amphibian_species.push(c)
            if (c.taxaletter === 'B') dataTemplate.species.bird_species.push(c)
            if (c.taxaletter === 'M') dataTemplate.species.mammal_species.push(c)
            if (c.taxaletter === 'R') dataTemplate.species.reptile_species.push(c)

            let total = data.length

            if (row.gapstat12group === '<1' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2[0].count += 1
            else if (row.gapstat12group === '1-10' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2[1].count += 1
            else if (row.gapstat12group === '10-17' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2[2].count += 1
            else if (row.gapstat12group === '17-50' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2[3].count += 1
            else if (row.gapstat12group === '>50' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2[4].count += 1

            if (row.gapstat123group === '<1' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2_3[0].count += 1
            else if (row.gapstat123group === '1-10' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2_3[1].count += 1
            else if (row.gapstat123group === '10-17' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2_3[2].count += 1
            else if (row.gapstat123group === '17-50' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2_3[3].count += 1
            else if (row.gapstat123group === '>50' && (this.state.taxaLetter === 'ALL' || this.state.taxaLetter === c.taxaletter)) dataTemplate.status_1_2_3[4].count += 1

            dataTemplate.status_1_2.forEach(x => {
                x.percent = parseFloat(x.count / total) * 100
            })
            dataTemplate.status_1_2_3.forEach(x => {
                x.percent = parseFloat(x.count / total) * 100
            })
        }

        for (let chart of Object.keys(this.state.charts)) {
            if (chart.toString() === "gap12" && data) {
                const chartId = "SP_GAP12"
                const chartConfig = {
                    margins: { left: 20, right: 20, top: 20, bottom: 125 },
                    chart: { title: `GAP Status 1 & 2`, subtitle: `` },
                    tooltip: { label: (d) => { return `<p><div>${d.data.name}</div><div>${d.data.count} species</div></p>` } },
                    legend: { rectSize: 12, spacing: 4, leftOffset: 6, fontSize: 'smaller' },
                    onClick: (d) => { this.filterTableData(d) }
                }
                const chartData = dataTemplate.status_1_2
                charts[chart] = { id: chartId, config: chartConfig, data: chartData }
            }
            else if (chart.toString() === "gap123" && data) {
                const chartId = "SP_GAP123"
                const chartConfig = {
                    margins: { left: 20, right: 20, top: 20, bottom: 125 },
                    chart: { title: `GAP Status 1, 2 & 3`, subtitle: `` },
                    tooltip: { label: (d) => { return `<p><div>${d.data.name}</div><div>${d.data.count} species</div></p>` } },
                    legend: { rectSize: 12, spacing: 4, leftOffset: 6, fontSize: 'smaller' },
                    onClick: (d) => { this.filterTableData(d) }

                }
                const chartData = dataTemplate.status_1_2_3
                charts[chart] = { id: chartId, config: chartConfig, data: chartData }
            }
            else if (chart.toString() === "gapTable" && data) {
                const chartId = "SP_GAPTABLE"
                let preData = dataTemplate.species.all
                let tableType = "All Species"
                if (this.state.taxaLetter === 'A') {
                    preData = dataTemplate.species.amphibian_species
                    tableType = "Amphibians";
                } else if (this.state.taxaLetter === 'B') {
                    preData = dataTemplate.species.bird_species
                    tableType = "Birds";
                } else if (this.state.taxaLetter === 'M') {
                    preData = dataTemplate.species.mammal_species
                    tableType = "Mammals";
                } else if (this.state.taxaLetter === 'R') {
                    preData = dataTemplate.species.reptile_species
                    tableType = "Reptiles";
                }

                let chartTitle = `${tableType} in ${this.props.feature.properties.feature_name} (${preData.length})`
                let chartData = [[<span>Species Name</span>, <span></span>, <span>Range</span>, <span>Habitat</span>]]
                let protectedPercent = <span></span>

                if (this.state.gapRange !== 'ALL') {
                    preData = preData.filter((d) => { return d[this.state.gapStatus] === this.state.gapRange })
                    if (this.state.gapStatus === 'status_1_2_group') chartTitle = `${preData.length} Species with ${this.state.gapRange}% within GAP Status 1 & 2 in ${this.props.feature.properties.feature_name}`
                    if (this.state.gapStatus === 'status_1_2_3_group') chartTitle = `${preData.length} Species with ${this.state.gapRange}% within GAP Status 1, 2 & 3 in ${this.props.feature.properties.feature_name}`
                    chartData = [[<span>Species Name</span>, <span>Protected</span>, <span>Range</span>, <span>Habitat</span>]]
                }

                for (let row of preData) {
                    const name = <span>{`${row.common_name} (${row.scientific_name})`}</span>
                    if (this.state.gapRange !== 'ALL') {
                        if (this.state.gapStatus === 'status_1_2_group') protectedPercent = <span>{`${parseFloat(row.status_1_2).toFixed(2)}%`}</span>
                        if (this.state.gapStatus === 'status_1_2_3_group') protectedPercent = <span>{`${parseFloat(row.status_1_2_3).toFixed(2)}%`}</span>
                    }
                    const radio1 = <input
                        id={`Range_${row.sppcode}`}
                        type="radio"
                        name={`sp_radio`}
                        onChange={function(e) {that.changeFilter(e, "species_range")}}
                        value={`${row.common_name} (${row.scientific_name}) ${row.sppcode} v1`} />
                    const radio2 = <input
                        id={`Habitat_${row.sppcode}`}
                        type="radio"
                        name={`sp_radio`}
                        onChange={function(e) {that.changeFilter(e, "habitat_map")}}
                        value={`${row.common_name} (${row.scientific_name}) ${row.sppcode} v1`} />
                    chartData.push([name,protectedPercent, radio1, radio2,])
                }
                const chartConfig = {
                    margins: { left: 20, right: 20, top: 20, bottom: 125 },
                    chart: { title: chartTitle, subtitle: `` },
                }
                charts[chart] = { id: chartId, config: chartConfig, data: chartData }

            }
        }
        return charts
    }

    onSpeciesChanged(e) {
        this.setState({
            taxaLetter: e.currentTarget.value
        }, () => {
            const charts = this.getCharts(this.state.data)
            this.setState({
                charts: charts,
                loading: false
            })
        })
    }

    resetSppTable() {
        this.setState({
            gapStatus: "ALL",
            gapRange: "ALL"
        }, () => {
            const charts = this.getCharts(this.state.data)
            this.setState({
                charts: charts,
                loading: false
            })
        })
    }

    filterTableData(d) {
        this.setState({
            gapStatus: d.status,
            gapRange: d.range
        }, () => {
            const charts = this.getCharts(this.state.data)
            this.setState({
                charts: charts,
                loading: false
            })
        })
    }

    render() {
        return (
                <div>
                    <BarLoader width={100} widthUnit={"%"} color={"white"} loading={this.state.loading} />
                    {this.props.getAnalysisLayers()}
                    <div
                        style={{ display: (this.props.feature && this.props.feature.properties.feature_name) ? 'block' : 'none' }}
                        className="chartsDiv">
                        <div className="chart-titles">
                            <div className="title">Protection Status of Species in {this.props.feature ? this.props.feature.properties.feature_name : ''}</div>
                            <div className="subtitle">(Click on a slice to filter the table and see only species whose habitat falls in that percent of protection. Click on a radio button to see only species of that type.)</div>
                            <div className="spp-radio-btn">
                                <div><input type="radio" name="species" value={"ALL"} checked={this.state.taxaLetter === "ALL"} onChange={this.onSpeciesChanged} />All</div>
                                <div><input type="radio" name="species" value={"A"} checked={this.state.taxaLetter === "A"} onChange={this.onSpeciesChanged} />Amphibians</div>
                                <div><input type="radio" name="species" value={"B"} checked={this.state.taxaLetter === "B"} onChange={this.onSpeciesChanged} />Birds</div>
                                <div><input type="radio" name="species" value={"M"} checked={this.state.taxaLetter === "M"} onChange={this.onSpeciesChanged} />Mammals</div>
                                <div><input type="radio" name="species" value={"R"} checked={this.state.taxaLetter === "R"} onChange={this.onSpeciesChanged} />Reptiles</div>
                            </div>
                        </div>
                        <div>
                            <div className="half-chart">
                                <PieChart
                                    data={this.state.charts.gap12.data}
                                    id={this.state.charts.gap12.id}
                                    config={this.state.charts.gap12.config} />
                            </div>
                            <div className="half-chart">
                                <PieChart
                                    data={this.state.charts.gap123.data}
                                    id={this.state.charts.gap123.id}
                                    config={this.state.charts.gap123.config} />
                            </div>
                        </div>
                        <div className="chart-headers">
                            <button className="submit-analysis-btn" onClick={this.resetSppTable}>Clear Chart Selection</button>
                        </div>
                        <TableChart
                            data={this.state.charts.gapTable.data}
                            id={this.state.charts.gapTable.id}
                            config={this.state.charts.gapTable.config} />
                    </div>
                </div>
        )
    }
}
const SpeciesProtectionAnalysis = withSharedAnalysisCharacteristics(
    SpeciesProtectionAnalysisPackage,
    layers,
    sb_properties,
    SB_URL);

export default SpeciesProtectionAnalysis;
