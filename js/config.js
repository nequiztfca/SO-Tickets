/* ============================================================
 *  config.js  —  "ENV" del proyecto (Sistema Tickets TFCA)
 *  Es el único archivo que debes editar para configurar.
 *  ⚠ Seguridad básica: este archivo es público en GitHub Pages.
 * ============================================================ */
window.ENV = {
  APP_NAME: 'Sistema Tickets TFCA',

  // URL del Web App de Google Apps Script (termina en /exec).
  // Mientras diga "PEGA_AQUI..." el sistema funciona en MODO DEMO
  // (datos guardados solo en este navegador) para que puedas probarlo.
  API_URL: 'https://script.google.com/macros/s/AKfycbybuT-30foyKlw33guip4oQkueA4tzWC9PYIxi0jTIPOIy9S9IAS0DZeHYCIerzzcuQ/exec',

  // Debe ser IGUAL a CFG.API_KEY en Code.gs
  API_KEY: 'tfca-2026-cambia-esta-clave',

  SESSION_DAYS: 3,        // días que dura la sesión en localStorage
  CLOSED_VISIBLE: 20,     // cerrados visibles en el tablero (el resto se agrupa)
  REFRESH_SECONDS: 60,    // auto-actualización del tablero
  MAX_FILE_MB: 10,        // tamaño máximo por archivo adjunto

  CATEGORIAS: ['Soporte', 'Desarrollo', 'Bug', 'Mejora', 'Infraestructura', 'Otro'],
  PRIORIDADES: ['Baja', 'Media', 'Alta', 'Crítica'],

  // Usuarios genéricos (5 personas). Cambia nombres y contraseñas a tu gusto.
  // role: 'admin' puede gestionar cualquier ticket.
  USERS: [
    { user: 'nexNekiz@',  pass: 'Tfca2026!', name: 'nekiz', color: '#4f46e5', role: 'admin' },
    { user: 'Brandom12@', pass: 'Tfca2026!', name: 'Brandom', color: '#0891b2', role: 'user' },
    { user: 'Edd234'    , pass: 'Tfca2026!', name: 'Edwin', color: '#16a34a', role: 'user' },
    { user: 'nantoree:)', pass: 'Tfca2026!', name: 'Nancy', color: '#d97706', role: 'user' },
    { user: 'usuario5'  , pass: 'Tfca2026!', name: 'Usuario 5', color: '#db2777', role: 'user' }
  ]
};