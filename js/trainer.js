// ============================================================
// IRONSIGHT — trainer.js : the T168 FPS trainer
// ============================================================
// The classic game-trainer overlay: [7] toggles the panel, the
// panel toggles the regular trainer options. EVERY cheat hooks a
// REAL engine site found by code read (the zero-guessing law) —
// the hook map, all code-proven this task:
//   GOD MODE      → main.js damagePlayer() early-return (the local
//                   sim's ONLY inbound damage choke)
//   ONE-SHOT KILL → bots.js applyDamage() attacker.isPlayer gate
//                   (covers bullets + explosions + melee — every
//                   player-dealt bot-damage path funnels here)
//   INFINITE AMMO → weapons.js shoot() mag-- gate + per-frame
//                   mags/reserve hold (trainer.hold)
//   INFINITE NADES→ weapons.js throwNade()/cook decrement +
//                   per-frame frag 3 / flash 2 hold
//   NO RECOIL     → weapons.js shoot() pattern adds gated
//   NO SPREAD     → weapons.js currentSpread() → 0
//   SUPER SPEED   → CFG.PHYS.walkSpeed ×2 (physics.js holds a LIVE
//                   module alias `const P = CFG.PHYS` — property
//                   reads see runtime mutation; original captured
//                   at import for the restore law)
//   MOON JUMP     → CFG.PHYS.jumpVel ×1.7 (apex ≈3.5 m — under the
//                   8.5 m fallDamageH, so the cheat never self-damages)
//   FREEZE BOTS   → bots.js update() per-bot skip (AI+physics+fire
//                   stop; corpses keep their drive; you can still
//                   shoot them)
//   INFINITE CR   → career.cr floor (the offline wallet the shop's
//                   local legs spend from)
// HONEST SCOPE (the code says so, so the panel says so): MP combat
// is server-authoritative (main.js damagePlayer: `if (CFG.MP.enabled)
// return`; mp.js:648 "the client never computes its own damage in MP")
// — god/one-shot/freeze are OFFLINE-SIM cheats; movement/ammo/spread
// are client-PREDICTION cheats in MP (the server re-steps its own
// CFG and corrects). The server-truth CR chip (eco.cr) is hub-owned:
// the hub seed law credits the ADMIN account +987,654 (index.ts T168).
// One import: config.js (the PHYS constants the speed/jump toggles mutate —
// config.js imports nothing, so the leaf-module law holds; no cycle possible).
// ============================================================
import { CFG } from './config.js';

export const TRAINER = {
  on: {
    god: false, oneshot: false, ammo: false, nades: false,
    recoil: false, spread: false, speed: false, jump: false,
    freeze: false, cr: false,
  },
  open: false,
  CR_FLOOR: 987654, // [T168] the user's grant number doubles as the infinite-CR floor
  _deps: null,
  _walk0: null, _jump0: null, // the restore law — originals captured once

  init(deps) {
    this._deps = deps; // { inMatch(), announce(title, sub), requestLock(), exitLock(), wallet(), walletRefresh() }
    if (this._walk0 === null) this._walk0 = CFG.PHYS.walkSpeed; // the restore law — captured at init, before any toggle
    if (this._jump0 === null) this._jump0 = CFG.PHYS.jumpVel;
    this._build();
  },

  capturePhys(walk, jump) { // main.js calls once at boot (belt+braces — init already self-captures)
    if (this._walk0 === null) this._walk0 = walk;
    if (this._jump0 === null) this._jump0 = jump;
  },

  isOpen() { return this.open; },

  togglePanel() {
    if (!this._deps || !this._deps.inMatch()) return; // the trainer is an in-match overlay (classic scope)
    this.open = !this.open;
    const el = this._panel;
    if (!el) return;
    if (this.open) {
      this._refresh();
      el.classList.remove('tr-hide');
      this._deps.exitLock(); // the toggles are clickable — the pointer leaves the canvas
    } else {
      el.classList.add('tr-hide');
      this._deps.requestLock(); // back to the fight (main.js re-locks only when in-match live)
    }
    try { this._deps.click && this._deps.click(); } catch (e) {}
  },

  closePanel(relock) { // ESC law (main.js Input.onPause) + match-end cleanup
    if (!this.open) return;
    this.open = false;
    if (this._panel) this._panel.classList.add('tr-hide');
    if (relock && this._deps) this._deps.requestLock();
  },

  set(key, v) {
    this.on[key] = !!v;
    // toggle-time side effects — the CFG.PHYS mutations (speed/jump) are the only ones;
    // physics.js reads `P.walkSpeed`/`P.jumpVel` live per step, so writes land next frame
    if (key === 'speed' && this._walk0 != null) CFG.PHYS.walkSpeed = this.on.speed ? this._walk0 * 2 : this._walk0;
    if (key === 'jump' && this._jump0 != null) CFG.PHYS.jumpVel = this.on.jump ? this._jump0 * 1.7 : this._jump0;
    if (key === 'cr' && this.on.cr) this._touchWallet();
    this._refresh();
  },

  toggle(key) { this.set(key, !this.on[key]); },

  // ---- per-frame holds (main.js loop; the ONE place state gets pinned) ----
  hold(weapons, career, saveCareer) {
    const on = this.on;
    // wallet floor — runs in menus too (classic infinite-money scope); the shop's
    // local legs spend career.cr, so the floor holds there as well
    if (on.cr && career) {
      if ((career.cr | 0) < this.CR_FLOOR) { career.cr = this.CR_FLOOR; try { saveCareer && saveCareer(career); } catch (e) {} if (this._deps && this._deps.walletRefresh) this._deps.walletRefresh(); }
    }
    if (!this._deps || !this._deps.inMatch()) return;
    if (weapons) {
      if (on.ammo && weapons.slotWeapons) {
        for (const w of weapons.slotWeapons) {
          if (!w || !w.def) continue;
          w.mag = w.def.mag; w.reserve = w.def.reserve;
        }
      }
      if (on.nades && weapons.nades) { weapons.nades.frag = 3; weapons.nades.flash = 2; }
    }
  },

  wallet() { return this._deps && this._deps.wallet ? this._deps.wallet() : 0; },
  _touchWallet() { if (this._deps && this._deps.walletRefresh) this._deps.walletRefresh(); this._refresh(); },

  // ---- the panel (built once at init; zero index.html edit — self-contained module) ----
  _build() {
    if (typeof document === 'undefined' || document.getElementById('trainer-panel')) return;
    const css = document.createElement('style');
    css.textContent = `
#trainer-panel{position:fixed;top:64px;right:16px;width:308px;max-height:calc(100vh - 96px);overflow-y:auto;
  background:rgba(8,12,10,.94);border:1px solid #2f4f38;border-radius:10px;padding:12px 12px 10px;z-index:99999;
  color:#cfe8d4;font:12px/1.45 ui-monospace,'Cascadia Mono',Menlo,Consolas,monospace;box-shadow:0 10px 34px rgba(0,0,0,.55)}
#trainer-panel.tr-hide{display:none}
#trainer-panel h3{margin:0 0 2px;font-size:13px;letter-spacing:.14em;color:#7dff9a;font-weight:700}
#trainer-panel .tr-sub{margin:0 0 9px;font-size:10px;color:#6f8f76;letter-spacing:.06em}
#trainer-panel .tr-wallet{margin:0 0 9px;padding:6px 8px;background:#0d1a12;border:1px solid #23392a;border-radius:6px;font-size:11px}
#trainer-panel .tr-wallet b{color:#ffd76a}
#trainer-panel .tr-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 2px;border-top:1px solid #17251b}
#trainer-panel .tr-name{font-weight:700;letter-spacing:.05em;white-space:nowrap}
#trainer-panel .tr-note{display:block;font-weight:400;color:#6f8f76;font-size:10px;letter-spacing:0}
#trainer-panel .tr-pill{flex:none;width:52px;text-align:center;padding:3px 0;border-radius:5px;border:1px solid #3a5a44;
  background:#0d1a12;color:#88a88f;font-size:10px;letter-spacing:.12em;cursor:pointer;user-select:none}
#trainer-panel .tr-pill.on{background:#123d22;border-color:#7dff9a;color:#7dff9a}
#trainer-panel .tr-foot{margin-top:8px;padding-top:7px;border-top:1px solid #23392a;font-size:9.5px;color:#5d7a64;line-height:1.5}
`;
    document.head.appendChild(css);

    const ROWS = [
      ['god', 'GOD MODE', 'local sim · MP is server-owned'],
      ['oneshot', 'ONE-SHOT KILL', 'offline bots · MP is server-owned'],
      ['ammo', 'INFINITE AMMO', 'mags + reserve held full'],
      ['nades', 'INFINITE NADES', 'frag 3 · flash 2 held'],
      ['recoil', 'NO RECOIL', 'pattern kick disabled'],
      ['spread', 'NO SPREAD', 'hipfire cone pinned to 0'],
      ['speed', 'SUPER SPEED ×2', 'walk 9.8 · MP rubber-bands'],
      ['jump', 'MOON JUMP ×1.7', 'apex ≈3.5 m · no self-fall-dmg'],
      ['freeze', 'FREEZE BOTS', 'offline bots stop AI + fire'],
      ['cr', 'INFINITE CR', 'wallet floor ' + this.CR_FLOOR.toLocaleString('en-US')],
    ];
    const p = document.createElement('div');
    p.id = 'trainer-panel';
    p.classList.add('tr-hide');
    let html = '<h3>IRONSIGHT TRAINER</h3><div class="tr-sub">T168 · press 7 to close · ESC closes</div>';
    html += '<div class="tr-wallet">WALLET <b id="tr-wallet-n">—</b> <span style="color:#6f8f76">local · server chip rides the hub seed</span></div>';
    for (const [k, name, note] of ROWS) {
      html += '<div class="tr-row"><span class="tr-name">' + name + '<span class="tr-note">' + note + '</span></span><span class="tr-pill" data-tr="' + k + '">OFF</span></div>';
    }
    html += '<div class="tr-foot">Cheats are LOCAL-SIM truth. In MP the room service owns combat verdicts, so god/one-shot/freeze are the offline bots &amp; practice sim; movement + ammo ride prediction and the server re-steps its own physics.</div>';
    p.innerHTML = html;
    for (const pill of p.querySelectorAll('.tr-pill')) {
      pill.addEventListener('click', () => { this.toggle(pill.dataset.tr); });
    }
    document.body.appendChild(p);
    this._panel = p;
  },

  _refresh() {
    if (!this._panel) return;
    const w = this._panel.querySelector('#tr-wallet-n');
    if (w) w.textContent = this.wallet().toLocaleString('en-US') + ' CR';
    for (const pill of this._panel.querySelectorAll('.tr-pill')) {
      const on = !!this.on[pill.dataset.tr];
      pill.classList.toggle('on', on);
      pill.textContent = on ? 'ON' : 'OFF';
    }
  },
};
