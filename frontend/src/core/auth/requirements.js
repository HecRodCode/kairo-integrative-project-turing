//  information abount password
    const input   = document.getElementById('password');
    const tooltip = document.getElementById('pass-tooltip');

    input.addEventListener('focus', () => tooltip.classList.add('visible'));
    input.addEventListener('blur',  () => tooltip.classList.remove('visible'))