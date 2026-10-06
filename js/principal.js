/* ===== CONFIGURACIÓN ===== */
const FASES={produccion:'En producción',desarrollo:'En desarrollo',prototipo:'Prototipo',pausa:'En pausa',idea:'Idea'};
const VERSION='1.5.1'; // subí este número en cada cambio: actualiza la app instalada
const API='/.netlify/functions/bitacora'; // el token de GitHub vive en Netlify, no aquí
/* ========================== */
let dens=(()=>{try{const d=localStorage.getItem('densidad');return d==='b'?'b':'a'}catch(e){return 'a'}})(),orden='nombre',dir=1,datos=[],verificador='',faseActiva='todas',admin=false,clave='',editId=null,nombreFantasiaEditada=false;
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
doc:svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
down:svg('<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>'),
edit:svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
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
  const j=await r.json();verificador=j.verificador||'';datos=(j.proyectos||[]).map(p=>({...p,nombre_fantasia:p.nombre_fantasia||p.nombre}));
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
const nombreVisible=p=>p.nombre_fantasia||p.nombre;
const porNombre=(a,b)=>nombreVisible(a).localeCompare(nombreVisible(b),'es',{sensitivity:'base',numeric:true});
const comparar=(a,b)=>(orden==='estado'?(rango(a.fase)-rango(b.fase))||porNombre(a,b):porNombre(a,b))*dir;
function aplicarDens(){$('#lista').dataset.dens=dens;$('#densidad').value=dens}
function pintar(){
  const q=$('#buscar').value.trim().toLowerCase();
  const v=datos.filter(p=>(faseActiva==='todas'||p.fase===faseActiva)&&(nombreVisible(p)+' '+p.nombre+' '+(p.descripcion||'')).toLowerCase().includes(q)).sort(comparar);
  $('#lista').innerHTML=v.length?v.map((p,i)=>{
    const r=admin?seguro(p.repo):'',u=seguro(p.url);
    const bloq=!admin&&p.fase==='produccion'&&(p.url||p.urlCifrado);
    return `<article class="card" title="${esc(p.descripcion)}" style="--c:var(--${esc(p.fase)},var(--mu));animation-delay:${i*30}ms">
      <span class="fase" title="${esc(FASES[p.fase]||p.fase)}"><i></i><em class="t">${esc(FASES[p.fase]||p.fase)}${p.privado&&admin?` · ${I.lock} privado`:''}</em></span>
      <h2>${esc(nombreVisible(p))}</h2><p class="desc">${esc(p.descripcion)}</p>
      <div class="links${admin?' admin':''}">${bloq?`<span class="bloq" title="Disponible en modo admin">${I.lock}<em class="t">Sitio</em></span>`:u?`<a href="${u}" target="_blank" rel="noopener">${I.ext}<em class="t">Sitio</em></a>`:'<span>sin URL</span>'}${admin?(r?`<a href="${r}" target="_blank" rel="noopener">${I.repo}<em class="t">Repo</em></a>`:'<span>sin repo</span>'):''}
      ${admin?`${p.repo?`<button data-docs="${esc(p.id)}">${I.doc}<em class="t">Docs</em></button>`:''}<button data-ed="${esc(p.id)}">${I.edit}<em class="t">Editar</em></button>`:''}</div>
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
$('#densidad').onchange=e=>{dens=e.target.value==='b'?'b':'a';try{localStorage.setItem('densidad',dens)}catch(x){}aplicarDens()};
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
  nombreFantasiaEditada=!!id;
  $('#tEd').textContent=id?'Editar proyecto':'Nuevo proyecto';
  $('#eNombre').value=p.nombre||'';$('#eNombre').readOnly=!!id;$('#eFantasia').value=p.nombre_fantasia||p.nombre||'';$('#eDesc').value=p.descripcion||'';$('#eRepo').value=p.repo||'';
  $('#eUrl').value=p.url||'';$('#eFase').value=p.fase;$('#ePriv').checked=!!p.privado;$('#avEd').textContent='';
  $('#bEd').hidden=!id;
  $('#dEd').showModal();
}
$('#eNombre').oninput=()=>{if(!editId&&!nombreFantasiaEditada)$('#eFantasia').value=$('#eNombre').value};
$('#eFantasia').oninput=()=>{nombreFantasiaEditada=true};
$('#nuevo').onclick=()=>abrirEd(null);
$('#lista').onclick=async e=>{
  const dc=e.target.closest('[data-docs]');if(dc)return verDocs(dc.dataset.docs);
  const ed=e.target.closest('[data-ed]');
  if(ed)return abrirEd(ed.dataset.ed);
};
$('#bEd').onclick=async()=>{
  if(!editId||!confirm('¿Borrar este proyecto?'))return;
  const b=$('#bEd');b.disabled=true;$('#avEd').textContent='Borrando…';
  const copia=[...datos];datos=datos.filter(p=>p.id!==editId);
  try{await guardar();$('#dEd').close();toast('Borrado');modo()}
  catch(er){datos=copia;$('#avEd').textContent=er.message}
  b.disabled=false;
};
$('#fEd').onsubmit=async e=>{
  e.preventDefault();const g=$('#gEd');g.disabled=true;$('#avEd').textContent='Guardando…';
  const anterior=datos.find(p=>p.id===editId),nombreInterno=anterior?anterior.nombre:$('#eNombre').value.trim();
  const nuevo={...(anterior||{}),id:anterior?anterior.id:crypto.randomUUID().slice(0,8),nombre:nombreInterno,
    nombre_fantasia:$('#eFantasia').value.trim()||nombreInterno,descripcion:$('#eDesc').value.trim(),
    repo:$('#eRepo').value.trim(),url:$('#eUrl').value.trim(),fase:$('#eFase').value,privado:$('#ePriv').checked};
  const copia=[...datos];
  datos=editId?datos.map(p=>p.id===editId?nuevo:p):[nuevo,...datos];
  try{await guardar();$('#dEd').close();toast('Guardado en GitHub');modo()}
  catch(er){datos=copia;$('#avEd').textContent=er.message}
  g.disabled=false;
};

aplicarDens();
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

/* --- documentación (de cada repo, en documentacion-central/<repo>/documentacion; solo admin) --- */
let docsRepo='';
const repoDe=u=>(u||'').replace(/^https?:\/\/github\.com\//,'').replace(/\/$/,'');
const apiPost=c=>fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clave,...c})});
const tam=n=>n<1024?n+' B':n<1048576?Math.round(n/1024)+' KB':(n/1048576).toFixed(1)+' MB';
async function verDocs(id){
  const p=datos.find(x=>x.id===id);if(!p)return;
  docsRepo=repoDe(p.repo);
  $('#tDocs').textContent='Documentación · '+nombreVisible(p);$('#listaDocs').innerHTML='<p class="vacio">Buscando…</p>';$('#dDocs').showModal();
  try{
    const r=await apiPost({accion:'docs',repo:docsRepo}),j=await r.json();
    if(!r.ok)throw new Error(j.error||'Error '+r.status);
    $('#listaDocs').innerHTML=j.archivos.length?j.archivos.map(a=>`<div class="doc"><span>${esc(a.nombre)}<small>${tam(a.tam)}</small></span><a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener">${I.down} Abrir</a></div>`).join(''):'<p class="vacio">Sin PDF en documentacion-central para este proyecto.</p>';
  }catch(e){$('#listaDocs').innerHTML=`<p class="aviso">${esc(e.message)}</p>`}
}
