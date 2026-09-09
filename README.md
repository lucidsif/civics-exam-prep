# civics-exam-taker

A private, offline-first study app for the **U.S. naturalization civics test**, built
for one learner (a Bengali-speaking ESL adult). Single-file web app + a tiny local-LLM
tutor proxy, served from a Mac Studio over Tailscale, deployed with one command.

> [!IMPORTANT]
> ### Which exam does this app cover?
> This app contains the **2008 version of the civics test — the original 100-question
> list** (USCIS "Civics (History and Government) Questions for the Naturalization Test,"
> rev. 01/19), **not** the newer 2025 civics test (128 questions).
>
> USCIS applies the version based on when you **filed Form N-400**:
> - **Filed before October 20, 2025** → you take the **2008 test (100 questions)** — this app.
> - **Filed on or after October 20, 2025** → you take the **2025 test (128 questions)** —
>   **not covered by this app.**
>
> Always confirm the current rule and your own test version on
> [uscis.gov's "Check for Test Updates" page](https://www.uscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates)
> before relying on this app to prepare for an interview.

- **100 official USCIS questions (2008 test)** with forgiving-but-trustworthy grading, a
  mastery/reward system, per-question visuals, Bengali translations, and a local AI tutor.
- **Mock Interview** — a hands-free spoken practice session (greeting → civics Q&A →
  reading → writing → closing) using a local speech-to-text server; graded by the same
  trust-first matcher as the typed quiz.
- **No accounts, no build, no analytics.** State lives in the phone's `localStorage`.

## Start here

- 🧠 **[ARCHITECTURE.md](ARCHITECTURE.md)** — how everything works and *why* (read this first).
- 🚀 **[DEPLOY.md](DEPLOY.md)** — run/restart the server; ship with `./deploy.sh` (or `/deploy`).
- ✅ **[SOURCES.md](SOURCES.md)** — content provenance & verification.
- 🧪 **`tests.html`** — the automated grading suite (serve the folder, open `/tests.html`).
- 📓 **[STATUS.md](STATUS.md)** / **[ROADMAP.md](ROADMAP.md)** — change log / what's next.

## Run it locally

```bash
# static (grading works; tutor is disabled)
python3 -m http.server 8901        # → http://localhost:8901/index.html
# full (adds the tutor/grader; needs LM Studio on :1234)
node server.js                     # → http://localhost:8321
```

## Deploy (from the MacBook Air)

```bash
./deploy.sh          # push main + ship to the live Mac Studio + verify the live build
```

See [ARCHITECTURE.md §15](ARCHITECTURE.md) and [DEPLOY.md](DEPLOY.md) for the how/why.
