function currentAdd(){if(ui.screen==='recent')addActivitySheet();else if(ui.screen==='guys')addPersonSheet('Guy');else if(ui.screen==='girls')addPersonSheet('Girl');else if(ui.screen==='shadchanim')addPersonSheet('Shadchan');else addIdeaSheet();}

function handleClick(e){const b=e.target.closest('button');if(!b)return;
  if(b.dataset.screen){ui.screen=b.dataset.screen;ui.detail=null;ui.search='';ui.detailTab='';render();window.scrollTo({top:0,behavior:'smooth'});return;}
  if(b.dataset.person){ui.detail={type:'person',id:b.dataset.person};const p=person(b.dataset.person);ui.detailTab=p?.types?.includes('Shadchan')?'details':'profile';render();window.scrollTo(0,0);return;}
  if(b.dataset.shidduch){ui.detail={type:'shidduch',id:b.dataset.shidduch};ui.detailTab='overview';render();window.scrollTo(0,0);return;}
  if(b.dataset.source){ui.detail={type:'source',id:b.dataset.source};ui.detailTab='';render();window.scrollTo(0,0);return;}
  if(b.dataset.entry){ui.detail={type:'entry',id:b.dataset.entry};render();window.scrollTo(0,0);return;}
  if(b.dataset.idea){ideaSheet(b.dataset.idea);return;}
  if(b.dataset.segScope){const scope=b.dataset.segScope,val=b.dataset.seg;if(scope==='recent')ui.recentFilter=val;else ui.screenView[scope]=val;render();return;}
  if(b.dataset.detailTab){ui.detailTab=b.dataset.detailTab;render();return;}
  if(b.dataset.contact){if(b.dataset.contact==='wait')waitingSheet(b.dataset.personId);else logContact(b.dataset.personId,b.dataset.contact);return;}
  if(b.dataset.setting){const key=b.dataset.setting,val=b.dataset.value;data.settings[key]=key==='summaryCards'?val==='true':val;save().then(()=>{applySettings();settingsSheet();render();});return;}
  const act=b.dataset.act;
  if(act==='back'){ui.detail=null;ui.detailTab='';render();window.scrollTo(0,0);}
  else if(act==='settings')settingsSheet();
  else if(act==='filters')filtersSheet();
  else if(act==='add-current')currentAdd();
  else if(act==='add-activity')addActivitySheet(ui.detail?.type==='person'?ui.detail.id:'');
  else if(act==='add-person-note')addActivitySheet(b.dataset.personId||ui.detail?.id||'');
  else if(act==='add-source')addSourceSheet();
  else if(act==='add-idea')addIdeaSheet();
  else if(act==='close-sheet')closeSheet();
  else if(act==='save-person')savePerson();
  else if(act==='save-activity')saveActivity();
  else if(act==='save-waiting')saveWaiting();
  else if(act==='save-idea')saveIdea();
  else if(act==='save-source')saveSource();
  else if(act==='idea-no')chooseIdea(b.dataset.ideaId,false);
  else if(act==='idea-yes')chooseIdea(b.dataset.ideaId,true);
  else if(act==='export-backup')exportBackup();
  else if(act==='import-backup')document.getElementById('backupFile')?.click();
  else if(act==='toggle-demo'){data=data.meta.demo?emptyData():demoData();save().then(()=>{closeSheet();ui.detail=null;ui.screen='recent';render();showToast(data.meta.demo?'Demo loaded':'Ready for your data');});}
  else if(act==='show-wait-me'){ui.screen='shadchanim';ui.screenView.shadchanim='me';ui.detail=null;render();}
  else if(act==='show-wait-them'){ui.screen='shadchanim';ui.screenView.shadchanim='them';ui.detail=null;render();}
  else if(act==='show-active'){ui.screen='shidduchim';ui.screenView.shidduchim='active';ui.detail=null;render();}
  else if(act==='open-about'){const en=data.entries.find(x=>x.id===b.dataset.entryId);if(en)openAbout(en);}
  else if(act==='show-dormant'){closeSheet();const arr=byType('Shadchan').filter(dormantPerson);openSheet(`<h2>Dormant 60+ days</h2><p class="lead">This is only a filter. It does not create reminders.</p>${arr.length?`<div class="list-card">${arr.map(p=>personRow(p)).join('')}</div>`:empty('Nobody is dormant','Everyone has been contacted in the last 60 days.')}<button class="primary-btn full" style="margin-top:12px" data-act="close-sheet">Done</button>`);}
  else if(act==='detail-menu')detailMenu();
  else if(act==='edit-person')editPersonSheet(ui.detail?.id);
  else if(act==='log-profile')logProfileSend(b.dataset.personId);
}

function detailMenu(){if(ui.detail?.type!=='person')return;const p=person(ui.detail.id);openSheet(`<h2>${esc(p.name)}</h2><p class="lead">Less-used actions live here so the main page stays calm.</p><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Edit person</b><span>Facts and profile</span></div><button class="option" data-act="edit-person">Edit</button></div><div class="setting-row"><div class="setting-copy"><b>Add activity</b><span>Call, note, message or referral</span></div><button class="option" data-act="add-person-note" data-person-id="${p.id}">Add</button></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);}
function editPersonSheet(pid){const p=person(pid||ui.detail?.id);if(!p)return;openSheet(`<h2>Edit ${esc(p.name)}</h2><input type="hidden" id="epId" value="${p.id}"><div class="form-grid"><div class="field"><label>Name</label><input id="epName" value="${esc(p.name)}"></div><div class="field"><label>City</label><input id="epCity" value="${esc(p.city||'')}"></div><div class="field"><label>Age</label><input id="epAge" inputmode="numeric" value="${esc(p.age||'')}"></div><div class="field"><label>Occupation</label><input id="epOccupation" value="${esc(p.occupation||'')}"></div><div class="field"><label>Phone</label><input id="epPhone" value="${esc(p.phone||'')}"></div><div class="field"><label>Email</label><input id="epEmail" value="${esc(p.email||'')}"></div><div class="field"><label>Profile</label><textarea id="epProfile">${esc(p.profileText||'')}</textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" id="saveEditPerson">Save</button></div>`);document.getElementById('saveEditPerson').onclick=async()=>{p.name=document.getElementById('epName').value.trim()||p.name;p.city=document.getElementById('epCity').value.trim();p.age=Number(document.getElementById('epAge').value)||undefined;p.occupation=document.getElementById('epOccupation').value.trim();p.phone=document.getElementById('epPhone').value.trim();p.email=document.getElementById('epEmail').value.trim();const newProfile=document.getElementById('epProfile').value.trim();if(newProfile!==p.profileText){p.profileText=newProfile;p.profileVersion=(p.profileVersion||0)+1;}await save();closeSheet();render();showToast('Saved');};}
async function logProfileSend(pid){const p=person(pid);data.entries.push({id:id('e'),at:iso(),type:'profile',channel:'WhatsApp',direction:'out',fromPersonId:me().id,toPersonId:pid,personIds:[me().id,pid],aboutType:'person',aboutId:me().id,text:`Sent my profile v${me().profileVersion||1} to ${p.name}.`,profileVersion:me().profileVersion||1,result:''});await save();render();showToast('Profile send logged');}

function handleInput(e){if(e.target.matches('[data-role="search"]')){ui.search=e.target.value;clearTimeout(handleInput.t);handleInput.t=setTimeout(render,90);}}
function handleChange(e){if(e.target.id==='backupFile'&&e.target.files?.[0])importBackup(e.target.files[0]);}

document.addEventListener('click',handleClick);
document.addEventListener('input',handleInput);
document.addEventListener('change',handleChange);
overlay.addEventListener('click',e=>{if(e.target.classList.contains('scrim'))closeSheet();});

async function init(){
  try{data=await dbGet(STATE_KEY);}
  catch(err){console.error(err);storageBlocked=true;data=demoData();applySettings();render();showToast('Local storage unavailable; using temporary data');return;}
  try{if(!data){data=demoData();await save();}data.settings={...defaultSettings(),...(data.settings||{})};applySettings();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(err){console.error(err);showLoadProblem();}
}
function showLoadProblem(){app.innerHTML=`<main class="page"><div class="warm-empty"><h3>Your data could not be shown</h3><p>Nothing was changed or deleted. Please export a backup so it can be checked.</p><button class="warm-primary" data-act="export-backup">Export backup</button></div></main>`;}
init();
