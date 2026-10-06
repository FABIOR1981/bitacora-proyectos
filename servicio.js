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
  const red = fetch(r).then(res => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); } return res; });
  if (url.pathname.startsWith('/.netlify/functions/')) {  // datos: primero la red, si no hay, la última copia
    e.respondWith(red.catch(() => caches.match(r)));
  } else {                                              // archivos: copia rápida y se actualiza detrás
    e.respondWith(caches.match(r).then(c => c || red).catch(() => caches.match('./index.html')));
    e.waitUntil(red.catch(() => {}));
  }
});
