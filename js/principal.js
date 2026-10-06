/* ===== CONFIGURACIÓN ===== */
const FASES={produccion:'En producción',desarrollo:'En desarrollo',prototipo:'Prototipo',pausa:'En pausa',idea:'Idea'};
const VERSION='1.1.1'; // subí este número en cada cambio: actualiza la app instalada
const API='/.netlify/functions/bitacora'; // el token de GitHub vive en Netlify, no aquí
/* ========================== */
let orden='nombre',dir=1,datos=[],verificador='',faseActiva='todas',admin=false,clave='',editId=null;
const $=s=>document.querySelector(s);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seguro=u=>/^https?:\/\//i.test(u||'')?esc(u):'';
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('v');setTimeout(()=>t.classList.remove('v'),2400)};

/* --- iconos (trazo único) --- */
const svg=d=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I={lock:svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
unlock:svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
plus:svg('<path d="M12 5v14M5 12h14"/>'),
tema:svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
ext:svg('<path d="M7 17 17 7M8 7h9v9"/>'),
search:svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>'),
sort:svg('<path d="M7 4v16M4 17l3 3 3-3M17 20V4m-3 3 3-3 3 3"/>'),
repo:svg('<path d="M6 3v12"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M18 8.5a9 9 0 0 1-9 9"/>')};

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
  const limpio=await Promise.all(datos.map(async p=>{const {repo,url,urlCifrado,...o}=p;o.repoCifrado=repo?await cifrar(repo,clave):'';
    if(p.fase==='produccion'&&url){o.urlCifrado=await cifrar(url,clave);o.url=''}else o.url=url||'';return o}));
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave,datos:{verificador,proyectos:limpio}})});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||'Error '+r.status)}
}

/* --- vista --- */
function filtros(){
  const n=f=>f==='todas'?datos.length:datos.filter(p=>p.fase===f).length;
  $('#filtros').innerHTML=['todas',...Object.keys(FASES)].filter(f=>f==='todas'||n(f)).map(f=>`<button class="chip" data-f="${f}" aria-pressed="${f===faseActiva}">${f==='todas'?'Todas':FASES[f]} <b>${n(f)}</b></button>`).join('');
}
const rango=f=>{const i=Object.keys(FASES).indexOf(f);return i<0?99:i};
const porNombre=(a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base',numeric:true});
const comparar=(a,b)=>(orden==='estado'?(rango(a.fase)-rango(b.fase))||porNombre(a,b):porNombre(a,b))*dir;
function pintar(){
  const q=$('#buscar').value.trim().toLowerCase();
  const v=datos.filter(p=>(faseActiva==='todas'||p.fase===faseActiva)&&(p.nombre+' '+(p.descripcion||'')).toLowerCase().includes(q)).sort(comparar);
  $('#lista').innerHTML=v.length?v.map((p,i)=>{
    const r=admin?seguro(p.repo):'',u=seguro(p.url);
    const bloq=!admin&&p.fase==='produccion'&&(p.url||p.urlCifrado);
    return `<article class="card" style="--c:var(--${esc(p.fase)},var(--mu));animation-delay:${i*30}ms">
      <span class="fase"><i></i>${esc(FASES[p.fase]||p.fase)}${p.privado&&admin?` · ${I.lock} privado`:''}</span>
      <h2>${esc(p.nombre)}</h2><p class="desc">${esc(p.descripcion)}</p>
      <div class="links">${bloq?`<span class="bloq" title="Disponible en modo admin">${I.lock} Sitio</span>`:u?`<a href="${u}" target="_blank" rel="noopener">${I.ext} Sitio</a>`:'<span>sin URL</span>'}${admin?(r?`<a href="${r}" target="_blank" rel="noopener">${I.repo} Repo</a>`:'<span>sin repo</span>'):''}
      ${admin?`<button data-ed="${esc(p.id)}">Editar</button><button class="del" data-del="${esc(p.id)}">Borrar</button>`:''}</div>
    </article>`}).join(''):'<p class="vacio">Sin resultados.</p>';
  const prod=datos.filter(p=>p.fase==='produccion').length;
  $('#resumen').textContent=`${datos.length} proyectos · ${prod} en producción${admin?' · modo admin':''}`;
}
function modo(){
  $('#nuevo').hidden=!admin;
  const l=$('#llave');l.innerHTML=admin?I.unlock+' Salir':I.lock+' Admin';l.classList.toggle('on',admin);
  $('#mNuevo').hidden=!admin;$('#mLlave').innerHTML=(admin?I.unlock:I.lock)+'<span>'+(admin?'Salir':'Admin')+'</span>';$('#mLlave').classList.toggle('on',admin);
  filtros();pintar();
}

/* --- eventos --- */
$('#filtros').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;faseActiva=b.dataset.f;filtros();pintar()};
$('#buscar').oninput=pintar;
$('#orden').onchange=e=>{orden=e.target.value;pintar()};
$('#dir').onclick=()=>{dir*=-1;$('#dir').textContent=dir>0?'↑ Asc':'↓ Desc';pintar()};
$('#tema').onclick=()=>{const r=document.documentElement,o=matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.tema=(r.dataset.tema||(o?'oscuro':'claro'))==='oscuro'?'claro':'oscuro'};
document.querySelectorAll('[data-cerrar]').forEach(b=>b.onclick=()=>b.closest('dialog').close());

$('#llave').onclick=()=>{
  if(admin){admin=false;clave='';modo();cargar().catch(()=>{}).then(modo);return}
  $('#pw').value='';$('#avClave').textContent='';$('#dClave').showModal();$('#pw').focus();
};
$('#fClave').onsubmit=async e=>{
  e.preventDefault();const pw=$('#pw').value.trim();
  if(!verificador){$('#avClave').textContent='El JSON cargado no es el nuevo (falta "verificador"). Subí bitacora/proyectos.json a bd y recargá con Ctrl+F5.';return}
  $('#avClave').textContent='Verificando…';
  try{
    await descifrar(verificador,pw);
    clave=pw;
    await Promise.all(datos.map(async p=>{p.repo=p.repoCifrado?await descifrar(p.repoCifrado,pw):'';if(p.urlCifrado)p.url=await descifrar(p.urlCifrado,pw)}));
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

$('#nuevo').innerHTML=I.plus+' Nuevo';$('#tema').innerHTML=I.tema;$('#tema').setAttribute('aria-label','Cambiar tema claro/oscuro');

/* --- menú fijo móvil --- */
const mb=(id,ico,txt)=>$(id).innerHTML=ico+'<span>'+txt+'</span>';
mb('#mBuscar',I.search,'Buscar');mb('#mOrden',I.sort,'Orden');mb('#mTema',I.tema,'Tema');mb('#mNuevo',I.plus,'Nuevo');
$('#mBuscar').onclick=()=>{const on=document.body.classList.toggle('buscando');$('#mBuscar').setAttribute('aria-pressed',on);if(on)$('#buscar').focus()};
$('#mOrden').onclick=()=>{
  const ciclo=[['nombre',1],['nombre',-1],['estado',1],['estado',-1]];
  const i=ciclo.findIndex(c=>c[0]===orden&&c[1]===dir),n=ciclo[(i+1)%4];
  orden=n[0];dir=n[1];$('#orden').value=orden;$('#dir').textContent=dir>0?'↑ Asc':'↓ Desc';pintar();
  toast('Orden: '+orden+(dir>0?' ascendente':' descendente'));
};
$('#mTema').onclick=()=>$('#tema').click();
$('#mNuevo').onclick=()=>$('#nuevo').click();
$('#mLlave').onclick=()=>$('#llave').click();

/* --- instalable (PWA) --- */
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('servicio.js?v='+VERSION).catch(()=>{}));
$('#version').textContent='Bitácora v'+VERSION;
