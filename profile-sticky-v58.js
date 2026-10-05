'use strict';

// v58: reliable pinning for the compact person header.
// CSS sticky was being defeated by older overflow/preview layers in some layouts.
// This keeps the same header shape and simply switches it to fixed positioning
// once its original top edge reaches the viewport top.
let zm58Frame=0;
let zm58AnchorY=null;

function zm58ResetAnchor(){
  const bar=document.querySelector('.zm-profile-identity');
  const marker=document.querySelector('.zm-profile-sticky-sentinel');
  if(!bar||!marker){zm58AnchorY=null;return;}

  // Measure in normal flow, never from an already-fixed bar.
  const wasFixed=bar.classList.contains('zm-fixed');
  if(wasFixed){
    bar.classList.remove('zm-fixed');
    marker.classList.remove('zm-hold-space');
  }
  zm58AnchorY=marker.getBoundingClientRect().top + window.scrollY;
  if(wasFixed)zm58Sync();
}

function zm58Sync(){
  zm58Frame=0;
  const bar=document.querySelector('.zm-profile-identity');
  const marker=document.querySelector('.zm-profile-sticky-sentinel');
  if(!bar||!marker){zm58AnchorY=null;return;}
  if(zm58AnchorY==null)zm58AnchorY=marker.getBoundingClientRect().top + window.scrollY;

  const shouldFix=window.scrollY >= zm58AnchorY;
  if(shouldFix){
    if(!bar.classList.contains('zm-fixed')){
      const r=bar.getBoundingClientRect();
      const cs=getComputedStyle(bar);
      const mb=parseFloat(cs.marginBottom)||0;
      marker.style.setProperty('--zm-hold-height',`${r.height+mb}px`);
      marker.classList.add('zm-hold-space');
      bar.style.setProperty('--zm-fixed-left',`${r.left}px`);
      bar.style.setProperty('--zm-fixed-width',`${r.width}px`);
      bar.classList.add('zm-fixed');
    }else{
      // Keep it aligned if desktop centering/layout changes while already fixed.
      const page=document.querySelector('.warm-detail-page');
      if(page){
        const pr=page.getBoundingClientRect();
        const padLeft=parseFloat(getComputedStyle(page).paddingLeft)||0;
        const padRight=parseFloat(getComputedStyle(page).paddingRight)||0;
        const left=pr.left+padLeft-2;
        const width=pr.width-padLeft-padRight+4;
        bar.style.setProperty('--zm-fixed-left',`${left}px`);
        bar.style.setProperty('--zm-fixed-width',`${width}px`);
      }
    }
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
window.addEventListener('resize',()=>{zm58AnchorY=null;zm58Queue();});

// The app re-renders screens in place. Re-measure after each render without touching data.
const zm58Observer=new MutationObserver(()=>{
  zm58AnchorY=null;
  zm58Queue();
});
zm58Observer.observe(document.getElementById('app'),{childList:true,subtree:true});

zm58Queue();
