const DATA_URL='CONTROLE%20DE%20ABASTECIMENTO%20-%20POSTO%20COSTALOG%20-%20INTERNO%20-%2028042025.csv.zip';
const PASS={admin:'6414b877f3b53d65c4a4596d3eed8b6b7532e971a1b8bc3a05024f53dafcbef8',user:'b8fa4b66429e97aaf969dd5aca1d931b38f341911bd33c5ee91f492da4ae235e'};
let allRows=[],filteredRows=[],currentPage=1,pageSize=20;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function num(v){v=String(v??'').trim();if(!v)return 0;if(v.includes(','))return parseFloat(v.replace(/\./g,'').replace(',','.'))||0;return parseFloat(v)||0}
function csv(t){let sep=(t.split(/\r?\n/)[0].split(';').length>t.split(/\r?\n/)[0].split(',').length)?';':',';let a=[],r=[],c='',q=false;for(let i=0;i<t.length;i++){let x=t[i],n=t[i+1];if(x==='"'){if(q&&n==='"'){c+='"';i++}else q=!q}else if(x===sep&&!q){r.push(c);c=''}else if((x==='\n'||x==='\r')&&!q){if(x==='\r'&&n==='\n')i++;r.push(c);if(r.some(Boolean))a.push(r);r=[];c=''}else c+=x}if(c||r.length){r.push(c);a.push(r)}return a}
function normalize(a){
 const h=a[0]||[];
 const nk=s=>String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
 const find=(patterns)=>{const key=h.find(k=>patterns.some(p=>p.test(nk(k))));return key||''};
 const photoPlateKey=find([/foto.*placa/,/placa.*foto/]),photoOdoKey=find([/foto.*hodometro/,/hodometro.*foto/]),photoPumpKey=find([/foto.*bomba/,/bomba.*foto/]);
 return a.slice(1).map((r,i)=>{
   let o={id:i+1};h.forEach((k,j)=>o[k]=(r[j]??'').trim());
   o.liters=num(o['Qtd - Litros']);o.odo=num(o['Hodômetro']);o.date=o.DATA||'';o.time=o.HORA||'';
   o.employee=(o['FUNCIONÁRIO']||'').trim().toUpperCase();o.plate=(o.Placa||'').trim().toUpperCase().replace(/[ -]/g,'');
   o.photoPlate=photoPlateKey?String(o[photoPlateKey]||'').trim():'';
   o.photoOdo=photoOdoKey?String(o[photoOdoKey]||'').trim():'';
   o.photoPump=photoPumpKey?String(o[photoPumpKey]||'').trim():'';
   o.photoColumns={plate:photoPlateKey,odo:photoOdoKey,pump:photoPumpKey};
   o.photoCount=[o.photoPlate,o.photoOdo,o.photoPump].filter(Boolean).length;
   return o
 }).filter(x=>x.plate)
}
function fmt(n,d=0){return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(n)}
function br(d){if(!d)return'—';let p=d.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d}
function dt(o){return br(o.date)+' '+(o.time||'')}
async function sha(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function load(){try{const r=await fetch(DATA_URL+'?v=20261007',{cache:'no-store'});if(!r.ok)throw Error('Arquivo ZIP não encontrado ('+r.status+')');const zip=await JSZip.loadAsync(await r.arrayBuffer());const files=Object.keys(zip.files).filter(k=>/\.csv$/i.test(k)&&!zip.files[k].dir);if(!files.length)throw Error('CSV não encontrado no ZIP');const textCsv=await zip.files[files[0]].async('string');allRows=normalize(csv(textCsv));const local=JSON.parse(localStorage.getItem('costalogAbastecimentos')||'[]');allRows.push(...local.map((x,i)=>({...x,id:x.id||('local-'+i),plate:String(x.plate||x.Placa||'').toUpperCase().replace(/[ -]/g,'')})));renderAll();if(typeof populateQuestionOptions==='function')populateQuestionOptions();$('loading').classList.add('hidden')}catch(err){console.error('Erro ao carregar base:',err);$('loading').innerHTML='<strong>Não foi possível carregar a base.</strong><span>'+esc(err.message)+'</span><button class="secondary-btn" onclick="location.reload()">Tentar novamente</button>'}}
function renderAll(){renderSettings();renderQuestions()}
function stats(){let ls=allRows.reduce((a,r)=>a+r.liters,0),od=allRows.filter(r=>r.odo).map(r=>r.odo),dates=[...allRows].sort((a,b)=>a.date.localeCompare(b.date)),last=[...allRows].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))[0];$('statRecords').textContent=fmt(allRows.length);$('statLiters').textContent=fmt(ls,0)+' L';$('statVehicles').textContent=fmt(new Set(allRows.map(r=>r.plate)).size);$('statOdo').textContent=fmt(od.reduce((a,b)=>a+b,0)/(od.length||1),0)+' km';$('statLast').textContent=last?br(last.date):'—';$('periodLabel').textContent=dates.length?br(dates[0].date)+' — '+br(last.date):'—'}
function chart(){let m={};allRows.forEach(r=>{let k=r.date.slice(0,7);if(k)m[k]=(m[k]||0)+r.liters});let ks=Object.keys(m).sort().slice(-12),mx=Math.max(...ks.map(k=>m[k]),1);$('monthChart').innerHTML=ks.map(k=>{let [y,n]=k.split('-');let lab=new Date(+y,+n-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.','');return '<div class="bar-item"><b>'+fmt(m[k],0)+' L</b><i style="height:'+Math.max(8,m[k]/mx*145)+'px"></i><small>'+lab+'</small></div>'}).join('')}
function alerts(){let a=allRows.filter(r=>!/Sim - ok/i.test(r['Possuí Antifurto?']||'')).length,t=allRows.filter(r=>!['1','2'].includes(r['Quantos tanque o veículo possui?'])).length,v=allRows.filter(r=>r.liters>800).length;$('alerts').innerHTML=[['⚠','Antifurto','Registros fora de “Sim - ok”',a],['!','Tanques','Respostas que precisam de conferência',t],['↗','Volume','Abastecimentos acima de 800 L',v]].map(x=>'<div class="alert-row"><b>'+x[0]+'</b><div><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div><em>'+fmt(x[3])+'</em></div>').join('')}
function employees(){let m={};allRows.forEach(r=>{m[r.employee]??={n:0,l:0};m[r.employee].n++;m[r.employee].l+=r.liters});$('employeeRanking').innerHTML=Object.entries(m).sort((a,b)=>b[1].n-a[1].n).map(([n,v],i)=>'<div class="rank-row"><span class="rank">'+String(i+1).padStart(2,'0')+'</span><div class="rank-name"><strong>'+esc(n)+'</strong><span>'+fmt(v.l,0)+' L</span></div><div class="rank-count">'+fmt(v.n)+' registros</div></div>').join('')}
function recent(){let a=[...allRows].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,6);$('recentList').innerHTML=a.map(r=>'<div class="recent-row"><div class="plate">'+esc(r.plate)+'</div><div><strong>'+esc(r.employee)+'</strong><span>'+dt(r)+'</span></div><b>'+fmt(r.liters,2)+' L</b></div>').join('')}
function filters(){let e=[...new Set(allRows.map(r=>r.employee).filter(Boolean))].sort(),t=[...new Set(allRows.map(r=>r['Quantos tanque o veículo possui?']).filter(Boolean))].sort();$('employeeFilter').innerHTML='<option value="">Todos os funcionários</option>'+e.map(x=>'<option>'+esc(x)+'</option>').join('');$('tankFilter').innerHTML='<option value="">Todos os tanques</option>'+t.map(x=>'<option>'+esc(x)+'</option>').join('')}
function apply(){let q=$('searchInput').value.trim().toUpperCase(),e=$('employeeFilter').value,t=$('tankFilter').value,d=+$('dateFilter').value,min='';if(d){let x=new Date();x.setDate(x.getDate()-d);min=x.toISOString().slice(0,10)}filteredRows=allRows.filter(r=>(!q||r.plate.includes(q)||r.employee.includes(q))&&(!e||r.employee===e)&&(!t||r['Quantos tanque o veículo possui?']===t)&&(!min||r.date>=min)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));currentPage=1;history()}
function history(){let s=(currentPage-1)*pageSize,a=filteredRows.slice(s,s+pageSize);$('historyBody').innerHTML=a.length?a.map(r=>'<tr><td>'+dt(r)+'</td><td><strong>'+esc(r.employee)+'</strong></td><td><span class="plate-chip">'+esc(r.plate)+'</span></td><td>'+fmt(r.odo)+' km</td><td><strong>'+fmt(r.liters,2)+' L</strong></td><td><span class="status-dot '+(/Sim - ok/i.test(r['Possuí Antifurto?'])?'ok':'warn')+'">'+esc(r['Possuí Antifurto?']||'—')+'</span></td><td>'+esc(r['Quantos tanque o veículo possui?']||'—')+'</td></tr>').join(''):'<tr><td colspan="7" class="no-results">Nenhum registro encontrado.</td></tr>';let p=Math.max(1,Math.ceil(filteredRows.length/pageSize));$('filterSummary').textContent=fmt(filteredRows.length)+' registros encontrados';$('pagination').innerHTML='<button '+(currentPage===1?'disabled':'')+' data-page="'+(currentPage-1)+'">‹</button><span>Página '+currentPage+' de '+p+'</span><button '+(currentPage===p?'disabled':'')+' data-page="'+(currentPage+1)+'">›</button>'}
function vehicles(){let q=($('vehicleSearch')?.value||'').toUpperCase(),m={};allRows.forEach(r=>{if(q&&!r.plate.includes(q))return;m[r.plate]??={n:0,l:0,odo:0,last:r};m[r.plate].n++;m[r.plate].l+=r.liters;m[r.plate].odo=Math.max(m[r.plate].odo,r.odo);if((r.date+r.time)>(m[r.plate].last.date+m[r.plate].last.time))m[r.plate].last=r});$('vehicleGrid').innerHTML=Object.entries(m).sort((a,b)=>b[1].l-a[1].l).slice(0,120).map(([p,v])=>'<article class="vehicle-card"><div class="vehicle-head"><span class="plate-chip">'+esc(p)+'</span><span>'+fmt(v.n)+' abastecimentos</span></div><strong>'+fmt(v.l,0)+' L</strong><div class="vehicle-meta"><span>Último: '+br(v.last.date)+'</span><span>Hod.: '+fmt(v.odo)+' km</span></div></article>').join('')}
function view(v){if(v==='answers'&&!isAdmin())v='questions';document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));const target=$(v+'View');if(!target)return;document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='settings')renderSettings();if(v==='questions')renderQuestions();scrollTo({top:0,behavior:'smooth'})}
function lastForPlate(plate){
 const p=String(plate||'').toUpperCase().replace(/[ -]/g,'');
 if(!p)return null;
 const rows=allRows.filter(r=>String(r.plate||r.Placa||'').toUpperCase().replace(/[ -]/g,'')===p&&Number(r.odo||r['Hodômetro'])>0);
 if(!rows.length)return null;
 return rows.reduce((best,r)=>Number(r.odo||r['Hodômetro'])>Number(best.odo||best['Hodômetro'])?r:best,rows[0]);
}
function showEntryValidation(message,type='error'){
 const box=$('entryValidation');if(!box)return;
 box.className='validation-box '+type;
 box.textContent=message;
}
function modal(open){if(!open)verificationReset();$('entryModal').classList.toggle('hidden',!open);if(open){verificationReset();let d=new Date();$('entryForm').reset();$('entryDate').value=d.toISOString().slice(0,10);$('entryTime').value=d.toTimeString().slice(0,5);if(typeof populateQuestionOptions==='function')populateQuestionOptions();['photoPlatePreview','photoOdoPreview','photoPumpPreview'].forEach(id=>{if($(id))$(id).innerHTML=''})}}
function verificationReset(){
 const box=$('entryVerification'),bar=$('verificationBar'),icon=$('verificationIcon'),txt=$('verificationText');
 if(box)box.className='entry-verification hidden';
 if(bar)bar.style.width='0%';
 if(icon)icon.textContent='◌';
 if(txt)txt.textContent='Verificando seu registro...';
}
function verificationStatus(type,text){
 const box=$('entryVerification'),bar=$('verificationBar'),icon=$('verificationIcon'),txt=$('verificationText');
 if(!box)return;
 box.className='entry-verification '+type;
 if(bar)bar.style.width=type==='success'||type==='error'?'100%':'8%';
 if(icon)icon.textContent=type==='success'?'✓':type==='error'?'!':'◌';
 if(txt)txt.textContent=text;
}
function verificationProgress(value,text){
 const box=$('entryVerification'),bar=$('verificationBar'),txt=$('verificationText');
 if(box)box.className='entry-verification checking';
 if(bar)bar.style.width=Math.max(0,Math.min(100,value))+'%';
 if(txt)txt.textContent=text;
}
function photoPreview(inputId,previewId){
 const input=$(inputId),preview=$(previewId);if(!input||!preview)return;
 input.addEventListener('change',()=>{
   const file=input.files&&input.files[0];
   if(!file){preview.innerHTML='';return}
   if(!file.type.startsWith('image/')){preview.innerHTML='<span class="photo-error">Arquivo inválido. Selecione uma imagem.</span>';input.value='';return}
   const url=URL.createObjectURL(file);
   preview.innerHTML='<div class="photo-attached"><img src="'+url+'" alt="Prévia da foto"><div class="photo-attached-info"><strong>✓ Foto anexada</strong><span>'+esc(file.name)+'</span><small>'+fmt(Math.max(1,Math.round(file.size/1024)))+' KB</small></div><button type="button" class="photo-remove" aria-label="Remover foto">×</button></div>';
   const remove=preview.querySelector('.photo-remove');
   if(remove)remove.onclick=()=>{URL.revokeObjectURL(url);input.value='';preview.innerHTML='';};
 });
}
function setupPhotoInputs(){
 photoPreview('entryPhotoPlate','photoPlatePreview');
 photoPreview('entryPhotoOdo','photoOdoPreview');
 photoPreview('entryPhotoPump','photoPumpPreview');
 document.querySelectorAll('[data-photo-trigger]').forEach(b=>b.onclick=()=>$(b.dataset.photoTrigger)?.click());
 document.querySelectorAll('[data-photo-camera]').forEach(b=>b.onclick=()=>{const input=$(b.dataset.photoCamera);if(input){input.setAttribute('capture','environment');input.click()}});
}
async function save(e){
 e.preventDefault();
 const btn=document.querySelector('.save-entry-btn');
 if(btn&&btn.disabled)return;
 if(btn){btn.disabled=true;btn.dataset.originalText=btn.textContent;btn.textContent='Verificando...'}
 verificationReset();
 verificationStatus('checking','Verificando seu registro...');
 const get=id=>$(id);
 try{
   const checks=[
     ['Data',!!get('entryDate')?.value],
     ['Funcionário',!!get('entryEmployee')?.value.trim()],
     ['Placa',(get('entryPlate')?.value||'').replace(/[ -]/g,'').length>=6],
     ['Hodômetro',+(get('entryOdo')?.value||0)>0],
     ['Qtd. — Litros',+(get('entryLiters')?.value||0)>0],
     ['Possui Antifurto',!!get('entryAnti')?.value],
     ['Tanques',!!get('entryTanks')?.value]
   ];
   const bad=[];
   for(let k=0;k<checks.length;k++){
     await new Promise(r=>setTimeout(r,140));
     if(!checks[k][1])bad.push(checks[k][0]);
     verificationProgress(Math.round((k+1)/checks.length*72),'Verificando '+checks[k][0]+'...');
   }
   const plate=(get('entryPlate')?.value||'').toUpperCase().replace(/[ -]/g,'');
   const odo=+(get('entryOdo')?.value||0);
   const last=lastForPlate(plate);
   if(last&&odo<last.odo)bad.push('Hodômetro menor que o último registro ('+fmt(last.odo)+' km)');
   await new Promise(r=>setTimeout(r,180));
   verificationProgress(84,'Conferindo consistência dos dados...');
   if(bad.length){
     verificationStatus('error','Revise o registro');
     if(typeof showEntryValidation==='function')showEntryValidation('Revise: '+bad.join(', ')+'.','error');
     return;
   }
   await new Promise(r=>setTimeout(r,180));
   verificationProgress(94,'Salvando o registro...');
   const localId='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
   const employee=get('entryEmployee').value.trim().toUpperCase();
   const liters=+(get('entryLiters').value||0),anti=get('entryAnti').value,tanks=get('entryTanks').value;
   const photoPlate=get('entryPhotoPlate')?.files?.[0],photoOdo=get('entryPhotoOdo')?.files?.[0],photoPump=get('entryPhotoPump')?.files?.[0];
   verificationProgress(96,'Preparando as fotos...');
   const [photoPlateData,photoOdoData,photoPumpData]=await Promise.all([photoPlate?imageDataUrl(photoPlate):'',photoOdo?imageDataUrl(photoOdo):'',photoPump?imageDataUrl(photoPump):'']);
   const o={id:localId,'DATA':get('entryDate').value,'HORA':get('entryTime').value,'FUNCIONÁRIO':employee,'Placa':plate,'Qtd - Litros':String(liters),'Hodômetro':String(odo),'Possuí Antifurto?':anti,'Quantos tanque o veículo possui?':tanks,employee,plate,odo,liters,date:get('entryDate').value,time:get('entryTime').value,photoPlate:photoPlate?('localphoto:'+localId+':plate'):'',photoOdo:photoOdo?('localphoto:'+localId+':odo'):'',photoPump:photoPump?('localphoto:'+localId+':pump'):'',photoPlateName:photoPlate?.name||'',photoOdoName:photoOdo?.name||'',photoPumpName:photoPump?.name||'',photoPlateData:photoPlateData,photoOdoData:photoOdoData,photoPumpData:photoPumpData,photoCount:[photoPlate,photoOdo,photoPump].filter(Boolean).length};
   const photoJobs=[[photoPlate,'plate'],[photoOdo,'odo'],[photoPump,'pump']].filter(x=>x[0]).map(x=>saveLocalPhoto(localId+':'+x[1],x[0]));
   await Promise.all(photoJobs);
   let arr=JSON.parse(localStorage.getItem('costalogAbastecimentos')||'[]');
   arr.push(o);
   localStorage.setItem('costalogAbastecimentos',JSON.stringify(arr));
   if(!JSON.parse(localStorage.getItem('costalogAbastecimentos')||'[]').some(x=>String(x.id)===localId))throw new Error('Não foi possível confirmar o registro salvo');
   allRows.push({...o,id:localId});
   verificationStatus('success','Tudo certo com o seu registro');
   await new Promise(r=>setTimeout(r,1200));
   modal(false);
   try{renderAll();view('answers')}catch(renderError){console.error('Registro salvo; erro ao atualizar a visualização:',renderError)}
 }catch(err){
   console.error('Erro ao registrar abastecimento:',err);
   verificationStatus('error','Não foi possível concluir o registro');
   if(typeof showEntryValidation==='function')showEntryValidation('O registro não foi concluído. Tente novamente.','error');
 }finally{
   if(btn){btn.disabled=false;btn.textContent=btn.dataset.originalText||'✓ Registrar abastecimento'}
 }
}
async function login(e){e.preventDefault();let h=await sha($('accessPassword').value),role=h===PASS.admin?'admin':h===PASS.user?'user':'';if(!role){$('loginError').textContent='Senha incorreta. Verifique os dados e tente novamente.';return}$('loginError').textContent='';sessionStorage.setItem('costalogAuth','1');sessionStorage.setItem('costalogRole',role);applyRoleUI();$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');load().catch(err=>{$('loading').innerHTML='<strong>Não foi possível carregar a base.</strong><span>Confira o arquivo CSV no repositório.</span>';console.error(err)})}
function theme(){let d=localStorage.getItem('costalogTheme')==='dark';document.body.classList.toggle('dark-mode',d);const b=$('themeToggle');if(b)b.textContent=d?'☀':'☾';renderSettings?.()}
$('loginForm').addEventListener('submit',login);$('togglePassword').onclick=()=>{$('accessPassword').type=$('accessPassword').type==='password'?'text':'password'};$('logoutBtn').onclick=()=>{sessionStorage.removeItem('costalogAuth');sessionStorage.removeItem('costalogRole');location.reload()};$('themeToggle').onclick=()=>{localStorage.setItem('costalogTheme',document.body.classList.contains('dark-mode')?'light':'dark');theme()};
document.addEventListener('click',e=>{const dl=e.target.closest('[data-local-download]');if(dl){e.preventDefault();downloadLocalPhoto(dl.dataset.localDownload,dl.dataset.photoTitle);return}let v=e.target.closest('[data-view]');if(v)view(v.dataset.view);if(e.target.closest('[data-close]'))modal(false);if(e.target.closest('#newEntryBtn,#historyNewBtn'))modal(true);let p=e.target.closest('[data-page]');if(p&&!p.disabled){currentPage=+p.dataset.page;history()}});
$('entryForm').onsubmit=save;setupPhotoInputs();theme();
(function(){let c=$('matrixLayer'),x=c.getContext('2d'),w,h,d;function z(){w=c.width=innerWidth;h=c.height=innerHeight;d=Array(Math.ceil(w/18)).fill(1)}function f(){x.clearRect(0,0,w,h);x.fillStyle='rgba(0,0,0,.4)';x.font='12px monospace';d.forEach((y,i)=>{x.fillText(Math.random()>.5?'1':'0',i*18,y*18);if(y*18>h&&Math.random()>.975)d[i]=0;d[i]++});requestAnimationFrame(f)}z();addEventListener('resize',z);f()})();
theme();
if(sessionStorage.getItem('costalogAuth')&&sessionStorage.getItem('costalogRole')){$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');applyRoleUI();load().catch(console.error)}else{sessionStorage.removeItem('costalogAuth');sessionStorage.removeItem('costalogRole')}


/* Páginas complementares: Perguntas, Respostas e Configurações */
function populateQuestionOptions(){
 const employees=[...new Set(allRows.map(r=>String(r.employee||r['FUNCIONÁRIO']||'').trim()).filter(Boolean))].sort();
 const plates=[...new Set(allRows.map(r=>String(r.plate||r['Placa']||'').trim().toUpperCase().replace(/[ -]/g,'')).filter(Boolean))].sort();
 const ed=$('employeeOptions'),pd=$('plateOptions');
 if(ed)ed.innerHTML=employees.map(x=>'<option value="'+esc(x)+'"></option>').join('');
 if(pd)pd.innerHTML=plates.map(x=>'<option value="'+esc(x)+'"></option>').join('');
}
function renderQuestions(){const b=$('questionsNewBtn');if(b)b.onclick=()=>modal(true)}
function filteredAnswerRows(){
 const q=($('answerSearch')?.value||'').trim().toUpperCase(),from=$('answerDateFrom')?.value||'',to=$('answerDateTo')?.value||'',emp=$('answerEmployee')?.value||'',plate=$('answerPlate')?.value||'',anti=$('answerAnti')?.value||'';
 return allRows.filter(r=>{const hay=[r.date,r.time,r.employee,r.plate,String(r.liters),String(r.odo),r['Possuí Antifurto?'],r['Quantos tanque o veículo possui?']].join(' ').toUpperCase();return(!q||hay.includes(q))&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!emp||r.employee===emp)&&(!plate||r.plate===plate)&&(!anti||r['Possuí Antifurto?']===anti)}).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))
}
function renderAnswerFilterOptions(){
 const es=[...new Set(allRows.map(r=>r.employee).filter(Boolean))].sort(),ps=[...new Set(allRows.map(r=>r.plate).filter(Boolean))].sort(),ev=$('answerEmployee'),pv=$('answerPlate');
 if(ev){const v=ev.value;ev.innerHTML='<option value="">Todos</option>'+es.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');ev.value=v}
 if(pv){const v=pv.value;pv.innerHTML='<option value="">Todas</option>'+ps.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');pv.value=v}
}
function groupCounts(rows,key){const m={};rows.forEach(r=>{const v=String(r[key]??'').trim()||'Não informado';m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])}
const chartColors=['#e30613','#ef5660','#a9000c','#f58b91','#6f1118','#d62d39','#ffb3b8','#8c2630'];
const chartRegistry={};
let chartObserver=null;
function chartPalette(){return ['#e30613','#1769aa','#f39c12','#18a56b','#7c4dff','#00a6a6','#ef4f7a','#6f42c1','#5f8f2f','#d97706']}
function ensureChartObserver(){
 if(chartObserver||!window.IntersectionObserver)return;
 chartObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   const el=entry.target;
   el.classList.remove('chart-live');void el.offsetWidth;el.classList.add('chart-live');
 }),{threshold:.42,rootMargin:'-6% 0px -8% 0px'});
 document.querySelectorAll('.donut-chart').forEach(el=>chartObserver.observe(el));
}
function focusChartSegment(id,index,source){
 const el=$(id),leg=$(chartRegistry[id]?.legendId);if(!el||!chartRegistry[id])return;
 const segs=[...el.querySelectorAll('.donut-segment-main')],depths=[...el.querySelectorAll('.donut-segment-depth')],items=leg?[...leg.querySelectorAll('.legend-item')]:[];
 const current=el.dataset.focusIndex==String(index)?-1:index;
 el.dataset.focusIndex=current;
 segs.forEach((seg,i)=>{seg.classList.toggle('is-focus',current===i);seg.classList.toggle('is-dimmed',current>=0&&current!==i);seg.setAttribute('aria-pressed',current===i?'true':'false')});
 depths.forEach((seg,i)=>{seg.classList.toggle('is-focus',current===i);seg.classList.toggle('is-dimmed',current>=0&&current!==i)});
 items.forEach((item,i)=>{item.classList.toggle('is-focus',current===i);item.classList.toggle('is-dimmed',current>=0&&current!==i);item.setAttribute('aria-pressed',current===i?'true':'false')});
 if(source!=='legend'&&current>=0&&items[current])items[current].scrollIntoView({block:'nearest',behavior:'smooth'});
}
function chartTooltip(id,index,x,y){
 const el=$(id),meta=chartRegistry[id],tip=el?.querySelector('.chart-tooltip');if(!el||!meta||!tip)return;
 const g=meta.groups[index];if(!g)return;
 const pct=(g[1]/meta.total*100).toFixed(1);
 tip.innerHTML='<strong>'+esc(g[0])+'</strong><span>'+fmt(g[1])+' respostas • '+pct+'%</span>';
 const rect=el.getBoundingClientRect(),left=Math.max(8,Math.min(x-rect.left+12,rect.width-190)),top=Math.max(8,y-rect.top-58);
 tip.style.left=left+'px';tip.style.top=top+'px';tip.classList.add('show');
}
function hideChartTooltip(id){$(id)?.querySelector('.chart-tooltip')?.classList.remove('show')}
function bindDonutInteractions(id,legendId){
 const el=$(id),leg=$(legendId);if(!el||!leg)return;
 el.dataset.pinned='false';
 const hoverOn=(i,e)=>{focusChartSegment(id,i);if(e)chartTooltip(id,i,e.clientX,e.clientY)};
 const hoverOff=()=>{if(el.dataset.pinned!=='true')focusChartSegment(id,-1);hideChartTooltip(id)};
 el.querySelectorAll('.donut-segment-main').forEach((seg,i)=>{
   seg.addEventListener('mouseenter',e=>hoverOn(i,e));
   seg.addEventListener('mousemove',e=>chartTooltip(id,i,e.clientX,e.clientY));
   seg.addEventListener('mouseleave',hoverOff);
   seg.addEventListener('click',()=>{el.dataset.pinned=el.dataset.focusIndex==String(i)?'false':'true';focusChartSegment(id,i)});
   seg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.dataset.pinned=el.dataset.focusIndex==String(i)?'false':'true';focusChartSegment(id,i)}});
 });
 leg.querySelectorAll('.legend-item').forEach((item,i)=>{
   item.addEventListener('mouseenter',()=>focusChartSegment(id,i,'legend'));
   item.addEventListener('mouseleave',()=>{if(el.dataset.pinned!=='true')focusChartSegment(id,-1,'legend')});
   item.addEventListener('click',()=>{el.dataset.pinned=el.dataset.focusIndex==String(i)?'false':'true';focusChartSegment(id,i,'legend')});
 });
}function renderDonut(id,legendId,groups,total){
 const el=$(id),leg=$(legendId);if(!el||!leg)return;
 chartRegistry[id]={legendId,groups:groups.slice(0,10),total};
 if(!groups.length||!total){el.innerHTML='<span class="donut-center">0<small>respostas</small></span>';el.style.background='none';leg.innerHTML='<div class="chart-empty">Sem dados para exibir</div>';return}
 const palette=chartPalette(),r=49,c=2*Math.PI*r;let offset=0;
 const parts=groups.slice(0,10).map((g,i)=>{
   const len=(g[1]/total)*c,dash=Math.max(0,len-3),start=offset;offset+=len;
   const color=palette[i%palette.length],pct=(g[1]/total*100).toFixed(1);
   return '<circle class="donut-segment-depth" data-index="'+i+'" cx="80" cy="84" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="22" stroke-linecap="round" stroke-dasharray="0 '+c+'" stroke-dashoffset="'+(-start)+'" style="--dash:'+dash+'px;--circ:'+c+'px;--delay:'+(i*55)+'ms"></circle>'+
   '<circle class="donut-segment-main" data-index="'+i+'" cx="80" cy="80" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="22" stroke-linecap="round" stroke-dasharray="0 '+c+'" stroke-dashoffset="'+(-start)+'" style="--dash:'+dash+'px;--circ:'+c+'px;--delay:'+(i*55)+'ms" tabindex="0" role="button" aria-label="'+esc(g[0])+' — '+pct+'%" aria-pressed="false"></circle>';
 }).join('');
 el.dataset.focusIndex='';
 el.innerHTML='<svg class="donut-svg" viewBox="0 0 160 160" aria-label="Gráfico de distribuição">'+
 '<defs><filter id="chartShadow-'+id+'" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-opacity=".18"/></filter></defs>'+
 '<circle class="donut-base" cx="80" cy="80" r="'+r+'" fill="none" stroke="#edf0f3" stroke-width="22"></circle>'+
 '<circle class="donut-orbit" cx="80" cy="80" r="61" fill="none" stroke="#b9c4ce" stroke-width="1.5" stroke-dasharray="2 9" opacity=".55"></circle>'+
 parts+'<circle class="donut-inner-glow" cx="80" cy="80" r="37" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="1"></circle></svg>'+
 '<span class="donut-center"><b>'+fmt(total)+'</b><small>respostas</small></span><div class="chart-tooltip" role="status"></div>';
 el.style.background='none';
 leg.innerHTML=groups.slice(0,10).map((g,i)=>'<button type="button" class="legend-item" data-chart-index="'+i+'" aria-pressed="false"><i class="legend-dot" style="background:'+palette[i%palette.length]+'"></i><span>'+esc(g[0])+'</span><strong>'+((g[1]/total)*100).toFixed(1)+'%</strong><em>'+fmt(g[1])+'</em></button>').join('');
 bindDonutInteractions(id,legendId);ensureChartObserver();
}
function renderDateHeatmap(rows){
 const map={};rows.forEach(r=>{if(!r.date)return;const [y,m,d]=r.date.split('-');if(!map[y+'-'+m])map[y+'-'+m]={y,m,days:{}};map[y+'-'+m].days[d]=(map[y+'-'+m].days[d]||0)+1});
 const months=Object.values(map).sort((a,b)=>(a.y+a.m).localeCompare(b.y+b.m));const max=Math.max(1,...months.flatMap(x=>Object.values(x.days)));
 $('dateHeatmap').innerHTML=months.map(x=>'<div class="month-row"><span class="month-name">'+new Date(+x.y,+x.m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('.','')+'</span><div class="day-pills">'+Object.entries(x.days).sort((a,b)=>+a[0]-+b[0]).map(([d,n])=>'<span class="day-pill '+(n>=max*.65?'hot':n>=max*.35?'mid':'')+'">'+d+' <b>'+n+'</b></span>').join('')+'</div></div>').join('')||'<div class="no-results">Nenhuma data disponível.</div>';
 $('dateQuestionMeta').textContent=fmt(rows.length)+' respostas';
}
function renderTimeDistribution(rows){
 const hours={};rows.forEach(r=>{const t=String(r.time||'').slice(0,5);if(!t)return;const h=t.slice(0,2);(hours[h]??=[]).push(t)});
 $('timeDistribution').innerHTML=Object.entries(hours).sort((a,b)=>+a[0]-+b[0]).map(([h,vals])=>'<div class="time-row"><span class="hour-label">'+h+' :</span><i class="hour-line"></i><div class="time-pills">'+Object.entries(vals.reduce((m,t)=>(m[t]=(m[t]||0)+1,m),{})).sort((a,b)=>a[0].localeCompare(b[0])).map(([t,n])=>'<span class="time-pill '+(n>=Math.max(2,vals.length*.15)?'hot':'')+'">'+t+' <b>'+n+'</b></span>').join('')+'</div></div>').join('')||'<div class="no-results">Nenhum horário disponível.</div>';
 $('timeQuestionMeta').textContent=fmt(rows.length)+' respostas';
}
function renderList(id,groups,limit=12){
 const el=$(id);if(!el)return;el.innerHTML=groups.slice(0,limit).map(g=>'<div class="answer-list-item">'+esc(g[0])+' <strong>'+fmt(g[1])+'</strong></div>').join('')||'<div class="no-results">Nenhuma resposta.</div>';
}
const PHOTO_DB='costalog-fotos-v1';
function openPhotoDB(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(new Error('IndexedDB indisponível'));
  const req=indexedDB.open(PHOTO_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos')};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function imageDataUrl(file,maxSide=1100,quality=.68){
 return await new Promise((resolve,reject)=>{
  const fr=new FileReader();
  fr.onerror=()=>reject(fr.error||new Error('Falha ao ler a foto'));
  fr.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('A imagem anexada é inválida'));
   img.onload=()=>{
    const scale=Math.min(1,maxSide/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));
    canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    resolve(canvas.toDataURL('image/jpeg',quality));
   };
   img.src=fr.result;
  };
  fr.readAsDataURL(file);
 });
}
async function saveLocalPhoto(key,file){
 if(!file)return true;
 const db=await openPhotoDB();
 try{
   await new Promise((res,rej)=>{
     const tx=db.transaction('photos','readwrite');
     tx.objectStore('photos').put({blob:file,type:file.type,name:file.name,size:file.size,updatedAt:Date.now()},key);
     tx.oncomplete=()=>res();
     tx.onerror=()=>rej(tx.error||new Error('Falha ao gravar a foto'));
     tx.onabort=()=>rej(tx.error||new Error('Falha ao gravar a foto'));
   });
   const saved=await new Promise((res,rej)=>{
     const tx=db.transaction('photos','readonly');
     const req=tx.objectStore('photos').get(key);
     req.onsuccess=()=>res(req.result);
     req.onerror=()=>rej(req.error||new Error('Falha ao verificar a foto'));
   });
   if(!saved?.blob||Number(saved.size)!==Number(file.size))throw new Error('A foto não passou na verificação de salvamento');
   return true;
 }finally{db.close()}
}
async function getLocalPhoto(key){
 try{const db=await openPhotoDB();const value=await new Promise((res,rej)=>{const tx=db.transaction('photos','readonly');const req=tx.objectStore('photos').get(key);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});db.close();if(value?.blob)return value}catch(e){console.warn('IndexedDB indisponível:',e)}
 const parts=String(key).split(':'),id=parts[0],kind=parts[1];
 const row=allRows.find(r=>String(r.id)===id)||JSON.parse(localStorage.getItem('costalogAbastecimentos')||'[]').find(r=>String(r.id)===id);
 if(row){const field=kind==='plate'?'photoPlateData':kind==='odo'?'photoOdoData':'photoPumpData';const data=row[field];if(data)return {dataUrl:data,name:row[kind==='plate'?'photoPlateName':kind==='odo'?'photoOdoName':'photoPumpName']||'foto.jpg',type:'image/jpeg'}}
 return null;
}
function extractDriveId(v){
 const s=String(v||'').trim();
 if(!s)return '';
 const patterns=[
   /[?&](?:id|fileId)=([A-Za-z0-9_-]{10,})/i,
   /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{10,})/i,
   /docs\.google\.com\/forms\/d\/[^/]+\/viewform.*(?:entry|id)=([A-Za-z0-9_-]{10,})/i
 ];
 for(const p of patterns){const m=s.match(p);if(m)return m[1]}
 return '';
}
function photoSource(v){
 const s=String(v||'').trim();if(!s)return {view:'',download:'',kind:'none'};
 if(/^data:image\//i.test(s))return {view:s,download:s,kind:'data'};
 if(/^blob:/i.test(s))return {view:s,download:s,kind:'blob'};
 if(/^localphoto:/i.test(s))return {view:'',download:'',kind:'local'};
 if(/^https?:\/\//i.test(s)){
   const id=extractDriveId(s);
   if(id)return {view:'https://drive.google.com/uc?export=view&id='+id,download:'https://drive.google.com/uc?export=download&id='+id,kind:'drive'};
   return {view:s,download:s,kind:'url'};
 }
 const id=extractDriveId(s);
 if(id)return {view:'https://drive.google.com/uc?export=view&id='+id,download:'https://drive.google.com/uc?export=download&id='+id,kind:'drive'};
 if(/\.(?:jpg|jpeg|png|webp|gif|bmp|heic)(?:\?.*)?$/i.test(s))return {view:s,download:s,kind:'url'};
 return {view:'',download:'',kind:'name'};
}
function photoHref(v){return photoSource(v).view}
function isImageValue(v){return photoSource(v).kind!=='none'&&photoSource(v).kind!=='name'}
async function downloadLocalPhoto(value,title){
 const rec=await getLocalPhoto(String(value||'').slice(10));
 if(!rec){alert('A foto salva não pôde ser recuperada. O sistema não encontrou a cópia armazenada.');return false}
 const url=rec.dataUrl||URL.createObjectURL(rec.blob);
 const a=document.createElement('a');a.href=url;a.download=rec.name||((title||'foto-abastecimento').toLowerCase().replace(/[^a-z0-9]+/gi,'-')+'.jpg');document.body.appendChild(a);a.click();a.remove();
 if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),10000);
 return true;
}
async function openPhotoViewer(value,title){
 const source=photoSource(value);
 let src='',downloadUrl='',local=false;
 if(source.kind==='local'){
   const rec=await getLocalPhoto(String(value).slice(10));
   if(!rec){alert('Não foi possível recuperar a foto salva neste navegador. O registro permanece preservado, mas esta cópia local foi perdida.');return}
   src=rec.dataUrl||URL.createObjectURL(rec.blob);downloadUrl=src;local=true;
 }else{
   src=source.view;downloadUrl=source.download||source.view;
 }
 if(!src)return;
 const modalEl=$('answerDetailModal'),body=$('answerDetailBody');if(!modalEl||!body)return;
 $('answerDetailTitle').textContent=title||'Evidência';
 $('answerDetailSubtitle').textContent=local?'Imagem anexada e armazenada localmente':'Visualização da imagem anexada';
 const safeTitle=esc(title||'Evidência');
 body.innerHTML='<div class="photo-viewer"><div class="photo-viewer-stage"><img src="'+esc(src)+'" alt="'+safeTitle+'"></div><div class="photo-viewer-actions">'+(local?'<button type="button" class="primary-btn" data-local-download="'+esc(String(value))+'" data-photo-title="'+safeTitle+'">⇩ Baixar imagem</button>':'<a class="primary-btn" href="'+esc(downloadUrl)+'" download target="_blank" rel="noopener">⇩ Baixar imagem</a><a class="secondary-btn" href="'+esc(src)+'" target="_blank" rel="noopener">Abrir arquivo ↗</a>')+'</div></div>';
 modalEl.classList.remove('hidden');
 if(local)setTimeout(()=>URL.revokeObjectURL(src),120000);
}

function isImageValue(v){const k=photoSource(v).kind;return k!=='none'&&k!=='name'}
function isDirectImageValue(v){const k=photoSource(v).kind;return k==='url'||k==='drive'||k==='data'||k==='blob'}
async function hydrateLocalPhotoButton(button,value,title){
 if(!button||photoSource(value).kind!=='local')return;
 const rec=await getLocalPhoto(String(value).slice(10));
 if(!rec){button.innerHTML='⚠';button.title='Imagem não encontrada';return}
 const url=rec.dataUrl||URL.createObjectURL(rec.blob);
 button.innerHTML='<img src="'+esc(url)+'" alt="'+esc(title||'Evidência')+'">';
 button.classList.remove('local-photo-thumb');
 button.classList.add('hydrated-local-photo');
 button.dataset.localBlobUrl=url;
}
async function addLocalPhotoDownload(container,value,title){
 if(!container||photoSource(value).kind!=='local')return;
 const rec=await getLocalPhoto(String(value).slice(10));
 if(!rec)return;
 const url=rec.dataUrl||URL.createObjectURL(rec.blob);
 const a=document.createElement('a');
 a.href=url;a.download=rec.name||((title||'evidencia').toLowerCase().replace(/[^a-z0-9]+/gi,'-')+'.jpg');a.textContent='Baixar';
 a.className='local-download-link';
 a.dataset.localBlobUrl=url;
 container.appendChild(a);
}
async function hydrateLocalPhotoCard(root,value,title){
 if(!root||photoSource(value).kind!=='local')return;
 const button=root.querySelector('[data-photo-value]');
 if(button)await hydrateLocalPhotoButton(button,value,title);
 const actions=root.querySelector('.gallery-actions,.evidence-actions');
 if(actions&&!actions.querySelector('.local-download-link'))await addLocalPhotoDownload(actions,value,title);
}
function renderFiles(id,rows,key,moreId){
 const items=rows.map((r,i)=>({value:String(r[key]||'').trim(),index:i})).filter(x=>x.value);const el=$(id);if(!el)return;
 el.innerHTML=items.slice(0,12).map(item=>{
   const v=item.value,src=photoSource(v),image=isImageValue(v),direct=isDirectImageValue(v),local=src.kind==='local';
   const thumb=direct?'<img src="'+esc(src.view)+'" alt="Evidência" loading="lazy" onerror="this.classList.add(\'image-failed\')">':local?'📷':'▣';
   return '<div class="file-item '+(image?'is-link':'')+'"><button type="button" class="file-thumb-button '+(direct?'': 'local-photo-thumb')+'" data-photo-value="'+esc(v)+'" data-photo-title="'+esc(key)+' '+fmt(item.index+1)+'">'+thumb+'</button><div><strong>Evidência '+fmt(item.index+1)+'</strong><small>'+esc(local?(v.startsWith('localphoto:')?'Foto armazenada neste navegador':v):v)+'</small></div>'+(image?'<button type="button" class="file-open" data-photo-value="'+esc(v)+'" data-photo-title="'+esc(key)+' '+fmt(item.index+1)+'">Visualizar ↗</button>':'<span class="file-open disabled">Arquivo registrado</span>')+'</div>'
 }).join('')||'<div class="no-results">Nenhuma evidência registrada nesta pergunta.</div>';
 el.querySelectorAll('.file-thumb-button[data-photo-value]').forEach(b=>{const value=b.dataset.photoValue;if(photoSource(value).kind==='local')hydrateLocalPhotoButton(b,value,b.dataset.photoTitle||key)});
 const more=$(moreId);if(more){more.textContent=items.length?'Visualizar tudo • '+fmt(items.length)+' evidências ↗':'Visualizar tudo • 0 evidências';more.style.display='inline-flex';more.disabled=!items.length;more.onclick=()=>{if(items.length)showPhotoList(key,items)}}
}
function showPhotoList(key,items){
 const title=key==='photoPlate'?'Foto - Placa':key==='photoOdo'?'Foto - Hodômetro':'Foto - bomba';photoGalleryState={title,items,page:1,key};
 $('answerDetailTitle').textContent=title;$('answerDetailSubtitle').textContent=fmt(items.length)+' evidências encontradas';renderPhotoGalleryPage();$('answerDetailModal').classList.remove('hidden');
}
let photoGalleryState={title:'',items:[],page:1,key:''};const photoGalleryPageSize=48;
function renderPhotoGalleryPage(){
 const body=$('answerDetailBody');if(!body)return;const total=photoGalleryState.items.length,pages=Math.max(1,Math.ceil(total/photoGalleryPageSize));photoGalleryState.page=Math.min(Math.max(1,photoGalleryState.page),pages);const start=(photoGalleryState.page-1)*photoGalleryPageSize,items=photoGalleryState.items.slice(start,start+photoGalleryPageSize);
 body.innerHTML='<div class="photo-gallery-toolbar"><strong>'+fmt(total)+' evidências</strong><span>Página '+fmt(photoGalleryState.page)+' de '+fmt(pages)+'</span><div class="photo-gallery-actions"><button type="button" data-photo-page="-1" '+(photoGalleryState.page<=1?'disabled':'')+'>‹ Anterior</button><button type="button" data-photo-page="1" '+(photoGalleryState.page>=pages?'disabled':'')+'>Próxima ›</button></div></div><div class="photo-gallery">'+items.map((item,i)=>{
   const v=item.value,src=photoSource(v),image=isImageValue(v),direct=isDirectImageValue(v),local=src.kind==='local',thumb=direct?'<img src="'+esc(src.view)+'" alt="'+esc(photoGalleryState.title)+' '+fmt(start+i+1)+'" loading="lazy">':local?'📷':'▣';
   return '<div class="gallery-item" data-gallery-value="'+esc(v)+'">'+(image?'<button type="button" class="gallery-image-button '+(direct?'':'local-photo-thumb')+'" data-photo-value="'+esc(v)+'" data-photo-title="'+esc(photoGalleryState.title)+' '+fmt(start+i+1)+'">'+thumb+'</button>':'<div class="gallery-file">▣</div>')+'<div><strong>'+esc(photoGalleryState.title)+' '+fmt(start+i+1)+'</strong><small>'+esc(local?'Foto armazenada neste navegador':v)+'</small></div>'+(image?'<div class="gallery-actions"><button type="button" data-photo-value="'+esc(v)+'" data-photo-title="'+esc(photoGalleryState.title)+' '+fmt(start+i+1)+'">Visualizar</button>'+(direct?'<a href="'+esc(src.download)+'" download target="_blank" rel="noopener">Baixar</a>':'')+'</div>':'<span>Arquivo registrado</span>')+'</div>'
 }).join('')+'</div><div class="photo-gallery-footer"><button type="button" data-photo-page="-1" '+(photoGalleryState.page<=1?'disabled':'')+'>‹ Anterior</button><span>Mostrando '+fmt(start+1)+'–'+fmt(Math.min(start+items.length,total))+' de '+fmt(total)+'</span><button type="button" data-photo-page="1" '+(photoGalleryState.page>=pages?'disabled':'')+'>Próxima ›</button></div>';
 body.querySelectorAll('.gallery-item').forEach(card=>{const value=card.dataset.galleryValue;if(photoSource(value).kind==='local')hydrateLocalPhotoCard(card,value,photoGalleryState.title)});
}
function renderAnswerSummary(){
 const rows=filteredAnswerRows(),total=rows.length;
 renderAnswerFilterOptions();
 $('answerTotal').textContent=fmt(total);$('answerFilterSummary').textContent=fmt(total)+' registro'+(total===1?'':'s')+' encontrado'+(total===1?'':'s');$('answerLastUpdate').textContent='Base atualizada • '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 renderDateHeatmap(rows);renderTimeDistribution(rows);
 const emp=groupCounts(rows,'FUNCIONÁRIO'),anti=groupCounts(rows,'Possuí Antifurto?'),tank=groupCounts(rows,'Quantos tanque o veículo possui?');
 renderDonut('employeePie','employeeLegend',emp,total);renderDonut('antiPie','antiLegend',anti,total);renderDonut('tankPie','tankLegend',tank,total);
 $('employeeQuestionMeta').textContent=fmt(total)+' respostas';$('antiQuestionMeta').textContent=fmt(total)+' respostas';$('tankQuestionMeta').textContent=fmt(total)+' respostas';
 const plates=groupCounts(rows,'Placa'),odos=groupCounts(rows,'Hodômetro'),liters=groupCounts(rows,'Qtd - Litros');
 renderList('plateList',plates);renderList('odoList',odos,12);renderList('litersList',liters,12);
 renderFiles('photoPlateList',rows,'photoPlate','photoPlateMore');renderFiles('photoOdoList',rows,'photoOdo','photoOdoMore');renderFiles('photoPumpList',rows,'photoPump','photoPumpMore');
 ['plate','odo','liters'].forEach((x,i)=>$(x+'QuestionMeta').textContent=fmt(total)+' respostas');
 const pp=rows.filter(r=>r.photoPlate).length,po=rows.filter(r=>r.photoOdo).length,pb=rows.filter(r=>r.photoPump).length;const pct=n=>total?((n/total)*100).toFixed(1)+'%':'';$('photoPlateQuestionMeta').textContent=fmt(pp)+' evidências • '+pct(pp)+' dos registros';$('photoOdoQuestionMeta').textContent=fmt(po)+' evidências • '+pct(po)+' dos registros';$('photoPumpQuestionMeta').textContent=fmt(pb)+' evidências • '+pct(pb)+' dos registros';
}
let individualPage=1;
const individualPageSize=50;
function renderIndividual(){
 const rows=filteredAnswerRows(),pages=Math.max(1,Math.ceil(rows.length/individualPageSize));individualPage=Math.min(individualPage,pages);
 const start=(individualPage-1)*individualPageSize,viewRows=rows.slice(start,start+individualPageSize);
 $('individualCount').textContent=fmt(rows.length)+' registros • página '+fmt(individualPage)+'/'+fmt(pages);
 $('answersBody').innerHTML=viewRows.map((r,i)=>{const photos=r.photoCount||[r.photoPlate,r.photoOdo,r.photoPump].filter(Boolean).length,alert=!/Sim - ok/i.test(r['Possuí Antifurto?']||'')||r.liters>800;return '<tr class="answer-row" data-answer-id="'+esc(String(r.id))+'"><td>'+fmt(start+i+1)+'</td><td><strong>'+br(r.date)+'</strong></td><td>'+esc(r.time||'—')+'</td><td><strong>'+esc(r.employee||'—')+'</strong></td><td><span class="plate-chip">'+esc(r.plate||'—')+'</span></td><td>'+fmt(r.odo)+' km</td><td><strong>'+fmt(r.liters,2)+' L</strong></td><td><span class="status-dot '+(/Sim - ok/i.test(r['Possuí Antifurto?']||'')?'ok':'warn')+'">'+esc(r['Possuí Antifurto?']||'—')+'</span></td><td>'+esc(r['Quantos tanque o veículo possui?']||'—')+'</td><td>'+(photos?'<span class="evidence-badge">📷 '+photos+'</span>':'—')+(alert?'<span class="row-alert">!</span>':'')+'<button type="button" class="admin-delete-btn" data-delete-answer="'+esc(String(r.id))+'" title="Excluir resposta">Excluir</button></td></tr>'}).join('')||'<tr><td colspan="10" class="no-results"><strong>Nenhuma resposta encontrada</strong></td></tr>';
 $('individualPagination').innerHTML='<button type="button" data-ind-page="'+(individualPage-1)+'" '+(individualPage<=1?'disabled':'')+'>‹</button><span>'+fmt(start+1)+'–'+fmt(Math.min(start+individualPageSize,rows.length))+' de '+fmt(rows.length)+'</span><button type="button" data-ind-page="'+(individualPage+1)+'" '+(individualPage>=pages?'disabled':'')+'>›</button>';
}
function renderQuestionTab(){
 const qs=[['DATA','date'],['HORA','time'],['FUNCIONÁRIO','FUNCIONÁRIO'],['Placa','Placa'],['Foto - Placa','photoPlate'],['Hodômetro','Hodômetro'],['Foto - Hodômetro','photoOdo'],['Qtd - Litros','Qtd - Litros'],['Foto - bomba','photoPump'],['Possui Antifurto?','Possuí Antifurto?'],['Quantos tanque o veículo possui?','Quantos tanque o veículo possui?']];
 $('questionSelector').innerHTML=qs.map((q,i)=>'<button class="'+(i===0?'active':'')+'" data-question-key="'+esc(q[1])+'">'+esc(q[0])+'</button>').join('');
 const draw=k=>{document.querySelectorAll('[data-question-key]').forEach(b=>b.classList.toggle('active',b.dataset.questionKey===k));const rows=filteredAnswerRows();let g;if(k==='photoPlate'||k==='photoOdo'||k==='photoPump'){const map={photoPlate:'Foto - Placa',photoOdo:'Foto - Hodômetro',photoPump:'Foto - bomba'};g=rows.map(r=>[r[k],1]).filter(x=>x[0])}else{g=groupCounts(rows,k)};$('questionAnswerContent').innerHTML='<div class="answer-card-head"><div><h3>'+esc(qs.find(x=>x[1]===k)?.[0]||k)+'</h3><span>'+fmt(rows.length)+' respostas</span></div></div><div class="answer-list">'+g.slice(0,100).map(x=>'<div class="answer-list-item">'+esc(x[0])+' <strong>'+fmt(x[1])+'</strong></div>').join('')+'</div>'};
 document.querySelectorAll('[data-question-key]').forEach(b=>b.onclick=()=>draw(b.dataset.questionKey));draw('date');
}
function showAnswerDetail(id){
 const r=allRows.find(x=>String(x.id)===String(id));if(!r)return;
 $('answerDetailTitle').textContent=(r.plate||'Abastecimento')+' • '+br(r.date);$('answerDetailSubtitle').textContent=(r.employee||'Funcionário não informado')+' • '+(r.time||'Horário não informado');
 const photos=[['Foto da placa',r.photoPlate],['Foto do hodômetro',r.photoOdo],['Foto da bomba',r.photoPump]];
 $('answerDetailBody').innerHTML='<div class="detail-summary"><div><small>DATA E HORA</small><strong>'+br(r.date)+' • '+esc(r.time||'—')+'</strong></div><div><small>FUNCIONÁRIO</small><strong>'+esc(r.employee||'—')+'</strong></div><div><small>PLACA</small><strong class="plate-chip">'+esc(r.plate||'—')+'</strong></div></div><div class="detail-grid"><div><span>Hodômetro</span><strong>'+fmt(r.odo)+' km</strong></div><div><span>Quantidade abastecida</span><strong>'+fmt(r.liters,2)+' L</strong></div><div><span>Antifurto</span><strong>'+esc(r['Possuí Antifurto?']||'—')+'</strong></div><div><span>Quantidade de tanques</span><strong>'+esc(r['Quantos tanque o veículo possui?']||'—')+'</strong></div></div><div class="detail-evidence"><h3>Evidências</h3><div class="evidence-grid">'+photos.map(([label,url])=>{const src=photoSource(url),image=isImageValue(url),direct=isDirectImageValue(url),local=src.kind==='local';return url&&image?'<div class="evidence-card" data-evidence-value="'+esc(url)+'"><button type="button" class="evidence-image-button '+(direct?'':'local-photo-thumb')+'" data-photo-value="'+esc(url)+'" data-photo-title="'+esc(label)+'">'+(direct?'<img src="'+esc(src.view)+'" alt="'+esc(label)+'">':'📷')+'</button><div><strong>'+label+'</strong><small>'+esc(local?'Foto armazenada neste navegador':'Visualizar imagem')+'</small><div class="evidence-actions"><button type="button" data-photo-value="'+esc(url)+'" data-photo-title="'+esc(label)+'">Visualizar</button>'+(direct?'<a href="'+esc(src.download)+'" download target="_blank" rel="noopener">Baixar</a>':'')+'</div></div></div>':'<div class="evidence-card empty"><span>—</span><div><strong>'+label+'</strong><small>'+(!url?'Não disponível':'Arquivo registrado, mas sem acesso à imagem')+'</small></div></div>'}).join('')+'</div></div>';
 $('answerDetailModal').classList.remove('hidden');
 $('answerDetailBody').querySelectorAll('.evidence-card[data-evidence-value]').forEach(card=>{const value=card.dataset.evidenceValue;if(photoSource(value).kind==='local')hydrateLocalPhotoCard(card,value,card.querySelector('strong')?.textContent||'Evidência')});
}
function exportAnswers(){
 const rows=filteredAnswerRows(),head=['DATA','HORA','FUNCIONÁRIO','Placa','Qtd - Litros','Hodômetro','Possuí Antifurto?','Quantos tanque o veículo possui?','Foto - Placa','Foto - Hodômetro','Foto - bomba'];
 const csvRows=[head,...rows.map(r=>head.map(k=>String(r[k]??(k==='Foto - Placa'?r.photoPlate:k==='Foto - Hodômetro'?r.photoOdo:k==='Foto - bomba'?r.photoPump:'' )).replaceAll('"','""')))].map(r=>r.map(v=>'"'+v+'"').join(';')).join('\r\n');
 const blob=new Blob(['\ufeff'+csvRows],{type:'text/csv;charset=utf-8;'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='respostas-abastecimento-costalog.csv';a.click();URL.revokeObjectURL(a.href);
}
function renderAnswers(){if(!$('answerSummaryTab'))return;renderAnswerSummary();renderIndividual();renderQuestionTab()}
function setupExtraPages(){
 ['answerSearch','answerDateFrom','answerDateTo','answerEmployee','answerPlate','answerAnti'].forEach(id=>{const el=$(id);el?.addEventListener('input',renderAnswers);el?.addEventListener('change',renderAnswers)});
 $('refreshAnswers')?.addEventListener('click',renderAnswers);$('exportAnswersBtn')?.addEventListener('click',exportAnswers);
 $('clearAnswerFilters')?.addEventListener('click',()=>{['answerSearch','answerDateFrom','answerDateTo','answerEmployee','answerPlate','answerAnti'].forEach(id=>{if($(id))$(id).value=''});renderAnswers()});
 $('answersBody')?.addEventListener('click',e=>{const del=e.target.closest('[data-delete-answer]');if(del){e.stopPropagation();deleteAnswer(del.dataset.deleteAnswer);return}const row=e.target.closest('.answer-row');if(row)showAnswerDetail(row.dataset.answerId)});document.addEventListener('click',e=>{const b=e.target.closest('[data-photo-value]');if(b&&!b.closest('.answerDetailModal'))openPhotoViewer(b.dataset.photoValue,b.dataset.photoTitle)});$('answerDetailBody')?.addEventListener('click',e=>{const page=e.target.closest('[data-photo-page]');if(page&&!page.disabled){photoGalleryState.page+=Number(page.dataset.photoPage);renderPhotoGalleryPage();return}const b=e.target.closest('[data-photo-value]');if(b)openPhotoViewer(b.dataset.photoValue,b.dataset.photoTitle)});$('individualPagination')?.addEventListener('click',e=>{const b=e.target.closest('[data-ind-page]');if(!b||b.disabled)return;individualPage=+b.dataset.indPage;renderIndividual();$('answerIndividualTab')?.scrollIntoView({behavior:'smooth',block:'start'})});$('viewAllAnswersBtn')?.addEventListener('click',()=>{document.querySelectorAll('[data-answer-tab]').forEach(x=>x.classList.toggle('active',x.dataset.answerTab==='individual'));['summary','question','individual'].forEach(k=>$('answer'+k.charAt(0).toUpperCase()+k.slice(1)+'Tab')?.classList.toggle('hidden',k!=='individual'));individualPage=1;renderIndividual();$('answerIndividualTab')?.scrollIntoView({behavior:'smooth',block:'start'})});
 document.querySelectorAll('[data-answer-close]')?.forEach(x=>x.addEventListener('click',()=>$('answerDetailModal')?.classList.add('hidden')));
 document.querySelectorAll('[data-answer-tab]').forEach(b=>b.addEventListener('click',()=>{const tab=b.dataset.answerTab;document.querySelectorAll('[data-answer-tab]').forEach(x=>x.classList.toggle('active',x===b));['summary','question','individual'].forEach(k=>$('answer'+k.charAt(0).toUpperCase()+k.slice(1)+'Tab')?.classList.toggle('hidden',k!==tab));if(tab==='summary')renderAnswerSummary();if(tab==='question')renderQuestionTab();if(tab==='individual')renderIndividual()}));
 $('settingDark')?.addEventListener('change',e=>{localStorage.setItem('costalogTheme',e.target.checked?'dark':'light');theme()});$('settingAuto')?.addEventListener('change',e=>localStorage.setItem('costalogAutoRefresh',e.target.checked?'1':'0'));$('settingAnti')?.addEventListener('change',e=>localStorage.setItem('costalogAlertAnti',e.target.checked?'1':'0'));$('settingVolume')?.addEventListener('change',e=>localStorage.setItem('costalogAlertVolume',e.target.checked?'1':'0'));
 $('clearLocalBtn')?.addEventListener('click',()=>{if(confirm('Remover somente os registros criados neste navegador?')){localStorage.removeItem('costalogAbastecimentos');load()}});
}
function isAdmin(){return sessionStorage.getItem('costalogRole')==='admin'}
function applyRoleUI(){const admin=isAdmin();document.querySelectorAll('.role-badge').forEach(x=>{x.textContent=admin?'ADMINISTRADOR':'USUÁRIO';x.classList.toggle('admin',admin)});document.querySelectorAll('.admin-delete-btn').forEach(x=>x.classList.toggle('hidden',!admin));document.querySelectorAll('.admin-only-nav').forEach(x=>x.classList.toggle('hidden',!admin));if(!admin&&$('answersView')&&!$('answersView').classList.contains('hidden'))view('questions')}
function deleteAnswer(id){if(!isAdmin()){alert('Apenas administradores podem excluir respostas.');return}const row=allRows.find(r=>String(r.id)===String(id));if(!row)return;if(!String(id).startsWith('local-')){alert('Este registro pertence à base histórica e não pode ser excluído pelo portal.');return}if(!confirm('Excluir definitivamente esta resposta e as fotos anexadas?'))return;const arr=JSON.parse(localStorage.getItem('costalogAbastecimentos')||'[]');const target=String(id);const kept=arr.filter(r=>String(r.id||'')!==target&&String(r.localId||'')!==target);localStorage.setItem('costalogAbastecimentos',JSON.stringify(kept));['plate','odo','pump'].forEach(async k=>{try{const db=await openPhotoDB();const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(target+':'+k);tx.oncomplete=()=>db.close();tx.onerror=()=>db.close()}catch(e){console.warn('Falha ao remover foto local',e)}});allRows=allRows.filter(r=>String(r.id)!==target);renderAnswers();applyRoleUI();if($('answerDetailModal'))$('answerDetailModal').classList.add('hidden')}
function renderSettings(){const r=$('settingsRecords');if(r)r.textContent=fmt(allRows.length);const d=$('settingDark');if(d)d.checked=document.body.classList.contains('dark-mode');const a=$('settingAuto');if(a)a.checked=localStorage.getItem('costalogAutoRefresh')!=='0';const an=$('settingAnti');if(an)an.checked=localStorage.getItem('costalogAlertAnti')!=='0';const vo=$('settingVolume');if(vo)vo.checked=localStorage.getItem('costalogAlertVolume')!=='0'}
const originalView=view;view=function(v){originalView(v);if(v==='settings')renderSettings();if(v==='questions')renderQuestions();if(v==='answers')renderAnswers()};
setupExtraPages();applyRoleUI();
