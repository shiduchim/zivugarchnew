'use strict';

// Keep the current calm Recent layout, but make its History honor the filter/sort sheet.
function recentScreen(){
  const mine=data.openItems.filter(x=>x.status==='open'&&x.direction==='me').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const them=data.openItems.filter(x=>x.status==='open'&&x.direction==='them').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  let entries=[...data.entries];
  const recentFilter=ui.recentFilter||'all';
  if(recentFilter!=='all')entries=entries.filter(e=>e.type===recentFilter);
  entries.sort((a,b)=>(ui.recentSort||'newest')==='oldest'?new Date(a.at)-new Date(b.at):new Date(b.at)-new Date(a.at));
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
    <div class="warm-section-title zm-home-section-title"><h2>My to-do list</h2></div>
    ${todo}
    ${zmHearBackSummary(them)}
    <div class="warm-section-title earlier-title"><h2>History</h2><button data-act="add-activity">Add note</button></div>
    ${activityFeed(entries)}`;
}

// Handle the Recent sheet before the older generic click handler sees these buttons.
document.addEventListener('click',function(e){
  const filterButton=e.target.closest('button[data-recent-filter]');
  const sortButton=e.target.closest('button[data-recent-sort]');
  if(!filterButton&&!sortButton)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if(filterButton)ui.recentFilter=filterButton.dataset.recentFilter||'all';
  if(sortButton)ui.recentSort=sortButton.dataset.recentSort||'newest';
  render();
  filtersSheet();
},true);
