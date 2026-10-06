'use strict';

// Offers (stored as ideas): a suggested pair, not yet a shidduch.
// - Not applicable closes the offer, may keep a private reason, and creates no shidduch.
// - Interested makes (or reopens) the pair's one permanent shidduch: a round in progress continues,
//   an ended pair starts its next round on the same record. A double tap cannot open a second round.

function zmOfferRow(i){
  const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
  return `<button class="warm-match-row zm-offer-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} – ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>${sug?`Offered by ${esc(sug.name)}`:'New offer'}</p></div><div class="warm-chevron">›</div></button>`;
}

function ideaSheet(iid){
  const i=idea(iid);if(!i)return;
  const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
  const pair=shidduchForPair(i.guyId,i.girlId);
  const again=i.status==='open'&&pair&&shStatus(pair)==='ended'?`<p class="lead offer-again">Suggested again · this pair had Round ${roundNumber(currentRound(pair))}, which ended.</p>`:'';
  const actions=i.status==='open'?`<div class="split-actions"><button class="ghost-btn" data-act="idea-no" data-idea-id="${i.id}">Not applicable</button><button class="primary-btn" data-act="idea-yes" data-idea-id="${i.id}">Interested</button></div>`:`<p class="lead">${i.status==='interested'?'Interested':'Not applicable'} · ${esc(fmtDate(i.closedAt))}</p><button class="primary-btn full" data-act="close-sheet">Done</button>`;
  openSheet(`<h2>${esc(g?.name)} – ${esc(gl?.name)}</h2><p class="lead">Offer · suggested by ${esc(sug?.name||'you')} · ${esc(fmtDate(i.createdAt))}. An offer is not yet a shidduch.</p>${again}<div class="profile-card"><h3>${esc(gl?.name||'Profile')}</h3><div class="profile-text">${esc(currentProfileText(gl?.id)||'No profile text saved.')}</div></div>${actions}`);
}

// Not applicable: a reason may be kept, privately, on the offer itself.
function notApplicableSheet(iid){
  const i=idea(iid);if(!i||i.status!=='open')return;
  openSheet(`<h2>Not applicable</h2><p class="lead">The offer closes. No shidduch is made. A reason is optional and stays private.</p><div class="field"><label>Private reason <span style="font-weight:400">(optional)</span></label><textarea id="ideaReason" placeholder="Only for you"></textarea></div><input type="hidden" id="ideaNoId" value="${esc(i.id)}"><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="idea-no-save">Save</button></div>`);
}

async function chooseIdea(iid,yes,reason=''){
  const i=idea(iid);if(!i||i.status!=='open')return;
  const suggester=i.suggestedByPersonId&&person(i.suggestedByPersonId);
  if(!yes){
    const e=addEntry({type:'status',personIds:[i.guyId,i.girlId],about:[{type:'idea',id:i.id}],text:'Marked not applicable.',result:'Not applicable',changes:[{kind:'idea-closed',ideaId:i.id,decision:'not-applicable'}]});
    i.status='not-applicable';i.closedAt=e.at;i.closedByEntryId=e.id;
    if(reason)i.privateReason=reason;
    // The one who suggested it still gets an answer; with no suggester there is nobody to tell.
    for(const x of openItems().filter(x=>x.about?.type==='idea'&&x.about.id===i.id)){
      if(suggester){x.label=`Tell ${suggester.name}: not applicable`;x.direction='me';x.personId=suggester.id;x.kind='tell-decision';}
      else closeItemRecord(x,{entryId:e.id,kind:'not-needed',at:e.at});
    }
    await save();closeSheet();render();showToast('Offer closed');return;
  }
  let s=shidduchForPair(i.guyId,i.girlId);
  const current=s&&currentRound(s),continuing=current?.status==='active';
  const e=addEntry({type:'status',personIds:[i.guyId,i.girlId,i.suggestedByPersonId],about:[],text:'',result:'Shidduch active',changes:[]});
  if(!s){s={id:id('sh'),guyId:i.guyId,girlId:i.girlId,createdAt:e.at,createdByEntryId:e.id};data.shidduchim.push(s);e.changes.push({kind:'shidduch-created',shidduchId:s.id});}
  let r=current;
  if(!continuing){
    const number=Math.max(0,...roundsOf(s).map(x=>Number(x.number)||0))+1;
    r={id:id('round'),shidduchId:s.id,number,ideaId:i.id,suggestedByPersonId:i.suggestedByPersonId||null,shadchanIds:i.suggestedByPersonId?[i.suggestedByPersonId]:[],startedAt:e.at,startedByEntryId:e.id,status:'active',stage:'Waiting for other side',base:{guy:isMe(i.guyId)?'yes':'unknown',girl:'unknown'}};
    data.rounds.push(r);e.changes.push({kind:'round-started',roundId:r.id,number});
  }else if(i.suggestedByPersonId&&!(r.shadchanIds||[]).some(x=>samePerson(x,i.suggestedByPersonId)))r.shadchanIds=[...(r.shadchanIds||[]),i.suggestedByPersonId];
  e.about.push({type:'shidduch',id:s.id},{type:'round',id:r.id},{type:'idea',id:i.id});
  e.text=continuing?`Interested again. Round ${roundNumber(r)} continues.`:`Interested. Round ${roundNumber(r)} started.`;
  i.status='interested';i.closedAt=e.at;i.closedByEntryId=e.id;i.shidduchId=s.id;i.roundId=r.id;
  e.changes.push({kind:'idea-closed',ideaId:i.id,decision:'interested'});
  for(const x of openItems().filter(x=>x.about?.type==='idea'&&x.about.id===i.id))closeItemRecord(x,{entryId:e.id,kind:'done',at:e.at});
  if(i.suggestedByPersonId&&!openForShidduch(s.id,'them').some(x=>samePerson(x.personId,i.suggestedByPersonId)))addOpenItem({direction:'them',personId:i.suggestedByPersonId,about:{type:'shidduch',id:s.id},kind:'other-side',label:'Other side answer',openedByEntryId:e.id});
  await save();closeSheet();ui.detail={type:'shidduch',id:s.id};ui.detailTab='overview';render();
  showToast(continuing?'Shidduch already in progress':'Shidduch started');
  if(!continuing)linkEarlierSheet(i,s,r);
}

// After Interested: offer earlier entries that belong to this pair, each with Yes / No. Only entries that
// involve the guy or the girl, are not private, are not already about another offer or shidduch, and
// involve no other single are offered. When I had my own offer or shidduch with one of them, nothing
// between me and that person is offered: History with Me + Leah is never offered for David – Leah.
function linkEarlierCandidates(i,s){
  const pair=new Set([canonId(i.guyId),canonId(i.girlId)]),mine=me()?.id;
  const singles=new Set(livePeople().filter(p=>p.types?.includes('Guy')||p.types?.includes('Girl')||p.isMe).map(p=>p.id));
  const myOwnWith=new Set([...pair].filter(x=>!isMe(x)&&(shidduchimForPerson(x).some(shidduchIsMine)||ideasForPerson(x).some(o=>isMe(o.guyId)||isMe(o.girlId)))));
  return liveEntries().filter(e=>{
    if(e.private||entryTime(e)>Date.now())return false;
    if((e.about||[]).some(a=>['idea','shidduch','round','date'].includes(a.type)))return false;
    const aboutPeople=entryAbout(e,'person').map(canonId),involved=new Set([...entryPeople(e),...aboutPeople]);
    if(![...involved].some(x=>pair.has(x)))return false;
    if(!pair.has(mine)&&involved.has(mine)&&[...involved].some(x=>myOwnWith.has(x)))return false;
    for(const x of involved){
      if(pair.has(x))continue;
      if(x===mine&&!aboutPeople.includes(mine))continue; // I took part (as the go-between), but it is not about me
      if(singles.has(x))return false;
    }
    return true;
  }).slice(0,20);
}
let linkFlow=null;
function linkEarlierSheet(i,s,r){
  const rows=linkEarlierCandidates(i,s);if(!rows.length)return;
  linkFlow={shidduchId:s.id,roundId:r.id};
  openSheet(`<h2>Link earlier history?</h2><p class="lead">These happened before and involve ${esc(person(i.guyId)?.name)} or ${esc(person(i.girlId)?.name)}. Tick the ones that belong to this shidduch. The words and times stay exactly as they were.</p><div class="sheet-section link-list">${rows.map(e=>`<label class="checkbox-row link-row"><input type="checkbox" name="linkEntry" value="${esc(e.id)}"><span><b>${esc(e.at?fmtDate(e.at):'Date unknown')}</b> ${esc(e.text||entryTitle(e))}</span></label>`).join('')}</div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Skip</button><button class="primary-btn" data-act="link-earlier-save">Link</button></div>`);
}
async function saveLinkedEarlier(){
  const f=linkFlow;linkFlow=null;if(!f)return;
  let n=0;
  for(const box of document.querySelectorAll('input[name="linkEntry"]:checked')){const e=data.entries.find(x=>x.id===box.value);if(e&&addEntryAbout(e,[{type:'shidduch',id:f.shidduchId},{type:'round',id:f.roundId}],'linked after Interested'))n++;}
  if(n)await save();
  closeSheet();render();if(n)showToast(`${n} linked`);
}
