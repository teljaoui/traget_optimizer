
var pointsImportantsOrdonnes = [];
var marqueursSommets = {};


function makeDefaultIcon() {
    return L.divIcon({
        className: '',
        html: '<div style="background:#3b82f6;color:#fff;border-radius:50%;width:24px;height:24px;' +
            'display:flex;align-items:center;justify-content:center;font-size:10px;' +
            'border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>' +
            '</svg></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function makeSelectedIcon(ordre) {
    return L.divIcon({
        className: '',
        html: '<div style="background:#f59e0b;color:#fff;border-radius:50%;width:32px;height:32px;' +
            'display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;' +
            'border:2.5px solid #fff;box-shadow:0 0 0 2px #f59e0b,0 3px 10px rgba(0,0,0,0.4);">' +
            '★' + ordre + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

function togglePointImportantCarte(sommetId) {
    var idx = pointsImportantsOrdonnes.indexOf(sommetId);
    if (idx === -1) {
        pointsImportantsOrdonnes.push(sommetId);
    } else {
        pointsImportantsOrdonnes.splice(idx, 1);
    }
    rafraichirTousMarqueurs();
    mettreAJourCompteur();
    mettreAJourPanneauListe();
}

function rafraichirTousMarqueurs() {
    Object.keys(marqueursSommets).forEach(function (id) {
        var sid = parseInt(id);
        var marker = marqueursSommets[id];
        var idx = pointsImportantsOrdonnes.indexOf(sid);
        if (idx !== -1) {
            marker.setIcon(makeSelectedIcon(idx + 1));
        } else {
            marker.setIcon(makeDefaultIcon());
        }
        var s = sommets.find(function (x) { return x.id === sid; });
        if (s) {
            var labelAction = idx !== -1
                ? '<em style="color:#065f46;">✓ Priorité #' + (idx + 1) + ' — cliquez pour retirer</em>'
                : '<em style="color:#f59e0b;">Cliquez pour ajouter en priorité</em>';
            marker.setTooltipContent(
                '<div style="font-size:12px;line-height:1.5;">' +
                '<strong>Sommet #' + s.id + '</strong><br>' +
                s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5) + '<br>' +
                labelAction + '</div>'
            );
        }
    });
}

function mettreAJourCompteur() {
    var el = document.getElementById('compteur-points');
    if (!el) return;
    var n = pointsImportantsOrdonnes.length;
    el.textContent = n === 0
        ? 'Aucun point sélectionné — cliquez sur un sommet de la carte.'
        : n + ' point' + (n > 1 ? 's' : '') + ' prioritaire' + (n > 1 ? 's' : '') +
        ' sélectionné' + (n > 1 ? 's' : '') + '.';
    el.style.color = n > 0 ? '#065f46' : '#6b7280';
}

function mettreAJourPanneauListe() {
    var container = document.getElementById('liste-points-importants');
    if (!container) return;

    if (pointsImportantsOrdonnes.length === 0) {
        container.innerHTML =
            '<p style="padding:14px 12px;font-size:12px;color:#aaa;text-align:center;margin:0;">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" style="vertical-align:middle;margin-right:4px;">' +
            '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>' +
            '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
            'Cliquez sur un sommet de la carte pour le sélectionner.</p>';
        return;
    }

    container.innerHTML = pointsImportantsOrdonnes.map(function (id, idx) {
        var s = sommets.find(function (x) { return x.id === id; });
        if (!s) return '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;' +
            (idx < pointsImportantsOrdonnes.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : '') +
            'font-size:12px;color:#374151;background:#fffbeb;">' +
            '<span style="flex:1;font-weight:500;">Sommet ' + s.id + '</span>' +
            '<span style="font-size:11px;color:#9ca3af;">' +
            s.latitude.toFixed(4) + ', ' + s.longitude.toFixed(4) + '</span>' +
            '<button onclick="retirerPointImportant(' + id + ')" ' +
            'style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:16px;' +
            'line-height:1;padding:0 2px;font-weight:bold;" title="Retirer">×</button>' +
            '</div>';
    }).join('');
}

function retirerPointImportant(id) {
    var idx = pointsImportantsOrdonnes.indexOf(id);
    if (idx !== -1) pointsImportantsOrdonnes.splice(idx, 1);
    rafraichirTousMarqueurs();
    mettreAJourCompteur();
    mettreAJourPanneauListe();
}

function reinitialiserPointsImportants() {
    pointsImportantsOrdonnes = [];
    rafraichirTousMarqueurs();
    mettreAJourCompteur();
    mettreAJourPanneauListe();
}


document.addEventListener('DOMContentLoaded', function () {


    if (zoneData && zoneData.points && zoneData.points.length > 0) {

        var latlngs = zoneData.points.map(function (p) { return [p.lat, p.lng]; });

        var polygon = L.polygon(latlngs, {
            color: 'black',
            fillColor: 'transparent',
            fillOpacity: 0.3
        }).addTo(window.map);

        window.map.fitBounds(polygon.getBounds());
        polygon.bindPopup(zoneData.nom).openPopup();

        var modeSelection = !(trajetData && trajetData.sommets && trajetData.sommets.length > 0);

        sommets.forEach(function (s) {
            if (!pointInPolygon(s.latitude, s.longitude, zoneData.points)) return;

            var marker = L.marker([s.latitude, s.longitude], {
                icon: makeDefaultIcon()
            }).addTo(window.map);

            if (modeSelection) {
                marker.bindTooltip(
                    '<div style="font-size:12px;line-height:1.5;">' +
                    '<strong>Sommet #' + s.id + '</strong><br>' +
                    s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5) + '<br>' +
                    '<em style="color:#f59e0b;">Cliquez pour ajouter en priorité</em></div>',
                    { direction: 'top', offset: [0, -12], sticky: false }
                );

                marker.on('click', function () {
                    togglePointImportantCarte(s.id);
                });

                marker.on('mouseover', function () {
                    var el = marker.getElement();
                    if (el) el.style.cursor = 'pointer';
                });

            } else {
                marker.bindPopup(
                    'Sommet #' + s.id + '<br>' +
                    s.latitude.toFixed(5) + ', ' + s.longitude.toFixed(5)
                );
            }

            marqueursSommets[s.id] = marker;
        });

        if (modeSelection) {
            mettreAJourPanneauListe();
            mettreAJourCompteur();
        }
    }


    if (trajetData && trajetData.sommets && trajetData.sommets.length > 0) {
        dessinerChemin(trajetData.sommets, null);
        return;
    }


    var btnGenerer = document.getElementById('btn-generer-trajet');
    if (!btnGenerer) return;

    var algoSelect = document.getElementById('agent-algorithme');
    if (algoSelect) {
        algoSelect.addEventListener('change', function () {
            clearChemin();
            reinitialiserPointsImportants();
        });
    }

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
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                algo_id: algoId,
                points_importants: pointsImportantsOrdonnes
            })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.error) {
                    alert('Erreur : ' + data.error);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-route"></i> Générer mon trajet';
                    return;
                }

                var info = document.getElementById('agent-result-info');
                var contrainte = (data.points_fixes && data.points_fixes > 0)
                    ? ' &nbsp;|&nbsp; ★ ' + data.points_fixes + ' point(s) prioritaire(s)'
                    : ' &nbsp;|&nbsp; Sans contrainte';
                info.style.display = 'block';
                info.innerHTML =
                    '<i class="fas fa-check-circle"></i> <strong>' + data.algorithme + '</strong>' +
                    contrainte + '<br>' +
                    '📍 ' + data.nb_sommets + ' sommets &nbsp;|&nbsp; 📏 ' + data.trajet.distance_totale + ' km';

                mettreAJourListeSommets(data.trajet.sommets);
                dessinerChemin(data.trajet.sommets, btn);
            })
            .catch(function (err) {
                console.error(err);
                alert('Erreur réseau.');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-route"></i> Générer mon trajet';
            });
    });

    var btnAnnuler = document.getElementById('btn-annuler-trajet');
    if (btnAnnuler) {
        btnAnnuler.addEventListener('click', function () {
            clearChemin();
            if (algoSelect) algoSelect.value = '';
            reinitialiserPointsImportants();
            var info = document.getElementById('agent-result-info');
            if (info) { info.style.display = 'none'; info.innerHTML = ''; }
        });
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                if (typeof window.map !== 'undefined') {
                    L.marker([lat, lng])
                        .addTo(window.map)
                        .bindPopup('📍 Ma position actuelle')
                        .openPopup();
                    window.map.setView([lat, lng], 14);
                }
                var infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'padding:10px;background:#ecfdf5;margin-top:10px;border-radius:8px;font-size:12px;';
                infoDiv.innerHTML = '📍 Position : ' + lat.toFixed(5) + ', ' + lng.toFixed(5);
                var rc = document.querySelector('.right-content');
                if (rc) rc.prepend(infoDiv);
            },
            function (err) { console.error('Géolocalisation :', err); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

});



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


var cheminLayers = [];
var cheminMarkers = [];


function clearChemin() {
    cheminLayers.forEach(function (l) { window.map.removeLayer(l); });
    cheminLayers = [];
    cheminMarkers.forEach(function (m) { window.map.removeLayer(m); });
    cheminMarkers = [];
    var info = document.getElementById('agent-result-info');
    if (info) { info.style.display = 'none'; info.innerHTML = ''; }
}


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
            var label = isStart ? 'Départ' : isEnd ? 'Retour au départ' : 'Étape ' + s.ordre;

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
            btn.innerHTML = '<i class="fas fa-route"></i> Générer mon trajet';
        }
    });
}


function mettreAJourListeSommets(sommets) {
    var container = document.getElementById('sommets-container');
    if (!container) return;

    var totalSommets = sommets.length;
    container.innerHTML = '';

    sommets.forEach(function (s) {
        var isFirst = s.ordre === 1;
        var isLast = s.ordre === totalSommets;
        var bg = isFirst ? '#2ecc71' : isLast ? '#f59e0b' : '#e74c3c';
        var label = isFirst ? 'Point de départ' : isLast ? 'Retour au départ' : 'Sommet ' + s.ordre;

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


document.addEventListener('change', function (e) {
    if (!e.target.classList.contains('statut-select')) return;

    var select = e.target;
    var ordre = select.dataset.ordre;
    var nouveau = select.value;
    var label = select.options[select.selectedIndex].text;

    if (!confirm('Confirmer : passer le point ' + ordre + ' en "' + label + '" ?')) {
        select.value = 'en_attente';
        return;
    }

    var url = updateStatutUrl.replace('/0/', '/' + ordre + '/');

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ status: nouveau }),
    })
        .then(function (r) {
            if (!r.ok) {
                return r.json().then(function (err) {
                    throw new Error(err.error || 'Erreur HTTP ' + r.status);
                });
            }
            return r.json();
        })
        .then(function (data) {
            if (data.success) {
                var item = document.getElementById('point-' + ordre);
                if (item) {
                    item.style.transition = 'opacity 0.4s';
                    item.style.opacity = '0';
                    setTimeout(function () {
                        item.remove();
                        var restants = document.querySelectorAll('#sommets-container .zone-item');
                        if (restants.length === 0) {
                            var tousTraites = document.getElementById('tous-traites');
                            if (tousTraites) tousTraites.style.display = 'block';
                        }
                    }, 400);
                }
            }
        })
        .catch(function (err) {
            alert('Erreur : ' + err.message);
            select.value = 'en_attente';
        });
});