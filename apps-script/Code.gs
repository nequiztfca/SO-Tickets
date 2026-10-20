/**
 * ============================================================
 *  Sistema Tickets TFCA — Backend en Google Apps Script
 *  Base de datos: Google Sheets  ·  Archivos: Google Drive
 *
 *  PASOS:
 *   1) Crea una Hoja de cálculo en Google Drive ("Sistema Tickets TFCA - BD").
 *   2) Extensiones → Apps Script → pega este archivo como Code.gs.
 *   3) Cambia CFG.API_KEY (igual que en js/config.js).
 *   4) Ejecuta la función  setup()  una vez y acepta los permisos.
 *   5) Implementar → Nueva implementación → Aplicación web
 *        Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *   6) Copia la URL (/exec) en js/config.js → API_URL.
 *  Cada vez que cambies este código: Implementar → Administrar implementaciones
 *  → editar (lápiz) → Versión: "Nueva versión" (así la URL no cambia).
 * ============================================================
 */

const CFG = {
  API_KEY: 'tfca-2026-cambia-esta-clave',     // = ENV.API_KEY del front
  SPREADSHEET_ID: '',                          // vacío = la hoja a la que está ligado el script
  FOLDER_NAME: 'Sistema Tickets TFCA - Adjuntos',
  // Deben ser EXACTAMENTE los mismos "user" de js/config.js (respeta mayúsculas y símbolos)
  USERS: ['nexNekiz@', 'Brandom12@', 'Edd234', 'nantoree:)', 'usuario5'],
  ID_PREFIX: 'TFCA-',
  MODULO_DEFAULT: 'Sin Asignar'
};

const SHEETS = {
  Tickets:     ['id', 'titulo', 'descripcion', 'prioridad', 'categoria', 'estado', 'asignados', 'creadoPor', 'creado', 'actualizado', 'fechaLimite', 'cerrado', 'cerradoPor', 'modulos'],
  Seguimiento: ['id', 'ticketId', 'tipo', 'autor', 'texto', 'lenguaje', 'fileId', 'fileName', 'mime', 'url', 'fecha'],
  Checklist:   ['id', 'ticketId', 'texto', 'hecho', 'autor', 'fecha', 'hechoPor'],
  Modulos:     ['nombre', 'creadoPor', 'fecha']
};
const ESTADOS = { pendiente: 'Pendiente', proceso: 'En proceso', cerrado: 'Cerrado' };
const TIPOS = ['comentario', 'codigo', 'imagen', 'archivo'];

/* ======================= Instalación ======================= */
function setup() {
  const ss = ss_();
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = SHEETS[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // todo como texto (evita conversión de fechas)
  });
  const def = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  const folder = folder_();
  Logger.log('✅ Listo. Hojas creadas en: ' + ss.getUrl());
  Logger.log('📁 Carpeta de adjuntos: ' + folder.getUrl());
}

/* ======================= Endpoints ======================= */
function doGet() {
  return json_({ ok: true, app: 'Sistema Tickets TFCA', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    if (req.key !== CFG.API_KEY) throw new Error('Clave API inválida');
    const fn = ACTIONS[req.action];
    if (!fn) throw new Error('Acción desconocida: ' + req.action);
    return json_({ ok: true, data: fn(req) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

const ACTIONS = {
  ping: () => ({ pong: true }),

  modules: () => readAll_('Modulos').map(m => m.nombre),

  list: () => ({
    tickets: readAll_('Tickets'),
    seguimiento: readAll_('Seguimiento'),
    checklist: readAll_('Checklist').map(normCheck_),
    modulos: readAll_('Modulos').map(m => m.nombre)
  }),

  get: r => {
    const t = readAll_('Tickets').find(x => x.id === r.id);
    if (!t) throw new Error('Ticket no encontrado');
    return {
      ticket: t,
      seguimiento: readAll_('Seguimiento').filter(x => x.ticketId === r.id),
      checklist: readAll_('Checklist').filter(x => x.ticketId === r.id).map(normCheck_),
      modulos: readAll_('Modulos').map(m => m.nombre)
    };
  },

  create: r => withLock_(() => {
    const user = needUser_(r);
    if (!String(r.titulo || '').trim()) throw new Error('El título es obligatorio');
    const now = iso_();
    const max = readAll_('Tickets').reduce((m, t) => Math.max(m, parseInt(String(t.id).replace(/\D/g, ''), 10) || 0), 0);
    const t = {
      id: CFG.ID_PREFIX + String(max + 1).padStart(4, '0'),
      titulo: clean_(r.titulo, 140), descripcion: clean_(r.descripcion, 20000),
      prioridad: r.prioridad || 'Media', categoria: r.categoria || 'Otro',
      estado: 'pendiente', asignados: list_(r.asignados).join(','),
      creadoPor: user, creado: now, actualizado: now,
      fechaLimite: due_(r.fechaLimite), cerrado: '', cerradoPor: '',
      modulos: mods_(r.modulos, user).join(',')
    };
    append_('Tickets', t);
    log_(t.id, user, 'creó el ticket');
    (r.checklist || []).forEach(txt => append_('Checklist', { id: uid_('c'), ticketId: t.id, texto: clean_(txt, 200), hecho: 'FALSE', autor: user, fecha: now, hechoPor: '' }));
    return t;
  }),

  update: r => withLock_(() => {
    const user = needUser_(r);
    const t = readAll_('Tickets').find(x => x.id === r.id);
    if (!t) throw new Error('Ticket no encontrado');
    const f = r.fields || {}, patch = {}, logs = [];
    const name = u => u; // el front traduce usuario → nombre

    if ('asignados' in f) {
      const prev = list_(t.asignados), next = list_(f.asignados);
      next.filter(x => prev.indexOf(x) < 0).forEach(x => logs.push('agregó a ' + name(x)));
      prev.filter(x => next.indexOf(x) < 0).forEach(x => logs.push('quitó a ' + name(x)));
      patch.asignados = next.join(',');
    }
    if ('estado' in f && f.estado !== t.estado) {
      if (!ESTADOS[f.estado]) throw new Error('Estado inválido');
      if (f.estado === 'cerrado') { patch.cerrado = iso_(); patch.cerradoPor = user; logs.push('cerró el ticket'); }
      else if (t.estado === 'cerrado') { patch.cerrado = ''; patch.cerradoPor = ''; logs.push('reabrió el ticket (' + ESTADOS[f.estado] + ')'); }
      else logs.push('cambió el estado a ' + ESTADOS[f.estado]);
      patch.estado = f.estado;
    }
    if ('modulos' in f) {
      const next = mods_(f.modulos, user).join(',');
      if (next !== t.modulos) { patch.modulos = next; logs.push('cambió módulos a: ' + next.split(',').join(', ')); }
    }
    if ('fechaLimite' in f) f.fechaLimite = due_(f.fechaLimite);
    ['titulo', 'descripcion', 'prioridad', 'categoria', 'fechaLimite'].forEach(k => {
      if (k in f && String(f[k]) !== String(t[k])) {
        patch[k] = clean_(f[k], k === 'descripcion' ? 20000 : 140);
        if (k === 'prioridad') logs.push('cambió la prioridad a ' + f[k]);
        if (k === 'fechaLimite') {
          const fmt = v => String(v).replace('T', ' ');
          logs.push(!f[k] ? 'quitó la fecha límite' : t[k] ? 'reprogramó la fecha límite de ' + fmt(t[k]) + ' a ' + fmt(f[k]) : 'fijó fecha límite ' + fmt(f[k]));
        }
        if (k === 'titulo' || k === 'descripcion') logs.indexOf('editó el ticket') < 0 && logs.push('editó el ticket');
      }
    });
    patch.actualizado = iso_();
    updateRow_('Tickets', t.id, patch);
    logs.forEach(txt => log_(t.id, user, txt));
    return Object.assign({}, t, patch);
  }),

  addEntry: r => withLock_(() => {
    const user = needUser_(r);
    if (TIPOS.indexOf(r.tipo) < 0) throw new Error('Tipo inválido');
    const t = readAll_('Tickets').find(x => x.id === r.ticketId);
    if (!t) throw new Error('Ticket no encontrado');
    const e = { id: uid_('e'), ticketId: t.id, tipo: r.tipo, autor: user, texto: clean_(r.texto, 45000), lenguaje: r.lenguaje || '', fileId: '', fileName: '', mime: '', url: '', fecha: iso_() };
    if (r.file && r.file.base64) {
      const blob = Utilities.newBlob(Utilities.base64Decode(r.file.base64), r.file.mime || 'application/octet-stream', r.file.name || 'archivo');
      const file = ticketFolder_(t.id).createFile(blob);
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* dominio puede bloquearlo */ }
      e.fileId = file.getId(); e.fileName = file.getName(); e.mime = file.getMimeType(); e.url = file.getUrl();
    }
    append_('Seguimiento', e);
    updateRow_('Tickets', t.id, { actualizado: iso_() });
    return e;
  }),

  checkAdd: r => withLock_(() => {
    const user = needUser_(r);
    if (!String(r.texto || '').trim()) throw new Error('Texto vacío');
    const c = { id: uid_('c'), ticketId: r.ticketId, texto: clean_(r.texto, 200), hecho: 'FALSE', autor: user, fecha: iso_(), hechoPor: '' };
    append_('Checklist', c);
    return normCheck_(c);
  }),

  checkToggle: r => withLock_(() => {
    const user = needUser_(r);
    const patch = { hecho: r.hecho ? 'TRUE' : 'FALSE', hechoPor: r.hecho ? user : '' };
    if (!updateRow_('Checklist', r.id, patch)) throw new Error('Elemento no encontrado');
    return { id: r.id, hecho: !!r.hecho };
  }),

  /** Importación masiva (JSON de este sistema o de Trello, ya normalizado por el front) */
  import: r => withLock_(() => {
    const user = needUser_(r);
    const list = r.tickets || [];
    if (list.length > 100) throw new Error('Máximo 100 tickets por lote');
    let max = readAll_('Tickets').reduce((m, t) => Math.max(m, parseInt(String(t.id).replace(/\D/g, ''), 10) || 0), 0);
    const now = iso_(), T = [], S = [], C = [];
    list.forEach(x => {
      max++;
      const id = CFG.ID_PREFIX + String(max).padStart(4, '0');
      const estado = ESTADOS[x.estado] ? x.estado : 'pendiente';
      T.push({
        id: id, titulo: clean_(x.titulo || '(sin título)', 140), descripcion: clean_(x.descripcion, 20000),
        prioridad: x.prioridad || 'Media', categoria: x.categoria || 'Otro', estado: estado,
        asignados: list_(x.asignados).join(','), creadoPor: x.creadoPor || user,
        creado: x.creado || now, actualizado: x.actualizado || now, fechaLimite: due_(x.fechaLimite),
        cerrado: estado === 'cerrado' ? (x.cerrado || x.actualizado || now) : '',
        cerradoPor: estado === 'cerrado' ? (x.cerradoPor || user) : '',
        modulos: mods_(x.modulos, user).join(',')
      });
      (x.entries || []).forEach(e => {
        if (TIPOS.concat('sistema').indexOf(e.tipo) < 0) return;
        S.push({ id: uid_('e'), ticketId: id, tipo: e.tipo, autor: e.autor || user, texto: clean_(e.texto, 45000), lenguaje: e.lenguaje || '', fileId: e.fileId || '', fileName: e.fileName || '', mime: e.mime || '', url: e.url || '', fecha: e.fecha || now });
      });
      S.push({ id: uid_('e'), ticketId: id, tipo: 'sistema', autor: user, texto: 'importó el ticket' + (x.origen ? ' desde ' + x.origen : ''), fecha: now });
      (x.checklist || []).forEach(c => C.push({ id: uid_('c'), ticketId: id, texto: clean_(c.texto, 200), hecho: c.hecho ? 'TRUE' : 'FALSE', autor: c.autor || user, fecha: c.fecha || now, hechoPor: c.hecho ? (c.hechoPor || user) : '' }));
    });
    appendMany_('Tickets', T); appendMany_('Seguimiento', S); appendMany_('Checklist', C);
    return { count: T.length, ids: T.map(t => t.id) };
  }),

  moduleAdd: r => withLock_(() => {
    const user = needUser_(r);
    const n = modName_(r.nombre);
    return { nombre: ensureModule_(n, user) };
  }),

  checkDelete: r => withLock_(() => {
    needUser_(r);
    const sh = sheet_('Checklist');
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (let i = ids.length - 1; i >= 1; i--) if (String(ids[i][0]) === r.id) { sh.deleteRow(i + 1); break; }
    return { id: r.id };
  })
};

/* ======================= Helpers de datos ======================= */
function ss_() { return CFG.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
const SHEET_CACHE_ = {};
/** Devuelve la hoja; si no existe la crea, y agrega columnas nuevas al encabezado (ej. "modulos") */
function sheet_(name) {
  if (SHEET_CACHE_[name]) return SHEET_CACHE_[name];
  const ss = ss_(), cols = SHEETS[name];
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < cols.length) {
    if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
  }
  return (SHEET_CACHE_[name] = sh);
}
function readAll_(name) {
  const sh = sheet_(name), cols = SHEETS[name];
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, cols.length).getValues()
    .filter(row => row[0] !== '')
    .map(row => {
      const o = {};
      cols.forEach((c, i) => {
        let v = row[i];
        if (v instanceof Date) {
          if (c === 'fechaLimite') {
            const tz = Session.getScriptTimeZone();
            v = Utilities.formatDate(v, tz, (v.getHours() || v.getMinutes()) ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
          } else v = v.toISOString();
        }
        v = String(v);
        if (/^'[=+\-@]/.test(v)) v = v.slice(1);
        o[c] = v;
      });
      return o;
    });
}
function append_(name, obj) { appendMany_(name, [obj]); }
function appendMany_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name), cols = SHEETS[name];
  const row = sh.getLastRow() + 1;
  const extra = row + objs.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra + 200);
  sh.getRange(row, 1, objs.length, cols.length)
    .setNumberFormat('@')
    .setValues(objs.map(o => cols.map(c => o[c] === undefined || o[c] === null ? '' : String(o[c]))));
}
function updateRow_(name, id, patch) {
  const sh = sheet_(name), cols = SHEETS[name];
  const last = sh.getLastRow(); if (last < 2) return false;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      const r = sh.getRange(i + 2, 1, 1, cols.length), row = r.getValues()[0];
      Object.keys(patch).forEach(k => { const c = cols.indexOf(k); if (c >= 0) row[c] = String(patch[k]); });
      r.setValues([row]);
      return true;
    }
  }
  return false;
}
function log_(ticketId, user, texto) {
  append_('Seguimiento', { id: uid_('e'), ticketId: ticketId, tipo: 'sistema', autor: user, texto: texto, fecha: iso_() });
}
/* ---- Módulos (etiquetas) ---- */
function modName_(v) {
  const n = String(v || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!n) throw new Error('Nombre de módulo vacío');
  return n;
}
function ensureModule_(n, user) {
  if (n.toLowerCase() === CFG.MODULO_DEFAULT.toLowerCase()) return CFG.MODULO_DEFAULT;
  const found = readAll_('Modulos').find(m => m.nombre.toLowerCase() === n.toLowerCase());
  if (found) return found.nombre;
  append_('Modulos', { nombre: n, creadoPor: user, fecha: iso_() });
  return n;
}
/** Normaliza la lista de módulos de un ticket, crea los nuevos y aplica el default */
function mods_(v, user) {
  let list = list_(v).map(x => { try { return ensureModule_(modName_(x), user); } catch (e) { return ''; } }).filter(String);
  list = list.filter((x, i) => list.indexOf(x) === i);
  if (list.length > 1) list = list.filter(x => x !== CFG.MODULO_DEFAULT);
  return list.length ? list : [CFG.MODULO_DEFAULT];
}
function normCheck_(c) { return Object.assign({}, c, { hecho: String(c.hecho).toUpperCase() === 'TRUE' }); }

/* ======================= Drive ======================= */
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(CFG.FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(CFG.FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}
function ticketFolder_(ticketId) {
  const root = folder_(), it = root.getFoldersByName(ticketId);
  return it.hasNext() ? it.next() : root.createFolder(ticketId);
}

/* ======================= Utilidades ======================= */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function needUser_(r) {
  const u = String(r.user || '').trim();
  if (!u) throw new Error('Inicia sesión para realizar esta acción');
  if (CFG.USERS.length && CFG.USERS.indexOf(u) < 0) throw new Error('Usuario no autorizado');
  return u;
}
function list_(v) {
  const a = Array.isArray(v) ? v : String(v || '').split(',');
  const out = [];
  a.map(s => String(s).trim()).filter(String).forEach(s => { if (out.indexOf(s) < 0) out.push(s); });
  return out;
}
function clean_(v, max) {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas en la hoja
  return s.slice(0, max || 1000);
}
/** Fecha límite válida: '' | 'AAAA-MM-DD' | 'AAAA-MM-DDTHH:mm' (hora local del equipo) */
function due_(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!m) throw new Error('Fecha límite inválida: ' + s);
  return m[2] ? m[1] + 'T' + m[2] : m[1];
}
function iso_() { return new Date().toISOString(); }
function uid_(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
