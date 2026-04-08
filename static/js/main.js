document.addEventListener('DOMContentLoaded', function () {

    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(function (input) {
        input.addEventListener('focus', function () {
            this.parentElement.querySelector('label').style.color = '#6366f1';
        });
        input.addEventListener('blur', function () {
            this.parentElement.querySelector('label').style.color = '#374151';
        });
    });

});

function toggleZone(element) {
    element.parentElement.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', function () {

    window.map = L.map('map').setView([33.9716, -6.8498], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO'
    }).addTo(window.map);

    if (typeof sommets !== "undefined") {
        sommets.forEach(s => {
            L.marker([s.lat, s.lng]).addTo(window.map);
        });
    }

});