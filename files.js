'use strict';

// Files: photos, PDFs and recordings. Each file is stored once (its content in the `blobs` store) and
// never changed. The record says whose it is and which entry brought it. A photo is shown only when
// tapped. Backups carry the content of every file.

function fileKind(f){const m=String(f?.mime||'');return m.startsWith('image/')?'Photo':m.startsWith('audio/')?'Recording':m==='application/pdf'?'PDF':'File';}
function fileSize(n){n=Number(n)||0;return n>=1048576?`${(n/1048576).toFixed(1)} MB`:n>=1024?`${Math.round(n/1024)} KB`:n?`${n} B`:'';}

// One owner for storing files, from the Files tab and from Intake.
async function storeFiles(list,{personId=null,entryId=null}={}){
  const out=[];
  for(const file of list||[]){
    const f={id:id('file'),name:file.name||'file',mime:file.type||'',size:file.size||0,personId:personId||null,entryId,createdAt:iso()};
    await putBlob(f.id,file);
    data.files.push(f);out.push(f);
  }
  return out;
}
async function addFilesForPerson(pid,list){
  const p=person(pid);if(!p||!list?.length)return;
  const e=addEntry({type:'status',personIds:[p.id],about:[{type:'person',id:p.id}],text:`Added ${list.length===1?list[0].name:`${list.length} files`}.`});
  const fs=await storeFiles(list,{personId:p.id,entryId:e.id});
  e.fileIds=fs.map(f=>f.id);e.changes.push({kind:'files-added',fileIds:e.fileIds});
  await save();render();showToast(fs.length===1?'File saved':`${fs.length} files saved`);
}

function filesTab(p){
  const fs=filesOf(p.id).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const add=`<label class="ghost-btn file-add">Add file<input type="file" id="personFiles" data-person-id="${esc(p.id)}" multiple accept="image/*,application/pdf,audio/*" hidden></label>`;
  const rows=fs.map(f=>`<button class="warm-person-row file-row" data-act="open-file" data-file-id="${esc(f.id)}"><div class="warm-activity-icon ${fileKind(f)==='Photo'?'peach':fileKind(f)==='Recording'?'lav':'sky'}">${icon(fileKind(f)==='Photo'?'image':fileKind(f)==='Recording'?'audio':'file')}</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(f.name)}</strong><time>${esc(fmtDate(f.createdAt))}</time></div><div class="warm-person-line">${esc([fileKind(f),fileSize(f.size)].filter(Boolean).join(' · '))}</div></div><div class="warm-chevron">›</div></button>`).join('');
  return `<div class="warm-section-title"><h2>Files</h2>${add}</div>${rows?`<div class="warm-stack">${rows}</div>`:empty('No files yet','Profiles, PDFs and recordings will live here without mixing with private history.')}`;
}

// Opening a file: a photo or recording is shown in a sheet; any file can be opened or saved.
let openFileUrl=null;
async function openFile(fid){
  const f=data.files.find(x=>x.id===fid&&!x.deletedAt);if(!f)return;
  const blob=await getBlob(f.id);
  if(openFileUrl)URL.revokeObjectURL(openFileUrl);
  openFileUrl=blob?URL.createObjectURL(blob):null;
  const k=fileKind(f);
  const view=!openFileUrl?'<p class="lead">The content of this file is not on this device.</p>':k==='Photo'?`<img class="file-photo" src="${openFileUrl}" alt="${esc(f.name)}">`:k==='Recording'?`<audio controls src="${openFileUrl}" class="file-audio"></audio>`:'';
  openSheet(`<h2>${esc(f.name)}</h2><p class="lead">${esc([k,fileSize(f.size),fmtDate(f.createdAt)].filter(Boolean).join(' · '))}</p>${view}<div class="split-actions ${openFileUrl?'three':''}">${openFileUrl?`<a class="ghost-btn" href="${openFileUrl}" download="${esc(f.name)}" target="_blank" rel="noopener">Open</a>`:''}<button class="ghost-btn" data-act="delete-file" data-file-id="${esc(f.id)}">Delete</button><button class="primary-btn" data-act="close-sheet">Done</button></div>`);
}
// Deleting keeps the file (and its content) so Undo brings it back.
async function deleteFile(fid){const f=data.files.find(x=>x.id===fid);if(!f||f.deletedAt)return;f.deletedAt=iso();await save();closeSheet();render();showActionToast('File deleted',{act:'restore-file',fileId:f.id});}
async function restoreFile(fid){const f=data.files.find(x=>x.id===fid);if(!f?.deletedAt)return;delete f.deletedAt;await save();render();showToast('File restored');}
