// ============================================================
// IRONSIGHT — mp.js : MP-1 movement replication client (Task 27)
// Design: docs/INTEGRATION_SPEC.md §4/§5/§8/§9. Enabled only when
// CFG.MP.enabled (?mp=1 URL param) — the offline path never runs this.
//
// Responsibilities (spike-proven patterns carried over):
//   - fixed-step accumulator (1/60, spiral guard 250ms) inside the rAF loop
//   - per-seq input history + server-ack reconciliation (replay via THE
//     SHARED physics.js core — same module the server runs)
//   - correction smoothing sized to the ERROR budget (<=0.246m): geometric
//     blend toward the replayed position, ~98% consumed in 100ms (spec §8)
//   - remote interpolation: 100ms buffer, shortest-arc yaw lerp (spec §9)
//   - ordered delivery handled server-side (law 7); seq-guard is defense
//   - look (yaw/pitch) is client-authoritative, echoed in snapshots (§9)
// Probe surface: window.__mp (stats + internals) for acceptance probes.
// ============================================================
import * as THREE from 'three';
import { CFG, MP_REGIONS, WEAPONS, knockFor } from './config.js'; // T43 §27: registry drives join-time endpoint resolution · [T138] WEAPONS + knockFor join — the kill event's weapon id → the damage-scaled corpse impulse (config single truth)
import { World, updateGasZone, makeLootPickup, takeLootPickup } from './world.js'; // [T171] the BR zone mirror + the loot manifest renderer ride the world builder
import { stepState } from './physics.js';
import { Replay } from './replay.js'; // T42 §26: transform replay capture (client-side only; inert unless ?replay=1)
import { finishById, trailById, emoteById } from './cosmetics.js'; // T2-5 Phase 2+3 (T48a/T55): pure defs — remote capsule tint + trail/emote ids (no cycle: cosmetics imports nothing)
import { ops3dRig } from './ops3d.js'; // [T130] the skinned remote body (no cycle: ops3d imports three/addons only)
import { voice, setSocket as voiceSetSocket, reset as voiceReset, tick as voiceTick, onPacket as voiceOnPacket } from './voice.js'; // [T140 G-4] the T124 client half finally joins the wire — the FUNCTIONS are module-level exports (the state object `voice` carries on/tx/ready/err only; the live-browser TypeError catch rewired the call sites)
import { Maps } from './maps.js'; // [T140 G-3] the customWire target (maps.js imports nothing — no cycle)
import * as FX from './effects.js'; // T55 §39.3: pooled trail wake (effects imports config/gamepad only — no cycle)

const F = { CROUCH: 1, SLIDE: 2, GROUNDED: 4, SPRINT: 8 };
const DT = 1 / 60;
const SNAP_BUF = 12;

export const mp = {
  ready: false, connected: false, joined: false,
  spec: false, wantSpec: false, // T41 §25: spectator role — wantSpec set pre-connect (?mp=1&spec=1), spec = SERVER-TRUTH from the ack
  stats: { rttEcho: 0, errEma: 0, errMax: 0, corrCount: 0, drift: 0, stale: 0, remoteGap: 0, snapsHz: 0, inputs: 0, serverHz: 0, fires: 0 },
};

let socket = null, player = null, scene = null;
let myId = null, token = null;
mp.myId = null; // T1-1: match events carry ids — main.js compares via mp.myId
let seq = 0, acc = 0;
let rejoinTries = 0;           // [T141] the one-shot honest rejoin budget (2/session, reset at initMP)
let history = [];              // {seq, x,y,z, input} — prediction trail for replay
let snapBuf = [];              // {t, tick, pl}
let lastTick = -1;
let pending = { jumpEdge: false, crouchEdge: false };
let recon = null;              // {x,y,z,vx,vy,vz} — latest replayed state (blend target)
let graceUntil = 0;           // respawn sync: minimum grace before err metric resumes (wall-clock floor)
let syncEp = 0;               // teleport epoch: history entries are epoch-tagged; err counts only same-epoch acks
let respawnTarget = null;     // {x,z} — while set, stale pre-respawn snapshots must not re-seed recon (§8)
let pendingRespawn = null;    // spawn-sync race fix: match can start before 'joined' lands — deliver on join
let respawnPendingUntil = 0;  // respawn-in-flight window: stale al:0 snaps must not re-kill a just-respawned client
const remotes = new Map();     // id -> {mesh, tag, lastF}
let pingTimer = null, snapTimes = [];
mp.matchTl = null; mp.uavT = 0; mp.myStreak = 0; mp.inLiveMatch = false; mp.roster = null; mp.mBlock = null; // MP-3.1 mirrors
mp.lastEnd = null; // Task 35: last match end event (board[] probe surface)
mp.lastFlash = null; // Task 35: last flash event (probe surface: v[] + mineStr)
mp.killcamHide = false; // G-2: killcam isolates the replay cast — live remote meshes gate on this (main.js owns the flag; nametag rides the mesh)

// [T148] median snap ARRIVAL interval (ms) — 1 Hz recompute off the snapTimes ring; 0 = no
// cadence yet (the floor delay covers it). Burst arrivals (polling fallback, mobile radios)
// inflate the median, so the interp delay stretches exactly when the stream turns bursty —
// the anti-sawtooth law behind the adaptive interp delay (frame()).
let snapMedMs = 0, snapMedT = 0;
function medianSnapMs(now) {
  if (now - snapMedT > 1000 && snapTimes.length >= 4) {
    snapMedT = now;
    const ds = [];
    for (let i = 1; i < snapTimes.length; i++) ds.push(snapTimes[i] - snapTimes[i - 1]);
    ds.sort((a, b) => a - b);
    snapMedMs = ds[Math.floor(ds.length / 2)] || 0;
  }
  return snapMedMs;
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('load fail ' + src));
    document.head.appendChild(s);
  });
}

// [T124] the loader path is DOCUMENT-RELATIVE, never root-absolute — the playtest 404: the
// host mounts the build under ao_is/ (the convention note above), so '/vendor/...' resolved
// PAST the mount and every on-demand socket.io boot 404'd (Online > Quickplay console).
// new URL(...) against document.baseURI serves BOTH host conventions (a root-rooted static
// server AND the /ao_is/-prefixed mount) with zero config — the four loadScript sites ride this.
const SIO_SRC = new URL('vendor/socket.io.min.js', document.baseURI).href;

// [T148] THE QUIET-CLOSE LAW — socket.close() stops THIS socket, but the manager's
// reconnection timer (socket.io default reconnection:true, Infinity attempts) can keep a dead
// dial polling in the background: the T148 live log caught the same-origin 302/CORS cycle
// repeating across the connect window. Disarm the manager FIRST, then close — a dead dial
// dies exactly once (live carriers keep their manager; only these teardown sites call this).
function killSocket(s) {
  if (!s) return;
  try { if (s.io && typeof s.io.reconnection === 'function') s.io.reconnection(false); } catch (_) {}
  try { s.close(); } catch (_) {} // [T146] the original close hygiene, now manager-disarmed
}

// [T148] the local-host test for the straight-dial law — PURE (host injected, the
// resolveRegion contract): loopback + RFC1918 LAN keep the legacy 'auto' derivation
// byte-identical (dev self-hosts that DO strip the mount); every other https host is static.
function isLocalHost(host) {
  if (typeof host !== 'string') return false;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost') ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

let mpOpts = null;      // initMP opts (handlers rebind on transport fallback)
let fallbackDone = false;

export function initMP(opts) {
  mpOpts = opts;
  rejoinTries = 0; // [T141] a fresh session resets the rejoin budget
  mp.wantSpec = !!opts.spec; // T41 §25.1: spectate request rides initMP (?mp=1&spec=1 → main.js opts.spec)
  mp.pid = (typeof opts.pid === 'string' && opts.pid) ? opts.pid : null; // T44 §28.1: persistent device identity; absent = anonymous (pre-T44 bytes)
  mp.profile = null; // T44 §28.3: server-truth career profile (joined.profile)
  mp.ranked = null; // T46 §30.6: server-truth ranked view (joined.ranked) — null = anonymous/old server (corner RANK row hidden)
  mp.vars = null; // §55 [T173]: server-truth per-user bag (the 'vars' channel; null = never fetched / offline — the session-bag law keeps this OUT of career)
  mp.priv = opts.priv === true; mp.codeWanted = (typeof opts.code === 'string' && opts.code) ? opts.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : null; // T45 §29.3: private create / join-by-code ride initMP (?priv=1 / ?code=XXXXXX); absent = public, pre-T45 bytes
  Replay.arm(!!opts.replay, { room: CFG.MP.room, map: 'outpost' }); // T42 §26.1: recording arm (?mp=1&replay=1); flag OFF = module inert
  player = opts.player; scene = opts.scene;
  // [T124] the loader path is SIO_SRC (document-relative above) — the '/fps/...' prefix in the
  // Task-29 lineage AND the later '/vendor/...' root-absolute form both assumed a host root;
  // the baseURI form serves every convention (root-rooted server / ao_is/ mount) with zero config
  loadScript(SIO_SRC).then(() => {
    // T43 §27.4: join-time region resolution — absent/garbage opts.settings resolves 'auto'
    // == pre-T43 byte-identical URL; the existing one-shot :3010 fallback block below is untouched
    const reg = resolveRegion(opts.settings, location.hostname, location.protocol); // [T122] (5) the proto rides: a TLS page's direct region dials https (honest, never a browser block)
    if (reg.fellBack) console.warn('[mp] region: ' + reg.why + ' — using default endpoint');
    openSocket(reg.url);
  }).catch(e => console.error('[mp] socket.io load failed', e));
}

// ---------------- T2-7 (Task 43, spec §27) — region selection: resolve + live ping ----------------

// §27.4: join-time endpoint resolution — PURE, probe-first contract (no DOM/location access;
// host is injected). Returns {url, fellBack, why}:
//   auto/absent/garbage → {CFG.MP.server, false}          (legacy derivation, byte-identical)
//   direct              → {'http://HOST:3010', false}      (gateway skipped; fallback guard inert — url !== CFG.MP.server)
//   custom + valid      → {url, false}                     (http/https only, trimmed)
//   custom + invalid    → {CFG.MP.server, true, why}       (REPORTED, never silently re-routed)
export function resolveRegion(settings, host, proto) {
  const id = settings && typeof settings.mpRegion === 'string' ? settings.mpRegion : 'auto';
  const reg = MP_REGIONS.find(r => r.id === id);
  if (reg && reg.endpoint === 'direct') return { url: (proto === 'https:' ? 'https://' : 'http://') + host + ':3010', fellBack: false }; // [T122] (5) a TLS page dials https (honest TLS fail — NEVER a browser mixed-content block); the 2-arg legacy call stays byte-identical
  if (reg && reg.endpoint === 'custom') {
    const raw = typeof settings.mpRegionUrl === 'string' ? settings.mpRegionUrl.trim() : '';
    if (!raw) return { url: CFG.MP.server, fellBack: true, why: 'custom endpoint URL is empty' };
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') return { url: u.toString(), fellBack: false };
      return { url: CFG.MP.server, fellBack: true, why: 'custom endpoint protocol must be http/https' };
    } catch (_) { return { url: CFG.MP.server, fellBack: true, why: 'custom endpoint is not a valid URL' }; }
  }
  if (reg && typeof reg.endpoint === 'string' && /^https?:\/\//.test(reg.endpoint)) return { url: reg.endpoint, fellBack: false }; // [T114] the fleet law grows the direct row — an ABSOLUTE http(s) endpoint in MP_REGIONS is the row's own dial (the free hosted hub Space; dialTarget hands it to io() verbatim with the service's root path, no mount prefix involved)
  // [T148] THE STRAIGHT-DIAL LAW ('auto' edition) — a relative 'auto' value is a same-origin
  // MOUNT (CFG.MP.server '/room'), and on every host this game ships on (HF Pages, the z.ai
  // preview shell — neither proxies /room) that mount 302s into a CORS wall: the T148 live log
  // caught FOUR poll/WS failure cycles (a ~15-25s 'connecting' face) before the dead-mount heal
  // fired. Old saves KEEP mpRegion:'auto' by the default-merge law, so every legacy session
  // paid the storm once per browser. A SECURE page on a non-local host can never answer the
  // mount — resolve it STRAIGHT to the first absolute row (render) and REPORT the re-route
  // (the fellBack contract); dev (http / loopback / LAN) keeps the legacy derivation verbatim.
  if (proto === 'https:' && !isLocalHost(host)) {
    const abs = MP_REGIONS.find(r => typeof r.endpoint === 'string' && /^https?:\/\//.test(r.endpoint));
    if (abs) return { url: abs.endpoint, fellBack: true, why: "auto on a static https host — the same-origin mount can't answer there, dialing " + abs.id + ' directly' };
  }
  return { url: CFG.MP.server, fellBack: false }; // 'auto' + unknown ids
}

// [T122] (5) the secure-dial law — PURE, probe-first (the resolveRegion contract):
// a TLS page MUST NOT dial ws:// (the browser blocks it as mixed content — the user
// report) and MUST NOT attempt the plain-HTTP :3010 fallback (the room service has no
// TLS — the attempt would fail anyway, and as ws:// it gets browser-blocked first).
// Returns the per-context dial plan:
//   https → wss-FIRST transports + the direct :3010 fallback FORBIDDEN (null)
//   http  → the legacy plan byte-identical (websocket-first + the http:// :3010 fallback)
// [T147] THE ORDER LAW — BOTH branches are websocket-first now. The T146 live report
// proved polling-first strands real sessions on long-poll: the engine's UPGRADE probe
// ("closed before the connection is established") never lands on high-RTT hosts, so every
// snapshot arrives in BURSTS one poll-RTT apart — onSnap recomputes the reconcile recon
// per burst and the §8 correction blend yanks the predicted player each time (the
// movement-stutter report, verbatim). ws-first dials the good transport DIRECTLY (the T144
// wire probe already proved the hub upgrades websocket from the game's own origin);
// tryAllTransports:true (rides every io() call site) keeps the honest fallback — an
// environment that blocks wss (sandboxed preview iframes, corporate proxies) fails over
// to polling exactly once per connect, the same one console line it logged before.
export function dialPlan(pageProto) {
  return pageProto === 'https:'
    ? { transports: ['websocket', 'polling'], directFallback: null }
    : { transports: ['websocket', 'polling'], directFallback: 'http://' };
}

// [T129] the ANYWHERE dial law — PURE (no DOM/location; the resolveRegion contract):
// a RELATIVE server value is a same-origin MOUNT PREFIX (CFG.MP.server '/room' — the
// deployment's proxy strips it: the Next route handler, nginx `location /room/`, caddy
// `handle_path`); the page's own scheme rides so mixed content is structurally dead.
// An ABSOLUTE http(s) URL is a direct endpoint (the room service's own default path).
// io('/room') would parse '/room' as a socket.io NAMESPACE — the mount MUST dial
// io('/', { path }) instead. Returns {url, path} for the io() call.
export function dialTarget(server) {
  if (typeof server === 'string' && server.startsWith('/')) {
    return { url: '/', path: server.replace(/\/+$/, '') + '/socket.io/' };
  }
  return { url: server, path: null };
}

// [T146] THE DEAD-MOUNT AUTO-HEAL — the user's own loop ("says connecting then loops to home,
// a few times"): a RELATIVE region value ('auto' → CFG.MP.server '/room') is a SAME-ORIGIN
// MOUNT — on a static page NOTHING strips it, the dial 404s forever. resolveRegion already
// prefers an absolute row; the heal closes the loop for SAVES still storing a relative id:
// flip mpRegion to the first absolute endpoint row, persist through the SAME settingsChanged
// channel the chip uses, and return the re-dial URL (null = nothing to heal — honest face).
function healDeadMount(settings) {
  if (!settings) return null;
  const abs = MP_REGIONS.find(r => typeof r.endpoint === 'string' && /^https?:\/\//.test(r.endpoint));
  if (!abs || settings.mpRegion === abs.id) return null;
  settings.mpRegion = abs.id;
  try { if (typeof mpOpts.settingsChanged === 'function') mpOpts.settingsChanged(); } catch (_) {} // persistence rides main's applySettings (the chip's own channel)
  console.warn('p] dead-mount auto-heal: mpRegion -> ' + abs.id + ' (' + abs.endpoint + ')');
  return abs.endpoint;
}

// §27.2: live region ping — TEMPORARY socket.io connection reusing the EXISTING unguarded
// server ping/pong handler (index.ts socket.on('ping') → chain('pong')); ZERO new wire events.
// ensureIo(): the ONLINE tab lives in the offline menu too (no ?mp=1 boot → io not yet loaded),
// so the loader runs on demand — same script openSocket uses. Callback shape: onSample(rtt)
// per pong, onDone({url, samples, median, error?}) ONCE; unreachable endpoints REPORT
// (error + samples<5), never throw across the UI boundary. Returns the raw socket (probe seam).
export function mpPingRegion(url, opts = {}) {
  const n = opts.n || 5, gapMs = opts.gapMs || 150, connectTimeoutMs = opts.connectTimeoutMs || 4000;
  const onSample = opts.onSample || (() => {}), onDone = opts.onDone || (() => {});
  const finish = (s, samples, timer, settle, error) => {
    if (s.__t43done) return; s.__t43done = true;
    if (timer) clearInterval(timer); if (settle) clearTimeout(settle);
    try { s.close(); } catch (_) {}
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    onDone({ url, samples: [...samples], median, error });
  };
  const boot = () => {
    const samples = [];
    let timer = null, settle = null;
    const dt = dialTarget(url); // [T129] the anywhere dial law (mount prefix → io('/',{path}))
    const s = io(dt.url, { path: dt.path || '/socket.io/', transports: dialPlan(location.protocol).transports, tryAllTransports: true, forceNew: true, timeout: connectTimeoutMs, reconnection: false }); // verbatim openSocket pattern + probe hygiene · [T122] (5) the secure-dial transports · [T147] try-all rides here too
    s.on('connect', () => {
      s.on('pong', d => { const rtt = performance.now() - d.t; samples.push(rtt); onSample(rtt); });
      let sent = 0;
      timer = setInterval(() => { s.emit('ping', { t: performance.now() }); if (++sent >= n) clearInterval(timer); }, gapMs);
      settle = setTimeout(() => finish(s, samples, timer, settle, samples.length ? null : 'no pong samples'), (n - 1) * gapMs + 1000); // settle window for stragglers
    });
    s.on('connect_error', e => finish(s, samples, timer, settle, 'connect: ' + ((e && e.message) || e)));
    return s;
  };
  if (typeof io !== 'undefined') return boot();
  loadScript(SIO_SRC).then(boot).catch(e => onDone({ url, samples: [], median: null, error: 'io load: ' + ((e && e.message) || e) }));
  return null;
}

// §33.3: season ladder fetch — TEMPORARY connection riding the NEW unguarded 'lb' server
// handler (index.ts socket.on('lb') → chain('lb')); read-only, no join, zero career mutation.
// Same shape as mpPingRegion (§27.2): one-shot callback onDone({error, s, endsAt, rows, self}),
// socket closed before delivery, unreachable endpoints REPORTED (never throw across the UI
// boundary). Returns the raw socket (probe seam), or null while the loader boots.
export function mpLeaderboard(url, opts = {}) {
  const onDone = typeof opts.onDone === 'function' ? opts.onDone : (() => {});
  const finish = (s, timer, out) => {
    if (s && s.__t49done) return; if (s) s.__t49done = true;
    if (timer) clearTimeout(timer);
    try { if (s) s.close(); } catch (_) {}
    onDone(out);
  };
  const boot = () => {
    const dt = dialTarget(url); // [T129] the anywhere dial law (mount prefix → io('/',{path}))
    const s = io(dt.url, { path: dt.path || '/socket.io/', transports: dialPlan(location.protocol).transports, tryAllTransports: true, forceNew: true, timeout: 4000, reconnection: false }); // verbatim openSocket pattern + probe hygiene · [T122] (5) the secure-dial transports · [T147] try-all rides here too
    const timer = setTimeout(() => finish(s, null, { url, error: 'timeout', s: null, endsAt: null, rows: [], self: null }), 6000);
    s.on('connect', () => s.emit('lb', { pid: mp.pid || undefined, n: 25, sc: opts.sc || undefined })); // pid absent = anonymous query (pre-T44 bytes from the server's view); invalid pid = server drops it (§28.3 law) · [T139] sc passthrough — the ladder scope (rp default / friends / clan)
    s.on('lb', d => finish(s, timer, { url, error: null, ...(d && typeof d === 'object' ? d : { s: null, endsAt: null, rows: [], self: null }) }));
    s.on('connect_error', e => finish(s, timer, { url, error: 'connect: ' + ((e && e.message) || e), s: null, endsAt: null, rows: [], self: null }));
    return s;
  };
  if (typeof io !== 'undefined') return boot();
  loadScript(SIO_SRC).then(boot).catch(e => onDone({ url, error: 'io load: ' + ((e && e.message) || e), s: null, endsAt: null, rows: [], self: null }));
  return null;
}

// [T120 S-3] menu-side connect-on-demand — the ONLINE hub's first queue intent boots the
// transport when no ?mp=1 boot ran. Root law: every pre-join sender is `if (socket)` —
// without a socket sendEco/sendSoc/sendQ drop SILENTLY, which was the hub's forever-queue.
// Rides the §27.2 loader idiom + the verbatim openSocket connection pattern, but registers
// ONLY the menu mirrors (auth/eco/soc/queue — the same delegation openSocket uses) — NO
// join emit, NO match handlers (initMP owns the ?mp=1 path). Idempotent: a live socket
// wins; concurrent calls share one connect; a ?mp=1 boot mid-connect is RIDDEN, never
// duplicated. onDone({socket, error}) fires ONCE per call and never throws across the UI
// boundary (the §27.2 report law).
let ensureWaiters = null;
export function ensureIo(settings, onDone) {
  const done = typeof onDone === 'function' ? onDone : (() => {});
  if (socket && socket.connected) { done({ socket, error: null }); return socket; }
  if (socket && !socket.disconnected) { // ?mp=1 boot mid-connect — ride THAT socket (never a second transport)
    const s0 = socket;
    const onc = () => { s0.__t120live = true; done({ socket: s0, error: null }); };
    if (s0.connected) onc(); else s0.once('connect', onc);
    s0.once('connect_error', e => { if (!s0.__t120live) done({ socket: null, error: 'connect: ' + ((e && e.message) || e) }); });
    return null;
  }
  if (ensureWaiters) { ensureWaiters.push(done); return null; }
  ensureWaiters = [done];
  const settle = (s, error) => { // one-shot: later reconnect noise never re-settles
    if (!ensureWaiters) return;
    const ws = ensureWaiters; ensureWaiters = null;
    for (const w of ws) { try { w({ socket: s, error }); } catch (_) {} }
  };
  const bootAt = (url) => {
    const reg = resolveRegion(settings, location.hostname, location.protocol); // §27.4 — the same derivation openSocket uses (region state rides the label) · [T122] (5) the proto rides
    if (reg.fellBack) console.warn('p] ensureIo region: ' + reg.why + ' — using default endpoint');
    const dt = dialTarget(url); // [T129] the anywhere dial law (mount prefix → io('/',{path}))
    const s = io(dt.url, { path: dt.path || '/socket.io/', transports: dialPlan(location.protocol).transports, tryAllTransports: true, forceNew: true, timeout: 10000 }); // verbatim openSocket pattern · [T122] (5) the secure-dial transports · [T147] the ORDER law rides dialPlan + the try-all fallback
    s.__dial = dt.url + '|' + (dt.path || '/socket.io/'); // [T147] the adoption fingerprint — openSocket's single-transport law reads this
    s.__menuWired = true; // [T147] the four menu mirrors below are THIS socket's own wiring — wireGameHandlers must not double them on adoption
    s.on('connect', () => {
      s.__t120live = true;
      mp.connected = true;
      console.log('p] ensureIo connected', s.id, 'via', url, '· transport', (s.io && s.io.engine && s.io.engine.transport && s.io.engine.transport.name) || '?'); // [T148] the transport truth line
      if (AUTH.tok) s.emit('auth', { op: 'me', tok: AUTH.tok }); // stays-signed-in law [j_02] — the menu session mirror
      settle(s, null);
    });
    s.on('connect_error', e => {
      if (s.__t120live) return;
      // transport fallback (Task 32 law mirrored): the Caddy gateway fronts the preview origin;
      // a dev static server cannot proxy it — ONE direct :3010 attempt, never on a direct/custom URL.
      // The waiters stay armed across the fallback and settle on ITS outcome.
      if (!fallbackDone && url === CFG.MP.server) {
        fallbackDone = true;
        const df = dialPlan(location.protocol).directFallback; // [T122] (5) the secure-dial law: a TLS page NEVER fires the insecure :3010 attempt (the browser blocks it — the user's mixed-content report)
        if (!df) {
          console.warn('p] ensureIo gateway unreachable (' + ((e && e.message) || e) + ') — SECURE PAGE: the direct :3010 fallback is insecure-only, skipped (the room service has no TLS)');
          const healed = healDeadMount(settings); // [T146] the same dead-mount heal, menu path — the waiters stay armed and settle on the healed dial's outcome (the fallback law verbatim)
          if (healed) { killSocket(s); bootAt(healed); return; } // [T148] quiet-close
          settle(s, 'connect: ' + ((e && e.message) || e) + ' (secure page — direct :3010 skipped)');
          return;
        }
        // transport fallback (Task 32 law mirrored): the Caddy gateway fronts the preview origin;
        // a dev static server cannot proxy it — ONE direct :3010 attempt, never on a direct/custom URL.
        // The waiters stay armed across the fallback and settle on ITS outcome.
        console.warn('p] ensureIo gateway unreachable (' + ((e && e.message) || e) + ') — one direct :3010 attempt');
        killSocket(s); // [T148] quiet-close
        bootAt(df + location.hostname + ':3010');
        return;
      }
      settle(s, 'connect: ' + ((e && e.message) || e));
    });
    s.on('disconnect', () => { mp.connected = false; }); // the hub's note gate reads mpLive() — drop = honest
    // menu mirrors — the openSocket delegation verbatim (senders emit, mirrors deliver)
    s.on('auth', (d) => { if (mp.onAuth) mp.onAuth(d); });
    s.on('eco', (d) => { if (mp.onEco) mp.onEco(d); });
    s.on('vars', (d) => { if (d && d.vars) mp.vars = d.vars; if (mp.onVars) mp.onVars(d); }); // §55 [T173]: the bag self-stores + the optional hook mirrors onEco
    s.on('soc', (d) => { if (mp.onSoc) mp.onSoc(d); });
    s.on('queue', (d) => { if (mp.onQueue) mp.onQueue(d); });
    if (socket) killSocket(socket); // [T148] quiet-close — a dead/retrying openSocket never fights the menu transport
    socket = s; // THE single-socket law: every existing sender lights up the moment this lands
  };
  // the §27.2 loader law: the offline menu never ran initMP — socket.io boots ON DEMAND here
  const start = () => bootAt(resolveRegion(settings, location.hostname, location.protocol).url); // [T122] (5) the proto rides the ensureIo resolution too
  if (typeof io !== 'undefined') start();
  else loadScript(SIO_SRC).then(start).catch(e => settle(null, 'io load: ' + ((e && e.message) || e)));
  return null;
}

// [T140] THE JOIN EMIT, EXTRACTED (single-body law) — the connect path and the PoW retry
// re-emit the SAME payload through THIS body; the pow token rides additively (UNARMED hubs
// never see it: undefined drops = pre-T140 join bytes, the §32.2 law).
function sendJoin() {
  // [T155 R6] slo rides the join payload — the streak equip, 3 def indices (absent = server default = pre-T155 bytes)
  const L = mpOpts.loadout ? mpOpts.loadout() : null;
  socket.emit('join', { name: 'YOU',
 token: token || undefined, room: CFG.MP.room, ab: L ? L.ability : 'dash', ld: L ? { w: L.weapon, s: L.secondary, at: L.attachments } : undefined, fin: L ? L.finish : undefined, trl: L ? L.trail : undefined, op: (L && L.op) ? L.op : undefined, spec: mp.wantSpec || undefined, slo: (L && Array.isArray(L.streaks) && L.streaks.length === 3) ? L.streaks : undefined, pid: authPid() || undefined, priv: mp.priv || undefined, code: mp.codeWanted || undefined, pow: mp.powTok || undefined }); // MP-3: room id + ability; T40 §24: loadout; T48a: finish id; T55 §39.3: trail id (both server-validated, additive); [T108 N8]: operator id (server-validated vs the operators.js roster — the cos.FINISHES join-validator law; absent = pre-N8 bytes); T41 §25.1: spectate role (absent = player, byte-identical old path); T44 §28.1: pid (absent = dropped from payload); T45 §29.3: priv/code (absent = dropped = pre-T45 join bytes); [T140]: pow (absent = dropped = pre-T140 bytes)
}

// [T140] the PoW solver — sha256(salt:i) whose HEX digest carries ≥nib leading zero nibbles
// (the hub's powOk law verbatim; nib = 4-bit units — 10 nibbles ≈ 1M hashes ≈ sub-second).
// UNARMED hubs never send a challenge, so this never runs there. The loop yields per digest —
// the browser stays responsive.
async function solvePow(salt, bits) {
  try {
    const enc = new TextEncoder(); const lead = '0'.repeat(bits);
    for (let i = 0; i < 4000000; i++) {
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + i)))].map(x => x.toString(16).padStart(2, '0')).join('');
      if (h.startsWith(lead)) return salt + ':' + i;
    }
  } catch (_) {}
  return null;
}

// [T140 G-3] one custom-map pull per 5 s per roster beat — the client mirror of the hub's mapdata rate law
let customPullT = 0;
function requestCustomMap() {
  const now = Date.now(); if (now - customPullT < 5000) return;
  customPullT = now;
  if (socket && socket.connected) socket.emit('mapdata');
}

function openSocket(url) {
  // verbatim connection pattern from the host demo + Spike 0 (path '/' is a Caddy requirement)
  const dp = dialPlan(location.protocol); // [T147] the ORDER law — websocket-first on BOTH schemes (tryAllTransports keeps the polling fallback honest)
  const dt = dialTarget(url); // [T129] the anywhere dial law — relative server = mount prefix via the path option (a bare '/room' would parse as a NAMESPACE)
  const dial = dt.url + '|' + (dt.path || '/socket.io/'); // [T147] the adoption fingerprint (endpoint + mount path)
  // [T147] THE SINGLE-TRANSPORT LAW — the live report caught TWO managers dialed at the hub
  // simultaneously (ensureIo's menu socket + openSocket's game socket — the two 'connected'
  // sids in the console) and a THIRD session's WS-upgrade corpse: the menu-first flow (hub
  // queue → join) never closed what ensureIo opened, so the game dialed a second parallel
  // transport — double hub sessions, a stray upgrade probe per manager, two reconnect loops
  // on any blip. A live menu transport that already dials THIS endpoint is ADOPTED (the game
  // handlers wire onto it once; the join emit re-runs through the SAME sendJoin body); any
  // other socket is closed before the game's dial — one endpoint, one transport, one rejoin loop.
  if (socket && socket.connected && socket.__dial === dial) {
    if (!socket.__mpGame) { socket.__mpGame = true; wireGameHandlers(socket, url); voiceSetSocket(socket); sendJoin(); }
    else sendJoin(); // a re-dial through the same live socket IS a rejoin (the disconnect law below only re-opens a truly dead transport)
    return;
  }
  if (socket) killSocket(socket); // [T148] quiet-close — a different endpoint's transport must not fight the game's dial
  socket = io(dt.url, { path: dt.path || '/socket.io/', transports: dp.transports, tryAllTransports: true, forceNew: true, timeout: 10000 });
  socket.__dial = dial;
  wireGameHandlers(socket, url);
}

// [T147] the game handler set, EXTRACTED from openSocket — one body serves both the fresh-dial
// path and the adopted-transport path (the single-body law the join emit already obeys). `s` is
// the carrying socket; module-level senders keep reading the `socket` var, which is ALWAYS the
// live carrier by the time any event fires (single-threaded assignment precedes every event).
function wireGameHandlers(s, url) {
  s.on('connect', () => {
    mp.connected = true;
    console.log('p] connected', s.id, 'via', url, '· transport', (s.io && s.io.engine && s.io.engine.transport && s.io.engine.transport.name) || '?'); // [T148] the transport truth line — stutter triage reads this, no more guesswork
    voiceSetSocket(s); // [T140 G-4] the socket lifecycle handoff — a NEW socket releases the old capture chain (the voice.js law)
    sendJoin(); // [T140] the extracted single body — the join payload lives in ONE place (the PoW retry reuses it verbatim)
  });
  try { s.io.on('upgrade', t => console.log('p] transport upgrade ->', t.name)); } catch (_) {} // [T148] the upgrade truth — websocket landing here is the anti-stutter law's green light
  s.on('joined', d => {
    mp.joined = true; myId = d.id; token = d.token; mp.myId = d.id;
    mp.spec = !!d.spec; // T41 §25.1: role is SERVER-TRUTH (old server never sets it → player path)
    mp.myRoom = d.room || null; mp.privCode = d.code || null; // T45 §29.3: real room id (a private code IS the room id) + server-truth privacy from the ack
    if (d.profile) mp.profile = d.profile; // T44 §28.3: server-truth career profile (absent on old servers/anonymous = keep null)
    if (d.ranked) mp.ranked = d.ranked; // T46 §30.6: server-truth ranked view (absent on old servers/anonymous = keep null)
    mp.ready = mp.connected && mp.joined;
    console.log('[mp] joined roomSize=' + d.roomSize + ' spawn=(' + d.spawn.x + ',' + d.spawn.y + ',' + d.spawn.z + ')');
    if (typeof mpOpts.onJoined === 'function') mpOpts.onJoined(d);
    if (pendingRespawn) { const p2 = pendingRespawn; pendingRespawn = null; sendRespawn(p2); }
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => socket.emit('ping', { t: performance.now() }), 1000);
  });
  s.on('joinErr', (d) => { // [T140] the honest join face + the PoW auto-solve (invisible when armed: solve → rejoin through the SAME sendJoin body; the user never sees the math)
    d = d || {};
    if (d.why === 'pow' && d.salt && Number(d.nib) > 0) {
      solvePow(String(d.salt), Math.min(14, d.nib | 0)).then((tok) => {
        if (!tok || !socket || !socket.connected) { if (typeof mpOpts.onJoinErr === 'function') mpOpts.onJoinErr({ why: 'powfail' }); return; }
        mp.powTok = tok;
        sendJoin();
      });
      return;
    }
    if (typeof mpOpts.onJoinErr === 'function') mpOpts.onJoinErr(d);
  });
  s.on('voice', (d) => voiceOnPacket(d)); // [T140 G-4] the relay leg — {i,s,a} with the SERVER-STAMPED sender actor id (a spoofed i never existed)
  s.on('mapdata', (d) => { // [T140 G-3] the registered authored stage lands → the roster entry replaces in place → the world rebuilds through the SAME setMap law
    if (!d || !d.data || !d.data.blocks) return;
    if (Maps.customWire(d.data) && Maps.currentId !== 'custom' && typeof mpOpts.onWireMap === 'function') mpOpts.onWireMap('custom');
  });
  s.on('snap', onSnap);
  s.on('pong', d => { mp.stats.rttEcho = performance.now() - d.t; });
  // MP-2 combat verdicts (server-authoritative; FX routed through opts callbacks — main.js owns hud/match/SFX)
  s.on('dmg', m => {
    if (m.a === myId) mp.stats.hits = (mp.stats.hits || 0) + 1; // T40: per-damaging-event hit count (offline shotsHit convention) — feeds MP career accuracy
    if (!mpOpts.onHitConfirm && !mpOpts.onHurt) return;
    if (m.a === myId) { if (mpOpts.onHitConfirm) mpOpts.onHitConfirm({ dmg: m.dmg, head: m.head, kill: m.kill, name: m.vn }); }
    else if (m.v === myId) { if (mpOpts.onHurt) mpOpts.onHurt({ dmg: m.dmg, head: m.head, fx: m.fx }); }
  });
  s.on('ammo', m => { // T40 §24: server-authoritative ammo correction (empty-fire / reload / respawn sync)
    if (mpOpts.onAmmo) mpOpts.onAmmo(m);
  });
  s.on('kill', k => {
    if (mpOpts.onKill) mpOpts.onKill({ kn: k.kn, vn: k.vn, v: k.v, k: k.k, w: k.w, h: k.h, mine: k.k === myId, theirs: k.v === myId, kid: k.k == null ? null : k.k }); // G-2: kid rides — the killcam locates the killer's replay ref by id · [T138] v + k ride — the corpse wire needs the victim id (main feeds MY kills) and the killer id (this listener feeds the remote-killer legs)
    if (k && k.v != null && k.v !== myId && k.k != null && k.k !== myId) { // [T138] THE REMOTE-KILLER LEG — neither end is me: the killer's last interpolated transform IS the death direction (main's onKill feeds the killer=me legs with the exact player pos)
      const kr = remotes.get(k.k);
      if (kr) corpseHint(k.v, kr.mesh.position.x, kr.mesh.position.z, knockFor((WEAPONS.find(x => x.id === k.w) || {}).dmg));
    }
  });
  // MP-3: server match lifecycle (start/live/flag/end/lobby) — client mirrors + announces
  s.on('match', d => {
    mp.matchState = d;
    mp.inLiveMatch = d.ev === 'start' || d.ev === 'live'; // T2-12: gates lobby announces on roster
    if (d.ev === 'end' && Array.isArray(d.board)) {
      d.board.forEach(b => { b.me = b.id === myId; }); // Task 35: results screen row tagging
      mp.lastEnd = d; // probe surface
    }
    if (mpOpts.onMatch) mpOpts.onMatch({ ...d, mine: d.winner ? d.winner === myId : undefined });
  });
  // --- MP-3.1 residuals (Task 33): server-owned grenades / streaks / abilities / srtt / host ---
  s.on('sping', d => socket.emit('spong', { t: d && d.t })); // T2-11: raw upstream reply (no chain client-side)
  s.on('nadeSpawn', d => { if (mpOpts.onNadeSpawn) mpOpts.onNadeSpawn(d); }); // T2-9: visual via THE weapons projectile path
  s.on('boom', d => { if (mpOpts.onBoom) mpOpts.onBoom(d); }); // T2-9/T2-10: authoritative detonation FX+audio
  s.on('crate', d => { if (mpOpts.onCrate) mpOpts.onCrate(d); }); // T2-10: supply crate visual
  s.on('supply', d => { if (mpOpts.onSupply) mpOpts.onSupply({ ...d, mine: d.by === myId }); }); // T2-10: landed → owner refill
  s.on('dest', d => { if (mpOpts.onDestNet) mpOpts.onDestNet(d); }); // §54.5 U7: server-owned destructible truth (additive; old servers never send → never fires)
  s.on('streakEv', d => { if (mpOpts.onStreakEv) mpOpts.onStreakEv(d); }); // T2-10: UAV/AIRSTRIKE announcements
  s.on('pulseEv', () => { for (const r of remotes.values()) r.spotT = 0; }); // T2-10: reveal (announce already local via useAbility)
  // --- Task 35: residual-of-residuals — flash broadcast + remote fired reveal ---
  s.on('flash', d => {
    // server computed per-victim strength (doFlash verbatim: LoS + facing + distance);
    // FX/audio for everyone in the room, the blind overlay only for tagged victims
    try {
      const mineStr = d.v ? ((d.v.find(x => x[0] === myId) || [null, null])[1]) : null;
      const fl = { ...d, mineStr, hadHook: typeof (mpOpts && mpOpts.onFlashEv) };
      if (mpOpts.onFlashEv) mpOpts.onFlashEv({ ...d, mineStr });
      fl.opAfter = document.getElementById('flash-overlay').style.opacity; // probe: opacity right after the hook (synchronous ground truth)
      mp.lastFlash = fl;
    } catch (e) { mp.lastFlash = { err: String((e && e.stack) || e) }; } // Task 35 probe: handler-throw forensics
  });
  s.on('fired', d => {
    // hud.js:197 seeEnemy parity — a validated unsuppressed remote fire lights the
    // minimap dot for 1.3s (bots.js:342 firedT=0 mirror; decay in frame())
    if (d && d.id && d.id !== myId) { const r = remotes.get(d.id); if (r) r.firedT = 0; }
  });
  s.on('matchErr', d => { if (mpOpts.onMatchErr) mpOpts.onMatchErr(d || {}); }); // T2-12: notHost etc.
  if (!s.__menuWired) { // [T147] an ADOPTED menu socket already carries the four mirrors (ensureIo wired them) — double registration = double delivery
    s.on('auth', (d) => { if (mp.onAuth) mp.onAuth(d); });
    s.on('eco', (d) => { if (mp.onEco) mp.onEco(d); });
    s.on('vars', (d) => { if (d && d.vars) mp.vars = d.vars; if (mp.onVars) mp.onVars(d); }); // §55 [T173]: the adopted-menu mirror — same self-store + hook (double registration guarded by __menuWired)
    s.on('soc', (d) => { if (mp.onSoc) mp.onSoc(d); });
    s.on('queue', (d) => { if (mp.onQueue) mp.onQueue(d); });
    s.__menuWired = true;
  }
  if (AUTH.tok) socket.emit('auth', { op: 'me', tok: AUTH.tok }); // stays-signed-in law [j_02]
  s.on('roster', d => {
    if (d.map) Replay.setMapLabel(d.map); // §51.3: replay map label (armed-gated inside)
    if (d.map === 'custom' && !mp.inLiveMatch && Maps.currentId !== 'custom') { // [T140 G-3] the room sits on the authored stage — the host rebuilds from its LS original, joiners PULL the registered data (the server is the single truth for everyone else)
      if (d.meHost) { const ce = Maps.customEntry(); if (ce && ce.custom && typeof mpOpts.onWireMap === 'function') mpOpts.onWireMap('custom'); }
      else requestCustomMap();
    }
    mp.roster = d;
    // T2-5 Phase 2 (T48a): server-validated finish ids per member → tint remote capsules
    mp.cf = new Map((d.ps || []).filter(m => m && m.cf).map(m => [m.id, m.cf]));
    // T2-5 Phase 3 (T55 §39.3): server-validated trail ids per member (undefined drops =
    // all-stock rooms emit byte-identical pre-T55 rosters — §32.2 law verbatim)
    mp.ct = new Map((d.ps || []).filter(m => m && m.ct).map(m => [m.id, m.ct]));
    for (const [id, r] of remotes) { applyFinish(r, mp.cf.get(id)); applyTrail(r, mp.ct.get(id)); } // live re-tint + trail resolve on roster updates
    if (mpOpts.onRoster && !mp.inLiveMatch) mpOpts.onRoster({ ...d, meHost: d.host === myId });
  }); // T2-12
  s.on('career', d => { if (typeof mpOpts.onCareer === 'function') mpOpts.onCareer(d || {}); }); // T44 §28.3: per-socket XP award at match end (absent on old servers = never fires)
  s.on('ranked', d => { if (typeof mpOpts.onRanked === 'function') mpOpts.onRanked(d || {}); }); // T46 §30.6: per-socket ranked award, ranked matches only (absent on old servers = dormant; mirror of onCareer pattern)
  s.on('emote', d => { // T55 §39.4: remote taunt → announce (old servers never send this event; §24/§32 additive law)
    if (!d || typeof d.id !== 'string') return;
    const e = emoteById(d.id);
    if (e.id === 'none' || typeof mpOpts.onEmote !== 'function') return; // garbage/'none' = silent
    mpOpts.onEmote({ text: e.text, n: typeof d.n === 'string' ? d.n.slice(0, 16) : 'PLAYER' }); // name-length law matches snapshot names
  });
  s.on('disconnect', (why) => { if (s !== socket) return; // [T147] the identity guard — a CLOSED predecessor's late disconnect must not re-dial over the live carrier
    mp.connected = false; mp.ready = false; voiceReset(); console.log('p] disconnected', why || ''); // [T140 G-4] voice.reset — playback state dies with the socket (the capture permission stays sticky-honest)
    // [T141] THE ONE-SHOT HONEST REJOIN — reconnection:false is the probe-hygiene dial, but a LIVE
    // round must not strand its player on a transport blip (the "online always had errors" class):
    // the connect handler above re-runs sendJoin through the SAME single body (the PoW solve loop
    // included), so one re-open IS a full rejoin. Capped at 2 attempts per session — a dead hub
    // keeps its honest face (the connect-fail line + the RETRY chip carry it from there).
    if (mp.joined && rejoinTries < 2 && !mp.spec) {
      mp.joined = false; rejoinTries++;
      setTimeout(() => { try { if (!socket || socket.disconnected) { const rurl = resolveRegion(mpOpts.settings, location.hostname, location.protocol).url; openSocket(rurl); } } catch (e) { console.warn('p] rejoin dial failed', e && e.message); } }, 1500); // [T146] THE REJOIN LAW — re-RESOLVE the region at rejoin time; the old openSocket(CFG.MP.server) re-dialed the dead '/room' mount regardless of the live region, stranding the round local-only (the stutter + empty-room report)
    }
  });
  // Task 35 probe: wire-level receive tally (which events does THIS socket actually get?)
  s.onAny((ev, ...args) => { if (!mp.rx) mp.rx = {}; mp.rx[ev] = (mp.rx[ev] || 0) + 1; if (Replay.armed) Replay.onWire(ev, args); }); // T42 §26.1: ONE appended capture point — no per-handler edits · [T147] binds the carrier, not the module var
  // transport fallback (Task 32): the Caddy gateway (:81) fronts the public preview origin;
  // a dev static server on :3000 has NO websocket support — fall back ONCE to direct :3010.
  // On the preview origin the gateway works, so the fallback never fires there.
  s.on('connect_error', (e) => {
    if (s !== socket || fallbackDone || url !== CFG.MP.server) return; // [T147] the identity guard rides first — a closed predecessor's error never hijacks the live carrier
    fallbackDone = true;
    const df = dialPlan(location.protocol).directFallback; // [T122] (5) the secure-dial law — the JOIN path obeys it too (a TLS page never fires the insecure :3010 attempt)
    if (!df) { // [T146] the dead-mount auto-heal — a relative mount on a static page can never answer; flip to the first live absolute row and re-dial ONCE (fallbackDone stays true — a healed dial that also fails keeps the honest face, no loop)
      console.warn('p] gateway unreachable — SECURE PAGE: the direct :3010 fallback is insecure-only, skipped');
      const healed = healDeadMount(mpOpts.settings);
      if (healed) { killSocket(s); openSocket(healed); } // [T148] quiet-close — stops the dead mount's manager retries for good
      return;
    }
    console.warn('[mp] gateway unreachable (' + ((e && e.message) || e) + ') — falling back to direct :3010');
    killSocket(s); // [T148] quiet-close
    openSocket(df + location.hostname + ':3010');
  });
}

// T41 §25.4: me-independent world mirrors — ONE shared function for the player AND spectator
// onSnap paths (a spectator has no `me` row; the world state must still mirror). Reads d.m +
// World only — order-independent relative to the me-dependent mirrors.
function mirrorWorldState(d) {
  if (d.m && d.m.fl && World.flags.length === d.m.fl.length) {
    d.m.fl.forEach(([ow, pg], i) => {
      const f = World.flags[i];
      f.owner = ow; f.prog = pg;
      const col = ow === 0 ? 0x3fa7ff : ow === 1 ? 0xff5252 : 0x9aa6b5;
      f.ring.material.color.set(col); f.cloth.material.color.set(col);
      f.ring.material.opacity = 0.4 + 0.3 * Math.sin(performance.now() / 300) * 0.5 + (f.prog > 0 ? 0.3 : 0);
    });
  }
  if (d.m && d.m.hp && World.hills.length === 3) {
    const [idx, ow, pg, tl] = d.m.hp;
    mp.hpIdx = idx; mp.hpT = tl;
    const h = World.hills[idx];
    if (h) {
      h.owner = ow; h.prog = pg;
      const col = ow === 0 ? 0x3fa7ff : ow === 1 ? 0xff5252 : 0x9aa6b5;
      h.ring.material.color.set(col); h.disc.material.color.set(col);
      h.ring.visible = true; h.disc.visible = true; // visibility also reset by events
    }
  }
  if (d.m && Array.isArray(d.m.tags)) mp.tags = d.m.tags; // kc: [[x,z,tm]]
  if (d.m && d.m.snd) mp.sndB = d.m.snd; // snd: {r, ph, side, rt, bt, pp, dp, bx, bz}
  if (d.m && d.m.ctl) mp.ctlB = d.m.ctl; // T98: {r, side, ph, rt, caps, sites, zf} — wire probe surface (application: main.js mirror block)
  if (d.m && typeof d.m.ggt === 'number') mp.ggTotal = d.m.ggt;
  if (d.m) { mp.matchTl = d.m.tl; mp.uavT = d.m.uav || 0; mp.mBlock = d.m; } // T1-9 timer + T2-10 UAV + scores mirror
  if (d.m && d.m.br) { // [T171] BR zone mirror — wall + next-ring pose + the bot-rotate state (mirrorWorldState runs for spec AND player paths)
    const b = d.m.br;
    updateGasZone(b.cx, b.cz, b.r, b.tx, b.tz, b.tr);
    World.brZone = { cx: b.cx, cz: b.cz, r: b.r };
    mp.brB = b;
  } else if (d.m && !d.m.br && mp.brB) { mp.brB = null; }
}

// [T171] the room's ground-loot manifest (ev:'brLoot' on the match chain) → client meshes;
// ids ride so ev:'lootTake' can hide exactly the taken entry. Idempotent per id.
export function renderLootManifest(loot) {
  mp.lootById = mp.lootById || {};
  for (const it of loot || []) {
    if (mp.lootById[it.id]) continue;
    const pk = makeLootPickup(it.x, it.z, it.k, it.w);
    pk.lootId = it.id; mp.lootById[it.id] = pk;
  }
}
export function takeLootById(id) {
  if (mp.lootById && mp.lootById[id]) { takeLootPickup(mp.lootById[id], true); delete mp.lootById[id]; }
}

// [T171] loot pickup wire — rate-capped like the other senders (the §34.1 class); the server
// validates alive + range + not-taken (the authoritative law) and answers with lootTake.
let lastLootT = 0;
export function sendLoot(id) {
  const now = performance.now();
  if (now - lastLootT < 200) return;
  lastLootT = now;
  if (socket && socket.connected) socket.emit('loot', { id });
}

function onSnap(d) {
  if (d.tick <= lastTick) { mp.stats.stale++; return; }  // stale guard (spike: 0 hits under ordered chains)
  lastTick = d.tick;
  const now = performance.now();
  snapBuf.push({ t: now, d });
  if (snapBuf.length > SNAP_BUF) snapBuf.shift();
  snapTimes.push(now);
  if (snapTimes.length > 40) snapTimes.shift();
  if (!player || !myId) return;

  // T41 §25.4: spectator path — world mirrors only; the spec has no `me` row (myId is never
  // in pl[]) so no team/streak/hp mirror, no ack/recon/blend/history replay can run.
  if (mp.spec) { mirrorWorldState(d); return; }

  const me = d.pl.find(p => p.id === myId);
  if (!me) return;
  mp.myTeam = me.tm || 0; // MP-3: server-assigned team (tdm/dom)
  mirrorWorldState(d); // T41 §25.4: shared me-independent mirror (was inline; order-independent)
  if (typeof me.g === 'number' && me.g !== mp.myGgTier) {
    mp.myGgTier = me.g; // snapshot mirror (probe + HUD); equip rides the 'tier' event (server ladder wid)
    if (mpOpts.onGgTier) mpOpts.onGgTier(me.g, null);
  }
  if (d.m) { mp.matchTl = d.m.tl; mp.uavT = d.m.uav || 0; mp.mBlock = d.m; } // T1-9 timer + T2-10 UAV + scores mirror (T41: also inside mirrorWorldState for the spec path — kept here for exact player-path order)
  if (typeof me.st === 'number') { player.streak = me.st; mp.myStreak = me.st; } // T2-10: streak column from server
  if (typeof me.rt === 'number' && me.rt >= 0) mp.stats.rtSrv = me.rt; // T2-11 mirror

  // MP-2: combat numbers are SERVER-authoritative — mirror them onto the local actor
  // (the client never computes its own damage in MP; local hp edits would fight the verdicts).
  // respawn-in-flight guard: between the client's respawnPlayer() and the server applying the
  // respawn, stale al:0/hp:0 snapshots must not re-kill or zero the HUD (1s window, then truth wins).
  if (typeof me.hp === 'number' && (me.al === 1 || performance.now() > respawnPendingUntil)) {
    player.hp = me.hp; player.shield = me.sh || 0;
    player.kills = me.k || 0; player.deaths = me.de || 0; player.score = me.s || 0;
    player.alive = me.al === 1;
  }

  // --- reconciliation anchor: server state at ack (spike-proven true per-ack error) ---
  const lastSeq = d.ack[myId] || 0;
  const acked = history.find(h => h.seq === lastSeq);
  const nowMs = performance.now();
  if (respawnTarget) {
    if (Math.hypot(me.x - respawnTarget.x, me.z - respawnTarget.z) < 0.5) respawnTarget = null; // server state reflects the respawn — sync complete
    else if (nowMs > graceUntil + 2400) respawnTarget = null; // 3s hard stop (rejected respawn): resume blending, let err scream
    else return; // stale pre-respawn snapshot: must not re-seed recon (measured blend-drag defect)
  }
  if (acked && nowMs > graceUntil && acked.ep === syncEp) {
    const err = Math.hypot(me.x - acked.x, me.z - acked.z);
    if (err > 1) mp.stats.lastBigErr = { me: { x: me.x, z: me.z }, acked: { x: acked.x, z: acked.z }, seq: lastSeq, ep: syncEp, ackedEp: acked.ep, local: player ? { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2) } : null, hist: history.length }; // diag: leak forensics
    if (err > 0.0005) { mp.stats.corrCount++; if (err > mp.stats.errMax) mp.stats.errMax = err; }
    mp.stats.errEma = mp.stats.errEma * 0.9 + err * 0.1;
  }
  // drift (law 10): in-flight distance between prediction and server truth — a design
  // number, NOT error; sizes lag-comp in MP-2, never blended away
  mp.stats.drift = Math.hypot(player.pos.x - me.x, player.pos.z - me.z);

  // --- replay inputs after ack through THE SHARED core on a shadow state ---
  const sh = {
    pos: { x: me.x, y: me.y, z: me.z }, vel: { x: me.vx, y: me.vy, z: me.vz },
    yaw: player.yaw, crouch: (me.f & F.CROUCH) ? 1 : 0,
    grounded: !!(me.f & F.GROUNDED), groundedTime: (me.f & F.GROUNDED) ? 0 : 1,
    jumpBufT: 0,
    slide: { active: !!(me.f & F.SLIDE), t: 0, dir: { x: 0, y: 0, z: 0 } },
    apexY: me.y, stimT: player.stimT || 0, sprinting: !!(me.f & F.SPRINT),
  };
  const world = { colliders: World.colliders, jumpPads: World.jumpPads, ladders: World.ladders, water: World.water }; // [T130] the climb/swim registries ride prediction too — the shadow state reads the same truth
  // [T151] THE RESYNC LAW (wire-proven, probe_t151_ws): the hub's FOLD=3 queue DROPS jittered
  // input bursts (wire truth: ackLag med 21 steps, frozen 42/45 tails across 8 snaps) — and the
  // §8 replay then re-applies the whole unacked backlog EVERY snap, walking the shadow up to
  // 240 steps ahead of server truth. The §8 blend then drags the player toward that target —
  // and the error is MOVEMENT-GATED: standing still replays no-ops (zero drag, the report's
  // "doesn't double until I walk around"). Beyond 500ms of unacked inputs (30 steps) the link
  // is degraded: PAUSE the blend (recon=null — pure prediction, the game stays responsive, no
  // doubling) and bound the stale backlog (keep the last 40) so a recovered ack resumes the
  // replay from a sane window instead of the full 240-step fantasy.
  const lastHistSeq = history.length ? history[history.length - 1].seq : 0;
  const degraded = lastSeq > 0 && lastHistSeq - lastSeq > 30;
  if (degraded) {
    recon = null; // pause blending — prediction runs clean until the ack stream recovers
    if (history.length > 40) history.splice(0, history.length - 40);
  } else {
    for (const h of history) if (h.seq > lastSeq) stepState(sh, h.input, world, DT);
    recon = { x: sh.pos.x, y: sh.pos.y, z: sh.pos.z, vx: sh.vel.x, vy: sh.vel.y, vz: sh.vel.z }; // blend target (§8: recompute each snap, never accumulate)
  }

  // prune history up to ack
  while (history.length && history[0].seq <= lastSeq) history.shift();
}

// ---- fixed-step driver: called INSTEAD of player.update when mp.ready (main.js) ----
export function fixedStep(dt, pIn) {
  if (mp.spec) return; // T41 §25.4: spectator = presentation only — no prediction, no input stream (server also rejects via joined:false)
  // hold edges if no step runs this frame; consume exactly once on the first step
  pending.jumpEdge = pending.jumpEdge || !!pIn.jumpEdge;
  pending.crouchEdge = pending.crouchEdge || !!pIn.crouchEdge;
  acc = Math.min(acc + dt, 0.25); // spiral-of-death guard (spec §2)
  let steps = 0;
  while (acc >= DT - 1e-9 && steps < 16) {
    acc -= DT; steps++;
    seq++;
    const je = pending.jumpEdge, ce = pending.crouchEdge;
    pending.jumpEdge = pending.crouchEdge = false;
    const stepInput = {
      f: pIn.f, b: pIn.b, l: pIn.l, r: pIn.r,
      sprint: pIn.sprint, crouch: pIn.crouch, ads: pIn.ads, autoSprint: pIn.autoSprint,
      bob: pIn.bob, tilt: pIn.tilt, jumpEdge: je, crouchEdge: ce, stickX: pIn.stickX, stickY: pIn.stickY,
    };
    player.update(DT, stepInput);
    // wire axes EXACTLY as player.update computed them (spec §5)
    const ix = (pIn.r ? 1 : 0) - (pIn.l ? 1 : 0) + (pIn.stickX || 0);
    const iz = (pIn.f ? 1 : 0) - (pIn.b ? 1 : 0) - (pIn.stickY || 0);
    history.push({ seq, x: player.pos.x, y: player.pos.y, z: player.pos.z, ep: syncEp, input: { ix, iz, sprint: !!pIn.sprint, ads: !!pIn.ads, crouch: !!pIn.crouch, prone: !!pIn.prone, crouchEdge: ce, jumpEdge: je, autoSprint: !!pIn.autoSprint } });
    if (history.length > 240) history.shift();
    mp.stats.inputs++;
    if (socket) socket.emit('input', { seq, ix, iz, yaw: player.yaw, pitch: player.pitch, sprint: !!pIn.sprint, ads: !!pIn.ads, crouch: !!pIn.crouch, prone: !!pIn.prone, crouchEdge: ce, jumpEdge: je, autoSprint: !!pIn.autoSprint }); // [T121] prone rides additive (old servers drop the field)
  }
}

// [T140 G-3] the host's registry leg — the UI calls it right before sendSetMap('custom');
// the server validates + stores + acks, and ONLY then does setMap('custom') build the world
// (the honest order the hub enforces: mapreg first, never a silent fake world).
export function sendMapReg(data) {
  if (socket && socket.connected) socket.emit('mapreg', data);
}

// ---- per-frame: correction blend + remote interpolation (main.js, before updateCamera) ----
export function frame(dt) {
  const now = performance.now();
  // stats: snap rate
  while (snapTimes.length && now - snapTimes[0] > 1000) snapTimes.shift();
  mp.stats.snapsHz = snapTimes.length;

  // [T140 G-4] the voice tick — PTT edge + capture gate + speaker GC + badge (MP-only path;
  // the offline game never runs this module — the voice.js mp.js-gates law)
  voiceTick(dt, { remotes, player: { pos: mpOpts && mpOpts.playerPos ? mpOpts.playerPos() : null }, spec: mp.spec, joined: mp.ready });

  // T2-10: remote spotted decay (hud seeEnemy gate is spottedT < 1.6 — bots.js parity)
  // Task 35: same decay for the fired-reveal timer (hud gate is firedT < 1.3, cap 99 = bots.js:33 parity)
  for (const r of remotes.values()) {
    r.spotT = (r.spotT == null ? 9 : Math.min(9, r.spotT + dt));
    r.firedT = (r.firedT == null ? 99 : Math.min(99, r.firedT + dt));
  }

  // §8 correction blend: geometric, ~98% consumed in 100ms; target recomputed per snap
  // [T151] THE SNAP LAW (the walk-doubling fix, probe_t151_mpwalk-proven): the old
  // k = min(1, dt*30) reached 1.0 at ANY frame gap >= 33ms — every 30fps machine, every
  // hiccup, every starved frame — turning the "smoothing" into a hard per-frame snap the
  // moment a prediction/server error existed. That error is movement-gated: the server's
  // FOLD=3 queue drops jittered inputs ONLY while walking (standing still drops no
  // movement), so the drag fired exactly when the user walked — the "doubling" report.
  // Now: small errors ALWAYS smooth (k capped at 0.25/frame — worst case closes in ~6
  // frames even at 20fps), big discontinuities (respawn/pad/teleport > 2m) still snap
  // instantly (k=1) because dragging a teleport reads worse than the teleport.
  if (recon) {
    const dx = recon.x - player.pos.x, dy = recon.y - player.pos.y, dz = recon.z - player.pos.z;
    const err = Math.hypot(dx, dy, dz);
    const k = err > 2 ? 1 : Math.min(0.25, dt * CFG.MP.blendRate);
    player.pos.x += dx * k; player.pos.y += dy * k; player.pos.z += dz * k;
    // [T151] the vel gate: server-truth velocity copies ONLY on meaningful error (>0.5m).
    // The old unconditional copy transmitted the server's starvation-coast vx≈0 into the
    // prediction every frame — the walk lerp never reached speed under a degraded link
    // (the probe's crawl+snap cycling). Healthy recon (err < 0.5m) leaves the prediction's
    // own velocity untouched — zero interference on a clean link, authority on a dirty one.
    if (err > 0.5) { player.vel.x = recon.vx; player.vel.y = recon.vy; player.vel.z = recon.vz; }
    if (err < 0.001) recon = null;
  }

  // remote interpolation (spec §9): render at now - interpDelay between bracketing snaps
  // [T148] THE ADAPTIVE DELAY — the 100ms floor (2× 20Hz snap intervals) is right for a clean
  // websocket, but burst/jitter arrivals (polling fallback, mobile radios) shrink the EFFECTIVE
  // buffer and the underrun clamp (freeze-at-latest, then jump) reads as the mid-match movement
  // stutter. The median ARRIVAL interval stretches the delay to 2.2× of itself (400ms ceiling)
  // exactly when the stream turns bursty — the §9 law is untouched (render stays BETWEEN
  // bracketing snaps; only the delay adapts), and a steady websocket keeps the 100ms floor.
  const delay = Math.min(400, Math.max(CFG.MP.interpDelay, 2.2 * medianSnapMs(now)));
  if (snapBuf.length >= 2) {
    const rt = now - delay;
    let a = null, b = null;
    for (let i = 0; i < snapBuf.length - 1; i++) {
      if (snapBuf[i].t <= rt && snapBuf[i + 1].t >= rt) { a = snapBuf[i]; b = snapBuf[i + 1]; break; }
    }
    if (!a && snapBuf.length) { a = b = snapBuf[snapBuf.length - 1]; } // buffer underrun: clamp to latest
    const span = Math.max(1, b.t - a.t);
    const al = Math.max(0, Math.min(1, (rt - a.t) / span));
    let gapMax = 0;
    const seen = new Set();
    for (const rp of b.d.pl) {
      if (rp.id === myId) continue;
      seen.add(rp.id);
      const ra = a.d.pl.find(p => p.id === rp.id) || rp;
      let r = remotes.get(rp.id);
      if (!r) r = makeRemote(rp);
      // MP-2: remote combat meta (name/score/alive drive nametag, scoreboard, corpse visibility)
      r.name = rp.n || 'PLAYER'; r.kills = rp.k || 0; r.deaths = rp.de || 0; r.score = rp.s || 0;
      r.team = rp.tm || 0; r.streak = rp.st || 0; // MP-3.1: team + streak from server
      const wasAlive = r.alive !== false;
      r.alive = rp.al === 1;
      r.mesh.visible = (r.alive || r.corpse) && !mp.killcamHide; // G-2: killcam steps the live cast aside while it owns the camera · [T138] a corpse stays on stage (the verlet owns the fall) — killcamHide still steps it aside
      if (!r.alive) {
        if (wasAlive) { // [T138] THE DEATH BEAT — the corpse spawns where interpolation left the body; the kill hint (killer pos + damage-scaled knock) rides the SAME kill broadcast
          r.corpse = { x: r.mesh.position.x, y: r.mesh.position.y, z: r.mesh.position.z, hint: CORPSE.get(rp.id) || null };
          CORPSE.delete(rp.id);
          if (r.tag) r.tag.visible = false; // the dead don't wear nametags (bots.js:500 parity)
        }
        if (r.corpse && r.rig3d && r.rig3d.ready) { // the verlet drive — AI/interp stay frozen (bots.js:279 parity)
          r.rig3d.group.visible = true;
          r.rig3d.update(Math.min(dt, 0.05), { speed: 0, grounded: true, crouch: 0, prone: 0, dead: true, deadDir: corpseDir(r), knock: r.corpse.hint ? r.corpse.hint.knock : 2.1, ladder: false, swim: false, ads: false, emote: false });
        }
        continue; // corpse: meta synced, no interp/gap contribution (the live walk below skips it)
      }
      if (!wasAlive) { r.corpse = null; if (r.tag) r.tag.visible = true; } // [T138] the respawn beat — al:1 again: the corpse retires, the tag returns, ops3d's dead:false branch restores the pose in this same drive
      r.mesh.position.set(ra.x + (rp.x - ra.x) * al, ra.y + (rp.y - ra.y) * al, ra.z + (rp.z - ra.z) * al);
      r.mesh.rotation.y = lerpAngle(ra.yaw, rp.yaw, al);
      // T55 §39.3: trail wake on trailed remotes — displacement gate 0.14 m/frame ≈ 8.4 m/s
      // @60 fps (sprint 7.35 stays clean; movement-tech band). Alive only (§39.6: no corpse wakes).
      if (r.trailColor) {
        const dist = r.trailPrev ? r.mesh.position.distanceTo(r.trailPrev) : 0;
        if (dist > 0.14) FX.trailPuff({ x: r.mesh.position.x, y: r.mesh.position.y - 0.5, z: r.mesh.position.z }, r.trailColor);
        if (!r.trailPrev) r.trailPrev = new THREE.Vector3();
        r.trailPrev.copy(r.mesh.position);
      }
      const cr = (rp.f & F.CROUCH) ? 1 : 0;
      if (cr !== r.lastCrouch) { r.lastCrouch = cr; if (!(r.rig3d && r.rig3d.ready)) r.mesh.scale.y = 1 - cr * 0.3; else r.mesh.scale.y = 1; } // [T115] the skinned body owns the stance (the crouch clip) — the capsule squash would double-apply through the rig child
      // [T130] the remote body drive — speed from the interpolation delta, the stance rides the wire flags
      if (r.rig3d) {
        if (r.rig3d.ready) {
          if (!r.rig3dSwapped) { // [T115] THE SWAP — the capsule retires via material fade (mesh.visible must stay true: the rig + tag ride the subtree), the stance scale resets
            r.rig3dSwapped = true;
            r.mesh.material.transparent = true; r.mesh.material.opacity = 0; r.mesh.material.depthWrite = false;
            r.mesh.scale.y = 1;
          }
          r.rig3d.group.visible = true;
          const sp = r._r3prev ? r.mesh.position.distanceTo(r._r3prev) / Math.max(0.008, dt) : 0;
          if (r._r3prev) r._r3prev.copy(r.mesh.position);
          r.rig3d.update(Math.min(dt, 0.05), { speed: Math.min(sp, 9), grounded: true, crouch: cr, prone: 0, dead: false, ladder: false, swim: false, ads: false, emote: false }); // [T138] dead:false here ALSO restores a returning remote's corpse (ragRestore in the same call)
        }
      }
      r.tag.position.set(0, 2.1 * r.mesh.scale.y, 0);
      const latest = b.d.pl.find(p => p.id === rp.id);
      gapMax = Math.max(gapMax, Math.hypot(latest.x - r.mesh.position.x, latest.z - r.mesh.position.z));
    }
    for (const id of [...remotes.keys()]) if (!seen.has(id)) removeRemote(id);
    mp.stats.remoteGap = gapMax;
  }
}

// ---- MP-2 fire: emit the EXACT ray the client rendered (per pellet). The server validates
// (§11), rewinds hitboxes (§10), and owns the verdict; local FX stay from the local ray.
export function sendFire(origin, dir, weaponId) {
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4: client-side politeness (server enforces via joined:false)
  mp.stats.fires++;
  socket.emit('fire', {
    o: [+origin.x.toFixed(3), +origin.y.toFixed(3), +origin.z.toFixed(3)],
    d: [+dir.x.toFixed(3), +dir.y.toFixed(3), +dir.z.toFixed(3)],
    w: weaponId, rt: Math.round(mp.stats.rttEcho),
  });
}

// ---- T40 §24: server reload gate — client announces reload (weapon id + empty flag);
// server times it (reloadT/reloadE from the attachment-cloned def) and answers with an
// authoritative `ammo` event. Shell-load weapons: server approximates a full-mag refill
// at per-shell × shells (logged in §24); corrections reconcile any drift at next fire.
export function sendReload(wid, empty) {
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4
  socket.emit('reload', { w: wid, e: !!empty });
}

// scoreboard actors from remote snapshot meta (main.js MP branch feeds hud.showScoreboard)
export function scoreActors() {
  return [...remotes.values()].map(r => ({
    name: r.name, score: r.score || 0, kills: r.kills || 0, deaths: r.deaths || 0,
    streak: r.streak || 0, isPlayer: false, team: r.team ?? 1, alive: r.alive, // T2-10: real streak column
  }));
}

// minimap pseudo-actors from remotes (main.js feeds hud.update ctx.bots in MP —
// field-compatible with bots.js actors: alive/team/pos/spottedT/firedT — zero hud changes)
export function remoteActors() {
  return [...remotes.entries()].map(([id, r]) => ({
    id, // T41 §25.4: stable target id for the spectate cycle
    alive: r.alive !== false, team: r.team ?? 1, pos: r.mesh.position,
    yaw: r.mesh.rotation.y, // T41 §25.4: interpolated facing for the chase rig
    spottedT: r.spotT == null ? 9 : r.spotT, firedT: r.firedT == null ? 9 : r.firedT, _suppressed: false, name: r.name, // Task 35: real firedT feed
  }));
}

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// T2-5 Phase 2 (T48a): tint a remote actor's capsule by its server-validated finish.
// Remote actors are capsule-only (no weapon mesh) — the body material IS the finish surface.
// STOCK/absent restores the original accentA color (byte-compat with pre-T48a rooms).
function applyFinish(r, cfId) {
  const f = finishById(cfId);
  r.mesh.material.color.setHex(f.body !== undefined ? f.body : CFG.COLORS.accentA);
}

// T2-5 Phase 3 (T55 §39.3): resolve a remote member's trail wake color from the roster ct
// id. STOCK/absent/garbage → falsy (no wake — the spawn gate reads truthiness).
function applyTrail(r, ctId) {
  r.trailColor = ctId ? trailById(ctId).color : null;
}

function makeRemote(rp) {
  const geo = new THREE.CapsuleGeometry(0.38, 1.05, 4, 10);
  const mat = new THREE.MeshStandardMaterial({ color: CFG.COLORS.accentA, roughness: 0.6, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(rp.x, rp.y, rp.z);
  scene.add(mesh);
  applyFinish({ mesh }, mp.cf && mp.cf.get(rp.id)); // T48a: create-time tint (roster may land before first snap)
  // nametag sprite
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const cx = cv.getContext('2d');
  cx.font = 'bold 40px Rajdhani, sans-serif'; cx.textAlign = 'center';
  cx.fillStyle = '#ff5a3c'; cx.fillText(rp.n || 'PLAYER', 128, 44);
  const tex = new THREE.CanvasTexture(cv);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  tag.scale.set(1.6, 0.4, 1);
  mesh.add(tag);
  const r = { mesh, tag, lastCrouch: -1, spotT: 9, firedT: 99, team: rp.tm || 0, streak: 0, trailColor: null, trailPrev: null }; // firedT init = bots.js:33 parity; T55 §39.3 trail state
  // [T130] the skinned operator body — the name-hash picks the roster line (the wire carries no
  // operator id); the capsule stays on stage until the GLTF is live (the fallback law), then hides.
  try {
    const hash = String(rp.n || 'P').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
    const model = (hash & 1) ? 'xbot' : 'soldier';
    const rig = ops3dRig('remote', { model, tint: CFG.COLORS.accentA });
    if (rig) { rig.group.rotation.y = Math.PI; /* [T125 §POLARITY-1] same law as bots.js:157 — the +Z-facing rig under a raw-yaw parent needs the π (r.mesh.rotation.y = lerpAngle(yaw) carries the engine convention; without it the skinned remote faces 180° off) */ rig.group.visible = false; mesh.add(rig.group); r.rig3d = rig; r._r3prev = new THREE.Vector3(rp.x, rp.y, rp.z); }
  } catch (e) { /* the body never breaks the remote */ }
  remotes.set(rp.id, r);
  applyTrail(r, mp.ct && mp.ct.get(rp.id)); // T55: create-time trail resolve (roster may land before first snap)
  return r;
}
function removeRemote(id) {
  const r = remotes.get(id);
  if (r) { if (r.rig3d) r.rig3d.dispose(); scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); remotes.delete(id); }
}

// ---- [T138] THE REMOTE CORPSE WIRE — the T133 honest residual closes. Pre-T138 a dead remote
// just vanished (mesh hidden, rig starved at dead:false). Now: the kill event's killer→victim
// geometry lands as a HINT (corpseHint), and the snapshot loop turns it into a corpse drive —
// the body stays where interpolation left it, the verlet takes the fall (the SAME rig the live
// body rides), the tag hides, the respawn (al:1 again) restores through ops3d's own dead:false
// branch. No wire change (the hints ride the EXISTING kill broadcast; corpses ride the EXISTING
// al flag) — presentation-only, the T119 law.
const CORPSE = new Map(); // victimId → { kx, kz, knock } — consumed on the death beat (al:1→0)
export function corpseHint(victimId, kx, kz, knock) {
  if (victimId == null) return;
  CORPSE.set(victimId, { kx, kz, knock: (typeof knock === 'number' && knock > 0) ? knock : 2.1 });
}
const _cd = new THREE.Vector3(); // the hint→deadDir scratch
function corpseDir(r) { // killer→victim horizontal normalized (ops3d reads .x/.z)
  const h = r.corpse.hint; if (!h) return null;
  _cd.set(r.corpse.x - h.kx, 0, r.corpse.z - h.kz);
  return (_cd.lengthSq() > 1e-6) ? { x: _cd.x / _cd.length(), z: _cd.z / _cd.length() } : null;
}

export function sendRespawn(pos) {
  if (mp.spec) return; // T41 §25.4: a spectator never respawns (no actor exists)
  if (!socket || !mp.joined) { pendingRespawn = { x: pos.x, y: pos.y, z: pos.z }; return; } // race: match started pre-join
  graceUntil = performance.now() + 600; // spawn teleport sync — excluded from error budget (instrumentation honesty)
  respawnPendingUntil = performance.now() + 1000; // MP-2: stale al:0/hp:0 snaps must not re-kill the respawn
  syncEp++; respawnTarget = { x: pos.x, z: pos.z }; // err gate: epoch-tag history; earlier gates leaked the join->respawn
    // teleport distance through two measured holes — acks straddling grace expiry AND a stale pre-respawn snapshot
    // re-seeding recon (blend dragged the teleported player back; errMax == EXACT teleport distance 54.1/78.1/66.0/
    // 113.2/48.0/108.0m across six runs). Epoch match is immune to seq resets and accumulator burst timing.
  mp.stats.syncLog = (mp.stats.syncLog || []).concat([{ t: +performance.now().toFixed(0), seq, ep: syncEp, pos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) } }]); // diag: respawn sequence
  history.length = 0; recon = null;
  socket.emit('respawn', { pos: [pos.x, pos.y, pos.z] });
}
// MP-3: request server-side match start in my room (server owns lifecycle/limits/scores)
export function sendMatchStart(mode) {
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4: spectators cannot start matches
  socket.emit('startMatch', { mode });
}

// T45 §29.2: host lobby mode pick (server validates host/idle/mode; does NOT start)
export function sendSetMode(mode) {
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4: spectators cannot set the lobby mode either
  socket.emit('setMode', { mode });
}

// §51.3 S2: host map pick — spectator-excluded mirror (setMode-identical gate)
export function sendSetMap(mapId) {
  if (!socket || !mp.joined || mp.spec) return;
  socket.emit('setMap', { map: mapId });
}

// §52.4 S4: HOST RULES — spectator-excluded mirror
export function sendSetKnob(k) {
  if (!socket || !mp.joined || mp.spec) return;
  socket.emit('setKnob', { sl: k && k.sl, tl: k && k.tl });
}

// §53.7 P2: pre-join senders — NO join-gate (the shop/social/queue work pre-match)
export function sendAuth(payload) { if (socket) socket.emit('auth', payload); }
export function sendEco(payload) { if (socket) socket.emit('eco', payload); }
export function sendVars(payload) { if (socket) socket.emit('vars', payload); } // §55 [T173]: {op:'get'} → mp.vars + onVars · {op:'set', set:{k:v}} (null deletes; caps 64 keys/8 KB) — pre-join legal (no join gate, the §53.7 law)
export function sendSoc(payload) { if (socket) socket.emit('soc', payload); }
export function sendQ(payload) { if (socket) socket.emit('q', payload); }

// §53.7: session mirror — main.js hydrates from ironsight.auth.v1 and updates on responses
export const AUTH = { name: null, tok: null, pid: null, disc: null }; // [T166] disc = the pilot ID discriminator
export function setAuth(a) { AUTH.name = (a && a.name) || null; AUTH.tok = (a && a.tok) || null; AUTH.pid = (a && a.pid) || null; AUTH.disc = (a && a.disc) || null; }
export function authPid() { return (AUTH.tok && (AUTH.pid || mp.pid)) || null; } // account pid when signed in, device pid otherwise — zero join-contract change

// T1-1 (SS22.3): server-initiated spawn (SND round start) — the server teleports the actor;
// the client re-seeds prediction exactly like sendRespawn but WITHOUT emitting 'respawn'
// (the server already owns the teleport; §11 gates would reject it mid-round anyway).
export function serverSpawn(pos) {
  graceUntil = performance.now() + 600;
  respawnPendingUntil = performance.now() + 1000;
  syncEp++; respawnTarget = { x: pos.x, z: pos.z };
  history.length = 0; recon = null;
}

// --- MP-3.1 residuals (Task 33) ---
export function sendNade(o, d, f, kind = 'frag') { // T2-9: full velocity vector + fuse, server owns the flight; Task 35: kind rides the wire
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4
  socket.emit('nade', { o: [o.x, o.y, o.z].map(v => +v.toFixed(3)), d: [d.x, d.y, d.z].map(v => +v.toFixed(3)), f: +f.toFixed(3), kind });
}
export function sendStreak(i) { // T2-10: server validates cost/arm/live and owns all three streaks
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4
  socket.emit('streak', { i });
}
export function sendAbility(id) { // T2-10: server mirrors ability truth (client predicts locally)
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4
  socket.emit('ability', { id });
}
// T2-5 Phase 3 (Task 55, §39.4): emote taunt — server validates vs cos.EMOTES, rate-caps
// (§34 sweep 2/2s), and broadcasts to OTHERS (sender shows locally before emitting).
export function sendEmote(id) {
  if (!socket || !mp.joined || mp.spec) return; // T41 §25.4: spectators don't taunt
  socket.emit('emote', { id });
}

export function onMatchStart() {
  seq = 0; acc = 0; history.length = 0; snapBuf.length = 0; lastTick = -1; recon = null;
  mp.stats.errEma = 0; mp.stats.errMax = 0; mp.stats.corrCount = 0; mp.stats.stale = 0;
}

// probe surface (acceptance probes read this — window.__mp)
export function installProbe() {
  window.__mp = {
    stats: mp.stats,
    ready: () => mp.ready,
    myId: () => myId,
    pos: () => player ? { x: player.pos.x, y: player.pos.y, z: player.pos.z } : null,
    yawPitch: () => player ? { yaw: player.yaw, pitch: player.pitch } : null,
    remoteCount: () => remotes.size,
    remotePos: () => [...remotes.entries()].map(([id, r]) => ({ id, x: r.mesh.position.x, y: r.mesh.position.y, z: r.mesh.position.z })),
    recon: () => recon,
    histLen: () => history.length,
    lastTick: () => lastTick,
    hp: () => player ? player.hp : null,
    alive: () => player ? player.alive : null,
    fires: () => mp.stats.fires,
    actors: () => scoreActors(),
    remotes: () => remoteActors(),
    uav: () => mp.uavT, matchTl: () => mp.matchTl, roster: () => mp.roster, inLive: () => mp.inLiveMatch,
    hpIdx: () => mp.hpIdx, hpT: () => mp.hpT, tags: () => mp.tags || [], sndB: () => mp.sndB || null, ctlB: () => mp.ctlB || null, // T1-1 probes + T98 ctl wire
    myGgTier: () => mp.myGgTier || 0, ggTotal: () => mp.ggTotal || 0, // T1-1 gg probe
    flags: () => World.flags.map(f => ({ id: f.id, owner: f.owner, prog: +f.prog.toFixed(2) })), // T1-9 probe
    lastEnd: () => mp.lastEnd, // Task 35: match end board probe
    lastFlash: () => mp.lastFlash, // Task 35: flash broadcast probe
    rx: () => mp.rx || [], // Task 35: wire receive log
    rtSrv: () => mp.stats.rtSrv, // T2-11 probe
    cfg: () => ({ interpDelay: CFG.MP.interpDelay, blendRate: CFG.MP.blendRate, server: CFG.MP.server }),
  };
}
