/* =========================================================
   Belltech Demo - Código común a todas las páginas
   Ruta: belltech-demo/assets/js/comun.js
   ========================================================= */
(function () {
  'use strict';

  // Espacio de nombres único para la demo (lo vamos a ampliar en los próximos hitos)
  window.BelltechDemo = window.BelltechDemo || {};

  // Inserta el banner DEMO arriba de todo, una sola vez por página
  function insertarBannerDemo() {
    if (document.getElementById('banner-demo')) return;

    var banner = document.createElement('div');
    banner.id = 'banner-demo';
    banner.setAttribute('role', 'note');
    banner.textContent =
      'SITIO DE DEMOSTRACIÓN · No es el sitio oficial de Belltech · Todos los datos son ficticios';

    document.body.insertBefore(banner, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertarBannerDemo);
  } else {
    insertarBannerDemo();
  }
})();
