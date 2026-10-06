// Builds fixtures/v58-rich.json once: the v58 demo plus the awkward cases real v58 data can contain.
// All names and numbers are made up. Do not edit the generated fixture to make a test pass.
const fs = require('fs'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/demo.json'), 'utf8'));
const day = n => new Date(Date.parse('2026-10-05T09:00:00.000Z') - n * 86400000).toISOString();
d.meta.demo = false;
d.customStuff = { note: 'an unknown top-level field from an older build' };
d.people.push(
  { id: 'p_rich_nodate', name: 'Nodate Example', types: ['Shadchan'], city: 'Haifa', phone: '050-000-0001' },
  { id: 'p_rich_noname', types: ['Shadchan'], city: 'Tzfat', createdAt: day(30) },
  { id: 'p_rich_heb1', name: 'הרב משה כהן', types: ['Shadchan'], city: 'ירושלים', phone: '050-000-0007', createdAt: day(20) },
  { id: 'p_rich_heb2', name: 'משה כהן', types: ['Shadchan'], city: 'ירושלים', phone: '+972 50-000-0007', createdAt: day(10) },
  { id: 'p_rich_yael', name: 'Yael Example', types: ['Girl'], city: 'Haifa', age: 30, createdAt: day(50), profileText: 'Made-up profile text, version 2.', profileVersion: 2 },
  { id: 'p_rich_gil', name: 'Gil Example', types: ['Guy'], city: 'Haifa', age: 31, createdAt: day(55), profileVersion: 1 }
);
// An entry with no time, an older profile send (v3, whose text was never kept), a referral.
d.entries.push(
  { id: 'e_rich_nodate', type: 'note', channel: 'App', direction: 'none', personIds: ['p_rich_nodate'], aboutType: 'person', aboutId: 'p_rich_nodate', text: 'Imported without a date.', result: '' },
  { id: 'e_rich_v3', at: day(40), type: 'profile', channel: 'WhatsApp', direction: 'out', fromPersonId: 'p_me', toPersonId: 'p_rivka', personIds: ['p_me', 'p_rivka'], aboutType: 'person', aboutId: 'p_me', text: 'Sent my profile v3 to Rivka Stern.', profileVersion: 3, result: '' },
  { id: 'e_rich_ref', at: day(15), type: 'referral', channel: 'App', direction: 'none', personIds: ['p_rich_heb2', 'p_rivka'], aboutType: 'person', aboutId: 'p_rich_heb2', text: 'Rivka recommended him.', result: '' }
);
// Two records for the same pair (Gil – Yael), one of them without any round; an ended shidduch whose round
// still says active; an offer that became a shidduch.
d.shidduchim.push(
  { id: 'sh_rich_a', guyId: 'p_rich_gil', girlId: 'p_rich_yael', createdAt: day(45), status: 'ended', currentRoundId: 'round_rich_a1', suggestedByPersonId: 'p_rivka', shadchanIds: ['p_rivka'], private: false, endedAt: day(35), endedStage: 'Date 2', endedStageIndex: 3, endReason: 'Made-up reason' },
  { id: 'sh_rich_b', guyId: 'p_rich_gil', girlId: 'p_rich_yael', createdAt: day(12), status: 'active', suggestedByPersonId: 'p_batya', shadchanIds: ['p_batya'], private: false }
);
d.rounds.push({ id: 'round_rich_a1', shidduchId: 'sh_rich_a', number: 1, createdAt: day(45), status: 'active', guyStatus: 'yes', girlStatus: 'yes', stage: 'Dating' });
d.dates.push(
  { id: 'date_rich_a1', roundId: 'round_rich_a1', number: 1, when: day(42), state: 'happened', guyFeedback: 'Positive', girlFeedback: 'Positive' },
  { id: 'date_rich_a2', roundId: 'round_rich_a1', number: 2, when: day(38), state: 'cancelled', guyFeedback: '', girlFeedback: '' }
);
d.ideas.push({ id: 'idea_rich_conv', guyId: 'p_rich_gil', girlId: 'p_rich_yael', suggestedByPersonId: 'p_batya', createdAt: day(13), status: 'converted', privateReason: '' });
d.openItems.push(
  { id: 'oi_rich_closed', direction: 'me', personId: 'p_rivka', aboutType: 'person', aboutId: 'p_rivka', label: 'An old finished task', createdAt: day(60), status: 'closed', closedAt: day(58) },
  { id: 'oi_rich_pair', direction: 'them', personId: 'p_batya', aboutType: 'shidduch', aboutId: 'sh_rich_b', label: 'Yael side answer', createdAt: day(11), status: 'open' }
);
d.sources.push({ id: 'src_rich', name: 'Made-up list with a missing person', kind: 'list', fromPersonId: 'p_rivka', createdAt: day(25), peopleIds: ['p_rich_heb1', 'p_does_not_exist'], followUpDays: 7 });
fs.writeFileSync(path.join(__dirname, 'fixtures/v58-rich.json'), JSON.stringify(d, null, 1));
console.log('people', d.people.length, 'entries', d.entries.length, 'shidduchim', d.shidduchim.length);
