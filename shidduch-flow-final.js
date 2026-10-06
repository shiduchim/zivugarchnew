'use strict';

// Final shidduch workflow layer.
// Visible wording uses Offers -> In Progress -> Ended.
// The stage bar shows where the shidduch reached; turn/waiting remains separate.

const ZM_FLOW_STAGE_LABELS=['Profile sent','References','Date 1','Date 2','Date 3','Date 4','Date 5','Date 6','Date 7','Date 8','Marriage'];
const ZM_FLOW_STAGE_COLORS=['#4e8df7','#2fb8b0','#6f79eb','#7f6deb','#9563e6','#ac59dc','#c251ce','#d64db8','#e4579d','#ee6b7f','#39b86c'];

function zmFlowStageColor(index){return ZM_FLOW_STAGE_COLORS[Math.max(0,Math.min(10,index))]||ZM_FLOW_STAGE_COLORS[0];}

function zmFlowStageIndexFromLabel(label){
  const s=String(label||'').trim().toLowerCase();
  if(/married|marriage/.test(s))return 10;
  if(/reference|checking/.test(s))return 1;
  const m=s.match(/date\s*([1-8])/);
  if(m)return Math.min(9,Number(m[1])+1);
  if(/profile|sent/.test(s))return 0;
  return null;
}

// Tabs are deliberately lifecycle order: Offers -> In Progress -> Ended.
function shidduchimScreen(){
  const v=ui.screenView.shidduchim;
  const inProgress=liveShidduchim().filter(s=>shStatus(s)==='active');
  const ended=liveShidduchim().filter(s=>shStatus(s)==='ended');
  const offers=data.ideas.filter(i=>i.status==='open');
  const tabs=[
    {value:'ideas',label:'Offers',count:offers.length},
    {value:'active',label:'In Progress',count:inProgress.length},
    {value:'ended',label:'Ended',count:ended.length}
  ];
  let rows='';
  if(v==='ideas')rows=offers.map(zmOfferRow).join('');
  else rows=(v==='active'?inProgress:ended).map(s=>{
    const r=currentRound(s);
    return `<button class="warm-match-row zm-stage-card ${shStatus(s)==='ended'?'zm-ended-card':''}" data-shidduch="${s.id}"><div class="warm-match-avatar filled">♥</div><div class="warm-match-main"><div><strong>${esc(shidduchTitle(s))}</strong><time>Round ${roundNumber(r)}</time></div>${zmStageBar(s)}</div><div class="warm-chevron">›</div></button>`;
  }).join('');

  const emptyTitle=v==='ideas'?'No offers':v==='active'?'No shidduchim in progress':'No ended shidduchim';
  const emptyText=v==='ideas'?'New suggested matches will appear here before they become shidduchim.':v==='active'?'When you accept an offer, the shidduch will appear here.':'Ended shidduchim keep the stage where they stopped and their history.';
  return `${header('Shidduchim','Offers and shidduchim',{add:true})}${searchBox('Search a pair…')}${segment(tabs,v,'shidduchim')}<div class="warm-stack">${rows||empty(emptyTitle,emptyText,'add-idea')}</div>`;
}

function addIdeaSheet(){
  const guys=byType('Guy'),girls=byType('Girl'),shads=byType('Shadchan');
  openSheet(`<h2>New offer</h2><p class="lead">An offer is a suggested pair. It becomes a shidduch only when you choose Interested.</p><div class="form-grid"><div class="field"><label>Guy</label><select id="iGuy">${guys.map(p=>`<option value="${p.id}">${esc(p.isMe?'Me':p.name)}</option>`).join('')}</select></div><div class="field"><label>Girl</label><select id="iGirl">${girls.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Offered by</label><select id="iBy"><option value="">Me / unknown</option>${shads.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-idea">Save offer</button></div>`);
}

function universalAddSheet(){
  openSheet(`<h2>Add</h2><p class="lead">What do you want to add?</p><div class="quick-add-grid"><button id="qaIdea" data-act="quick-add" data-add="offer"><span>♡</span><b>Offer</b><small>Someone suggested a match</small></button><button id="qaGuy" data-act="quick-add" data-add="Guy"><span>G</span><b>Guy</b><small>Add a person</small></button><button id="qaShad" data-act="quick-add" data-add="Shadchan"><span>S</span><b>Shadchan</b><small>Add to your network</small></button><button id="qaGirl" data-act="quick-add" data-add="Girl"><span>G</span><b>Girl</b><small>Add a person</small></button><button id="qaNote" data-act="quick-add" data-add="note"><span>✎</span><b>Note or call</b><small>Add something that happened</small></button></div><button class="ghost-btn full" data-act="close-sheet">Cancel</button>`);
}

// A choice in the Add sheet closes it and opens that form.
function quickAdd(kind){
  closeSheet();
  if(kind==='offer')addIdeaSheet();
  else if(kind==='note')addActivitySheet();
  else addPersonSheet(kind);
}

function openEndShidduchSheet(sid){
  const s=shidduch(sid);if(!s||shStatus(s)==='ended')return;
  const st=zmStageForShidduch(s);
  const options=ZM_FLOW_STAGE_LABELS.slice(0,10).map((label,i)=>`<option value="${i}" ${i===st.index?'selected':''}>${esc(label)}</option>`).join('');
  openSheet(`<h2>End shidduch</h2><p class="lead">Save where it ended so you can understand the history later.</p><input type="hidden" id="endShidduchId" value="${esc(s.id)}"><div class="form-grid"><div class="field"><label>Where did it end?</label><select id="endStage">${options}</select></div><div class="field"><label>Why did it end? <span style="font-weight:400">(optional)</span></label><textarea id="endReason" placeholder="Short private note…"></textarea></div></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="confirm-end-shidduch">Save as ended</button></div>`);
}

// Ending writes to the current round (the shidduch's status is worked out from it) and closes the
// shidduch's open items, each pointing to the entry that ended it.
async function confirmEndShidduch(){
  const sid=document.getElementById('endShidduchId')?.value;
  const s=shidduch(sid),r=currentRound(s);if(!s||!r||r.status==='ended')return;
  const idx=Math.max(0,Math.min(9,Number(document.getElementById('endStage')?.value)||0));
  const label=ZM_FLOW_STAGE_LABELS[idx];
  const reason=document.getElementById('endReason')?.value.trim()||'';
  const e=addEntry({type:'status',personIds:[s.guyId,s.girlId,...(r.shadchanIds||[])],about:[{type:'shidduch',id:s.id},{type:'round',id:r.id}],text:`Shidduch ended at ${label}.${reason?` ${reason}`:''}`,result:'Ended',changes:[{kind:'round-ended',roundId:r.id,stageIndex:idx}],private:reason?true:undefined});
  r.status='ended';r.endedAt=e.at;r.endedByEntryId=e.id;r.endedStage=label;r.endedStageIndex=idx;r.endReason=reason;
  for(const x of openForShidduch(s.id))closeItemRecord(x,{entryId:e.id,kind:'auto',at:e.at});
  await save();
  closeSheet();
  ui.detail=null;
  ui.screen='shidduchim';
  ui.screenView.shidduchim='ended';
  render();
  showToast('Moved to Ended');
}

// Pair names no longer use arrow symbols. Compact list/sheet titles use a simple dash.
function shidduchTitle(s){
  const g=person(s?.guyId),gl=person(s?.girlId);
  return `${g?.name||'Guy'} – ${gl?.name||'Girl'}`;
}

function zmOfferRow(i){
    const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
    return `<button class="warm-match-row zm-offer-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} – ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>${sug?`Offered by ${esc(sug.name)}`:'New offer'}</p></div><div class="warm-chevron">›</div></button>`;
  }

// Keep the offer sheet consistent too.
function ideaSheet(iid){
    const i=idea(iid);if(!i)return;
    const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
    openSheet(`<h2>${esc(g?.name)} – ${esc(gl?.name)}</h2><p class="lead">Offer · suggested by ${esc(sug?.name||'you')} · ${esc(fmtDate(i.createdAt))}. An offer is not yet a shidduch.</p><div class="profile-card"><h3>${esc(gl?.name||'Profile')}</h3><div class="profile-text">${esc(currentProfileText(gl?.id)||'No profile text saved.')}</div></div><div class="split-actions"><button class="ghost-btn" data-act="idea-no" data-idea-id="${i.id}">Not applicable</button><button class="primary-btn" data-act="idea-yes" data-idea-id="${i.id}">Interested</button></div>`);
  }
