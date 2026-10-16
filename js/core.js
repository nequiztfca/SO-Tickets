/* ============================================================
 *  core.js — Compartido por todas las páginas
 *   · Auth    : login genérico con sesión de 3 días (localStorage)
 *   · Api     : MODELO → habla con Google Apps Script (o modo demo)
 *   · Header  : VISTA compartida (navbar + botón Login)
 *   · UI      : utilidades de vista (fechas, avatares, modales, código)
 * ============================================================ */
(function () {
  'use strict';
  const ENV = window.ENV;
  const SKEY = 'tfca_session';
  const DEMO_KEY = 'tfca_demo_db';

  /* ---------------------------- Utilidades ---------------------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const splitList = v => Array.isArray(v) ? v.filter(Boolean) : String(v || '').split(',').map(s => s.trim()).filter(Boolean);
  const nowIso = () => new Date().toISOString();
  const uid = p => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ------------------------------- Auth ------------------------------- */
  const Auth = {
    login(user, pass) {
      const u = ENV.USERS.find(x => x.user.toLowerCase() === String(user).trim().toLowerCase() && x.pass === pass);
      if (!u) return null;
      const s = { user: u.user, name: u.name, role: u.role || 'user', exp: Date.now() + ENV.SESSION_DAYS * 864e5 };
      localStorage.setItem(SKEY, JSON.stringify(s));
      return s;
    },
    logout() { localStorage.removeItem(SKEY); },
    current() {
      try {
        const s = JSON.parse(localStorage.getItem(SKEY));
        if (!s || Date.now() > s.exp) { localStorage.removeItem(SKEY); return null; }
        return s;
      } catch { return null; }
    },
    isLogged() { return !!this.current(); },
    /** Puede gestionar: admin, creador o asignado. Si nadie está asignado, cualquiera puede tomarlo. */
    canManage(t) {
      const s = this.current();
      if (!s || !t) return false;
      const asig = splitList(t.asignados);
      return s.role === 'admin' || t.creadoPor === s.user || asig.includes(s.user) || asig.length === 0;
    }
  };

  /* ------------------- Modo DEMO (backend en localStorage) ------------------- */
  const Demo = {
    db() {
      let d;
      try { d = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch { d = null; }
      if (!d) { d = this.seed(); this.save(d); }
      return d;
    },
    save(d) {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)); }
      catch { throw new Error('Espacio del modo demo lleno. Usa archivos más pequeños o conecta Google Drive.'); }
    },
    seed() {
      const t = (n, h) => new Date(Date.now() - h * 36e5).toISOString();
      const d = { seq: 3, tickets: [], seguimiento: [], checklist: [] };
      d.tickets.push(
        { id: 'TFCA-0001', titulo: 'Bienvenido al Sistema Tickets TFCA', descripcion: 'Este es un ticket de ejemplo (modo demo). Inicia sesión con usuario1 / Tfca2026! para probar.', prioridad: 'Media', categoria: 'Soporte', estado: 'proceso', asignados: 'usuario1,usuario2', creadoPor: 'usuario1', creado: t(0, 30), actualizado: t(0, 2), fechaLimite: '', cerrado: '', cerradoPor: '' },
        { id: 'TFCA-0002', titulo: 'Revisar reporte mensual', descripcion: 'Validar cifras del reporte antes de enviarlo.', prioridad: 'Alta', categoria: 'Desarrollo', estado: 'pendiente', asignados: '', creadoPor: 'usuario3', creado: t(0, 5), actualizado: t(0, 5), fechaLimite: '', cerrado: '', cerradoPor: '' },
        { id: 'TFCA-0003', titulo: 'Configurar impresora del área', descripcion: 'La impresora no aparece en red.', prioridad: 'Baja', categoria: 'Infraestructura', estado: 'cerrado', asignados: 'usuario4', creadoPor: 'usuario2', creado: t(0, 72), actualizado: t(0, 20), fechaLimite: '', cerrado: t(0, 20), cerradoPor: 'usuario4' }
      );
      d.seguimiento.push(
        { id: uid('e'), ticketId: 'TFCA-0001', tipo: 'comentario', autor: 'usuario2', texto: 'Ya revisé la configuración inicial, todo bien 👍', lenguaje: '', fileId: '', fileName: '', mime: '', url: '', fecha: t(0, 3) },
        { id: uid('e'), ticketId: 'TFCA-0001', tipo: 'codigo', autor: 'usuario1', texto: "function saludo(nombre) {\n  return `Hola ${nombre}`;\n}\nconsole.log(saludo('TFCA'));", lenguaje: 'javascript', fileId: '', fileName: '', mime: '', url: '', fecha: t(0, 2) },
        { id: uid('e'), ticketId: 'TFCA-0003', tipo: 'comentario', autor: 'usuario4', texto: 'Se reinstaló el driver y quedó funcionando.', lenguaje: '', fileId: '', fileName: '', mime: '', url: '', fecha: t(0, 20) }
      );
      d.checklist.push(
        { id: uid('c'), ticketId: 'TFCA-0001', texto: 'Leer la guía README', hecho: true, autor: 'usuario1', fecha: t(0, 30), hechoPor: 'usuario1' },
        { id: uid('c'), ticketId: 'TFCA-0001', texto: 'Configurar Google Apps Script', hecho: false, autor: 'usuario1', fecha: t(0, 30), hechoPor: '' }
      );
      return d;
    },
    async handle(action, r, s) {
      await new Promise(res => setTimeout(res, 150));
      const d = this.db();
      const need = () => { if (!s) throw new Error('Inicia sesión'); return s.user; };
      const find = id => { const t = d.tickets.find(x => x.id === id); if (!t) throw new Error('Ticket no encontrado'); return t; };
      const log = (ticketId, user, texto) => d.seguimiento.push({ id: uid('e'), ticketId, tipo: 'sistema', autor: user, texto, lenguaje: '', fileId: '', fileName: '', mime: '', url: '', fecha: nowIso() });
      let out;
      switch (action) {
        case 'list': return JSON.parse(JSON.stringify({ tickets: d.tickets, seguimiento: d.seguimiento, checklist: d.checklist }));
        case 'get': {
          const t = find(r.id);
          return JSON.parse(JSON.stringify({ ticket: t, seguimiento: d.seguimiento.filter(e => e.ticketId === t.id), checklist: d.checklist.filter(c => c.ticketId === t.id) }));
        }
        case 'create': {
          const u = need(); d.seq++;
          const t = { id: 'TFCA-' + String(d.seq).padStart(4, '0'), titulo: r.titulo, descripcion: r.descripcion || '', prioridad: r.prioridad || 'Media', categoria: r.categoria || 'Otro', estado: 'pendiente', asignados: splitList(r.asignados).join(','), creadoPor: u, creado: nowIso(), actualizado: nowIso(), fechaLimite: r.fechaLimite || '', cerrado: '', cerradoPor: '' };
          d.tickets.push(t);
          log(t.id, u, 'creó el ticket');
          (r.checklist || []).forEach(x => d.checklist.push({ id: uid('c'), ticketId: t.id, texto: x, hecho: false, autor: u, fecha: nowIso(), hechoPor: '' }));
          out = t; break;
        }
        case 'update': {
          const u = need(); const t = find(r.id); const f = r.fields || {};
          Logic.applyUpdate(t, f, u, txt => log(t.id, u, txt));
          out = t; break;
        }
        case 'addEntry': {
          const u = need(); const t = find(r.ticketId);
          const e = { id: uid('e'), ticketId: t.id, tipo: r.tipo, autor: u, texto: r.texto || '', lenguaje: r.lenguaje || '', fileId: '', fileName: '', mime: '', url: '', fecha: nowIso() };
          if (r.file) { e.fileId = uid('f'); e.fileName = r.file.name; e.mime = r.file.mime; e.url = 'data:' + r.file.mime + ';base64,' + r.file.base64; }
          d.seguimiento.push(e); t.actualizado = nowIso();
          out = e; break;
        }
        case 'checkAdd': {
          const u = need(); find(r.ticketId);
          out = { id: uid('c'), ticketId: r.ticketId, texto: r.texto, hecho: false, autor: u, fecha: nowIso(), hechoPor: '' };
          d.checklist.push(out); break;
        }
        case 'checkToggle': {
          const u = need(); const c = d.checklist.find(x => x.id === r.id); if (!c) throw new Error('Elemento no encontrado');
          c.hecho = !!r.hecho; c.hechoPor = c.hecho ? u : ''; out = c; break;
        }
        case 'checkDelete': {
          need(); d.checklist = d.checklist.filter(x => x.id !== r.id); out = { id: r.id }; break;
        }
        case 'import': {
          const u = need(); const ids = [];
          (r.tickets || []).forEach(x => {
            d.seq++; const id = 'TFCA-' + String(d.seq).padStart(4, '0'); ids.push(id);
            const estado = Logic.ESTADOS[x.estado] ? x.estado : 'pendiente';
            d.tickets.push({ id, titulo: x.titulo || '(sin título)', descripcion: x.descripcion || '', prioridad: x.prioridad || 'Media', categoria: x.categoria || 'Otro', estado, asignados: splitList(x.asignados).join(','), creadoPor: x.creadoPor || u, creado: x.creado || nowIso(), actualizado: x.actualizado || nowIso(), fechaLimite: x.fechaLimite || '', cerrado: estado === 'cerrado' ? (x.cerrado || x.actualizado || nowIso()) : '', cerradoPor: estado === 'cerrado' ? (x.cerradoPor || u) : '' });
            (x.entries || []).forEach(e => d.seguimiento.push({ id: uid('e'), ticketId: id, tipo: e.tipo, autor: e.autor || u, texto: e.texto || '', lenguaje: e.lenguaje || '', fileId: e.fileId || '', fileName: e.fileName || '', mime: e.mime || '', url: e.url || '', fecha: e.fecha || nowIso() }));
            log(id, u, 'importó el ticket' + (x.origen ? ' desde ' + x.origen : ''));
            (x.checklist || []).forEach(c => d.checklist.push({ id: uid('c'), ticketId: id, texto: c.texto, hecho: !!c.hecho, autor: c.autor || u, fecha: c.fecha || nowIso(), hechoPor: c.hecho ? (c.hechoPor || u) : '' }));
          });
          out = { count: ids.length, ids }; break;
        }
        default: throw new Error('Acción desconocida: ' + action);
      }
      this.save(d);
      return JSON.parse(JSON.stringify(out));
    }
  };

  /* Lógica de actualización (misma regla que Code.gs) */
  const Logic = {
    ESTADOS: { pendiente: 'Pendiente', proceso: 'En proceso', cerrado: 'Cerrado' },
    applyUpdate(t, f, user, log) {
      const name = u => (ENV.USERS.find(x => x.user === u) || { name: u }).name;
      if ('asignados' in f) {
        const prev = splitList(t.asignados), next = [...new Set(splitList(f.asignados))];
        next.filter(x => !prev.includes(x)).forEach(x => log('agregó a ' + name(x)));
        prev.filter(x => !next.includes(x)).forEach(x => log('quitó a ' + name(x)));
        t.asignados = next.join(',');
      }
      if ('estado' in f && f.estado !== t.estado) {
        if (!this.ESTADOS[f.estado]) throw new Error('Estado inválido');
        if (f.estado === 'cerrado') { t.cerrado = nowIso(); t.cerradoPor = user; log('cerró el ticket'); }
        else if (t.estado === 'cerrado') { t.cerrado = ''; t.cerradoPor = ''; log('reabrió el ticket (' + this.ESTADOS[f.estado] + ')'); }
        else log('cambió el estado a ' + this.ESTADOS[f.estado]);
        t.estado = f.estado;
      }
      ['titulo', 'descripcion', 'prioridad', 'categoria', 'fechaLimite'].forEach(k => {
        if (k in f && f[k] !== t[k]) {
          if (k === 'prioridad') log('cambió la prioridad a ' + f[k]);
          if (k === 'fechaLimite') log(f[k] ? 'fijó fecha límite ' + f[k] : 'quitó la fecha límite');
          t[k] = f[k];
        }
      });
      t.actualizado = nowIso();
    }
  };

  /* ------------------------------ Api (Modelo) ------------------------------ */
  const isDemo = () => !ENV.API_URL || /^PEGA/i.test(ENV.API_URL);
  const Api = {
    isDemo,
    async call(action, data = {}) {
      const s = Auth.current();
      if (isDemo()) return Demo.handle(action, data, s);
      let res;
      try {
        // text/plain evita el "preflight" CORS con Apps Script
        res = await fetch(ENV.API_URL, { method: 'POST', body: JSON.stringify({ action, key: ENV.API_KEY, user: s ? s.user : '', ...data }) });
      } catch (e) { throw new Error('No se pudo conectar con el servidor (Apps Script).'); }
      let json;
      try { json = await res.json(); } catch { throw new Error('Respuesta inválida del servidor. ¿La URL del Web App es correcta y pública?'); }
      if (!json.ok) throw new Error(json.error || 'Error del servidor');
      return json.data;
    },
    list: () => Api.call('list'),
    get: id => Api.call('get', { id }),
    create: t => Api.call('create', t),
    update: (id, fields) => Api.call('update', { id, fields }),
    addEntry: e => Api.call('addEntry', e),
    checkAdd: (ticketId, texto) => Api.call('checkAdd', { ticketId, texto }),
    checkToggle: (id, hecho) => Api.call('checkToggle', { id, hecho }),
    checkDelete: id => Api.call('checkDelete', { id })
  };

  /* ------------------------------- UI helpers ------------------------------- */
  const PRIO = { 'Baja': 'secondary', 'Media': 'info', 'Alta': 'warning', 'Crítica': 'danger' };
  const LANGS = ['plaintext', 'javascript', 'typescript', 'html', 'css', 'json', 'sql', 'python', 'java', 'csharp', 'php', 'bash', 'powershell', 'xml', 'yaml', 'vbnet'];

  const UI = {
    esc, splitList, LANGS,
    PRIO,
    ESTADOS: Logic.ESTADOS,
    user(u) { return ENV.USERS.find(x => x.user === u) || { user: u, name: u || '—', color: '#6c757d' }; },
    initials(name) { return String(name).split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase(); },
    avatar(u, size = 26) {
      const x = this.user(u);
      return `<span class="avatar" style="--av:${x.color};width:${size}px;height:${size}px;font-size:${Math.round(size * .42)}px" title="${esc(x.name)}">${esc(this.initials(x.name))}</span>`;
    },
    avatars(list, size) { return splitList(list).map(u => this.avatar(u, size)).join(''); },
    prioBadge(p) { return `<span class="badge text-bg-${PRIO[p] || 'secondary'}">${esc(p || 'Media')}</span>`; },
    fmtDate(iso, withTime = true) {
      if (!iso) return '—';
      const d = new Date(iso); if (isNaN(d)) return esc(iso);
      return d.toLocaleString('es-MX', withTime ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' });
    },
    ago(iso) {
      if (!iso) return '';
      const s = (Date.now() - new Date(iso)) / 1000;
      if (s < 60) return 'hace un momento';
      if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
      if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
      if (s < 86400 * 30) return `hace ${Math.floor(s / 86400)} d`;
      return this.fmtDate(iso, false);
    },
    isOverdue(t) {
      if (!t.fechaLimite || t.estado === 'cerrado') return false;
      return new Date(t.fechaLimite + 'T23:59:59') < new Date();
    },
    /** Columna del tablero a la que pertenece un ticket */
    column(t) {
      if (t.estado === 'cerrado') return 'cerrado';
      if (!splitList(t.asignados).length) return 'sinasignar';
      return t.estado === 'proceso' ? 'proceso' : 'pendiente';
    },
    toast(msg, type = 'success') {
      let wrap = document.getElementById('toastWrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; wrap.className = 'toast-container position-fixed bottom-0 end-0 p-3'; document.body.appendChild(wrap); }
      const el = document.createElement('div');
      el.className = `toast align-items-center text-bg-${type} border-0`;
      el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
      wrap.appendChild(el);
      const t = new bootstrap.Toast(el, { delay: 3500 }); t.show();
      el.addEventListener('hidden.bs.toast', () => el.remove());
    },
    /** Modal reutilizable */
    modal(title, html, { size = 'lg', footer = '' } = {}) {
      let el = document.getElementById('uiModal');
      if (!el) {
        el = document.createElement('div'); el.id = 'uiModal'; el.className = 'modal fade'; el.tabIndex = -1;
        el.innerHTML = `<div class="modal-dialog modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"></div><div class="modal-footer d-none"></div></div></div>`;
        document.body.appendChild(el);
      }
      el.querySelector('.modal-dialog').className = `modal-dialog modal-dialog-scrollable modal-${size}`;
      el.querySelector('.modal-title').innerHTML = title;
      el.querySelector('.modal-body').innerHTML = html;
      const f = el.querySelector('.modal-footer'); f.innerHTML = footer; f.classList.toggle('d-none', !footer);
      const m = bootstrap.Modal.getOrCreateInstance(el); m.show();
      this.highlight(el);
      return { el, modal: m };
    },
    isModalOpen() { return !!document.querySelector('.modal.show'); },
    /* ---- Archivos ---- */
    isImage(e) { return /^image\//.test(e.mime || '') || e.tipo === 'imagen'; },
    fileUrl(e) { return e.url || (e.fileId ? `https://drive.google.com/file/d/${e.fileId}/view` : '#'); },
    thumbUrl(e) {
      if ((e.url || '').startsWith('data:')) return e.url;
      return e.fileId ? `https://drive.google.com/thumbnail?id=${e.fileId}&sz=w1600` : e.url;
    },
    fileIcon(e) {
      const m = e.mime || '', n = (e.fileName || '').toLowerCase();
      if (/pdf/.test(m) || n.endsWith('.pdf')) return 'bi-file-earmark-pdf text-danger';
      if (/sheet|excel|csv/.test(m) || /\.(xlsx?|csv)$/.test(n)) return 'bi-file-earmark-excel text-success';
      if (/word|document/.test(m) || /\.docx?$/.test(n)) return 'bi-file-earmark-word text-primary';
      if (/zip|compressed/.test(m) || /\.(zip|rar|7z)$/.test(n)) return 'bi-file-earmark-zip text-warning';
      if (/^image\//.test(m)) return 'bi-file-earmark-image text-info';
      return 'bi-file-earmark text-secondary';
    },
    fileToPayload(file) {
      return new Promise((resolve, reject) => {
        if (file.size > ENV.MAX_FILE_MB * 1048576) return reject(new Error(`"${file.name}" supera ${ENV.MAX_FILE_MB} MB`));
        const r = new FileReader();
        r.onload = () => resolve({ name: file.name || ('imagen-' + Date.now() + '.png'), mime: file.type || 'application/octet-stream', base64: String(r.result).split(',')[1], size: file.size });
        r.onerror = () => reject(new Error('No se pudo leer el archivo'));
        r.readAsDataURL(file);
      });
    },
    /* ---- Código ---- */
    codeBlock(code, lang) {
      const l = LANGS.includes(lang) ? lang : 'plaintext';
      return `<div class="code-wrap"><div class="code-bar"><span><i class="bi bi-code-slash"></i> ${esc(l)}</span><button class="btn btn-sm btn-link text-reset p-0 btn-copy" type="button" title="Copiar"><i class="bi bi-clipboard"></i> Copiar</button></div><pre><code class="language-${l}">${esc(code)}</code></pre></div>`;
    },
    highlight(root = document) {
      if (window.hljs) root.querySelectorAll('pre code:not(.hljs)').forEach(el => hljs.highlightElement(el));
    },
    /** HTML de un elemento de seguimiento (timeline) */
    entryHtml(e) {
      const u = this.user(e.autor);
      if (e.tipo === 'sistema') {
        // Reemplaza usuarios por nombres (acepta símbolos como @ o :) en el usuario)
        const txt = ENV.USERS.slice().sort((a, b) => b.user.length - a.user.length)
          .reduce((s, x) => s.split(x.user).join(x.name), String(e.texto));
        return `<div class="tl-item tl-system"><i class="bi bi-dot"></i><span><b>${esc(u.name)}</b> ${esc(txt)} · <span class="text-body-secondary" title="${this.fmtDate(e.fecha)}">${this.ago(e.fecha)}</span></span></div>`;
      }
      let body = '';
      if (e.tipo === 'comentario') body = `<div class="tl-text">${esc(e.texto)}</div>`;
      else if (e.tipo === 'codigo') body = this.codeBlock(e.texto, e.lenguaje);
      else if (e.tipo === 'imagen') body = `<a href="#" class="img-thumb" data-img="${esc(this.thumbUrl(e))}" data-full="${esc(this.fileUrl(e))}" data-name="${esc(e.fileName)}"><img src="${esc(this.thumbUrl(e))}" alt="${esc(e.fileName)}" loading="lazy" referrerpolicy="no-referrer"></a>${e.texto ? `<div class="small mt-1">${esc(e.texto)}</div>` : ''}`;
      else body = `<a class="file-chip" href="${esc(this.fileUrl(e))}" target="_blank" rel="noopener"><i class="bi ${this.fileIcon(e)} fs-4"></i><span>${esc(e.fileName || 'archivo')}</span><i class="bi bi-box-arrow-up-right small"></i></a>`;
      return `<div class="tl-item"><div class="tl-avatar">${this.avatar(e.autor, 32)}</div><div class="tl-card"><div class="tl-head"><b>${esc(u.name)}</b><span class="text-body-secondary small" title="${this.fmtDate(e.fecha)}">${this.ago(e.fecha)}</span></div>${body}</div></div>`;
    },
    /** Delegación global: copiar código y ver imagen grande */
    bindGlobal() {
      document.addEventListener('click', ev => {
        const cp = ev.target.closest('.btn-copy');
        if (cp) {
          const code = cp.closest('.code-wrap').querySelector('code').innerText;
          navigator.clipboard.writeText(code).then(() => { cp.innerHTML = '<i class="bi bi-check2"></i> Copiado'; setTimeout(() => cp.innerHTML = '<i class="bi bi-clipboard"></i> Copiar', 1500); });
          return;
        }
        const im = ev.target.closest('.img-thumb');
        if (im) {
          ev.preventDefault();
          UI.modal(`<i class="bi bi-image"></i> ${esc(im.dataset.name || 'Imagen')}`,
            `<div class="text-center"><img src="${im.dataset.img}" class="img-fluid rounded" referrerpolicy="no-referrer"></div>`,
            { size: 'xl', footer: `<a class="btn btn-outline-primary" target="_blank" rel="noopener" href="${im.dataset.full}"><i class="bi bi-box-arrow-up-right"></i> Abrir original</a>` });
        }
      });
    }
  };

  /* --------------------- Exportar / Importar (JSON y Trello) --------------------- */
  const truthy = v => v === true || v === 'TRUE' || v === 'true';
  const Transfer = {
    async exportJson() {
      try {
        const d = await Api.list();
        const out = { app: ENV.APP_NAME, format: 'tfca-export', version: 1, exportedAt: nowIso(), exportedBy: Auth.current()?.user || '', ...d };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
        a.download = `tickets-tfca-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        UI.toast(`Exportados ${d.tickets.length} tickets`);
      } catch (e) { UI.toast(e.message, 'danger'); }
    },

    /** Detecta el formato y devuelve tickets normalizados */
    parse(json, { archived = false } = {}) {
      if (Array.isArray(json.tickets)) return { format: 'Sistema Tickets TFCA', ...this.fromTfca(json) };
      if (Array.isArray(json.cards) && Array.isArray(json.lists)) return { format: 'Trello' + (json.name ? ` · ${json.name}` : ''), ...this.fromTrello(json, archived) };
      throw new Error('Formato no reconocido. Usa un JSON exportado de este sistema o de un tablero de Trello.');
    },

    fromTfca(d) {
      const group = (a, k) => (a || []).reduce((m, x) => ((m[x[k]] ||= []).push(x), m), {});
      const seg = group(d.seguimiento, 'ticketId'), chk = group(d.checklist, 'ticketId');
      const tickets = d.tickets.map(t => ({
        titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad, categoria: t.categoria, estado: t.estado,
        asignados: splitList(t.asignados), creadoPor: t.creadoPor, creado: t.creado, actualizado: t.actualizado,
        fechaLimite: t.fechaLimite, cerrado: t.cerrado, cerradoPor: t.cerradoPor, origen: t.id,
        entries: (seg[t.id] || []).map(e => ({ tipo: e.tipo, autor: e.autor, texto: e.texto, lenguaje: e.lenguaje, fileId: e.fileId, fileName: e.fileName, mime: e.mime, url: e.url, fecha: e.fecha })),
        checklist: (chk[t.id] || []).map(c => ({ texto: c.texto, hecho: truthy(c.hecho), autor: c.autor, fecha: c.fecha, hechoPor: c.hechoPor }))
      }));
      return { tickets, unmatched: [] };
    },

    fromTrello(b, archived) {
      const lists = Object.fromEntries((b.lists || []).map(l => [l.id, l]));
      const members = Object.fromEntries((b.members || []).map(m => [m.id, m]));
      const unmatched = new Set();
      const match = id => {
        const m = members[id]; if (!m) return null;
        const keys = [m.username, m.fullName].filter(Boolean).map(s => s.toLowerCase());
        const u = ENV.USERS.find(x => keys.includes(x.user.toLowerCase()) || keys.includes(x.name.toLowerCase()));
        if (!u) unmatched.add(m.fullName || m.username);
        return u ? u.user : null;
      };
      const mName = (id, fb) => members[id]?.fullName || members[id]?.username || fb?.fullName || 'Trello';
      const estadoOf = c => {
        const ln = (lists[c.idList]?.name || '').toLowerCase();
        if (c.closed || c.dueComplete || /(done|hecho|cerrad|terminad|complet|finaliz|listo|resuelt)/.test(ln)) return 'cerrado';
        if (/(progress|proceso|doing|curso|haciendo|trabajando)/.test(ln)) return 'proceso';
        return 'pendiente';
      };
      const fromId = id => { const s = parseInt(String(id).slice(0, 8), 16); return s ? new Date(s * 1000).toISOString() : nowIso(); };
      const me = Auth.current()?.user || '';
      const comments = {};
      (b.actions || []).filter(a => a.type === 'commentCard' && a.data?.card?.id).forEach(a => (comments[a.data.card.id] ||= []).push(a));
      const checks = {};
      (b.checklists || []).forEach(cl => (checks[cl.idCard] ||= []).push(cl));

      const cards = (b.cards || []).filter(c => archived || (!c.closed && !lists[c.idList]?.closed));
      const tickets = cards.map(c => {
        const labels = (c.labels || []).map(l => l.name).filter(Boolean);
        const cat = ENV.CATEGORIAS.find(x => labels.some(l => l.toLowerCase() === x.toLowerCase())) || 'Otro';
        const lj = labels.join(' ').toLowerCase();
        const prio = /cr[ií]tic|urgent|bloque/.test(lj) ? 'Crítica' : /alta|high/.test(lj) ? 'Alta' : /baja|low/.test(lj) ? 'Baja' : 'Media';
        const asig = (c.idMembers || []).map(match).filter(Boolean);
        const notes = [];
        if (labels.length) notes.push('Etiquetas Trello: ' + labels.join(', '));
        const otherMembers = (c.idMembers || []).filter(id => !match(id)).map(id => mName(id));
        if (otherMembers.length) notes.push('Miembros Trello: ' + otherMembers.join(', '));
        notes.push('Lista Trello: ' + (lists[c.idList]?.name || '—'));
        const estado = estadoOf(c);
        const entries = (comments[c.id] || []).slice().sort((x, y) => String(x.date).localeCompare(String(y.date))).map(a => {
          const u = match(a.idMemberCreator);
          return { tipo: 'comentario', autor: u || me, texto: (u ? '' : `(${mName(a.idMemberCreator, a.memberCreator)} en Trello) `) + (a.data.text || ''), fecha: a.date };
        });
        (c.attachments || []).forEach(at => entries.push({ tipo: 'archivo', autor: me, texto: '', fileName: at.name || at.url, mime: at.mimeType || '', url: at.url, fecha: at.date || fromId(c.id) }));
        const cls = checks[c.id] || [];
        const checklist = cls.flatMap(cl => (cl.checkItems || []).slice().sort((x, y) => x.pos - y.pos)
          .map(it => ({ texto: (cls.length > 1 ? `[${cl.name}] ` : '') + it.name, hecho: it.state === 'complete' })));
        return {
          titulo: c.name, descripcion: [c.desc, notes.join('\n')].filter(Boolean).join('\n\n'),
          prioridad: prio, categoria: cat, estado, asignados: asig, creadoPor: me,
          creado: fromId(c.id), actualizado: c.dateLastActivity || fromId(c.id),
          fechaLimite: c.due ? String(c.due).slice(0, 10) : '',
          cerrado: estado === 'cerrado' ? (c.dateLastActivity || nowIso()) : '', cerradoPor: estado === 'cerrado' ? (asig[0] || me) : '',
          origen: 'Trello', entries, checklist
        };
      });
      return { tickets, unmatched: [...unmatched], archivedCount: (b.cards || []).length - (b.cards || []).filter(c => !c.closed && !lists[c.idList]?.closed).length };
    },

    openImport() {
      let json = null, parsed = null;
      const { el, modal } = UI.modal('<i class="bi bi-upload"></i> Importar tickets', `
        <p class="small text-body-secondary mb-2">Acepta un <b>JSON exportado de este sistema</b> o el <b>JSON de un tablero de Trello</b>
        (en Trello: Menú del tablero → Imprimir, exportar y compartir → Exportar como JSON).
        Los tickets se agregan con IDs nuevos; no se borra nada.</p>
        <input type="file" accept=".json,application/json" class="form-control" id="impFile">
        <div class="form-check mt-2 d-none" id="impArchWrap"><input class="form-check-input" type="checkbox" id="impArch"><label class="form-check-label small" for="impArch">Incluir tarjetas archivadas</label></div>
        <div id="impInfo" class="mt-3 small"></div>
        <div class="progress mt-2 d-none" id="impProg"><div class="progress-bar" style="width:0%"></div></div>`,
        { size: 'md', footer: '<button class="btn btn-light border" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary" id="btnDoImport" disabled><i class="bi bi-upload"></i> Importar</button>' });
      const $ = s => el.querySelector(s);
      const preview = () => {
        try {
          parsed = this.parse(json, { archived: $('#impArch').checked });
          const by = parsed.tickets.reduce((m, t) => (m[t.estado] = (m[t.estado] || 0) + 1, m), {});
          $('#impArchWrap').classList.toggle('d-none', !parsed.archivedCount);
          $('#impInfo').innerHTML = `<div class="alert alert-light border mb-0">
            <div><b>Formato:</b> ${esc(parsed.format)}</div>
            <div><b>Tickets:</b> ${parsed.tickets.length} · Pendientes ${by.pendiente || 0} · En proceso ${by.proceso || 0} · Cerrados ${by.cerrado || 0}</div>
            ${parsed.archivedCount ? `<div class="text-body-secondary">${parsed.archivedCount} tarjeta(s) archivada(s) ${$('#impArch').checked ? 'incluidas' : 'omitidas'}</div>` : ''}
            ${parsed.unmatched.length ? `<div class="text-warning-emphasis mt-1"><i class="bi bi-exclamation-triangle"></i> Sin usuario equivalente (quedan como nota): ${esc(parsed.unmatched.join(', '))}</div>` : ''}
          </div>`;
          $('#btnDoImport').disabled = !parsed.tickets.length;
        } catch (e) { parsed = null; $('#btnDoImport').disabled = true; $('#impInfo').innerHTML = `<div class="text-danger">${esc(e.message)}</div>`; }
      };
      $('#impFile').addEventListener('change', async ev => {
        const f = ev.target.files[0]; if (!f) return;
        try { json = JSON.parse(await f.text()); preview(); }
        catch { $('#impInfo').innerHTML = '<div class="text-danger">El archivo no es un JSON válido.</div>'; $('#btnDoImport').disabled = true; }
      });
      $('#impArch').addEventListener('change', preview);
      $('#btnDoImport').addEventListener('click', async () => {
        const list = parsed.tickets, size = 20, bar = $('#impProg .progress-bar');
        $('#btnDoImport').disabled = true; $('#impFile').disabled = true; $('#impProg').classList.remove('d-none');
        let done = 0;
        try {
          for (let i = 0; i < list.length; i += size) {
            const r = await Api.call('import', { tickets: list.slice(i, i + size) });
            done += r.count; bar.style.width = Math.round(done / list.length * 100) + '%';
          }
          modal.hide(); UI.toast(`${done} tickets importados`);
          setTimeout(() => location.reload(), 800);
        } catch (e) {
          $('#impInfo').insertAdjacentHTML('beforeend', `<div class="text-danger mt-2">Error tras ${done} ticket(s): ${esc(e.message)}</div>`);
        }
      });
    }
  };

  /* ------------------------------ Header (Vista) ------------------------------ */
  const Header = {
    render(active = '') {
      const s = Auth.current();
      const host = document.getElementById('app-header') || document.body.insertBefore(document.createElement('div'), document.body.firstChild);
      const daysLeft = s ? Math.max(1, Math.ceil((s.exp - Date.now()) / 864e5)) : 0;
      const link = (href, key, icon, text) => `<li class="nav-item"><a class="nav-link ${active === key ? 'active fw-semibold' : ''}" href="${href}"><i class="bi ${icon}"></i> ${text}</a></li>`;
      host.innerHTML = `
      <nav class="navbar navbar-expand-md bg-body border-bottom sticky-top shadow-sm app-nav">
        <div class="container-fluid">
          <a class="navbar-brand d-flex align-items-center gap-2 me-auto me-md-3" href="index.html">
            <span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>
            <span class="fw-semibold"><span class="d-none d-sm-inline">Sistema </span>Tickets <span class="text-primary">TFCA</span></span>
          </a>
          <div class="d-flex align-items-center gap-2 order-md-last">
            ${Api.isDemo() ? '<span class="badge rounded-pill text-bg-warning d-none d-sm-inline" title="Sin conexión a Drive: los datos se guardan solo en este navegador">MODO DEMO</span>' : ''}
            <span class="small text-body-secondary d-none d-md-inline me-1" title="Hoy"><i class="bi bi-calendar3 me-1"></i>${new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}</span>
            <button class="btn btn-sm btn-outline-secondary" id="btnTheme" title="Tema claro/oscuro"><i class="bi bi-circle-half"></i></button>
            ${s ? `
              <div class="dropdown">
                <button class="btn btn-sm btn-light border dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                  ${UI.avatar(s.user, 22)}<span class="d-none d-sm-inline">${esc(s.name)}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><span class="dropdown-item-text small text-body-secondary">Sesión expira en ${daysLeft} día(s)</span></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><button class="dropdown-item" id="btnExport"><i class="bi bi-download me-1"></i> Exportar (JSON)</button></li>
                  <li><button class="dropdown-item" id="btnImport"><i class="bi bi-upload me-1"></i> Importar (JSON / Trello)</button></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><button class="dropdown-item text-danger" id="btnLogout"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</button></li>
                </ul>
              </div>` : `<button class="btn btn-sm btn-primary" id="btnLogin"><i class="bi bi-box-arrow-in-right"></i> Login</button>`}
            <button class="navbar-toggler btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#navMain"><span class="navbar-toggler-icon"></span></button>
          </div>
          <div class="collapse navbar-collapse" id="navMain">
            <ul class="navbar-nav me-auto">
              ${link('index.html', 'tablero', 'bi-kanban', 'Tablero')}
              ${s ? link('nuevo.html', 'nuevo', 'bi-plus-circle', 'Nuevo ticket') : ''}
            </ul>
          </div>
        </div>
      </nav>`;
      this.ensureLoginModal();
      document.getElementById('btnLogin')?.addEventListener('click', () => this.openLogin());
      document.getElementById('btnLogout')?.addEventListener('click', () => { Auth.logout(); location.reload(); });
      document.getElementById('btnExport')?.addEventListener('click', () => Transfer.exportJson());
      document.getElementById('btnImport')?.addEventListener('click', () => Transfer.openImport());
      document.getElementById('btnTheme').addEventListener('click', () => {
        const t = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', t); localStorage.setItem('tfca_theme', t);
      });
      UI.bindGlobal();
    },
    ensureLoginModal() {
      if (document.getElementById('loginModal')) return;
      const el = document.createElement('div');
      el.id = 'loginModal'; el.className = 'modal fade'; el.tabIndex = -1;
      el.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm"><form class="modal-content" id="loginForm" autocomplete="on">
        <div class="modal-header"><h5 class="modal-title"><i class="bi bi-shield-lock"></i> Iniciar sesión</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <div class="mb-3"><label class="form-label">Usuario</label><input class="form-control" name="user" required autocomplete="username" placeholder="usuario1"></div>
          <div class="mb-2"><label class="form-label">Contraseña</label>
            <div class="input-group"><input class="form-control" type="password" name="pass" required autocomplete="current-password">
            <button class="btn btn-outline-secondary" type="button" id="togglePass"><i class="bi bi-eye"></i></button></div></div>
          <div class="text-danger small d-none" id="loginErr">Usuario o contraseña incorrectos</div>
          <div class="form-text">La sesión dura ${ENV.SESSION_DAYS} días en este navegador.</div>
        </div>
        <div class="modal-footer"><button class="btn btn-primary w-100" type="submit">Entrar</button></div>
      </form></div>`;
      document.body.appendChild(el);
      el.querySelector('#togglePass').onclick = () => { const i = el.querySelector('[name=pass]'); i.type = i.type === 'password' ? 'text' : 'password'; };
      el.querySelector('#loginForm').addEventListener('submit', ev => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        if (Auth.login(f.get('user'), f.get('pass'))) location.reload();
        else el.querySelector('#loginErr').classList.remove('d-none');
      });
      el.addEventListener('shown.bs.modal', () => el.querySelector('[name=user]').focus());
    },
    openLogin() { this.ensureLoginModal(); bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show(); }
  };

  // Tema guardado (se aplica lo antes posible)
  const savedTheme = localStorage.getItem('tfca_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-bs-theme', savedTheme);

  window.TFCA = { ENV, Auth, Api, UI, Header, Transfer };
})();
