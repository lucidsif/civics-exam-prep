# Deploy & runbook

## Architecture (since July 14, 2026)

Everything runs on the **Mac Studio** (`your-mac-studio`, Tailscale IP `100.x.x.x`)
and is reachable **only by devices on the Tailscale tailnet** (suffix `your-tailnet.ts.net`).
The public Cloudflare Pages deployment was deleted on purpose.

```
her phone (Tailscale on) ──WireGuard──► Mac Studio
                                          ├─ node server.js  :8321  (this repo)
                                          │    serves index.html
                                          │    POST /chat  ─► LM Studio  (tutor)
                                          │    POST /grade ─► LM Studio  (answer second opinion)
                                          └─ LM Studio       :1234  (OpenAI-compatible)
                                               model: qwen2.5-7b-instruct  (non-thinking; fast)
```

## The URL

**http://your-mac-studio.your-tailnet.ts.net:8321**

- `http://` NOT `https://` — there is no TLS on this port (WireGuard already encrypts
  everything between tailnet devices). Browsers that auto-upgrade to https will fail.
- The `:8321` port is required.
- Fallback if MagicDNS misbehaves on a device: `http://100.x.x.x:8321`
- The device must be on the tailnet: Tailscale app installed, signed in (you@example.com),
  VPN toggle ON.

### Mock Interview mic needs HTTPS (see "Spoken mic requires a secure context")

The plain-HTTP URL above works for **everything except the spoken Mock Interview on a
phone**. Browser mic access (`getUserMedia`) is only exposed in a *secure context* —
HTTPS, or `localhost` on the same device. A phone hitting `http://…:8321` is an insecure
remote origin, so the mic is unavailable on **every** mobile browser (Safari, Orion,
Chrome — on iOS all are WebKit; it's a web-platform rule, not a WebKit quirk) and the
interview silently falls back to typing.

To get the mic on the phone, serve the app over HTTPS with `tailscale serve` (Tailscale
issues a real cert for the MagicDNS name), then use the **https** URL with **no port**:

```bash
# on the Mac Studio, once:
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 8321
```

**https://your-mac-studio.your-tailnet.ts.net**  ← phone uses this for spoken mode

- Requires **HTTPS certificates enabled** for the tailnet (admin console → DNS →
  "Enable HTTPS") and **MagicDNS working on the device** — the cert is for the MagicDNS
  name, so the `100.x.x.x` IP form can NOT be used with https.
- `tailscale serve` runs alongside the plain `:8321` listener; the http URL keeps working.
- Requires Serve + HTTPS Certificates enabled in the admin console (one-time, done
  July 16, 2026). Do NOT enable Funnel — that would expose the app to the public internet.
- Verified July 16, 2026: `tailscale serve status` shows the mapping, and the https URL
  returns 200 with a valid Let's Encrypt cert (TLS 1.3). The serve config persists in
  tailscaled across reboots. **Still to confirm on her phone:** the mic prompt actually
  appears in the browser at the https URL (only reproduces on-device).

## Start / restart on the Mac Studio

As of July 15, 2026 `node server.js` runs under **launchd** (`com.civics.app`, see
"Persistence across reboots" below) instead of a manual `nohup`. To redeploy by hand
on the Studio:

```bash
cd ~/civics-exam-taker && git pull && launchctl kickstart -k "gui/$(id -u)/com.civics.app"; sleep 2; curl -s localhost:8321/chat-status; echo
```

It pulls, then **kickstarts** the supervised job (kills + relaunches it under launchd —
`KeepAlive` means launchd would otherwise just restart the old code out from under a
plain `pkill`), and prints `/chat-status` so you can confirm it came back up. (Path
confirmed as `~/civics-exam-taker` on the Studio — deliberately **not** under
`~/Documents`; see "Persistence across reboots" below for why.)

Equivalent, step by step:

```bash
cd ~/civics-exam-taker
git pull
launchctl kickstart -k "gui/$(id -u)/com.civics.app"
```

**Do not `pkill -f "node server.js"` or `nohup` it by hand anymore** — launchd's
`KeepAlive` will just relaunch the killed process on its own (racing a manual `nohup`
and potentially leaving two instances fighting over `:8321`). Use `launchctl kickstart`
to restart it cleanly, or `launchctl bootout gui/$(id -u)/com.civics.app` to stop it
until the next login/reboot.

- **LM Studio must have "Serve on Local Network" enabled** (Developer → Server
  Settings) so it binds loopback. server.js now defaults to `http://127.0.0.1:1234`
  (explicit IPv4). See "Tutor 502 root cause" below for why this matters.
- Fallback: if LM Studio is only reachable at the tailnet IP, set
  `LLM_URL` → `http://100.x.x.x:1234`.
- **Applied and permanent (July 16, 2026):** on this Studio, LM Studio's "Serve on
  Local Network" IS enabled but this version binds the machine's **tailnet interface IP
  only** (`lsof -iTCP:1234 -sTCP:LISTEN` → `100.x.x.x:1234`), NOT loopback —
  `127.0.0.1`/`localhost`/`::1` on `:1234` are all refused. So server.js's default of
  `http://127.0.0.1:1234` can't reach it, and `/grade` + `/chat` 502'd, which made the
  mock-interview second opinion silently grade correct answers as wrong. Fix: an
  `export LLM_URL="http://100.x.x.x:1234"` line in `~/bin/civics-start-app.sh`
  (just before `exec node`), so a plain `kickstart` picks it up. **Do not remove this
  expecting loopback to work** — it won't until LM Studio is made to bind `0.0.0.0`.
  Verify after any restart: `curl -s localhost:8321/grade -X POST -H 'content-type: application/json'
  -d '{"q":"x","a":["x"],"need":1,"typed":"x"}'` should return JSON, not a 502.
  (Alternatively the override can go in an `EnvironmentVariables` dict in
  `~/Library/LaunchAgents/com.civics.app.plist`, but that needs `bootout`/`bootstrap`,
  not `kickstart`, since env vars are read at spawn.)
- Node 18+ required (installed July 14, 2026; server uses global fetch).
- If macOS asks "Do you want node to accept incoming network connections?" → **Allow**.
- Env overrides: `PORT` (default 8321), `LLM_URL` (default `http://127.0.0.1:1234`),
  `LLM_MODEL` (default `qwen2.5-7b-instruct`), `WHISPER_URL` (default
  `http://127.0.0.1:8090`), `WHISPER_MODEL` (default `whisper-1`, cosmetic only).
- **Keep `qwen2.5-7b-instruct` loaded in LM Studio** (`lms load … --identifier qwen2.5-7b-instruct`).
  It's a non-thinking instruct model chosen for speed: the app's tutor/grading answers are simple,
  and reasoning models (Qwen3-thinking, Ornith) waste ~10s per reply on hidden reasoning that
  doesn't help. Instruct replies land in <1s. Other models can stay loaded alongside it.
- Keep the Studio awake (System Settings → Energy) and LM Studio's server running.
- Tailscale CLI on macOS lives at `/Applications/Tailscale.app/Contents/MacOS/Tailscale`.
  Do NOT symlink it (causes "bundle identifier is unknown to the registry"); use an
  alias or the full path. `tailscale serve` is not needed for the text app (plain HTTP
  works fine), but IS needed for the spoken Mock Interview mic on a phone — see "Mock
  Interview mic needs HTTPS" under "The URL".

## Self-service deploy from the MacBook Air (N2)

Instead of running the redeploy one-liner by hand on the Studio, ship from the Air:

```bash
./deploy.sh            # push main + pull/restart on the Studio + verify   (or /deploy in Claude Code)
```

It preflights (clean tree, on `main`), pushes to GitHub for history, then **pushes straight
into the Studio's checkout over SSH** and restarts `node server.js`, then verifies **from
the Air** that the restarted server serves the exact pushed commit — `server.js` exposes a
build stamp at **`/version`** (`{"build":"<short-sha>"}`, also in `/chat-status`), and the
script asserts `live == pushed` and `/chat-status == 200`. Fails loudly if they don't match.

**Why push-to-Studio, not `git pull` on the Studio:** the Studio's non-interactive SSH shell
can't reach the macOS keychain, so `git pull` from GitHub fails there (`could not read
Username … Device not configured`). Instead the Air pushes with the `air_to_studio` key into
the Studio's checkout, which has `receive.denyCurrentBranch=updateInstead` set (so the push
updates the working tree). The Studio needs **no** GitHub credentials.

**Setup — already done** (`.deploy.env` → `STUDIO_USER=youruser`; `air_to_studio` key
authorized; `updateInstead` set). To re-run on a fresh machine:

```bash
./deploy.sh setup <your-studio-macOS-username>   # prompts for the Studio password once
```

Config defaults (override in `.deploy.env`): host `your-mac-studio.your-tailnet.ts.net`,
URL `http://100.x.x.x:8321`, served checkout `~/civics-exam-taker` (**not** under
`~/Documents` — see below), key `~/.ssh/air_to_studio`.

Notes: macOS Remote Login must stay enabled on the Studio (it is). The remote step forces
`node` onto a non-interactive `PATH` (`/opt/homebrew/bin`, `/usr/local/bin`). The tutor still
depends on LM Studio being up on the Studio — outside the deploy's control; `/chat-status`
reports it. **First live deploy verified `68c067d` (July 15, 2026).**

## Persistence across reboots (launchd)

Three services must survive a Studio reboot for the app to actually work: the LLM
(tutor/grader), whisper (the spoken Mock Interview's speech-to-text), and the app
itself. All three run as **`launchd` LaunchAgents** (`gui/<uid>/<label>`, per-user, not
system-wide) — templates live in [`deploy/launchd/`](deploy/launchd/), installed on the
Studio at `~/Library/LaunchAgents/`:

| Label | Runs | Supervision | Log |
|---|---|---|---|
| `ai.lmstudio.headless` | `deploy/launchd/civics-start-lmstudio.sh` → `lms server start` + `lms load qwen2.5-7b-instruct` (headless CLI, **no GUI app needed**) | `RunAtLoad` only (one-shot — `lms server start` backgrounds its own persistent service and returns) | `~/Library/Logs/civics-lmstudio.log` |
| `com.civics.whisper` | `whisper-server -m ~/whisper-models/ggml-small.en.bin --port 8090 --inference-path /v1/audio/transcriptions` | `RunAtLoad` + `KeepAlive` (auto-restarts if it crashes) | `~/Library/Logs/civics-whisper.log` |
| `com.civics.app` | `deploy/launchd/civics-start-app.sh` → `cd ~/civics-exam-taker && node server.js` | `RunAtLoad` + `KeepAlive` | `~/Library/Logs/civics-app.log` |

**Why headless CLI for LM Studio, not the GUI app.** The full Electron GUI app doesn't
background reliably under `launchd` (it expects a normal windowed app launch, not a
process spawned by launchd at login). LM Studio ships a real headless mode instead:
`~/.lmstudio/bin/lms server start` + `lms load … --identifier …` starts the same local
server and loads the same model with no Electron window at all. Confirmed empirically
July 15, 2026: running the CLI commands while the GUI app was *also* still open (a
graceful `osascript … quit` didn't take effect over a non-interactive SSH session — no
Aqua session for the AppleEvent to land in) caused no conflict — same port, same model,
"already loaded" — meaning the GUI and the CLI talk to the same underlying engine. The
GUI app can still be opened by hand any time to look around; it isn't relied on to boot.

**Why the served checkout is `~/civics-exam-taker`, not `~/Documents/civics-exam-taker`
(the original path).** The hardest-won lesson of this whole setup. Moving `com.civics.app`
under `launchd` with the checkout still under `~/Documents/civics-exam-taker` didn't just
fail, it **hung forever** — the process showed as `running` in `launchctl print`, `runs`
kept incrementing, but nothing was ever logged and nothing ever bound `:8321`. Sampling
the stuck process (`sample <pid> 2`) showed the *only* thing it was doing, every single
sample: `node::Cwd → uv_cwd → getcwd → open$NOCANCEL`, frozen. Node calls `getcwd()`
internally during its own startup, before any app code runs. `~/Documents` (along with
`~/Desktop`, `~/Downloads`, iCloud Drive, Photos, …) is one of macOS's TCC-protected
special folders — access requires a consent dialog. A background `launchd` agent has no
window to show that dialog in, so instead of a quick denial, the `getcwd()` syscall just
blocks forever. (A `WorkingDirectory` plist key pointed at the same path failed the same
way, faster and more visibly: `posix_spawn(...) error 0x1 - Operation not permitted` —
same root cause, different code path, since that's `launchd`'s *own* pre-spawn chdir
hitting the identical TCC wall.) **There is no LaunchAgent-side fix for this** — no plist
key, no entitlement, no re-signing works around it — the served checkout simply cannot
live inside a TCC-protected folder if `launchd` is going to spawn `node` in it. Moving it
to a plain home-directory path (`~/civics-exam-taker`) made the exact same setup work
immediately. If you ever need to relocate the checkout again, keep it off those folders.

**Why LaunchAgents (`gui/<uid>/…`), not LaunchDaemons (`system/…`).** This Studio already
had one precedent (`~/Library/LaunchAgents/ai.openwebui.server.plist`, unrelated
service) using the per-user LaunchAgent pattern, so these three match it. LaunchAgents
only start once a user session exists — see the FileVault caveat below for what that
means in practice here.

**One-time install** (already done July 15, 2026 — checkout must already be at
`~/civics-exam-taker`, not `~/Documents/civics-exam-taker`):

```bash
# from the Air — copies the templates and installs them as the Studio's user
scp -i ~/.ssh/air_to_studio deploy/launchd/*.plist deploy/launchd/*.sh \
  youruser@your-mac-studio.your-tailnet.ts.net:/tmp/
ssh -i ~/.ssh/air_to_studio youruser@your-mac-studio.your-tailnet.ts.net '
  mkdir -p ~/bin
  mv /tmp/civics-start-lmstudio.sh /tmp/civics-start-app.sh ~/bin/
  chmod +x ~/bin/civics-start-lmstudio.sh ~/bin/civics-start-app.sh
  mv /tmp/ai.lmstudio.headless.plist /tmp/com.civics.whisper.plist /tmp/com.civics.app.plist ~/Library/LaunchAgents/
  for label in ai.lmstudio.headless com.civics.whisper com.civics.app; do
    launchctl bootout "gui/$(id -u)/$label" 2>/dev/null
    launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/$label.plist
  done
'
```

**Check status / restart one:**

```bash
ssh youruser@your-mac-studio.your-tailnet.ts.net 'launchctl print gui/501/com.civics.whisper | head -20'
ssh youruser@your-mac-studio.your-tailnet.ts.net 'launchctl kickstart -k gui/501/com.civics.whisper'   # restart
ssh youruser@your-mac-studio.your-tailnet.ts.net 'launchctl bootout gui/501/com.civics.whisper'        # stop until next login
```

**The FileVault gate (the actual limit on "survives reboot").** FileVault is **on** for
this Studio. On a cold boot, macOS decrypts nothing and starts *no* user processes —
not `launchd` LaunchAgents, not even Tailscale's system extension's user-facing
pieces — until **someone enters the disk password at the pre-boot screen and logs in**
(physically, or remotely via Screen Sharing if that's reachable pre-login on this Mac —
it generally isn't until the disk unlocks). This is a disk-encryption gate, not
something `launchd` can route around, and it's not something this project changes:
enabling auto-login or disabling FileVault trades away real security for convenience,
and that call belongs to whoever owns the machine, not to an automated deploy step.
**What `launchd` actually buys you:** the moment that one login happens, all three
services listed above come up **in the right shape, automatically** — no manual
`nohup`-ing three different processes in the right order. That's the same tradeoff
this Studio already lived with for `open-webui`'s existing LaunchAgent.

**Tailscale needs none of this** — it's already a macOS **system extension**
(`io.tailscale.ipn.macsys…`, under `/Applications/Tailscale.app/Contents/Library/
SystemExtensions/`), which macOS starts as part of the OS's system-extension framework,
independent of these LaunchAgents.

## Status as of July 15, 2026 (verified end-to-end, live on the instruct model)

| Check (from MacBook Air over tailnet) | Result |
|---|---|
| `http://100.x.x.x:8321/` and the MagicDNS URL | ✅ HTTP 200 |
| `/chat-status` | ✅ `{"enabled":true,"model":"qwen2.5-7b-instruct"}` |
| `POST /chat` (real tutor question) | ✅ grounded reply in ~0.5s |
| `POST /grade` (answer second opinion) | ✅ correct verdict in ~0.3s; 502 when LLM down |
| LM Studio `100.x.x.x:1234/v1/models` from outside | ✅ HTTP 200 |

`POST /grade` gives the quiz a semantic second opinion on a wrong answer (upgrade-only). It uses
the same LM Studio model as the tutor, so it shares the tutor's uptime dependency — but it fails
safe: if the LLM is down or the request times out, the quiz silently keeps its algorithm verdict.

### Why a non-thinking instruct model (and how to reason about model choice here)

The tutor and grader run on **`qwen2.5-7b-instruct`**, deliberately NOT a reasoning/"thinking"
model. Hard-won knowledge from this project:

- **Throughput was never the problem.** The Studio generates ~100 tok/s. The old model
  (`qwen3.6-35b-a3b`) felt slow because it emitted **~1000 hidden "reasoning" tokens before every
  short answer** — ~10s of latency you never see, per reply.
- **No API lever reliably disables that reasoning** on this LM Studio setup: `reasoning_effort`
  (low/minimal), the `/no_think` prompt switch, `enable_thinking:false`, and `chat_template_kwargs`
  were all tested — none consistently worked. The amount a model "thinks" is emergent from its
  weights, not a server dial, and reasoning + answer are one token stream (so capping `max_tokens`
  truncates the answer, not the thinking — that was the "I got lost thinking" empty-reply bug).
- **Reasoning is the wrong tool for this task.** It pays off on multi-step problems (math, logic,
  code) where intermediate steps catch errors. Civics answers are *retrieval* of known facts with a
  fixed answer key — nothing to derive — so reasoning is pure overhead and can even hurt via
  "overthinking." Match the model to the task: a fast instruct model.
- **Measured after the switch:** tutor ~0.4–1.5s (was ~11s), grading ~0.3s (was 6–14s), all grading
  test cases still correct. ~10–20× faster, no accuracy loss.
- **Model pick rationale:** instruct (not thinking/coding like Ornith or Qwen3-thinking); Qwen2.5
  for strong Bengali (the learner's language) and reliable JSON output for `/grade`; MLX 4-bit
  because it runs native on the Studio's Apple-Silicon GPU. To swap models, change `LLM_MODEL`
  (or the default in `server.js`) to the id shown by `lms ps` / `/v1/models`.

Client access note: the MagicDNS name failed on a device while the IP URL worked →
that device had MagicDNS off. **Use `http://100.x.x.x:8321` (IP form)** on the
phone to sidestep MagicDNS; type `http://` explicitly so the browser doesn't upgrade
to https (there is no TLS on this port).

## Tutor 502 root cause (fixed July 14, 2026)

`POST /chat` returned 502 because `fetch()` in server.js couldn't reach the LLM. Two
things stacked up:

1. **LM Studio wasn't binding loopback.** With the old server state, both
   `curl localhost:1234/v1/models` and `curl 127.0.0.1:1234/v1/models` on the Studio
   returned `000` (nothing listening), while `100.x.x.x:1234` answered 200 — it
   was bound only to the LAN/tailnet interface. Fix: toggle **Serve on Local Network**
   off/on and **restart LM Studio's server** so it re-binds. After that,
   `curl localhost:1234/v1/models` on the Studio returns **200**.
2. **`localhost` can resolve to IPv6 `::1` on Node 18+**, which LM Studio doesn't
   listen on. Fix: server.js now defaults to `http://127.0.0.1:1234` (explicit IPv4).

With both in place, no `LLM_URL` override is needed. If LM Studio ever reverts to
LAN-only, fall back to `LLM_URL=http://100.x.x.x:1234`. The proxy code itself was
always fine — verified end-to-end returning grounded tutor replies.

## LLM notes

- Qwen3.6-35B-A3B is a **thinking model**: without care it spends the whole token
  budget on reasoning and returns empty content. server.js already handles this
  (`max_tokens: 2000`, `reasoning_effort: "low"`, `<think>` stripped, empty-reply fallback).
- The tutor system prompt is grounded on the official Q&A passed as `context` and
  instructed never to contradict it (accuracy guarantee).

## Wife's phone (one-time)

1. Install **Tailscale** from the App Store.
2. Sign in with you@example.com.
3. Toggle the VPN on.
4. Open the URL above in Safari → Share → **Add to Home Screen**.

Her study progress (stats/weak spots) lives in localStorage, per browser + per URL.

## Facts & sources

Every question/answer was verified against official USCIS sources — see
[SOURCES.md](SOURCES.md). The "may change" badges (officeholders) were checked
July 14, 2026 and must be re-verified near the interview date.
