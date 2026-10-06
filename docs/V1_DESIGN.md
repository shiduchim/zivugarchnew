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
| `offers.js` | Offer rows and sheet, Not applicable (private reason, no shidduch), Interested (one shidduch per pair; a new round only after the last one ended), Link earlier history |
| `rounds.js` | Answers (Yes / Thinking / No, who told me, which item it answers), Engaged, dates (add, move, cancelled, happened, feedback) and earlier rounds folded on the History tab |
| `items.js` | What's next? (Done, Heard back, Check in now, Not needed, Undo), the "after talking to …" question, items settled from Add activity |

- **Open items close only by choice.** The app names the open items (after a contact, an answer, a
  date's feedback) and I tick the one that was settled. Only that item closes, linked to the entry
  that settled it.
- **Dates** start only when both sides said Yes; Thinking blocks them. Every change to a date is an
  entry about its Date ID, so moving it or adding feedback never makes a new date. "It happened"
  opens one feedback item per side, and feedback for a side closes exactly that item.
- **Current state** (an answer, a date's state, a stage) is read from the newest entry; two entries
  with the same time count in the order they were written.

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

Checked by the golden harness (DOM of every state against the cleaned v58). Everything else is the
same, element for element.

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

