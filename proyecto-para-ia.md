# Bundle del Proyecto para IA

## Estructura de Archivos
- README.md
- css/estilos.css
- documentacion/LEEME.md
- iconos/icono-192.png
- iconos/icono-512.png
- iconos/icono-apple.png
- index.html
- js/principal.js
- manifest.webmanifest
- netlify/functions/bitacora.js
- servicio.js

---

## Código Fuente

### Archivo: `README.md`
```md
# Bitácora de proyectos

Página para llevar el registro de proyectos propios. Para cada uno guarda en qué fase está, una descripción, el link al sitio publicado y el repositorio de GitHub.

## Documentación

El manual de usuario está en [documentacion-central](https://github.com/FABIOR1981/documentacion-central/tree/main/bitacora-proyectos/documentacion) ([PDF](https://github.com/FABIOR1981/documentacion-central/blob/main/bitacora-proyectos/documentacion/MANUAL_USUARIO.pdf)). También se puede consultar desde la bitácora de proyectos.

## Funcionalidades

- **Listado de proyectos** con nombre, descripción, fase, link al sitio y link al repositorio.
- **Filtro por fase**: En producción, En desarrollo, Prototipo, En pausa e Idea. Cada filtro muestra cuántos proyectos tiene.
- **Orden** por nombre, ascendente o descendente.
- **Modo admin** protegido con contraseña, para crear, editar y borrar proyectos.
- **Repositorios privados**: si un proyecto se marca como privado, la dirección del repositorio se guarda cifrada (AES-GCM con clave derivada por PBKDF2), así que solo se ve en modo admin.
- Tema claro / oscuro.

## Cómo se usa

1. Abrí la página. Sin iniciar sesión, cualquiera puede ver los proyectos.
2. Para editar, tocá **Admin** e ingresá la contraseña.
3. Con **+ Nuevo** agregás un proyecto: nombre, descripción, repositorio, URL del sitio, fase y si el repositorio es privado.
4. **Guardar** sube los cambios. Quedan guardados para todos.
5. Para modificar o borrar un proyecto, tocá **Editar** en su tarjeta. El botón **Borrar** está dentro de esa ventana y pide confirmación.
6. **Docs** muestra los documentos del proyecto (de `documentacion-central`). Cada documento se abre con un enlace común, así que funciona también en el celular y en la app instalada. El enlace dura 15 minutos; si vence, volvé a tocar **Docs**.

## Cómo funciona

- El frontend es HTML, CSS y JavaScript, sin build.
- Los datos están en un archivo JSON (`bitacora/proyectos.json`) dentro de otro repositorio de GitHub (por defecto `FABIOR1981/bd`).
- El navegador nunca habla directo con GitHub. Pasa por la Netlify Function `netlify/functions/bitacora.js`, que es la única que conoce el token y que verifica la contraseña de admin antes de guardar.

## Publicación en Netlify

Configurar estas variables de entorno en Netlify:

| Variable | Para qué sirve |
|---|---|
| `GITHUB_TOKEN` | Token de GitHub con permiso de lectura y escritura sobre el repositorio de datos. |
| `CLAVE_ADMIN` | Contraseña del modo admin. |
| `GITHUB_TOKEN_DOCUMENTACION_CENTRAL` | Token de GitHub con permiso de lectura sobre `FABIOR1981/documentacion-central`, de donde el botón **Docs** toma la documentación de cada proyecto (`<repo>/documentacion/`). Si no está, se usa `GITHUB_TOKEN`. |
| `GITHUB_REPO` | Opcional. Repositorio donde está el JSON. Si no se define, se usa `FABIOR1981/bd`. |

## Estructura

```
index.html                     Página principal
css/estilos.css                Estilos
js/principal.js                Lógica de la página (listado, filtros, cifrado, modo admin)
netlify/functions/bitacora.js  Lee y guarda el JSON en GitHub
```

```

### Archivo: `css/estilos.css`
```css
:root {
  --bg: #e9e2d0;
  --sf: #f4efe2;
  --tx: #1d1b16;
  --mu: #5c5849;
  --bd: #d2c9b2;
  --ac: #1d1b16;
  --produccion: #136b2e;
  --desarrollo: #9a4506;
  --prototipo: #6d28d9;
  --pausa: #57534e;
  --idea: #0369a1;
  --fh: 'Bricolage Grotesque', system-ui, sans-serif;
  --fm: 'DM Mono', ui-monospace, monospace;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-tema=claro]) {
    --bg: #121110; --sf: #1c1b18; --tx: #f1eee6; --mu: #a29e92;
    --bd: #2f2d28; --ac: #f1eee6; --produccion: #4ade80;
    --desarrollo: #fbbf24; --prototipo: #a78bfa; --pausa: #a8a29e; --idea: #38bdf8;
    color-scheme: dark;
  }
}

:root[data-tema=oscuro] {
  --bg: #121110; --sf: #1c1b18; --tx: #f1eee6; --mu: #a29e92;
  --bd: #2f2d28; --ac: #f1eee6; --produccion: #4ade80;
  --desarrollo: #fbbf24; --prototipo: #a78bfa; --pausa: #a8a29e; --idea: #38bdf8;
  color-scheme: dark;
}

:root[data-tema=claro] {
  color-scheme: light;
}

* {
  box-sizing: border-box;
  margin: 0px;
}

[hidden] {
  display: none !important;
}

html {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  scrollbar-color: var(--bd) var(--bg);
  scrollbar-width: thin;
}

body {
  background-color: var(--bg);
  color: var(--tx);
  font-family: var(--fh);
  min-height: 100vh;
}

main {
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
  padding: 48px 24px 80px 24px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

h1 {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
  text-wrap: balance;
}

.sub {
  color: var(--mu);
  font-family: var(--fm);
  font-size: 0.85rem;
  margin-top: 14px;
  font-variant-numeric: tabular-nums;
}

.btn, .chip {
  background-color: var(--sf);
  border: 1px solid var(--bd);
  color: var(--tx);
  border-radius: 99px;
  padding: 8px 14px;
  font: 600 0.8rem var(--fh);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.acc {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn.on {
  background-color: var(--ac);
  color: var(--bg);
  border-color: var(--ac);
}

.btn.prim {
  background-color: var(--ac);
  color: var(--bg);
}

.barra {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 40px 0px 28px 0px;
  align-items: center;
}

input, select, textarea {
  background-color: var(--sf);
  border: 1px solid var(--bd);
  color: var(--tx);
  border-radius: 12px;
  padding: 11px 14px;
  font: 400 0.95rem var(--fh);
  width: 100%;
  caret-color: var(--ac);
}

input[type=checkbox] {
  accent-color: var(--ac);
}

#buscar {
  flex: 0 1 320px;
  min-width: 200px;
  width: auto;
}

:focus-visible {
  outline: 2px solid var(--ac);
  outline-offset: 2px;
}

.chip {
  background-color: transparent;
  color: var(--mu);
}

.chip[aria-pressed=true] {
  background-color: var(--ac);
  color: var(--bg);
  border-color: var(--ac);
}

#filtros {
  display: flex;
  gap: 6px;
  flex: 1 1 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

#filtros .chip {
  flex: none;
  padding: 7px 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.card {
  background-color: var(--sf);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.2s, border-color 0.2s;
  animation: ent 0.4s both;
  box-shadow: 0px 1px 0px color-mix(in srgb, var(--tx) 5%, transparent), 0px 14px 28px -22px color-mix(in srgb, var(--tx) 45%, transparent);
}

.card:hover {
  transform: translateY(-3px);
  border-color: var(--c);
  box-shadow: 0px 18px 34px -20px color-mix(in srgb, var(--c) 55%, transparent);
}

@keyframes ent {
  from { opacity: 0; transform: translateY(8px); }
}

.fase {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: 500 0.72rem var(--fm);
  color: var(--c);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.fase i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--c);
  box-shadow: 0px 0px 0px 4px color-mix(in srgb, var(--c) 20%, transparent);
}

h2 {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.desc {
  color: var(--mu);
  font-size: 0.92rem;
  line-height: 1.45;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.links a, .links span, .links button {
  font: 600 0.75rem var(--fh);
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid var(--bd);
  color: var(--tx);
  text-decoration: none;
  background-color: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.links.admin {
  gap: 5px;
  flex-wrap: nowrap;
}

.links.admin a, .links.admin span, .links.admin button {
  flex: 1 1 0px;
  min-width: 0px;
  justify-content: center;
  white-space: nowrap;
  padding: 7px 4px;
  gap: 4px;
  font-size: 0.7rem;
}

.links.admin .i {
  width: 13px;
  height: 13px;
}

.links a:hover, .links button:hover {
  background-color: var(--ac);
  color: var(--bg);
}

.links span {
  color: var(--mu);
  border-style: dashed;
  cursor: default;
}

.btn.del {
  margin-right: auto;
  color: #dc2626;
  border-color: color-mix(in srgb, #dc2626 45%, var(--bd));
}

.btn.del:hover {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.doc .btn {
  text-decoration: none;
  flex: none;
}

.vacio {
  color: var(--mu);
  font-family: var(--fm);
  padding: 40px 0px;
}

dialog {
  background-color: var(--bg);
  color: var(--tx);
  border: 1px solid var(--bd);
  border-radius: 20px;
  padding: 26px;
  width: min(440px, 92vw);
  margin: auto;
  max-height: 88vh;
  overflow: auto;
}

dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

#dEntrada::backdrop {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.bloqueado {
  filter: blur(18px);
  pointer-events: none;
  user-select: none;
}

dialog form {
  display: grid;
  gap: 12px;
}

dialog label {
  font: 500 0.75rem var(--fm);
  color: var(--mu);
  display: grid;
  gap: 6px;
}

dialog h2 {
  font-size: 1.4rem;
  letter-spacing: -0.02em;
}

.fila {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 6px;
}

.aviso {
  font: 400 0.78rem var(--fm);
  color: #dc2626;
  min-height: 1em;
}

#toast {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--ac);
  color: var(--bg);
  padding: 10px 18px;
  border-radius: 99px;
  font: 500 0.8rem var(--fm);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

#toast.v {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .card { animation: none; transition: none; }
}

#orden, #densidad {
  width: auto;
  border-radius: 99px;
  padding: 8px 14px;
  font: 600 0.8rem var(--fh);
  cursor: pointer;
}

.i {
  width: 15px;
  height: 15px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

::selection {
  background-color: color-mix(in srgb, var(--ac) 85%, transparent);
  color: var(--bg);
}

#menuMovil {
  display: none;
}

@media (hover: none) {
  .card:hover { transform: none; }
}

@media (max-width: 720px) {
  main {
    padding: 28px 16px calc(104px + env(safe-area-inset-bottom, 0px));
  }
  h1 { font-size: 2.4rem; }
  .acc { display: none; }
  .barra {
    margin: 22px -16px 18px -16px;
    padding: 0px 16px;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .barra .chip { flex: none; min-height: 40px; }
  #filtros { display: contents; }
  #orden, #buscar { display: none; }
  body.buscando #buscar {
    display: block;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    z-index: 21;
    font-size: 16px;
    min-height: 48px;
    box-shadow: 0px 12px 30px -10px rgba(0, 0, 0, 0.4);
  }
  .grid { grid-template-columns: 1fr; }
  .links a, .links button, .links span { min-height: 40px; }
  input, select, textarea { font-size: 16px; }
  dialog {
    margin: auto 0px 0px 0px;
    width: 100%;
    max-width: none;
    border-radius: 22px 22px 0px 0px;
    padding: 26px 26px max(26px, env(safe-area-inset-bottom, 0px)) 26px;
  }
  #toast { bottom: calc(92px + env(safe-area-inset-bottom, 0px)); }
  #menuMovil {
    display: flex;
    position: fixed;
    left: 0px;
    right: 0px;
    bottom: 0px;
    z-index: 20;
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px)) 6px;
    background-color: color-mix(in srgb, var(--sf) 90%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid var(--bd);
  }
  #menuMovil button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 52px;
    background: none;
    border: 0px;
    border-radius: 14px;
    color: var(--mu);
    font: 600 0.7rem var(--fh);
    cursor: pointer;
  }
  #menuMovil button .i { width: 22px; height: 22px; }
  #menuMovil button.on, #menuMovil button[aria-pressed=true] {
    color: var(--tx);
    background-color: color-mix(in srgb, var(--ac) 10%, transparent);
  }
}

.pie {
  margin-top: 48px;
  text-align: center;
  color: var(--mu);
  font: 400 0.75rem var(--fm);
  font-variant-numeric: tabular-nums;
}

.links .bloq {
  color: var(--mu);
  border-style: solid;
  opacity: 0.85;
}

.doc {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0px;
  border-bottom: 1px solid var(--bd);
}

.doc span {
  display: grid;
  gap: 2px;
  min-width: 0px;
  word-break: break-word;
  font-weight: 600;
}

.doc small {
  color: var(--mu);
  font-weight: 400;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.t { font-style: normal; }

@media (min-width: 721px) {
  .grid[data-dens=a] { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .grid[data-dens=a] .links.admin { flex-wrap: wrap; }
  .grid[data-dens=a] .links.admin a, .grid[data-dens=a] .links.admin span, .grid[data-dens=a] .links.admin button {
    flex: 1 1 40px;
    justify-content: center;
    white-space: nowrap;
    padding: 7px 8px;
    font-size: 0.75rem;
  }
  .grid[data-dens=b] { grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 10px; }
  .grid[data-dens=b] .card {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0px, 1fr);
    grid-template-areas: "f n" "l l";
    align-items: start;
    gap: 8px;
    padding: 12px;
  }
  .grid[data-dens=b] .fase { grid-area: f; padding-top: 5px; }
  .grid[data-dens=b] h2 { grid-area: n; font-size: 0.95rem; line-height: 1.2; }
  .grid[data-dens=b] .desc { display: none; }
  .grid[data-dens=b] .links { grid-area: l; flex-wrap: wrap; gap: 6px; }
  .grid[data-dens=b] .links a, .grid[data-dens=b] .links button, .grid[data-dens=b] .links span {
    flex: none;
    min-width: 32px;
    min-height: 32px;
    padding: 6px;
    justify-content: center;
  }
  .grid[data-dens=b] .links span:not(.bloq) { display: none; }
  .grid[data-dens=b] .t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; }
}
```

### Archivo: `documentacion/LEEME.md`
```md
# Documentación

La documentación de este proyecto está en el repositorio **documentacion-central**:

https://github.com/FABIOR1981/documentacion-central/tree/main/bitacora-proyectos/documentacion

También se puede consultar desde la bitácora de proyectos.

```

### Archivo: `iconos/icono-192.png`
```png
[Archivo Binario o No Leíble]
```

### Archivo: `iconos/icono-512.png`
```png
[Archivo Binario o No Leíble]
```

### Archivo: `iconos/icono-apple.png`
```png
[Archivo Binario o No Leíble]
```

### Archivo: `index.html`
```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Bitácora</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#1d1b16">
<link rel="apple-touch-icon" href="iconos/icono-apple.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bitácora">
<link rel="stylesheet" href="css/estilos.css">
</head>
<body>
<main>
<header>
  <div><h1>Bitácora<br></h1><p class="sub" id="resumen">Cargando…</p></div>
  <div class="acc">
    <button class="btn" id="nuevo" hidden>+ Nuevo</button>
    <button class="btn" id="llave" aria-pressed="false">Admin</button>
    <select id="densidad" aria-label="Densidad de tarjetas"><option value="a">A · Compacta</option><option value="b">B · Mini</option></select>
    <button class="btn" id="tema"></button>
  </div>
</header>
<div class="barra">
  <input id="buscar" type="search" placeholder="Buscar proyecto…" aria-label="Buscar proyecto">
  <select id="orden" aria-label="Ordenar por"><option value="nombre:1">Nombre (asc)</option><option value="nombre:-1">Nombre (desc)</option><option value="estado:1">Estado (asc)</option><option value="estado:-1">Estado (desc)</option></select>
  <div id="filtros"></div>
</div>
<section class="grid" id="lista" aria-live="polite"></section>
<p class="pie" id="version"></p>
</main>

<nav id="menuMovil" aria-label="Menú">
  <button id="mBuscar" aria-pressed="false"></button>
  <button id="mOrden"></button>
  <button id="mTema"></button>
  <button id="mNuevo" hidden></button>
  <button id="mLlave"></button>
</nav>
<dialog id="dEntrada"><form method="dialog" id="fEntrada"><h2>Bitácora</h2>
  <label>Contraseña<input type="password" id="pwEntrada" autocomplete="current-password" required autofocus></label>
  <p class="aviso" id="avEntrada"></p>
  <div class="fila"><button class="btn prim">Entrar</button></div></form></dialog>
<dialog id="dClave"><form method="dialog" id="fClave"><h2>Modo admin</h2>
  <label>Contraseña<input type="password" id="pw" autocomplete="current-password" required></label>
  <p class="aviso" id="avClave"></p>
  <div class="fila"><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn prim">Entrar</button></div></form></dialog>

<dialog id="dEd"><form method="dialog" id="fEd"><h2 id="tEd">Proyecto</h2>
  <label>Nombre interno (fijo tras crear)<input id="eNombre" required></label>
  <label>Nombre de fantasía<input id="eFantasia" required></label>
  <label>Descripción<textarea id="eDesc" rows="2"></textarea></label>
  <label>Repositorio (GitHub)<input id="eRepo" placeholder="https://github.com/FABIOR1981/…"></label>
  <label>URL del sitio<input id="eUrl" placeholder="https://…"></label>
  <label>Fase<select id="eFase"></select></label>
  <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ePriv" style="width:auto"> Repositorio privado</label>
  <p class="aviso" id="avEd"></p>
  <div class="fila"><button type="button" class="btn del" id="bEd" hidden>Borrar</button><button type="button" class="btn" data-cerrar>Cancelar</button><button class="btn prim" id="gEd">Guardar</button></div></form></dialog>
<dialog id="dDocs"><form method="dialog"><h2 id="tDocs">Documentación</h2><div id="listaDocs"></div>
  <div class="fila"><button type="button" class="btn" data-cerrar>Cerrar</button></div></form></dialog>
<div id="toast"></div>

<script src="js/principal.js" defer></script>
</body>
</html>

```

### Archivo: `js/principal.js`
```javascript
const FASES = {
  produccion: 'En producción',
  desarrollo: 'En desarrollo',
  prototipo: 'Prototipo',
  pausa: 'En pausa',
  idea: 'Idea'
};

const VERSION = '1.6.2';
const API = '/.netlify/functions/bitacora';

let densidad = (() => {
  try {
    const d = localStorage.getItem('densidad');
    return d === 'b' ? 'b' : 'a';
  } catch (e) {
    return 'a';
  }
})();

let orden = 'nombre';
let direccion = 1;
let datos = [];
let verificador = '';
let faseActiva = 'todas';
let admin = false;
let clave = '';
let acceso = '';
let editId = null;
let nombreFantasiaEditada = false;

const $ = selector => document.querySelector(selector);
const escaparHTML = texto => String(texto ?? '').replace(/[&<>"']/g, caracter => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[caracter]));

const validarURLSegura = url => /^https?:\/\//i.test(url || '') ? escaparHTML(url) : '';

const mostrarToast = mensaje => {
  const toast = $('#toast');
  toast.textContent = mensaje;
  toast.classList.add('v');
  setTimeout(() => toast.classList.remove('v'), 2400);
};

const generarSVG = path => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const ICONOS = {
  lock: generarSVG('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: generarSVG('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
  plus: generarSVG('<path d="M12 5v14M5 12h14"/>'),
  tema: generarSVG('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
  ext: generarSVG('<path d="M7 17 17 7M8 7h9v9"/>'),
  search: generarSVG('<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>'),
  sort: generarSVG('<path d="M7 4v16M4 17l3 3 3-3M17 20V4m-3 3 3-3 3 3"/>'),
  doc: generarSVG('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  down: generarSVG('<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>'),
  edit: generarSVG('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  repo: generarSVG('<path d="M6 3v12"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M18 8.5a9 9 0 0 1-9 9"/>')
};

const codificadorTexto = new TextEncoder();
const decodificadorTexto = new TextDecoder();

async function derivarClave(password, salt) {
  const baseKey = await crypto.subtle.importKey('raw', codificadorTexto.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function cifrarTexto(texto, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const claveDerivada = await derivarClave(password, salt);
  const textoCifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, claveDerivada, codificadorTexto.encode(texto)));
  
  const contenedor = new Uint8Array(28 + textoCifrado.length);
  contenedor.set(salt);
  contenedor.set(iv, 16);
  contenedor.set(textoCifrado, 28);
  return btoa(String.fromCharCode(...contenedor));
}

async function descifrarTexto(base64Datos, password) {
  const contenedor = Uint8Array.from(atob(base64Datos), c => c.charCodeAt(0));
  const salt = contenedor.slice(0, 16);
  const iv = contenedor.slice(16, 28);
  const textoCifrado = contenedor.slice(28);
  const claveDerivada = await derivarClave(password, salt);
  
  const descifrado = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, claveDerivada, textoCifrado);
  return decodificadorTexto.decode(descifrado);
}

async function cargarProyectos() {
  const respuesta = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion: 'listar', clave: acceso })
  });
  
  if (respuesta.status === 401) throw new Error('401');
  if (!respuesta.ok) throw new Error('Error en el servidor: ' + respuesta.status);
  
  const json = await respuesta.json();
  verificador = json.verificador || '';
  datos = (json.proyectos || []).map(p => ({ ...p, nombre_fantasia: p.nombre_fantasia || p.nombre }));
  
  await Promise.all(datos.map(async p => {
    if (p.urlCifrado) {
      try {
        p.url = await descifrarTexto(p.urlCifrado, acceso);
      } catch (e) {}
    }
  }));
}

async function guardarProyectos() {
  const proyectosLimpios = await Promise.all(datos.map(async p => {
    const { repo, url, urlCifrado, ...resto } = p;
    resto.repoCifrado = repo ? await cifrarTexto(repo, clave) : '';
    resto.docs = extraerRepo(repo);
    
    if (p.fase === 'produccion' && url) {
      resto.urlCifrado = await cifrarTexto(url, clave);
      resto.url = '';
    } else {
      resto.url = url || '';
    }
    return resto;
  }));

  const respuesta = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clave, datos: { verificador, proyectos: proyectosLimpios } })
  });

  if (!respuesta.ok) {
    const errorJson = await respuesta.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Error al guardar: ' + respuesta.status);
  }
}

function actualizarFiltros() {
  const contarProyectos = fase => fase === 'todas' ? datos.length : datos.filter(p => p.fase === fase).length;
  
  $('#filtros').innerHTML = ['todas', ...Object.keys(FASES)]
    .filter(fase => fase === 'todas' || contarProyectos(fase))
    .map(fase => `<button class="chip" data-f="${fase}" aria-pressed="${fase === faseActiva}">${fase === 'todas' ? 'Todas' : FASES[fase]}</button>`)
    .join('');
}

const obtenerIndiceFase = fase => {
  const index = Object.keys(FASES).indexOf(fase);
  return index < 0 ? 99 : index;
};

const obtenerNombreVisible = p => p.nombre_fantasia || p.nombre;
const compararPorNombre = (a, b) => obtenerNombreVisible(a).localeCompare(obtenerNombreVisible(b), 'es', { sensitivity: 'base', numeric: true });
const compararProyectos = (a, b) => (orden === 'estado' ? (obtenerIndiceFase(a.fase) - obtenerIndiceFase(b.fase)) || compararPorNombre(a, b) : compararPorNombre(a, b)) * direccion;

function aplicarDensidad() {
  $('#lista').dataset.dens = densidad;
  $('#densidad').value = densidad;
}

function pintarProyectos() {
  const busqueda = $('#buscar').value.trim().toLowerCase();
  const proyectosFiltrados = datos
    .filter(p => (faseActiva === 'todas' || p.fase === faseActiva) && (obtenerNombreVisible(p) + ' ' + p.nombre + ' ' + (p.descripcion || '')).toLowerCase().includes(busqueda))
    .sort(compararProyectos);

  $('#lista').innerHTML = proyectosFiltrados.length ? proyectosFiltrados.map((p, i) => {
    const repoURL = admin ? validarURLSegura(p.repo) : '';
    const sitioURL = validarURLSegura(p.url);
    
    return `<article class="card" title="${escaparHTML(p.descripcion)}" style="--c:var(--${escaparHTML(p.fase)},var(--mu));animation-delay:${i * 30}ms">
      <span class="fase" title="${escaparHTML(FASES[p.fase] || p.fase)}"><i></i><em class="t">${escaparHTML(FASES[p.fase] || p.fase)}${p.privado && admin ? ` · ${ICONOS.lock} privado` : ''}</em></span>
      <h2>${escaparHTML(obtenerNombreVisible(p))}</h2>
      <p class="desc">${escaparHTML(p.descripcion)}</p>
      <div class="links${admin ? ' admin' : ''}">
        ${sitioURL ? `<a href="${sitioURL}" target="_blank" rel="noopener">${ICONOS.ext}<em class="t">Sitio</em></a>` : '<span>sin URL</span>'}
        ${admin ? (repoURL ? `<a href="${repoURL}" target="_blank" rel="noopener">${ICONOS.repo}<em class="t">Repo</em></a>` : '<span>sin repo</span>') : ''}
        ${p.nombre ? `<button data-docs="${escaparHTML(p.id)}">${ICONOS.doc}<em class="t">Docs</em></button>` : ''}
        ${admin ? `<button data-ed="${escaparHTML(p.id)}">${ICONOS.edit}<em class="t">Editar</em></button>` : ''}
      </div>
    </article>`;
  }).join('') : '<p class="vacio">Sin resultados.</p>';

  const enProduccion = datos.filter(p => p.fase === 'produccion').length;
  $('#resumen').textContent = `${datos.length} proyectos · ${enProduccion} en producción${admin ? ' · modo admin' : ''}`;
}

function actualizarModoUI() {
  $('#nuevo').hidden = !admin;
  const botonLlave = $('#llave');
  botonLlave.innerHTML = admin ? ICONOS.unlock + ' Salir' : ICONOS.lock + ' Admin';
  botonLlave.classList.toggle('on', admin);
  
  $('#mNuevo').hidden = !admin;
  $('#mLlave').innerHTML = (admin ? ICONOS.unlock : ICONOS.lock) + '<span>' + (admin ? 'Salir' : 'Admin') + '</span>';
  $('#mLlave').classList.toggle('on', admin);
  
  actualizarFiltros();
  pintarProyectos();
}

$('#filtros').onclick = e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  faseActiva = chip.dataset.f;
  actualizarFiltros();
  pintarProyectos();
};

$('#buscar').oninput = pintarProyectos;

$('#densidad').onchange = e => {
  densidad = e.target.value === 'b' ? 'b' : 'a';
  try { localStorage.setItem('densidad', densidad); } catch (err) {}
  aplicarDensidad();
};

$('#orden').onchange = e => {
  [orden, direccion] = e.target.value.split(':');
  direccion = Number(direccion);
  pintarProyectos();
};

$('#tema').onclick = () => {
  const root = document.documentElement;
  const esOscuroSistema = matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.tema = (root.dataset.tema || (esOscuroSistema ? 'oscuro' : 'claro')) === 'oscuro' ? 'claro' : 'oscuro';
};

document.querySelectorAll('[data-cerrar]').forEach(boton => {
  boton.onclick = () => boton.closest('dialog').close();
});

$('#llave').onclick = () => {
  if (admin) {
    admin = false;
    clave = '';
    actualizarModoUI();
    cargarProyectos().catch(() => {}).then(actualizarModoUI);
    return;
  }
  $('#pw').value = '';
  $('#avClave').textContent = '';
  $('#dClave').showModal();
  $('#pw').focus();
};

$('#fClave').onsubmit = async e => {
  e.preventDefault();
  const password = $('#pw').value.trim();
  if (!verificador) {
    $('#avClave').textContent = 'Falta el verificador en el JSON. Recargá con Ctrl+F5.';
    return;
  }
  $('#avClave').textContent = 'Verificando…';
  try {
    await descifrarTexto(verificador, password);
    clave = password;
    await Promise.all(datos.map(async p => {
      p.repo = p.repoCifrado ? await descifrarTexto(p.repoCifrado, password) : '';
      if (p.urlCifrado) p.url = await descifrarTexto(p.urlCifrado, password);
    }));
    admin = true;
    $('#dClave').close();
    actualizarModoUI();
  } catch (err) {
    $('#avClave').textContent = 'Contraseña incorrecta.';
  }
};

$('#eFase').innerHTML = Object.entries(FASES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

function abrirModalEdicion(id) {
  editId = id;
  const proyecto = datos.find(x => x.id === id) || { fase: 'desarrollo' };
  nombreFantasiaEditada = !!id;
  
  $('#tEd').textContent = id ? 'Editar proyecto' : 'Nuevo proyecto';
  $('#eNombre').value = proyecto.nombre || '';
  $('#eNombre').readOnly = !!id;
  $('#eFantasia').value = proyecto.nombre_fantasia || proyecto.nombre || '';
  $('#eDesc').value = proyecto.descripcion || '';
  $('#eRepo').value = proyecto.repo || '';
  $('#eUrl').value = proyecto.url || '';
  $('#eFase').value = proyecto.fase;
  $('#ePriv').checked = !!proyecto.privado;
  $('#avEd').textContent = '';
  $('#bEd').hidden = !id;
  $('#dEd').showModal();
}

$('#eNombre').oninput = () => {
  if (!editId && !nombreFantasiaEditada) {
    $('#eFantasia').value = $('#eNombre').value;
  }
};

$('#eFantasia').oninput = () => {
  nombreFantasiaEditada = true;
};

$('#nuevo').onclick = () => abrirModalEdicion(null);

$('#lista').onclick = async e => {
  const docsBtn = e.target.closest('[data-docs]');
  if (docsBtn) return verDocumentacion(docsBtn.dataset.docs);
  
  const editBtn = e.target.closest('[data-ed]');
  if (editBtn) return abrirModalEdicion(editBtn.dataset.ed);
};

$('#bEd').onclick = async () => {
  if (!editId || !confirm('¿Estás seguro de borrar este proyecto?')) return;
  const botonBorrar = $('#bEd');
  botonBorrar.disabled = true;
  $('#avEd').textContent = 'Borrando…';
  
  const copiaDatos = [...datos];
  datos = datos.filter(p => p.id !== editId);
  try {
    await guardarProyectos();
    $('#dEd').close();
    mostrarToast('Proyecto borrado');
    actualizarModoUI();
  } catch (err) {
    datos = copiaDatos;
    $('#avEd').textContent = err.message;
  }
  botonBorrar.disabled = false;
};

$('#fEd').onsubmit = async e => {
  e.preventDefault();
  const botonGuardar = $('#gEd');
  botonGuardar.disabled = true;
  $('#avEd').textContent = 'Guardando…';
  
  const proyectoAnterior = datos.find(p => p.id === editId);
  const nombreInterno = proyectoAnterior ? proyectoAnterior.nombre : $('#eNombre').value.trim();
  
  const nuevoProyecto = {
    ...(proyectoAnterior || {}),
    id: proyectoAnterior ? proyectoAnterior.id : crypto.randomUUID().slice(0, 8),
    nombre: nombreInterno,
    nombre_fantasia: $('#eFantasia').value.trim() || nombreInterno,
    descripcion: $('#eDesc').value.trim(),
    repo: $('#eRepo').value.trim(),
    url: $('#eUrl').value.trim(),
    fase: $('#eFase').value,
    privado: $('#ePriv').checked
  };
  
  const copiaDatos = [...datos];
  datos = editId ? datos.map(p => p.id === editId ? nuevoProyecto : p) : [nuevoProyecto, ...datos];
  
  try {
    await guardarProyectos();
    $('#dEd').close();
    mostrarToast('Guardado en GitHub');
    actualizarModoUI();
  } catch (err) {
    datos = copiaDatos;
    $('#avEd').textContent = err.message;
  }
  botonGuardar.disabled = false;
};

aplicarDensidad();

const bloquearInterfaz = bloquear => {
  $('main').classList.toggle('bloqueado', bloquear);$('#menuMovil').classList.toggle('bloqueado', bloquear);
};

$('#dEntrada').addEventListener('cancel', e => e.preventDefault());

$('#fEntrada').onsubmit = async e => {
  e.preventDefault();
  acceso = $('#pwEntrada').value.trim();
  $('#avEntrada').textContent = 'Verificando acceso…';
  try {
    await cargarProyectos();
    actualizarModoUI();
    bloquearInterfaz(false);
    $('#dEntrada').close();
  } catch (err) {
    acceso = '';
    $('#avEntrada').textContent = err.message === '401' ? 'Contraseña incorrecta.' : 'No se pudo leer el JSON de GitHub.';
  }
};

$('#resumen').textContent = 'Acceso protegido';
bloquearInterfaz(true);
$('#dEntrada').showModal();

$('#nuevo').innerHTML = ICONOS.plus + ' Nuevo';
$('#tema').innerHTML = ICONOS.tema;
$('#tema').setAttribute('aria-label', 'Cambiar tema claro/oscuro');

const configurarBotonMovil = (id, icono, texto) => {
  $(id).innerHTML = icono + '<span>' + texto + '</span>';
};
configurarBotonMovil('#mBuscar', ICONOS.search, 'Buscar');
configurarBotonMovil('#mOrden', ICONOS.sort, 'Orden');
configurarBotonMovil('#mTema', ICONOS.tema, 'Tema');
configurarBotonMovil('#mNuevo', ICONOS.plus, 'Nuevo');

$('#mBuscar').onclick = () => {
  const activo = document.body.classList.toggle('buscando');
  $('#mBuscar').setAttribute('aria-pressed', activo);
  if (activo) $('#buscar').focus();
};

$('#mOrden').onclick = () => {
  const cicloOrden = [['nombre', 1], ['nombre', -1], ['estado', 1], ['estado', -1]];
  const index = cicloOrden.findIndex(c => c[0] === orden && c[1] === direccion);
  const siguiente = cicloOrden[(index + 1) % 4];
  orden = siguiente[0];
  direccion = siguiente[1];
  $('#orden').value = orden + ':' + direccion;
  pintarProyectos();
  mostrarToast('Orden: ' + orden + (direccion > 0 ? ' ascendente' : ' descendente'));
};

$('#mTema').onclick = () => $('#tema').click();
$('#mNuevo').onclick = () => $('#nuevo').click();
$('#mLlave').onclick = () => $('#llave').click();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('servicio.js?v=' + VERSION).catch(() => {}));
}
$('#version').textContent = 'Bitácora v' + VERSION;

const extraerRepo = url => (url || '').replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
const apiPeticion = cuerpo => fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: acceso, ...cuerpo }) });
const formatearTamano = bytes => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? Math.round(bytes / 1024) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';

async function verDocumentacion(id) {
  const proyecto = datos.find(x => x.id === id);
  if (!proyecto) return;
  
  const repoDocs = proyecto.docs || extraerRepo(proyecto.repo) || 'FABIOR1981/' + proyecto.nombre;
  $('#tDocs').textContent = 'Documentación · ' + obtenerNombreVisible(proyecto);
  $('#listaDocs').innerHTML = '<p class="vacio">Buscando documentos…</p>';
  $('#dDocs').showModal();
  
  try {
    const respuesta = await apiPeticion({ accion: 'docs', repo: repoDocs });
    const json = await respuesta.json();
    if (!respuesta.ok) throw new Error(json.error || 'Error ' + respuesta.status);
    
    $('#listaDocs').innerHTML = json.archivos.length ? json.archivos.map(archivo => `
      <div class="doc">
        <span>${escaparHTML(archivo.nombre)}<small>${formatearTamano(archivo.tam)}</small></span>
        <a class="btn" href="${escaparHTML(archivo.url)}" target="_blank" rel="noopener">${ICONOS.down} Abrir</a>
      </div>
    `).join('') : '<p class="vacio">Sin PDF en documentación central para este proyecto.</p>';
  } catch (err) {
    $('#listaDocs').innerHTML = `<p class="aviso">${escaparHTML(err.message)}</p>`;
  }
}
```

### Archivo: `manifest.webmanifest`
```webmanifest
{
  "name": "Bitácora de proyectos",
  "short_name": "Bitácora",
  "description": "Índice de mis proyectos: repositorios, sitios y fase.",
  "lang": "es",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#1d1b16",
  "theme_color": "#1d1b16",
  "icons": [
    {
      "src": "iconos/icono-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "iconos/icono-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "iconos/icono-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "id": "./"
}
```

### Archivo: `netlify/functions/bitacora.js`
```javascript
// Netlify Function: único lugar que conoce el token de GitHub.
// Variables de entorno en Netlify: GITHUB_TOKEN, CLAVE_ADMIN, GITHUB_TOKEN_DOCUMENTACION_CENTRAL (y opcionales GITHUB_REPO, DOCS_REPO)
const crypto = require('crypto');
const REPO = process.env.GITHUB_REPO || 'FABIOR1981/bd';
const RUTA = 'bitacora/proyectos.json';
const RAMA = 'main';
const API = `https://api.github.com/repos/${REPO}/contents/${RUTA}`;
const DOCS_REPO = process.env.DOCS_REPO || 'FABIOR1981/documentacion-central';
const MIME = { pdf: 'application/pdf', md: 'text/markdown; charset=utf-8', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain; charset=utf-8' };
const esPdf = n => /\.pdf$/i.test(String(n || '')); // solo se muestran y sirven PDF
const MAX_BYTES = 4 * 1024 * 1024; // tope de descarga por la función
const VIGENCIA_ENLACE = 15 * 60; // segundos que dura el enlace de un documento
const VER_EN_NAVEGADOR = ['pdf', 'md', 'txt']; // se abren en el navegador; el resto se descarga

const cab = (x = {}) => ({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'bitacora', ...x });
const cabDocs = (x = {}) => cab({ Authorization: 'Bearer ' + (process.env.GITHUB_TOKEN_DOCUMENTACION_CENTRAL || process.env.GITHUB_TOKEN), ...x });
const resp = (c, o) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: typeof o === 'string' ? o : JSON.stringify(o) });
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const claveOk = c => process.env.CLAVE_ADMIN && igual(c || '', process.env.CLAVE_ADMIN);
const repoOk = r => /^FABIOR1981\/[\w.-]+$/.test(r || '');
const carpetaDocs = repo => repo.split('/')[1].replace(/\.git$/, '') + '/documentacion';
const firma = (ruta, exp) => crypto.createHmac('sha256', process.env.CLAVE_ADMIN).update(ruta + '|' + exp).digest('hex');
const enlace = ruta => { const exp = Math.floor(Date.now() / 1000) + VIGENCIA_ENLACE; return `/.netlify/functions/bitacora?doc=${encodeURIComponent(ruta)}&exp=${exp}&f=${firma(ruta, exp)}`; };
const enlaceOk = q => /^[\w.-]+\/documentacion\/[^/]+$/.test(q.doc || '') && !q.doc.includes('..') && esPdf(q.doc) && Number(q.exp) > Date.now() / 1000 && igual(q.f || '', firma(q.doc, q.exp));
const rutaOk = (repo, p) => String(p || '').startsWith(carpetaDocs(repo) + '/') && String(p).length > carpetaDocs(repo).length + 1 && !String(p).includes('..') && esPdf(p);

// Lista los archivos de "<repo>/documentacion" en el repositorio documentacion-central
async function listar(repo) {
  const r = await fetch(`https://api.github.com/repos/${DOCS_REPO}/contents/${carpetaDocs(repo).split('/').map(encodeURIComponent).join('/')}`, { headers: cabDocs() });
  if (r.status === 404) return resp(200, { archivos: [] });
  if (!r.ok) return resp(502, { error: 'GitHub respondió ' + r.status + ' (¿el token tiene acceso a documentacion-central?)' });
  const lista = await r.json();
  const archivos = (Array.isArray(lista) ? lista : []).filter(f => f.type === 'file' && esPdf(f.name))
    .map(f => ({ nombre: f.name, ruta: f.path, tam: f.size, url: enlace(f.path) })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return resp(200, { archivos });
}

// Devuelve un archivo de documentacion-central para descargarlo
async function bajar(repo, ruta) {
  if (!rutaOk(repo, ruta)) return resp(400, { error: 'Ruta inválida' });
  return leer(ruta, 'attachment');
}

// Abre un documento desde un enlace firmado (sirve en el celular: es un link común, no una descarga por script)
async function abrir(q) {
  if (!process.env.CLAVE_ADMIN || !enlaceOk(q)) return resp(403, { error: 'Enlace vencido o inválido: volvé a abrir Docs en la bitácora' });
  const ext = q.doc.split('.').pop().toLowerCase();
  return leer(q.doc, VER_EN_NAVEGADOR.includes(ext) ? 'inline' : 'attachment');
}

async function leer(ruta, disposicion) {
  const r = await fetch(`https://api.github.com/repos/${DOCS_REPO}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`, { headers: cabDocs({ Accept: 'application/vnd.github.raw+json' }) });
  if (!r.ok) return resp(502, { error: 'No se pudo leer el archivo (GitHub ' + r.status + ')' });
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) return resp(413, { error: 'El archivo supera 4 MB: descargalo desde GitHub' });
  const nombre = ruta.split('/').pop(), ext = nombre.split('.').pop().toLowerCase();
  const tipo = disposicion === 'inline' && ext === 'md' ? 'text/plain; charset=utf-8' : MIME[ext] || 'application/octet-stream';
  return { statusCode: 200, isBase64Encoded: true, body: buf.toString('base64'),
    headers: { 'Content-Type': tipo, 'Content-Disposition': `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombre)}`, 'Cache-Control': 'no-store' } };
}

exports.handler = async (ev) => {
  try {
    const q = ev.queryStringParameters || {};
    if (ev.httpMethod === 'GET' && q.doc) return await abrir(q);
    const cuerpo = ev.httpMethod === 'POST' ? JSON.parse(ev.body || '{}') : {};

    if (ev.httpMethod !== 'POST') return resp(405, { error: 'Método no permitido' });
    if (!claveOk(cuerpo.clave)) return resp(401, { error: 'Clave inválida' });

    if (cuerpo.accion === 'docs' || cuerpo.accion === 'bajar') {
      if (!repoOk(cuerpo.repo)) return resp(400, { error: 'Repositorio inválido' });
      return cuerpo.accion === 'docs' ? await listar(cuerpo.repo) : await bajar(cuerpo.repo, cuerpo.ruta);
    }

    const meta = await fetch(`${API}?ref=${RAMA}`, { headers: cab() });
    if (!meta.ok) return resp(502, { error: 'GitHub respondió ' + meta.status });
    const m = await meta.json();
    if (cuerpo.accion === 'listar') return resp(200, Buffer.from(m.content, 'base64').toString('utf8'));

    const { datos } = cuerpo;
    if (!datos || !Array.isArray(datos.proyectos)) return resp(400, { error: 'Datos inválidos' });

    const put = await fetch(API, {
      method: 'PUT', headers: cab({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: 'bitacora: actualizar proyectos', content: Buffer.from(JSON.stringify(datos, null, 2)).toString('base64'), sha: m.sha, branch: RAMA })
    });
    if (!put.ok) return resp(502, { error: 'No se pudo guardar (GitHub ' + put.status + ')' });
    return resp(200, { ok: true });
  } catch (e) {
    return resp(500, { error: 'Error del servidor' });
  }
};

```

### Archivo: `servicio.js`
```javascript
// Service worker: guarda la estructura de la app y deja ver la última lista sin conexión.
const CACHE = 'bitacora-' + (new URL(self.location).searchParams.get('v') || '0'); // la versión viene de js/principal.js
const BASE = ['./', './index.html', './css/estilos.css', './js/principal.js', './manifest.webmanifest', './iconos/icono-192.png', './iconos/icono-512.png'];

self.addEventListener('install', e => {
  // si falta algún archivo, la instalación no se cae: se guarda lo que haya
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== 'GET') return;                       // guardar (POST) nunca se cachea
  if (url.origin !== location.origin) return;           // fuentes y otros: normal del navegador
  if (url.searchParams.has('doc')) return;              // documentos de Docs: directo del servidor, sin guardar copia
  const red = fetch(r).then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); } return res; });
  if (url.pathname.startsWith('/.netlify/functions/')) {  // datos: primero la red, si no hay, la última copia
    e.respondWith(red.catch(() => caches.match(r)));
  } else {                                              // archivos: copia rápida y se actualiza detrás
    e.respondWith(caches.match(r).then(c => c || red).catch(() => caches.match('./index.html')));
    e.waitUntil(red.catch(() => {}));
  }
});

```

