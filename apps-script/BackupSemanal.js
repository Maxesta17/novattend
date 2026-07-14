/**
 * NovAttend - Backup semanal (Ola de mejoras operativas backend)
 *
 * Trigger semanal (domingo 22h, instalado por installTriggers en
 * OperacionesBase.js) que copia el spreadsheet de produccion a Drive y
 * rota las copias antiguas conservando las 8 mas recientes.
 */

/**
 * Copia el spreadsheet activo (script bound: ES la base de datos de
 * produccion) a la carpeta 'NovAttend Backups' de Drive y rota las copias
 * antiguas (conserva las 8 mas recientes, papelera para el resto).
 * Pensada para el trigger semanal instalado por installTriggers.
 *
 * Guard anti doble-ejecucion ATOMICO con ScriptLock: se adquiere el lock
 * global antes de comprobar si ya corrio hoy, para que dos disparos
 * simultaneos del trigger no pasen ambos el check. La marca de "ejecutado"
 * solo se escribe al FINAL, tras completar con exito y todavia dentro del
 * lock, asi que un fallo a mitad de proceso permite reintento manual el
 * mismo dia.
 */
function triggerBackupSemanal() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    writeLog('OPERATIVA', 'BACKUP_SKIP', 'lock ocupado, se omite');
    return;
  }
  try {
    if (opsYaEjecutadoHoy_('backup')) {
      writeLog('OPERATIVA', 'BACKUP_SKIP', 'ya ejecutado hoy (' + opsHoyStr_() + ')');
      return;
    }

    // Script bound al spreadsheet de produccion: el ID nunca se hardcodea.
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const id = ss.getId();
    const nombre = 'NovAttend backup ' + opsHoyStr_();

    const carpeta = opsCarpetaBackups_();

    // Idempotencia extra: si ya existe una copia con el nombre de hoy (ej.
    // reintento tras un fallo posterior a la copia), no duplicar.
    const existentes = carpeta.getFilesByName(nombre);
    if (!existentes.hasNext()) {
      DriveApp.getFileById(id).makeCopy(nombre, carpeta);
    }

    const rotados = opsRotarBackups_(carpeta);

    // Marca al FINAL, dentro del lock: un fallo a mitad no marca (permite
    // reintento manual hoy); el lock impide el solape con otra ejecucion.
    opsMarcarEjecutadoHoy_('backup');
    writeLog('OPERATIVA', 'BACKUP', nombre + ' | rotados=' + rotados);
  } catch (err) {
    writeLog('OPERATIVA', 'ERROR_BACKUP', err.message);
    opsEnviarEmail_(
      OPS_DEV_EMAIL,
      'NovAttend — ERROR en backup semanal',
      'El backup semanal fallo:\n\n' + err.message + '\n\n' + (err.stack || '')
    );
  } finally {
    lock.releaseLock();
  }
}

/**
 * Rota las copias de backup dentro de `carpeta`: conserva las 8 mas
 * recientes (por fecha en el nombre) y envia el resto a la papelera
 * (setTrashed, NUNCA borrado permanente).
 *
 * Solo toca archivos cuyo nombre hace match EXACTO con el patron
 * 'NovAttend backup yyyy-MM-dd'. Cualquier otro archivo de la carpeta
 * (aunque este ahi por error o manualmente) se ignora por completo.
 *
 * @param {GoogleAppsScript.Drive.Folder} carpeta
 * @returns {number} cantidad de archivos enviados a la papelera.
 */
function opsRotarBackups_(carpeta) {
  const PATRON = /^NovAttend backup (\d{4}-\d{2}-\d{2})$/;
  const candidatos = [];

  const it = carpeta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const m = PATRON.exec(f.getName());
    if (m) {
      candidatos.push({ file: f, fecha: m[1] });
    }
  }

  // Orden descendente: la copia mas reciente primero.
  candidatos.sort(function(a, b) {
    if (a.fecha < b.fecha) return 1;
    if (a.fecha > b.fecha) return -1;
    return 0;
  });

  const CONSERVAR = 8;
  let rotados = 0;
  for (let i = CONSERVAR; i < candidatos.length; i++) {
    candidatos[i].file.setTrashed(true);
    rotados++;
  }

  return rotados;
}

/**
 * Resuelve la carpeta de backups de forma estable. Persiste su ID en la Script
 * Property 'ops_backup_folder_id' y usa getFolderById para evitar el bug de
 * getFoldersByName cuando hay varias carpetas homonimas (rotacion fragmentada).
 * Fallback: si la property no existe, el ID es invalido o la carpeta esta en
 * papelera/borrada, busca por nombre (primera coincidencia) o la crea, y
 * re-persiste el ID.
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function opsCarpetaBackups_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('ops_backup_folder_id');
  if (savedId) {
    try {
      const f = DriveApp.getFolderById(savedId);
      if (!f.isTrashed()) return f;   // getFolderById puede devolver una en papelera
    } catch (e) {
      // ID inexistente o sin acceso: se recrea/busca abajo.
    }
  }
  const it = DriveApp.getFoldersByName('NovAttend Backups');
  const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder('NovAttend Backups');
  props.setProperty('ops_backup_folder_id', carpeta.getId());
  return carpeta;
}
