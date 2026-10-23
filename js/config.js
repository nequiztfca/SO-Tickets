/* ============================================================
 *  config.js — configuración común de las páginas TFCA
 *    · paginas/areas.html    (Sistemas y Módulos)
 *    · paginas/tablero.html  (Tablero de accesos)
 *  Es el único archivo que debes editar para conectar y manejar usuarios.
 *  ⚠ Seguridad básica: este archivo es público en GitHub Pages.
 * ============================================================ */
window.ENV = {
  APP_NAME: 'Sistemas TFCA',

  // Un solo Apps Script (SistemasTFCA.gs + TableroTFCA.gs) y una sola hoja para las dos páginas.
  // Mientras diga "PEGA_AQUI..." ambas páginas funcionan en modo demo (datos en este navegador).
  SISTEMAS_API_URL: 'PEGA_AQUI_EL_EXEC_DE_SISTEMAS',
  SISTEMAS_API_KEY: 'tfca-sistemas-2026-cambia-esta-clave',   // = CFG.API_KEY de SistemasTFCA.gs

  SESSION_DAYS: 3,        // días que dura la sesión en este navegador
  REFRESH_SECONDS: 60,    // cada cuánto el Tablero busca cambios

  // Usuarios (5 personas). Sin sesión las páginas se ven en solo lectura; con sesión se edita.
  // rol: "tipo de persona" para filtrar en Sistemas.
  // Si cambias un "user", cámbialo también en CFG.USERS de SistemasTFCA.gs.
  USERS: [
    { user: 'nexNekiz@',  pass: 'Tfca2026!', name: 'nekiz',     color: '#4f46e5', role: 'admin', rol: 'Líder' },
    { user: 'Brandom12@', pass: 'Tfca2026!', name: 'Brandom',   color: '#0891b2', role: 'user',  rol: 'Desarrollo' },
    { user: 'Edd234',     pass: 'Tfca2026!', name: 'Edwin',     color: '#16a34a', role: 'user',  rol: 'Desarrollo' },
    { user: 'nantoree:)', pass: 'Tfca2026!', name: 'Nancy',     color: '#d97706', role: 'user',  rol: 'QA' },
    { user: 'usuario5',   pass: 'Tfca2026!', name: 'Usuario 5', color: '#db2777', role: 'user',  rol: 'Soporte' }
  ]
};
