// ============================================================
// IRONSIGHT — input.js : keyboard + mouse + pointer lock + touch
// [CoD Mobile advanced mode parity: dual fire buttons, ADS toggle]
// T1-7 (Task 38): data-driven BINDINGS table — every bindable action
//   lives here; the rebind UI (ui.js, conflict-rejecting) writes
//   settings.binds, applied live via applyInputSettings(). Defaults
//   reproduce the shipped v1.2 keymap EXACTLY (probe_t38 verifies).
// T1-8 (Task 38): aim input mode — 'hold' (default, unchanged) | 'toggle'.
// ============================================================
import { SETTINGS_LS_KEY, CFG } from './config.js';

// ---- T1-7 bind table (single source for keyboard + mouse bindings) ----
// `hold: true`  → polled every frame via actionDown() (movement/fire/aim class)
// otherwise     → edge action: Input.just on press, Input.released on release
// `fixed: true` → shown in the UI but not rebindable (consumer hardcodes the key:
//                 scoreboard → main.js reads Input.keys.has('Tab') directly)
// Mouse codes: 'Mouse0' = LMB, 'Mouse1' = MMB, 'Mouse2' = RMB.
export const BINDINGS = {
  fire:          { label: 'Fire', keys: ['Mouse0'], hold: true },
  ads:           { label: 'Aim / Scope', keys: ['Mouse2', 'KeyE'], hold: true },
  sprint:        { label: 'Sprint (hold)', keys: ['ShiftLeft'], hold: true },
  crouch_hold:   { label: 'Crouch (hold)', keys: ['ControlLeft'], hold: true },
  crouch_toggle: { label: 'Crouch · Slide', keys: ['KeyC'] }, // [T119] the stance MODE lives in settings (hold/toggle/2×tap) — the key is the crouch channel
  prone:         { label: 'Prone (Z)', keys: ['KeyZ'] }, // [T121] (9) the prone toggle — edge action; jump/crouch edges stand you up first
  jump:          { label: 'Jump (buffered)', keys: ['Space'] },
  reload:        { label: 'Reload', keys: ['KeyR'] },
  nade:          { label: 'Grenade (hold = cook)', keys: ['KeyG'] },
  melee:         { label: 'Melee', keys: ['KeyV'] },
  ptt:           { label: 'Push to talk (hold)', keys: ['KeyT'], hold: true }, // [T140 G-4] the PTT hold — V=melee, B=emote (the conflict law); T is the team-chat mnemonic, rebindable in CONTROLS
  camtoggle:     { label: 'Camera Perspective', keys: ['KeyX'] }, // [T119] TPV toggle (issue 4) — non-hold ⇒ auto-registered as an edge action
  ability:       { label: 'Tactical Ability', keys: ['Digit4'] },
  emote:         { label: 'Emote (taunt)', keys: ['KeyB'] }, // T2-5 Phase 3 (Task 55, §39.4): data-driven — settings table + DEFAULT_BINDS derive automatically (KeyB was free)
  quickswap:     { label: 'Quick-Swap Weapon', keys: ['KeyQ'] },
  slot1:         { label: 'Weapon Slot 1', keys: ['Digit1'] },
  slot2:         { label: 'Weapon Slot 2', keys: ['Digit2'] },
  slot3:         { label: 'Weapon Slot 3', keys: ['Digit3'], fixed: true }, // pre-existing: no consumer in main.js (probe_t38 logs it) — bound for default-map fidelity, not rebindable
  inspect:       { label: 'Inspect Weapon', keys: ['KeyF'] },
  ping:          { label: 'Ping World', keys: ['KeyZ', 'Mouse1'] },
  trainer:       { label: 'Trainer (open/close)', keys: ['Digit7'] }, // [T168] the FPS trainer panel — takes 7 (the user directive). BINDINGS ORDER MATTERS: actionForCode returns the FIRST action bound to a code, so this entry MUST sit above streak2; Supply Drop moves to Digit8 (the mergeBinds migration below carries old saves over)
  streak0:       { label: 'Streak: UAV', keys: ['Digit5'] },
  streak1:       { label: 'Streak: Airstrike', keys: ['Digit6'] },
  streak2:       { label: 'Streak: Supply Drop', keys: ['Digit8'] }, // [T168] was Digit7 — ceded to the trainer bind above
  p_add:         { label: 'Range: Add Bot', keys: ['KeyP'] },
  p_rem:         { label: 'Range: Remove Bot', keys: ['KeyO'] },
  p_diff:        { label: 'Range: Difficulty', keys: ['KeyK'] },
  p_strafe:      { label: 'Range: Bot Strafe', keys: ['KeyL'] },
  p_reset:       { label: 'Range: Reset Stats', keys: ['KeyJ'] },
  scoreboard:    { label: 'Scoreboard (hold)', keys: ['Tab'], fixed: true }, // main.js reads keys.has('Tab') — rebind needs a main.js edit (logged residual)
  moveF:         { label: 'Move Forward', keys: ['KeyW'], hold: true },
  moveB:         { label: 'Move Backward', keys: ['KeyS'], hold: true },
  moveL:         { label: 'Move Left', keys: ['KeyA'], hold: true },
  moveR:         { label: 'Move Right', keys: ['KeyD'], hold: true },
};
// action → codes[] (deep-copied defaults; saved settings.merge over this in ui.js loadSettings)
export const DEFAULT_BINDS = Object.fromEntries(Object.entries(BINDINGS).map(([a, b]) => [a, b.keys.slice()]));
const EDGE_ACTIONS = new Set(Object.keys(BINDINGS).filter(a => !BINDINGS[a].hold));
const CODE_RE = /^[A-Z][A-Za-z0-9]*$/; // KeyboardEvent.code shapes
// valid bindable code: real key codes (all uppercase-initial) or our Mouse0-2 aliases
// (rejects 'Mouse3'+, lowercase, spaces — KeyboardEvent.code never starts with 'Mouse')
const isCode = (c) => typeof c === 'string' && CODE_RE.test(c) && !(c.startsWith('Mouse') && !/^Mouse[0-2]$/.test(c));

export const Input = {
  keys: new Set(),
  just: new Set(), released: new Set(),
  mdx: 0, mdy: 0, wheel: 0,
  fire: false, ads: false, adsToggle: false,
  locked: false, touchMode: false, enabled: true,
  padFire: false, padAds: false, padSprint: false, padScoreboard: false, // gamepad.js holds
  stick: { x: 0, y: 0 },
  lookDX: 0, lookDY: 0,
  crouchToggled: false,
  proneLatch: false, // [T122] (1) the stance-cycle mirror — main.js writes player.prone>0.5 here EVERY frame; the crouch edge reads it to advance the cycle (the Input layer never guesses the stance)
  tapStrafeEdge: 0, // T1-3: ∓1 double-tap A/D redirect edge (consumed by player.js; NO wheel binding by design)
  _lastTapA: -9e3, _lastTapD: -9e3,
  onPause: null, onFireDown: null, onLockChange: null, onPinch: null,
  _els: {}, _nadeDown: false, _looks: new Map(), _stickId: -1, _stickBase: { x: 0, y: 0 }, touchSens: 1, // §62.1 (T81 recovery): multi-source look feed Map<touchId,{x,y}> + live touch sens (§60.2 M3 home)
  // [v1.50 port T90] §60 (v1.48) touch layer state: auto-fire verdict (M7-lite, set by main.js cone) + double-tap clocks for the M5 scope-stage edge law.
  autoFireOn: false, _lastAdsTap: 0, _lastAdsUp: -9e3,
  // [T90 merge] M8-beyond-buttons (v1.56 dead-session wave, adopted): gyro aim gate + multiplier (M8a) and the touch look response curve (M8b) — live-applied from settings via applyInputSettings. The re-derived M11 auto-fire LATCH is deliberately NOT adopted: v1.50's byte-true M7-lite cone verdict (autoFireOn, above) is the same feature's ground truth — one auto-fire law only.
  gyroAim: false, gyroSens: 1, aimCurve: 'classic',
  // T1-7/T1-8 state (applied from settings):
  binds: null,        // action → codes[] (see applyInputSettings)
  aimMode: 'hold',    // 'hold' | 'toggle' | 'double' [T119]
  crouchMode: 'double', // [T119] 'hold' | 'toggle' | 'double' — AAA default: a <280ms pair latches, a single press stays momentary
  _lastCrouchTap: -1e9,
  _mouse: new Set(),  // held mouse-button codes ('Mouse0'…) — hold-action channel
};

// ---- bind plumbing (pure, probe-tested) ----
export function mergeBinds(saved) { // saved partial/garbage → per-action defaults (migration-safe)
  const out = {};
  for (const a of Object.keys(BINDINGS)) {
    const v = saved && saved[a];
    out[a] = (Array.isArray(v) && v.length && v.every(isCode))
      ? v.slice() : DEFAULT_BINDS[a].slice();
  }
  // [T168] the 7-cease migration: a pre-T168 save carries streak2=['Digit7']; with the
  // trainer now owning 7 (and resolving FIRST by BINDINGS order), that save's supply
  // drop would be dead — carry it to Digit8. If the user rebound the trainer elsewhere,
  // their saved streak2 keeps 7 untouched (the trainer no longer claims the code).
  if (out.trainer && out.trainer.includes('Digit7') && out.streak2 && out.streak2.includes('Digit7')) out.streak2 = ['Digit8'];
  return out;
}
export function tryAssignBind(binds, action, code) { // conflict resolver used by the UI + probes
  const def = BINDINGS[action];
  if (!def) return { ok: false, reason: 'unknown action' };
  if (def.fixed) return { ok: false, reason: def.label + ' is fixed' };
  if (typeof code !== 'string' || !isCode(code)) return { ok: false, reason: 'unsupported input code' };
  if (binds[action] && binds[action].length === 1 && binds[action][0] === code) return { ok: true, noop: true };
  for (const a of Object.keys(binds)) {
    if (a !== action && Array.isArray(binds[a]) && binds[a].includes(code))
      return { ok: false, conflict: a, reason: code + ' already bound to ' + BINDINGS[a].label };
  }
  return { ok: true };
}
export function applyInputSettings(s) { // live-apply (ui.js calls on every controls change; applySettings fans it out — v1.54)
  Input.binds = mergeBinds(s && s.binds);
  Input.aimMode = (s && (s.aimMode === 'toggle' || s.aimMode === 'double')) ? s.aimMode : 'hold'; // [T119] the AAA triple lands here
  Input.crouchMode = (s && (s.crouchMode === 'toggle' || s.crouchMode === 'hold')) ? s.crouchMode : 'double'; // [T119] absent key == the new default (2X-TAP)
  if (s && typeof s.touchSens === 'number' && s.touchSens > 0) Input.touchSens = s.touchSens; // §62.4 M9 (v1.54): live touch sens; absent/invalid key → current value (default-merge covers old saves)
  // §62.4 (v1.54): live touch numerics — user overrides over the official CFG.TOUCH defaults (clamped sane)
  if (s && typeof s.touchStickDead === 'number') CFG.TOUCH.stickDead = Math.min(0.5, Math.max(0, s.touchStickDead));
  if (s && typeof s.touchLookDead === 'number') CFG.TOUCH.lookDead = Math.min(20, Math.max(0, s.touchLookDead));
  if (s && typeof s.touchHybridDrag === 'number') CFG.TOUCH.hybridDrag = Math.min(80, Math.max(0, s.touchHybridDrag));
  // [T90 merge] M8 live-apply — rides the SAME single fan-out (applySettings → applyInputSettings) as every row above:
  Input.gyroAim = !!(s && s.gyroAim === true); // M8a gate — listener attach/detach handled by _applyGyro below
  if (s && typeof s.gyroSens === 'number') Input.gyroSens = Math.min(3.0, Math.max(0.2, s.gyroSens)); // clamp == the MOBILE-tab slider band
  Input.aimCurve = (s && s.aimCurve === 'linear') ? 'linear' : 'classic'; // M8b — absent/garbage falls back to the CLASSIC default
  const tui = (typeof document !== 'undefined') ? document.getElementById('touch-ui') : null; // M8c: data-layout attr on the EXISTING touch surface — covers init (initInput boot-read) + every live change; headless-safe
  if (tui) tui.dataset.layout = (s && (s.touchLayout === 'lefty' || s.touchLayout === 'compact')) ? s.touchLayout : 'default';
  _applyGyro();
}

// ---- [T90 merge] M8b: AIM CURVE — pure shaper (probe-tested) ----
// CLASSIC = response-curve exponent on the touch look delta: d' = sign(d)·|d|^CFG.AIM_CURVE.exp
// (exp 1.5 — OUR-CONSTANT, industry band 1.3–1.6, CoD 'standard'-class). Characteristic: sub-1px
// deltas damp (micro-adjust precision), larger deltas sharpen (flicks). LINEAR = raw d. Applied
// ONLY at the touch look-delta application point (feedMove); desktop mouse pointer-lock deltas
// (Input.mdx/mdy) and the hybridDrag acquisition gate stay raw by law.
export function aimCurveDelta(d, mode) {
  if (mode !== 'classic') return d;
  const a = Math.abs(d);
  return a < 1e-6 ? 0 : Math.sign(d) * Math.pow(a, CFG.AIM_CURVE.exp);
}

// ---- [T90 merge] M8a: GYRO AIM (CoD Mobile grammar) ----
// deviceorientation listener attached ONLY while Input.touchMode && Input.gyroAim (applyInputSettings → _applyGyro).
// Feed law: the EXISTING M3 look accumulator (Input.lookDX/DY) with the M3 scale d × CFG.TOUCH.lookBase × sens —
// gyroSens mirrors touchSens exactly (clamped in applyInputSettings). Gyro deltas join the same accumulator + scale
// law directly (that IS the M3 path — one look accumulator, many sources).
// Effective turn: 1° device tilt ≈ 0.33° screen at gyroSens 1.0 (lookBase 2.6 × 0.0022 rad/count) — ~1:1 at slider max 3.0.
// Axis map by screen orientation angle (landscape-primary play): 90 → yaw=Δbeta/pitch=−Δgamma; −90/270 → yaw=−Δbeta/pitch=Δgamma;
// 180 → mirrored; 0 (portrait) → yaw=Δgamma/pitch=Δbeta. Sign conventions are OUR-CONSTANTS (deviceorientation spec axes,
// tuned for landscape phone play). iOS 13+: DeviceOrientationEvent.requestPermission() is called from the settings-toggle
// click (ui.js — the user gesture); a reject flips the toggle back OFF there. Gyro deltas do NOT pass the aim curve
// (physical motion is already analog — curve would double-shape).
let _gyroAttached = false, _gyroHandler = null, _gyroLast = { b: null, g: null };
function _applyGyro() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return; // headless probe-safe
  const want = Input.touchMode === true && Input.gyroAim === true;
  if (want === _gyroAttached) return;
  if (want) {
    _gyroLast = { b: null, g: null };
    _gyroHandler = (e) => {
      if (e.beta == null || e.gamma == null) return; // desktop/no-sensor events carry nulls
      if (_gyroLast.b === null) { _gyroLast.b = e.beta; _gyroLast.g = e.gamma; return; } // first event seeds the baseline (no delta)
      const dB = e.beta - _gyroLast.b, dG = e.gamma - _gyroLast.g;
      _gyroLast.b = e.beta; _gyroLast.g = e.gamma;
      if (Math.abs(dB) > CFG.GYRO.maxDelta || Math.abs(dG) > CFG.GYRO.maxDelta) return; // spike guard: glitch/re-orient → discard
      let ang = 0;
      try { ang = (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0); } catch {}
      let yaw = 0, pitch = 0;
      if (ang === 90) { yaw = dB; pitch = -dG; }
      else if (ang === -90 || ang === 270) { yaw = -dB; pitch = dG; }
      else if (ang === 180) { yaw = -dG; pitch = -dB; }
      else { yaw = dG; pitch = dB; }
      const dz = CFG.TOUCH.lookDead || 0; // same §62.4 jitter filter as the touch feed
      if (Math.abs(yaw) >= dz) Input.lookDX += yaw * CFG.TOUCH.lookBase * (Input.gyroSens || 1); // M3 law (gyroSens mirrors touchSens)
      if (Math.abs(pitch) >= dz) Input.lookDY += pitch * CFG.TOUCH.lookBase * (Input.gyroSens || 1);
    };
    window.addEventListener('deviceorientation', _gyroHandler, true);
  } else if (_gyroHandler) {
    window.removeEventListener('deviceorientation', _gyroHandler, true);
    _gyroHandler = null;
  }
  _gyroAttached = want;
}
function actionForCode(code) {
  if (!Input.binds) return null;
  for (const a of Object.keys(Input.binds)) if (Input.binds[a].includes(code)) return a;
  return null;
}

const host = () => document.getElementById('canvas-host');

function readSavedSettings() { // input.js boot-read (ui.js owns save/load; same key — config.SETTINGS_LS_KEY)
  try { return JSON.parse(localStorage.getItem(SETTINGS_LS_KEY) || '{}') || {}; } catch { return {}; }
}

// ---- B15b: touch classification (HARDENED) ----
// The strict pair ('ontouchstart' && pointer:coarse) read FALSE on iPadOS (Safari
// reports the primary pointer FINE), Android "Desktop site" mode, and several
// webviews → #touch-ui never shown, initTouch never bound → no fire / no look /
// no stick on those devices (user-reported 2026-10-10). Rule now: coarse pointer
// ∪ (multi-touch ∩ no-hover) — desktop touchscreen laptops stay desktop (hover:hover).
// Manual override survives any misdetection: URL ?touch=1 / ?touch=0 persists
// localStorage 'ironsight.touch' ('on'|'off' forces the classification at boot).
function detectTouchMode() {
  try {
    const q = new URLSearchParams(location.search).get('touch');
    if (q === '1' || q === 'on') { localStorage.setItem('ironsight.touch', 'on'); return true; }
    if (q === '0' || q === 'off') { localStorage.setItem('ironsight.touch', 'off'); return false; }
    const forced = localStorage.getItem('ironsight.touch');
    if (forced === 'on') return true;
    if (forced === 'off') return false;
  } catch {}
  const coarse = matchMedia('(pointer:coarse)').matches;
  const noHover = matchMedia('(hover: none)').matches;
  return coarse || ((navigator.maxTouchPoints || 0) > 0 && noHover);
}

// [T130] text-field law: a keystroke aimed at an editable element (the §53.7 account
// name/pass fields, the lobby chat, any <input>/<textarea>/contenteditable) is TEXT,
// never a control bind — the global handler used to claim W/A/S/D/Space/Tab first and
// preventDefault ate the character mid-typing (the Account-name report). Exported for
// the probe (probe_t130) — the law is testable without a DOM.
export function isEditableTarget(t) {
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable === true;
}

export function initInput() {
  Input.touchMode = detectTouchMode();
  applyInputSettings(readSavedSettings()); // T1-7: binds active from boot (UI live-apply keeps them fresh)

  addEventListener('keydown', (e) => {
    if (isEditableTarget(e.target)) return; // [T130] text-field law — no game claims, no preventDefault, no pause-toggle
    if (e.code === 'Tab') e.preventDefault();
    onKeyDownCode(e.code, e.repeat);
    if (['Tab', 'Space'].includes(e.code) || actionForCode(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => {
    Input.keys.delete(e.code); // [T130] ALWAYS unstick — a key held while focus entered a field must release cleanly
    if (isEditableTarget(e.target)) return; // text-field law: no released-edges either
    onKeyUpCode(e.code);
  });
  addEventListener('blur', () => { Input.keys.clear(); Input._mouse.clear(); Input.fire = false; Input.ads = false; });

  const h = host();
  h.addEventListener('mousedown', (e) => {
    if (!Input.locked) { requestLock(); return; }
    onMouseDownCode(e.button);
  });
  addEventListener('mouseup', (e) => onMouseUpCode(e.button));
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => { Input.wheel += Math.sign(e.deltaY); }, { passive: true });
  addEventListener('mousemove', (e) => {
    if (Input.locked) { Input.mdx += e.movementX || 0; Input.mdy += e.movementY || 0; }
  });
  document.addEventListener('pointerlockchange', () => {
    Input.locked = document.pointerLockElement === host();
    if (!Input.locked) { Input.fire = false; Input.ads = false; }
    Input.onLockChange && Input.onLockChange(Input.locked);
  });

  if (Input.touchMode) initTouch();
}

// ---- event cores (exported for probe_t38 headless matrix; DOM handlers delegate) ----
export function onKeyDownCode(code, repeat = false) {
  Input.keys.add(code);
  if (repeat) return;
  const a = actionForCode(code);
  if (code === 'Escape' && Input.onPause) { Input.onPause(); return; } // [T119] desktop pause key — the touch button was the ONLY path (the T119 menu-trap evidence: no exit affordance on desktop); Escape toggles pause/resume
  if (a && EDGE_ACTIONS.has(a)) {
    Input.just.add(a);
    if (a === 'crouch_toggle') crouchStanceEdge(false); // [T122] (1) the stance cycle (was the [T119] per-mode flip — the cycle SUPERSEDES the unlatch: a crouched press = prone, a prone press = standing; the 280ms pair still latches from standing)
  }
  if (a === 'fire' && Input.onFireDown) Input.onFireDown(); // kb fire: semi-auto trigger edge (mouse path does this in onMouseDownCode)
  if (a === 'ads' && Input.aimMode === 'toggle') { // T1-8 + [v1.50 port T90] §60.2 M5: re-tap while latched (<280ms) = zoom stage
    const now = performance.now();
    if (Input.ads && now - Input._lastAdsTap < 280) Input.just.add('scope2');
    else Input.ads = !Input.ads;
    Input._lastAdsTap = now;
  }
  else if (a === 'ads' && Input.aimMode === 'double') { // [T119] 2X-TAP ADS — a <280ms pair latches the stance (single presses stay momentary); zoom stages stay a hold/toggle affordance
    const now = performance.now();
    if (now - Input._lastAdsTap < 280) { Input.ads = !Input.ads; Input._lastAdsTap = -1e9; }
    else Input._lastAdsTap = now;
  }
  // T1-3 tap-strafe: double-tap A/D within 280ms raises a redirect edge (airborne
  // gating happens in physics.js; this is pure input-layer detection, no wheel).
  // Deliberately NOT rebound: it is movement DATA (physical A/D), not an action key.
  if (code === 'KeyA' || code === 'KeyD') {
    const now = performance.now();
    if (code === 'KeyA') { if (now - Input._lastTapA < 280) Input.tapStrafeEdge = -1; Input._lastTapA = now; }
    else { if (now - Input._lastTapD < 280) Input.tapStrafeEdge = 1; Input._lastTapD = now; }
  }
}
export function onKeyUpCode(code) {
  Input.keys.delete(code);
  const a = actionForCode(code);
  if (a && EDGE_ACTIONS.has(a)) Input.released.add(a);
}
export function onMouseDownCode(button) { // button: 0 | 1 | 2
  const code = 'Mouse' + button;
  Input._mouse.add(code);
  const a = actionForCode(code);
  if (a === 'fire') { Input.fire = true; Input.onFireDown && Input.onFireDown(); }
  else if (a === 'ads') { // T1-8 hold/toggle + [v1.50 port T90] §60.2 M5 double-tap law (all pointer paths share one <280ms clock)
    const now = performance.now();
    if (Input.aimMode === 'toggle') {
      if (Input.ads && now - Input._lastAdsTap < 280) Input.just.add('scope2'); // re-tap while latched = zoom stage
      else Input.ads = !Input.ads;
    } else if (Input.aimMode === 'double') { // [T119] 2X-TAP ADS — a <280ms pair latches the stance
      if (now - Input._lastAdsTap < 280) { Input.ads = !Input.ads; Input._lastAdsTap = -1e9; }
      else Input._lastAdsTap = now;
    } else {
      if (now - Input._lastAdsUp < 280) Input.just.add('scope2'); // fast re-press (hold mode) = zoom stage
      Input.ads = true;
    }
    Input._lastAdsTap = now;
  }
  else if (a && EDGE_ACTIONS.has(a)) Input.just.add(a);
}
export function onMouseUpCode(button) {
  const code = 'Mouse' + button;
  Input._mouse.delete(code);
  const a = actionForCode(code);
  if (a === 'fire') Input.fire = false;
  else if (a === 'ads') { Input._lastAdsUp = performance.now(); if (Input.aimMode === 'hold') Input.ads = false; } // [v1.50 port T90] M5 hold-mode clock · toggle/2X-TAP: release keeps the latch [T119]
}

export function requestLock() {
  const c = host();
  if (c && !Input.touchMode) {
    try { const p = c.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch {}
  }
}
export function exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

const heldCode = (code) => (code.startsWith('Mouse') ? Input._mouse.has(code) : Input.keys.has(code));
function bindsHeld(a) { // any bound code currently held (T1-7: replaces hardcoded key checks)
  const cs = Input.binds && Input.binds[a];
  if (!cs) return false;
  for (const c of cs) if (heldCode(c)) return true;
  return false;
}

export function actionDown(name) {
  switch (name) {
    case 'sprint': return bindsHeld('sprint') || Input.touchSprint === true || Input.padSprint === true;
    case 'crouch': return bindsHeld('crouch_hold') || bindsHeld('crouch_toggle') || Input.crouchToggled || Input.touchCrouch === true; // [T119] held-C is momentary in EVERY mode; the latch is mode-gated at the edge
    case 'fire': return bindsHeld('fire') || Input.touchFire === true || Input.padFire === true || Input.autoFireOn === true; // [v1.50 port T90] §60.2 M7-lite: auto-fire verdict from main.js cone
    case 'ads':
      if (Input.aimMode === 'toggle' || Input.aimMode === 'double') return Input.ads || Input.adsToggle || Input.padAds === true; // toggle/2X-TAP: edge-latched flags only [T119]
      return bindsHeld('ads') || Input.ads || Input.adsToggle || Input.padAds === true; // E = keyboard aim-hold, parity with RMB hold (default == shipped behavior)
    case 'moveF': return bindsHeld('moveF') || Input.stick.y < -0.25;
    case 'moveB': return bindsHeld('moveB') || Input.stick.y > 0.25;
    case 'moveL': return bindsHeld('moveL') || Input.stick.x < -0.25;
    case 'moveR': return bindsHeld('moveR') || Input.stick.x > 0.25;
  }
  return false;
}
export function consume(a) { if (Input.just.has(a)) { Input.just.delete(a); return true; } return false; }
export function consumeRelease(a) { if (Input.released.has(a)) { Input.released.delete(a); return true; } return false; }

// [T122] (1) the CoD stance cycle — ONE law shared by the KeyC edge, the touch crouch tap and
// the gamepad B mirror (no per-path drift). Advancing: crouched → PRONE, prone → STANDING;
// standing arms crouch per the crouch MODE (2×tap pair / toggle / hold-mode latch). The
// dedicated KeyZ prone toggle and the Ctrl held channel are UNCHANGED (Z stays the direct
// prone action; jump still stands you up — main.js stand-up edges). touch=true keeps the
// touch tap's always-latch contract (probe_b15b 'crouch-slide') while gaining the cycle.
export function crouchStanceEdge(touch = false) {
  if (Input.proneLatch) { Input.crouchToggled = false; Input.just.add('prone'); Input.just.delete('crouch_toggle'); return; } // prone → stand (the prone toggle re-fire = 0; the raw edge is SUPPLANTED — the cycle owns the press)
  if (Input.crouchToggled) { Input.crouchToggled = false; Input.just.add('prone'); Input.just.delete('crouch_toggle'); return; } // crouched → prone — and the raw crouch_toggle edge is deleted: the SAME press must not also hit the main.js stand-up gate (consume('prone') runs first, then consume('crouch_toggle') would stand right back — the same-frame race the T122 drive caught live)
  if (touch || (Input.crouchMode || 'double') === 'toggle') { Input.crouchToggled = true; return; } // touch ignores the kb mode law (always-latch — b15b); toggle latches per press
  if ((Input.crouchMode || 'double') === 'double') {
    const now = performance.now();
    if (now - Input._lastCrouchTap < 280) { Input.crouchToggled = true; Input._lastCrouchTap = -1e9; }
    else Input._lastCrouchTap = now; // a single press stays momentary via the held channel (the [T119] law, unchanged)
    return;
  }
  Input.crouchToggled = true; // 'hold' mode: the C edge latches crouch (the Ctrl channel stays the momentary path)
}

export function endFrame() {
  Input.mdx = 0; Input.mdy = 0; Input.wheel = 0;
  Input.lookDX = 0; Input.lookDY = 0;
  Input.just.clear(); Input.released.clear();
}

// ---------------- TOUCH ----------------
function initTouch() {
  const $ = (id) => document.getElementById(id);
  const sz = $('stick-zone'), lz = $('look-zone'), base = $('stick-base'), nub = $('stick-nub');

  // dynamic stick
  sz.addEventListener('touchstart', (e) => {
    // §62.1 (Task 81 recovery) T80 P3: acquire-guard — a second touch on the stick zone
    // (e.g. a missed fire tap) must NOT steal the live move finger or teleport the base.
    // CODM: the dynamic stick re-centers only after the current move finger lifts.
    if (Input._stickId === -1) {
      const t = e.changedTouches[0];
      Input._stickId = t.identifier;
      Input._stickBase = { x: t.clientX, y: t.clientY };
      base.style.left = (t.clientX - sz.getBoundingClientRect().left - 68) + 'px';
      base.style.bottom = 'auto'; base.style.top = (t.clientY - sz.getBoundingClientRect().top - 68) + 'px';
    }
    e.preventDefault();
  }, { passive: false });
  const onStickMove = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== Input._stickId) continue;
      const dx = t.clientX - Input._stickBase.x, dy = t.clientY - Input._stickBase.y;
      const max = CFG.TOUCH.stickMax || 60, dead = CFG.TOUCH.stickDead || 0; // §62.4 numerics (v1.54): defaults == legacy 60 / no dead-zone
      const len = Math.hypot(dx, dy), cl = Math.min(len, max);
      const mag = cl / max; // normalized 0..1
      const m2 = mag < dead ? 0 : (mag - dead) / (1 - dead); // §62.4 rescale law (v−dz)/(1−dz) — dead=0 → mag byte-identical
      const nx = len ? dx / len : 0, ny = len ? dy / len : 0;
      Input.stick.x = nx * m2; Input.stick.y = ny * m2;
      nub.style.transform = `translate(calc(-50% + ${nx * cl}px), calc(-50% + ${ny * cl}px))`;
    }
    e.preventDefault();
  };
  sz.addEventListener('touchmove', onStickMove, { passive: false });
  const endStick = (e) => {
    for (const t of e.changedTouches) if (t.identifier === Input._stickId) {
      Input._stickId = -1; Input.stick.x = 0; Input.stick.y = 0;
      nub.style.transform = 'translate(-50%,-50%)';
    }
  };
  sz.addEventListener('touchend', endStick); sz.addEventListener('touchcancel', endStick);

  // look drag — §62.1 (Task 81 recovery) multi-source look feed. PROVEN defects closed
  // (probe_t80 on this tree: P2/P6 FAIL fire-only, P3 FAIL stick steal):
  //  · CODM fire buttons are HYBRID surfaces (hold = fire, drag = aim): the same thumb
  //    fires and micro-drags to track. Every look surface registers its touch into
  //    Input._looks (Map<touchId,{x,y}>); all registered sources feed the SAME delta
  //    law (d × CFG.TOUCH.lookBase × touchSens), so a look finger and a fire finger
  //    aim simultaneously.
  //  · Sources release on touchend AND touchcancel (browser gesture steal), so a
  //    cancelled finger can never wedge the feed (T80 P5 law).
  const feedStart = (t) => { Input._looks.set(t.identifier, { x: t.clientX, y: t.clientY }); };
  const feedMove = (e) => {
    for (const t of e.changedTouches) {
      const p = Input._looks.get(t.identifier);
      if (!p) continue;
      const dX = t.clientX - p.x, dY = t.clientY - p.y;
      const dz = CFG.TOUCH.lookDead || 0; // §62.4 (v1.54): sub-pixel jitter filter — 0 = every px feeds (legacy)
      // [T90 merge] M8b: aim curve at the look-delta application point — CLASSIC shapes the delta
      // (aimCurveDelta: d' = sign(d)·|d|^1.5, CFG.AIM_CURVE.exp OUR-CONSTANT), LINEAR passes raw.
      // Applied AFTER the dead-zone gate, BEFORE the M3 scale. Touch look paths ONLY — this feed is
      // the single application point for look-zone/look-l/hybrid-fire drags; desktop mouse deltas
      // (Input.mdx/mdy) never reach it. Default CLASSIC per M8 order (deliberate touch-feel change).
      const mode = Input.aimCurve;
      if (Math.abs(dX) >= dz) Input.lookDX += aimCurveDelta(dX, mode) * CFG.TOUCH.lookBase * (Input.touchSens || 1);
      if (Math.abs(dY) >= dz) Input.lookDY += aimCurveDelta(dY, mode) * CFG.TOUCH.lookBase * (Input.touchSens || 1);
      p.x = t.clientX; p.y = t.clientY;
    }
    e.preventDefault();
  };
  const feedEnd = (e) => { for (const t of e.changedTouches) Input._looks.delete(t.identifier); };
  const attachLook = (zone) => {
    zone.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) if (!Input._looks.has(t.identifier)) feedStart(t);
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', feedMove, { passive: false });
    zone.addEventListener('touchend', feedEnd); zone.addEventListener('touchcancel', feedEnd);
  };
  attachLook(lz);
  const lz2 = $('look-l'); if (lz2) attachLook(lz2); // M12 home (§60.2): binds when the corner zone re-lands

  // §62.1 (Task 81 recovery): hybrid=true (fire buttons) ALSO registers the touch as a
  // look source and feeds its moves — hold = fire, drag = aim (CODM fire-button law).
  // §62.4 (v1.54): hybridDrag threshold — the touch must travel >CFG.TOUCH.hybridDrag px
  // (accumulated from start) before aim engages; 0 = engages immediately (legacy law).
  // [v1.50 port T90] §55.6 (v1.47): body.hud-editing gates ALL game bindings — the HUD
  // editor's own pointer handlers (ui.js) own the events during an edit session.
  const editGate = () => typeof document !== 'undefined' && document.body.classList.contains('hud-editing');
  const hold = (id, on, off, hybrid) => {
    const el = $(id); if (!el) return; // [v1.50 port T90] null-guard: M2/M4/M9 tbtn DOM re-lands with index.html
    el.addEventListener('touchstart', (e) => {
      if (editGate()) return; e.preventDefault(); e.stopPropagation();
      el.classList.add('on'); on && on();
      if (hybrid) for (const t of e.changedTouches) if (!Input._looks.has(t.identifier)) feedStart(t);
    }, { passive: false });
    if (hybrid) el.addEventListener('touchmove', (e) => {
      const thr = CFG.TOUCH.hybridDrag || 0;
      if (!thr) { feedMove(e); return; } // 0 = legacy immediate feed
      for (const t of e.changedTouches) {
        const p = Input._looks.get(t.identifier);
        if (p && Math.hypot(t.clientX - p.x, t.clientY - p.y) > thr) { feedMove(e); break; }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => { if (editGate()) return; e.preventDefault(); el.classList.remove('on'); off && off(); if (hybrid) feedEnd(e); };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  };
  const tap = (id, fn) => { const el = $(id); if (!el) return; el.addEventListener('touchstart', (e) => { if (editGate()) return; e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); }; // [v1.50 port T90] editGate + null-guard

  // [v1.50 port T90] §55.6 (v1.47): saved HUD layout law — per-button --mx/--my/--ms/--mo
  // applied at bind time (boot + every initTouch), so a reloaded session restores the edit.
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_LS_KEY) || '{}') || {}; } catch { saved = {}; }
  const tu = saved.touchUI && saved.touchUI.btns ? saved.touchUI.btns : {};
  for (const [id, r] of Object.entries(tu)) {
    const el = $(id); if (!el || !r) continue;
    el.style.setProperty('--ms', r.s || 1); el.style.setProperty('--mo', r.o || 1);
    el.style.setProperty('--mx', (r.x || 0) + 'px'); el.style.setProperty('--my', (r.y || 0) + 'px');
  }

  hold('btn-fire-r', () => { Input.touchFire = true; Input.onFireDown && Input.onFireDown(); }, () => Input.touchFire = false, true); // §62.1 hybrid: hold=fire, drag=aim
  hold('btn-fire-l', () => { Input.touchFire = true; Input.onFireDown && Input.onFireDown(); }, () => Input.touchFire = false, true); // §62.1 hybrid: hold=fire, drag=aim
  // [v1.50 port T90] §60.2 (v1.48) M5: ADS tap law — single tap toggles aim; a re-tap
  // while aim is latched (<280ms) raises the scope2 zoom-stage edge instead (M5 oscillation fix).
  tap('btn-ads', () => {
    const now = performance.now();
    if (Input.adsToggle && now - Input._lastAdsTap < 280) Input.just.add('scope2');
    else { Input.adsToggle = !Input.adsToggle; $('btn-ads').classList.toggle('on', Input.adsToggle); }
    Input._lastAdsTap = now;
  });
  tap('btn-jump', () => Input.just.add('jump'));
  tap('btn-crouch', () => crouchStanceEdge(true)); // [T122] (1) the touch crouch tap rides the SAME cycle (always-latch from standing — the b15b contract kept)
  tap('btn-reload', () => Input.just.add('reload'));
  tap('btn-swap', () => Input.just.add('quickswap'));
  hold('btn-nade', () => { Input._nadeDown = true; Input.just.add('nade'); }, () => Input._nadeDown = false);
  tap('btn-melee', () => Input.just.add('melee'));
  tap('btn-ability', () => Input.just.add('ability'));
  tap('btn-pause-t', () => Input.onPause && Input.onPause());
  // [v1.50 port T90] §60.2 (v1.48) mobile playability buttons: M2 sprint, M4 streaks, M9 ping+scoreboard
  hold('btn-sprint', () => Input.touchSprint = true, () => Input.touchSprint = false);
  tap('btn-streak-0', () => Input.just.add('streak0'));
  tap('btn-streak-1', () => Input.just.add('streak1'));
  tap('btn-streak-2', () => Input.just.add('streak2'));
  tap('btn-ping', () => Input.just.add('ping'));
  hold('btn-board', () => Input.padScoreboard = true, () => Input.padScoreboard = false); // main.js already reads padScoreboard
}
// §62.4 M17 (v1.54, re-land): death/latch reset — every input LATCH clears so a dead
// player cannot keep firing/looking/sticking from pre-death touches. Stance toggles
// (crouchToggled/adsToggle/proneLatch) deliberately persist — they are user stance, not latches.
export function resetTouchLatches() {
  Input._looks.clear();
  Input._stickId = -1; Input._stickBase.x = 0; Input._stickBase.y = 0;
  Input.stick.x = 0; Input.stick.y = 0;
  Input.touchFire = false; Input._nadeDown = false;
  Input.just.clear();
}
export const nadeHeldTouch = () => Input._nadeDown;
