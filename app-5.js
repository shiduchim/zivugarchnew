'use strict';

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
  if(b.dataset.date){dateSheet(b.dataset.date);return;}
  if(b.dataset.answerValue){pickAnswer(b.dataset.answerValue);return;}
  if(b.dataset.send){runOnce('send',()=>confirmSend(b.dataset.send));return;}
  if(b.dataset.fileKind){pickFileKind(b.dataset.fileKind);return;}
  if(b.dataset.listSend){runOnce('send',()=>listSendStep(b.dataset.listSend,b.dataset.personId));return;}
  if('folderView' in b.dataset){ui.folder=b.dataset.folderView||'';if(b.dataset.viewKey&&ui.peopleFilter)delete ui.peopleFilter[b.dataset.viewKey];closeSheet();render();return;}
  if(b.dataset.segScope){const scope=b.dataset.segScope,val=b.dataset.seg;if(scope==='recent')ui.recentFilter=val;else ui.screenView[scope]=val;render();return;}
  if(b.dataset.detailTab){ui.detailTab=b.dataset.detailTab;render();return;}
  if(b.dataset.contact){if(b.dataset.contact==='wait')waitingSheet(b.dataset.personId);else logContact(b.dataset.personId,b.dataset.contact);return;}
  if(b.dataset.setting){const key=b.dataset.setting,val=b.dataset.value;data.settings[key]=key==='summaryCards'?val==='true':val;save().then(()=>{applySettings();settingsSheet();render();});return;}
  const act=b.dataset.act;
  if(act==='back'){ui.detail=null;ui.detailTab='';render();window.scrollTo(0,0);}
  else if(act==='settings')settingsSheet();
  else if(act==='open-test')location.assign(testAppUrl());
  else if(act==='open-stable')location.assign(stableAppUrl());
  else if(act==='load-test-build')loadNewTestBuild(b.dataset.build);
  else if(act==='check-test-build')checkForNewTestBuild({manual:true});
  else if(act==='refresh-test-data')runOnce(act,async()=>{if(!IS_TEST_BUILD)return;const ok=confirm('Replace all TEST data with a fresh copy of your stable data? Your stable data will not be changed.');if(!ok)return;const copied=await copyStableIntoTest();if(!copied){showToast('Stable data was not found on this device');return;}data=copied;await loadSafetyCopies();closeSheet();ui.detail=null;ui.screen='recent';render();showToast('Test data refreshed from stable');});
  else if(act==='filters')filtersSheet();
  else if(act==='add-current')currentAdd();
  else if(act==='add-activity')addActivitySheet(ui.detail?.type==='person'?ui.detail.id:'');
  else if(act==='add-person-note')addActivitySheet(b.dataset.personId||ui.detail?.id||'');
  else if(act==='add-source')addSourceSheet();
  else if(act==='add-shidduch-note'){const s=shidduch(b.dataset.shidduchId||ui.detail?.id);if(s)addActivitySheet(shidduchGoBetweens(s).find(x=>!isMe(x))||(isMe(s.guyId)?s.girlId:s.guyId),{shidduchId:s.id});}
  else if(act==='add-idea')addIdeaSheet();
  else if(act==='close-sheet')closeSheet();
  else if(act==='save-person')runOnce(act,savePerson);
  else if(act==='save-activity')runOnce(act,saveActivity);
  else if(act==='save-waiting')runOnce(act,saveWaiting);
  else if(act==='save-idea')runOnce(act,saveIdea);
  else if(act==='save-source')runOnce(act,saveSource);
  else if(act==='idea-no')notApplicableSheet(b.dataset.ideaId);
  else if(act==='idea-no-save')runOnce('idea',()=>chooseIdea(document.getElementById('ideaNoId')?.value,false,document.getElementById('ideaReason')?.value.trim()||''));
  else if(act==='link-earlier-save')runOnce(act,saveLinkedEarlier);
  else if(act==='idea-yes')runOnce('idea',()=>chooseIdea(b.dataset.ideaId,true));
  else if(act==='make-match')runOnce('idea',makeMatch);
  else if(act==='make-match-for'){closeSheet();addIdeaSheet(b.dataset.personId);}
  else if(act==='export-backup')exportBackup();
  else if(act==='export-original')exportOriginalState();
  else if(act==='reload-app')location.reload();
  else if(act==='import-backup')document.getElementById('backupFile')?.click();
  else if(act==='toggle-demo')runOnce(act,()=>{const wasDemo=data.meta.demo;return keepSafetyCopy(wasDemo?'clearing the demo':'loading the demo').then(copyId=>{data=wasDemo?emptyData():demoData();return save().then(()=>{closeSheet();ui.detail=null;ui.screen='recent';render();showUndoToast(data.meta.demo?'Demo loaded':'Ready for your data',copyId);});});});
  else if(act==='undo-safety')runOnce(act,()=>restoreSafetyCopy(b.dataset.copyId));
  else if(act==='close-open-item')runOnce('item',()=>closeOpenItem(b.dataset.itemId));
  else if(act==='item-not-needed')runOnce('item',()=>closeOpenItem(b.dataset.itemId,'not-needed'));
  else if(act==='item-check-in')runOnce('item',()=>checkInItem(b.dataset.itemId));
  else if(act==='after-contact-save')runOnce(act,saveAfterContact);
  else if(act==='undo-close-item')runOnce(act,()=>undoCloseOpenItem(b.dataset.itemId,b.dataset.entryId));
  else if(act==='show-wait-me'){ui.screen='shadchanim';ui.screenView.shadchanim='me';ui.detail=null;render();}
  else if(act==='show-wait-them'){ui.screen='shadchanim';ui.screenView.shadchanim='them';ui.detail=null;render();}
  else if(act==='show-active'){ui.screen='shidduchim';ui.screenView.shidduchim='active';ui.detail=null;render();}
  else if(act==='open-about'){const en=data.entries.find(x=>x.id===b.dataset.entryId);if(en)openAbout(en);}
  else if(act==='show-others'){ui.showOthers=!ui.showOthers;render();}
  else if(act==='show-dormant'){closeSheet();const arr=byType('Shadchan').filter(dormantPerson);openSheet(`<h2>Dormant 60+ days</h2><p class="lead">This is only a filter. It does not create reminders.</p>${arr.length?`<div class="list-card">${arr.map(p=>personRow(p)).join('')}</div>`:empty('Nobody is dormant','Everyone has been contacted in the last 60 days.')}<button class="primary-btn full" style="margin-top:12px" data-act="close-sheet">Done</button>`);}
  else if(act==='detail-menu')detailMenu();
  else if(act==='edit-person')editPersonSheet(ui.detail?.id);
  else if(act==='add-number'){editPersonSheet(b.dataset.personId);document.getElementById('epPhone')?.focus();}
  else if(act==='log-profile')sendProfileSheet(me().id,b.dataset.personId);
  else if(act==='send-profile')sendProfileSheet(b.dataset.personId||ui.detail?.id);
  else if(act==='profile-versions')profileVersionsSheet(b.dataset.personId||ui.detail?.id);
  else if(act==='quick-add')quickAdd(b.dataset.add);
  else if(act==='save-edit-person')runOnce(act,saveEditPerson);
  else if(act==='edit-keep-separate')runOnce('edit-identity',()=>finishEditAfterIdentity(false));
  else if(act==='edit-merge')runOnce('edit-identity',()=>finishEditAfterIdentity(true));
  else if(act==='identity-same')runOnce('identity',identitySame);
  else if(act==='identity-different')runOnce('identity',identityDifferent);
  else if(act==='compare-people')comparePeopleSheet(b.dataset.personId,b.dataset.otherId);
  else if(act==='not-same')runOnce(act,()=>confirmNotSame(b.dataset.personId,b.dataset.otherId));
  else if(act==='merge-confirm')runOnce('merge',()=>confirmMerge(b.dataset.personId,b.dataset.otherId));
  else if(act==='merge-sheet')mergeSheet(b.dataset.personId||ui.detail?.id);
  else if(act==='merge-chosen'){const other=document.getElementById('mergeOther')?.value;if(!other)showToast('Choose the other record');else comparePeopleSheet(b.dataset.personId,other);}
  else if(act==='undo-merge')runOnce('merge',()=>confirmUndoMerge(b.dataset.mergeId));
  else if(act==='needs-look')needsLookSheet();
  else if(act==='combine-pair')runOnce('combine',()=>confirmCombine(b.dataset.keepId,b.dataset.dupId));
  else if(act==='undo-combine')runOnce('combine',()=>confirmUndoCombine(b.dataset.mergeId));
  else if(act==='end-shidduch')openEndShidduchSheet(b.dataset.shidduchId||ui.detail?.id);
  else if(act==='confirm-end-shidduch')runOnce('end-shidduch',confirmEndShidduch);
  else if(act==='engaged')runOnce(act,()=>markEngaged(b.dataset.shidduchId||ui.detail?.id));
  else if(act==='pause-shidduch'){closeSheet();pauseSheet(b.dataset.shidduchId||ui.detail?.id);}
  else if(act==='confirm-pause')runOnce('pause',confirmPause);
  else if(act==='resume-shidduch')runOnce('pause',()=>resumeShidduch(b.dataset.shidduchId||ui.detail?.id));
  else if(act==='undo-pause')runOnce('pause',()=>undoPause(b.dataset.entryId));
  else if(act==='undo-end')runOnce('end-shidduch',()=>undoEnd(b.dataset.entryId));
  else if(act==='set-answer')answerSheet(ui.detail?.id,b.dataset.side);
  else if(act==='save-answer')runOnce(act,saveAnswer);
  else if(act==='add-date')addDateSheet(ui.detail?.id);
  else if(act==='save-new-date')runOnce(act,saveNewDate);
  else if(act==='date-move')runOnce('date',moveDate);
  else if(act==='date-cancelled')runOnce('date',markDateCancelled);
  else if(act==='date-happened')runOnce('date',markDateHappened);
  else if(act==='date-feedback')runOnce('date',saveDateFeedback);
  else if(act==='toggle-round')toggleRound(b.dataset.roundId);
  else if(act==='how-i-know')howIKnowSheet(b.dataset.personId);
  else if(act==='open-source'){closeSheet();ui.detail={type:'source',id:b.dataset.sourceId};ui.detailTab='';render();window.scrollTo(0,0);}
  else if(act==='open-entry'){closeSheet();ui.detail={type:'entry',id:b.dataset.entryId};render();window.scrollTo(0,0);}
  else if(act==='delete-entry')runOnce('entry',()=>deleteEntry(b.dataset.entryId));
  else if(act==='restore-entry')runOnce('entry',()=>restoreEntry(b.dataset.entryId));
  else if(act==='source-add-person')addToListSheet(b.dataset.sourceId);
  else if(act==='list-send')listSendSheet(b.dataset.sourceId);
  else if(act==='list-send-start')startListSend();
  else if(act==='list-send-stop')finishListSend();
  else if(act==='source-line')addToListSheet(b.dataset.sourceId,b.dataset.lineId);
  else if(act==='save-list-person')saveListPerson();
  else if(act==='add-link')addLinkSheet(b.dataset.personId||ui.detail?.id);
  else if(act==='save-link')saveLink();
  else if(act==='remove-link')runOnce('link',()=>removeLink(b.dataset.linkId));
  else if(act==='restore-link')runOnce('link',()=>restoreLink(b.dataset.linkId));
  else if(act==='open-file')openFile(b.dataset.fileId);
  else if(act==='delete-file')runOnce('file',()=>deleteFile(b.dataset.fileId));
  else if(act==='restore-file')runOnce('file',()=>restoreFile(b.dataset.fileId));
  else if(act==='folders')folderSheet(b.dataset.personId||ui.detail?.id);
  else if(act==='save-folders')runOnce(act,saveFolders);
  else if(act==='paste')pasteSheet();
  else if(act==='paste-clipboard')pasteFromClipboard();
  else if(act==='save-paste')runOnce(act,savePaste);
  else if(act==='intake')intakeSheet();
  else if(act==='file-entry')fileSheet(b.dataset.entryId);
  else if(act==='save-filing')saveFiling();
  else if(act==='intake-delete')runOnce('entry',()=>deleteEntry(b.dataset.entryId).then(closeSheet));
}

// The shidduch page's ⋯ offers only actions that exist for that shidduch; with none, the ⋯ is hidden.
function shidduchMenuActions(s){return s&&shStatus(s)!=='ended'&&zmStageForShidduch(s).index!==10?['engaged',shPaused(s)?'resume':'pause','end']:[];}
function detailMenu(){if(ui.detail?.type==='shidduch'){const s=shidduch(ui.detail.id);if(!shidduchMenuActions(s).length)return;openSheet(`<h2>${esc(shidduchTitle(s))}</h2><p class="lead">Less-used actions live here so the main page stays calm.</p><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Engaged</b><span>Mazal tov! Moves the stage to Marriage</span></div><button class="option" data-act="engaged" data-shidduch-id="${esc(s.id)}">Engaged</button></div>${shPaused(s)?`<div class="setting-row"><div class="setting-copy"><b>Resume</b><span>Back in progress</span></div><button class="option" data-act="resume-shidduch" data-shidduch-id="${esc(s.id)}">Resume</button></div>`:`<div class="setting-row"><div class="setting-copy"><b>Pause</b><span>On hold for now; its open items close</span></div><button class="option" data-act="pause-shidduch" data-shidduch-id="${esc(s.id)}">Pause</button></div>`}<div class="setting-row"><div class="setting-copy"><b>End shidduch</b><span>Save where it ended and why</span></div><button class="option" data-act="end-shidduch" data-shidduch-id="${esc(s.id)}">End</button></div></div><button class="primary-btn full" data-act="close-sheet">Done</button>`);return;}if(ui.detail?.type!=='person')return;const p=person(ui.detail.id);openSheet(`<h2>${esc(p.name)}</h2><p class="lead">Less-used actions live here so the main page stays calm.</p><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Edit person</b><span>Facts and profile</span></div><button class="option" data-act="edit-person">Edit</button></div><div class="setting-row"><div class="setting-copy"><b>Add activity</b><span>Call, note, message or referral</span></div><button class="option" data-act="add-person-note" data-person-id="${p.id}">Add</button></div>${data.settings.mode!=='single'&&!p.isMe&&(p.types?.includes('Guy')||p.types?.includes('Girl'))?`<div class="setting-row"><div class="setting-copy"><b>Make match</b><span>Pair ${esc(clarityFirstName(p))} with someone</span></div><button class="option" data-act="make-match-for" data-person-id="${p.id}">Choose</button></div>`:''}<div class="setting-row"><div class="setting-copy"><b>Folders</b><span>${esc((p.folderIds||[]).map(folderName).filter(Boolean).join(', ')||'Not in a folder')}</span></div><button class="option" data-act="folders" data-person-id="${p.id}">Choose</button></div>${profileVersionsOf(p.id).length?`<div class="setting-row"><div class="setting-copy"><b>Send profile</b><span>${p.isMe?'My profile':'This profile'}, the files you choose and your words</span></div><button class="option" data-act="send-profile" data-person-id="${p.id}">Send</button></div>`:''}${p.isMe?'':`<div class="setting-row"><div class="setting-copy"><b>Same person as…</b><span>Make two records one</span></div><button class="option" data-act="merge-sheet" data-person-id="${p.id}">Choose</button></div>`}${data.merges.filter(m=>m.kind==='person'&&m.keepId===p.id&&!m.undoneAt).map(m=>`<div class="setting-row"><div class="setting-copy"><b>Undo merge</b><span>Separate ${esc(personRaw(m.dupId)?.name||'the other record')} again</span></div><button class="option" data-act="undo-merge" data-merge-id="${esc(m.id)}">Undo</button></div>`).join('')}</div><button class="primary-btn full" data-act="close-sheet">Done</button>`);}
function editPersonSheet(pid){
  const p=person(pid||ui.detail?.id);if(!p)return;
  const field=(id,label,value,extra='')=>`<div class="field"><label>${label}</label><input id="${id}" value="${esc(value??'')}"${extra}></div>`;
  openSheet(`<h2>Edit ${esc(p.name)}</h2><input type="hidden" id="epId" value="${p.id}"><div class="form-grid">${field('epName','Name',p.name)}${field('epCity','City',p.city)}${field('epAge','Age',personAge(p),' inputmode="numeric"')}${field('epOccupation','Occupation',p.occupation)}${field('epPhone','Phone',p.phone,' type="tel"')}${field('epEmail','Email',p.email)}<div class="field"><label>How well I know them <span style="font-weight:400">(optional)</span></label><select id="epKnow"><option value="">—</option>${KNOW_LEVELS.map(([v,l])=>`<option value="${v}" ${p.knowLevel===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label>Profile</label><textarea id="epProfile">${esc(currentProfileText(p.id))}</textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" id="saveEditPerson" data-act="save-edit-person">Save</button></div>`);
}
function readEditForm(){const v=id=>document.getElementById(id)?.value??'';return {name:v('epName'),city:v('epCity'),age:v('epAge'),occupation:v('epOccupation'),phone:v('epPhone').trim(),email:v('epEmail').trim(),know:v('epKnow'),profile:v('epProfile')};}
// The one place an edit is written. A changed age is dated from today (an unchanged one keeps its date);
// a changed profile becomes a new frozen version.
function applyPersonEdit(p,f){
  p.name=f.name.trim()||p.name;p.city=f.city.trim();p.occupation=f.occupation.trim();p.phone=f.phone;p.email=f.email;
  const age=Number(f.age)||undefined;
  if(age!==(Number(personAge(p))||undefined)){p.age=age;if(age)p.ageAsOf=iso();else delete p.ageAsOf;}
  if(f.know)p.knowLevel=f.know;else delete p.knowLevel;
  const newProfile=f.profile.trim();
  if(newProfile!==currentProfileText(p.id)){const e=addEntry({type:'profile',personIds:[p.id],about:[{type:'person',id:p.id}],text:'',changes:[]});const v=addProfileVersion(p,newProfile,{entryId:e.id,origin:'edit'});e.text=`Profile updated to v${v.number}.`;e.profileVersionId=v.id;e.changes.push({kind:'profile-version',profileVersionId:v.id});}
}
async function finishEditAfterIdentity(merge){
  const pend=saveEditPerson.pending,f=saveEditPerson.form;saveEditPerson.pending=null;if(!pend||!f)return;
  const p=person(pend.pid);if(!p)return;
  applyPersonEdit(p,f);
  if(merge){const r=mergePeople(p.id,pend.otherId);if(r.error){showToast(r.error);await save();closeSheet();render();return;}await save();closeSheet();ui.detail={type:'person',id:r.merge.keepId};render();showActionToast('Now one person',{act:'undo-merge',mergeId:r.merge.id});return;}
  rememberNotSame(p.id,pend.otherId);await save();closeSheet();render();showToast('Saved');
}
// A phone or email typed in (for example a number added to someone who had none) goes through the
// matching check again: if it belongs to someone else, it asks "same person?" before saving.
async function saveEditPerson(){
  const p=person(document.getElementById('epId')?.value);if(!p)return;
  const f=readEditForm();
  if(f.phone!==(p.phone||'')||f.email!==(p.email||'')){
    const other=findPersonMatches({phone:f.phone,email:f.email},{excludeId:p.id}).exact[0];
    if(other){saveEditPerson.pending={pid:p.id,otherId:other.id};saveEditPerson.form=f;openSheet(`<h2>Same person?</h2><p class="lead">${esc(other.name)} has this phone number or email. Family members sometimes share a phone.</p>${personMatchCard(other)}<div class="split-actions identity-actions"><button class="ghost-btn" data-act="edit-keep-separate">Keep separate</button><button class="primary-btn" data-act="edit-merge">Same person</button></div>`);return;}
  }
  applyPersonEdit(p,f);
  await save();closeSheet();render();showToast('Saved');
}

function handleInput(e){if(e.target.matches('[data-role="search"]')){ui.search=e.target.value;clearTimeout(handleInput.t);handleInput.t=setTimeout(render,90);}else if(e.target.id==='sendWords')updateSendPreview();}
function handleChange(e){if(e.target.id==='backupFile'&&e.target.files?.[0])importBackup(e.target.files[0]);else if(['sendVersion','sendTo','sendPurpose'].includes(e.target.id)||e.target.name==='sendFile')updateSendPreview();else if(e.target.id==='aPerson')refreshActivityItems();else if(e.target.id==='personFiles'&&e.target.files?.length)addFilesForPerson(e.target.dataset.personId,[...e.target.files]);else if(['fileFrom','fileIdeaWho'].includes(e.target.id))fileFormChanged(e.target);else if(e.target.dataset.peopleFilter)readPeopleFilter(e.target.dataset.peopleFilter);}

document.addEventListener('click',handleClick);
document.addEventListener('input',handleInput);
document.addEventListener('change',handleChange);
// Test only: coming back to the app (or back online) checks for a newer deployed build.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForNewTestBuild();});
window.addEventListener('pageshow',e=>{if(e.persisted)checkForNewTestBuild();});
window.addEventListener('online',()=>checkForNewTestBuild());

// Start-up: open storage, load the data (upgrading v58 data once), then show it.
async function init(){
  try{await dbOpen();}
  catch(err){console.error(err);storageBlocked=true;data=demoData();applySettings();render();showToast('Local storage unavailable; using temporary data');return;}
  let res;
  try{res=await loadOrUpgrade();}
  catch(err){console.error(err);showUpgradeProblem();return;}
  try{data=res.data;touchData();applySettings();render();loadSafetyCopies();if(res.migrated)showToast(`ZivugMatch is now ${APP_VERSION_LABEL}`);else if(res.copiedFromStable)showToast('Test version copied your stable data');if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',IS_TEST_BUILD?{updateViaCache:'none'}:undefined).catch(()=>{});checkForNewTestBuild();
  }catch(err){console.error(err);showLoadProblem();}
}
function showLoadProblem(){app.innerHTML=`<main class="page"><div class="warm-empty"><h3>Your data could not be shown</h3><p>Nothing was changed or deleted. Please export a backup so it can be checked.</p><button class="warm-primary" data-act="export-backup">Export backup</button></div></main>`;}
// The upgrade to v1.0 failed: nothing was written, the original data is untouched. Offer it as a file.
function showUpgradeProblem(){app.innerHTML=`<main class="page"><div class="warm-empty"><h3>Your data could not be updated to ${APP_VERSION_LABEL}</h3><p>Nothing was changed or deleted. You can save your data as a file, and try again.</p><button class="warm-primary" data-act="export-original">Save my data</button> <button class="warm-primary" data-act="reload-app">Try again</button></div></main>`;}
async function exportOriginalState(){try{const old=await kvGet('state');const blob=new Blob([JSON.stringify(old,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ZivugMatch_v58_Data_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){showToast('Could not read the data');}}
// Start once every script has loaded, so the first render already uses the final screen code.
document.addEventListener('DOMContentLoaded',init);
