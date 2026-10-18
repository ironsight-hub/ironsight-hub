# IRONSIGHT ROOM HUB — the free hosted multiplayer service (T114).
# Pure hub: the authoritative room service bundle + the game modules it simulates with.
# NO static serving here (IRON_STATIC unset) — the game lives on the static Space;
# this container exists because a static Space cannot host a server process.
# Works as-is on: HF (PRO-gated now), Render, Koyeb, Fly, any Docker host, or `bun server.js`.
FROM oven/bun:1
WORKDIR /app
COPY server.js ./
COPY js/ ./js/
COPY maps/ ./maps/
ENV IRON_PORT=7860 \
    IRON_GAME=/app/js
EXPOSE 7860
CMD ["bun", "server.js"]
