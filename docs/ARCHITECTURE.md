# zugbase architecture: the decided version

Design only, no code. Written 2026-10-04. It records the owner's decisions so far, in one place.

- **This document wins.** Where `docs/SHIDDUCH_LOGIC.md` or `docs/PEOPLE_AND_SOURCES.md` say
  something different, follow this one. Those two keep the research, the alternatives and the
  stress tests behind each decision.
- **Every name and number is made up.**
- **Not built yet.** A new clickable prototype comes first (section 13). The earlier prototype,
  `prototype/shidduch-flow.html`, is paused and out of date.

**Contents**

1. The architecture in one diagram
2. What is stored
3. What is worked out, never typed
4. The rules
5. Ideas and shidduchim
6. People, sources and lists
7. Waiting on them, waiting on me
8. Single Mode and Shadchan Mode
9. Navigation and screens
10. The look: Warm Modern Dashboard
11. Presentation settings, kept apart from the data
12. How this reconciles the five earlier attempts
13. The first clickable prototype
14. Conflicts, and open questions

---

## 1. The architecture in one diagram

```
 People: one record per real person
   Guys · Girls · Shadchanim · References
   (parents and friends: kept, no list)
          ▲
          │ entries point to people
          │
 One ledger: every moment, written once
   calls, WhatsApp, profiles sent and
   received, notes, meetings, referrals,
   answers, dates, feedback
          │
          │ entries point to permanent IDs
          ▼
 Permanent IDs
   Sources: events, lists such as
     "Rivka's 10 shadchanim"
   Ideas: a suggested pair, not started
   Shidduchim: a real pair, with rounds
     and dates
   Open items: waiting on them, on me
          │
          │ everything else is worked out
          ▼
 Views, never copies
   Recent · Guys · Girls · Shadchanim ·
   Shidduchim · a person's page ·
   a shidduch page · a source page
          │
          │ chosen by
          ▼
 Mode (Single or Shadchan) and look
 (theme, density): what you see,
 never the data
```

**In plain words:**

- Each real person has **one record**.
- Everything that happens is written **once**, in the ledger.
- Sources, ideas, shidduchim, dates and open items each get a **permanent ID** that entries point
  to.
- Every screen is a **view** of that same information, never a copy.
- Mode and look change only **what you see**.

---

## 2. What is stored

| Stored | What it holds | Edited how |
|---|---|---|
| **Person** | one per real human. Every PeerMatch field, and the approved additions (age with its date, how well I know them, folders) | directly, like today |
| **Link** | a lasting fact between two people: mother of, contact for, reference for, shadchan for | directly |
| **Ledger entry** | one moment: when · from → to · channel · exact words · files · profile version · **about** (people, idea, shidduch, date, source) · **what it changes** | written by the app's flows; the received words are never changed |
| **Source** (ID) | an event, a group, a site, or a **list of shadchanim** ("Rivka's 10 shadchanim"): its name, who gave it, the entry it came in, its lines | named once; the lines are kept as they came |
| **Idea** (ID) | a suggested pair, not started yet: the two people (one may be me) and who suggested it | opened and closed by entries |
| **Shidduch** (ID) | a **real** Guy ↔ Girl pairing, one per pair forever, with each side's go-betweens | created by one tap (5.2) |
| **Round** (ID) | one attempt within a shidduch: Round 1, Round 2… | opened and ended by entries |
| **Date** (ID) | one meeting of the couple, within a round | its state comes from entries |
| **Open item** (ID) | something owed: **waiting on them**, or **waiting on me** | opened and closed by entries |
| **Profile version** | a frozen copy of a profile: text, files, language. It never holds the message it arrived in | made automatically when a profile changes or arrives |
| **File** | a photo, PDF or recording, stored once | never changed |
| **Folder** | an approved label on people | directly |
| **Settings** | the mode, backup information, and **presentation settings** (section 11) | in Settings; never part of records |

**Person types** are the categories the lists show: **Guy, Girl, Shadchan, Reference**.

- One person can have more than one type, for example a shadchan who is also my reference.
- Parents, siblings and friends are people too, each with one record. They have **no type of
  their own**: they appear through links ("Rachel, Leah's mother") and in search.
- **Me** is one record too, holding my profile versions.

---

## 3. What is worked out, never typed

- **For a person:**
  - how I know them: every meeting and referral, oldest first
  - last contact
  - what is waiting on them and on me
  - who has their profile, and which version
  - their ideas and shidduchim
  - whether they are relevant to me (5.4)
- **For an idea:** open, not applicable (by whom, why), or became a shidduch.
- **For a shidduch:**
  - its stage
  - my status and her status (or his and hers), each with who said it and when
  - who suggested it
  - its dates and both sides' feedback
  - what is waiting on them and on me
  - the next action
  - its rounds
- **For a source:** total, new, already here, contacted, replied, no reply, needs follow-up.
- **For Recent:** the ledger itself, newest first.

The results are saved as summaries, for speed. Whenever an entry changes, they are rebuilt from the
ledger. Nobody edits them by hand.

---

## 4. The rules

1. **Write once, show everywhere.** One entry shows on every page it concerns, and in Recent.
2. **Every status shows its source.** Tap "Her side: Yes" and you see Miriam's message.
3. **The original is never changed.** Words and files stay as they came. Only the app's reading
   of them (who it's from, what it's about, what it changed) can be fixed.
4. **The page you're on decides "about".** When the app can't tell, the entry waits in the Intake
   folder.
5. **One record per real person.** Every way a person can come in goes through **one matching
   check** (6.1).
6. **A shidduch exists only for a real Guy ↔ Girl pairing** (5.1).
7. **Permanent IDs** for sources, ideas, shidduchim, rounds, dates and open items. Entries always
   point to the ID, never "the latest one".
8. **A reply closes the exact item it answers.** The app names the item, and you confirm with
   Yes or No.
9. **A sent version is frozen.** Editing a profile makes a new version.
10. **No invented dates.** "Pasted Oct 4" until the real time is known. PeerMatch data with no
    date says "date unknown".
11. **Messages are built only from what you choose to send:** a profile version, chosen photos and
    files, and your own words. No History, note, reason or private answer can go out.
12. **Quiet.** Nothing nags: no reminder popups and no alarms. The lists simply show what is
    outstanding.
13. **Mode and look change the view, never the data** (sections 8 and 11).

---

## 5. Ideas and shidduchim

### 5.1 When a shidduch exists

**A shidduch record exists only when there is an actual Guy ↔ Girl pairing.** General work
never needs one. These **do not** create a shidduch:

- sending my profile to a shadchan
- calling a shadchan to introduce myself
- meeting a shadchan at an event
- receiving a girl's profile that I decide is not applicable
- calling a reference
- general talk with a shadchan

Each of those is an entry about the people involved, and nothing more.

### 5.2 The idea comes first

When someone suggests a pair, for example Miriam sends Leah's profile for me, the app records an
**idea**: Me ↔ Leah, suggested by Miriam, with a permanent ID.

- An idea is **not** a shidduch. It shows as one line on Leah's page, in Girls → For me, and in
  Shidduchim → Ideas:

  ```
  Idea for me · from Miriam, Aug 3
    [Not applicable]   [Interested]
  ```

- It opens a quiet item, **waiting on me: answer Miriam about Leah**.
- **Not applicable:**
  - the idea closes, with an optional reason (private)
  - no shidduch is created
  - the item stays open until you tell Miriam, or you choose "No reply needed"
- **Interested:**
  - the **shidduch is created**, and Round 1 starts from the idea
  - the app then proposes which earlier entries belong to it, each with Yes / No: the arrival of
    her profile, the opinion you asked Moshe for, the reference call
  - linking them changes only "about", never the entries themselves
- The same works for other people, in Shadchan Mode. "Rivka has a girl for Dovid: Noa" is an idea
  for Dovid ↔ Noa. **Make match** creates the shidduch directly, because it is my own decision to
  pair them.

### 5.3 Rounds

- There is **one permanent record per pair.**
- When the pair already has an ended shidduch and someone suggests it again, the suggestion shows
  **on that same record** as a new idea ("Suggested again by Chana").
- "Interested" opens **Round 2**. "Not applicable" opens nothing.

```
Me ↔ Leah
  Round 2 · 2028 · suggested by Chana
    active
  Round 1 · 2026 · 3 dates
    ended by her (hashkafa)
```

- Each round has its own stage, statuses, dates (numbered from 1) and open items.
- Earlier rounds stay visible below, clearly separated. Tap to fold them.

### 5.4 Relevance to me, worked out

| Leah's state | Worked out from | Single Mode | Shadchan Mode |
|---|---|---|---|
| Idea for me, undecided | an open idea Me ↔ Leah | Girls → For me | normal |
| Not applicable for me | the idea closed as not applicable | hidden from browsing; search finds her | normal |
| My active shidduch | Me ↔ Leah, current round active | Girls → For me, and Shidduchim | normal, with mine marked private |
| Ended (I said no, or she declined) | Me ↔ Leah, current round ended | Girls → Previous; search | normal |
| Never suggested to me | nothing involving me | not shown; search finds her | normal |

There is **no "relevance" field** to keep up to date. Leah's record, profile versions, files, how
she came to me and her History are **never removed or copied**, whatever the state.

### 5.5 She declined, and later David ↔ Leah

```
Me ↔ Leah · Round 1 · ended
  My side: Yes (Aug 9)
  Her side: No (via Miriam, Aug 16)
  Ended by her side · declined
```

Two years later, **David ↔ Leah** is a new pair, so it gets a **new shidduch record**, with its own
rounds, dates, open items and History.

**Why my private history can't leak:**

- **Rule 11:** a message is built only from what I choose: a profile version, chosen files, my
  words.
- **A profile version holds only her profile.** Miriam's wrapper ("an idea **for you**…") stays
  in the arrival entry.
- **The David ↔ Leah page shows only its own entries,** by its ID.
- **On Leah's page, my own shidduch is private and folded:** "My own shidduch with Leah (ended)".
  Nothing in it is ever offered for sending.
- **David ↔ Leah's go-betweens come from Leah's links** (her mother, her shadchan), never from my
  old shidduch.

---

## 6. People, sources and lists

### 6.1 One record per real person

The **matching check** has one owner in the code, and is used by every way in: adding by hand,
filing, lists, contact cards, chat import, the PeerMatch import.

| Signal | Result |
|---|---|
| Same WhatsApp number, phone or email | **"Miriam is already here"**, with her history. Same person: Yes is preselected; one tap confirms. Shared phones are why it still asks |
| Same name (in any script, without titles) plus the same city or referrer | "Is this the Miriam you know?" Yes / No, nothing preselected |
| Similar name only | a new record, with a visible "maybe the same as…" hint |
| A name with no number | a light record marked "needs a number". It's checked again once a number is added |
| "Not the same person" | remembered, never asked again |

Duplicates can still be **merged**:

- Nothing is lost, and the old record becomes a pointer.
- Undo works.
- The merge is an entry in the ledger.

### 6.2 Meetings and referrals collect on the one record

- "Met at Event A", "met again at Event B", "recommended by Rivka", "on Sarah's list of 50",
  "recommended by Chana" are each **one change inside the entry where it happened**.
- They are **never a field**. Miriam's page shows them all under **How I know her**, oldest first.
- A meeting is a moment, so it's an entry. A link is only for lasting facts.

### 6.3 Lists of shadchanim are sources

- "Rivka's 10 shadchanim" is a **source with a permanent ID**, permanently under **Shadchanim →
  Sources**.
- Each line points to a **normal, permanent shadchan record** (new, or already here), or is
  "not added yet". **Never a copy.**
- **Progress is worked out from the ledger**, so contacting Miriam anywhere updates every list she
  is on: from her page, from Recent, from the WhatsApp flow.

```
‹ Rivka's 10 shadchanim
  from Rivka · Jun 8 · WhatsApp
  "Write to each one…"
 10 total · 6 contacted · 3 replied
 1 needs follow-up · 4 not contacted
──────────────────────────────────
 (the normal shadchan rows)
 [Send my profile to the 4 ›]
```

| Count | Worked out as |
|---|---|
| Total | the lines on the list |
| Contacted | anything I sent them, or a call, after the list arrived, from anywhere in the app |
| Replied | anything from them after my first contact |
| Needs follow-up | contacted, no reply, and the list's follow-up date has passed (default: 7 days after contact) |
| Not contacted | on the list, nothing sent yet |

- A list's follow-up is **one quiet item**, not one reminder per person.
- **The ongoing relationship always lives on the normal shadchan record.** The list only shows
  where the group came from, and its progress.

---

## 7. Waiting on them, waiting on me

These replace the earlier words "Waiting" and "You owe":

- **Waiting on them:** I've done my part, and I'm waiting for them. Shown in **yellow** (the
  standing preference).
- **Waiting on me:** they've done their part, and I need to respond or do something. Shown in a
  **calm blue**, never red.

Each one is an **open item with a permanent ID**. These open by themselves, quietly:

| When this is recorded | It opens | It closes when |
|---|---|---|
| An idea for me arrives from X | waiting on me: answer X | I answer X, or choose "No reply needed" |
| I send X a profile and ask an opinion | waiting on them: X's opinion | X replies about it |
| I suggest a pair to X | waiting on them: X's side's answer | that answer comes in |
| X asks me for something (a photo, references, an answer) | waiting on me: that thing | I send it |
| A date happened | waiting on me: my feedback to the go-between; and waiting on them: the other side's feedback | each one comes in |
| My side decides, but I haven't told the go-between | waiting on me: tell them | I tell them |
| Call due (today, tomorrow, a date) | waiting on me: call X | a call to X |
| The **Waiting button** on a person (manual override) | waiting on them: what you type | the button, or their next message |
| A list's follow-up date | one item for the whole list | everyone on it has replied, or you close it |
| A pause or an ending | — | the shidduch's items close (with Undo) |

**Nothing ever tells you to chase a single.** Items point at go-betweens, or at your own answers.

---

## 8. Single Mode and Shadchan Mode

**One database and one ledger.** A mode is a setting. It changes which views each tab opens on,
and what comes first. **It never moves, hides for good, copies or changes data.**

| | Single Mode | Shadchan Mode |
|---|---|---|
| Focus | my shadchanim · profiles relevant to me · my active ideas · my shidduchim · Recent · waiting on them · waiting on me · calls due and next actions | all guys · all girls · all shadchanim · all shidduchim · all saved profiles · search, filters and matching tools |
| Recent | what concerns me and my network; other people's shidduchim show as one quiet line, "3 in Shadchan Mode" | everything |
| Guys | the guys I help, if any | all guys |
| Girls | **For me** (open ideas and my shidduchim) · Previous | all girls, including "not applicable for me" |
| Shadchanim | the same views; rows show "has my profile / old profile" | the same views |
| Shidduchim | mine: Active · Ideas · Ended | all, with mine marked private |
| Search | everyone, mine first | everyone |
| Make match | hidden | on the Shidduchim tab and on a single's page |

---

## 9. Navigation and screens

### 9.1 Bottom navigation: five tabs, in both modes

**Recent · Guys · Girls · Shadchanim · Shidduchim**

The tabs stay the same in both modes, so your hand always knows where things are. Only each tab's
default view changes (section 8).

### 9.2 Recent: a global, WhatsApp-like activity list

- Recent is **the ledger itself, newest first**: calls, WhatsApp, profiles sent and received,
  notes, dates, feedback, referrals, lists. **It is not a copy.** Full History stays on each
  person's page and each shidduch page.
- **The header has:**
  - Paste
  - search
  - the mode switch (Single · Shadchan)
  - Settings (gear)
  - the backup line
- **Its optional summary strip** (a presentation setting) shows: Waiting on them · Waiting on me ·
  Calls due · To file · My profile.
- **Days are grouped** ("Today", "Yesterday", "Sun Aug 23"). Each row:

```
Today
 (M)  Miriam → Me · WhatsApp     14:05
      "She's thinking about it…"
      Me ↔ Leah · Her feedback: Unsure
 (Mo) Me → Moshe · WhatsApp      09:30
      Leah's profile v1 · asked opinion
      Waiting on them: Moshe
Yesterday
 (R)  Rivka → Me · WhatsApp
      10 shadchanim · 7 new · 3 here
      Rivka's 10 shadchanim ›
```

- **Filter chips:** All · Calls · Messages · Profiles · Dates · Notes · To file.
- Tapping a row opens the entry. From there, one tap goes to the person, the shidduch, the date or
  the source it's about.

### 9.3 Guys and Girls

- **One or two lines per person**, with the approved zoom (Folders · Names · Details).
- **Views follow the mode** (section 8).
- **Shadchan Mode filters:** age, city, the quick-details checkboxes, and folders.
- Every row opens that person's one record.

### 9.4 Shadchanim

Views: **All · Waiting on them · Waiting on me · Needs contact · Sources**

```
Shadchanim · 112              − +
[ Search name, phone, city…     ]
 All · Waiting on them 6 ·
 Waiting on me 3 · Needs contact 18
 · Sources
──────────────────────────────────
 (M) Miriam · Jerusalem        3 d
     on them · on me · 2 active
     has v2 (old) · 5 sources
 (B) Batya · Beit Shemesh     2 mo
     no reply since Sep 2 · v3
 (D) Dina · Haifa              new
     never contacted · Rivka's 10
```

- **Needs contact:** never contacted, or a list follow-up is due (question 2 in section 14).
- **Sources:** every event, group, site and list. Each opens its source page (6.3).
- **Sort:** last contact, A–Z, recently added, waiting longest.
- **Group:** by who referred them, by folder, by city.

### 9.5 Shidduchim: a view made from shidduch and idea records

Views: **Active · Ideas · Ended**. It's never a folder of people.

### 9.6 The pages

**Person page** (guy, girl, reference): the PeerMatch-style page, with the details and contact
buttons in the standing order. At the top, one line each:

- ideas and shidduchim
- waiting on them, waiting on me
- how I know them

Then the profile, the files, the contacts and the full History. My own shidduch with this person
is folded and marked private.

**Shadchan page:** one line each, then the full History:

```
‹  (M) Miriam                  ב״ה
   Jerusalem · shadchan     [Edit]
 Call · Email · WhatsApp · SMS · Waiting
 Waiting on them  Leah's feedback,
                  Date 1 · 3 days
 Waiting on me    your parents' names
 My profile       has v2 (old) ·
                  [Send v3]
 Shidduchim       Me ↔ Leah · dating
 Last contact     call · Aug 21
 Call due         Today · Tomorrow
 How I know her   met Jan 12 · +4 ›
 History   All · Leah · mine
```

**Shidduch page:** the stage, my status, her status, waiting on them, waiting on me, next action,
a summary of the dates, and recent History. Behind tabs: **Dates · History (by round) · People**.

**Source page:** described in 6.3.

### 9.7 Where the earlier approved Home items went

| Approved earlier (`REBUILD_PLAN.md`) | Now |
|---|---|
| A Home tab | **Recent** is the first tab, and its optional summary strip holds the Home summaries |
| Calls due on Home, "Add someone to Calls due" | in **Waiting on me**, and in the summary strip; still set from any person |
| Memos | notes to myself: they show in Recent (Notes chip), and can be pinned to its top |
| Recently added | an "Added" chip in Recent |
| Last backup · Backup now | the backup line in Recent's header, and Settings |
| My profile, and who it was sent to | the summary strip in Single Mode; the Shadchanim rows show has / old / no profile |
| Settings on Home only | the gear in Recent's header |
| The Intake folder | "To file (2)" at the top of Recent, and Paste in its header; the folder itself stays |
| Different tabs per mode | the same five tabs; the mode changes the default views |
| Make match in the header (Shadchan Mode) | on the Shidduchim tab and on a single's page |
| Suggested to me (Yes / No) | an idea for me: open, not applicable, or interested |
| Ideas for me (folder) | Girls → For me, and Shidduchim → Ideas |
| Folders, zoom, Add to… | unchanged |

---

## 10. The look: Warm Modern Dashboard

**Approved by the owner**, from mockup renderings made with ChatGPT. There is no repository file
for it yet.

**Goals:**

- modern, high-tech feeling
- warm and calm, easy on the eyes
- not corporate, not visually stressful
- compact enough for daily use
- strong readability
- clear icons and subtle color

**How the builder applies it:**

- **Warm neutral backgrounds**, with soft cards used only where an object stands apart, and one
  calm accent.
- **Semantic color stays subtle:**
  - yellow for waiting on them
  - calm blue for waiting on me
  - green for good progress
  - muted for ended
- **Avatars are initials** in soft tones. Icons are simple line icons, always with a word next to
  them.
- **Readable type:** body text 15–16 px, compact rows, no uppercase section labels, no big bulky
  buttons.
- **Mockups and the prototype** use initials, neutral icons, silhouettes or wireframes only. No
  photographs of women, ever.
- **The exact colors and spacing** should be matched to the owner's mockup renderings. A
  screenshot of them would help (section 14).

---

## 11. Presentation settings, kept apart from the data

Planned for later. **These are presentation only.**

| Setting | Options |
|---|---|
| Theme | Warm (default) · Blue · Sage · Dark |
| Density | Comfortable · Compact |
| Icon and avatar size | Large · Medium · Small |
| Dashboard layout (Recent) | Recent-first · Summary-first · Minimal |
| Summary cards | show · hide |

- There is **no "Calming Mode".**
- These settings are stored with the other settings, **never in people, entries or IDs**.
- Changing one **never writes a ledger entry** and never changes a count, a status or a rule.
- Every screen takes its colors, sizes and spacing from **design tokens**, so a theme or density is
  just a different set of tokens.
- The data architecture never depends on the look.

---

## 12. How this reconciles the five earlier attempts

| Attempt | Kept | Replaced |
|---|---|---|
| **PeerMatch** | every field and flow · the person-page details · contact order · the after-call popup · one message per profile, PDF first, photo Yes / No · the WhatsApp import · ZIP and TXT backups · the referral tree (now worked out from sources) | copied History → one ledger · one Waiting switch per person → open items · `referredBy` → sources · Make match's three copies → a shidduch |
| **zugmatch** | one owner per feature · one WhatsApp queue · backup round-trip tests | its PeerMatch data model |
| **ZivugBase** | the engine: Dexie tables, one entry linked to many records, phone keys, soft delete, the PeerMatch import, the Intake folder keeping the original | status fields typed next to History · the rejected Ideas and "Where they came from" sections (now one line each) |
| **zugbase, earlier builds** | the Intake folder · folders as labels · zoom · Calls due on anyone | folders-first navigation · History inside each person |
| **testmatch** | the ledger line: who → whom · channel · what · result | four combined views · big cards · counters · uppercase labels |
| **The paused prototype** | the engine ideas it proved: IDs, closing by ID, worked-out status | the Home tab · "You owe" · creating a shidduch when a profile arrives |

---

## 13. The first clickable prototype

### 13.1 The exact screens

All with made-up data, initials as avatars, the Warm Modern Dashboard look, and no external
loads.

**The five tabs:**

1. **Recent**: header (Paste, search, mode switch, gear) · optional summary strip · day-grouped
   rows · filter chips.
2. **Girls**:
   - Single Mode: For me · Previous
   - Shadchan Mode: All, with age and city filters
3. **Guys**: All, used for David in Shadchan Mode.
4. **Shadchanim**: All · Waiting on them · Waiting on me · Needs contact · Sources, at Names and
   Details zoom, with 100+ made-up rows.
5. **Shidduchim**: Active · Ideas · Ended.

**The pages:**

6. **Girl page: Leah.** Her idea line, profile, files, how she came to me, History, with my own
   shidduch folded.
7. **Shadchan page: Miriam.** Waiting on them and on me, my profile version, shidduchim, How I
   know her, History.
8. **Source page: "Rivka's 10 shadchanim".**
9. **Shidduch page: Me ↔ Leah.** Overview, then Dates, History and People.

**The sheets:**

10. **File from Intake**, with the matching check ("Miriam is already here…") and "Idea for me ·
    About a shidduch · A shadchan · A list of shadchanim · Just a note".
11. **The idea answer:** Not applicable · Interested, then the proposal to link earlier entries.
12. **Send:** a profile, a version, and "ask opinion / suggest / just send", with a preview of
    exactly what goes out.
13. **After a call.**
14. **Dates:** set up · move · did it happen? · feedback.
15. **Make match: David ↔ Leah.**

### 13.2 What it must prove before production coding starts

- [ ] **Recent reads like WhatsApp.** Every row opens the right person, shidduch, date or source.
      Deleting an entry removes it everywhere at once, which proves Recent is a view and not a
      copy.
- [ ] **One Miriam.** Adding her from an event, a list and a referral never makes a second
      record, and "already here" shows her history.
- [ ] **"Rivka's 10" updates by itself.** Contacting Miriam from her page or from Recent changes
      the list's counts, with no action on the list.
- [ ] **Waiting on them and waiting on me** show the right items. Each reply closes only the item
      it answers. For example, Miriam's "she's thinking" leaves the wait open.
- [ ] **No shidduch without a pairing.** Sending my profile, introducing myself, meeting at an
      event, calling a reference, and a "not applicable" profile create no shidduch.
- [ ] **An idea becomes a shidduch.** "Interested" creates Me ↔ Leah, and the earlier entries are
      linked with Yes / No.
- [ ] **One date ID.** Date 1 set, moved, happened, and both sides' feedback all point to the
      same date.
- [ ] **Not applicable:**
  - Leah disappears from Single Mode browsing
  - search finds her
  - she's normal in Shadchan Mode
  - nothing about her is lost
- [ ] **Declined, then David ↔ Leah:**
  - the new shidduch starts empty
  - the send preview contains only her profile version
  - nothing from Me ↔ Leah appears on it
- [ ] **Round 2** opens on the same Me ↔ Leah record, and Round 1 stays visible below it.
- [ ] **Modes change views only.** Switching modes changes no counts behind the scenes.
- [ ] **Look and density change the look only.** A quick theme and density toggle changes no data.
- [ ] **It feels simple:**
  - 112 shadchanim are scannable, with no big cards
  - one hand is enough
  - the main flows take few taps
  - the screens feel calm, not stressful
- [ ] **It works offline,** with made-up data only, and no photographs.

---

## 14. Conflicts, and open questions

**Conflicts found, and how they're settled**

1. **The new five tabs replace the approved tab sets and Home items** (`REBUILD_PLAN.md`: Home ·
   Shadchanim in Single Mode, and Home with Calls due, Memos, Recently added, backup, My profile,
   Settings on Home only). Settled in 9.7, so every approved item still has a home. Please confirm.
2. **"A shidduch only for a real pairing" changes my earlier design**, where a profile arriving for
   me created Me ↔ Leah. Settled: the **idea** comes first (5.2). `SHIDDUCH_LOGIC.md` and
   `PEOPLE_AND_SOURCES.md` now say so.
3. **"Reopen as Round 2"** (decided earlier) and "a shidduch only for a real pairing" (decided now)
   fit together if a repeat suggestion first shows as an idea on the same record, and "Interested"
   opens Round 2 (5.3). Please confirm.
4. **"Waiting" and "You owe" are renamed** "Waiting on them" and "Waiting on me". The PeerMatch
   button "Waiting for reply" becomes the manual "Waiting" override, still yellow.
5. **References are a main type but have no tab.** They're reached from each single's page and
   from search. Should they also be a view under Guys and Girls (question 3)?
6. **Parents and friends no longer have a list.** ZivugBase's roles (contact, friend, helper) and
   the prototype's "Friends and others" group are dropped. The records stay, reached through links
   and search.
7. **The rejected "Ideas", "Where they came from" and "Profile shared" sections** (ZivugBase) are
   now one line each, plus views (Girls → For me, Shidduchim → Ideas, How I know her). None is a
   section.
8. **The Warm Modern Dashboard has no file in any repository.** It's recorded here from your
   description; the exact colors should come from your mockups.

**Open questions (one line each)**

1. Matching: same phone or email = "already here, one tap"; same name = ask. OK?
2. Should "Needs contact" also include "no contact in 60+ days"? It would be a view only.
3. Should References also be a view under Guys and Girls, or stay on the singles' pages and in
   search only?
4. Is "Needs follow-up" for a list "contacted, no reply, 7 days after contact" when no date is
   set? Is 7 days right?
5. Can you send one screenshot of the Warm Modern Dashboard mockup, for the colors and spacing?
