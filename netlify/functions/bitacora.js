// Netlify Function: único lugar que conoce el token de GitHub.
// Variables de entorno en Netlify: GITHUB_TOKEN, CLAVE_ADMIN (y opcional GITHUB_REPO)
const crypto = require('crypto');
const REPO = process.env.GITHUB_REPO || 'FABIOR1981/bd';
const RUTA = 'bitacora/proyectos.json';
const RAMA = 'main';
const API = `https://api.github.com/repos/${REPO}/contents/${RUTA}`;
const cab = (x = {}) => ({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'bitacora', ...x });
const resp = (c, o) => ({ statusCode: c, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: typeof o === 'string' ? o : JSON.stringify(o) });
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

exports.handler = async (ev) => {
  try {
    const meta = await fetch(`${API}?ref=${RAMA}`, { headers: cab() });
    if (!meta.ok) return resp(502, { error: 'GitHub respondió ' + meta.status });
    const m = await meta.json();
    if (ev.httpMethod === 'GET') return resp(200, Buffer.from(m.content, 'base64').toString('utf8'));
    if (ev.httpMethod !== 'POST') return resp(405, { error: 'Método no permitido' });

    const { clave, datos } = JSON.parse(ev.body || '{}');
    if (!process.env.CLAVE_ADMIN || !igual(clave || '', process.env.CLAVE_ADMIN)) return resp(401, { error: 'Clave inválida' });
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
