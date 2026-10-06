'use strict';

// Pinned headers, one owner for both:
// - Person pages: the compact identity bar pins with fixed positioning once its marker reaches the
//   top of the screen (CSS sticky was defeated by older overflow/preview layers). It keeps its exact
//   size, and the marker holds its place so nothing below jumps.
// - Shadchanim: the header pins with CSS sticky; .is-stuck gives it the compact pinned look.
// Synced on scroll (in any scroller, so the listener captures), on resize, and after every render().
let stickyFrame=0;

function alignPinnedBar(bar){
  const page=document.querySelector('.warm-detail-page');
  if(!page)return;
  const pr=page.getBoundingClientRect();
  const pcs=getComputedStyle(page);
  const padLeft=parseFloat(pcs.paddingLeft)||0;
  const padRight=parseFloat(pcs.paddingRight)||0;
  bar.style.setProperty('--zm-fixed-left',`${pr.left+padLeft-2}px`);
  bar.style.setProperty('--zm-fixed-width',`${pr.width-padLeft-padRight+4}px`);
}

function syncProfileBar(){
  const bar=document.querySelector('.zm-profile-identity');
  const marker=document.querySelector('.zm-profile-sticky-sentinel');
  if(!bar||!marker)return;
  // getBoundingClientRect tracks the real viewport even if a nested element is scrolling,
  // so this works in normal phone view, desktop phone-preview and regular web layout.
  if(marker.getBoundingClientRect().top<=0){
    if(!bar.classList.contains('zm-fixed')){
      const r=bar.getBoundingClientRect();
      const mb=parseFloat(getComputedStyle(bar).marginBottom)||0;
      marker.style.setProperty('--zm-hold-height',`${r.height+mb}px`);
      marker.classList.add('zm-hold-space');
      bar.style.setProperty('--zm-fixed-left',`${r.left}px`);
      bar.style.setProperty('--zm-fixed-width',`${r.width}px`);
      bar.classList.add('zm-fixed');
    }
    alignPinnedBar(bar);
  }else if(bar.classList.contains('zm-fixed')){
    bar.classList.remove('zm-fixed');
    marker.classList.remove('zm-hold-space');
    marker.style.removeProperty('--zm-hold-height');
    bar.style.removeProperty('--zm-fixed-left');
    bar.style.removeProperty('--zm-fixed-width');
  }
}

function syncShadchanHead(){
  const head=document.querySelector('.zm-shadchan-sticky-head');
  const marker=document.querySelector('.zm-shadchan-sticky-sentinel');
  if(head&&marker)head.classList.toggle('is-stuck',marker.getBoundingClientRect().top<0);
}

function syncStickyHeaders(){
  stickyFrame=0;
  syncProfileBar();
  syncShadchanHead();
}

function queueStickyHeaders(){
  if(!stickyFrame)stickyFrame=requestAnimationFrame(syncStickyHeaders);
}

document.addEventListener('scroll',queueStickyHeaders,true);
window.addEventListener('resize',queueStickyHeaders);
