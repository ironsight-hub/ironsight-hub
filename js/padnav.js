// ============================================================
// IRONSIGHT — padnav.js : [T122] (3) the CoD-grammar controller MENU navigation
// (the user decree: menu navigation freely via the directional buttons / left stick).
// D-PAD or left stick moves a focus ring over the visible menu page's interactive
// elements (button / input / select); A (btn 0) ACTIVATES the focused element;
// B (btn 1) goes BACK — ui.goBack(), the [T121] (10) visited-history law — or blurs
// a focused input first. Inert while a match hides #menu-root (the in-game layer
// stays gamepad.js — the two never fight: padnav acts ONLY on visible menus).
// Polling: its own rAF loop (menus must navigate even when the game loop is idle).
// navDirs() is the pure half — probe-tested headless (node+bun), zero DOM.
// The d-pad/menu buttons are deliberately NOT remappable via padBinds (menu grammar,
// not combat — the T1-7 capture UI stays the combat-bind surface).
// ============================================================

const NAV_BTN = { up: 12, down: 13, left: 14, right: 15, activate: 0, back: 1 }; // W3C standard map (the gamepad.js header law)
const STICK_GATE = 0.55; // radial gate for the left-stick directions (above the combat move deadzone — menus demand intent)

// PURE: per-direction edges (just-pressed) from a Gamepad-like snapshot.
// prev is the caller-owned edge memory (mutated in place — the gamepad.js _prev idiom).
export function navDirs(btns, axes, prev) {
  const out = { up: false, down: false, left: false, right: false, activate: false, back: false };
  const down = (i) => !!(btns && btns[i] && (btns[i].pressed || btns[i].value > 0.5));
  for (const k of ['up', 'down', 'left', 'right', 'activate', 'back']) {
    const now = down(NAV_BTN[k]);
    out[k] = now && !prev['b_' + k];
    prev['b_' + k] = now;
  }
  if (axes && axes.length >= 2) {
    const x = axes[0] || 0, y = axes[1] || 0;
    const sx = Math.abs(x) > STICK_GATE ? (x > 0 ? 'right' : 'left') : null;
    const sy = Math.abs(y) > STICK_GATE ? (y > 0 ? 'down' : 'up') : null;
    for (const k of ['up', 'down', 'left', 'right']) {
      const live = (sx === k || sy === k);
      if (live && !prev['s_' + k]) out[k] = true; // edge on gate entry (re-trigger rides the button repeat of the SAME law: re-entry after center)
      prev['s_' + k] = live;
    }
  }
  return out;
}

export const PadNav = {
  ui: null, _prev: {}, _raf: 0, _el: null,
  attach(ui) {
    this.ui = ui; this._prev = {}; this._el = null;
    const loop = () => { try { this.poll(); } catch (_) {} this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  },
  // the visible page's interactive set — DOM order (the authored visual order)
  candidates() {
    const root = this.ui && this.ui._curPage ? document.getElementById(this.ui._curPage) : null;
    if (!root || root.classList.contains('hidden')) return [];
    return [...root.querySelectorAll('button, input, select')]
      .filter(el => !el.closest('.hidden') && el.offsetParent !== null && !el.disabled && el.dataset.padnav !== 'skip');
  },
  poll() {
    const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
    const gp = pads ? [...pads].find(g => g && g.connected) : null;
    if (!gp) return;
    const menuRoot = document.getElementById('menu-root');
    const menuOn = menuRoot && !menuRoot.classList.contains('hidden');
    if (!menuOn) { if (this._el) { this._el.classList.remove('pad-focus'); this._el = null; } return; }
    const d = navDirs(gp.buttons, gp.axes, this._prev);
    const move = (d.up || d.left) ? -1 : (d.down || d.right) ? 1 : 0;
    if (move) {
      const list = this.candidates();
      if (list.length) {
        let i = this._el ? list.indexOf(this._el) : -1;
        i = ((i < 0 ? 0 : i + move) % list.length + list.length) % list.length;
        this.focus(list[i]);
      }
    }
    if (d.activate && this._el) this._el.click();
    if (d.back) {
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) ae.blur(); // typing first: B leaves the field, second B leaves the page
      else if (this.ui && this.ui.goBack) this.ui.goBack();
    }
  },
  focus(el) {
    if (this._el) this._el.classList.remove('pad-focus');
    this._el = el;
    el.classList.add('pad-focus');
    try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) { /* older engines */ }
  },
};
