# IRONSIGHT ROOM HUB

The authoritative multiplayer room service for IRONSIGHT FPS (bun + socket.io) —
deployed at `https://ironsight-hub.onrender.com`. The game client is a static
Space (HF `ideations3/ao_is`); this repo runs the server process the game dials
at `/room`.

- `mini-services/ironsight-room/` — the service Render deploys: Root Directory
  `mini-services/ironsight-room`, Environment Bun, Build `bun install`,
  Start `bun index.ts`. See DEPLOY.md for the full placement + verify law.
- `index.ts` — rooms/modes, accounts+career, queue, voice relay, custom-map
  registry, join flood limits. Carries the T158 room-state
  law, the T151 `FOLD = 10` server leg, T160 PORT precedence, and the T161
  report/prestige/placements laws.
- `js/` + `maps/` — the server-side simulation modules (36) and map registry
  (36, incl. the VOSKHOD battle map) the hub imports at boot. REQUIRED: set `IRON_GAME=../../js` on the host
  (module-relative; without it the boot import hits a dev-only default path).
- `accounts.json` / `career.json` — ship EMPTY (fresh production start). Host
  disk may be ephemeral: state resets on redeploy unless a volume is mounted.

Envs: `IRON_GAME=../../js` (required); `IRON_PORT` optional dev/probe override.
Legacy era (compiled `server.js` + Dockerfile Space) is retired — `index.ts`
replaces it.
