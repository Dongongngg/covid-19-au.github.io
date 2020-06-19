import FillPolyLayer from "./Layers/LayerFillPoly";
import LinePolyLayer from "./Layers/LayerLinePoly";
import HeatMapLayer from "./Layers/LayerHeatMap";
import DaysSinceLayer from "./Layers/LayerDaysSince"
import GeoBoundaryCentralPoints from "./GeoBoundaryCentralPoints"


class JSONGeoBoundariesBase {
    /**
     *
     * @param map
     * @param schema
     * @param stateName
     * @param uniqueId
     * @param data
     */
    constructor(map, schema, stateName, uniqueId, data) {
        this.map = map;
        this.schema = schema;
        this.stateName = stateName;
        this.uniqueId = uniqueId;
        this.addedSources = {};  // Using as a set
        this.geoBoundaryCentralPoints = new GeoBoundaryCentralPoints();
        this._onLoadData(data);
    }

    /**
     *
     * @param data
     * @private
     */
    _onLoadData(data) {
        this.geoJSONData = data;
        this.pointGeoJSONData = this.geoBoundaryCentralPoints
            ._getModifiedGeoJSONWithPolyCentralAreaPoints(
                this.geoJSONData
            );
    }

    /*******************************************************************
     * Unique IDs for sources and layers
     *******************************************************************/

    /**
     *
     * @param dataSource
     * @param zoomNum
     * @returns {string}
     */
    getHeatmapSourceId(dataSource, zoomNum) {
        // Get a unique ID for sources shared by the
        // auto-generated central points in the
        // middle of the polys for the heat maps
        zoomNum = zoomNum || '';
        return this.uniqueId+dataSource.getSourceName()+'heatmapsource'+zoomNum;
    }

    /**
     *
     * @param dataSource
     * @returns {string}
     */
    getFillSourceId(dataSource) {
        // Get a unique ID for sources shared by fill/line polys
        return this.uniqueId+dataSource.getSourceName()+'fillsource';
    }

    /*******************************************************************
     * Fill poly-related
     *******************************************************************/

    /**
     * Add polygons for regional coloured/transparent fill
     *
     * (when transparent, they can still allow for
     * click events, which can trigger popup events etc)
     *
     * @param absDataSource
     * @param caseDataSource
     * @param opacity
     * @param addLegend
     * @param addPopupOnClick
     * @param addUnderLayerId
     */
    addFillPoly(absDataSource, caseDataSource, opacity,
        addLegend, addPopupOnClick, addUnderLayerId) {

        this.removeFillPoly();

        if (absDataSource) {
            this._associateSource(absDataSource);
        }
        if (caseDataSource) {
            this._associateSource(caseDataSource);
        }

        this._fillPolyLayer = new FillPolyLayer(
            this.map,
            absDataSource, caseDataSource, opacity,
            addLegend, addPopupOnClick, this.stateName,
            this.maxMinStatVal,

            addUnderLayerId, this.uniqueId,
            this.getFillSourceId(
                absDataSource || caseDataSource
            )
        );
    }

    /**
     * Remove polygons for regional coloured/transparent fill
     */
    removeFillPoly() {
        if (this._fillPolyLayer) {
            this._fillPolyLayer.remove();
            delete this._fillPolyLayer;
        }
    }

    /*******************************************************************
     * Line polys
     *******************************************************************/

    /**
     * Add regional outline polygons
     *
     * @param dataSource
     * @param color
     */
    addLinePoly(dataSource, color) {
        this.removeLinePoly();
        this._associateSource(dataSource);

        this._linePolyLayer = new LinePolyLayer(
            this.map, dataSource, this.uniqueId, color,
            this.getFillSourceId(dataSource)
        );
    }

    /**
     * Remove regional outline polygons
     */
    removeLinePoly() {
        if (this._linePolyLayer) {
            this._linePolyLayer.remove();
            delete this._linePolyLayer;
        }
    }

    /*******************************************************************
     * Heat maps
     *******************************************************************/

    /**
     * Add the cases heatmap layer
     *
     * @param dataSource
     * @param maxMinValues
     */
    addHeatMap(dataSource, maxMinValues) {
        this.removeHeatMap();
        this._associateSource(dataSource);

        this._heatMapLayer = new HeatMapLayer(
            this.map, dataSource, this.uniqueId, maxMinValues,
            this.getHeatmapSourceId(dataSource)
        );
    }

    /**
     * Remove the cases heatmap layer
     */
    removeHeatMap() {
        if (this._heatMapLayer) {
            this._heatMapLayer.remove();
            delete this._heatMapLayer;
        }
    }

    /*******************************************************************
     * Days since maps
     *******************************************************************/

    /**
     * Add the "days since" layer
     *
     * @param dataSource
     */
    addDaysSince(dataSource) {
        this.removeDaysSince();
        this._associateSource(dataSource);

        this._daysSinceLayer = new DaysSinceLayer(
            this.map, dataSource, this.uniqueId,
            this.getHeatmapSourceId(dataSource)
        );
    }

    /**
     * Remove the "days since" layer
     */
    removeDaysSince() {
        if (this._daysSinceLayer) {
            this._daysSinceLayer.remove();
            delete this._daysSinceLayer;
        }
    }
}

export default JSONGeoBoundariesBase;
