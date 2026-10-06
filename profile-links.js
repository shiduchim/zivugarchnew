'use strict';

// Names on a shidduch page open that person's profile; Back from that profile returns to the shidduch.
let zmReturnToShidduch=null;
document.addEventListener('click',function(e){
  const profileLink=e.target.closest('[data-zm-person]');
  if(profileLink){
    e.preventDefault();
    e.stopPropagation();
    const pid=profileLink.dataset.zmPerson;
    if(!person(pid))return;
    zmReturnToShidduch=ui.detail?.type==='shidduch'?{detail:{...ui.detail},detailTab:ui.detailTab,personId:pid}:null;
    const p=person(pid);
    ui.detail={type:'person',id:pid};
    ui.detailTab=p?.types?.includes('Shadchan')?'details':'profile';
    render();
    window.scrollTo(0,0);
    return;
  }

  const back=e.target.closest('button[data-act="back"]');
  // Back returns to the shidduch only from the very person opened from it; any other navigation forgets it.
  if(zmReturnToShidduch&&!(back&&ui.detail?.type==='person'&&ui.detail.id===zmReturnToShidduch.personId)){
    if(e.target.closest('[data-screen],[data-person],[data-shidduch],[data-source],[data-entry],[data-act="back"]'))zmReturnToShidduch=null;
    return;
  }
  if(back&&zmReturnToShidduch){
    e.preventDefault();
    e.stopPropagation();
    ui.detail=zmReturnToShidduch.detail;
    ui.detailTab=zmReturnToShidduch.detailTab;
    zmReturnToShidduch=null;
    render();
    window.scrollTo(0,0);
  }
},true);
