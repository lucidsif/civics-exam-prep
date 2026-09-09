#!/bin/bash
# One-shot: ensure LM Studio's headless server is up and the tutor model is
# loaded. Run at login by ai.lmstudio.headless.plist (NOT KeepAlive — `lms
# server start` kicks off its own persistent background service and returns
# immediately; this script's job is done once that's launched). Safe to
# re-run: both commands tolerate "already running" / "already loaded".
LMS="$HOME/.lmstudio/bin/lms"
"$LMS" server start -p 1234 --bind 127.0.0.1
sleep 3
"$LMS" load qwen2.5-7b-instruct --identifier qwen2.5-7b-instruct --context-length 8192 --parallel 4 -y || true
