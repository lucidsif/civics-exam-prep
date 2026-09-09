# Roadmap — civics study app

Sequenced implementation plan for the enhancements scoped in the July 15, 2026
audit + design session. Companion to [STATUS.md](STATUS.md) (what's done),
[SOURCES.md](SOURCES.md) (content verification), and [QA-GUIDE.md](QA-GUIDE.md)
(manual test pass). The app is a single-file `index.html` (local LLM proxy in
`server.js`) for one learner: my wife, a Bengali-speaking adult ESL learner
studying the 2008 USCIS civics test.

> **Status (July 15, 2026):** All milestones below (**M1–M8 + EMO-3**) are ✅ shipped to
> `main`, plus **N1** (rewarding UX), **N2** (self-service deploy), and **N3** (spoken Mock
> Interview + `launchd` reboot persistence — not originally on this roadmap, added by
> request). Post-roadmap enhancements also shipped — an apostrophe grading fix, visual
> expansion to **100/100 questions** (per-answer emoji + emoji→SVG upgrades), a per-question
> **Ask-the-tutor in Browse**, and an **honest progress meter** (tested-only readiness +
> separate flashcard self-review + a reset control). N3's reboot persistence has been
> verified against a real physical reboot. The **only remaining work is the time-gated
> track at the bottom** of this file. See [STATUS.md](STATUS.md) → "Current state" for
> the full done/remaining snapshot.

---

## Next initiatives

Tracks the owner wanted next. **N1 is ✅ SHIPPED (July 15, 2026)** — see STATUS.md.
**N2 (self-service deploy) is ✅ SHIPPED & WORKING** — `./deploy.sh` (or `/deploy`) ships
`main` from the Air to the live Studio and verifies, no manual Studio steps. Setup is done
(`.deploy.env` → `STUDIO_USER=youruser`, `air_to_studio` key authorized). Deploy works by
**pushing straight into the Studio's checkout over SSH** (`receive.denyCurrentBranch=
updateInstead`) — the Studio never needs GitHub creds (its headless shell can't reach the
macOS keychain). A `/version` build stamp in `server.js` lets the Air confirm the restarted
server serves the exact pushed commit. First live deploy verified `68c067d`. See DEPLOY.md.
**N3 (spoken Mock Interview + reboot persistence) is ✅ SHIPPED**, requested mid-session
rather than pre-planned here — see below and STATUS.md's newest session entry for the
full story. UI work still routes through `accessibility-agents:accessibility-lead`;
animations sit behind `prefers-reduced-motion`.

### N1 — Make interactions & UI/UX more rewarding ✅ SHIPPED
_Delivered: daily streak + daily-goal ring, progress-tier badge, daily husband note,
micro-interactions (pulse/shake/count-up/reveal, reduced-motion-gated), opt-in Web-Audio
sound. 15 new unit tests; suite 77/77. Design notes retained below for reference._

**Goal:** turn studying into a warm daily habit with more tactile feedback and a sense of
momentum — without adding noise or breaking the "honest meter" separation (self-review vs
tested mastery) or the beauty-first calm.

**What already rewards** (don't rebuild): Home hero ring + readiness + category bars;
milestone celebration cards; quiz streak pips / personal best / pass confetti / husband
love-notes; flashcard self-review ring + completion confetti; 100/100 emoji + SVG art;
Bengali endearments.

**Proposed, prioritized:**

- **N1-A · Daily habit loop (highest impact).** The one mechanic most likely to get her
  studying *daily*.
  - **Study streak** — "🔥 N days in a row" on Home. Store `civics-streak-v1`
    `{lastDate, count, best}`; increment on any study action once per calendar day; a
    missed day resets with kind, non-punitive copy ("Fresh start today, jaan 💛").
  - **Daily goal** — a small "N of 10 today" ring that fills as she answers/reviews;
    a gentle celebration when hit. Resets each day. Keep it optional-feeling, never nagging.
- **N1-B · Micro-interactions (moderate effort, big "feel" upgrade).**
  - Card **flip** animation (3D flip) on Flashcards; answer panel **slide/fade** in.
  - **Correct** answer → green pulse + a drawn-in checkmath; **wrong** → a soft shake (never
    harsh), matched to the existing warm tone.
  - Animate the **Home ring/bars fill** (self-review ring already animates) and **count-ups**
    (numbers tick up) so progress feels earned.
  - Button press feedback (subtle scale). All motion `prefers-reduced-motion`-gated.
- **N1-C · Momentum & leveling.**
  - **Progress tiers/badge** derived from mastery ("Getting started → Finding your feet →
    Almost a citizen → Ready 🎓") shown on Home — a sense of leveling beyond the raw count.
  - **"Today" recap** — questions studied, new masteries, streak — a small end-of-session card.
  - **A note from your husband** — surface one rotating love-note on Home daily (expand the pool).
- **N1-D · Optional / lower priority.** Opt-in **sound** (soft chime on correct/milestone,
  default OFF — autoplay + annoyance risk); haptics are effectively unavailable on iOS Safari,
  so skip. Seasonal flourishes.

**Cut lines:** ship **N1-A** first (habit loop, the real retention lever), then **N1-B**
(the tactile "feel"), then **N1-C**. **N1-D** only if wanted.
**New storage keys:** `civics-streak-v1`, `civics-dailygoal-v1`. **Verify:** streak rolls over
correctly across day boundaries (test by stubbing the date); reduced-motion disables all of it;
tested-meter separation preserved; 62/62 grading tests stay green.

### N2 — Self-service deploy (ship from Claude Code, no manual Mac Studio steps)

**Topology (confirmed):** Claude Code runs on the **MacBook Air** (`your-macbook-air`,
tailnet `100.y.y.y`) in the dev checkout `~/Documents/projects/civics-exam-taker`. The
**live app runs on the Mac Studio** (`your-mac-studio`, `100.x.x.x`) from a *separate*
checkout `~/civics-exam-taker`, served by `node server.js :8321` over Tailscale, with LM Studio
:1234 for the tutor. Today's deploy = manually running the pull+restart one-liner **on the
Studio** (DEPLOY.md).

**Goal:** one command from here → live on the Studio, verified, with no hands on the Studio.

**Recommended design — push + Tailscale-SSH trigger (immediate, verifiable):**
1. Preflight on the Air: working tree clean, on `main`, `/tests.html` green (headless check).
2. `git push origin main` (already the workflow).
3. Trigger the Studio over **Tailscale SSH** (ACL-authenticated, no key management):
   `tailscale ssh <user>@your-mac-studio 'cd ~/civics-exam-taker && git pull && pkill -f "node server.js"; sleep 1; nohup node server.js > app.log 2>&1 & sleep 1; curl -s localhost:8321/chat-status'`
   (this is exactly DEPLOY.md's redeploy one-liner, run remotely).
4. **Verify from the Air:** `curl http://100.x.x.x:8321/chat-status` (server up) and
   fetch `/` and grep a **build stamp** to confirm the *new* code is live.
5. Report; on failure, optional auto-rollback (`git reset --hard HEAD~1` + restart).

**Make it verifiable — build stamp:** inject the git short-SHA into `index.html` at deploy
(e.g. a `<meta name="build">` or `window.BUILD`), so step 4 can prove the live site actually
updated (not a cache/old process). Cheap and removes all "did it deploy?" doubt.

**Packaging:** a committed `deploy.sh` + a `/deploy` project skill wrapping steps 1–5, so a
future session just runs `/deploy` and reports the result.

**One-time setup (the only manual Studio step, done once):**
- Enable **Tailscale SSH** for the Air→Studio in the tailnet ACLs (preferred), *or* macOS
  Remote Login on the Studio + the Air's SSH public key in `authorized_keys`.
- Confirm the Studio's `~/civics-exam-taker` cleanly tracks `origin/main` and `node` is on the
  non-interactive SSH `PATH`.
- Keep LM Studio + the model loaded (unchanged from DEPLOY.md).

**Alternative (no SSH):** a launchd LaunchAgent on the Studio that polls `git pull` + restarts
every ~2 min — then deploy = just `git push`. Simpler auth story, but adds poll latency and a
background job to maintain. **SSH-push is preferred** (immediate + explicitly verified).

**Risks/guardrails:** never deploy a dirty/unpushed tree; run grading tests first; health-check
after restart; note that the tutor still depends on LM Studio being up on the Studio (outside
this deploy's control — `/chat-status` reports it).

### N3 — Spoken Mock Interview + `launchd` reboot persistence ✅ SHIPPED
_Not on the original roadmap — added by request mid-session. Delivered: a fully spoken
mock interview (voice in and out, local whisper speech-to-text, same grader as the typed
quiz, Coaching/Realistic modes, the full ceremony from greeting to closing); and all
three services the app depends on (the app itself, LM Studio, whisper) now survive a
Studio reboot via `launchd`, closing out an item that had been sitting in STATUS.md
since the very first session. Full narrative in STATUS.md's newest entry; full mechanics
in ARCHITECTURE.md §11a and DEPLOY.md § "Persistence across reboots."_

**Why it's here even though it wasn't planned:** this file's own sequencing principle
below — "touch each code region once" — still applied even to an unplanned addition: the
speech input feeds the *existing* grader rather than inventing a second one, and the
reboot-persistence work reused the *existing* deploy pipeline (`deploy.sh`) rather than
building a parallel one. The goal, same as every other track here, was fewer moving
parts, not more.

## Sequencing principles

1. **Correctness before delight** — land the grading fixes first; protect trust.
2. **Foundations before features** — the mastery engine (M2) underpins most rewards.
3. **Touch each code region once** — batch everything that edits the same function
   into one pass (don't return to `renderCard` / `gradeAnswer` / `renderBrowse`
   three separate times).
4. **Time-gated content on its own track** — officeholder re-verification happens
   near the interview, not now.

## Project setup notes (read before editing)

- **Accessibility edit-gate hook:** this project's CLAUDE.md fires a `PreToolUse`
  hook that BLOCKS edits to `index.html` until `accessibility-agents:accessibility-lead`
  has been consulted once. Delegate to it at the start of an implementation session
  to unlock edits. Per the saved project preference, accessibility here is
  **advisory (beauty-first)** — apply its input with judgment; don't let it block shipping.
- **karpathy-guidelines skill:** invoke before writing/editing code (global rule).
- **Verify grading** by serving the folder (`python3 -m http.server 8901`) and opening
  `/tests.html` in a browser — it runs the real shipped grading functions. Never
  break the currently-passing suite (was 42; **52 after M1+M2** — 47 grading + 5 mastery).
- **Dynamic questions** are hidden while `HIDE_DYNAMIC = true`. Test both states where
  it matters (Browse especially).

---

## Item inventory

| Tag | Item | Source |
|-----|------|--------|
| **G1** | Q64 fuzzy false-positive fix | Audit §3 |
| **G2** | Q17 false-negative fix (→ `need:2`) | Audit §3 |
| **T** | New grading test cases | Audit §3 |
| **B-NUM** | Browse question-numbering fix | Audit §1 |
| **BN-FC / BN-QZ** | Bengali expander on Flashcards / Quiz answer reveal | Audit §4 |
| **BN-FIX** | Bengali terminology consistency pass (data only) | Audit §2 |
| **EMO-1/2/3** | Emoji on flashcards / quiz+browse / optional inlined images | Visual plan |
| **RW-ENGINE** | Mastery state model (🌱 New → 📖 Learning → ⭐ Mastered) | Reward plan |
| **RW-HOME** | "Path to Citizenship" Home progress hero | Reward plan |
| **RW-FC** | Flashcards "I knew it" self-rating | Reward plan |
| **RW-QUIZ** | Pass confetti + personal best + streak pips | Reward plan |
| **RW-MILE** | Milestone celebrations | Reward plan |
| **RW-BROWSE** | Browse "100 read" quest tracker | Reward plan |
| **RW-READY** | Readiness / mock-interview meter | Reward plan |
| **TG-\*** | Time-gated content (see track at bottom) | STATUS.md |

---

## Milestones

### M1 — Correctness foundation `[G1, G2, T]` · effort S · ✅ DONE (2026-07-15)
Pure correctness win, fully covered by the automated suite, zero visual risk.

- **G1 (false positive, Q64 "name 3 of 13 states").** The fuzzy edit-distance
  matcher lets `"south carolina"` claim the `"north carolina"` slot (they differ by
  exactly 2 edits = the tolerance for long answers), so typing one Carolina twice
  scores as 3 distinct states. Confirmed: input
  `"south carolina, south carolina, georgia"` currently returns count=3 CORRECT
  (should be 2, wrong). **Fix** `matchedIndices` (~line 842): claim EXACT
  (editDistance 0) window matches in a first pass, then allow typo-tolerant matches
  on what remains.
- **G2 (false negative, Q17 "two parts of Congress").** `"the Senate and the House"`
  returns count=0 because the accepted answer is one combined string and an internal
  "the" exceeds edit tolerance. **Fix** by modeling Q17 as
  `need:2, a:["Senate","House (of Representatives)"]` in `ALL_QUESTIONS` (~line 498) —
  matches how she'll answer and fixes both `"the Senate and the House"` and
  `"Senate House"`.
- **T — add to `tests.html`** (adjust expected counts for the Q17 `need:2` change):
  ```js
  [64, "south carolina, south carolina, georgia", false, 2],
  [64, "north carolina, north carolina, georgia", false, 2],
  [17, "the Senate and the House", true, 2],
  [17, "Senate House", true, 2],
  [17, "Senate", false, 1],   // update the existing Q17 row for need:2
  [9,  "the answer is life and liberty", true, 2],
  ```
- **Verify:** `tests.html` all green. **A11y:** none (logic only).
- *No dependencies — shippable on its own.*

### M2 — The reward engine `[RW-ENGINE]` · effort S–M · ✅ DONE (2026-07-15)
Persist per-question mastery, reusing existing `stats[id]` (`c`/`w`/`streak`):
🌱 New (untried) → 📖 Learning (tried, not yet right twice) → ⭐ Mastered
(`streak >= 2`, the existing weak-spot exit rule). Not user-facing yet; it's the
data spine for M3, M4, M6, M8.
- **Verify:** console-check state transitions. **A11y:** define ⭐ as shape + text
  label now so every later surface inherits it (never color-only).

### M3 — Flashcards, one coherent pass `[RW-FC + BN-FC + EMO-1]` · effort M · ✅ DONE (2026-07-15)
All three edit the flashcard **answer panel** (`renderCard`, ~line 687) — do together.
- **RW-FC:** "I knew it ✓ / Show me again" after flip → feeds M2 mastery.
- **BN-FC:** drop in `bnPanelHTML(q)` on the **answer side only** (so the Bengali
  question text doesn't become a crutch).
- **EMO-1:** answer-side emoji (aria-hidden) for the ~45 concrete questions (emoji
  map in the audit; see "Emoji map" below).
- Deck header shows "⭐ N mastered." **Verify:** browser preview. **A11y:** emoji
  decorative; Bengali `lang="bn"`; announce via `announce()`.

### M4 — Home hero `[RW-HOME]` · effort M · ✅ DONE (2026-07-15)
Replace the dry `renderHomeStats` block with the "Path to Citizenship" progress hero
(mastered ring + category bars + warm copy). Depends on M2.
- **A11y:** progress has a text equivalent, not color-only.

### M5 — Quiz, one coherent pass `[BN-QZ + RW-QUIZ + EMO-2·quiz]` · effort M · ✅ DONE (2026-07-15)
All edit `gradeAnswer` / the answer reveal (~line 967) — M1's grading fixes already
landed here.
- **BN-QZ:** Bengali on the accepted-answers panel. **RW-QUIZ:** pass confetti +
  personal-best line + in-round streak pips. **EMO-2:** emoji on the reveal.
- **A11y:** confetti behind `prefers-reduced-motion`; celebration announced politely,
  focus not stolen (reuse the existing `/grade` spinner a11y contract).

### M6 — The big moments `[RW-MILE]` · effort M · ✅ DONE (2026-07-15)
Cross-cutting milestone celebrations (10/50/100 mastered, category done, all-20-star
questions mastered, first quiz pass) firing off M2's events, in the husband's voice +
Bengali endearments. After M3–M5 emit the events.
- **A11y:** dismissible, non-trapping, announced.

### M7 — Browse, one coherent pass `[B-NUM + RW-BROWSE + EMO-2·browse]` · effort S–M · ✅ DONE (2026-07-15)
All edit `renderBrowse` (~line 1329) — do together.
- **B-NUM:** render the real `q.id` as each item's label (fixes mislabeled numbers
  while `HIDE_DYNAMIC=true` — `<ol start>` auto-numbers by position and ignores gaps).
- **RW-BROWSE:** "100 read" quest tracker + completion celebration (reading the
  Bengali panel counts too).
- **EMO-2:** emoji in the list.
- **Verify:** preview with `HIDE_DYNAMIC` both ways.

### M8 — Readiness meter `[RW-READY]` · effort S · ✅ DONE (2026-07-15) · CAPSTONE
The anti-anxiety motivator: from mastery fraction, estimate the mock-interview pass
chance (officer asks 10 of 100, needs 6) — "you'd pass about 9 times out of 10 today."
Ticks from "not yet" → "almost" → "you're ready." Depends on M2; best last.

---

## Parallel / independent

- **BN-FIX** (Bengali terminology consistency — data only, no code): fold into the
  fluent-speaker review (**TG-BNREVIEW**) so it's fixed and validated in one human
  pass. Known drifts to normalize: "President" (প্রেসিডেন্ট vs left-in-English at
  Q70/79/80/82); "Senator" (সিনেটর vs সেনেটর Q24); "House/Representative"
  (প্রতিনিধি পরিষদ vs হাউস vs রিপ্রেজেন্টেটিভ); "Veterans" (প্রাক্তন vs প্রবীণ সৈনিক);
  country names kept in Latin script (British/France/Canada/Mexico) while Japan/
  Germany/Italy were translated. No meaning errors — polish only.
- **EMO-3** (inlined images): ✅ DONE (2026-07-15) — shipped as **self-authored inline
  SVG** rather than sourced photos (user's call): tiny (+2 KB gzipped), fully offline,
  zero licensing risk, crisp on her phone. 10 illustrations covering 13 iconic questions
  (flag, Lady Liberty, Capitol dome, scroll, fireworks, ballot, quill, star, ship, maple
  leaf) in an `ANSWER_ART` map; each SVG **replaces** the emoji where present (one
  decorative mark per question), `aria-hidden`/`focusable="false"`, no role/title. Wired
  into the flashcard answer side, quiz reveal, and Browse list.
  - *Optional future upgrade:* swap in sourced public-domain / .gov photos (LoC,
    Wikimedia PD, NPS) near the interview if more realism is wanted — WebP + base64,
    verify each image's PD status, budget page weight.

## Time-gated track (near the interview — NOT now)

| Item | Trigger |
|------|---------|
| **TG-DYNAMIC** — set `HIDE_DYNAMIC = false` + re-verify all 9 officeholders against .gov | Week of interview |
| **TG-Q23** — re-confirm her U.S. Representative (TX district 10 vs 35) | After Nov 2026 election / when address known |
| **TG-BNREVIEW** — fluent Bengali speaker reviews all 100 (absorb BN-FIX here) | Before relying on the Bengali |

---

## Dependency map

```
M1 correctness ─┐  (independent, ship anytime)
                │
M2 engine ──────┼──► M3 Flashcards ─┐
                │                    ├─► M6 Milestones ─► M8 Readiness
                ├──► M4 Home         │
                └──► M5 Quiz ────────┘
                     M7 Browse (independent of engine; groups B-NUM)
```

**Suggested release cut-lines:**
- **M1** alone — clean correctness release.
- **M1→M4** — first "this feels different" release (correct + real sense of progress
  + livelier Flashcards).
- **M5→M8** — the "delightful" release.

## Model guidance

- **M1** → Opus (fiddly algorithm + correctness-critical).
- **M2–M8** → Sonnet is plenty (design already specified here); use Opus on M4/M6 if
  you want extra polish on the hero + celebration visuals.

## Emoji map (answer-side hook; the clear subset)

Concrete questions suited to one decorative emoji on the ANSWER reveal (skip the ~40
abstract definition/process questions; leave Q60 slaves, Q76 Emancipation, Q86 9/11
text-only or use a neutral date). Full table in the July 15 audit; key picks:
📜 Q1/5/66, 🗣️ Q6, 🕊️ Q9, 🏛️ Q13/94, 🎖️ Q15/32/79/80, 💯 Q18, 🗳️ Q27, ✍️ Q33,
❌ Q34, ⚖️ Q38, 9️⃣ Q39, 💵 Q41, 🤠 Q44, 🐘🫏 Q45, 🇺🇸 Q52/96, 🧾 Q56, ⛵ Q58,
🪶 Q59/87, ✒️ Q62, 📅 Q63, ⚔️ Q72/73/78, 🎩 Q69/70/75, ♀️ Q77, ❄️ Q83, ✊ Q84/85,
🌊 Q88/89/90, 🏝️ Q91, 🍁 Q92, 🌵 Q93, 🗽 Q95, ⭐ Q97, 🎵 Q98, 🎆 Q99, 🎉 Q100.
