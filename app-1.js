'use strict';

const APP_VERSION='0.10.0';
const DB_NAME='ZivugMatchDB';
const STORE='kv';
const STATE_KEY='state';
const app=document.getElementById('app');
const overlay=document.getElementById('overlay');
const toastEl=document.getElementById('toast');

const ICONS={
  recent:'<path d="M4 13a8 8 0 1 0 2-5.3L4 10"/><path d="M4 5v5h5"/><path d="M12 8v5l3 2"/>',
  guy:'<circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/>',
  girl:'<circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/><path d="M19 4v4m-2-2h4"/>',
  shad:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c.7-4 3-6 6-6s5.3 2 6 6M15 15c3 0 5 1.7 6 5"/>',
  heart:'<path d="M8 6c-2 0-4 1.5-4 4 0 4 8 9 8 9s8-5 8-9c0-2.5-2-4-4-4-1.7 0-3 1-4 2.4C11 7 9.7 6 8 6z"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a7 7 0 0 0-1.7-1L14.4 3h-4.8L9 6a7 7 0 0 0-1.7 1L4.8 6 2.8 9.4 5 11a7 7 0 0 0 0 2l-2.2 1.6 2 3.4 2.5-1a7 7 0 0 0 1.7 1l.6 3h4.8l.6-3a7 7 0 0 0 1.7-1l2.5 1 2-3.4L18.9 13a7 7 0 0 0 .1-1Z"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  phone:'<path d="M6 3h4l1 5-2 2c1.2 2.4 2.9 4.1 5.4 5.3l1.9-2 4.7 1.1v4c0 1-.8 1.8-1.8 1.8C10.4 20.2 3.8 13.6 3.8 4.8 3.8 3.8 4.6 3 5.6 3z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  message:'<path d="M4 5h16v11H9l-5 4z"/>',
  hourglass:'<path d="M6 3h12M6 21h12M7 3c0 5 2 6.5 5 9-3 2.5-5 4-5 9M17 3c0 5-2 6.5-5 9 3 2.5 5 4 5 9"/>',
  note:'<path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  profile:'<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h4M10 13h6M10 17h5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 14v6h14v-6"/>',
  download:'<path d="M12 4v12m0 0-5-5m5 5 5-5"/><path d="M5 20h14"/>',
  edit:'<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 6.5l3.5 3.5"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  x:'<path d="m6 6 12 12M18 6 6 18"/>'
};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||ICONS.note}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const iso=()=>new Date().toISOString();
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString();
const initials=name=>String(name||'?').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const phoneDigits=v=>String(v||'').replace(/\D/g,'');

let data=null;
const ui={screen:'recent',screenView:{shadchanim:'all',shidduchim:'active',girls:'for-me',guys:'all'},detail:null,detailTab:'details',search:'',recentFilter:'all'};

function defaultSettings(){return {mode:'single',theme:'warm',density:'comfortable',iconSize:'medium',dashboard:'summary-first',summaryCards:true,seededDemo:true};}

function demoData(){
  const me='p_me',miriam='p_miriam',rivka='p_rivka',batya='p_batya',dina='p_dina',leah='p_leah',tamar='p_tamar',noa='p_noa',rina='p_rina',david='p_david',moshe='p_moshe',ari='p_ari';
  const people=[
    {id:me,name:'Me',types:['Guy'],city:'',phone:'',email:'',createdAt:daysAgo(200),profileText:'My current profile',profileVersion:4,isMe:true},
    {id:miriam,name:'Miriam Cohen',types:['Shadchan'],city:'Jerusalem',phone:'050-555-0101',email:'miriam@example.com',createdAt:daysAgo(180),profileText:'',profileVersion:null},
    {id:rivka,name:'Rivka Stern',types:['Shadchan'],city:'Tzfat',phone:'050-555-0102',email:'',createdAt:daysAgo(130)},
    {id:batya,name:'Batya Levy',types:['Shadchan'],city:'Beit Shemesh',phone:'050-555-0103',email:'',createdAt:daysAgo(90)},
    {id:dina,name:'Dina Weiss',types:['Shadchan'],city:'Haifa',phone:'',email:'',createdAt:daysAgo(30)},
    {id:leah,name:'Leah Rosen',types:['Girl'],city:'Jerusalem',age:34,occupation:'Teacher',phone:'',email:'',createdAt:daysAgo(45),profileText:'Leah is 34 and lives in Jerusalem. She works in education and is described as warm, thoughtful and grounded. This is made-up demonstration text.',profileVersion:1},
    {id:tamar,name:'Tamar Gold',types:['Girl'],city:'Jerusalem',age:33,occupation:'Accountant',createdAt:daysAgo(22),profileText:'Made-up demonstration profile for Tamar.',profileVersion:1},
    {id:noa,name:'Noa Weiss',types:['Girl'],city:'Beit Shemesh',age:36,occupation:'Designer',createdAt:daysAgo(70),profileText:'Made-up demonstration profile for Noa.',profileVersion:2},
    {id:rina,name:'Rina Cohen',types:['Girl'],city:'Tzfat',age:35,occupation:'Therapist',createdAt:daysAgo(100),profileText:'Made-up demonstration profile for Rina.',profileVersion:1},
    {id:david,name:'David Klein',types:['Guy'],city:'Jerusalem',age:35,occupation:'Engineer',createdAt:daysAgo(25),profileText:'Made-up demonstration profile for David.',profileVersion:1},
    {id:moshe,name:'Moshe Green',types:['Guy'],city:'Tzfat',age:39,occupation:'Teacher',createdAt:daysAgo(60),profileText:'Made-up demonstration profile for Moshe.',profileVersion:1},
    {id:ari,name:'Ari Stern',types:['Guy'],city:'Beit Shemesh',age:36,occupation:'Accountant',createdAt:daysAgo(80),profileText:'Made-up demonstration profile for Ari.',profileVersion:1}
  ];
  const firstNames=['Sarah','Rachel','Esther','Frumi','Tova','Nechama','Shira','Malky','Devorah','Chana','Gitty','Bracha'];
  const lastNames=['Adler','Berger','Deutsch','Engel','Fischer','Gross','Horowitz','Jacobs','Kaplan'];
  const extraNames=[];for(const f of firstNames)for(const l of lastNames)extraNames.push(`${f} ${l}`);
  extraNames.forEach((name,i)=>people.push({id:`p_s_${i}`,name,types:['Shadchan'],city:['Jerusalem','Beit Shemesh','Tzfat','Bnei Brak','Haifa'][i%5],phone:`050-555-${String(1100+i).padStart(4,'0')}`,createdAt:daysAgo(5+(i%80))}));
  const sourceId='src_rivka10';
  const sourcePeople=[miriam,rivka,batya,dina,'p_s_0','p_s_1','p_s_2','p_s_3','p_s_4','p_s_5'];
  const sources=[{id:sourceId,name:"Rivka's 10 shadchanim",kind:'list',fromPersonId:rivka,createdAt:daysAgo(40),peopleIds:sourcePeople,followUpDays:7,note:'Write to each one and introduce yourself.'},{id:'src_event',name:'Tzfat shidduch evening',kind:'event',createdAt:daysAgo(120),peopleIds:[miriam,'p_s_1','p_s_4']},{id:'src_sarah',name:"Sarah's list",kind:'list',createdAt:daysAgo(75),peopleIds:['p_s_6','p_s_7','p_s_8','p_s_9'],followUpDays:7}];
  const ideaId='idea_me_leah';
  const ideas=[{id:ideaId,guyId:me,girlId:leah,suggestedByPersonId:miriam,createdAt:daysAgo(10),status:'open',privateReason:''},{id:'idea_moshe_tamar',guyId:moshe,girlId:tamar,suggestedByPersonId:rivka,createdAt:daysAgo(4),status:'open',privateReason:''}];
  const shidduchim=[
    {id:'sh_me_leah',guyId:me,girlId:leah,createdAt:daysAgo(9),status:'active',currentRoundId:'round_me_leah_1',suggestedByPersonId:miriam,shadchanIds:[miriam],private:true},
    {id:'sh_david_noa',guyId:david,girlId:noa,createdAt:daysAgo(25),status:'active',currentRoundId:'round_david_noa_1',suggestedByPersonId:rivka,shadchanIds:[rivka],private:false},
    {id:'sh_ari_rina',guyId:ari,girlId:rina,createdAt:daysAgo(80),status:'ended',currentRoundId:'round_ari_rina_1',suggestedByPersonId:batya,shadchanIds:[batya],private:false}
  ];
  const rounds=[
    {id:'round_me_leah_1',shidduchId:'sh_me_leah',number:1,createdAt:daysAgo(9),status:'active',guyStatus:'yes',girlStatus:'thinking',stage:'Waiting for her side'},
    {id:'round_david_noa_1',shidduchId:'sh_david_noa',number:1,createdAt:daysAgo(25),status:'active',guyStatus:'yes',girlStatus:'yes',stage:'Dating'},
    {id:'round_ari_rina_1',shidduchId:'sh_ari_rina',number:1,createdAt:daysAgo(80),status:'ended',guyStatus:'no',girlStatus:'yes',stage:'Ended'}
  ];
  const dates=[{id:'date_me_leah_1',roundId:'round_me_leah_1',number:1,when:daysAgo(5),state:'happened',guyFeedback:'Positive',girlFeedback:'Thinking'},{id:'date_david_noa_1',roundId:'round_david_noa_1',number:1,when:daysAgo(12),state:'happened',guyFeedback:'Positive',girlFeedback:'Positive'},{id:'date_david_noa_2',roundId:'round_david_noa_1',number:2,when:daysAgo(2),state:'happened',guyFeedback:'Positive',girlFeedback:'Positive'}];
  const openItems=[
    {id:'oi1',direction:'them',personId:miriam,aboutType:'shidduch',aboutId:'sh_me_leah',label:"Leah's feedback",createdAt:daysAgo(3),status:'open'},
    {id:'oi2',direction:'me',personId:miriam,aboutType:'person',aboutId:miriam,label:'Send updated profile v4',createdAt:daysAgo(1),status:'open'},
    {id:'oi3',direction:'me',personId:batya,aboutType:'person',aboutId:batya,label:'Reply about availability',createdAt:daysAgo(2),status:'open'},
    {id:'oi4',direction:'them',personId:'p_s_0',aboutType:'person',aboutId:'p_s_0',label:'Reply to introduction',createdAt:daysAgo(8),status:'open'},
    {id:'oi5',direction:'them',personId:'p_s_1',aboutType:'person',aboutId:'p_s_1',label:'Opinion on my profile',createdAt:daysAgo(6),status:'open'},
    {id:'oi6',direction:'them',personId:rivka,aboutType:'source',aboutId:sourceId,label:'Two names to clarify',createdAt:daysAgo(4),status:'open'}
  ];
  const entries=[
    {id:'e1',at:new Date().toISOString(),type:'message',channel:'WhatsApp',direction:'in',fromPersonId:miriam,toPersonId:me,personIds:[miriam,me],aboutType:'shidduch',aboutId:'sh_me_leah',text:"She's thinking about it. I'll ask tonight.",result:'Waiting on them'},
    {id:'e2',at:new Date(Date.now()-42*60000).toISOString(),type:'call',channel:'Call',direction:'out',fromPersonId:me,toPersonId:miriam,personIds:[me,miriam],aboutType:'shidduch',aboutId:'sh_me_leah',text:'Spoke for 7 minutes about Leah.',result:'Waiting on them'},
    {id:'e3',at:daysAgo(.3),type:'profile',channel:'WhatsApp',direction:'out',fromPersonId:me,toPersonId:miriam,personIds:[me,miriam],aboutType:'person',aboutId:me,text:'Sent my profile v4.',profileVersion:4,result:''},
    {id:'e4',at:daysAgo(.7),type:'source',channel:'WhatsApp',direction:'in',fromPersonId:rivka,toPersonId:me,personIds:[rivka,me],aboutType:'source',aboutId:sourceId,text:"Rivka's 10 shadchanim · list progress updated.",result:''},
    {id:'e5',at:daysAgo(1),type:'date',channel:'In person',direction:'none',personIds:[me,leah],aboutType:'date',aboutId:'date_me_leah_1',text:'Date 1 happened. My feedback was positive.',result:''},
    {id:'e6',at:daysAgo(2),type:'profile',channel:'WhatsApp',direction:'in',fromPersonId:miriam,toPersonId:me,personIds:[miriam,me,leah],aboutType:'idea',aboutId:ideaId,text:"Leah's profile v1 received from Miriam.",result:'Idea for me'},
    {id:'e7',at:daysAgo(5),type:'call',channel:'Call',direction:'out',fromPersonId:me,toPersonId:rivka,personIds:[me,rivka],aboutType:'source',aboutId:sourceId,text:'Called Rivka about the list.',result:''},
    {id:'e8',at:daysAgo(9),type:'message',channel:'WhatsApp',direction:'out',fromPersonId:me,toPersonId:'p_s_0',personIds:[me,'p_s_0'],aboutType:'source',aboutId:sourceId,text:'Introduced myself and sent my profile.',result:'Waiting on them'},
    {id:'e9',at:daysAgo(8),type:'message',channel:'WhatsApp',direction:'in',fromPersonId:'p_s_0',toPersonId:me,personIds:['p_s_0',me],aboutType:'source',aboutId:sourceId,text:'Thanks, I will keep you in mind.',result:''},
    {id:'e10',at:daysAgo(7),type:'message',channel:'WhatsApp',direction:'out',fromPersonId:me,toPersonId:'p_s_1',personIds:[me,'p_s_1'],aboutType:'source',aboutId:sourceId,text:'Sent introduction and profile.',result:'Waiting on them'},
    {id:'e11',at:daysAgo(6),type:'call',channel:'Call',direction:'out',fromPersonId:me,toPersonId:batya,personIds:[me,batya],aboutType:'person',aboutId:batya,text:'Introductory call.',result:''},
    {id:'e12',at:daysAgo(12),type:'message',channel:'WhatsApp',direction:'out',fromPersonId:me,toPersonId:dina,personIds:[me,dina],aboutType:'person',aboutId:dina,text:'First introduction.',result:''}
  ];
  return {version:1,settings:defaultSettings(),people,entries,sources,ideas,shidduchim,rounds,dates,openItems,profileVersions:[],files:[],folders:[],meta:{createdAt:iso(),updatedAt:iso(),demo:true}};
}

function emptyData(){return {version:1,settings:{...defaultSettings(),seededDemo:false},people:[{id:'p_me',name:'Me',types:['Guy'],city:'',phone:'',email:'',createdAt:iso(),profileText:'',profileVersion:1,isMe:true}],entries:[],sources:[],ideas:[],shidduchim:[],rounds:[],dates:[],openItems:[],profileVersions:[],files:[],folders:[],meta:{createdAt:iso(),updatedAt:iso(),demo:false}};}

function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function dbGet(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbPut(key,val){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(val,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
let storageBlocked=false;
async function save(){if(storageBlocked){showToast('Not saved: local storage is unavailable');return;}data.meta.updatedAt=iso();await dbPut(STATE_KEY,data);}

// Safety copies: before data is replaced as a whole (demo, restore), the current data is kept
// under its own key so it can be brought back with Undo or from Settings. Newest first.
const SAFETY_KEY='safetyCopies',SAFETY_MAX=5;
let safetyCopies=[];
async function loadSafetyCopies(){try{safetyCopies=((await dbGet(SAFETY_KEY))||[]).map(({id,at,reason})=>({id,at,reason}));}catch(e){safetyCopies=[];}}
async function keepSafetyCopy(reason){if(storageBlocked)return null;const list=(await dbGet(SAFETY_KEY))||[];const copy={id:id('safe'),at:iso(),reason,data:JSON.parse(JSON.stringify(data))};list.unshift(copy);list.splice(SAFETY_MAX);await dbPut(SAFETY_KEY,list);safetyCopies=list.map(({id,at,reason})=>({id,at,reason}));return copy.id;}
async function restoreSafetyCopy(copyId){const list=(await dbGet(SAFETY_KEY))||[];const c=list.find(x=>x.id===copyId)||list[0];if(!c){showToast('Nothing to restore');return;}const back=await keepSafetyCopy('restoring earlier data');data=c.data;await save();closeSheet();ui.detail=null;ui.screen='recent';render();showUndoToast('Earlier data restored',back);}

function person(pid){return data.people.find(p=>p.id===pid)}
