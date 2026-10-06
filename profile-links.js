'use strict';

// Names on a shidduch page open that person's profile; Back from that profile returns to the shidduch.
// Back returns to the shidduch only from the very person opened from it; any other navigation forgets it.
let zmReturnToShidduch=null;

function openPersonFromShidduch(pid){
  const p=person(pid);
  if(!p)return;
  zmReturnToShidduch=ui.detail?.type==='shidduch'?{detail:{...ui.detail},detailTab:ui.detailTab,personId:pid}:null;
  ui.detail={type:'person',id:pid};
  ui.detailTab=p.types?.includes('Shadchan')?'details':'profile';
  render();
  window.scrollTo(0,0);
}

// Runs first for every click. Returns true when the click was Back to the shidduch.
function followShidduchReturn(e){
  if(!zmReturnToShidduch)return false;
  const back=e.target.closest('button[data-act="back"]');
  if(back&&ui.detail?.type==='person'&&ui.detail.id===zmReturnToShidduch.personId){
    ui.detail=zmReturnToShidduch.detail;
    ui.detailTab=zmReturnToShidduch.detailTab;
    zmReturnToShidduch=null;
    render();
    window.scrollTo(0,0);
    return true;
  }
  if(e.target.closest('[data-screen],[data-person],[data-shidduch],[data-source],[data-entry],[data-act="back"]'))zmReturnToShidduch=null;
  return false;
}
