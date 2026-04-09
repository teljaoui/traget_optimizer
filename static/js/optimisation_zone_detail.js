document.addEventListener('DOMContentLoaded', function () {

    // ✅ Afficher uniquement le polygone de la zone
    var latlngs = zone.points.map(function (p) { return [p.lat, p.lng]; });

    if (latlngs.length > 0) {
        var polygon = L.polygon(latlngs, {
            color: 'black',
            fillColor: 'transparent',
            fillOpacity: 0.3
        }).addTo(window.map);

        // ✅ Centrer la carte sur la zone
        window.map.fitBounds(polygon.getBounds());

        polygon.bindPopup(zone.nom).openPopup();
    }

    // ✅ Afficher uniquement les sommets qui sont dans cette zone
    sommets.forEach(function (s) {
        // Vérifier si ce sommet est dans les points de la zone (via Ray-Casting côté JS)
        if (pointInPolygon(s.latitude, s.longitude, zone.points)) {
            L.marker([s.latitude, s.longitude])
                .addTo(window.map)
                .bindPopup('Sommet #' + s.id + '<br>' + s.latitude + ', ' + s.longitude);
        }
    });

});

// ✅ Algorithme Ray-Casting en JS (identique à celui Python)
function pointInPolygon(lat, lng, points) {
    var n = points.length;
    var inside = false;
    var px = lng, py = lat;
    var j = n - 1;

    for (var i = 0; i < n; i++) {
        var xi = points[i].lng, yi = points[i].lat;
        var xj = points[j].lng, yj = points[j].lat;

        if (((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
        j = i;
    }
    return inside;
}