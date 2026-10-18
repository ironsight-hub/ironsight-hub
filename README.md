---
title: IRONSIGHT ROOM HUB
emoji: 🛰️
colorFrom: gray
colorTo: red
sdk: docker
app_port: 7860
pinned: false
short_description: The multiplayer room service for IRONSIGHT FPS
---

# IRONSIGHT ROOM HUB

The authoritative multiplayer room service for IRONSIGHT FPS — deploy this folder (server.js + js/ + maps/ + Dockerfile) to any container host and point the game's region at it (CUSTOM region, or edit the MP_REGIONS hub row in js/config.js). The game page itself stays a STATIC Space; this container exists because a static Space cannot host a server process.

- `server.js` — the compiled room service (rooms/modes, accounts+career+queue, voice relay, custom-map registry, join flood limits, optional join PoW, /healthz + /metrics). CORS open (`*` or IRON_ORIGIN allowlist).
- `js/` + `maps/` — the game modules the server imports for authoritative simulation.

Envs: IRON_PORT (default 3010; HF/Render use 7860/10000 — set to the host's expected port), IRON_GAME, IRON_MAP, IRON_ORIGIN, IRON_POW, IRON_LS_WEBHOOK_SECRET, IRON_CAREER/IRON_ACCOUNTS. Stores are ephemeral on free hosts — mount a volume or accept resets.
