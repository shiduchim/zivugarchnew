'use strict';

// v58: reliable pinning for the compact person header.
// CSS sticky was being defeated by older overflow/preview layers in some layouts.
// This fallback watches the header's original marker and switches the bar to fixed
// positioning only when that marker reaches the viewport top.
let zm58Frame=0;

function zm58AlignFixed(bar){
  const page=document.querySelector('.warm-detail-page');
  if(!page)return;
  const pr=page.getBoundingClientRect();
  const pcs=getComputedStyle(page);
  const padLeft=parseFloat(pcs.paddingLeft)||0;
  const padRight=parseFloat(pcs.paddingRight)||0;
  const left=pr.left+padLeft-2;
  const width=pr.width-padLeft-padRight+4;
  bar.style.setProperty('--zm-fixed-left',`${left}px`);
  bar.style.setProperty('--zm-fixed-width',`${width}px`);
}

function zm58Sync(){
  zm58Frame=0;
  const bar=document.querySelector('.zm-profile-identity');
  const marker=document.querySelector('.zm-profile-sticky-sentinel');
  if(!bar||!marker)return;

  // getBoundingClientRect tracks the real viewport even if a nested element is scrolling,
  // so this works in normal phone view, desktop phone-preview and regular web layout.
  const shouldFix=marker.getBoundingClientRect().top<=0;

  if(shouldFix){
    if(!bar.classList.contains('zm-fixed')){
      const r=bar.getBoundingClientRect();
      const mb=parseFloat(getComputedStyle(bar).marginBottom)||0;
      marker.style.setProperty('--zm-hold-height',`${r.height+mb}px`);
      marker.classList.add('zm-hold-space');
      bar.style.setProperty('--zm-fixed-left',`${r.left}px`);
      bar.style.setProperty('--zm-fixed-width',`${r.width}px`);
      bar.classList.add('zm-fixed');
    }
    zm58AlignFixed(bar);
  }else if(bar.classList.contains('zm-fixed')){
    bar.classList.remove('zm-fixed');
    marker.classList.remove('zm-hold-space');
    marker.style.removeProperty('--zm-hold-height');
    bar.style.removeProperty('--zm-fixed-left');
    bar.style.removeProperty('--zm-fixed-width');
  }
}

function zm58Queue(){
  if(zm58Frame)return;
  zm58Frame=requestAnimationFrame(zm58Sync);
}

document.addEventListener('scroll',zm58Queue,true);
window.addEventListener('scroll',zm58Queue,{passive:true});
window.addEventListener('resize',zm58Queue);

// The app swaps screens by re-rendering #app. Re-check whenever that happens.
const zm58Observer=new MutationObserver(zm58Queue);
zm58Observer.observe(document.getElementById('app'),{childList:true,subtree:true});

zm58Queue();
