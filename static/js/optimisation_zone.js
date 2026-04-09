/* ── Remplir le select utilisateurs ── */
var userSelect = document.getElementById('zone-user');
usersData.forEach(function(u) {
    var opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.first_name + ' ' +u.last_name;
    userSelect.appendChild(opt);
});

/* ── Initialisation de la carte ── */
document.addEventListener('DOMContentLoaded', function() {

    // ✅ Afficher tous les sommets de la BDD comme marqueurs
    sommets.forEach(function(s) {
        L.marker([s.latitude, s.longitude]).addTo(window.map);
    });

    // ✅ Afficher les zones comme polygones colorés SANS marqueurs sur les coins
    zones.forEach(function(zone) {
        var latlngs = zone.points.map(function(p) { return [p.lat, p.lng]; });
        if (latlngs.length > 0) {
            L.polygon(latlngs, { color: 'brown', fillOpacity: 0.3 })
             .addTo(window.map)
             .bindPopup(zone.nom);
            // ❌ pas de L.marker() ici — seulement le polygone
        }
    });

});

/* ── Mode dessin ── */
var drawingMode    = false;
var drawnPoints    = [];
var drawnMarkers   = [];
var drawnPolyline  = null;
var previewPolygon = null;

document.getElementById('btn-draw-zone').addEventListener('click', function(e) {
    e.preventDefault();
    startDrawing();
});

function startDrawing() {
    drawingMode = true;
    drawnPoints = [];
    drawnMarkers.forEach(function(m) { window.map.removeLayer(m); });
    drawnMarkers = [];
    if (drawnPolyline)  { window.map.removeLayer(drawnPolyline);  drawnPolyline = null; }
    if (previewPolygon) { window.map.removeLayer(previewPolygon); previewPolygon = null; }

    document.getElementById('zone-save-panel').style.display = 'block';
    document.getElementById('zone-points-count').textContent = '0';
    document.getElementById('zone-nom').value = '';
    window.map.getContainer().style.cursor = 'crosshair';

    window.map.on('click', onMapClick);
    window.map.on('dblclick', onMapDblClick);
}

function onMapClick(e) {
    if (!drawingMode) return;
    var latlng = e.latlng;
    drawnPoints.push({ lat: latlng.lat, lng: latlng.lng });

    var marker = L.circleMarker([latlng.lat, latlng.lng], {
        radius: 6, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1
    }).addTo(window.map);
    drawnMarkers.push(marker);

    document.getElementById('zone-points-count').textContent = drawnPoints.length;
    updatePreview();
}

function onMapDblClick(e) {
    L.DomEvent.stop(e);
    if (drawnPoints.length >= 3) {
        finishDrawing();
    }
}

function updatePreview() {
    if (drawnPolyline) window.map.removeLayer(drawnPolyline);
    if (drawnPoints.length > 1) {
        var latlngs = drawnPoints.map(function(p) { return [p.lat, p.lng]; });
        drawnPolyline = L.polyline(latlngs, { color: '#2563eb', dashArray: '6,4', weight: 2 })
                         .addTo(window.map);
    }
    if (previewPolygon) window.map.removeLayer(previewPolygon);
    if (drawnPoints.length >= 3) {
        var latlngs = drawnPoints.map(function(p) { return [p.lat, p.lng]; });
        previewPolygon = L.polygon(latlngs, { color: '#2563eb', fillOpacity: 0.15 })
                          .addTo(window.map);
    }
}

function finishDrawing() {
    drawingMode = false;
    window.map.getContainer().style.cursor = '';
    window.map.off('click', onMapClick);
    window.map.off('dblclick', onMapDblClick);
    if (drawnPolyline) { window.map.removeLayer(drawnPolyline); drawnPolyline = null; }
}

/* ── Annuler ── */
document.getElementById('btn-cancel-zone').addEventListener('click', function() {
    finishDrawing();
    drawnMarkers.forEach(function(m) { window.map.removeLayer(m); });
    drawnMarkers  = [];
    drawnPoints   = [];
    if (previewPolygon) { window.map.removeLayer(previewPolygon); previewPolygon = null; }
    document.getElementById('zone-save-panel').style.display = 'none';
});

/* ── Sauvegarder ── */
document.getElementById('btn-save-zone').addEventListener('click', function() {
    var nom    = document.getElementById('zone-nom').value.trim();
    var userId = document.getElementById('zone-user').value;

    if (!nom) { alert('Veuillez saisir un nom pour la zone.'); return; }
    if (drawnPoints.length < 3) { alert('Dessinez au moins 3 points.'); return; }

    var payload = {
        nom:     nom,
        user_id: userId ? parseInt(userId) : null,
        points:  drawnPoints
    };

    fetch('/optimisation/' + optimisationId + '/zones/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            var latlngs = drawnPoints.map(function(p) { return [p.lat, p.lng]; });
            L.polygon(latlngs, { color: 'green' })
             .addTo(window.map)
             .bindPopup(nom);

            drawnMarkers.forEach(function(m) { window.map.removeLayer(m); });
            drawnMarkers  = [];
            drawnPoints   = [];
            if (previewPolygon) { window.map.removeLayer(previewPolygon); previewPolygon = null; }
            document.getElementById('zone-save-panel').style.display = 'none';

            location.reload();
        } else {
            alert('Erreur : ' + (data.error || 'inconnue'));
        }
    })
    .catch(function(err) { alert('Erreur réseau : ' + err); });
});

/* ── Toggle zone dans la liste ── */
function toggleZone(el) {
    el.parentElement.classList.toggle("active");
}

