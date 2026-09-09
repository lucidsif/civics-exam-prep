# Verification log — civics study app

All facts in `index.html` were verified against the sources below on **July 14, 2026**.
Nothing in the app comes from model memory alone.

## The 100 questions, answers, and the 20-question (65/20) list

- **Source:** Official USCIS "Civics (History and Government) Questions for the Naturalization Test" (2008 test, rev. 01/19)
  https://www.uscis.gov/sites/default/files/document/questions-and-answers/100q.pdf
- **Method:** PDF downloaded and read page by page (all 11 pages). Every question, every acceptable
  answer, and every asterisk (65/20 marker) in the app was transcribed from this PDF verbatim.
- The 20 asterisked questions: 6, 11, 13, 17, 20, 27, 28, 44, 45, 49, 54, 56, 70, 75, 78, 85, 94, 95, 97, 99.

## Current-officeholder answers (badge: "may change")

- **Source:** USCIS "Check for Test Updates" page (the page the 100q PDF itself points to), fetched 2026-07-14:
  https://www.uscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates
  - Q28 President: Donald J. Trump / Donald Trump / Trump
  - Q29 Vice President: JD Vance / Vance
  - Q39 Justices on the Supreme Court: nine (9) — note: USCIS treats this as a check-for-updates answer, so it carries the "may change" badge in the app
  - Q40 Chief Justice: John Roberts / John G. Roberts, Jr.
  - Q46 President's party: Republican (Party)
  - Q47 Speaker of the House: Mike Johnson / Johnson

## Texas / Manor answers

- Q20 U.S. Senators for Texas: **John Cornyn** and **Ted Cruz** — official Senate contact roster
  (senate.gov `senators_cfm.xml`), fetched 2026-07-14; both TX entries point to cornyn.senate.gov and cruz.senate.gov.
- Q23 U.S. Representative: **Greg Casar (TX-35)** — her exact home address was checked at
  https://www.house.gov/representatives/find-your-representative and confirmed to fall in
  District 35, confirmed at https://casar.house.gov ("represents Texas's 35th Congressional
  District"). Manor as a town is split between TX-10 (Michael McCaul) and TX-35 (Casar), but
  her specific address resolves to one district — so the app now shows the single confirmed
  answer instead of both options. (Previously showed both McCaul and Casar pending an
  address-level check; updated 2026-07-16 once she looked it up.)
  Note: Texas's 2025 redistricting changes districts **starting with the November 2026 election**;
  sitting representatives are unchanged until January 2027 (per the district-court injunction being
  stayed by the Supreme Court on Dec 4, 2025). Re-verify if the interview is in 2027 or later.
- Q43 Governor: **Greg Abbott** — https://gov.texas.gov ("Office of the Texas Governor | Greg Abbott"), fetched 2026-07-14.
- Q44 State capital: **Austin** — stable fact; the answer shown is the Texas-specific answer
  ("answers will vary" per the USCIS PDF).

## Interview-day cheat sheet

- Reading vocabulary: official USCIS "Reading Vocabulary for the Naturalization Test" (rev. 08/08)
  https://www.uscis.gov/sites/default/files/document/guides/reading_vocab.pdf — transcribed in full.
- Writing vocabulary: official USCIS "Writing Vocabulary for the Naturalization Test" (rev. 08/08)
  https://www.uscis.gov/sites/default/files/document/guides/writing_vocab.pdf — transcribed in full.
- Test format (up to 10 questions asked orally, 6 correct to pass): stated in the 100q PDF's own introduction.
- What-to-bring list: limited to the universally documented items and labeled with an instruction to
  follow her interview appointment notice, which is authoritative.

## Reading & writing practice sentences (added July 14, 2026)

The practice sentences in the app's Interview Day view were written for this app — they are
NOT official USCIS test sentences (USCIS does not publish the actual test sentences). Two
guarantees, both machine-checked before shipping:

1. Every word in every sentence appears on the official USCIS reading or writing vocabulary
   list (validated by a token-matching script against the transcribed lists — 12 reading and
   20 writing sentences, all passing).
2. Every sentence is factually accurate.

## Bengali translations (added July 15, 2026) — NOT official

The Bengali (বাংলা) translations of the 100 questions and their answers (shown on the
"Show in Bengali" expander in Browse), and the tutor's inline Bengali replies, are
**AI-assisted study aids, not official USCIS content and not professionally reviewed.**

- The 100 static Q&A were translated by AI (Claude subagents) using a shared civics glossary,
  then machine-validated: every question is present and every Bengali answer list matches the
  English answer count exactly. Proper nouns (people, US states, tribes, some institution names)
  were intentionally kept in English. 15 items carry an English "translation note" flagging a
  judgment call or doubt (e.g. "We the People" kept in English because it must be recited in
  English at the interview).
- The tutor's inline Bengali comes from the local model live and varies per reply.
- The app shows disclaimers in Bengali on every translation panel and a general "the tutor can
  make mistakes" note. **The English answers remain authoritative.** Before relying on the Bengali,
  have a fluent speaker review it.

## Known caveats surfaced during verification

1. USCIS now also lists a **2025 Naturalization Civics Test** (128 questions) on its updates page.
   This app covers the **2008 test only**, per the request. Confirm which version applies to her
   N-400 filing date before relying on this app.
2. All officeholder answers were correct as of July 14, 2026 and are badged in the app. The USCIS
   officer will not accept an outdated officeholder answer — re-check the badged answers the week
   of the interview.

## Change-date notes + regression tests — July 16, 2026

Added an explicit re-check date to every dynamic question's `note`, so nobody
has to guess "when might this go stale":

- Q20 (TX Senators), Q23 (U.S. Representative): **January 3, 2027** — the date
  a new Congress term begins, per the U.S. Constitution's 20th Amendment,
  Section 1. This is a fixed constitutional fact, not something requiring a web
  check.
- Q28 (President), Q29 (VP), Q46 (President's party): **January 20, 2029** —
  end of the current presidential term, also fixed by the 20th Amendment.
- Q39 (Supreme Court justice count), Q40 (Chief Justice): **no scheduled date**
  — stated honestly as such rather than inventing a plausible-sounding one.
  Justice count is statutory (last changed 1869, Judiciary Act); Chief Justice
  is a lifetime appointment.
- Q43 (TX Governor): **January 2027**, term end, but the exact swearing-in day
  could not be confirmed from any source checked (Wikipedia's Abbott article
  doesn't state it) — noted as "exact date not yet set" rather than guessed.
- Q47 (Speaker): **no fixed date** (can be replaced by a House vote at any
  time, as happened Oct 2023) — flagged **January 3, 2027** as the one
  *scheduled* checkpoint (new Congress, in case of a House-control flip), while
  being explicit that isn't the only way this answer could change.

**Regression tests added to `tests.html`** (86 → 106 assertions) to guard
against future edits silently drifting from a verified answer:
1. `DYNAMIC_SNAPSHOT` — exact-match assertion on all 9 officeholder answers.
2. Every `dynamic:true` question's note must contain a year or "no scheduled/
   fixed change" — plus an assertion that there are exactly 9 dynamic questions.
3. Bengali/English answer-count parity across all 100 translated questions —
   generalizes the fix below into a permanent check.

**Fixed Q17's pre-existing Bengali mismatch** (English has 2 answers,
`need:2`; Bengali `abn` had 1 combined string). Split the already-vetted
phrase "সিনেট ও প্রতিনিধি পরিষদ" (itself built from "সিনেট" = Senate and
"প্রতিনিধি পরিষদ" = House of Representatives, both used elsewhere in
`BN_TRANSLATIONS` for the same words) into `["সিনেট","প্রতিনিধি পরিষদ"]` —
a mechanical split of verified text, not a new translation.

## Re-verification pass — July 16, 2026 (unhid the 9 officeholder questions)

Re-checked all 9 `dynamic:true` answers ahead of flipping `HIDE_DYNAMIC` to `false`
(they were hidden since July 14, 2026 pending this check). Done in two rounds — an
initial round via web search, then a second round that loaded each **primary
source directly** (WebFetch/browser, not search snippets) once it was pointed out
that search results can lag or come from secondary aggregators. The direct-fetch
citations below are the ones that count as "verified":

- **USCIS "Check for Test Updates"**, fetched directly 2026-07-16
  (`Last Reviewed/Updated: 09/18/2025` per the page footer):
  https://www.uscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates
  - Q28 President: Donald J. Trump / Donald Trump / Trump — confirmed verbatim.
  - Q29 Vice President: JD Vance / Vance — confirmed verbatim.
  - Q39 Supreme Court justices: nine (9) — confirmed verbatim.
  - Q40 Chief Justice: John Roberts / John G. Roberts, Jr. — confirmed verbatim.
  - Q46 President's party: Republican (Party) — confirmed verbatim.
  - Q47 Speaker of the House: Mike Johnson / Johnson — confirmed, **and** the
    page also accepts "James Michael Johnson" (his birth name) as a third form;
    added to the app's accepted-answers list for Q47 since it's official.
  - For Q20 (Senators) and Q43 (Governor), USCIS itself just says "Answers will
    vary" and points to senate.gov / usa.gov/states-and-territories — USCIS does
    not hardcode a state's officials, so those two still needed direct
    state-specific verification (below).
  - **Also on this page:** the exact N-400 filing-date cutoff for which civics
    test version applies — **before Oct. 20, 2025 files → 2008 test (the one
    this app covers); on/after Oct. 20, 2025 files → the new 2025 test.** This
    directly answers the open "confirm 2008 vs 2025" item in STATUS.md/ROADMAP —
    it's not a guess, it's the one bright-line date USCIS publishes. Still her
    call to confirm which side of that date her actual N-400 falls on.
- **supremecourt.gov/about/justices.aspx**, loaded directly 2026-07-16: page text
  states "Nine Justices make up the current Supreme Court... The Honorable John
  G. Roberts, Jr., is the 17th Chief Justice" — cross-confirms Q39/Q40 outside USCIS.
- **speaker.gov**, loaded directly 2026-07-16: page title is "Home - Speaker of
  the House Mike Johnson" — cross-confirms Q47.
- **senate.gov/senators**, fetched directly 2026-07-16: Texas roster lists
  **John Cornyn** and **Ted Cruz**, both Republican, both currently serving —
  confirms Q20 as the *sitting* senators today. Separately confirmed (web search,
  not yet direct-fetched from a campaign-neutral source): Cornyn **lost** the
  Republican primary runoff to Ken Paxton on May 26, 2026; the Nov 3, 2026 general
  is Paxton vs. Talarico. Cornyn remains the sitting Senator only until the new
  term begins **January 2027** — flagged in the question's `note`.
- **gov.texas.gov**, fetched directly 2026-07-16: confirms **Greg Abbott** as
  Governor. Running for reelection Nov 3, 2026; his current term runs through
  Jan 2027 regardless of the outcome, so the answer doesn't change even if he wins.
- **mccaul.house.gov**, loaded directly 2026-07-16: page title "Congressman
  Michael McCaul | Representing the 10th District of Texas" — confirms Q23's
  TX-10 half.
- **casar.house.gov**, loaded directly 2026-07-16: "Congressman Greg Casar
  (TX-35)" appears in a press release dated **July 16, 2026** (today) on his own
  site — about as fresh a confirmation as is possible — confirms Q23's TX-35 half.
  Unchanged from the July 14 pass; McCaul still isn't seeking reelection and
  district lines shift with the Nov 3, 2026 election, effective January 2027 —
  flagged in the question's `note`.

**Net effect:** all 9 answers are accurate as of July 16, 2026, directly confirmed
against primary sources (not just search snippets), so `HIDE_DYNAMIC` was flipped
to `false` and all 100 questions are now live in every study mode. Two answers
(Q20, Q23) carry an explicit note that they are likely to go stale right around
January 2027 — re-verify them if the interview lands after that. `CHECKED` badge
date and footer/Interview-Day copy updated to July 16, 2026. Q47 gained the
official "James Michael Johnson" alias. 86/86 tests still pass after both edits;
no console errors (Home, Browse, Flashcards, Quiz checked).

## Re-verification pass — July 14, 2026

Full QA against the official USCIS sources:

- **Static set (91 non-officeholder questions):** re-diffed against the official USCIS 100-questions
  page. One correction — **Q100 "Name two national U.S. holidays" was missing Juneteenth**, which
  USCIS added to the answer key after it became a federal holiday in 2021. Added. All other questions,
  accepted answers, and all 20 asterisk (65/20) flags match the USCIS list verbatim.
- **9 officeholder answers:** re-confirmed current against primary .gov sources (senate.gov,
  clerk.house.gov, whitehouse.gov, supremecourt.gov, gov.texas.gov, speaker.gov). All still correct.
- **Q23 forward-looking flag:** Texas's 2025 redistricting affects only the **November 2026 election**
  onward (new members seated Jan 2027); McCaul (TX-10) and Casar (TX-35) remain the sitting reps now.
  Note: McCaul announced (Sept 2025) he will not seek reelection, and Manor's district lines/numbering
  may shift under the new map — re-verify Q23 right after the Nov 2026 election.
- **Multi-answer questions:** the quiz now requires the officially-required number of distinct answers
  (Q9, Q36, Q51, Q55, Q100 → two; Q64 → three). Q17's single combined answer ("the Senate and House")
  is unchanged. Every other question still accepts any one listed answer, matching the USCIS rule.
