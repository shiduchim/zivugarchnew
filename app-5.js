
// A save action ignores repeated taps while it is still running (prevents double records).
function runOnce(key,fn){if(runOnce.busy[key])return;runOnce.busy[key]=true;Promise.resolve().then(fn).finally(()=>{runOnce.busy[key]=false;});}
runOnce.busy={};
// The app's one click handler.
function handleClick(e){
  if(e.target.classList.contains('scrim')){closeSheet();return;}
  const zmPerson=e.target.closest('[data-zm-person]');
  if(zmPerson){openPersonFromShidduch(zmPerson.dataset.zmPerson);return;}
  if(followShidduchReturn(e))return;
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.screen==='guys'&&openMyProfileInSingleMode())return;
  if('recentFilter' in b.dataset||'recentSort' in b.dataset){setRecentView(b);return;}
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
  else if(act==='save-person')runOnce(act,savePerson);
  else if(act==='save-activity')runOnce(act,saveActivity);
  else if(act==='save-waiting')runOnce(act,saveWaiting);
  else if(act==='save-idea')runOnce(act,saveIdea);
  else if(act==='save-source')runOnce(act,saveSource);
  else if(act==='idea-no')runOnce('idea',()=>chooseIdea(b.dataset.ideaId,false));
  else if(act==='idea-yes')runOnce('idea',()=>chooseIdea(b.dataset.ideaId,true));
  else if(act==='export-backup')exportBackup();
  else if(act==='import-backup')document.getElementById('backupFile')?.click();
  else if(act==='toggle-demo'){const wasDemo=data.meta.demo;keepSafetyCopy(wasDemo?'clearing the demo':'loading the demo').then(copyId=>{data=wasDemo?emptyData():demoData();return save().then(()=>{closeSheet();ui.detail=null;ui.screen='recent';render();showUndoToast(data.meta.demo?'Demo loaded':'Ready for your data',copyId);});});}
  else if(act==='undo-safety')runOnce(act,()=>restoreSafetyCopy(b.dataset.copyId));
  else if(act==='close-open-item')runOnce(act,()=>closeOpenItem(b.dataset.itemId));
  else if(act==='undo-close-item')runOnce(act,()=>undoCloseOpenItem(b.dataset.itemId,b.dataset.entryId));
  else if(act==='show-wait-me'){ui.screen='shadchanim';ui.screenView.shadchanim='me';ui.detail=null;render();}
  else if(act==='show-wait-them'){ui.screen='shadchanim';ui.screenView.shadchanim='them';ui.detail=null;render();}
  else if(act==='show-active'){ui.screen='shidduchim';ui.screenView.shidduchim='active';ui.detail=null;render();}
  else if(act==='open-about'){const en=data.entries.find(x=>x.id===b.dataset.entryId);if(en)openAbout(en);}
  else if(act==='show-dormant'){closeSheet();const arr=byType('Shadchan').filter(dormantPerson);openSheet(`<h2>Dormant 60+ days</h2><p class="lead">This is only a filter. It does not create reminders.</p>${arr.length?`<div class="list-card">${arr.map(p=>personRow(p)).join('')}</div>`:empty('Nobody is dormant','Everyone has been contacted in the last 60 days.')}<button class="primary-btn full" style="margin-top:12px" data-act="close-sheet">Done</button>`);}
  else if(act==='detail-menu')detailMenu();
  else if(act==='edit-person')editPersonSheet(ui.detail?.id);
  else if(act==='log-profile')logProfileSend(b.dataset.personId);
  else if(act==='quick-add')quickAdd(b.dataset.add);
  else if(act==='save-edit-person')runOnce(act,saveEditPerson);
  else if(act==='end-shidduch')openEndShidduchSheet(b.dataset.shidduchId||ui.detail?.id);
  else if(act==='confirm-end-shidduch')runOnce('end-shidduch',confirmEndShidduch);
}

// The shidduch page's ⋯ offers only actions that exist for that shidduch; with none, the ⋯ is hidden.
function shidduchMenuActions(s){return s&&s.status!=='ended'&&zmStageForShidduch(s).index!==10?['end']:[];}
function detailMenu(){if(ui.detail?.type==='shidduch'){const s=shidduch(ui.detail.id);if(!shidduchMenuActions(s).length)return;openSheet(`<h2>${esc(shidduchTitle(s))}</h2><p class="lead">Less-used actions live here so the main page stays calm.</p><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>End shidduch</b><span>Save where it ended and why</span></div><button class="option" data-act="end-shidduch" data-shidduch-id="${esc(s.id)}">End</button></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);return;}if(ui.detail?.type!=='person')return;const p=person(ui.detail.id);openSheet(`<h2>${esc(p.name)}</h2><p class="lead">Less-used actions live here so the main page stays calm.</p><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Edit person</b><span>Facts and profile</span></div><button class="option" data-act="edit-person">Edit</button></div><div class="setting-row"><div class="setting-copy"><b>Add activity</b><span>Call, note, message or referral</span></div><button class="option" data-act="add-person-note" data-person-id="${p.id}">Add</button></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);}
function editPersonSheet(pid){const p=person(pid||ui.detail?.id);if(!p)return;openSheet(`<h2>Edit ${esc(p.name)}</h2><input type="hidden" id="epId" value="${p.id}"><div class="form-grid"><div class="field"><label>Name</label><input id="epName" value="${esc(p.name)}"></div><div class="field"><label>City</label><input id="epCity" value="${esc(p.city||'')}"></div><div class="field"><label>Age</label><input id="epAge" inputmode="numeric" value="${esc(p.age||'')}"></div><div class="field"><label>Occupation</label><input id="epOccupation" value="${esc(p.occupation||'')}"></div><div class="field"><label>Phone</label><input id="epPhone" value="${esc(p.phone||'')}"></div><div class="field"><label>Email</label><input id="epEmail" value="${esc(p.email||'')}"></div><div class="field"><label>Profile</label><textarea id="epProfile">${esc(p.profileText||'')}</textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" id="saveEditPerson" data-act="save-edit-person">Save</button></div>`);}
async function saveEditPerson(){const p=person(document.getElementById('epId')?.value);if(!p)return;p.name=document.getElementById('epName').value.trim()||p.name;p.city=document.getElementById('epCity').value.trim();p.age=Number(document.getElementById('epAge').value)||undefined;p.occupation=document.getElementById('epOccupation').value.trim();p.phone=document.getElementById('epPhone').value.trim();p.email=document.getElementById('epEmail').value.trim();const newProfile=document.getElementById('epProfile').value.trim();if(newProfile!==p.profileText){p.profileText=newProfile;p.profileVersion=(p.profileVersion||0)+1;}await save();closeSheet();render();showToast('Saved');}

function handleInput(e){if(e.target.matches('[data-role="search"]')){ui.search=e.target.value;clearTimeout(handleInput.t);handleInput.t=setTimeout(render,90);}}
function handleChange(e){if(e.target.id==='backupFile'&&e.target.files?.[0])importBackup(e.target.files[0]);}

document.addEventListener('click',handleClick);
document.addEventListener('input',handleInput);
document.addEventListener('change',handleChange);

async function init(){
  try{data=await dbGet(STATE_KEY);}
  catch(err){console.error(err);storageBlocked=true;data=demoData();applySettings();render();showToast('Local storage unavailable; using temporary data');return;}
  try{if(!data){data=demoData();await save();}normalizeData(data);data.settings={...defaultSettings(),...(data.settings||{})};applySettings();render();loadSafetyCopies();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(err){console.error(err);showLoadProblem();}
}
function showLoadProblem(){app.innerHTML=`<main class="page"><div class="warm-empty"><h3>Your data could not be shown</h3><p>Nothing was changed or deleted. Please export a backup so it can be checked.</p><button class="warm-primary" data-act="export-backup">Export backup</button></div></main>`;}
// Start once every script has loaded, so the first render already uses the final screen code.
document.addEventListener('DOMContentLoaded',init);
