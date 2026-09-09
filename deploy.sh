#!/usr/bin/env bash
#
# Self-service deploy: ship the current `main` from this machine (the MacBook Air)
# to the live app on the Mac Studio, then verify — no manual steps on the Studio.
#
#   ./deploy.sh setup <studio-macos-username>   # one time: authorize the SSH key
#   ./deploy.sh                                  # deploy main + verify
#
# It (1) preflights (clean tree, on main), (2) pushes to GitHub for history, (3) pushes
# STRAIGHT to the Studio's checkout over the air_to_studio SSH key (so the Studio never
# needs GitHub credentials — its non-interactive shell can't reach the macOS keychain),
# using receive.denyCurrentBranch=updateInstead so the working tree updates on push,
# (4) restarts node on the Studio, (5) verifies from here that the RESTARTED server is
# serving the exact commit we pushed (via the /version build stamp) and is healthy.
# Config lives in .deploy.env (gitignored).
#
set -euo pipefail
cd "$(dirname "$0")"

HOST="your-mac-studio.your-tailnet.ts.net"   # Tailscale MagicDNS name of the Studio
URL="http://100.x.x.x:8321"              # how the Air reaches the served app (IP form)
KEY="$HOME/.ssh/air_to_studio"                # dedicated Air->Studio key
REPO_REL="civics-exam-taker"                   # served checkout on the Studio, relative to its home
                                                # (NOT under Documents/Desktop/Downloads — those are
                                                # TCC-protected; a launchd-spawned node there hangs
                                                # forever in its own startup getcwd() call)
[ -f .deploy.env ] && . ./.deploy.env         # may set STUDIO_USER (and override the above)

SSH_OPTS="-i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
ssh_studio() { ssh $SSH_OPTS "${STUDIO_USER:?run './deploy.sh setup <user>' first}@$HOST" "$@"; }

# ---- one-time setup: authorize the key + remember the username ----
if [ "${1:-}" = "setup" ]; then
  user="${2:?usage: ./deploy.sh setup <studio-macos-username>}"
  echo "Authorizing $KEY.pub for $user@$HOST (you'll be asked for the Studio password once)…"
  ssh-copy-id -i "$KEY.pub" -o StrictHostKeyChecking=accept-new "$user@$HOST" || true
  printf 'STUDIO_USER=%s\n' "$user" > .deploy.env
  STUDIO_USER="$user"   # load into THIS shell so the steps below can connect
  echo "Saved STUDIO_USER=$user to .deploy.env. Verifying login + preparing the checkout…"
  ssh_studio 'cd ~/'"$REPO_REL"' && git config receive.denyCurrentBranch updateInstead && echo "OK: ready as $(whoami) on $(hostname), repo at $(pwd)"'
  echo "Setup done. Now just run: ./deploy.sh"
  exit 0
fi

# ---- preflight ----
branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" = "main" ] || { echo "✗ On '$branch', not main. Switch to main first."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "✗ Working tree is dirty. Commit before deploying."; exit 1; }
echo "→ Reminder: make sure /tests.html is green before shipping."

LOCAL_SHA="$(git rev-parse --short HEAD)"
echo "→ Deploying $LOCAL_SHA to the Studio…"

# ---- push to GitHub (history/backup) ----
git push origin main

# ---- deploy: push straight into the Studio's checkout over SSH (no GitHub creds there) ----
ssh_studio 'cd ~/'"$REPO_REL"' && git config receive.denyCurrentBranch updateInstead'
GIT_SSH_COMMAND="ssh $SSH_OPTS" git push "$STUDIO_USER@$HOST:$REPO_REL" main

# ---- restart node on the Studio ----
# node runs under launchd (com.civics.app, KeepAlive) — see deploy/launchd/. Kickstart
# it (kill + relaunch the supervised job) rather than pkill+nohup, which would race
# launchd's own KeepAlive restart and could leave two instances fighting over :8321.
ssh_studio 'cd ~/'"$REPO_REL"' || exit 1; \
  launchctl kickstart -k "gui/$(id -u)/com.civics.app"; sleep 2; \
  echo "restarted at $(git rev-parse --short HEAD); local /chat-status:"; curl -s localhost:8321/chat-status; echo'

# ---- verify from the Air: the restarted server serves the pushed commit + is healthy ----
sleep 1
REMOTE_BUILD="$(curl -s -m 10 "$URL/version" | sed -n 's/.*"build":"\([^"]*\)".*/\1/p')"
STATUS="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$URL/chat-status" || echo 000)"
echo "→ pushed=$LOCAL_SHA  live=$REMOTE_BUILD  /chat-status=$STATUS"
if [ "$REMOTE_BUILD" = "$LOCAL_SHA" ] && [ "$STATUS" = "200" ]; then
  echo "✓ Deploy verified — the Studio is live on $LOCAL_SHA."
else
  echo "✗ Verification failed (live build '$REMOTE_BUILD' != pushed '$LOCAL_SHA', or status $STATUS)."
  echo "  Check ~/Library/Logs/civics-app.log on the Studio; the previous version may still be running."
  exit 1
fi
