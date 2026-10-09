/* =========================================================
   Belltech Demo - Código común a todas las páginas
   Ruta: belltech-demo/assets/js/comun.js
   Inserta: banner DEMO, encabezado con menú, pie de página
   y la burbuja del agente IA.
   También expone utilidades de datos (cargarJSON, catálogo)
   que usan catalogo.js y el portal de clientes.
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
  // Logos alojados en el propio repo: belltech-demo/assets/img/
  BD.logo = {
    color: BD.raiz + 'assets/img/logo-belltech.svg',
    blanco: BD.raiz + 'assets/img/logo-belltech-white.svg'
  };

  // Agente IA: para cambiar el nombre o los textos, editar solo este bloque
  BD.agente = {
    nombre: 'Bella',
    rol: 'Asesora IA de Belltech',
    frase: '¿Te ayudo? Hablá conmigo',
    inicial: 'B'
  };

  // Menú: estos enlaces son fijos. Entre ambos grupos se insertan
  // automáticamente los productos del catálogo (catalogo/index.json).
  BD.menuInicio = [
    { texto: 'Inicio', ruta: '' }
  ];
  BD.menuFin = [
    { texto: 'Contacto', ruta: 'contacto/' }
  ];

  BD.paises = ['Argentina', 'Brasil', 'Chile', 'Colombia', 'Ecuador', 'Perú', 'Uruguay', 'México'];

  /* ---------- Utilidades generales (las usan también catalogo.js y el portal) ---------- */

  // Escapa texto para insertarlo en HTML de forma segura
  BD.esc = function (texto) {
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Identificadores simples: minúsculas, números y guiones
  BD.idValido = function (id) {
    return typeof id === 'string' && /^[a-z0-9-]+$/.test(id);
  };

  // Lee un JSON del sitio, siempre fresco (sin caché)
  BD.cargarJSON = function (ruta) {
    return fetch(BD.raiz + ruta, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar ' + ruta + ' (error ' + r.status + ')');
      return r.json();
    });
  };

  /* ---------- Catálogo de productos ---------- */

  BD.urlProducto = function (marca, id) {
    return BD.raiz + 'producto/?marca=' + encodeURIComponent(marca) + '&id=' + encodeURIComponent(id);
  };

  BD.cargarProducto = function (marca, id) {
    if (!BD.idValido(marca) || !BD.idValido(id)) {
      return Promise.reject(new Error('Producto no válido'));
    }
    return BD.cargarJSON('catalogo/' + marca + '/' + id + '.json');
  };

  // Devuelve: { marcas: [ { id, nombre, ..., productos: [ {producto}, ... ] } ] }
  // Se guarda en memoria para no repetir pedidos en la misma página.
  BD.cargarCatalogo = function () {
    if (BD._catalogo) return BD._catalogo;

    BD._catalogo = BD.cargarJSON('catalogo/index.json')
      .then(function (indice) {
        var marcas = (Array.isArray(indice.marcas) ? indice.marcas : []).filter(BD.idValido);
        return Promise.all(
          marcas.map(function (idMarca) {
            return BD.cargarJSON('catalogo/' + idMarca + '/marca.json').then(function (marca) {
              var ids = (Array.isArray(marca.productos) ? marca.productos : []).filter(BD.idValido);
              return Promise.all(
                ids.map(function (idProd) {
                  return BD.cargarJSON('catalogo/' + idMarca + '/' + idProd + '.json');
                })
              ).then(function (productos) {
                marca.productos = productos;
                return marca;
              });
            });
          })
        );
      })
      .then(function (marcas) {
        return { marcas: marcas };
      });

    return BD._catalogo;
  };

  // Lista plana: [ { marca: {...}, producto: {...} }, ... ]
  BD.listarProductos = function (catalogo) {
    var resultado = [];
    catalogo.marcas.forEach(function (m) {
      (m.productos || []).forEach(function (p) {
        resultado.push({ marca: m, producto: p });
      });
    });
    return resultado;
  };

  /* ---------- Utilidades de navegación ---------- */
  function rutaAbsoluta(ruta) {
    return new URL(BD.raiz + ruta, window.location.href).pathname;
  }

  function esPaginaActual(ruta) {
    var actual = window.location.pathname.replace(/index\.html$/, '');
    var destino = rutaAbsoluta(ruta);
    if (ruta === '') return actual === destino;
    return actual.indexOf(destino) === 0;
  }

  function esProductoActual(marca, id) {
    var params = new URLSearchParams(window.location.search);
    return esPaginaActual('producto/') && params.get('marca') === marca && params.get('id') === id;
  }

  function htmlEnlace(texto, href, activo, destacado) {
    var clases = 'nav__enlace';
    if (destacado) clases += ' nav__enlace--destacado';
    if (activo) clases += ' nav__enlace--activo';
    return '<a class="' + clases + '" href="' + href + '">' + BD.esc(texto) + '</a>';
  }

  function htmlEnlacesFijos(lista) {
    return lista
      .map(function (item) {
        return htmlEnlace(item.texto, BD.raiz + item.ruta, esPaginaActual(item.ruta), item.destacado);
      })
      .join('');
  }

  // Si el logo no carga, se reemplaza por el texto "Belltech"
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

    var encabezado = document.createElement('header');
    encabezado.className = 'encabezado';
    encabezado.innerHTML =
      '<div class="encabezado__interior">' +
      '  <a class="encabezado__logo" href="' + (BD.raiz || './') + '">' + htmlLogo('color') + '</a>' +
      '  <button class="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false">&#9776;</button>' +
      '  <nav class="nav" aria-label="Menú principal">' +
           htmlEnlacesFijos(BD.menuInicio) +
      '    <span id="nav-productos" style="display:contents;"></span>' +
           htmlEnlacesFijos(BD.menuFin) +
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
      '    <p>Llevamos las soluciones de experiencia del cliente e IA de NICE a las empresas de Latinoamérica.</p>' +
      '    <p class="pie__lema">¡Hazlo simple, hazlo Belltech!</p>' +
      '  </div>' +
      '  <div>' +
      '    <h4>Productos</h4>' +
      '    <ul id="pie-productos">' +
      '      <li><a href="' + r + 'producto/">Ver todos</a></li>' +
      '    </ul>' +
      '  </div>' +
      '  <div>' +
      '    <h4>Belltech</h4>' +
      '    <ul>' +
      '      <li><a href="' + (r || './') + '">Inicio</a></li>' +
      '      <li><a href="' + r + 'contacto/">Pedí una demo</a></li>' +
      '      <li><a href="' + r + 'portal/">Portal clientes</a></li>' +
      '      <li><a href="#" data-accion="abrir-chat">Hablá con ' + BD.esc(BD.agente.nombre) + '</a></li>' +
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

  /* ---------- Productos del catálogo en el menú y en el pie ----------
     Si el catálogo no carga, el sitio sigue funcionando con los enlaces fijos. */
  function completarConCatalogo() {
    BD.cargarCatalogo()
      .then(function (catalogo) {
        var items = BD.listarProductos(catalogo);

        var nav = document.getElementById('nav-productos');
        if (nav) {
          nav.innerHTML = items
            .map(function (it) {
              return htmlEnlace(
                it.producto.nombre,
                BD.urlProducto(it.marca.id, it.producto.id),
                esProductoActual(it.marca.id, it.producto.id),
                it.producto.destacado
              );
            })
            .join('');
        }

        var pie = document.getElementById('pie-productos');
        if (pie) {
          pie.innerHTML =
            items
              .map(function (it) {
                return (
                  '<li><a href="' + BD.urlProducto(it.marca.id, it.producto.id) + '">' +
                  BD.esc(it.producto.nombre) + '</a></li>'
                );
              })
              .join('') +
            '<li><a href="' + BD.raiz + 'producto/">Ver todos</a></li>';
        }
      })
      .catch(function (err) {
        console.warn('No se pudo cargar el catálogo para el menú:', err);
      });
  }

  /* ---------- Burbuja del agente IA ----------
     Botón fijo abajo a la derecha en todas las páginas.
     Usa data-accion="abrir-chat", igual que los demás botones del sitio. */
  function insertarBurbujaAgente() {
    if (document.getElementById('burbuja-agente')) return;

    var a = BD.agente;
    var burbuja = document.createElement('button');
    burbuja.type = 'button';
    burbuja.id = 'burbuja-agente';
    burbuja.className = 'burbuja-agente';
    burbuja.setAttribute('data-accion', 'abrir-chat');
    burbuja.setAttribute('aria-label', 'Hablar con ' + a.nombre + ', ' + a.rol);
    burbuja.innerHTML =
      '<span class="burbuja-agente__avatar">' + BD.esc(a.inicial) +
      '  <span class="burbuja-agente__estado" aria-hidden="true"></span>' +
      '</span>' +
      '<span class="burbuja-agente__texto">' +
      '  <span class="burbuja-agente__nombre">' + BD.esc(a.nombre + ' · ' + a.rol) + '</span>' +
      '  <span class="burbuja-agente__frase">' + BD.esc(a.frase) + '</span>' +
      '</span>';

    document.body.appendChild(burbuja);
  }

  // Para el H5: ocultar la burbuja mientras el Webchat está abierto
  BD.ocultarBurbuja = function () {
    var b = document.getElementById('burbuja-agente');
    if (b) b.classList.add('burbuja-agente--oculta');
  };

  BD.mostrarBurbuja = function () {
    var b = document.getElementById('burbuja-agente');
    if (b) b.classList.remove('burbuja-agente--oculta');
  };

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
        BD.mostrarAviso(
          BD.agente.nombre + ', nuestra ' + BD.agente.rol + ', estará disponible muy pronto en este sitio.'
        );
      }
    });
  }

  /* ---------- Inicio ---------- */
  function iniciar() {
    insertarZonaSuperior();
    insertarPie();
    insertarBurbujaAgente();
    activarAccionesChat();
    completarConCatalogo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
