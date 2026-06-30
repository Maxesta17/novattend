/**
 * NovAttend - Backend API (Google Apps Script)
 *
 * Despliega como Web App desde el editor de Apps Script.
 * Configuracion: Ejecutar como "Yo" | Acceso "Cualquiera".
 *
 * Hojas requeridas: CONVOCATORIAS, PROFESORES, ALUMNOS, ASISTENCIA, LOG
 */

// ============================================================
// CONFIGURACION
// ============================================================

const SHEET_NAMES = {
  CONVOCATORIAS: 'CONVOCATORIAS',
  PROFESORES: 'PROFESORES',
  ALUMNOS: 'ALUMNOS',
  ASISTENCIA: 'ASISTENCIA',
  LOG: 'LOG'
};

// Columnas que contienen valores de fecha y reciben normalizacion a ISO (yyyy-MM-dd).
// Solo estas cabeceras pasan por normalizeSheetDate_; el resto de columnas se
// convierten unicamente si son instanceof Date (comportamiento previo).
const DATE_COLUMNS = ['fecha', 'fecha_inicio', 'fecha_fin'];

// ============================================================
// CACHE
// ============================================================

const CACHE_TTL = 120; // segundos (2 minutos) — TTL por defecto de lecturas en vivo
// TTL largo para warmCache (6h = maximo de CacheService). El precalentado de las
// 6:00 debe sobrevivir hasta la franja de uso real (8-12h), no expirar a los 2 min.
// Es seguro porque toda escritura invalida la clave 'res_<convocatoria>' (cacheInvalidate).
const WARM_TTL = 21600; // segundos (6 horas)
const cache_ = CacheService.getScriptCache();

/**
 * Lee del cache o ejecuta fetchFn y guarda el resultado.
 * Si el JSON supera 100KB, devuelve sin cachear.
 */
function cacheGet(key, fetchFn, ttl) {
  const cached = cache_.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = fetchFn();
  const json = JSON.stringify(data);

  // Limite de CacheService: 100KB por entrada
  if (json.length < 100000) {
    cache_.put(key, json, ttl || CACHE_TTL);
  }

  return data;
}

/**
 * Invalida todas las claves que coincidan con los prefijos dados.
 * CacheService no soporta iteracion, asi que mantenemos un registro
 * de claves activas en una clave especial '_keys'.
 *
 * La purga determinista al final corre SIEMPRE, aunque _keys haya expirado.
 * Es necesaria porque warmCache cachea la clave 'res_<conv>__' con WARM_TTL (6h)
 * pero el indice _keys solo vive CACHE_TTL*3 (6 min). A partir del minuto 6,
 * _keys ya no lista la clave calentada y la purga via indice no la borra; sin
 * esta purga extra, el CEO veria resumen stale hasta que expiren las 6h.
 */
function cacheInvalidate(prefixes) {
  const keysJson = cache_.get('_keys');

  // Purga via indice: solo si _keys aun esta en cache
  if (keysJson) {
    const keys = JSON.parse(keysJson);
    const toRemove = keys.filter(k => prefixes.some(p => k.startsWith(p)));

    if (toRemove.length > 0) {
      cache_.removeAll(toRemove);
      const remaining = keys.filter(k => !toRemove.includes(k));
      if (remaining.length > 0) {
        cache_.put('_keys', JSON.stringify(remaining), CACHE_TTL * 3);
      } else {
        cache_.remove('_keys');
      }
    }
  }

  // Purga determinista de la clave calentada huerfana: la clave global de
  // warmCache es 'res_<conv>__' (profesor_id y grupo vacios). Se borra aunque
  // _keys haya expirado y ya no la liste.
  prefixes.forEach(function(p) {
    if (p.indexOf('res_') === 0) {
      cache_.remove(p + '__');
    }
  });

  // Purga via indice persistente de claves calentadas. warmCache calienta
  // tambien los rosters per-profesor 'alu_<conv>_<prof>_<grupo>' con WARM_TTL
  // (6h), claves que _keys (6 min) deja de listar y que NO son deterministas
  // desde un prefijo (dependen del profesor/grupo presentes en los datos). El
  // indice '_warm_keys' vive WARM_TTL —igual que las entradas— asi que la
  // invalidacion siempre las encuentra (mismo patron que arreglo el bug
  // huerfano de 'res_', generalizado a 'alu_').
  const warmJson = cache_.get('_warm_keys');
  if (warmJson) {
    const warmKeys = JSON.parse(warmJson);
    const toRemove = warmKeys.filter(k => prefixes.some(p => k.indexOf(p) === 0));
    if (toRemove.length > 0) {
      cache_.removeAll(toRemove);
      const remaining = warmKeys.filter(k => toRemove.indexOf(k) === -1);
      if (remaining.length > 0) {
        cache_.put('_warm_keys', JSON.stringify(remaining), WARM_TTL);
      } else {
        cache_.remove('_warm_keys');
      }
    }
  }
}

/**
 * Registra una clave en el indice de claves activas.
 */
function cacheTrackKey(key) {
  const keysJson = cache_.get('_keys');
  const keys = keysJson ? JSON.parse(keysJson) : [];
  if (!keys.includes(key)) {
    keys.push(key);
    cache_.put('_keys', JSON.stringify(keys), CACHE_TTL * 3);
  }
}

/**
 * Wrapper: cachea con tracking de clave.
 */
function cachedGet(key, fetchFn, ttl) {
  cacheTrackKey(key);
  return cacheGet(key, fetchFn, ttl);
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Normaliza un valor de celda de fecha a string ISO (yyyy-MM-dd).
 *
 * Casos soportados:
 *   - instanceof Date  → formatea con Utilities.formatDate (comportamiento original).
 *   - string yyyy-MM-dd → se devuelve sin cambios (ya es ISO correcto).
 *   - string dd/mm/yyyy → se interpreta como DIA/MES/AÑO (locale espanol, NO mes/dia)
 *                         y se convierte a yyyy-MM-dd.
 *   - Cualquier otro string → se devuelve tal cual (no romper guardia downstream).
 *   - Otro tipo          → se devuelve sin tocar.
 *
 * ASUNCION CLAVE: el formato dd/mm/yyyy sigue la convencion espanola (dia primero),
 * NO la anglosajona (mes primero). Ejemplo: "30/06/2026" → "2026-06-30".
 *
 * @param {*}      v  - Valor crudo de la celda.
 * @param {string} tz - Zona horaria del script (Session.getScriptTimeZone()).
 * @returns {*} String ISO yyyy-MM-dd o el valor original si no aplica.
 */
function normalizeSheetDate_(v, tz) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (typeof v === 'string') {
    const s = v.trim();
    // Ya esta en formato ISO correcto
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Formato dd/mm/yyyy (locale espanol): DIA/MES/AÑO
    const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const dia = ddmmyyyy[1].padStart(2, '0');
      const mes = ddmmyyyy[2].padStart(2, '0');
      const anio = ddmmyyyy[3];
      return anio + '-' + mes + '-' + dia;
    }
    // Otro formato de texto: devolver sin cambios
    return s;
  }
  // Tipo no reconocido (numero, booleano, null, etc.): sin cambios
  return v;
}

/**
 * Convierte una hoja en array de objetos usando la fila 1 como cabeceras.
 */
function sheetToObjects(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => h.toString().trim());
  const rows = [];
  // Calcular zona horaria una sola vez fuera del bucle (evita llamada repetida)
  const tz = Session.getScriptTimeZone();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Saltar filas vacias (primera columna vacia)
    if (!row[0] && row[0] !== false && row[0] !== 0) continue;

    const obj = {};
    headers.forEach((header, j) => {
      let val = row[j];
      if (DATE_COLUMNS.indexOf(header) !== -1) {
        // Columna de fecha: normalizar a ISO (soporta Date, yyyy-MM-dd y dd/mm/yyyy)
        val = normalizeSheetDate_(val, tz);
      } else if (val instanceof Date) {
        // Columna no-fecha con celda Date (ej: hora_registro): convertir a ISO igual que antes
        val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
      }
      obj[header] = val;
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Respuesta JSON estandar.
 */
function jsonResponse(data, status) {
  const output = JSON.stringify({
    status: status || 'ok',
    data: data,
    timestamp: new Date().toISOString()
  });
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Respuesta de error.
 *
 * Ampliado (Fase 3) con un tercer argumento OPCIONAL `reason`: una etiqueta
 * estable y legible por maquina (ej. 'credentials', 'token_invalid',
 * 'forbidden') que el frontend usa para clasificar el error sin depender del
 * texto del mensaje. Es retrocompatible: si no se pasa reason, el JSON no
 * incluye la clave y las llamadas antiguas jsonError(msg, code) siguen igual.
 *
 * @param {string} message - Mensaje de error legible (en espanol).
 * @param {number} [code]  - Codigo HTTP-like (por defecto 400).
 * @param {string} [reason] - Etiqueta estable opcional para clasificacion.
 */
function jsonError(message, code, reason) {
  const payload = {
    status: 'error',
    error: message,
    code: code || 400
  };
  // Solo se anade reason si viene definido (retrocompatibilidad estricta).
  if (reason) {
    payload.reason = reason;
  }
  const output = JSON.stringify(payload);
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Escribe una entrada en la hoja LOG.
 */
function writeLog(usuario, accion, detalle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOG);
  if (!sheet) return;

  sheet.appendRow([
    new Date(),
    usuario,
    accion,
    detalle
  ]);
}

/**
 * Genera un ID unico basado en prefijo + timestamp.
 */
function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36);
}

/**
 * Coercion laxa de valores booleanos procedentes de Google Sheets.
 *
 * Cuando una celda no tiene checkbox (ej. filas 51+ en ALUMNOS antes de
 * ejecutar setupSheets con el limite ampliado), el valor 'activo'/'activa'
 * puede llegar como texto ('VERDADERO', 'TRUE', '1', 'SI', 'X') en vez del
 * booleano nativo true. Un filtro estricto === true descartaria esas filas
 * y el alumno desapareceria de la app.
 *
 * Este helper devuelve true para booleano nativo true, para el numero 1
 * y para los textos canonicos de afirmacion de Sheets (ES/EN).
 * En cualquier otro caso devuelve false.
 *
 * NO usar para 'presente' ni 'justificada': esos valores los escribe el
 * codigo y deben seguir evaluandose de forma estricta (=== true).
 *
 * @param {*} v - Valor a evaluar (booleano, numero, string, null, undefined)
 * @returns {boolean}
 */
function isTruthy(v) {
  if (v === true) return true;
  if (v === 1) return true;
  if (typeof v === 'string') {
    return ['TRUE', 'VERDADERO', 'SI', 'SÍ', 'X', '1'].indexOf(v.trim().toUpperCase()) !== -1;
  }
  return false;
}

// ============================================================
// AUTENTICACION
// ============================================================

/**
 * Valida el API key del request contra la Script Property 'API_KEY'.
 * Para GET: el token viene en e.parameter.api_key
 * Para POST: el token viene en body.api_key (body ya parseado)
 *
 * NOTA (Fase 3): este helper YA NO es el gate principal. La autoridad real es
 * requireAuth_ (token de sesion firmado). validateApiKey solo decide si una
 * request LEGACY (api_key valido, sin token) puede pasar a la ventana de
 * coexistencia de SOLO-LECTURA NO sensible. NUNCA concede identidad ni rol ceo.
 *
 * @param {string} token - API key enviado en el request
 * @param {string} action - Nombre de la action solicitada
 * @returns {GoogleAppsScript.Content.TextOutput|null} jsonError si invalido, null si valido
 */
function validateApiKey(token, action) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_KEY')
  if (!expected || token !== expected) {
    console.warn('AUTH_REJECTED', {
      action: action || 'desconocida',
      timestamp: new Date().toISOString()
    })
    return jsonError('No autorizado', 401, 'token_invalid')
  }
  return null
}

// ============================================================
// AUTENTICACION — GATE Y LOGIN (Fase 3)
// ============================================================
//
// Reemplaza el gate de api_key compartido por autenticacion real basada en
// token de sesion firmado (HMAC-SHA256, primitivas de Fase 1). Cada handler
// deriva identidad+rol del TOKEN, jamas del body/query. El api_key legacy
// SOLO sobrevive como ventana de coexistencia de SOLO-LECTURA no sensible.

// TTL del token de login, en SEGUNDOS. 8h cubre una jornada completa. Debe ser
// <= MAX_TTL_SEG (24h) para que validateToken_ no lo rechace por exp lejano.
const TTL_LOGIN_SEG = 8 * 60 * 60; // 8 horas

// Rate-limit / lockout de login por usuario (anti-bruteforce, red-team #2/#5).
// Tras LOGIN_MAX_FAILS fallos en la ventana, el usuario queda bloqueado
// LOGIN_LOCKOUT_SEG segundos. El contador se incrementa SIEMPRE que el login
// falle, exista o no el usuario (anti-enumeracion).
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCKOUT_SEG = 15 * 60; // 15 minutos
// Prefijo de las claves (ScriptProperties + cache) que guardan el estado de
// lockout por usuario. El valor es JSON { count, until }: count = fallos
// acumulados; until = epoch ms de fin de lockout. La fuente de verdad es
// ScriptProperties (durable, no evictable); el cache es solo lectura rapida.
const LOGIN_FAIL_PREFIX = 'loginfail_';

// Salt DUMMY fijo para timing constante en login: si el usuario no existe, se
// ejecuta igualmente verifyPassword_ contra este salt y un hash dummy para que
// el coste temporal del login no revele si el usuario existe (red-team #5). El
// salt es arbitrario y publico; ningun password real produce el hash dummy.
const DUMMY_LOGIN_SALT = 'novattend-dummy-salt-0000';

// El hash dummy se calcula LAZY (no a nivel de modulo): Apps Script re-evalua
// el script en CADA request, y derivar PBKDF2 en la carga del modulo penalizaria
// con ~10000 iteraciones HMAC a TODOS los endpoints (incluidas lecturas). Solo
// se calcula la primera vez que el login lo necesita, dentro de un mismo run.
let DUMMY_LOGIN_HASH_ = null;
function dummyLoginHash_() {
  if (DUMMY_LOGIN_HASH_ === null) {
    DUMMY_LOGIN_HASH_ = pbkdf2_('contrasena-imposible-dummy', DUMMY_LOGIN_SALT, PBKDF2_ITER);
  }
  return DUMMY_LOGIN_HASH_;
}


/**
 * Lee la hoja PROFESORES y devuelve el objeto del profesor con ese id, o null.
 *
 * Resuelve los indices de columna POR CABECERA (no por posicion fija), de modo
 * que es robusto si el orden de columnas cambiara. Devuelve unicamente los
 * campos relevantes para auth (incluye salt/password_hash/token_version, que
 * NUNCA deben salir al cliente — este helper es de uso interno del backend).
 *
 * @param {string} profesorId - id del profesor (ej. 'prof-samuel', 'prof-admin').
 * @returns {{id,nombre,email,activo,rol,salt,password_hash,must_change_password,token_version}|null}
 */
function lookupProfesor_(profesorId) {
  if (!profesorId) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PROFESORES);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  const headers = data[0].map(h => String(h).trim());
  const colId = headers.indexOf('id');
  const colNombre = headers.indexOf('nombre');
  const colEmail = headers.indexOf('email');
  const colActivo = headers.indexOf('activo');
  const colHash = headers.indexOf('password_hash');
  const colSalt = headers.indexOf('salt');
  const colRol = headers.indexOf('rol');
  const colMustChange = headers.indexOf('must_change_password');
  const colTokenVer = headers.indexOf('token_version');
  if (colId === -1) return null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colId]).trim() !== profesorId) continue;
    return {
      id: profesorId,
      nombre: colNombre !== -1 ? data[i][colNombre] : '',
      email: colEmail !== -1 ? data[i][colEmail] : '',
      activo: colActivo !== -1 ? data[i][colActivo] : false,
      rol: colRol !== -1 ? data[i][colRol] : '',
      salt: colSalt !== -1 ? data[i][colSalt] : '',
      password_hash: colHash !== -1 ? data[i][colHash] : '',
      must_change_password: colMustChange !== -1 ? data[i][colMustChange] : false,
      token_version: colTokenVer !== -1 ? data[i][colTokenVer] : ''
    };
  }
  return null;
}

/**
 * Lee el estado de lockout durable del usuario desde ScriptProperties.
 *
 * La FUENTE DE VERDAD del lockout es PropertiesService (persistente, no
 * evictable), no CacheService: un atacante no puede saltarse el bloqueo
 * esperando a que el contador sea desalojado del cache (red-team #2).
 * CacheService se usa solo como cache de lectura rapida delante. Con 11
 * usuarios el numero de claves es trivial y no hay problema de cuota.
 *
 * @param {string} usuario - usuario en claro (ej. 'samuel').
 * @returns {{count:number, until:number}} count = fallos acumulados;
 *          until = epoch ms de fin de lockout (0 si no hay bloqueo).
 */
function loginFailState_(usuario) {
  const key = LOGIN_FAIL_PREFIX + usuario;
  // Cache rapido delante de Properties (fuente de verdad).
  let raw = cache_.get(key);
  if (!raw) {
    raw = PropertiesService.getScriptProperties().getProperty(key);
    if (raw) cache_.put(key, raw, LOGIN_LOCKOUT_SEG);
  }
  if (!raw) return { count: 0, until: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed.count) || 0,
      until: Number(parsed.until) || 0
    };
  } catch (e) {
    return { count: 0, until: 0 };
  }
}

/**
 * Indica si el usuario esta actualmente bloqueado por lockout durable.
 * @param {string} usuario - usuario en claro.
 * @returns {boolean} true si now < until (bloqueo vigente).
 */
function loginIsLocked_(usuario) {
  return Date.now() < loginFailState_(usuario).until;
}

/**
 * Incrementa el contador de fallos de login del usuario en el almacen DURABLE
 * (ScriptProperties) y refresca el cache. Se llama en CADA fallo (exista o no
 * el usuario: anti-enumeracion). Al alcanzar LOGIN_MAX_FAILS fija el fin de
 * lockout (until = now + LOGIN_LOCKOUT_SEG) para bloquear nuevos intentos.
 * @param {string} usuario - usuario en claro.
 */
function loginRegisterFail_(usuario) {
  const key = LOGIN_FAIL_PREFIX + usuario;
  const prev = loginFailState_(usuario);
  const count = prev.count + 1;
  // Preservar un lockout vigente; fijar uno nuevo al cruzar el umbral.
  let until = prev.until;
  if (count >= LOGIN_MAX_FAILS) {
    until = Date.now() + LOGIN_LOCKOUT_SEG * 1000;
  }
  const json = JSON.stringify({ count: count, until: until });
  // Fuente de verdad durable + cache rapido.
  PropertiesService.getScriptProperties().setProperty(key, json);
  cache_.put(key, json, LOGIN_LOCKOUT_SEG);
}

/**
 * Limpia el estado de lockout del usuario tras un login correcto, tanto en el
 * almacen durable como en el cache.
 * @param {string} usuario - usuario en claro.
 */
function loginClearFail_(usuario) {
  const key = LOGIN_FAIL_PREFIX + usuario;
  PropertiesService.getScriptProperties().deleteProperty(key);
  cache_.remove(key);
}

/**
 * Maneja el login (case 'login' en doPost). EXENTO del gate de auth.
 *
 * Seguridad:
 *   - Rate-limit/lockout por usuario DURABLE en ScriptProperties (no evictable;
 *     red-team #2): tras LOGIN_MAX_FAILS fallos bloquea LOGIN_LOCKOUT_SEG. El
 *     contador sube en CADA fallo, exista o no el usuario (anti-enumeracion,
 *     red-team #5). CacheService es solo cache de lectura rapida delante.
 *   - Timing constante: si el usuario no existe se ejecuta igualmente
 *     verifyPassword_ contra un hash dummy fijo, para no revelar por latencia
 *     si el usuario existe.
 *   - Mensaje de error generico ('Usuario o contrasena incorrectos', 401,
 *     reason 'credentials'): NUNCA distingue usuario inexistente de password
 *     erroneo, ni profesor inactivo de credenciales malas.
 *
 * Contrato de exito (lo que espera el frontend):
 *   { token, profesor_id, rol, nombre, exp, must_change_password }
 *   con exp en SEGUNDOS Unix.
 *
 * @param {Object} body - { action:'login', username, password }.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleLogin(body) {
  const usuario = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  // Validacion minima de entrada: usuario/password vacios = credenciales malas
  // (mismo mensaje generico, sin pista de cual falta).
  if (!usuario || !password) {
    if (usuario) loginRegisterFail_(usuario);
    return jsonError('Usuario o contrasena incorrectos', 401, 'credentials');
  }

  // Lockout durable: si hay un bloqueo vigente (now < until), rechazar sin
  // siquiera tocar la hoja. La fuente de verdad es ScriptProperties, no el
  // cache evictable (red-team #2).
  if (loginIsLocked_(usuario)) {
    return jsonError(
      'Demasiados intentos. Espera unos minutos e intentalo de nuevo.',
      429,
      'lockout'
    );
  }

  // Resolver id e identidad candidata. El CEO usa id 'prof-admin'.
  const id = (usuario === 'admin') ? 'prof-admin' : 'prof-' + usuario;
  const prof = lookupProfesor_(id);

  // Timing constante: SIEMPRE se ejecuta una verificacion PBKDF2. Si el usuario
  // no existe o esta inactivo, se verifica contra el hash dummy (resultado
  // siempre false) para que el coste temporal no delate la existencia.
  const okCredenciales = prof
    ? verifyPassword_(password, prof.salt, prof.password_hash, PBKDF2_ITER)
    : verifyPassword_(password, DUMMY_LOGIN_SALT, dummyLoginHash_(), PBKDF2_ITER);

  const activo = prof ? isTruthy(prof.activo) : false;

  if (!prof || !activo || !okCredenciales) {
    // Cualquier fallo (usuario inexistente, inactivo o password malo) suma al
    // contador y devuelve el MISMO mensaje generico (anti-enumeracion).
    loginRegisterFail_(usuario);
    return jsonError('Usuario o contrasena incorrectos', 401, 'credentials');
  }

  // Login correcto: limpiar el contador de fallos durable del usuario.
  loginClearFail_(usuario);

  const rol = String(prof.rol).trim().toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + TTL_LOGIN_SEG; // SEGUNDOS Unix
  const token = signToken_({
    v: 1,
    profesor_id: id,
    rol: rol,
    exp: exp,
    ver: Number(prof.token_version)
  });

  writeLog(id, 'LOGIN', 'rol=' + rol);

  return jsonResponse({
    token: token,
    profesor_id: id,
    rol: rol,
    nombre: prof.nombre,
    exp: exp,
    must_change_password: isTruthy(prof.must_change_password)
  });
}

/**
 * Cambia la contrasena del profesor autenticado (case 'cambiarPassword').
 * Requiere token: la identidad llega ya validada por requireAuth_.
 *
 * Politica de la nueva contrasena:
 *   - longitud >= 10,
 *   - no contiene el usuario (parte tras 'prof-'),
 *   - no termina en '2026' (invalida los <username>2026 expuestos en git).
 *
 * Efectos: regenera salt + password_hash con PBKDF2_ITER, pone
 * must_change_password=false e INCREMENTA token_version (revoca todos los
 * tokens viejos: requireAuth_ rechazara cualquier token con ver antiguo).
 *
 * @param {Object} body - { action:'cambiarPassword', nueva_password }.
 * @param {{profesor_id, rol}} identity - identidad validada por requireAuth_.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function handleCambiarPassword(body, identity) {
  const nueva = String(body.nueva_password || body.password || '');
  const profesorId = identity.profesor_id;
  // El usuario es la parte tras 'prof-' (ej. 'prof-samuel' -> 'samuel').
  const usuario = profesorId.indexOf('prof-') === 0
    ? profesorId.slice('prof-'.length).toLowerCase()
    : profesorId.toLowerCase();

  // Validacion de politica (mensajes claros, en espanol).
  if (nueva.length < 10) {
    return jsonError('La contrasena debe tener al menos 10 caracteres', 400, 'weak_password');
  }
  if (usuario && nueva.toLowerCase().indexOf(usuario) !== -1) {
    return jsonError('La contrasena no puede contener tu nombre de usuario', 400, 'weak_password');
  }
  if (/2026$/.test(nueva)) {
    return jsonError('La contrasena no puede terminar en 2026', 400, 'weak_password');
  }

  // Lock para evitar escrituras concurrentes sobre la fila del profesor.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.PROFESORES);
    if (!sheet) {
      return jsonError('No existe la hoja PROFESORES', 500);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const colId = headers.indexOf('id');
    const colHash = headers.indexOf('password_hash');
    const colSalt = headers.indexOf('salt');
    const colMustChange = headers.indexOf('must_change_password');
    const colTokenVer = headers.indexOf('token_version');
    if (colId === -1 || colHash === -1 || colSalt === -1 || colTokenVer === -1) {
      return jsonError('La hoja PROFESORES no tiene las columnas de auth requeridas', 500);
    }

    // Localizar la fila del profesor autenticado.
    let filaIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colId]).trim() === profesorId) {
        filaIdx = i;
        break;
      }
    }
    if (filaIdx === -1) {
      return jsonError('Profesor no encontrado', 404);
    }

    // Regenerar credenciales e incrementar token_version (revocacion).
    const salt = Utilities.getUuid();
    const hash = pbkdf2_(nueva, salt, PBKDF2_ITER);
    const nuevaVersion = Number(data[filaIdx][colTokenVer] || 0) + 1;

    data[filaIdx][colHash] = hash;
    data[filaIdx][colSalt] = salt;
    if (colMustChange !== -1) data[filaIdx][colMustChange] = false;
    data[filaIdx][colTokenVer] = nuevaVersion;

    // Escribir la fila completa de una vez (un solo setValues).
    sheet.getRange(filaIdx + 1, 1, 1, headers.length).setValues([data[filaIdx]]);

    // Invalidar el cache de re-check de auth para que el siguiente request lea
    // el token_version nuevo (si no, hasta 60s seguirian valiendo tokens viejos).
    cache_.remove('authprof_' + profesorId);

    writeLog(profesorId, 'CAMBIAR_PASSWORD', 'token_version=' + nuevaVersion);

    return jsonResponse({ message: 'Contrasena actualizada', must_change_password: false });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gate de autorizacion real: valida el token de sesion y re-chequea la fuente
 * de verdad (hoja PROFESORES). NO concede acceso por api_key bajo ningun
 * concepto (red-team CRITICO: nada de fallback api_key->ceo).
 *
 * Pasos:
 *   1) validateToken_ valida firma + tipos + exp. Si null -> 401 token_invalid.
 *   2) Re-check con cache corto (60s) contra la hoja: el profesor debe existir
 *      y estar activo, y su token_version VIGENTE debe coincidir con la del
 *      token (revocacion tras cambiar password). Si no -> 401.
 *   3) rol VIGENTE de la hoja (no el del token). Si se exigen `roles` y el rol
 *      no esta -> 403 forbidden.
 *
 * @param {string} token - token de sesion (query en GET, body en POST).
 * @param {string[]} [roles] - roles permitidos (ej. ['ceo']). Si se omite,
 *        cualquier profesor activo con token valido pasa.
 * @returns {{identity:{profesor_id,rol,must_change_password}}|{error:GoogleAppsScript.Content.TextOutput}}
 */
function requireAuth_(token, roles) {
  const id = validateToken_(token);
  if (!id) {
    return { error: jsonError('No autorizado', 401, 'token_invalid') };
  }

  // Re-check de la fuente de verdad con cache corto (60s). NO usa cachedGet
  // (su indice _keys no debe contaminarse con claves de auth) ni cacheGet
  // (cachearia un null y rebotaria 401 hasta 60s a un profesor recien creado o
  // reactivado, red-team #3). Se lee el cache manualmente y SOLO se cachea el
  // resultado si es un objeto valido (truthy); los null NO se cachean.
  const authKey = 'authprof_' + id.profesor_id;
  let prof;
  const cachedProf = cache_.get(authKey);
  if (cachedProf) {
    prof = JSON.parse(cachedProf);
  } else {
    prof = lookupProfesor_(id.profesor_id);
    if (prof) {
      cache_.put(authKey, JSON.stringify(prof), 60);
    }
  }

  if (!prof || !isTruthy(prof.activo)) {
    return { error: jsonError('No autorizado', 401, 'token_invalid') };
  }
  // Revocacion: el token_version del token debe coincidir con el de la hoja.
  if (Number(prof.token_version) !== Number(id.ver)) {
    return { error: jsonError('No autorizado', 401, 'token_invalid') };
  }

  // Rol VIGENTE de la hoja, no el del token (por si cambio entre emisiones).
  const rol = String(prof.rol).trim().toLowerCase();
  if (roles && roles.indexOf(rol) === -1) {
    return { error: jsonError('Permiso denegado', 403, 'forbidden') };
  }

  // Se propaga must_change_password VIGENTE de la hoja: el gate (resolveAuth_)
  // lo usa para forzar el cambio server-side antes de permitir otra accion
  // distinta de 'cambiarPassword' (red-team must_change_password).
  return {
    identity: {
      profesor_id: id.profesor_id,
      rol: rol,
      must_change_password: isTruthy(prof.must_change_password)
    }
  };
}

/**
 * Resuelve el gate de una request (GET o POST) segun la accion solicitada.
 *
 * Reglas:
 *   - 'ping' y 'login': EXENTAS (no requieren auth).
 *   - Token con must_change_password=true: SOLO se admite la accion
 *     'cambiarPassword'. Cualquier otra accion -> 403 must_change_password
 *     (forzado de cambio server-side, no solo en el frontend).
 *   - Cualquier otra accion: EXIGE token via requireAuth_. Sin token -> 401.
 *
 * NOTA: el api_key compartido fue retirado. La autenticacion por token de
 * sesion (HMAC) es la unica via de acceso. No existe camino legacy.
 *
 * @param {string} action - accion solicitada.
 * @param {string} token  - token de sesion (puede ser vacio).
 * @returns {{exempt?:boolean, identity?:Object, error?:Object}}
 *          - exempt: accion publica (ping/login).
 *          - identity: identidad real derivada del token.
 *          - error: TextOutput de error a devolver.
 */
function resolveAuth_(action, token) {
  // Acciones publicas.
  if (action === 'ping' || action === 'login') {
    return { exempt: true };
  }

  // Cualquier accion protegida exige token. Sin token -> 401 token_invalid.
  const auth = requireAuth_(token, null);
  if (auth.error) return auth;

  // Forzado de cambio de password SERVER-SIDE (red-team must_change_password):
  // si el profesor tiene must_change_password=true, su token solo sirve para
  // la accion 'cambiarPassword'. Cualquier otra accion se rechaza con 403
  // hasta que cambie la contrasena. ('login'/'ping' ya salieron exentos
  // arriba.) Asi una password temporal (expuesta en el git history) no permite
  // operar: solo cambiarla.
  if (auth.identity.must_change_password && action !== 'cambiarPassword') {
    return {
      error: jsonError('Debe cambiar la contrasena antes de continuar', 403, 'must_change_password')
    };
  }

  return auth;
}

// ============================================================
// GET — Lectura de datos
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action;

    // Gate: ping/login exentos; cualquier otra accion exige token de sesion.
    // El api_key compartido fue retirado; no existe camino legacy.
    const auth = resolveAuth_(action, e.parameter.token || '');
    if (auth.error) return auth.error;
    // identity es la identidad real derivada del token (undefined si exempt).
    const identity = auth.identity || null;

    switch (action) {
      case 'getConvocatorias':
        return handleGetConvocatorias(e);
      case 'getProfesores':
        return handleGetProfesores(e, identity);
      case 'getAlumnos':
        return handleGetAlumnos(e, identity);
      case 'getAsistencia':
        return handleGetAsistencia(e, identity);
      case 'getResumen':
        return handleGetResumen(e, identity);
      case 'ping':
        return jsonResponse({ message: 'NovAttend API activa' });
      default:
        return jsonError('Accion no reconocida: ' + action, 400);
    }
  } catch (err) {
    writeLog('API', 'ERROR_GET', (e.parameter.action || 'sin-action') + ' | ' + err.message);
    return jsonError(err.message, 500);
  }
}

/**
 * Devuelve convocatorias. Por defecto solo las activas por fecha.
 * Una convocatoria esta activa si: fecha_inicio <= hoy <= fecha_fin.
 * Parametro ?todas=true devuelve todas sin filtrar.
 */
function handleGetConvocatorias(e) {
  if (e.parameter.todas === 'true') {
    return jsonResponse(sheetToObjects(SHEET_NAMES.CONVOCATORIAS));
  }

  const data = cachedGet('conv', function() {
    const todas = sheetToObjects(SHEET_NAMES.CONVOCATORIAS);
    const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return todas.filter(c => isTruthy(c.activa) && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);
  });

  return jsonResponse(data);
}

/**
 * Proyecta una fila de PROFESORES a los campos PUBLICOS seguros.
 *
 * NUNCA debe salir al cliente: password_hash, salt, must_change_password,
 * token_version. Esta proyeccion se aplica DENTRO de la fetchFn (antes de
 * cachear), de modo que el contenido cacheado tampoco contiene secretos
 * (red-team cripto #10 / deploy #1).
 *
 * @param {Object} p - fila cruda de PROFESORES (objeto por cabecera).
 * @returns {{id,nombre,email,activo,rol}}
 */
function projectProfesorPublico_(p) {
  return {
    id: p.id,
    nombre: p.nombre,
    email: p.email,
    activo: p.activo,
    rol: p.rol
  };
}

/**
 * Devuelve profesores (proyeccion publica: SIN password_hash/salt/etc).
 *
 * @param {Object} e - evento GET.
 * @param {{profesor_id,rol}|null} identity - identidad del token (puede ser
 *        null si llego por el camino legacy api_key — pero esta accion NO esta
 *        en LEGACY_READONLY_ACTIONS, asi que en la practica siempre hay token).
 */
function handleGetProfesores(e, identity) {
  // ?todos=true (incluye inactivos) restringido a ceo. El saneo se aplica
  // tambien aqui, en la fuente, antes de devolver.
  if (e.parameter.todos === 'true') {
    if (!identity || identity.rol !== 'ceo') {
      return jsonError('Permiso denegado', 403, 'forbidden');
    }
    const todos = sheetToObjects(SHEET_NAMES.PROFESORES).map(projectProfesorPublico_);
    return jsonResponse(todos);
  }

  // Namespace de cache 'prof_v2' para invalidar las entradas viejas (que
  // cacheaban filas con secretos bajo la clave 'prof').
  const data = cachedGet('prof_v2', function() {
    return sheetToObjects(SHEET_NAMES.PROFESORES)
      .filter(p => isTruthy(p.activo))
      .map(projectProfesorPublico_);
  });

  return jsonResponse(data);
}

/**
 * Comprueba si un alumno pertenece a un profesor concreto.
 *
 * Mira la fila del alumno en ALUMNOS y compara su profesor_id con el dado. NO
 * usa pertenencia por grupo (un grupo puede estar vacio o compartido): la
 * unica fuente de verdad de la propiedad es la columna profesor_id del alumno
 * (red-team bruteforce #8).
 *
 * @param {string} alumnoId   - id del alumno (ej. 'alu-001').
 * @param {string} profesorId - id del profesor (ej. 'prof-samuel').
 * @returns {boolean} true si el alumno existe y su profesor_id coincide.
 */
function ownsAlumno_(alumnoId, profesorId) {
  if (!alumnoId || !profesorId) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNOS);
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;

  const headers = data[0].map(h => String(h).trim());
  const colId = headers.indexOf('id');
  const colProf = headers.indexOf('profesor_id');
  if (colId === -1 || colProf === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colId]).trim() === alumnoId) {
      return String(data[i][colProf]).trim() === profesorId;
    }
  }
  return false;
}

/**
 * Devuelve alumnos filtrados por convocatoria y/o profesor.
 *
 * Autorizacion (red-team CRITICO bruteforce #3): un teacher SOLO puede ver sus
 * propios alumnos. La identidad efectiva (profesorId) se DERIVA del token, no
 * de e.parameter. Si un teacher pasara un profesor_id distinto (o lo dejara
 * vacio) -> 403. La cacheKey se construye con la identidad efectiva, NUNCA con
 * e.parameter: asi un teacher jamas lee la entrada global 'alu_<conv>__'.
 *
 * @param {Object} e - evento GET.
 * @param {{profesor_id,rol}|null} identity - identidad del token.
 */
function handleGetAlumnos(e, identity) {
  const convocatoriaId = e.parameter.convocatoria_id || '';
  const grupo = e.parameter.grupo || '';
  const esCeo = identity && identity.rol === 'ceo';

  // Profesor EFECTIVO: para ceo se respeta el filtro recibido (puede ser ''
  // para ver todos); para teacher se FUERZA su propio id y se rechaza cualquier
  // intento de leer datos ajenos.
  let profesorId;
  if (esCeo) {
    profesorId = e.parameter.profesor_id || '';
  } else {
    const pedido = e.parameter.profesor_id || '';
    if (pedido && pedido !== identity.profesor_id) {
      return jsonError('Permiso denegado', 403, 'forbidden');
    }
    profesorId = identity.profesor_id;
  }

  // Sin cache si piden todos (incluidos inactivos). Restringido a ceo: un
  // teacher recibe la rama cacheada y filtrada por su propio profesor_id.
  if (e.parameter.todos === 'true' && esCeo) {
    let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS);
    if (convocatoriaId) alumnos = alumnos.filter(a => a.convocatoria_id === convocatoriaId);
    if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
    if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);
    return jsonResponse(alumnos);
  }

  // cacheKey DERIVADA de la identidad efectiva (profesorId), no de e.parameter.
  const cacheKey = 'alu_' + convocatoriaId + '_' + profesorId + '_' + grupo;
  const data = cachedGet(cacheKey, function() {
    let alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS).filter(a => isTruthy(a.activo));
    if (convocatoriaId) alumnos = alumnos.filter(a => a.convocatoria_id === convocatoriaId);
    if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
    if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);
    return alumnos;
  });

  return jsonResponse(data);
}

/**
 * Devuelve registros de asistencia filtrados.
 *
 * Cacheado por combinacion de filtros. La consulta tipica (un alumno concreto,
 * desde el popup de detalle) devuelve pocos registros y cabe de sobra en el
 * limite de 100KB de CacheService, evitando releer las ~900 filas de la hoja
 * en cada apertura del popup.
 */
function handleGetAsistencia(e, identity) {
  const convocatoriaId = e.parameter.convocatoria_id || '';
  const grupo = e.parameter.grupo || '';
  const fecha = e.parameter.fecha || ''; // formato: yyyy-MM-dd
  const alumnoId = e.parameter.alumno_id || '';
  const esCeo = identity && identity.rol === 'ceo';

  // Profesor EFECTIVO derivado del token (mismo criterio que getAlumnos): el
  // teacher solo ve lo suyo; un profesor_id ajeno o vacio -> 403. Si el teacher
  // consulta por alumno_id concreto (popup de detalle), debe ser dueno del
  // alumno (red-team bruteforce #3).
  let profesorId;
  if (esCeo) {
    profesorId = e.parameter.profesor_id || '';
  } else {
    const pedido = e.parameter.profesor_id || '';
    if (pedido && pedido !== identity.profesor_id) {
      return jsonError('Permiso denegado', 403, 'forbidden');
    }
    if (alumnoId && !ownsAlumno_(alumnoId, identity.profesor_id)) {
      return jsonError('Permiso denegado', 403, 'forbidden');
    }
    profesorId = identity.profesor_id;
  }

  // cacheKey DERIVADA de la identidad efectiva (profesorId), no de e.parameter:
  // evita que un teacher lea la entrada global 'asist_<conv>___<alu>'.
  const cacheKey = 'asist_' + convocatoriaId + '_' + profesorId + '_' +
    grupo + '_' + fecha + '_' + alumnoId;

  const data = cachedGet(cacheKey, function() {
    let registros = sheetToObjects(SHEET_NAMES.ASISTENCIA);

    if (convocatoriaId) {
      registros = registros.filter(r => r.convocatoria_id === convocatoriaId);
    }
    if (profesorId) {
      registros = registros.filter(r => r.profesor_id === profesorId);
    }
    if (grupo) {
      registros = registros.filter(r => r.grupo === grupo);
    }
    if (fecha) {
      registros = registros.filter(r => r.fecha === fecha);
    }
    if (alumnoId) {
      registros = registros.filter(r => r.alumno_id === alumnoId);
    }

    // Lectura defensiva de columnas nuevas: filas antiguas (7 columnas) no
    // tienen 'justificada'/'motivo'; sheetToObjects las deja como undefined.
    // Coaccionar a tipos estables para el frontend: justificada=boolean, motivo=string.
    return registros.map(r => {
      r.justificada = r.justificada === true;
      r.motivo = r.motivo || '';
      return r;
    });
  });

  return jsonResponse(data);
}

/**
 * Calcula y devuelve resumen de asistencia.
 * Devuelve metricas absolutas (faltas) orientadas a deteccion de patrones,
 * mas campos viejos (semanal/quincenal/mensual en %) por compatibilidad.
 */
function handleGetResumen(e, identity) {
  const convocatoriaId = e.parameter.convocatoria_id;
  const grupo = e.parameter.grupo || '';
  const esCeo = identity && identity.rol === 'ceo';

  if (!convocatoriaId) {
    return jsonError('convocatoria_id es obligatorio para getResumen', 400);
  }

  // Profesor EFECTIVO del token. El resumen GLOBAL (profesor_id vacio) queda
  // reservado al ceo: un teacher SIEMPRE ve solo su propio resumen, y si pidiera
  // un profesor_id ajeno o vacio -> 403. cacheKey derivada de la identidad
  // efectiva, jamas de e.parameter (evita leer la entrada global 'res_<conv>__').
  let profesorId;
  if (esCeo) {
    profesorId = e.parameter.profesor_id || '';
  } else {
    const pedido = e.parameter.profesor_id || '';
    if (pedido !== identity.profesor_id) {
      // Incluye el caso vacio (teacher no puede pedir el resumen global).
      return jsonError('Permiso denegado', 403, 'forbidden');
    }
    profesorId = identity.profesor_id;
  }

  const cacheKey = 'res_' + convocatoriaId + '_' + profesorId + '_' + grupo;
  const data = cachedGet(cacheKey, function() {
    return computeResumen(convocatoriaId, profesorId, grupo);
  });

  return jsonResponse(data);
}

/**
 * Devuelve la fecha del lunes (00:00) de la semana ISO a la que pertenece d.
 * Lunes-jueves son los dias de clase; semana = lunes a domingo natural.
 */
function mondayOf_(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay(); // 0=dom, 1=lun, ..., 6=sab
  const diff = (day === 0 ? -6 : 1 - day);
  dt.setDate(dt.getDate() + diff);
  return dt;
}

/**
 * Calcula resumen de asistencia (extraido para cacheabilidad).
 */
function computeResumen(convocatoriaId, profesorId, grupo, preAlumnos, preRegistros) {
  // preAlumnos/preRegistros: filas ya leidas de ALUMNOS/ASISTENCIA. Permiten a
  // warmCache leer cada hoja UNA vez y reutilizarla para todas las convocatorias,
  // en lugar de releer las hojas completas por cada convocatoria. Si no se pasan,
  // se leen aqui (comportamiento original para los callers en vivo).
  let alumnos = (preAlumnos || sheetToObjects(SHEET_NAMES.ALUMNOS))
    .filter(a => isTruthy(a.activo) && a.convocatoria_id === convocatoriaId);

  if (profesorId) alumnos = alumnos.filter(a => a.profesor_id === profesorId);
  if (grupo) alumnos = alumnos.filter(a => a.grupo === grupo);

  let registros = (preRegistros || sheetToObjects(SHEET_NAMES.ASISTENCIA))
    .filter(r => r.convocatoria_id === convocatoriaId);

  if (profesorId) registros = registros.filter(r => r.profesor_id === profesorId);
  if (grupo) registros = registros.filter(r => r.grupo === grupo);

  const tz = Session.getScriptTimeZone();
  const hoy = new Date();
  const fmt = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const hoyStr = fmt(hoy);

  // Ventanas viejas (compatibilidad con frontend actual)
  const hace7 = new Date(hoy);  hace7.setDate(hoy.getDate() - 7);
  const hace15 = new Date(hoy); hace15.setDate(hoy.getDate() - 15);
  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);
  const hace7Str = fmt(hace7), hace15Str = fmt(hace15), hace30Str = fmt(hace30);

  // Ventana semana en curso (lunes a domingo de hoy)
  const lunesActual = mondayOf_(hoy);
  const domingoActual = new Date(lunesActual);
  domingoActual.setDate(lunesActual.getDate() + 6);
  const lunesActualStr = fmt(lunesActual);
  const domingoActualStr = fmt(domingoActual);

  // Mes natural en curso
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesStr = fmt(inicioMes);

  const porAlumno = {};
  registros.forEach(r => {
    if (!porAlumno[r.alumno_id]) {
      porAlumno[r.alumno_id] = {
        total: 0, presentes: 0,
        sem_total: 0, sem_presentes: 0,
        quin_total: 0, quin_presentes: 0,
        mens_total: 0, mens_presentes: 0,
        sem_actual_total: 0, sem_actual_faltas: 0,
        mes_total: 0, mes_faltas: 0,
        justificadas: 0,
        registros: []
      };
    }
    const stats = porAlumno[r.alumno_id];
    const fecha = r.fecha;
    const presente = r.presente === true;
    // Lectura defensiva: solo === true cuenta como justificada.
    const justificada = r.justificada === true;

    // Toda fila (justificada o no) se guarda en registros para que siga
    // VISIBLE en el historial (ultimas_8, racha, historico_semanas). El flag
    // justificada permite al frontend pintarla distinta (gold).
    stats.registros.push({ fecha: fecha, presente: presente, justificada: justificada });

    // Falta justificada: se EXCLUYE de todos los porcentajes. No suma a total
    // ni a presentes en ninguna ventana (semanal, quincenal, mensual, semana
    // actual, mes actual, total), para que el % no se vea penalizado.
    // Solo se contabiliza aparte en stats.justificadas. No tocamos los _total
    // de las ventanas mas abajo: salimos tras registrar la justificada.
    if (justificada) {
      stats.justificadas++;
      return;
    }

    stats.total++;
    if (presente) stats.presentes++;

    if (fecha >= hace7Str && fecha <= hoyStr) {
      stats.sem_total++;
      if (presente) stats.sem_presentes++;
    }
    if (fecha >= hace15Str && fecha <= hoyStr) {
      stats.quin_total++;
      if (presente) stats.quin_presentes++;
    }
    if (fecha >= hace30Str && fecha <= hoyStr) {
      stats.mens_total++;
      if (presente) stats.mens_presentes++;
    }
    if (fecha >= lunesActualStr && fecha <= domingoActualStr) {
      stats.sem_actual_total++;
      if (!presente) stats.sem_actual_faltas++;
    }
    if (fecha >= inicioMesStr && fecha <= hoyStr) {
      stats.mes_total++;
      if (!presente) stats.mes_faltas++;
    }
  });

  const pct = (presentes, total) => total > 0 ? Math.round((presentes / total) * 100) : 0;

  return alumnos.map(a => {
    const s = porAlumno[a.id] || {
      total: 0, presentes: 0,
      sem_total: 0, sem_presentes: 0,
      quin_total: 0, quin_presentes: 0,
      mens_total: 0, mens_presentes: 0,
      sem_actual_total: 0, sem_actual_faltas: 0,
      mes_total: 0, mes_faltas: 0,
      justificadas: 0,
      registros: []
    };

    // Ordenar registros del alumno por fecha ascendente (mas antiguo primero)
    const regsOrdenados = s.registros.slice().sort(function(x, y) {
      return x.fecha < y.fecha ? -1 : (x.fecha > y.fecha ? 1 : 0);
    });

    // Ultimas 8 clases (mas reciente al final, como histograma). Incluye las
    // justificadas con su flag para que el frontend las pinte distinto (gold).
    const ultimas_8 = regsOrdenados.slice(-8);

    // Racha de faltas: cuantas clases consecutivas mas recientes son falta NO
    // justificada. Una justificada es NEUTRAL: no incrementa la racha (no es
    // una falta real) pero tampoco la rompe (se salta con continue). Asi una
    // justificada no infla la racha ni oculta faltas reales consecutivas.
    let racha = 0;
    for (let i = regsOrdenados.length - 1; i >= 0; i--) {
      if (regsOrdenados[i].justificada === true) continue; // neutral: ni suma ni resetea
      if (regsOrdenados[i].presente === false) racha++;
      else break;
    }

    // Historico semanal: agrupar por semana lun-dom, ultimas 8 semanas.
    // Coherencia con el %: una justificada NO cuenta en 'clases' ni en 'faltas'
    // (igual que se excluye del porcentaje). Se contabiliza aparte en
    // 'justificadas' para que la semana siga siendo visible y el frontend pueda
    // mostrar el marcador gold sin penalizar la ratio faltas/clases.
    const porSemana = {};
    regsOrdenados.forEach(function(r) {
      // Guarda: si la fecha esta malformada (editada a mano por Aurora como
      // dd/mm/yyyy, numero o vacia), dt queda Invalid Date y fmt/Utilities.formatDate
      // lanzaria una excepcion que subia hasta doGet como HTTP 500 para toda la
      // convocatoria. Ahora se salta del agrupado semanal sin tocar registros/
      // ultimas_8/pct ni el resto del resumen.
      if (typeof r.fecha !== 'string') return;
      const partes = r.fecha.split('-');
      if (partes.length !== 3) return;
      const yr = Number(partes[0]);
      const mo = Number(partes[1]);
      const dy = Number(partes[2]);
      if (isNaN(yr) || isNaN(mo) || isNaN(dy) || yr === 0 || mo === 0 || dy === 0) return;
      const dt = new Date(yr, mo - 1, dy);
      if (isNaN(dt.getTime())) return;
      const lun = mondayOf_(dt);
      const lunStr = fmt(lun);
      if (!porSemana[lunStr]) {
        porSemana[lunStr] = { semana_inicio: lunStr, clases: 0, faltas: 0, justificadas: 0 };
      }
      if (r.justificada === true) {
        porSemana[lunStr].justificadas++;
        return; // no suma a clases ni faltas: coherente con el %
      }
      porSemana[lunStr].clases++;
      if (!r.presente) porSemana[lunStr].faltas++;
    });
    const semanasArr = Object.keys(porSemana)
      .sort()
      .map(function(k) { return porSemana[k]; });
    const historico_semanas = semanasArr.slice(-8);

    return {
      alumno_id: a.id,
      nombre: a.nombre,
      profesor_id: a.profesor_id,
      grupo: a.grupo,
      // Campos viejos (compatibilidad)
      semanal: pct(s.sem_presentes, s.sem_total),
      quincenal: pct(s.quin_presentes, s.quin_total),
      mensual: pct(s.mens_presentes, s.mens_total),
      clases_total: s.total,
      clases_presentes: s.presentes,
      // Campos nuevos (faltas absolutas + tendencia)
      faltas_semana_actual: s.sem_actual_faltas,
      clases_semana_actual: s.sem_actual_total,
      faltas_mes: s.mes_faltas,
      clases_mes: s.mes_total,
      faltas_total: s.total - s.presentes,
      faltas_justificadas: s.justificadas,
      racha_faltas: racha,
      ultimas_8: ultimas_8,
      historico_semanas: historico_semanas
    };
  });
}

// ============================================================
// POST — Escritura de datos
// ============================================================

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);

    const action = body.action;

    // Gate: 'login' es EXENTO (es quien emite el token). Cualquier otra
    // accion exige token de sesion. El api_key compartido fue retirado.
    const auth = resolveAuth_(action, body.token || '');
    if (auth.error) return auth.error;
    const identity = auth.identity || null;

    switch (action) {
      case 'login':
        return handleLogin(body);
      case 'cambiarPassword':
        return handleCambiarPassword(body, identity);
      case 'guardarAsistencia':
        return handleGuardarAsistencia(body, identity);
      case 'crearAlumno':
        return handleCrearAlumno(body, identity);
      case 'actualizarAlumno':
        return handleActualizarAlumno(body, identity);
      case 'justificarFalta':
        return handleJustificarFalta(body, identity);
      default:
        return jsonError('Accion POST no reconocida: ' + action, 400);
    }
  } catch (err) {
    writeLog('API', 'ERROR_POST', (body && body.action || 'sin-action') + ' | ' + err.message);
    return jsonError(err.message, 500);
  }
}

/**
 * Guarda la asistencia de un grupo completo para una fecha.
 *
 * Body esperado:
 * {
 *   action: "guardarAsistencia",
 *   fecha: "2026-04-15",
 *   convocatoria_id: "conv-2026-04",
 *   profesor_id: "prof-samuel",
 *   grupo: "G1",
 *   alumnos: [
 *     { alumno_id: "alu-001", presente: true },
 *     { alumno_id: "alu-002", presente: false }
 *   ]
 * }
 */
function handleGuardarAsistencia(body, identity) {
  const { fecha, convocatoria_id, grupo, alumnos } = body;

  // IGNORAR body.profesor_id: la identidad escribe SIEMPRE bajo su propio id
  // (el ceo no usa este endpoint en el flujo, pero si lo hiciera escribe bajo su
  // id; el frontend de teacher es quien marca asistencia). Asi un teacher no
  // puede falsificar el profesor_id de los registros que guarda.
  const profesor_id = identity.profesor_id;

  if (!fecha || !convocatoria_id || !grupo) {
    return jsonError('Faltan campos obligatorios: fecha, convocatoria_id, grupo, alumnos', 400);
  }
  // alumnos debe ser una lista no vacia: el guard !alumnos no cubre {} ni tipos
  // raros, y un array vacio pasaria el ownership trivialmente sin guardar nada.
  if (!Array.isArray(alumnos) || alumnos.length === 0) {
    return jsonError('alumnos debe ser una lista no vacia', 400);
  }

  // Ownership (red-team bruteforce #8): TODOS los alumno_id del payload deben
  // pertenecer al profesor autenticado. Se construye el mapa alumno_id ->
  // profesor_id UNA sola vez (no ownsAlumno_ por alumno, que releeria la hoja
  // N veces). El ceo queda exento de esta comprobacion.
  if (identity.rol !== 'ceo') {
    const ss0 = SpreadsheetApp.getActiveSpreadsheet();
    const alumnosSheet = ss0.getSheetByName(SHEET_NAMES.ALUMNOS);
    if (!alumnosSheet) return jsonError('No se encontro la hoja ALUMNOS', 500);
    const aData = alumnosSheet.getDataRange().getValues();
    const aHeaders = aData[0].map(h => String(h).trim());
    const aColId = aHeaders.indexOf('id');
    const aColProf = aHeaders.indexOf('profesor_id');
    if (aColId === -1 || aColProf === -1) {
      return jsonError('La hoja ALUMNOS no tiene las columnas id/profesor_id', 500);
    }
    const ownerById = {};
    for (let i = 1; i < aData.length; i++) {
      const aid = String(aData[i][aColId]).trim();
      if (aid) ownerById[aid] = String(aData[i][aColProf]).trim();
    }
    for (let k = 0; k < alumnos.length; k++) {
      if (ownerById[alumnos[k].alumno_id] !== profesor_id) {
        return jsonError('Permiso denegado', 403, 'forbidden');
      }
    }
  }

  // Lock para evitar escrituras concurrentes (cola india)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ASISTENCIA);

  if (!sheet) {
    return jsonError('No se encontro la hoja ASISTENCIA', 500);
  }

  // Eliminar registros previos de la misma fecha/grupo/profesor/convocatoria
  // Estrategia: filtrar filas que NO coinciden + agregar nuevas → reescribir todo
  // Una sola operacion de escritura en vez de N deleteRow() individuales
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fechaCol = headers.indexOf('fecha');
  const convCol = headers.indexOf('convocatoria_id');
  const profCol = headers.indexOf('profesor_id');
  const grupoCol = headers.indexOf('grupo');
  const alumnoCol = headers.indexOf('alumno_id');
  // Columnas nuevas; -1 si la hoja real aun no tiene las cabeceras (degradacion con gracia)
  const justCol = headers.indexOf('justificada');
  const motivoCol = headers.indexOf('motivo');
  const tz = Session.getScriptTimeZone();

  // Filtrar: conservar filas que NO son del mismo grupo/fecha.
  // En paralelo, construir mapa de preservacion de justificaciones de las filas
  // que SI vamos a borrar (mismo fecha/grupo/profesor/convocatoria), para no
  // perder justificaciones previas al borrar+reescribir el dia.
  const filasConservadas = [];
  const preservadas = {}; // alumno_id -> { justificada: bool, motivo: string }
  for (let i = 1; i < data.length; i++) {
    // Saltar filas vacias
    if (!data[i][0] && data[i][0] !== 0) continue;

    const rowFecha = data[i][fechaCol];
    const rowFechaStr = rowFecha instanceof Date
      ? Utilities.formatDate(rowFecha, tz, 'yyyy-MM-dd')
      : rowFecha;

    const esMismoGrupo = rowFechaStr === fecha &&
        data[i][convCol] === convocatoria_id &&
        data[i][profCol] === profesor_id &&
        data[i][grupoCol] === grupo;

    if (!esMismoGrupo) {
      filasConservadas.push(data[i]);
    } else if (justCol !== -1) {
      // Fila que se va a borrar: guardar su justificacion si la tiene
      const rowJust = data[i][justCol] === true;
      if (rowJust) {
        preservadas[data[i][alumnoCol]] = {
          justificada: true,
          motivo: motivoCol !== -1 ? (data[i][motivoCol] || '') : ''
        };
      }
    }
  }

  // Agregar nuevos registros. Cada fila se extiende a headers.length valores.
  // Justificada/motivo solo se preservan para alumnos que SIGUEN ausentes
  // (no tiene sentido justificar una presencia).
  const ahora = new Date();
  const numCols = headers.length;
  const filasNuevas = alumnos.map(a => {
    const presente = a.presente === true;
    const prev = (!presente && preservadas[a.alumno_id]) || null;
    const fila = [
      fecha,
      a.alumno_id,
      convocatoria_id,
      profesor_id,
      grupo,
      presente,
      ahora
    ];
    // Rellenar columnas restantes (justificada, motivo y cualquier futura) por indice
    while (fila.length < numCols) fila.push('');
    if (justCol !== -1) fila[justCol] = prev ? true : false;
    if (motivoCol !== -1) fila[motivoCol] = prev ? prev.motivo : '';
    return fila;
  });

  const todasLasFilas = filasConservadas.concat(filasNuevas);

  // Reescribir hoja completa (una sola operacion). Usar headers.length en vez
  // de un numero magico para robustez ante el numero real de columnas.
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
  }
  if (todasLasFilas.length > 0) {
    sheet.getRange(2, 1, todasLasFilas.length, numCols).setValues(todasLasFilas);
  }

  // Invalidar cache de resumen y de asistencia para esta convocatoria
  cacheInvalidate(['res_' + convocatoria_id, 'asist_' + convocatoria_id]);

  // Actualizar estadisticas de la hoja de grupo afectada
  try {
    actualizarEstadisticasGrupo(convocatoria_id, profesor_id, grupo);
  } catch (err) {
    Logger.log('Error actualizando estadisticas: ' + err.message);
  }

  // Log
  const presentes = alumnos.filter(a => a.presente).length;
  writeLog(
    profesor_id,
    'GUARDAR_ASISTENCIA',
    grupo + ' | ' + fecha + ' | ' + presentes + '/' + alumnos.length + ' presentes'
  );

  return jsonResponse({
    message: 'Asistencia guardada correctamente',
    registros: filasNuevas.length,
    presentes: presentes
  });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Justifica (o desjustifica) una falta concreta de un alumno.
 *
 * Una falta justificada se excluye del calculo de asistencia (ver computeResumen).
 * Solo se pueden justificar ausencias (presente === false), nunca presencias.
 *
 * Body esperado:
 * {
 *   action: "justificarFalta",
 *   convocatoria_id: "conv-2026-04",
 *   profesor_id: "prof-samuel",
 *   grupo: "G1",
 *   alumno_id: "alu-001",
 *   fecha: "2026-04-15",
 *   justificada: true,
 *   motivo: "Enfermedad"
 * }
 *
 * La fila se identifica por fecha + alumno_id + convocatoria_id (clave unica
 * en la practica: un alumno pertenece a un solo grupo/profesor por convocatoria).
 */
function handleJustificarFalta(body, identity) {
  const { convocatoria_id, grupo, alumno_id, fecha, justificada, motivo } = body;

  // El usuario que registra la accion es SIEMPRE la identidad del token, no
  // body.profesor_id (que se ignora).
  const profesor_id = identity.profesor_id;

  // Validar obligatorios. justificada debe ser booleano explicito.
  if (!convocatoria_id || !alumno_id || !fecha || typeof justificada !== 'boolean') {
    return jsonError('Faltan campos obligatorios: convocatoria_id, alumno_id, fecha, justificada (booleano)', 400);
  }

  // Ownership: un teacher solo puede justificar faltas de SUS alumnos
  // (ownsAlumno_ compara por la columna profesor_id del alumno). El ceo es libre.
  if (identity.rol !== 'ceo' && !ownsAlumno_(alumno_id, profesor_id)) {
    return jsonError('Permiso denegado', 403, 'forbidden');
  }

  // Lock para evitar escrituras concurrentes (mismo patron que guardar)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ASISTENCIA);

  if (!sheet) {
    return jsonError('No se encontro la hoja ASISTENCIA', 500);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const fechaCol = headers.indexOf('fecha');
  const alumnoCol = headers.indexOf('alumno_id');
  const convCol = headers.indexOf('convocatoria_id');
  const presenteCol = headers.indexOf('presente');
  const justCol = headers.indexOf('justificada');
  const motivoCol = headers.indexOf('motivo');
  const tz = Session.getScriptTimeZone();

  // Las columnas nuevas deben existir en la hoja real (paso manual del usuario).
  // Si faltan, no se puede escribir: devolver error claro en vez de corromper datos.
  if (justCol === -1 || motivoCol === -1) {
    return jsonError('La hoja ASISTENCIA no tiene las columnas justificada/motivo. Anadelas en la fila 1.', 500);
  }

  // Localizar la fila unica por fecha + alumno_id + convocatoria_id
  let filaIndex = -1;
  let coincidencias = 0;
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] && data[i][0] !== 0) continue;

    const rowFecha = data[i][fechaCol];
    const rowFechaStr = rowFecha instanceof Date
      ? Utilities.formatDate(rowFecha, tz, 'yyyy-MM-dd')
      : rowFecha;

    if (rowFechaStr === fecha &&
        data[i][alumnoCol] === alumno_id &&
        data[i][convCol] === convocatoria_id) {
      coincidencias++;
      if (filaIndex === -1) filaIndex = i;
    }
  }

  if (filaIndex === -1) {
    return jsonError('Falta no encontrada', 404);
  }

  // Datos sucios: loguear si hay duplicados; se actualiza la primera coincidencia.
  if (coincidencias > 1) {
    writeLog(profesor_id || 'API', 'JUSTIFICAR_FALTA_DUP',
      'Duplicados (' + coincidencias + ') para ' + fecha + ' | ' + alumno_id + ' | ' + convocatoria_id);
  }

  // No se puede justificar una presencia
  if (data[filaIndex][presenteCol] === true) {
    return jsonError('No se puede justificar una presencia', 400);
  }

  // Escribir justificada/motivo. Al desjustificar se limpia el motivo.
  const nuevoMotivo = justificada ? (motivo || '') : '';
  sheet.getRange(filaIndex + 1, justCol + 1).setValue(justificada);
  sheet.getRange(filaIndex + 1, motivoCol + 1).setValue(nuevoMotivo);

  // Invalidar cache de resumen y asistencia (cambia el calculo de porcentajes)
  cacheInvalidate(['res_' + convocatoria_id, 'asist_' + convocatoria_id]);

  writeLog(
    profesor_id || 'API',
    'JUSTIFICAR_FALTA',
    (grupo || '') + ' | ' + fecha + ' | ' + alumno_id + ' | ' + (justificada ? nuevoMotivo : 'quitada')
  );

  return jsonResponse({ message: 'Falta actualizada', justificada: justificada, motivo: nuevoMotivo });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Crea un alumno nuevo.
 *
 * Body esperado:
 * {
 *   action: "crearAlumno",
 *   nombre: "Rosa Cruz Ruiz",
 *   convocatoria_id: "conv-2026-04",
 *   profesor_id: "prof-samuel",
 *   grupo: "G1",
 *   email: "",
 *   telefono: ""
 * }
 */
function handleCrearAlumno(body, identity) {
  const { nombre, convocatoria_id, grupo } = body;

  // Un teacher SOLO crea alumnos bajo su propio profesor_id (se ignora
  // body.profesor_id). El ceo puede crear bajo cualquier profesor (toma el
  // body.profesor_id, o el suyo si no lo especifica).
  let profesor_id;
  if (identity.rol === 'ceo') {
    profesor_id = body.profesor_id || identity.profesor_id;
  } else {
    profesor_id = identity.profesor_id;
  }

  if (!nombre || !convocatoria_id || !profesor_id || !grupo) {
    return jsonError('Faltan campos obligatorios: nombre, convocatoria_id, profesor_id, grupo', 400);
  }

  // Lock para evitar IDs duplicados en escrituras concurrentes
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNOS);

  const id = generateId('alu');

  sheet.appendRow([
    id,
    nombre,
    convocatoria_id,
    profesor_id,
    grupo,
    body.email || '',
    body.telefono || '',
    true // activo
  ]);

  // Crear un alumno cambia el roster Y el resumen del CEO: computeResumen itera
  // el array de alumnos (el alumno nuevo aparece como fila de ceros), asi que
  // 'res_<conv>__' —calentada 6h por warmCache— quedaria stale hasta 6h si solo
  // invalidamos 'alu_'. Invalidar tambien 'res_'/'asist_' de la convocatoria.
  cacheInvalidate(['alu_' + convocatoria_id, 'res_' + convocatoria_id, 'asist_' + convocatoria_id]);

  writeLog(identity.profesor_id, 'CREAR_ALUMNO', nombre + ' | ' + grupo + ' | ' + convocatoria_id);

  return jsonResponse({ id: id, message: 'Alumno creado correctamente' });

  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza datos de un alumno existente (mover grupo, cambiar profesor, dar de baja).
 *
 * Body esperado:
 * {
 *   action: "actualizarAlumno",
 *   alumno_id: "alu-001",
 *   campos: {
 *     grupo: "G3",
 *     profesor_id: "prof-maria",
 *     activo: false
 *   }
 * }
 */
function handleActualizarAlumno(body, identity) {
  const { alumno_id, campos } = body;

  // Operacion administrativa (mover grupo, cambiar profesor, dar de baja):
  // SOLO el ceo. Un teacher recibe 403 (no puede reasignar ni desactivar
  // alumnos, ni siquiera los suyos).
  if (identity.rol !== 'ceo') {
    return jsonError('Permiso denegado', 403, 'forbidden');
  }

  if (!alumno_id || !campos) {
    return jsonError('Faltan campos obligatorios: alumno_id, campos', 400);
  }

  // Lock para evitar lecturas inconsistentes durante actualizacion
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonError('Servidor ocupado, reintenta en unos segundos', 503);
  }

  try {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  // Buscar fila del alumno
  let filaIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === alumno_id) {
      filaIndex = i;
      break;
    }
  }

  if (filaIndex === -1) {
    return jsonError('Alumno no encontrado: ' + alumno_id, 404);
  }

  // Actualizar campos especificados
  const camposActualizados = [];
  Object.keys(campos).forEach(campo => {
    const colIndex = headers.indexOf(campo);
    if (colIndex !== -1) {
      sheet.getRange(filaIndex + 1, colIndex + 1).setValue(campos[campo]);
      camposActualizados.push(campo + '=' + campos[campo]);
    }
  });

  // Invalidar cache de alumnos, asistencia y resumen.
  // Un cambio de grupo/profesor afecta a las tres (el filtrado depende de ellos).
  cacheInvalidate(['alu_', 'asist_', 'res_']);

  writeLog(
    identity.profesor_id,
    'ACTUALIZAR_ALUMNO',
    alumno_id + ' | ' + camposActualizados.join(', ')
  );

  return jsonResponse({ message: 'Alumno actualizado', campos: camposActualizados });

  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// WARM CACHE — Calentar cache de resumenes (disparador matutino)
// ============================================================

/**
 * Pre-calcula y cachea el resumen de cada convocatoria activa.
 *
 * Pensado para ejecutarse con un disparador time-driven temprano (ej. 7:00),
 * de modo que el primer profesor del dia no pague el calculo en frio
 * (medido en ~6,5s vs ~1,6s en caliente).
 *
 * Configuracion del disparador (manual, una vez):
 *   Editor Apps Script > Disparadores > Anadir disparador
 *   - Funcion: warmCache
 *   - Evento: Basado en tiempo > Temporizador diario > 6-7 a.m.
 */
function warmCache() {
  // Serializa contra los escritores: guardarAsistencia/crearAlumno/
  // actualizarAlumno toman este MISMO lock global alrededor de su
  // cacheInvalidate. Sin el, una escritura podria colarse entre que warmCache
  // calienta una entrada y publica el indice _warm_keys, dejando un huerfano
  // stale 6h (la entrada vive pero ningun indice la lista para purgarla; aplica
  // tanto a 'alu_' como a 'res_<conv>__'). Si el lock esta ocupado (escritura en
  // curso), se OMITE el calentado: mejor cache frio que datos stale. A las
  // 6-7am (trafico cero) el lock se adquiere al instante.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    writeLog('SISTEMA', 'WARM_CACHE', 'lock ocupado (escritura en curso), se omite el calentado');
    return 0;
  }
  try {
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const convocatorias = sheetToObjects(SHEET_NAMES.CONVOCATORIAS)
    .filter(c => isTruthy(c.activa) && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);

  if (convocatorias.length === 0) {
    writeLog('SISTEMA', 'WARM_CACHE', '0 convocatorias activas, nada que precalentar');
    return 0;
  }

  // Lectura UNICA de las hojas pesadas. Se reutilizan para todas las
  // convocatorias en lugar de releerlas por cada una: esto elimina el
  // O(convocatorias x hoja) que hacia que el run cruzara el cap de 6 min
  // cuando la latencia de Sheets es alta a primera hora.
  const alumnos = sheetToObjects(SHEET_NAMES.ALUMNOS);
  const registros = sheetToObjects(SHEET_NAMES.ASISTENCIA);

  const warmedKeys = [];
  let calentadas = 0;
  let fallidas = 0;
  convocatorias.forEach(c => {
    // try/catch por convocatoria: una lenta o con datos corruptos no debe
    // tumbar el calentado de las demas.
    try {
      // 1) Resumen global de la convocatoria (sin filtro de profesor/grupo) —
      // lo consume el dashboard del CEO. La clave debe coincidir EXACTA con la
      // de handleGetResumen: 'res_' + conv + '_' + profesor_id + '_' + grupo
      // (ultimos vacios). WARM_TTL (6h) en vez del CACHE_TTL por defecto: el
      // calentado debe llegar a la franja de uso real, no expirar a los 2 min.
      const resumenKey = 'res_' + c.id + '_' + '' + '_' + '';
      cachedGet(resumenKey, function() {
        return computeResumen(c.id, '', '', alumnos, registros);
      }, WARM_TTL);
      warmedKeys.push(resumenKey);
      calentadas++;

      // 2) Rosters per-profesor/grupo que pide el teacher en AttendancePage
      // (getAlumnos por grupo, clave 'alu_<conv>_<prof>_<grupo>'). Se derivan
      // del array `alumnos` ya leido: CERO lecturas extra de hoja. Sin esto el
      // primer getAlumnos de cada profesor pagaba frio (~2s) y, con el TTL de
      // 120s, se re-enfriaba durante el dia.
      warmAlumnosRosters_(c.id, alumnos).forEach(k => warmedKeys.push(k));
    } catch (err) {
      fallidas++;
      writeLog('SISTEMA', 'WARM_CACHE_ERROR', c.id + ' | ' + err.message);
    }
  });

  // Indice persistente de claves calentadas (vive WARM_TTL, igual que las
  // entradas): permite a cacheInvalidate purgar los rosters 'alu_' calentados
  // aunque _keys (6 min) ya no los liste. Sin el, un actualizarAlumno dejaria
  // rosters stale hasta 6h (mismo bug huerfano que ya arreglamos para 'res_').
  if (warmedKeys.length > 0) {
    cache_.put('_warm_keys', JSON.stringify(warmedKeys), WARM_TTL);
  }

  writeLog('SISTEMA', 'WARM_CACHE',
    calentadas + ' precalentada(s)' + (fallidas ? ' | ' + fallidas + ' fallida(s)' : ''));
  return calentadas;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Calienta los rosters per-profesor/grupo de una convocatoria a partir del
 * array de alumnos YA leido por warmCache (cero lecturas extra de hoja).
 *
 * Replica EXACTAMENTE la clave y el filtrado de handleGetAlumnos para que el
 * primer getAlumnos del profesor pegue en caliente:
 *   clave    = 'alu_' + convocatoriaId + '_' + profesorId + '_' + grupo
 *   contenido = alumnos activos de esa convocatoria/profesor/grupo
 *
 * Se calientan los 4 grupos (G1-G4) de cada profesor presente en la
 * convocatoria, incluidos los vacios: AttendancePage hace prefetch de G1-G4
 * aunque algun grupo no tenga alumnos, y cachear [] evita que ese grupo pague
 * frio. NO calienta la entrada del CEO 'alu_<conv>__' (el CEO no usa getAlumnos
 * en el dashboard; usa getProfesores + getResumen).
 *
 * @param {string} convocatoriaId - id de la convocatoria activa.
 * @param {Array<Object>} alumnos - filas de ALUMNOS ya leidas (sheetToObjects).
 * @returns {Array<string>} claves 'alu_' calentadas (para el indice _warm_keys).
 */
function warmAlumnosRosters_(convocatoriaId, alumnos) {
  const GRUPOS = ['G1', 'G2', 'G3', 'G4'];

  // Mismo filtro base que handleGetAlumnos: activos de esta convocatoria.
  const activos = alumnos.filter(function(a) {
    return isTruthy(a.activo) && a.convocatoria_id === convocatoriaId;
  });

  // Profesores distintos con alumnos en la convocatoria.
  const profesores = {};
  activos.forEach(function(a) {
    if (a.profesor_id) profesores[a.profesor_id] = true;
  });

  const warmed = [];
  Object.keys(profesores).forEach(function(profesorId) {
    GRUPOS.forEach(function(grupo) {
      const slice = activos.filter(function(a) {
        return a.profesor_id === profesorId && a.grupo === grupo;
      });
      const key = 'alu_' + convocatoriaId + '_' + profesorId + '_' + grupo;
      // cacheGet (no cachedGet): se rastrea via _warm_keys, no via _keys, para
      // no inflar el indice corto con decenas de claves de roster.
      cacheGet(key, function() { return slice; }, WARM_TTL);
      warmed.push(key);
    });
  });

  return warmed;
}

// ============================================================
// SETUP — Ejecutar una vez para crear las hojas
// ============================================================

/**
 * Ejecutar manualmente desde el editor de Apps Script para crear
 * las 5 hojas con sus cabeceras.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const hojas = {
    'CONVOCATORIAS': ['id', 'nombre', 'fecha_inicio', 'fecha_fin', 'activa'],
    // Columnas E..I (password_hash, salt, rol, must_change_password,
    // token_version) AÑADIDAS al final para la auth real: NO reordenar las 4
    // primeras (id, nombre, email, activo). Gestion convocatorias.js indexa por
    // posicion (data[i][0/1/3]) y reordenar romperia esos accesos.
    'PROFESORES': ['id', 'nombre', 'email', 'activo', 'password_hash', 'salt', 'rol', 'must_change_password', 'token_version'],
    'ALUMNOS': ['id', 'nombre', 'convocatoria_id', 'profesor_id', 'grupo', 'email', 'telefono', 'activo'],
    'ASISTENCIA': ['fecha', 'alumno_id', 'convocatoria_id', 'profesor_id', 'grupo', 'presente', 'hora_registro', 'justificada', 'motivo'],
    'LOG': ['timestamp', 'usuario', 'accion', 'detalle']
  };

  Object.keys(hojas).forEach(nombre => {
    let sheet = ss.getSheetByName(nombre);
    if (!sheet) {
      sheet = ss.insertSheet(nombre);
    }

    // Escribir cabeceras en fila 1
    const headers = hojas[nombre];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Formato cabecera: negrita + fondo gris
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');

    // Congelar fila 1
    sheet.setFrozenRows(1);
  });

  // Formato especial: columna 'activa'/'activo' como checkbox
  // 400 filas cubre los 336 alumnos actuales con margen. Si se deja en 50,
  // las filas 51+ reciben el valor activo como texto (VERDADERO/TRUE) en vez
  // de booleano nativo, y un filtro estricto === true descartaria esos alumnos.
  const CHECKBOX_ROWS = 400;
  const checkboxSheets = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS'];
  checkboxSheets.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    const headers = hojas[nombre];
    const activoCol = headers.indexOf('activa') !== -1
      ? headers.indexOf('activa')
      : headers.indexOf('activo');
    if (activoCol !== -1) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build();
      sheet.getRange(2, activoCol + 1, CHECKBOX_ROWS, 1).setDataValidation(rule);
    }
  });

  // NO aplicar checkbox masivo a ASISTENCIA.presente
  // Los valores TRUE/FALSE se escriben por codigo al guardar asistencia

  writeLog('SISTEMA', 'SETUP', 'Hojas creadas/verificadas correctamente');
  SpreadsheetApp.getUi().alert('Setup completado. Las 5 hojas estan listas.');
}

// ============================================================
// PROTEGER ESTRUCTURA — Ejecutar una vez
// ============================================================

/**
 * Protege la fila de cabeceras (fila 1) de todas las hojas del sistema
 * para que Aurora no pueda modificar nombres de columnas ni estructura.
 * Aurora puede editar datos (fila 2+), pero no cabeceras.
 *
 * Ejecutar manualmente desde el editor de Apps Script.
 * Requiere el email de Aurora como editor permitido.
 */
function protegerEstructura() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const emailResp = ui.prompt(
    'Email de Aurora',
    'Introduce el email de Aurora (editora de datos):',
    ui.ButtonSet.OK_CANCEL
  );
  if (emailResp.getSelectedButton() !== ui.Button.OK) return;
  const auroraEmail = emailResp.getResponseText().trim();
  if (!auroraEmail) {
    ui.alert('Email vacio. Operacion cancelada.');
    return;
  }

  const hojasProteger = ['CONVOCATORIAS', 'PROFESORES', 'ALUMNOS', 'ASISTENCIA', 'LOG'];
  let protegidas = 0;

  hojasProteger.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) return;

    const numCols = sheet.getMaxColumns();

    // Proteger fila 1 (cabeceras) — solo el owner puede editarla
    const protCabecera = sheet.getRange(1, 1, 1, numCols).protect()
      .setDescription('Cabeceras ' + nombre + ' — no modificar');
    protCabecera.removeEditors(protCabecera.getEditors());
    if (protCabecera.canDomainEdit()) {
      protCabecera.setDomainEdit(false);
    }

    // Proteger la hoja completa pero permitir edicion de datos (fila 2+)
    const protHoja = sheet.protect()
      .setDescription('Estructura ' + nombre + ' — Aurora solo edita datos');
    protHoja.addEditor(auroraEmail);
    // Marcar fila 2+ como no protegida (Aurora puede editar datos)
    protHoja.setUnprotectedRanges([sheet.getRange(2, 1, sheet.getMaxRows() - 1, numCols)]);
    if (protHoja.canDomainEdit()) {
      protHoja.setDomainEdit(false);
    }

    protegidas++;
  });

  writeLog('SISTEMA', 'PROTEGER_ESTRUCTURA', protegidas + ' hojas protegidas | editor: ' + auroraEmail);
  ui.alert('Estructura protegida en ' + protegidas + ' hojas.\nAurora (' + auroraEmail + ') puede editar datos pero no cabeceras ni estructura.');
}

// ============================================================
// AUTENTICACION — PRIMITIVAS (v1.2)
// ============================================================
//
// Bloque de primitivas criptograficas para la auth real (Fase 1 del plan
// .planning/security-auth-plan-v1.2.md). SOLO helpers: NO se modifican
// doGet/doPost/validateApiKey ni ningun handler. La integracion en el gate
// y los handlers ocurre en la Fase 3.
//
// Modelo de amenaza cubierto (resumen): identidad y rol viajan firmados con
// HMAC-SHA256 en un token de sesion, de modo que el backend deriva la
// identidad del token (no del body/query). Las comparaciones de firma y de
// hash de password se hacen en tiempo constante para no filtrar informacion
// por timing. exp del token en SEGUNDOS Unix (unidad unica, red-team #9).

// Algoritmos reutilizables (evita repetir las enums largas de Utilities).
const DIGEST_SHA_256 = Utilities.DigestAlgorithm.SHA_256;

// TTL maximo aceptable de un token, en segundos. validateToken_ rechaza
// cualquier token cuyo exp supere now + MAX_TTL_SEG: corta tokens forjados
// con expiraciones absurdamente lejanas aunque la firma fuese valida.
const MAX_TTL_SEG = 24 * 60 * 60; // 24 horas

// Prefijo de dominio que se antepone al payload antes de firmar/verificar.
// Evita colisiones de firma entre contextos distintos (separacion de dominio).
const TOKEN_SIGN_PREFIX = 'novattend.v1.';

// Valor placeholder de SESSION_SECRET: si la propiedad aun contiene esto,
// se considera NO configurada (signToken_ lanza, setSessionSecret regenera).
const SESSION_SECRET_PLACEHOLDER = 'REEMPLAZAR';

// Numero UNICO de iteraciones PBKDF2 compartido por TODA la auth: la migracion
// (migrarPasswordsProfesores) genera los hashes con este valor y el login
// (Fase 3) debe verificar con EXACTAMENTE el mismo. Si divergen, ningun
// password migrado validaria jamas. Ajustable midiendo latencia real en deploy
// (Fase 0): el mayor N que mantenga el login por debajo de ~2-3s. Cambiar este
// valor obliga a re-migrar todos los hashes existentes.
const PBKDF2_ITER = 10000;

/**
 * Comparacion en tiempo constante de dos valores (string o Byte[]).
 *
 * No hace early-return por longitud: hashea AMBOS lados con SHA-256 y compara
 * los dos digests (siempre 32 bytes, longitud fija) byte a byte acumulando las
 * diferencias en un OR. El tiempo de ejecucion no depende de en que byte
 * difieren ni de la longitud de las entradas, asi que no filtra informacion
 * util a un atacante que mida latencias.
 *
 * NOTA: dos entradas distintas con el mismo SHA-256 darian igual, pero eso
 * exigiria una colision de SHA-256 (no factible), asi que es seguro.
 *
 * @param {string|Byte[]} a - Primer valor a comparar.
 * @param {string|Byte[]} b - Segundo valor a comparar.
 * @returns {boolean} true si los digests SHA-256 coinciden, false en otro caso.
 */
function constantEq_(a, b) {
  const ha = Utilities.computeDigest(DIGEST_SHA_256, a);
  const hb = Utilities.computeDigest(DIGEST_SHA_256, b);
  let r = 0;
  // Ambos digests miden 32 bytes; el bucle recorre longitud fija.
  for (let i = 0; i < ha.length; i++) {
    r |= ha[i] ^ hb[i];
  }
  return r === 0;
}

/**
 * Derivacion de clave PBKDF2 manual (N iteraciones de HMAC-SHA256).
 *
 * No existe PBKDF2 nativo en Apps Script, asi que se encadena
 * Utilities.computeHmacSha256Signature N veces usando el salt como clave HMAC.
 * El numero de iteraciones (iter) se fija midiendo latencia real en deploy
 * (Fase 0 del plan): el mayor N que mantenga el login por debajo de ~2-3s.
 *
 * @param {string} pwd  - Password en claro a derivar.
 * @param {string} salt - Salt por usuario (string; se usa como clave HMAC).
 * @param {number} iter - Numero de iteraciones (>= 1).
 * @returns {string} Hash derivado en base64 estandar.
 */
function pbkdf2_(pwd, salt, iter) {
  const saltBytes = Utilities.newBlob(salt).getBytes();
  // Semilla: HMAC del material (salt+pwd) en la primera vuelta y despues se
  // realimenta el resultado anterior, siempre con el salt como clave.
  let b = Utilities.newBlob(salt + pwd).getBytes();
  for (let i = 0; i < iter; i++) {
    b = Utilities.computeHmacSha256Signature(b, saltBytes);
  }
  return Utilities.base64Encode(b);
}

/**
 * Verifica un password en claro contra el hash almacenado.
 *
 * Rechaza explicitamente si faltan salt o hash (red-team deploy #6): una fila
 * sin credenciales no debe poder autenticarse jamas. La comparacion final usa
 * constantEq_ (tiempo constante) para no filtrar por timing si el prefijo del
 * hash coincide.
 *
 * @param {string} plain      - Password en claro recibido en el login.
 * @param {string} salt       - Salt almacenado para ese usuario.
 * @param {string} storedHash - Hash PBKDF2 almacenado (base64).
 * @param {number} iter       - Iteraciones usadas al generar storedHash.
 * @returns {boolean} true si el password es correcto, false en otro caso.
 */
function verifyPassword_(plain, salt, storedHash, iter) {
  if (!salt || !storedHash) return false; // sin credenciales: rechazo explicito
  return constantEq_(pbkdf2_(plain, salt, iter), storedHash);
}

/**
 * Firma un payload y devuelve el token de sesion.
 *
 * Exige SESSION_SECRET en ScriptProperties: lanza si falta o sigue siendo el
 * placeholder, para no emitir nunca tokens firmados con un secreto trivial.
 * Formato del token: `payloadB64.sigB64`, ambos en base64 WebSafe. La firma es
 * HMAC-SHA256 sobre (TOKEN_SIGN_PREFIX + payloadB64), no sobre el payload
 * crudo (separacion de dominio).
 *
 * @param {Object} payload - Objeto a firmar (ej. {v,profesor_id,rol,exp,ver}).
 * @returns {string} Token de sesion `payloadB64.sigB64`.
 * @throws {Error} Si SESSION_SECRET no esta configurado.
 */
function signToken_(payload) {
  const sec = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!sec || sec === SESSION_SECRET_PLACEHOLDER) {
    throw new Error('SESSION_SECRET no configurado');
  }
  const p = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const sig = Utilities.computeHmacSha256Signature(TOKEN_SIGN_PREFIX + p, sec);
  return p + '.' + Utilities.base64EncodeWebSafe(sig);
}

/**
 * Valida un token de sesion y devuelve la identidad si es legitimo.
 *
 * Orden de validacion (critico): primero VERIFICA LA FIRMA y solo despues
 * parsea el payload. Asi un payload manipulado (ej. forjar alg=none o inyectar
 * campos arbitrarios, red-team cripto #1) nunca llega al JSON.parse con firma
 * invalida. Tras parsear se aplican TIPOS ESTRICTOS:
 *   - v === 1 (version de esquema esperada),
 *   - profesor_id: string que matchea /^prof-[a-z0-9._-]+$/,
 *   - rol en {'teacher','ceo'},
 *   - exp: number en SEGUNDOS con now < exp <= now + MAX_TTL_SEG,
 *   - ver: number (defensa en profundidad para el re-check de token_version).
 *
 * @param {string} token - Token `payloadB64.sigB64`.
 * @returns {{profesor_id: string, rol: string, ver: number}|null} Identidad o null.
 */
function validateToken_(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const sec = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
  if (!sec || sec === SESSION_SECRET_PLACEHOLDER) return null;

  // 1) Verificar firma ANTES de parsear nada del payload.
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(TOKEN_SIGN_PREFIX + parts[0], sec)
  );
  if (!constantEq_(sig, parts[1])) return null;

  // 2) Solo con firma valida se decodifica y parsea el payload.
  let pl;
  try {
    pl = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (e) {
    return null;
  }
  if (!pl || typeof pl !== 'object') return null;

  // 3) Validacion estricta de tipos y rangos.
  if (pl.v !== 1) return null;
  if (typeof pl.profesor_id !== 'string' || !/^prof-[a-z0-9._-]+$/.test(pl.profesor_id)) return null;
  if (pl.rol !== 'teacher' && pl.rol !== 'ceo') return null;
  const now = Math.floor(Date.now() / 1000); // SEGUNDOS Unix
  if (typeof pl.exp !== 'number' || pl.exp <= now || pl.exp > now + MAX_TTL_SEG) return null;
  // ver debe ser numero (defensa en profundidad): si llegara como string u otro
  // tipo, el re-check de token_version (Number() vs Number()) podria comportarse
  // de forma inesperada. Fail-fast aqui.
  if (typeof pl.ver !== 'number') return null;

  return { profesor_id: pl.profesor_id, rol: pl.rol, ver: pl.ver };
}

/**
 * Configura SESSION_SECRET en ScriptProperties (idempotente).
 *
 * Ejecutar UNA VEZ desde el editor de Apps Script (NO via web). Es IDEMPOTENTE:
 * si ya existe un secreto valido (distinto del placeholder), NO lo regenera,
 * para no invalidar las sesiones activas (red-team deploy #5). Solo genera uno
 * nuevo si falta o sigue siendo el placeholder.
 *
 * El secreto son 256 bits de entropia (dos UUID v4 concatenados, ~256 bits)
 * codificados en base64. Suficiente para una clave HMAC-SHA256.
 */
function setSessionSecret() {
  const props = PropertiesService.getScriptProperties();
  const current = props.getProperty('SESSION_SECRET');
  if (current && current !== SESSION_SECRET_PLACEHOLDER) {
    Logger.log('SESSION_SECRET ya configurado: no se regenera (idempotente)');
    return;
  }
  // 2x UUID v4 (32 hex utiles c/u) => ~256 bits de entropia.
  const raw = Utilities.getUuid() + Utilities.getUuid();
  const secret = Utilities.base64Encode(Utilities.newBlob(raw).getBytes());
  props.setProperty('SESSION_SECRET', secret);
  Logger.log('SESSION_SECRET generado y guardado (256 bits)');
}

// --- SELF-TEST MANUAL (NO ejecutar en deploy; solo referencia de uso) --------
//
// Para validar ida y vuelta desde el editor de Apps Script, tras correr
// setSessionSecret() una vez, ejecutar manualmente algo como:
//
//   function _selfTestAuth() {
//     const now = Math.floor(Date.now() / 1000);
//     const tok = signToken_({ v: 1, profesor_id: 'prof-x', rol: 'teacher', exp: now + 3600, ver: 1 });
//     Logger.log(validateToken_(tok));                 // => {profesor_id:'prof-x', rol:'teacher', ver:1}
//     Logger.log(validateToken_(tok + 'x'));           // => null (firma alterada)
//     const expirado = signToken_({ v: 1, profesor_id: 'prof-x', rol: 'teacher', exp: now - 1, ver: 1 });
//     Logger.log(validateToken_(expirado));            // => null (exp pasado)
//     const rolMalo = signToken_({ v: 1, profesor_id: 'prof-x', rol: 'admin', exp: now + 3600, ver: 1 });
//     Logger.log(validateToken_(rolMalo));             // => null (rol no permitido)
//   }
//
// Se deja COMENTADO a proposito: la Fase 1 no ejecuta nada, solo anade helpers.
// -----------------------------------------------------------------------------

// ============================================================
// AUTENTICACION — MIGRACION DE CREDENCIALES (Fase 2)
// ============================================================
//
// migrarPasswordsProfesores hashea las contrasenas iniciales de los profesores
// y crea la fila del CEO. Se ejecuta UNA SOLA VEZ y de forma MANUAL desde el
// editor de Apps Script (NUNCA via web): no esta cableada a doGet/doPost.
//
// SEGURIDAD: el codigo COMMITEADO no contiene NINGUNA contrasena real. Las
// contrasenas temporales viven solo en el documento de credenciales del
// Escritorio y se pasan como parametro en el momento de ejecutar. Esta funcion
// NUNCA loguea contrasenas en claro: solo conteos.

/**
 * Migra las credenciales de los profesores a la hoja PROFESORES (Fase 2).
 *
 * Ejecutar MANUALMENTE desde el editor, una sola vez, en el deploy coordinado
 * (Fase 8). Requisitos previos (los hace el owner a mano, red-team deploy #6):
 *   - La hoja PROFESORES debe tener ya las cabeceras E..I
 *     (password_hash, salt, rol, must_change_password, token_version). El ALTER
 *     se hace a mano para no disparar el alert UI de setupSheets.
 *
 * Para cada usuario del objeto tempPasswords:
 *   - id  = (usuario === 'admin') ? 'prof-admin' : 'prof-' + usuario
 *   - rol = (usuario === 'admin') ? 'ceo'        : 'teacher'
 *   - salt = UUID nuevo, hash = pbkdf2_(passwordEnClaro, salt, PBKDF2_ITER)
 *   - must_change_password = true, token_version = 1
 * Si la fila del id existe se actualizan sus columnas E..I; si no existe (caso
 * tipico de prof-admin) se hace append de una fila nueva con el numero de
 * columnas correcto. La escritura es en batch por fila (setValues), no celda a
 * celda. Al final se valida la integridad: ninguna fila activa puede quedar con
 * salt o password_hash vacios.
 *
 * @param {Object<string,string>} tempPasswords - Mapa { usuario: passwordEnClaro }.
 *        Pegar el objeto TEMP_PASSWORDS del documento de credenciales del
 *        Escritorio. NO existe valor por defecto: si falta, la funcion aborta.
 * @returns {{migrados: number, creados: number, errores: string[]}} Resumen.
 * @throws {Error} Si tempPasswords falta/esta vacio o si faltan las columnas E..I.
 */
function migrarPasswordsProfesores(tempPasswords) {
  // 1) El codigo no trae contrasenas: exigir el parametro explicitamente.
  if (!tempPasswords || typeof tempPasswords !== 'object' || Object.keys(tempPasswords).length === 0) {
    throw new Error(
      'Faltan las contrasenas. Pega el objeto TEMP_PASSWORDS del documento de ' +
      'credenciales del Escritorio como argumento y vuelve a ejecutar ' +
      'migrarPasswordsProfesores(TEMP_PASSWORDS).'
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PROFESORES);
  if (!sheet) {
    throw new Error('No existe la hoja PROFESORES.');
  }

  // 2) Leer todo de una vez y resolver indices de columna POR CABECERA
  //    (no por posicion fija), para no romperse si el orden cambiara.
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const colId = headers.indexOf('id');
  const colNombre = headers.indexOf('nombre');
  const colActivo = headers.indexOf('activo');
  const colHash = headers.indexOf('password_hash');
  const colSalt = headers.indexOf('salt');
  const colRol = headers.indexOf('rol');
  const colMustChange = headers.indexOf('must_change_password');
  const colTokenVer = headers.indexOf('token_version');

  // 3) Abortar si faltan las columnas nuevas: el ALTER lo hace el owner a mano.
  const faltantes = [];
  if (colHash === -1) faltantes.push('password_hash');
  if (colSalt === -1) faltantes.push('salt');
  if (colRol === -1) faltantes.push('rol');
  if (colMustChange === -1) faltantes.push('must_change_password');
  if (colTokenVer === -1) faltantes.push('token_version');
  if (faltantes.length > 0) {
    throw new Error(
      'Faltan columnas en PROFESORES: ' + faltantes.join(', ') + '. Anade primero ' +
      'las cabeceras E..I en la hoja PROFESORES (ALTER manual del owner) y reintenta.'
    );
  }

  const numCols = headers.length;
  let migrados = 0;
  let creados = 0;
  const errores = [];

  // 4) Procesar cada usuario del mapa de contrasenas temporales.
  Object.keys(tempPasswords).forEach(usuario => {
    const passwordEnClaro = tempPasswords[usuario];
    if (!passwordEnClaro || typeof passwordEnClaro !== 'string') {
      // No logueamos la contrasena; solo el usuario afectado.
      errores.push('Usuario "' + usuario + '": contrasena vacia o invalida, omitido.');
      return;
    }

    const esAdmin = (usuario === 'admin');
    const id = esAdmin ? 'prof-admin' : 'prof-' + usuario;
    const rol = esAdmin ? 'ceo' : 'teacher';
    const salt = Utilities.getUuid();
    const hash = pbkdf2_(passwordEnClaro, salt, PBKDF2_ITER);

    // Buscar la fila por id (data incluye la cabecera en el indice 0).
    let filaIdx = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colId]).trim() === id) {
        filaIdx = i;
        break;
      }
    }

    if (filaIdx !== -1) {
      // Fila existente: actualizar SOLO las columnas de credenciales. En la
      // migracion inicial token_version=1.
      data[filaIdx][colHash] = hash;
      data[filaIdx][colSalt] = salt;
      data[filaIdx][colRol] = rol;
      data[filaIdx][colMustChange] = true;
      data[filaIdx][colTokenVer] = 1;

      // Escribir la fila completa de una vez (un solo setValues por fila, no
      // celda a celda). Reescribir toda la fila preserva los valores existentes
      // (id, nombre, email, activo) ya cargados en data y no asume contiguidad
      // de las columnas nuevas, asi que es robusto si el ALTER manual las
      // colocara en otro orden.
      sheet.getRange(filaIdx + 1, 1, 1, numCols).setValues([data[filaIdx]]);
      migrados++;
    } else {
      // Fila inexistente (caso prof-admin): append de una fila completa con el
      // numero de columnas correcto. Solo el CEO se crea aqui; un teacher sin
      // fila se reporta como error (deberia existir desde el alta).
      if (!esAdmin) {
        errores.push('Usuario "' + usuario + '" (id ' + id + '): sin fila en PROFESORES, no migrado.');
        return;
      }
      const fila = new Array(numCols).fill('');
      fila[colId] = id;
      if (colNombre !== -1) fila[colNombre] = 'Rafa';
      if (colActivo !== -1) fila[colActivo] = true;
      fila[colHash] = hash;
      fila[colSalt] = salt;
      fila[colRol] = rol;
      fila[colMustChange] = true;
      fila[colTokenVer] = 1;
      sheet.appendRow(fila);
      // Reflejar la fila nueva en data para el check de integridad posterior.
      data.push(fila);
      creados++;
    }
  });

  // 5) Check de integridad: ninguna fila activa puede quedar sin credenciales.
  //    NO se loguea ninguna contrasena, solo el id de la fila incompleta.
  for (let i = 1; i < data.length; i++) {
    const activa = (colActivo !== -1) ? isTruthy(data[i][colActivo]) : false;
    if (!activa) continue;
    const sinSalt = !String(data[i][colSalt] || '').trim();
    const sinHash = !String(data[i][colHash] || '').trim();
    if (sinSalt || sinHash) {
      errores.push('Integridad: fila activa "' + String(data[i][colId]).trim() + '" sin salt/password_hash.');
    }
  }

  // 6) Log y resumen: SOLO conteos, jamas contrasenas en claro.
  const resumen = { migrados: migrados, creados: creados, errores: errores };
  writeLog(
    'SISTEMA',
    'MIGRAR_PASSWORDS',
    migrados + ' profesores migrados, ' + creados + ' creados, ' + errores.length + ' errores'
  );
  if (errores.length > 0) {
    Logger.log('migrarPasswordsProfesores: %s errores -> %s', errores.length, errores.join(' | '));
  }
  Logger.log('migrarPasswordsProfesores OK: %s migrados, %s creados', migrados, creados);
  return resumen;
}

// ============================================================
// API KEY — Ejecutar manualmente para configurar
// ============================================================

/**
 * Configura el API key en Script Properties.
 * Ejecutar UNA VEZ desde el editor de Apps Script.
 * Reemplazar el UUID con uno real generado via crypto.randomUUID().
 */
function setApiKey() {
  const key = 'REEMPLAZAR-CON-UUID-V4-REAL'
  PropertiesService.getScriptProperties().setProperty('API_KEY', key)
  Logger.log('API_KEY configurada correctamente')
}

/**
 * Verifica que el API key esta configurado en Script Properties.
 * Ejecutar para diagnostico.
 */
function checkApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('API_KEY')
  Logger.log('API_KEY presente: ' + Boolean(key))
  Logger.log('API_KEY longitud: ' + (key ? key.length : 0))
}
