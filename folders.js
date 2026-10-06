'use strict';

// Folders: labels I put on people ("Top", "Haifa", "Ask again in spring"). A folder is edited directly
// on the person; choosing a folder in a list only changes the view.

function folderName(fid){return data.folders.find(f=>f.id===fid)?.name||'';}
function folderSheet(pid){
  const p=person(pid);if(!p)return;
  const has=new Set(p.folderIds||[]);
  openSheet(`<h2>Folders</h2><p class="lead">${esc(p.name)} can be in more than one folder.</p><input type="hidden" id="folderPerson" value="${esc(p.id)}">${data.folders.length?`<div class="sheet-section folder-list">${data.folders.map(f=>`<label class="checkbox-row"><input type="checkbox" name="personFolder" value="${esc(f.id)}" ${has.has(f.id)?'checked':''}> ${esc(f.name)}</label>`).join('')}</div>`:''}<div class="field"><label>New folder <span style="font-weight:400">(optional)</span></label><input id="newFolder" placeholder="For example: Top"></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-folders">Save</button></div>`);
}
async function saveFolders(){
  const p=person(document.getElementById('folderPerson')?.value);if(!p)return;
  const ids=[...document.querySelectorAll('input[name="personFolder"]:checked')].map(x=>x.value);
  const name=document.getElementById('newFolder')?.value.trim();
  if(name){let f=data.folders.find(x=>x.name.toLowerCase()===name.toLowerCase());if(!f){f={id:id('folder'),name,createdAt:iso()};data.folders.push(f);}if(!ids.includes(f.id))ids.push(f.id);}
  p.folderIds=ids;
  await save();closeSheet();render();showToast('Folders saved');
}
// The folder part of a list's filter sheet (only when there are folders).
function folderFilterHtml(){
  if(!data.folders.length)return '';
  const b=(v,l)=>`<button class="option ${(ui.folder||'')===v?'active':''}" data-folder-view="${esc(v)}">${esc(l)}</button>`;
  return `<div class="setting-row"><div class="setting-copy"><b>Folder</b><span>Show only people in one folder</span></div><div class="option-group">${b('','All')}${data.folders.map(f=>b(f.id,f.name)).join('')}</div></div>`;
}
// While a view is narrowed (a folder, an age range, a city), the list says so, with a way back to everyone.
function listViewNote(key=''){
  const f=key?ui.peopleFilter?.[key]||{}:{},parts=[];
  if(ui.folder&&folderName(ui.folder))parts.push(`Folder: <b>${esc(folderName(ui.folder))}</b>`);
  if(f.ageMin||f.ageMax)parts.push(`Age <b>${f.ageMin||'…'}–${f.ageMax||'…'}</b>`);
  if(f.city)parts.push(`<b>${esc(f.cityName||f.city)}</b>`);
  return parts.length?`<div class="folder-note"><span>${parts.join(' · ')}</span><button data-folder-view="" data-view-key="${esc(key)}">Show all</button></div>`:'';
}
// Shadchan mode's Guys or Girls view: age, city and folder.
function peopleViewSheet(key){
  const type=key==='girls'?'Girl':'Guy',f=ui.peopleFilter?.[key]||{};
  const cities=[...new Map(byType(type).filter(p=>p.city).map(p=>[normCity(p.city),p.city])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const ages=Array.from({length:43},(_,i)=>18+i);
  const ageSel=(id,v)=>`<select id="${id}" data-people-filter="${key}"><option value="">Any</option>${ages.map(a=>`<option value="${a}" ${v===a?'selected':''}>${a}</option>`).join('')}</select>`;
  openSheet(`<h2>${key==='girls'?'Girls':'Guys'} view</h2><div class="sheet-section"><div class="setting-row"><div class="setting-copy"><b>Age</b><span>From – to</span></div><div class="option-group view-ages">${ageSel('pfAgeMin',f.ageMin)}${ageSel('pfAgeMax',f.ageMax)}</div></div><div class="setting-row"><div class="setting-copy"><b>City</b></div><select id="pfCity" data-people-filter="${key}"><option value="">Any</option>${cities.map(([n,c])=>`<option value="${esc(n)}" ${f.city===n?'selected':''}>${esc(c)}</option>`).join('')}</select></div>${folderFilterHtml()}</div><div class="split-actions"><button class="ghost-btn" data-act="settings">Settings</button><button class="primary-btn" data-act="close-sheet">Done</button></div>`);
}
function readPeopleFilter(key){
  const v=id=>document.getElementById(id)?.value||'',city=document.getElementById('pfCity');
  const f={ageMin:Number(v('pfAgeMin'))||0,ageMax:Number(v('pfAgeMax'))||0,city:v('pfCity'),cityName:city?.selectedOptions?.[0]?.textContent||''};
  ui.peopleFilter=ui.peopleFilter||{};
  if(f.ageMin||f.ageMax||f.city)ui.peopleFilter[key]=f;else delete ui.peopleFilter[key];
  render();
}
