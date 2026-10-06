/* ===== CONFIGURACIÓN ===== */
const FASES={produccion:'En producción',desarrollo:'En desarrollo',prototipo:'Prototipo',pausa:'En pausa',idea:'Idea'};
const API='/.netlify/functions/bitacora'; // el token de GitHub vive en Netlify, no aquí
/* ========================== */
let datos=[],verificador='',faseActiva='todas',admin=false,clave='',editId=null;
const $=s=>document.querySelector(s);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seguro=u=>/^https?:\/\//i.test(u||'')?esc(u):'';
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('v');setTimeout(()=>t.classList.remove('v'),2400)};

/* --- cifrado (AES-GCM + PBKDF2) --- */
const enc=new TextEncoder(),dec=new TextDecoder();
async function derivar(pw,salt){const m=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function cifrar(t,pw){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const k=await derivar(pw,salt);const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},k,enc.encode(t)));const a=new Uint8Array(28+ct.length);a.set(salt);a.set(iv,16);a.set(ct,28);return btoa(String.fromCharCode(...a))}
async function descifrar(b,pw){const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const k=await derivar(pw,a.slice(0,16));return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:a.slice(16,28)},k,a.slice(28)))}

/* --- servidor (Netlify Function) --- */
async function cargar(){
  const r=await fetch(API,{cache:'no-store'});
  if(!r.ok)throw new Error('Servidor '+r.status);
  const j=await r.json();verificador=j.verificador||'';datos=j.proyectos||[];
}
async function guardar(){
  const limpio=await Promise.all(datos.map(async p=>{const {repo,...o}=p;o.repoCifrado=repo?await cifrar(repo,clave):'';return o}));
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave,datos:{verificador,proyectos:limpio}})});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'Error '+r.status)}
}

/* --- vista --- */
function filtros(){
  const n=f=>f==='todas'?datos.length:datos.filter(p=>p.fase===f).length;
  $('#filtros').innerHTML=['todas',...Object.keys(FASES)].filter(f=>f==='todas'||n(f)).map(f=>`<button class="chip" data-f="${f}" aria-pressed="${f===faseActiva}">${f==='todas'?'Todas':FASES[f]} <b>${n(f)}</b></button>`).join('');
}
function pintar(){
  const q=$('#buscar').value.trim().toLowerCase();
  const v=datos.filter(p=>(faseActiva==='todas'||p.fase===faseActiva)&&(p.nombre+' '+(p.descripcion||'')).toLowerCase().includes(q));
  $('#lista').innerHTML=v.length?v.map((p,i)=>{
    const r=admin?seguro(p.repo):'',u=seguro(p.url);
    return `<article class="card" style="--c:var(--${esc(p.fase)},var(--mu));animation-delay:${i*30}ms">
      <span class="fase"><i></i>${esc(FASES[p.fase]||p.fase)}${p.privado&&admin?' · 🔒 privado':''}</span>
      <h2>${esc(p.nombre)}</h2><p class="desc">${esc(p.descripcion)}</p>
      <div class="links">${u?`<a href="${u}" target="_blank" rel="noopener">↗ Sitio</a>`:'<span>sin URL</span>'}${admin?(r?`<a href="${r}" target="_blank" rel="noopener">⌥ Repo</a>`:'<span>sin repo</span>'):''}
      ${admin?`<button data-ed="${esc(p.id)}">Editar</button><button class="del" data-del="${esc(p.id)}">Borrar</button>`:''}</div>
    </article>`}).join(''):'<p class="vacio">Sin resultados.</p>';
  const prod=datos.filter(p=>p.fase==='produccion').length;
  $('#resumen').textContent=`${datos.length} proyectos · ${prod} en producción${admin?' · modo admin':''}`;
}
function modo(){
  $('#nuevo').hidden=!admin;
  const l=$('#llave');l.textContent=admin?'🔓 Salir':'🔒 Admin';l.classList.toggle('on',admin);
  filtros();pintar();
}

/* --- eventos --- */
$('#filtros').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;faseActiva=b.dataset.f;filtros();pintar()};
$('#buscar').oninput=pintar;
$('#tema').onclick=()=>{const r=document.documentElement,o=matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.tema=(r.dataset.tema||(o?'oscuro':'claro'))==='oscuro'?'claro':'oscuro'};
document.querySelectorAll('[data-cerrar]').forEach(b=>b.onclick=()=>b.closest('dialog').close());

$('#llave').onclick=()=>{
  if(admin){admin=false;clave='';datos.forEach(p=>delete p.repo);modo();return}
  $('#pw').value='';$('#avClave').textContent='';$('#dClave').showModal();$('#pw').focus();
};
$('#fClave').onsubmit=async e=>{
  e.preventDefault();const pw=$('#pw').value.trim();
  if(!verificador){$('#avClave').textContent='El JSON cargado no es el nuevo (falta "verificador"). Subí bitacora/proyectos.json a bd y recargá con Ctrl+F5.';return}
  $('#avClave').textContent='Verificando…';
  try{
    await descifrar(verificador,pw);
    clave=pw;
    await Promise.all(datos.map(async p=>{p.repo=p.repoCifrado?await descifrar(p.repoCifrado,pw):''}));
    admin=true;$('#dClave').close();modo();
  }catch{$('#avClave').textContent='Contraseña incorrecta.'}
};
$('#eFase').innerHTML=Object.entries(FASES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
function abrirEd(id){
  editId=id;const p=datos.find(x=>x.id===id)||{fase:'desarrollo'};
  $('#tEd').textContent=id?'Editar proyecto':'Nuevo proyecto';
  $('#eNombre').value=p.nombre||'';$('#eDesc').value=p.descripcion||'';$('#eRepo').value=p.repo||'';
  $('#eUrl').value=p.url||'';$('#eFase').value=p.fase;$('#ePriv').checked=!!p.privado;$('#avEd').textContent='';
  $('#dEd').showModal();
}
$('#nuevo').onclick=()=>abrirEd(null);
$('#lista').onclick=async e=>{
  const ed=e.target.closest('[data-ed]'),del=e.target.closest('[data-del]');
  if(ed)return abrirEd(ed.dataset.ed);
  if(del&&confirm('¿Borrar este proyecto?')){
    const copia=[...datos];datos=datos.filter(p=>p.id!==del.dataset.del);
    try{await guardar();toast('Borrado');modo()}catch(er){datos=copia;toast(er.message)}
  }
};
$('#fEd').onsubmit=async e=>{
  e.preventDefault();const g=$('#gEd');g.disabled=true;$('#avEd').textContent='Guardando…';
  const nuevo={id:editId||crypto.randomUUID().slice(0,8),nombre:$('#eNombre').value.trim(),descripcion:$('#eDesc').value.trim(),
    repo:$('#eRepo').value.trim(),url:$('#eUrl').value.trim(),fase:$('#eFase').value,privado:$('#ePriv').checked};
  const copia=[...datos];
  datos=editId?datos.map(p=>p.id===editId?nuevo:p):[nuevo,...datos];
  try{await guardar();$('#dEd').close();toast('Guardado en GitHub');modo()}
  catch(er){datos=copia;$('#avEd').textContent=er.message}
  g.disabled=false;
};

cargar().then(modo).catch(()=>{$('#resumen').textContent='No se pudo leer el JSON de GitHub. Revisá la función de Netlify y sus variables de entorno.'});
