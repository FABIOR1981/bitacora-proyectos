const FASES = {
  produccion: 'En producción',
  desarrollo: 'En desarrollo',
  prototipo: 'Prototipo',
  pausa: 'En pausa',
  idea: 'Idea'
};

const VERSION = '1.7.0';
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
  refresh: generarSVG('<path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>'),
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
const formatearFecha = iso => new Date(iso).toLocaleString('es-UY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let docsAbierto = null;

async function verDocumentacion(id) {
  const proyecto = datos.find(x => x.id === id);
  if (!proyecto) return;

  const repoDocs = proyecto.docs || extraerRepo(proyecto.repo) || 'FABIOR1981/' + proyecto.nombre;
  docsAbierto = id;
  $('#tDocs').textContent = 'Documentación · ' + obtenerNombreVisible(proyecto);
  $('#listaDocs').innerHTML = '<p class="vacio">Buscando documentos…</p>';
  if (!$('#dDocs').open) $('#dDocs').showModal();

  try {
    const respuesta = await apiPeticion({ accion: 'docs', repo: repoDocs });
    const json = await respuesta.json();
    if (!respuesta.ok) throw new Error(json.error || 'Error ' + respuesta.status);

    const hayRespaldo = json.archivos.some(a => /\.md$/i.test(a.nombre));
    $('#listaDocs').innerHTML = json.archivos.length ? json.archivos.map(archivo => {
      const esRespaldo = /\.md$/i.test(archivo.nombre);
      const detalle = formatearTamano(archivo.tam) + (archivo.fecha ? ' · generado el ' + formatearFecha(archivo.fecha) : '');
      // Botón de regenerar solo en el respaldo; en las demás filas va uno invisible para que "Abrir" quede alineado
      const extra = esRespaldo
        ? `<button type="button" class="btn" data-regen="${escaparHTML(repoDocs)}" data-id="${escaparHTML(id)}" aria-label="Regenerar respaldo" title="Regenerar respaldo">${ICONOS.refresh}</button>`
        : (hayRespaldo ? `<button type="button" class="btn" style="visibility:hidden" tabindex="-1" aria-hidden="true">${ICONOS.refresh}</button>` : '');
      return `
      <div class="doc">
        <span style="flex:1">${escaparHTML(archivo.nombre)}<small>${escaparHTML(detalle)}</small></span>
        <a class="btn" href="${escaparHTML(archivo.url)}" target="_blank" rel="noopener">${ICONOS.down} Abrir</a>
        ${extra}
      </div>`;
    }).join('') : '<p class="vacio">Sin documentos en documentación central para este proyecto.</p>';
  } catch (err) {
    $('#listaDocs').innerHTML = `<p class="aviso">${escaparHTML(err.message)}</p>`;
  }
}

// Regenera el respaldo .md: dispara el workflow del proyecto y refresca la lista a los 60 s
async function regenerarRespaldo(boton) {
  if (boton.dataset.ocupado) return;
  boton.dataset.ocupado = '1';
  const nota = boton.closest('.doc').querySelector('small'), antes = nota.textContent;
  nota.textContent = 'Solicitando…';
  try {
    const respuesta = await apiPeticion({ accion: 'regenerar', repo: boton.dataset.regen });
    const json = await respuesta.json();
    if (!respuesta.ok) throw new Error(json.error || 'Error ' + respuesta.status);
    nota.textContent = 'Generando… tarda cerca de 1 minuto';
    setTimeout(() => { if ($('#dDocs').open && docsAbierto === boton.dataset.id) verDocumentacion(boton.dataset.id); }, 60000);
  } catch (err) {
    nota.textContent = err.message;
    setTimeout(() => { nota.textContent = antes; delete boton.dataset.ocupado; }, 6000);
  }
}

$('#listaDocs').addEventListener('click', e => {
  const boton = e.target.closest('[data-regen]');
  if (boton) regenerarRespaldo(boton);
});