var MAX_VAL = 40;


class DaysSinceLayer {
    /**
     *
     * @param map
     * @param dataSource
     * @param uniqueId
     * @param cachedMapboxSource
     */
    constructor(map, dataSource, uniqueId, cachedMapboxSource) {
        this.map = map;
        this.dataSource = dataSource;
        this.uniqueId = uniqueId;
        this.cachedMapboxSource = cachedMapboxSource;

        map.addLayer(
            {
                id: this.getDaysSinceId(),
                type: 'circle',
                source: this.cachedMapboxSource.getSourceId(),
                filter: ['has', 'dayssince'],
                paint: {
                    // Size circle radius by value
                    'circle-radius': 15,
                    // Color circle by value
                    'circle-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'dayssince'],
                        0, '#e73210',
                        5, '#ff4817',
                        10, '#ff5c30',
                        20, '#fc653d',
                        50, '#ff9f85',
                        100, '#ff9f85',
                    ]
                },
                layout: {
                    'circle-sort-key': ["to-number", ["get", "revdayssince"], 1]
                }
            }
        );

        for (var i=MAX_VAL; i>-1; i--) {
            map.addLayer({
                id: this.getDaysSinceId() + 'label' + i,
                type: 'symbol',
                source: this.cachedMapboxSource.getSourceId(),
                filter: [(i === MAX_VAL-1) ? '>=' : '==', ["get", "dayssince"], i],
                layout: {
                    'text-field': '{dayssince}',
                    'text-font': [
                        'Arial Unicode MS Bold',
                        'Open Sans Bold',
                        'DIN Offc Pro Medium'
                    ],
                    'text-size': 13
                },
                paint: {
                    "text-color": "rgba(255, 255, 255, 1.0)"
                }
            });
        }
    }

    getDaysSinceId() {
        return this.uniqueId+'dayssince';
    }

    remove() {
        const map = this.map;
        map.removeLayer(this.getDaysSinceId());

        for (var i=MAX_VAL; i>-1; i--) {
            map.removeLayer(this.getDaysSinceId() + 'label' + i);
        }
    }
}

export default DaysSinceLayer;
