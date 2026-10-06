'use strict';

// Identity: one real person = one Person record. This file owns the one matching check that every way
// in uses (add person, file from intake, add to a list, contact card), "not the same person" decisions,
// and safe merges.

// Names are compared as sets of words without titles, accents, Hebrew points, final-letter forms or
// punctuation. (The v59 code removed titles with \b, which never matches next to Hebrew letters.)
const NAME_TITLES=new Set(['mr','mrs','ms','miss','mister','rabbi','rav','reb','rebbetzin','rebbitzen','dr','prof','harav','hagaon','הרב','הרבנית','רב','רבי','ר','מרת','גברת','גב','דר','פרופ','הגאון','מר']);
const HEBREW_FINALS={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
function nameTokens(v){
  const s=String(v||'').normalize('NFKD')
    .replace(/[̀-ͯ]/g,'')
    .replace(/[֑-ׇ]/g,'')
    .toLowerCase()
    .replace(/[ךםןףץ]/g,c=>HEBREW_FINALS[c])
    .replace(/[׳״'"`’‘”“]/g,'')
    .replace(/[^a-z0-9א-ת]+/g,' ')
    .trim();
  return s?s.split(' ').filter(t=>t&&!NAME_TITLES.has(t)):[];
}
function normName(v){return nameTokens(v).sort().join(' ');}
function normEmail(v){return String(v||'').trim().toLowerCase();}
// Phones compare in international form: 05x… and 0x… are Israeli (972…), a 00 prefix is dropped.
function normPhone(v){let d=phoneDigits(v);if(d.startsWith('00'))d=d.slice(2);else if(d.startsWith('0'))d='972'+d.slice(1);return d.length>=7?d:'';}
function normCity(v){return nameTokens(v).join(' ');}

// A rough consonant outline of a word, so "Miriam" and "מרים" can be hinted as maybe the same.
const HEB_TO_LATIN={'א':'','ב':'b','ג':'g','ד':'d','ה':'h','ו':'','ז':'z','ח':'h','ט':'t','י':'','כ':'k','ל':'l','מ':'m','נ':'n','ס':'s','ע':'','פ':'p','צ':'ts','ק':'k','ר':'r','ש':'sh','ת':'t'};
function nameOutline(token){
  let t=/[א-ת]/.test(token)?[...token].map(c=>HEB_TO_LATIN[c]??'').join(''):token.replace(/ch|kh/g,'h').replace(/ph|f/g,'p').replace(/[cq]/g,'k').replace(/w|v/g,'').replace(/x/g,'ks').replace(/tz/g,'ts');
  return t.replace(/[aeiouy]/g,'').replace(/(.)\1+/g,'$1');
}

function livePeople(){return data.people.filter(p=>!p.mergedIntoId&&!p.deletedAt);}
function notSameDecided(a,b){return data.identityDecisions.some(x=>x.kind==='not-same'&&x.ids?.includes(a)&&x.ids?.includes(b));}

// The one matching check. candidate: {name, phone, email, city, referrerId}. Returns
// {exact: same phone or email, likely: same name and same city or referrer, similar: name looks alike}.
function findPersonMatches(candidate,{excludeId=null}={}){
  const phone=normPhone(candidate.phone),email=normEmail(candidate.email),name=normName(candidate.name),city=normCity(candidate.city);
  const tokens=nameTokens(candidate.name),outlines=tokens.map(nameOutline).filter(x=>x.length>=2);
  const exact=[],likely=[],similar=[];
  for(const p of livePeople()){
    if(p.id===excludeId||(excludeId&&notSameDecided(excludeId,p.id)))continue;
    if(candidate.notSameIds?.includes(p.id))continue;
    if((phone&&normPhone(p.phone)===phone)||(email&&normEmail(p.email)===email)){exact.push(p);continue;}
    const pn=normName(p.name);
    const sameReferrer=candidate.referrerId&&sharesReferrer(p.id,candidate.referrerId);
    if(name&&pn===name&&((city&&normCity(p.city)===city)||sameReferrer)){likely.push(p);continue;}
    if(!name||!pn)continue;
    const pt=nameTokens(p.name);
    const shared=tokens.filter(t=>t.length>=3&&pt.includes(t)).length;
    const po=pt.map(nameOutline).filter(x=>x.length>=2);
    const outlineMatch=outlines.length&&outlines.every(o=>po.includes(o));
    if(pn===name||shared>=Math.min(2,tokens.length,pt.length)&&shared>0||outlineMatch)similar.push(p);
  }
  return {exact,likely,similar};
}
// Did this referrer bring the person (a source from them, or a referral/meeting entry with them)?
function sharesReferrer(pid,referrerId){
  if(data.sources.some(s=>s.fromPersonId===referrerId&&s.lines?.some(l=>l.personId===pid)))return true;
  return data.entries.some(e=>!e.deletedAt&&e.type==='referral'&&e.personIds?.includes(pid)&&e.personIds?.includes(referrerId));
}

// People who share a phone or an email (the same real person, or a shared family phone).
function exactDuplicateGroups(people){
  const live=people.filter(p=>!p.mergedIntoId&&!p.deletedAt),parent=new Map(live.map(p=>[p.id,p.id]));
  const find=x=>{while(parent.get(x)!==x)x=parent.get(x);return x;};
  const byKey=new Map();
  for(const p of live)for(const k of [normPhone(p.phone)&&'p'+normPhone(p.phone),normEmail(p.email)&&'e'+normEmail(p.email)].filter(Boolean)){
    if(byKey.has(k))parent.set(find(p.id),find(byKey.get(k)));else byKey.set(k,p.id);
  }
  const groups=new Map();
  for(const p of live){const r=find(p.id);(groups.get(r)||groups.set(r,[]).get(r)).push(p.id);}
  return [...groups.values()].filter(g=>g.length>1);
}
