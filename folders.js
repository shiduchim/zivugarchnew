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
// While a folder is chosen, the list says so, with a way back to everyone.
function folderViewNote(){return ui.folder&&folderName(ui.folder)?`<div class="folder-note"><span>Folder: <b>${esc(folderName(ui.folder))}</b></span><button data-folder-view="">Show all</button></div>`:'';}
