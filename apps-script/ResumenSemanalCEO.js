/**
 * NovAttend - Resumen semanal de asistencia para el CEO (Google Apps Script)
 *
 * Trigger semanal (lunes ~8h): email al CEO con las alertas de la semana
 * ANTERIOR (clases lunes-jueves) — alumnos con 2+ faltas esa semana y
 * alumnos con racha de faltas activa (racha_faltas >= 2), agrupado por
 * convocatoria -> profesor -> grupo.
 *
 * Reutiliza computeResumen() y mondayOf_() de Código.js: NO duplica ese calculo.
 * Depende de los helpers globales de OperacionesBase.js (OPS_DEV_EMAIL,
 * opsIsDryRun_, opsEnviarEmail_, opsHoyStr_, opsYaEjecutadoHoy_,
 * opsMarcarEjecutadoHoy_); ninguno se redefine aqui.
 */

/**
 * Handler del trigger semanal (lunes 8h). El nombre de esta funcion es el
 * que instala installTriggers() como disparador SEMANAL — no renombrar.
 */
function triggerResumenSemanalCEO() {
  try {
    // Guard ATOMICO anti doble-email (lock + check + marca): si ya corrio hoy
    // (reintento manual, doble trigger) o el lock esta ocupado, no se reenvia.
    if (!opsGuardDiario_('resumen_ceo')) {
      writeLog('OPERATIVA', 'RESUMEN_CEO', 'omitido: ya ejecutado hoy o lock ocupado');
      return;
    }
    const tz = Session.getScriptTimeZone();
    const fmt = function(d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };

    // Semana anterior: lunes de la semana en curso menos 7 dias. Clases
    // lunes-jueves, asi que el cierre de esa semana es jueves (lunes + 3).
    const lunesAnterior = mondayOf_(new Date());
    lunesAnterior.setDate(lunesAnterior.getDate() - 7);
    const juevesAnterior = new Date(lunesAnterior);
    juevesAnterior.setDate(lunesAnterior.getDate() + 3);
    const lunesAnteriorStr = fmt(lunesAnterior);
    const juevesAnteriorStr = fmt(juevesAnterior);

    const asunto = 'NovAttend — Resumen semanal de asistencia (semana del ' +
      lunesAnteriorStr + ' al ' + juevesAnteriorStr + ')';

    const destinatario = resolverDestinatarioCeo_();
    // Convocatorias que SOLAPAN la semana reportada (lun-jue anterior), no las
    // activas HOY: una cerrada el viernes o con fecha_fin entre jueves y domingo
    // tuvo clases esa semana y DEBE salir en el resumen. Se ignora el checkbox
    // activa a proposito (informe retrospectivo): el solape de fechas es la
    // senal de que hubo clases. computeResumen ya filtra alumnos activos, asi
    // que una convocatoria sin asistencia solo produce secciones vacias.
    const convocatorias = sheetToObjects(SHEET_NAMES.CONVOCATORIAS).filter(function(c) {
      return c.fecha_inicio <= juevesAnteriorStr && c.fecha_fin >= lunesAnteriorStr;
    });

    if (convocatorias.length === 0) {
      // Señal de vida: mejor un email corto que silencio total.
      opsEnviarEmail_(
        destinatario.email,
        asunto,
        'No hay convocatorias con clases la semana pasada. Sin datos que resumir.' + destinatario.nota
      );
      writeLog('OPERATIVA', 'RESUMEN_CEO', 'sin convocatorias con clases la semana pasada | destinatario=' + destinatario.tipo);
      return;
    }

    // Lectura UNICA de las hojas pesadas (mismo patron que warmCache): sin
    // esto, cada computeResumen releeria ALUMNOS y ASISTENCIA completas por
    // convocatoria — el O(convocatorias x hoja) que hace rozar el cap de 6 min.
    const alumnosTodos = sheetToObjects(SHEET_NAMES.ALUMNOS);
    const registrosTodos = sheetToObjects(SHEET_NAMES.ASISTENCIA);

    const profesoresPorId = mapaProfesoresPorId_();
    let nf = 0;
    let nr = 0;
    const secciones = [];

    convocatorias.forEach(function(conv) {
      // Una llamada por convocatoria (sin filtro profesor/grupo): devuelve
      // TODOS los alumnos activos con historico_semanas y racha_faltas ya
      // calculados. Corre en trigger semanal, el coste es aceptable.
      let resumen;
      try {
        resumen = computeResumen(conv.id, '', '', alumnosTodos, registrosTodos);
      } catch (errConv) {
        // Una convocatoria con datos corruptos no tumba el resto (mismo
        // patron defensivo que warmCache).
        writeLog('OPERATIVA', 'ERROR_RESUMEN_CEO', 'convocatoria ' + conv.id + ': ' + errConv.message);
        return;
      }

      const alertasFaltas = [];
      const alertasRacha = [];

      (resumen || []).forEach(function(a) {
        // Defensivo: historico_semanas puede venir vacio o sin la semana
        // anterior (alumno nuevo, sin clases esa semana). Simplemente no
        // genera alerta, nunca lanza.
        const historico = a.historico_semanas || [];
        const semanaAnterior = historico.filter(function(s) {
          return s && s.semana_inicio === lunesAnteriorStr;
        })[0];

        if (semanaAnterior && semanaAnterior.faltas >= 2) {
          alertasFaltas.push({
            nombre: a.nombre,
            grupo: a.grupo,
            profesor_id: a.profesor_id,
            faltas: semanaAnterior.faltas
          });
        }
        // Un alumno puede aparecer en ambas listas: correcto y deseable (2+
        // faltas la semana pasada Y racha activa son senales distintas).
        if (a.racha_faltas >= 2) {
          alertasRacha.push({
            nombre: a.nombre,
            grupo: a.grupo,
            profesor_id: a.profesor_id,
            racha: a.racha_faltas
          });
        }
      });

      nf += alertasFaltas.length;
      nr += alertasRacha.length;
      secciones.push({
        nombre: conv.nombre || conv.id,
        alertasFaltas: alertasFaltas,
        alertasRacha: alertasRacha
      });
    });

    const cuerpo = (nf === 0 && nr === 0)
      ? 'Sin alertas la semana pasada. Todo en orden.' + destinatario.nota
      : construirCuerpoResumen_(lunesAnteriorStr, juevesAnteriorStr, secciones, profesoresPorId) + destinatario.nota;

    opsEnviarEmail_(destinatario.email, asunto, cuerpo);

    writeLog('OPERATIVA', 'RESUMEN_CEO',
      'alertasFaltas=' + nf + ' alertasRacha=' + nr + ' destinatario=' + destinatario.tipo);
  } catch (err) {
    writeLog('OPERATIVA', 'ERROR_RESUMEN_CEO', err.message);
    opsEnviarEmail_(
      OPS_DEV_EMAIL,
      'NovAttend — ERROR en resumen semanal CEO',
      'triggerResumenSemanalCEO fallo: ' + err.message + (err.stack ? ('\n\n' + err.stack) : '')
    );
  }
}

/**
 * Resuelve el destinatario del resumen: la fila de PROFESORES con
 * rol === 'ceo'. Si su email no pasa esEmailValido_ (vacio o placeholder),
 * cae a OPS_DEV_EMAIL y devuelve una nota para anadir al final del cuerpo.
 * (opsEnviarEmail_ redirige igualmente a dev en DRY_RUN, con prefijo — este
 * fallback es independiente de eso.)
 *
 * @returns {{email: string, tipo: 'ceo'|'dev', nota: string}}
 */
function resolverDestinatarioCeo_() {
  const ceo = sheetToObjects(SHEET_NAMES.PROFESORES).filter(function(p) {
    return p.rol === 'ceo';
  })[0];
  const emailCeo = ceo && ceo.email;

  if (emailCeo && esEmailValido_(emailCeo)) {
    return { email: emailCeo, tipo: 'ceo', nota: '' };
  }

  writeLog('OPERATIVA', 'RESUMEN_CEO_SIN_EMAIL', 'email de CEO vacio o invalido en PROFESORES; fallback a OPS_DEV_EMAIL');
  return {
    email: OPS_DEV_EMAIL,
    tipo: 'dev',
    nota: '\n\nAVISO: el email del CEO está vacío en PROFESORES (col C). Rellénalo para que este resumen le llegue directamente.'
  };
}

/**
 * Mapa id -> nombre de PROFESORES (una sola lectura de hoja).
 * @returns {Object<string, string>}
 */
function mapaProfesoresPorId_() {
  const mapa = {};
  sheetToObjects(SHEET_NAMES.PROFESORES).forEach(function(p) {
    mapa[p.id] = p.nombre;
  });
  return mapa;
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
