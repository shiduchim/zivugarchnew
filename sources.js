'use strict';

// Sources: a list, an event, a website, a group or a referral that people came from. Each line keeps
// the words it came with, and points to the one permanent record of that person (or is "not added
// yet"). Progress (contacted, replied, follow-up) is worked out from the ledger, never typed.

const SOURCE_KINDS=[['list','List'],['event','Event'],['site','Website'],['group','Group'],['referral','Referral']];

// The lines of a pasted list, each kept exactly as written (empty lines and lines with no letters or
// digits are left out).
function listLines(text){return String(text||'').split(/\r?\n/).map(t=>t.trim()).filter(t=>/[\p{L}\p{N}]/u.test(t));}
// A first guess at the name and phone on a line ("Miriam Cohen - 050-000-0101"); you can change both.
function guessFromLine(text){
  const m=String(text||'').match(/(\+?\d[\d\s().-]{6,}\d)/);
  const phone=m?m[1].trim():'';
  const name=String(text||'').replace(phone,'').replace(/^[\s\d.)*•-]+(?=\D)/,'').replace(/[\s,:;|–—-]+$/,'').replace(/^[\s,:;|–—-]+/,'').trim();
  return {name,phone};
}
function shadchanOptions(selected=''){return livePeople().filter(p=>!p.isMe).sort((a,b)=>(b.types?.includes('Shadchan')-a.types?.includes('Shadchan'))||byName(a,b)).map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('');}

function addSourceSheet(){
  openSheet(`<h2>Add source</h2><p class="lead">A source is where these names came from.</p><div class="form-grid"><div class="field"><label>Name</label><input id="sName" placeholder="For example: Rivka's shadchanim list" /></div><div class="field"><label>Type</label><select id="sKind">${SOURCE_KINDS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><div class="field"><label>Who gave it? <span style="font-weight:400">(optional)</span></label><select id="sFrom"><option value="">Nobody / me</option>${shadchanOptions()}</select></div><div class="field"><label>Contact again after</label><select id="sDays"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div><div class="field"><label>Names <span style="font-weight:400">(optional)</span></label><textarea id="sText" placeholder="Paste the list as it came. Each line is kept as written."></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-source">Save source</button></div>`);
}
async function saveSource(){
  const name=document.getElementById('sName').value.trim();if(!name)return showToast('Enter a source name');
  const from=document.getElementById('sFrom')?.value||null,text=document.getElementById('sText')?.value||'';
  const src=createSource({name,kind:document.getElementById('sKind').value,fromPersonId:from,followUpDays:Number(document.getElementById('sDays').value)||7,text});
  await save();closeSheet();ui.detail={type:'source',id:src.id};ui.detailTab='';render();showToast('Source saved');
}
// One owner for making a source (from the Add sheet or from Intake): the lines keep the original words.
function createSource({name,kind='list',fromPersonId=null,followUpDays=7,text='',entry=null}){
  const src={id:id('src'),name,kind,createdAt:iso(),fromPersonId:fromPersonId||null,lines:listLines(text).map(t=>({id:id('line'),text:t})),followUpDays};
  if(text.trim())src.originalText=text;
  data.sources.push(src);
  const e=entry||addEntry({type:'source',direction:fromPersonId?'in':'none',fromPersonId,toPersonId:fromPersonId?me().id:null,personIds:[fromPersonId],about:[{type:'source',id:src.id}],text:`Added the source ${name}${src.lines.length?` (${src.lines.length} names)`:''}.`});
  e.changes=e.changes||[];e.changes.push({kind:'source-added',sourceId:src.id});
  src.entryId=e.id;
  return src;
}

function sourceFollowUp(src){return openItems().find(x=>x.kind==='list-follow-up'&&x.about?.type==='source'&&x.about.id===src.id);}
function sourceDetail(sid){
  const src=source(sid);if(!src)return shadchanScreen();
  const st=sourceStats(src),from=person(src.fromPersonId),fu=sourceFollowUp(src);
  const followRow=fu?`<div class="source-follow"><div><b>${esc(fu.label)}</b><span>${itemIsDue(fu)?'Due now':`From ${esc(fmtDate(fu.dueAt))}`}</span></div><div class="option-group"><button class="option" data-act="close-open-item" data-item-id="${esc(fu.id)}">Done</button><button class="option quiet" data-act="item-not-needed" data-item-id="${esc(fu.id)}">Not needed</button></div></div>`:'';
  const original=src.originalText?`<details class="source-original"><summary>The list as it came</summary><div class="profile-text">${esc(src.originalText)}</div></details>`:'';
  return `${detailHeader(src.name,`${src.kind||'Source'} · ${fmtDate(src.createdAt)}${from?` · from ${from.name}`:''}`)}<div class="progress-card"><div style="font:700 21px Georgia,serif">${st.total} shadchanim</div><div style="font-size:11px;color:var(--text-2);margin-top:4px">This list updates itself when you contact someone anywhere in the app.</div><div class="progress-line"><i style="width:${st.total?Math.round(st.contacted/st.total*100):0}%"></i></div></div><div class="summary-strip">${summaryCard('sage',st.contacted,'Contacted')}${summaryCard('blue',st.replied,'Replied')}${summaryCard('amber',st.follow,'Contact again')}</div>${followRow}${original}<div class="section-head"><h2>People</h2><span><button class="section-add" data-act="source-add-person" data-source-id="${esc(src.id)}">Add</button></span></div>${(src.lines||[]).length?`<div class="list-card">${src.lines.map(l=>sourceLineRow(l,src)).join('')}</div>`:empty('No people in this source','Add people to this list as they are filed.')}`;
}
// A line of a list: the person's one record, or the original words when nobody is added for them yet.
function sourceLineRow(l,src){const p=l.personId&&person(l.personId);return p?personRow(p):`<button class="warm-person-row source-line-unlinked" data-act="source-line" data-source-id="${esc(src.id)}" data-line-id="${esc(l.id)}"><div class="warm-avatar sky">?</div><div class="warm-person-main"><div class="warm-person-top"><strong>${esc(l.text||'Unnamed')}</strong></div><div class="warm-person-line">Not added yet · tap to add</div></div><div class="warm-chevron">›</div></button>`;}

// Adding someone to a list goes through the one matching check, so the same human on several lists
// stays one record. The line's words never change.
let listAddFlow=null;
function addToListSheet(sid,lineId=null){
  const src=source(sid);if(!src)return;
  const line=lineId&&src.lines.find(l=>l.id===lineId),g=guessFromLine(line?.text);
  listAddFlow={sourceId:src.id,lineId:line?.id||null};
  openSheet(`<h2>${line?'Add from the list':'Add to the list'}</h2><p class="lead">${line?`On the list: “${esc(line.text)}”. The line stays as written.`:esc(src.name)}</p><div class="form-grid"><div class="field"><label>Name</label><input id="lName" value="${esc(g.name)}"></div><div class="field"><label>Phone</label><input id="lPhone" type="tel" value="${esc(g.phone)}"></div><div class="field"><label>City</label><input id="lCity"></div><div class="field"><label>Role</label><select id="lRole">${['Shadchan','Guy','Girl','Reference'].map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-list-person">Save</button></div>`);
}
function saveListPerson(){
  const f=listAddFlow;if(!f)return;
  const src=source(f.sourceId),name=document.getElementById('lName')?.value.trim();if(!src)return;
  if(!name){showToast('Enter a name');return;}
  const phone=document.getElementById('lPhone')?.value.trim()||'',city=document.getElementById('lCity')?.value.trim()||'',role=document.getElementById('lRole')?.value||'Shadchan';
  listAddFlow=null;
  matchThenUse({name,phone,city,types:[role],referrerId:src.fromPersonId},async(pid,existed)=>{
    const p=person(pid);
    if(sourcePeopleIds(src).includes(canonId(pid))){closeSheet();render();showToast(`${p.name} is already on this list`);await save();return;}
    let line=f.lineId&&src.lines.find(l=>l.id===f.lineId);
    if(!line){line={id:id('line'),text:[name,phone].filter(Boolean).join(' ')};src.lines.push(line);}
    line.personId=p.id;
    addEntry({type:'source',direction:src.fromPersonId?'in':'none',fromPersonId:src.fromPersonId||null,toPersonId:src.fromPersonId?me().id:null,personIds:[p.id,src.fromPersonId],about:[{type:'person',id:p.id},{type:'source',id:src.id}],text:`${p.name} is on ${src.name}.`,changes:[{kind:'source-line-linked',sourceId:src.id,lineId:line.id,personId:p.id}]});
    await save();closeSheet();ui.detail={type:'source',id:src.id};render();showToast(existed?`${p.name} was already here`:`${p.name} added`);
  });
}

// A list's follow-up is one quiet item for the whole list. It is opened by a contact (never by showing a
// screen): the first message or call to someone on the list. It is due after the list's follow-up time,
// and closes by itself when everyone contacted has replied.
function noteListProgress(e){
  if(e.direction==='out'&&e.toPersonId){
    for(const src of sourcesForPerson(e.toPersonId)){
      if(sourceFollowUp(src)||!src.lines?.length)continue;
      if(data.openItems.some(x=>x.kind==='list-follow-up'&&x.about?.id===src.id))continue; // one per list, ever
      const due=new Date(entryTime(e)+(Number(src.followUpDays)||7)*86400000).toISOString();
      addOpenItem({direction:'me',personId:null,about:{type:'source',id:src.id},kind:'list-follow-up',label:`Follow up on ${src.name}`,dueAt:due,openedByEntryId:e.id});
      e.changes=e.changes||[];e.changes.push({kind:'item-opened',itemId:data.openItems[data.openItems.length-1].id});
    }
  }else if(e.direction==='in'&&e.fromPersonId){
    for(const src of sourcesForPerson(e.fromPersonId)){
      const fu=sourceFollowUp(src);if(!fu)continue;
      const st=sourceStats(src);
      if(st.contacted&&st.replied===st.contacted&&st.contacted===sourcePeopleIds(src).length){closeItemRecord(fu,{entryId:e.id,kind:'done',at:e.at||iso()});e.changes=e.changes||[];e.changes.push({kind:'item-closed',itemId:fu.id});}
    }
  }
}
