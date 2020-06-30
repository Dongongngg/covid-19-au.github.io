/**
This file is licensed under the MIT license

Copyright (c) 2020 David Morrissey

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import React from "react"
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import CovidMapControls from "./MapControls/CovidMapControls";
import DataDownloader from "../CrawlerData/DataDownloader";
import LngLatBounds from "../CrawlerDataTypes/LngLatBounds"

import DaysSinceLayer from "./Layers/cases/DaysSinceLayer";
import CasesFillPolyLayer from "./Layers/cases/CasesFillPolyLayer";
import UnderlayFillPolyLayer from "./Layers/underlay/UnderlayFillPolyLayer";
import CaseCirclesLayer from "./Layers/cases/CaseCirclesLayer";
import LinePolyLayer from "./Layers/LinePolyLayer";

import MapBoxSource from "./Sources/MapBoxSource";
import ClusteredCaseSource from "./Sources/ClusteredCaseSource";


class CovidMapControl extends React.Component {
    /**
     *
     * @param props
     */
    constructor(props) {
        super(props);
        this.dataDownloader = new DataDownloader();
    }

    /*******************************************************************
     * HTML Template
     *******************************************************************/

    render() {
        return (
            <div ref={el => this.absContainer = el}>
                <div ref={el => this.mapContainer = el} >
                </div>
            </div>
        )
    }

    /*******************************************************************
     * Intialization after load
     *******************************************************************/

    componentDidMount() {
        const map = this.map = new mapboxgl.Map({
            container: this.mapContainer,
            style: 'mapbox://styles/mapbox/streets-v11?optimize=true',
            zoom: 1,
            maxZoom: 12,
            //minZoom: 1,
            transition: {
                duration: 50,
                delay: 0
            },
            fadeDuration: 50
        });

        // Add the map controls to the map container element so that
        // they'll be displayed when the map is shown fullscreen
        let mapContainerChild = document.createElement('div');
        this.mapContainer.appendChild(mapContainerChild);
        ReactDOM.render(
            <CovidMapControls ref={el => this.covidMapControls = el}
                              onchange={(e) => this._onControlsChange(e)} />,
            mapContainerChild
        );

        // Disable map rotation
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        // Add geolocate control to the map.
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            })
        );

        //Add zoom+fullscreen controls
        map.addControl(new mapboxgl.NavigationControl());
        map.addControl(new mapboxgl.FullscreenControl());

        map.on('load', () => {
            // Create the MapBox sources
            let underlaySource = this.underlaySource = new MapBoxSource(map);
            let casesSource = this.casesSource = new MapBoxSource(map);
            let clusteredCaseSource = this.clusteredCaseSource = new ClusteredCaseSource(map);

            // Add layers for the underlay
            this.underlayFillPoly = new UnderlayFillPolyLayer(
                map, 'underlayFillPoly', underlaySource
            );
            this.underlayLinePoly = new LinePolyLayer(
                map, 'underlayLinePoly', 'rgba(0,0,0,0.3)', 1.0, underlaySource
            );

            // Add layers for cases
            this.daysSinceLayer = new DaysSinceLayer(
                map, 'daysSinceLayer', casesSource
            );
            this.casesFillPolyLayer = new CasesFillPolyLayer(
                map, 'casesFillPolyLayer', casesSource
            );
            this.casesLinePolyLayer = new LinePolyLayer(
                map, 'casesLinePolyLayer', 'gray', 1.0, casesSource
            );
            this.caseCirclesLayer = new CaseCirclesLayer(
                map, 'heatMap', clusteredCaseSource
            );

            // Bind events for loading data
            map.on('moveend', () => {
                this.onMapMoveChange();
            });
            map.on('zoomend', () => {
                this.onMapMoveChange();
            });

            if (this.props.onload) {
                this.props.onload(this, map);
            }

            /*setInterval(() => {
                // HACK: zoom events don't always fire, so keep polling!
                if (this.prevZoomLevel !== parseInt(this.map.getZoom())) {
                    this.onMapMoveChange();
                }
            }, 50);*/

            this.onMapMoveChange();
        });
    }

    /*******************************************************************
     * MapBox GL Events
     *******************************************************************/

    /**
     * Download any static/case data based on the
     * countries/regions in view, and hide/show as needed!
     */
    async onMapMoveChange() {
        let zoomLevel = parseInt(this.map.getZoom()), // NOTE ME!!
            lngLatBounds = LngLatBounds.fromMapbox(this.map.getBounds()),
            iso3166WithinView = this.dataDownloader.getISO3166WithinView(lngLatBounds),
            schemasForCases = this.dataDownloader.getPossibleSchemasForCases(
                zoomLevel, iso3166WithinView
            ),
            dataType = this.covidMapControls.getDataType();

        if (this.prevSchemasForCases) {
            let changed = (
                zoomLevel !== this.prevZoomLevel ||
                this.dataDownloader.caseDataForZoomAndCoordsChanged(
                    zoomLevel,
                    this.prevDataType, this.prevSchemasForCases,
                    dataType, schemasForCases
                )
            );
            if (!changed) {
                return;
            }
        }

        // Prevent interacting with map while it's not ready
        this.enableControlsWhenMapReady();

        if (this.__mapMovePending) {
            setTimeout(this.onMapMoveChange.bind(this), 250);
            return;
        }
        // Enter critical section
        this.__mapMovePending = true;

        let geoData = await this.dataDownloader.getCaseDataForZoomAndCoords(
            zoomLevel, lngLatBounds, dataType, schemasForCases, iso3166WithinView
        );

        this.__onMapMoveChange(geoData, dataType, zoomLevel)
    }

    __onMapMoveChange(geoData, dataType, zoomLevel) {
        var callMe = () => {
            if (!this.covidMapControls || !this.map) {
                // React JS likely destroyed the elements in the interim
                return;
            } else if (this.covidMapControls.getDisabled() || !this.map.loaded()) {
                // Don't display until map ready!
                setTimeout(callMe, 50);
            } else {
                // First, remove the layers
                // This needs to be done to prevent this.paint is null exceptions
                this.casesFillPolyLayer.removeLayer();
                this.casesLinePolyLayer.removeLayer();
                this.caseCirclesLayer.removeLayer();

                // Next, update the sources
                this.clusteredCaseSource.setData(
                    geoData.points, geoData.geoDataInsts, geoData.caseDataInsts
                );
                this.casesSource.setData(
                    geoData.polygons, geoData.geoDataInsts, geoData.caseDataInsts
                );
                this.geoDataInsts = geoData.geoDataInsts;
                this.caseDataInsts = geoData.caseDataInsts;

                this.prevSchemasForCases = geoData.schemasForCases;
                this.prevDataType = dataType;
                this.prevZoomLevel = zoomLevel;

                // Now add the layers again
                this.casesFillPolyLayer.addLayer();
                this.casesLinePolyLayer.addLayer();
                this.caseCirclesLayer.addLayer();

                this.__mapMovePending = false;
            }
        };
        callMe();
    }

    /*******************************************************************
     * Disable controls while loading
     *******************************************************************/

    /**
     * Wait for the map to fully load before enabling the controls
     *
     * @private
     */
    enableControlsWhenMapReady() {
        this.covidMapControls.disable();
        //this.mapContainer.style.pointerEvents = 'none';
        //let preventDefault = (e) => {e.preventDefault();};

        //window.addEventListener(
        //    "wheel",
        //    preventDefault,
        //    {passive: false}
        //);

        let _enableControlsWhenMapReady = () => {
            if (this.map.loaded()) {
                this._enableControlsJob = null;
                this.covidMapControls.enable();
                //this.mapContainer.style.pointerEvents = 'all';
                //window.removeEventListener("wheel", preventDefault);
            }
            else {
                this._enableControlsJob = setTimeout(
                    _enableControlsWhenMapReady, 50
                );
            }
        };

        if (this._enableControlsJob != null) {
            clearTimeout(this._enableControlsJob);
        }
        this._enableControlsJob = setTimeout(
            _enableControlsWhenMapReady, 50
        );
    }

    /*******************************************************************
     * Mode update
     *******************************************************************/

    /**
     *
     * @private
     */
    _onControlsChange() {
        let points = {
            "type": "FeatureCollection",
            "features": []
        },  polygons = {
            "type": "FeatureCollection",
            "features": []
        };

        this.clusteredCaseSource.setData(points);
        this.casesSource.setData(polygons);
        this.onMapMoveChange();
    }
}

export default CovidMapControl;
