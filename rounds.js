'use strict';

// A shidduch's rounds, answers and dates. One pair has one shidduch forever; each attempt is a round.
// Every change is a ledger entry about the round or the date, so the page, the stage bar, Recent and both
// people's History all read the same record. A date keeps one permanent id through every change.

const ANSWERS=[['yes','Yes'],['thinking','Thinking'],['no','No']];
const FEEDBACK=[['positive','Positive'],['thinking','Thinking'],['negative','Negative']];

// The round's stage label: a recorded stage change (Engaged), otherwise the label it started with.
function roundStageLabel(r){const e=changesAbout('round',r?.id).find(x=>x.changes?.some(c=>c.kind==='stage'));return e?e.changes.find(c=>c.kind==='stage').value:(r?.stage||'');}
function sideName(s,side){const p=person(side==='guy'?s.guyId:s.girlId);return p?.isMe?'My':`${p?.name||(side==='guy'?'Guy':'Girl')}'s`;}
function answerSource(r,side){const e=answerEntry(r,side);const from=e?.fromPersonId&&person(e.fromPersonId);return from&&!from.isMe?`via ${clarityFirstName(from)}`:'';}

// ---- Answers -------------------------------------------------------------------------------------
let answerFlow=null;
function answerSheet(sid,side){
  const s=shidduch(sid),r=currentRound(s);if(!s||!r||r.status==='ended')return;
  answerFlow={shidduchId:s.id,roundId:r.id,side};
  const current=String(roundAnswer(r,side)).toLowerCase();
  const tellers=[...new Set([...(r.shadchanIds||[]).map(canonId),canonId(side==='guy'?s.guyId:s.girlId)])].map(person).filter(p=>p&&!p.isMe);
  const items=openForShidduch(s.id,'them');
  openSheet(`<h2>${esc(sideName(s,side))} answer</h2><p class="lead">${esc(shidduchTitle(s))} · Round ${roundNumber(r)}</p>${answerSourceLine(r,side)}
    <div class="option-group answer-options">${ANSWERS.map(([v,l])=>`<button class="option ${current===v?'active':''}" data-answer-value="${v}">${l}</button>`).join('')}</div>
    <div class="form-grid"><div class="field"><label>Who told you? <span style="font-weight:400">(optional)</span></label><select id="answerFrom"><option value="">Nobody / I decided</option>${tellers.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Their words <span style="font-weight:400">(optional)</span></label><textarea id="answerNote"></textarea></div></div>
    ${items.length?`<div class="sheet-section answer-closes"><div class="setting-copy" style="padding:8px 12px 0"><b>Does this answer one of these?</b></div>${items.map(x=>`<label class="checkbox-row"><input type="checkbox" name="answerCloses" value="${esc(x.id)}"> ${esc(x.label)} · ${esc(person(x.personId)?.name||'')}</label>`).join('')}</div>`:''}
    <input type="hidden" id="answerValue" value="${esc(current)}">
    <div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-answer">Save</button></div>`);
}
// Every status shows where it came from: the entry that said it, one tap away.
function answerSourceLine(r,side){
  const word=ANSWERS.find(([v])=>v===String(roundAnswer(r,side)).toLowerCase())?.[1];if(!word)return '';
  const e=answerEntry(r,side),from=e?.fromPersonId&&person(e.fromPersonId);
  return e?`<div class="answer-source"><span>Now: <b>${esc(word)}</b> · ${from&&!from.isMe?`from ${esc(from.name)} · `:''}${esc(e.at?fmtDate(e.at):'date unknown')}</span><button data-act="open-entry" data-entry-id="${esc(e.id)}">Open</button></div>`:`<div class="answer-source"><span>Now: <b>${esc(word)}</b> · saved before ${esc(APP_VERSION_LABEL)}, with no message linked</span></div>`;
}
function pickAnswer(v){const input=document.getElementById('answerValue');if(input)input.value=v;document.querySelectorAll('[data-answer-value]').forEach(b=>b.classList.toggle('active',b.dataset.answerValue===v));}
async function saveAnswer(){
  const f=answerFlow;if(!f)return;
  const value=document.getElementById('answerValue')?.value;if(!ANSWERS.some(([v])=>v===value)){showToast('Choose Yes, Thinking or No');return;}
  const s=shidduch(f.shidduchId),r=round(f.roundId);if(!s||!r)return;
  const from=document.getElementById('answerFrom')?.value||null,note=document.getElementById('answerNote')?.value.trim()||'';
  const word=ANSWERS.find(([v])=>v===value)[1];
  const e=addEntry({type:'status',channel:from?'Message':'App',direction:from?'in':'none',fromPersonId:from,toPersonId:from?me().id:null,personIds:[s.guyId,s.girlId,from],about:[{type:'shidduch',id:s.id},{type:'round',id:r.id}],text:note||`${sideName(s,f.side)} answer: ${word}.`,result:`${sideName(s,f.side)} answer: ${word}`,changes:[{kind:'answer',roundId:r.id,side:f.side,value}]});
  for(const box of document.querySelectorAll('input[name="answerCloses"]:checked')){const x=openItem(box.value);if(x?.status==='open'){closeItemRecord(x,{entryId:e.id,kind:'heard-back',at:e.at});e.changes.push({kind:'item-closed',itemId:x.id,closeKind:'heard-back'});}}
  // My own side decided (not heard from someone): the go-between still has to be told. One such item at
  // a time; a newer decision replaces the older one.
  const goBetween=(r.shadchanIds||[]).map(person).find(p=>p&&!p.isMe);
  if(!from&&isMe(f.side==='guy'?s.guyId:s.girlId)&&goBetween){
    for(const x of openForShidduch(s.id,'me').filter(x=>x.kind==='tell-decision')){closeItemRecord(x,{entryId:e.id,kind:'not-needed',at:e.at});e.changes.push({kind:'item-closed',itemId:x.id,closeKind:'not-needed'});}
    const x=addOpenItem({direction:'me',personId:goBetween.id,about:{type:'shidduch',id:s.id},kind:'tell-decision',label:`Tell ${goBetween.name}: my answer is ${word}`,openedByEntryId:e.id});
    e.changes.push({kind:'item-opened',itemId:x.id});
  }
  answerFlow=null;await save();closeSheet();render();showToast('Answer saved');
}

// Engaged: the stage moves to Marriage (recorded, so it shows where it came from).
async function markEngaged(sid){
  const s=shidduch(sid),r=currentRound(s);if(!s||!r||r.status==='ended')return;
  addEntry({type:'status',personIds:[s.guyId,s.girlId],about:[{type:'shidduch',id:s.id},{type:'round',id:r.id}],text:'Engaged. Mazal tov!',result:'Marriage',changes:[{kind:'stage',roundId:r.id,value:'Marriage'}]});
  await save();closeSheet();render();showToast('Mazal tov!');
}

// ---- Dates -----------------------------------------------------------------------------------------
function dateLocalValue(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
function dateStatusWord(st){return st.status==='happened'?'Happened':st.status==='cancelled'?'Cancelled':st.when?'Planned':'Not set yet';}
function dateFeedbackItems(d){return openItems().filter(x=>x.kind==='date-feedback'&&x.about?.type==='date'&&x.about.id===d.id);}

function addDateSheet(sid){
  const s=shidduch(sid),r=currentRound(s);if(!s||!r||r.status==='ended')return;
  const n=Math.max(0,...roundDates(r,{withCancelled:true}).map(d=>Number(d.number)||0))+1;
  openSheet(`<h2>Date ${n}</h2><p class="lead">${esc(shidduchTitle(s))}. This date keeps one record from now on: moving it or adding feedback updates the same date.</p><div class="field"><label>When <span style="font-weight:400">(optional)</span></label><input id="dateWhen" type="datetime-local"></div><input type="hidden" id="dateShidduch" value="${esc(s.id)}"><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="save-new-date">Save</button></div>`);
}
async function saveNewDate(){
  const s=shidduch(document.getElementById('dateShidduch')?.value),r=currentRound(s);if(!s||!r)return;
  const raw=document.getElementById('dateWhen')?.value,when=raw?new Date(raw).toISOString():null;
  const n=Math.max(0,...roundDates(r,{withCancelled:true}).map(d=>Number(d.number)||0))+1;
  const d={id:id('date'),shidduchId:s.id,roundId:r.id,number:n,createdAt:iso(),base:{}};
  data.dates.push(d);
  const e=addEntry({type:'date',personIds:[s.guyId,s.girlId],about:[{type:'date',id:d.id},{type:'round',id:r.id},{type:'shidduch',id:s.id}],text:when?`Date ${n} set for ${fmtDate(when)} ${fmtTime(when)}.`:`Date ${n} added.`,changes:[{kind:'date-set',dateId:d.id,to:when}]});
  d.createdByEntryId=e.id;
  await save();closeSheet();ui.detail={type:'shidduch',id:s.id};ui.detailTab='dates';render();showToast(`Date ${n} saved`);
}
function dateSheet(did){
  const d=dateById(did);if(!d)return;
  const s=shidduch(d.shidduchId||round(d.roundId)?.shidduchId),st=dateState(d);if(!s)return;
  const ended=round(d.roundId)?.status==='ended';
  const fb=side=>`<div class="field"><label>${esc(sideName(s,side))} feedback</label><select id="dateFb_${side}"><option value="">—</option>${FEEDBACK.map(([v,l])=>`<option value="${v}" ${String(st[side]).toLowerCase()===v?'selected':''}>${l}</option>`).join('')}</select></div>`;
  const history=st.history.slice().reverse().map(e=>`<div class="date-history-row"><b>${esc(e.at?`${fmtDate(e.at)} ${fmtTime(e.at)}`:'Date unknown')}</b> ${esc(e.text)}</div>`).join('');
  openSheet(`<h2>Date ${esc(d.number)}</h2><p class="lead">${esc(shidduchTitle(s))} · ${esc(dateStatusWord(st))}${st.when?` · ${esc(fmtDate(st.when))} ${esc(fmtTime(st.when))}`:''}</p>
    <input type="hidden" id="dateId" value="${esc(d.id)}">
    ${ended?'':`<div class="form-grid"><div class="field"><label>When</label><input id="dateWhen" type="datetime-local" value="${esc(dateLocalValue(st.when))}"></div></div>
    <div class="date-actions">${st.status!=='happened'?`<button class="ghost-btn" data-act="date-move">Save time</button>`:''}${st.status!=='happened'&&st.status!=='cancelled'?`<button class="ghost-btn" data-act="date-cancelled">Cancelled</button><button class="primary-btn" data-act="date-happened">It happened</button>`:''}</div>`}
    ${st.status==='happened'?`<div class="form-grid">${fb('guy')}${fb('girl')}<div class="field"><label>Their words <span style="font-weight:400">(optional)</span></label><textarea id="dateFbNote"></textarea></div></div><button class="primary-btn full" data-act="date-feedback">Save feedback</button>`:''}
    ${history?`<div class="date-history"><div class="settings-heading">This date's history</div>${history}</div>`:''}
    <button class="ghost-btn full" data-act="close-sheet" style="margin-top:10px">Close</button>`);
}
function dateEntry(d,spec){const s=shidduch(d.shidduchId||round(d.roundId)?.shidduchId);return addEntry({type:'date',personIds:[s?.guyId,s?.girlId,spec.fromPersonId],about:[{type:'date',id:d.id},{type:'round',id:d.roundId},{type:'shidduch',id:s?.id}],...spec});}
async function moveDate(){
  const d=dateById(document.getElementById('dateId')?.value);if(!d)return;
  const st=dateState(d),raw=document.getElementById('dateWhen')?.value,when=raw?new Date(raw).toISOString():null;
  if(!when||when===st.when){closeSheet();return;}
  dateEntry(d,{text:st.when?`Date ${d.number} moved to ${fmtDate(when)} ${fmtTime(when)}.`:`Date ${d.number} set for ${fmtDate(when)} ${fmtTime(when)}.`,changes:[{kind:st.when?'date-moved':'date-set',dateId:d.id,from:st.when,to:when}]});
  await save();closeSheet();render();showToast('Date saved');
}
async function markDateCancelled(){const d=dateById(document.getElementById('dateId')?.value);if(!d)return;dateEntry(d,{text:`Date ${d.number} cancelled.`,changes:[{kind:'date-cancelled',dateId:d.id}]});await save();closeSheet();render();showToast('Date cancelled');}
// It happened: feedback is now owed. On my own shidduch, mine goes to the go-between and the other side's
// comes back through them; otherwise each side's feedback is to hear back.
async function markDateHappened(){
  const d=dateById(document.getElementById('dateId')?.value);if(!d)return;
  const s=shidduch(d.shidduchId||round(d.roundId)?.shidduchId),r=round(d.roundId);if(!s)return;
  const e=dateEntry(d,{text:`Date ${d.number} happened.`,changes:[{kind:'date-happened',dateId:d.id}]});
  const goBetween=(r?.shadchanIds||[])[0]||null,about={type:'date',id:d.id};
  if(shidduchIsMine(s)){
    const mySide=isMe(s.guyId)?'guy':'girl',other=mySide==='guy'?'girl':'guy';
    addOpenItem({direction:'me',personId:goBetween||(other==='guy'?s.guyId:s.girlId),about,kind:'date-feedback',side:mySide,label:`My feedback for Date ${d.number}`,openedByEntryId:e.id});
    addOpenItem({direction:'them',personId:goBetween||(other==='guy'?s.guyId:s.girlId),about,kind:'date-feedback',side:other,label:`Their feedback for Date ${d.number}`,openedByEntryId:e.id});
  }else for(const side of ['guy','girl'])addOpenItem({direction:'them',personId:sideContact(s,side),about,kind:'date-feedback',side,label:`${sideName(s,side)} feedback for Date ${d.number}`,openedByEntryId:e.id});
  await save();render();dateSheet(d.id);showToast('Saved');
}
// Who to hear from for one side of someone else's shidduch: that side's contact (a parent, a contact or
// their shadchan, from the single's links), and only when there is none, the single.
function sideContact(s,side){const single=side==='guy'?s.guyId:s.girlId;const l=linksOf(single).find(x=>['contact','mother','father','shadchan'].includes(x.kind));return l?.aId||single;}
// Feedback for this date and this side closes exactly that date's feedback item for that side.
async function saveDateFeedback(){
  const d=dateById(document.getElementById('dateId')?.value);if(!d)return;
  const s=shidduch(d.shidduchId||round(d.roundId)?.shidduchId),st=dateState(d),note=document.getElementById('dateFbNote')?.value.trim()||'';
  let saved=0;
  for(const side of ['guy','girl']){
    const v=document.getElementById(`dateFb_${side}`)?.value||'';
    if(!v||v===String(st[side]).toLowerCase())continue;
    const word=FEEDBACK.find(([x])=>x===v)[1];
    const e=dateEntry(d,{text:note||`${sideName(s,side)} feedback for Date ${d.number}: ${word}.`,result:`${sideName(s,side)} feedback: ${word}`,changes:[{kind:'date-feedback',dateId:d.id,side,value:v}]});
    for(const x of dateFeedbackItems(d).filter(x=>x.side===side)){closeItemRecord(x,{entryId:e.id,kind:x.direction==='them'?'heard-back':'done',at:e.at});e.changes.push({kind:'item-closed',itemId:x.id});}
    saved++;
  }
  if(!saved){closeSheet();return;}
  await save();closeSheet();render();showToast('Feedback saved');
}

// ---- Rounds on the shidduch page ---------------------------------------------------------------------
// The current round's history first; earlier rounds stay below, folded, each with its own history.
function roundSummary(r){const n=roundDates(r,{withCancelled:false}).length;return [`Round ${roundNumber(r)}`,r.startedAt?fmtDate(r.startedAt):'',`${n} date${n===1?'':'s'}`,r.status==='ended'?`ended at ${r.endedStage||ZM_FLOW_STAGE_LABELS[r.endedStageIndex]||'—'}`:''].filter(Boolean).join(' · ');}
function shidduchHistory(s){
  const rs=roundsOf(s);
  if(rs.length<2)return timelineHtml(entriesForShidduch(s.id));
  const current=rs[rs.length-1],earlier=rs.slice(0,-1).reverse();
  const open=ui.openRounds||(ui.openRounds=new Set());
  return `${timelineHtml(entriesForShidduch(s.id,{roundId:current.id}))}<div class="earlier-rounds"><div class="warm-section-title"><h2>Earlier rounds</h2></div>${earlier.map(r=>`<button class="earlier-round" data-act="toggle-round" data-round-id="${esc(r.id)}"><span>${esc(roundSummary(r))}</span><b>${open.has(r.id)?'−':'+'}</b></button>${open.has(r.id)?timelineHtml(entriesForShidduch(s.id,{roundId:r.id})):''}`).join('')}</div>`;
}
function toggleRound(rid){const open=ui.openRounds||(ui.openRounds=new Set());if(open.has(rid))open.delete(rid);else open.add(rid);render();}

// ---- Pause, resume, and undo of a pause or an ending -------------------------------------------------
// Pausing is an entry about the round; the round is paused while its newest pause/resume entry is a
// pause. A pause (like an ending) closes the shidduch's open items, each pointing to that entry, and Undo
// reopens exactly those items and removes the entry.
function pauseEntry(r){const e=changesAbout('round',r?.id).find(x=>x.changes?.some(c=>c.kind==='round-paused'||c.kind==='round-resumed'));return e?.changes.some(c=>c.kind==='round-paused')?e:null;}
function shPaused(s){const r=currentRound(s);return !!r&&r.status!=='ended'&&!!pauseEntry(r);}
function pauseSheet(sid){
  const s=shidduch(sid);if(!s||shStatus(s)==='ended'||shPaused(s))return;
  const n=openForShidduch(s.id).length;
  openSheet(`<h2>Pause shidduch</h2><p class="lead">${esc(shidduchTitle(s))} stays in progress, marked Paused. ${n?`Its ${n} open item${n===1?'':'s'} close${n===1?'s':''}.`:'It has no open items.'} You can resume it any time.</p><input type="hidden" id="pauseShidduchId" value="${esc(s.id)}"><div class="field"><label>Why? <span style="font-weight:400">(optional, private)</span></label><textarea id="pauseReason"></textarea></div><div class="split-actions"><button class="ghost-btn" data-act="close-sheet">Cancel</button><button class="primary-btn" data-act="confirm-pause">Pause</button></div>`);
}
async function confirmPause(){
  const s=shidduch(document.getElementById('pauseShidduchId')?.value),r=currentRound(s);if(!s||!r||r.status==='ended'||shPaused(s))return;
  const reason=document.getElementById('pauseReason')?.value.trim()||'';
  const e=addEntry({type:'status',personIds:[s.guyId,s.girlId],about:[{type:'shidduch',id:s.id},{type:'round',id:r.id}],text:`Shidduch paused.${reason?` ${reason}`:''}`,result:'Paused',changes:[{kind:'round-paused',roundId:r.id}],private:reason?true:undefined});
  for(const x of openForShidduch(s.id)){closeItemRecord(x,{entryId:e.id,kind:'auto',at:e.at});e.changes.push({kind:'item-closed',itemId:x.id});}
  await save();closeSheet();render();showActionToast('Paused',{act:'undo-pause',entryId:e.id});
}
async function resumeShidduch(sid){
  const s=shidduch(sid),r=currentRound(s);if(!s||!r||!shPaused(s))return;
  addEntry({type:'status',personIds:[s.guyId,s.girlId],about:[{type:'shidduch',id:s.id},{type:'round',id:r.id}],text:'Shidduch resumed.',result:'Resumed',changes:[{kind:'round-resumed',roundId:r.id}]});
  await save();closeSheet();render();showToast('Resumed');
}
// Undo of a pause or an ending: the items it closed open again, the round is as it was, the entry goes.
function reopenItemsClosedBy(eid){for(const x of data.openItems)if(x.closedByEntryId===eid&&x.status==='closed'){x.status='open';delete x.closedAt;delete x.closedByEntryId;delete x.closeKind;}}
async function undoPause(eid){
  const e=data.entries.find(x=>x.id===eid);if(!e?.changes?.some(c=>c.kind==='round-paused'))return;
  reopenItemsClosedBy(eid);data.entries=data.entries.filter(x=>x.id!==eid);
  await save();render();showToast('Not paused');
}
async function undoEnd(eid){
  const e=data.entries.find(x=>x.id===eid),c=e?.changes?.find(x=>x.kind==='round-ended');if(!c)return;
  const r=round(c.roundId);if(!r||r.endedByEntryId!==eid)return;
  for(const k of ['status','endedAt','endedByEntryId','endedStage','endedStageIndex','endReason']){if(c.before&&c.before[k]!==undefined)r[k]=c.before[k];else delete r[k];}
  if(!r.status)r.status='active';
  reopenItemsClosedBy(eid);data.entries=data.entries.filter(x=>x.id!==eid);
  await save();ui.detail={type:'shidduch',id:shidduch(r.shidduchId)?.id||r.shidduchId};ui.detailTab='overview';render();showToast('Back in progress');
}
