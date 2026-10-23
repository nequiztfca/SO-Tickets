/* =====================================================================
 *  Catálogo de Sistemas y Subsistemas (módulos) — TFCA
 *  Se usa en areas.html → "Importar catálogo". Solo se puede importar
 *  cuando la hoja de Google Sheets todavía no tiene sistemas ni módulos.
 *
 *  Formato: JSON válido asignado a window.CATALOGO_SISTEMAS, así también
 *  se puede elegir este archivo desde el botón de importar.
 * ===================================================================== */
window.CATALOGO_SISTEMAS = {
  "version": 1,
  "sistemas": [
    { "id": 1, "nombre": "OFICIALIA DE PARTES",      "folder": "OFICIALIA",          "orden": 3, "estatus": 1, "fecha_alta": "2025-10-09 17:10:01" },
    { "id": 2, "nombre": "ADMINISTRACIÓN OFICIALIA", "folder": "ADMIN_OFICIALIA",    "orden": 2, "estatus": 1, "fecha_alta": "2026-01-13 16:39:59" },
    { "id": 3, "nombre": "REPORTES OFICIALIA",       "folder": "REPORTES_OFICIALIA", "orden": 4, "estatus": 1, "fecha_alta": "2026-01-29 16:28:35" },
    { "id": 4, "nombre": "ADMINISTRACIÓN",           "folder": "ADMIN",              "orden": 1, "estatus": 1, "fecha_alta": "2026-02-20 15:34:45" },
    { "id": 5, "nombre": "ARCHIVO",                  "folder": "ARCHIVO",            "orden": 5, "estatus": 1, "fecha_alta": "2026-03-02 19:05:29" },
    { "id": 6, "nombre": "BUZONES",                  "folder": "BUZONES",            "orden": 6, "estatus": 1, "fecha_alta": "2026-06-02 14:50:26" }
  ],
  "subsistemas": [
    { "id": 1,  "id_sistema": 1, "nombre": "ALTA DE PROMOCIONES",              "archivo_subsistema": "alta_promociones.html",                "orden": 1, "estatus": 1, "fecha_alta": "2025-10-09 17:10:40" },
    { "id": 2,  "id_sistema": 1, "nombre": "BÚSQUEDA DE TURNOS",               "archivo_subsistema": "busqueda_turnos.html",                 "orden": 4, "estatus": 1, "fecha_alta": "2025-11-12 17:20:06" },
    { "id": 3,  "id_sistema": 1, "nombre": "BÚSQUEDA PROMOCIONES",             "archivo_subsistema": "busqueda_promociones.html",            "orden": 3, "estatus": 1, "fecha_alta": "2025-10-09 17:10:40" },
    { "id": 4,  "id_sistema": 1, "nombre": "CERTIFICACION DE EXPEDIENTES",     "archivo_subsistema": "certificaciones.html",                 "orden": 5, "estatus": 1, "fecha_alta": "2025-11-25 17:15:31" },
    { "id": 5,  "id_sistema": 6, "nombre": "BUZÓN DE TURNOS",                  "archivo_subsistema": "buzon_turnos.html",                    "orden": 6, "estatus": 1, "fecha_alta": "2026-01-20 18:19:28" },
    { "id": 6,  "id_sistema": 1, "nombre": "ALTA MASIVA PROMOCIONES",          "archivo_subsistema": "alta_masiva.html",                     "orden": 2, "estatus": 1, "fecha_alta": "2026-01-06 17:15:31" },
    { "id": 7,  "id_sistema": 2, "nombre": "VALIDACIÓN DE CERTIFICACIONES",    "archivo_subsistema": "valida_cert.html",                     "orden": 1, "estatus": 1, "fecha_alta": "2026-01-13 16:41:10" },
    { "id": 8,  "id_sistema": 3, "nombre": "PROMOCIONES INGRESADAS",           "archivo_subsistema": "reporte_promociones_ingresadas.html",  "orden": 1, "estatus": 1, "fecha_alta": "2026-01-29 16:30:11" },
    { "id": 9,  "id_sistema": 2, "nombre": "CONSULTA GENERAL DE PROMOCIONES",  "archivo_subsistema": "historico_promociones.html",           "orden": 2, "estatus": 1, "fecha_alta": "2026-02-11 18:52:04" },
    { "id": 10, "id_sistema": 4, "nombre": "GESTIÓN DE SALAS",                 "archivo_subsistema": "gestion_salas_promociones.html",       "orden": 1, "estatus": 1, "fecha_alta": "2026-02-20 15:17:02" },
    { "id": 11, "id_sistema": 5, "nombre": "ALTA DE EXPEDIENTES",              "archivo_subsistema": "alta_expedientes.html",                "orden": 1, "estatus": 1, "fecha_alta": "2026-03-03 15:37:20" },
    { "id": 12, "id_sistema": 5, "nombre": "CAPTURA DE EXPEDIENTES",           "archivo_subsistema": "captura_expedientes.html",             "orden": 2, "estatus": 1, "fecha_alta": "2026-03-05 16:50:54" },
    { "id": 13, "id_sistema": 5, "nombre": "LIBRO DE GOBIERNO",                "archivo_subsistema": "libro_gobierno.html",                  "orden": 3, "estatus": 1, "fecha_alta": "2026-03-19 15:40:54" },
    { "id": 14, "id_sistema": 5, "nombre": "FORMACIÓN DE EXPEDIENTES",         "archivo_subsistema": "formacion_expedientes.html",           "orden": 4, "estatus": 1, "fecha_alta": "2026-03-31 15:40:54" },
    { "id": 15, "id_sistema": 5, "nombre": "BÚSQUEDA DE EXPEDIENTES FORMADOS", "archivo_subsistema": "busqueda_expedientes_formados.html",   "orden": 5, "estatus": 1, "fecha_alta": "2026-05-13 15:51:40" }
  ]
};
