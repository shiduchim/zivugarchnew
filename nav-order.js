'use strict';

// Keep the main navigation in the requested order on both phone and desktop.
nav=function(){
  const items=[
    ['recent','recent','Recent'],
    ['guys','guy','Guys'],
    ['shadchanim','shad','Shadchanim'],
    ['girls','girl','Girls'],
    ['shidduchim','heart','Shidduchim']
  ];
  return `<nav class="warm-bottom-nav">${items.map(([screen,ic,label])=>`<button class="warm-nav ${ui.screen===screen?'active':''}" data-screen="${screen}"><span class="warm-nav-icon">${icon(ic)}</span><span>${label}</span></button>`).join('')}</nav>`;
};
