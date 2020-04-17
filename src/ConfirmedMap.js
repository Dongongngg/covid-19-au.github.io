import React from "react";
import mapboxgl from 'mapbox-gl';
import confirmedData from "../data/mapdataCon"
import hospitalData from "../data/mapdataHos"
import mapDataArea from "../data/mapdataarea"
import vicLgaData from "../data/vic_lga.geojson"
import nswLgaData from "../data/nsw_lga.geojson"
import qldHhsData from "../data/qld_hhs.geojson"
import actSaData from "../data/sa3_act.geojson"
import waLgaData from "../data/wa_lga.geojson"
import 'mapbox-gl/dist/mapbox-gl.css'
import './ConfirmedMap.css'
import confirmedImg from '../img/icon/confirmed-recent.png'
import confirmedOldImg from '../img/icon/confirmed-old.png'
import hospitalImg from '../img/icon/hospital.png'
import ReactGA from "react-ga";
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import Radio from '@material-ui/core/Radio';
import Acknowledgement from "../Acknowledgment"
//Fetch Token from env
let token = process.env.REACT_APP_MAP_API;
mapboxgl.accessToken = token;


const oldCaseDays = 14; // Threshold for an 'old case', in days

class MbMap extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            lng: 133.751567,
            lat: -26.344589,
            zoom: 2,
            showMarker: true,
        };
    }

    componentDidMount() {
        this.Hospitalvisible = false;
        const { lng, lat, zoom } = this.state;

        var bounds = [
            [101.6015625, -49.83798245308484], // Southwest coordinates
            [166.2890625, 0.8788717828324276] // Northeast coordinates
        ];

        const map = new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/mapbox/streets-v9',
            center: [lng, lat],
            zoom: zoom,
            maxBounds: bounds // Sets bounds as max
        });

        map.on('load', function () {
            (async () => {
                new ACTGeoBoundaries(map);
                new QLDHHSGeoBoundaries(map);
                new WABoundaries(map);
                new NSWBoundaries(map);
                new VicBoundaries(map);
            })();
        });

        // Add geolocate control to the map.
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            })
        );

        //Add Zoom Controls
        map.addControl(new mapboxgl.NavigationControl());

        //Add Full Screen Controls
        map.addControl(new mapboxgl.FullscreenControl());

        map.on('move', () => {
            const { lng, lat } = map.getCenter();

            this.setState({
                lng: lng.toFixed(4),
                lat: lat.toFixed(4),
                zoom: map.getZoom().toFixed(2)
            });
        });

        // Add markers: confirmed cases/hospitals
        confirmedData.map((item) => {
            if (!(['VIC', 'NSW', 'QLD', 'WA', 'ACT'].includes(item['state']))) {
                return new ConfirmedMarker(map, item);
            }
        });
        hospitalData.map((item) => {
            return new HospitalMarker(map, item);
        })
    }

    handleClickOff() {
        // Turn markers off
        var all = document.getElementsByClassName("marker");
        for (var i = 0; i < all.length; i++) {
            var element = all[i];
            element.style.visibility = 'hidden';
        }
        this.setState({
            showMarker: false
        })
    }

    handleClickOn() {
        // Turn markers on
        var all = document.getElementsByClassName("marker");
        for (var i = 0; i < all.length; i++) {
            var element = all[i];
            element.style.visibility = 'visible';
        }
        this.setState({
            showMarker: true
        })
    }

    render() {
        const activeStyles = {
            color: 'black',
            borderColor: '#8ccfff',
            padding: "0px",
            zIndex:10,
            outline: "none"
        };
        const inactiveStyles = {
            color: 'grey',
            borderColor: '#e3f3ff',
            padding: "0px",
            outline: "none"
        };

        return (
            <div className="card" style={{
                display: 'flex',
                flexDirection: 'column',
            }}>
                <h2 style={{ display: "flex" }}
                    aria-label="Hospital and Case Map">Hospital & Case Map<div style={{
                        alignSelf: "flex-end",
                        marginLeft: "auto",
                        fontSize: "60%"
                    }}>
                    <Acknowledgement>
                    </Acknowledgement></div></h2>
                <div ref={el => this.mapContainer = el} >
                    {/*{*/}
                    {/*confirmedData.map((item)=>(*/}
                    {/*<div style={activityStyle}>*/}

                    {/*</div>*/}
                    {/*))*/}
                    {/*}*/}
                </div>

                <span className="due">
                    <span className="key"><img src={hospitalImg} /><p>Hospital or COVID-19 assessment centre</p></span>
                    <span className="key"><img src={confirmedOldImg} /><p>Case over {oldCaseDays} days old</p></span>
                    <span className="key"><img src={confirmedImg} /><p>Recently confirmed case(not all, collecting)</p></span>
                    <span className="Key">
                        <p>*City-level data is only present for <strong>ACT</strong>, <strong>NSW</strong>,
                            <strong>VIC</strong>, and <strong>WA</strong>, HHS Data for <strong>QLD</strong>.
                            Other states are being worked on.</p>
                    </span>
                    <span className="key" style={{ alignSelf: "flex-end", marginTop: "0.5rem" }}>
                        Markers:&nbsp;<ButtonGroup size="small" aria-label="small outlined button group">
                            <Button style={this.state.showMarker ? activeStyles : inactiveStyles}
                                    disableElevation={true}
                                    onClick={() => this.handleClickOn()}>On</Button>
                            <Button style={this.state.showMarker ? inactiveStyles : activeStyles}
                                    onClick={() => this.handleClickOff()}>Off</Button>
                        </ButtonGroup>
                    </span>
                </span>

            </div>
        );
    }
}


class JSONGeoBoundariesBase {
    constructor(map, stateName, fillPolyId, linePolyId, data) {
        this.map = map;
        this.stateName = stateName;
        this.fillPolyId = fillPolyId;
        this.linePolyId = linePolyId;

        var that = this;
        this._loadJSON(data).then(
            data => that._onLoadData(data)
        );
    }

    // var maxValue = 56;
    async _loadJSON(Data) {
        let geojsonData = await fetch(`${Data}`)
            .then(response => response.json())
            .then(responseData => {
                return responseData;
            });
        return geojsonData;
    }

    _onLoadData(data) {
        data = this._formNewJson(data);

        // TODO: Allow turning on/off fill/line polys!
        this.addFillPoly(data);
        this.addLinePoly(data)
    }

    getPolyCentralArea(key) {
        // TODO: Use https://github.com/mapbox/polylabel or similar to get the central point of the polygon
    }

    /*******************************************************************
     * Fill poly-related
     *******************************************************************/

    addFillPoly(data) {
        // Add the colored fill area
        const map = this.map;
        map.addLayer({
            id: this.fillPolyId,
            type: 'fill',
            minzoom: 2,
            source: {
                type: 'geojson',
                data: data
            },
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'cases'],
                    0, '#E3F2FD',
                    1, '#BBDEFB',
                    5, '#90CAF9',
                    10, '#64B5F6',
                    20, '#42A5F5',
                    30, '#2196F3',
                    40, '#1E88E5',
                    50, '#1976D2',
                    60, '#1565C0',
                    70, '#0D47A1'
                ],
                'fill-opacity': 0.75
            },
            filter: ['==', '$type', 'Polygon']
        });
    }

    removeFillPoly() {
        const map = this.map;
        map.removeLayer(this.fillPolyId);
    }

    /*******************************************************************
     * Line poly-related
     *******************************************************************/

    addLinePoly(data) {
        // Add the line outline
        const map = this.map;
        map.addLayer({
            id: this.linePolyId,
            minzoom: 2,
            type: 'line',
            source: {
                type: 'geojson',
                data: data
            },
            paint: {
                // 'line-color': '#088',
                'line-opacity': 1,
                'line-width': 1,
            },
            filter: ['==', '$type', 'Polygon']
        });

        this._addLinePolyPopupEvent();
    }

    _addLinePolyPopupEvent() {
        const map = this.map;

        map.on('click', this.fillPolyId, function (e) {
            ReactGA.event({
                category: 'ConfirmMap',
                action: "StateClick",
                label: e.features[0].properties.city
            });
            var cases = e.features[0].properties.cases;
            var date = e.features[0].properties.date;
            console.log(e.features);

            if (e.features[0].source === 'id_poly_act' && cases === 5) {
                cases='< 5'
            }

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                    e.features[0].properties.city +
                    '<br/>Cases: ' + cases +
                    '<br/>By: ' + date
                )
                .addTo(map);
        });

        // Change the cursor to a pointer when the mouse is over the states layer.
        map.on('mouseenter', 'id_poly', function () {
            map.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'id_poly', function () {
            map.getCanvas().style.cursor = '';
        });
    }

    removeLinePoly() {
        const map = this.map;
        map.removeLayer(this.linePolyId);
    }

    /*******************************************************************
     * Data processing
     *******************************************************************/

    _formNewJson(geojsonData) {
        var values;
        const state = this.stateName;
        const map = this.map;

        for (var key in geojsonData.features) {
            var data = geojsonData.features[key];
            values = this._getHTML(this.getCityNameFromProperty(data), state);
            data.properties['city'] = this.getCityNameFromProperty(data);
            data.properties['cases'] = values[0];
            data.properties['date'] = values[1];
            geojsonData.features[key] = data;
        }
        return geojsonData;
    }

    _getHTML(city_name, state) {
        var numberOfCases = 0;
        var updated_date = '';
        var city;

        if (state === 'VIC') {
            updated_date = '16/4/20';
        }
        else {
            city_name = city_name.toLowerCase();
            updated_date = '16/4/20';
        }

        // if (city_type === 'city'){
        //   city_name += '(c)';
        // }else if(city_type==='rural city'){
        //     city_name += '(rc)';
        // }
        // else{
        //   city_name += '(s)';
        // }
        for (var data in mapDataArea) {
            if (!(mapDataArea.hasOwnProperty(data))) {
                continue;
            }

            var data_map = mapDataArea[data];
            if (state === data_map['state'] && data_map['schema']!=='HLD') {
                city = data_map['area'];

                if (city.toLowerCase() === city_name && numberOfCases === 0) {
                    numberOfCases = data_map['confirmedCases'];
                    updated_date = data_map['lastUpdateDate'];
                }
            }
        }
        return [parseInt(numberOfCases), updated_date];
    }
}

class ACTGeoBoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'ACT',
            'id_poly_act',
            'id_line_ploy_act',
            actSaData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties['name'];
    }
}


class QLDHHSGeoBoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'QLD',
            'id_poly_qld',
            'id_line_ploy_qld',
            qldHhsData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties.HHS;
    }
}

class WABoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'WA',
            'id_poly_wa',
            'id_line_ploy_wa',
            waLgaData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties.wa_lga_s_3;
    }
}

class NSWBoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'NSW',
            'id_poly_nsw',
            'id_line_ploy_nsw',
            nswLgaData
        );
    }
    getCityNameFromProperty(data) {
        return data.properties.nsw_lga__3;
    }
}

class VicBoundaries extends JSONGeoBoundariesBase {
    constructor(map) {
        super(
            map,
            'VIC',
            'id_poly_vic',
            'id_line_ploy_vic',
            vicLgaData
        );
    }
    getCityNameFromProperty(data) {
        let city_name = data.properties.vic_lga__2;
        var city = city_name.toLowerCase().split(" ");
            var city_type = city.slice(-1)[0];
            city.pop();
            city_name = city.join(' ');
        return city_name
    }
}

class ConfirmedMarker {
    constructor(map, item) {
        this.map = map;
        this.item = item;

        if (item['state'] === 'VIC' && item['area'].length > 0) {
            item['description'] =
                "This case number is just the suburb confirmed " +
                "number, not the case number at this geo point.";
            item['date'] = '26/3/20'
        }

        // create a HTML element for each feature
        var el = this.el = document.createElement('div');

        this.setStyles(el);
        this.addMarker(el);
    }
    setStyles(el) {
        el.className = 'marker';
        el.style.height = '20px';
        el.style.width = '20px';
        el.style.backgroundSize = 'cover';
        if (this.isOld(this.item['date'])) {
            el.style.backgroundImage = `url(${confirmedOldImg})`;
        } else {
            el.style.backgroundImage = `url(${confirmedImg})`;
        }
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
    }
    isOld(date) {
        // Check if a date was more than two weeks ago
        // Working with raw data, so try-catch just in case

        try {
            // 'DD/MM/YY' format
            // Assume entries with incorrect formats are old
            const eventDay = date.split("/");
            if (eventDay.length !== 3 || eventDay === 'N/A') { return true; }

            // Default constructor has current time
            const today = new Date();

            // Day of the event. Transform to YYYY/MM/DD format
            const day = eventDay[0], month = parseInt(eventDay[1]) - 1;
            const year = '20' + eventDay[2];
            let caseDate = new Date(year, month, day);

            // Add two weeks for comparison
            caseDate.setDate(caseDate.getDate() + oldCaseDays);

            // True iff the original date was more than two weeks old
            if (today > caseDate) {
                return true;
            } else {
                return false;
            }
        } catch {
            return true;
        }
    }
    addMarker(el) {
        const map = this.map;
        let coor = [
            this.item['coor'][1],
            this.item['coor'][0]
        ];

        // make a marker for each feature and add to the map
        new mapboxgl
            .Marker(el)
            .setLngLat(coor)
            .setPopup(
                new mapboxgl
                    .Popup({ offset: 25 }) // add popups
                    .setHTML(
                        '<h3 style="margin:0;">' + this.item['name'] + '</h3>' +
                        '<p style="margin:0;">' + this.item['date'] + '</p>' +
                        '<p style="margin:0;">' + this.item['description'] + '</p>'
                    )
            )
            .addTo(map);
    }
    removeMarker() {
        // TODO!
    }
}

class HospitalMarker {
    constructor(map, item) {
        this.map = map;
        this.item = item;

        // create a HTML element for each feature
        var el = this.el = document.createElement('div');

        this._setStyles(el);
        this.addMarker(el);
    }
    _setStyles(el) {
        el.className = 'marker';
        el.style.height = '20px';
        el.style.width = '20px';
        el.style.backgroundSize = 'cover';
        el.style.backgroundImage = `url(${hospitalImg})`;
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
    }
    addMarker(el) {
        let coor = [
            this.item['coor'][1],
            this.item['coor'][0]
        ];

        // make a marker for each feature and add to the map
        new mapboxgl
            .Marker(el)
            .setLngLat(coor)
            .setPopup(
                new mapboxgl
                    .Popup({offset: 25}) // add popups
                    .setHTML(
                        '<h3 style="margin:0;">' + this.item['name'] + '</h3>' +
                        '<p style="margin:0;">Phone: ' + this.item['hospitalPhone'] + '</p>' +
                        '<p style="margin:0;">Addr: ' + this.item['address'] + '</p>'
                    )
            )
            .addTo(this.map);
    }
    removeMarker() {
        // TODO!
    }
}

export default MbMap
