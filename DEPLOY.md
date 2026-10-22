# ironsight online hub — Render/GitHub deploy

The Online-mode match hub (bun + socket.io). This is the file the live site dials at
`/room`. Carries the full T157-parity hub plus:
- **T158 ROOM-STATE LAW** — every `joined` ack carries `live` + `md`: mid-match
  Quickplay joins land IN the fight, not on an empty lobby face.
- **T151 `FOLD = 10`** — the walk-doubling fix, server leg (167 ms jitter buffer).
- **[T160] PORT precedence** — Render's injected `PORT` is read first; `IRON_PORT`
  stays a dev/probe override; bare `bun index.ts` still binds 3010.
- **[T161] server legs** — the `report` op (G-8's server half: 24 h per-reporter
  dedupe, only >= 3 DISTINCT reporters records the §50.3 rung-3 evidence; reports
  never kick by themselves); the dual-path `prestige` op (REGULAR = the shipped law
  verbatim, CLASSIC = x1.5 CR + RP soft-reset; acks `prestige` with path/pr/cr); and
  the placements law (the season's first 5 ranked matches ride x2 RP volatility,
  server-side `rec.rk.m` is the truth).

## WHERE THINGS GO

**GitHub:** the hub service lives at `mini-services/ironsight-room/` (index.ts,
package.json, bun.lock, accounts.json, career.json); the server-side sim modules
sit at repo-root `js/` (36) + `maps/` (36, incl. VOSKHOD). Commit + push. DEPLOY.md itself is
documentation — keep or delete.

**Render:** Web Service -> your repo, then:
- Root Directory: `mini-services/ironsight-room`
- Environment:    Bun
- Build Command:  `bun install`
- Start Command:  `bun index.ts`
- Port: nothing to set — the code reads Render's `PORT` env first ([T160]).
- Env vars: `IRON_GAME` = `../../js` — REQUIRED. The hub imports the server-side
  sim modules from repo-root `js/` and reads `maps/` at boot; without it the boot
  import falls back to a dev-only absolute path and crashes. (`IRON_PORT` remains
  an optional dev/probe override.)

## VERIFY AFTER DEPLOY

1. Log banner contains `fold 10`.
2. Quickplay E2E on the live site: menu -> ONLINE -> pick a mode -> QUICKPLAY ->
   redirect `?mp=1&room=...&auto=1&md=...` -> CONNECTING -> LOBBY (mode highlighted,
   DEPLOY button) -> DEPLOY -> in-match. Never the main menu.
3. Join a round already in progress -> you spawn in the fight (the ack's
   `live:true` + `md` doing their job), not on an empty lobby face.
4. Wire-visible [T161] ops: in-game reporting acks `{op:'report',ok}` (dup inside
   24 h acks `dup:true`); prestige from the career corner acks `prestige` with
   `path`/`pr`/`cr`.

## STATE FILES

`accounts.json` / `career.json` ship **EMPTY** (fresh production start — zero users,
same v1 shapes the loader reads). The dev hub's own state is NOT your production
state. Render's free disk is ephemeral: state resets on redeploy unless you mount a
disk at the service root. Delete both files for a re-fresh.

## CLIENT COUPLE

The game client (HF space ideations3/ao_is) is already current (the t161 SW stamp) —
no client deploy is needed. This repo carries the hub service (mini-services/ironsight-room/) plus its js/ + maps/ server modules; the client stays on HF ideations3/ao_is.
