'use strict';

// Simple-view + personalization layer. No data model changes.

function skinChoice(value,label,desc,mark){
  const active=(data.settings.skin||'classic')===value?'active':'';
  return `<button class="skin-choice ${active}" data-setting="skin" data-value="${value}"><span class="skin-swatch ${value}">${mark}</span><span><b>${label}</b><small>${desc}</small></span></button>`;
}

