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