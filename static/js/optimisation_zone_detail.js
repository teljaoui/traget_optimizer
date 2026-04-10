document.addEventListener('DOMContentLoaded', function () {

    // ÉTAPE 1 : Dessiner le polygone + sommets (identique au user)
    if (zoneData && zoneData.points && zoneData.points.length > 0) {

        var latlngs = zoneData.points.map(function (p) { return [p.lat, p.lng]; });

        var polygon = L.polygon(latlngs, {
            color: 'black',
            fillColor: 'transparent',
            fillOpacity: 0.15
        }).addTo(window.map);

        window.map.fitBounds(polygon.getBounds());
        polygon.bindPopup(zoneData.nom).openPopup();

        // Filtrage côté JS comme le user
        sommets.forEach(function (s) {
            if (!pointInPolygon(s.latitude, s.longitude, zoneData.points)) return;
            L.marker([s.latitude, s.longitude])
                .addTo(window.map)
                .bindPopup('Sommet #' + s.id + '<br>' + s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5));
        });
    }

    // ÉTAPE 2 : Trajet existant → tracer le chemin directement (identique au user)
    if (trajetData && trajetData.sommets && trajetData.sommets.length > 0) {
        dessinerChemin(trajetData.sommets, null);
    }

});

// ============================================================
// Ray-Casting — identique au user
// ============================================================
function pointInPolygon(lat, lng, points) {
    var n = points.length, inside = false;
    var px = lng, py = lat, j = n - 1;
    for (var i = 0; i < n; i++) {
        var xi = points[i].lng, yi = points[i].lat;
        var xj = points[j].lng, yj = points[j].lat;
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
            inside = !inside;
        j = i;
    }
    return inside;
}

// État global
var cheminLayers = [];
var cheminMarkers = [];

// Icône numérotée — identique au user
function makeNumIcon(ordre, isStart, isEnd) {
    var bg = isStart ? '#2ecc71' : isEnd ? '#f59e0b' : '#e74c3c';
    return L.divIcon({
        className: '',
        html: '<div style="background:' + bg +
            ';color:#fff;border-radius:50%;width:26px;height:26px;' +
            'display:flex;align-items:center;justify-content:center;' +
            'font-size:11px;font-weight:bold;border:2px solid #fff;' +
            'box-shadow:0 2px 6px rgba(0,0,0,0.4);">' + ordre + '</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

// OSRM — identique au user
function getRoute(from, to) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' +
        from.longitude + ',' + from.latitude + ';' +
        to.longitude + ',' + to.latitude +
        '?overview=full&geometries=geojson';

    return fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d.routes && d.routes.length > 0) {
                return d.routes[0].geometry.coordinates.map(function (c) {
                    return [c[1], c[0]];
                });
            }
            return [[from.latitude, from.longitude], [to.latitude, to.longitude]];
        })
        .catch(function () {
            return [[from.latitude, from.longitude], [to.latitude, to.longitude]];
        });
}

// Dessiner le chemin — identique au user
function dessinerChemin(chemin, btn) {
    var promise = Promise.resolve();
    var allLatLngs = [];
    var totalSommets = chemin.length;

    for (var i = 0; i < chemin.length - 1; i++) {
        (function (idx) {
            promise = promise.then(function () {
                return getRoute(chemin[idx], chemin[idx + 1])
                    .then(function (latlngs) {
                        allLatLngs = allLatLngs.concat(latlngs);
                        var segment = L.polyline(latlngs, {
                            color: '#e74c3c',
                            weight: 4,
                            opacity: 0.85
                        }).addTo(window.map);
                        cheminLayers.push(segment);
                    });
            });
        })(i);
    }

    promise.then(function () {
        chemin.forEach(function (s, index) {
            var isStart = s.ordre === 1 || index === 0;
            var isEnd = s.ordre === totalSommets || index === chemin.length - 1;
            var label = isStart ? ' Départ' : isEnd ? 'Retour au départ' : 'Étape ' + s.ordre;

            var m = L.marker([s.latitude, s.longitude], {
                icon: makeNumIcon(s.ordre, isStart, isEnd)
            })
                .addTo(window.map)
                .bindPopup('<b>' + label + '</b><br>Sommet #' + s.id);
            cheminMarkers.push(m);
        });

        if (allLatLngs.length > 0) {
            window.map.fitBounds(L.latLngBounds(allLatLngs), { padding: [30, 30] });
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-route"></i> Générer';
        }
    });
}