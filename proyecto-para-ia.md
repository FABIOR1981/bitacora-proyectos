# Bundle del Proyecto para IA

## Estructura de Archivos
- README.md
- index.html
- manifest.webmanifest
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

