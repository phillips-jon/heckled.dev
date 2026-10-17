# Heckled

heckled.dev heckles anything you made. Paste a landing page URL and a voiced
roaster performs a 45 to 60 second roast, with subtitles synced word by word
and a spotlight on whatever is being roasted, then gives you one real fix.

Built for the [Active Builders × Gradium AI builder challenge](https://activebuilders.dev/hackathon/gradium/).

## How it works

1. **Ingest** (`src/lib/landing.ts`): headless Chrome loads the page, screenshots
   it, and collects the headline, buttons, sections, pricing and proof with
   their boxes. Every request the page makes passes the public-address check
   in `src/lib/ssrf.ts`.
2. **Script** (`src/lib/script.ts`): Claude Opus 5.5 sees the screenshot and
   the element list and writes the set as structured JSON: eight bits, each
   pointing at the elements it mentions, a score, the quotable line, and the
   fix. Claude Sonnet 5.5 writes the plain-spoken analysis alongside.
3. **Voice** (`src/lib/voice.ts`): Gradium speaks each beat with the roaster's
   designed voice and pronunciation dictionary; ffmpeg joins them into one
   MP3, and the word timestamps become the player's timeline.
4. **Play** (`src/components/Player.tsx`): the page pans and zooms to each
   target while captions follow the voice.

The queue is the `heckles` table in SQLite, worked by a loop that
`src/instrumentation.ts` starts inside the Next.js server. One process, no
other services.

## Development

Needs Node 20.9+, ffmpeg, and Google Chrome.

```sh
npm install
cp .env.example .env.local   # add the Gradium and Anthropic keys
npm run dev                  # http://localhost:3015
```

`npm run voices` designs the roasters' voices with Gradium Voice Design,
localizes them to French, creates the pronunciation dictionaries, and writes
the ids to `src/config/voices.json`. The plan allows six custom voices; the
rest fall back to the flagship voices in `src/lib/roasters.ts`.

## Deploy

Push to `main` and GitHub Actions runs `deploy/release-deploy` on the server
over SSH (once the repository variable `DEPLOY_ENABLED` is `true`). It builds
a new release beside the live one, checks it on a spare port against a copy
of the database, then switches the symlink and restarts `heckled`.
`deploy/rollback` goes back one release.

Server layout:

```
/var/www/heckled.dev-repo.git    bare clone, fetches from GitHub (deploy key: github-heckled)
/var/www/heckled.dev-releases/   one worktree per release
/var/www/heckled.dev-shared/     .env and data/ (heckled.db, media/)
/var/www/heckled.dev             symlink to the live release
/opt/node-heckled                Node 24, the one better-sqlite3 is built for
```

The unit file is `deploy/heckled.service`, the nginx site `deploy/nginx.conf`.
The deploy user restarts the service through a sudoers entry limited to
`/usr/bin/systemctl restart heckled`.
