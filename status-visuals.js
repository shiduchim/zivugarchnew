'use strict';

// Whose turn it is on a shidduch. Kept separate from the stage bar: the bar shows WHERE the shidduch is,
// the turn shows WHO acts next.
function zmTurnForShidduch(s){
  if(!s||s.status==='ended')return s?.status==='ended'?'Ended':'';
  const mine=openForShidduch(s.id,'me');
  if(mine.length)return 'My turn';
  const theirs=openForShidduch(s.id,'them');
  if(theirs.length){
    const p=person(theirs[0].personId);
    return p?`Waiting for ${clarityFirstName(p)}`:'Their turn';
  }
  const r=getCurrentRound(s);
  if(String(r?.girlStatus||'').toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.girlId))}`;
  if(String(r?.guyStatus||'').toLowerCase()==='thinking')return `Waiting for ${clarityFirstName(person(s.guyId))}`;
  return '';
}

if(data)render();
