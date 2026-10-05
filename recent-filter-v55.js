'use strict';

// v55: Recent's filter/sort button should control Recent, never open Settings.
const zmFiltersSheetBeforeV55=filtersSheet;
filtersSheet=function(){
  if(ui.screen!=='recent')return zmFiltersSheetBeforeV55();
  const filter=ui.recentFilter||'all';
  const sort=ui.recentSort||'newest';
  const filterButton=(value,label)=>`<button class="option ${filter===value?'active':''}" data-recent-filter="${value}">${label}</button>`;
  const sortButton=(value,label)=>`<button class="option ${sort===value?'active':''}" data-recent-sort="${value}">${label}</button>`;
  openSheet(`<h2>Recent view</h2>
    <p class="lead">These choices affect History only. Your to-do list and To hear back stay unchanged.</p>
    <div class="sheet-section">
      <div class="setting-row">
        <div class="setting-copy"><b>Sort History</b><span>Choose which activity appears first</span></div>
        <div class="option-group">${sortButton('newest','Newest')}${sortButton('oldest','Oldest')}</div>
      </div>
      <div class="setting-row">
        <div class="setting-copy"><b>Show</b><span>Filter the History feed</span></div>
        <div class="option-group">${filterButton('all','All')}${filterButton('call','Calls')}${filterButton('message','Messages')}${filterButton('profile','Profiles')}${filterButton('date','Dates')}${filterButton('note','Notes')}</div>
      </div>
    </div>
    <button class="primary-btn full" data-act="close-sheet">Done</button>`);
};

// Keep the current calm Recent layout, but make its History honor the filter/sort sheet.
recentScreen=function(){
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
};

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

if(data)render();
