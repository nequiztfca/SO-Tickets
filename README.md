# Sistema Tickets TFCA

Sistema de tickets ligero para un equipo de 5 personas.
**Frontend:** HTML + Bootstrap 5 (CDN) + JavaScript puro → se publica en **GitHub Pages**.
**Backend / BD:** Google Apps Script + Google Sheets, con adjuntos guardados en **Google Drive**.

> Mientras `API_URL` en `js/config.js` no esté configurada, el sistema corre en **MODO DEMO**
> (datos en el navegador) para que lo pruebes de inmediato.

---

## Estructura (MVC básico)

```
tickets-tfca/
├── index.html          → Tablero tipo Trello (lectura pública, edición con login)
├── nuevo.html          → Levantar ticket
├── ticket.html         → Detalle y seguimiento (comentarios, código, archivos, checklist)
├── css/app.css         → Estilos
├── js/config.js        → "ENV": URL del API, clave, usuarios y contraseñas
├── js/core.js          → Compartido: Header (vista), Auth, Api (modelo), utilidades
└── apps-script/Code.gs → Backend (pegar en Google Apps Script)
```

Cada página tiene su propio `<script>` organizado en **Model / View / Controller**.
Lo único compartido es el header (con el botón **Login**) y la capa de datos.

---

## 1. Configurar Google Drive (base de datos)

1. En Google Drive crea una **Hoja de cálculo** nueva: `Sistema Tickets TFCA - BD`.
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido de `Code.gs` y pega el de `apps-script/Code.gs`.
4. Cambia `CFG.API_KEY` por una clave propia (la misma irá en `js/config.js`).
5. Selecciona la función **`setup`** y presiona **Ejecutar**. Acepta los permisos
   (Google mostrará "app no verificada" → *Configuración avanzada → Ir a…*; es tu propio script).
   Esto crea automáticamente:
   - Hojas **Tickets**, **Seguimiento** y **Checklist** con sus encabezados.
   - La carpeta **Sistema Tickets TFCA - Adjuntos** en tu Drive (una subcarpeta por ticket).
6. **Implementar → Nueva implementación → ⚙ Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
7. Copia la URL que termina en `/exec`.

> Si modificas `Code.gs` después: **Implementar → Administrar implementaciones → ✏ → Versión: Nueva versión**.
> Así la URL se mantiene.

### Estructura de las hojas (las crea `setup()`)

| Hoja | Columnas |
|---|---|
| **Tickets** | id, titulo, descripcion, prioridad, categoria, estado (`pendiente`/`proceso`/`cerrado`), asignados (`usuario1,usuario3`), creadoPor, creado, actualizado, fechaLimite, cerrado, cerradoPor |
| **Seguimiento** | id, ticketId, tipo (`comentario`/`codigo`/`imagen`/`archivo`/`sistema`), autor, texto, lenguaje, fileId, fileName, mime, url, fecha |
| **Checklist** | id, ticketId, texto, hecho (TRUE/FALSE), autor, fecha, hechoPor |
| **Modulos** | nombre, creadoPor, fecha |

En **Tickets** también existe la columna `modulos` (ej. `Altas Masivas,Facturación`). Si tu hoja es anterior,
la columna y la hoja Modulos se agregan solas la primera vez que se usan.

"Sin asignar" no es un estado: es cualquier ticket abierto sin personas asignadas.

---

## 2. Configurar el frontend

Edita `js/config.js`:

```js
API_URL: 'https://script.google.com/macros/s/XXXX/exec',
API_KEY: 'la-misma-clave-que-en-Code.gs',
USERS: [ { user:'usuario1', pass:'Tfca2026!', name:'Usuario 1', ... }, ... ]
```

Si cambias los usuarios, actualiza también `CFG.USERS` en `Code.gs`.

**Usuarios por defecto:** `usuario1` … `usuario5`, contraseña `Tfca2026!` (`usuario1` es admin).

---

## 3. Publicar en GitHub Pages

1. Crea un repositorio y sube todo el contenido de la carpeta (sin `apps-script/` si prefieres).
2. **Settings → Pages → Branch: main / root → Save**.
3. Abre `https://TU-USUARIO.github.io/TU-REPO/`.

---

## Funciones

- **Tablero** con columnas *Sin asignar · Pendientes · En proceso · Cerrados*.
  Cerrados muestra los últimos 20; el resto se agrupa por mes en secciones colapsables.
- **Lectura pública**: sin login solo se ve. Las tarjetas muestran comentarios; código, imágenes
  y archivos aparecen como **iconos** que abren un modal.
- **Login** con sesión de **3 días** (localStorage).
- **Asignar a una o varias personas**; cualquier asignado puede **agregar o quitar colaboradores** y **cerrar** el ticket.
- **Input único de seguimiento**: comentario, **modo código** (resaltado con highlight.js, botón copiar,
  vista previa), adjuntos por botón, **arrastrar y soltar** o **pegar imágenes con Ctrl+V**.
- **Checklist** por ticket con barra de progreso; aviso si cierras con tareas pendientes.
- **Arrastrar tarjetas** entre columnas (con sesión). Si el ticket no tiene asignados, se asigna a quien lo mueve.
- Historial automático (quién cambió estado, agregó personas, etc.), filtros, búsqueda, "Solo mis tickets",
  KPIs, fechas límite con alerta de **vencido**, tema claro/oscuro y auto-actualización cada 60 s.
- **Métricas** (sección colapsable del tablero, respeta los filtros): tiempo promedio de cierre,
  creados/cerrados en 30 días, % de checklist, carga por persona, por categoría, por prioridad y actividad de 8 semanas.
- **Fecha de hoy** en el header.
- **Vencimientos**: la fecha límite acepta hora opcional. Las cards muestran **Vencido** (rojo) o un **reloj rojo**
  si vence en los próximos `DUE_SOON_DAYS` días (3 por defecto, en `config.js`).
  Filtro *Toda fecha límite* (vencidos, por vencer, con/sin fecha) y los indicadores **Vencidos** / **Por vencer**
  son clicables: muestran la lista y permiten **reprogramar** fecha y hora (o +1 día / +3 días / +1 semana).
  Al hacer clic en el reloj o en "Vencido" de una card se reprograma ese ticket. Queda registrado en el historial.
- **Módulos (etiquetas)**: cada ticket puede tener uno o varios. *Sin Asignar* es el valor por defecto y *Altas Masivas*
  viene precargado (`MODULOS_BASE` en `config.js`). Se crean nuevos desde *Nuevo ticket* o desde el detalle del ticket
  y se guardan en la hoja **Modulos** (se crea sola). Filtro *Todos los módulos* en el tablero y bloque en Métricas.
- **Menú Páginas** (solo en el tablero): se configura en `PAGINAS` dentro de `config.js`.
  Para activar una página nueva crea el archivo en `paginas/` y cambia su `estado` a `'activo'`.
  Las páginas de `paginas/` son independientes (no usan el header ni los scripts del sistema).
- **Exportar / Importar** (menú del usuario, con sesión iniciada):
  - Exportar descarga un `.json` con tickets, seguimiento y checklist (los adjuntos van como enlaces de Drive).
  - Importar acepta ese mismo `.json` o el **JSON de un tablero de Trello**. Siempre agrega tickets con IDs nuevos.
  - Trello → listas tipo *Done/Hecho* = Cerrado, *Doing/En proceso* = En proceso, el resto = Pendiente.
    Miembros se emparejan por usuario o nombre; etiquetas definen categoría y prioridad (*Urgente/Alta/Baja*);
    se importan descripción, fecha límite, checklists, comentarios y adjuntos (como enlace).
    Trello solo incluye en su exportación las ~1000 acciones más recientes (comentarios antiguos pueden faltar).

---

## Notas y límites

- **Seguridad básica (a propósito):** las contraseñas viven en `config.js`, visible en GitHub.
  La `API_KEY` solo evita escrituras de terceros casuales. No guardes información sensible.
- Adjuntos: máx. 10 MB por archivo (`MAX_FILE_MB`). Se comparten "cualquiera con el enlace" para
  poder mostrarlos; si tu dominio de Google Workspace lo bloquea, las miniaturas no se verán
  (el enlace sí, para usuarios con acceso).
- Una celda de Sheets admite ~50,000 caracteres: para código muy grande, adjúntalo como archivo.

## Mejoras sugeridas

1. **Notificaciones por correo** al asignar o comentar (`MailApp.sendEmail` en `Code.gs`, agregando email a cada usuario).
2. **Resumen diario** con un *trigger* de tiempo en Apps Script (tickets vencidos / sin asignar).
3. **@menciones** en comentarios que notifiquen a la persona.
4. **Etiquetas** libres y **plantillas** de ticket por categoría.
5. **Reportes**: tiempo promedio de cierre por persona/categoría (hoja extra con fórmulas o gráfica en el tablero).
6. **Archivado**: mover cerrados de más de 6 meses a una hoja `Archivo` para que el API siga rápido.
7. **Seguridad media** si algún día la necesitas: validar contraseña en Apps Script (hash en Script Properties) y emitir un token.
