'use strict';

// Use the same inward-facing pair symbol everywhere a shidduch is named.
// Left person points toward the center; right person points toward the center.
shidduchTitle=function(s){
  const g=person(s?.guyId),gl=person(s?.girlId);
  return `${g?.name||'Guy'} → ← ${gl?.name||'Girl'}`;
};

// Offers use the same visual language instead of the old two-headed arrow.
if(typeof zmOfferRow==='function'){
  zmOfferRow=function(i){
    const g=person(i.guyId),gl=person(i.girlId),sug=person(i.suggestedByPersonId);
    return `<button class="warm-match-row zm-offer-row" data-idea="${i.id}"><div class="warm-match-avatar">♡</div><div class="warm-match-main"><div><strong>${esc(g?.name)} → ← ${esc(gl?.name)}</strong><time>${esc(fmtDay(i.createdAt))}</time></div><p>${sug?`Offered by ${esc(sug.name)}`:'New offer'}</p></div><div class="warm-chevron">›</div></button>`;
  };
}

if(data)render();
