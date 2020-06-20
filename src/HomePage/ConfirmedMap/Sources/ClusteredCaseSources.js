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

import Fns from "../Fns";
import MapBoxSource from "./MapBoxSource"


class ClusteredCaseSources {
    constructor() {

    }

    /*******************************************************************
     * Data processing: combine very close points at different zoom levels
     *******************************************************************/

    /**
     * Cluster points for cases, so as to be able
     * to get a zoomed-out general overview of an area
     *
     * @param pointGeoJSONData
     * @param dataSource
     */
    getPointDataByZoomLevel(pointGeoJSONData, dataSource) {
        var byZoom = {};

        byZoom[8] = this.getModifiedGeoJSONWithPointsJoined(
            pointGeoJSONData, 8
        );
        byZoom[7] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[8], 7
        );
        byZoom[6] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[7], 6
        );
        byZoom[5] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[6], 5
        );
        byZoom[4] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[5], 4
        );
        byZoom[3] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[4], 3
        );
        byZoom[2] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[3], 2
        );
        byZoom[1] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[2], 1
        );
        byZoom[0] = this.getModifiedGeoJSONWithPointsJoined(
            byZoom[1], 0
        );

        return byZoom;
    }

    /**
     * Values which are below the specified amount will be merged
     * so larger values will mean less will be displayed
     *
     * @param geoJSONData
     * @param zoomLevel
     * @returns {*|GeoDataForDataSource.getModifiedGeoJSONWithPointsJoined.props}
     */
    getModifiedGeoJSONWithPointsJoined(geoJSONData, zoomLevel) {

        var zoomMap = {
            // I have no idea if these are right...
            0: 20.0,
            1: 10.0,
            2: 5.0,
            3: 2.2, // around 2.0 seems a good value - don't touch!
            4: 0.7,
            5: 0.35,
            6: 0.25,
            7: 0.2,
            8: 0.15
        };

        var mergeSmallerThan = zoomMap[zoomLevel];
        var eliminatedMap = new Map();
        var mergedMap = new Map();
        var distances = [];

        // Fast deep copy
        geoJSONData = JSON.parse(JSON.stringify(geoJSONData));

        // Look for all distances
        geoJSONData['features'].forEach((feature1, index1) => {
            var coords1 = feature1['geometry']['coordinates'];

            if (!feature1.properties['cases']) { //  || feature1.properties['cases'] < 0
                // Only add if cases has been added to!
                return;
            }

            geoJSONData['features'].forEach((feature2, index2) => {
                var coords2 = feature2['geometry']['coordinates'];

                if (index1 === index2) {
                    return;
                }
                else if (!feature2.properties['cases']) { //  || feature2.properties['cases'] < 0
                    // Only add if cases has been added to!
                    return;
                }

                var a = coords1[0] - coords2[0],
                    b = coords1[1] - coords2[1],
                    c = Math.sqrt(a*a + b*b);

                distances.push([c, index1, index2]);
            });
        });

        distances.sort((a, b) => a[0] - b[0]);

        for (var i=0; i<distances.length; i++) {
            var distance = distances[i][0],
                index1 = distances[i][1],
                index2 = distances[i][2];

            if (eliminatedMap.has(index2) || eliminatedMap.has(index1)) {
                // Can't eliminate if already eliminated!
                continue;
            }

            if (distance < mergeSmallerThan) {
                // Eliminate only one of two of them,
                // merging any previously merged
                var merged = mergedMap.get(index1) || [];
                merged.push(index2);
                if (mergedMap.has(index2)) {
                    merged = merged.concat(mergedMap.get(index2));
                    mergedMap.delete(index2);
                }
                mergedMap.set(index1, merged);
                eliminatedMap.set(index2, null);
            }
        }

        var newFeatures = [];
        geoJSONData['features'].forEach((feature, index) => {
            var properties = feature.properties,
                geometry = feature.geometry;

            if (eliminatedMap.has(index)) {
                //feature.properties['cases'] = 0;
                //newFeatures.push(feature);
            }
            else if (mergedMap.has(index)) {
                var cases = properties['cases'],
                    x = geometry.coordinates[0],
                    y = geometry.coordinates[1],
                    n = 1,
                    highestCases = cases;

                mergedMap.get(index).forEach(function(otherIndex) {
                    var otherFeature =  geoJSONData['features'][otherIndex],
                        otherProperties = otherFeature.properties,
                        otherGeometry = otherFeature.geometry;

                    x = x + otherGeometry.coordinates[0];
                    y = y + otherGeometry.coordinates[1];

                    cases = cases + otherProperties['cases'];

                    if (otherProperties['cases'] > highestCases) {
                        // Make it so city names/labels with the
                        // largest number of cases take precedence!
                        highestCases = otherProperties['cases'];
                        properties['city'] = otherProperties['city'];
                    }

                    n = n + 1;
                });

                properties['cases'] = cases;
                properties['casesFmt'] = Fns.numberFormat(cases, 1);
                properties['casesSz'] = properties['casesFmt'].length;
                geometry.coordinates = [x/n, y/n];
                newFeatures.push(feature);
            }
            else {
                newFeatures.push(feature);
            }
        });
        geoJSONData['features'] = newFeatures;

        return geoJSONData;
    }
}

export default ClusteredCaseSources;
