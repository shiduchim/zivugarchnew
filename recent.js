'use strict';

// Keep the current calm Recent layout, but make its History honor the filter/sort sheet.
function recentScreen(){
  const mine=openItems().filter(x=>x.direction==='me'&&itemIsDue(x)).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const them=openItems().filter(x=>x.direction==='them').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  let entries=liveEntries();
  const recentFilter=ui.recentFilter||'all';
  if(recentFilter!=='all')entries=entries.filter(e=>e.type===recentFilter);
  entries.sort((a,b)=>(ui.recentSort||'newest')==='oldest'?entryTime(a)-entryTime(b):entryTime(b)-entryTime(a));
  if(ui.search){
    const q=ui.search.toLowerCase();
    entries=entries.filter(e=>(e.text+' '+linkedAbout(e)+' '+(e.personIds||[]).map(pid=>person(pid)?.name).join(' ')).toLowerCase().includes(q));
  }

  const todoTop=mine.slice(0,3),todoMore=Math.max(0,mine.length-todoTop.length);
  const todo=todoTop.length
    ?`<div class="next-list">${todoTop.map(zmTodoCard).join('')}</div>${todoMore?`<button class="see-all-next" data-act="show-wait-me">See all ${mine.length}</button>`:''}`
    :`<div class="all-clear zm-home-clear">${icon('check')}<div><strong>${them.length?'Nothing to do right now':'All caught up'}</strong></div></div>`;

  return `${header('Recent','',{add:true})}
    ${searchBox('Find anyone or anything…')}
    ${toFileRow()}
    <div class="warm-section-title zm-home-section-title"><h2>My to-do list</h2></div>
    ${todo}
    ${zmHearBackSummary(them)}
    <div class="warm-section-title earlier-title"><h2>History</h2><button data-act="add-activity">Add note</button></div>
    ${activityFeed(entries)}`;
}

// The Recent filter sheet changes only how History is shown; the sheet stays open.
function setRecentView(b){
  if('recentFilter' in b.dataset)ui.recentFilter=b.dataset.recentFilter||'all';
  if('recentSort' in b.dataset)ui.recentSort=b.dataset.recentSort||'newest';
  render();
  filtersSheet();
}
