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

class GeoData {
    /**
     * TODO!!!!
     * where:
     *   * schemaType is e.g. 'admin0' for countries, 'admin1' for
     *     states/territories/provinces, or a custom system like 'lga'
     *   * regionParent is the ISO-3166-a2 code (e.g. 'AU') or
     *     ISO-3166-2 code (e.g. 'AU-VIC') this item replaces.
     *     Should be a blank string for admin0.
     *
     * @param regionSchema
     * @param regionParent
     * @param regionParentGeoData
     */
    constructor(regionSchema, regionParent, regionParentGeoData) {
        this.regionSchema = regionSchema;
        this.regionParent = regionParent;

        this.regionParentGeoData = regionParentGeoData;
        this.iso639code = 'en'; // HACK: Please add localization support later!!! ======================================
        this._processData(regionParentGeoData);
    }

    /*******************************************************************
     * Intial processing of data
     *******************************************************************/

    /**
     * regionParentGeoData -> {
     *     regionChild: {
     *         geodata: [
     *             [area,
     *              x1,y1,x2,y2 bounding coords,
     *              center coords,
     *              points],
     *         ...],
     *         label: {
     *             'en': ...,
     *             ...
     *         }
     *     }
     * }
     * regionChild is the ISO-3166-a2 code (when admin0),
     * ISO-3166-2 code (when admin1/can otherwise be converted,
     * as some for 'uk-area' are) or other unique ID
     * (such as "geelong"). Note the name has been pre-processed with
     *
     * This file converts the data into a format MapBox GL can use for
     * displaying layers.
     *
     * @param regionParentGeoData
     * @private
     */
    _processData(regionParentGeoData) {
        var outlines = {
            "type": "FeatureCollection",
            "features": []
        };
        var points = {
            "type": "FeatureCollection",
            "features": []
        };

        for (let [regionChild, childData] of regionParentGeoData.entries()) {
            let geodata = childData['geodata'];
            let uniqueId = `${this.regionSchema}||${this.regionParent}||${regionChild}`;
            let largestItem = 1;

            for (let [area, boundingCoords, centerCoords, points] of geodata) {
                var properties = {
                    "area": area,
                    "largestItem": largestItem,
                    "boundingCoords": boundingCoords,
                    "centerCoords": centerCoords,
                    "regionSchema": this.regionSchema,
                    "regionParent": this.regionParent,
                    "regionChild": regionChild,
                    "uniqueid": uniqueId,
                    "label": this.getLabel(regionChild, this.iso639code)
                };
                outlines['features'].push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": points,
                        "properties": properties
                    }
                });
                points['features'].push({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": centerCoords,
                        "properties": properties
                    }
                });
                largestItem = 0;
            }
        }

        this.outlines = outlines;
        this.points = points;
    }

    /*******************************************************************
     * Basic methods - region info and get localized region names
     *******************************************************************/

    /**
     * Get the region schema
     *
     * @returns {*}
     */
    getRegionSchema() {
        return this.regionSchema;
    }

    /**
     * Get the region parent
     *
     * @returns {*}
     */
    getRegionParent() {
        return this.regionParent;
    }

    /**
     * Get the GeoData instance of the parent.
     * null if this GeoData is for admin0
     *
     * @returns {*}
     */
    getParentGeoData() {
        return this.regionParentGeoData;
    }

    /**
     * Get the localized label/name of a given region
     *
     * @param regionChild the region child
     * @param iso_639 the ISO 639 language code
     * @returns {*}
     */
    getLabel(regionChild, iso_639) {
        return (
            this.regionParentGeoData[regionChild]['labels'][iso_639] ||
            this.regionParentGeoData[regionChild]['labels']['en']
        )
    }

    /*******************************************************************
     * Get central points/polygon outlines of children
     *******************************************************************/

    /**
     * Get the central x,y points of child regions
     *
     * @param noCopy
     */
    getCentralPoints(noCopy) {
        var r = this.points;
        if (!noCopy) {
            r = JSON.parse(JSON.stringify(r));
        }
        return r;
    }

    /**
     * Get the polygon outlines for child regions
     *
     * @param noCopy
     */
    getPolygonOutlines(noCopy) {
        var r = this.outlines;
        if (!noCopy) {
            r = JSON.parse(JSON.stringify(r));
        }
        return r;
    }

    /*******************************************************************
     * Data processing: find central x,y points in polygon areas
     *******************************************************************/

    /**
     * Get an estimation of the center x,y inside an array of
     * x, y coordinates
     *
     * Note: In some cases, this may actually be outside the polygon,
     * as it simply is center point based on the bounding box!
     *
     * @param coordinates array of [[x, y], ...] coordinates
     * @returns {number[]}
     * @private
     */
    _findCenter(coordinates) {
        var minX = 999999999999,
            minY = 999999999999,
            maxX = -999999999999,
            maxY = -999999999999;

        for (let i = 0; i < coordinates.length; i++) {
            for (let j = 0; j < coordinates[i].length; j++) {
                let x = coordinates[i][j][0],
                    y = coordinates[i][j][1];

                if (x > maxX) maxX = x;
                if (x < minX) minX = x;
                if (y > maxY) maxY = y;
                if (y < minY) minY = y;
            }
        }

        var centerX = minX + (maxX - minX) / 2.0,
            centerY = minY + (maxY - minY) / 2.0;
        return [centerX, centerY];
    }

    /**
     * Get whether a given point is contained within a polygon
     *
     * @param point
     * @param vs
     * @returns {boolean}
     * @private
     */
    _canPutInCenter(point, vs) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
        // (MIT license)

        var x = point[0], y = point[1];

        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];

            var intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }
}
export default GeoData;
