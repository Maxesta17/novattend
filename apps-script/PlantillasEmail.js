/**
 * NovAttend - Plantillas de email (Ola de mejoras operativas backend)
 *
 * Presentacion de los emails automaticos: escapado HTML anti-inyeccion,
 * constructores de texto plano (movidos tal cual desde ResumenSemanalCEO.js)
 * y el HTML del resumen semanal del CEO. Sin logica de negocio ni llamadas
 * a MailApp: solo strings.
 *
 * Email-safe por diseno: solo tablas + estilos inline (nada de <style>,
 * clases, flexbox ni imagenes), fuente Arial/Helvetica, max-width 620px.
 */

/**
 * Escapa un valor dinamico para insertarlo con seguridad en HTML. Todo dato
 * de la hoja (Aurora edita a mano) pasa por aqui: un nombre con '<' no
 * puede romper el email ni inyectar markup.
 * @param {*} v
 * @returns {string}
 */
function escaparHtml_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Construye el cuerpo de texto plano del email, por convocatoria y con las
 * dos secciones de alerta agrupadas por profesor y grupo.
 *
 * @param {string} lunesStr - 'yyyy-MM-dd' del lunes de la semana anterior.
 * @param {string} juevesStr - 'yyyy-MM-dd' del jueves de la semana anterior.
 * @param {Array<{nombre:string, alertasFaltas:Array, alertasRacha:Array}>} secciones
 * @param {Object<string,string>} profesoresPorId
 * @returns {string}
 */
function construirCuerpoResumen_(lunesStr, juevesStr, secciones, profesoresPorId) {
  let cuerpo = 'Resumen semanal de asistencia — semana del ' + lunesStr + ' al ' + juevesStr + '\n';

  secciones.forEach(function(sec) {
    cuerpo += '\n=== ' + sec.nombre + ' ===\n';

    cuerpo += '\n2+ faltas la semana pasada:\n';
    cuerpo += formatearSeccion_(sec.alertasFaltas, profesoresPorId, function(item) {
      return item.faltas + ' faltas';
    });

    cuerpo += '\nRachas de faltas activas (situación actual a día de hoy, no solo la semana pasada):\n';
    cuerpo += formatearSeccion_(sec.alertasRacha, profesoresPorId, function(item) {
      return 'racha de ' + item.racha;
    });
  });

  return cuerpo;
}

/**
 * Formatea una lista de alertas (faltas o racha) agrupada por profesor y,
 * dentro de cada profesor, ordenada por grupo y nombre. Cada linea sigue el
 * formato '  - Nombre (Grupo): <sufijo>'.
 *
 * @param {Array<{nombre:string, grupo:string, profesor_id:string}>} alertas
 * @param {Object<string,string>} profesoresPorId - fallback: id crudo si el
 *   profesor fue dado de baja y ya no aparece en PROFESORES.
 * @param {function(Object):string} sufijo - genera el texto tras los ':'.
 * @returns {string}
 */
function formatearSeccion_(alertas, profesoresPorId, sufijo) {
  if (!alertas || alertas.length === 0) {
    return '  (sin alertas)\n';
  }

  const porProfesor = {};
  alertas.forEach(function(a) {
    const key = a.profesor_id || '(sin profesor)';
    if (!porProfesor[key]) porProfesor[key] = [];
    porProfesor[key].push(a);
  });

  const profesorIds = Object.keys(porProfesor).sort(function(idA, idB) {
    const nombreA = String(profesoresPorId[idA] || idA);
    const nombreB = String(profesoresPorId[idB] || idB);
    return nombreA.localeCompare(nombreB);
  });

  let out = '';
  profesorIds.forEach(function(pid) {
    const nombreProf = profesoresPorId[pid] || pid;
    out += '  ' + nombreProf + ':\n';
    const items = porProfesor[pid].slice().sort(function(x, y) {
      if (x.grupo !== y.grupo) return x.grupo < y.grupo ? -1 : 1;
      return String(x.nombre || '').localeCompare(String(y.nombre || ''));
    });
    items.forEach(function(item) {
      out += '    - ' + item.nombre + ' (' + item.grupo + '): ' + sufijo(item) + '\n';
    });
  });
  return out;
}

// ---- HTML del resumen semanal del CEO --------------------------------
// Estilos inline reutilizados por las tablas (email-safe: sin <style>/clases).
const HTML_TH_ = 'text-align:left;padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.5px;';
const HTML_TD_NOMBRE_ = 'padding:10px 12px;border-bottom:1px solid #EEE8DE;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#2B2B2B;';
const HTML_TD_META_ = 'padding:10px 12px;border-bottom:1px solid #EEE8DE;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B6B6B;';
const HTML_TD_BADGE_ = 'padding:10px 12px;border-bottom:1px solid #EEE8DE;text-align:center;';

/**
 * Aplana y ordena alertas por profesor y, dentro de cada uno, por grupo y
 * nombre — mismo criterio que formatearSeccion_, en filas planas (con
 * profesorNombre resuelto) listas para una tabla HTML.
 * @returns {Array<Object>}
 */
function alertasOrdenadasHtml_(alertas, profesoresPorId) {
  const porProfesor = {};
  (alertas || []).forEach(function(a) {
    const key = a.profesor_id || '(sin profesor)';
    (porProfesor[key] = porProfesor[key] || []).push(a);
  });

  const salida = [];
  Object.keys(porProfesor).sort(function(idA, idB) {
    return String(profesoresPorId[idA] || idA).localeCompare(String(profesoresPorId[idB] || idB));
  }).forEach(function(pid) {
    const nombreProf = profesoresPorId[pid] || pid;
    porProfesor[pid].slice().sort(function(x, y) {
      if (x.grupo !== y.grupo) return x.grupo < y.grupo ? -1 : 1;
      return String(x.nombre || '').localeCompare(String(y.nombre || ''));
    }).forEach(function(item) {
      salida.push(Object.assign({ profesorNombre: nombreProf }, item));
    });
  });
  return salida;
}

/**
 * Badge de color para un valor numerico: rojo si llega a `umbralRojo`,
 * naranja si no. Usado para FALTAS (umbral 3) y RACHA (umbral 5).
 * @returns {string}
 */
function htmlBadge_(valor, umbralRojo) {
  const color = valor >= umbralRojo ? '#C62828' : '#E65100';
  return '<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:' + color +
    ';color:#FFFFFF;font-weight:bold;font-size:12px;">' + escaparHtml_(valor) + '</span>';
}

/**
 * Tabla HTML de un bloque de alertas. Sin alertas: fila '(sin alertas)' en
 * verde. `campo` es la propiedad del item para el badge ('faltas'|'racha'),
 * `umbralRojo` su punto de corte en htmlBadge_.
 * @returns {string}
 */
function htmlTablaAlertas_(alertas, profesoresPorId, columna, campo, umbralRojo) {
  const filas = alertasOrdenadasHtml_(alertas, profesoresPorId);
  const filasHtml = filas.length === 0
    ? '<tr><td colspan="4" style="padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2E7D32;">(sin alertas)</td></tr>'
    : filas.map(function(item) {
      return '<tr>' +
        '<td style="' + HTML_TD_NOMBRE_ + '">' + escaparHtml_(item.nombre) + '</td>' +
        '<td style="' + HTML_TD_META_ + '">' + escaparHtml_(item.grupo) + '</td>' +
        '<td style="' + HTML_TD_META_ + '">' + escaparHtml_(item.profesorNombre) + '</td>' +
        '<td style="' + HTML_TD_BADGE_ + '">' + htmlBadge_(item[campo], umbralRojo) + '</td>' +
      '</tr>';
    }).join('');

  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
    '<thead><tr style="background:#FAF7F2;">' +
      '<th style="' + HTML_TH_ + '">ALUMNO</th>' +
      '<th style="' + HTML_TH_ + '">GRUPO</th>' +
      '<th style="' + HTML_TH_ + '">PROFESOR</th>' +
      '<th style="' + HTML_TH_ + 'text-align:center;">' + escaparHtml_(columna) + '</th>' +
    '</tr></thead>' +
    '<tbody>' + filasHtml + '</tbody>' +
  '</table>';
}

/** Titulo de seccion + bloque de faltas + bloque de rachas de una convocatoria. */
function htmlSeccionConvocatoria_(seccion, profesoresPorId) {
  return (
    '<tr><td style="padding:24px 24px 4px 24px;">' +
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#800000;border-bottom:2px solid #C5A059;padding-bottom:8px;">' +
        escaparHtml_(seccion.nombre) +
      '</div>' +
    '</td></tr>' +
    '<tr><td style="padding:14px 24px 0 24px;">' +
      '<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#2B2B2B;">2+ faltas la semana pasada</p>' +
      htmlTablaAlertas_(seccion.alertasFaltas, profesoresPorId, 'FALTAS', 'faltas', 3) +
    '</td></tr>' +
    '<tr><td style="padding:20px 24px 20px 24px;">' +
      '<p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#2B2B2B;">Rachas de faltas activas</p>' +
      '<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9A9A9A;">situación actual a día de hoy, no solo la semana pasada</p>' +
      htmlTablaAlertas_(seccion.alertasRacha, profesoresPorId, 'RACHA', 'racha', 5) +
    '</td></tr>'
  );
}

/**
 * HTML completo del email de resumen semanal para el CEO. Email-safe: solo
 * tablas + estilos inline, Arial/Helvetica, max-width 620px centrado. Si
 * `secciones` esta vacio o ninguna trae alertas, tarjeta verde de "todo en
 * orden" en vez de las tablas por convocatoria.
 * @param {string} lunesStr - 'yyyy-MM-dd' del lunes de la semana anterior.
 * @param {string} juevesStr - 'yyyy-MM-dd' del jueves de la semana anterior.
 * @param {Array<{nombre:string, alertasFaltas:Array, alertasRacha:Array}>} secciones
 * @param {Object<string,string>} profesoresPorId
 * @param {string} [notaFinal] - nota de destinatario-fallback (ver
 *   resolverDestinatarioCeo_); si no es '', parrafo gris final, ya escapada.
 * @returns {string} HTML listo para MailApp.sendEmail(..., {htmlBody}).
 */
function construirHtmlResumenCEO_(lunesStr, juevesStr, secciones, profesoresPorId, notaFinal) {
  const hayAlertas = (secciones || []).some(function(s) {
    return (s.alertasFaltas && s.alertasFaltas.length) || (s.alertasRacha && s.alertasRacha.length);
  });

  const cuerpo = hayAlertas
    ? secciones.map(function(s) { return htmlSeccionConvocatoria_(s, profesoresPorId); }).join('')
    : '<tr><td style="padding:32px 24px;" align="center">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" style="background:#EDF5EE;border:1px solid #2E7D32;border-radius:8px;">' +
          '<tr><td style="padding:20px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2E7D32;text-align:center;">' +
            '✓ Sin alertas la semana pasada. Todo en orden.' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>';

  const nota = notaFinal
    ? '<tr><td style="padding:16px 24px 0 24px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9A9A;">' +
        escaparHtml_(notaFinal) + '</p></td></tr>'
    : '';

  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2ED;padding:24px 0;">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#FFFFFF;border:1px solid #E5DED4;border-radius:8px;">' +
        '<tr><td style="background:#800000;padding:24px;text-align:center;border-radius:8px 8px 0 0;">' +
          '<div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:1px;">NovAttend</div>' +
          '<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#C5A059;margin-top:6px;">' +
            'Resumen semanal de asistencia · semana del ' + escaparHtml_(lunesStr) + ' al ' + escaparHtml_(juevesStr) +
          '</div>' +
        '</td></tr>' +
        cuerpo + nota +
        '<tr><td style="padding:20px 24px 24px 24px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9A9A9A;">' +
          'Email automático de NovAttend · novattend.vercel.app' +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +
  '</table>';
}
