import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import React from "react";


class SchemaTypeSelect extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            _timeperiod: 'alltime',
            _markers: 'total'
        };
    }

    render() {
        const padding = '6px',
              fbPadding = '2px 3px';

        const activeStyles = {
            color: 'black',
            borderColor: '#8ccfff',
            paddingLeft: padding,
            paddingRight: padding,
            //padding: "0px 5px",
            zIndex: 10,
            outline: "none",
            textTransform: "none"
        };
        const inactiveStyles = {
            color: 'grey',
            borderColor: '#e3f3ff',
            paddingLeft: padding,
            paddingRight: padding,
            //padding: "0px 5px",
            outline: "none",
            textTransform: "none"
        };

        const activeFBStyles = {
            color: 'black',
            borderColor: '#8ccfff',
            padding: fbPadding,
            //padding: "0px 5px",
            zIndex: 10,
            outline: "none",
            textTransform: "none",
            minWidth: 0,
            minHeight: 0
        };
        const inactiveFBStyles = {
            color: 'grey',
            borderColor: '#e3f3ff',
            padding: fbPadding,
            //padding: "0px 5px",
            outline: "none",
            textTransform: "none",
            minWidth: 0,
            minHeight: 0,
            opacity: 0.8,
            filter: "grayscale(50%)"
        };

        return (
            <div>
                <div ref={this.markersBGGroup}
                    style={{ marginBottom: "8px" }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8em', marginLeft: '3px' }}>Markers</div>
                    <select ref={this.markersSelect}
                        style={{ "width": "100%" }}>
                        <optgroup label="Basic Numbers">
                            <option value="total" selected>Total Cases</option>
                            <option value="days_since">Days Since Last Case</option>
                            <option value="status_active">Active Cases</option>
                            <option value="status_recovered">Recovered Cases</option>
                            <option value="status_deaths">Deaths</option>
                            <option value="status_icu">ICU</option>
                            {/*<option value="status_icu_ventilators">ICU Ventilators</option>*/}
                            <option value="status_hospitalized">Hospitalized</option>
                        </optgroup>
                        <optgroup label="Test Numbers">
                            <option value="tests_total">Total People Tested</option>
                        </optgroup>
                        <optgroup label="Source of Infection">
                            <option value="source_overseas">Contracted Overseas</option>
                            <option value="source_community">Unknown Community Transmission</option>
                            <option value="source_confirmed">Contracted from Confirmed Case</option>
                            <option value="source_interstate">Contracted Interstate</option>
                            <option value="source_under_investigation">Under Investigation</option>
                        </optgroup>
                        <optgroup label="Cruise Ship Numbers">
                            <option value="RUBY PRINCESS">Ruby Princess</option>
                            <option value="OVATION OF THE SEAS">Ovation of the Seas</option>
                            <option value="GREG MORTIMER">Greg Mortimer</option>
                            <option value="ARTANIA">Artania</option>
                            <option value="VOYAGERS OF THE SEA">Voyagers of the sea</option>
                            <option value="CELEBRITY SOLSTICE">Celebrity Solstice</option>
                            <option value="COSTA VICTORIA">Costa Victoria</option>
                            <option value="DIAMOND PRINCESS">Diamond Princess</option>
                            <option value="COSTA LUMINOSA">Contracted Costa Luminosa</option>
                            <option value="SUN PRINCESS">Sun Princess</option>
                            <option value="CELEBRITY APEX">Celebrity Apex</option>
                            <option value="MSC FANTASIA">MSC Fantasia</option>
                            <option value="UNKNOWN">Unknown Ship</option>
                        </optgroup>
                    </select>
                </div>

                <div>
                    <span className="key" style={{ alignSelf: "flex-end", marginBottom: "5px" }}>
                        <ButtonGroup ref={this.markersButtonGroup}
                            size="small"
                            aria-label="small outlined button group">
                            <Button style={this.state._timeperiod === 'alltime' ? activeStyles : inactiveStyles}
                                onClick={() => this.setTimePeriod('alltime')}>All</Button>
                            <Button style={this.state._timeperiod === '7days' ? activeStyles : inactiveStyles}
                                onClick={() => this.setTimePeriod('7days')}>7 Days</Button>
                            <Button style={this.state._timeperiod === '14days' ? activeStyles : inactiveStyles}
                                onClick={() => this.setTimePeriod('14days')}>14 Days</Button>
                            <Button style={this.state._timeperiod === '21days' ? activeStyles : inactiveStyles}
                                onClick={() => this.setTimePeriod('21days')}>21 Days</Button>
                        </ButtonGroup>
                    </span>
                </div>
            </div>
        );
    }

    /*******************************************************************
     * Intialization after load
     *******************************************************************/

    componentDidMount() {

    }
}
