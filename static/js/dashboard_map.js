document.addEventListener('DOMContentLoaded', function () {

    var statusColors = {
        'visite': '#22c55e',
        'en_cours': '#f59e0b',
        'incident': '#ef4444',
        'en_attente': '#3b82f6',
    };

    // 🎯 SOMMETS (icône simple sans background)
    sommets.forEach(function (s) {

        var color = statusColors[s.status] || statusColors['en_attente'];

        var lat = parseFloat(s.latitude);
        var lng = parseFloat(s.longitude);

        var icon = L.divIcon({
            className: 'custom-icon',
            html: `
                <i class="fas fa-map-marker-alt" style="
                    color:${color};
                    font-size:20px;
                    text-shadow:0 1px 3px rgba(0,0,0,0.4);
                "></i>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        });

        L.marker([lat, lng], { icon: icon })
            .addTo(window.map)
            .bindPopup(
                `<b>Sommet</b><br>
                 Lat : ${lat.toFixed(5)}<br>
                 Lng : ${lng.toFixed(5)}<br>
                 Status : <strong>${s.status}</strong>`
            );
    });

    // 🟤 ZONES (polygones seulement)
    zones.forEach(function (zone) {

        var latlngs = zone.points.map(function (p) {
            return [parseFloat(p.lat), parseFloat(p.lng)];
        });

        if (latlngs.length > 0) {
            L.polygon(latlngs, {
                color: 'brown',
                fillOpacity: 0.3,
                weight: 2
            })
            .addTo(window.map)
            .bindPopup(zone.nom);
        }
    });

    // 🗺️ FIT BOUNDS
    var allPoints = [];

    zones.forEach(function (zone) {
        zone.points.forEach(function (p) {
            allPoints.push([parseFloat(p.lat), parseFloat(p.lng)]);
        });
    });

    if (allPoints.length > 0) {
        window.map.fitBounds(L.latLngBounds(allPoints));
    }

});


function toggleZone(el) {
    el.parentElement.classList.toggle('active');
}