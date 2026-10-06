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

    if (cuerpo.accion === 'docs' || cuerpo.accion === 'bajar') {
      if (!claveOk(cuerpo.clave)) return resp(401, { error: 'Clave inválida' });
      if (!repoOk(cuerpo.repo)) return resp(400, { error: 'Repositorio inválido' });
      return cuerpo.accion === 'docs' ? await listar(cuerpo.repo) : await bajar(cuerpo.repo, cuerpo.ruta);
    }

    const meta = await fetch(`${API}?ref=${RAMA}`, { headers: cab() });
    if (!meta.ok) return resp(502, { error: 'GitHub respondió ' + meta.status });
    const m = await meta.json();
    if (ev.httpMethod === 'GET') return resp(200, Buffer.from(m.content, 'base64').toString('utf8'));
    if (ev.httpMethod !== 'POST') return resp(405, { error: 'Método no permitido' });

    const { clave, datos } = cuerpo;
    if (!claveOk(clave)) return resp(401, { error: 'Clave inválida' });
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
