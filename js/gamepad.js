// ============================================================
// IRONSIGHT — gamepad.js : W3C standard-mapping controller layer
// [DOC-FIDELITY — implementation follows these documented contracts:
//  W3C Gamepad spec — https://www.w3.org/TR/gamepad/ (standard layout: 4 axes, 17 buttons, mapping "standard")
//  MDN Using the Gamepad API — https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
//    (poll navigator.getGamepads() for a fresh snapshot every frame; connect/disconnect via gamepadconnected/-disconnected)
//  MDN GamepadHapticActuator.playEffect — https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect
//    ('dual-rumble', { startDelay, duration, weakMagnitude, strongMagnitude })
//  Deadzones — https://www.gamedeveloper.com/business/doing-thumbstick-dead-zones-right
//    (radial deadzone + rescale (v−dz)/(1−dz); axial rejected for analog movement: snap-to-grid)]
// Button map (standard index) — DEFAULTS, remappable via settings.padBinds (T1-7,
// ui.js Controls tab; config.js PAD_BINDS is the fallback table):
//   0 A jump · 1 B crouch-toggle · 2 X reload · 3 Y quickswap
//   4 LB ability · 5 RB grenade (hold = cook) · 6 LT aim (analog) · 7 RT fire (analog)
//   8 View scoreboard (hold) · 9 Menu pause · 10 L3 sprint (hold) · 11 R3 melee
//   12-15 D-pad: UAV / ping / Supply / Airstrike · 16 HOME/GUIDE: camera perspective [T122]
// ============================================================
import { CFG, PAD_BINDS } from './config.js';
import { crouchStanceEdge } from './input.js'; // [T122] (1) the shared stance cycle (input.js imports config only — no cycle)

export const Gamepad = {
  active: false, index: -1, id: '',
  _settings: null, _announce: null, _assist: null,
  _moveActive: false, _prev: {}, _prevRT: false, _prevStart: false, _lastShot: 0,
  _adsTog: false, _prevAds: false, // T1-8: aim-mode toggle latch (LT edge flips aim on)
};

export function initGamepad({ settings, announce, assist }) {
  Gamepad._settings = settings;
  Gamepad._announce = announce;
  Gamepad._assist = assist;
  addEventListener('gamepadconnected', (e) => {
    Gamepad.active = true;
    Gamepad.index = e.gamepad.index;
    Gamepad.id = e.gamepad.id;
    if (announce) announce('GAMEPAD', shortName(e.gamepad.id) + ' ONLINE — RT FIRE · LS MOVE · MENU PAUSE');
  });
  addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad.index !== Gamepad.index) return;
    Gamepad.active = false;
    Gamepad.index = -1;
    Gamepad._prev = {};
    Gamepad._prevRT = false;
    Gamepad._prevStart = false;
    Gamepad._adsTog = false; Gamepad._prevAds = false;
    if (announce) announce('GAMEPAD', 'DISCONNECTED');
  });
}

function shortName(id) {
  const s = String(id).replace(/\(.*?\)/g, '').trim();
  return (s.length ? s : 'CONTROLLER').slice(0, 26).toUpperCase();
}

// radial deadzone + rescale + gamma response curve, rim snap
function shape(x, y, dz) {
  const G = CFG.GAMEPAD;
  const mag = Math.hypot(x, y);
  if (mag <= dz || mag < 1e-6) return [0, 0, 0];
  const n = Math.min(1, (mag - dz) / (1 - dz));
  const out = n >= G.outerSnap ? 1 : Math.pow(n, G.curveGamma);
  return [(x / mag) * out, (y / mag) * out, out];
}

const pressed = (gp, i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
const trigVal = (gp, i) => (gp.buttons[i] ? (gp.buttons[i].value || 0) : 0);
// T1-7: triggers keep their analog actuation threshold (industry 0.12), other buttons use
// pressed(); binding an action TO a trigger slot inherits trigger semantics. With the
// default PAD_BINDS (fire=7/aim=6) this is byte-identical to the shipped trigVal path.
const padDown = (gp, i) => (i === 6 || i === 7) ? (trigVal(gp, i) > CFG.GAMEPAD.triggerThresh) : pressed(gp, i);

// T1-7: edge actions (just/released) — remappable, default indices == shipped EDGE table
const PAD_EDGE = ['jump', 'crouch_toggle', 'reload', 'quickswap', 'ability', 'nade', 'melee', 'streak0', 'streak1', 'streak2', 'ping', 'camtoggle']; // [T122] (2) camtoggle joins — TPV/FPV on the controller (BTN 16 default, remappable)

export function pollGamepad(Input, dt) {
  if (!Gamepad.active) return;
  const gp = navigator.getGamepads()[Gamepad.index]; // fresh snapshot each frame [MDN]
  if (!gp || !gp.connected) { Gamepad.active = false; return; }
  const G = CFG.GAMEPAD;
  const s = Gamepad._settings ? (Gamepad._settings() || {}) : {};
  // T1-7: per-action pad binding lookup — settings.padBinds (saved, UI-editable) over
  // config.PAD_BINDS (shipped defaults). Out-of-range/garbage values fall back per action.
  const bidx = (a) => {
    const v = s.padBinds ? s.padBinds[a] : undefined;
    return (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 17) ? v : PAD_BINDS[a];
  };

  // ---- left stick → move (same channel as touch stick; hands back cleanly) ----
  const [mx, my] = shape(gp.axes[0] || 0, gp.axes[1] || 0, s.gpDeadzone ?? G.moveDeadzone);
  if (mx || my) { Input.stick.x = mx; Input.stick.y = my; Gamepad._moveActive = true; }
  else if (Gamepad._moveActive) { Input.stick.x = 0; Input.stick.y = 0; Gamepad._moveActive = false; }

  // ---- right stick → look (same channel as touch look: main.js lookDX * 0.0022 * sens) ----
  // T1-7: look deadzone is user-facing now (settings.gpLookDeadzone, default == legacy G.lookDeadzone)
  const [cx, cy, cm] = shape(gp.axes[2] || 0, gp.axes[3] || 0, s.gpLookDeadzone ?? G.lookDeadzone);
  if (cm > 0) {
    const slow = (s.gpAssist !== false && Gamepad._assist && Gamepad._assist()) ? G.assistFactor : 1;
    // rad/s → counts/s: main.js applies `yawPerCount` (0.0022) to the lookDX/DY channel
    const r = (G.lookRate * (s.gpSens ?? 1) * slow) / CFG.LOOK.yawPerCount;
    Input.lookDX += cx * r * dt;
    Input.lookDY += cy * r * dt;
  }

  // ---- triggers / held buttons (T1-7: remappable via settings.padBinds, PAD_BINDS fallback) ----
  const fireDown = padDown(gp, bidx('fire'));
  Input.padFire = fireDown;
  const adsDown = padDown(gp, bidx('aim'));
  if (s.aimMode === 'toggle') { // T1-8: LT tap latches aim (re-tap lowers); disconnect clears
    if (adsDown && !Gamepad._prevAds) Gamepad._adsTog = !Gamepad._adsTog;
    Input.padAds = !!Gamepad._adsTog;
  } else {
    Input.padAds = adsDown;
    Gamepad._adsTog = false;
  }
  Gamepad._prevAds = adsDown;
  if (fireDown && !Gamepad._prevRT && Input.onFireDown) Input.onFireDown(); // fire edge + audio resume parity
  Gamepad._prevRT = fireDown;

  Input.padSprint = padDown(gp, bidx('sprint'));
  Input.padScoreboard = padDown(gp, bidx('scoreboard'));

  // ---- edge actions ----
  for (const a of PAD_EDGE) {
    const i = bidx(a);
    const now = pressed(gp, i);
    const was = !!Gamepad._prev[a];
    if (now && !was) {
      Input.just.add(a);
      if (a === 'crouch_toggle') crouchStanceEdge(false); // [T122] (1) the shared stance cycle — was the KeyC-mirror flip; the cycle is the ONE law (crouched press = prone, prone press = standing)
    } else if (!now && was) {
      Input.released.add(a); // grenade release → throw (consumeRelease('nade'))
    }
    Gamepad._prev[a] = now;
  }

  // ---- pause (Menu) ----
  const st = padDown(gp, bidx('pause'));
  if (st && !Gamepad._prevStart && Input.onPause) Input.onPause();
  Gamepad._prevStart = st;
}

// kind: 'shot' | 'hurt' | 'boom' — playEffect('dual-rumble') per MDN contract
export function padRumble(kind, scale = 1) {
  if (!Gamepad.active) return;
  const s = Gamepad._settings ? Gamepad._settings() : null;
  if (s && s.gpVibration === false) return;
  const gp = navigator.getGamepads()[Gamepad.index];
  const act = gp && gp.vibrationActuator;
  if (!act || typeof act.playEffect !== 'function') return;
  const def = CFG.GAMEPAD.rumble[kind];
  if (!def) return;
  if (kind === 'shot') {
    const t = performance.now();
    if (t - Gamepad._lastShot < 30) return; // don't stack per-shot rumbles past 33Hz feel
    Gamepad._lastShot = t;
  }
  const sc = Math.max(0, Math.min(1.25, scale));
  try {
    const p = act.playEffect('dual-rumble', {
      startDelay: 0,
      duration: def[2],
      weakMagnitude: Math.min(1, def[0] * sc),
      strongMagnitude: Math.min(1, def[1] * sc),
    });
    if (p && p.catch) p.catch(() => {});
  } catch {}
}
