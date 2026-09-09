// Serves the study app and proxies tutor chat to a local LLM
// (LM Studio or any OpenAI-compatible server).
//
// Run on the Mac Studio:   node server.js
// Expose on the tailnet:   tailscale serve --bg 8321
//
// Env overrides: PORT, LLM_URL (default http://localhost:1234),
//                LLM_MODEL (default qwen2.5-7b-instruct)
//
// The tutor and answer-grading use a non-thinking INSTRUCT model on purpose.
// Reasoning models (Qwen3-thinking, etc.) spend ~1000 hidden tokens "thinking"
// before every reply — ~10s of latency that doesn't improve these simple civics
// answers. qwen2.5-7b-instruct answers in well under a second and grades just as
// accurately. Keep it loaded in LM Studio (alongside anything else).

const http = require("http");
const fs = require("fs");
const path = require("path");

// Build stamp: the git short-SHA this process is running, read once at startup. Lets a
// deploy verify from afar that the RESTARTED server is actually serving the new commit
// (curl /version and compare to what was pushed). "unknown" if git isn't available.
let BUILD = "unknown";
try { BUILD = require("child_process").execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim(); } catch (e) {}

const PORT = Number(process.env.PORT || 8321);
// Default to 127.0.0.1 (explicit IPv4), not "localhost": on Node 18+ localhost can
// resolve to IPv6 ::1, which LM Studio does not listen on. Requires LM Studio's
// "Serve on Local Network" enabled so it binds loopback. Override with LLM_URL if
// LM Studio is only reachable at the tailnet IP (e.g. http://100.x.x.x:1234).
const LLM_URL = process.env.LLM_URL || "http://127.0.0.1:1234";
const LLM_MODEL = process.env.LLM_MODEL || "qwen2.5-7b-instruct";

// Speech-to-text for the spoken mock interview. A local whisper.cpp server
// (start: whisper-server -m models/ggml-base.en.bin --port 8090) exposes an
// OpenAI-compatible /v1/audio/transcriptions endpoint. The client records her
// answer and sends a 16 kHz mono WAV; we forward it as multipart and return the
// transcript. Same local-only, zero-cloud posture as the tutor LLM.
const WHISPER_URL = process.env.WHISPER_URL || "http://127.0.0.1:8090";
const WHISPER_MODEL = process.env.WHISPER_MODEL || "whisper-1";

const SYSTEM_PROMPT =
  "You are a warm, patient tutor helping an adult English learner (a Bengali " +
  "speaker) study for the 2008 USCIS naturalization civics test. Answer in " +
  "short, plain, simple English — two or three short sentences unless she asks " +
  "for more. Then, after a blank line, write the same answer in simple Bengali " +
  "(বাংলা) so she can read it in her first language. Always give the English " +
  "first and the Bengali second. Write plain text only, no markdown. The " +
  "official study answers shown to you are always correct; never contradict " +
  "them. If you are unsure of a fact, say so and point her to the official " +
  "answer on her card. Stay on topic: the civics test, basic U.S. history and " +
  "government, the naturalization interview, and English practice. Politely " +
  "decline anything else.";

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

// ---------- answer grading (LLM second opinion) ----------
// The app grades with a local string-matching algorithm first; when that says
// "wrong", it asks here for a semantic second opinion. Upgrade-only: this can
// confirm an answer the algorithm missed, never overturn a correct one.
const GRADE_SYSTEM =
  "You grade one answer on the 2008 U.S. naturalization civics test. A USCIS " +
  "officer accepts any response that MEANS the same as an official accepted " +
  "answer, even with spelling mistakes, missing small words, or an English " +
  "learner's phrasing. Be lenient about spelling and grammar; the meaning is " +
  "what matters. Grade ONLY against the official accepted answers given to you " +
  "— do not accept facts that are merely true but not on that list. Count how " +
  "many DISTINCT official answers the applicant gave (the same answer repeated " +
  "counts once). Reply with ONLY a compact JSON object and nothing else: " +
  '{"matched": <integer>, "why": "<max 8 words>"}.';

function extractJson(text) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

function handleGrade(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 100000) req.destroy(); });
  req.on("end", async () => {
    let p;
    try { p = JSON.parse(body); } catch (e) { return json(res, 400, { error: "Bad request." }); }
    const need = Number(p.need) || 1;
    const typed = String(p.typed || "").slice(0, 500);
    const accepted = (p.a || []).join("; ");
    const user =
      "Question: " + p.q + "\n" +
      "Official accepted answers: " + accepted + "\n" +
      (p.note ? "Note: " + p.note + "\n" : "") +
      "The applicant must give " + need + " distinct acceptable answer(s).\n" +
      'The applicant typed: "' + typed + '"';
    try {
      const r = await fetch(LLM_URL + "/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: "system", content: GRADE_SYSTEM }, { role: "user", content: user }],
          temperature: 0,
          max_tokens: 300, // instruct model: just the short JSON verdict, no reasoning tokens
          reasoning_effort: "low"
        }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await r.json();
      const parsed = extractJson((data.choices && data.choices[0].message.content) || "");
      const matched = parsed && Number.isFinite(Number(parsed.matched)) ? Number(parsed.matched) : 0;
      // Server decides acceptability so the client can't be fooled by a stray field.
      json(res, 200, { acceptable: matched >= need, matched, why: (parsed && String(parsed.why || "").slice(0, 80)) || "" });
    } catch (e) {
      json(res, 502, { error: "grader unavailable" });
    }
  });
}

// ---------- speech-to-text (whisper proxy) ----------
// Collects the raw WAV body (binary — must NOT be concatenated as a string) and
// forwards it to the local whisper server as multipart form-data. Upgrade-only in
// spirit: a bad or empty transcript just lets the client offer "try again / type it".
function handleTranscribe(req, res) {
  const chunks = [];
  let size = 0;
  req.on("data", c => { size += c.length; if (size > 6000000) req.destroy(); else chunks.push(c); });
  req.on("end", async () => {
    const audio = Buffer.concat(chunks);
    if (!audio.length) return json(res, 400, { error: "No audio." });
    try {
      const fd = new FormData();
      fd.append("file", new Blob([audio], { type: "audio/wav" }), "answer.wav");
      fd.append("model", WHISPER_MODEL);
      fd.append("response_format", "json");
      const r = await fetch(WHISPER_URL + "/v1/audio/transcriptions", {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(30000)
      });
      const data = await r.json();
      json(res, 200, { text: String((data && data.text) || "").trim() });
    } catch (e) {
      json(res, 502, { error: "transcriber unavailable" });
    }
  });
}

// ---------- one-time progress migration (old http origin → new https origin) ----------
// localStorage is per-origin, so when the phone's home-screen app moved from
// http://…:8321 to https://… (the mic needs a secure context) all saved progress
// was stranded under the old origin. Both URLs reach this same process (tailscale
// serve proxies https to :8321), so the old origin POSTs its civics-* keys here
// and the new origin GETs them. Held in memory only — the old origin keeps its
// copy, so a server restart just means tapping "send" again.
let migrateHold = null;
function handleMigratePost(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 200000) req.destroy(); });
  req.on("end", () => {
    let p;
    try { p = JSON.parse(body); } catch (e) { return json(res, 400, { error: "Bad request." }); }
    const keys = {};
    for (const k in p) if (k.startsWith("civics-") && typeof p[k] === "string") keys[k] = p[k];
    if (!Object.keys(keys).length) return json(res, 400, { error: "Nothing to migrate." });
    migrateHold = keys;
    json(res, 200, { ok: true });
  });
}

// Best-effort reachability probe for the whisper server (a quick GET to its root).
// Used only by /chat-status so the client can decide whether to show the spoken
// mock-interview mode. Short timeout so a down whisper doesn't stall the probe.
async function whisperReachable() {
  try {
    const r = await fetch(WHISPER_URL + "/", { signal: AbortSignal.timeout(1500) });
    return r.status < 500;
  } catch (e) {
    return false;
  }
}

function handleChat(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 100000) req.destroy(); });
  req.on("end", async () => {
    let payload;
    try { payload = JSON.parse(body); } catch (e) { return json(res, 400, { error: "Bad request." }); }
    const history = (payload.messages || []).slice(-12)
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    let system = SYSTEM_PROMPT;
    const ctx = payload.context;
    if (ctx && ctx.q) {
      system += "\n\nShe is asking about this official test question:\nQ: " + ctx.q +
        "\nOfficial accepted answers: " + (ctx.a || []).join("; ") +
        (ctx.note ? "\nNote: " + ctx.note : "");
    }
    try {
      const r = await fetch(LLM_URL + "/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: "system", content: system }, ...history],
          temperature: 0.4,
          max_tokens: 1000, // instruct model answers in 2-3 sentences; ample room if she asks for more
          reasoning_effort: "low"
        }),
        signal: AbortSignal.timeout(120000)
      });
      const data = await r.json();
      let reply = ((data.choices && data.choices[0].message.content) || "")
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/\*\*/g, "")
        .trim();
      if (!reply) reply = "Sorry — I got lost thinking. Please ask me that again.";
      json(res, 200, { reply });
    } catch (e) {
      json(res, 502, { error: "The tutor's computer isn't answering right now." });
    }
  });
}

const MIME = { ".html": "text/html; charset=utf-8", ".md": "text/plain; charset=utf-8", ".js": "text/javascript" };

http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/chat") return handleChat(req, res);
  if (req.method === "POST" && req.url === "/grade") return handleGrade(req, res);
  if (req.method === "POST" && req.url === "/transcribe") return handleTranscribe(req, res);
  if (req.method === "POST" && req.url === "/migrate") return handleMigratePost(req, res);
  if (req.method === "GET" && req.url === "/migrate") return json(res, 200, { data: migrateHold });
  if (req.url === "/version") return json(res, 200, { build: BUILD });
  if (req.url === "/chat-status") return whisperReachable().then(stt => json(res, 200, { enabled: true, model: LLM_MODEL, build: BUILD, stt }));
  const file = path.normalize(path.join(__dirname, req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0])));
  if (!file.startsWith(__dirname + path.sep) && file !== path.join(__dirname, "index.html")) {
    res.writeHead(403); return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("Civics app on http://localhost:" + PORT + "  →  LLM at " + LLM_URL + " (" + LLM_MODEL + ")");
});
