'use strict';

// Compact shidduch header: full names stay readable, arrows point inward,
// and the duplicated initials are removed from the hero.
const shidduchDetailBeforePairHeader=shidduchDetail;
shidduchDetail=function(sid){
  let html=shidduchDetailBeforePairHeader(sid);
  const s=shidduch(sid);if(!s)return html;
  const r=getCurrentRound(s),g=person(s.guyId),gl=person(s.girlId);
  if(!g||!gl)return html;

  const pairHeader=`<div class="detail-head zm-pair-head">
    <div class="zm-pair-appmark"><span class="wordmark">ZivugMatch</span><span class="bh">ב״ה</span></div>
    <div class="zm-pair-head-row">
      <button class="back-btn" data-act="back" aria-label="Back">${icon('back')}</button>
      <div class="zm-pair-title-wrap">
        <div class="zm-pair-title" aria-label="${esc(g.name)} and ${esc(gl.name)}">
          <button type="button" class="zm-pair-name guy" data-zm-person="${esc(g.id)}" aria-label="Open ${esc(g.name)} profile">${esc(g.name)}</button>
          <span class="zm-inward-arrows" aria-hidden="true">→ ←</span>
          <button type="button" class="zm-pair-name girl" data-zm-person="${esc(gl.id)}" aria-label="Open ${esc(gl.name)} profile">${esc(gl.name)}</button>
        </div>
        <div class="detail-meta">Round ${esc(r?.number||1)}</div>
      </div>
      <button class="more-btn" data-act="detail-menu" aria-label="More">⋯</button>
    </div>
  </div>`;

  html=html.replace(/<div class="detail-head">[\s\S]*?<button class="more-btn" data-act="detail-menu">⋯<\/button><\/div>/,pairHeader);
  // The header now identifies both people clearly, so initials below it are redundant.
  html=html.replace(/<div class="pair-people">[\s\S]*?<\/div>/,'');
  return html;
};

if(data)render();
