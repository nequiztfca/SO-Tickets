/**
 * ============================================================
 *  Tablero de accesos TFCA — Backend en Google Apps Script  (archivo 2 de 2)
 *  Va en el MISMO proyecto que SistemasTFCA.gs (misma hoja, misma URL /exec).
 *  Usa CFG, ss_(), withLock_(), needUser_(), readAll_() y json_() de SistemasTFCA.gs,
 *  por eso aquí todo lleva el prefijo TB_ / tb (Apps Script comparte nombres entre archivos).
 *
 *  Hojas propias del tablero: AREAS, ROLES, EMPLEADOS, PERMISOS
 *  Hojas compartidas (las administra SistemasTFCA.gs):
 *    Sistemas → "módulos" del tablero (PERMISOS.id_modulo = Sistemas.id)
 *    Modulos  → subsistemas de cada sistema
 *  Los módulos y subsistemas se guardan con las acciones save / remove de SistemasTFCA.gs,
 *  así un cambio hecho aquí se ve en Sistemas y Módulos (y al revés).
 *
 *  Petición (POST, text/plain):  { action, key, user, data }
 *    action: 'tableroLeer' | 'tableroGuardar'   (más las de SistemasTFCA.gs)
 *  Respuesta: { ok:true, data } | { ok:false, error }
 *
 *  Cardinalidad:
 *    AREAS 1─N ROLES · AREAS 1─N EMPLEADOS · ROLES 1─N EMPLEADOS
 *    EMPLEADOS N─M SISTEMAS (módulos) mediante PERMISOS (id_usuario + id_modulo)
 * ============================================================
 */

const TB_HOJAS = {
  AREAS:     ['id', 'nombre', 'orden', 'color'],
  ROLES:     ['id', 'nombre', 'id_area', 'area', 'orden', 'color'],
  EMPLEADOS: ['id', 'usuario', 'nombre', 'paterno', 'materno', 'nombre_completo', 'id_rol', 'rol', 'id_area', 'area'],
  PERMISOS:  ['id_usuario', 'usuario', 'nombre_completo', 'id_modulo', 'modulo', 'consultar', 'insertar', 'actualizar', 'eliminar']
};

// Llaves foráneas: [pestaña, columna, pestaña origen]
const TB_RELACIONES = [
  ['ROLES',     'id_area',    'AREAS'],
  ['EMPLEADOS', 'id_rol',     'ROLES'],
  ['EMPLEADOS', 'id_area',    'AREAS'],
  ['PERMISOS',  'id_usuario', 'EMPLEADOS'],
  ['PERMISOS',  'id_modulo',  'Sistemas']            // los módulos del tablero son los sistemas
];
const TB_TEXTO = ['usuario', 'nombre', 'paterno', 'materno', 'nombre_completo', 'rol', 'area', 'modulo', 'color'];

const TB_ACTIONS = {
  tableroLeer: () => tbLeer_(),                        // lectura pública (solo vista)
  tableroGuardar: r => withLock_(() => tbGuardar_(r))
};

/* ======================= Instalación (la llama setup() de SistemasTFCA.gs) ======================= */
function setupTablero_(ss) {
  ss = ss || ss_();
  Object.keys(TB_HOJAS).forEach(k => {
    const cols = TB_HOJAS[k];
    const sh = ss.getSheetByName(k) || ss.insertSheet(k);
    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    tbEncabezado_(sh, cols.length);
  });
  tbValidaciones_(ss);
}

/* ======================= Lectura / escritura ======================= */
function tbLeer_() {
  const ss = ss_(), out = {};
  Object.keys(TB_HOJAS).forEach(k => {
    const sh = ss.getSheetByName(k);
    if (!sh || sh.getLastRow() < 2) { out[k] = []; return; }
    const valores = sh.getDataRange().getValues();
    const enc = valores.shift().map(h => String(h).trim().toLowerCase());
    out[k] = valores.filter(f => f.some(c => c !== '')).map(f => {
      const o = {}; enc.forEach((h, i) => { o[h] = f[i]; }); return o;
    });
  });
  // Compartidos con Sistemas y Módulos
  out.MODULOS = readAll_('sistemas');
  out.SUBSISTEMAS = readAll_('modulos');
  const cards = {};
  readAll_('cards').forEach(c => { cards[c.id_modulo] = (cards[c.id_modulo] || 0) + 1; });
  out.CARDS_POR_SUBSISTEMA = cards;
  return out;
}

/** Reescribe solo las hojas propias del tablero (nunca Sistemas ni Modulos) */
function tbGuardar_(r) {
  needUser_(r);
  const data = r.data || {};
  const ss = ss_();
  Object.keys(TB_HOJAS).forEach(k => {
    if (!Array.isArray(data[k])) return;                       // si no viene, no se toca
    const cols = TB_HOJAS[k];
    const filas = data[k];
    const sh = ss.getSheetByName(k) || ss.insertSheet(k);
    sh.clearContents();
    const valores = [cols].concat(filas.map(f => cols.map(c => f[c] === null || f[c] === undefined ? '' : f[c])));
    cols.forEach((c, i) => { if (TB_TEXTO.indexOf(c) >= 0) sh.getRange(1, i + 1, valores.length, 1).setNumberFormat('@'); });
    sh.getRange(1, 1, valores.length, cols.length).setValues(valores);
    tbEncabezado_(sh, cols.length);
  });
  tbValidaciones_(ss);
  return { guardado: new Date().toISOString(), por: r.user };
}

/** Al borrar un sistema (desde cualquiera de las dos páginas) se quitan sus permisos */
function tbQuitarPermisos_(idsSistema) {
  const sh = ss_().getSheetByName('PERMISOS');
  if (!sh || sh.getLastRow() < 2) return 0;
  const col = TB_HOJAS.PERMISOS.indexOf('id_modulo') + 1;
  const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  let n = 0;
  for (let i = vals.length - 1; i >= 0; i--) if (idsSistema.indexOf(Number(vals[i][0])) >= 0) { sh.deleteRow(i + 2); n++; }
  return n;
}

/** Validación de llaves foráneas (avisa sin bloquear pegados masivos) */
function tbValidaciones_(ss) {
  TB_RELACIONES.forEach(([hoja, campo, origen]) => {
    const sh = ss.getSheetByName(hoja), src = ss.getSheetByName(origen);
    if (!sh || !src) return;
    const c = TB_HOJAS[hoja].indexOf(campo) + 1;
    const regla = SpreadsheetApp.newDataValidation()
      .requireValueInRange(src.getRange('A2:A'), true).setAllowInvalid(true)
      .setHelpText('Debe ser un id existente en ' + origen).build();
    sh.getRange(2, c, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(regla);
  });
  const perm = ss.getSheetByName('PERMISOS');
  if (perm) {
    const regla = SpreadsheetApp.newDataValidation().requireNumberBetween(0, 2).setAllowInvalid(true)
      .setHelpText('0 = sin permiso, 1 = permiso, 2 = valor especial').build();
    perm.getRange(2, TB_HOJAS.PERMISOS.indexOf('consultar') + 1, Math.max(perm.getMaxRows() - 1, 1), 4).setDataValidation(regla);
  }
}

function tbEncabezado_(sh, n) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#1b5e20').setFontColor('#ffffff');
}
