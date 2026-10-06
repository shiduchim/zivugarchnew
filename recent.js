'use strict';

// Keep the current calm Recent layout, but make its History honor the filter/sort sheet.
function recentScreen(){
  const mine=openItems().filter(x=>x.direction==='me'&&itemIsDue(x)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const them=openItems().filter(x=>x.direction==='them').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  let entries=liveEntries();
  const recentFilter=ui.recentFilter||'all';
  if(recentFilter!=='all')entries=entries.filter(e=>e.type===recentFilter);
  entries.sort((a,b)=>(ui.recentSort||'newest')==='oldest'?entryTime(a)-entryTime(b):entryTime(b)-entryTime(a));
  let people=[],others=[];
  if(ui.search){
    const q=ui.search.toLowerCase();
    entries=entries.filter(e=>(e.text+' '+linkedAbout(e)+' '+(e.personIds||[]).map(pid=>person(pid)?.name).join(' ')).toLowerCase().includes(q));
    people=searchPeople(q);
  }else if(data.settings.mode==='single'&&!ui.showOthers){
    // Single mode: other people's shidduchim are one quiet line (they are all there in Shadchan mode).
    others=entries.filter(aboutOthersShidduch);entries=entries.filter(e=>!aboutOthersShidduch(e));
  }
  const othersLine=others.length?`<button class="quiet-line" data-act="show-others">${others.length} more in Shadchan mode</button>`:ui.showOthers&&data.settings.mode==='single'&&!ui.search?`<button class="quiet-line" data-act="show-others">Hide other people's shidduchim</button>`:'';
  const peopleHtml=people.length?`<div class="warm-section-title"><h2>People</h2></div><div class="warm-stack">${people.map(p=>personRow(p)).join('')}</div>`:'';

  const todoTop=mine.slice(0,3),todoMore=Math.max(0,mine.length-todoTop.length);
  const todo=todoTop.length
    ?`<div class="next-list">${todoTop.map(zmTodoCard).join('')}</div>${todoMore?`<button class="see-all-next" data-act="show-wait-me">See all ${mine.length}</button>`:''}`
    :`<div class="all-clear zm-home-clear">${icon('check')}<div><strong>${them.length?'Nothing to do right now':'All caught up'}</strong></div></div>`;

  return `${header('Recent','',{add:true})}
    ${searchBox('Find anyone or anything…')}
    ${peopleHtml}
    ${toFileRow()}
    <div class="warm-section-title zm-home-section-title"><h2>My to-do list</h2></div>
    ${todo}
    ${zmHearBackSummary(them)}
    <div class="warm-section-title earlier-title"><h2>History</h2><button data-act="add-activity">Add note</button></div>
    ${othersLine}
    ${activityFeed(entries)}`;
}

// Search finds everyone (any role, and parents, friends and references too), not only History.
// In Single mode my own circle comes first: my shadchanim and the girls who apply to me.
function searchPeople(q){
  const single=data.settings.mode==='single';
  const rank=p=>single&&(p.types?.includes('Shadchan')||zmGirlAppliesToMe(p))?0:1;
  return livePeople().filter(p=>!p.isMe&&personMatchesSearch(p,q)).sort((a,b)=>(rank(a)-rank(b))||byRecentContact(a,b)).slice(0,8);
}
// An entry about someone else's offer or shidduch (one that is not mine).
function aboutOthersShidduch(e){
  for(const a of e.about||[]){
    if(a.type==='idea'){const i=idea(a.id);if(i&&!isMe(i.guyId)&&!isMe(i.girlId))return true;continue;}
    const sid=a.type==='shidduch'?a.id:a.type==='round'?round(a.id)?.shidduchId:a.type==='date'?(dateById(a.id)?.shidduchId||round(dateById(a.id)?.roundId)?.shidduchId):null;
    const s=sid&&shidduch(sid);if(s&&!shidduchIsMine(s))return true;
  }
  return false;
}

// The Recent filter sheet changes only how History is shown; the sheet stays open.
function setRecentView(b){
  if('recentFilter' in b.dataset)ui.recentFilter=b.dataset.recentFilter||'all';
  if('recentSort' in b.dataset)ui.recentSort=b.dataset.recentSort||'newest';
  render();
  filtersSheet();
}
