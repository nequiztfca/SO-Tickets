# Sistemas TFCA

Dos páginas para GitHub Pages (HTML + Bootstrap 5 por CDN + JavaScript puro) con **un solo Apps Script**
(dos archivos .gs) y **una sola hoja de cálculo de Google**:

- **Sistemas y Módulos** (`paginas/areas.html`): bitácora por Sistema → Módulo (subsistema) → Card.
  Vistas *Sistemas* (con *Recientes*), *Histórico* y el detalle de cada módulo en columnas o filas.
- **Tablero de accesos** (`paginas/tablero.html`): áreas, roles, empleados y permisos por módulo.

**Acceso:** las dos páginas se ven de forma pública en **solo lectura**. Con **Login** (la misma sesión para
ambas) se puede agregar, editar, mover y borrar. El servidor rechaza cualquier cambio sin un usuario válido.

Sin `SISTEMAS_API_URL` en `js/config.js`, ambas funcionan como demo en el navegador.

---

## Estructura

```
/
├── index.html                    → Redirige a paginas/areas.html (GitHub Pages necesita un index en la raíz)
├── js/config.js                  → Configuración común: URL /exec, clave y usuarios
├── paginas/areas.html            → Sistemas y Módulos (bitácora)
├── paginas/tablero.html          → Tablero de accesos
├── paginas/catalogo_sistemas.js  → Tus tablas de sistemas y subsistemas para importar
├── paginas/cuadernos.html        → Página de ejemplo (ya no está enlazada; puedes borrarla)
├── apps-script/SistemasTFCA.gs   → Backend común (archivo 1 de 2)
└── apps-script/TableroTFCA.gs    → Backend del Tablero (archivo 2 de 2, mismo proyecto)
```

## Hojas de cálculo

| Hoja | La usa | Qué guarda |
|---|---|---|
| **Sistemas** | ambas | sistemas = "módulos" del Tablero (`id, nombre, folder, orden, estatus, fecha_alta, descripcion, spd, color`) |
| **Modulos** | ambas | subsistemas (`id, id_sistema, nombre, archivo_subsistema, orden, estatus, fecha_alta`) |
| Cards, Bloques, Checklist, Comentarios, Notificaciones | Sistemas | bitácora |
| AREAS, ROLES, EMPLEADOS, PERMISOS | Tablero | accesos (`PERMISOS.id_modulo` = id del sistema) |

Un cambio de nombre, folder u orden de un sistema, o de un subsistema, se ve en las dos páginas.
No se puede borrar un sistema con subsistemas ni un subsistema con cards; al borrar un sistema se quitan sus permisos.

## Conectar (desde cero)

1. Crea una **hoja de cálculo nueva** en Google Drive.
2. Extensiones → Apps Script: pega `SistemasTFCA.gs` en el archivo existente y crea otro
   (botón **+ → Secuencia de comandos**) llamado `TableroTFCA` con `TableroTFCA.gs`.
3. Ejecuta **`setup`** (en SistemasTFCA.gs): crea las 11 hojas y la carpeta de archivos en Drive.
4. Implementar → Aplicación web → Ejecutar como **Yo**, acceso **Cualquier usuario** → copia la URL `/exec`.
5. En `js/config.js` pega la URL en **`SISTEMAS_API_URL`**. `SISTEMAS_API_KEY` debe ser igual a `CFG.API_KEY`.
6. Entra a **Sistemas**, haz Login y usa **Importar catálogo** (solo con la hoja vacía; pide confirmación).
7. En **Accesos**, con sesión, usa *Datos → Importar JSON* para áreas, roles, empleados y permisos.
   Los módulos no se importan: se toman de la hoja Sistemas.

Si cambias el código: Implementar → Administrar implementaciones → ✏ → Versión: Nueva versión (la URL no cambia).

## Usuarios

Los 5 de `js/config.js` (`USERS`). Si cambias un `user`, cámbialo también en `CFG.USERS` de SistemasTFCA.gs.
Seguridad básica a propósito: `config.js` es público en GitHub Pages.

## Funciones de Sistemas y Módulos

- Sistemas en vista blog, ordenables arrastrando; módulos arrastrables dentro de cada sistema.
- **Recientes** (oculto de forma predeterminada): las últimas 5 cards de cualquier subsistema, con enlace a Histórico.
- **Histórico**: las últimas 30 cards y un buscador en todos los sistemas (título, texto, código, archivos, #hashtag, persona, #ID).
- Cards tipo blog con texto, código (resaltado), archivos (a Drive, máx. 10 MB), hashtags, personas, prioridad,
  checklist y comentarios; filtros por tipo de elemento, hashtag, persona, tipo de persona y prioridad.
- Métricas abiertas en Sistemas y plegadas (solo la barra de colores) dentro de un sistema o módulo.
- Campanita de notificaciones al asignar, comentar o cambiar de estado; tema claro/oscuro y vista guardados en el navegador.
