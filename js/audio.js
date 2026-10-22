// ============================================================
// IRONSIGHT — audio.js : procedural synth engine + HRTF positional
// Procedural-first: every sound has a synth voice (zero-load parity —
// the game never waits on the network for audio). [T117] hot real-SFX
// layer: hot voices try js/remotesfx.js (HF sfx space) FIRST; a decoded
// clip plays, otherwise the synth below fires while the fetch races for
// next call. Graceful degrade — synth is the permanent fallback.
// ============================================================
import { CFG, DESTRUCT } from './config.js';
import * as R from './remotesfx.js';

const S = {}; // settings ref (set by main)
let ctx = null, master, sfxGain, musicGain, comp, lowpass;
let noiseBuf = null;
let focusMode = false;

export function initAudio(settings) {
  if (ctx) return;
  S.v = settings;
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 20; comp.ratio.value = 6;
  lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass'; lowpass.frequency.value = 20000;
  master = ctx.createGain();
  sfxGain = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain.connect(lowpass); lowpass.connect(master);
  musicGain.connect(master);
  master.connect(comp); comp.connect(ctx.destination);
  applyVolumes();
  R.setCtx(ctx); // [T117] the hotlink layer decodes against OUR context (one clock, one graph)
  // shared noise buffer (2s white)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startMusicLoop();
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

// [T140 G-4] THE VOICE BUS — the T124 voice.js contract's missing half (the module imported a
// bus that never existed: the live-browser boot-kill grep catch). ONE gain node into the SFX
// path: the master chain owns the final loudness (volMaster), the per-speaker gains own the
// voice mix (volVoice). Lazy against the LIVE graph — a pre-init call gets an honest null
// (voice.js already guards: the game never transmits/plays before initAudio).
let voiceBusNode = null;
export function voiceBus() {
  if (!ctx) return null;
  if (!voiceBusNode) { voiceBusNode = ctx.createGain(); voiceBusNode.gain.value = 1; voiceBusNode.connect(lowpass); }
  return { ctx, in: voiceBusNode };
}
export function prewarm() { R.prewarm(); } // [T117] boot sweep — every mapped voice fetched+decoded before first play (kills the cold-cache synth race)
export function applyVolumes() {
  if (!ctx) return;
  master.gain.value = S.v.volMaster;
  sfxGain.gain.value = S.v.volSfx;
  musicGain.gain.value = S.v.volMusic * (focusMode ? 0.5 : 1);
}
export function setFocus(on) {
  focusMode = on;
  if (!ctx) return;
  lowpass.frequency.setTargetAtTime(on ? 3200 : 20000, ctx.currentTime, 0.08);
  applyVolumes();
}
export const audioReady = () => !!ctx;

// ---------- helpers ----------
function env(g, t0, a, peak, d, sus = 0.0001) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t0 + a + d);
}
function noise(t0, dur, { type = 'lowpass', freq = 1000, q = 1, peak = 0.5, a = 0.002, d = dur, out = sfxGain, sweepTo = 0 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain(); env(g, t0, a, peak, d);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(t0); src.stop(t0 + dur + 0.05);
  return { src, f, g };
}
function tone(t0, dur, { type = 'sine', freq = 440, sweepTo = 0, peak = 0.3, a = 0.003, d = dur, out = sfxGain } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain(); env(g, t0, a, peak, d);
  o.connect(g); g.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
// positional chain: gain → lowpass(distance) → panner → sfx out
function spatial(pos) {
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  const p = ctx.createPanner();
  p.panningModel = 'HRTF'; p.distanceModel = 'exponential';
  p.refDistance = 6; p.rolloffFactor = 1.35; p.maxDistance = 220;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; }
  else p.setPosition(pos.x, pos.y, pos.z);
  g.connect(lp); lp.connect(p); p.connect(sfxGain);
  return g;
}

// ---------- weapon / combat ----------
export function gunshot(kind, pos = null, suppressed = false, wid = null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = pos ? spatial(pos) : sfxGain;
  if (!suppressed && wid && R.shot(wid, out)) return; // [T117] hotlinked per-weapon voice (suppressed stays synth whisper)
  if (pos) { // distant lowpass by 3D distance handled by panner; add air-absorption shaping
    const dist = pos._dist || 0;
    // panner gain node frequency scaled — approximate by lp on that chain
  }
  const v = suppressed ? 0.32 : 1;
  switch (kind) {
    case 'ar': noise(t, 0.16, { freq: suppressed ? 900 : 5200, sweepTo: suppressed ? 300 : 900, peak: 0.5 * v, d: 0.14, out }); tone(t, 0.09, { type: 'square', freq: 210, sweepTo: 90, peak: 0.28 * v, d: 0.08, out }); break;
    case 'smg': noise(t, 0.11, { freq: suppressed ? 1100 : 6200, sweepTo: suppressed ? 400 : 1200, peak: 0.38 * v, d: 0.09, out }); tone(t, 0.06, { type: 'square', freq: 260, sweepTo: 120, peak: 0.18 * v, d: 0.05, out }); break;
    case 'lmg': noise(t, 0.18, { freq: 4400, sweepTo: 700, peak: 0.5 * v, d: 0.16, out }); tone(t, 0.11, { type: 'square', freq: 170, sweepTo: 70, peak: 0.32 * v, d: 0.1, out }); break;
    case 'shotgun': noise(t, 0.3, { freq: 3800, sweepTo: 300, peak: 0.62 * v, d: 0.27, out }); tone(t, 0.16, { type: 'square', freq: 130, sweepTo: 55, peak: 0.4 * v, d: 0.14, out }); break;
    case 'sniper': noise(t, 0.42, { freq: 5200, sweepTo: 220, peak: 0.6 * v, d: 0.4, out }); tone(t, 0.22, { type: 'sawtooth', freq: 110, sweepTo: 40, peak: 0.36 * v, d: 0.2, out }); break;
    case 'pistol': noise(t, 0.13, { freq: suppressed ? 1000 : 5000, sweepTo: suppressed ? 350 : 1000, peak: 0.42 * v, d: 0.11, out }); tone(t, 0.07, { type: 'square', freq: 240, sweepTo: 110, peak: 0.2 * v, d: 0.06, out }); break;
  }
}
export function whizby(pos) { if (!ctx) return; const t = ctx.currentTime; const out = spatial(pos); if (R.set('whiz', out, { peak: 0.5, rate: 0.94 + Math.random() * 0.1 })) return; // [T117] hotlinked whizbys
  noise(t, 0.09, { type: 'bandpass', freq: 2600, sweepTo: 900, q: 2.5, peak: 0.24, d: 0.08, out }); }
// listener-relative 3D distance (panner is listener-relative — the true distance)
function lstnDist(pos) {
  const l = ctx.listener;
  if (l && l.positionX) return Math.hypot(l.positionX.value - pos.x, l.positionY.value - pos.y, l.positionZ.value - pos.z);
  if (l && l.getPositionX) return Math.hypot(l.getPositionX() - pos.x, l.getPositionY() - pos.y, l.getPositionZ() - pos.z);
  return 0;
}
export function impact(pos, metal = false) {
  if (!ctx) return; const t = ctx.currentTime; const out = spatial(pos);
  const played = R.set(metal ? 'metal' : 'masonry', out, { peak: 0.42, rate: 0.93 + Math.random() * 0.12 }); // [T117] hotlinked impacts (masonry = our stone maps)
  if (Math.random() < 0.3) R.set(metal ? 'ricoM' : 'ricoS', out, { peak: 0.26, rate: 0.9 + Math.random() * 0.15 }); // [T119] deflecting-round flavor layer (fire-and-forget)
  if (played) return;
  noise(t, 0.06, { type: metal ? 'bandpass' : 'lowpass', freq: metal ? 3000 : 1500, q: metal ? 4 : 1, peak: 0.2, d: 0.05, out });
  if (metal) tone(t + 0.01, 0.1, { type: 'sine', freq: 2400, sweepTo: 1800, peak: 0.06, d: 0.09, out });
}
// §54.6 U7: destructible crumble — spatial debris crash + sub-thump; distance-gated
// at DESTRUCT.CRUMBLE_MAX_D against the Web Audio LISTENER (panner is listener-relative,
// so this is the true 3D distance).
export function crumble(pos) {
  if (!ctx) return;
  const d = lstnDist(pos);
  if (d > DESTRUCT.CRUMBLE_MAX_D) return;
  const t = ctx.currentTime; const out = spatial(pos);
  if (R.set('crumble', out, { peak: 0.6, rate: 0.94 + Math.random() * 0.1 })) return; // [T119] wallcrumble/rock-debris takes
  noise(t, 0.5, { freq: 1800, sweepTo: 90, peak: 0.55, d: 0.46, out });
  tone(t, 0.3, { type: 'sine', freq: 70, sweepTo: 30, peak: 0.4, d: 0.28, out });
  noise(t + 0.06, 0.25, { type: 'bandpass', freq: 900, q: 1.4, sweepTo: 300, peak: 0.2, d: 0.2, out });
}
export function explosion(pos) {
  if (!ctx) return; const t = ctx.currentTime; const out = pos ? spatial(pos) : sfxGain;
  if (pos && lstnDist(pos) > 55 && R.set('exploD', out, { peak: 0.7, rate: 0.95 })) return; // [T119] distant takes far away
  if (R.set('explo', out, { peak: 0.9, rate: 0.92 + Math.random() * 0.1 })) return; // [T117] hotlinked grenade_explo set
  noise(t, 0.9, { freq: 2200, sweepTo: 60, peak: 0.85, d: 0.85, out });
  tone(t, 0.5, { type: 'sine', freq: 90, sweepTo: 28, peak: 0.6, d: 0.48, out });
}
export function flashRing(intensity) {
  if (!ctx) return; const t = ctx.currentTime;
  tone(t, 1.6, { type: 'sine', freq: 3400, peak: 0.12 * intensity, d: 1.5 });
  noise(t, 0.25, { type: 'bandpass', freq: 5200, q: 3, peak: 0.3 * intensity, d: 0.22 });
}
export function setDeafened(on) {
  if (!ctx) return;
  lowpass.frequency.setTargetAtTime(on ? 900 : 20000, ctx.currentTime, on ? 0.02 : 0.6);
}
export function hitmark(kill = false, crit = false) {
  if (!ctx) return; const t = ctx.currentTime;
  // [T161 R15] the pitch-differentiated hit feedback (a11y): the hitSound setting rides a
  // module multiplier (setHitPitch from main.js applySettings) — 'low' 0.7 / 'high' 1.35 /
  // default 1.0 (byte-identical).
  tone(t, 0.05, { type: 'square', freq: (crit ? 2400 : 1900) * hitPitch, peak: 0.16, d: 0.045 });
  if (kill) tone(t + 0.05, 0.1, { type: 'square', freq: 1300 * hitPitch, peak: 0.14, d: 0.09 });
}
// [T161 R15] the a11y audio setters — hitPitch (above) + the mono downmix (a forced-1ch gain
// insert on the master bus: both speakers get the same signal — single-sided-hearing access).
let hitPitch = 1.0, IR_MONO = false;
export function setHitPitch(p) { hitPitch = (p && p > 0) ? p : 1; }
export function setMono(on) {
  if (!ctx || !master || on === IR_MONO) return; IR_MONO = !!on;
  try {
    master.disconnect();
    if (on) { const m = ctx.createGain(); m.channelCount = 1; m.channelCountMode = 'explicit'; m.channelInterpretation = 'speakers'; master.connect(m); m.connect(comp); }
    else master.connect(comp);
  } catch (e) { /* the chain re-wire never kills audio — worst case the toggle no-ops */ }
}
export function hsDing() { if (!ctx) return; const t = ctx.currentTime; tone(t, 0.18, { type: 'sine', freq: 3100, sweepTo: 2900, peak: 0.2, d: 0.16 }); }
export function reloadSounds(stage, wid = null) { // 0:out 1:in 2:rack · wid rides for the [T117] hotlink
  if (!ctx) return; const t = ctx.currentTime;
  if (R.suppressed()) return; // a hotlinked full reload take is playing — staged synth ticks stay quiet
  if (stage === 1 && wid && R.shell(wid, sfxGain)) return; // [T117] shellLoad per-shell foley (mauler/judge)
  if (wid && R.stage(wid, stage, sfxGain)) return; // [T119] staged bolt rifles (kar98k/Enfield): start/loop/end takes ride the tick stages
  noise(t, 0.05, { type: 'bandpass', freq: stage === 2 ? 2100 : 1500, q: 3, peak: 0.16, d: 0.04 });
  tone(t, 0.03, { type: 'square', freq: stage === 2 ? 700 : 520, peak: 0.05, d: 0.028 });
}
export function reloadStart(id, empty) { // [T119] the per-weapon full reload take — the T117 call site pointed at a MISSING export (R.reload was dead code: the take never played)
  if (!ctx) return;
  const e = R.MAP[id];
  if (e && e.stages) return; // staged bolt rifles: the staged ticks carry the takes — nothing here, no suppression
  R.reload(id, empty, sfxGain); // suppresses the staged ticks internally on play
}
export function equip() { // [T119] weapon draw — hotlinked wpnArm takes; the synth mag-out fallback is the old reloadSounds(0) voice verbatim
  if (!ctx) return; const t = ctx.currentTime;
  R.clearSup(); // [T119] the draw is a new voice context — weapon A's full-take window must not gate weapon B's staged ticks (found LIVE)
  if (R.set('arm', sfxGain, { peak: 0.5, rate: 0.96 + Math.random() * 0.06 })) return;
  noise(t, 0.05, { type: 'bandpass', freq: 1500, q: 3, peak: 0.16, d: 0.04 });
  tone(t, 0.03, { type: 'square', freq: 520, peak: 0.05, d: 0.028 });
}
export function pump(id) { if (!ctx) return; R.pump(id, sfxGain); } // [T119] shotgun rack on reload completion (fallback: silence — the shell foley already played)
export function pinPull() { // [T119] grenade pin — fires at cook start
  if (!ctx) return; const t = ctx.currentTime;
  if (R.set('pin', sfxGain, { peak: 0.4 })) return;
  tone(t, 0.04, { type: 'square', freq: 1200, peak: 0.07, d: 0.035 });
}
export function mantle() { // [T119] ledge climb — Dive_Over_Wall takes; soft thud fallback
  if (!ctx) return; const t = ctx.currentTime;
  if (R.set('mantle', sfxGain, { peak: 0.55, rate: 0.96 + Math.random() * 0.07 })) return;
  noise(t, 0.1, { freq: 700, sweepTo: 220, peak: 0.2, d: 0.09 });
}
export function dryFire() { if (!ctx) return; const t = ctx.currentTime; tone(t, 0.04, { type: 'square', freq: 900, peak: 0.08, d: 0.035 }); }
export function swing() { if (!ctx) return; const t = ctx.currentTime; if (R.set('swing', sfxGain, { peak: 0.5, rate: 0.95 + Math.random() * 0.08 })) return; // [T117] hotlinked melee swing
  noise(t, 0.12, { type: 'bandpass', freq: 900, sweepTo: 2400, q: 1.6, peak: 0.14, d: 0.11 }); }
export function knifeHit() { if (!ctx) return; const t = ctx.currentTime; if (R.set('stab', sfxGain, { peak: 0.6, rate: 0.96 + Math.random() * 0.06 })) return; // [T117] hotlinked melee hit
  noise(t, 0.08, { type: 'lowpass', freq: 900, peak: 0.3, d: 0.07 }); }
export function footstep(pos, sprint = false, surface = 0, friendly = false) {
  if (!ctx) return; const t = ctx.currentTime; const out = pos ? spatial(pos) : sfxGain;
  // [T132] the CoD footstep-emphasis law (the user: "my/teammate's walking steps should be
  // lower than opponents per Call of Duty"): OWN steps (pos == null) play at 55% — you hear
  // yourself but the mix stays enemy-forward; FRIENDLY remotes/bots take 60% more off.
  // Enemy positional steps keep the full 0.36/0.5 peaks.
  const q = (pos ? 1 : 0.55) * (friendly ? 0.6 : 1);
  if (surface === 1 && R.set('stepM', out, { peak: (sprint ? 0.5 : 0.36) * q, rate: (sprint ? 0.9 : 1.02) + Math.random() * 0.08 })) return; // [T119] metal platforms
  if (R.set('step', out, { peak: (sprint ? 0.5 : 0.36) * q, rate: (sprint ? 0.9 : 1.02) + Math.random() * 0.08 })) return; // [T117] hotlinked stone steps (surface param stays a synth-only nuance)
  const f = surface === 1 ? 2400 : 1100; // metal vs concrete
  noise(t, sprint ? 0.075 : 0.055, { type: 'lowpass', freq: f, peak: (sprint ? 0.16 : 0.1) * q, d: sprint ? 0.07 : 0.05, out });
}
export function landThud(v, surface = 0, dmg = false) { if (!ctx) return; const t = ctx.currentTime;
  if (dmg && R.set('landDmg', sfxGain, { peak: Math.min(0.85, 0.5 + v * 0.04), rate: 0.97 })) return; // [T119] hurt landings
  if (R.set(surface === 1 ? 'landM' : 'land', sfxGain, { peak: Math.min(0.8, 0.35 + v * 0.05), rate: 0.96 })) return; // [T117][T119] hotlinked lands, surface-aware
  noise(t, 0.12, { freq: 500, sweepTo: 150, peak: Math.min(0.3, v * 0.04), d: 0.1 }); tone(t, 0.08, { type: 'sine', freq: 70, peak: Math.min(0.2, v * 0.03), d: 0.07 }); }
export function jumpPad(pos) { if (!ctx) return; const t = ctx.currentTime; const out = pos ? spatial(pos) : sfxGain; tone(t, 0.35, { type: 'sawtooth', freq: 180, sweepTo: 720, peak: 0.22, d: 0.32, out }); }
export function pickup(pos, kind = 0) {
  if (!ctx) return; const t = ctx.currentTime; const out = pos ? spatial(pos) : sfxGain;
  if (R.set(kind ? 'pickupA' : 'pickupH', out, { peak: 0.5 })) return; // [T119] PU_Health / pu_ammo takes (0 = health/supply, 1 = ammo/credit — the live caller set)
  tone(t, 0.09, { type: 'sine', freq: kind ? 880 : 660, peak: 0.18, d: 0.08, out });
  tone(t + 0.07, 0.12, { type: 'sine', freq: kind ? 1320 : 990, peak: 0.14, d: 0.1, out });
}
export function throwNade() { if (!ctx) return; const t = ctx.currentTime; if (R.set('throwG', sfxGain, { peak: 0.45, rate: 0.97 + Math.random() * 0.05 })) return; // [T117] hotlinked throw foley
  noise(t, 0.09, { type: 'bandpass', freq: 700, q: 1.5, peak: 0.1, d: 0.08 }); }
export function bounceNade(pos) { if (!ctx) return; const out = spatial(pos); const t = ctx.currentTime; if (R.set('bounce', out, { peak: 0.4, rate: 0.94 + Math.random() * 0.1 })) return; // [T117] hotlinked stone bounces
  tone(t, 0.05, { type: 'square', freq: 420, peak: 0.09, d: 0.045, out }); }
export function uiTick(hover = false) {
  if (!ctx) return; const t = ctx.currentTime;
  if (R.set(hover ? 'uiH' : 'uiC', sfxGain, { peak: 0.5 })) return; // [T119] mouse_ylover/ylselect
  tone(t, hover ? 0.03 : 0.06, { type: 'square', freq: hover ? 1400 : 900, peak: hover ? 0.045 : 0.09, d: hover ? 0.03 : 0.05 });
}
export function announceSting(mult = 0) {
  if (!ctx) return; const t = ctx.currentTime;
  const base = [523, 659, 784];
  base.forEach((f, i) => tone(t + i * 0.06, 0.22, { type: 'sawtooth', freq: f * (1 + mult * 0.12), peak: 0.12, d: 0.2, out: musicGain }));
}
export function victoryJingle(win) {
  if (!ctx) return; const t = ctx.currentTime;
  const seq = win ? [523, 659, 784, 1047] : [392, 330, 262];
  seq.forEach((f, i) => tone(t + i * 0.16, 0.5, { type: 'triangle', freq: f, peak: 0.2, d: 0.45, out: musicGain }));
}

// ---------- listener ----------
export function updateListener(pos, fwd, up) {
  if (!ctx) return;
  const L = ctx.listener;
  const t = ctx.currentTime;
  if (L.positionX) {
    L.positionX.setTargetAtTime(pos.x, t, 0.01); L.positionY.setTargetAtTime(pos.y, t, 0.01); L.positionZ.setTargetAtTime(pos.z, t, 0.01);
    L.forwardX.setTargetAtTime(fwd.x, t, 0.01); L.forwardY.setTargetAtTime(fwd.y, t, 0.01); L.forwardZ.setTargetAtTime(fwd.z, t, 0.01);
    L.upX.setTargetAtTime(up.x, t, 0.01); L.upY.setTargetAtTime(up.y, t, 0.01); L.upZ.setTargetAtTime(up.z, t, 0.01);
  } else {
    L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
  }
}

// ---------- dynamic music (NOVEL C2) ----------
let musicTimer = null, intensity = 0, targetIntensity = 0, chordIdx = 0;
const CHORDS = [110, 87.3, 130.8, 98]; // A2 F2 C3 G2
function startMusicLoop() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    intensity += (targetIntensity - intensity) * 0.06;
    const t = ctx.currentTime;
    const root = CHORDS[chordIdx % CHORDS.length]; chordIdx++;
    // pad layer (always, volume scales)
    const padPeak = 0.045 + intensity * 0.05;
    [root, root * 1.5, root * 2].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 400 + intensity * 2200; flt.Q.value = 0.8;
      const g = ctx.createGain(); env(g, t, 0.9, padPeak / (i + 1), 2.4);
      o.connect(flt); flt.connect(g); g.connect(musicGain);
      o.start(t); o.stop(t + 3.6);
    });
    // pulse arp (combat only)
    if (intensity > 0.3) {
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const ft = t + s * (0.5 - intensity * 0.22) * 0.5;
        const f = root * (s % 2 ? 3 : 4) * (s > 1 ? 1.19 : 1);
        tone(ft, 0.1, { type: 'square', freq: f, peak: 0.028 + intensity * 0.03, d: 0.09, out: musicGain });
      }
    }
  }, 1800);
}
export function setCombatIntensity(x) { targetIntensity = Math.max(0, Math.min(1, x)); }
export function musicDuck(x) { if (ctx) musicGain.gain.setTargetAtTime(S.v.volMusic * x, ctx.currentTime, 0.3); }
