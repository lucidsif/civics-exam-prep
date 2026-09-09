# Manual QA guide

A hands-on pass to confirm the app is accurate and behaves correctly. Takes ~20–30 min.
Companion to the automated checks logged in [SOURCES.md](SOURCES.md). Newest verification
work is summarized in [STATUS.md](STATUS.md).

---

## 0. Start the app locally

From the project folder:

```bash
python3 -m http.server 8901
```

Then open **http://localhost:8901/index.html** in a browser. (Or test the real deployment
over the tailnet — see [DEPLOY.md](DEPLOY.md).)

**Automated grading check first (10 seconds):** open **http://localhost:8901/tests.html**. It
runs 42 assertions against the real grading functions and shows "All 42 tests passed" (and the
browser tab reads "PASS —"). If that's green, the grading logic in §2–§3 below is already
confirmed and your manual pass is just sanity-checking the UI and content.

For the deterministic tests below, open **DevTools → Console** (Cmd+Option+J in Chrome).
Paste this helper once — it jumps the quiz straight to any question by id:

```js
function goTo(id){
  const q = ALL_QUESTIONS.find(x => x.id === id);
  document.querySelectorAll('section[id^="view-"]').forEach(s => s.hidden = (s.id !== 'view-quiz'));
  quiz.mode='practice'; quiz.pool=[q]; quiz.i=0; quiz.results=[]; quiz.answered=false; quiz.stopOffered=false;
  renderQuizQuestion(); window.scrollTo(0,0);
}
```

Now `goTo(9)` (etc.) puts that exact question on screen so you can type into the field and
click **Check answer** like a real user.

---

## 1. Content accuracy spot checks

Open **Browse All** and confirm:

- [ ] **Q100 "Name two national U.S. holidays"** now lists **Juneteenth** (it was missing).
- [ ] Counts add up: Government 48 · History 30 · Civics 13 = **91** shown.
      (The 9 current-officeholder questions are intentionally hidden right now — see §4.)
- [ ] Spot-read 8–10 random questions against the official list
      (https://www.uscis.gov/citizenship/find-study-materials-and-resources/study-for-the-test) —
      wording and accepted answers should match.

---

## 2. Multi-answer questions — the main new behavior

Six questions now require the officially-required *number* of distinct answers. Use `goTo(id)`,
type the input, click **Check answer**, and confirm the verdict.

| id  | Question | Needs | Type this → expect |
|-----|----------|-------|--------------------|
| 9   | Two rights in the Declaration | 2 | `life` → **"Almost — you gave 1 of 2…"** ; `life, liberty` → **Correct ✓** |
| 36  | Two Cabinet-level positions | 2 | `Secretary of Defense` → 1 of 2 ; `Secretary of Defense and Secretary of State` → Correct ✓ |
| 51  | Two rights of everyone living in the US | 2 | `freedom of speech` → 1 of 2 ; `freedom of speech, freedom of religion` → Correct ✓ |
| 55  | Two ways to participate in democracy | 2 | `vote` → 1 of 2 ; `vote and run for office` → Correct ✓ |
| 100 | Two national U.S. holidays | 2 | `Christmas` → 1 of 2 ; `Christmas and Juneteenth` → Correct ✓ |
| 64  | Name three of the 13 original states | 3 | `New York, New Jersey` → **"…2 of 3…"** ; `New York, New Jersey, Virginia` → Correct ✓ |

Also confirm these **edge cases** (they should NOT be marked correct):

- [ ] `goTo(9)` → type `life, life` → **still 1 of 2** (the same answer twice is not two).
- [ ] `goTo(36)` → type `Secretary of Health and Human Services` → **1 of 2** (one answer that
      happens to contain the word "and" is still one answer, not two).
- [ ] `goTo(100)` → type `Martin Luther King, Jr. Day` → **1 of 2** (the comma inside the holiday
      name doesn't split it into two).
- [ ] **Spelling tolerance:** `goTo(9)` → type `life, liberti` → **Correct ✓** (a small typo in
      one answer is forgiven). `goTo(64)` → `New York, New Jersy, Virgina` → **Correct ✓**.
      Tolerance scales with word length (very short words must be exact), so this is generous but
      not unlimited.
- [ ] **No punctuation needed (ESL):** `goTo(9)` → type `life liberty` (no comma) → **Correct ✓**.
      `goTo(64)` → `new york new jersey virginia` → **Correct ✓**. And both together —
      `goTo(9)` → `life liberti` (no comma, typo) → **Correct ✓**.

And the on-screen guidance:

- [ ] Each of these six shows the hint line **"Name two — the officer will ask for two. Separate
      them with a comma or the word 'and'."** ("three" for Q64).
- [ ] The **"My answer was actually right"** override button still appears on a wrong/partial
      answer (so you're never stuck if the grader is too strict).
- [ ] **Partial highlight:** on a partial answer, the accepted-answers list marks the ones she
      already gave with a bold **✓**. E.g. `goTo(64)` → `new york and virginia` → in the list,
      **✓ New York** and **✓ Virginia** are bold, the rest plain. (Only on partial — a fully
      wrong or fully correct answer marks nothing.)

---

## 3. Single-answer questions still work (no regression)

The other ~85 questions should behave exactly as before — **any one** listed answer passes.

- [ ] `goTo(2)` ("What does the Constitution do?") → type just `sets up the government` →
      **Correct ✓**. Then repeat with `protects basic rights of Americans` → also Correct.
      (This is the case you originally asked about: any one of the three is enough — and it is.)
- [ ] `goTo(1)` → `the Constitution` → Correct ✓.
- [ ] `goTo(7)` → `27` → Correct ✓ (number form accepted).
- [ ] None of these single-answer questions show the "Name two" hint line.

---

## 3b. LLM second opinion on wrong answers (needs the server + LLM)

This only runs when the app is served by `node server.js` with LM Studio up (not via
`python3 -m http.server`, which has no `/grade` endpoint). It gives a wrong answer a semantic
second chance — **upgrade-only**, and it never hides the accepted answers.

- [ ] `goTo(51)` → type a paraphrase the string-matcher can't catch, e.g.
      `you can say what you want and gather in groups` → first shows **"Not quite"** with a
      **"Double-checking your answer…"** spinner, then after a few seconds flips to
      **"The tutor accepted your answer — it counts. ✓"**.
- [ ] A genuinely wrong answer (`goTo(9)` → `the president`) → spinner appears, then quietly
      disappears and the verdict **stays "Not quite"** (no false upgrade).
- [ ] Click **Next** while it's still "Double-checking…" → the check is cancelled and the next
      question is clean (no late flip, no error).
- [ ] With LM Studio **off**, a wrong answer just stays wrong with no spinner (graceful).
- [ ] It never overturns a **correct** answer, and the accepted-answer list is always shown.

---

## 4. Other study modes — quick smoke test

- [ ] **Flashcards** — flip a few; question and accepted answers display correctly.
- [ ] **Quiz** — run one full 10-question round; score shows out of 10, 6+ is a pass, missed
      questions are listed at the end.
- [ ] **Interview mode** — the question is read aloud and hidden; "Show the question" and "Play
      again" work.
- [ ] **Interview Day** — reading and writing practice sentences accept correct typing; the
      vocabulary lists and what-to-bring notes render.
- [ ] **Tutor** — ask one question; you get a grounded reply. (Requires LM Studio running on the
      Studio — see [DEPLOY.md](DEPLOY.md). If it 502s, that's the known tutor-server issue, not a
      content bug.)
- [ ] **Officeholder questions are hidden.** By design, `HIDE_DYNAMIC = true` removes the 9
      current-officials questions from every mode right now. Before the interview they must be
      turned back on (set `HIDE_DYNAMIC = false`) and re-verified — see STATUS.md.

---

## 5. Accessibility quick pass (optional)

This app prioritizes a clean, beautiful experience for one user, so treat these as nice-to-have:

- [ ] **Keyboard only:** Tab to the answer field, type, press Enter to check, Tab to "Next
      question," Enter to advance. No mouse needed.
- [ ] **VoiceOver (Cmd+F5 on Mac):** on a multi-answer question, focusing the answer field should
      read the label *and* the "Name two…" hint. After checking a partial answer, the result
      ("You gave 1 of 2…") should be announced.

---

## What to do if you find a problem

- **Wrong/missing answer content** → note the question id and the correct value; it's a one-line
  edit in the `ALL_QUESTIONS` array in `index.html`.
- **Grader too strict/lenient** → note the id, exactly what you typed, and what you expected.
- **Anything else** → jot the id and a one-line description. Re-run the automated assertions after
  any fix (the console block used during development is in the session history).
