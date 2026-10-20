# DEPLOY — ironsight-hub on Render (the T158 room service)

**What this folder is**: `mini-services/ironsight-room/` — the authoritative multiplayer
room service (bun + socket.io), the thing deployed at `https://ironsight-hub.onrender.com`.
This copy is the **T158 state** — the Quickplay parity chain's server half.

## What changed at T158 (the two seams this redeploy carries)

1. **[T158] THE ROOM-STATE LAW** — all three `chain('joined', …)` acks (restored / spec /
   normal join) now carry server-truth `live` (true when `room.match.state` is
   `countdown|live`) and `md` (`room.match.mode`). The [T157] client chain branches on
   these: LIVE/countdown room → port into the round with the server's mode; IDLE room →
   LOBBY face with roster + DEPLOY. Without them the client's `!d.live` was always true —
   the reported "Quickplay dumps in-match / sits on the wrong face" class.
   Sites: index.ts lines ~1517, ~1549, ~1573 (grep `\[T158\]`).
2. **[T158-RESTORE] FOLD=10** (index.ts line ~306) — the T151 walk-doubling server leg
   (input fold depth 10 per sim tick). The client legs (SNAP/RESYNC/VEL-GATE in mp.js)
   were already live on the game tree.

Both are additive — old clients never read the new ack keys; FOLD only deepens the
per-tick input drain. No protocol break, no client redeploy REQUIRED (but the t158
service-worker stamp self-purges caches on the game side anyway).

## Redeploy (GitHub → Render)

1. Commit THIS folder to the repo Render builds from (replace the old
   `mini-services/ironsight-room/` contents wholesale — index.ts, package.json, bun.lock).
2. Render → your hub service → Manual Deploy / or push = auto-deploy.
3. Health check after boot:
   - `curl -s -o /dev/null -w '%{http_code}' https://ironsight-hub.onrender.com/healthz` → 200
   - socket.io probe: `https://ironsight-hub.onrender.com/socket.io/?EIO=4&transport=polling` → 200 with `0{"sid":…`
4. Boot banner must read `fold 10` (not `fold 3`):
   `[room] ironsight-room (authoritative, MP-3.1 residuals) running on port … | fold 10 | …`
   That banner line is the one-glance proof the redeploy actually took.

## Do NOT overwrite on Render

- `accounts.json` / `career.json` — these are the SERVER's live account/career stores.
  This zip deliberately does not include them; the copies in the dev sandbox are local
  test state. If your Render service mounts a persistent disk, leave its stores alone.
- If the service has no persistent disk, stores regenerate fresh (honest behavior —
  accounts re-register, careers restart).

## Runtime contract

- bun runtime (`bun index.ts`), port from `IRON_PORT` env (Render sets its own — the
  service reads `process.env.IRON_PORT || 3010`; ensure Render's env wires it or the
  default build start command handles it as before).
- socket.io path `/` (behind Render's edge as before — no config change).
- The game (HF space `ideations3/ao_is`) dials this hub via the regions list
  (`RENDER (LIVE)` endpoint) or the same-origin `/room` proxy on shell hosts.
