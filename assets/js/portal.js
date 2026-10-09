/* =========================================================
   Belltech Demo - Portal de clientes
   Ruta: belltech-demo/assets/js/portal.js
   - Sin sesión: muestra el login y los usuarios de prueba.
   - Con sesión: muestra el panel de la empresa.
   Requiere que assets/js/comun.js se cargue ANTES.
   ========================================================= */
(function () {
  'use strict';

  var BD = window.BelltechDemo;
  var esc = BD.esc;

  var vistaLogin = document.getElementById('vista-login');
  var vistaPanel = document.getElementById('vista-panel');
  var titulo = document.getElementById('portal-titulo');
  var bajada = document.getElementById('portal-bajada');

  /* =====================================================
     LOGIN
     ===================================================== */

  function mostrarLogin() {
    vistaPanel.hidden = true;
    vistaLogin.hidden = false;
    titulo.textContent = 'Ingresá a tu portal';
    bajada.textContent = 'Consultá tus servicios de NICE, consumos, facturas y reportes.';
    activarFormularioLogin();
    cargarUsuariosDemo();
  }

  function activarFormularioLogin() {
    var form = document.getElementById('form-login');
    var caja = document.getElementById('login-mensaje');
    var boton = document.getElementById('login-enviar');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = form.email.value.trim();
      var clave = form.clave.value;

      if (!email || !clave) {
        caja.className = 'mensaje mensaje--visible mensaje--error';
        caja.textContent = 'Completá tu email y tu clave.';
        return;
      }

      boton.disabled = true;
      boton.textContent = 'Ingresando…';
      caja.className = 'mensaje';

      BD.iniciarSesion(email, clave)
        .then(function () {
          // Se recarga para que el encabezado y todo el sitio tomen la sesión
          window.location.reload();
        })
        .catch(function (err) {
          caja.className = 'mensaje mensaje--visible mensaje--error';
          caja.textContent = err && err.message ? err.message : 'No pudimos iniciar sesión.';
          boton.disabled = false;
          boton.textContent = 'Ingresar';
        });
    });
  }

  // Lista los contactos activos de las empresas activas para completar el login con un clic
  function cargarUsuariosDemo() {
    var lista = document.getElementById('usuarios-demo');
    var form = document.getElementById('form-login');

    BD.cargarJSON('empresas/index.json')
      .then(function (indice) {
        var ids = (Array.isArray(indice.empresas) ? indice.empresas : []).filter(BD.idValido);
        return Promise.all(
          ids.map(function (id) {
            return Promise.all([
              BD.cargarJSON('empresas/' + id + '/empresa.json'),
              BD.cargarJSON('empresas/' + id + '/contactos.json')
            ]).catch(function () {
              return null;
            });
          })
        );
      })
      .then(function (resultados) {
        var html = '';
        resultados.forEach(function (r) {
          if (!r) return;
          var empresa = r[0];
          var contactos = Array.isArray(r[1]) ? r[1] : [];
          contactos
            .filter(function (c) { return c.activo !== false; })
            .forEach(function (c) {
              html +=
                '<button type="button" class="tarjeta usuario-demo" ' +
                'data-email="' + esc(c.email) + '" data-clave="' + esc(c.clave) + '" ' +
                'style="text-align:left;cursor:pointer;padding:14px 16px;font-family:inherit;width:100%;">' +
                '<strong style="color:var(--color-primario);">' + esc(c.contacto) + '</strong><br>' +
                '<span style="font-size:.85rem;color:var(--color-texto-suave);">' +
                esc(empresa.nombreCorto || empresa.nombre) + ' · ' + esc(c.cargo || '') +
                '</span><br>' +
                '<span style="font-size:.8rem;">' + esc(c.email) + '</span>' +
                '</button>';
            });
        });
        lista.innerHTML = html || '<p>No hay usuarios de prueba cargados.</p>';
      })
      .catch(function () {
        lista.innerHTML = '<p>No pudimos cargar los usuarios de prueba.</p>';
      });

    lista.addEventListener('click', function (e) {
      var boton = e.target.closest('.usuario-demo');
      if (!boton) return;
      form.email.value = boton.getAttribute('data-email');
      form.clave.value = boton.getAttribute('data-clave');
      form.email.focus();
      BD.mostrarAviso('Datos completados. Hacé clic en "Ingresar".');
    });
  }

  /* =====================================================
     PANEL (versión inicial: bienvenida y servicios)
     En el paso 3 del H2 se completa con consumos, historial,
     facturas, reportes y oportunidades.
     ===================================================== */

  function mostrarPanel(sesion) {
    vistaLogin.hidden = true;
    vistaPanel.hidden = false;
    titulo.textContent = 'Hola, ' + BD.primerNombre(sesion.nombre);
    bajada.textContent = sesion.empresaNombre + ' · ' + sesion.cargo;

    vistaPanel.innerHTML =
      '<section class="seccion"><div class="contenedor" style="text-align:center;">Cargando tu información…</div></section>';

    BD.cargarDatosEmpresa()
      .then(function (datos) {
        vistaPanel.innerHTML = htmlPanel(sesion, datos);
        document.getElementById('boton-cerrar-sesion').addEventListener('click', function () {
          BD.cerrarSesion();
          window.location.reload();
        });
      })
      .catch(function (err) {
        console.error(err);
        vistaPanel.innerHTML =
          '<section class="seccion"><div class="contenedor" style="text-align:center;">' +
          '<h2>No pudimos cargar tu información</h2>' +
          '<p>' + esc(err.message) + '</p>' +
          '<button id="boton-cerrar-sesion" class="btn btn--secundario" type="button">Cerrar sesión</button>' +
          '</div></section>';
        document.getElementById('boton-cerrar-sesion').addEventListener('click', function () {
          BD.cerrarSesion();
          window.location.reload();
        });
      });
  }

  function formatoFecha(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  function htmlPanel(sesion, datos) {
    var servicios = Array.isArray(datos.serviciosContratados) ? datos.serviciosContratados : [];
    var resumen = datos.resumen || {};

    var tarjetasServicios = servicios
      .map(function (s) {
        return (
          '<div class="tarjeta">' +
          '<span class="etiqueta">' + esc(s.estado) + '</span>' +
          '<h3 style="margin-top:12px;">' + esc(s.nombre) + '</h3>' +
          '<p style="color:var(--color-secundario);font-weight:600;margin-bottom:8px;">' + esc(s.plan) + '</p>' +
          '<p>' + esc(s.detalle) + '</p>' +
          '<p style="margin:0;font-size:.9rem;color:var(--color-texto-suave);">' +
          esc(s.licencias) + ' ' + esc(s.unidadLicencia) + ' · Desde ' + esc(formatoFecha(s.desde)) +
          ' · Renueva ' + esc(formatoFecha(s.renovacion)) +
          '</p>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<section class="seccion">' +
      '  <div class="contenedor">' +
      '    <div class="banda-cta" style="margin-bottom:40px;">' +
      '      <div>' +
      '        <h2>' + esc(sesion.empresaNombre) + '</h2>' +
      '        <p>Cliente desde ' + esc(resumen.clienteDesde) + ' · Tu ejecutivo de cuenta: ' + esc(resumen.ejecutivoCuenta) + '</p>' +
      '      </div>' +
      '      <div class="botonera">' +
      '        <a class="btn btn--claro" href="#" data-accion="abrir-chat">Preguntale a ' + esc(BD.agente.nombre) + '</a>' +
      '        <button id="boton-cerrar-sesion" class="btn btn--acento" type="button">Cerrar sesión</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="seccion__encabezado" style="margin-bottom:24px;">' +
      '      <span class="seccion__antetitulo">Tus servicios</span>' +
      '      <h2>Servicios contratados</h2>' +
      '    </div>' +
      '    <div class="grilla grilla--' + Math.min(Math.max(servicios.length, 1), 3) + '">' + tarjetasServicios + '</div>' +
      '  </div>' +
      '</section>'
    );
  }

  /* =====================================================
     INICIO
     ===================================================== */
  var sesion = BD.obtenerSesion();
  if (sesion) {
    mostrarPanel(sesion);
  } else {
    mostrarLogin();
  }
})();
