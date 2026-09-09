#!/bin/bash
# Wrapper so launchd spawns node with a plain, non-TCC-protected cwd. The served
# checkout must NOT live under ~/Documents (or ~/Desktop, ~/Downloads): Node's own
# startup calls getcwd() internally, and under a launchd-spawned process that call
# hangs FOREVER (confirmed via `sample`) when cwd resolves into a TCC-protected
# special folder — not a quick deny, an indefinite hang. `~/civics-exam-taker` is a
# plain home-directory path, so this is a non-issue there. `exec` replaces this
# shell with node, so launchd's KeepAlive still tracks node's own PID directly —
# see DEPLOY.md's "Persistence across reboots" section for the full story.
cd "$HOME/civics-exam-taker" || exit 1
exec /opt/homebrew/bin/node server.js
