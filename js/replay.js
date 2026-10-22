// IRONSIGHT — replay.js : transform replay — record / pack / retain / play back
// T1-4 build item 2 (Task 42) — spec §26. Client-side only: a replay is a new CONSUMER
// of the record, exactly as a spectator (§25) is a new consumer of the stream. Zero wire,
// zero server. No determinism dependency: playback re-drives RECORDED states (transform
// stream, the Fortnite model — SPIKE_REPLAY verdict (b)); nothing re-simulates, so the
// spike's law-3 wall-clock purge stays a precondition of item 3 only.
//
// Layers:
//   capture  — Replay.onWire(ev, args) fed by mp.js's single existing socket.onAny line
//              (§26.1: ONE capture point, no per-handler edits). Byte-truth: the received
//              payload serialized verbatim + recv ms. Per-match segmentation on the
//              'match' event (ev:'start' → reset; ev:'end' → pack+persist).
//   pack     — IRRP v1 binary (§26.2 exact table). Pure ArrayBuffer functions —
//              node/bun probeable (no DOM/THREE/socket deps in this file at all).
//   retain   — IndexedDB ironsight.replay.v1 / store 'matches' (keyPath id = startedAt
//              epoch ms); 10-minute wall-clock prune on write (STORAGE domain — not sim).
//   playback — makePlayback(unpacked): binary-search + lerp pos + lerpAngle yaw
//              (formula parity with mp.js:393 — probe-asserted). Pure; the viewer
//              (main.js) owns meshes/camera/HUD and drives the playhead.

// F-bit parity with mp.js:22 (probe asserts value equality — do not edit one side alone)
export const RF = { CROUCH: 1, SLIDE: 2, GROUNDED: 4, SPRINT: 8 };

const MAGIC = 0x50525249; // 'IRRP' LE
const VERSION = 1;
const RETENTION_MS = 10 * 60 * 1000; // §26.3: 10-minute retention
const SNAP_BUDGET = 32 * 1024 * 1024; // §26.1: 10-min @12p JSON ≈ 28.5 MB + headroom
const EV_BUDGET = 4 * 1024 * 1024;    // events measured 1–2 orders below transforms (spike)
const EXCLUDED = new Set(['pong', 'sping']); // rtt bookkeeping, not replay content

// shortest-arc yaw lerp — formula parity with mp.js:393 (probe asserts source equality)
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

const clampU = (v, max) => Math.max(0, Math.min(max, Math.round(v || 0)));
const enc = new TextEncoder();

// ---------------- capture (runtime singleton; inert unless armed) ----------------
const R = {
  armed: false,
  startedAt: 0,      // epoch ms at match ev:'start' (0 = no per-match record began)
  recvStart: 0,      // performance.now() at the same moment (tRel basis)
  meta: { map: 'outpost', mode: '', room: '' },
  snapRing: [], evRing: [],
  snapBytes: 0, evBytes: 0,
  lastPacked: null,  // {id, startedAt, durationMs, map, mode, room, bin} — in-memory fallback for the viewer
};

function resetRings() {
  R.snapRing = []; R.evRing = []; R.snapBytes = 0; R.evBytes = 0;
  R.startedAt = 0; R.recvStart = 0;
}

function pushRing(ring, j, extra, budget, bytesKey) {
  const t = performance.now();
  ring.push({ t, j, ...extra });
  R[bytesKey] += j.length + 24; // approx bytes (ASCII wire JSON; utf8 names bounded by server)
  while (R[bytesKey] > budget && ring.length > 1) { // evict OLDEST (trailing retention window)
    const dropped = ring.shift();
    R[bytesKey] -= dropped.j.length + 24;
  }
}

export const Replay = {
  get armed() { return R.armed; },
  get recording() { return R.armed && R.startedAt > 0; },
  get elapsedMs() { return R.armed && R.startedAt > 0 ? Date.now() - R.startedAt : 0; }, // [T146] the live REC face — startedAt is epoch ms (replay.js:45), so elapsed rides Date.now, not performance.now
  get lastPacked() { return R.lastPacked; }, // viewer fallback + probe surface (§26.3)

  // mp.js initMP opts.replay — flag OFF leaves the module fully inert (§26.5)
  setMapLabel(map) { if (R.armed && typeof map === 'string' && map) R.meta.map = map; }, // §51.3: additive label (roster map rides the wire)

  arm(flag, meta) {
    R.armed = !!flag;
    R.meta = { map: 'outpost', mode: '', room: '', ...(meta || {}) };
    resetRings();
    if (!flag) R.lastPacked = null;
  },

  state() {
    return { armed: R.armed, recording: this.recording, snapN: R.snapRing.length, evN: R.evRing.length, snapBytes: R.snapBytes, evBytes: R.evBytes };
  },

  // THE single capture point (§26.1). mp.js: socket.onAny((ev, ...args) => { ...; if (Replay.armed) Replay.onWire(ev, args); })
  onWire(ev, args) {
    if (!R.armed) return;
    if (EXCLUDED.has(ev)) return;
    const p = args && args[0];
    if (ev === 'match' && p && (p.ev === 'start' || p.ev === 'end')) {
      if (p.ev === 'start') {
        resetRings();
        R.startedAt = Date.now();
        R.recvStart = performance.now();
        R.meta.mode = p.md || R.meta.mode;
      } else this._endSegment();
      return;
    }
    if (ev === 'disconnect') { this._endSegment(); return; } // mid-match disconnect persists a partial record
    if (ev === 'snap') {
      if (p) pushRing(R.snapRing, JSON.stringify(p), null, SNAP_BUDGET, 'snapBytes');
    } else if (p != null) {
      pushRing(R.evRing, JSON.stringify(p), { name: ev }, EV_BUDGET, 'evBytes');
    }
  },

  _endSegment() {
    if (!R.startedAt || !R.snapRing.length) { resetRings(); return; } // joined mid-match: no per-match record began (§26.1)
    try {
      const recv0 = R.recvStart;
      const snaps = R.snapRing.map(r => { const s = JSON.parse(r.j); s.recvT = r.t; return s; }); // recv time rides beside the parsed wire object (pack basis for tRel)
      const events = R.evRing.map(r => ({ t: r.t, name: r.name, p: JSON.parse(r.j) }));
      const rec = packRecord({ startedAt: R.startedAt, map: R.meta.map, mode: R.meta.mode, room: R.meta.room }, snaps, events, recv0);
      R.lastPacked = rec;
      idbPut(rec).then(() => idbPrune()).catch(() => console.warn('[replay] persist unavailable (best-effort by contract §26.3)'));
    } catch (e) { console.warn('[replay] pack failed', e && e.message); }
    resetRings();
  },

  // G-2 killcam: pack the TRAILING ms window of the LIVE rings WITHOUT mutating them
  // (the full match record still packs independently at _endSegment — this is a pure
  // read). Returns { rec, refOf } — refOf maps the wire actor id → the IRRP name-table
  // ref via the SAME construction as packRecord (first-appearance order). null when
  // insufficient window (just (re)joined / rings shorter than the request).
  packWindow(ms) {
    if (!this.recording || !R.snapRing.length) return null;
    const from = performance.now() - ms;
    const snaps = R.snapRing.filter(r => r.t >= from).map(r => { const s = JSON.parse(r.j); s.recvT = r.t; return s; });
    if (snaps.length < 2) return null;
    const events = R.evRing.filter(r => r.t >= from).map(r => ({ t: r.t, name: r.name, p: JSON.parse(r.j) }));
    const recv0 = snaps[0].recvT;
    const rec = packRecord({ startedAt: Date.now(), map: R.meta.map, mode: R.meta.mode, room: R.meta.room }, snaps, events, recv0);
    const ids = new Map(); // id → ref — mirror packRecord's construction EXACTLY
    for (const s of snaps) for (const a of (s.pl || [])) if (!ids.has(a.id)) ids.set(a.id, ids.size);
    return { rec, refOf: id => (ids.has(id) ? ids.get(id) : -1) };
  },
};

// ---------------- IRRP v1 pack/unpack (§26.2 exact table) ----------------
// Per-actor record = 44 B: u8 nameRef, f32 x,y,z, f32 vx,vy,vz, i16 yaw×1000,
// i16 pitch×1000 (EXACT — wire is toFixed(3)), u8 f, u8 hp, u8 sh, u16 k, u16 de,
// u16 s, u8 al, u8 tm, u8 st, i16 rt (−1 allowed), u8 g (0xFF = undefined).
// Snap header: u16 dtMs (0 → f64 absolute follows: both readings yield the same true
// tRel), u8 actorCount, u16 mLen + m-block JSON (mode extensions evolve additively).
// Event: u16 dtMs (same escape), u8 nameLen + utf8, u16 payloadLen + utf8 JSON.

function sizeOfRecord(meta, snaps, events, recv0) {
  const dtBytes = tRel => { const d = Math.max(0, Math.round(tRel)); return d > 0 && d < 65536 ? 2 : 10; }; // u16 delta, or escape (u16 0 + f64 abs) — must mirror wDt exactly
  // G-2 fix (v1.79): the map is id → TABLE INDEX. It was id → name STRING and the row
  // writer packed u8(nameString) — setUint8(NaN)→0 silently collapsed EVERY actor of a
  // multi-actor record to ref 0 (byRef 1 entry, one mesh, wrong lerp prevs). Single-actor
  // synthetic probes never saw it (0 == the only index). The killcam locates the killer
  // by ref — the collapse made that impossible. Table order = first-appearance order.
  let names = new Map(); // id → table index (stable per actor across snaps; derived from wire pl[].id)
  const nameList = [];   // table order == unpack's names[] index
  for (const s of snaps) for (const a of (s.pl || [])) if (!names.has(a.id)) { names.set(a.id, nameList.length); nameList.push(a.n == null ? '' : String(a.n)); }
  let bytes = 4 + 1 + 1 + 2 + 8 + 8 + 4 + 4;
  for (const n of nameList) bytes += 1 + 2 + enc.encode(n).length;
  bytes += 1 + enc.encode(meta.map || '').length + 1 + enc.encode(meta.mode || '').length;
  for (const s of snaps) bytes += dtBytes(s.recvT - recv0) + 1 + 2 + enc.encode(JSON.stringify(s.m || {})).length + 44 * (s.pl || []).length;
  for (const e of events) bytes += dtBytes(e.t - recv0) + 1 + enc.encode(e.name).length + 2 + enc.encode(JSON.stringify(e.p)).length;
  return { bytes, names, nameList };
}

export function packRecord(meta, snaps, events, recv0) {
  const { bytes, names, nameList } = sizeOfRecord(meta, snaps, events, recv0);
  const buf = new ArrayBuffer(bytes);
  const dv = new DataView(buf);
  let o = 0;
  const u8 = v => { dv.setUint8(o, v); o += 1; };
  const u16 = v => { dv.setUint16(o, v, true); o += 2; };
  const u32 = v => { dv.setUint32(o, v, true); o += 4; };
  const f32 = v => { dv.setFloat32(o, v, true); o += 4; };
  const f64 = v => { dv.setFloat64(o, v, true); o += 8; };
  const i16 = v => { dv.setInt16(o, v, true); o += 2; };
  const wLenStr = (s, lenBytes) => {
    const b = enc.encode(s == null ? '' : String(s));
    if (lenBytes === 2) u16(b.length); else u8(Math.min(255, b.length));
    new Uint8Array(buf, o, b.length).set(b); o += b.length;
  };
  const wDt = tRel => { // u16 delta; 0 = escape → f64 absolute (identical value on read-back)
    const d = Math.max(0, Math.round(tRel));
    if (d > 0 && d < 65536) { u16(d); } else { u16(0); f64(tRel); }
  };

  u32(MAGIC); u8(VERSION); u8(0); u16(names.size);
  for (const n of nameList) { u8(0); wLenStr(n, 2); } // u8 ref == table index (self-checking)
  f64(meta.startedAt); f64(snaps.length ? Math.max(0, snaps[snaps.length - 1].recvT - recv0) : 0);
  wLenStr(meta.map || '', 1); wLenStr(meta.mode || '', 1);
  u32(snaps.length); u32(events.length);

  for (const s of snaps) {
    wDt(s.recvT - recv0);
    const pl = s.pl || [];
    u8(pl.length); wLenStr(JSON.stringify(s.m || {}), 2);
    for (const a of pl) {
      const ref = names.get(a.id) ?? 0; // G-2 fix: numeric table index (id → index map) — was the NAME string (u8 NaN→0 collapse)
      u8(ref);
      f32(+a.x || 0); f32(+a.y || 0); f32(+a.z || 0);
      f32(+a.vx || 0); f32(+a.vy || 0); f32(+a.vz || 0);
      i16(Math.max(-32768, Math.min(32767, Math.round((+a.yaw || 0) * 1000)))); // signed: yaw ∈ [−π,π] → ±3142
      i16(Math.max(-32768, Math.min(32767, Math.round((+a.pitch || 0) * 1000))));
      u8(a.f || 0); u8(clampU(a.hp, 255)); u8(clampU(a.sh, 255));
      u16(clampU(a.k, 65535)); u16(clampU(a.de, 65535)); u16(clampU(a.s, 65535));
      u8(a.al ? 1 : 0); u8(a.tm || 0); u8(clampU(a.st, 255));
      i16(a.rt == null ? -1 : Math.max(-1, Math.min(32767, Math.round(a.rt))));
      u8(typeof a.g === 'number' ? clampU(a.g, 254) : 0xff);
    }
  }
  for (const e of events) {
    wDt(e.t - recv0);
    wLenStr(e.name, 1); wLenStr(JSON.stringify(e.p), 2);
  }
  const durationMs = snaps.length ? Math.max(0, snaps[snaps.length - 1].recvT - recv0) : 0;
  return { id: meta.startedAt, startedAt: meta.startedAt, durationMs, map: meta.map, mode: meta.mode, room: meta.room, bin: buf };
}

export function unpackRecord(buf) {
  const dv = new DataView(buf);
  let o = 0;
  const u8 = () => dv.getUint8(o++);
  const u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; };
  const u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const f32 = () => { const v = dv.getFloat32(o, true); o += 4; return v; };
  const f64 = () => { const v = dv.getFloat64(o, true); o += 8; return v; };
  const i16 = () => { const v = dv.getInt16(o, true); o += 2; return v; };
  const rLenStr = lenBytes => { const n = lenBytes === 2 ? u16() : u8(); const s = new TextDecoder().decode(new Uint8Array(buf, o, n)); o += n; return s; };
  const rDt = () => { const d = u16(); return d === 0 ? f64() : d; };

  if (u32() !== MAGIC) throw new Error('IRRP: bad magic');
  const version = u8(); if (version !== VERSION) throw new Error('IRRP: version ' + version);
  u8(); // flags
  const nameCount = u16();
  const names = [];
  for (let i = 0; i < nameCount; i++) { u8(); names.push(rLenStr(2)); }
  const startedAt = f64(); const durationMs = f64();
  const map = rLenStr(1); const mode = rLenStr(1);
  const snapCount = u32(); const eventCount = u32();

  const snaps = [];
  for (let i = 0; i < snapCount; i++) {
    const t = rDt(); const n = u8(); const m = JSON.parse(rLenStr(2));
    const pl = [];
    for (let j = 0; j < n; j++) {
      const ref = u8();
      const x = f32(), y = f32(), z = f32(), vx = f32(), vy = f32(), vz = f32();
      const yaw = i16() / 1000, pitch = i16() / 1000;
      const f = u8(), hp = u8(), sh = u8(), k = u16(), de = u16(), s = u16();
      const al = u8(), tm = u8(), st = u8(), rt = i16(), g = u8();
      pl.push({ ref, x, y, z, vx, vy, vz, yaw, pitch, f, hp, sh, k, de, s, al, tm, st, rt, g: g === 0xff ? undefined : g });
    }
    snaps.push({ t, m, pl });
  }
  const events = [];
  for (let i = 0; i < eventCount; i++) {
    const t = rDt(); const name = rLenStr(1); const p = JSON.parse(rLenStr(2));
    events.push({ t, name, p });
  }
  return { startedAt, durationMs, map, mode, room: '', names, snaps, events };
}

// ---------------- playback engine (pure; §26.4) ----------------
export function makePlayback(rec) {
  const snaps = rec.snaps, events = rec.events, names = rec.names;
  const ts = snaps.map(s => s.t);

  function bracket(tMs) { // greatest i with ts[i] <= tMs (clamped to range)
    if (!ts.length) return -1;
    if (tMs <= ts[0]) return 0;
    if (tMs >= ts[ts.length - 1]) return ts.length - 1;
    let lo = 0, hi = ts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ts[mid] <= tMs) lo = mid; else hi = mid; }
    return lo;
  }

  function playbackAt(tMs) {
    if (!snaps.length) return { t: 0, m: null, actors: [], byRef: new Map() };
    const i = bracket(tMs);
    const a = snaps[i];
    if (i >= snaps.length - 1 || tMs <= a.t) return snapOut(a, tMs);
    const b = snaps[i + 1];
    const al = b.t > a.t ? (tMs - a.t) / (b.t - a.t) : 0; // §26.4: same lerp shape as mp.js frame()
    const byRef = new Map();
    for (const row of b.pl) byRef.set(row.ref, row);
    const actors = [];
    for (const row of b.pl) {
      const prev = a.pl.find(r => r.ref === row.ref);
      const x = prev ? prev.x + (row.x - prev.x) * al : row.x;
      const y = prev ? prev.y + (row.y - prev.y) * al : row.y;
      const z = prev ? prev.z + (row.z - prev.z) * al : row.z;
      const yaw = prev ? lerpAngle(prev.yaw, row.yaw, al) : row.yaw;
      const pitch = prev ? prev.pitch + (row.pitch - prev.pitch) * al : row.pitch;
      actors.push(actorOut(row, x, y, z, yaw, pitch));
    }
    return { t: tMs, m: b.m, actors, byRef };
  }

  function snapOut(s, tMs) {
    return { t: tMs, m: s.m, actors: s.pl.map(r => actorOut(r, r.x, r.y, r.z, r.yaw, r.pitch)), byRef: new Map(s.pl.map(r => [r.ref, r])) };
  }

  function actorOut(row, x, y, z, yaw, pitch) {
    return { ref: row.ref, name: names[row.ref] || ('P' + row.ref), x, y, z, yaw, pitch,
      vx: row.vx, vy: row.vy, vz: row.vz, f: row.f, hp: row.hp, sh: row.sh,
      k: row.k, de: row.de, s: row.s, al: row.al, tm: row.tm, st: row.st, rt: row.rt, g: row.g };
  }

  function eventsBetween(tPrev, tNow) {
    return events.filter(e => e.t > tPrev && e.t <= tNow);
  }

  return { durationMs: rec.durationMs, names, playbackAt, eventsBetween, snapCount: snaps.length, eventCount: events.length };
}

// ---------------- IndexedDB retention (§26.3) — best-effort, node-safe ----------------
function idbOpen() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no-idb'));
    const q = indexedDB.open('ironsight.replay.v1', 1);
    q.onupgradeneeded = () => { const db = q.result; if (!db.objectStoreNames.contains('matches')) db.createObjectStore('matches', { keyPath: 'id' }); };
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error || new Error('idb-open'));
  });
}

export async function idbPut(rec) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('matches', 'readwrite');
    tx.objectStore('matches').put(rec);
    tx.oncomplete = () => { db.close(); res(true); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}

export async function idbPrune(now) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const dropped = [];
    const tx = db.transaction('matches', 'readwrite');
    const cq = tx.objectStore('matches').openCursor();
    cq.onsuccess = () => {
      const c = cq.result;
      if (!c) return;
      if ((now || Date.now()) - c.value.startedAt > RETENTION_MS) { dropped.push(c.value.id); c.delete(); }
      c.continue();
    };
    tx.oncomplete = () => { db.close(); res(dropped); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}

export async function idbLatest() {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('matches', 'readonly');
    const rq = tx.objectStore('matches').getAll();
    rq.onsuccess = () => { db.close(); const all = rq.result || []; res(all.length ? all.reduce((a, b) => (b.id > a.id ? b : a)) : null); };
    rq.onerror = () => { db.close(); rej(rq.error); };
  });
}

export async function idbGet(id) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('matches', 'readonly');
    const rq = tx.objectStore('matches').get(id);
    rq.onsuccess = () => { db.close(); res(rq.result || null); };
    rq.onerror = () => { db.close(); rej(rq.error); };
  });
}

export const REPLAY_CONSTANTS = { RETENTION_MS, SNAP_BUDGET, EV_BUDGET, MAGIC, VERSION };
