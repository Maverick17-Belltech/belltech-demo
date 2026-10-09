/* =========================================================
   Belltech Demo - Motor del catálogo de productos
   Ruta: belltech-demo/assets/js/catalogo.js
   Lee catalogo/index.json, catalogo/<marca>/marca.json y
   catalogo/<marca>/<producto>.json y arma las páginas.
   Requiere que assets/js/comun.js se cargue ANTES (usa BelltechDemo.raiz).
   ========================================================= */
(function () {
  'use strict';

  var BD = (window.BelltechDemo = window.BelltechDemo || {});

  /* ---------- Utilidades ---------- */

  // Escapa texto para insertarlo en HTML de forma segura
  function esc(texto) {
    return String(texto == null ? '' : texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Solo se aceptan identificadores simples: minúsculas, números y guiones
  function idValido(id) {
    return typeof id === 'string' && /^[a-z0-9-]+$/.test(id);
  }

  // Solo se aceptan enlaces http/https
  function urlSegura(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '#';
  }

  function cargarJSON(ruta) {
    return fetch(BD.raiz + ruta, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar ' + ruta + ' (error ' + r.status + ')');
      return r.json();
    });
  }

  function lista(valor) {
    return Array.isArray(valor) ? valor : [];
  }

  /* ---------- API pública ---------- */

  // URL de la página de un producto
  BD.urlProducto = function (marca, id) {
    return BD.raiz + 'producto/?marca=' + encodeURIComponent(marca) + '&id=' + encodeURIComponent(id);
  };

  // Carga un producto puntual
  BD.cargarProducto = function (marca, id) {
    if (!idValido(marca) || !idValido(id)) {
      return Promise.reject(new Error('Producto no válido'));
    }
    return cargarJSON('catalogo/' + marca + '/' + id + '.json');
  };

  // Carga el catálogo completo (se guarda en memoria para no repetir pedidos)
  // Devuelve: { marcas: [ { id, nombre, ..., productos: [ {producto}, ... ] } ] }
  BD.cargarCatalogo = function () {
    if (BD._catalogo) return BD._catalogo;

    BD._catalogo = cargarJSON('catalogo/index.json')
      .then(function (indice) {
        var marcas = lista(indice.marcas).filter(idValido);
        return Promise.all(
          marcas.map(function (idMarca) {
            return cargarJSON('catalogo/' + idMarca + '/marca.json').then(function (marca) {
              var ids = lista(marca.productos).filter(idValido);
              return Promise.all(
                ids.map(function (idProd) {
                  return cargarJSON('catalogo/' + idMarca + '/' + idProd + '.json');
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

  /* ---------- Bloques HTML ---------- */

  function htmlBotonDemo(demo, estilo) {
    var clase = 'btn ' + (estilo || 'btn--primario');
    if (demo.tipo === 'chat') {
      return '<a class="' + clase + '" href="#" data-accion="abrir-chat">' + esc(demo.titulo) + '</a>';
    }
    if (demo.tipo === 'enlace') {
      return '<a class="' + clase + '" href="' + esc(urlSegura(demo.url)) + '" target="_blank" rel="noopener">' + esc(demo.titulo) + '</a>';
    }
    return '<span class="etiqueta">Próximamente</span>';
  }

  function htmlSeccion(clase, antetitulo, titulo, bajada, cuerpo) {
    return (
      '<section class="seccion ' + (clase || '') + '">' +
      '  <div class="contenedor">' +
      '    <div class="seccion__encabezado">' +
      (antetitulo ? '<span class="seccion__antetitulo">' + esc(antetitulo) + '</span>' : '') +
      '      <h2>' + esc(titulo) + '</h2>' +
      (bajada ? '<p class="seccion__bajada">' + esc(bajada) + '</p>' : '') +
      '    </div>' +
           cuerpo +
      '  </div>' +
      '</section>'
    );
  }

  function htmlTarjetas(items, columnas) {
    return (
      '<div class="grilla grilla--' + columnas + '">' +
      items
        .map(function (it) {
          return (
            '<div class="tarjeta">' +
            (it.icono ? '<div class="tarjeta__icono">' + esc(it.icono) + '</div>' : '') +
            '<h3>' + esc(it.titulo) + '</h3>' +
            '<p>' + esc(it.texto) + '</p>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function htmlProducto(p) {
    var html = '';
    var demos = lista(p.demos);
    var demoChat = demos.filter(function (d) { return d.tipo === 'chat'; })[0];

    // Hero
    html +=
      '<section class="hero">' +
      '  <div class="contenedor">' +
      '    <span class="seccion__antetitulo" style="color:#ffffff;opacity:.85;">' + esc(p.categoria) + '</span>' +
      '    <h1>' + esc(p.nombre) + '</h1>' +
      '    <p>' + esc(p.resumen) + '</p>' +
      '    <div class="botonera">' +
      (demoChat ? htmlBotonDemo(demoChat, 'btn--primario') : '') +
      '      <a class="btn btn--claro" href="' + BD.raiz + 'contacto/?producto=' + encodeURIComponent(p.id) + '">Pedí una demo</a>' +
      '    </div>' +
      '  </div>' +
      '</section>';

    // Beneficios
    if (lista(p.beneficios).length) {
      html += htmlSeccion('', 'Beneficios', '¿Por qué ' + p.nombre + '?', '', htmlTarjetas(p.beneficios, 3));
    }

    // Funcionalidades
    if (lista(p.funcionalidades).length) {
      html += htmlSeccion('seccion--suave', 'Funcionalidades', 'Qué podés hacer', '', htmlTarjetas(p.funcionalidades, 3));
    }

    // Casos de uso
    if (lista(p.casosDeUso).length) {
      html += htmlSeccion('', 'Casos de uso', 'Dónde genera impacto', '', htmlTarjetas(p.casosDeUso, 2));
    }

    // Integraciones
    if (lista(p.integraciones).length) {
      html += htmlSeccion(
        'seccion--suave',
        'Integraciones',
        'Se conecta con tu ecosistema',
        '',
        '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">' +
          p.integraciones
            .map(function (i) {
              return '<span class="etiqueta" style="font-size:.9rem;padding:6px 14px;">' + esc(i) + '</span>';
            })
            .join('') +
          '</div>'
      );
    }

    // Demos
    if (demos.length) {
      html += htmlSeccion(
        'seccion--oscura',
        'Demo en vivo',
        'Probalo vos mismo',
        '',
        '<div class="grilla grilla--' + Math.min(demos.length, 3) + '">' +
          demos
            .map(function (d) {
              return (
                '<div class="tarjeta">' +
                '<h3>' + esc(d.titulo) + '</h3>' +
                '<p>' + esc(d.texto) + '</p>' +
                '<div class="botonera">' + htmlBotonDemo(d) + '</div>' +
                '</div>'
              );
            })
            .join('') +
          '</div>'
      );
    }

    // Preguntas frecuentes
    if (lista(p.faq).length) {
      html += htmlSeccion(
        '',
        'Preguntas frecuentes',
        'Lo que más nos preguntan',
        '',
        '<div style="max-width:820px;margin:0 auto;display:grid;gap:12px;">' +
          p.faq
            .map(function (f) {
              return (
                '<details class="tarjeta" style="padding:18px 24px;">' +
                '<summary style="cursor:pointer;font-weight:700;color:var(--color-primario);">' + esc(f.pregunta) + '</summary>' +
                '<p style="margin:12px 0 0;">' + esc(f.respuesta) + '</p>' +
                '</details>'
              );
            })
            .join('') +
          '</div>'
      );
    }

    // Llamado a la acción
    html +=
      '<section class="seccion">' +
      '  <div class="contenedor">' +
      '    <div class="banda-cta">' +
      '      <div>' +
      '        <h2>¿Querés saber más sobre ' + esc(p.nombre) + '?</h2>' +
      '        <p>Preguntale a Bella o agendá una reunión con un especialista.</p>' +
      '      </div>' +
      '      <div class="botonera">' +
      '        <a class="btn btn--claro" href="#" data-accion="abrir-chat">Hablar con Bella</a>' +
      '        <a class="btn btn--acento" href="' + BD.raiz + 'contacto/?producto=' + encodeURIComponent(p.id) + '">Pedí una demo</a>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</section>';

    // Fuentes
    if (lista(p.fuentes).length) {
      html +=
        '<div class="contenedor" style="padding-top:0;font-size:.85rem;color:var(--color-texto-suave);">' +
        'Fuentes: ' +
        p.fuentes
          .map(function (f) {
            return '<a href="' + esc(urlSegura(f.url)) + '" target="_blank" rel="noopener">' + esc(f.texto) + '</a>';
          })
          .join(' · ') +
        '</div>';
    }

    return html;
  }

  function htmlListado(catalogo) {
    var tarjetas = [];
    catalogo.marcas.forEach(function (m) {
      lista(m.productos).forEach(function (p) {
        tarjetas.push(
          '<div class="tarjeta">' +
          '<span class="etiqueta">' + esc(m.nombre) + '</span>' +
          '<h3 style="margin-top:12px;">' + esc(p.nombre) + '</h3>' +
          '<p>' + esc(p.resumen) + '</p>' +
          '<a class="btn btn--secundario btn--chico" href="' + BD.urlProducto(m.id, p.id) + '">Ver producto</a>' +
          '</div>'
        );
      });
    });
    return htmlSeccion('', 'Catálogo', 'Nuestros productos', '', '<div class="grilla grilla--3">' + tarjetas.join('') + '</div>');
  }

  function htmlMensaje(titulo, texto) {
    return (
      '<section class="seccion"><div class="contenedor" style="text-align:center;">' +
      '<h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p>' +
      '<a class="btn btn--secundario" href="' + (BD.raiz || './') + '">Volver al inicio</a>' +
      '</div></section>'
    );
  }

  /* ---------- Página de producto ----------
     producto/?marca=nice&id=cognigy  -> muestra ese producto
     producto/                        -> muestra el listado de todos los productos */
  BD.renderProducto = function (contenedor) {
    var params = new URLSearchParams(window.location.search);
    var marca = params.get('marca');
    var id = params.get('id');

    contenedor.innerHTML = htmlMensaje('Cargando…', '');

    if (!marca && !id) {
      BD.cargarCatalogo()
        .then(function (cat) {
          document.title = 'Productos | Belltech (Demo)';
          contenedor.innerHTML = htmlListado(cat);
        })
        .catch(function (err) {
          console.error(err);
          contenedor.innerHTML = htmlMensaje('No pudimos cargar el catálogo', err.message);
        });
      return;
    }

    BD.cargarProducto(marca, id)
      .then(function (p) {
        document.title = p.nombre + ' | Belltech (Demo)';
        contenedor.innerHTML = htmlProducto(p);
        window.scrollTo(0, 0);
      })
      .catch(function (err) {
        console.error(err);
        contenedor.innerHTML = htmlMensaje('Producto no encontrado', 'Revisá el enlace o volvé al inicio.');
      });
  };
})();
