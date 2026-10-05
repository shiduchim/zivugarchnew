'use strict';

// Pair names no longer use arrow symbols. Compact list/sheet titles use a simple dash.
shidduchTitle=function(s){
  const g=person(s?.guyId),gl=person(s?.girlId);
  return `${g?.name||'Guy'} – ${gl?.name||'Girl'}`;
};

if(typeof zmOfferRow==='function'){
  zmOfferRow=function(i){
    const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
    return `<button class="warm-match-row zm-offer-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} – ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>${sug?`Offered by ${esc(sug.name)}`:'New offer'}</p></div><div class="warm-chevron">›</div></button>`;
  };
}

// Keep the offer sheet consistent too.
if(typeof ideaSheet==='function'){
  ideaSheet=function(iid){
    const i=idea(iid);if(!i)return;
    const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
    openSheet(`<h2>${esc(g?.name)} – ${esc(gl?.name)}</h2><p class="lead">Offer · suggested by ${esc(sug?.name||'you')} · ${esc(fmtDate(i.createdAt))}. An offer is not yet a shidduch.</p><div class="profile-card"><h3>${esc(gl?.name||'Profile')}</h3><div class="profile-text">${esc(gl?.profileText||'No profile text saved.')}</div></div><div class="split-actions"><button class="ghost-btn" data-act="idea-no" data-idea-id="${i.id}">Not applicable</button><button class="primary-btn" data-act="idea-yes" data-idea-id="${i.id}">Interested</button></div>`);
  };
}

if(data)render();
