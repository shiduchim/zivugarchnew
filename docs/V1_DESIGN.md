# ZivugMatch v1.0: how the architecture is built

`ARCHITECTURE.md` is the authority for the data and the business rules. This note records how
v1.0 implements it on top of the cleaned v58 code, and which newer decisions override the older
wording in `ARCHITECTURE.md`. Every name and number in examples is made up.

## Newer decisions that override `ARCHITECTURE.md`

| `ARCHITECTURE.md` says | v1.0 does (owner's later decision) |
|---|---|
| Tabs: Recent · Guys · Girls · Shadchanim · Shidduchim | **Recent · Guys · Shadchanim · Girls · Shidduchim** |
| Shadchanim views: All · Waiting on them · Waiting on me · Needs contact · Sources | **All · To hear back · My to-do · Time to contact · Sources** |
| "Waiting on them / Waiting on me" | **To hear back / My to-do** |
| Girls in Single mode: For me · Previous | One list of girls who apply to me. **Search finds every girl.** |
| Shidduchim views: Active · Ideas · Ended | **Offers · In Progress · Ended** ("Offer" is the visible word for an idea) |
| Recent header with Paste, mode switch, backup line, summary strip | The approved calm Recent: **My to-do list → To hear back (only when there is any) → History**, gear only on Recent. Paste lives in the Add sheet; "To file" appears on Recent only when something waits. |
| Theme · Density · Icon size · Dashboard layout settings | The 11 approved skins, layout feel and phone layout. A skin changes the look only. |
| Pair titles "Me ↔ Leah" | **"Me – Leah Rosen"**, no arrows |
| Shidduch page, any layout | The approved page: pair header, stage bar, Overview · Dates · History · People |
| Stage words | **Profile sent → References → Date 1 … Date 8 → Marriage**; while either side is Thinking, the bar does not move into dating |

## Storage

- One IndexedDB database, `ZivugMatchDB` (name unchanged so existing data is found), opened once
  and kept open.
- Database version 2 adds one store per collection (keyed by the record's permanent `id`), a
  `blobs` store for file contents and a `copies` store for safety copies. The v58 `kv` store stays.
- A save writes only records that changed, removed records are deleted, all in one transaction.
- `kv/meta` holds `{schema: 2, appVersion}`. Data counts as upgraded only when that marker exists,
  and it is written in the same transaction as the records.
- The v58 value `kv/state` is never changed or deleted. It remains the original.

## The one-time upgrade from v58

1. On start, if `kv/meta` says schema 2, the stores are loaded. Nothing is written.
2. Otherwise, if `kv/state` (v58) exists:
   - its exact content is kept first as a pinned safety copy, **"Before v1.0"**, which rotation
     never removes
   - `migrateV58()` builds the v1.0 records in memory (a pure function: it never touches storage
     or its input)
   - everything is written in one transaction, together with the schema marker
3. If the upgrade fails, nothing is half-written. The app shows a calm screen that offers to export
   the original data and to try again. It never falls back to demo data.
4. Restoring the "Before v1.0" copy, or importing a v58 backup, runs the same upgrade in memory.
   Data that is already v1.0 passes through unchanged, so running the upgrade twice cannot duplicate
   anything.

Ambiguous old data is kept as it is and listed under "Needs a look" in Settings. Examples:
two shidduch records for the same pair, or two people with the same phone number. Nothing is
merged or guessed.

## Records

| Record | Key fields | Notes |
|---|---|---|
| Person | name, types (Guy, Girl, Shadchan, Reference), phone, email, city, age, ageAsOf, occupation, folderIds, isMe, mergedIntoId | Current facts. The profile text lives in ProfileVersions. |
| Link | aId, bId, kind | A lasting fact: "a is the mother / reference / contact … of b" |
| Entry (ledger) | at, type, channel, direction, fromPersonId, toPersonId, personIds, about[], text, result, private, profileVersionId, fileIds, changes[], corrections[], deletedAt, toFile | Written once. Text is never changed. |
| Source | name, kind, fromPersonId, entryId, lines[{id, text, personId}], followUpDays, note | Lines keep the original text |
| Idea (Offer) | guyId, girlId, suggestedByPersonId, status (open, not-applicable, interested), privateReason, shidduchId, roundId | |
| Shidduch | guyId, girlId, createdAt, mergedIntoId | One per pair. Status, stage and go-betweens are worked out from its rounds. |
| Round | shidduchId, number, ideaId, suggestedByPersonId, shadchanIds, status, startedAt, endedAt, endedStageIndex, endReason, base | `base` keeps v58 answers that had no history |
| Date | shidduchId, roundId, number, base | When, happened/cancelled and feedback are worked out from the ledger, so one Date ID survives every change |
| Open item | direction (me, them), personId, about, kind, label, dueAt, status, closeKind, openedByEntryId, closedByEntryId | |
| ProfileVersion | personId, number, text, facts, fileIds, createdAt, origin | Frozen. Editing a profile makes a new one. |
| File | name, mime, size, personId, entryId | The content is a Blob in `blobs`, stored once |
| Folder | name | A label on people |
| Merge | keepId, dupId, filled, addedTypes, entryId, undoneAt | See identity |
| Identity decision | kind: not-same, ids | "These are not the same person" |
| Attention | kind, ids, note, resolvedAt | Things the upgrade or a merge could not decide |

## Worked out, never stored

- **A shidduch:**
  - status and current round
  - stage
  - each side's answer (the newest answer entry, otherwise the round's v58 `base`)
  - next step
  - whose turn it is
  - go-betweens
- **A date:** its time, whether it happened and the feedback, from the entries about that Date ID
  (on top of the v58 `base`).
- **A person:**
  - last contact
  - how I know them (sources and referral/meeting entries)
  - which of my profile versions they have
  - whether a girl applies to me
  - "maybe the same as"
- **A source:**
  - total
  - contacted
  - replied
  - needs follow-up (7 days after contact by default)
  - not contacted

Rendering, searching, filtering, switching mode or skin never write anything.

## Flows

Each flow lives in one file and writes one entry per real moment.

| File | Owns |
|---|---|
| `ledger.js` | Writing entries and open items, linking an entry to more records (kept as a correction), soft delete with Undo (only for entries that changed no record), the entry page |
| `profiles.js` | ProfileVersions, "which version does this person have", the send sheet (To, Version, Files, What for, Your words, a preview of exactly what goes out) |
| `offers.js` | Offer rows and sheet, Not applicable (private reason, no shidduch), Interested and Make match (one shidduch per pair; a new round only after the last one ended), Link earlier history |
| `rounds.js` | Answers (Yes / Thinking / No, who told me, which item it answers), Engaged, dates (add, move, cancelled, happened, feedback) and earlier rounds folded on the History tab |
| `items.js` | What's next? (Done, Heard back, Check in now, Not needed, Undo), the "after talking to …" question, items settled from Add activity |
| `sources.js` | Sources and lists: the original text, each line kept as written and pointing to one Person (or "not added yet"), adding people through the matching check, the list's one follow-up item |
| `links.js` | References and family: links between two normal Person records, shown on both pages and on the shidduch's People tab |
| `files.js` | Files stored once (content in `blobs`), the Files tab, opening a file only when tapped, delete with Undo |
| `folders.js` | Folders as labels on people, and the folder view in Guys, Girls and Shadchanim |
| `intake.js` | Paste, the "To file" row on Recent, and filing: who sent it, when, and what it is (idea for me, a shidduch, a shadchan, a list, a note) |

- **Open items close only by choice.** The app names the open items (after a contact, an answer, a
  date's feedback) and I tick the one that was settled. Only that item closes, linked to the entry
  that settled it.
- **Dates** start only when both sides said Yes; Thinking blocks them. Every change to a date is an
  entry about its Date ID, so moving it or adding feedback never makes a new date. "It happened"
  opens one feedback item per side, and feedback for a side closes exactly that item.
- **Current state** (an answer, a date's state, a stage) is read from the newest entry; two entries
  with the same time count in the order they were written.
- **Lists** count from the ledger: contacted means I sent them something after the list arrived;
  replied means something came from them after that. A list has one quiet follow-up item for the
  whole list. The first contact with someone on it opens the item (showing the list never does),
  it is due after the list's follow-up time (7 days by default), and it closes when everyone
  contacted has replied, or by Done / Not needed on the list's page.
- **Intake:** a pasted message is an entry marked "to file", with `at` empty and `pastedAt` set.
  It shows "Pasted" until a real time is given. Filing sets who it is from, what it is about and
  (optionally) when, keeps the change as a correction, and never changes the words. Files that came
  with it go to the person it is about.
- **Pause:** an entry about the round; the round is paused while its newest pause/resume entry is a
  pause, so it stays In Progress (marked Paused). Pausing closes the shidduch's open items, each
  pointing to the pause; Undo reopens exactly those items. Ending works the same way and also has
  Undo, which puts the round back exactly as it was. Interested on a paused pair resumes it.
- **Telling the go-between:** when I decide my own side (not heard from someone), "Tell Miriam: my
  answer is Yes" waits on me until I tell her. A newer decision replaces the older item.
- **Send my profile to a list:** the source page offers it for the people on the list not contacted
  yet. The version, files and words are chosen once; then one person at a time (WhatsApp opens one
  chat at a time), each saved as its own send entry with the exact version. Skip sends nothing.
- **Needs a number:** a shadchan, reference or family member saved with no phone is a light record,
  marked on its page. Adding a number (Edit) runs the matching check again. Singles are never
  marked: nothing tells me to chase a single.
- **Date feedback on someone else's shidduch** is waited on from that side's contact (a parent, a
  contact or their shadchan, from the single's links), and only without one from the single.
- **Age** is kept with the date it was typed and counts on from there. An age from v58 has no date
  and is shown as it was saved.
- **References and family** are normal people. A reference gets the Reference role; a parent or
  friend gets no role of their own and is reached through the link and search. Adding one goes
  through the matching check.

## Identity

- One matching check (`identity.js`) serves every way in: add person, file from intake, add to a
  list, contact card.
- Names are compared without titles (Rabbi, Rav, Mrs, הרב, הרבנית, מרת …), Hebrew points, final
  letters or punctuation. Comparison is by words, so word order doesn't matter. The v59 code
  relied on `\b`, which does not work for Hebrew letters; v1.0 splits on spaces and punctuation
  instead.

| Signal | What the app does |
|---|---|
| Same phone (any format, 972/0) or email | Exact: "Miriam is already here". Same person is preselected. |
| Same name and the same city or referrer | Likely: "Is this the Miriam you know?" Nothing is preselected. |
| Similar name only | A new record, with a "Maybe the same as …" hint on the page |
| "Not the same person" | Remembered and never asked again |

**Merge** keeps both records. The duplicate gets `mergedIntoId`, and every screen reads people
through that pointer, so nothing is copied or rewritten:

- Empty fields on the kept record are filled from the duplicate, and the merge record lists exactly
  which ones.
- Undo removes the pointer. It also reverts those filled fields that have not been changed since.
  Work done after the merge stays with the kept record. No snapshot is restored, so nothing done
  later is lost.

## Privacy

- **Sending** builds the message only from the chosen ProfileVersion, the chosen files and the words
  typed. The preview shows exactly that.
- **Link earlier history** (after Interested) offers only entries that:
  - involve the girl or the guy of this pair
  - are not private
  - are not already about another offer or shidduch
  - involve no other single

  - when I had my own offer or shidduch with one of them, involve nothing between me and that
    person

  So an entry with Me + Leah is never offered for David – Leah.
- **My own shidduch** appears on the other person's page as a private, folded line.
- **Private notes and reasons** stay on their own records and are never part of a send.

## What looks different from v58

Checked by the golden harness against the cleaned v58: 2,871 states (11 skins, both modes, phone
and desktop, layout variants). The DOM differs only in the 37 states below, and no screenshot
changed anywhere the DOM stayed the same. No state has a console error or writes anything while
browsing.

| Where | Difference | Why |
|---|---|---|
| Settings | "Before v1.0" row (Restore); footer "ZivugMatch v1.0" | The pinned safety copy; the new version |
| Person ⋯ | "Same person as…" (not on Me), "Undo merge" after a merge, "Send profile" when there is a profile | Identity; sending |
| Person → Shidduchim | My own shidduch reads "My own shidduch with Leah", marked Private | Privacy rule |
| Profile tab | "All versions" when there is more than one | Frozen versions |
| Shadchan → Send vN | Opens the send sheet instead of logging at once | Only what I choose is sent |
| What's next? | Each item has Done / Not needed, or Heard back / Check in now / Not needed; "When?" for a to-do | Open items |
| Add activity | "Who reached out?" and the open items it settles | Open items |
| Shidduch → Overview | Each answer can be tapped to change it | Answers are entries |
| Shidduch → Dates | "Add date", or "Dates start after both sides say Yes" | Dates; Thinking blocks dating |
| Shidduch → History | Includes date entries; earlier rounds folded below | One ledger; rounds |
| Shidduch ⋯ | "Engaged" | Marriage stage |
| Entry page | "What was sent", later links, "Delete this activity" for plain entries | Ledger |
| Add sheet | A "Paste" tile | Intake |
| New offer (Shadchan mode) | "Make match" next to "Save offer"; also from a single's ⋯ | Make match starts the shidduch at once |
| Recent | "To file" row, only while something waits | Intake |
| Add source | "Who gave it?" and the names as they came | Sources keep the original text |
| Source page | "Add" for People; unlinked lines can be tapped to add that person; the list as it came; the one follow-up | Sources |
| Profile tab (Guy, Girl) | "References and family" with Add | References and links |
| Files tab | The person's files and "Add file" | Files |
| Person ⋯ | "Folders" | Folders |
| Guys / Girls filter (Shadchan mode) | A view sheet: age, city and folder, with Settings below (Single mode: Settings, as before) | Age and city filters, folders |
| Person page | "Needs a number" with Add, for a shadchan, reference or family member saved with no phone | Light records |
| Shadchan → Details | How I know them lists lists, events and referrals, oldest first, with "All" | How I know them |
| Source page | The other counts in words (not contacted, no reply, new, already here) and "Send my profile to the N not contacted" | Source counts; list send |
| Shidduch → History | "Add note" (the note is about this shidduch) | The page decides "about" |
| Shidduch ⋯ | "Pause" or "Resume" | Pause |
| Shidduch → Overview | "Paused since …" with Resume, while paused | Pause |
| Shidduchim (Shadchan mode) | My own shidduch's row says "Private"; a paused one says "Paused" | Privacy; pause |
| Shadchanim rows (Single mode) | "has v4", or "has v3 (old)", once they have my profile | Who has my profile |
| Answer sheet | "Now: Yes · from Miriam · Oct 2", with Open | Every status shows its source |
| Edit person | "How well I know them" (optional) | Person field |
| Recent search | People who match, above History | Search finds everyone |
| Recent (Single mode) | Other people's shidduchim are one quiet line, "N more in Shadchan mode" | Single mode view |

## Reconciliation with `ARCHITECTURE.md`

Every item of `ARCHITECTURE.md` that was not already built in the first v1.0 pass was checked
against the newer decisions in the v1.0 brief (cited by its section numbers, §18–§28). Each one is
REQUIRED FOR v1.0 (and now built), SUPERSEDED BY NEWER UX, or OPTIONAL/FUTURE.

### Required for v1.0 (built, with an acceptance test)

| Item | ARCHITECTURE.md | Test |
|---|---|---|
| Needs a number: a light record, checked again when a number is added | §6.1 | C01 |
| Send my profile to the people on a list not contacted yet | §6.3 | C02 |
| Pause (items close, with Undo) and Undo for an ending | §7 | C03, C04 |
| "Tell the go-between" when my side decides | §7 | C05 |
| Every status shows its source | §4 rule 2 | C05 |
| How I know them: every meeting and referral, oldest first | §3, §6.2 | C06 |
| Source counts: new, already here, no reply, not contacted | §3, §6.3 | C02 (shown on the page) |
| The same name in any script, plus city or referrer, asks | §6.1 | C07 |
| Search finds everyone, mine first in Single mode | §8 | C08 |
| My own shidduch marked private in Shidduchim (Shadchan mode) | §5.4, §8 | C08 |
| Single mode Recent: other people's shidduchim as one quiet line | §8 | C09 |
| The page decides "about" (a note from a shidduch's page) | §4 rule 4 | C09 |
| Single mode Shadchanim rows: has my profile / old profile | §8 | C10 |
| Profile version language | §2 | C10 |
| Shadchan mode Guys and Girls: age and city filters (and folders) | §9.3 | C11, G01 |
| Age with its date; how well I know them | §2 | C11 |
| Date feedback waits on go-betweens, not singles | §7 | C12 |
| Make match | §5.2, §8 | A05 |

### Superseded by newer UX

| Item | ARCHITECTURE.md | Newer decision |
|---|---|---|
| Paste, the mode switch and the backup line in Recent's header | §9.2 | Brief §24 (the gear is the only header button on Recent) and §27 (no redesign). Paste is in the Add sheet, with the To file row at the top of Recent (§9.7); mode and backup are in Settings. |
| Recent's summary strip, and its To file count | §9.2, §11 | Brief §22: Recent is My to-do, To hear back, History. The To file row shows the count when something waits. |
| Memos pinned to the top of Recent | §9.7 | Brief §22 |
| A "To file" chip in Recent's filter | §9.2 | The To file row, shown only while something waits |
| Girls → For me · Previous; Guys = the guys I help | §8, §9.3 | Brief §21 (Guys = My profile; no For me / Previous) |
| Shidduchim Active · Ideas · Ended | §8, §9.5 | Brief §25 (Offers · In Progress · Ended) |
| Bottom navigation order | §9.1 | Brief §20 |
| Shadchanim views Waiting on them / Waiting on me / Needs contact | §9.4 | Brief §23 wording (To hear back, My to-do, Time to contact) |
| Shadchanim sort and group options | §9.4 | Brief §23 (default sort as designed; no extra controls) |
| The shadchan page History filter "All · Leah · mine" | §9.6 | Brief §24 (keep the approved person page) |
| List zoom (Folders · Names · Details) | §9.3 | Brief §27 (keep the approved compact rows); size and density stay in Settings |

### Optional / future (deferred on purpose)

| Item | Why it can wait |
|---|---|
| PeerMatch import, WhatsApp chat import, contact cards (§6.1 ways in, §12) | Not part of ZivugMatch, and not in the brief's list of missing areas (§15). When added, each uses the one matching check that every way in already uses. |
| ZIP and TXT backup formats (§12, PeerMatch's) | ZivugMatch keeps its JSON backup, now with file contents, and v58 backups restore (brief §18). |
| Reading times from a pasted chat export | Rule 10 is met: a pasted message says "Pasted Oct 4" until a time is entered. |
| Renaming or deleting a folder | The architecture asks for folders as labels on people, which is built. |
| The quick-details checkboxes filter (§9.3) | It filters on PeerMatch's quick-details fields, which ZivugMatch data does not have. |
| Presentation settings of §11 | `ARCHITECTURE.md` itself says "planned for later"; ZivugMatch keeps its 11 skins and layout settings. |

