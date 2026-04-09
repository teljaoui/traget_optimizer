document.addEventListener('DOMContentLoaded', function () {

    // Dessiner le polygone de la zone
    var latlngs = zone.points.map(function (p) { return [p.lat, p.lng]; });

    if (latlngs.length > 0) {
        var polygon = L.polygon(latlngs, {
            color: 'black',
            fillColor: 'transparent',
            fillOpacity: 0.3
        }).addTo(window.map);

        window.map.fitBounds(polygon.getBounds());
        polygon.bindPopup(zone.nom).openPopup();
    }

    // Afficher les sommets dans la zone
    sommets.forEach(function (s) {
        if (!pointInPolygon(s.latitude, s.longitude, zone.points)) return;

        L.marker([s.latitude, s.longitude])
            .addTo(window.map)
            .bindPopup('Sommet #' + s.id + '<br>' + s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5));
    });

    // Réinitialiser le chemin quand on change d'algorithme
    document.getElementById('zone-algorithme').addEventListener('change', function () {
        clearChemin();
    });

});

// ============================================================
// Ray-Casting
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

// ============================================================
// État global
// ============================================================
var cheminLayers = [];
var cheminMarkers = [];

// ============================================================
// Helpers
// ============================================================
function makeNumIcon(index, isStart) {
    return L.divIcon({
        className: '',
        html: '<div style="background:' + (isStart ? '#2ecc71' : '#e74c3c') +
            ';color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);">' +
            (index + 1) + '</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

function clearChemin() {
    cheminLayers.forEach(function (l) { window.map.removeLayer(l); });
    cheminLayers = [];
    cheminMarkers.forEach(function (m) { window.map.removeLayer(m); });
    cheminMarkers = [];

    var info = document.getElementById('algo-result-info');
    if (info) { info.style.display = 'none'; info.innerHTML = ''; }
}

// ============================================================
// OSRM — vraie route entre 2 points
// ============================================================
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
        });
}

// ============================================================
// Dessiner le chemin via OSRM
// ============================================================
function dessinerChemin(chemin, btn) {
    var promise = Promise.resolve();
    var allLatLngs = [];

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
            if (index === chemin.length - 1) return;
            var m = L.marker([s.latitude, s.longitude], { icon: makeNumIcon(index, index === 0) })
                .addTo(window.map)
                .bindPopup('<b>Étape ' + (index + 1) + '</b><br>Sommet #' + s.id);
            cheminMarkers.push(m);
        });

        if (allLatLngs.length > 0) {
            window.map.fitBounds(L.latLngBounds(allLatLngs), { padding: [30, 30] });
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-route"></i> Tester';
    });
}

// ============================================================
// Bouton Tester
// ============================================================
document.getElementById('btn-test-zone').addEventListener('click', function () {
    var algoId = document.getElementById('zone-algorithme').value;

    if (!algoId) {
        alert('Veuillez choisir un algorithme.');
        return;
    }

    var btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calcul...';

    clearChemin();

    fetch('/zone/' + zone.id + '/tsp/?algo_id=' + algoId, {
        method: 'GET',
        headers: { 'X-CSRFToken': csrfToken }
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.error) {
                alert('Erreur : ' + data.error);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-route"></i> Tester';
                return;
            }

            var info = document.getElementById('algo-result-info');
            info.style.display = 'block';
            info.innerHTML =
                '<i class="fas fa-check-circle"></i> <strong>' + data.algorithme + '</strong><br>' +
                '📍 ' + data.nb_sommets + ' sommets &nbsp;|&nbsp; 📏 Distance : ' + data.distance_totale + ' km';
            dessinerChemin(data.chemin, btn);
        })
        .catch(function (err) {
            console.error(err);
            alert('Erreur réseau.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-route"></i> Tester';
        });
});

// ============================================================
// Bouton Annuler
// ============================================================
document.getElementById('btn-cancel-zone').addEventListener('click', function () {
    clearChemin();
    document.getElementById('zone-algorithme').value = '';
});