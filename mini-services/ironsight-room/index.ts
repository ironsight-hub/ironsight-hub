// ============================================================
// IRONSIGHT — ironsight-room : AUTHORITATIVE room service
// (Task 32 reconstruction of the MP-2-era service; MP-3 rooms +
// match lifecycle added in the same contract. Design:
// docs/INTEGRATION_SPEC.md §2/§4/§5/§7/§10/§11/§12/§15/§17.)
//
// Platform-registered mini-service (dev.sh start_mini_services
// auto-runs any mini-services/* with a "dev" script). Port 3010.
// Sanctioned WS shape: socket.io path:'/' (DO NOT change — the
// Caddy ?XTransformPort route depends on it), cors open (dev).
//
// Spike 0 laws inherited:
//   law 7  — per-socket ORDERED outbound chain (per-message delay
//            draw, due-time monotonic FIFO clamp) → injection can
//            add latency but never reorder.
//   law 10 — snapshots carry vx/vz; lag-comp sized to the DRIFT
//            budget, correction sized to the ERROR budget.
// §15 laws: starvation REPEATS last input (edges stripped), never
//   steps zero-input; queue FOLD depth 10 (167 ms) for 250 ms legs [T151: was 3].
// §17 laws: pong crosses the chain once (full-RTT semantics);
//   rewind = min(rt/2 + interpDelay, 250 ms) vs 32-tick ring.
// MP-3.1 residuals (Task 33): T2-9 server-side grenades (weapons.js
//   projectile math verbatim: grav 18, bounce 0.42, damp 0.82), T2-10
//   scorestreaks/abilities server-owned (modes.js semantics verbatim),
//   T2-11 server-measured RTT (sping/spong EMA, lag-comp source),
//   T2-12 host permissions + roster events, T1-9 server-truth flags
//   (m.fl -> client World.flags mirror).
// Residuals-of-residuals (Task 35): flashbang server broadcast (main.js
//   doFlash blind model verbatim: radius*2.2 range, facing dot > -0.2,
//   LoS gate, strength = (1-d/range)*(facing>0.4?1:0.45)), remote fired
//   reveal feed (hud.js:197 seeEnemy gate parity — bots.js:342 firedT=0),
//   match-end board[] already rode the end event since Task 32.
//
// No-orphan rule: physics + config are imported from THE shipped
// game files (same modules the browser runs). Map colliders/spawns
// come from maps/outpost.json (regen: scripts/mp1_dump_map.sh).
// Only true weapons.js GEOMETRY constants are mirrored here
// (weapons.js imports three.js — cannot load under bun):
//   hs=0.19 head half-extent, bw=0.42 body half-width,
//   headC = centerPos + height*0.3 (weapons.js:204 generic branch),
//   bodyY = center ∓ (bh, bh*0.9), bh = height*0.5 (:208).
// ============================================================
import { createServer } from 'http'
import { Server } from 'socket.io'
import { readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs'
import { createHmac } from 'node:crypto' // [T110] the tk checkout-nonce signer — the PSP-agnostic webhook verifier (TK_SECRET comment at the eco ops)

// --- shared core: THE shipped game files (no-orphan) ---
const GAME_JS = (process.env.IRON_GAME || '/home/z/my-project/download/fps/js').replace(/\/$/, '')
const phys = await import(GAME_JS + '/physics.js')
const cfg = await import(GAME_JS + '/config.js')
const cos = await import(GAME_JS + '/cosmetics.js') // T2-5 Phase 2 (T48a): shared PURE finish defs — single truth, same no-orphan law as physics/config (cosmetics imports nothing, loads under bun)
const mg = await import(GAME_JS + '/metagame.js') // T102 (v1.67): the meta economy pure laws join the no-orphan single-truth import set — metagame.js imports nothing (the zero-import law, verified), loads under bun (the cosmetics.js precedent)
const ops = await import(GAME_JS + '/operators.js') // T108 N8 (v1.72): the operator roster joins the single-truth import set — operators.js imports nothing (pure module), loads under bun (the cosmetics.js precedent); drives join validation + eco operator pricing
const tk = await import(GAME_JS + '/tokens.js') // [T110 T2-5] the token leg: packs + the TK_STAGES mirror + the checkout-TTL/hist-cap constants (tokens.js imports nothing — the zero-import law; the PSP integration point lives at the tkco/tkpack ops)
const { stepState } = phys
const { CFG, WEAPONS, FRAG, FLASH, ABILITIES, GG_LADDER, SND_BOMB, XP_AWARD, xpForLevel, lvlFromXp, RANKED_MODES, RANKED_MIN_PLAYERS, RP_AWARD, rpDelta, tierOf, seasonOf, softReset, RP_TIERS, RANKED_PLACEMENTS, MAX_LVL, PRESTIGE, PRESTIGE_CLASSIC, crDelta, statOwns, casePick, ECO_CLAIM, ECO_RARITY, ECO_DUPE_REFUND, ECO_CAPS, CLAN, isoWeekOf, Q_WIDEN, widenTiers, BP, BP_AWARD, RANK_REWARDS, bpOf, ATTACHMENTS, SIGNATURE, BR_LOOT } = cfg // [T152 FIX] ATTACHMENTS + SIGNATURE join the destructure — buildWdefs referenced ATTACHMENTS since T40 §24 WITHOUT importing it: an undeclared identifier, hidden by the ternary short-circuit (empty `at[wid]` arrays never call the filter callback), throwing ReferenceError on the FIRST join that declared a non-empty attachment array — the hub's own validator was a join-fatal landmine for 112 tasks. [T152 E3] SIGNATURE joins for the per-weapon catalogs. // [T161] RANKED_PLACEMENTS (the ×2 volatility window) + MAX_LVL/PRESTIGE/PRESTIGE_CLASSIC (the dual-path prestige op) join the single truth // HP_HILLS/SND_SITES imports DROPPED (config exports stay for offline client) — objectives are per-room (room.HILLS/room.SITES, §51.2); §53: economy/social/queue law joins the single-truth destructure // T1-1: mode constants are module exports (SS22); T44 §28: XP law is a config.js export (single truth point); T46 §30: ranked law joins it · T89 L6: BP_AWARD + RANK_REWARDS join the SAME single truth

// --- T44 §28.3: cross-session career mirror (additive, pid-keyed) ---
// Loaded lazily at boot; saved at match end + disconnect ONLY (atomic tmp+rename; zero per-tick IO).
// Shape { v:1, players:{[pid]:{n,k,d,m,w,xp,lvl,tally:{[mode]:{m,w}},last}} } (§28.3).
const CAREER_PATH = process.env.IRON_CAREER || (import.meta.dir + '/career.json')
let CAREER = { v: 1, players: {} }
let CAREER_DIRTY = false
try {
  const raw = JSON.parse(readFileSync(CAREER_PATH, 'utf8'))
  if (raw && typeof raw === 'object' && raw.v === 1 && raw.players && typeof raw.players === 'object') CAREER = raw
  else console.log('[career] malformed file — starting fresh')
} catch (e) { console.log('[career] fresh store (no file yet)') }
function careerPersist() {
  if (!CAREER_DIRTY) return
  try {
    const tmp = CAREER_PATH + '.tmp'
    writeFileSync(tmp, JSON.stringify(CAREER))
    renameSync(tmp, CAREER_PATH)
    CAREER_DIRTY = false
  } catch (e) { console.log('[career] persist failed: ' + (e && e.message)) }
}
function careerRec(pid, name) {
  let r = CAREER.players[pid]
  if (!r) { r = CAREER.players[pid] = { n: name, k: 0, d: 0, m: 0, w: 0, xp: 0, lvl: 1, tally: {}, last: 0 } }
  return r
}
function profileOf(pid) {
  const r = CAREER.players[pid]
  return r ? { xp: r.xp, lvl: r.lvl, m: r.m, k: r.k, d: r.d, w: r.w } : { xp: 0, lvl: 1, m: 0, k: 0, d: 0, w: 0 }
}
// --- T46 §30.5: ranked view (read-only synth — NO speculative rollover at view time) ---
function rankedView(rec) {
  const rk = rec && rec.rk
  return rk ? { s: rk.s, rp: rk.rp, tier: tierOf(rk.rp), pk: rk.pk, m: rk.m, w: rk.w } : { s: seasonOf(Date.now()).id, rp: 0, tier: tierOf(0), pk: 0, m: 0, w: 0 }
}
const PID_OK = (s) => typeof s === 'string' && s.length >= 8 && s.length <= 64 && /^[0-9a-fA-F-]+$/.test(s) // §28.3: uuid-char validation; invalid = absent

// ============================================================
// §53 P2 PRODUCT PASS stores (Task 74) — accounts / social / sessions / queue.
// Runtime data persists atomically (tmp+rename, §28.3 cadence law); session state is
// in-memory ONLY (restart = re-login — the honest law, no fake persistence).
// ============================================================
const ACC_PATH = process.env.IRON_ACCOUNTS || (import.meta.dir + '/accounts.json')
let ACC = { v: 1, users: {}, merged: {}, listings: [] }
try {
  const raw = JSON.parse(readFileSync(ACC_PATH, 'utf8'))
  if (raw && typeof raw === 'object' && raw.v === 1 && raw.users) ACC = raw
  else console.log('[acc] malformed file — starting fresh')
} catch (e) { console.log('[acc] fresh store (no file yet)') }

// [T166] THE FIRST-PILOT SEED — the CoD boot-account law: the game OPENS on an account
// face, so pilot #1 must exist with zero friction. If the account table is EMPTY (fresh
// deploy / ephemeral Render disk), seed ADMIN + the user's own password. It's CODE, not
// state — survives every redeploy; the clean-ship law (accounts.json ships empty) stands.
if (!Object.keys(ACC.users).length) {
  const ph = await Bun.password.hash('IronsightIRONSIGHT', { algorithm: 'argon2id' })
  const pid = crypto.randomUUID()
  const disc = assignDisc()
  ACC.users['admin'] = { name: 'ADMIN', pid, ph, made: Date.now(), disc }
  const rec = careerRec(pid, 'ADMIN'); rec.n = 'ADMIN'; rec.disc = disc
  ecoRec(rec).cr = 987654 // [T168] the user's grant — the seeded pilot boots with the 987,654 CR wallet (code-not-state, same law as the seed itself: every fresh deploy credits it; the client's CR chip ui.js:573 reads eco.cr as server truth)
  CAREER_DIRTY = true; accPersist(); careerPersist()
  console.log('[T166] first pilot seeded: ADMIN#' + disc + ' · [T168] eco.cr=987654')
}
function accPersist() {
  try {
    const tmp = ACC_PATH + '.tmp'
    writeFileSync(tmp, JSON.stringify(ACC))
    renameSync(tmp, ACC_PATH)
  } catch (e) { console.log('[acc] persist failed: ' + (e && e.message)) }
}
const SOCIAL_PATH = process.env.IRON_SOCIAL || (import.meta.dir + '/social.json')
let SOCIAL = { v: 1, friends: {}, reqs: {}, memberOf: {}, clans: {} }
try {
  const raw = JSON.parse(readFileSync(SOCIAL_PATH, 'utf8'))
  if (raw && typeof raw === 'object' && raw.v === 1 && raw.clans) SOCIAL = raw
  else console.log('[social] malformed file — starting fresh')
} catch (e) { console.log('[social] fresh store (no file yet)') }
function socialPersist() {
  try {
    const tmp = SOCIAL_PATH + '.tmp'
    writeFileSync(tmp, JSON.stringify(SOCIAL))
    renameSync(tmp, SOCIAL_PATH)
  } catch (e) { console.log('[social] persist failed: ' + (e && e.message)) }
}
// --- §55 [T173] PER-USER VARS STORE — bun:sqlite, INTEGER PRIMARY KEY (the rowid law) ---
// The most efficient per-user variable home on this stack: an auto-rowid INT key (the
// smallest/fastest key SQLite has — O(log n) B-tree point ops), pid TEXT UNIQUE as the
// stable reverse map, ONE JSON blob column per user (the record-per-user law — never
// per-variable rows at this scale), WAL journal for concurrent reads. Writes are
// per-op and touch ONE row — the full-store-rewrite cost the JSON stores pay does
// not exist here. Path env IRON_VARS (default ./vars.db — RUNTIME STATE, never ships:
// clean-ship law, like accounts.json). Boot is guarded: a non-bun runtime degrades to
// err('store') answers, never a crash (the honest-degradation law).
const VARS_PATH = process.env.IRON_VARS || (import.meta.dir + '/vars.db')
let VARS: any = null
try {
  const D = (await import('bun:sqlite')).Database
  VARS = new D(VARS_PATH)
  VARS.run('PRAGMA journal_mode = WAL')
  VARS.run('CREATE TABLE IF NOT EXISTS vars (uid INTEGER PRIMARY KEY, pid TEXT NOT NULL UNIQUE, data TEXT NOT NULL, t INTEGER NOT NULL)')
  console.log('[vars] store open: ' + VARS_PATH)
} catch (e) { console.log('[vars] store degraded: ' + (e && e.message)) }
const VARS_CAP_KEYS = 64, VARS_CAP_BYTES = 8192, VARS_KEY_LEN = 32, VARS_STR_LEN = 512, VARS_DEPTH = 4
function varsGet(pid: string): any {
  if (!VARS) return null
  try { const r = VARS.query('SELECT data FROM vars WHERE pid = ?').get(pid); return r ? JSON.parse(r.data) : {} } catch (e) { return null }
}
function varsSet(pid: string, data: string): boolean {
  if (!VARS) return false
  try { VARS.run('INSERT INTO vars (pid, data, t) VALUES (?, ?, ?) ON CONFLICT(pid) DO UPDATE SET data = excluded.data, t = excluded.t', pid, data, Date.now()); return true } catch (e) { return false }
}
const SESSIONS = new Map() // tok -> { pid, name, exp } (sliding TTL; restart = re-login)
const SESSION_TTL = 30 * 86400e3
function newTok() { const b = new Uint8Array(32); crypto.getRandomValues(b); return [...b].map(x => x.toString(16).padStart(2, '0')).join('') }

// [T166] THE PILOT DISCRIMINATOR — the CoD Activision-ID mechanic (researched:
// support.activision.com — DisplayName#1234567, the number disambiguates colliding
// display names and IS the friend-add handle). 4-digit, unique across accounts;
// stamped on the account record (auth truth) + the career record (the public index
// pidByName/socialState read). Bare-name adds still resolve (unique names by
// construction — ACC keyed by lowercase name); the full ID always resolves.
function assignDisc(): string {
  for (let i = 0; i < 64; i++) {
    const d = String(1000 + Math.floor(Math.random() * 9000))
    if (!Object.values(ACC.users).some((a: any) => a.disc === d)) return d
  }
  return String(1000 + (Date.now() % 9000)) // keeps the shape total; collision odds ~0
}

// [T166] THE BIG-MAP POOL — the largest roster stages (60×44 half-extents, the 2.6k-tile
// tier; area-ranked over all 35 map JSONs). The client's BIG MAP accordion queues with
// big:true and the hub boots that bucket's world from here (see the q handler).
const BIG_MAP_POOL = ['voskhod', 'yard', 'windfarm', 'temple', 'stadium', 'solar'] // [T170] VOSKHOD joins — the 1.0 km2 battle map heads the bucket
// §53.1: one-time device-career merge — a login absorbs the device pid's career record
function mergeCareer(dst, src) {
  dst.k += src.k || 0; dst.d += src.d || 0; dst.m += src.m || 0; dst.w += src.w || 0
  dst.xp += src.xp || 0; dst.lvl = lvlFromXp(dst.xp)
  dst.bs = Math.max(dst.bs || 0, src.bs || 0)
  for (const k of Object.keys(src.tally || {})) {
    const a = dst.tally[k] || (dst.tally[k] = { m: 0, w: 0 })
    a.m += src.tally[k].m || 0; a.w += src.tally[k].w || 0
  }
  if (src.rk) {
    if (!dst.rk || dst.rk.s !== src.rk.s) dst.rk = { ...src.rk }
    else dst.rk.rp = Math.max(dst.rk.rp, src.rk.rp), dst.rk.pk = Math.max(dst.rk.pk || 0, src.rk.pk || 0), dst.rk.m += src.rk.m || 0, dst.rk.w += src.rk.w || 0
  }
}
// T102 (v1.67): the T94 carry-law BP shape joins the server ledger — canonicalize on touch.
// migrateBp never throws; STALE season key kills prem+claims server-side too (the
// claims-die-with-the-window law, the same reset the client enforces at renderBp).
function bpRec(rec) {
  rec.bp = mg.migrateBp(rec.bp, seasonOf(Date.now()).id)
  return rec.bp
}
// T102: the ∪ law's server read for dupe conversion — inventory ∪ bundle-derived
// (claims/bundles grant INTO inventory, so two legs suffice; the pure law stays single-truth)
function srvOwns(rec, id) {
  if (!id) return false
  const e2 = rec.eco
  if (e2 && e2.own && e2.own[id] > 0) return true
  return (rec.bn && typeof rec.bn === 'object') ? mg.bundleOwnedItems(rec.bn).has(id) : false
}
// T102: the window-keyed event-store counter view (claims-die-with-the-window law —
// the counter resets when the ISO week rolls, the same law migrateEvs enforces client-side)
function evsStoreView(rec) {
  const week = mg.weekMonOf(mg.evDayOf(Date.now()))
  return (rec.evsStore && rec.evsStore.w === week) ? { w: week, t: rec.evsStore.t } : { w: week, t: 0 }
}
// T103 (v1.68): the challenge-window ledger joins the server — evChPersistShape on touch + the
// ISO-week rollover (the migrateEvs carry law, client-identical: stale version/day/week keys
// reset the WHOLE window shape incl. stats — the claims-die-with-the-window law)
function evsRec(rec) {
  const today = mg.evDayOf(Date.now())
  if (!rec.evs || rec.evs.v !== mg.EV_PERSIST_V) rec.evs = mg.evChPersistShape()
  if (mg.evsWindowRollover(rec.evs, today, mg.weekMonOf(today))) rec.evs = mg.evChPersistShape()
  return rec.evs
}
// T103: the challenge-window VIEW — a defensive copy riding ecoState + the claim acks (the
// metaLedger server truth; the client renders progress from ITS OWN deterministic lists keyed
// by the SERVER's window keys d/w — server-authoritative earn means the server's window IS the window)
function evsView(rec) {
  const s = evsRec(rec)
  return { v: s.v, d: s.d, w: s.w, claimed: s.claimed, stats: { ...s.stats }, ms: [...(s.ms || [])] }
}
// §53.2: economy rides the career record (lazy domain, single write path = careerPersist)
function ecoRec(rec) {
  return rec.eco || (rec.eco = { cr: 0, own: {}, out: [], inbox: [], lastClaim: 0, tk: 0, tkhist: [] }) // [T110] tk balance + the receipt trail join the default shape (additive — pre-T110 records read undefined→0, the zero-migration law)
}
function owns(rec, itemId) { // ownership = stat ∪ inventory (stat-entitlements are NOT listable)
  const item = cos.ecoItemById(itemId)
  if (!item) return false
  if (statOwns(item.req, rec)) return true
  const e = rec.eco
  return !!(e && e.own && e.own[itemId] > 0)
}
const ACC_LISTINGS = () => ACC.listings
function marketNames() { // §53.7: trader names resolved SERVER-side (client renders truth only)
  const out = {}
  for (const l of ACC.listings) out[l.seller] = (CAREER.players[l.seller] || {}).n || l.sellerName || 'PILOT'
  return out
}
function ecoState(pid) {
  const rec = CAREER.players[pid]
  if (!rec) return null
  const e = ecoRec(rec)
  return { cr: e.cr, tk: e.tk | 0, own: { ...e.own }, out: e.out.map((l) => ({ ...l })), inbox: e.inbox.map((o) => ({ ...o, n: (CAREER.players[o.from] || {}).n || o.fromName || 'PILOT' })), market: ACC_LISTINGS().map((l) => ({ ...l })), names: marketNames(), bp: bpRec(rec), bn: { ...(rec.bn && typeof rec.bn === 'object' ? rec.bn : {}) }, evsStore: evsStoreView(rec), evs: evsView(rec), tkhist: (e.tkhist || []).slice(-20) } // T102: the meta ledger views join the state payload (canonicalized bp, the window marker map, the window-keyed store counter) · T103: the challenge-window view rides too (d/w/claimed/stats/ms — the missions pages' server truth) · [T110]: the tk balance + the receipt trail ride (the token leg's state push)
}
function pidByName(name) { // §53.3: exact-name resolve over the career index
  if (typeof name !== 'string') return null
  const n = name.trim().toLowerCase()
  for (const [pid, r] of Object.entries(CAREER.players)) if ((r.n || '').toLowerCase() === n) return pid
  return null
}
function presenceOf(pid) { // presence = live room membership
  if (pid) for (const r of rooms.values()) for (const q of r.players) if (q.pid === pid) return { on: true, room: r.id }
  return { on: false }
}
function socialState(pid) {
  return {
    friends: (SOCIAL.friends[pid] || []).map((f) => ({ pid: f.pid, since: f.since, n: (CAREER.players[f.pid] || {}).n || f.n || 'PILOT', disc: (CAREER.players[f.pid] || {}).disc || null, ...presenceOf(f.pid) })), // [T166] the ID rides the friends list
    reqsIn: (SOCIAL.reqs[pid] || []).map((o) => ({ from: o.from, n: (CAREER.players[o.from] || {}).n || 'PILOT' })),
    memberOf: SOCIAL.memberOf[pid] || null,
    clan: SOCIAL.memberOf[pid] ? clanView(SOCIAL.clans[SOCIAL.memberOf[pid]]) : null,
    war: SOCIAL.memberOf[pid] ? warView(pid) : null, // [T156 R10] the weekly war snapshot rides the social state (the client's war band leads from THIS)
  }
}
function clanView(c) { return { ...c, war: c.war | 0, names: Object.fromEntries((c.members || []).map((m) => [m, (CAREER.players[m] || {}).n || 'PILOT'])) } } // [T156 R10] the clan payload view — the all-time war tally + the member-name map ride EVERY clan payload (the roster single-truth read)
function warView(pid2) { // [T156 R10] the caller's weekly war snapshot (the freshest face leads the client's war band; rank = 1 + clans above)
  const cid2 = SOCIAL.memberOf[pid2]
  if (!cid2 || !SOCIAL.clans[cid2]) return null
  const c = SOCIAL.clans[cid2], wk = isoWeekOf(new Date().toISOString().slice(0, 10))
  if (c.wK !== wk) return { week: wk, pts: 0, w: 0, m: 0, rank: 0 }
  const higher = Object.values(SOCIAL.clans).filter((x) => x.id !== cid2 && (x.wK === wk ? (x.wP | 0) : 0) > (c.wP | 0)).length
  return { week: wk, pts: c.wP | 0, w: c.wWins | 0, m: c.wM | 0, rank: higher + 1 }
}
function rebroadcastRoomsFor(pid) { // live-caught defect S4c fix: clan changes REBROADCAST rosters
  if (!pid) return
  for (const r of rooms.values()) { let hit = false; for (const q of r.players) if (q.pid === pid) hit = true; if (hit) broadcastRoster(r) }
}
// §53.4 G4 matchmaking — QUICKPLAY = open matching (fullest idle lobby); RANKED = bucket by
// the PUBLIC RP tier (§30.8 RP≠MMR stands) with wait-time widening [p2_mmr_a].
const QUEUE = [] // { op, pid, name, ti, mode, t0, chain }
let rkCounter = 0
function tierIdx(rp) { let i = 0; for (let k = 0; k < RP_TIERS.length; k++) if (rp >= RP_TIERS[k].min) i = k; return i }
function bestLobbyOf(wantBig = false) { // [T166] the big flag filters BOTH directions — a regular queue never lands in a big world and vice versa
  let best = null
  for (const r of rooms.values()) {
    if (r.priv) continue
    if (!!r.big !== wantBig) continue
    if (r.match.state === 'idle') if (r.players.size < MAX_ROOM) if (!best || r.players.size > best.players.size) best = r // fullest idle public lobby
  }
  return best
}
function queueTick() {
  const now = Date.now()
  for (const w of QUEUE) {
    if (w.op !== 'rank') continue
    const widen = widenTiers((now - w.t0) / 1000)
    const lo = Math.max(0, w.ti - widen), hi = Math.min(RP_TIERS.length - 1, w.ti + widen)
    const mates = QUEUE.filter((x) => x !== w && x.op === 'rank' && x.mode === w.mode && x.ti >= lo && x.ti <= hi && w.pid && x.pid && x.pid !== w.pid)
    if (1 + mates.length < RANKED_MIN_PLAYERS) continue
    const room = getRoom('RK' + (++rkCounter))
    room.priv = false
    room.match.mode = w.mode // §53.4: room preset mode (setMode tail law) — pop payload carries the mode
    const team = [0, 0]
    const members = [w, ...mates].slice(0, MAX_ROOM)
    for (const x of members) { x.room = room.id; x.chain('queue', { op: 'pop', room: room.id, mode: w.mode }) }
    for (const x of QUEUE.slice()) if (x.room) QUEUE.splice(QUEUE.indexOf(x), 1)
    console.log(`[room] ranked pop: ${members.length}p -> ${room.id} (${w.mode})`)
    break // one room per tick
  }
  // quickplay widens to any idle public lobby after Q_WIDEN — handled at join time (open bucketing)
}
setInterval(queueTick, 1000)

const MAP_PATH = process.env.IRON_MAP || (GAME_JS.replace(/\/js$/, '') + '/maps/outpost.json')
const MAP = JSON.parse(await Bun.file(MAP_PATH).text()) // boot map seed (IRON_MAP probe override honored)
// --- §51.2 S2: per-room world slices — the module WORLD/UNION_POOL are GONE. Every room
// carries its own WORLD/POOLS/UNION/flags/HILLS/SITES built from the disk registry (32 maps),
// so a private room can pick ANY roster map (the MP outpost-pin residual is closed).
const MAPS_DIR = GAME_JS.replace(/\/js$/, '') + '/maps'
const MAPS_REGISTRY = readdirSync(MAPS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')) // disk truth — the pickable map IDs (extension-stripped; the raw-readdir form made every id lookup miss — caught live by the T166 big-pool E2E, same latent flaw rode setMap)
const BOOT_MAP_ID = (typeof MAP.id === 'string' && MAP.id) || 'outpost'
function loadMapData(id) {
  if (!MAPS_REGISTRY.includes(id)) return null
  try { return JSON.parse(readFileSync(MAPS_DIR + '/' + id + '.json', 'utf8')) } catch (e) { return null }
}
const MAP_DATA_BOOT = MAP // registry-validated upstream; boot map is the never-null fallback
function buildRoomWorld(room, mapId) {
  const d = loadMapData(mapId) || MAP_DATA_BOOT
  room.mapId = d.id || mapId
  // §54.2 U7: destructible props — dest boxes COPY-composed onto the frozen collider
  // array (d.colliders NEVER mutated, §51.2 law); room.DESTS = authoritative hp map.
  // Maps without `destructibles` → empty Map + zero composed boxes (byte-identical).
  room.DESTS = new Map()
  const destCols: any[] = []
  for (const x of ((d as any).destructibles || []) as any[]) {
    if (!x || !Array.isArray(x.p) || !Array.isArray(x.s) || x.p.length !== 3 || x.s.length !== 3 || !Number.isFinite(+x.hp)) continue
    const id = String(x.id || ('dest' + destCols.length))
    const w2 = +x.s[0] / 2, hh = +x.s[1], d2 = +x.s[2] / 2
    const box = { min: { x: +x.p[0] - w2, y: +x.p[1], z: +x.p[2] - d2 }, max: { x: +x.p[0] + w2, y: +x.p[1] + hh, z: +x.p[2] + d2 }, destId: id }
    destCols.push(box) // addBox formula mirror (world.js:129-133) — client derivation matches byte-for-byte
    room.DESTS.set(id, { hp: +x.hp, maxHp: +x.hp, box, center: { x: +x.p[0], y: +x.p[1] + hh / 2, z: +x.p[2] } })
  }
  room.WORLD = { colliders: [...d.colliders, ...destCols], jumpPads: d.jumpPads }
  room.NAV = (d as any).nav || null // [T171] the nav graph rides the room — the BR loot scatter scatters on it (client parity: modes.js brStart uses World.waypoints)
  room.POOLS = { ffa: d.spawnsFFA, a: d.spawnsA || [], b: d.spawnsB || [] }
  room.UNION = [...room.POOLS.ffa, ...room.POOLS.a, ...room.POOLS.b]
  room.flags = (d.flags || []).map(f => ({ ...f, owner: -1, prog: 0 }))
  room.HILLS = d.hills || []
  room.SITES = d.sites || []
}

// --- constants (provenance in comments) ---
const PORT = Number(process.env.PORT || process.env.IRON_PORT || 3010) // [T160] Render port precedence — Render injects PORT; IRON_PORT stays the dev/probe override; bare `bun index.ts` still binds 3010
const DELAY = Number(process.env.IRON_DELAY || 0)   // ms outbound injection (probe tiers)
const JITTER = Number(process.env.IRON_JITTER || 0) // ms uniform draw
const DT = 1 / 60, DT_MS = 1000 / 60
const SNAP_EVERY = 3                                 // 20 Hz (§5)
const HIST = 32                                      // rewind ring (§10)
const FOLD = 10                                      // queue fold depth [T151: was 3 — the walk-doubling fix, wire-proven probe_t151_ws: a 50ms queue drops real-world jitter bursts (100-300ms RTT spikes on the free Render hub), the ack stalls (med 21 steps / frozen tails captured), and the client's §8 replay then rebuilds a shadow that sprints ahead of truth only while inputs carry movement — the user's "doubling with movement" report. 10 = 167ms of buffer absorbs link jitter; the client's resync law bounds the pathological tail]
const INPUT_CAP = 90, FIRE_CAP = 30                  // per-second caps (§11)
// T50 §34: spawn-pool UNION for respawn validation (§11 law "client picks from the SAME
// pools" — now ENFORCED). Union, not team pool: the client's respawnPlayer samples
// World.spawnsA for EVERY team mode (documented client quirk, §34.2) — the union keeps
// every legal client pick valid while still killing arbitrary-map teleport-respawn.
const nearPoolR = (room: any, x: number, y: number, z: number, tol = 0.5) => (room.UNION || []).some(s => Math.hypot(s.x - x, (s.y || 0) - y, s.z - z) <= tol) // §34.2 law preserved PER-ROOM (0.5 m covers the +0.05 y spawn offset (makeState AND client respawnPlayer) + float jitter — anything farther is NOT a spawn pick)
const INTERP_DELAY = 100                             // §10: client interp buffer ms
const RECONNECT_MS = 10000                           // §4 reconnect grace
const MAX_ROOM = 12                                  // CFG.MODES.*.players
const SPEC_MAX = 8                                   // §25.1: simultaneous spectator cap (T41)
// T45 §29.1: private-lobby join codes — 32 glyphs, I/O/0/1 excluded (SS region-code readability)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LEN = 6
const P = CFG.PHYS, H = CFG.HEALTH
const FBIT = { CROUCH: 1, SLIDE: 2, GROUNDED: 4, SPRINT: 8 }
// T2-9 constants (provenance: FRAG from config.js verbatim; projectile math
// constants from weapons.js verbatim — see header)
const NADE_GRAV = 18            // weapons.js:259 pr.vel.y -= 18*dt
const NADE_DAMP = 0.82          // weapons.js:271 pr.vel.multiplyScalar(0.82)
const NADE_RATE = 2             // §11 extension: ≤2 throws/s (offline G-key cadence)
const NADE_LIVE = 4             // per-player live projectiles
const STIM = ABILITIES.find(a => a.id === 'stim')
// Task 35: flash range parity with main.js doFlash (player branch = radius*2.2)
const FLASH_RANGE = FLASH.radius * 2.2
// probe-only limit override (IRON_DELAY/IRON_CAP precedent): production shape
// is UNSET -> CFG.MODES limits verbatim; probes set IRON_KLIMIT to finish
// matches in seconds instead of grinding 30 kills / 600s clocks.
const KLIMIT = Number(process.env.IRON_KLIMIT || 0)
// T1-1 probe-only overrides (SS22.3/22.4; default UNSET = CFG verbatim)
const RLIMIT = Number(process.env.IRON_RLIMIT || 0)
const RTIME = Number(process.env.IRON_RTIME || 0)
const BTIME = Number(process.env.IRON_BTIME || 0)
const PTIME = Number(process.env.IRON_PTIME || 0)
const DTIME = Number(process.env.IRON_DTIME || 0)
const GGLAD = Number(process.env.IRON_GGLAD || 0)
const HLEAD = Number(process.env.IRON_HLEAD || 0) // T1-1 probe-only: hp lead-in override
const HTIME = Number(process.env.IRON_HTIME || 0) // T1-1 probe-only: hill duration override
// T1-1 team-mode set (SS22.5): tdm/dom/hp/kc/snd share balanced teams + team spawn pools
const TEAM_MODES = new Set(['tdm', 'dom', 'hp', 'kc', 'snd', 'gf', 'inf', 'ctl']) // T89 L1/L2/L3: the trio joins team modes (gf 2v2 pools · inf survivor/horde pools · ctl site pools)
const GG_TOTAL = (GGLAD || GG_LADDER.length) + 1 // tiers = ladder + melee; win = kill AT melee tier -> t >= GG_TOTAL + 1
// mirrored geometry constants (see header) — verbatim weapons.js
const HEAD_HS = 0.19, BODY_BW = 0.42
const heightOf = (crouch) => P.height + (P.crouchHeight - P.height) * crouch

// --- SS13 capacity instrumentation (MP-4, Task 34): cheap always-on collection;
//     REPORTING (/metrics + wire stamp 'et') gated by IRON_CAP=1 so the production
//     wire format stays byte-identical. §13: tick stability, snapshot latency,
//     per-client CPU -> JSON->binary decision rides on these numbers. ---
const CAP_ON = process.env.IRON_CAP === '1'
const capTicks = { n: 0, late: [], exec: [], lateMax: 0, execMax: 0, lateOver: 0, execOver: 0 }
const capPush = (a, v) => { a.push(v); if (a.length > 4096) a.shift() }
const capProc = { cpuPct: 0, rssKB: 0 }
if (CAP_ON) {
  let lastCu = process.cpuUsage(), lastT = Date.now()
  setInterval(() => {
    const now = Date.now(), wall = Math.max(1, now - lastT)
    const d = process.cpuUsage(lastCu)
    lastCu = process.cpuUsage(); lastT = now
    capProc.cpuPct = +(((d.user + d.system) / 1000) / wall * 100).toFixed(1)
    capProc.rssKB = Math.round(process.memoryUsage().rss / 1024)
  }, 1000)
}
function capMetrics() {
  const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
  return {
    capOn: CAP_ON, clockRunning, tickN,
    ticks: {
      n: capTicks.n,
      lateP50: pct(capTicks.late, 0.5), lateP95: pct(capTicks.late, 0.95), lateMax: capTicks.lateMax, lateOver5ms: capTicks.lateOver,
      execP50: pct(capTicks.exec, 0.5), execP95: pct(capTicks.exec, 0.95), execMax: capTicks.execMax, execOver4ms: capTicks.execOver,
    },
    proc: capProc,
    rooms: [...rooms.values()].map(r => {
      let qHi = 0
      for (const p of r.players) { const s = p.__chain && p.__chain.stats; if (s && s.qHi > qHi) qHi = s.qHi }
      return { id: r.id, size: r.players.size, tick: r.tick, snaps: r.cap.snaps, bytesAvg: r.cap.snaps ? Math.round(r.cap.bytes / r.cap.snaps) : 0, bytesMax: r.cap.bytesMax, qHi }
    }),
    players: [...rooms.values()].reduce((n, r) => n + r.players.size, 0),
  }
}

// --- ray math mirrored from world.js:312 rayAABB / weapons.js:439 rayBox ---
function rayBox(o, d, minx, miny, minz, maxx, maxy, maxz) {
  let tmin = 0, tmax = 1e9
  const mins = [minx, miny, minz], maxs = [maxx, maxy, maxz], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z]
  for (let a = 0; a < 3; a++) {
    if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < mins[a] || oo[a] > maxs[a]) return -1; continue }
    let t1 = (mins[a] - oo[a]) / dd[a], t2 = (maxs[a] - oo[a]) / dd[a]
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2)
    if (tmin > tmax) return -1
  }
  return tmin
}
function rayWorld(colliders: any, o: any, d: any, maxDist: number) {
  let bestT = maxDist
  for (const b of colliders) {
    let tmin = 0, tmax = bestT, ok = true
    for (let a = 0; a < 3; a++) {
      const ax = 'xyz'[a], oi = o[ax], di = d[ax], mn = b.min[ax], mx = b.max[ax]
      if (Math.abs(di) < 1e-9) { if (oi < mn || oi > mx) { ok = false; break } continue }
      let t1 = (mn - oi) / di, t2 = (mx - oi) / di
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t }
      if (t1 > tmin) tmin = t1
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) { ok = false; break }
    }
    if (ok && tmin < bestT && tmin >= 0) bestT = tmin
  }
  return bestT
}
// normal-carrying ray (world.js:312 rayAABB mirror — nAxis/nSign logic verbatim)
// for grenade bounce; client rayAABB returns {t, normal}, server returns {t, nx,ny,nz}
function rayWorldN(colliders: any, o: any, d: any, maxDist: number) {
  let bestT = maxDist, bAxis = -1, bSign = 0
  for (const b of colliders) {
    let tmin = 0, tmax = bestT, nAxis = -1, nSign = 0, ok = true
    for (let a = 0; a < 3; a++) {
      const ax = 'xyz'[a], oi = o[ax], di = d[ax], mn = b.min[ax], mx = b.max[ax]
      if (Math.abs(di) < 1e-9) { if (oi < mn || oi > mx) { ok = false; break } continue }
      let t1 = (mn - oi) / di, t2 = (mx - oi) / di, s = -1
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1 }
      if (t1 > tmin) { tmin = t1; nAxis = a; nSign = di > 0 ? -1 : 1 }
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) { ok = false; break }
    }
    if (ok && tmin < bestT && tmin >= 0) { bestT = tmin; bAxis = nAxis; bSign = nSign }
  }
  if (bestT >= maxDist || bAxis < 0) return null
  const n = { x: 0, y: 0, z: 0 }
  n['xyz'[bAxis]] = bSign
  return { t: bestT, nx: n.x, ny: n.y, nz: n.z }
}
function segmentBlockedSrv(colliders: any, a: any, b: any) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-6) return false
  return rayWorld(colliders, a, { x: dx / len, y: dy / len, z: dz / len }, len) < len
}
// §54.3 U7: nearest-destructible ray over room.DESTS (returns {t,id} | null).
// Dest boxes ALSO live in room.WORLD.colliders tagged destId (block physics with zero
// call-site changes); this ray ROUTES damage in the fire handler.
function rayDest(dests: Map<string, any>, o: any, d: any, maxDist: number) {
  let bestT = maxDist, id: string | null = null
  for (const [k, ds] of dests) {
    const b = ds.box
    const t = rayBox(o, d, b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z)
    if (t >= 0 && t < bestT) { bestT = t; id = k }
  }
  return id ? { t: bestT, id } : null
}
// forward vectors (player.js:107 verbatim convention, recoil=0 server-side):
// Euler YXZ (pitch,yaw): fwd = (-sin(yaw)cos(pitch), sin(pitch), -cos(yaw)cos(pitch))
function fwdXZ(yaw) { return { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) } }
function fwdFull(yaw, pitch) {
  const cp = Math.cos(pitch)
  return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp }
}
// T50 §34: freeAt was removed — its last caller was the respawn bounds check, superseded
// by nearPool (spawn-POOL membership subsumes bounds+free: pool points are walkable by
// construction). No-orphan law; in-sim clearance lives in physics.js.

// --- law 7: per-socket ordered outbound chain ---
function makeChain(emit) {
  let lastDue = 0
  const q = []
  let draining = false
  const ch = (msg, data) => {
    const draw = DELAY + (JITTER > 0 ? Math.random() * JITTER : 0)
    const now = Date.now()
    const due = Math.max(lastDue + 1, now + draw)
    lastDue = due
    q.push({ due, msg, data })
    if (q.length > ch.stats.qHi) ch.stats.qHi = q.length // SS13: queue high-water
    if (draining) return
    draining = true
    const flush = () => {
      const t = Date.now()
      while (q.length && q[0].due <= t) { const m = q.shift(); ch.stats.sent++; emit(m.msg, m.data) }
      if (q.length) setTimeout(flush, Math.min(q[0].due - t, 50))
      else draining = false
    }
    setTimeout(flush, Math.max(0, Math.min(q[0].due - Date.now(), 50)))
  }
  ch.stats = { qHi: 0, sent: 0 }
  return ch
}

// --- player + room state ---
let joinCounter = 0, nadeCounter = 0
// T40 §24: attachment-aware weapon defs — clone THE shipped config def, apply the client's
// declared attachments, then init authoritative ammo from the CLONED mag/reserve (extmag's
// 1.5x is honored server-side).
// [T152 E3] THE MERGED-CATALOG VALIDATION — universal tier (ATTACHMENTS) ∪ the weapon's own
// SIGNATURE ids, cap 3→5 (the MW max-5 law, client-mirrored in ui.js), unknown stripped.
// Composition law holds server-side: applies mutate the clone in equip order, multiplying
// into current values — the same def bytes the client's makeWeapon builds.
function sigByWid(wid: string, id: string) {
  const list = (SIGNATURE as any)[wid]
  return list ? list.find((s: any) => s.id === id) : undefined
}
function buildWdefs(ld) {
  const out = new Map()
  if (!ld || typeof ld !== 'object') return out
  const at = (ld.at && typeof ld.at === 'object') ? ld.at : {}
  for (const wid of [ld.w, ld.s]) {
    if (typeof wid !== 'string') continue
    const base = WEAPONS.find(w => w.id === wid)
    if (!base) continue
    const def = JSON.parse(JSON.stringify(base))
    const list = Array.isArray(at[wid]) ? at[wid].filter((a: any) => typeof a === 'string' && !!((ATTACHMENTS as any)[a] || sigByWid(wid, a))).slice(0, 5) : []
    for (const a of list) ((ATTACHMENTS as any)[a] || sigByWid(wid, a)).apply(def)
    def.attachIds = list
    out.set(wid, def)
  }
  return out
}
function initAmmo(pl) {
  const am = new Map()
  if (pl.wdefs) for (const [wid, def] of pl.wdefs) am.set(wid, { mag: def.mag, res: def.reserve, rl: 0 })
  return am
}
function makeState(spawn) {
  return {
    pos: { x: spawn.x, y: spawn.y + 0.05, z: spawn.z }, vel: { x: 0, y: 0, z: 0 },
    yaw: Math.atan2(-spawn.x, -spawn.z), pitch: 0,
    crouch: 0, grounded: true, groundedTime: 0, jumpBufT: 0,
    slide: { active: false, t: 0, dir: { x: 0, y: 0, z: 0 } },
    apexY: spawn.y, stimT: 0, sprinting: false,
  }
}
function makePlayer(id, name, spawn) {
  return {
    id, name, token: null, roomId: null, team: 0,
    st: makeState(spawn), seq: 0, q: [], lastIn: null, lastAppliedSeq: 0,
    inTimes: [], fireTimes: [],
    hp: H.maxHP, shield: 0, shieldT: 0, alive: true, kills: 0, deaths: 0, score: 0, streak: 0,
    spawnProt: 0, lastDmgT: 0, lastKillerId: null,
    hist: [],            // rewind ring {tick, x, y, z, h, alive}
    joined: false, joinOrder: 0,
    // MP-3.1 residuals (Task 33)
    nadeTimes: [], nadeLive: 0,                    // T2-9 rate caps
    // T40 §24: attachment-aware weapon defs + authoritative ammo (null = pre-T40 client)
    wdefs: null, ammo: null,
    streakUsed: [false, false, false],             // T2-10 one-shot arming (modes.js streakReady mirror)
    streakLoadout: [0, 1, 2],                      // [T155 R6] slot→CFG.STREAKS def map (join 'slo' validated; default = the pre-T155 slots verbatim)
    abId: 'dash', abCh: 2, abChMax: 2, abCd: 0,    // T2-10 abilities (modes.js:273-275 mirror)
    fin: 'default',                                // T2-5 Phase 2 (T48a): weapon finish id — join-validated vs cos.FINISHES
    trl: 'none',                                   // T2-5 Phase 3 (T55 §39.3): trail id — join-validated vs cos.TRAILS ('none' = stock, roster ct drops)
    healT: 0,                                      // stim heal-over-time
    srvRtt: null, spingAt: 0,                      // T2-11 server-measured RTT
  }
}

// T41 §25: spectator record — deliberately NOT a makePlayer entity: no pos/vel/hp/st/ammo
// fields exist, so the sim cannot step it and snapshots cannot contain it. `joined: false`
// IS the read-only enforcement (every mutation handler opens `if (!p || !p.joined) return`).
function makeSpec(id, name) {
  return { id, name, spec: true, joined: false, roomId: null, __chain: null }
}

const rooms = new Map()
function genCode() { // T45 §29.1: rejection-sample against live room ids (a private room's id IS its code)
  let c
  do { c = ''; for (let i = 0; i < CODE_LEN; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)] } while (rooms.has(c))
  return c
}
function getRoom(id) {
  let r = rooms.get(id)
  if (!r) {
    r = {
      id, players: new Set(), specs: new Set(), tick: 0, // T41 §25: specs = read-only consumers (never in players)
      priv: false, code: null, // T45 §29.1: private lobby + join code (code IS the room id; set by the priv-create join path)
      match: { mode: 'ffa', state: 'idle', tLeft: 0, cd: 0, teamS: [0, 0], domS: [0, 0], domT: 0, endT: 0, winner: null, draw: false, reason: '',
        // T1-1 (SS22): objS = hp points / kc confirms / snd round wins; snd = round machine; tags live on the room
        objS: [0, 0], snd: null, ggt: 0, br: null as any },
      mapId: BOOT_MAP_ID, // §51.2: per-room world id (host-pickable via setMap)
      knobs: { sl: 0, tl: 0 }, // §52.4 S4: host rule knobs — 0 = mode default (undefined-drops on the wire)
      spawnIdx: 0,
      // T1-1 (SS22): hp hills + kc dog tags + snd bomb live on the room (server-simmed presence)
      hill: { idx: -1, owner: -1, prog: 0, t: 0, tickT: 0 },
      tags: [], // {x, z, tm, t}
      cap: { snaps: 0, bytes: 0, bytesMax: 0 }, // SS13
      // MP-3.1: T2-9/T2-10 world dynamism (server-owned)
      uavT: 0, strikes: [], bombs: [], crates: [], nades: [], burns: [], // [T155 R6] burns = the napalm DoT zones (the modes.js burnZones mirror)
      loot: [] as any[], lootSeq: 0, // [T171] BR ground-loot manifest + id seq (the ev:'brLoot' wire carries it once; lootNew/lootTake deltas ride the match chain)
    }
    buildRoomWorld(r, BOOT_MAP_ID) // §51.2: per-room WORLD/POOLS/UNION/flags/HILLS/SITES
    rooms.set(id, r)
  }
  return r
}
const held = new Map() // token -> {p, roomId, purgeTimer}

function spawnPool(room, team) {
  if (TEAM_MODES.has(room.match.mode) && room.match.state !== 'idle') {
    return team === 1 ? room.POOLS.b : room.POOLS.a
  }
  return room.POOLS.ffa
}
function pickSpawn(room, team, self) {
  const pool = spawnPool(room, team)
  // farthest-from-alive-enemies scoring (mirrors main.js respawnPlayer: 5 random samples)
  const enemies = [...room.players].filter(p => p !== self && p.alive && p.team !== team)
  let best = pool[0], bestScore = -1
  for (let i = 0; i < 5; i++) {
    const sp = pool[Math.floor(Math.random() * pool.length)]
    let score = 1e9
    for (const e of enemies) score = Math.min(score, Math.hypot(sp.x - e.st.pos.x, sp.z - e.st.pos.z))
    if (score > bestScore) { bestScore = score; best = sp }
  }
  return best
}

// --- damage (§17: shield-first order, verbatim XP, GRAVITY fall deaths) ---
const fireAudit = [] // last 32 fire validations (probe surface)
function audit(entry) { fireAudit.push(entry); if (fireAudit.length > 32) fireAudit.shift() }
const nadeAudit = [] // last 32 nade validations incl. rejects (Task 35 probe surface — silent rejects were undebuggable)
function naudit(entry) { nadeAudit.push(entry); if (nadeAudit.length > 32) nadeAudit.shift() }

function applyDamage(room, victim, dmg, attacker, head, weaponName, fx) {
  if (!victim.alive || victim.spawnProt > 0) return { blocked: true }
  // countdown gate: offline routeDamageToBot blocks damage unless match.state==='live'
  // (modes.js parity); idle/ended stay open = MP-2 sandbox behavior (no match running).
  if (room.match.state === 'countdown') return { blocked: true }
  const sAbs = Math.min(victim.shield, dmg)
  victim.shield -= sAbs
  victim.hp -= (dmg - sAbs)
  victim.lastDmgT = Date.now()
  const kill = victim.hp <= 0
  if (kill && head && attacker) attacker.hs = (attacker.hs || 0) + 1 // T103: headshot-kill counter — the client onKill(h) mirror (main.js isPlayer&&h idiom); bullets are the ONLY headshot surface, so applyDamage IS the single counting site
  roomChain(room, 'dmg', {
    a: attacker ? attacker.id : 'GRAVITY', v: victim.id,
    dmg: Math.round(dmg), head: !!head, kill, vn: victim.name,
    fx: fx ? [+fx.x.toFixed(2), +fx.z.toFixed(2)] : null,
  })
  if (kill) killPlayer(room, victim, attacker, head, weaponName)
  return { blocked: false, kill }
}
function killPlayer(room, victim, attacker, head, weaponName) {
  victim.alive = false; victim.hp = 0; victim.deaths++; victim.streak = 0
  let kn = 'GRAVITY', kid = 'GRAVITY'
  if (attacker && attacker !== victim) {
    kn = attacker.name; kid = attacker.id
    attacker.kills++; attacker.streak++
    attacker.score += CFG.XP.kill + (head ? CFG.XP.headshot : 0)
    if (victim.lastKillerId === attacker.id) attacker.score += CFG.XP.revenge // revenge [COD]
    victim.lastKillerId = attacker.id
    if (room.match.mode === 'tdm' && room.match.state === 'live') room.match.teamS[attacker.team]++
    // T1-1 (SS22.4): Gun Game tier advance — deaths do NOT reset [e_14]; server ladder authoritative
    if (room.match.mode === 'gg' && room.match.state === 'live') {
      attacker.gg = (attacker.gg || 0) + 1
      const wid = attacker.gg <= (GGLAD || GG_LADDER.length) ? GG_LADDER[attacker.gg - 1] : 'melee'
      roomChain(room, 'match', { ev: 'tier', id: attacker.id, t: attacker.gg, wid })
    }
    // T2-10: re-arm used streaks whose cost the new score crosses again
    // (modes.js:221-227 verbatim semantics — unlock check runs on every kill)
    CFG.STREAKS.forEach((s, di) => { const si = attacker.streakLoadout.indexOf(di); if (si < 0 || si >= attacker.streakUsed.length) return; if (attacker.streakUsed[si] && attacker.score >= s.cost) attacker.streakUsed[si] = false }) // [T155 R6] re-arm walks the EQUIPPED slots (loadout-mapped; the modes.js loop verbatim)
  }
  // T1-1 (SS22.2): KC tag drop at the victim's position, victim's team tag
  if (room.match.mode === 'kc' && room.match.state === 'live') {
    const mk = CFG.MODES.kc
    room.tags.push({ x: +victim.st.pos.x.toFixed(2), z: +victim.st.pos.z.toFixed(2), tm: victim.team, t: mk.tagTtl, byKiller: attacker && attacker !== victim ? attacker.id : null })
    while (room.tags.length > mk.tagCap) room.tags.shift()
  }
  // T89 L2: Infected conversion — the dead join the horde (COD Infected law; horde deaths respawn normally)
  if (room.match.mode === 'inf' && room.match.state === 'live' && room.match.inf && room.match.inf.started && victim.team === 0) {
    victim.team = 1; victim.infT = true
    roomChain(room, 'match', { ev: 'mode', st: 'infected', why: victim.name + ' WAS INFECTED' })
  }
  // T89 L3: Control attrition — every death burns a life (the only decrement site; 0 lives = sit out the round)
  if (room.match.mode === 'ctl' && room.match.state === 'live' && typeof victim.ctlLives === 'number') {
    victim.ctlLives = Math.max(0, victim.ctlLives - 1)
    if (victim.ctlLives > 0) roomChain(room, 'match', { ev: 'mode', st: 'life', why: victim.name + ' DOWN — ' + victim.ctlLives + ' LIVES' })
  }
  // [T171] BR: the dead leave loot — ammo 70% + armor 25% at the corpse (the modes.js brDeathDrop mirror); the delta rides the match chain
  if (room.match.mode === 'br' && room.match.state === 'live' && room.loot) {
    const BRC = (CFG.MODES as any).br
    const dropIt = (k: string) => {
      const it = { id: 'L' + (++room.lootSeq), k, w: undefined as any, x: +(victim.st.pos.x + (Math.random() - 0.5) * 1.6).toFixed(2), z: +(victim.st.pos.z + (Math.random() - 0.5) * 1.6).toFixed(2), taken: false }
      room.loot.push(it)
      roomChain(room, 'match', { ev: 'lootNew', it: { id: it.id, k: it.k, w: it.w, x: it.x, z: it.z } })
    }
    if (Math.random() < BRC.deathDropCr) dropIt('ammo')
    if (Math.random() < BRC.deathDropArm) dropIt('arm')
  }
  roomChain(room, 'kill', { k: kid, kn, v: victim.id, vn: victim.name, w: weaponName, h: !!head })
}

// --- T2-9/T2-10 area damage (modes.js:169-186 verbatim structure) ---
function applyAreaDamage(room, pos, radius, maxDmg, owner, label) {
  for (const v of room.players) {
    if (!v.alive || !v.joined) continue
    const h = heightOf(v.st.crouch)
    const c = { x: v.st.pos.x, y: v.st.pos.y + h * 0.5, z: v.st.pos.z } // centerPos (modes.js:173)
    const d = Math.hypot(c.x - pos.x, c.y - pos.y, c.z - pos.z)
    if (d > radius) continue
    let dmg = maxDmg * (1 - d / radius) // modes.js:177 verbatim
    if (segmentBlockedSrv(room.WORLD.colliders, { x: pos.x, y: 0.5, z: pos.z }, c)) dmg *= 0.35 // LoS cover [COD class] modes.js:178-179
    if (dmg < 1) continue
    applyDamage(room, v, dmg, owner, false, label, { x: c.x, z: c.z })
  }
}
function detonateNade(room, nd) {
  if (nd.kind === 'flash') return detonateFlash(room, nd) // Task 35: flash has its own resolution (no damage)
  roomChain(room, 'boom', { x: +nd.x.toFixed(2), y: +nd.y.toFixed(2), z: +nd.z.toFixed(2), r: FRAG.radius })
  applyAreaDamage(room, { x: nd.x, y: nd.y, z: nd.z }, FRAG.radius, FRAG.dmg, nd.owner, 'FRAG')
}
// --- Task 35: flashbang detonation — main.js doFlash player branch VERBATIM
// (server holds yaw/pitch truth, so facing is computed server-side; the ADS
// view offset is ignored exactly like the T2-10 airstrike precedent). The
// zero-distance normalize case mirrors three.js normalize() -> zero vector
// -> dot 0 (offline cook-off flash blinds at the 0.45 partial branch).
function detonateFlash(room, nd) {
  const v = []
  for (const p of room.players) {
    if (!p.alive || !p.joined) continue
    const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch
    const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z }
    const d = Math.hypot(eye.x - nd.x, eye.y - nd.y, eye.z - nd.z)
    if (d >= FLASH_RANGE) continue
    let tx = nd.x - eye.x, ty = nd.y - eye.y, tz = nd.z - eye.z
    const tl = Math.hypot(tx, ty, tz)
    const fwd = fwdFull(p.st.yaw, p.st.pitch)
    const facing = tl < 1e-9 ? 0 : (tx / tl) * fwd.x + (ty / tl) * fwd.y + (tz / tl) * fwd.z
    if (facing <= -0.2) continue
    if (segmentBlockedSrv(room.WORLD.colliders, { x: nd.x, y: nd.y + 0.1, z: nd.z }, eye)) continue // doFlash LoS gate verbatim
    const str = Math.max(0, Math.min(1, (1 - d / FLASH_RANGE) * (facing > 0.4 ? 1 : 0.45)))
    if (str > 0.001) v.push([p.id, +str.toFixed(3)])
  }
  roomChain(room, 'flash', { x: +nd.x.toFixed(2), y: +nd.y.toFixed(2), z: +nd.z.toFixed(2), v })
}

// --- DOM (modes.js:129-166 mirrored server-side) ---
function domUpdate(room, dt) {
  const m = CFG.MODES.dom
  const players = [...room.players]
  for (const f of room.flags) {
    const inR = (p) => p.alive && Math.hypot(p.st.pos.x - f.x, p.st.pos.z - f.z) < 3.6 && p.st.pos.y < 3
    const t0 = players.filter(p => p.team === 0 && inR(p))
    const t1 = players.filter(p => p.team === 1 && inR(p))
    if (t0.length && !t1.length) {
      if (f.owner !== 0) {
        const speed = m.captureTime / (1 + m.extraCapper * (t0.length - 1))
        f.prog += dt / speed
        if (f.prog >= 1) {
          f.owner = 0; f.prog = 0
          for (const c of t0) c.score += CFG.XP.capture
          roomChain(room, 'match', { ev: 'flag', id: f.id, owner: 0 })
        }
      } else f.prog = 0
    } else if (t1.length && !t0.length) {
      if (f.owner !== 1) {
        const speed = m.captureTime / (1 + m.extraCapper * (t1.length - 1))
        f.prog += dt / speed
        if (f.prog >= 1) {
          f.owner = 1; f.prog = 0
          for (const c of t1) c.score += CFG.XP.capture
          roomChain(room, 'match', { ev: 'flag', id: f.id, owner: 1 })
        }
      } else f.prog = 0
    }
    // both present → contest freeze (no branch — modes.js mirror)
  }
  room.match.domT -= dt
  if (room.match.domT <= 0) {
    room.match.domT = m.tickSec
    for (const f of room.flags) if (f.owner === 0) room.match.domS[0]++
    for (const f of room.flags) if (f.owner === 1) room.match.domS[1]++
  }
}

// --- T1-1: HARDPOINT (SS22.1) — DOM math reused, single active hill (room.hill) ---
function hpUpdate(room, dt) {
  const m = CFG.MODES.hp
  const hill = room.hill
  const players = [...room.players]
  if (hill.idx === -1) { // lead-in: first hill 20s into live [e_11]
    hill.t -= dt
    if (hill.t <= 0) { hill.idx = 0; hill.owner = -1; hill.prog = 0; hill.t = HTIME || m.hillTime; hill.tickT = 0; roomChain(room, 'match', { ev: 'hill', id: 'A', idx: 0 }) }
    return
  }
  hill.t -= dt
  if (hill.t <= 0) { // rotate [e_11: every 60s]
    hill.idx = (hill.idx + 1) % room.HILLS.length
    hill.owner = -1; hill.prog = 0; hill.t = HTIME || m.hillTime; hill.tickT = 0
    roomChain(room, 'match', { ev: 'hill', id: room.HILLS[hill.idx].id, idx: hill.idx })
  }
  const site = room.HILLS[hill.idx]
  const inR = (p) => p.alive && Math.hypot(p.st.pos.x - site.x, p.st.pos.z - site.z) < 3.6 && p.st.pos.y < 3 // DOM inR parity
  const t0 = players.filter(p => p.team === 0 && inR(p))
  const t1 = players.filter(p => p.team === 1 && inR(p))
  if (t0.length && !t1.length) {
    if (hill.owner !== 0) {
      const speed = m.captureTime / (1 + m.extraCapper * (t0.length - 1)) // DOM divisor verbatim
      hill.prog += dt / speed
      if (hill.prog >= 1) { hill.owner = 0; hill.prog = 0; for (const c of t0) c.score += CFG.XP.capture; roomChain(room, 'match', { ev: 'flag', id: site.id, owner: 0 }) }
    } else {
      hill.tickT -= dt
      if (hill.tickT <= 0) { hill.tickT = m.tickSec; room.match.objS[0]++ } // 1 pt/s secured [e_11]
    }
  } else if (t1.length && !t0.length) {
    if (hill.owner !== 1) {
      const speed = m.captureTime / (1 + m.extraCapper * (t1.length - 1))
      hill.prog += dt / speed
      if (hill.prog >= 1) { hill.owner = 1; hill.prog = 0; for (const c of t1) c.score += CFG.XP.capture; roomChain(room, 'match', { ev: 'flag', id: site.id, owner: 1 }) }
    } else {
      hill.tickT -= dt
      if (hill.tickT <= 0) { hill.tickT = m.tickSec; room.match.objS[1]++ }
    }
  }
  // both present -> contest freeze (capture AND scoring paused) — DOM mirror
}

// --- T1-1: KILL CONFIRMED (SS22.2) — presence pickup, confirm/deny [e_12] ---
function kcUpdate(room, dt) {
  const mk = CFG.MODES.kc
  for (let i = room.tags.length - 1; i >= 0; i--) {
    const tg = room.tags[i]
    tg.t -= dt
    if (tg.t <= 0) { room.tags.splice(i, 1); continue } // TTL despawn (SPEC DECISION 12s)
    for (const p of room.players) {
      if (!p.alive || !p.joined) continue
      if (Math.hypot(p.st.pos.x - tg.x, p.st.pos.z - tg.z) < mk.tagRadius) {
        room.tags.splice(i, 1)
        if (p.team !== tg.tm) { // CONFIRM: enemy tag -> team point + collector XP; killer +25 if different [e_12]
          room.match.objS[p.team]++
          p.score += CFG.XP.confirm
          if (tg.byKiller && tg.byKiller !== p.id) {
            const k = [...room.players].find(q => q.id === tg.byKiller)
            if (k) k.score += CFG.XP.deny // the 25-point confirm assist [CoD Wiki]
          }
        } else p.score += CFG.XP.deny // DENY: own tag, no team point [e_12]
        break
      }
    }
  }
}

// --- T1-1: SEARCH & DESTROY (SS22.3) — round machine, presence plant/defuse ---
const SND_SITE = (room) => room.SITES // per-room sites (§51.2; A/B from the map JSON)
function sndRoundSpawn(room) {
  const s = room.match.snd
  // server-owned round teleport: everyone to their team pool, re-armed (no-respawn rounds start fresh)
  for (const p of room.players) {
    if (!p.joined) continue
    const pos = pickSpawn(room, p.team, p)
    p.st = makeState(pos)
    p.hp = H.maxHP; p.shield = 0; p.alive = true; p.spawnProt = H.spawnProtTime
    p.lastDmgT = Date.now(); p.hist.length = 0
    p.q.length = 0; p.lastIn = null
    if (p.__chain) p.__chain('match', { ev: 'round', r: s.r, side: s.side, spawn: [+p.st.pos.x.toFixed(3), +p.st.pos.y.toFixed(3), +p.st.pos.z.toFixed(3)] })
  }
}
function sndStart(room) {
  room.match.snd = { r: 1, side: 0, ph: 'pre', preT: CFG.MODES.snd.preRound, rt: 0, bt: -1, pp: 0, dp: 0, siteIdx: 0, bx: null, bz: null, swapped: false }
  sndRoundSpawn(room)
}

// --- T89 L1/L2/L3: mode-trio server machines (client modes.js mirrors; ev:'mode' chains ride
// the additive event law — old clients fall through the else-if chain untouched) ---
function trioRoundSpawn(room) { // sndRoundSpawn verbatim shape — server-owned round re-arm + teleport
  for (const p of room.players) {
    if (!p.joined) continue
    const pos = pickSpawn(room, p.team, p)
    p.st = makeState(pos)
    p.hp = H.maxHP; p.shield = 0; p.alive = true; p.spawnProt = H.spawnProtTime
    p.lastDmgT = Date.now(); p.hist.length = 0
    p.q.length = 0; p.lastIn = null
    if (p.__chain) p.__chain('match', { ev: 'round', spawn: [+p.st.pos.x.toFixed(3), +p.st.pos.y.toFixed(3), +p.st.pos.z.toFixed(3)] })
  }
}
function gfRoundStart(room) {
  const g = room.match.gf, cm = CFG.MODES.gf
  g.kit = CFG.GF_KITS[(g.r - 1) % CFG.GF_KITS.length] // deterministic per round (r is the seed — client mirrors the same pick)
  roomChain(room, 'match', { ev: 'gfkit', kit: g.kit, r: g.r }) // L1 wire law: kit rides the chain (client temp-loadout apply — the giveKit leak fix)
  trioRoundSpawn(room)
}
function gfUpdate(room, dt) {
  const g = room.match.gf, cm = CFG.MODES.gf
  if (!g) return
  if (g.ph === 'pre') {
    g.preT -= dt
    if (g.preT <= 0) { g.ph = 'live'; g.rt = cm.roundTime; roomChain(room, 'match', { ev: 'mode', st: 'live', why: 'GUNFIGHT — 40s' }) }
    return
  }
  if (g.ph === 'inter') {
    g.preT -= dt
    if (g.preT <= 0) {
      if (g.r === cm.swapAfter && !g.swapped) { g.swapped = true; g.side = 1 - g.side }
      const lim = RLIMIT || cm.roundLimit
      if (room.match.objS[0] >= lim || room.match.objS[1] >= lim) { matchFinish(room, 'limit'); return }
      g.r++; gfRoundStart(room); g.ph = 'pre'; g.preT = cm.preRound
    }
    return
  }
  // live round: expiry -> most-alive wins; tie -> team 1 (client parity verbatim)
  g.rt -= dt
  const ps = [...room.players].filter(p => p.joined)
  if (g.rt <= 0) {
    const a0 = ps.filter(p => p.alive && p.team === 0).length, a1 = ps.filter(p => p.alive && p.team === 1).length
    room.match.objS[a0 > a1 ? 0 : 1]++
    roomChain(room, 'match', { ev: 'mode', st: 'round', why: 'TIME — MOST ALIVE' })
    g.ph = 'inter'; g.preT = cm.intermission
    return
  }
  if (!ps.some(p => p.alive && p.team === 0)) { room.match.objS[1]++; roomChain(room, 'match', { ev: 'mode', st: 'round', why: 'SQUAD ELIMINATED' }); g.ph = 'inter'; g.preT = cm.intermission; return }
  if (!ps.some(p => p.alive && p.team === 1)) { room.match.objS[0]++; roomChain(room, 'match', { ev: 'mode', st: 'round', why: 'SQUAD ELIMINATED' }); g.ph = 'inter'; g.preT = cm.intermission; return }
}
function infUpdate(room, dt) {
  const inf = room.match.inf, cm = CFG.MODES.inf
  if (!inf) return
  if (!inf.started) {
    inf.first -= dt // 15s Patient-Zero countdown (snapshot law: first ticking, not started)
    if (inf.first <= 0) {
      inf.started = true
      const ps = [...room.players].filter(p => p.joined)
      const pz = ps[Math.floor(Math.random() * ps.length)] // alive0 = 1 (snapshot law)
      if (pz) { pz.team = 1; pz.infT = true; inf.pz = pz.id }
      roomChain(room, 'match', { ev: 'mode', st: 'pz', why: (pz ? pz.name : 'A COMBATANT') + ' IS PATIENT ZERO' })
    }
    return
  }
  // live horde phase: the global clock owns the survive win (finish 'time' -> survivors; all-converted check rides matchUpdate)
}
function ctlRoundStart(room) {
  const c = room.match.ctl, cm = CFG.MODES.ctl
  c.caps = 0; c.extraUsed = false; c.sites = [0, 1]
  room.SITES.forEach(s => { s.ctlProg = 0; s.ctlDone = false }) // zone latches fresh per round (client parity)
  for (const p of room.players) p.ctlLives = cm.lives // 12 lives per player, fresh per round
  trioRoundSpawn(room)
}
function ctlUpdate(room, dt) {
  const c = room.match.ctl, cm = CFG.MODES.ctl
  if (!c) return
  if (c.ph === 'pre') {
    c.preT -= dt
    if (c.preT <= 0) { c.ph = 'live'; c.rt = cm.roundTime; roomChain(room, 'match', { ev: 'mode', st: 'live', why: c.side === 0 ? 'CAPTURE A + B' : 'DEFEND A + B' }) }
    return
  }
  if (c.ph === 'inter') {
    c.preT -= dt
    if (c.preT <= 0) {
      if (c.r === cm.roundLimit - 1 && !c.swapped) { c.swapped = true; c.side = 1 - c.side } // swap-every-round law (2-round match = swap at half)
      const lim = RLIMIT || cm.roundLimit
      if (room.match.objS[0] >= lim || room.match.objS[1] >= lim) { matchFinish(room, 'limit'); return }
      c.r++; ctlRoundStart(room); c.ph = 'pre'; c.preT = cm.preRound
    }
    return
  }
  // live round — capture-all law (attackers = c.side, DOM inR parity; +60s per capture; extraUsed per-round audit)
  const ps = [...room.players].filter(p => p.joined)
  let capsNow = 0
  for (const si of c.sites) {
    const site = room.SITES[si % room.SITES.length]
    const contest = (t) => ps.filter(p => p.alive && p.team === t && Math.hypot(p.st.pos.x - site.x, p.st.pos.z - site.z) < cm.capRadius && p.st.pos.y < 3).length
    if (c.side === 0) {
      if (contest(0) > 0 && contest(1) === 0) {
        const speed = cm.captureTime / (1 + cm.extraCapper * (contest(0) - 1)) // extraCapper = DOM verbatim
        site.ctlProg = (site.ctlProg || 0) + dt / speed
        if (site.ctlProg >= 1) {
          site.ctlProg = 0; site.ctlDone = true; c.caps++
          c.rt += cm.captureBonus // +60s per capture (78-a); extraUsed keeps the law auditable
          c.extraUsed = true
          roomChain(room, 'match', { ev: 'mode', st: 'cap', why: 'ZONE ' + site.id + ' CAPTURED +' + cm.captureBonus + 's' })
        }
      } else site.ctlProg = Math.max(0, (site.ctlProg || 0) - dt * 0.5)
    } else site.ctlDone = false // defenders' round: zones held
    if (site.ctlDone) capsNow++
  }
  if (capsNow >= c.sites.length) { room.match.objS[c.side]++; roomChain(room, 'match', { ev: 'mode', st: 'round', why: 'ALL ZONES CAPTURED' }); c.ph = 'inter'; c.preT = cm.intermission; return }
  c.rt -= dt
  if (c.rt <= 0) { room.match.objS[1 - c.side]++; roomChain(room, 'match', { ev: 'mode', st: 'round', why: 'TIME — ZONES HELD' }); c.ph = 'inter'; c.preT = cm.intermission; return }
  // attrition: attackers out of lives AND no one alive (0 lives = sit out the round)
  const atk = ps.filter(p => p.team === c.side)
  const atkAlive = atk.some(p => p.alive)
  const atkLives = atk.reduce((s, p) => s + Math.max(0, (p.ctlLives ?? cm.lives) - (p.alive ? 0 : 1)), 0)
  if (!atkAlive && atkLives <= 0) { room.match.objS[1 - c.side]++; roomChain(room, 'match', { ev: 'mode', st: 'round', why: 'ATTACKERS OUT OF LIVES' }); c.ph = 'inter'; c.preT = cm.intermission; return }
}
function sndRoundEnd(room, winnerTeam, why) {
  const s = room.match.snd, m = CFG.MODES.snd
  s.ph = 'inter'; s.preT = m.intermission
  room.match.objS[winnerTeam]++
  roomChain(room, 'match', { ev: 'bomb', st: why === 'TARGET DESTROYED' ? 'boom' : why === 'BOMB DEFUSED' ? 'defused' : 'round', why })
}
function sndUpdate(room, dt) {
  const s = room.match.snd, m = CFG.MODES.snd
  if (!s) return
  if (s.ph === 'pre') {
    s.preT -= dt
    if (s.preT <= 0) { s.ph = 'live'; s.rt = RTIME || m.roundTime; roomChain(room, 'match', { ev: 'bomb', st: 'round', why: 'live' }) }
    return
  }
  if (s.ph === 'inter') {
    s.preT -= dt
    if (s.preT <= 0) {
      if (s.r >= m.swapAfter && !s.swapped) { s.swapped = true; s.side = 1 - s.side } // swap after 5 rounds [e_13]
      const lim = RLIMIT || m.roundLimit
      if (room.match.objS[0] >= lim || room.match.objS[1] >= lim) { matchFinish(room, 'limit'); return }
      s.r++; s.siteIdx = (s.r - 1) % 2; s.bt = -1; s.pp = 0; s.dp = 0; s.bx = null; s.bz = null
      sndRoundSpawn(room) // re-arms + per-player 'round' event with spawn
      s.ph = 'pre'; s.preT = m.preRound
    }
    return
  }
  // live round
  const atk = s.side
  const site = SND_SITE(room)[s.siteIdx % room.SITES.length]
  const players = [...room.players].filter(p => p.joined)
  if (s.bt < 0) {
    // plant: attacker presence in site (DOM inR parity 3.6m, y<3) [e_13: 5s]
    const planters = players.filter(p => p.alive && p.team === atk && Math.hypot(p.st.pos.x - site.x, p.st.pos.z - site.z) < 3.6 && p.st.pos.y < 3)
    if (planters.length) {
      s.pp += dt / (PTIME || m.plantTime)
      if (s.pp >= 1) {
        s.bt = BTIME || m.bombTime // [e_13: 45s BO6; AW 40s conflict logged]
        s.bx = site.x; s.bz = site.z; s.pp = 0
        planters[0].score += CFG.XP.plant
        roomChain(room, 'match', { ev: 'bomb', st: 'planted', why: 'site ' + site.id })
      }
    } else s.pp = Math.max(0, s.pp - dt * 0.5)
    s.rt -= dt
    if (s.rt <= 0) { sndRoundEnd(room, 1 - atk, 'TIME — SITES HELD'); return } // no plant at expiry -> defenders [e_13]
  } else {
    // bomb armed: bomb clock supersedes the round clock
    s.bt -= dt
    const defusers = players.filter(p => p.alive && p.team !== atk && Math.hypot(p.st.pos.x - s.bx, p.st.pos.z - s.bz) < 3.6)
    if (defusers.length) {
      s.dp += dt / (DTIME || m.defuseTime) // [e_13: 7.5s]
      if (s.dp >= 1) {
        defusers[0].score += CFG.XP.defuse
        sndRoundEnd(room, 1 - atk, 'BOMB DEFUSED')
        return
      }
    } else s.dp = Math.max(0, s.dp - dt * 0.5)
    if (s.bt <= 0) {
      applyAreaDamage(room, { x: s.bx, y: 0.5, z: s.bz }, SND_BOMB.radius, SND_BOMB.dmg, null, 'BOMB') // SPEC DECISION 250r12
      sndRoundEnd(room, atk, 'TARGET DESTROYED')
      return
    }
  }
  // elimination checks (dead sit out — respawn gated at the socket)
  const atkAlive = players.some(p => p.alive && p.team === atk)
  const defAlive = players.some(p => p.alive && p.team !== atk)
  if (!defAlive) { sndRoundEnd(room, atk, 'DEFENDERS ELIMINATED'); return }
  if (!atkAlive && s.bt < 0) { sndRoundEnd(room, 1 - atk, 'ATTACKERS ELIMINATED'); return }
  // planted + attackers dead -> defenders must still defuse [e_13 esports rule]
}

// --- match lifecycle (§12 MP-3) ---
// --- [T171] BATTLE ROYALE server machine (modes.js mirror — MP combat stays server-owned) ---
function brPick(room) { // next closure target inside the current circle (modes.js brPick mirror)
  const br = room.match.br, next = (CFG.MODES as any).br.gas.phases[br.ph]
  const marg = Math.max(0, (br.r - next.r) * 0.6)
  const a = Math.random() * Math.PI * 2, d = Math.random() * marg
  br.tx = br.cx + Math.cos(a) * d; br.tz = br.cz + Math.sin(a) * d; br.tr = next.r; br.dps = next.dps
}
function brUpdate(room, dt) { // wait→shrink phases + the gas DoT (flat dps outside the wall, 0.5 s ticks)
  const m = room.match, br = m.br
  if (!br) return
  const PHS = (CFG.MODES as any).br.gas.phases
  br.t -= dt
  if (br.st === 'wait') {
    if (br.t <= 0) { br.st = 'shrink'; br.t = PHS[br.ph].shrink; br.sr = br.r; br.scx = br.cx; br.scz = br.cz; roomChain(room, 'match', { ev: 'mode', st: 'gas', why: 'THE GAS CLOSES — ZONE ' + (br.ph + 1) }) }
  } else {
    const k = 1 - Math.max(0, br.t) / PHS[br.ph].shrink
    br.r = br.sr + (br.tr - br.sr) * k; br.cx = br.scx + (br.tx - br.scx) * k; br.cz = br.scz + (br.tz - br.scz) * k
    if (br.t <= 0) { br.r = br.tr; br.cx = br.tx; br.cz = br.tz; if (br.ph < PHS.length - 1) { br.ph++; br.st = 'wait'; br.t = PHS[br.ph].wait; brPick(room) } else br.t = 0 }
  }
  br.acc += dt
  if (br.acc >= 0.5) {
    const tick = br.acc; br.acc = 0
    for (const p of room.players) {
      if (!p.joined || !p.alive) continue
      if (Math.hypot(p.st.pos.x - br.cx, p.st.pos.z - br.cz) <= br.r) continue
      applyDamage(room, p, br.dps * tick, null, false, 'GAS', { x: p.st.pos.x, z: p.st.pos.z })
    }
  }
}
function brLoot(room) { // the ground-loot manifest — nav-node scatter, 18 m spacing (modes.js brStart mirror; kinds: wpn 42% / arm 20% / ammo 20% / hp 18%)
  const br = (CFG.MODES as any).br, nodes = (room.NAV && room.NAV.nodes) || []
  const loot: any[] = []
  if (!nodes.length) return loot
  const idx = nodes.map((_: any, i: number) => i)
  for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t }
  const pts: any[] = []
  const scatter = (minGap: number) => {
    for (const ni of idx) {
      if (loot.length >= br.lootN) break
      const n = nodes[ni]
      const x = n[0], z = n[1]
      if (pts.some((q: any) => Math.hypot(q.x - x, q.z - z) < minGap)) continue
      pts.push({ x, z })
      const roll = Math.random()
      const k = roll < 0.42 ? 'wpn' : roll < 0.62 ? 'arm' : roll < 0.82 ? 'ammo' : 'hp'
      loot.push({ id: 'L' + (++room.lootSeq), k, w: k === 'wpn' ? BR_LOOT[(Math.random() * BR_LOOT.length) | 0] : undefined, x: +(x + (Math.random() - 0.5) * 2).toFixed(2), z: +(z + (Math.random() - 0.5) * 2).toFixed(2), taken: false })
    }
  }
  scatter(9) // pass 1: 9 m spacing (the modes.js brStart mirror)
  scatter(2.5) // pass 2: top-up without spacing — clustered nav still fills the quota
  return loot
}

function matchStart(room, mode, by) {
  if (!CFG.MODES[mode]) return false
  const m = room.match
  m.mode = mode; m.state = 'countdown'; m.cd = 3.0
  m.tLeft = (room.knobs.tl || CFG.MODES[mode].time) || 0 // §52.4: host time-limit knob (0 = mode default)
  m.teamS = [0, 0]; m.domS = [0, 0]; m.domT = 0; m.winner = null; m.draw = false; m.reason = ''
  // T1-1 resets (SS22)
  m.objS = [0, 0]; m.snd = null; m.ggt = (GGLAD || GG_LADDER.length) + 1
  // T89 L1/L2/L3: trio machine resets — STALE-MACHINE LAW (pre-rewind live-probe defect: matchStart must clear every mode machine or the stale one rides the snapshot)
  m.gf = null; m.inf = null; m.ctl = null
  room.hill = { idx: -1, owner: -1, prog: 0, t: HLEAD || CFG.MODES.hp.leadIn, tickT: 0 } // lead-in 20s into live [e_11; IRON_HLEAD probe override]
  room.tags = []
  for (const f of room.flags) { f.owner = -1; f.prog = 0 }
  // T2-9/T2-10: world dynamism reset (server-owned)
  room.uavT = 0; room.strikes = []; room.bombs = []; room.crates = []; room.nades = []
  const ps = [...room.players].sort((a, b) => a.joinOrder - b.joinOrder)
  ps.forEach((p, i) => {
    p.kills = 0; p.deaths = 0; p.score = 0; p.streak = 0; p.lastKillerId = null
    p.streakUsed = [false, false, false]; p.healT = 0; p.nadeLive = 0; p.nadeTimes = []
    p.abCd = 0; p.abCh = p.abChMax // modes.js:43 abilityCharges reset verbatim
    p.gg = 0 // T1-1: gun game tier reset (SS22.4)
    p.ctlLives = null // T89 L3: lives reset per round by ctlRoundStart (null = not a ctl match)
    p.infT = false // T89 L2: conversion bookkeeping
    if (mode === 'inf') p.team = 0 // T89 L2: Infected boots ALL-survivor (snapshot law alive0 — PZ converts at first:15)
    else if (TEAM_MODES.has(mode)) {
      p.team = i % 2 === 0 ? 0 : 1 // balanced by join order (count-based parity)
    }
  })
  if (mode === 'snd') sndStart(room) // SS22.3: round machine boot + round-1 spawn during countdown
  if (mode === 'gf') { m.gf = { r: 1, side: 0, ph: 'pre', preT: CFG.MODES.gf.preRound, rt: 0, kit: null, swapped: false }; gfRoundStart(room) } // T89 L1
  if (mode === 'inf') { m.inf = { started: false, first: CFG.MODES.inf.first, pz: null } } // T89 L2: snapshot truth inf:{started:false, first:15, alive0:1}
  if (mode === 'ctl') { m.ctl = { r: 1, side: 0, ph: 'pre', preT: CFG.MODES.ctl.preRound, rt: 0, caps: 0, extraUsed: false, sites: [0, 1] }; ctlRoundStart(room) } // T89 L3: attackers = team 0, two zones
  if (mode === 'br') { // [T171] BATTLE ROYALE boot — the gas machine + the ground-loot manifest + air-drop spawns
    const G = (CFG.MODES as any).br.gas
    m.br = { ph: 0, st: 'wait', t: G.phases[0].wait, cx: 0, cz: 0, r: G.r0, tx: 0, tz: 0, tr: G.phases[0].r, dps: G.phases[0].dps, acc: 0, sr: 0, scx: 0, scz: 0 }
    brPick(room)
    room.loot = brLoot(room)
    roomChain(room, 'match', { ev: 'brLoot', loot: room.loot.map(it => ({ id: it.id, k: it.k, w: it.w, x: it.x, z: it.z })) })
    ps.forEach((p) => { if (p.joined) { p.st.pos.y = (CFG.MODES as any).br.drop; p.dropT = 25; p.shield = 0 } }) // air-drop: 115 m up, glide-capped below, fall guard armed until landing
  }
  roomChain(room, 'match', { ev: 'start', md: mode, by: by ? by.name : null })
  broadcastRoster(room) // teams may have re-balanced
  return true
}
function matchFinish(room, reason) {
  const m = room.match
  m.state = 'ended'; m.reason = reason; m.endT = 6.0
  const ps = [...room.players]
  if (m.mode === 'ffa') {
    const sorted = ps.slice().sort((a, b) => b.kills - a.kills)
    m.winner = sorted[0] ? sorted[0].id : null
    m.draw = sorted.length > 1 && sorted[0].kills === sorted[1].kills
  } else if (m.mode === 'tdm') {
    m.winner = m.teamS[0] > m.teamS[1] ? 'TEAM-A' : m.teamS[1] > m.teamS[0] ? 'TEAM-B' : null
    m.draw = m.teamS[0] === m.teamS[1]
  } else if (m.mode === 'dom') {
    m.winner = m.domS[0] > m.domS[1] ? 'TEAM-A' : m.domS[1] > m.domS[0] ? 'TEAM-B' : null
    m.draw = m.domS[0] === m.domS[1]
  }
  // T1-1 finish (SS22)
  else if (m.mode === 'hp' || m.mode === 'kc' || m.mode === 'snd' || m.mode === 'gf' || m.mode === 'ctl') { // T89 L1/L3: round-scored trio joins objS
    m.winner = m.objS[0] > m.objS[1] ? 'TEAM-A' : m.objS[1] > m.objS[0] ? 'TEAM-B' : null
    m.draw = m.objS[0] === m.objS[1]
  } else if (m.mode === 'inf') { // T89 L2: clock expiry = survivors win; all-converted = horde wins
    const survivors = ps.some(p => p.joined && p.alive && p.team === 0)
    m.winner = survivors ? 'TEAM-A' : 'TEAM-B'; m.draw = false
  } else if (m.mode === 'br') { // [T171] LAST-ALIVE law — the survivor takes it (time expiry resolves the same way)
    const alive = ps.filter(p => p.alive)
    m.winner = alive.length === 1 ? alive[0].id : null
    m.draw = false
  } else if (m.mode === 'gg') {
    const sorted = ps.slice().sort((a, b) => (b.gg || 0) - (a.gg || 0))
    m.winner = sorted[0] ? sorted[0].id : null
    m.draw = false
  } else m.winner = null
  const board = ps.map(p => ({ id: p.id, n: p.name, k: p.kills, de: p.deaths, s: p.score, team: p.team }))
    .sort((a, b) => b.k - a.k)
  roomChain(room, 'match', { ev: 'end', md: m.mode, reason, winner: m.winner, draw: m.draw, board })
  // T44 §28.2: XP law — awards computed ONLY from this board + winner, server-side.
  // Team modes: winner 'TEAM-A'=team 0 / 'TEAM-B'=team 1; FFA/GG: winner = player id.
  // Per-player `career` rides each player's OWN socket chain (private data, §28.3).
  const ranked = !room.priv && RANKED_MODES.includes(m.mode) && ps.length >= RANKED_MIN_PLAYERS // T46 §30.1: predicate ONCE, before the loop (priv gate → mode gate → min gate)
  for (const p of ps) {
    if (!p.pid) continue // §28.1: anonymous session-only player — no profile, no XP
    const wonTeam = m.winner === (p.team === 0 ? 'TEAM-A' : 'TEAM-B')
    const res = m.draw ? 'draw' : (m.winner == null ? 'loss' : (m.winner === p.id || wonTeam) ? 'win' : 'loss')
    const gained = (res === 'win' ? XP_AWARD.win : res === 'draw' ? XP_AWARD.draw : XP_AWARD.loss)
      + p.kills * XP_AWARD.kill + (p.score || 0) * XP_AWARD.perScore
    const rec = careerRec(p.pid, p.name)
    const lvlBefore = rec.lvl
    rec.k += p.kills; rec.d += p.deaths; rec.m += 1; if (res === 'win') rec.w += 1
    rec.xp += gained; rec.lvl = lvlFromXp(rec.xp)
    rec.n = p.name; rec.last = Date.now()
    if ((rec.bs || 0) < (p.streak || 0)) rec.bs = p.streak || 0 // §53.2: bestStreak server-truth (funds stat-unlocks)
    const eco = ecoRec(rec)
    const crG = crDelta(p.kills, res === 'win') // §53.2: CR earned FREE by playing (Krunker structure)
    eco.cr += crG
    // T89 L6: BP XP award mirror — season-keyed reset law (stale season key resets XP, the
    // destroyed v1.48 bpState law verbatim). SAME BP_AWARD single truth as the client.
    const bp = bpRec(rec) // T102 (v1.67): the T94 carry law joins the server ledger — migrateBp canonicalizes (stale season kills prem+claims server-side, the client-identical reset); BP_AWARD stays the SAME single truth as the client
    const bpGain = BP_AWARD.match + (res === 'win' ? BP_AWARD.win : 0)
    bp.x += bpGain
    // T103 (v1.68): the meta-EARN half — the challenge window accumulates SERVER-side (the v1.55
    // split's earn leg closes; the client recordHistoryAndDaily idiom verbatim). es.xp rides the
    // SAME bpGain single truth; headshots fold via the T90 accumulated-window law (the raw
    // counter resets after the window add — the 90-e audit defect was the lifetime assignment).
    const es = evsRec(rec).stats
    es.kills += p.kills || 0; es.wins += res === 'win' ? 1 : 0; es.matches += 1; es.xp += bpGain
    es.headshots += p.hs || 0; p.hs = 0
    CAREER_DIRTY = true
    const t = rec.tally[m.mode] || (rec.tally[m.mode] = { m: 0, w: 0 })
    t.m += 1; if (res === 'win') t.w += 1
    CAREER_DIRTY = true
    p.__chain('career', { gained, total: rec.xp, lvl: rec.lvl, up: rec.lvl > lvlBefore, m: rec.m, k: rec.k, d: rec.d, w: rec.w, crG, cr: eco.cr })
    if (ranked) { // T46 §30.2/§30.4: ranked award — lazy season rollover BEFORE the delta; RP floor 0 (§30.2)
      const cur = seasonOf(Date.now()).id
      if (!rec.rk || rec.rk.s !== cur) {
        // T89 L6: season-rollover CREDIT — peak tier REACHED pays CR once, BEFORE the soft reset
        if (rec.rk && rec.rk.pk) {
          const peak = tierOf(rec.rk.pk)
          if (RANK_REWARDS[peak]) { eco.cr += RANK_REWARDS[peak]; p.__chain('ranked', { delta: 0, rp: rec.rk.rp, tier: peak, up: false, s: rec.rk.s, pk: rec.rk.pk, m: rec.rk.m, w: rec.rk.w, rw: RANK_REWARDS[peak] }) }
        }
        rec.rk = { s: cur, rp: rec.rk ? softReset(rec.rk.rp) : 0, pk: rec.rk ? rec.rk.pk : 0, m: 0, w: 0 } // §30.5 lazy creation + §30.4 rollover-then-award
      }
      const tierBefore = tierOf(rec.rk.rp) // §30.5: up = change caused by THIS match (computed after rollover, before delta)
      // [T161 R12/R17] THE PLACEMENTS LAW — the season's first RANKED_PLACEMENTS matches ride
      // ×2 RP volatility (the CS2/MW placement grammar): uncertain skill resolves fast, then
      // the standard ladder applies. The count is rec.rk.m (BEFORE the +=1 below) — server
      // truth, no client trust.
      const delta = (rec.rk.m < RANKED_PLACEMENTS ? 2 : 1) * rpDelta(res, p.kills)
      rec.rk.rp = Math.max(0, rec.rk.rp + delta)
      if (rec.rk.rp > rec.rk.pk) rec.rk.pk = rec.rk.rp
      rec.rk.m += 1; if (res === 'win') rec.rk.w += 1
      const cidW = p.pid ? SOCIAL.memberOf[p.pid] : null // [T156 R10] THE CLAN.war LAW GOES LIVE — ranked results pay the clan (win 3 / draw 1, the config's own numbers; the T127 client face finally has a server)
      if (cidW && SOCIAL.clans[cidW]) {
        const cw = SOCIAL.clans[cidW], wk = isoWeekOf(new Date().toISOString().slice(0, 10))
        if (cw.wK !== wk) { cw.wK = wk; cw.wP = 0; cw.wWins = 0; cw.wM = 0 } // the weekly bucket resets lazily
        const pts = res === 'win' ? CLAN.war.win : res === 'draw' ? CLAN.war.draw : 0
        cw.war = (cw.war | 0) + pts; cw.wP = (cw.wP | 0) + pts; cw.wM = (cw.wM | 0) + 1; if (res === 'win') cw.wWins = (cw.wWins | 0) + 1
        CAREER_DIRTY = true; socialPersist()
      }
      CAREER_DIRTY = true
      p.__chain('ranked', { delta, rp: rec.rk.rp, tier: tierOf(rec.rk.rp), up: tierOf(rec.rk.rp) !== tierBefore, s: rec.rk.s, pk: rec.rk.pk, m: rec.rk.m, w: rec.rk.w }) // §30.5: ONLY ranked matches, ONLY pid players, AFTER career, own chain
    }
  }
  careerPersist()
}
function matchUpdate(room, dt) {
  const m = room.match
  if (m.state === 'idle' || m.state === 'ended') {
    if (m.state === 'ended') {
      m.endT -= dt
      if (m.endT <= 0) { m.state = 'idle'; roomChain(room, 'match', { ev: 'lobby' }) }
    }
    return
  }
  if (m.state === 'countdown') {
    m.cd -= dt
    if (m.cd <= 0) { m.state = 'live'; roomChain(room, 'match', { ev: 'live' }) }
    return
  }
  // live
  // T89 L1/L3 clock-exclusion law: snd/gf/ctl own their round clocks (pre-rewind live-probe
  // defect: ctl.time=0 meant matchFinish(room,'time') fired on the first live tick when ctl
  // was left out of this list — the server mirror MUST equal the client exclusion verbatim)
  if (m.mode !== 'practice' && m.mode !== 'snd' && m.mode !== 'gf' && m.mode !== 'ctl') { // snd owns its own round clocks (SS22.3)
    m.tLeft -= dt
    if (m.tLeft <= 0) { m.tLeft = 0; matchFinish(room, 'time'); return }
  }
  if (m.mode === 'dom') domUpdate(room, dt)
  // T1-1 machines (SS22)
  if (m.mode === 'hp') hpUpdate(room, dt)
  if (m.mode === 'kc') kcUpdate(room, dt)
  if (m.mode === 'snd') sndUpdate(room, dt)
  // T89 trio machines (L1/L2/L3)
  if (m.mode === 'gf') gfUpdate(room, dt)
  if (m.mode === 'inf') infUpdate(room, dt)
  if (m.mode === 'ctl') ctlUpdate(room, dt)
  if (m.mode === 'br') brUpdate(room, dt) // [T171] the gas machine (server truth)
  const cm = CFG.MODES[m.mode]
  if (m.mode === 'ffa') {
    for (const p of room.players) if (p.kills >= (KLIMIT || room.knobs.sl || cm.killLimit)) { matchFinish(room, 'limit'); return }
  } else if (m.mode === 'tdm') {
    if (m.teamS[0] >= (KLIMIT || room.knobs.sl || cm.teamLimit) || m.teamS[1] >= (KLIMIT || room.knobs.sl || cm.teamLimit)) { matchFinish(room, 'limit'); return }
  } else if (m.mode === 'dom') {
    if (m.domS[0] >= (KLIMIT || room.knobs.sl || cm.pointLimit) || m.domS[1] >= (KLIMIT || room.knobs.sl || cm.pointLimit)) { matchFinish(room, 'limit'); return }
  }
  // T1-1 win checks (SS22)
  else if (m.mode === 'hp') {
    if (m.objS[0] >= (KLIMIT || room.knobs.sl || cm.pointLimit) || m.objS[1] >= (KLIMIT || room.knobs.sl || cm.pointLimit)) { matchFinish(room, 'limit'); return }
  } else if (m.mode === 'kc') {
    if (m.objS[0] >= (KLIMIT || room.knobs.sl || cm.teamLimit) || m.objS[1] >= (KLIMIT || room.knobs.sl || cm.teamLimit)) { matchFinish(room, 'limit'); return }
  } else if (m.mode === 'gf' || m.mode === 'ctl') { // T89 L1/L3: round limits (gf 6 / ctl 2)
    const lim = RLIMIT || cm.roundLimit
    if (m.objS[0] >= lim || m.objS[1] >= lim) { matchFinish(room, 'limit'); return }
  } else if (m.mode === 'inf') { // T89 L2: all-converted = horde wins
    if (m.inf && m.inf.started && ![...room.players].some(p => p.joined && p.alive && p.team === 0)) { matchFinish(room, 'limit'); return }
  } else if (m.mode === 'gg') {
    for (const p of room.players) if ((p.gg || 0) >= GG_TOTAL + 1) { matchFinish(room, 'limit'); return } // kill AT melee tier [e_14]
  } else if (m.mode === 'br') { // [T171] the last-alive law — 1 combatant left standing resolves the round
    const alive = [...room.players].filter(p => p.joined && p.alive)
    if (m.state === 'live' && alive.length <= 1) { matchFinish(room, 'lastalive'); return }
  }
}

// --- per-room 60 Hz authoritative step (§7) ---
function stepRoom(room, dt) {
  room.tick++
  matchUpdate(room, dt)
  const now = Date.now()
  for (const p of room.players) {
    if (!p.joined) continue
    // input pull: fold to depth FOLD, NEUTRAL on starvation [T151: was repeat-last — the coast bug: repeating the stale input integrated full walk speed at 60Hz while the starved client (hiccups, tab-switch, low fps) emitted nothing, so the server sim out-walked the prediction by seconds of momentum and every snap dragged the client forward — the movement-gated half of the walk-doubling report; axes now neutralize, yaw/pitch keep the last look] (§15 amended)
    let inp
    if (p.q.length === 0) {
      inp = p.lastIn ? { ...p.lastIn, ix: 0, iz: 0, sprint: false, jumpEdge: false, crouchEdge: false } : null // [T151] neutral coast-stop: decelerate, never integrate stale movement
    } else {
      while (p.q.length > FOLD) p.q.shift()
      inp = p.q.shift()
      p.lastAppliedSeq = inp.seq
      p.lastIn = { ...inp }
    }
    if (inp) {
      if (Number.isFinite(inp.yaw)) p.st.yaw = inp.yaw
      if (Number.isFinite(inp.pitch)) p.st.pitch = inp.pitch
    }
    if (p.alive) {
      const ev = stepState(p.st, inp || { ix: 0, iz: 0, sprint: false, ads: false, crouch: false, crouchEdge: false, jumpEdge: false, autoSprint: false }, room.WORLD, dt)
      if (p.dropT > 0) { // [T171] BR insertion — glide-capped fall, landing/water disarms the guard (the player.js dropGlide mirror; a reservoir splash must not disable fall damage for the match)
        p.st.vel.y = Math.max(p.st.vel.y, (CFG.MODES as any).br.dropFall)
        if (ev.land || p.st.swimming || p.st.wading) p.dropT = 0
      }
      // fall damage from the shared core's land events (§17) — player.js:67 formula verbatim
      if (ev.land && ev.land.fall > P.fallDamageH && !(p.dropT > 0)) {
        const dmg = Math.min(P.fallDmgCap, (ev.land.fall - P.fallDamageH) * P.fallDmgPerM)
        applyDamage(room, p, dmg, null, false, 'GRAVITY', { x: p.st.pos.x, z: p.st.pos.z })
      }
      // regen (HEALTH config verbatim: 5 s delay, 35/s)
      if (p.alive && p.hp < H.maxHP && now - p.lastDmgT > H.regenDelay * 1000) {
        p.hp = Math.min(H.maxHP, p.hp + H.regenRate * dt)
      }
    }
    if (p.spawnProt > 0) p.spawnProt = Math.max(0, p.spawnProt - dt)
    // T2-10: stim heal-over-time (modes.js:282 healRate = heal/healTime verbatim; unconditional —
    // offline player.js heal path is independent of the regen delay)
    if (p.healT > 0) {
      p.healT -= dt
      if (p.alive) p.hp = Math.min(H.maxHP, p.hp + (STIM.heal / STIM.healTime) * dt)
    }
    // T2-10: supply-shield decay (player.js:96 verbatim incl. the ×10 multiplier)
    if (p.shield > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = Math.max(0, p.shield - H.shieldDecay * dt * 10) }
    // T2-11: server-measured RTT — sping rides the ordered chain, spong replies upstream
    if (now - p.spingAt > 1000) { p.spingAt = now; if (p.__chain) p.__chain('sping', { t: now }) }
    // rewind ring (32 ticks, alive-tagged — §10)
    p.hist.push({ tick: room.tick, x: p.st.pos.x, y: p.st.pos.y, z: p.st.pos.z, h: heightOf(p.st.crouch), alive: p.alive })
    if (p.hist.length > HIST) p.hist.shift()
  }
  // --- T2-9: server-side grenades (weapons.js:254-277 verbatim math) ---
  for (let i = room.nades.length - 1; i >= 0; i--) {
    const nd = room.nades[i]
    nd.f -= dt
    if (nd.f <= 0) {
      detonateNade(room, nd)
      room.nades.splice(i, 1)
      if (nd.owner) nd.owner.nadeLive = Math.max(0, nd.owner.nadeLive - 1)
      continue
    }
    nd.vy -= NADE_GRAV * dt
    const sx = nd.vx * dt, sy = nd.vy * dt, sz = nd.vz * dt
    const len = Math.hypot(sx, sy, sz)
    if (len > 0.001) {
      const dir = { x: sx / len, y: sy / len, z: sz / len }
      const hit = rayWorldN(room.WORLD.colliders, nd, dir, len + 0.11)
      if (hit) {
        const t = Math.max(0, hit.t - 0.12) // weapons.js:268 verbatim
        nd.x += dir.x * t; nd.y += dir.y * t; nd.z += dir.z * t
        const vn = nd.vx * hit.nx + nd.vy * hit.ny + nd.vz * hit.nz
        const kb = 1 + FRAG.bounce
        nd.vx -= hit.nx * vn * kb; nd.vy -= hit.ny * vn * kb; nd.vz -= hit.nz * vn * kb // weapons.js:270
        nd.vx *= NADE_DAMP; nd.vy *= NADE_DAMP; nd.vz *= NADE_DAMP // weapons.js:271
      } else { nd.x += sx; nd.y += sy; nd.z += sz }
    }
  }
  // --- T2-10: server-owned scorestreaks (modes.js airstrike/supply/UAV verbatim) ---
  if (room.uavT > 0) room.uavT = Math.max(0, room.uavT - dt)
  for (let bi = room.burns.length - 1; bi >= 0; bi--) { // [T155 R6] napalm burn zones — the modes.js burnZones mirror (0.5s area ticks)
    const z = room.burns[bi]; z.t -= dt
    if (z.t <= 0) { room.burns.splice(bi, 1); continue }
    z.acc += dt
    if (z.acc >= 0.5) { z.acc = 0; applyAreaDamage(room, { x: z.x, y: 0.4, z: z.z }, z.r, z.dps * 0.5, z.owner, 'NAPALM') }
  }
  for (let i = room.strikes.length - 1; i >= 0; i--) {
    const s = room.strikes[i]; s.t -= dt
    if (s.t <= 0) {
      const st2 = s.def || CFG.STREAKS[1] // [T155 R6] the strike's OWN def (bombs/dmg/radius per streak)
      const nbombs = st2.bombs || 1
      for (let b = 0; b < nbombs; b++) {
        // modes.js:88-89 verbatim: target + dir*(b - (bombs-1)/2)*3.2, y=0.4; 130ms spacing (modes.js:94)
        room.bombs.push({ t: b * 0.13, x: s.target.x + s.dir.x * (b - (nbombs - 1) / 2) * 3.2, z: s.target.z + s.dir.z * (b - (nbombs - 1) / 2) * 3.2, owner: s.owner, def: st2 })
      }
      room.strikes.splice(i, 1)
    }
  }
  for (let i = room.bombs.length - 1; i >= 0; i--) {
    const b2 = room.bombs[i]; b2.t -= dt
    if (b2.t <= 0) {
      const st2 = b2.def || CFG.STREAKS[1] // [T155 R6] the bomb's OWN def (per-streak dmg/radius)
      roomChain(room, 'boom', { x: +b2.x.toFixed(2), y: 0.4, z: +b2.z.toFixed(2), r: st2.radius })
      applyAreaDamage(room, { x: b2.x, y: 0.4, z: b2.z }, st2.radius, st2.dmg, b2.owner, st2.fx === 'napalm' ? 'NAPALM' : 'AIRSTRIKE')
      if (st2.fx === 'napalm') room.burns.push({ x: b2.x, z: b2.z, r: st2.radius, t: st2.burn, dps: st2.dmg, owner: b2.owner, acc: 0 }) // [T155 R6] the burn residue — 0.5s ticks below
      room.bombs.splice(i, 1)
    }
  }
  for (let i = room.crates.length - 1; i >= 0; i--) {
    const c = room.crates[i]
    c.y -= 9 * dt // modes.js:102 verbatim fall rate
    if (c.y <= 0.45) { // modes.js:103-105 verbatim landing
      const o = c.owner
      if (o) { o.shield = H.shieldMax; o.shieldT = (c.def && c.def.shieldTime) || CFG.STREAKS[2].shieldTime } // grantSupply verbatim ([T155 R6] the crate's OWN def)
      roomChain(room, 'supply', { x: +c.x.toFixed(2), z: +c.z.toFixed(2), by: o ? o.id : null })
      room.crates.splice(i, 1)
    }
  }
  if (room.tick % SNAP_EVERY === 0) sendSnap(room)
}

function snapshot(room) {
  const ack = {}
  const pl = []
  for (const p of room.players) {
    if (!p.joined) continue
    ack[p.id] = p.lastAppliedSeq
    const s = p.st, h = heightOf(s.crouch)
    pl.push({
      id: p.id, n: p.name,
      x: +s.pos.x.toFixed(3), y: +s.pos.y.toFixed(3), z: +s.pos.z.toFixed(3),
      vx: +s.vel.x.toFixed(3), vy: +s.vel.y.toFixed(3), vz: +s.vel.z.toFixed(3),
      yaw: +s.yaw.toFixed(3), pitch: +s.pitch.toFixed(3),
      f: (s.crouch > 0.5 ? FBIT.CROUCH : 0) | (s.slide.active ? FBIT.SLIDE : 0) | (s.grounded ? FBIT.GROUNDED : 0) | (s.sprinting ? FBIT.SPRINT : 0),
      hp: Math.round(p.hp), sh: Math.round(p.shield),
      k: p.kills, de: p.deaths, s: p.score, al: p.alive ? 1 : 0,
      tm: p.team,
      st: p.streak, rt: p.srvRtt != null ? Math.round(p.srvRtt) : -1, // T2-10 streak + T2-11 server RTT
      g: room.match.mode === 'gg' ? (p.gg || 0) : undefined, // T1-1: gun game tier (snapshot mirror)
    })
  }
  const m = room.match
  const s = m.snd
  return {
    tick: room.tick, ack, pl,
    m: { md: m.mode, st: m.state, tl: Math.ceil(m.tLeft), s0: m.mode === 'dom' ? m.domS[0] : TEAM_MODES.has(m.mode) && m.mode !== 'tdm' ? m.objS[0] : m.teamS[0], s1: m.mode === 'dom' ? m.domS[1] : TEAM_MODES.has(m.mode) && m.mode !== 'tdm' ? m.objS[1] : m.teamS[1], fl: room.flags.map(f => [f.owner, +f.prog.toFixed(2)]), uav: Math.max(0, Math.ceil(room.uavT)),
      // T1-1 (SS22): additive mode extensions — old clients ignore unknown fields
      hp: m.mode === 'hp' ? [room.hill.idx, room.hill.owner, +room.hill.prog.toFixed(2), Math.max(0, Math.ceil(room.hill.t))] : null,
      tags: m.mode === 'kc' ? room.tags.map(t => [t.x, t.z, t.tm]) : null,
      snd: s ? { r: s.r, ph: s.ph, side: s.side, rt: Math.max(0, Math.ceil(s.rt)), bt: s.bt >= 0 ? Math.max(0, Math.ceil(s.bt)) : -1, pp: +s.pp.toFixed(2), dp: +s.dp.toFixed(2), bx: s.bx, bz: s.bz } : null,
      ggt: m.mode === 'gg' ? m.ggt : null,
      // T89 L1/L2/L3: additive trio snapshot fields — old clients ignore unknown fields (wire law)
      gf: m.mode === 'gf' && m.gf ? { r: m.gf.r, side: m.gf.side, ph: m.gf.ph, rt: Math.max(0, Math.ceil(m.gf.rt)), kit: m.gf.kit } : null,
      inf: m.mode === 'inf' && m.inf ? { started: m.inf.started, first: Math.max(0, Math.ceil(m.inf.first)) } : null,
      ctl: m.mode === 'ctl' && m.ctl ? { r: m.ctl.r, side: m.ctl.side, ph: m.ctl.ph, rt: Math.max(0, Math.ceil(m.ctl.rt)), caps: m.ctl.caps, sites: m.ctl.sites, zf: room.SITES.map(s => [s.ctlDone ? 1 : 0, +s.ctlProg.toFixed(2)]) } : null, // T98 re-land [Task 101 recovery]: per-site ctlDone — the DOM fl idiom ([state, prog] pairs); additive, old clients never read it
      br: m.mode === 'br' && m.br ? { ph: m.br.ph, st: m.br.st, t: Math.max(0, Math.ceil(m.br.t)), cx: +m.br.cx.toFixed(1), cz: +m.br.cz.toFixed(1), r: +m.br.r.toFixed(1), tx: +m.br.tx.toFixed(1), tz: +m.br.tz.toFixed(1), tr: +m.br.tr.toFixed(1), al: [...room.players].filter(p => p.joined && p.alive).length } : null, // [T171] additive BR zone snapshot — old clients ignore unknown fields (wire law)
      lives: m.mode === 'ctl' ? Object.fromEntries([...room.players].filter(p => p.joined).map(p => [p.id, p.ctlLives ?? 0])) : null },
  }
}
function sendSnap(room) {
  const s = snapshot(room)
  room.cap.snaps++
  const bytes = JSON.stringify(s).length // production wire size (measured BEFORE any stamp)
  room.cap.bytes += bytes
  if (bytes > room.cap.bytesMax) room.cap.bytesMax = bytes
  if (CAP_ON) s.et = Date.now() // SS13 probe-only stamp; production format unchanged
  roomChain(room, 'snap', s)
}
function roomChain(room, msg, data) {
  for (const p of room.players) {
    if (p.joined && p.__chain) p.__chain(msg, data)
  }
  if (room.specs) for (const s of room.specs) { // T41 §25.3: spectators consume the EXACT player stream (gate: __chain only — spec.joined stays false)
    if (s.__chain) s.__chain(msg, data)
  }
}
// --- T2-12: host = lowest joinOrder PRESENT member (recomputed, never stored —
// host migration on leave/purge is structural, not event-driven) ---
function hostOf(room) {
  let h = null
  for (const q of room.players) if (!h || q.joinOrder < h.joinOrder) h = q
  return h
}
function broadcastRoster(room) {
  const h = hostOf(room)
  roomChain(room, 'roster', { host: h ? h.id : null, hostN: h ? h.name : null, ps: [...room.players].map(q => ({ id: q.id, n: q.name, tm: q.team, cf: q.fin && q.fin !== 'default' ? q.fin : undefined, ct: q.trl && q.trl !== 'none' ? q.trl : undefined, co: q.op || undefined, cl: q.pid && SOCIAL.memberOf[q.pid] ? SOCIAL.clans[SOCIAL.memberOf[q.pid]].tag : undefined })), specs: room.specs ? room.specs.size : 0, md: room.match.mode, map: room.mapId, knobs: (room.knobs && (room.knobs.sl || room.knobs.tl)) ? { sl: room.knobs.sl || undefined, tl: room.knobs.tl || undefined } : undefined, priv: room.priv || undefined, code: room.priv ? room.code : undefined }) // §53.3: clan tag; §51.3: additive map; §52.4: knobs (all undefined-drop = pre-existing bytes for stock rooms) // T41 §25.3: additive spectator count; T45 §29.1: additive lobby mode + privacy keys; T48a: per-member finish id; T55 §39.3: per-member trail id (both undefined drop = pre-T55 bytes for STOCK players)
}

// --- global self-correcting 60 Hz clock (§7: next tick = start + n*DT) ---
let clockRunning = false, tickN = 0, tickStart = 0, clockTimer = null
function kickClock() {
  if (clockRunning) return
  clockRunning = true; tickN = 0; tickStart = Date.now()
  const loop = () => {
    tickN++
    const anyActive = [...rooms.values()].some(r => r.players.size > 0)
    if (!anyActive) { clockRunning = false; return }
    const tEntry = Date.now()
    const late = tEntry - (tickStart + (tickN - 1) * DT_MS) // this run's schedule (§7)
    for (const r of rooms.values()) if (r.players.size > 0) stepRoom(r, DT)
    const exec = Date.now() - tEntry
    capTicks.n++
    capPush(capTicks.late, late); if (late > capTicks.lateMax) capTicks.lateMax = late
    if (late > 5) capTicks.lateOver++
    capPush(capTicks.exec, exec); if (exec > capTicks.execMax) capTicks.execMax = exec
    if (exec > 4) capTicks.execOver++
    const target = tickStart + tickN * DT_MS
    clockTimer = setTimeout(loop, Math.max(0, target + DT_MS - Date.now()))
  }
  clockTimer = setTimeout(loop, 0)
}

// --- T50 §34: per-connection event rate sweep (DoS/reflection hardening) ---
// One rolling-window bucket per (connection, event). Swept events drop SILENTLY — no
// reply, no broadcast, no audit row (the audit rings are themselves flood-sensitive).
// Counters aggregate module-level; reporting rides status ONLY under IRON_CAP=1 (SS13
// law — production wire stays byte-identical). Legal cadences sit far below every cap.
// §50.3 sanction ladder [k_12] — rung 3 is ladder INTEGRITY (a flagged pid re-rolls by
// making a new pid; accepted + documented — the goal is lobby hygiene, not punishment).
const VIOL_WIN = 30000, VIOL_COOL = 50, MUTE_MS = 10000, VIOL_KICK = 400
const SWEEP = { n: 0, by: {} }
function swept(ev) { SWEEP.n++; SWEEP.by[ev] = (SWEEP.by[ev] || 0) + 1 }
function bucketFor(buckets, ev, now, win) { // §50.2: bucket extraction (behavior-identical refactor)
  let b = buckets.get(ev)
  if (!b) { b = []; buckets.set(ev, b) }
  while (b.length && now - b[0] > win) b.shift()
  return b
}
function rateOk(buckets, ev, cap, win = 1000, sCap, sWin) { // §50.2: optional sustained window — 4-arg sites stay call-compat
  const now = Date.now()
  const vio = buckets.vio
  if (vio && now < vio.mutedUntil) { vio.n++; vio.by[ev] = (vio.by[ev] || 0) + 1; swept(ev); return false } // rung 1: muted = total silent drop (budget-free)
  const b = bucketFor(buckets, ev, now, win)
  const sb = sCap ? bucketFor(buckets, ev + ':s', now, sWin) : null // sustained window (amplifier events only — spec §50.2 LAW)
  if (b.length >= cap || (sb && sb.length >= sCap)) {
    if (vio) {
      vio.n++; vio.by[ev] = (vio.by[ev] || 0) + 1
      vio.w.push(now); while (vio.w.length && now - vio.w[0] > VIOL_WIN) vio.w.shift()
      if (vio.w.length >= VIOL_COOL) vio.mutedUntil = now + MUTE_MS // rung 1 arm: 50-in-30s
      if (vio.n >= VIOL_KICK && buckets.kick) buckets.kick() // rung 2: kick past 400 lifetime violations
    } else swept(ev)
    return false
  }
  if (sb) sb.push(now) // budget slots consumed ONLY on pass
  b.push(now)
  return true
}
// §34.1 caps (legal-max reasoning): ping 20/s (region ping bursts ≈7/s + RTT 1/s),
// status 4/s + lb 4/s (human/probe query cadence), spong 30/s (client RTT EMA ≈1/s),
// reload 6/s (legal cadence bounded by reload durations), respawn 2/2s (death cadence),
// startMatch 1/s (host clicks), setMode 4/s, streak 4/s + ability 6/s (both ALREADY gated
// by server-owned score/cooldown — caps are flood safety only), emote 2/2s (T55 §39.4 —
// client cooldown 1.5 s sits under the cap; the 1→N broadcast amplifier is covered).
// §50.2 LAW: the SUSTAINED second window attaches ONLY to amplifier events (1→N broadcast
// or O(store) work): ping/status/lb/spong/reload/setMode — §51/§52 add setMap/setKnob, §53.6 adds auth/eco/soc/q.
const PING_SUST = [60, 10000], STATUS_SUST = [15, 10000], LB_SUST = [15, 10000]
const SPONG_SUST = [20, 10000], RELOAD_SUST = [12, 10000], SETMODE_SUST = [12, 10000]
const SETMAP_SUST = [12, 10000], SETKNOB_SUST = [10, 10000], LOOT_SUST = [12, 10000] // [T171] the BR loot-pickup budget (6/s burst under the same sustain law)
const AUTH_SUST = [10, 10000] // §53.6: auth brute-force budget
const ECO_SUST = [30, 10000]
const TK_SECRET = process.env.IRONSIGHT_TK_SECRET || 'ironsight-tk-dev-v1' // [T110] the PSP verifier seam — env-overridable for staging; MODULE scope (the nonce space is service-global, never per-connection)
const TK_PENDING = new Map() // checkout nonce → { pid, pack, t } — single-use, TTL'd (tokens.js TK_CO_TTL) — module scope: a nonce issued on ANY socket is consumable exactly once, service-wide
const SOC_SUST = [30, 10000]
const Q_SUST = [20, 10000]
const VARS_SUST = [10, 10000] // §55: the vars bag is O(1) row work — burst 4/s, sustained 10/10s (the setKnob shape)
const AC_KICKS = { n: 0 } // §50.3: kick counter for CAP_ON status reporting (SS13 law)

// --- wire protocol ---
const httpServer = createServer() // NOTE: socket.io path:'/' claims ALL HTTP requests on this
// server (engine.io intercepts, verified: GET /metrics -> "Transport unknown") — any HTTP
// metrics surface is unreachable; SS13 reporting rides the 'status' socket event instead.
// §50.1 origin allow-list [k_03]: IRON_ORIGIN (comma-separated) → engine.io cors allow-list;
// unset → '*' (dev/probe byte-compat). this row is NOT client auth (§28.3): a header-forging
// non-browser client bypasses this row — it only fences the casual browser surface.
const IRON_ORIGINS = (process.env.IRON_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
const io = new Server(httpServer, {
  path: '/', // DO NOT change — Caddy ?XTransformPort route depends on it
  cors: { origin: IRON_ORIGINS.length ? IRON_ORIGINS : '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000, pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[room] connected: ${socket.id}`)
  const chain = makeChain((m, d) => socket.emit(m, d))
  let p = null // bound player after successful join
  const rl = new Map() // T50 §34: per-connection rate buckets (key = event name)
  // §50.3: per-connection violation ledger + kick closure (rung 2/3 wiring)
  rl.vio = { n: 0, by: {}, w: [], mutedUntil: 0, kicked: false }
  rl.kick = () => {
    const vio = rl.vio
    if (vio.kicked) return // re-entrant safety
    vio.kicked = true
    console.log(`[room] AC kick: ${socket.id} n=${vio.n} by=${JSON.stringify(vio.by)}`) // kick transparency: by-event breakdown
    AC_KICKS.n++
    if (p && p.pid) {
      const rec = careerRec(p.pid, p.name)
      rec.ac = { t: Date.now(), n: vio.n, by: { ...vio.by } } // rung 3: career ac-record (t, n, by)
      CAREER_DIRTY = true
      careerPersist()
    }
    socket.disconnect(true) // the §4 held-state grant is revoked — a kicked session holds NO reconnect state
  }

  socket.on('join', (d) => {
    try {
      if (p) return // one join per socket
      d = d || {}
      // reconnect by token (§4/§15: held state 10 s)
      if (typeof d.token === 'string' && held.has(d.token)) {
        const h = held.get(d.token)
        clearTimeout(h.purgeTimer)
        held.delete(d.token)
        p = h.p
        p.id = socket.id
        const room = rooms.get(h.roomId) || getRoom(h.roomId)
        room.players.add(p)
        p.__chain = chain
        p.joined = true
        chain('joined', { id: p.id, roomSize: room.players.size, spawn: { x: p.st.pos.x, y: p.st.pos.y, z: p.st.pos.z }, token: p.token, room: room.id, code: room.priv ? room.code : undefined, restored: true, live: room.match.state === 'countdown' || room.match.state === 'live', md: room.match.mode, live: room.match.state !== 'idle', md: room.match.mode, ...(p.pid ? { profile: profileOf(p.pid), ranked: rankedView(CAREER.players[p.pid]) } : {}) }) // T45 §29.1: additive code (undefined drops on public rooms); T46 §30.5: ranked view (absent = anonymous, pre-T46 bytes); [T157] ROOM-STATE LAW: live + md ride the ack — the client's deploy branch reads SERVER TRUTH (the old ack never carried them, so `!d.live` was always true and the T141 'live room just rides it' clause was dead bytes: every auto join self-started hardcoded ffa, even mid-live tdm)
        broadcastRoster(room)
        console.log(`[room] rejoin: ${p.name} -> ${room.id} (${room.players.size})`)
        kickClock()
        return
      }
      // fresh join — T45 §29.1 room resolution: priv create → code join → named room (privacy-guarded)
      const name = (typeof d.name === 'string' && d.name.trim().length && d.name.length <= 16) ? d.name.trim() : 'OP-' + socket.id.slice(0, 4)
      let room
      if (d.priv === true) {
        const code = genCode()
        room = getRoom(code); room.priv = true; room.code = code // d.room ignored on create — a private match is always a new room
        console.log(`[room] private create -> ${code}`)
      } else if (typeof d.code === 'string' && d.code) {
        const norm = d.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN)
        if (norm.length !== CODE_LEN) { chain('joinErr', { why: 'code' }); return }
        room = rooms.get(norm)
        if (!room || !room.priv) { chain('joinErr', { why: 'noRoom' }); return } // a code never resolves to a public room (no info leak)
      } else {
        const roomName = (typeof d.room === 'string' && /^[a-zA-Z0-9]{1,8}$/.test(d.room)) ? d.room.toUpperCase() : 'A'
        room = getRoom(roomName)
        if (room.priv) { chain('joinErr', { why: 'code' }); return } // privacy guard: private rooms reachable ONLY via their code — spectators included (guard precedes the spec branch)
      }
      // T41 §25.1: spectator branch — BEFORE the player cap (a full room is exactly when
      // spectating matters). Read-only: makeSpec record with joined:false; SPEC_MAX cap;
      // no token → no held-state (disconnect = gone, honest for a read-only session).
      if (d.spec === true) {
        if (room.specs.size >= SPEC_MAX) { chain('joinErr', { why: 'specFull' }); return }
        p = makeSpec(socket.id, name)
        p.roomId = room.id; p.__chain = chain
        const spawn = pickSpawn(room, 0, null) // camera seed only — the spec is never stepped
        room.specs.add(p)
        chain('joined', { id: p.id, roomSize: room.players.size, spawn: { x: +spawn.x.toFixed(3), y: 0.05, z: +spawn.z.toFixed(3) }, room: room.id, code: room.priv ? room.code : undefined, spec: true, live: room.match.state === 'countdown' || room.match.state === 'live', md: room.match.mode }) // T45 §29.1: additive code
        broadcastRoster(room)
        console.log(`[room] spectate: ${p.name} -> ${room.id} (${room.specs.size}/${SPEC_MAX} specs)`)
        kickClock()
        return
      }
      if (room.players.size >= MAX_ROOM) { chain('joinErr', { why: 'roomFull' }); return }
      const team = TEAM_MODES.has(room.match.mode) && room.match.state !== 'idle' ? (room.players.size % 2) : 0 // T1-1: team modes (SS22.5)
      const spawn = pickSpawn(room, team, null)
      p = makePlayer(socket.id, name, spawn)
      p.token = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      p.roomId = room.id; p.team = team; p.joinOrder = joinCounter++
      // T2-10: ability binding rides the join payload (§4 join {name, cosmetics} — additive field)
      const ab = ABILITIES.find(a => a.id === d.ab) || ABILITIES[0]
      p.abId = ab.id; p.abCh = ab.charges || 1; p.abChMax = p.abCh
      // T40 §24: loadout rides join — attachment-cloned defs + authoritative ammo (additive; old clients = null → lazy base-def path)
      p.wdefs = buildWdefs(d.ld)
      p.ammo = initAmmo(p)
      p.fin = (cos.FINISHES.some(f => f.id === d.fin) ? d.fin : 'default') // T2-5 Phase 2 (T48a): server-validated finish (absent/garbage → 'default'; additive — old clients never send it)
      p.trl = (cos.TRAILS.some(t => t.id === d.trl) ? d.trl : 'none') // T2-5 Phase 3 (T55 §39.3): server-validated trail (absent/garbage → 'none'; additive — old clients never send it)
      p.op = (ops.OPERATORS.some(o => o.id === d.op) ? d.op : undefined) // T108 N8: server-validated operator id (absent/garbage → undefined-drop = pre-N8 bytes; additive — old clients never send it)
      p.streakLoadout = (Array.isArray(d.slo) && d.slo.length === 3 && d.slo.every(x => Number.isInteger(x) && x >= 0 && x < CFG.STREAKS.length) && new Set(d.slo).size === 3) ? d.slo : p.streakLoadout // [T155 R6] the streak equip rides join — 3 distinct def indices in range (absent/garbage = the default = pre-T155 bytes; additive — old clients never send it)
      p.pid = PID_OK(d.pid) ? d.pid : null // T44 §28.1: device-scoped bearer identity; invalid/absent = anonymous (pre-T44 bytes)
      p.__chain = chain
      room.players.add(p); p.joined = true
      chain('joined', { id: p.id, roomSize: room.players.size, spawn: { x: +spawn.x.toFixed(3), y: 0.05, z: +spawn.z.toFixed(3) }, token: p.token, room: room.id, code: room.priv ? room.code : undefined, live: room.match.state === 'countdown' || room.match.state === 'live', md: room.match.mode, live: room.match.state !== 'idle', md: room.match.mode, ...(p.pid ? { profile: profileOf(p.pid), ranked: rankedView(CAREER.players[p.pid]) } : {}) }) // T45 §29.1: additive code; T46 §30.5: ranked view (absent = anonymous); [T157] ROOM-STATE LAW: live + md ride the ack (see the rejoin ack) — additive keys, old clients ignore
      broadcastRoster(room)
      console.log(`[room] join: ${p.name} -> ${room.id} (${room.players.size}) ab=${p.abId}`)
      kickClock()
    } catch (e) { console.error('[room] join error', e) }
  })

  socket.on('input', (m) => {
    if (!p || !p.joined) return
    if (!m || typeof m !== 'object') return
    // §11 rate cap ≤ 90/s
    const now = Date.now()
    p.inTimes.push(now)
    while (p.inTimes.length && now - p.inTimes[0] > 1000) p.inTimes.shift()
    if (p.inTimes.length > INPUT_CAP) return
    // §11 seq monotonicity + field whitelist (only known keys copied)
    if (!Number.isFinite(m.seq) || m.seq <= p.seq) return
    p.seq = m.seq
    const inp = {
      seq: m.seq,
      ix: Number.isFinite(m.ix) ? Math.max(-2, Math.min(2, m.ix)) : 0,
      iz: Number.isFinite(m.iz) ? Math.max(-2, Math.min(2, m.iz)) : 0,
      yaw: Number.isFinite(m.yaw) ? m.yaw : p.st.yaw,
      pitch: Number.isFinite(m.pitch) ? Math.max(-CFG.LOOK.pitchClamp, Math.min(CFG.LOOK.pitchClamp, m.pitch)) : p.st.pitch, // §34.3: client LOOK law (config.js single truth, 89°) — pitch rides snapshots + streak fwdFull; server never trusts an unclamped one
      sprint: !!m.sprint, ads: !!m.ads, crouch: !!m.crouch,
      crouchEdge: !!m.crouchEdge, jumpEdge: !!m.jumpEdge, autoSprint: !!m.autoSprint,
    }
    if (p.q.length > 240) p.q.shift() // abuse guard
    p.q.push(inp)
  })

  // §10/§11/§17 fire: validate → rewind → verdict (server owns all combat)
  socket.on('fire', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    const now = Date.now()
    p.fireTimes.push(now)
    while (p.fireTimes.length && now - p.fireTimes[0] > 1000) p.fireTimes.shift()
    const reject = (why) => audit({ t: now, id: p.id, reject: why })
    if (p.fireTimes.length > FIRE_CAP) return reject('rate')
    if (!p.alive) return reject('dead')
    if (!m || !Array.isArray(m.o) || !Array.isArray(m.d) || m.o.length !== 3 || m.d.length !== 3) return reject('shape')
    const o = { x: +m.o[0], y: +m.o[1], z: +m.o[2] }, d = { x: +m.d[0], y: +m.d[1], z: +m.d[2] }
    if (![o.x, o.y, o.z, d.x, d.y, d.z].every(Number.isFinite)) return reject('nan')
    const wdef = (p.wdefs && p.wdefs.get(m.w)) || WEAPONS.find(w => w.id === m.w)
    if (!wdef) return reject('weapon')
    // origin within 2 m of the SERVER's eye (§11)
    const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch
    const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z }
    if (Math.hypot(o.x - eye.x, o.y - eye.y, o.z - eye.z) > 2) return reject('origin')
    const dl = Math.hypot(d.x, d.y, d.z)
    if (dl < 0.2 || dl > 2) return reject('dir')
    d.x /= dl; d.y /= dl; d.z /= dl
    // §10 lag-comp: rewind = min(rt/2 + interpDelay, 250 ms) against the 32-tick ring.
    // T2-11: rt source = SERVER-measured RTT when available (§6 anti-cheat baseline —
    // client-reported is untrusted); client value is the bootstrapping fallback only.
    const rtCli = Math.max(0, Math.min(600, Number(m.rt) || 0))
    const rt = p.srvRtt != null ? Math.max(0, p.srvRtt) : rtCli
    const rtSrc = p.srvRtt != null ? 'srv' : 'cli'
    // T40 §24: authoritative ammo — consume after shape/weapon/origin validation,
    // before the fired reveal (an empty-mag fire must neither reveal nor hit).
    // empty/reloading → sync event + audit reject (no hit calc).
    if (!p.ammo) p.ammo = new Map()
    let am = p.ammo.get(m.w)
    if (!am) { am = { mag: wdef.mag, res: wdef.reserve, rl: 0 }; p.ammo.set(m.w, am) } // lazy back-compat (pre-T40 clients)
    if (now < am.rl) { chain('ammo', { w: m.w, mag: am.mag, res: am.res }); return reject('reloading') }
    if (am.mag <= 0) { chain('ammo', { w: m.w, mag: am.mag, res: am.res }); return reject('empty') }
    am.mag--
    // --- Task 35: remote fired reveal feed (hud.js:197 parity) — a VALIDATED,
    // UNSUPPRESSED fire reveals the shooter on enemy minimaps for 1.3 s
    // (bots.js:342 firedT=0 mirror; the client decays it per frame).
    // T40 §24 CLOSED the future-correct note: suppressed now comes from the
    // attachment-cloned def (join ld.at), so suppressed fire no longer reveals.
    if (!wdef.suppressed) {
      for (const q of room.players) if (q.joined && q !== p && q.__chain) q.__chain('fired', { id: p.id })
    }
    const rewindMs = Math.min(rt / 2 + INTERP_DELAY, 250)
    const ticksBack = Math.max(0, Math.round(rewindMs / DT_MS))
    const targetTick = Math.max(1, room.tick - ticksBack)
    const hits = []
    let bestT = rayWorld(room.WORLD.colliders, o, d, 300) // world occlusion first (world.js mirror; per-room colliders §51.2)
    // §54.3 U7: destructible routing — nearest dest BEFORE the actor loop (a nearer prop
    // tightens bestT and eats the bullet; actors still win when genuinely nearer).
    // ZERO new client events: the verdict derives from THIS already-validated fire
    // (rate/alive/shape/origin/dir/weapon/ammo gates §11/§50 applied above).
    const destHit = rayDest(room.DESTS, o, d, bestT)
    if (destHit) bestT = destHit.t
    let victim = null, hitHead = false, hitPoint = null
    for (const q of room.players) {
      if (q === p) continue // no self-hit (weapons.js _canSelfHit false)
      const entry = q.hist.find(h2 => h2.tick === targetTick) || q.hist[0]
      if (!entry || !entry.alive) continue // alive-only rewind (§17)
      const center = { x: entry.x, y: entry.y + entry.h * 0.5, z: entry.z }
      const headC = { x: center.x, y: center.y + entry.h * 0.3, z: center.z } // weapons.js:204 generic branch
      const bh = entry.h * 0.5
      const tHead = rayBox(o, d, headC.x - HEAD_HS, headC.y - HEAD_HS, headC.z - HEAD_HS, headC.x + HEAD_HS, headC.y + HEAD_HS, headC.z + HEAD_HS)
      const tBody = rayBox(o, d, center.x - BODY_BW, center.y - bh, center.z - BODY_BW, center.x + BODY_BW, center.y + bh * 0.9, center.z + BODY_BW)
      let tHit = -1, head = false
      if (tHead >= 0 && (tBody < 0 || tHead <= tBody)) { tHit = tHead; head = true }
      else if (tBody >= 0) tHit = tBody
      if (tHit >= 0 && tHit < bestT) {
        bestT = tHit; victim = q; hitHead = head
        hitPoint = { x: o.x + d.x * tHit, y: o.y + d.y * tHit, z: o.z + d.z * tHit }
      }
    }
    if (victim && hitPoint) {
      // falloff (weapons.js:219-225 verbatim structure)
      const [near, far, minM] = wdef.falloff
      let mult = 1
      if (bestT > near) mult = 1 + (minM - 1) * Math.min(1, (bestT - near) / Math.max(0.1, far - near))
      const dmg = wdef.dmg * (hitHead ? wdef.hs : 1) * mult
      const res = applyDamage(room, victim, dmg, p, hitHead, wdef.name, hitPoint)
      hits.push({ v: victim.id, dmg: Math.round(dmg), head: hitHead, kill: !!res.kill })
    } else if (destHit) {
      // §54.3/§54.4 U7: prop damage = wdef.dmg × falloff (NO headshot); stage law mirrors
      // config DESTRUCT.STAGE_FRAC (0.5) verbatim; destroy → re-filter the ROOM's composed
      // collider copy (frozen d.colliders untouched) + DESTS.delete + audit; match-scoped
      // persistence (buildRoomWorld rebuild on setMap/matchStart restores props).
      const ds = room.DESTS.get(destHit.id)
      if (ds) {
        const [near, far, minM] = wdef.falloff
        let mult = 1
        if (destHit.t > near) mult = 1 + (minM - 1) * Math.min(1, (destHit.t - near) / Math.max(0.1, far - near))
        ds.hp -= wdef.dmg * mult
        const st = ds.hp <= 0 ? 2 : (ds.hp / ds.maxHp <= 0.5 ? 1 : 0)
        if (st >= 2) {
          room.WORLD.colliders = room.WORLD.colliders.filter((c: any) => c.destId !== destHit!.id)
          room.DESTS.delete(destHit.id)
          audit({ t: now, id: p.id, dest: destHit.id, destroyed: true })
        }
        roomChain(room, 'dest', { id: destHit.id, hp: Math.max(0, Math.round(ds.hp)), st, by: p.id })
      }
    }
    audit({ t: now, id: p.id, tick: room.tick, rt, rtSrc, rewindMs: +rewindMs.toFixed(1), ticksBack, hit: hits.length > 0, hits })
  })

  // respawn: client picks from the SAME pools; server validates (§11) and owns the teleport
  socket.on('respawn', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'respawn', 2, 2000)) return // §34.1: death cadence — 2 per 2 s is far above legal
    // T1-1 (SS22.3): snd = no respawn mid-round — dead actors sit out; server spawns at round start
    // T105 (v1.69): gf joins the sit-out law — modes.js:643 noRespawn (snd||gf) is the offline truth
    // the server mirror MUST carry (the round machine's elimination checks would otherwise never fire)
    if ((room.match.mode === 'snd' && room.match.snd && room.match.snd.ph !== 'inter') || (room.match.mode === 'gf' && room.match.gf && room.match.gf.ph !== 'inter')) {
      chain('matchErr', { why: 'sndNoRespawn' }) // token stays byte-stable (the client maps it to the generic no-respawn face)
      return
    }
    let pos = null
    if (m && Array.isArray(m.pos) && m.pos.length === 3 && m.pos.every(Number.isFinite)) {
      const [x, y, z] = m.pos
      if (nearPoolR(room, x, y, z)) pos = { x, y, z } // §34.2: spawn-POOL membership (§11 law now ENFORCED) — the old bounds+freeAt check alone let a cheat respawn ANYWHERE walkable on the map; a non-pool pick falls through to the server-chosen spawn below
    }
    if (!pos) pos = pickSpawn(room, p.team, p) // rejected → server-chosen valid spawn
    p.st = makeState(pos)
    p.hp = H.maxHP; p.shield = 0; p.alive = true; p.spawnProt = H.spawnProtTime
    p.lastDmgT = Date.now(); p.hist.length = 0
    p.q.length = 0; p.lastIn = null // fresh input stream post-teleport
    // T40 §24: respawn refills authoritative ammo (full mag + fresh reserve) + syncs the client
    if (p.wdefs && p.wdefs.size) {
      p.ammo = initAmmo(p)
      for (const [wid, def] of p.wdefs) chain('ammo', { w: wid, mag: def.mag, res: def.reserve })
    }
  })

  // T40 §24: server reload gate — client announces (w = weapon id, e = empty flag);
  // server times it from the attachment-cloned def and answers with authoritative ammo.
  socket.on('reload', (m) => {
    if (!p || !p.joined) return
    if (!m || typeof m.w !== 'string') return
    if (!rateOk(rl, 'reload', 6, 1000, RELOAD_SUST[0], RELOAD_SUST[1])) return // §34.1: kills the ammo-sync reflection amplifier + §50.2 sustained
    const wdef = (p.wdefs && p.wdefs.get(m.w)) || WEAPONS.find(w => w.id === m.w)
    if (!wdef) return
    const now = Date.now()
    if (!p.ammo) p.ammo = new Map()
    let am = p.ammo.get(m.w)
    if (!am) { am = { mag: wdef.mag, res: wdef.reserve, rl: 0 }; p.ammo.set(m.w, am) }
    if (now < am.rl) { chain('ammo', { w: m.w, mag: am.mag, res: am.res }); return }
    const full = wdef.mag
    if (am.mag >= full || am.res <= 0) { chain('ammo', { w: m.w, mag: am.mag, res: am.res }); return } // nothing to reload — sync truth
    const durMs = Math.round((m.e ? wdef.reloadE : wdef.reloadT) * 1000)
    am.rl = now + (wdef.shellLoad ? durMs * (full - am.mag) : durMs) // §24: shell-load ≈ per-shell × shells to full
    const take = Math.min(full - am.mag, am.res)
    am.mag += take; am.res -= take
    chain('ammo', { w: m.w, mag: am.mag, res: am.res })
  })

  socket.on('startMatch', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'startMatch', 1)) return // §34.1: lobby-start is any-member — cap kills countdown churn
    // T2-12: mid-live/countdown restart is HOST-only (lobby-start stays any-member);
    // host = lowest joinOrder present — migrates structurally on leave/purge
    if ((room.match.state === 'live' || room.match.state === 'countdown') && hostOf(room) !== p) {
      chain('matchErr', { why: 'notHost' }); return
    }
    const mode = m && typeof m.mode === 'string' ? m.mode : room.match.mode // T45 §29.2: absent payload = lobby mode (host pick takes effect); explicit payload still honored (bot probes byte-identical)
    if (!matchStart(room, mode, p)) chain('matchErr', { why: 'mode' })
  })

  // --- T45 §29.2: host lobby mode pick (custom-lobby affordance; sets the lobby mode, does NOT start) ---
  socket.on('setMode', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'setMode', 4, 1000, SETMODE_SUST[0], SETMODE_SUST[1])) return // §34.1: host-only, but success BROADCASTS (roster + roomChain) — cap kills the amplifier + §50.2 sustained
    if (room.match.state !== 'idle') { chain('matchErr', { why: 'live' }); return }
    if (hostOf(room) !== p) { chain('matchErr', { why: 'notHost' }); return } // T2-12 host law (lowest joinOrder PRESENT — migrates structurally)
    const mode = m && typeof m.mode === 'string' ? m.mode : null
    if (!mode || !CFG.MODES[mode]) { chain('matchErr', { why: 'mode' }); return }
    room.match.mode = mode
    roomChain(room, 'match', { ev: 'lobbyMode', md: mode, by: p.name })
    broadcastRoster(room)
    console.log(`[room] lobby mode: ${mode} by ${p.name} in ${room.id}`)
  })

  // --- §51.3 S2: host map pick — setMode-identical chain; rebuilds the per-room world ---
  socket.on('setMap', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'setMap', 4, 1000, SETMAP_SUST[0], SETMAP_SUST[1])) return // §34.1: host-only, success REBUILDS the world + broadcasts — cap kills the amplifier
    if (room.match.state !== 'idle') { chain('matchErr', { why: 'live' }); return }
    if (hostOf(room) !== p) { chain('matchErr', { why: 'notHost' }); return }
    const mapId = m && typeof m.map === 'string' ? m.map : null
    if (!mapId || !MAPS_REGISTRY.includes(mapId) || !loadMapData(mapId)) { chain('matchErr', { why: 'map' }); return }
    // [T110] the TOKEN-STAGE gate: tk-gated maps require the HOST to own them (server-authoritative —
    // tokens.js TK_STAGES is the gate table; ownership = the eco.own inventory the tksku op writes).
    if (tk.TK_STAGES.some((s) => s.id === mapId)) {
      const hrec = p.pid ? CAREER.players[p.pid] : null
      const hown = hrec ? (ecoRec(hrec).own[mapId] | 0) : 0
      if (hown <= 0) { chain('matchErr', { why: 'mapLock' }); return }
    }
    buildRoomWorld(room, mapId)
    room.uavT = 0; room.strikes = []; room.bombs = []; room.crates = []; room.nades = [] // world-dynamism clear
    room.hill = { idx: -1, owner: -1, prog: 0, t: 0, tickT: 0 }; room.tags = [] // objective machines reset
    roomChain(room, 'match', { ev: 'lobbyMap', map: mapId, by: p.name })
    broadcastRoster(room)
    console.log(`[room] lobby map: ${mapId} by ${p.name} in ${room.id}`)
  })

  // --- §52.4 S4: host rule knobs (score limit / time limit) — setMode-identical chain ---
  socket.on('setKnob', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'setKnob', 4, 1000, SETKNOB_SUST[0], SETKNOB_SUST[1])) return
    if (room.match.state !== 'idle') { chain('matchErr', { why: 'live' }); return }
    if (hostOf(room) !== p) { chain('matchErr', { why: 'notHost' }); return }
    m = m || {}
    const cl = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null)
    const sl = m.sl === 0 ? 0 : cl(m.sl, 5, 500) // {sl:0} IS the spec'd RESET value (live-probe T5 fix); below-range stays rejected
    const tl = m.tl === 0 ? 0 : cl(m.tl, 60, 3600) // out-of-range → matchErr knobs (NEVER a silent clamp)
    if ((m.sl != null && sl === null) || (m.tl != null && tl === null) || (m.sl != null && m.sl !== 0 && sl !== m.sl) || (m.tl != null && m.tl !== 0 && tl !== m.tl)) { chain('matchErr', { why: 'knobs' }); return }
    if (m.sl != null) room.knobs.sl = sl
    if (m.tl != null) room.knobs.tl = tl
    roomChain(room, 'match', { ev: 'lobbyKnobs', knobs: { ...room.knobs }, by: p.name })
    broadcastRoster(room)
  })

  // --- [T171] BR loot pickup — alive + range + not-taken; the shield effect rides server-side
  // (armor), the weapon/ammo apply stays client inventory truth; lootTake broadcasts to ALL.
  socket.on('loot', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room || room.match.mode !== 'br' || room.match.state !== 'live') return
    if (!p.alive) return
    if (!rateOk(rl, 'loot', 6, 1000, LOOT_SUST[0], LOOT_SUST[1])) return
    const it = (room.loot || []).find(x => x && x.id === (m && m.id))
    if (!it || it.taken) return
    if (Math.hypot(p.st.pos.x - it.x, p.st.pos.z - it.z) > 3) return
    it.taken = true
    if (it.k === 'arm') p.shield = Math.min(H.shieldMax, (p.shield || 0) + 50) // the armor plate's server-truth half
    roomChain(room, 'match', { ev: 'lootTake', id: it.id })
  })

  // ============================================================
  // §53.1 G2 ACCOUNTS — argon2id via the runtime's native primitive (OWASP greenfield
  // law), canonical account pid = the REGISTERING device pid (spec §53.1), one-time
  // device-career merge on login, stays-signed-in session tokens. Zero join-contract
  // change: an authed client simply sends d.pid = account pid on join (§53.7).
  // ============================================================
  const AUTH_NAME_OK = /^[A-Za-z0-9_-]{3,16}$/
  socket.on('auth', async (d) => {
    if (!rateOk(rl, 'auth', 4, 1000, AUTH_SUST[0], AUTH_SUST[1])) return // §53.6: brute-force gate (sustained 10/10s)
    d = d || {}
    const op = typeof d.op === 'string' ? d.op : ''
    const fail = (err) => chain('auth', { op, err })
    if (op === 'register' || op === 'login') {
      const name = typeof d.name === 'string' ? d.name.trim() : ''
      const pass = typeof d.pass === 'string' ? d.pass : ''
      if (!AUTH_NAME_OK.test(name)) return fail('name')
      if (pass.length < 8 || pass.length > 72) return fail('pass')
      const devPid = PID_OK(d.pid) ? d.pid : null
      if (!devPid) { fail('pid'); return } // canonical account pid = the REGISTERING device pid (§53.1)
      if (op === 'register') {
        if (ACC.users[name.toLowerCase()]) return fail('taken')
        const ph = await Bun.password.hash(pass, { algorithm: 'argon2id' }) // OWASP greenfield law
        const acc = { name, pid: devPid, ph, made: Date.now(), disc: assignDisc() } // [T166] the pilot discriminator rides registration
        ACC.users[name.toLowerCase()] = acc
        // live-caught defect R1 fix: register STAMPS the account name into the career
        // record (pidByName + friends/trades resolve by name — without the stamp they
        // bind to a stale name and by-name flows break for accounts)
        const rec = careerRec(devPid, name); rec.n = name; rec.disc = acc.disc // [T166] the public index carries the ID
        CAREER_DIRTY = true; accPersist(); careerPersist()
        const tok = newTok(); SESSIONS.set(tok, { pid: acc.pid, name: acc.name, exp: Date.now() + SESSION_TTL, disc: acc.disc })
        chain('auth', { op, name: acc.name, tok, pid: acc.pid, disc: acc.disc })
        return
      }
      // login
      const acc = ACC.users[name.toLowerCase()]
      const ph = acc ? acc.ph : 'o$0m3h4shphfakesaltvalue000000000000000' // unknown-name burns a verify (constant-shape, no enumeration tell)
      const okP = await Bun.password.verify(pass, ph)
      if (!acc || !okP) return fail('bad')
      // one-time device-career merge: devPid valid + ≠ account + unmerged + record exists (§53.1)
      if (devPid && devPid !== acc.pid && !ACC.merged[devPid] && CAREER.players[devPid]) {
        mergeCareer(careerRec(acc.pid, acc.name), CAREER.players[devPid])
        ACC.merged[devPid] = acc.pid
        delete CAREER.players[devPid]
        CAREER_DIRTY = true
      }
      if (!acc.disc) { acc.disc = assignDisc(); accPersist() } // [T166] pre-T166 account migration — the ID assigns on first login
      const rec = careerRec(acc.pid, acc.name); rec.n = acc.name; rec.disc = acc.disc // R1 fix: name-stamp on login too · [T166] the ID stamp
      CAREER_DIRTY = true; careerPersist()
      const tok = newTok(); SESSIONS.set(tok, { pid: acc.pid, name: acc.name, exp: Date.now() + SESSION_TTL, disc: acc.disc })
      chain('auth', { op, name: acc.name, tok, pid: acc.pid, disc: acc.disc })
      return
    }
    if (op === 'logout') {
      if (typeof d.tok === 'string') SESSIONS.delete(d.tok)
      chain('auth', { op, ok: true })
      return
    }
    if (op === 'me') {
      const acc = typeof d.tok === 'string' ? SESSIONS.get(d.tok) : null
      if (!acc || acc.exp < Date.now()) { if (acc) SESSIONS.delete(d.tok); return fail('anon') }
      const s = acc
      s.exp = Date.now() + SESSION_TTL // sliding TTL (stays-signed-in law [j_02])
      const rec = CAREER.players[acc.pid]
      chain('auth', { op, name: acc.name, tok: d.tok, pid: acc.pid, disc: acc.disc, profile: profileOf(acc.pid), ranked: rankedView(rec), eco: ecoState(acc.pid), social: socialState(acc.pid) }) // [T166] the ID rides the resume ack
      return
    }
    fail('op')
  })

  // ============================================================
  // §53.2 G1 ECONOMY ops — buy / case / claim / list / unlist / buyListing / trade.
  // CR is earned FREE by playing (matchFinish crDelta); the real-money leg is
  // the T2-5 TOKEN leg [T110]: non-refundable tokens buy the rare catalog
  // (mythic operators / finishes / charms / trails / stages) via tkco+tkpack
  // (the two-leg checkout arc — see tokens.js header) and tksku (the spend
  // op, priced from EACH asset's own single-truth table). The PSP integration
  // point: TK_SECRET signing below IS the webhook verifier seam — a real PSP
  // replaces the nonce issuance (hosted checkout) and this verifier (its
  // server-to-server signed webhook); the client flow shape never changes.
  // Purchases bind to ACCOUNTS (the PARITY_DIFF #22 law — acc-gated, never
  // bearer-pid). ============================================================
  socket.on('eco', (d) => {
    if (!rateOk(rl, 'eco', 12, 1000, ECO_SUST[0], ECO_SUST[1])) return // §53.6
    d = d || {}
    const op = typeof d.op === 'string' ? d.op : ''
    const fail = (err) => chain('eco', { op, err })
    const acc = SESSIONS.get(d.tok || '')
    const pid = acc ? acc.pid : (PID_OK(d.pid) ? d.pid : null)
    if (!pid) { fail('pid'); return }
    const rec = careerRec(pid, 'PILOT')
    const e = ecoRec(rec)
    if (op === 'state') { chain('eco', { op, ...ecoState(pid) }); return }
    // [T161 R8] THE DUAL PRESTIGE PATHS (E4's server leg — the client's G-9 two-step arm has
    // ridden sendEco({op:'prestige'}) since T123, but NO hub handler ever landed; the silent
    // drop is closed here, in the eco section where the wire actually arrives):
    //   regular = the shipped law verbatim (reset, keep everything, +PRESTIGE.cr, rec.pr++);
    //   classic = the second path's TEETH (×1.5 CR grant + the RP ladder soft-resets TOO —
    //   the classic ladder rerun; unlocks/inventory stay, the modern-CoD compromise).
    // The pick rides rec.prPath — the identity corner reads it. Errs: pid|lvl|path.
    if (op === 'prestige') {
      const path = d.path === 'classic' ? 'classic' : 'regular'
      if ((rec.lvl || 1) < MAX_LVL) return fail('lvl')
      rec.lvl = 1; rec.xp = 0
      rec.pr = (rec.pr || 0) + 1
      rec.prPath = path
      e.cr += path === 'classic' ? PRESTIGE_CLASSIC.cr : PRESTIGE.cr
      if (path === 'classic' && rec.rk) rec.rk.rp = softReset(rec.rk.rp) // the classic ladder rerun (softReset is the §30.4 law — a hard reset would punish the ladder, the shipped SPEC DECISION stands)
      CAREER_DIRTY = true
      p.__chain('prestige', { path, pr: rec.pr, cr: path === 'classic' ? PRESTIGE_CLASSIC.cr : PRESTIGE.cr })
      chain('eco', { op, ok: true, path, pr: rec.pr, ...ecoState(pid) })
      return
    }
    if (op === 'tkco') { // [T110] leg 1 — the checkout INIT: issue a single-use, TTL'd, server-signed nonce (the client cannot forge it; the FTC-confirm modal fired CLIENT-side BEFORE this wire)
      if (!acc) return fail('acc') // the PARITY_DIFF #22 law: purchases bind to accounts
      const pack = tk.packById(d.pack)
      if (!pack) return fail('pack')
      const now = Date.now()
      for (const [k, v] of TK_PENDING) if (now - v.t > tk.TK_CO_TTL) TK_PENDING.delete(k) // TTL prune
      const co = createHmac('sha256', TK_SECRET).update(`${acc.pid}:${pack.id}:${now}`).digest('hex').slice(0, 32)
      TK_PENDING.set(co, { pid: acc.pid, pack: pack.id, t: now })
      chain('eco', { op, pack: pack.id, usd: pack.usd, tkp: pack.tk, co }) // tkp (not tk — tk is the BALANCE face)
      return
    }
    if (op === 'tkpack') { // [T110] leg 2 — the PSP-RETURN: the nonce replay credits the pack (a real PSP webhook replaces this verifier; the flow shape holds)
      if (!acc) return fail('acc')
      const pco = typeof d.co === 'string' ? d.co : ''
      const pend = TK_PENDING.get(pco)
      if (!pend) return fail('co') // unknown / consumed / expired — the single-use law
      if (Date.now() - pend.t > tk.TK_CO_TTL) { TK_PENDING.delete(pco); return fail('co') }
      if (pend.pid !== acc.pid) return fail('co') // the nonce binds to the INITIATING account
      const pack = tk.packById(pend.pack)
      TK_PENDING.delete(pco) // consume FIRST (single-use — a crash between here and persist loses the nonce, never double-credits)
      e.tk = (e.tk | 0) + pack.tk
      e.tkhist = (e.tkhist || [])
      e.tkhist.push({ pack: pack.id, tk: pack.tk, usd: pack.usd, t: Date.now() })
      if (e.tkhist.length > tk.TK_HIST_CAP) e.tkhist = e.tkhist.slice(-tk.TK_HIST_CAP) // the receipt-trail cap
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, tk: e.tk, tkhist: e.tkhist.slice(-tk.TK_HIST_CAP) })
      return
    }
    if (op === 'tksku') { // [T110] the SPEND op — token-priced catalog assets; EACH kind prices from its OWN single-truth table (the roster/cosmetic tk fields + the TK_STAGES mirror)
      if (!acc) return fail('acc') // spends bind to accounts too (the same #22 law)
      const id = typeof d.id === 'string' ? d.id : ''
      let price = 0, kind = ''
      const opRow = ops.OPERATORS.find((o) => o.id === id && o.tk > 0)
      const finRow = !opRow && cos.FINISHES.find((x) => x.id === id && x.tk > 0)
      const chRow = !opRow && !finRow && cos.CHARMS.find((x) => x.id === id && x.tk > 0)
      const trRow = !opRow && !finRow && !chRow && cos.TRAILS.find((x) => x.id === id && x.tk > 0)
      const stRow = !opRow && !finRow && !chRow && !trRow && tk.TK_STAGES.find((s) => s.id === id)
      if (opRow) { price = opRow.tk; kind = 'op' }
      else if (finRow) { price = finRow.tk; kind = 'finish' }
      else if (chRow) { price = chRow.tk; kind = 'charm' }
      else if (trRow) { price = trRow.tk; kind = 'trail' }
      else if (stRow && MAPS_REGISTRY.includes(id) && loadMapData(id)) { price = stRow.tk; kind = 'stage' } // the stage must EXIST on disk (registry + loader truth)
      else return fail('item')
      if (e.own[id] > 0) return fail('owned')
      if ((e.tk | 0) < price) return fail('tk') // the balance fail token (distinct from cr — the client faces differ)
      e.tk -= price; e.own[id] = (e.own[id] || 0) + 1
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, id, kind, tk: e.tk, own: { ...e.own } })
      return
    }
    if (op === 'buy') {
      const opRow = ops.OPERATORS.find((o) => o.id === d.id) // T108 N8: operator SKUs price from the SAME roster single truth (price field), NOT the ECO_PRICE-by-rarity cosmetic table
      if (opRow && opRow.price > 0) {
        if (e.own[opRow.id] > 0) { fail('owned'); return }
        if ((e.cr | 0) < opRow.price) { fail('cr'); return }
        e.cr -= opRow.price; e.own[opRow.id] = (e.own[opRow.id] || 0) + 1
        CAREER_DIRTY = true; careerPersist()
        chain('eco', { op, id: opRow.id, cr: e.cr, own: { ...e.own } })
        return
      }
      const item = cos.ecoItemById(d.id)
      if (!item) return fail('item')
      if (e.own[item.id] > 0) { fail('owned'); return }
      const price = (cfg.ECO_PRICE || {})[item.r]
      if (!price || (e.cr | 0) < price) { fail('cr'); return }
      e.cr -= price; e.own[item.id] = (e.own[item.id] || 0) + 1
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, id: item.id, cr: e.cr, own: { ...e.own } })
      return
    }
    if (op === 'case') {
      if ((e.cr | 0) < 100) return fail('cr') // ECO_CASE_COST=100 (client law §53.2)
      e.cr -= 100
      const r = casePick(ECO_RARITY, crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) // server crypto-RNG
      const pool = cos.ECO_POOL.filter((x) => x.r === r)
      const item = pool[Math.floor(Math.random() * pool.length)]
      let dupe = false
      if (e.own[item.id] > 0) { dupe = true; const refund = ECO_DUPE_REFUND; e.cr += refund } // dupe → flat refund
      else e.own[item.id] = 1
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, id: item.id, r, dupe, cr: e.cr, own: { ...e.own } })
      return
    }
    if (op === 'claim') {
      const now = Date.now()
      if ((rec.lvl | 0) < ECO_CLAIM.lvl) return fail('lvl') // VERBATIM [p2_eco_b]: lvl 5
      if ((rec.m | 0) < ECO_CLAIM.minMatches) return fail('m') // ≥1 match
      if (now - (e.lastClaim || 0) < ECO_CLAIM.hours * 3600e3) return fail('cd') // 12 h
      e.lastClaim = now; e.cr += ECO_CLAIM.cr
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, lastClaim: e.lastClaim })
      return
    }
    if (op === 'list') { // market listing — escrows the INVENTORY copy (stat-entitlements NOT listable)
      const item = cos.ecoItemById(d.id)
      const price = Math.max(1, d.price | 0)
      if (!item || !price) return fail('item')
      if (!(e.own[item.id] > 0)) return fail('notOwned') // a stat-unlock is NOT listable
      if (e.out.length >= ECO_CAPS.listings) return fail('cap')
      if (ACC.listings.length >= 200) return fail('market')
      e.own[item.id] -= 1; if (e.own[item.id] <= 0) delete e.own[item.id] // escrow
      const l = { id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), seller: pid, sellerName: rec.n, itemId: item.id, r: item.r, price, t: Date.now() }
      e.out.push(l); ACC.listings.push(l)
      CAREER_DIRTY = true; accPersist(); careerPersist()
      chain('eco', { op, cr: e.cr, own: { ...e.own }, out: e.out.map((x) => ({ ...x })) })
      return
    }
    if (op === 'unlist') {
      const li = e.out.findIndex((x) => x.id === d.lid)
      if (li < 0) return fail('noList')
      const l = e.out.splice(li, 1)[0]
      const mi = ACC.listings.findIndex((x) => x.id === l.id)
      if (mi >= 0) ACC.listings.splice(mi, 1)
      e.own[l.itemId] = (e.own[l.itemId] || 0) + 1 // de-escrow
      accPersist(); careerPersist()
      chain('eco', { op, cr: e.cr, own: { ...e.own }, out: e.out.map((x) => ({ ...x })) })
      return
    }
    if (op === 'buyListing') {
      if (!acc) return fail('pid') // the market is an ACCOUNT surface (PARITY_DIFF #22)
      const l = ACC.listings.find((x) => x.id === d.lid)
      if (!l) return fail('noList')
      if (l.seller === acc.pid) { fail('self'); return } // no self-buy
      if ((e.cr | 0) < l.price) return fail('cr')
      const sellerRec = CAREER.players[l.seller]
      if (!sellerRec) { fail('gone'); return }
      e.cr -= l.price
      ecoRec(sellerRec).cr += l.price // offline seller paid via the career store
      const mi = ACC.listings.findIndex((x) => x.id === l.id)
      if (mi >= 0) ACC.listings.splice(mi, 1)
      const se = sellerRec.eco
      if (se) { const oi = se.out.findIndex((x) => x.id === l.id); if (oi >= 0) se.out.splice(oi, 1) }
      e.own[l.itemId] = (e.own[l.itemId] || 0) + 1
      CAREER_DIRTY = true; accPersist(); careerPersist()
      chain('eco', { op, cr: e.cr, own: { ...e.own }, market: ACC_LISTINGS().map((x) => ({ ...x })) })
      return
    }
    if (op === 'offer') { // trade: ≤5 items per side VERBATIM [j_06]
      const to = PID_OK(d.to) ? d.to : pidByName(d.toName)
      if (!to || to === pid) return fail('to')
      const give = Array.isArray(d.give) ? d.give.filter((x) => typeof x === 'string') : []
      const want = Array.isArray(d.want) ? d.want.filter((x) => typeof x === 'string') : []
      if (give.length > ECO_CAPS.tradePerSide || want.length > ECO_CAPS.tradePerSide) return fail('cap')
      if (!give.every((id) => cos.ecoItemById(id) && e.own[id] > 0)) { fail('give'); return } // inventory-validated
      if (!want.every((id) => cos.ecoItemById(id))) return fail('want')
      const te = ecoRec(careerRec(to, 'PILOT'))
      if (te.inbox.length >= ECO_CAPS.pendingTrades) return fail('inbox')
      const o = { id: 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), from: pid, fromName: rec.n, give, want, t: Date.now() }
      te.inbox.push(o)
      chain('eco', { op, to })
      return
    }
    if (op === 'respond') { // re-validate BOTH sides at accept (gone law)
      const accept = d.accept === true
      const oi = e.inbox.findIndex((x) => x.id === d.oid)
      if (oi < 0) return fail('noTrade')
      const o = e.inbox.splice(oi, 1)[0]
      const orec = CAREER.players[o.from]
      if (!orec) { fail('gone'); return }
      const fe = ecoRec(orec)
      if (accept) {
        const giveOk = o.give.every((id) => fe.own[id] > 0)
        const wantOk = o.want.every((id) => e.own[id] > 0)
        if (!giveOk || !wantOk) { fail('gone'); return } // an escrowed side vanished since offer
        for (const id of o.give) { fe.own[id] -= 1; if (fe.own[id] <= 0) delete fe.own[id]; e.own[id] = (e.own[id] || 0) + 1 }
        for (const id of o.want) { e.own[id] -= 1; if (e.own[id] <= 0) delete e.own[id]; fe.own[id] = (fe.own[id] || 0) + 1 }
        CAREER_DIRTY = true; careerPersist()
      }
      chain('eco', { op, accept, cr: e.cr, own: { ...e.own } })
      return
    }
    if (op === 'bppass') { // T102: the T94 pass buyout joins the server ledger — server-authoritative (the eco CR is the MP-end chain's own); the pure law stays single-truth (mg.bpPassBuy, the no-orphan import)
      const res = mg.bpPassBuy(bpRec(rec), e.cr)
      if (!res) return fail('cr') // unowned + affordable gate (bpPassBuyable) — junk bp / short CR / already-owned all land here
      rec.bp = res.bp // [T102 fix1] the copy-on-write result IS the new record shape — the caller assigns (the evStoreBuy caller idiom verbatim)
      e.cr -= res.cost
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, bp: res.bp })
      return
    }
    if (op === 'bpclaim') { // T102: the T93/T94 claim legs join the server ledger — the §62.5b live tier is injected from cfg.bpOf (the caller-owns-the-mirror law); grants ride eco.own (server inventory — the ∪ law's server leg picks them up client-side with zero picker changes)
      const bp = bpRec(rec)
      const lv = bpOf(bp.x).tier
      let out = null, crC = 0, grant = null
      if (d.ch) {
        const ch = Number(d.ch) | 0
        const charmId = mg.BP_FREE_CHARMS[(ch - 1) % mg.BP_FREE_CHARMS.length]
        const res = mg.bpClaimFree(bp, ch, lv, srvOwns(rec, charmId))
        if (res) { out = res.bp; crC = (res.reward.cr || 0) + (res.reward.dupeRefund || 0); grant = res.reward.charm || null }
      } else if (d.tr) {
        const tr = Number(d.tr) | 0
        const row = mg.bpRewardFor(tr)
        const res = row ? mg.bpClaimPremium(bp, tr, lv, (id) => srvOwns(rec, id)) : null
        if (res) { out = res.bp; crC = (res.reward.cr || 0) + (res.reward.dupeRefund || 0); grant = res.reward.id || null }
      }
      if (!out) return fail('claim') // tier gates / pass gate / already-claimed / out-of-range — the pure laws own every rejection
      rec.bp = out // [T102 fix1] the copy-on-write claim shape lands on the record (the carry law — claims survive the next match award)
      if (crC) e.cr += crC
      if (grant) e.own[grant] = (e.own[grant] || 0) + 1
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, own: { ...e.own }, bp: out })
      return
    }
    if (op === 'evsku') { // T102: the T91 event-store skip joins the server ledger — the window-keyed cap-7 counter (evsStoreView law) + the §62.5b bp.x mirror; the pure buy law stays single-truth
      const sku = mg.evStoreSkuById(typeof d.id === 'string' ? d.id : '')
      if (!sku) return fail('sku')
      if ((e.cr | 0) < sku.cr) return fail('cr')
      const stv = evsStoreView(rec)
      const base = { v: mg.EV_PERSIST_V, d: '', w: stv.w, claimed: { daily: [], weekly: [] }, stats: {}, ms: [], store: { t: stv.t } }
      const res = mg.evStoreBuy(sku, base)
      if (!res) return fail('cap') // cap-7 verbatim (evStoreBuyable) — bought + tiers ≤ 7 per window
      rec.evsStore = { w: stv.w, t: res.state.store.t }
      e.cr -= sku.cr
      const bp = bpRec(rec); bp.x += BP.per * res.tiers // §62.5b mirror — REAL tier advance (the T91 client law verbatim)
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, bp, evsStore: rec.evsStore })
      return
    }
    if (op === 'bnbuy') { // T102: the T91 bundle acquire joins the server ledger — LIVE-window-only (server-authoritative: expired windows unbuyable, bundlesFor re-derives the deterministic pair), the 5 items grant server inventory, the window marker rides rec.bn (bundleOwnedItems inverts it client-side)
      const wins = mg.bundlesFor(mg.evDayOf(Date.now()))
      const w = wins.find((x) => x && x.id === d.id)
      if (!w) return fail('window') // not one of the TWO live windows
      if (rec.bn && rec.bn[w.id]) return fail('owned')
      if ((e.cr | 0) < w.price) return fail('cr')
      e.cr -= w.price
      for (const it of w.items) if (it && it.id) e.own[it.id] = (e.own[it.id] || 0) + 1
      if (!rec.bn || typeof rec.bn !== 'object') rec.bn = {}
      rec.bn[w.id] = true // the T91 marker law verbatim (career.bn[windowId] = true)
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, own: { ...e.own }, bn: { ...rec.bn } })
      return
    }
    if (op === 'evclaim') { // T103: the challenge claim joins the server ledger — the deterministic window lists re-derive SERVER-side (evChallengeById over the server's own window keys), the pure evsClaim law stays single-truth (done + in-window + not-claimed owned by the law), rewards credit eco CR + bp.x
      const evs = evsRec(rec)
      const ch = mg.evChallengeById(evs.d, d.id)
      if (!ch) return fail('claim')
      const out = mg.evsClaim(ch, evs.stats, evs)
      if (!out) return fail('claim') // not-done / window rolled / already claimed — the pure law owns every rejection
      rec.evs = out.state // [T102 fix1 idiom] the copy-on-write result IS the new record shape — the caller assigns
      e.cr += out.reward.cr || 0
      bpRec(rec).x += out.reward.bp || 0
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, bp: bpRec(rec), evs: evsView(rec) })
      return
    }
    if (op === 'msclaim') { // T103: the milestone claim joins the server ledger — evMilestoneClaim over the STATIC 8-row table (window-scoped membership: the window IS the test, no key read), rewards credit eco CR + bp.x; claimed ids ride rec.evs.ms (claims die with the window, the migrateEvs law)
      const evs = evsRec(rec)
      const ms = mg.EV_MILESTONES.find((x) => x && x.id === d.id)
      if (!ms) return fail('claim')
      const out = mg.evMilestoneClaim(ms, evs.stats, evs)
      if (!out) return fail('claim')
      rec.evs = out.state
      e.cr += out.reward.cr || 0
      bpRec(rec).x += out.reward.bp || 0
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, cr: e.cr, bp: bpRec(rec), evs: evsView(rec) })
      return
    }
    if (op === 'gift') { // [T156 R11] the CR gift verb — FRIEND-GATED (the §53.3 social law: gifts ride the friends graph, no cold transfers), the receipt rides the recipient's inbox
      const to = typeof d.pid === 'string' ? d.pid : ''
      const amt = Math.floor(Number(d.n)) | 0
      if (!to || to === pid) return fail('to')
      if (!(amt >= 1) || amt > (cfg.ECO_GIFT || { cap: 5000 }).cap) return fail('amt')
      if (!CAREER.players[to]) return fail('noUser')
      if (!SOCIAL.friends[pid] || !SOCIAL.friends[pid].some((f) => f.pid === to)) return fail('friends')
      if ((e.cr | 0) < amt) return fail('cr')
      const e2 = ecoRec(to)
      e.cr = (e.cr | 0) - amt
      e2.cr = (e2.cr | 0) + amt
      e2.inbox = e2.inbox || []
      e2.inbox.push({ from: pid, fromName: rec.n, amt, t: Date.now() })
      if (e2.inbox.length > 20) e2.inbox = e2.inbox.slice(-20) // the tkhist cap idiom
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, ok: true, cr: e.cr })
      return
    }
    if (op === 'recycle') { // [T156 R11/R16] the sell-back verb — pool items at the SHIPPED dupe-refund anchor (one rate, zero new pricing law); operators/tk/bpx rows never enter the pool (ecoItemById is the pool search)
      const item = cos.ecoItemById(d.id)
      if (!item) return fail('item')
      if (!((e.own[item.id] | 0) > 0)) return fail('notOwned')
      e.own[item.id] -= 1
      if (e.own[item.id] <= 0) delete e.own[item.id]
      e.cr = (e.cr | 0) + ECO_DUPE_REFUND
      CAREER_DIRTY = true; careerPersist()
      chain('eco', { op, id: item.id, cr: e.cr, own: { ...e.own } })
      return
    }
    fail('op')
  })

  // ============================================================
  // §55 [T173] G-11 PER-USER VARS — {op:'get'} → {op, vars:bag} · {op:'set', set:{k:v}}
  // merges the patch (a null value DELETES the key) and answers the SERVER-TRUTH bag.
  // Same trust laws as eco/soc: pid via session token or validated uuid (PID_OK); every
  // field shape-checked (finite numbers, ≤512-char strings, booleans, plain objects /
  // arrays depth ≤ 4, keys ≤ 32 chars); the bag is capped (≤64 keys, ≤8 KB serialized).
  // Errs: pid|store|op|shape|key|val|size. Writes are immediate (sqlite WAL — ONE row
  // per user, no full-store rewrite). A fresh pid reads {} WITHOUT creating a row
  // (no write on read). Cross-session BY DESIGN: the bag survives reconnect + redeploy
  // (mounted volume), the same class of truth as career — NOT session state.
  // ============================================================
  socket.on('vars', (d) => {
    if (!rateOk(rl, 'vars', 4, 1000, VARS_SUST[0], VARS_SUST[1])) return // §50.2 + §55 budget
    d = d || {}
    const op = typeof d.op === 'string' ? d.op : ''
    const fail = (err) => chain('vars', { op, err })
    const acc = SESSIONS.get(d.tok || '')
    const pid = acc ? acc.pid : (PID_OK(d.pid) ? d.pid : null)
    if (!pid) { fail('pid'); return }
    if (!VARS) { fail('store'); return }
    if (op === 'get') {
      const bag = varsGet(pid)
      if (!bag) { fail('store'); return }
      chain('vars', { op, vars: bag })
      return
    }
    if (op === 'set') {
      const patch = d.set
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) { fail('shape'); return }
      const keys = Object.keys(patch)
      if (!keys.length || keys.length > VARS_CAP_KEYS) { fail('key'); return }
      const badKey = keys.find((k) => !k.length || k.length > VARS_KEY_LEN)
      if (badKey) { fail('key'); return }
      const bag = varsGet(pid)
      if (!bag) { fail('store'); return }
      const chk = (v: any, dep: number): boolean => { // the JSON-safe law
        if (v === null) return true
        if (typeof v === 'number') return Number.isFinite(v)
        if (typeof v === 'string') return v.length <= VARS_STR_LEN
        if (typeof v === 'boolean') return true
        if (dep >= VARS_DEPTH || typeof v !== 'object') return false
        if (Array.isArray(v)) return v.length <= VARS_CAP_KEYS && v.every((x) => chk(x, dep + 1))
        const ks = Object.keys(v)
        return ks.length <= VARS_CAP_KEYS && ks.every((k) => k.length <= VARS_KEY_LEN && chk(v[k], dep + 1))
      }
      for (const k of keys) if (!chk(patch[k], 0)) { fail('val'); return }
      for (const k of keys) { if (patch[k] === null) delete bag[k]; else bag[k] = patch[k] }
      const data = JSON.stringify(bag)
      if (data.length > VARS_CAP_BYTES) { fail('size'); return } // PRE-persist cap: a rejected op mutates NOTHING (the fail = no-state-change law — the merge above is in-memory only)
      if (!varsSet(pid, data)) { fail('store'); return }
      chain('vars', { op, vars: bag })
      return
    }
    fail('op')
  })

  // ============================================================
  // §53.3 G3 SOCIAL — friends by exact name (caps) + clans (Voxiom bounds [p2_soc_c],
  // Krunker lvl-10 join gate [p2_soc_d], createCost 500 CR). Clan changes REBROADCAST
  // affected room rosters (live-caught defect S4c fix — stale cl tags on the roster).
  // ============================================================
  socket.on('soc', (d) => {
    if (!rateOk(rl, 'soc', 12, 1000, SOC_SUST[0], SOC_SUST[1])) return // §53.6
    d = d || {}
    const op = typeof d.op === 'string' ? d.op : ''
    const fail = (err) => chain('soc', { op, err })
    const acc = SESSIONS.get(d.tok || '')
    const pid = acc ? acc.pid : (PID_OK(d.pid) ? d.pid : null)
    if (!pid) { fail('pid'); return }
    const myPid = pid
    const myRec = CAREER.players[pid]
    SOCIAL.friends[pid] = SOCIAL.friends[pid] || []
    SOCIAL.reqs[pid] = SOCIAL.reqs[pid] || []
    if (op === 'state') { chain('soc', { op, ...socialState(pid) }); return }
    if (op === 'friendReq') {
      // [T166] the CoD-ID resolve: 'NAME#1234' (the full Activision-style ID) splits at the
      // LAST '#' — name + discriminator must BOTH match an account. Bare names keep the
      // §53.3 exact-name resolve (names are unique by construction). A wrong disc fails
      // 'to' exactly like an unknown name — no enumeration tell.
      const raw = typeof d.name === 'string' ? d.name.trim() : ''
      let to: string | null = null
      const hash = raw.lastIndexOf('#')
      if (hash > 0) {
        const acc = ACC.users[raw.slice(0, hash).toLowerCase()]
        if (acc && acc.disc === raw.slice(hash + 1)) to = acc.pid
      } else {
        to = pidByName(raw)
      }
      if (!to || to === pid) return fail('to')
      SOCIAL.reqs[to] = SOCIAL.reqs[to] || []
      if (SOCIAL.reqs[to].length >= 20) return fail('cap')
      if (SOCIAL.friends[pid].some((f) => f.pid === to)) return fail('friends')
      if (SOCIAL.reqs[to].some((o) => o.from === pid)) return fail('dup')
      SOCIAL.reqs[to].push({ from: pid, t: Date.now() })
      socialPersist()
      chain('soc', { op, ok: true })
      return
    }
    if (op === 'friendResp') {
      const li = (SOCIAL.reqs[pid] || []).findIndex((o) => o.from === d.from)
      if (li < 0) return fail('noReq')
      const o = SOCIAL.reqs[pid].splice(li, 1)[0]
      if (d.accept === true) {
        SOCIAL.friends[pid].push({ pid: o.from, since: Date.now() }) // BOTH edges
        SOCIAL.friends[o.from] = SOCIAL.friends[o.from] || []
        SOCIAL.friends[d.from].push({ pid: myPid, since: Date.now() })
      }
      socialPersist()
      chain('soc', { op, accept: d.accept === true, ...socialState(pid) })
      return
    }
    if (op === 'friendRemove') {
      const i = (SOCIAL.friends[pid] || []).findIndex((f) => f.pid === d.pid)
      if (i >= 0) SOCIAL.friends[pid].splice(i, 1)
      const theirs = (SOCIAL.friends[d.pid] || [])
      const j = theirs.findIndex((f) => f.pid === pid)
      if (j >= 0) theirs.splice(j, 1) // remove BOTH edges
      socialPersist()
      chain('soc', { op, ...socialState(pid) })
      return
    }
    // [T161 R21] THE REPORT PIPELINE (G-8's server half): the T118 client seam rode
    // sendSoc({op:'report'}) but NO hub handler ever landed — the silent-drop the T122 E2E
    // log caught WAS this gap. Wire = the client's OWN contract: {op:'report', name, reason}
    // → ack {op:'report', ok, dup?} / {op:'report', err} (errs: pid|reason|to|self|cap).
    // Trust tier (honest): a 24h per-reporter dedupe (R.by), and ONLY ≥3 DISTINCT reporters
    // inside the window set the §50.3 rung-3 career record (rec.ac, rep:true) — the
    // leaderboard-exclusion surface. Kicks stay violation-gated (the AC engine's own
    // evidence law is untouched); reports NEVER kick by themselves.
    if (op === 'report') {
      const REASONS = ['cheat', 'tox', 'team', 'other'] // the T118 dialog enum verbatim
      if (!REASONS.includes(d.reason)) return fail('reason')
      const to = pidByName(d.name)
      if (!to || to === pid) return fail('to')
      const recT = CAREER.players[to]
      if (!recT) return fail('to')
      const now = Date.now(), DAY = 86400000
      recT.reports = recT.reports || { n: 0, by: {} }
      const R = recT.reports
      if (R.by[pid] && now - R.by[pid] < DAY) { chain('soc', { op, ok: true, dup: true }); return } // a re-report inside the window acks dup (the client toast reads it) without recounting
      if (!R.by[pid]) R.n++
      R.by[pid] = now
      const windowN = Object.values(R.by).filter((t) => now - t < DAY).length
      if (windowN >= 3 && !recT.ac) recT.ac = { t: now, n: windowN, by: { ...R.by }, rep: true } // rung-3 record shape verbatim — the §50 exclusion + status surfaces read it
      CAREER_DIRTY = true
      chain('soc', { op, ok: true })
      return
    }
    // [T161 R8] the MP prestige leg lives in the ECO section (the client's G-9 wire rides
    // sendEco) — the duplicate social-section variant was removed before it ever shipped.
    if (op === 'clanCreate') {
      const name = typeof d.name === 'string' ? d.name.trim() : ''
      const tag = typeof d.tag === 'string' ? d.tag.trim().toUpperCase() : ''
      if (name.length < CLAN.nameMin || name.length > CLAN.nameMax) return fail('name') // Voxiom bounds [p2_soc_c]
      if (tag.length < CLAN.tagMin || tag.length > CLAN.tagMax) return fail('tag')
      if (SOCIAL.memberOf[myPid]) { fail('member'); return } // one clan per pid
      if (Object.values(SOCIAL.clans).some((c) => c.name.toLowerCase() === name.toLowerCase())) return fail('taken')
      const e = myRec ? ecoRec(myRec) : null
      if (!e || (e.cr | 0) < CLAN.createCost) return fail('cr') // 500 CR debit
      e.cr -= CLAN.createCost
      const cid = 'C' + Date.now().toString(36)
      SOCIAL.clans[cid] = { id: cid, name, tag, owner: myPid, members: [myPid], made: Date.now(), war: 0, wK: '', wP: 0, wWins: 0, wM: 0 } // [T156 R10] the war tally joins the record (all-time + the weekly bucket)
      SOCIAL.memberOf[myPid] = cid
      CAREER_DIRTY = true; socialPersist(); careerPersist()
      rebroadcastRoomsFor(myPid) // S4c fix: roster cl tags must go live
      chain('soc', { op, clan: clanView(SOCIAL.clans[cid]) , cr: e.cr })
      return
    }
    if (op === 'clanJoinReq') {
      d.name = typeof d.name === 'string' ? d.name : ''
      const cid = typeof d.cid === 'string' && SOCIAL.clans[d.cid] ? d.cid : null
      const clan = cid || Object.values(SOCIAL.clans).find((c) => c.name.toLowerCase() === d.name.trim().toLowerCase()) // id OR name resolve
      if (!clan) return fail('noClan')
      if ((myRec.lvl | 0) < CLAN.joinLvl) return fail('lvl') // VERBATIM [p2_soc_d]: lvl 10
      if (SOCIAL.memberOf[myPid]) { fail('member'); return }
      clan.reqs = clan.reqs || []
      if (clan.reqs.some((o) => o.from === myPid)) return fail('dup')
      clan.reqs.push({ from: myPid, t: Date.now() })
      socialPersist()
      chain('soc', { op, ok: true })
      return
    }
    if (op === 'clanResp') { // owner-only accept/deny
      const clan = SOCIAL.memberOf[myPid] ? SOCIAL.clans[SOCIAL.memberOf[myPid]] : null
      if (!clan || clan.owner !== myPid) { fail('owner'); return }
      const ri = (clan.reqs || []).findIndex((o) => o.from === d.from)
      if (ri < 0) return fail('noReq')
      const o = clan.reqs.splice(ri, 1)[0]
      if (d.accept === true && CAREER.players[o.from]) {
        if (SOCIAL.memberOf[o.from]) { chain('soc', { op, err: 'member' }); return }
        SOCIAL.memberOf[o.from] = clan.id
        clan.members.push(o.from)
        rebroadcastRoomsFor(o.from) // S4c fix
      }
      socialPersist()
      chain('soc', { op, accept: d.accept === true, clan: clanView(clan) })
      return
    }
    if (op === 'clanLeave') {
      const cid = SOCIAL.memberOf[myPid]
      const clan = cid ? SOCIAL.clans[cid] : null
      if (!clan) return fail('noClan')
      clan.members = clan.members.filter((m) => m !== myPid)
      delete SOCIAL.memberOf[myPid]
      if (!clan.members.length) { delete SOCIAL.clans[cid] } // empty clan deletes
      else if (clan.owner === myPid) clan.owner = clan.members[0] // transfer ownership
      socialPersist()
      rebroadcastRoomsFor(myPid)
      chain('soc', { op, ok: true })
      return
    }
    if (op === 'clanKick') {
      const clan = SOCIAL.memberOf[myPid] ? SOCIAL.clans[SOCIAL.memberOf[myPid]] : null
      if (!clan || clan.owner !== myPid) { fail('owner'); return }
      if (d.pid === myPid) return fail('self') // kick is non-self (leave instead)
      const mi = clan.members.indexOf(d.pid)
      if (mi >= 0) clan.members.splice(mi, 1)
      delete SOCIAL.memberOf[d.pid]
      if (clan.owner === d.pid) clan.owner = clan.members[0]
      if (!clan.members.length) { delete SOCIAL.clans[clan.id] }
      socialPersist()
      rebroadcastRoomsFor(d.pid)
      chain('soc', { op, clan: SOCIAL.clans[SOCIAL.memberOf[myPid]] ? clanView(SOCIAL.clans[SOCIAL.memberOf[myPid]]) : null })
      return
    }
    if (op === 'clanLadder') { // [T156 R10] THE T127 SEAM RECONNECTS — the client face + fetch survived the recovery; the hub handler rebuilds to the client's OWN wire contract ({week, rows:[{cid,tag,name,pts,w,m}], mine:{pts,w,m,rank,week}}). Rows = the weekly war table (the CLAN.war single truth); discovery rides the same rows.
      const wk = isoWeekOf(new Date().toISOString().slice(0, 10))
      const rows = Object.values(SOCIAL.clans).map((c) => {
        if (c.wK !== wk) { c.wK = wk; c.wP = 0; c.wWins = 0; c.wM = 0 } // stale-week lazy reset (the ranked-award precedent, read-path)
        return { cid: c.id, tag: c.tag, name: c.name, pts: c.wP | 0, w: c.wWins | 0, m: c.wM | 0 }
      }).sort((a, b) => b.pts - a.pts || b.w - a.w || b.m - a.m).slice(0, 20)
      const myCid = SOCIAL.memberOf[pid]
      const mi = rows.findIndex((r) => r.cid === myCid)
      chain('soc', { op, week: wk, rows, mine: (myCid && mi >= 0) ? { ...rows[mi], rank: mi + 1, week: wk } : null })
      socialPersist() // the lazy resets may have written
      return
    }
    fail('op')
  })

  // ============================================================
  // §53.4 G4 QUEUE — quick (open bucketing) + rank (RP-tier bucket + widen) + leave.
  // Replies ride the per-socket ordered chain (law 7) on the 'queue' event; a pop
  // redirects the client to ?mp=1&room= (rides the EXISTING join flow — zero new
  // join contract).
  // ============================================================
  socket.on('q', (d) => {
    if (!rateOk(rl, 'q', 6, 1000, Q_SUST[0], Q_SUST[1])) return // §53.6
    d = d || {}
    const op = typeof d.op === 'string' ? d.op : ''
    if (op === 'leave') {
      for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].chain === chain) QUEUE.splice(i, 1)
      chain('queue', { op, ok: true })
      return
    }
    if (op !== 'quick' && op !== 'rank') { chain('queue', { op, err: 'op' }); return }
    const acc = SESSIONS.get(d.tok || '')
    const pid = acc ? acc.pid : (PID_OK(d.pid) ? d.pid : null)
    if (!pid) { chain('queue', { op, err: 'pid' }); return } // no pid → no queue (career-keyed fairness)
    const mode = typeof d.mode === 'string' && CFG.MODES[d.mode] ? d.mode : 'ffa'
    for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].chain === chain) QUEUE.splice(i, 1) // re-queue = move
    if (op === 'quick') {
      const wantBig = d.big === true // [T166] the BIG MAP accordion's queue pref — big/big-only lobby matching
      const bestLobby = bestLobbyOf(wantBig) // fullest idle public lobby preferred — the flag filters (the [T166] law above)
      let best = null
      for (const r of rooms.values()) if (!r.priv && r.match.state === 'idle' && r.players.size < MAX_ROOM && !!r.big === wantBig) if (!best || r.players.size > best.players.size) best = r // [T166] the flag filters BOTH directions
      const room = bestLobby || best || getRoom((wantBig ? 'B' : 'Q') + (++rkCounter)) // open bucketing: join OR create — big queuers get their own B-bucket
      if (wantBig && !room.big) { room.big = true; buildRoomWorld(room, BIG_MAP_POOL[Math.floor(Math.random() * BIG_MAP_POOL.length)]) } // [T166] fresh big bucket → the world REBUILDS from the pool (the setMap §51.2 rebuild idiom)
      if (room.match.state === 'idle') room.match.mode = mode
      chain('queue', { op, room: room.id, mode, big: wantBig })
      return
    }
    if (!RANKED_MODES.includes(mode)) { chain('queue', { op, err: 'mode' }); return } // [T157] the ranked queue is RANKED-MODES-ONLY server truth (§30.1: ffa/gg/practice OUT) — the old handler accepted any CFG.MODES key, so a ranked ffa queue was a silent no-op bucket; the client picker gates, this is the backstop
    // rank: bucket = PUBLIC RP tier (tierIdx over RP_TIERS; §30.8 RP≠MMR stands)
    const rec = CAREER.players[pid]
    const rp = (rec && rec.rk && seasonOf(Date.now()).id === rec.rk.s) ? rec.rk.rp : 0
    QUEUE.push({ op, pid, name: (rec || {}).n || 'PILOT', ti: tierIdx(rp), mode, t0: Date.now(), chain })
    chain('queue', { op, ti: tierIdx(rp), mode, pos: QUEUE.length })
  })


  // --- T2-11: server-measured RTT (sping rides the chain; reply is raw upstream) ---
  socket.on('spong', (d) => {
    if (!p || !d || !Number.isFinite(d.t)) return
    if (!rateOk(rl, 'spong', 30, 1000, SPONG_SUST[0], SPONG_SUST[1])) return // §34.1: EMA write flood guard + §50.2 sustained
    const rtt = Math.max(0, Date.now() - d.t)
    p.srvRtt = p.srvRtt == null ? rtt : Math.round(p.srvRtt * 0.3 + rtt * 0.7)
  })

  // --- T2-9: server-side grenades (§11 validation extension) ---
  socket.on('nade', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    const now = Date.now()
    const reject = (why) => naudit({ t: now, id: p.id, reject: why })
    p.nadeTimes.push(now)
    while (p.nadeTimes.length && now - p.nadeTimes[0] > 1000) p.nadeTimes.shift()
    if (p.nadeTimes.length > NADE_RATE) return reject('rate')
    if (p.nadeLive >= NADE_LIVE) return reject('live')
    if (!p.alive) return reject('dead')
    if (!m || !Array.isArray(m.o) || !Array.isArray(m.d) || m.o.length !== 3 || m.d.length !== 3) return reject('shape')
    const kind = m.kind === 'flash' ? 'flash' : 'frag' // Task 35: flash joins the wire (frag default = Task-33 bots unchanged)
    const o = { x: +m.o[0], y: +m.o[1], z: +m.o[2] }, d = { x: +m.d[0], y: +m.d[1], z: +m.d[2] }
    if (![o.x, o.y, o.z, d.x, d.y, d.z].every(Number.isFinite)) return reject('nan')
    const f = +m.f
    if (!Number.isFinite(f) || f <= 0 || f > FRAG.fuse) return reject('fuse') // shared fuse bound: offline cook math is FRAG.fuse-based for BOTH kinds (weapons.js:242/379)
    const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch
    const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z }
    if (Math.hypot(o.x - eye.x, o.y - eye.y, o.z - eye.z) > 2.5) return reject('origin') // origin gate (§11; throw = eye + 0.4fwd)
    const dl = Math.hypot(d.x, d.y, d.z)
    if (dl < 0.05 || dl > 24) return reject('vel') // full velocity vector (throwVel 16 + upVel 4.5 ≈ 16.6; cook-off ≈ 0.5)
    naudit({ t: now, id: p.id, ok: true, kind, o: [+o.x.toFixed(2), +o.y.toFixed(2), +o.z.toFixed(2)], eyeD: +Math.hypot(o.x - eye.x, o.y - eye.y, o.z - eye.z).toFixed(2) })
    const id = 'nd' + (++nadeCounter)
    room.nades.push({ id, x: o.x, y: o.y, z: o.z, vx: d.x, vy: d.y, vz: d.z, f, owner: p, kind })
    p.nadeLive++
    roomChain(room, 'nadeSpawn', { id, o: [o.x, o.y, o.z].map(v => +v.toFixed(3)), d: [d.x, d.y, d.z].map(v => +v.toFixed(3)), f: +f.toFixed(3), kind })
  })

  // --- T2-10: scorestreaks (modes.js useStreak semantics verbatim, server-owned) ---
  socket.on('streak', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'streak', 4)) return // §34.1: flood safety — score/one-shot gates already own legitimacy
    if (room.match.state !== 'live') return // modes.js:243 gate verbatim
    const i = m ? (m.i | 0) : -1
    if (!(i >= 0 && i <= 2)) return
    const lo = p.streakLoadout || [0, 1, 2]
    const s = CFG.STREAKS[lo[i]] || CFG.STREAKS[i] // [T155 R6] slot→def via the validated loadout (default = the pre-T155 slots)
    if (p.streakUsed[i] || p.score < s.cost) return // one-shot per unlock (modes.js:221-227)
    p.streakUsed[i] = true
    const ev = { i, nm: s.name, by: p.name } // [T155 R6] the def name rides the ev (old clients fall back to the i-keys; absent on old servers)
    if (s.fx === 'uav') {
      room.uavT = s.dur
      roomChain(room, 'streakEv', ev)
    } else if (s.fx === 'ammo') { // [T155 R6] AMMO DROP — the initAmmo reset verbatim, full refill
      if (p.ammo && p.wdefs) for (const [wid, def] of p.wdefs) p.ammo.set(wid, { mag: def.mag, res: def.reserve, rl: 0 })
      roomChain(room, 'streakEv', ev)
    } else if (s.fx === 'stim') { // [T155 R6] STIM RIG — the STIM-kit numbers (heal 50 over 3) so the :1259 tick needs zero new law
      p.healT = s.healTime
      roomChain(room, 'streakEv', ev)
    } else if (s.fx === 'armor') { // [T155 R6] ARMOR DROP — the aegis-kit law, score-earned
      p.shield = Math.min(H.shieldMax, p.shield + s.shield); p.shieldT = s.shieldTime
      roomChain(room, 'streakEv', ev)
    } else if (s.fx === 'strike' || s.fx === 'napalm') {
      const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch
      const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z }
      const f3 = fwdFull(p.st.yaw, p.st.pitch)
      const raw = rayWorld(room.WORLD.colliders, eye, f3, 120) // modes.js:252 rayAABB(o, dir, 120)
      const t = raw < 120 ? raw : 40 // modes.js:253 fallback 40
      for (let wv = 0; wv < (s.waves || 1); wv++) { // [T155 R6] waves: staggered volleys (SWARM ×2, ARTILLERY ×3)
        const dir = { x: Math.cos(Math.random() * Math.PI), z: Math.sin(Math.random() * Math.PI) } // modes.js:254 verbatim
        room.strikes.push({ t: s.delay + wv * 1.4, target: { x: eye.x + f3.x * t, z: eye.z + f3.z * t }, dir, owner: p, def: s })
      }
      roomChain(room, 'streakEv', ev)
    } else {
      const f2 = fwdXZ(p.st.yaw)
      const cx = p.st.pos.x + f2.x * 7, cz = p.st.pos.z + f2.z * 7 // modes.js:261 verbatim
      room.crates.push({ x: cx, z: cz, y: 26, owner: p, def: s }) // modes.js:263 spawn height
      roomChain(room, 'crate', { x: +cx.toFixed(2), z: +cz.toFixed(2), by: p.name })
    }
  })

  // --- T2-10: abilities (modes.js useAbility semantics verbatim, server-owned truth;
  // client still predicts locally for zero-latency feel — law-10 budget absorbs skew) ---
  socket.on('ability', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'ability', 6)) return // §34.1: flood safety — cd/charges gates already own legitimacy
    if (room.match.state !== 'live') return // modes.js:271 gate verbatim
    if (p.abCd > 0 || p.abCh <= 0) return
    const id = m && typeof m.id === 'string' ? m.id : null
    if (id !== p.abId) return
    const ab = ABILITIES.find(a => a.id === id)
    if (!ab) return
    p.abCh--
    if (p.abCd <= 0) p.abCd = ab.cd // modes.js:275 verbatim
    if (id === 'dash') {
      const f2 = fwdXZ(p.st.yaw) // modes.js:278-279: camera fwd flattened, vel += dir*15
      p.st.vel.x += f2.x * 15; p.st.vel.z += f2.z * 15
      p.st.vel.y = Math.max(p.st.vel.y, 1.5)
    } else if (id === 'stim') {
      p.healT = ab.healTime; p.st.stimT = ab.speedTime // modes.js:282 verbatim (stepState speedMult 1.25)
    } else if (id === 'pulse') {
      let found = 0
      for (const q of room.players) {
        if (q === p || !q.alive) continue
        if (room.match.mode !== 'ffa' && q.team === p.team) continue
        if (Math.hypot(q.st.pos.x - p.st.pos.x, q.st.pos.z - p.st.pos.z) < ab.radius) found++ // modes.js:287
      }
      if (p.__chain) p.__chain('pulseEv', { found }) // owner-only (offline pulse is a private read)
    }
  })

  // T55 §39.4: emote taunt — validated vs cos.EMOTES (shared pure module), rate-capped via
  // the §34 sweep, broadcast to OTHERS via the fired-pattern loop (the sender shows locally
  // before emitting; 'none'/garbage = silent drop; spectators don't taunt — §25.4).
  socket.on('emote', (m) => {
    if (!p || !p.joined) return
    const room = rooms.get(p.roomId)
    if (!room) return
    if (!rateOk(rl, 'emote', 2, 2000)) return // §34.1: legal cadence 1/1.5s sits under the cap; 1→N broadcast amplifier covered
    const id = m && typeof m.id === 'string' ? m.id : null
    const e = id ? cos.EMOTES.find(x => x && x.id === id) : null
    if (!e || e.id === 'none') return
    for (const q of room.players) if (q.joined && q !== p && q.__chain) q.__chain('emote', { id: e.id, n: p.name })
  })

  // §17: pong crosses the chain once — full-RTT semantics at the client
  // §50.5: ping structural gate — rateOk precedes everything (floods die at the gate);
  // schema-fail rejects silently WITHOUT a violation (validation ≠ rate abuse)
  socket.on('ping', (d) => {
    if (!rateOk(rl, 'ping', 20, 1000, PING_SUST[0], PING_SUST[1])) return
    if (!d || typeof d !== 'object' || Array.isArray(d) || !Number.isFinite(d.t) || Object.keys(d).length > 4) return // plain object + finite t + ≤4 own keys
    const j = JSON.stringify(d)
    if (j && j.length <= 128) chain('pong', d) // serialized ≤128 before the raw pong echo
  })

  // T49 §33: season ladder — READ-ONLY top-list over the career store (no room state, no join,
  // no mutation: CAREER is only read here, CAREER_DIRTY stays false). Unguarded like ping/status.
  socket.on('lb', (d) => {
    try {
      if (!rateOk(rl, 'lb', 4, 1000, LB_SUST[0], LB_SUST[1])) return // §34.1: silent sweep — the ladder iterates the whole career store, so query floods are a CPU vector + §50.2 sustained
      d = d || {}
      const cur = seasonOf(Date.now()).id
      const ask = PID_OK(d.pid) ? d.pid : null // §28.3 law: invalid = absent — an anonymous query ranks nobody
      const n = Math.min(Math.max(1, (d.n | 0) || 25), 100) // clamp 1..100, default 25 (n:0/NaN → |0 → 0 → falsy → 25)
      const all = Object.entries(CAREER.players)
        .filter(([, r]) => !r.ac && r.rk && r.rk.s === cur) // rollover-on-award law (§30.5) + §50.3 rung 3 EXCLUSION: ac-flagged pids are filtered from rows AND self-row
        .map(([pid, r]) => ({ pid, n: r.n, rp: r.rk.rp, tier: tierOf(r.rk.rp), pk: r.rk.pk, m: r.rk.m, w: r.rk.w }))
        .sort((a, b) => b.rp - a.rp || b.pk - a.pk || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0)) // deterministic: RP desc → peak desc → name asc
      const row = (r, rank) => ({ rank, n: r.n, tier: r.tier, rp: r.rp, pk: r.pk, m: r.m, w: r.w, ...(ask && r.pid === ask ? { you: true } : {}) }) // PRIVACY LAW: rows carry NO pid — identity on the wire is the name only; `you` is stamped per-request
      const rows = all.slice(0, n).map((r, i) => row(r, i + 1))
      let self = null
      if (ask && !rows.some(r => r.you)) { // requester is pid-identified and outside the top slice → best-effort own row
        const i = all.findIndex(r => r.pid === ask)
        if (i !== -1) self = row(all[i], i + 1)
      }
      chain('lb', { s: cur, endsAt: seasonOf(Date.now()).endsAt, rows, self, ts: Date.now() })
    } catch (e) { console.error('[room] lb error:', e && e.message) }
  })

  socket.on('status', (cb) => {
    if (!rateOk(rl, 'status', 4, 1000, STATUS_SUST[0], STATUS_SUST[1])) return // §34.1: O(rooms×players) JSON per query — silent sweep above 4/s (probes poll sparsely) + §50.2 sustained
    const s = {
      port: PORT, delay: DELAY, jitter: JITTER, hz: 60, snapEvery: SNAP_EVERY,
      rooms: [...rooms.values()].map(r => ({ id: r.id, size: r.players.size, tick: r.tick, match: { ...r.match }, flags: r.flags.map(f => ({ id: f.id, owner: f.owner, prog: +f.prog.toFixed(2) })), uav: +r.uavT.toFixed(1), nades: r.nades.length, strikes: r.strikes.length, bombs: r.bombs.length, crates: r.crates.length,
        hill: { ...r.hill }, tags: r.tags.length, snd: r.match.snd ? { ...r.match.snd } : null })), // T1-1 probe surface
      players: [...rooms.values()].reduce((n, r) => n + r.players.size, 0),
      rtts: [...rooms.values()].flatMap(r => [...r.players].filter(q => q.srvRtt != null).map(q => ({ n: q.name, srvRtt: q.srvRtt }))), // T2-11 probe surface
      nadeAudit: nadeAudit.slice(-20), // Task 35 probe surface
      audit: fireAudit.slice(-20),
    }
    if (CAP_ON) s.cap = capMetrics() // SS13 (MP-4): only under IRON_CAP=1
    if (CAP_ON) s.sweep = { n: SWEEP.n, by: { ...SWEEP.by } } // T50 §34: sweep counters — same IRON_CAP=1 gating law, production bytes unchanged
    if (CAP_ON) s.ac = { kicks: AC_KICKS.n, excl: Object.values(CAREER.players).filter(r => r.ac).length } // §50.3: sanction reporting (SS13 law)
    if (typeof cb === 'function') cb(s)
  })

  socket.on('disconnect', () => {
    console.log(`[room] left: ${socket.id}`)
    if (!p) return
    const room = rooms.get(p.roomId)
    if (room) room.players.delete(p)
    if (room && room.specs) room.specs.delete(p) // T41 §25: spectator cleanup (no token → no held state; read-only session ends)
    p.joined = false; p.__chain = null
    if (room) broadcastRoster(room) // T2-12: host migration + lobby accounting
    if (p.token && !rl.vio.kicked) { // §50.3: a kicked session holds NO reconnect state
      // §4: hold state 10 s for reconnect, then drop
      const purgeTimer = setTimeout(() => {
        held.delete(p.token)
        if (room) { room.players.delete(p); broadcastRoster(room) }
        console.log(`[room] held state dropped: ${p.name}`)
      }, RECONNECT_MS)
      held.set(p.token, { p, roomId: p.roomId, purgeTimer })
    }
    if (p.pid) careerPersist() // T44 §28.3: save cadence = match end + disconnect (no per-tick IO)
    for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].chain === chain) QUEUE.splice(i, 1) // §53.4: disconnect removes queue membership
  })

  socket.on('error', (e) => console.error(`[room] socket error (${socket.id}):`, e))
})

httpServer.listen(PORT, () => {
  console.log(`[room] ironsight-room (authoritative, MP-3.1 residuals) running on port ${PORT} (path '/' | sim 60Hz self-correcting | snap 1/${SNAP_EVERY} | fold ${FOLD} | rewind ring ${HIST} | rooms+modes | nades+flash+streaks+abilities+srtt+host | fired-reveal | spectate §25 | private-lobbies §29 | ac §50 sustained+sanctions+origin | per-room worlds §51 | knobs §52 | accounts+eco+social+queue §53 | vars §55)`)
})
process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)) })
