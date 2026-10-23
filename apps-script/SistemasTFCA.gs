/**
 * ==========================================================================
 *  Sistemas y Módulos TFCA — Backend en Google Apps Script  (archivo 1 de 2)
 *  Este archivo y TableroTFCA.gs van en el MISMO proyecto de Apps Script,
 *  ligado a UNA sola Hoja de cálculo. Comparten una sola URL /exec.
 *
 *  Datos compartidos por las dos páginas:
 *    Sistemas  → "módulos" del Tablero de accesos (permisos por sistema)
 *    Modulos   → subsistemas de cada sistema
 *  Solo de paginas/areas.html:  Cards, Bloques, Checklist, Comentarios, Notificaciones
 *  Solo de paginas/tablero.html: AREAS, ROLES, EMPLEADOS, PERMISOS (en TableroTFCA.gs)
 *
 *  PASOS
 *   1) Drive → Nuevo → Hoja de cálculo: "Sistemas TFCA - BD"  (nueva, no la de tickets).
 *   2) Extensiones → Apps Script:
 *        · renombra Code.gs a SistemasTFCA.gs y pega este archivo
 *        · botón + → Secuencia de comandos → TableroTFCA  y pega TableroTFCA.gs
 *   3) Revisa CFG (API_KEY = SISTEMAS_API_KEY de js/config.js).
 *   4) Selecciona la función  setup  → Ejecutar → acepta permisos.
 *      Crea las 11 hojas con encabezados y la carpeta de archivos en Drive.
 *   5) Implementar → Nueva implementación → Aplicación web
 *        Ejecutar como: Yo     ·     Quién tiene acceso: Cualquier usuario
 *   6) Copia la URL /exec en js/config.js → SISTEMAS_API_URL (la usan las dos páginas).
 *   7) Entra a Sistemas, inicia sesión e "Importar catálogo" (solo con la hoja vacía).
 *  Acceso: leer es público (sin sesión se ve en solo lectura); guardar, borrar e importar
 *  requieren un usuario de CFG.USERS (la sesión de la página).
 *  Si cambias el código: Implementar → Administrar implementaciones → ✏ →
 *  Versión: Nueva versión (la URL /exec no cambia).
 * ==========================================================================
 */

const CFG = {
  API_KEY: 'tfca-sistemas-2026-cambia-esta-clave',  // = SISTEMAS_API_KEY de js/config.js (ambas páginas)
  SPREADSHEET_ID: '',                             // vacío = la hoja donde está este script
  FOLDER_NAME: 'Sistemas TFCA - Archivos',
  MAX_FILE_MB: 10,
  MAX_TEXTO: 45000,                               // una celda admite ~50 000 caracteres
  // Deben ser EXACTAMENTE los "user" de USERS en js/config.js
  USERS: ['nexNekiz@', 'Brandom12@', 'Edd234', 'nantoree:)', 'usuario5']
};

/* Colección (como la usa la página) → hoja y columnas */
const SHEETS = {
  // spd y color los usa el Tablero de accesos (los sistemas son sus "módulos")
  sistemas:       { name: 'Sistemas',       cols: ['id', 'nombre', 'folder', 'orden', 'estatus', 'fecha_alta', 'descripcion', 'spd', 'color'] },
  modulos:        { name: 'Modulos',        cols: ['id', 'id_sistema', 'nombre', 'archivo_subsistema', 'orden', 'estatus', 'fecha_alta'] },
  cards:          { name: 'Cards',          cols: ['id', 'id_modulo', 'titulo', 'estado', 'prioridad', 'asignados', 'hashtags', 'autor', 'fecha_alta', 'actualizado'] },
  bloques:        { name: 'Bloques',        cols: ['id', 'id_card', 'tipo', 'contenido', 'lenguaje', 'fileName', 'mime', 'size', 'url', 'fileId', 'orden'] },
  checklist:      { name: 'Checklist',      cols: ['id', 'id_card', 'texto', 'hecho', 'autor', 'fecha_alta'] },
  comentarios:    { name: 'Comentarios',    cols: ['id', 'id_card', 'autor', 'texto', 'fecha_alta'] },
  notificaciones: { name: 'Notificaciones', cols: ['id', 'para', 'tipo', 'id_card', 'de', 'texto', 'fecha_alta', 'leida'] }
};
const NUMERIC = ['id', 'id_sistema', 'id_modulo', 'id_card', 'orden', 'estatus', 'size'];
const BOOLEAN = ['hecho', 'leida'];
const ESTADOS = ['seguimiento', 'proceso', 'finalizado', 'produccion'];   // seguimiento = "Por hacer"
const TIPOS_BLOQUE = ['texto', 'codigo', 'archivo'];

/* ============================== Instalación ============================== */
function setup() {
  const ss = ss_();
  Object.keys(SHEETS).forEach(k => {
    const def = SHEETS[k];
    let sh = ss.getSheetByName(def.name);
    if (!sh) sh = ss.insertSheet(def.name);
    else if (sh.getLastRow() > 0) {
      const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
      const same = def.cols.every((c, i) => head[i] === c || head[i] === '');
      if (!same) throw new Error('La hoja "' + def.name + '" ya existe con otras columnas. Usa una hoja de cálculo nueva.');
    }
    header_(sh, def.cols);
  });
  if (typeof setupTablero_ === 'function') setupTablero_(ss);                 // hojas de TableroTFCA.gs
  ['Hoja 1', 'Sheet1'].forEach(n => { const h = ss.getSheetByName(n); if (h && ss.getSheets().length > 1 && h.getLastRow() === 0) ss.deleteSheet(h); });
  const folder = folder_();
  Logger.log('✅ Listo: ' + ss.getSheets().map(h => h.getName()).join(', '));
  Logger.log('📄 Hoja: ' + ss.getUrl());
  Logger.log('📁 Archivos: ' + folder.getUrl());
}
function header_(sh, cols) {
  if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#8a1c3b').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');   // todo como texto
}

/* ============================== Web App ============================== */
function doGet() {
  return json_({ ok: true, app: 'Sistemas y Módulos TFCA + Tablero de accesos', hojas: ss_().getSheets().map(h => h.getName()), hora: new Date().toISOString() });
}
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.key !== CFG.API_KEY) throw new Error('Clave API inválida');
    // Acciones de este archivo + las del Tablero (TableroTFCA.gs)
    const fn = ACTIONS[req.action] || (typeof TB_ACTIONS !== 'undefined' ? TB_ACTIONS[req.action] : null);
    if (!fn) throw new Error('Acción desconocida: ' + req.action);
    return json_({ ok: true, data: fn(req) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

const ACTIONS = {
  ping: () => ({ pong: true }),

  /** Todo el contenido (la página filtra y calcula). Lectura pública: las páginas se ven sin sesión. */
  all: () => {
    const out = {};
    Object.keys(SHEETS).forEach(k => { out[k] = readAll_(k); });
    return out;
  },

  /** Crea (sin id) o actualiza (con id; solo los campos enviados) */
  save: r => withLock_(() => {
    const user = needUser_(r), ent = entity_(r.entity);
    let obj = Object.assign({}, r.data || {});
    validate_(ent, obj);
    if (ent === 'bloques') obj = uploadIfNeeded_(obj, user);
    const id = Number(obj.id);
    if (id) {
      const merged = updateRow_(ent, id, obj);
      if (merged) return merged;
    }
    obj.id = id || nextId_(ent);
    appendRows_(ent, [obj]);
    return typed_(ent, rowObj_(ent, obj));
  }),

  /** Borra por ids */
  remove: r => withLock_(() => {
    needUser_(r);
    const ent = entity_(r.entity);
    const ids = ((r.data && r.data.ids) || []).map(Number).filter(Boolean);
    // Protecciones: no dejar subsistemas o cards huérfanas
    if (ent === 'sistemas') {
      const hijos = readAll_('modulos').filter(m => ids.indexOf(m.id_sistema) >= 0).length;
      if (hijos) throw new Error('El sistema tiene ' + hijos + ' subsistema(s). Muévelos o elimínalos primero.');
    }
    if (ent === 'modulos') {
      const cards = readAll_('cards').filter(c => ids.indexOf(c.id_modulo) >= 0).length;
      if (cards) throw new Error('El subsistema tiene ' + cards + ' card(s). Elimínalas primero desde Sistemas y Módulos.');
    }
    const removed = deleteRows_(ent, ids);
    if (ent === 'sistemas' && typeof tbQuitarPermisos_ === 'function') tbQuitarPermisos_(ids);   // permisos del Tablero
    return { removed: removed };
  }),

  /** Importa el catálogo de sistemas y subsistemas. Solo con las hojas vacías. */
  import: r => withLock_(() => {
    const user = needUser_(r);
    if (readAll_('sistemas').length || readAll_('modulos').length) throw new Error('Ya hay sistemas o módulos en la hoja. La importación solo se permite con la hoja vacía.');
    const d = r.data || {}, sis = d.sistemas || [], sub = d.subsistemas || [];
    if (!sis.length) throw new Error('El catálogo no trae sistemas.');
    const now = stamp_();
    appendRows_('sistemas', sis.map(x => ({ id: Number(x.id), nombre: clean_(x.nombre, 120), folder: clean_(x.folder, 80), orden: Number(x.orden) || 0, estatus: x.estatus == null ? 1 : Number(x.estatus), fecha_alta: x.fecha_alta || now, descripcion: clean_(x.descripcion, 300) })));
    appendRows_('modulos', sub.map(x => ({ id: Number(x.id), id_sistema: Number(x.id_sistema), nombre: clean_(x.nombre, 120), archivo_subsistema: clean_(x.archivo_subsistema, 160), orden: Number(x.orden) || 0, estatus: x.estatus == null ? 1 : Number(x.estatus), fecha_alta: x.fecha_alta || now })));
    return { sistemas: sis.length, modulos: sub.length, por: user };
  })
};

/* ============================== Validación ============================== */
function needUser_(r) {
  const u = String(r.user || '').trim();
  if (!u) throw new Error('Inicia sesión para hacer cambios');
  if (CFG.USERS.indexOf(u) < 0) throw new Error('Usuario no autorizado: ' + u);
  return u;
}
function entity_(e) {
  if (!SHEETS[e]) throw new Error('Colección desconocida: ' + e);
  return e;
}
function validate_(ent, o) {
  if (ent === 'cards' && 'estado' in o && ESTADOS.indexOf(o.estado) < 0) throw new Error('Estado inválido: ' + o.estado);
  if (ent === 'bloques' && 'tipo' in o && TIPOS_BLOQUE.indexOf(o.tipo) < 0) throw new Error('Tipo de bloque inválido: ' + o.tipo);
  ['contenido', 'texto'].forEach(k => { if (o[k] && String(o[k]).length > CFG.MAX_TEXTO) throw new Error('El texto supera ' + CFG.MAX_TEXTO + ' caracteres. Adjúntalo como archivo.'); });
  if (!o.id && (ent === 'sistemas' || ent === 'modulos' || ent === 'cards') && !String(o.nombre || o.titulo || '').trim()) throw new Error('Falta el nombre o título.');
}

/* ============================== Archivos (Drive) ============================== */
/** Si el bloque trae un data: URL, lo sube a Drive y guarda el enlace y el fileId */
function uploadIfNeeded_(o, user) {
  const url = String(o.url || '');
  if (o.tipo !== 'archivo' || url.indexOf('data:') !== 0) return o;
  const m = url.match(/^data:([^;,]*)(;base64)?,(.*)$/);
  if (!m) throw new Error('Archivo con formato inválido');
  const mime = m[1] || o.mime || 'application/octet-stream';
  const bytes = m[2] ? Utilities.base64Decode(m[3]) : Utilities.newBlob(decodeURIComponent(m[3])).getBytes();
  if (bytes.length > CFG.MAX_FILE_MB * 1048576) throw new Error('El archivo supera ' + CFG.MAX_FILE_MB + ' MB');
  const blob = Utilities.newBlob(bytes, mime, o.fileName || ('archivo-' + Date.now()));
  const file = cardFolder_(o.id_card).createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* el dominio puede impedirlo */ }
  file.setDescription('Subido por ' + user + ' · card ' + o.id_card);
  return Object.assign({}, o, { url: file.getUrl(), fileId: file.getId(), mime: mime, size: bytes.length });
}
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se volvió a crear */ } }
  const it = DriveApp.getFoldersByName(CFG.FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(CFG.FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}
function cardFolder_(idCard) {
  const root = folder_(), name = 'card-' + (idCard || 'sin-card');
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/* ============================== Hojas ============================== */
function ss_() { return CFG.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
const SH_CACHE_ = {};
function sheet_(ent) {
  if (SH_CACHE_[ent]) return SH_CACHE_[ent];
  const def = SHEETS[ent], ss = ss_();
  let sh = ss.getSheetByName(def.name);
  if (!sh) { sh = ss.insertSheet(def.name); header_(sh, def.cols); }          // por si no se corrió setup()
  return (SH_CACHE_[ent] = sh);
}
function readAll_(ent) {
  const sh = sheet_(ent), cols = SHEETS[ent].cols, last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, cols.length).getValues()
    .filter(row => String(row[0]).trim() !== '')
    .map(row => {
      const o = {};
      cols.forEach((c, i) => { o[c] = row[i]; });
      return typed_(ent, o);
    });
}
/** Convierte tipos al leer: números, booleanos y fechas como texto */
function typed_(ent, o) {
  const out = {};
  SHEETS[ent].cols.forEach(c => {
    let v = o[c];
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    v = v == null ? '' : v;
    if (typeof v === 'string' && /^'[=+\-@]/.test(v)) v = v.slice(1);
    if (NUMERIC.indexOf(c) >= 0) v = v === '' ? 0 : Number(v);
    else if (BOOLEAN.indexOf(c) >= 0) v = String(v).toUpperCase() === 'TRUE';
    else v = String(v);
    out[c] = v;
  });
  return out;
}
function rowObj_(ent, o) { const r = {}; SHEETS[ent].cols.forEach(c => { r[c] = o[c] == null ? '' : o[c]; }); return r; }
function toCells_(ent, o) {
  return SHEETS[ent].cols.map(c => {
    let v = o[c];
    if (v == null) return '';
    if (BOOLEAN.indexOf(c) >= 0) return (v === true || String(v).toUpperCase() === 'TRUE') ? 'TRUE' : 'FALSE';
    v = String(v);
    return /^[=+\-@]/.test(v) ? "'" + v : v;                              // evita que se interprete como fórmula
  });
}
function nextId_(ent) {
  const sh = sheet_(ent), last = sh.getLastRow();
  if (last < 2) return 1;
  return sh.getRange(2, 1, last - 1, 1).getValues().reduce((m, r) => Math.max(m, Number(r[0]) || 0), 0) + 1;
}
function appendRows_(ent, objs) {
  if (!objs.length) return;
  const sh = sheet_(ent), cols = SHEETS[ent].cols, row = sh.getLastRow() + 1;
  const extra = row + objs.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra + 100);
  sh.getRange(row, 1, objs.length, cols.length).setNumberFormat('@').setValues(objs.map(o => toCells_(ent, o)));
}
/** Actualiza solo los campos enviados; devuelve la fila completa o null si no existe */
function updateRow_(ent, id, patch) {
  const sh = sheet_(ent), cols = SHEETS[ent].cols, last = sh.getLastRow();
  if (last < 2) return null;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) !== id) continue;
    const range = sh.getRange(i + 2, 1, 1, cols.length);
    const cur = {}; range.getValues()[0].forEach((v, j) => { cur[cols[j]] = v; });
    const merged = typed_(ent, cur);
    Object.keys(patch).forEach(k => { if (cols.indexOf(k) >= 0 && k !== 'id') merged[k] = patch[k]; });
    range.setValues([toCells_(ent, merged)]);
    return typed_(ent, rowObj_(ent, merged));
  }
  return null;
}
function deleteRows_(ent, ids) {
  if (!ids.length) return 0;
  const sh = sheet_(ent), last = sh.getLastRow();
  if (last < 2) return 0;
  const set = {}; ids.forEach(i => { set[i] = true; });
  const col = sh.getRange(2, 1, last - 1, 1).getValues();
  let n = 0;
  for (let i = col.length - 1; i >= 0; i--) if (set[Number(col[i][0])]) { sh.deleteRow(i + 2); n++; }
  return n;
}

/* ============================== Utilidades ============================== */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function clean_(v, max) { return String(v == null ? '' : v).slice(0, max || 1000); }
function stamp_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
