// ============================================================
// IRONSIGHT — remotesfx.js : hotlinked real-SFX layer [T117][T119]
// Source repo: https://huggingface.co/spaces/ideations3/sfx
// (GLOBAL WORK sfx space — per-weapon fire/reload, footsteps,
// impacts, whizbys, grenade foley, melee, explosions).
// [T119] completion pass: staged bolt-reload trios (kar98k/Enfield
// start/loop/end), shotgun pump rack, g43 third fire variant, and the
// shared library grew — equip (wpnArm), grenade pin, mantle
// (Dive_Over_Wall), metal footsteps/lands, damage lands, destruct
// crumble, surface ricochets, pickups (health/ammo), UI
// hover/select, distant explosions, two more throw foleys.
//
// LAWS:
// (1) ZERO-LOAD PARITY — no fetch at boot, no await on the hot
//     path: a decoded clip plays THIS call; a pending/failed one
//     returns false and the caller's procedural synth voice fires
//     instead (the game never waits on the network for audio).
// (2) GRACEFUL DEGRADE — a failed clip is remembered with a 60 s
//     retry cooldown; the synth voice remains the permanent
//     fallback (offline play, HF down, CORS block — all safe).
// (3) ZERO IMPORTS — audio.js injects the AudioContext via
//     setCtx() and routes the destination node (sfxGain or a
//     spatial() chain); this module owns ONLY the fetch/decode/
//     cache/play plumbing + the MAP single truth.
// (4) VARIANT ROTATION — sets pick a random variant per call so
//     repeated fire doesn't machine-gun the same sample; every
//     variant in a set is kicked for fetch on first use.
// ============================================================
const BASE = 'https://huggingface.co/spaces/ideations3/sfx/resolve/main/';

// per-weapon MAP — WW2-flavored repo voice per OUR roster id (14 weapons).
// fire: rotated variants · reload: empty-mag take · reloadNE: not-empty take
// (the repo ships both takes where available — weapons.reload() passes the flag).
export const MAP = {
  vanguard: { fire: ['weapons/MP44/wpnfire_mp44_plyr_pnchy_ed3.wav', 'weapons/MP44/wpnfire_mp44_plyr_pnchy_ed4.wav'], reload: 'weapons/MP44/mp44_reload.wav', reloadNE: 'weapons/MP44/mp44_reload_not_empty.wav' },
  sabre:    { fire: ['weapons/g43/wpnfire_g43_plyr_blnc2.wav', 'weapons/g43/wpnfire_g43_plyr_blnc3.wav', 'weapons/g43/mrk_g43_1g2.wav', 'weapons/g43/mrk_g43_1g3.wav'], reload: 'weapons/g43/g43_rld.wav' },
  raider:   { fire: ['weapons/m1carbine/m1carbine_shoot02.wav', 'weapons/m1carbine/mrk_m1carbine_1.wav'], reload: 'weapons/m1carbine/m1carbine_reload.wav', reloadNE: 'weapons/m1carbine/m1carbine_reload_not_empty.wav' },
  wasp:     { fire: ['weapons/mp40/mp40fire1.wav', 'weapons/mp40/wpnfire_mp40_y7.wav', 'weapons/mp40/wpnfire_mp40_y8.wav'], reload: 'weapons/mp40/mp40_reload.wav', reloadNE: 'weapons/mp40/mp40_reload_not_empty.wav' },
  hornet:   { fire: ['weapons/thompson/wpnfire_thompson_plyr02.wav', 'weapons/thompson/wpnfire_thompson_plyr03.wav'], reload: 'weapons/thompson/thompson_reload.wav', reloadNE: 'weapons/thompson/Thompson_reload_not_empty.wav' },
  mauler:   { fire: ['weapons/Shotgun/wpnfire_shotgun1.wav'], shell: 'weapons/Shotgun/wpnfoley_shotgun_load3.wav', pump: 'weapons/Shotgun/mrk_12ga_shotgun_pump1.wav' },
  breacher: { fire: ['weapons/Shotgun/wpnfire_shotgun1.wav'], shell: 'weapons/Shotgun/wpnfoley_shotgun_load3.wav', pump: 'weapons/Shotgun/mrk_12ga_shotgun_pump1.wav' },
  judge:    { fire: ['weapons/Shotgun/wpnfire_shotgun1.wav'], shell: 'weapons/Shotgun/wpnfoley_shotgun_load3.wav', pump: 'weapons/Shotgun/mrk_12ga_shotgun_pump1.wav' },
  // [T119] bolt rifles reload in STAGES — the repo ships the takes: start
  // (bolt open/mag out) → loop (rounds in) → end (bolt closed/rack). The
  // staged synth ticks (startReloadSounds 0/1/2) ride these via R.stage();
  // a full take would double-play over the staged rhythm.
  longshot: { fire: ['weapons/kar98k/wpnfire_k98_1b.wav', 'weapons/kar98k/wpnfire_k98_2b.wav'], stages: ['weapons/kar98k/kar98_reload_start.wav', 'weapons/kar98k/kar98_reload_loop.wav', 'weapons/kar98k/kar98_reload_end.wav'] },
  longbow:  { fire: ['weapons/Enfield/wpnfire_enfield5.wav', 'weapons/Enfield/wpnfire_enfield6.wav'], stages: ['weapons/Enfield/enfield_reload_start.wav', 'weapons/Enfield/enfield_reload_loop.wav', 'weapons/Enfield/enfield_reload_end.wav'] },
  ripper:   { fire: ['weapons/bar/mrk_bar_01.wav', 'weapons/bar/mrk_bar_02.wav'], reload: 'weapons/bar/bar_reload.wav', reloadNE: 'weapons/bar/bar_reload_not_empty.wav' },
  vulture:  { fire: ['weapons/Bren/wpnfire_bren_y1.wav', 'weapons/Bren/wpnfire_bren_y2.wav'], reload: 'weapons/Bren/Bren_reload.wav', reloadNE: 'weapons/Bren/Bren_reload_not_empty.wav' },
  p9:       { fire: ['weapons/colt/Colt45_01.wav', 'weapons/colt/Colt45_02.wav'], reload: 'weapons/colt/colt45_reload.wav', reloadNE: 'weapons/colt/colt45_reload_not_empty.wav' },
  sting:    { fire: ['weapons/luger/wpnfire_Luger_plyr_blnc2.wav', 'weapons/luger/wpnfire_Luger_plyr_blnc3.wav'], reload: 'weapons/luger/luger_reload.wav', reloadNE: 'weapons/luger/luger_reload_not_empty.wav' },
};

// shared non-weapon sets (rotated) — our maps are stone/masonry family.
// [T119] the library grew to cover every game audio point the repo has a
// take for: equip draw, grenade pin, mantle climb, metal surfaces,
// damage lands, destruct crumble, ricochets, pickups, UI, distant booms.
export const SHARED = {
  explo:   ['Explosions/grenade_explo01.wav', 'Explosions/grenade_explo02.wav', 'Explosions/grenade_explo03.wav'],
  exploD:  ['Explosions/explo_distant01.wav', 'Explosions/explo_distant02.wav', 'Explosions/explo_distant03.wav'],
  step:    ['Footsteps/foot_stone01.wav', 'Footsteps/foot_stone02.wav', 'Footsteps/foot_stone03.wav', 'Footsteps/foot_stone04.wav', 'Footsteps/foot_stone05.wav', 'Footsteps/foot_stone06.wav'],
  stepM:   ['Footsteps/foot_metal01.wav', 'Footsteps/foot_metal02.wav', 'Footsteps/foot_metal03.wav', 'Footsteps/foot_metal04.wav'],
  land:    ['Footsteps/land_stone.wav', 'Footsteps/land_dirt_big1.wav', 'Footsteps/land_dirt_big2.wav', 'Footsteps/land_dirt_big3.wav'],
  landM:   ['Footsteps/land_metal.wav'],
  landDmg: ['Footsteps/land_damage01.wav', 'Footsteps/land_damage02.wav'],
  bounce:  ['weapons/grenade/Grenade_Bounce_Stone01.wav', 'weapons/grenade/Grenade_Bounce_Stone02.wav', 'weapons/grenade/Grenade_Bounce_Stone03.wav', 'weapons/grenade/Grenade_Bounce_Stone04.wav', 'weapons/grenade/Grenade_Bounce_Stone05.wav'],
  throwG:  ['weapons/grenade/US_grenade_throw.wav', 'weapons/grenade/german_grenade_throw.wav', 'weapons/grenade/german_grenade_throw02.wav', 'weapons/grenade/german_grenade_throw03.wav'],
  pin:     ['weapons/grenade/US_Grenade_Pin.wav'],
  swing:   ['weapons/melee/melee_swing01.wav', 'weapons/melee/melee_swing03.wav'],
  stab:    ['weapons/melee/melee_hit01.wav', 'weapons/melee/melee_hit02.wav'],
  whiz:    ['weapons/whizbys/mrk_whyzby1b.wav', 'weapons/whizbys/mrk_whyzby2b.wav', 'weapons/whizbys/mrk_whyzby3b.wav', 'weapons/whizbys/mrk_whyzby4b.wav', 'weapons/whizbys/mrk_whyzby5b.wav', 'weapons/whizbys/mrk_whyzby6b.wav'],
  masonry: ['weapons/impact/Impact_Masonry_01.wav', 'weapons/impact/Impact_Masonry_05.wav', 'weapons/impact/Impact_Masonry_09.wav', 'weapons/impact/Impact_Masonry_13.wav', 'weapons/impact/Impact_Masonry_17.wav', 'weapons/impact/Impact_Masonry_21.wav'],
  metal:   ['weapons/impact/Impact_Metal_A01.wav', 'weapons/impact/Impact_Metal_A02.wav', 'weapons/impact/Impact_Metal_A03.wav', 'weapons/impact/Impact_Metal_A04.wav'],
  ricoS:   ['weapons/ricochet/mrk_rico_mason02.wav', 'weapons/ricochet/mrk_rico_mason03.wav'],
  ricoM:   ['weapons/ricochet/mrk_rico_metal01.wav', 'weapons/ricochet/mrk_rico_metal02.wav', 'weapons/ricochet/mrk_rico_metal03.wav'],
  arm:     ['misc/wpnArm_2.wav', 'misc/wpnArm_3.wav'],
  mantle:  ['bodyfalls/Dive_Over_Wall01.wav', 'bodyfalls/Dive_Over_Wall02.wav'],
  crumble: ['misc/mrk_wallcrumble08.wav', 'misc/mrk_rock_debris_2.wav', 'misc/mrk_rock_debris_3.wav', 'misc/mrk_rock_debris_4.wav', 'misc/mrk_rock_debris_5.wav'],
  pickupH: ['misc/PU_Health01.wav'],
  pickupA: ['misc/pu_ammo01.wav'],
  uiH:     ['misc/mouse_ylover.wav'],
  uiC:     ['misc/mouse_ylselect.wav'],
};

let ctx = null;
const bufs = new Map();      // path -> AudioBuffer (decoded)
const normG = new Map();     // [T121] path -> loudness-normalization gain (computed once at first play)

// [T121] (3) the rifle-silence root cause: the hot takes decode + start() fine but play at
// their RECORDING-native level — the WW2 repo takes are whisper-quiet next to the synth
// voices, so the take wins the early-return and the weapon reads as SILENT (the pistol has
// no take → its loud synth → audible). THE CLEAN FIX: loudness-normalize EVERY take at
// first play — scan the decoded buffer once, scale the voice gain so the take's true peak
// lands near −1.4 dBFS (clamped ≤ ×6 — never a limiter-buster).
function normFor(path, d) {
  let g = normG.get(path);
  if (g !== undefined) return g;
  try {
    let pk = 0;
    for (let ch = 0; ch < d.numberOfChannels; ch++) {
      const data = d.getChannelData(ch);
      for (let i = 0; i < data.length; i += 16) { const a = Math.abs(data[i]); if (a > pk) pk = a; }
    }
    g = pk > 0.0001 ? Math.min(6, 0.85 / pk) : 1;
  } catch (e) { g = 1; }
  normG.set(path, g);
  return g;
}
const pending = new Set();   // paths mid-flight
const failedAt = new Map();  // path -> performance.now() of last failure
const RETRY_MS = 60000;      // the 60 s retry cooldown (law 2)
let supUntil = 0;            // reload-synth suppression window (full reload wav playing)

export const stats = { played: 0, fetched: 0, failed: 0, suppressed: 0 };
if (typeof window !== 'undefined') window.__RSFX = stats; // live-probe surface

export function setCtx(c) { ctx = c; }
export function suppress(ms) { supUntil = performance.now() + ms; }
export const suppressed = () => performance.now() < supUntil;
export function clearSup() { supUntil = 0; } // [T119] the draw clears the window — a full take on weapon A must not gate weapon B's staged ticks across an equip (found LIVE: vanguard full take muted the kar98 stages)

function ensure(path) { // non-blocking fetch+decode; returns the buffer or null
  if (bufs.has(path)) return bufs.get(path);
  if (pending.has(path)) return null;
  const f = failedAt.get(path);
  if (f && performance.now() - f < RETRY_MS) return null;
  if (!ctx) return null;
  pending.add(path);
  fetch(BASE + path, { mode: 'cors' })
    .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
    .then(ab => ctx.decodeAudioData(ab))
    .then(d => { bufs.set(path, d); stats.fetched++; })
    .catch(() => { failedAt.set(path, performance.now()); stats.failed++; })
    .finally(() => pending.delete(path));
  return null;
}

function playOne(path, out, { rate = 1, peak = 1 } = {}) {
  if (!ctx || !out) return false;
  const d = ensure(path);
  if (!d) return false;
  const src = ctx.createBufferSource();
  src.buffer = d;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = peak * normFor(path, d); // [T121] the loudness-normalized take (see normFor)
  src.connect(g); g.connect(out);
  src.onended = () => { try { g.disconnect(); } catch (e) { /* already torn down */ } };
  src.start();
  stats.played++;
  return true;
}

// first READY variant plays; ALL variants kicked so the set fills in
export function playSet(paths, out, opt) {
  if (!ctx || !out || !paths || !paths.length) return false;
  for (let i = 0; i < paths.length; i++) if (bufs.has(paths[i]) && playOne(paths[i], out, opt)) return true;
  for (let i = 0; i < paths.length; i++) ensure(paths[i]);
  return false;
}

// ---------- caller API (audio.js is the only consumer) ----------
export function shot(id, out) { // per-weapon fire voice, natural rate jitter
  const e = MAP[id];
  if (!e || !e.fire) return false;
  return playSet(e.fire, out, { rate: 0.96 + Math.random() * 0.09, peak: 0.62 });
}
export function reload(id, empty, out) { // full take; suppresses staged synth ticks while it plays
  const e = MAP[id];
  if (!e || (!e.reload && !e.reloadNE)) return false;
  const path = empty ? (e.reload || e.reloadNE) : (e.reloadNE || e.reload);
  if (playOne(path, out, { rate: 0.99 + Math.random() * 0.02, peak: 0.7 })) {
    suppress(3400);
    stats.suppressed++;
    return true;
  }
  return false;
}
export function shell(id, out) { // shellLoad per-shell foley (mauler/judge)
  const e = MAP[id];
  if (!e || !e.shell) return false;
  return playOne(e.shell, out, { rate: 0.95 + Math.random() * 0.08, peak: 0.55 });
}
export function stage(id, idx, out) { // [T119] staged bolt-reload takes (idx 0/1/2 = start/loop/end)
  const e = MAP[id];
  if (!e || !e.stages || !(idx >= 0 && idx <= 2)) return false;
  return playOne(e.stages[idx], out, { rate: 0.98 + Math.random() * 0.03, peak: 0.6 });
}
export function pump(id, out) { // [T119] shotgun rack on reload completion
  const e = MAP[id];
  if (!e || !e.pump) return false;
  return playOne(e.pump, out, { rate: 0.97 + Math.random() * 0.05, peak: 0.6 });
}
export function set(name, out, opt) { // SHARED sets by name
  const s = SHARED[name];
  if (!s) return false;
  return playSet(s, out, opt);
}

// [T117] prewarm — fetch+decode EVERY mapped voice at boot (MAP fire/reload/reloadNE/
// stages/shell/pump + all SHARED sets). The cold-cache race was the live "sounds are no
// longer consistent" report: ensure() fetches on first play, so the FIRST occurrence of
// each voice played the synth fallback while the WAV raced, then real audio after — a
// per-voice one-time inconsistency. Prewarming at boot (the ctx exists from initAudio,
// decode works while suspended) makes every play hit the remote take from occurrence #1.
// Idempotent: bufs/pending/failedAt dedupe; a second call is a no-op sweep.
let prewarmed = false;
export function prewarm() {
  if (prewarmed || !ctx) return;
  prewarmed = true;
  const paths = [];
  for (const k of Object.keys(MAP)) {
    const e = MAP[k];
    if (e.fire) paths.push(...e.fire);
    if (e.reload) paths.push(e.reload);
    if (e.reloadNE) paths.push(e.reloadNE);
    if (e.stages) paths.push(...e.stages);
    if (e.shell) paths.push(e.shell);
    if (e.pump) paths.push(e.pump);
  }
  for (const k of Object.keys(SHARED)) paths.push(...SHARED[k]);
  for (const p of paths) ensure(p);
}
