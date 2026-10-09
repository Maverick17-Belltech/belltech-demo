/* =========================================================
   Belltech Demo - Código común a todas las páginas
   Ruta: belltech-demo/assets/js/comun.js
   Inserta: banner DEMO, encabezado con menú y pie de página.
   Cada página solo tiene que incluir este script al final del <body>.
   ========================================================= */
(function () {
  'use strict';

  var BD = (window.BelltechDemo = window.BelltechDemo || {});

  /* ---------- Raíz del sitio ----------
     Se calcula a partir de la ruta con la que se cargó este script:
     "assets/js/comun.js"    -> raíz ""     (página en la raíz)
     "../assets/js/comun.js" -> raíz "../"  (página en una subcarpeta) */
  var scriptActual =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName('script');
      return s[s.length - 1];
    })();
  var srcScript = scriptActual.getAttribute('src') || '';
  BD.raiz = srcScript.replace(/assets\/js\/comun\.js.*$/, '');

  /* ---------- Configuración general ---------- */
  BD.logo = {
    color: 'https://belltech.la/wp-content/uploads/2025/02/logo-belltech.svg',
    blanco: 'https://belltech.la/wp-content/uploads/2025/02/logo-belltech-white.svg'
  };

  // Menú principal: para agregar o quitar opciones, editar solo esta lista
  BD.menu = [
    { texto: 'Inicio', ruta: '' },
    { texto: 'Soluciones', ruta: 'soluciones/' },
    { texto: 'Servicios', ruta: 'servicios/' },
    { texto: 'NICE Cognigy', ruta: 'nice-cognigy/', destacado: true },
    { texto: 'Partners', ruta: 'partners/' },
    { texto: 'Conócenos', ruta: 'conocenos/' },
    { texto: 'Contacto', ruta: 'contacto/' }
  ];

  BD.paises = ['Argentina', 'Brasil', 'Chile', 'Colombia', 'Ecuador', 'Perú', 'Uruguay', 'México'];

  /* ---------- Utilidades ---------- */
  function rutaAbsoluta(ruta) {
    return new URL(BD.raiz + ruta, window.location.href).pathname;
  }

  function esPaginaActual(ruta) {
    var actual = window.location.pathname.replace(/index\.html$/, '');
    var destino = rutaAbsoluta(ruta);
    if (ruta === '') return actual === destino;
    return actual.indexOf(destino) === 0;
  }

  function htmlLogo(variante) {
    return (
      '<img src="' + BD.logo[variante] + '" alt="Belltech" ' +
      'onerror="this.outerHTML=\'<span class=&quot;logo-texto&quot;>Belltech</span>\'">'
    );
  }

  /* ---------- Banner DEMO + encabezado ---------- */
  function insertarZonaSuperior() {
    if (document.getElementById('banner-demo')) return;

    var zona = document.createElement('div');
    zona.className = 'zona-superior';

    var banner = document.createElement('div');
    banner.id = 'banner-demo';
    banner.setAttribute('role', 'note');
    banner.textContent =
      'SITIO DE DEMOSTRACIÓN · No es el sitio oficial de Belltech · Todos los datos son ficticios';

    var enlaces = BD.menu
      .map(function (item) {
        var clases = 'nav__enlace';
        if (item.destacado) clases += ' nav__enlace--destacado';
        if (esPaginaActual(item.ruta)) clases += ' nav__enlace--activo';
        return '<a class="' + clases + '" href="' + BD.raiz + item.ruta + '">' + item.texto + '</a>';
      })
      .join('');

    var encabezado = document.createElement('header');
    encabezado.className = 'encabezado';
    encabezado.innerHTML =
      '<div class="encabezado__interior">' +
      '  <a class="encabezado__logo" href="' + (BD.raiz || './') + '">' + htmlLogo('color') + '</a>' +
      '  <button class="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false">&#9776;</button>' +
      '  <nav class="nav" aria-label="Menú principal">' +
           enlaces +
      '    <a class="btn btn--primario btn--chico nav__portal" href="' + BD.raiz + 'portal/">Portal clientes</a>' +
      '  </nav>' +
      '</div>';

    zona.appendChild(banner);
    zona.appendChild(encabezado);
    document.body.insertBefore(zona, document.body.firstChild);

    // Menú en celular
    var boton = encabezado.querySelector('.menu-toggle');
    var nav = encabezado.querySelector('.nav');
    boton.addEventListener('click', function () {
      var abierto = nav.classList.toggle('nav--abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }

  /* ---------- Pie de página ---------- */
  function insertarPie() {
    if (document.getElementById('pie-demo')) return;

    var r = BD.raiz;
    var pie = document.createElement('footer');
    pie.id = 'pie-demo';
    pie.className = 'pie';
    pie.innerHTML =
      '<div class="pie__grilla">' +
      '  <div>' +
      '    <div class="pie__logo">' + htmlLogo('blanco') + '</div>' +
      '    <p>El aliado estratégico que tu empresa necesita para alcanzar su máximo potencial.</p>' +
      '    <p class="pie__lema">¡Hazlo simple, hazlo Belltech!</p>' +
      '  </div>' +
      '  <div>' +
      '    <h4>Soluciones</h4>' +
      '    <ul>' +
      '      <li><a href="' + r + 'soluciones/#dpa">Datos y Automatización (DPA)</a></li>' +
      '      <li><a href="' + r + 'soluciones/#experiencia">Experiencia del Cliente</a></li>' +
      '      <li><a href="' + r + 'soluciones/#sucursales">Gestión de Sucursales</a></li>' +
      '      <li><a href="' + r + 'soluciones/#productividad">Productividad</a></li>' +
      '      <li><a href="' + r + 'nice-cognigy/">NICE Cognigy y CXone</a></li>' +
      '    </ul>' +
      '  </div>' +
      '  <div>' +
      '    <h4>Empresa</h4>' +
      '    <ul>' +
      '      <li><a href="' + r + 'servicios/">Servicios</a></li>' +
      '      <li><a href="' + r + 'partners/">Partners</a></li>' +
      '      <li><a href="' + r + 'conocenos/">Conócenos</a></li>' +
      '      <li><a href="' + r + 'contacto/">Pedí una demo</a></li>' +
      '      <li><a href="' + r + 'portal/">Portal clientes</a></li>' +
      '    </ul>' +
      '  </div>' +
      '  <div>' +
      '    <h4>Presencia en 8 países</h4>' +
      '    <ul>' +
             BD.paises.map(function (p) { return '<li>' + p + '</li>'; }).join('') +
      '    </ul>' +
      '  </div>' +
      '</div>' +
      '<div class="pie__legal">' +
      '  <span>© 2026 Belltech · Sitio de demostración. Todos los datos son ficticios.</span>' +
      '  <span>' +
      '    <a href="https://www.linkedin.com/company/belltech/" target="_blank" rel="noopener">LinkedIn</a> · ' +
      '    <a href="https://www.youtube.com/@belltechlatam3713" target="_blank" rel="noopener">YouTube</a>' +
      '  </span>' +
      '</div>';

    document.body.appendChild(pie);
  }

  /* ---------- Aviso flotante ---------- */
  BD.mostrarAviso = function (texto) {
    var aviso = document.getElementById('aviso-flotante');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'aviso-flotante';
      aviso.className = 'aviso-flotante';
      aviso.setAttribute('role', 'status');
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add('aviso-flotante--visible');
    clearTimeout(BD._temporizadorAviso);
    BD._temporizadorAviso = setTimeout(function () {
      aviso.classList.remove('aviso-flotante--visible');
    }, 3500);
  };

  /* ---------- Botones "Hablá con nuestro agente IA" ----------
     Cualquier elemento con data-accion="abrir-chat" abre el Webchat.
     Hasta el H5 (Webchat), muestra un aviso de "próximamente". */
  function activarAccionesChat() {
    document.addEventListener('click', function (e) {
      var disparador = e.target.closest('[data-accion="abrir-chat"]');
      if (!disparador) return;
      e.preventDefault();
      if (typeof BD.abrirChat === 'function') {
        BD.abrirChat();
      } else {
        BD.mostrarAviso('Nuestro agente IA estará disponible muy pronto en este sitio.');
      }
    });
  }

  /* ---------- Inicio ---------- */
  function iniciar() {
    insertarZonaSuperior();
    insertarPie();
    activarAccionesChat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
