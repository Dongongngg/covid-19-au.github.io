import confirmedOldImg from "../../../img/icon/confirmed-old.png";
import confirmedImg from "../../../img/icon/confirmed-recent.png";
import mapboxgl from "mapbox-gl";

/*******************************************************************
 * Confirmed markers
 *******************************************************************/

class MarkerConfirmed {
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

        this._setStyles(el);
        this._addMarker(el);
        this.hide();
    }

    show() {
        if (this._marker)
            return;
        this.el.style.display = 'block';
        this._addMarker(this.el);
    }

    hide() {
        this.el.style.display = 'none';
        if (!this._marker)
            return;
        this._marker.remove();
        delete this._marker;
    }

    _setStyles() {
        const el = this.el;
        el.className = 'marker';
        el.style.height = '20px';
        el.style.width = '20px';
        el.style.backgroundSize = 'cover';
        if (this._isOld(this.item['date'])) {
            el.style.backgroundImage = `url(${confirmedOldImg})`;
        } else {
            el.style.backgroundImage = `url(${confirmedImg})`;
        }
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
    }
    _isOld(date) {
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
            caseDate.setDate(caseDate.getDate() + MarkerConfirmed.oldCaseDays);

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

    _addMarker() {
        const map = this.map;
        let coor = [
            this.item['coor'][1],
            this.item['coor'][0]
        ];

        // make a marker for each feature and add to the map
        this._marker = new mapboxgl
            .Marker(this.el)
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
}

// Threshold for an 'old case', in days
MarkerConfirmed.oldCaseDays = 14;

export default MarkerConfirmed;
