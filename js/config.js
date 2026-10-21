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
  API_KEY: 'tfca-2026-cambia-esta-clave',   // Debe ser IGUAL a CFG.API_KEY en Code.gs

  TABLERO_API_URL: 'https://script.google.com/macros/s/AKfycbxsq8pTqvG2cllL5wuZ99ZIac88VhqUbx33vFPf5sHyxaKokNP53IiPUSNJIz6UgimXqQ/exec',
  TABLERO_API_KEY: 'tfca-tablero-2026',

  SESSION_DAYS: 3,        // días que dura la sesión en localStorage
  CLOSED_VISIBLE: 20,     // cerrados visibles en el tablero (el resto se agrupa)
  REFRESH_SECONDS: 60,    // auto-actualización del tablero
  MAX_FILE_MB: 10,        // tamaño máximo por archivo adjunto
  DUE_SOON_DAYS: 3,       // días antes del vencimiento para mostrar el reloj rojo en la card

  CATEGORIAS: ['Soporte', 'Desarrollo', 'Bug', 'Mejora', 'Infraestructura', 'Otro'],
  PRIORIDADES: ['Baja', 'Media', 'Alta', 'Crítica'],

  // Módulos (etiquetas) base. El primero es el valor por defecto.
  // Los que se creen desde la página se guardan en la hoja "Modulos".
  MODULOS_BASE: ['Sin Asignar', 'Altas Masivas'],

  // Menú "Páginas" del tablero (solo aparece en index.html).
  // Para agregar una página: copia un bloque, cambia los datos y pon estado: 'activo'.
  //   icono: nombre de Bootstrap Icons (https://icons.getbootstrap.com)
  //   estado: 'activo' | 'proximamente'
  PAGINAS: [
    { titulo: 'Cuadernos',            url: 'paginas/cuadernos.html',  icono: 'bi-journal-bookmark', estado: 'activo',       descripcion: 'Cuadernos del equipo' },
    { titulo: 'Tablero Areas',        url: 'paginas/tablero.html',    icono: 'bi-file-earmark-bar-graph', estado: 'activo' },
    { titulo: 'Base de conocimiento', url: 'paginas/conocimiento.html', icono: 'bi-lightbulb',        estado: 'proximamente' },
    { titulo: 'Calendario',           url: 'paginas/calendario.html',  icono: 'bi-calendar-week',    estado: 'proximamente' }
  ],

  // Usuarios genéricos (5 personas). Cambia nombres y contraseñas a tu gusto.
  // role: 'admin' puede gestionar cualquier ticket.
  USERS: [
    { user: 'nexNekiz@',  pass: 'Tfca2026!', name: 'nekiz',     color: '#4f46e5', role: 'admin' },
    { user: 'Brandom12@', pass: 'Tfca2026!', name: 'Brandom',   color: '#0891b2', role: 'user' },
    { user: 'Edd234',     pass: 'Tfca2026!', name: 'Edwin',     color: '#16a34a', role: 'user' },
    { user: 'nantoree:)', pass: 'Tfca2026!', name: 'Nancy',     color: '#d97706', role: 'user' },
    { user: 'usuario5',   pass: 'Tfca2026!', name: 'Usuario 5', color: '#db2777', role: 'user' }
  ]
};
