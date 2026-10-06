'use strict';

function detailHeader(title,sub){return `<div class="detail-shell"><div class="detail-head"><button class="back-btn" data-act="back">${icon('back')}</button><div class="title-wrap"><div class="app-mark"><div class="wordmark">ZivugMatch</div><div class="bh">ב״ה</div></div><h1 class="detail-name">${esc(title)}</h1><div class="detail-meta">${esc(sub||'')}</div></div><button class="more-btn" data-act="detail-menu">⋯</button></div>`;}

function render(){applySettings();let body;if(ui.detail?.type==='person')body=personDetail(ui.detail.id);else if(ui.detail?.type==='shidduch')body=shidduchDetail(ui.detail.id);else if(ui.detail?.type==='source')body=sourceDetail(ui.detail.id);else if(ui.detail?.type==='entry')body=entryDetail(ui.detail.id);else if(ui.screen==='recent')body=recentScreen();else if(ui.screen==='guys')body=peopleScreen('Guy');else if(ui.screen==='girls')body=peopleScreen('Girl');else if(ui.screen==='shadchanim')body=shadchanScreen();else body=shidduchimScreen();app.innerHTML=`<main class="page">${body}</main>${nav()}`;queueStickyHeaders();}

function showToast(msg){toastEl.textContent=msg;toastEl.classList.remove('has-action');toastEl.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toastEl.classList.remove('show'),2200);}
function showUndoToast(msg,copyId){if(!copyId)return showToast(msg);showActionToast(msg,{act:'undo-safety',copyId});}
function showActionToast(msg,attrs,label='Undo'){toastEl.innerHTML=`<span>${esc(msg)}</span><button ${Object.entries(attrs).map(([k,v])=>`data-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}="${esc(v)}"`).join(' ')}>${esc(label)}</button>`;toastEl.classList.add('show','has-action');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toastEl.classList.remove('show','has-action'),8000);}
function openSheet(html){overlay.innerHTML=`<div class="scrim"><div class="sheet"><div class="sheet-handle"></div>${html}</div></div>`;}
function closeSheet(){overlay.innerHTML='';}
