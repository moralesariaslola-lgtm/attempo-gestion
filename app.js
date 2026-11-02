
(function(){
'use strict';
const sections={inicio:['◈','Inicio','El estado de las propuestas y actuaciones de un vistazo.'],bolos:['🎤','Bolos','Todas las actuaciones, desde el primer contacto hasta el cierre.'],clientes:['♧','Clientes','Contactos y entidades que contratan a ATTEMPO.'],presupuestos:['€','Presupuestos','Propuestas musicales: sin emitir facturas.'],encuestas:['✓','Disponibilidad','Confirmad quién puede acudir a cada actuación.'],tareas:['☷','Producción','Reparto de tareas, preparación y logística.'],gastos:['↗','Gastos','Previsiones y pagos a proveedores externos.'],repertorio:['♫','Repertorio','Canciones, enlaces y notas de cada concierto.'],equipo:['♙','Equipo','Todas las personas tienen los mismos permisos.']};
const tableBy={bolos:'at_bolos',clientes:'at_clientes',presupuestos:'at_presupuestos',encuestas:'at_encuestas',tareas:'at_tareas',gastos:'at_gastos',repertorio:'at_repertorio'};
const status={negociacion:'En negociación',presupuesto_enviado:'Presupuesto enviado',confirmado:'Confirmado',realizado:'Realizado',cerrado:'Cerrado',no_contratado:'No contratado',borrador:'Borrador',enviado:'Enviado',aceptado:'Aceptado',rechazado:'Rechazado',abierta:'Abierta',cerrada:'Cerrada',pendiente:'Pendiente',en_curso:'En curso',hecha:'Hecha',previsto:'Previsto',pagado:'Pagado'};
const state={section:'inicio',filter:'',search:'',client:null,user:null,data:{},ready:false};
let sb=null, authVersion=0, installPrompt=null, recoveryMode=false;
const id=(s)=>document.getElementById(s);
const safe=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const short=d=>{if(!d)return 'Fecha por confirmar';const v=String(d).slice(0,10).split('-');return v.length===3?`${v[2]}/${v[1]}/${v[0]}`:safe(d)};
const pick=(table,key)=>((state.data[table]||[]).find(r=>Number(r.id)===Number(key)));
const opts=(rows,selected,empty='Sin vincular')=>`<option value="">${safe(empty)}</option>${rows.map(o=>`<option value="${o.id}" ${String(o.id)===String(selected)?'selected':''}>${safe(o.nombre||o.titulo)}</option>`).join('')}`;
const rowstate=(v)=>v==='confirmado'||v==='aceptado'||v==='hecha'||v==='cerrado'||v==='pagado'?'ok':v==='no_contratado'||v==='rechazado'?'bad':'wait';
const tag=(v)=>`<span class="tag ${rowstate(v)}">${safe(status[v]||v||'Sin estado')}</span>`;
const input=(label,name,value='',type='text',full=false,extra='')=>`<label class="${full?'full':''}">${safe(label)}<input name="${name}" type="${type}" value="${safe(value??'')}" ${extra}></label>`;
const texta=(label,name,value='',full=true)=>`<label class="${full?'full':''}">${safe(label)}<textarea name="${name}">${safe(value||'')}</textarea></label>`;
const select=(label,name,values,val='',full=false)=>`<label class="${full?'full':''}">${safe(label)}<select name="${name}">${values.map(([v,t])=>`<option value="${safe(v)}" ${String(v)===String(val)?'selected':''}>${safe(t)}</option>`).join('')}</select></label>`;
const bOptions=()=>opts(state.data.at_bolos||[],'','Sin bolo / gasto general');
function showError(message){id('authMessage').textContent=message||'';}
function open(title,body){id('modalTitle').textContent=title;id('modalBody').innerHTML=body;id('overlay').classList.add('open');document.body.style.overflow='hidden';}
function close(){id('overlay').classList.remove('open');document.body.style.overflow='';}
function missingConfig(){return !(window.ATTEMPO_CONFIG?.supabaseUrl||'').startsWith('https://')||!/^(sb_publishable_|eyJ)/.test(window.ATTEMPO_CONFIG?.publishableKey||'');}
async function init(){
 if(missingConfig()){id('shell').style.display='none';id('authView').style.display='block';showError('Falta configurar config.js con el URL y la clave pública del proyecto Supabase exclusivo de ATTEMPO. Consulta INSTRUCCIONES.txt.');id('authView').querySelector('button').disabled=true;return;}
 if(!window.supabase?.createClient){id('authView').style.display='block';showError('No se pudo cargar la biblioteca de Supabase. Comprueba tu conexión a Internet.');return;}
 recoveryMode=['invite','recovery'].includes(new URLSearchParams(location.hash.slice(1)).get('type'));
 sb=window.supabase.createClient(window.ATTEMPO_CONFIG.supabaseUrl,window.ATTEMPO_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
 const {data,error}=await sb.auth.getUser();await authScreen(error?null:data?.user||null);
 sb.auth.onAuthStateChange((event,session)=>{setTimeout(()=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true;passwordForm();return;}if(event!=='INITIAL_SESSION')authScreen(session?.user||null);},0);});
 if(location.hash.includes('type=recovery')||location.hash.includes('type=invite')){recoveryMode=true;passwordForm();}
 window.addEventListener('hashchange',()=>{if(state.ready)nav(location.hash.slice(1));});
}
async function authScreen(user){
 const version=++authVersion;state.user=user;state.ready=false;state.data={};close();
 for(const el of ['shell','mobileNav','signout'])id(el).style.display='none';
 id('content').replaceChildren();id('sideNav').replaceChildren();id('mobileNav').replaceChildren();id('userLabel').textContent='';
 id('authView').style.display='block';
 if(!user)return;
 id('signout').style.display='inline-flex';
 try{
 const {data,error}=await sb.from('at_miembros').select('id,nombre,activo').eq('id',user.id).maybeSingle();
 if(version!==authVersion)return;
 if(error)throw error;
 if(!data?.activo){showError('Tu cuenta todavía no tiene acceso al equipo. Contacta con ATTEMPO para que autoricen tu cuenta.');return;}
 await load();if(version!==authVersion)return;
 if(recoveryMode){passwordForm();return;}
 id('userLabel').textContent=data.nombre;state.ready=true;showError('');
 id('authView').style.display='none';id('shell').style.display='';id('mobileNav').style.display='';
 nav(sections[location.hash.slice(1)]?location.hash.slice(1):'inicio');
 }catch(e){if(version!==authVersion)return;state.data={};showError('No se pudo comprobar el acceso. Comprueba la conexión y vuelve a entrar.');console.error(e);}
}
async function login(){
 const email=id('loginEmail').value.trim(),password=id('loginPassword').value;
 if(!email||!password){showError('Introduce tu correo y contraseña.');return;}
 const btn=id('loginButton');btn.disabled=true;showError('Comprobando acceso…');
 try{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;id('loginPassword').value='';await authScreen(data.user);}
 catch(e){showError(e.status===400?'Correo o contraseña incorrectos. Revisa también que hayas aceptado tu invitación.':'No se pudo iniciar sesión. Comprueba la conexión e inténtalo de nuevo.');}
 finally{btn.disabled=false;}
}
async function logout(){
 ++authVersion;await sb?.auth.signOut();state.user=null;state.ready=false;state.data={};recoveryMode=false;
 id('loginPassword').value='';await authScreen(null);showError('');history.replaceState(null,'',location.pathname);
}
async function recover(){
 const email=id('loginEmail').value.trim();if(!email){showError('Escribe tu correo y pulsa de nuevo «He olvidado mi contraseña».');return;}
 try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;showError('Si tu cuenta está registrada, recibirás un correo con los pasos para recuperar el acceso.');}catch(e){showError('No se pudo solicitar el correo. Inténtalo más tarde.');}
}
function passwordForm(){open('Establece tu contraseña',`<form onsubmit="event.preventDefault();app.setPassword()"><div class="field-grid"><label>Nueva contraseña<input id="newPassword" type="password" autocomplete="new-password" minlength="12" required></label><label>Repite la contraseña<input id="confirmPassword" type="password" autocomplete="new-password" minlength="12" required></label></div><p>Mínimo 12 caracteres.</p><p id="passwordError" role="status"></p><button class="btn primary" type="submit">Guardar contraseña</button></form>`);}
async function setPassword(){const password=id('newPassword').value;if(password.length<12||password!==id('confirmPassword').value){id('passwordError').textContent='Las contraseñas deben coincidir y tener al menos 12 caracteres.';return;}const {error}=await sb.auth.updateUser({password});if(error){id('passwordError').textContent='No se pudo guardar. Vuelve a abrir el enlace de invitación o recuperación.';return;}recoveryMode=false;history.replaceState(null,'',location.pathname);close();const {data}=await sb.auth.getUser();await authScreen(data.user);}
async function install(){if(installPrompt){await installPrompt.prompt();installPrompt=null;return;}open('Instalar ATTEMPO',`<p>Android: abre este enlace en Chrome, pulsa el menú ⋮ y elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p><p>iPhone: abre el enlace en Safari, pulsa Compartir y <strong>Añadir a pantalla de inicio</strong>.</p><p>En ordenador, utiliza el icono de instalación de la barra de direcciones si está disponible.</p><p>Necesitas conexión a Internet para consultar y guardar los datos del equipo.</p>`);}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
async function load(){
 const userId=state.user?.id;if(!userId)return;
 const tables=['at_miembros','at_clientes','at_bolos','at_presupuestos','at_gastos','at_tareas','at_encuestas','at_respuestas','at_repertorio'];
 const results=await Promise.all(tables.map(t=>sb.from(t).select('*')));
 if(state.user?.id!==userId)return;
 const next={};for(let i=0;i<tables.length;i++){if(results[i].error)throw new Error(`${tables[i]}: ${results[i].error.message}`);next[tables[i]]=results[i].data||[];}state.data=next;
}
const cliName=x=>pick('at_clientes',x)?.nombre||'Cliente sin asignar';
const boloName=x=>pick('at_bolos',x)?.titulo||'Sin actuación';
const memberName=x=>(state.data.at_miembros||[]).find(m=>m.id===x)?.nombre||'Sin asignar';
const optionsClient=v=>`<option value="">Sin cliente</option>${(state.data.at_clientes||[]).map(c=>`<option value="${c.id}" ${String(v)===String(c.id)?'selected':''}>${safe(c.nombre)}</option>`).join('')}`;
const optionsBolo=v=>`<option value="">Sin bolo</option>${(state.data.at_bolos||[]).map(c=>`<option value="${c.id}" ${String(v)===String(c.id)?'selected':''}>${safe(c.titulo)}</option>`).join('')}`;
const optionsMember=v=>`<option value="">Sin asignar</option>${(state.data.at_miembros||[]).filter(x=>x.activo).map(c=>`<option value="${safe(c.id)}" ${v===c.id?'selected':''}>${safe(c.nombre)}</option>`).join('')}`;
function nav(section){if(!state.ready||!state.user||!sections[section])return;history.replaceState(null,'','#'+section);state.section=section;state.search='';state.filter='';const buttons=Object.entries(sections).map(([k,v])=>`<button type="button" class="${k===section?'active':''}" onclick="app.nav('${k}')"><span>${v[0]}</span><span>${v[1]}</span></button>`).join('');id('sideNav').innerHTML='<span class="group-title">ESPACIO COMPARTIDO</span>'+buttons;id('mobileNav').innerHTML=buttons;id('sectionEye').textContent='ATTEMPO / '+(section==='inicio'?'GESTIÓN':'EQUIPO');id('sectionTitle').textContent=sections[section][1];id('sectionDesc').textContent=sections[section][2];id('newButton').style.display=(section==='inicio'||section==='equipo')?'none':'inline-flex';render();}
function filterBar(withStatus=false){return `<div class="searchbar ${!withStatus?'single':''}"><input aria-label="Buscar" id="searchBox" type="search" value="${safe(state.search)}" placeholder="Buscar por nombre, cliente o detalle…" oninput="app.filter(this.value,null)">${withStatus?`<select aria-label="Filtrar estado" id="filterBox" onchange="app.filter(null,this.value)"><option value="">Todos</option>${(state.section==='bolos'?[['negociacion','Negociación'],['presupuesto_enviado','Presupuesto enviado'],['confirmado','Confirmados'],['realizado','Realizados'],['cerrado','Cerrados'],['no_contratado','No contratados']]:state.section==='tareas'?[['pendiente','Pendientes'],['en_curso','En curso'],['hecha','Hechas']]:state.section==='presupuestos'?[['borrador','Borradores'],['enviado','Enviados'],['aceptado','Aceptados']]:state.section==='encuestas'?[['abierta','Abiertas'],['cerrada','Cerradas']]:[['previsto','Previstos'],['pagado','Pagados']]).map(([v,t])=>`<option value="${v}" ${state.filter===v?'selected':''}>${t}</option>`).join('')}</select>`:''}</div>`;}
function filter(search,option){if(search!==null)state.search=search;if(option!==null)state.filter=option;render();const box=id('searchBox');if(box&&search!==null){box.focus();box.setSelectionRange(box.value.length,box.value.length);}}
function records(t){const term=state.search.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return (state.data[t]||[]).filter(x=>(!state.filter||x.estado===state.filter)&&(!term||JSON.stringify(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term))).sort((a,b)=>((b.fecha||b.creado_en||'')+'').localeCompare((a.fecha||a.creado_en||'')+''));}
const actions=(arr)=>`<div class="card-actions">${arr.map(([title,code,primary])=>`<button type="button" class="btn small ${primary?'primary':''}" onclick="${code}">${title}</button>`).join('')}</div>`;
function render(){if(!state.ready)return;const section=state.section;if(section==='inicio'){dashboard();return}if(section==='equipo'){id('content').innerHTML=`<div class="insight"><strong>Un equipo, los mismos permisos</strong><p>Aquí no hay administradores, gestores ni Junta. Todos los integrantes autorizados pueden trabajar en clientes, presupuestos, bolos, tareas y gastos. Cada persona accede con su propia cuenta.</p></div><div class="cards">${(state.data.at_miembros||[]).filter(x=>x.activo).map(x=>`<div class="card"><h3>♙ ${safe(x.nombre)}</h3><p>Acceso completo a ATTEMPO</p></div>`).join('')||'<div class="empty">Todavía no hay integrantes autorizados.</div>'}</div>`;return;}
 let html=filterBar(['bolos','presupuestos','encuestas','tareas','gastos'].includes(section));const data=records(tableBy[section]);
 html+=`<div class="cards">${data.length?data.map(x=>card(section,x)).join(''):'<div class="empty">No hay registros con estos filtros.<br>Pulsa «＋ Nuevo» para empezar.</div>'}</div>`;id('content').innerHTML=html;}
function dashboard(){const d=state.data;
 const activos=(d.at_bolos||[]).filter(x=>['negociacion','presupuesto_enviado'].includes(x.estado)).length;
 const confirmados=(d.at_bolos||[]).filter(x=>['confirmado','realizado'].includes(x.estado)).length;
 const cerrados=(d.at_bolos||[]).filter(x=>x.estado==='cerrado').length;
 const porCobrar=(d.at_presupuestos||[]).filter(x=>['enviado','aceptado'].includes(x.estado)).reduce((t,x)=>t+Number(x.importe||0),0);
 const soon=(d.at_bolos||[]).filter(x=>x.fecha&&x.fecha>=new Date().toISOString().slice(0,10)&&x.estado!=='no_contratado').sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,5);
 id('content').innerHTML=`<div class="metrics"><div class="metric"><strong>${activos}</strong><span>Propuestas en marcha</span></div><div class="metric"><strong>${confirmados}</strong><span>Bolos contratados</span></div><div class="metric"><strong>${cerrados}</strong><span>Actuaciones cerradas</span></div><div class="metric highlight"><strong class="money">${money(porCobrar)}</strong><span>Presupuestos enviados / aceptados (no son cobros)</span></div></div><div class="insight"><strong>La música primero. La gestión, más sencilla.</strong><p>Presupuestos, actuaciones y disponibilidad en un solo lugar. Las facturas se gestionan externamente con Artistamente o directamente por cada proveedor; esta aplicación no emite facturas.</p></div><div class="section-heading"><h2>Próximas actuaciones</h2><button type="button" class="btn small" onclick="app.nav('bolos')">Ver todas ›</button></div><div class="cards">${soon.length?soon.map(x=>card('bolos',x)).join(''):'<div class="empty">Cuando añadas una actuación con fecha, aparecerá aquí.</div>'}</div>`;
}
function card(k,x){const bold=(s)=>`<h3>${safe(s)}</h3>`;let body='',btn=[];
 if(k==='bolos'){body=`<div class="card-head"><div>${bold(x.titulo)}<p>${safe(cliName(x.cliente_id))} · ${short(x.fecha)}</p></div>${tag(x.estado)}</div><div class="tags"><span class="tag">⌖ ${safe(x.lugar||'Lugar pendiente')}</span><span class="tag">↗ ${safe(x.proximo_paso||'Sin próximo paso')}</span></div>`;btn=[['👁 Ver resumen',`app.detail('bolos',${x.id})`,true],['✎ Editar',`app.edit('bolos',${x.id})`],['Disponibilidad',`app.openPoll(${x.id})`]];}
 else if(k==='clientes'){body=`${bold(x.nombre)}<p>${safe([x.contacto,x.telefono,x.email].filter(Boolean).join(' · ')||'Sin datos de contacto')}</p>`;btn=[['✎ Editar',`app.edit('clientes',${x.id})`,true]];}
 else if(k==='presupuestos'){body=`<div class="card-head"><div>${bold(x.titulo)}<p>${safe(boloName(x.bolo_id))} · ${short(x.fecha_envio)}</p></div>${tag(x.estado)}</div><div class="tags"><span class="tag money">${money(x.importe)} · Base presupuestada</span></div>`;btn=[['👁 Ver propuesta',`app.detail('presupuestos',${x.id})`,true],['✎ Editar',`app.edit('presupuestos',${x.id})`]];}
 else if(k==='gastos'){body=`<div class="card-head"><div>${bold(x.concepto)}<p>${safe(x.proveedor||'Proveedor sin indicar')} · ${safe(boloName(x.bolo_id))}</p></div>${tag(x.estado)}</div><div class="tags"><span class="tag money">${money(x.importe)}</span><span class="tag">${x.facturado_por_tercero?'Factura de tercero':'Sin factura externa registrada'}</span></div>`;btn=[['✎ Editar',`app.edit('gastos',${x.id})`,true]];}
 else if(k==='tareas'){body=`<div class="card-head"><div>${bold(x.titulo)}<p>${safe(boloName(x.bolo_id))} · ${safe(x.area)}</p></div>${tag(x.estado)}</div><p>Responsable: ${safe(memberName(x.responsable_id))}${x.fecha_limite?' · '+short(x.fecha_limite):''}</p>`;btn=[['✎ Editar',`app.edit('tareas',${x.id})`,true]];}
 else if(k==='encuestas'){const ans=(state.data.at_respuestas||[]).filter(r=>r.encuesta_id===x.id),mine=ans.find(a=>a.usuario_id===state.user.id);body=`<div class="card-head"><div>${bold(x.pregunta)}<p>${safe(boloName(x.bolo_id))} · Hasta ${short(x.fecha_limite)}</p></div>${tag(x.estado)}</div><div class="tags"><span class="tag ok">Sí ${ans.filter(a=>a.respuesta==='si').length}</span><span class="tag wait">Duda ${ans.filter(a=>a.respuesta==='duda').length}</span><span class="tag bad">No ${ans.filter(a=>a.respuesta==='no').length}</span><span class="tag">Tu respuesta: ${safe(mine?.respuesta||'Sin responder')}</span></div>`;btn=x.estado==='abierta'?[['✓ Puedo',`app.respond(${x.id},'si')`,true],['? Dudoso',`app.respond(${x.id},'duda')`],['× No puedo',`app.respond(${x.id},'no')`],['Ver respuestas',`app.detail('encuestas',${x.id})`],['Editar',`app.edit('encuestas',${x.id})`]]:[['Ver respuestas',`app.detail('encuestas',${x.id})`,true],['Editar',`app.edit('encuestas',${x.id})`]];}
 else if(k==='repertorio'){body=`${bold(x.titulo)}<p>${safe(boloName(x.bolo_id))} · ${safe(x.notas||'')}</p>`;btn=[['✎ Editar',`app.edit('repertorio',${x.id})`,true],...(x.enlace&&/^https:\/\//.test(x.enlace)?[['Abrir enlace',`app.openLink(${x.id})`]]:[])];}
 return `<article class="card">${body}${actions(btn)}</article>`;}
function createCurrent(){edit(state.section,null)}
function edit(k,key){if(!state.ready)return;const row=key?pick(tableBy[k],key)||{}:{},f=[];let title='Nuevo';
 if(k==='clientes'){title=key?'Editar cliente':'Nuevo cliente';f.push(input('Nombre','nombre',row.nombre,'text',true,'required maxlength="180"'),input('Persona de contacto','contacto',row.contacto),input('Teléfono','telefono',row.telefono,'tel'),input('Correo','email',row.email,'email',true),texta('Notas','notas',row.notas));}
 else if(k==='bolos'){title=key?'Editar bolo':'Nuevo bolo';f.push(input('Nombre de la actuación','titulo',row.titulo,'text',true,'required maxlength="180"'),`<label>Cliente<select name="cliente_id">${optionsClient(row.cliente_id)}</select></label>`,select('Estado','estado',[['negociacion','En negociación'],['presupuesto_enviado','Presupuesto enviado'],['confirmado','Confirmado'],['realizado','Realizado'],['cerrado','Cerrado'],['no_contratado','No contratado']],row.estado||'negociacion'),input('Fecha','fecha',row.fecha,'date'),input('Hora','hora',String(row.hora||'').slice(0,5),'time'),input('Lugar','lugar',row.lugar,'text',true),texta('Descripción del encargo','descripcion',row.descripcion),texta('Próximo paso','proximo_paso',row.proximo_paso),texta('Necesidades técnicas','tecnica',row.tecnica),texta('Vestuario','vestuario',row.vestuario),texta('Notas internas','notas',row.notas));}
 else if(k==='presupuestos'){title=key?'Editar presupuesto':'Nuevo presupuesto';f.push(`<label class="full">Bolo<select name="bolo_id" required>${optionsBolo(row.bolo_id)}</select></label>`,input('Título','titulo',row.titulo||'Propuesta musical','text',true),select('Estado','estado',[['borrador','Borrador'],['enviado','Enviado'],['aceptado','Aceptado'],['rechazado','Rechazado']],row.estado||'borrador'),input('Fecha de envío','fecha_envio',row.fecha_envio,'date'),'<div class="full"><strong>Partidas del presupuesto (sin IVA)</strong><div id="items"></div><button type="button" class="btn small" onclick="app.addItem()">＋ Añadir partida</button><p class="small muted">Se suman automáticamente. Las facturas se tramitan fuera de ATTEMPO.</p></div>',texta('Condiciones / observaciones','observaciones',row.observaciones));}
 else if(k==='gastos'){title=key?'Editar gasto':'Nuevo gasto';f.push(input('Concepto','concepto',row.concepto,'text',true,'required'),`<label>Bolo<select name="bolo_id">${optionsBolo(row.bolo_id)}</select></label>`,input('Proveedor / colaborador','proveedor',row.proveedor),input('Importe (€)','importe',row.importe||'','number',false,'min="0" step="0.01" required'),select('Estado','estado',[['previsto','Previsto'],['pagado','Pagado']],row.estado||'previsto'),input('Fecha','fecha',row.fecha,'date'),`<label class="full"><span>Factura emitida por proveedor externo</span><select name="facturado_por_tercero"><option value="false" ${!row.facturado_por_tercero?'selected':''}>No / pendiente</option><option value="true" ${row.facturado_por_tercero?'selected':''}>Sí (externa)</option></select></label>`,texta('Notas','notas',row.notas));}
 else if(k==='tareas'){title=key?'Editar tarea':'Nueva tarea';f.push(input('Tarea','titulo',row.titulo,'text',true,'required'),`<label>Bolo<select name="bolo_id">${optionsBolo(row.bolo_id)}</select></label>`,select('Área','area',[['comercial','Comercial'],['produccion','Producción'],['repertorio','Repertorio'],['logistica','Logística'],['marketing','Marketing']],row.area||'produccion'),select('Estado','estado',[['pendiente','Pendiente'],['en_curso','En curso'],['hecha','Hecha']],row.estado||'pendiente'),`<label>Responsable<select name="responsable_id">${optionsMember(row.responsable_id)}</select></label>`,input('Fecha límite','fecha_limite',row.fecha_limite,'date'),texta('Notas / instrucciones','descripcion',row.descripcion));}
 else if(k==='encuestas'){title=key?'Editar encuesta':'Nueva encuesta';f.push(`<label class="full">Bolo<select name="bolo_id" required>${optionsBolo(row.bolo_id)}</select></label>`,input('Pregunta','pregunta',row.pregunta||'¿Puedes participar en esta actuación?','text',true,'required'),input('Fecha límite','fecha_limite',row.fecha_limite,'date'),select('Estado','estado',[['abierta','Abierta'],['cerrada','Cerrada']],row.estado||'abierta'));}
 else if(k==='repertorio'){title=key?'Editar repertorio':'Añadir canción';f.push(`<label class="full">Bolo<select name="bolo_id" required>${optionsBolo(row.bolo_id)}</select></label>`,input('Canción','titulo',row.titulo,'text',true,'required'),input('Enlace (https://)','enlace',row.enlace,'url',true),texta('Notas / distribución de voces','notas',row.notas));}
 else{return}
 open(title,`<form id="editForm" onsubmit="event.preventDefault();app.save('${k}',${key||'null'})"><div class="field-grid">${f.join('')}</div><div id="formError" class="form-error"></div><div class="form-actions"><button type="button" class="btn" onclick="app.close()">Cancelar</button><button type="submit" class="btn primary" id="saveBtn">Guardar</button></div></form>`);
 if(k==='presupuestos'){const partidas=Array.isArray(row.partidas)?row.partidas:[];for(const x of partidas.length?partidas:[{concepto:'',importe:''}])addItem(x);}
}
function addItem(x={}){const node=document.createElement('div');node.className='line-item';node.innerHTML=`<input aria-label="Descripción de partida" class="part-concept" placeholder="Servicio / formación" value="${safe(x.concepto||'')}"><input aria-label="Importe de partida" class="part-amount" placeholder="€" type="number" min="0" step="0.01" value="${safe(x.importe??'')}"><button type="button" aria-label="Eliminar partida" onclick="this.parentElement.remove()">×</button>`;id('items').append(node);}
async function save(k,key){if(!state.ready)return;const form=id('editForm'),btn=id('saveBtn');if(!form)return;const raw=Object.fromEntries(new FormData(form));const data={};for(const [n,v] of Object.entries(raw))data[n]=v===''?null:v;
 const msg=id('formError');msg.textContent='';btn.disabled=true;
 try{
 if(k==='presupuestos'){const parts=[...form.querySelectorAll('.line-item')].map(node=>({concepto:node.querySelector('.part-concept').value.trim(),importe:Number(node.querySelector('.part-amount').value)})).filter(x=>x.concepto);if(!parts.length)throw Error('Añade al menos una partida al presupuesto');if(parts.some(x=>!Number.isFinite(x.importe)||x.importe<0))throw Error('Revisa los importes');data.partidas=parts;data.importe=parts.reduce((t,x)=>t+x.importe,0);}
 if(k==='gastos'){data.importe=Number(data.importe);data.facturado_por_tercero=data.facturado_por_tercero==='true';}
 for(const field of ['bolo_id','cliente_id'])if(data[field]!=null)data[field]=Number(data[field]);
 if(key)data.id=Number(key);else if(['bolos','clientes','presupuestos'].includes(k))data.creado_por=state.user.id;
 const res=await sb.from(tableBy[k]).upsert(data,{onConflict:'id'}).select('id');if(res.error)throw res.error;
 close();await load();render();
 }catch(e){console.error(e);msg.textContent=e.message||'No se pudo guardar';}finally{btn.disabled=false;}
}
function detail(k,key){const x=pick(tableBy[k],key);if(!x)return;
 if(k==='bolos'){open('Resumen del bolo',`<div class="details"><span class="eyebrow">${safe(status[x.estado]||x.estado)}</span><h3>${safe(x.titulo)}</h3><p class="desc">${safe(cliName(x.cliente_id))} · ${short(x.fecha)} · ${safe(x.lugar||'Lugar pendiente')}</p><h4>¿De qué va el encargo?</h4><div class="notes">${safe(x.descripcion||'Sin descripción todavía.')}</div><h4>Producción · técnico</h4><div class="notes">${safe(x.tecnica||'Pendiente de concretar.')}</div><h4>Vestuario</h4><div class="notes">${safe(x.vestuario||'Pendiente de concretar.')}</div><h4>Siguiente paso</h4><div class="notes">${safe(x.proximo_paso||'Sin paso registrado.')}</div><h4>Notas internas</h4><div class="notes">${safe(x.notas||'Sin notas.')}</div></div>${actions([['Editar bolo',`app.edit('bolos',${key})`,true],['Compartir por WhatsApp',`app.shareBolo(${key})`]])}`);}
 else if(k==='presupuestos'){const lines=Array.isArray(x.partidas)?x.partidas:[];open('Presupuesto',`<div class="details"><img src="./logo-attempo.png" alt="ATTEMPO" style="width:180px;max-width:70%;height:auto"><h3>${safe(x.titulo)}</h3><p>${safe(boloName(x.bolo_id))}</p>${lines.map(i=>`<div class="statrow" style="justify-content:space-between;border-bottom:1px solid #eee;padding:11px 0"><span>${safe(i.concepto)}</span><strong>${money(i.importe)}</strong></div>`).join('')}<h2 style="margin-top:15px">${money(x.importe)} <small style="font-size:12px">+ IVA aplicable</small></h2><div class="notes">${safe(x.observaciones||'Propuesta orientativa, no constituye factura.')}</div><p class="small muted">Los documentos comerciales se preparan aquí; la facturación se realiza externamente, normalmente mediante Artistamente.</p></div>${actions([['Imprimir / guardar PDF',`app.printBudget(${key})`,true],['Editar presupuesto',`app.edit('presupuestos',${key})`]])}`);}
 else if(k==='encuestas'){const ans=(state.data.at_respuestas||[]).filter(y=>y.encuesta_id===x.id);open('Respuestas de disponibilidad',`<div class="details"><h3>${safe(boloName(x.bolo_id))}</h3><p class="desc">${safe(x.pregunta)}</p><div class="cards" style="margin-top:16px">${(state.data.at_miembros||[]).filter(m=>m.activo).map(m=>{const a=ans.find(v=>v.usuario_id===m.id);return `<div class="statrow" style="justify-content:space-between;border-bottom:1px solid #eee;padding:9px 0"><strong>${safe(m.nombre)}</strong>${tag(a?.respuesta||'Sin respuesta')}</div>`}).join('')}</div></div>`);}
}
async function respond(key,answer){if(!state.ready)return;const x=pick('at_encuestas',key);if(x?.estado!=='abierta')return;const {error}=await sb.from('at_respuestas').upsert({encuesta_id:key,usuario_id:state.user.id,respuesta:answer,actualizado_en:new Date().toISOString()},{onConflict:'encuesta_id,usuario_id'});if(error){alert(error.message);return;}await load();render();}
function openPoll(boloId){nav('encuestas');edit('encuestas',null);const select=id('editForm')?.querySelector('select[name=bolo_id]');if(select)select.value=String(boloId);}
function shareBolo(key){
 const x=pick('at_bolos',key);if(!x)return;
 const texto=`ATTEMPO · ${x.titulo}\nCliente: ${cliName(x.cliente_id)}\nFecha: ${short(x.fecha)}\nLugar: ${x.lugar||'Por concretar'}\n${x.descripcion||''}`;
 window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank','noopener,noreferrer');
}
function printBudget(key){
 const p=pick('at_presupuestos',key);if(!p)return;
 const b=pick('at_bolos',p.bolo_id);const cli=b?cliName(b.cliente_id):'Cliente';
 const parts=Array.isArray(p.partidas)?p.partidas:[];
 const w=window.open('','_blank');if(!w){alert('El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para esta app.');return;}
 const logoUrl=new URL('./logo-attempo.png',document.baseURI).href;
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${safe(p.titulo)} · ATTEMPO</title>
 <style>body{font-family:Arial,sans-serif;max-width:760px;margin:38px auto;color:#171717;padding:15px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:23px}img{max-width:180px}h1{font-size:24px;margin-top:40px}h2{font-size:15px;margin-top:32px}p{color:#444;line-height:1.6}.muted{color:#777}.line{display:flex;justify-content:space-between;gap:20px;padding:16px 0;border-bottom:1px solid #e7e7e7}.total{display:flex;justify-content:space-between;background:#eee;padding:22px;margin-top:26px;font-weight:800;font-size:20px}.notice{font-size:12px;color:#777;margin-top:45px}button{padding:10px 17px;background:#171717;color:white;border:0;border-radius:8px;cursor:pointer}@media print{button{display:none}}@page{size:A4;margin:18mm}</style></head><body>
 <header><img src="${logoUrl}" alt="ATTEMPO Choir"><span class="muted">PROPUESTA MUSICAL</span></header>
 <h1>${safe(p.titulo)}</h1><p>Para: <strong>${safe(cli)}</strong><br>Actuación: ${safe(b?.titulo||'Por concretar')}<br>Fecha: ${safe(short(b?.fecha))}<br>Lugar: ${safe(b?.lugar||'Por confirmar')}</p>
 <h2>SERVICIOS INCLUIDOS</h2>${parts.map((r,i)=>`<div class="line"><span>${String(i+1).padStart(2,'0')} · ${safe(r.concepto)}</span><strong>${money(r.importe)}</strong></div>`).join('')}
 <div class="total"><span>BASE DEL SERVICIO</span><span>${money(p.importe)}</span></div><p class="muted">+ IVA aplicable, según corresponda</p>
 <h2>CONDICIONES</h2><p>${safe(p.observaciones||'Propuesta orientativa.')}</p>
 <p class="notice">ATTEMPO CHOIR · Presupuesto comercial, no constituye factura. La facturación se tramita externamente.</p>
 <button onclick="window.print()">Imprimir / guardar como PDF</button></body></html>`;
 w.document.open();w.document.write(html);w.document.close();
}
function openLink(key){const x=pick('at_repertorio',key);if(x&&/^https:\/\//.test(x.enlace))window.open(x.enlace,'_blank','noopener,noreferrer');}
window.app={init,login,logout,recover,setPassword,install,nav,filter,createCurrent,edit,save,close,addItem,detail,respond,openPoll,openLink,shareBolo,printBudget};
window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
id('loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
window.addEventListener('DOMContentLoaded',init);
})();
