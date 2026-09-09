---
description: Deploy the current main to the live Mac Studio app and verify (N2 self-service deploy)
allowed-tools: Bash(./deploy.sh:*), Bash(git status:*), Bash(git rev-parse:*), Bash(cat .deploy.env), Bash(curl:*)
---

Ship the current `main` to the live civics app on the Mac Studio, with no manual steps on the Studio.

Steps:

1. Confirm the working tree is clean and on `main` (the app is already committed/pushed). If dirty, stop and tell me to commit first.
2. Remind me that `/tests.html` should be green before shipping (I run the browser tests; there's no headless runner).
3. Run `./deploy.sh`. It pushes `main`, SSHes to the Studio to `git pull` + restart `node server.js`, then verifies from here that the restarted server is serving the exact pushed commit (via the `/version` build stamp) and returns `/chat-status` 200.
4. Report the outcome plainly: `pushed=<sha> live=<sha> status=<code>` and whether it verified.

If `./deploy.sh` reports that setup is needed (no `.deploy.env` / permission denied), do NOT try to guess credentials. Tell me to run the one-time setup once:

```
./deploy.sh setup <my-studio-macos-username>
```

which authorizes the existing `~/.ssh/air_to_studio` key (it will prompt me for the Studio password once) and saves the username. After that, `/deploy` works on its own.

Never enter or handle my password yourself — `ssh-copy-id` prompts me directly.
