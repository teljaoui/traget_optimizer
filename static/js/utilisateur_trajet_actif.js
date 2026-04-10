document.addEventListener('DOMContentLoaded', function () {

    // ============================================================
    // ÉTAPE 1 : Toujours dessiner le polygone + sommets (comme l'admin)
    // ============================================================
    if (zoneData && zoneData.points && zoneData.points.length > 0) {

        var latlngs = zoneData.points.map(function (p) { return [p.lat, p.lng]; });

        var polygon = L.polygon(latlngs, {
            color:       'black',
            fillColor:   'transparent',
            fillOpacity: 0.3
        }).addTo(window.map);

        window.map.fitBounds(polygon.getBounds());
        polygon.bindPopup(zoneData.nom).openPopup();

        // Afficher les sommets dans la zone (ray-casting, identique à l'admin)
        sommets.forEach(function (s) {
            if (!pointInPolygon(s.latitude, s.longitude, zoneData.points)) return;

            L.marker([s.latitude, s.longitude])
                .addTo(window.map)
                .bindPopup('Sommet #' + s.id + '<br>' + s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5));
        });
    }

    // ============================================================
    // ÉTAPE 2a : Trajet existant → tracer le chemin directement
    // ============================================================
    if (trajetData && trajetData.sommets && trajetData.sommets.length > 0) {
        dessinerChemin(trajetData.sommets, null);
        return;
    }

    // ============================================================
    // ÉTAPE 2b : Pas de trajet → boutons de génération
    // ============================================================
    var btnGenerer = document.getElementById('btn-generer-trajet');
    var btnAnnuler = document.getElementById('btn-annuler-trajet');
    if (!btnGenerer) return;

    // Réinitialiser le chemin quand on change d'algorithme (identique à l'admin)
    document.getElementById('agent-algorithme').addEventListener('change', function () {
        clearChemin();
    });

    btnGenerer.addEventListener('click', function () {
        var algoId = document.getElementById('agent-algorithme').value;
        if (!algoId) {
            alert('Veuillez choisir un algorithme.');
            return;
        }

        var btn = this;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calcul...';

        clearChemin();

        fetch('/agent/zone/' + zoneId + '/generer/', {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken':  csrfToken
            },
            body: JSON.stringify({ algo_id: algoId })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.error) {
                alert('Erreur : ' + data.error);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-route"></i> Générer mon trajet';
                return;
            }

            // Afficher le résultat (identique au style admin)
            var info = document.getElementById('agent-result-info');
            info.style.display = 'block';
            info.innerHTML =
                '<i class="fas fa-check-circle"></i> <strong>' + data.algorithme + '</strong><br>' +
                '📍 ' + data.nb_sommets + ' sommets &nbsp;|&nbsp; 📏 Distance : ' + data.trajet.distance_totale + ' km';

            // Mettre à jour la liste des sommets dans le panneau
            mettreAJourListeSommets(data.trajet.sommets);

            // Tracer le chemin
            dessinerChemin(data.trajet.sommets, btn);
        })
        .catch(function (err) {
            console.error(err);
            alert('Erreur réseau.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-route"></i> Générer mon trajet';
        });
    });

    btnAnnuler.addEventListener('click', function () {
        clearChemin();
        document.getElementById('agent-algorithme').value = '';
        var info = document.getElementById('agent-result-info');
        if (info) { info.style.display = 'none'; info.innerHTML = ''; }
    });

});

// ============================================================
// Ray-Casting — identique à optimisation_zone_detail.js
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
var cheminLayers  = [];
var cheminMarkers = [];

// ============================================================
// Effacer le chemin — identique à l'admin
// ============================================================
function clearChemin() {
    cheminLayers.forEach(function (l) { window.map.removeLayer(l); });
    cheminLayers = [];
    cheminMarkers.forEach(function (m) { window.map.removeLayer(m); });
    cheminMarkers = [];

    var info = document.getElementById('agent-result-info');
    if (info) { info.style.display = 'none'; info.innerHTML = ''; }
}

// ============================================================
// Icône numérotée — 3 couleurs (vert départ / rouge intermédiaire / orange retour)
// ============================================================
function makeNumIcon(ordre, isStart, isEnd) {
    var bg = isStart ? '#2ecc71' : isEnd ? '#f59e0b' : '#e74c3c';
    return L.divIcon({
        className: '',
        html: '<div style="background:' + bg +
            ';color:#fff;border-radius:50%;width:26px;height:26px;' +
            'display:flex;align-items:center;justify-content:center;' +
            'font-size:11px;font-weight:bold;border:2px solid #fff;' +
            'box-shadow:0 2px 6px rgba(0,0,0,0.4);">' + ordre + '</div>',
        iconSize:   [26, 26],
        iconAnchor: [13, 13]
    });
}

// ============================================================
// OSRM — identique à l'admin
// ============================================================
function getRoute(from, to) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' +
        from.longitude + ',' + from.latitude + ';' +
        to.longitude   + ',' + to.latitude   +
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

// ============================================================
// Dessiner le chemin via OSRM — identique à l'admin
// ============================================================
function dessinerChemin(chemin, btn) {
    var promise    = Promise.resolve();
    var allLatLngs = [];
    var totalSommets = chemin.length;

    for (var i = 0; i < chemin.length - 1; i++) {
        (function (idx) {
            promise = promise.then(function () {
                return getRoute(chemin[idx], chemin[idx + 1])
                    .then(function (latlngs) {
                        allLatLngs = allLatLngs.concat(latlngs);
                        var segment = L.polyline(latlngs, {
                            color:   '#e74c3c',
                            weight:  4,
                            opacity: 0.85
                        }).addTo(window.map);
                        cheminLayers.push(segment);
                    });
            });
        })(i);
    }

    promise.then(function () {
        // Placer les marqueurs numérotés sur chaque sommet
        chemin.forEach(function (s, index) {
            // Sauter le dernier si c'est un retour au départ (même coords que le premier)
            var isStart = s.ordre === 1 || index === 0;
            var isEnd   = s.ordre === totalSommets || index === chemin.length - 1;
            var label   = isStart ? 'Départ' : isEnd ? 'Retour au départ' : 'Étape ' + s.ordre;

            var m = L.marker([s.latitude, s.longitude], { icon: makeNumIcon(s.ordre, isStart, isEnd) })
                .addTo(window.map)
                .bindPopup('<b>' + label + '</b><br>Sommet #' + s.id);
            cheminMarkers.push(m);
        });

        if (allLatLngs.length > 0) {
            window.map.fitBounds(L.latLngBounds(allLatLngs), { padding: [30, 30] });
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-route"></i> Générer mon trajet';
        }
    });
}

// ============================================================
// Mettre à jour dynamiquement la liste des sommets après génération
// ============================================================
function mettreAJourListeSommets(sommets) {
    var container = document.getElementById('sommets-container');
    if (!container) return;

    var totalSommets = sommets.length;
    container.innerHTML = '';

    sommets.forEach(function (s) {
        var isFirst = s.ordre === 1;
        var isLast  = s.ordre === totalSommets;
        var bg      = isFirst ? '#2ecc71' : isLast ? '#f59e0b' : '#e74c3c';
        var label   = isFirst ? 'Point de départ' : isLast ? 'Retour au départ' : 'Sommet ' + s.ordre;

        var div = document.createElement('div');
        div.className = 'zone-item';
        div.id = 'point-' + s.ordre;
        div.innerHTML =
            '<div class="zone-header">' +
                '<div class="point-loc-icon" style="background:' + bg + ';color:#fff;border-radius:50%;' +
                    'width:28px;height:28px;display:flex;align-items:center;justify-content:center;' +
                    'font-weight:bold;font-size:12px;flex-shrink:0;">' + s.ordre + '</div>' +
                '<div class="zone-meta">' +
                    '<p class="zone-name">' + label + '</p>' +
                    '<p class="zone-sub">' + s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5) + '</p>' +
                '</div>' +
                '<span class="gu-status gu-status--active">À visiter</span>' +
            '</div>';
        container.appendChild(div);
    });
}


document.addEventListener('change', function(e) {
    if (!e.target.classList.contains('statut-select')) return;

    const select   = e.target;
    const ordre    = select.dataset.ordre;
    const nouveau  = select.value;
    const label    = select.options[select.selectedIndex].text;

    // Confirmation simple
    if (!confirm(`Confirmer : passer le point ${ordre} en "${label}" ?`)) {
        select.value = 'en_attente';
        return;
    }

    const url = updateStatutUrl.replace('/0/', `/${ordre}/`);

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ status: nouveau }),
    })
    .then(function(r) {
        if (!r.ok) {
            return r.json().then(function(err) {
                throw new Error(err.error || 'Erreur HTTP ' + r.status);
            });
        }
        return r.json();
    })
    .then(function(data) {
        if (data.success) {
            // Masque le point avec animation et le retire du DOM
            var item = document.getElementById('point-' + ordre);
            if (item) {
                item.style.transition = 'opacity 0.4s';
                item.style.opacity    = '0';
                setTimeout(function() {
                    item.remove();
                    // Vérifie s'il reste des points
                    var restants = document.querySelectorAll('#sommets-container .zone-item');
                    if (restants.length === 0) {
                        document.getElementById('tous-traites').style.display = 'block';
                    }
                }, 400);
            }
        }
    })
    .catch(function(err) {
        alert('Erreur : ' + err.message);
        select.value = 'en_attente';
    });
});


document.addEventListener("DOMContentLoaded", function () {

    if (!navigator.geolocation) {
        alert("La géolocalisation n'est pas supportée par votre navigateur");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            console.log("Ma position :", lat, lng);

            // 🔵 Exemple 1 : afficher un marker si tu utilises Leaflet
            if (typeof map !== "undefined") {
                L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup("📍 Ma position actuelle")
                    .openPopup();

                map.setView([lat, lng], 14);
            }

            // 🔵 Exemple 2 : si tu veux juste afficher dans la page
            const info = document.createElement("div");
            info.style.padding = "10px";
            info.style.background = "#ecfdf5";
            info.style.marginTop = "10px";
            info.style.borderRadius = "8px";
            info.innerHTML = `📍 Position: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

            document.querySelector(".right-content").prepend(info);
        },
        function (error) {
            console.error(error);
            alert("Impossible de récupérer votre position");
        },
        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );

});