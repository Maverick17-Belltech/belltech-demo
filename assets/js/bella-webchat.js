/* =========================================================
   Belltech Demo - Conexión de Bella (NICE Cognigy Webchat v3)
   Ruta: belltech-demo/assets/js/bella-webchat.js
   Lo carga automáticamente assets/js/comun.js en todas las páginas.

   Qué hace:
   - Carga el Webchat de Cognigy recién cuando el usuario abre el chat
     (burbuja de Bella o cualquier botón con data-accion="abrir-chat").
   - Oculta el botón flotante propio de Cognigy: el chat lo abre la burbuja.
   - Al abrir, envía un mensaje invisible solo con datos:
       { belltech: { tipo: "visitante", ... } }  o
       { belltech: { tipo: "cliente", nombre, empresa, servicios, consumos, ... } }
     El flujo de Cognigy lo guarda en context.belltech (nodo Code
     "Guardar datos del sitio") y Bella lo recibe por Short-Term Memory Injection.
   ========================================================= */
(function () {
  'use strict';

  var BD = window.BelltechDemo;
  if (!BD) return;

  /* ---------- Configuración ---------- */
  var CONFIG = {
    // URL del Endpoint "DEMO_Belltech_Webchat" (Cognigy > Deploy > Endpoints > Embedding HTML)
    endpointUrl: 'https://endpoint-trial.cognigy.ai/c6f3aa7b6020bebd2bc31a9063faf5b2e618856e51528e7cb81f4458bc1c61ca',
    // Script oficial del Webchat v3 (documentación de Cognigy)
    scriptUrl: 'https://github.com/Cognigy/Webchat/releases/latest/download/webchat.js'
  };

  var CLAVE_VISITANTE = 'belltechDemo.visitanteId';

  var estado = {
    cargando: null,      // promesa de carga del webchat
    webchat: null,       // objeto devuelto por initWebchat
    abierto: false,
    contextoEnviado: false
  };

  /* ---------- Identificador de usuario ----------
     - Cliente logueado: basado en su email (cada cliente tiene su propia conversación).
     - Visitante: un identificador aleatorio guardado en este navegador. */
  function obtenerUserId() {
    var s = BD.obtenerSesion();
    if (s && s.email) {
      return 'cliente-' + String(s.email).toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    var id = null;
    try {
      id = window.localStorage.getItem(CLAVE_VISITANTE);
      if (!id) {
        id = 'visitante-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        window.localStorage.setItem(CLAVE_VISITANTE, id);
      }
    } catch (e) {
      id = 'visitante-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    return id;
  }

  /* ---------- Datos que se le pasan a Bella ---------- */

  function paginaActual() {
    return {
      titulo: document.title,
      ruta: window.location.pathname + window.location.search
    };
  }

  // Resumen de datos.json: lo justo para que Bella responda sobre la cuenta
  function resumirDatosCliente(sesion, datos, catalogo) {
    var lista = function (v) { return Array.isArray(v) ? v : []; };

    var servicios = lista(datos.serviciosContratados).map(function (s) {
      return {
        producto: s.nombre,
        plan: s.plan,
        detalle: s.detalle,
        licencias: s.licencias + ' ' + s.unidadLicencia,
        estado: s.estado,
        clienteDesde: s.desde,
        renovacion: s.renovacion,
        costoMensual: (datos.moneda || 'USD') + ' ' + s.costoMensual
      };
    });

    var contratados = lista(datos.serviciosContratados).map(function (s) { return s.producto; });
    var noContratados = catalogo
      ? BD.listarProductos(catalogo)
          .filter(function (it) { return contratados.indexOf(it.producto.id) === -1; })
          .map(function (it) { return it.producto.nombre; })
      : [];

    var consumo = datos.consumoMes || {};
    var consumoMes = {
      periodo: consumo.periodo,
      fechaDeCorte: consumo.corte,
      items: lista(consumo.items).map(function (it) {
        var porcentaje = it.incluido ? Math.round((it.consumo / it.incluido) * 100) : null;
        return {
          metrica: it.metrica,
          consumo: it.consumo + ' ' + it.unidad,
          incluidoEnElPlan: it.incluido + ' ' + it.unidad,
          porcentajeUsado: porcentaje !== null ? porcentaje + '%' : null
        };
      })
    };

    var completos = lista(datos.historial).filter(function (h) { return !h.parcial; });
    var historialReciente = completos.slice(-3);

    var facturas = lista(datos.facturas);
    var pendientes = facturas.filter(function (f) { return String(f.estado).toLowerCase() === 'pendiente'; });
    var saldo = pendientes.reduce(function (t, f) { return t + (Number(f.importe) || 0); }, 0);

    return {
      tipo: 'cliente',
      nombre: sesion.nombre,
      primerNombre: BD.primerNombre(sesion.nombre),
      email: sesion.email,
      cargo: sesion.cargo,
      empresa: sesion.empresaNombre,
      industria: sesion.industria,
      pais: sesion.pais,
      nota: 'Empresa y datos ficticios de demostración.',
      clienteDesde: (datos.resumen || {}).clienteDesde,
      ejecutivoDeCuenta: (datos.resumen || {}).ejecutivoCuenta,
      emailEjecutivo: (datos.resumen || {}).emailEjecutivo,
      serviciosContratados: servicios,
      productosNoContratados: noContratados,
      consumoDelMes: consumoMes,
      historialUltimos3Meses: historialReciente,
      facturacion: {
        moneda: datos.moneda || 'USD',
        saldoPendiente: saldo,
        facturasPendientes: pendientes,
        ultimasFacturas: facturas.slice(0, 3)
      },
      reportes: lista(datos.reportes).map(function (r) {
        return { titulo: r.titulo, periodo: r.periodo, indicadores: r.indicadores };
      }),
      tickets: lista(datos.tickets),
      recomendaciones: lista(datos.oportunidades),
      paginaActual: paginaActual()
    };
  }

  // Devuelve una promesa con el objeto "belltech" para enviar a Cognigy
  function armarContexto() {
    var sesion = BD.obtenerSesion();
    if (!sesion) {
      return Promise.resolve({ tipo: 'visitante', paginaActual: paginaActual() });
    }
    return Promise.all([
      BD.cargarDatosEmpresa(),
      BD.cargarCatalogo().catch(function () { return null; })
    ])
      .then(function (r) {
        return resumirDatosCliente(sesion, r[0], r[1]);
      })
      .catch(function (err) {
        console.warn('[Bella] No se pudieron leer los datos del cliente:', err);
        return {
          tipo: 'cliente',
          nombre: sesion.nombre,
          primerNombre: BD.primerNombre(sesion.nombre),
          empresa: sesion.empresaNombre,
          nota: 'No se pudieron cargar los datos de la cuenta.',
          paginaActual: paginaActual()
        };
      });
  }

  function enviarContexto() {
    if (!estado.webchat || estado.contextoEnviado) return;
    estado.contextoEnviado = true;
    armarContexto().then(function (belltech) {
      try {
        // Texto vacío = mensaje solo de datos (no aparece en el chat)
        estado.webchat.sendMessage('', { belltech: belltech });
      } catch (e) {
        estado.contextoEnviado = false;
        console.warn('[Bella] No se pudo enviar el contexto:', e);
      }
    });
  }

  /* ---------- Carga del Webchat ---------- */

  function cargarScript(url) {
    return new Promise(function (resolver, rechazar) {
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = resolver;
      s.onerror = function () { rechazar(new Error('No se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }

  function iniciarWebchat() {
    if (estado.cargando) return estado.cargando;

    estado.cargando = cargarScript(CONFIG.scriptUrl)
      .then(function () {
        if (typeof window.initWebchat !== 'function') {
          throw new Error('initWebchat no está disponible');
        }
        return window.initWebchat(CONFIG.endpointUrl, {
          userId: obtenerUserId(),
          settings: {
            // El chat lo abre la burbuja de Bella, no el botón de Cognigy
            widgetSettings: { disableToggleButton: true },
            behavior: {
              // Une en un solo mensaje las respuestas que llegan por partes
              collateStreamedOutputs: true,
              inputPlaceholder: 'Escribí tu mensaje…'
            },
            embeddingConfiguration: { awaitEndpointConfig: true }
          }
        });
      })
      .then(function (webchat) {
        estado.webchat = webchat;

        webchat.registerAnalyticsService(function (evento) {
          switch (evento.type) {
            case 'webchat/open':
              estado.abierto = true;
              BD.ocultarBurbuja();
              enviarContexto();
              break;
            case 'webchat/close':
            case 'webchat/minimize':
              estado.abierto = false;
              BD.mostrarBurbuja();
              break;
            case 'webchat/switch-session':
              // Conversación nueva: hay que volver a enviar los datos
              estado.contextoEnviado = false;
              enviarContexto();
              break;
          }
        });

        return webchat;
      })
      .catch(function (err) {
        estado.cargando = null;
        throw err;
      });

    return estado.cargando;
  }

  /* ---------- Punto de entrada que usa comun.js ----------
     Todos los elementos con data-accion="abrir-chat" llaman a esta función. */
  BD.abrirChat = function () {
    if (estado.abierto) return; // open() cierra el chat si ya está abierto

    if (!estado.webchat) BD.mostrarAviso('Conectando con ' + BD.agente.nombre + '…');

    iniciarWebchat()
      .then(function (webchat) {
        if (!estado.abierto) webchat.open();
      })
      .catch(function (err) {
        console.error('[Bella] Error al iniciar el Webchat:', err);
        BD.mostrarAviso('No pudimos conectar con ' + BD.agente.nombre + '. Probá de nuevo en unos minutos.');
      });
  };
})();/* =========================================================
   Belltech Demo - Conexión de Bella (NICE Cognigy Webchat v3)
   Ruta: belltech-demo/assets/js/bella-webchat.js
   Lo carga automáticamente assets/js/comun.js en todas las páginas.

   Qué hace:
   - Carga el Webchat de Cognigy recién cuando el usuario abre el chat
     (burbuja de Bella o cualquier botón con data-accion="abrir-chat").
   - Oculta el botón flotante propio de Cognigy: el chat lo abre la burbuja.
   - Al abrir, envía un mensaje invisible solo con datos:
       { belltech: { tipo: "visitante", ... } }  o
       { belltech: { tipo: "cliente", nombre, empresa, servicios, consumos, ... } }
     El flujo de Cognigy lo guarda en context.belltech (nodo Code
     "Guardar datos del sitio") y Bella lo recibe por Short-Term Memory Injection.
   ========================================================= */
(function () {
  'use strict';

  var BD = window.BelltechDemo;
  if (!BD) return;

  /* ---------- Configuración ---------- */
  var CONFIG = {
    // URL del Endpoint "DEMO_Belltech_Webchat" (Cognigy > Deploy > Endpoints > Embedding HTML)
    endpointUrl: 'https://endpoint-trial.cognigy.ai/c6f3aa7b6020bebd2bc31a9063faf5b2e618856e51528e7cb81f4458bc1c61ca',
    // Script oficial del Webchat v3 (documentación de Cognigy)
    scriptUrl: 'https://github.com/Cognigy/Webchat/releases/latest/download/webchat.js'
  };

  var CLAVE_VISITANTE = 'belltechDemo.visitanteId';

  var estado = {
    cargando: null,      // promesa de carga del webchat
    webchat: null,       // objeto devuelto por initWebchat
    abierto: false,
    contextoEnviado: false
  };

  /* ---------- Identificador de usuario ----------
     - Cliente logueado: basado en su email (cada cliente tiene su propia conversación).
     - Visitante: un identificador aleatorio guardado en este navegador. */
  function obtenerUserId() {
    var s = BD.obtenerSesion();
    if (s && s.email) {
      return 'cliente-' + String(s.email).toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    var id = null;
    try {
      id = window.localStorage.getItem(CLAVE_VISITANTE);
      if (!id) {
        id = 'visitante-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        window.localStorage.setItem(CLAVE_VISITANTE, id);
      }
    } catch (e) {
      id = 'visitante-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    return id;
  }

  /* ---------- Datos que se le pasan a Bella ---------- */

  function paginaActual() {
    return {
      titulo: document.title,
      ruta: window.location.pathname + window.location.search
    };
  }

  // Resumen de datos.json: lo justo para que Bella responda sobre la cuenta
  function resumirDatosCliente(sesion, datos, catalogo) {
    var lista = function (v) { return Array.isArray(v) ? v : []; };

    var servicios = lista(datos.serviciosContratados).map(function (s) {
      return {
        producto: s.nombre,
        plan: s.plan,
        detalle: s.detalle,
        licencias: s.licencias + ' ' + s.unidadLicencia,
        estado: s.estado,
        clienteDesde: s.desde,
        renovacion: s.renovacion,
        costoMensual: (datos.moneda || 'USD') + ' ' + s.costoMensual
      };
    });

    var contratados = lista(datos.serviciosContratados).map(function (s) { return s.producto; });
    var noContratados = catalogo
      ? BD.listarProductos(catalogo)
          .filter(function (it) { return contratados.indexOf(it.producto.id) === -1; })
          .map(function (it) { return it.producto.nombre; })
      : [];

    var consumo = datos.consumoMes || {};
    var consumoMes = {
      periodo: consumo.periodo,
      fechaDeCorte: consumo.corte,
      items: lista(consumo.items).map(function (it) {
        var porcentaje = it.incluido ? Math.round((it.consumo / it.incluido) * 100) : null;
        return {
          metrica: it.metrica,
          consumo: it.consumo + ' ' + it.unidad,
          incluidoEnElPlan: it.incluido + ' ' + it.unidad,
          porcentajeUsado: porcentaje !== null ? porcentaje + '%' : null
        };
      })
    };

    var completos = lista(datos.historial).filter(function (h) { return !h.parcial; });
    var historialReciente = completos.slice(-3);

    var facturas = lista(datos.facturas);
    var pendientes = facturas.filter(function (f) { return String(f.estado).toLowerCase() === 'pendiente'; });
    var saldo = pendientes.reduce(function (t, f) { return t + (Number(f.importe) || 0); }, 0);

    return {
      tipo: 'cliente',
      nombre: sesion.nombre,
      primerNombre: BD.primerNombre(sesion.nombre),
      email: sesion.email,
      cargo: sesion.cargo,
      empresa: sesion.empresaNombre,
      industria: sesion.industria,
      pais: sesion.pais,
      nota: 'Empresa y datos ficticios de demostración.',
      clienteDesde: (datos.resumen || {}).clienteDesde,
      ejecutivoDeCuenta: (datos.resumen || {}).ejecutivoCuenta,
      emailEjecutivo: (datos.resumen || {}).emailEjecutivo,
      serviciosContratados: servicios,
      productosNoContratados: noContratados,
      consumoDelMes: consumoMes,
      historialUltimos3Meses: historialReciente,
      facturacion: {
        moneda: datos.moneda || 'USD',
        saldoPendiente: saldo,
        facturasPendientes: pendientes,
        ultimasFacturas: facturas.slice(0, 3)
      },
      reportes: lista(datos.reportes).map(function (r) {
        return { titulo: r.titulo, periodo: r.periodo, indicadores: r.indicadores };
      }),
      tickets: lista(datos.tickets),
      recomendaciones: lista(datos.oportunidades),
      paginaActual: paginaActual()
    };
  }

  // Devuelve una promesa con el objeto "belltech" para enviar a Cognigy
  function armarContexto() {
    var sesion = BD.obtenerSesion();
    if (!sesion) {
      return Promise.resolve({ tipo: 'visitante', paginaActual: paginaActual() });
    }
    return Promise.all([
      BD.cargarDatosEmpresa(),
      BD.cargarCatalogo().catch(function () { return null; })
    ])
      .then(function (r) {
        return resumirDatosCliente(sesion, r[0], r[1]);
      })
      .catch(function (err) {
        console.warn('[Bella] No se pudieron leer los datos del cliente:', err);
        return {
          tipo: 'cliente',
          nombre: sesion.nombre,
          primerNombre: BD.primerNombre(sesion.nombre),
          empresa: sesion.empresaNombre,
          nota: 'No se pudieron cargar los datos de la cuenta.',
          paginaActual: paginaActual()
        };
      });
  }

  function enviarContexto() {
    if (!estado.webchat || estado.contextoEnviado) return;
    estado.contextoEnviado = true;
    armarContexto().then(function (belltech) {
      try {
        // Texto vacío = mensaje solo de datos (no aparece en el chat)
        estado.webchat.sendMessage('', { belltech: belltech });
      } catch (e) {
        estado.contextoEnviado = false;
        console.warn('[Bella] No se pudo enviar el contexto:', e);
      }
    });
  }

  /* ---------- Carga del Webchat ---------- */

  function cargarScript(url) {
    return new Promise(function (resolver, rechazar) {
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = resolver;
      s.onerror = function () { rechazar(new Error('No se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }

  function iniciarWebchat() {
    if (estado.cargando) return estado.cargando;

    estado.cargando = cargarScript(CONFIG.scriptUrl)
      .then(function () {
        if (typeof window.initWebchat !== 'function') {
          throw new Error('initWebchat no está disponible');
        }
        return window.initWebchat(CONFIG.endpointUrl, {
          userId: obtenerUserId(),
          settings: {
            // El chat lo abre la burbuja de Bella, no el botón de Cognigy
            widgetSettings: { disableToggleButton: true },
            behavior: {
              // Une en un solo mensaje las respuestas que llegan por partes
              collateStreamedOutputs: true,
              inputPlaceholder: 'Escribí tu mensaje…'
            },
            embeddingConfiguration: { awaitEndpointConfig: true }
          }
        });
      })
      .then(function (webchat) {
        estado.webchat = webchat;

        webchat.registerAnalyticsService(function (evento) {
          switch (evento.type) {
            case 'webchat/open':
              estado.abierto = true;
              BD.ocultarBurbuja();
              enviarContexto();
              break;
            case 'webchat/close':
            case 'webchat/minimize':
              estado.abierto = false;
              BD.mostrarBurbuja();
              break;
            case 'webchat/switch-session':
              // Conversación nueva: hay que volver a enviar los datos
              estado.contextoEnviado = false;
              enviarContexto();
              break;
          }
        });

        return webchat;
      })
      .catch(function (err) {
        estado.cargando = null;
        throw err;
      });

    return estado.cargando;
  }

  /* ---------- Punto de entrada que usa comun.js ----------
     Todos los elementos con data-accion="abrir-chat" llaman a esta función. */
  BD.abrirChat = function () {
    if (estado.abierto) return; // open() cierra el chat si ya está abierto

    if (!estado.webchat) BD.mostrarAviso('Conectando con ' + BD.agente.nombre + '…');

    iniciarWebchat()
      .then(function (webchat) {
        if (!estado.abierto) webchat.open();
      })
      .catch(function (err) {
        console.error('[Bella] Error al iniciar el Webchat:', err);
        BD.mostrarAviso('No pudimos conectar con ' + BD.agente.nombre + '. Probá de nuevo en unos minutos.');
      });
  };
})();
