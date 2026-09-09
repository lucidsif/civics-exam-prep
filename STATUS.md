# Status & backlog

Living notes on what works, what changed, and what's left. Newest session on top.
For the full architecture and runbook, see [DEPLOY.md](DEPLOY.md).
For a hands-on test pass, see [QA-GUIDE.md](QA-GUIDE.md).
For the sequenced plan of upcoming work (grading fixes, mastery/reward system,
Bengali + emoji), see [ROADMAP.md](ROADMAP.md) — start at milestone M1.

---

## Current state — July 16, 2026

**Repo:** clean; all officeholder-verification work below is committed & pushed
and live on the Studio.
**Grading + logic tests:** 106/106 green (`/tests.html`) — grew from 86 this session
(20 new regression tests: an officeholder-answer snapshot, a change-date-documented
check, and a Bengali/English answer-count parity check across all 100 questions).
**Console:** no errors across all views.

### When each "may change" answer needs re-checking

| Q | Answer | Re-check on/around |
|---|---|---|
| 20 | TX Senators (Cornyn, Cruz) | **Jan 3, 2027** — new Senate term begins; Cornyn's seat is the one expected to change (lost his primary) |
| 23 | U.S. Representative (Casar) | **Jan 3, 2027** — new House term begins; TX redistricting also takes effect then |
| 28 | President (Trump) | **Jan 20, 2029** — end of current term; no earlier scheduled date |
| 29 | Vice President (Vance) | **Jan 20, 2029** — same as above |
| 46 | President's party (Republican) | **Jan 20, 2029** — tied to Q28 |
| 39 | Supreme Court justices (9) | No scheduled date — statutory, would need an act of Congress |
| 40 | Chief Justice (Roberts) | No scheduled date — lifetime appointment |
| 43 | TX Governor (Abbott) | **Jan 2027** (exact day not yet set) — end of current term; unaffected if he wins reelection |
| 47 | Speaker of the House (Johnson) | No fixed date (can change anytime by House vote); **Jan 3, 2027** is the one scheduled checkpoint if House control flips |

Each of these dates now lives in the question's own `note` field in the app, not just
this table — see [SOURCES.md](SOURCES.md) for the primary source behind every one.
**A real, physical Studio reboot has been verified end-to-end** — the app, LM Studio,
and whisper all came back automatically after the one required FileVault login, no manual
steps. See the newest session entry for the full result.

### ✅ Done (shipped to `main`)

- **Correctness:** all ROADMAP grading fixes (G1/G2) + the apostrophe false-negative fix
  (natural no-apostrophe ESL spellings now grade right); suite 42 → **58**, all green.
- **Reward system (ROADMAP M1–M8):** mastery engine, Home "Path to Citizenship" hero,
  flashcards (self-rating + Bengali + emoji), quiz (streak pips, personal best, Bengali
  reveal, confetti), milestone celebrations, Browse read-quest, readiness meter.
- **Progress meter reworked for honesty:** ring + readiness count **only real graded quiz
  answers**; flashcard self-rating lives in a separate `civics-selfreview-v1` counter shown
  only on Flashcards — now a **visual gold progress ring + bar** (echoes the Home hero but
  distinct; turns green + confetti when the whole set is self-known); **"Reset progress"**
  control on Home (keeps read-quest + best score).
- **Visuals:** **100/100 questions marked** (33 inline SVG + 67 emoji), **per-answer emoji**
  on the list questions (Q100 holidays, Q6/9/51 rights), emoji→SVG upgrades where better
  (scales-of-justice, ballot box, scroll). All decorative (`aria-hidden`).
- **Rewarding UX (ROADMAP N1, all shipped):** a **daily habit loop** — 🔥 study streak
  (`civics-streak-v1`, non-punitive) + a **daily-goal ring** ("N of 10 today",
  `civics-dailygoal-v1`), fed by every study action (quiz, flashcard rate, browse read,
  writing check); a **progress-tier badge** ("Just beginning → Almost a citizen → Ready 🎓");
  a **daily husband note** on Home; **micro-interactions** (correct→green pulse, wrong→soft
  shake, count-up on the ring/goal numbers, answer reveal, button press) all behind
  `prefers-reduced-motion`; and **sound** (`civics-sound-v1`, default **ON**, toggleable off
  on Home, Web-Audio chime that unlocks on the first study gesture, additive to the visible
  verdict). Full a11y-lead contract applied (announce
  latching/merging, count-up commit invariant, tier contrast pairs, `aria-pressed` toggle).
  15 new unit tests (streak/daily/tier) → suite **77/77**.
- **Bengali:** all 100 Q&A translated (Browse expander) + bilingual tutor replies (AI aid,
  disclaimed — not yet fluent-reviewed).
- **Tutor:** local-LLM chat (`server.js`) on Home, Flashcards, Quiz, and **per-question in
  Browse**; degrades gracefully when the server/LM Studio is offline.
- **Content:** all 100 questions verified against official USCIS sources (July 14, 2026).
- **Self-service deploy (ROADMAP N2, shipped & working):** `./deploy.sh` / `/deploy` ships
  `main` from the Air to the live Studio and verifies — no manual Studio steps. Pushes
  straight into the Studio's checkout over the `air_to_studio` SSH key
  (`receive.denyCurrentBranch=updateInstead`; the Studio needs no GitHub creds), restarts
  node, and confirms from the Air that the restarted `/version` build stamp equals the pushed
  commit. First live deploy verified `68c067d`. See DEPLOY.md.
- **Mock Interview — a hands-free spoken interview (N3, shipped & live).** The type-in
  quiz's "Interview mode" only ever read the question aloud; she still typed her answer.
  Mock Interview closes the loop both ways: she *speaks* every answer, a local `whisper.cpp`
  server transcribes it, and the same trust-first grader (§6 in ARCHITECTURE.md) scores it —
  no new grading logic, just a new input channel feeding the one that already exists. Covers
  the **full ceremony**: greeting/oath → 10 civics questions (honoring the officer's real
  6-correct/5-wrong early stop) → a reading test → a writing test (stays typed — it's
  handwritten on the real exam) → a closing. A **Coaching vs. Realistic** toggle picks
  whether the officer reacts after each question or stays neutral until the end, matching
  how she wants to practice that day. Full design and every mechanism (VAD, WAV encoding,
  the tap-to-talk/type-instead fallbacks) are in [ARCHITECTURE.md §11a](ARCHITECTURE.md).
  Gated on the server + whisper being reachable — the card is simply absent otherwise, and
  the original type-in Interview mode remains as a keyboard fallback either way.
- **The three services the app depends on now survive a Studio reboot (N3, `launchd`).**
  Previously, after any restart of the Studio, `node server.js`, LM Studio, and (new) the
  whisper speech-to-text server all had to be started **by hand, in the right order** — the
  single most-repeated "ops, when convenient" item in this file's history (see the entries
  below dated back to the very first session). Now all three run as supervised `launchd`
  LaunchAgents that restart themselves on a crash and start automatically once the Studio is
  logged into. Tailscale needed no work — it already persists as a macOS system extension.
  Getting the app itself under `launchd` uncovered a genuine, previously-invisible bug: a
  `launchd`-spawned `node` process **hangs forever** (not a quick failure) if its working
  directory is inside a TCC-protected folder like `~/Documents` — Node's own startup calls
  `getcwd()` internally, and that call blocks indefinitely rather than failing when a
  background agent (with no window to show a permission prompt) touches a protected folder.
  Confirmed by sampling the stuck process. The fix was moving the served checkout from
  `~/Documents/civics-exam-taker` to a plain `~/civics-exam-taker`. Full story, the exact
  evidence, and every command are in [DEPLOY.md § Persistence across reboots](DEPLOY.md).

### ⏳ Remaining (nothing blocking today; mostly time-gated near the interview)

| Item | When | Notes |
|------|------|-------|
| **Re-verify the 9 officeholder answers again** | **Each one now has its own re-check date — see below** | Re-verified July 16, 2026 **directly against primary sources** (uscis.gov, supremecourt.gov, speaker.gov, senate.gov, gov.texas.gov, mccaul/casar.house.gov — not just search snippets) and unhidden (all 100 questions now live). Every dynamic question's in-app `note` now states exactly when it may go stale (or "no scheduled change" if there isn't one) instead of a vague "week of interview." See SOURCES.md → "Re-verification pass — July 16, 2026" and the table below. |
| ~~**Re-confirm Q23** U.S. Representative (her address → TX district 10 vs 35)~~ | ~~After Nov 2026 election / when address known~~ | ✅ **done 2026-07-16** — she checked her exact address at house.gov/representatives/find-your-representative; it resolves to District 35. Q23 now shows the single confirmed answer **Greg Casar** instead of both options. Re-verify Jan 3, 2027 (redistricting takes effect then). |
| **Fluent-Bengali review** of all 100 translations (absorbs the BN-FIX terminology polish) | Before relying on the Bengali | Currently an AI aid; English answers remain authoritative. |
| Confirm **2008 vs 2025** civics test applies to her N-400 filing date | Before relying on this app | App covers the 2008 test only. **The exact cutoff is now known** (found on uscis.gov 2026-07-16): N-400 filed **before Oct. 20, 2025 → 2008 test** (this app); filed **on/after Oct. 20, 2025 → the new 2025 test** (not covered here). Just needs her actual filing date checked against that line. |
| ~~**Q17 Bengali translation only has 1 answer, English has 2**~~ | ~~Low priority~~ | ✅ **done 2026-07-16** — split the existing combined Bengali phrase ("সিনেট ও প্রতিনিধি পরিষদ") into its two already-vetted parts to match English's `["Senate","House (of Representatives)"]`, and added a permanent regression test (below) so this class of drift can't happen silently again. |
| ~~LM Studio "Serve on Local Network" / autostart persistence across reboots~~ | ~~Ops, when convenient~~ | ✅ **done, verified against a real reboot** — see the newest session entry and [DEPLOY.md](DEPLOY.md). |

### 🤔 Optional / owner's-call (from the QA pass — not bugs)

- **Bare-phrase leniency:** `drivers license` / `womens rights` (dropping the lead-in
  "give a" / "fought for") still score 0. `need:1` with easier alternatives, and the tutor
  upgrade catches it online. **Owner's call: leave as-is** (loosening risks false positives).
- ~~**Q95 Statue of Liberty** missing USCIS's bracketed alternates~~ — ✅ **fixed**: `New Jersey`,
  `near New York City`, `on the Hudson (River)` are now accepted (English + Bengali, redundant
  note removed); +4 regression tests (suite → **62**).

---

## Session — July 16, 2026 (per-question change-dates + regression tests)

Two follow-ups on the officeholder work above, both from user requests: pin down
exactly *when* each "may change" answer could go stale (not just "week of
interview"), and add regression tests so a future edit can't silently reintroduce
a wrong or unverified answer.

### Done

- **Every dynamic question's `note` now states its own re-check date**, sourced
  only from well-established facts (the 20th Amendment fixes Jan 3 for Congress
  and Jan 20 for President/VP — not something that needed a web check) or an
  honest "no scheduled date" where none exists (Chief Justice, justice count,
  Speaker). Table above summarizes all 9; full reasoning per-question is in the
  app's own `note` text, visible wherever the question appears (Flashcards,
  Quiz, Browse).
- **Added 20 regression tests to `tests.html`** (86 → 106), all in service of
  "no hallucinations, nothing low-confidence":
  - **`DYNAMIC_SNAPSHOT`** — locks in the exact accepted-answer array for all 9
    officeholder questions to the values verified July 16, 2026 against primary
    sources. If any of these 9 answers ever changes without a matching update to
    this snapshot (and a fresh SOURCES.md entry), the test suite goes red —
    can't silently drift.
  - **Change-date-documented check** — every `dynamic:true` question must have a
    `note` containing either a 4-digit year or the phrase "no scheduled/fixed
    change," so a future dynamic question can't ship without stating when to
    re-check it. Also asserts there are exactly 9 dynamic questions (catches one
    being added/removed without updating the snapshot).
  - **Bengali/English answer-count parity across all 100 questions** — every
    translated question's Bengali answer list must have exactly as many entries
    as English. This is the general-purpose version of the bug class that
    caused the Q17/Q47/Q23 mismatches found and fixed this session and last —
    now a permanent guard, not a one-time manual check.
- **Fixed the pre-existing Q17 Bengali mismatch** flagged last session: split
  the already-correct combined phrase "সিনেট ও প্রতিনিধি পরিষদ" into its two
  component parts (["সিনেট","প্রতিনিধি পরিষদ"]) to match English's two-part
  `need:2` answer — no new translation invented, just decomposed text that was
  already vetted and used elsewhere in the file for the same two words.
- **Verified:** 106/106 tests green; zero EN/BN answer-count mismatches across
  all 100 questions (checked live via `ALL_QUESTIONS` in-browser); all 9 dynamic
  notes confirmed present with a change-date; no console errors on Home/Browse.
  Sanity-checked the new snapshot assertion actually catches a wrong value (not
  a no-op comparison) before trusting it.
- **Committed, pushed, and deployed** to the Studio.

---

## Session — July 16, 2026 (unhid the 9 officeholder questions)

Closed out the last item on the pre-interview checklist that could be done today:
re-verified all 9 time-sensitive "current officeholder" answers against live
sources and unhid them, so she now studies the real, full 100-question set
instead of 91.

### Done

- **Re-verified all 9 `dynamic:true` answers** (President, VP, President's party,
  Supreme Court justice count, Chief Justice, Speaker, TX Senators, TX Governor,
  U.S. Representative). First pass was web-search-based; when asked "how do you
  know it's accurate," redid it by **loading each primary source directly**
  (uscis.gov's own "Check for Test Updates" page, supremecourt.gov, speaker.gov,
  senate.gov, gov.texas.gov, mccaul.house.gov, casar.house.gov) instead of
  trusting search snippets. All 9 are **accurate as of today, confirmed against
  primary sources**. Full source-by-source writeup in [SOURCES.md](SOURCES.md) →
  "Re-verification pass — July 16, 2026". Bonus finds from reading the USCIS page
  directly: it also states the **exact N-400 filing-date cutoff for 2008 vs 2025
  test** (before Oct. 20, 2025 → 2008 test, this app's coverage; on/after →
  2025 test) — resolves an open item below — and accepts **"James Michael
  Johnson"** (Speaker's birth name) as a third valid form for Q47, now added.
- **Flipped `HIDE_DYNAMIC` to `false`** — all 100 questions now appear in
  Flashcards, Quiz, Browse, and Mock Interview (previously 91). Updated the
  `CHECKED` badge date and footer/Interview-Day copy to July 16, 2026.
- **Flagged two answers as likely to go stale around the Nov 2026 election /
  Jan 2027 term start**, right in their in-app `note` text (so she sees the
  caveat wherever the question appears, not just in the docs):
  - **Q20 (TX Senator):** Cornyn/Cruz are correct *today*, but Cornyn lost his
    May 2026 GOP primary runoff to Ken Paxton — the new senator (from the Nov 3
    general, Paxton vs. Talarico) is sworn in January 2027.
  - **Q23 (U.S. Representative):** McCaul/Casar are correct *today* (unchanged
    from the existing redistricting note), but McCaul isn't seeking reelection,
    so TX-10 gets a new name starting January 2027.
  - The other 7 (President, VP, party, justice count, Chief Justice, Speaker,
    Governor) are stable at least through Jan 2027 — Speaker is the least certain
    of those, only if House control flips in the midterms.
- **Verified:** 86/86 `tests.html` still green; `QUESTIONS.length === 100` and all
  9 dynamic ids present in-browser; no console errors on Home/Browse; Home's
  category counts moved from Government 48→57 (91 total → 100 total) as expected;
  Browse renders the badge + updated note text correctly for Q20/Q23 (screenshot
  verified). Accessibility-lead signed off in advance as a content-only change (no
  new markup/ARIA/interaction) using the existing accessible rendering path.

### Not yet done

- Not committed, pushed, or deployed to the Studio yet — this session only made
  the local edit + verification. `git status`/`./deploy.sh` still pending.
- Per STATUS's own advice: do one more officeholder check **the week of the actual
  interview**, since Q20/Q23 are flagged above as likely to change once the Jan
  2027 term turnover happens.

---

## Session — July 15, 2026 (Mock Interview + surviving a Studio reboot)

Two independent pieces of work, same session: a new headline feature (a fully spoken
mock interview), and closing out the oldest unresolved ops item in this file — getting
the app, LM Studio, and a new speech-to-text server to survive a Studio reboot on their
own. The second piece turned into a real, hard-won debugging story; both are written up
in full in ARCHITECTURE.md and DEPLOY.md, so this entry tells the story and points there
for the mechanics.

### Mock Interview — she can now speak her answers, not just hear the question

The existing "Interview mode" quiz only ever solved half the problem: the officer's
question is read aloud, but she still had to type her answer, which isn't how the real
interview goes. **Mock Interview** is the other half — a hands-free, fully spoken
practice session:

- **Greeting and oath**, then **10 civics questions** — spoken by the app, answered out
  loud, graded the instant she stops talking. The round still honors the real officer's
  early stop (6 right = pass, 5 wrong = can't reach 6 — no point continuing).
- **A reading test** (read a sentence aloud) and **a writing test** (the officer reads a
  sentence, she types it — writing stays keyboard because it's handwritten on the real
  exam too).
- **A closing**, with the full result.
- A **Coaching / Realistic** choice up front: Coaching has the officer react after every
  question (best for learning); Realistic stays neutral until the very end, closer to
  the real nerves of the actual interview.

The most important design decision: **the grader didn't change at all.** Whatever she
says gets transcribed to text by a local speech-to-text engine, and that text is handed
to the exact same trust-tested matcher (§6, ARCHITECTURE.md) the typed quiz already uses
— so a transcription slip gets the same forgiving-but-honest treatment a typo already
does, including the same LLM second-opinion rescue for a near-miss. Speech recognition
runs **locally** (a `whisper.cpp` server on the Studio, chosen specifically for accuracy
on her accent over the browser's built-in speech recognizer, and for the same
zero-cloud privacy posture as the tutor) — nothing is sent anywhere outside the Studio.
If the mic is denied, or the server isn't reachable, she can always type instead; the
feature only appears when everything it needs is actually present, and the original
typed Interview mode is unaffected either way.

**Verified:** the whole ceremony driven end-to-end (auto-played through both a passing
and a failing round, and the reading/writing phases), Coaching vs. Realistic confirmed
to differ only in when the result is revealed, and a real spoken sentence round-tripped
through the whisper server and back correctly. 9 new unit tests for the speech-handling
math (voice-detection thresholds, audio encoding) — suite **86/86 green**.

### Getting the app, LM Studio, and whisper to survive a Studio reboot

This item has been sitting in "Remaining," worded almost identically, since the very
first session in this file — restarting the Studio meant restarting three things by
hand, in order, hoping nothing was forgotten. Fixed properly this time: all three now
run as **`launchd`** background services that start themselves the moment the Studio is
logged into, and restart themselves automatically if any of them ever crashes.
Tailscale needed nothing — it already keeps itself running as part of macOS, independent
of any of this.

**The hard part:** wiring the app itself (`node server.js`) into `launchd` didn't
produce an error — it produced something worse, a service that looked "running" forever
and simply never did anything. Tracked down with macOS's own process sampler, which
showed the exact same frozen line every single time it checked: Node's own startup code,
trying to determine its working directory, stuck in a system call that never returns.
The cause turned out to be a genuine, easy-to-never-notice macOS quirk: the app's files
lived in `~/Documents`, and `~/Documents` (like Desktop and Downloads) is one of the
folders macOS protects behind a permission prompt — normally you just click "Allow" once
and never think about it again, but a background service has no window to show that
prompt in, and instead of politely saying no, the system just **hangs forever** waiting
for an answer nobody can give. There was no setting, no configuration, no re-signing that
worked around this — the one real fix was moving the app's files somewhere other than
Documents, which is what happened.

**Verified — including a real, physical reboot, not just a simulated restart.**
Everything above was first proven by asking `launchd` to restart each service (a
faithful test of the supervision logic, but not of the very first moments after a cold
boot) — then a genuine full reboot of the Studio was triggered to settle the question
for real. Straight after that reboot (`uptime` showed **4 minutes**), with no manual
steps beyond the one required login: whisper and the app were both already `running`
(their process IDs were the very lowest on the freshly-booted system, meaning they
started almost immediately), LM Studio's one-shot job had already run and loaded the
model, and `/chat-status` reported everything healthy — checked both on the Studio
itself and from the Air over the exact Tailscale URL her phone uses. One thing a reboot
**can't** skip: this Studio has FileVault (disk encryption) turned on, so the very first
thing after any reboot is still someone entering the disk password and logging in
once — nothing macOS-side can run before that, `launchd` included. Everything from that
first login onward is now confirmed automatic.

---

## Session — July 15, 2026 (adversarial QA pass, pre-reliance)

A thorough, assume-there-are-bugs QA of the whole app before my wife relies on it.
Drove every view in a real browser, stress-tested the grader far beyond the suite,
exercised the reward/persistence logic, spot-checked content, and flip-tested
`HIDE_DYNAMIC`. **One real grading bug found and fixed; suite grown 52 → 58, all
green.** Everything else verified working. (Ran on top of the concurrent iOS
focus-outline CSS commit — that change is cosmetic and untouched here.)

### Fixed

- **[Medium — grading false-negative] Apostrophe answers were marked wrong when the
  apostrophe was omitted.** `normalizeText` replaced apostrophes with a *space*, so a
  mid-word possessive/contraction split into a stray one-letter token
  (`"New Year's Day"` → `new year s day`, 4 tokens). Because whole answers are matched
  as fixed-length token windows, the natural ESL spelling changed the token count and
  never matched. Repro (before → after the fix):
  - **Q100** `christmas and new years day` → **1 of 2 (WRONG)** → **2, Correct ✓**
  - **Q42** `give a drivers license` → 0 → Correct ✓ (`driver's license`)
  - **Q77** `fought for womens rights` → 0 → Correct ✓ (`women's rights`)
  - **Q48** `you dont have to pay a poll tax to vote` → 0 → Correct ✓ (`don't`)
  - Also latent for Q25 (`state's`), Q61 (`didn't`), Q68 (`Richard's`).
  - **Fix:** delete apostrophes (`/['’]/ → ""`) *before* the other punctuation is
    space-replaced (`index.html` `normalizeText`, one line). Validated: all 52 prior
    assertions stay green, the apostrophe form still works, and a full false-positive
    battery (dup states, both Carolinas, bare tokens, `"life liberty life"`) shows **no
    inflation** — the change only ever *joins* characters, never splits. Added 6
    regression assertions to `tests.html` (now **58/58 green**). One pre-existing
    same-answer collision noted (Q57 `18`) is unrelated and harmless.

### Noted — not fixed (judgment calls, your decision)

- **Bare-phrase omission (Low).** `drivers license` / `womens rights` (dropping the
  lead-in `give a` / `fought for`) still score 0 — this is *not* the apostrophe bug;
  it's the matcher requiring the full phrase. Making it lenient risks false positives,
  it's `need:1` with easier alternatives, and the `/grade` LLM upgrade catches it when
  the tutor is online. Left as-is; say the word if you want partial-phrase credit.
- **Q95 Statue of Liberty (Info).** The app accepts `New York (Harbor)` / `Liberty
  Island` but omits USCIS's bracketed alternates (`New Jersey`, `near New York City`,
  `on the Hudson (River)`). Not wrong — just fewer accepted forms.

### Verified working (no issues)

- **Grader (the trust-critical part).** The two-pass exact-first + `exactForms` matcher
  introduced **no false positives**: both-Carolina, duplicate-state, `need:2`/`need:3`,
  no-punctuation, and comma/"and"-inside-answer cases all count correctly; single-answer
  typo tolerance intact. **Q17 (`need:2`)** behaves right on the quiz hint, reveal,
  announce, and score list.
- **Reward system.** Mastery transitions New→Learning→Mastered (streak ≥ 2) and back;
  every surface agrees (home ring/bars/legend, flashcard "N mastered", readiness).
  Milestones fire **exactly once** and never re-pop (10/50/all, each category, all
  stars, first-pass, read-all); mastering the first 50 also completes Government
  (correct — it's the first-listed category). Readiness binomial is sane and never
  alarming (0 % → p 0.001 "Not yet"; 50 % → 0.54 "Almost"; 75 % → 0.94 / 100 % → 1.0
  "You're ready"). Personal-best only increases. **Degrades cleanly with empty/cleared
  localStorage** (hero "0 of 91", quest "0 of 91 read", "⭐ 0 mastered").
- **Every view** drives correctly in-browser with **zero console errors**: Flashcards
  (flip/self-rate/Bengali/emoji), Quiz (partial highlight `✓ You gave this:`, streak
  pips, reveal art + Bengali, override), Interview mode, Interview Day (reading +
  writing drills accept/reject correctly), Browse, Home hero.
- **Tutor path.** `server.js` starts clean; `/chat-status` enabled; `/chat` and
  `/grade` return a graceful **502** with LM Studio offline (no LM Studio in the QA
  env), and `tutorEnabled` is false under `python3 -m http.server`, so file/static use
  never calls them. Upgrade-only `/grade` flip logic and race guards read correct.
- **Content.** 18-question spot-check matches the official 2008 USCIS list (incl.
  Juneteenth in Q100); all 13 inline-SVG art mappings fit their question (Constitution
  scroll → Q1/5, Capitol → Q13/94, flag → Q52/96, star → Q97, ship → Q58, maple leaf →
  Q92-Canada, quill → Q62, fireworks → Q99, ballot → Q27, Lady Liberty → Q95).
- **`HIDE_DYNAMIC` flip-test.** Set to `false` locally: Browse rendered **100
  contiguous ids (1–100, no gaps/dups)**, all **9 officeholder questions** present with
  their Bengali panels and "may change" badges (Government 57 / History 30 / Civics 13).
  **Reverted to `true`** — final committed state is 91 active, 58/58 tests green.

### Enhancements added this session (after the bug fix)

- **More illustrations (13 → 23 questions).** Added **8 new inline SVGs** to
  `ANSWER_ART` as ESL visual study aids, chosen where the picture maps to *the answer*:
  Q41 dollar bill (print money), Q44 **Texas flag + lone star** (Austin), Q56 calendar
  (April 15 tax day), Q72/73/78 crossed swords (a war / Civil War — one shared SVG),
  Q88 winding river (Mississippi/Missouri), Q91 palm island (US territory), Q93 saguaro
  cactus (Mexico-border states, mirroring the 🍁 for Canada), Q98 musical notes (the
  anthem is a song). Same decorative contract as the shipped 13 — `aria-hidden` +
  `focusable="false"`, no role/title, flat/id-free (so the aliased strings can't collide
  when Browse renders them all at once), answer text still teaches. Abstract/process
  questions and people (Washington, Lincoln) deliberately left emoji/text. Verified each
  renders large and inline on Browse. *Optional next: oceans (Q89/90) could get a coast
  map — left out to avoid noise.*
- **Per-question "Ask the tutor" in Browse.** Each question gets a quiet navy-outlined
  **`💬 Ask about this`** disclosure that expands an inline chat scoped to that question,
  **reusing the shipped `chatWidget(host, {q,a,note}, history)`** (same widget as
  Flashcards/Quiz). Shown **only when the tutor server is reachable** (`tutorEnabled`,
  revealed by `tutorInit`); absent under static hosting. One delegated listener (matches
  the bn/read-toggle pattern). Per the accessibility-lead review, applied three real
  functional fixes beyond the Bengali-toggle precedent (which the text-only bn panel
  never needed): **(1)** scoped panel id `chat-browse-<id>` so `aria-controls`/
  `getElementById` can't resolve to a `bn-<id>` or a fixed tutor host; **(2)** the chat
  widget is **built once** (a `dataset.built` guard) so re-opening preserves the
  conversation and doesn't re-steal focus; **(3)** on collapse, focus is pulled back to
  the toggle if it was inside the panel, so a click-collapse never drops focus to
  `<body>`. Verified online (node server, LM Studio offline): buttons reveal, panel opens
  with focus in the input, send degrades gracefully to the friendly "tutor isn't
  answering" message, collapse restores focus, reopen keeps the conversation. **58/58
  tests still green; no console errors.**

### Progress meter — honest readiness + reset (she flagged "false progress")

The Home ring/readiness was filling from **self-assessment**, not just real testing:
`recordResult`/`overrideToCorrect` were called from the flashcard "I knew it" rating and
the quiz "My answer was actually right" self-override, so flipping cards or self-declaring
inflated the mastered ring and readiness meter. Reworked per her decisions:

- **Tested-only mastery.** `stats` (→ ring + readiness + weak-spots) is now written **only
  by real graded quiz answers** — the checker (`gradeAnswer`) or the tutor's second opinion
  (`requestSecondOpinion` → `overrideToCorrect`). Removed the mastery writes from the
  flashcard rating (`rateCard`) and the manual quiz override (which now counts for the
  round's score only, relabeled "Counted for this round ✓"). So readiness now means real
  readiness — no false confidence for test day.
- **Separate flashcard self-review.** New `civics-selfreview-v1` Set, fed by the flashcard
  "I knew it" / "Show me again" buttons, shown **only on the Flashcards screen** — the deck
  header now reads "👍 N of M marked known (self-check, not a test)". Keeps the flashcard
  sense of progress without touching the exam meter.
- **Reset progress.** A quiet two-step control on the Home hero (`role="alert"` confirm,
  focus moves to "Yes, reset") that clears tested mastery, the flashcard self-review, and
  the mastery-derived milestone flags (so they can be re-earned). **Keeps** the Browse read
  quest (`civics-read-v1`) and the personal-best score (`civics-best-v1`).
- **New localStorage key:** `civics-selfreview-v1`.
- **Verified:** flashcard "I knew it" ×2 on 10 cards → Home stays **0 / 0%** while the
  flashcard counter shows "👍 10 of 91 marked known"; quiz-mastering 10 → Home moves to
  **10 / 2%**; reset (via the real button) → mastery + self-review cleared, read-quest and
  best score kept, confirm collapses. 58/58 tests green; no console errors.

### Visual coverage → 100/100, per-answer emoji, and emoji→SVG upgrades

- **Every question now has a mark (100/100, 33 art + 67 emoji).** Filled the blanks with
  **thematically-consistent** emoji (reused by theme the way ⚔️/🎖️/🌊 already were: 🏛️
  Congress/offices, 🗓️ "how many years", 🗳️/🙋 civic participation, 👥 representation, 💼
  the Cabinet, etc.). The four hard-history questions now carry **respectful** marks (owner's
  call — "educational, if it helps us remember an important event, do it"): ⛓️ slavery (Q60)
  and its role in the Civil War (Q74), 🕊️ Emancipation/freedom (Q76), 🕯️ memorial candle for
  9/11 (Q86).
- **Per-answer emoji** on the list questions where each item has an obvious icon
  (`ANSWER_ITEM_EMOJI` → `answersHTML` + the flashcard list): **Q100 holidays** (🎉 New Year's,
  ✊ MLK, 🎩 Presidents', 🎖️ Memorial, 🕊️ Juneteenth, 🎆 Independence, 🛠️ Labor, 🧭 Columbus,
  🎗️ Veterans, 🦃 Thanksgiving, 🎄 Christmas), plus **Q6 / Q9 / Q51** rights. Placement checked
  with the accessibility-lead so the partial-answer highlight still announces "You gave this:
  <answer>" cleanly (decorative emoji sits first, inside `<strong>`, all `aria-hidden`).
- **Emoji → SVG upgrades where the SVG is genuinely better:** a new **scales-of-justice** SVG
  reused across the law/justice cluster (Q12/14/37/38/40), the existing **ballot-box** art
  reused for voting (Q48/49/50/54), and the **scroll** for Q66. Left the two-party question on
  its 🐘🫏 emoji — a 48px donkey+elephant silhouette would look worse than the emoji, so SVG
  is *not* better there. All new/ reused SVGs stay flat + id-free (safe to repeat on one page).
- Verified: 100/100 coverage, scales/ballot/scroll render, Q100 & Q6 per-answer emoji render in
  Browse, no console errors, **58/58 tests green**. New `⛓️/🕊️/🕯️` and per-answer glyphs
  confirmed single-glyph (dropped `⛓️‍💥` broken-chain — it fell back to double-width).

## Session — July 15, 2026 (post-launch: deploy verify + iOS focus-outline fix)

Merged the full M1–M8 + EMO-3 work to `main` and pushed. Deployed live (tailnet,
Mac Studio) and smoke-tested the running site, then fixed one visual nit reported
on her phone.

### Done

- **Merged + pushed** the reward-system/visuals branch to `main` (`origin/main`).

- **Live smoke test** of the tailnet deployment (`http://100.x.x.x:8321`):
  deployed `index.html` is **byte-identical** to the committed file (md5 match);
  `/tests.html` runs **52/52 green on the live server**; all six views load; the
  EMO-3 flag SVG renders; the home hero + readiness meter render; `/chat-status`
  reports `qwen2.5-7b-instruct`; and the live `/grade` LLM upgrade path returned
  `{acceptable:true, matched:2}` in ~0.5 s for a paraphrase. (Screenshots/console
  reads are blocked on the tailnet origin by the in-app browser; scriptable checks
  covered it.)

- **iOS Safari focus-outline fix.** On view/state changes the app moves focus to a
  non-interactive heading (`tabindex="-1"`) for keyboard/scroll flow; iOS Safari then
  draws an outline around that title after a *tap*, which read as a stray box (e.g.
  tapping the Quiz card). Suppressed the ring on **all** `tabindex="-1"` focus anchors
  — the 6 view headings **and** the quiz `score-heading` / `early-heading` (`h3`).
  Real interactive controls (answer input, Next/Back buttons, flashcard flip button,
  interview inputs) are untouched and keep their `:focus-visible` ring. Rule is
  attribute-based (`[tabindex="-1"]:focus`) so future focus anchors inherit it.
  Aligned with the project's beauty-first, single-touch-user preference. 52/52 tests
  still pass. Commits `84f2464` (h2 headings) → `316a97e` (broadened to all anchors).
  **Needs a redeploy** on the Studio to reach her phone (DEPLOY.md one-liner).

## Session — July 15, 2026 (the delightful release: ROADMAP M5–M8)

Completed the remaining reward milestones — the full ROADMAP M1–M8 track is now
done. **All 52 grading/mastery assertions still pass**; every new surface verified
in the browser (no console errors). This is the "delightful" release cut-line.

### Done

- **M5 — Quiz, one coherent pass.** The pass confetti + husband-voice love notes
  already existed; added the rest:
  - **BN-QZ:** the accepted-answers reveal (both the live reveal and the partial
    re-render) now carries the Bengali disclosure via a shared `quizRevealHTML(q,
    highlight)` helper, scoped `bn-qz-<id>` so it never collides with Browse
    (`bn-<id>`) or Flashcards (`bn-fc-<id>`).
  - **EMO-2·quiz:** decorative `aria-hidden` emoji on the reveal (reuses
    `ANSWER_EMOJI` + the `.answer-emoji` style).
  - **RW-QUIZ:** in-round **streak pips** ("●●● 3 in a row 🔥" — dots decorative,
    "N in a row" real text) shown from a run of 2+, and a **personal-best** line on
    the score screen (`civics-best-v1`), announcing "New personal best" politely.
    Focus already lands on the score heading; confetti already gated on
    `prefers-reduced-motion`.

- **M6 — Milestone celebrations.** A non-modal, dismissible card (per the a11y
  contract — **not** a focus trap, doesn't steal focus, visible "Thanks ❤" dismiss,
  generous 12s auto-dismiss, announced once). Fires once each (remembered in
  `civics-milestones-v1`) for: **10 / 50 / all** mastered, **category complete**
  (×3), **all starred questions** mastered, and **first quiz pass**. Copy is in the
  husband's voice with a `lang="bn"` Bengali endearment. Hooked into `recordResult`
  / `overrideToCorrect` (mastery events) and `renderScore` (first pass). Verified:
  pops only on the true crossing, doesn't re-fire, dismiss works, host has
  `pointer-events:none` so it never blocks the page.

- **M7 — Browse, one coherent pass.**
  - **B-NUM:** each item now shows its **real `q.id` as text** ("Question 21") in a
    badge, in a `<ul>` — so hidden dynamic questions no longer shift the visible
    numbers (the old `<ol start>` auto-numbered by position and skipped the gaps).
    Verified under `HIDE_DYNAMIC=true`: Q19 is followed by **Q21** (Q20 hidden),
    and Q20/Q23 are absent. With `HIDE_DYNAMIC=false` the ids are contiguous by
    construction.
  - **RW-BROWSE:** a **"X of 91 read" quest tracker** (bar + text) at the top;
    each question has a "Mark as read ○ / Read ✓" toggle (`aria-pressed`), and
    **opening a question's Bengali panel also marks it read**. Persisted in
    `civics-read-v1`. A one-time "read them all 📚" celebration at 100%. Increments
    are silent (ambient); only completion celebrates.
  - **EMO-2·browse:** decorative `aria-hidden` emoji in the list.

- **M8 — Readiness meter (capstone).** On the Home hero: estimates the mock-interview
  pass chance — per-question odds keyed to mastery (mastered .97 / learning .55 /
  new .15), then the binomial tail P(X≥6 of 10). Shown as a staged, reassuring
  status — **"Not yet — keep going" → "Almost there" → "You're ready"** — with a
  decorative (`aria-hidden`) meter and a gain-framed "you'd reach 6 about N times
  out of 10" line (only shown once it's encouraging, ≥50%). Per the
  cognitive-accessibility contract: no raw percentage as the accessible name,
  present-tense/next-action phrasing, never a guarantee.

- **Accessibility:** one consolidated `accessibility-lead` consult for the M5–M8 UI
  contract (confetti/pips/celebration announce + focus; non-modal celebration card;
  Browse real-id-as-text + silent quest; readiness as staged text not a bare number).
  Advisory/beauty-first per project preference; must-fix items applied.

- **New localStorage keys:** `civics-best-v1` (personal best), `civics-milestones-v1`
  (fired milestones), `civics-read-v1` (Browse read set) — all alongside the existing
  `civics-stats-v1`.

- **Verification:** `tests.html` **52/52 green**; full quiz round (reveal emoji +
  `bn-qz` Bengali, "●●● 3 in a row", "New personal best — 10 of 10", confetti,
  first-pass milestone); milestone fire-once/dismiss/no-reblock; Browse gap
  numbering + quest increment on read-toggle and Bengali-open; readiness staged
  correctly at 0 / mid / full mastery; every view switches with no console errors.

- **EMO-3 — inlined images (self-authored SVG).** Added 10 clean, decorative inline
  SVG illustrations covering 13 iconic, picture-able questions (flag → Q52/96, Lady
  Liberty → Q95, Capitol dome → Q13/94, Constitution/Bill-of-Rights scroll → Q1/5,
  fireworks → Q99, ballot box → Q27, quill → Q62, single star → Q97, sailing ship →
  Q58, maple leaf → Q92) in an `ANSWER_ART` map. Chosen over sourced public-domain
  photos (the ROADMAP's literal wording) by the user: self-authored SVG is tiny
  (**+2 KB gzipped**, vs ~150–300 KB for photos), fully offline, and licensing-free.
  A `answerArt(id)` helper feeds all three answer-side surfaces (flashcard, quiz
  reveal, Browse) — where art exists it **replaces** the emoji (one decorative mark
  per question); questions without art keep their emoji. Per the accessibility
  contract every SVG is `aria-hidden="true"` + `focusable="false"` with no role/title,
  so it's invisible to assistive tech and the accepted-answer text remains what
  teaches. Verified: art renders on all three surfaces, emoji fallback intact
  (e.g. Q6 🗣️), 52/52 tests still green, no console errors. Optional future upgrade
  to real PD photos is noted in ROADMAP.

### Not yet done

- The whole ROADMAP M1–M8 feature track **and** the optional EMO-3 visuals are
  complete. Remaining work is only the **time-gated track** (unhide the 9 dynamic
  officeholder questions + re-verify near the interview; TX-district Q23 after Nov
  2026; a fluent-Bengali review absorbing BN-FIX).

## Session — July 15, 2026 (correctness + reward foundation: ROADMAP M1–M4)

Implemented the first four ROADMAP milestones. **All 52 grading/mastery assertions
pass** (`tests.html`); verified end-to-end in the browser. Cut-line reached: the
"M1→M4" release (correct grading + real sense of progress + livelier Flashcards).

### Done

- **M1 — Correctness foundation (grading fixes).**
  - **G1 (Q64 false positive).** `matchedIndices` was a single greedy token-window
    sweep, so on "name three of the 13 states" a correctly-spelled `"south carolina"`
    could be spent as a *typo* of `"north carolina"` (they differ by exactly the
    2-edit tolerance) — typing one Carolina twice scored 3. Rewrote it as **two
    sweeps**: an exact-only pass claims perfectly-spelled answers first, then a
    typo-tolerant pass fills near-misses on the leftover tokens, with a guard that a
    window which is *itself* an exact official answer is never lent to the typo pass.
    Before → after: `"south carolina, south carolina, georgia"` on Q64 went from
    **count 3 → CORRECT (wrong)** to **count 2 → not correct (right)**.
  - **G2 (Q17 false negative).** Remodeled Q17 from one combined answer string
    (`"the Senate and House (of Representatives)"`) to `a:["Senate","House (of
    Representatives)"], need:2`. Before → after: `"the Senate and the House"` went
    from **count 0 → WRONG** to **count 2 → CORRECT**. `"Senate House"` (no
    punctuation) now also scores 2; `"Senate"` alone is 1 of 2.
  - **Tests.** Added the new grading cases and updated the two existing Q17 rows the
    data change forced. Suite 42 → 47 assertions, all green. No UI touched.

- **M2 — Mastery engine (the reward data spine).** Derived from the existing
  `stats[id]` `{c,w,streak}`, no new storage: 🌱 **New** (untried) → 📖 **Learning**
  (tried, not yet right twice) → ⭐ **Mastered** (`streak >= 2`, the same rule that
  clears a weak spot). Each level is defined as **icon + text label** in one place
  (`MASTERY`) so every surface shows shape + words, never colour alone. Helpers:
  `masteryFromStat` / `masteryOf` / `masteryCounts`. Verified by 5 new `tests.html`
  assertions (suite now 52).

- **M3 — Flashcards, one coherent pass** (answer panel):
  - **Self-rating** after a flip — "I knew it ✓" / "Show me again" — feeds M2.
    "Show me again" records a miss and re-queues the card to the back of the deck so
    it comes around again this session. Per the accessibility contract, focus moves
    to the (now-collapsed) card button so the next question is read, and only a terse
    result ("Marked as known." / "We'll show that one again.") goes to the live region.
  - **Bengali** disclosure (`bnPanelHTML`) on the **answer side only**. Gave the panel
    ids a scope (`bn-fc-<id>`) so a flashcard's Bengali toggle no longer collides with
    Browse's `bn-<id>` (both views live in the DOM at once).
  - **Emoji** — a decorative, `aria-hidden` answer-side emoji for ~49 concrete
    questions (`ANSWER_EMOJI`); abstract/solemn questions left plain.
  - Deck header shows "⭐ N mastered".

- **M4 — Home "Path to Citizenship" hero.** Replaced the plain progress text with a
  mastered **ring** (SVG, decorative/`aria-hidden`) + **per-category bars** + warm
  copy + a 🌱/📖/⭐ legend. Every value has a real text equivalent ("18 of 91
  questions mastered", "18 of 48 mastered" per category); the hero is deliberately
  **not** a live region, so a rating elsewhere updates it silently without clobbering
  the rating announcement. The weak-spot retry prompt is preserved.

- **Accessibility:** consulted `accessibility-lead` once to unlock the edit gate
  (M1, logic-only) and once for the M3/M4 UI contract (focus/announce for the
  self-rating flow; ring/bars as text-equivalent decoration; unique Bengali ids).
  Advisory/beauty-first per project preference; the two focus-loss cases it flagged
  are handled (the deck is circular, so there's always a next card to focus).

- **Verification:** `tests.html` **52/52 green**; flip → emoji + Bengali (`bn-fc-1`,
  Browse's `bn-1` untouched) + rating; rating records mastery, advances, moves focus;
  hero ring/bars/legend/copy correct at 0, mid, and full progress; no console errors.

### Not yet done (next per ROADMAP)

- **M5** Quiz pass (Bengali on reveal + pass confetti/streak + emoji), **M6**
  milestone celebrations, **M7** Browse pass (B-NUM numbering + 100-read quest +
  emoji), **M8** readiness meter. Paused here at the M4 cut-line for review.

## Session — July 15, 2026 (Bengali support)

### Done

- **Tutor replies are now bilingual — English first, then Bengali.** `server.js` system prompt
  asks for the English answer, a blank line, then the same answer in simple Bengali. `index.html`
  renders assistant bubbles through `bengaliHTML()`, which wraps Bengali-script runs in
  `<span lang="bn">` (WCAG 3.1.2) so screen readers switch voice; English stays bare. The model's
  Bengali is understandable but sometimes stiff — the existing "tutor can make mistakes" note covers it.

- **Bengali translation for every question + its answers, on an expand button (Browse).** All 100
  questions and their answers are pre-translated (stored in `BN_TRANSLATIONS`, merged onto
  `ALL_QUESTIONS` as `qbn`/`abn`/`bnNote`). Each question in Browse has a "বাংলা দেখুন / Show in
  Bengali" disclosure revealing a `lang="bn"` panel with a Bengali disclaimer (**AI-made, may not
  be exact; the English answer is final**), the Bengali question + answers, and — for 15 flagged
  items — an English "Translation note" (e.g. "We the People" kept in English for the interview;
  Cabinet-title nuances). Translations came from parallel subagents with a shared civics glossary,
  then validated (all 100 present; every Bengali answer count matches English). Proper nouns
  (names, US states, tribes) intentionally kept in English. Accessibility contract from the
  accessibility-lead. Verified in-browser; 42/42 grading tests still pass.

- **Caveat:** the Bengali is an AI-assisted **study aid, not official** and not professionally
  reviewed — disclaimers are shown in-app (see [SOURCES.md](SOURCES.md)). The 9 dynamic officeholder
  questions are still hidden in Browse (`HIDE_DYNAMIC`), but their Bengali is in the data and will
  appear when they're unhidden.

- **Possible follow-ups:** add the Bengali expand to the Flashcards view too (Browse has it now);
  have a fluent Bengali speaker review the 100 translations before relying on them.

## Session — July 14, 2026 (content QA + multi-answer grading)

### Done

- **Full accuracy QA against official USCIS sources.** Verified all 100 questions
  (see [SOURCES.md](SOURCES.md) → "Re-verification pass"). Split into two passes:
  - *Static set (91 questions):* re-diffed against the official USCIS 100-questions page.
    **One correction — Q100 "Name two national U.S. holidays" was missing Juneteenth**
    (USCIS added it after it became a federal holiday in 2021). Added. Everything else —
    wording, accepted answers, and all 20 asterisk (65/20) flags — matches verbatim.
  - *9 officeholder answers:* re-confirmed current against primary .gov sources
    (senate.gov, clerk.house.gov, whitehouse.gov, supremecourt.gov, gov.texas.gov,
    speaker.gov). All still correct as of July 14, 2026.

- **Multi-answer questions now enforce the required count.** Previously the quiz accepted
  **one** answer for every question — too lenient for the "name two/three" questions. Added
  a `need:N` field (default 1) to the 6 questions that require more:
  **Q9, Q36, Q51, Q55, Q100 → 2; Q64 → 3.** Q17 is unchanged (its official answer is the
  single combined string "the Senate and House"). Implementation in `index.html`:
  - `matchCount(input, q)` counts **distinct** official answers satisfied (matched whole,
    never split on comma/"and", because official answers contain both — e.g. "Martin Luther
    King, Jr. Day", "Secretary of Health and Human Services"). `isCorrectAnswer` returns
    `matchCount >= (q.need || 1)`.
  - `renderQuizQuestion` shows a "Name two…" hint tied to the input via `aria-describedby`,
    only when `need > 1`. Single-answer questions are visually and behaviorally unchanged.
  - `gradeAnswer` shows partial feedback ("Almost — you gave 1 of 2…") and announces the
    count to screen readers.
  - Reviewed by accessibility-lead + forms specialist before implementation, per project rules.

- **ESL-friendly grading: tolerant of typos AND missing punctuation.** Rewrote `matchCount`
  as a token-window matcher: the input is tokenized (word list), then accepted answers are
  greedily matched against consecutive token windows, longest first, each answer and each word
  claimed at most once. This handles all four combinations for the "name two/three" questions —
  with or without commas, with or without typos: `life, liberty` / `life liberty` /
  `life liberti` / `life, liberti` all score 2, while `life life` scores 1. Because whole
  answers are matched as token windows (not by splitting the input), answers that themselves
  contain a comma or "and" (e.g. "Martin Luther King, Jr. Day", "Secretary of Health and Human
  Services") are never mis-split. Single-answer typo tolerance is preserved and now applies to
  whole phrases (`the consitution` → correct). Tolerance scales with answer length (0 edits for
  ≤4 chars, 1 for ≤7, 2 for longer) — generous but bounded, so near-identical answers stay
  distinct (e.g. "north carolina" vs "south carolina", which differ by 2 edits, don't collide
  because exact matches are claimed first).

- **LLM second opinion on wrong answers (upgrade-only).** When the string-matcher marks an
  answer wrong AND she typed something, the app asks the local LLM for a semantic check via a
  new `POST /grade` endpoint in `server.js`. It grades ONLY against the official accepted answers
  (grounded, so it can't accept merely-true facts), returns `{acceptable, matched, why}`, and the
  app flips "Not quite" → "The tutor accepted your answer ✓" if accepted — updating the score and
  weak-spot stats. It **only upgrades, never downgrades**, and the accepted-answer list is always
  shown regardless, so no grader can hide the right answer from her. Catches typos and paraphrases
  the algorithm misses (e.g. "you can say what you want and gather in groups" → freedom of speech +
  assembly = 2). Graceful degradation: if the tutor is disabled/offline/slow, the spinner silently
  disappears and the algorithm verdict stands (verified: `/grade` returns 502 when LM Studio is
  down, and `tutorEnabled` gates the call so file:// use never tries). UX is "Option A": a
  `Double-checking your answer…` spinner shows inline (~6–14s; the flip is optional — she can hit
  Next anytime to skip it). Accessibility contract from the accessibility-lead: pending state is
  `aria-busy` on `#quiz-verdict` (not announced, to avoid clobbering the just-spoken verdict), the
  flip is announced politely without moving focus, `prefers-reduced-motion` disables the spinner
  animation, and race guards (token + `contains` + still-`.verdict-bad`) prevent a late response
  from mutating the next question. Model note: this thinking model always emits ~1000 reasoning
  tokens, so `max_tokens` must be 2000 or the JSON comes back truncated/empty.

- **Partial-answer highlight.** On a partial "you gave 1 of 2" result, the accepted-answers list
  now marks WHICH ones she gave — bold with a ✓ (aria-hidden) plus a `.visually-hidden` "You gave
  this:" prefix for screen readers (per the accessibility-lead: shape + hidden text, not color/
  weight alone; WCAG 1.4.1). Only on partial — fully wrong (0) or fully correct marks nothing.
  `matchedIndices(input, q)` exposes the matched set; `answersHTML(q, highlight)` renders the marks.

- **Verification:** 42 grading assertions pass (multi-answer counts, dedupe, comma/"and"-in-answer
  edge cases, per-fragment and whole-phrase typo tolerance, no-punctuation input, and matched-index
  sets for the highlight) plus a live in-browser UI check through the real `gradeAnswer` flow. Committed as a one-click runner: serve
  the folder and open **`/tests.html`** — it loads the real `index.html` in an iframe (cache-busted)
  and checks the actual shipped grading functions (no duplicated logic), printing PASS/FAIL and
  stamping the tab title. Re-run it after any change to the questions or grader.

- **Docs:** added QA-GUIDE.md (manual test pass) and tests.html (automated grading check),
  updated SOURCES.md (re-verification log) and this STATUS entry.

### Outstanding / next

**Fixed after deploy**
- **Tutor/grading were slow (~8–14s) → now <1s: switched to a non-thinking instruct model.**
  Diagnosed the slowness as hidden reasoning, not throughput — the model runs at ~100 tok/s, but
  `qwen/qwen3.6-35b-a3b` emits ~1000 "thinking" tokens before every short answer, and no API lever
  (`reasoning_effort`, `/no_think`, `enable_thinking`) reliably disabled it. Reasoning helps hard
  multi-step problems; for simple civics retrieval it's pure overhead (and can cause "overthinking"
  errors). Loaded **`qwen2.5-7b-instruct`** (MLX 4-bit) in LM Studio and pointed `server.js` at it
  (`LLM_MODEL` default). Verified over the tailnet: tutor ~0.4–1.5s, grading all test cases correct
  (typo→2, paraphrase→2, one-only→1, wrong→0, misspelled-3-states→3) at ~0.3s each — ~10–20× faster
  with no accuracy loss. Right-sized `max_tokens` (chat 1000, grade 300) since there's no reasoning
  to clear; the earlier 4000 bump for the "got lost thinking" empty-reply is now moot (that was a
  reasoning-model artifact). Chose instruct over Qwen2.5 for strong Bengali + JSON following; picked
  it over reasoning/coding models (Ornith, Qwen3-thinking) which are the wrong tool for this task.
  **Deployed and live-verified July 15, 2026:** `/chat-status` reports `qwen2.5-7b-instruct`, live
  tutor reply ~0.5s, live `/grade` paraphrase upgrade ~0.3s. Full model-choice rationale/knowledge
  is written up in [DEPLOY.md](DEPLOY.md) → "Why a non-thinking instruct model".

- **Tutor "Sorry — I got lost thinking" on some flashcards.** Root cause: this model spends
  ~1000 hidden reasoning tokens before answering, and on some questions that ran past the tutor's
  2000-token `max_tokens` ceiling, leaving `message.content` empty → the fallback message. Raised
  the tutor ceiling to 4000 in `server.js` (no latency cost — the model stops when done, not at
  the cap; verified reasoning self-limits to ~1000–1100 regardless of the ceiling). `/grade` keeps
  2000 (its grading reasoning is ~800–1000 and it degrades safely to "no upgrade" if it ever
  truncates), but it shares the same latent pattern if grading prompts get longer.

**Content accuracy**
- **Re-verify Q23 (U.S. Representative) after the Nov 2026 election.** Texas's 2025
  redistricting takes effect only with that election (new members seated Jan 2027) —
  McCaul (TX-10) and Casar (TX-35) remain the *sitting* reps now. But McCaul announced
  (Sept 2025) he will not seek reelection, and Manor's district lines/numbering may shift
  under the new map. Confirm her exact address → district when the time comes.
- Re-run the officeholder verification (§ dynamic answers) the week of the interview; they
  are the only answers that go stale.

**Could do further (optional, not blocking)**
- Consider whether to require **both** parts for Q17 explicitly (currently one combined
  answer string) — low priority; USCIS accepts the combined answer.
- Optional visible "how many needed" affordance beyond the text hint (e.g. a subtle "×2"
  chip) — deferred to keep the UI clean.

## Session — July 14, 2026

### Done

- **Client access diagnosed (Problem 1).** The server was reachable the whole time —
  from the MacBook Air over the tailnet, both `http://100.x.x.x:8321` and the
  MagicDNS URL returned HTTP 200. The "can't open it" symptom was device-side. On the
  device that failed, the **IP URL worked and the MagicDNS name did not → MagicDNS was
  off on that device.** Resolution: use `http://100.x.x.x:8321` (IP form), typing
  `http://` explicitly so the browser doesn't upgrade to https. This is the URL to use
  on the phone.

- **Tutor chat 502 fixed (Problem 2).** `POST /chat` was returning 502. Root cause was
  two stacked issues (see DEPLOY.md → "Tutor 502 root cause"):
  1. LM Studio was bound only to the LAN/tailnet interface, not loopback. Fixed by
     enabling **Serve on Local Network** and restarting LM Studio's server —
     `curl localhost:1234/v1/models` on the Studio now returns 200.
  2. `localhost` can resolve to IPv6 `::1` on Node 18+. Fixed by defaulting server.js
     to `http://127.0.0.1:1234` (explicit IPv4) — `server.js`.
  Verified end-to-end from the MacBook Air: page loads, `/chat-status` enabled, and a
  real `POST /chat` returned a correct, grounded tutor reply.

- **Hid the 9 time-sensitive "officeholder" questions from study.** The questions
  flagged `dynamic:true` (President, VP, Governor, both TX Senators, U.S.
  Representative, Chief Justice, Speaker, President's party, # of Supreme Court
  justices — ids 20, 23, 28, 29, 39, 40, 43, 46, 47) are now filtered out of every
  study mode. Implementation in `index.html`: the master array is `ALL_QUESTIONS`; a
  `const HIDE_DYNAMIC = true` flag derives the active `QUESTIONS = ALL_QUESTIONS.filter(...)`.
  Flashcards, quiz, weak-spots, per-category stats, and Browse all read `QUESTIONS`, so
  all show **91** questions. Copy updated: home card "Read all the questions and
  answers." and browse heading "All Questions". Verified in-browser: 0 of the 9 appear
  anywhere, quiz pool has 0 dynamic, counts sum to 91 (Government 48 / History 30 /
  Civics 13).

- **DEPLOY.md** updated: clean start command (no override needed), root-cause writeup,
  client-access/MagicDNS note.

### Outstanding

**Bugs / risks**
- **`HIDE_DYNAMIC` must be flipped back before the interview.** Set `HIDE_DYNAMIC = false`
  in `index.html` once the 9 officeholder answers are re-verified near the interview
  date — they ARE on the real test, so she needs to study them eventually. This is the
  single most important follow-up.
- **Officeholder answers need re-verification near the interview** against
  uscis.gov/citizenship/testupdates and the officials' own .gov sites (they were last
  checked July 14, 2026). Especially volatile: U.S. Representative (depends on whether
  her home is in TX District 10 vs 35 — confirm her exact address), Speaker, Senators.
- **LM Studio "Serve on Local Network" persistence** across reboots/updates is
  unconfirmed. If the tutor 502 returns after a restart, re-enable that toggle, or use
  the `LLM_URL=http://100.x.x.x:1234` fallback in DEPLOY.md.
- **Studio must stay awake and LM Studio's server running** for the tutor to work
  (Energy settings + keep the app open).

**Improvements (nice-to-have, not blocking)**
- Home subtitle still says "all 100 official USCIS questions" — factually about the
  real exam, but slightly at odds with the 91 shown while questions are hidden. Left
  as-is deliberately; revisit if it's confusing.
- Consider a small, dismissible note on Browse ("9 current-officials questions are
  hidden until re-verified") so the drop from 100→91 isn't surprising — deferred to
  keep the UI clean.
- Persist the LM Studio listen setting / autostart so a Studio reboot needs zero manual
  steps.

**Features (backlog, not started)**
- None committed this session.

### One-time setup for her phone (from DEPLOY.md)
Tailscale from the App Store → sign in you@example.com → VPN on → open
**`https://your-mac-studio.your-tailnet.ts.net`** (HTTPS, no port) in Safari → Share →
Add to Home Screen.

Use the **HTTPS** URL, not `http://…:8321`. The spoken Mock Interview mic (`getUserMedia`)
only works in a secure context, so the old plain-HTTP shortcut can't record — it silently
falls back to typing. See "Mock Interview mic needs HTTPS" in DEPLOY.md.

**For spoken Bengali coaching to be audible:** install a Bengali voice on the iPhone —
Settings → Accessibility → Spoken Content → Voices → Bengali → download one (e.g. "Bangla").
Without it, the missed-answer Bengali still shows on screen but isn't spoken (the app
detects the missing voice and stays silent rather than mispronounce it with the English
voice). This is a manual iOS step — it can't be set remotely.
