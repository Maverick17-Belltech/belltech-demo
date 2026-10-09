/* =========================================================
   Belltech Demo - Portal de clientes
   Ruta: belltech-demo/assets/js/portal.js
   - Sin sesión: muestra el login y los usuarios de prueba.
   - Con sesión: muestra el panel de la empresa
     (servicios, consumos, historial, facturas, reportes,
     tickets y recomendaciones).
   Requiere que assets/js/comun.js se cargue ANTES.
   Estilos del panel: assets/css/portal.css
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
     FORMATOS
     ===================================================== */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function numero(n) {
    return new Intl.NumberFormat('es-AR').format(Number(n) || 0);
  }

  function dinero(n, moneda) {
    return (moneda || 'USD') + ' ' + numero(Math.round(Number(n) || 0));
  }

  // "2026-09" -> "sep 2026"
  function mes(periodo) {
    var p = String(periodo || '').split('-');
    var i = parseInt(p[1], 10) - 1;
    return MESES[i] ? MESES[i] + ' ' + p[0] : periodo;
  }

  // "2026-09" -> "sep"
  function mesCorto(periodo) {
    var i = parseInt(String(periodo || '').split('-')[1], 10) - 1;
    return MESES[i] || '';
  }

  // "2026-10-15" -> "15/10/2026"
  function fecha(iso) {
    var p = String(iso || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso || '';
  }

  function lista(valor) {
    return Array.isArray(valor) ? valor : [];
  }

  function claseEstado(estado) {
    var e = String(estado || '').toLowerCase();
    if (e === 'pagada' || e === 'activo' || e === 'resuelto') return 'estado--ok';
    if (e === 'pendiente' || e === 'abierto') return 'estado--pendiente';
    return 'estado--curso';
  }

  function htmlEstado(estado) {
    return '<span class="estado ' + claseEstado(estado) + '">' + esc(estado) + '</span>';
  }

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
    var contenedor = document.getElementById('usuarios-demo');
    var form = document.getElementById('form-login');

    BD.cargarJSON('empresas/index.json')
      .then(function (indice) {
        var ids = lista(indice.empresas).filter(BD.idValido);
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
          lista(r[1])
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
        contenedor.innerHTML = html || '<p>No hay usuarios de prueba cargados.</p>';
      })
      .catch(function () {
        contenedor.innerHTML = '<p>No pudimos cargar los usuarios de prueba.</p>';
      });

    contenedor.addEventListener('click', function (e) {
      var boton = e.target.closest('.usuario-demo');
      if (!boton) return;
      form.email.value = boton.getAttribute('data-email');
      form.clave.value = boton.getAttribute('data-clave');
      form.email.focus();
      BD.mostrarAviso('Datos completados. Hacé clic en "Ingresar".');
    });
  }

  /* =====================================================
     PANEL
     ===================================================== */

  function mostrarPanel(sesion) {
    vistaLogin.hidden = true;
    vistaPanel.hidden = false;
    titulo.textContent = 'Hola, ' + BD.primerNombre(sesion.nombre);
    bajada.textContent = sesion.empresaNombre + (sesion.cargo ? ' · ' + sesion.cargo : '');

    vistaPanel.innerHTML =
      '<section class="seccion"><div class="contenedor" style="text-align:center;">Cargando tu información…</div></section>';

    Promise.all([
      BD.cargarDatosEmpresa(),
      BD.cargarCatalogo().catch(function () { return { marcas: [] }; })
    ])
      .then(function (r) {
        vistaPanel.innerHTML = htmlPanel(sesion, r[0], r[1]);
        activarCerrarSesion();
        activarTooltips();
      })
      .catch(function (err) {
        console.error(err);
        vistaPanel.innerHTML =
          '<section class="seccion"><div class="contenedor" style="text-align:center;">' +
          '<h2>No pudimos cargar tu información</h2>' +
          '<p>' + esc(err.message) + '</p>' +
          '<button id="boton-cerrar-sesion" class="btn btn--secundario" type="button">Cerrar sesión</button>' +
          '</div></section>';
        activarCerrarSesion();
      });
  }

  function activarCerrarSesion() {
    var boton = document.getElementById('boton-cerrar-sesion');
    if (!boton) return;
    boton.addEventListener('click', function () {
      BD.cerrarSesion();
      window.location.reload();
    });
  }

  // Nombre del producto según el catálogo (ej. "cognigy" -> "NICE Cognigy")
  function nombreProducto(catalogo, idProducto) {
    var encontrado = BD.listarProductos(catalogo).filter(function (it) {
      return it.producto.id === idProducto;
    })[0];
    return encontrado ? encontrado.producto.nombre : idProducto;
  }

  function urlProducto(catalogo, idProducto) {
    var encontrado = BD.listarProductos(catalogo).filter(function (it) {
      return it.producto.id === idProducto;
    })[0];
    return encontrado ? BD.urlProducto(encontrado.marca.id, encontrado.producto.id) : BD.raiz + 'producto/';
  }

  function bloque(id, tituloBloque, nota, cuerpo) {
    return (
      '<div class="portal-bloque" id="' + id + '">' +
      '  <div class="portal-bloque__titulo">' +
      '    <h2>' + esc(tituloBloque) + '</h2>' +
      (nota ? '<span class="portal-bloque__nota">' + esc(nota) + '</span>' : '') +
      '  </div>' +
           cuerpo +
      '</div>'
    );
  }

  /* ---------- Servicios contratados ---------- */
  function htmlServicios(datos) {
    var servicios = lista(datos.serviciosContratados);
    if (!servicios.length) return '<p>No hay servicios contratados.</p>';

    return (
      '<div class="grilla grilla--' + Math.min(servicios.length, 3) + '">' +
      servicios
        .map(function (s) {
          return (
            '<div class="tarjeta">' +
            htmlEstado(s.estado) +
            '<h3 style="margin-top:12px;">' + esc(s.nombre) + '</h3>' +
            '<p style="color:var(--color-secundario);font-weight:600;margin-bottom:8px;">' + esc(s.plan) + '</p>' +
            '<p>' + esc(s.detalle) + '</p>' +
            '<p style="margin:0;font-size:.9rem;color:var(--color-texto-suave);">' +
            esc(numero(s.licencias)) + ' ' + esc(s.unidadLicencia) +
            ' · Desde ' + esc(fecha(s.desde)) +
            ' · Renueva ' + esc(fecha(s.renovacion)) +
            ' · ' + esc(dinero(s.costoMensual, datos.moneda)) + ' / mes' +
            '</p>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  /* ---------- Consumos del mes ---------- */
  function htmlConsumos(datos, catalogo) {
    var c = datos.consumoMes || {};
    var items = lista(c.items);
    if (!items.length) return '<p>No hay consumos registrados este mes.</p>';

    return (
      '<div class="tarjeta"><div class="grilla grilla--2" style="gap:28px 40px;">' +
      items
        .map(function (it) {
          var incluido = Number(it.incluido) || 0;
          var consumo = Number(it.consumo) || 0;
          var porcentaje = incluido ? Math.round((consumo / incluido) * 100) : 0;
          var alerta = porcentaje >= 90;
          return (
            '<div class="medidor">' +
            '  <div class="medidor__encabezado">' +
            '    <span class="medidor__nombre">' + esc(it.metrica) + '</span>' +
            '    <span class="medidor__producto">' + esc(nombreProducto(catalogo, it.producto)) + '</span>' +
            '  </div>' +
            '  <div class="medidor__barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(porcentaje, 100) + '" aria-label="' + esc(it.metrica) + '">' +
            '    <div class="medidor__relleno' + (alerta ? ' medidor__relleno--alerta' : '') + '" style="width:' + Math.min(porcentaje, 100) + '%;"></div>' +
            '  </div>' +
            '  <div class="medidor__detalle">' +
                 esc(numero(consumo)) + ' de ' + esc(numero(incluido)) + ' ' + esc(it.unidad) +
            '    <strong> (' + porcentaje + '%)</strong>' +
            '  </div>' +
            (alerta ? '<div class="medidor__alerta">⚠ Cerca del límite del plan</div>' : '') +
            '</div>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }

  /* ---------- Historial: mini gráfico de barras (una métrica por gráfico) ---------- */
  function htmlMiniGrafico(tituloGrafico, historial, campo, formatear) {
    var datos = historial.map(function (h) {
      return { periodo: h.periodo, valor: Number(h[campo]) || 0, parcial: !!h.parcial };
    });
    var maximo = Math.max.apply(null, datos.map(function (d) { return d.valor; })) || 1;

    var W = 360;
    var H = 150;
    var arriba = 8;
    var abajo = 22;
    var alto = H - arriba - abajo;
    var paso = W / datos.length;
    var ancho = Math.max(paso - 6, 4);
    var base = H - abajo;

    var barras = datos
      .map(function (d, i) {
        var h = Math.max(Math.round((d.valor / maximo) * alto), d.valor > 0 ? 2 : 0);
        var x = i * paso + (paso - ancho) / 2;
        var y = base - h;
        var r = Math.min(4, h, ancho / 2);
        var texto = mes(d.periodo) + ': ' + formatear(d.valor) + (d.parcial ? ' (mes en curso)' : '');
        // Barra con las esquinas superiores redondeadas y la base recta
        var camino = h <= 0 ? '' :
          'M' + x + ',' + base +
          ' L' + x + ',' + (y + r) +
          ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
          ' L' + (x + ancho - r) + ',' + y +
          ' Q' + (x + ancho) + ',' + y + ' ' + (x + ancho) + ',' + (y + r) +
          ' L' + (x + ancho) + ',' + base + ' Z';
        // Primero la zona de hover (transparente) y encima la barra, ambas con el mismo tooltip
        return (
          '<rect x="' + (i * paso) + '" y="' + arriba + '" width="' + paso + '" height="' + alto + '" fill="transparent" ' +
          'data-tooltip="' + esc(texto) + '"></rect>' +
          (camino ? '<path class="minigrafico__barra' + (d.parcial ? ' minigrafico__barra--parcial' : '') + '" d="' + camino + '" ' +
          'data-tooltip="' + esc(texto) + '"></path>' : '')
        );
      })
      .join('');

    // Etiquetas del eje: primer mes, mes del medio y último mes
    var indices = [0, Math.floor((datos.length - 1) / 2), datos.length - 1];
    var etiquetas = indices
      .filter(function (v, i, arr) { return arr.indexOf(v) === i; })
      .map(function (i) {
        var x = i * paso + paso / 2;
        return '<text class="minigrafico__etiqueta" x="' + x + '" y="' + (H - 6) + '" text-anchor="middle">' +
          esc(mesCorto(datos[i].periodo)) + '</text>';
      })
      .join('');

    var completos = datos.filter(function (d) { return !d.parcial; });
    var ultimo = completos[completos.length - 1] || datos[datos.length - 1];

    return (
      '<div class="tarjeta minigrafico">' +
      '<h3>' + esc(tituloGrafico) + '</h3>' +
      '<p class="minigrafico__valor">' + esc(formatear(ultimo.valor)) + '<span>en ' + esc(mes(ultimo.periodo)) + '</span></p>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(tituloGrafico + ', últimos ' + datos.length + ' meses') + '">' +
      '<line class="minigrafico__eje" x1="0" y1="' + base + '" x2="' + W + '" y2="' + base + '"></line>' +
      barras + etiquetas +
      '</svg>' +
      '</div>'
    );
  }

  function htmlHistorial(datos) {
    var historial = lista(datos.historial);
    if (!historial.length) return '<p>No hay historial disponible.</p>';

    var moneda = datos.moneda;
    var tieneIA = historial.some(function (h) { return Number(h.conversacionesIA) > 0; });

    var graficos =
      htmlMiniGrafico('Minutos de voz', historial, 'minutosVoz', function (v) { return numero(v) + ' min'; }) +
      htmlMiniGrafico('Interacciones digitales', historial, 'interaccionesDigitales', numero) +
      (tieneIA
        ? htmlMiniGrafico('Conversaciones con IA', historial, 'conversacionesIA', numero)
        : '<div class="tarjeta" style="display:flex;flex-direction:column;justify-content:center;background:var(--color-fondo-suave);">' +
          '<h3>Conversaciones con IA</h3>' +
          '<p>Todavía no tenés un agente de IA. Con NICE Cognigy, muchas de estas consultas se resolverían solas, 24/7.</p>' +
          '<div class="botonera"><a class="btn btn--primario btn--chico" href="#" data-accion="abrir-chat">Preguntale a ' + esc(BD.agente.nombre) + '</a></div>' +
          '</div>') +
      htmlMiniGrafico('Gasto mensual', historial, 'gasto', function (v) { return dinero(v, moneda); });

    var filas = historial
      .map(function (h) {
        return (
          '<tr>' +
          '<td>' + esc(mes(h.periodo)) + (h.parcial ? ' (en curso)' : '') + '</td>' +
          '<td class="numero">' + esc(numero(h.minutosVoz)) + '</td>' +
          '<td class="numero">' + esc(numero(h.interaccionesDigitales)) + '</td>' +
          '<td class="numero">' + esc(numero(h.conversacionesIA)) + '</td>' +
          '<td class="numero">' + esc(dinero(h.gasto, moneda)) + '</td>' +
          '</tr>'
        );
      })
      .join('');

    return (
      '<div class="grilla grilla--2">' + graficos + '</div>' +
      '<details class="tabla-detalle">' +
      '  <summary>Ver como tabla</summary>' +
      '  <div class="tabla-contenedor"><table class="tabla">' +
      '    <thead><tr><th>Mes</th><th class="numero">Minutos de voz</th><th class="numero">Interacciones digitales</th><th class="numero">Conversaciones con IA</th><th class="numero">Gasto</th></tr></thead>' +
      '    <tbody>' + filas + '</tbody>' +
      '  </table></div>' +
      '</details>'
    );
  }

  /* ---------- Facturas ---------- */
  function htmlFacturas(datos) {
    var facturas = lista(datos.facturas);
    if (!facturas.length) return '<p>No hay facturas.</p>';

    var pendientes = facturas.filter(function (f) { return String(f.estado).toLowerCase() === 'pendiente'; });
    var totalPendiente = pendientes.reduce(function (t, f) { return t + (Number(f.importe) || 0); }, 0);
    var proxima = pendientes
      .map(function (f) { return f.vencimiento; })
      .sort()[0];

    var filas = facturas
      .map(function (f) {
        return (
          '<tr>' +
          '<td>' + esc(f.numero) + '</td>' +
          '<td>' + esc(mes(f.periodo)) + '</td>' +
          '<td>' + esc(fecha(f.emision)) + '</td>' +
          '<td>' + esc(fecha(f.vencimiento)) + '</td>' +
          '<td class="numero">' + esc(dinero(f.importe, datos.moneda)) + '</td>' +
          '<td>' + htmlEstado(f.estado) + '</td>' +
          '</tr>'
        );
      })
      .join('');

    return (
      '<div class="resumen-facturas">' +
      '  <div><span>Saldo pendiente</span><strong>' + esc(dinero(totalPendiente, datos.moneda)) + '</strong></div>' +
      (proxima ? '<div><span>Próximo vencimiento</span><strong>' + esc(fecha(proxima)) + '</strong></div>' : '') +
      '  <div><span>Facturas pagadas</span><strong>' + (facturas.length - pendientes.length) + ' de ' + facturas.length + '</strong></div>' +
      '</div>' +
      '<div class="tabla-contenedor"><table class="tabla">' +
      '  <thead><tr><th>Número</th><th>Período</th><th>Emisión</th><th>Vencimiento</th><th class="numero">Importe</th><th>Estado</th></tr></thead>' +
      '  <tbody>' + filas + '</tbody>' +
      '</table></div>'
    );
  }

  /* ---------- Reportes ---------- */
  function htmlReportes(datos, catalogo) {
    var reportes = lista(datos.reportes);
    if (!reportes.length) return '<p>No hay reportes disponibles.</p>';

    return (
      '<div class="grilla grilla--' + Math.min(reportes.length, 3) + '">' +
      reportes
        .map(function (r) {
          return (
            '<div class="tarjeta">' +
            '<span class="etiqueta">' + esc(nombreProducto(catalogo, r.producto)) + ' · ' + esc(mes(r.periodo)) + '</span>' +
            '<h3 style="margin-top:12px;">' + esc(r.titulo) + '</h3>' +
            '<p style="font-size:.9rem;color:var(--color-texto-suave);margin:0;">' + esc(r.descripcion) + '</p>' +
            '<dl class="indicadores">' +
            lista(r.indicadores)
              .map(function (i) {
                return '<div><dt>' + esc(i.nombre) + '</dt><dd>' + esc(i.valor) + '</dd></div>';
              })
              .join('') +
            '</dl>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  /* ---------- Tickets ---------- */
  function htmlTickets(datos) {
    var tickets = lista(datos.tickets);
    if (!tickets.length) return '<p>No tenés tickets.</p>';

    return (
      '<div class="tabla-contenedor"><table class="tabla">' +
      '  <thead><tr><th>Número</th><th>Asunto</th><th>Prioridad</th><th>Fecha</th><th>Estado</th></tr></thead>' +
      '  <tbody>' +
      tickets
        .map(function (t) {
          return (
            '<tr>' +
            '<td>' + esc(t.numero) + '</td>' +
            '<td style="white-space:normal;min-width:260px;">' + esc(t.asunto) + '</td>' +
            '<td>' + esc(t.prioridad) + '</td>' +
            '<td>' + esc(fecha(t.fecha)) + '</td>' +
            '<td>' + htmlEstado(t.estado) + '</td>' +
            '</tr>'
          );
        })
        .join('') +
      '  </tbody>' +
      '</table></div>'
    );
  }

  /* ---------- Recomendado para vos ---------- */
  function htmlOportunidades(datos, catalogo) {
    var oportunidades = lista(datos.oportunidades);
    if (!oportunidades.length) return '<p>Por ahora no tenemos recomendaciones nuevas.</p>';

    return (
      '<div class="grilla grilla--' + Math.min(oportunidades.length, 3) + '">' +
      oportunidades
        .map(function (o) {
          return (
            '<div class="tarjeta tarjeta--destacada">' +
            '<span class="etiqueta etiqueta--acento">' + esc(nombreProducto(catalogo, o.producto)) + '</span>' +
            '<h3 style="margin-top:12px;">' + esc(o.titulo) + '</h3>' +
            '<p><strong>Por qué:</strong> ' + esc(o.motivo) + '</p>' +
            '<p><strong>Beneficio:</strong> ' + esc(o.beneficio) + '</p>' +
            '<div class="botonera">' +
            '<a class="btn btn--primario btn--chico" href="#" data-accion="abrir-chat">Preguntale a ' + esc(BD.agente.nombre) + '</a>' +
            '<a class="btn btn--secundario btn--chico" href="' + urlProducto(catalogo, o.producto) + '">Ver producto</a>' +
            '</div>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  /* ---------- Panel completo ---------- */
  function htmlPanel(sesion, datos, catalogo) {
    var resumen = datos.resumen || {};
    var c = datos.consumoMes || {};

    return (
      '<section class="seccion">' +
      '  <div class="contenedor">' +

      // Banda superior
      '    <div class="banda-cta" style="margin-bottom:32px;">' +
      '      <div>' +
      '        <h2>' + esc(sesion.empresaNombre) + '</h2>' +
      '        <p>Cliente desde ' + esc(resumen.clienteDesde) + ' · Tu ejecutivo de cuenta: ' + esc(resumen.ejecutivoCuenta) +
      (resumen.emailEjecutivo ? ' (' + esc(resumen.emailEjecutivo) + ')' : '') + '</p>' +
      '      </div>' +
      '      <div class="botonera">' +
      '        <a class="btn btn--claro" href="#" data-accion="abrir-chat">Preguntale a ' + esc(BD.agente.nombre) + '</a>' +
      '        <button id="boton-cerrar-sesion" class="btn btn--acento" type="button">Cerrar sesión</button>' +
      '      </div>' +
      '    </div>' +

      // Navegación interna
      '    <nav class="portal-nav" aria-label="Secciones del portal">' +
      '      <a href="#servicios">Servicios</a>' +
      '      <a href="#consumos">Consumos del mes</a>' +
      '      <a href="#historial">Historial</a>' +
      '      <a href="#facturas">Facturas</a>' +
      '      <a href="#reportes">Reportes</a>' +
      '      <a href="#tickets">Tickets</a>' +
      '      <a href="#recomendado">Recomendado para vos</a>' +
      '    </nav>' +

           bloque('servicios', 'Servicios contratados', '', htmlServicios(datos)) +
           bloque('consumos', 'Consumos del mes', 'Período ' + mes(c.periodo) + ' · Corte al ' + fecha(c.corte), htmlConsumos(datos, catalogo)) +
           bloque('historial', 'Historial de los últimos 12 meses', 'Pasá el mouse por las barras para ver el detalle', htmlHistorial(datos)) +
           bloque('facturas', 'Facturas', 'Valores ficticios de demostración', htmlFacturas(datos)) +
           bloque('reportes', 'Reportes', '', htmlReportes(datos, catalogo)) +
           bloque('tickets', 'Tickets', '', htmlTickets(datos)) +
           bloque('recomendado', 'Recomendado para vos', 'Según tus servicios y tus indicadores', htmlOportunidades(datos, catalogo)) +

      '  </div>' +
      '</section>'
    );
  }

  /* ---------- Tooltip de los gráficos ---------- */
  function activarTooltips() {
    var tip = document.createElement('div');
    tip.className = 'tooltip-grafico';
    tip.hidden = true;
    document.body.appendChild(tip);

    vistaPanel.addEventListener('mousemove', function (e) {
      var objetivo = e.target.closest('[data-tooltip]');
      if (!objetivo) {
        tip.hidden = true;
        return;
      }
      tip.textContent = objetivo.getAttribute('data-tooltip');
      tip.hidden = false;
      tip.style.left = e.clientX + 14 + 'px';
      tip.style.top = e.clientY - 36 + 'px';
    });

    vistaPanel.addEventListener('mouseleave', function () {
      tip.hidden = true;
    });
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
