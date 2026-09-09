# Architecture & how it all works

The single source of truth for **how this app is built, how it runs, and why each
decision was made.** If you read one doc to understand the system, read this one.

Companion docs: [DEPLOY.md](DEPLOY.md) (runbook + deploy), [SOURCES.md](SOURCES.md)
(content verification), [QA-GUIDE.md](QA-GUIDE.md) (manual test pass),
[STATUS.md](STATUS.md) (session-by-session change log), [ROADMAP.md](ROADMAP.md)
(what's next). A doc map is at the very bottom.

---

## 1. What this is (and who it's for)

A **U.S. civics naturalization test study app for exactly one person** — my wife, a
Bengali-speaking adult ESL learner studying the **2008 USCIS test** (the officer asks up
to 10 of 100 questions; 6 correct passes). Because the audience is one known person on
her own phone, the app optimizes for **trust, warmth, and delight** over generality:
no accounts, no analytics, no build step, offline-first, and a private local AI tutor.

Two non-obvious framing decisions flow from "one user":

- **Trust is the product.** She *relies* on the grading. A false "correct" teaches her
  wrong; a false "wrong" on a right answer is demoralizing. So grading correctness is the
  highest priority, is algorithmic-first (deterministic, testable), and has an automated
  suite.
- **Accessibility is advisory, not binding here.** One user, no screen reader, beauty-first
  — but we still keep the decorative-vs-semantic contract clean (it's cheap and keeps the
  code honest), and every animation respects `prefers-reduced-motion`.

---

## 2. The whole system at a glance

```
        MacBook Air (dev + deploy)                 Mac Studio (always-on host)
  ┌──────────────────────────────────┐        ┌─────────────────────────────────────┐
  │  ~/Documents/projects/            │  push  │  ~/civics-exam-taker                 │
  │      civics-exam-taker  (git)     │  over  │     node server.js  :8321            │
  │  edits • tests.html • ./deploy.sh │──SSH──▶│       ├─ serves index.html (the app) │
  └──────────────┬───────────────────┘        │       ├─ POST /chat  ─┐              │
                 │ git push                    │       └─ POST /grade ─┤              │
                 ▼                             │                       ▼              │
           GitHub (history)                    │            LM Studio  :1234          │
                                               │            qwen2.5-7b-instruct        │
                                               └───────────────┬─────────────────────┘
                                                               │ Tailscale (WireGuard)
                                                               ▼
                                                     her iPhone (Safari PWA)
```

**One-paragraph tour.** The entire app is a **single `index.html`** (HTML + CSS + JS, no
framework, no build). It runs standalone from the file system, but in production it's
served by a tiny **`server.js`** on an always-on **Mac Studio**, reachable only over the
private **Tailscale** network. `server.js` does two extra jobs beyond serving the file:
it proxies the **tutor chat** and a **grading "second opinion"** to a **local LLM** (LM
Studio). Her study progress lives entirely in her phone's **`localStorage`** — nothing
leaves the device. Development happens on the **MacBook Air**; shipping is one command
(`./deploy.sh` / `/deploy`) that pushes straight to the Studio and verifies the live build.

---

## 3. Guiding principles (the "why" behind the shape)

| Principle | Consequence |
|-----------|-------------|
| **Trust first** | Grading is deterministic + tested; the LLM can only *upgrade* a wrong answer, never overturn a right one; accepted answers are always shown. |
| **One user, her phone** | No accounts/DB/analytics; state is `localStorage`; private tailnet, not the public internet. |
| **Offline-first, no build** | Single self-contained `index.html`; the tutor degrades gracefully to "off" when the server/LLM isn't reachable. |
| **Warm & rewarding** | Husband-voice copy, Bengali endearments, celebrations, a daily habit loop — motivation matters as much as content. |
| **Honest signals** | "Interview readiness" reflects *only real testing*; self-assessment is tracked separately so it can never create false confidence. |
| **Beauty-first a11y** | Decorative marks are `aria-hidden`; the answer text always teaches; motion respects `prefers-reduced-motion`. |

---

## 4. The client app — `index.html` (one file, ~2,790 lines)

**Why one file:** zero build, trivially deployable (copy one file), works from `file://`,
easy to reason about, and impossible to get a broken partial deploy. The tradeoff (no
module system, everything in global scope) is acceptable at this size and is exactly what
lets `tests.html` load the real functions and test them.

**Views** (each a `<section id="view-…">`; `switchMode()` toggles `hidden` and moves focus
to the view heading):

- **Home** — the "Path to Citizenship" hero: mastered ring, per-category bars, interview
  readiness, progress-tier badge, the daily "Today" block (streak + goal), a daily
  husband note, sound toggle, and Reset.
- **Flashcards** — flip to reveal; self-rate ("I knew it 👍 / Show me again"); Bengali +
  emoji/art on the answer; a **self-review** progress ring for the current deck.
- **Quiz** — practice / interview (spoken) / weak-spots modes; type an answer, get graded,
  see the accepted answers, streak pips, pass confetti, personal best.
- **Browse** — all questions with real IDs, accepted answers, per-answer emoji, a Bengali
  expander, a "mark as read" quest, and a per-question "Ask the tutor".
- **Interview Day** — reading/writing practice drills + what-to-bring/vocabulary notes.
- **Tutor** — a general chat with the local LLM (only appears when the server is reachable).

**The question data model.** One array `ALL_QUESTIONS` (100 items), each:
`{ id, category, q, a:[…accepted answers…], need?, star?, dynamic?, note? }`. Bengali
(`qbn`/`abn`/`bnNote`) is merged on from `BN_TRANSLATIONS`. Two derived facts:

- `need:N` — the number of *distinct* answers required (e.g. Q64 "name three" → `need:3`);
  defaults to 1.
- `dynamic:true` — the 9 "current officeholder" questions (President, Senators, etc.).
  A single flag `HIDE_DYNAMIC = true` filters them out of the active `QUESTIONS` set (so
  the app shows **91** until they're re-verified near the interview). Flip to `false`
  near the interview date — this is the single most important pre-interview step.

---

## 5. Local data & privacy

Everything about *her* lives in `localStorage` on her phone — per browser, per URL,
never transmitted. Eight keys, each independently loaded/saved and each degrading to a
sensible empty default if missing or corrupt:

| Key | Shape | What it drives |
|-----|-------|----------------|
| `civics-stats-v1` | `{ [id]: {c,w,streak} }` | **Tested** mastery, weak-spots, readiness (the honest signal) |
| `civics-selfreview-v1` | `Set<id>` | Flashcard "I knew it" — **self-review only**, shown on Flashcards |
| `civics-best-v1` | integer | Personal-best quiz score |
| `civics-milestones-v1` | `Set<key>` | Which celebrations have fired (so they fire once) |
| `civics-read-v1` | `Set<id>` | Browse "read" quest |
| `civics-streak-v1` | `{last,count,best}` | Daily study streak 🔥 |
| `civics-dailygoal-v1` | `{date,count}` | "N of 10 today" daily goal |
| `civics-sound-v1` | `"on"`/`"off"` | Sound preference (default ON) |

**Reset progress** (Home) clears the two *meter* stores (`stats`, `selfreview`) and the
mastery-derived milestones, but deliberately **keeps** the read quest and personal best.

---

## 6. The grading engine — the trust core

This is the most carefully engineered part of the app. It answers: *"Does what she typed
count as one of the officially accepted answers?"* — forgivingly (ESL typos, missing
punctuation) but never wrongly.

**Pipeline** (`normalizeText` → `answerVariants` → `matchedIndices` → `matchCount` →
`isCorrectAnswer`):

1. **`normalizeText`** lowercases, strips ordinals ("1st"→"1"), **deletes apostrophes**
   (so "New Year's" and "don't" match "new years"/"dont" — an ESL learner types no
   apostrophe), turns other punctuation/hyphens into spaces, collapses whitespace, and
   drops a leading "the".
2. **`answerVariants`** expands each official answer into accepted forms: with/without the
   parenthetical (`"House (of Representatives)"` → also `"house"`), bare numbers
   (`"twenty-seven (27)"` → `"27"`), and lead-in trimming (`"to print money"` → `"print
   money"`).
3. **`matchedIndices` — a two-pass token-window matcher.** The input is tokenized; each
   official answer is matched as a *contiguous run of tokens* (never by splitting on
   comma/"and", because official answers themselves contain commas and "and" — e.g.
   "Martin Luther King, Jr. Day", "Secretary of Health and Human Services"). Matching is
   greedy longest-first, each answer and each word claimed at most once. Typo tolerance
   scales with answer length (`typoAllowance`: 0 edits for ≤4 chars, 1 for ≤7, 2 for
   longer) via Levenshtein `editDistance`.

**The subtle bug this design exists to prevent (G1).** "north carolina" and "south
carolina" differ by exactly 2 edits = the tolerance for long answers. A naïve single pass
could let a correctly-spelled "south carolina" be *spent as a typo of* "north carolina",
so typing one Carolina twice would falsely score 2 distinct states. The fix is **two
passes**: an **exact-only** pass claims perfectly-spelled answers first, then a
**typo-tolerant** pass fills the leftovers — with an `exactForms` guard so a window that
is *itself* an exact official answer is never lent to the typo pass. Result: dup Carolinas
score 1, real distinct states score right.

4. **`matchCount` / `isCorrectAnswer`** — count distinct matched answers; correct iff
   `count >= (need || 1)`. Multi-answer questions show a "Name two…" hint and partial
   feedback ("you gave 1 of 2"), with the ones she already gave **marked** in the list.

**Two correctness fixes worth knowing:**
- **Apostrophes** were being replaced by a *space*, splitting "New Year's Day" into a
  stray `s` token so "new years day" failed. Now deleted → the natural ESL spelling grades
  right. (7 real false-negatives fixed.)
- **Q95 (Statue of Liberty)** now accepts USCIS's bracketed alternates ("New Jersey",
  "near New York City", "on the Hudson") — the card's own note promised they were
  acceptable but the grader had rejected them.

**Why algorithmic-first, LLM-second.** The deterministic matcher is fast, offline, and
*testable* (see §14). When it says "wrong" **and** she typed something **and** the tutor is
online, the app asks the LLM for a semantic second opinion against *only* the official
answers (§11). It can **upgrade** wrong→right (catching paraphrases the algorithm can't),
**never** downgrade, and the accepted answers are always shown regardless. So the LLM adds
leniency without ever becoming a single point of failure or hiding the truth.

---

## 7. Mastery & the honest progress system

**One record per question drives everything real:** `stats[id] = {c, w, streak}` (correct
count, wrong count, current streak). **Mastery has three levels** (`masteryFromStat`):
🌱 New (untried) → 📖 Learning (tried, not yet right twice) → ⭐ **Mastered** (`streak ≥ 2`,
the same rule that clears a weak spot). Each level is defined as **icon + text label** so
no surface conveys state by color alone.

**What counts is the key design decision.** After the owner flagged "false progress," the
rule is: **only real graded quiz answers move mastery/readiness** — the string matcher or
the tutor's grade. **Flashcard "I knew it" and the manual "actually right" override do
NOT.** Flashcard self-rating instead feeds a **separate** `civics-selfreview-v1` counter
shown *only on the Flashcards screen* ("N marked known — self-check, not a test"). This way
flipping cards still feels rewarding, but "Interview readiness" means *actual readiness*.

**Home surfaces, all with text equivalents (rings/bars are decorative):**
- **Mastered ring** + **per-category bars** — `mastered / total`.
- **Interview readiness** — estimates the mock-interview pass chance: per-question odds
  keyed to mastery (mastered .97 / learning .55 / new .15), then the **binomial tail
  P(X ≥ 6 of 10)**. Shown as staged, never-alarming copy ("Not yet → Almost there → You're
  ready"), never a bare percentage as the accessible name.
- **Progress-tier badge** — "Just beginning → Getting started → Finding your feet →
  Halfway → Almost a citizen → Ready 🎓" (contrast-safe color pairs).

---

## 8. The reward / habit layer (N1)

Motivation for a solo learner is a feature. Layered on top of the honest signals:

- **Daily streak** (`civics-streak-v1`) — consecutive calendar days with any study action.
  `advanceStreak` is a *pure function* (takes today/yesterday keys) so it's unit-tested;
  a missed day resets to 1 with kind copy, never punishes.
- **Daily goal** (`civics-dailygoal-v1`) — a "N of 10 today" ring; `bumpDaily` is pure and
  latched (the "goal reached" event fires only on the crossing to 10, not every answer
  after).
- **`studyAction()`** is the single hook every study surface calls (quiz answer, flashcard
  rating, browse read, writing drill). It advances streak + goal, re-renders Home, and
  returns latch flags so the caller folds *one* announcement into its own.
- **Milestone celebrations** (`civics-milestones-v1`) — 10/50/all mastered, category
  complete, all-starred, first pass, read-all — non-modal dismissible cards that fire once.
- **Micro-interactions** — correct → green pulse + ✓; wrong → soft shake; count-up on the
  *decorative* ring/goal numbers; answer reveal; button press. **All behind
  `prefers-reduced-motion`.**
- **Sound** (`civics-sound-v1`, **default ON**) — a short Web-Audio chime on correct/
  milestone, unlocked lazily on the first study gesture, toggleable off, and **always
  additive** to the visible verdict (never the only feedback).

**The one a11y contract that matters here:** the polite live region (`announce()` → a
single `#live` element) holds one message at a time, so milestone messages are **latched**
(announce once) and **merged into the same string** as the verdict — never a second
competing announcement.

---

## 9. Visuals — emoji + inline SVG

Every one of the 100 questions carries a **decorative memory hook** (33 hand-authored
inline SVGs + 67 emoji). Reasoning:

- **Emoji for breadth, SVG for the iconic few.** Emoji are reused *by theme* (⚖️ for
  law/justice, 🏛️ for Congress/offices, 🗳️ for voting) so repetition reinforces the
  theme rather than reading as noise. Where a clean custom drawing genuinely beats the
  emoji (flag, Capitol, scales, ballot, scroll, Texas flag…), an **inline SVG replaces**
  it. Self-authored SVG was chosen over sourced photos: **tiny (+~2 KB gzipped), fully
  offline, zero licensing risk**.
- **Per-answer emoji** on the list questions where each item has an obvious icon (holidays
  🦃🎄🎆, First-Amendment rights 🗣️🙏📰…).
- **Decorative contract:** every SVG is `aria-hidden="true" focusable="false"` with no
  role/title and **no internal `id`** (so an aliased SVG reused many times on the Browse
  page can't create duplicate-id paint bugs). The **answer text always teaches**; the
  picture is a bonus. Solemn topics (slavery, Emancipation, 9/11) carry respectful marks
  (⛓️, 🕊️, 🕯️) rather than being left blank — chosen by the owner as educational.

---

## 10. Bengali support

All 100 questions and their answers are pre-translated (`BN_TRANSLATIONS`, merged onto the
questions) and shown behind a "বাংলা দেখুন / Show in Bengali" expander in Browse; the tutor
also replies **English first, then Bengali**. Bengali script runs are wrapped in
`<span lang="bn">` (WCAG 3.1.2) so assistive tech switches voice. **It's an AI-made study
aid, disclaimed in-app as not official** — the English answers remain authoritative, and a
fluent-speaker review is a pending pre-reliance step. Proper nouns (people, US states,
tribes) are intentionally kept in English.

---

## 11. The tutor & grader backend — `server.js` (~170 lines, zero deps)

A tiny Node HTTP server (uses global `fetch`; no npm install). It serves `index.html` and
exposes:

| Endpoint | Purpose |
|----------|---------|
| `GET /` , static files | Serves the app (path-normalized, sandboxed to the repo dir) |
| `POST /chat` | Tutor chat → proxied to the local LLM, grounded on the question's official answers |
| `POST /grade` | Wrong-answer **second opinion** → LLM counts distinct official answers matched; **upgrade-only** |
| `POST /transcribe` | Spoken-answer audio (16 kHz mono WAV) → forwarded to a local **whisper** server; returns `{text}` |
| `GET /chat-status` | `{enabled, model, build, stt}` — client uses this to gate the tutor UI (`enabled`) and the spoken Mock Interview (`stt`) |
| `GET /version` | `{build:"<git short-sha>"}` — the deploy build stamp (see §15) |

**Why a non-thinking instruct model (`qwen2.5-7b-instruct`).** Hard-won: the Studio
generates ~100 tok/s, so throughput was never the problem — an earlier *reasoning* model
emitted ~1000 hidden "thinking" tokens before every short reply (~10s of invisible
latency), and no server dial reliably disabled it. Civics answers are **retrieval of known
facts against a fixed answer key** — there's nothing to reason about — so a fast instruct
model is the right tool: replies land in <1s with no accuracy loss. Qwen2.5 specifically
for strong **Bengali** and reliable **JSON** output for `/grade`.

**Grounding & safety.** The grader is instructed to judge *only* against the official
accepted answers passed to it (so it can't accept merely-true facts), and the server — not
the client — decides acceptability, so a stray model field can't fool it. **Graceful
degradation everywhere:** if LM Studio is down, `/grade` and `/chat` return a friendly
502, the quiz silently keeps its algorithm verdict, and under plain static hosting (no
server) `tutorEnabled` stays false so the tutor UI never appears.

### 11a. The spoken Mock Interview (voice in **and** out)

The type-in "Interview mode" quiz reads the question aloud but she still types. **Mock
Interview** closes the loop: a hands-free spoken ceremony — greeting/oath → civics Q&A →
reading test → writing test → closing — where she *speaks* her answers.

- **Speech in.** The client captures the mic (`getUserMedia` → `ScriptProcessor` PCM), runs
  a tiny **RMS voice-activity detector** (`vadShouldStop`): auto-stop after ~1.3 s of silence
  once she's spoken, with an 8 s "never started" and 15 s max-length guard. It then encodes a
  **16 kHz mono WAV in the browser** (`encodeWav`/`downsample` — no ffmpeg, no libs) and POSTs
  it to `/transcribe`. The mic opens only *after* the officer's TTS ends (`speak(text, onEnd)`),
  so the recording never captures the officer's voice. A **tap-to-talk** mic button and a
  **"Type instead"** path are always present (and take over automatically on mic denial).
- **Whisper backend.** A local `whisper.cpp` server (OpenAI-compatible
  `/v1/audio/transcriptions`), started alongside LM Studio:
  `whisper-server -m models/ggml-base.en.bin --port 8090`. `server.js` forwards the WAV as
  multipart and returns the transcript. Config via `WHISPER_URL` / `WHISPER_MODEL`. Chosen
  over the browser's Web Speech API for **accent accuracy** (a Bengali speaker) and privacy —
  same local-only, zero-cloud posture as the tutor LLM.
- **Grading reuses the trust core.** The transcript is just a string handed to
  `matchedIndices` — same deterministic matcher as the typed quiz — and a wrong result gets
  the same **upgrade-only `/grade` second opinion**, which is exactly what rescues STT
  homophones and dropped small words. Reading is a lenient word-overlap check; writing stays
  **typed** (it's handwritten on the real test), reusing `normalizeSentence`.
- **Two modes.** *Coaching* — the officer speaks correctness and the answer after each
  question. *Realistic* — she stays neutral like the real officer; the full scorecard (civics
  6-of-N, reading, writing) is revealed only at the closing. The civics phase honors the
  officer's real early-stop (`earlyStopReason`: 6 right = pass, 5 wrong = can't reach 6).
- **Gating & fallback.** The Mock Interview home card is hidden unless `/chat-status` reports
  `stt:true` (server + whisper reachable) — so under static hosting or a down whisper it never
  appears, and the type-in Interview mode remains the fallback. Every spoken officer line is
  also on screen (captions), and leaving the view mid-listen hard-cancels the mic
  (`cancelRecording`) so a stale transcript can't grade a gone screen.

---

## 12. Content sourcing & verification

Nothing in the app comes from model memory. Every question, accepted answer, and 65/20
asterisk was transcribed from the **official USCIS 2008 100-questions PDF**; officeholder
answers and Texas/Manor specifics from primary `.gov` sources; reading/writing vocab from
the official USCIS lists. Full provenance and the re-verification log are in
[SOURCES.md](SOURCES.md). The only content that goes stale is the 9 dynamic officeholders
(re-verify near the interview) and the Q23 representative (after the Nov 2026 redistricting).

---

## 13. Accessibility posture

Advisory/beauty-first for this single non-screen-reader user, but kept clean because it's
cheap and keeps the code honest: semantic HTML, decorative marks `aria-hidden`, one polite
`#live` region for announcements (latched/merged so messages don't clobber), focus moved on
view changes and after actions, disclosure buttons with `aria-expanded`/`aria-controls`,
toggles with `aria-pressed` + a fixed accessible name, contrast-safe tier colors, and
**all motion behind `prefers-reduced-motion`**. Each UI change was reviewed by the project's
`accessibility-lead` agent; genuine functional bugs it surfaced (focus loss, id collisions,
announcement clobbering) were fixed, while purely-advisory items were applied with judgment.

---

## 14. Testing — `tests.html`

A one-file, dependency-free runner that **loads the real `index.html` in an iframe** and
calls its actual shipped functions (no duplicated logic), printing PASS/FAIL and stamping
the tab title. **86 assertions** cover: the grading matcher (multi-answer counts, dedupe,
Carolina/typo edge cases, no-punctuation, comma/"and"-in-answer, apostrophe forms, Q95
alternates), the partial-answer highlight indices, mastery mapping, the pure habit-loop
functions (`advanceStreak`, `bumpDaily`, `tierFor`), and the Mock Interview's pure speech
helpers (`vadShouldStop` thresholds, `downsample`, `encodeWav` WAV sizing). **Run it after any
change to the questions or grader** — serve the folder and open `/tests.html` (green = "All N
tests passed"). This is the guardrail that lets grading be changed safely.

---

## 15. Deployment — topology + the deploy pipeline (N2)

**Topology.** Development + deploy run on the **MacBook Air**. The live app runs on the
**Mac Studio** (`node server.js` on `:8321`) from a *separate* checkout at
`~/civics-exam-taker` (deliberately **not** under `~/Documents` — see "Surviving a Studio
reboot" below), reachable only over **Tailscale** (WireGuard). Her phone
opens `http://100.x.x.x:8321` (IP form, plain HTTP — WireGuard already encrypts; the
port is required) as a home-screen PWA.

**One-command deploy: `./deploy.sh` (or `/deploy`).** It:
1. **Preflights** — refuses a dirty tree or a non-`main` branch (reminds you to run tests).
2. **Pushes to GitHub** for history.
3. **Pushes straight into the Studio's checkout over SSH** (the `air_to_studio` key), with
   `receive.denyCurrentBranch=updateInstead` so the push updates the working tree.
4. **Restarts** `node server.js` on the Studio.
5. **Verifies from the Air** that the restarted server's `/version` build stamp **equals the
   commit just pushed** and `/chat-status` is 200 — and fails loudly otherwise.

**Why push-to-Studio instead of `git pull` on the Studio.** The Studio's non-interactive
SSH shell can't reach the macOS keychain, so `git pull` from GitHub fails there
(`could not read Username … Device not configured`). Pushing *into* the Studio over the
existing SSH key sidesteps GitHub credentials on the Studio entirely. **Why the build
stamp:** restarting a process proves nothing about *which code* it's running; comparing
the live `/version` to the pushed SHA makes every deploy end-to-end verifiable (no
"did it actually update?" doubt). One-time setup (already done) authorized the key and
saved the Studio username to a gitignored `.deploy.env`. Full runbook: [DEPLOY.md](DEPLOY.md).

**Surviving a Studio reboot.** `node server.js`, LM Studio (headless `lms` CLI, not the
GUI), and whisper (§11a) all run under **`launchd` LaunchAgents** (templates in
[`deploy/launchd/`](deploy/launchd/)), each with `KeepAlive` so a crash self-heals.
`deploy.sh` restarts the app via `launchctl kickstart`, not `pkill`+`nohup`, so it
doesn't race launchd's own supervision. Tailscale needs no LaunchAgent — it's already a
macOS system extension that starts independently of user login. The one thing
`launchd` can't route around: **FileVault** is on, so a cold boot starts nothing at all
until someone unlocks the disk and logs in once — after that, all three services come
up on their own.

**Why the served checkout isn't under `~/Documents` anymore.** Discovered the hard way:
a `launchd`-spawned `node` with a working directory under `~/Documents` (or `~/Desktop`,
`~/Downloads` — macOS's TCC-protected special folders) doesn't fail, it **hangs
forever** — confirmed with `sample` on the stuck process, whose only thread sat in
`node::Cwd → uv_cwd → getcwd → open$NOCANCEL`, unmoving across every sample. Node calls
`getcwd()` internally during its own bootstrap, before any app code runs; under a
background-agent identity TCC has no consent dialog to show for, so the syscall just
blocks indefinitely instead of denying quickly. There's no LaunchAgent-side fix (a
plain `WorkingDirectory` plist key into `~/Documents/...` was denied outright at
spawn — `posix_spawn(...) error 0x1 - Operation not permitted` — same underlying
cause). The only real fix is keeping the served checkout off those folders entirely;
`~/civics-exam-taker` (a plain home-directory path) has no such restriction. Full
detail: [DEPLOY.md § Persistence across reboots](DEPLOY.md).

---

## 16. Key decisions, consolidated

| Decision | Why |
|----------|-----|
| Single-file `index.html`, no framework/build | Zero-build, offline, one-file deploy, testable via iframe |
| Algorithmic grading first, LLM upgrade-only second | Deterministic + testable + offline; LLM adds leniency but never overturns a right answer or hides the truth |
| Two-pass exact-then-typo matcher w/ `exactForms` guard | Prevents a correct answer being spent as a typo of a near-identical one (the Carolina false-positive) |
| Delete apostrophes in normalization | ESL learners type no apostrophe; "new years day" must grade right |
| Mastery/readiness = tested answers only; self-review separate | "Readiness" must mean real readiness — no false confidence from self-rating |
| Readiness as staged copy, not a bare % | Anti-anxiety; never alarming; text equivalent, not color/number alone |
| Non-thinking instruct LLM | Civics = fact retrieval; reasoning models waste ~10s/reply for no gain |
| Self-authored inline SVG over sourced photos | +2 KB, offline, no licensing risk, crisp on her phone |
| Sound ON by default (owner override) | Owner preference; still short, user-triggered, toggleable, additive |
| Tailscale-only, no public deploy | Private by construction; no TLS needed inside WireGuard |
| Push-to-Studio deploy + `/version` verification | Sidesteps headless GitHub-auth; makes "is it live?" provable |
| `HIDE_DYNAMIC` flag | Hides the 9 stale officeholder answers until re-verified near the interview |

---

## 17. Operational gotchas (things that will bite if forgotten)

- **`HIDE_DYNAMIC = true`** hides 9 questions (shows 91). Flip to `false` and re-verify the
  officeholders **near the interview** — they ARE on the real test.
- **The tutor needs LM Studio up** on the Studio with `qwen2.5-7b-instruct` loaded and
  "Serve on Local Network" enabled. If it 502s after a Studio restart, re-enable that
  toggle (see DEPLOY.md). The app itself works fine without it (tutor just hides).
- **Use the IP URL, plain `http://`** on the phone (`http://100.x.x.x:8321`) — MagicDNS
  can be off on a device, and there's no TLS on this port.
- **Her progress is per-browser/per-URL** in `localStorage`; changing the URL or clearing
  site data resets it (Reset progress is the in-app way).
- **Run `/tests.html` after any grading/question change** before deploying.

---

## 18. Doc map — which file for what

| Doc | Use it for |
|-----|-----------|
| **ARCHITECTURE.md** (this) | How the whole system works and *why* — the mental model |
| [DEPLOY.md](DEPLOY.md) | Running/restarting on the Studio, the deploy pipeline, LLM/model notes |
| [SOURCES.md](SOURCES.md) | Where every fact came from + the content re-verification log |
| [QA-GUIDE.md](QA-GUIDE.md) | A hands-on manual test pass |
| [STATUS.md](STATUS.md) | Chronological change log + the current done/remaining snapshot |
| [ROADMAP.md](ROADMAP.md) | What's planned/next (and what shipped) |
| `tests.html` | The automated grading/logic suite (serve + open it) |
