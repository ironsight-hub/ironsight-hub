// ============================================================
// IRONSIGHT — hud.js : minimap, compass, killfeed, scoreboard,
// banners, damage direction, pings — all DOM/canvas pooled
// ============================================================
import * as THREE from 'three';
import { CFG, GG_LADDER } from './config.js';
import { t as tr } from './i18n.js'; // T2-8 (Task 64): alias tr — hud.js uses `t` as a local DOM handle (spec-target)
import { World } from './world.js';
import { Replay } from './replay.js'; // [T146] the live REC elapsed (replay.js is a leaf — zero imports, no cycle)

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const SB_TITLE = { ffa: 'ix.mdFfa', tdm: 'ix.mdTdm', dom: 'ix.mdDom', practice: 'ix.mdPrac', hp: 'ix.mdHp', kc: 'ix.mdKc', snd: 'ix.mdSnd', gg: 'ix.mdGg', gf: 'ix.mdGf', inf: 'ix.mdInf', ctl: 'ix.mdCtl', ct: 'ix.mdCt' }; // T106 — board title == mode-card head (ix.md* single truth, all 9 locales via the V-patch merge; was: ffa/tdm/dom 3-chain + TRAINING RANGE fall-through, T2-8) · [T139] ct joins — the 12th mode rides the same single truth

export class HUD {
  constructor() {
    this.el = {
      hud: $('hud'), crosshair: $('crosshair'), hitmarker: $('hitmarker'),
      healthNum: $('health-num'), healthFill: $('health-fill'), shieldFill: $('shield-fill'),
      ammoMag: $('ammo-mag'), ammoReserve: $('ammo-reserve'), weaponName: $('weapon-name'),
      weaponMode: $('weapon-mode'), ammoWrap: $('ammo-wrap'),
      abilityIcon: $('ability-icon'), abilityCd: $('ability-cd'), abilityCharges: $('ability-charges'),
      fragCount: $('frag-count'),
      killfeed: $('killfeed'), announcer: $('announcer'), subAnn: $('sub-announcer'), banners: $('banners'), captions: $('captions'), // [T161 R13] the subtitle bar (may be absent in old shells — caption() self-gates)
      minimap: $('minimap'), mapWrap: $('map-wrap'), compass: $('compass'),
      objBar: $('obj-bar'), objA: $('obj-A'), objB: $('obj-B'), objC: $('obj-C'), objInfo: $('obj-info'),
      scoreAlly: $('score-ally'), scoreEnemy: $('score-enemy'), timer: $('match-timer'),
      dmgV: $('dmg-vignette'), lowV: $('lowhp-vignette'), flash: $('flash-overlay'), focus: $('focus-overlay'),
      scope: $('scope-overlay'), ddi: $('dmg-direction'), pings: $('pings'),
      scoreboard: $('scoreboard'), sbHead: $('sb-head'), sbBody: $('sb-body'), sbTitle: $('sb-title'),
      death: $('death-screen'), deathRecap: $('death-recap'), respawnTimer: $('respawn-timer'),
      fps: $('fps-counter'), practice: $('practice-panel'),
      br: $('br-hud'), gasV: $('gas-vignette'), // [T171] the BR row + the gas vignette (may be absent in old shells — self-gated)
      ppDps: $('pp-dps'), ppHits: $('pp-hits'), ppShots: $('pp-shots'), ppAcc: $('pp-acc'),
      streaks: [...document.querySelectorAll('.streak')],
    };
    this.mm = this.el.minimap.getContext('2d');
    this.cp = this.el.compass.getContext('2d');
    this.pings = [];
    this.ddis = [];
    this.annT = 0;
    // [T118 G-8] the report seam — main.js wires onReport(name, reason) → sendSoc; the dialog
    // is ONE-at-a-time (self-guard) and survives the held-Tab rebuild (it lives outside the
    // scoreboard el). Rows rebuild EVERY held frame, so the click is DELEGATED on sbBody
    // (one listener, closest('tr[data-name]')) — never per-row onclick.
    this.onReport = null; this._rdlg = null; this._sbMp = false;
    this.el.sbBody.addEventListener('click', (e) => { const row = e.target.closest && e.target.closest('tr[data-name]'); if (row && this._sbMp) this.reportDialog(row.dataset.name); });
    // [T122 G-8] the .rd-*/.rpt-row/.sb-foot skin lives in style.css (the theme single-truth) —
    // the v1.88 native-skin law: the dialog inherits the scoreboard panel's own anatomy
    // (--panel2 + blur(10px) + --line2 + military-sharp --r1 radii + --dur1/--ease micro),
    // NOT injected literals. The overlay markup (reportDialog below) is unchanged.
    this.buildCrosshair({ style: 'cross', color: '#66ff66', size: 6, gap: 3, thickness: 2, dot: false, dynamic: true, outline: true, opacity: 1, dotSize: 2 });
  }

  // --- G-1 (v1.78): the crosshair editor renderer — 5 shapes (cross/t-shape/x/circle/dot),
  // outline toggle, user opacity, dot size. One geometry routine (_chLayout) feeds BOTH the
  // live #crosshair and the settings-tab preview host (#ch-preview-host); the per-frame
  // updateCrosshairDynamic keeps the dynamic-spread contract (spreadPx → gap/ring growth).
  static CH_STYLES = ['cross', 'tshape', 'x', 'circle', 'dot'];

  buildCrosshair(ch) {
    this.renderCrosshairInto(this.el.crosshair, ch);
    const host = document.getElementById('ch-preview-host'); // G-1: live preview inside the CROSSHAIR tab (absent on every other tab)
    if (host) this.renderCrosshairInto(host, ch, true);
  }

  renderCrosshairInto(el, ch, preview = false) {
    el.innerHTML = '';
    el.style.setProperty('--ch-color', ch.color);
    if (!preview) el.style.opacity = ch.opacity == null ? 1 : ch.opacity; // preview keeps its own band styling
    el._ch = ch;
    const style = ch.style === 'dot' ? 'dot' : (HUD.CH_STYLES.includes(ch.style) ? ch.style : 'cross'); // unknown → 'cross' (the §52.3 palette-law shape)
    el._chStyle = style;
    const mk = (css) => { const d = document.createElement('div'); d.className = css; el.appendChild(d); return d; };
    const lines = [];
    if (style === 'cross') { lines.push(mk('ch-line'), mk('ch-line'), mk('ch-line'), mk('ch-line')); el._chArms = ['t', 'b', 'l', 'r']; }
    else if (style === 'tshape') { lines.push(mk('ch-line'), mk('ch-line'), mk('ch-line')); el._chArms = ['t', 'l', 'r']; } // the bottom arm stays off
    else if (style === 'x') { lines.push(mk('ch-line'), mk('ch-line'), mk('ch-line'), mk('ch-line')); el._chArms = ['ne', 'nw', 'sw', 'se']; }
    const dot = (style === 'dot' || ch.dot) ? mk('ch-dot') : null; // style 'dot' IS the dot shape; ch.dot adds a center dot to any other shape
    const ring = style === 'circle' ? mk('ch-ring') : null;
    el._chParts = { lines, dot, ring };
    this._chLayout(el, 0);
  }

  // single geometry source for live + preview; spreadPx = the dynamic spread offset (rest pose = 0)
  _chLayout(el, spreadPx) {
    const ch = el._ch; if (!ch || !el._chParts) return;
    const sh = ch.outline === false ? '' : 'box-shadow:0 0 4px rgba(0,0,0,.9);'; // outline toggle (was hard-coded on the CSS classes)
    const th = ch.thickness, size = ch.size, g = ch.gap + (ch.dynamic ? spreadPx : 0);
    const { lines, dot, ring } = el._chParts;
    if (dot) {
      const ds = ch.dotSize || th || 2;
      dot.style.cssText = `width:${ds}px;height:${ds}px;left:0;top:0;position:absolute;background:var(--ch-color);${sh}`; // .ch-dot class keeps translate(-50%,-50%)
    }
    if (ring) {
      const D = Math.max(4, size * 2 + (ch.dynamic ? spreadPx : 0)); // border-box global → width includes the border; ring grows with spread
      ring.style.cssText = `width:${D}px;height:${D}px;left:${-D / 2}px;top:${-D / 2}px;position:absolute;border:${th}px solid var(--ch-color);border-radius:50%;background:transparent;${sh}`;
    }
    if (el._chStyle === 'x') {
      const d = (g + size / 2) * Math.SQRT1_2; // diagonal offset — tips rest at gap g on the 45° axis
      const geo = { ne: [d, -d, -45], nw: [-d, -d, 45], sw: [-d, d, -45], se: [d, d, 45] };
      (lines || []).forEach((L, i) => {
        const [x, y, rot] = geo[el._chArms[i]];
        L.style.cssText = `width:${size}px;height:${th}px;left:${x}px;top:${y}px;position:absolute;background:var(--ch-color);transform:translate(-50%,-50%) rotate(${rot}deg);${sh}`;
      });
    } else {
      (lines || []).forEach((L, i) => {
        const a = el._chArms[i];
        if (a === 't') L.style.cssText = `width:${th}px;height:${size}px;left:${-th / 2}px;top:${-g - size}px;position:absolute;background:var(--ch-color);${sh}`;
        else if (a === 'b') L.style.cssText = `width:${th}px;height:${size}px;left:${-th / 2}px;top:${g}px;position:absolute;background:var(--ch-color);${sh}`;
        else if (a === 'l') L.style.cssText = `width:${size}px;height:${th}px;left:${-g - size}px;top:${-th / 2}px;position:absolute;background:var(--ch-color);${sh}`;
        else L.style.cssText = `width:${size}px;height:${th}px;left:${g}px;top:${-th / 2}px;position:absolute;background:var(--ch-color);${sh}`;
      });
    }
  }

  updateCrosshairDynamic(spreadPx, ads) {
    const el = this.el.crosshair;
    if (!el._ch) return;
    this._chLayout(el, spreadPx);
    el.style.opacity = ads && this._scoped ? '0' : (el._ch.opacity == null ? 1 : el._ch.opacity); // user opacity composes with the scoped-ADS hide
  }

  hitmarker(kill = false, crit = false) {
    const hm = this.el.hitmarker;
    hm.classList.toggle('kill', kill); hm.classList.toggle('crit', crit && !kill);
    hm.style.opacity = '1';
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => { hm.style.opacity = '0'; }, 110);
  }

  banner(pts, label) {
    const d = document.createElement('div');
    d.className = 'xp-banner';
    d.innerHTML = (pts ? `<span class="xp-pts">+${pts}</span> ` : '') + label;
    this.el.banners.appendChild(d);
    if (window.gsap) {
      gsap.fromTo(d, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.18, ease: 'power2.out' });
      gsap.to(d, { opacity: 0, y: -14, delay: 1.6, duration: 0.4, onComplete: () => d.remove() });
    } else setTimeout(() => d.remove(), 2000);
    while (this.el.banners.children.length > 5) this.el.banners.firstChild.remove();
  }

  announce(main, sub) {
    // [T161 R13/R15] the a11y surfaces — reducedMotion gates the gsap pulse (no motion, the
    // text still lands); subtitles mirror the line into the caption bar (setSubtitles).
    if (main) {
      this.el.announcer.textContent = main;
      if (window.gsap && !this._reduced) gsap.fromTo(this.el.announcer, { opacity: 0, scale: 1.25, letterSpacing: '0.4em' }, { opacity: 1, scale: 1, letterSpacing: '0.18em', duration: 0.25, ease: 'power3.out' });
      else this.el.announcer.style.opacity = '1';
      clearTimeout(this._annT);
      this._annT = setTimeout(() => { this.el.announcer.style.opacity = '0'; }, 1800);
    }
    if (this._subs) this.caption(main || '', sub || '');
    if (sub) {
      this.el.subAnn.textContent = sub;
      this.el.subAnn.style.opacity = '1';
      clearTimeout(this._subT);
      this._subT = setTimeout(() => { this.el.subAnn.style.opacity = '0'; }, 2200);
    }
  }

  // [T161 R13/R15] the a11y setters + the caption bar — the announce-mirror surface for
  // deaf/hoh players (aria-live polite on #captions; the bar self-gates when the shell
  // predates the element or subtitles are off).
  setSubtitles(on) { this._subs = !!on; }
  setReducedMotion(on) { this._reduced = !!on; }
  caption(main, sub) {
    const el = this.el.captions; if (!el) return;
    el.textContent = (main ? main + (sub ? ' — ' : '') : '') + (sub || '');
    el.style.opacity = '1';
    clearTimeout(this._capT);
    this._capT = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  // --- T41 §25.4: spectate bar + combat-HUD hide (DOM-injected; spectator = presentation only) ---
  spectate(name, i, n) {
    if (!this.specBar) {
      this.specBar = document.createElement('div');
      this.specBar.id = 'spec-bar';
      this.specBar.style.cssText = 'position:absolute;left:50%;bottom:14%;transform:translateX(-50%);font-family:Rajdhani,sans-serif;font-weight:700;letter-spacing:2px;color:#e8ecf1;text-shadow:0 0 8px rgba(0,0,0,.85);text-align:center;pointer-events:none;z-index:5';
      this.specBar.innerHTML = '<div id="spec-target" style="font-size:22px"></div><div id="spec-hint" style="font-size:12px;opacity:.72;margin-top:4px"></div>';
      this.el.hud.appendChild(this.specBar);
    }
    this.specBar.style.display = 'block';
    const t = this.specBar.querySelector('#spec-target'), h = this.specBar.querySelector('#spec-hint');
    if (t) t.textContent = tr('h.spectating', { n: name || tr('h.specArena') });
    if (h) h.textContent = (n > 0 ? i + '/' + n + ' · ' : '') + tr('h.specHint');
  }

  spectateMode(on) { // hide the combat HUD (no local actor) — keep map/score/timer/feed
    const ids = ['crosshair', 'health-num', 'health-fill', 'shield-fill', 'ammo-wrap', 'ability-icon', 'ability-cd', 'ability-charges', 'frag-count'];
    for (const id of ids) { const e = document.getElementById(id); if (e) e.style.display = on ? 'none' : ''; }
  }

  // --- T42 §26.4: replay bar (DOM-injected #replay-bar) — REC dot in live MP + viewer controls ---
  replayBarInit() {
    if (this.rpBar) return;
    this.rpBar = document.createElement('div');
    this.rpBar.id = 'replay-bar';
    this.rpBar.style.cssText = 'position:absolute;left:50%;top:12px;transform:translateX(-50%);display:none;align-items:center;gap:10px;font-family:Rajdhani,sans-serif;font-weight:700;letter-spacing:1px;color:#e8ecf1;background:rgba(10,14,20,.72);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:6px 12px;z-index:6;pointer-events:auto';
    this.rpBar.innerHTML =
      '<span id="rp-rec" style="display:none;color:#ff5252">● REC</span>' +
      '<span id="rp-time" style="min-width:92px;text-align:center">0:00 / 0:00</span>' +
      '<input id="rp-scrub" type="range" min="0" max="1000" value="0" style="width:220px">' +
      '<span id="rp-speed">1×</span>' +
      '<span id="rp-hint" style="opacity:.72;font-size:12px">SPACE PLAY/PAUSE · S SPEED · LMB/RMB ACTOR · MOUSE LOOK</span>';
    this.el.hud.appendChild(this.rpBar);
    this.rpBar.title = tr('h.recTip'); // [T147] "says recording?" — the bar IS the live replay recorder (T42/T146); the tooltip names it, where to watch it, and the Settings toggle
    const scrub = this.rpBar.querySelector('#rp-scrub');
    this._rpDrag = false;
    scrub.addEventListener('pointerdown', () => { this._rpDrag = true; });
    addEventListener('pointerup', () => { this._rpDrag = false; });
    scrub.addEventListener('input', () => { if (this.onReplayScrub) this.onReplayScrub((+scrub.value / 1000) * (this._rpDur || 0)); });
  }

  replayRec(on) { // live-MP recording indicator — [T146] the LIVE face: REC dot + a TICKING elapsed only (the viewer chrome — scrub/speed/hint — never renders in live mode; fixes the dead '0:00 / 0:00' that never moved with the clock)
    this.replayBarInit();
    this.rpBar.style.display = (on || this._rpViewer) ? 'flex' : 'none';
    this.rpBar.querySelector('#rp-rec').style.display = on ? 'inline' : 'none';
    const chrome = !!this._rpViewer; // viewer session → full controls; live record → dot + elapsed
    this.rpBar.querySelector('#rp-scrub').style.display = chrome ? 'inline' : 'none';
    this.rpBar.querySelector('#rp-speed').style.display = chrome ? 'inline' : 'none';
    this.rpBar.querySelector('#rp-hint').style.display = chrome ? 'inline' : 'none';
    const t = this.rpBar.querySelector('#rp-time');
    if (!chrome) t.textContent = on ? (ms => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0'))(Replay.elapsedMs || 0) : '';
  }

  replayShow(mode, data) { // viewer: 'play' → controls; 'empty' → notice
    this.replayBarInit();
    this._rpViewer = true;
    this.rpBar.style.display = 'flex';
    this.rpBar.querySelector('#rp-rec').style.display = 'none';
    this._rpDur = data && data.dur || 0;
    if (mode === 'empty') this.rpBar.querySelector('#rp-time').textContent = tr('h.noRecord');
  }

  replayTick(st) { // per-frame viewer state (skips the slider while the user is dragging)
    if (!this.rpBar) return;
    const fmt = ms => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
    this.rpBar.querySelector('#rp-time').textContent = fmt(st.t) + ' / ' + fmt(st.dur);
    this.rpBar.querySelector('#rp-speed').textContent = st.speed + '×';
    const scrub = this.rpBar.querySelector('#rp-scrub');
    if (!this._rpDrag && st.dur > 0) scrub.value = Math.round(st.t / st.dur * 1000);
  }

  // --- T115 G-2: killcam bar (DOM-injected #killcam-bar) — title + killer·weapon + skip hint + progress ---
  killcamShow(title, sub, hint) {
    if (!this.kcBar) {
      this.kcBar = document.createElement('div');
      this.kcBar.id = 'killcam-bar';
      this.kcBar.style.cssText = 'position:absolute;left:50%;top:64px;transform:translateX(-50%);display:none;flex-direction:column;align-items:center;gap:3px;font-family:Rajdhani,sans-serif;color:#e8ecf1;background:rgba(10,14,20,.72);border:1px solid rgba(255,80,60,.35);border-radius:6px;padding:6px 14px;z-index:6;pointer-events:none;min-width:280px';
      this.kcBar.innerHTML =
        '<span id="kc-title" style="font-weight:700;letter-spacing:2px;color:#ff5a3c;font-size:14px">KILLCAM</span>' +
        '<span id="kc-sub" style="font-weight:600;letter-spacing:1px;font-size:13px"></span>' +
        '<span id="kc-hint" style="opacity:.72;font-size:11px;letter-spacing:1px"></span>' +
        '<div style="width:100%;height:2px;background:rgba(255,255,255,.14)"><div id="kc-prog" style="height:100%;width:0%;background:#ff5a3c"></div></div>';
      this.el.hud.appendChild(this.kcBar);
    }
    this.kcBar.style.display = 'flex';
    this.kcBar.querySelector('#kc-title').textContent = title;
    this.kcBar.querySelector('#kc-sub').textContent = sub;
    this.kcBar.querySelector('#kc-hint').textContent = hint;
  }
  killcamTick(t, dur) { // playback progress line (G-2)
    if (!this.kcBar) return;
    const p = this.kcBar.querySelector('#kc-prog');
    if (p && dur > 0) p.style.width = Math.min(100, (t / dur) * 100).toFixed(1) + '%';
  }
  killcamHide() { if (this.kcBar) this.kcBar.style.display = 'none'; }

  killfeed(killer, victim, wpn, head) {
    const d = document.createElement('div');
    d.className = 'kf-row';
    const kCls = killer ? (killer.isPlayer ? 'me' : (killer.team === this._playerTeam ? 'ally' : 'enemy')) : 'enemy';
    const vCls = victim.isPlayer ? 'me' : (victim.team === this._playerTeam ? 'ally' : 'enemy');
    d.innerHTML = `<span class="${kCls}">${killer ? killer.name : tr('h.world')}</span><span class="wpn">[${wpn || '?'}]</span>${head ? '<span class="hs">' + tr('h.hs') + '</span>' : ''}<span class="${vCls}">${victim.name}</span>`;
    this.el.killfeed.appendChild(d);
    if (window.gsap) gsap.from(d, { opacity: 0, x: 30, duration: 0.2 });
    setTimeout(() => { if (window.gsap) gsap.to(d, { opacity: 0, duration: 0.3, onComplete: () => d.remove() }); else d.remove(); }, 6000);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.firstChild.remove();
  }

  ddi(angleRad) {
    const d = document.createElement('div');
    d.className = 'ddi';
    this.el.ddi.appendChild(d);
    d._ang = angleRad; d._t = 0;
    this.ddis.push(d);
    if (this.ddis.length > 8) this.ddis[0].remove(), this.ddis.shift();
  }
  updateDDI(dt) {
    for (let i = this.ddis.length - 1; i >= 0; i--) {
      const d = this.ddis[i];
      d._t += dt;
      if (d._t > 1) { d.remove(); this.ddis.splice(i, 1); continue; }
      const rel = d._ang; // world-relative set at creation
      d.style.transform = `translate(-50%,-50%) translateY(-9rem) rotate(${rel}rad) translateY(4rem)`;
      d.style.opacity = String(1 - d._t);
    }
  }

  addPing(pos, label = 'PING') {
    if (this.pings.length >= 3) { this.pings[0].el.remove(); this.pings.shift(); }
    const d = document.createElement('div');
    d.className = 'ping';
    d.innerHTML = `<div class="p-ring"></div><div class="p-dot"></div><div class="p-label">${label}</div>`;
    this.el.pings.appendChild(d);
    this.pings.push({ pos: pos.clone(), el: d, t: 8 });
  }
  updatePings(dt, camera) {
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i];
      p.t -= dt;
      if (p.t <= 0) { p.el.remove(); this.pings.splice(i, 1); continue; }
      _v.copy(p.pos).project(camera);
      if (_v.z > 1) { p.el.style.opacity = '0'; continue; }
      p.el.style.opacity = String(Math.min(1, p.t));
      p.el.style.left = ((_v.x * 0.5 + 0.5) * innerWidth) + 'px';
      p.el.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight) + 'px';
      const dist = Math.round(p.pos.distanceTo(camera.position));
      p.el.querySelector('.p-label').textContent = `${p.label} · ${dist}m`;
    }
  }

  // ---------------- minimap ----------------
  drawMinimap(ctx) {
    const { player, bots, settings, uav } = ctx;
    const g = this.mm, S = 360, c = S / 2;
    g.clearRect(0, 0, S, S);
    const range = 55; // meters visible radius
    const scale = c / range;
    g.save();
    g.beginPath(); g.rect(0, 0, S, S); g.clip();
    // rotate if enabled [setting]
    g.translate(c, c);
    // [v1.50 port T90] §60.1 (v1.48) BUGFIX: the old `-yaw - PI/2` counter-rotated the map at
    // DOUBLE the turn rate with a 90° offset (exact 180° inversion at yaw ≡ −135°) — with this
    // axis mapping (screen-x = +x, screen-y = +z, fwd = (−sin θ, −cos θ)) the forward-
    // up rotation is exactly +yaw. Verified per-yaw in probe_t75 + live screenshots.
    const rot = settings.minimapRotate ? player.yaw : 0;
    if (settings.minimapRotate) g.rotate(rot);
    const px = player.pos.x, pz = player.pos.z;
    const tx = (x) => (x - px) * scale, tz = (z) => (z - pz) * scale;
    // map image
    if (World.mapCanvas) {
      // §62.2 (v1.52) uniform-projection blit: draw the canvas as a 2M × 2M meter square
      // anchored at world (-M,-M) — canvas 256 px = World.mapHalf meters EXACTLY matches
      // the dot projection tx/tz (scale px/m). Reads the PER-MAP half (World.mapHalf),
      // never CFG.MAP: W2 map select builds per-map worlds; CFG.MAP is the default arena.
      // ROOT-CAUSE (probe_t83): the legacy rect read CFG.MAP AND carried an aspect factor
      // — on the 60×44 arena south features sat at k²·500/512 ≈ 54% of true distance.
      const M = World.mapHalf || 62;
      g.globalAlpha = 0.85;
      g.drawImage(World.mapCanvas, tx(-M), tz(-M), 2 * M * scale, 2 * M * scale);
      g.globalAlpha = 1;
    }
    // flags
    if (ctx.mode === 'dom') {
      for (const f of World.flags) {
        g.fillStyle = f.owner === 0 ? CFG.COLORS.allyHex : f.owner === 1 ? CFG.COLORS.enemyHex : '#9aa6b5';
        g.beginPath(); g.arc(tx(f.pos.x), tz(f.pos.z), 9, 0, 7); g.fill();
        g.fillStyle = '#000'; g.font = '700 12px Chakra Petch'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(f.id, tx(f.pos.x), tz(f.pos.z) + 0.5);
      }
    }
    // T1-1 objective markers (SS22)
    if (ctx.mode === 'hp' && ctx.match.hpIdx >= 0) {
      const h = World.hills[ctx.match.hpIdx];
      g.fillStyle = h.owner === 0 ? CFG.COLORS.allyHex : h.owner === 1 ? CFG.COLORS.enemyHex : '#9aa6b5';
      g.beginPath(); g.arc(tx(h.pos.x), tz(h.pos.z), 10, 0, 7); g.fill();
      g.fillStyle = '#000'; g.font = '700 12px Chakra Petch'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(h.id, tx(h.pos.x), tz(h.pos.z) + 0.5);
    }
    if (ctx.mode === 'kc') {
      for (const tg of ctx.match.kcTags) {
        g.fillStyle = tg.team === player.team ? CFG.COLORS.allyHex : CFG.COLORS.enemyHex;
        g.save(); g.translate(tx(tg.x), tz(tg.z)); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore();
      }
    }
    if (ctx.mode === 'snd') {
      for (const s2 of World.sndSites) {
        g.fillStyle = 'rgba(255,90,60,.9)';
        g.beginPath(); g.arc(tx(s2.pos.x), tz(s2.pos.z), 9, 0, 7); g.fill();
        g.fillStyle = '#000'; g.font = '700 12px Chakra Petch'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(s2.id, tx(s2.pos.x), tz(s2.pos.z) + 0.5);
      }
      const s3 = ctx.match.snd;
      if (s3 && s3.bomb && s3.phase === 'live') { // planted bomb blinks red
        g.fillStyle = Math.floor(performance.now() / 250) % 2 ? '#ff2b2b' : '#ffd2c9';
        g.beginPath(); g.arc(tx(s3.bomb.x), tz(s3.bomb.z), 7, 0, 7); g.fill();
      }
    }
    // actors
    const seeEnemy = (b) => b.alive && (uav || b.spottedT < 1.6 || (b.firedT < 1.3 && !b._suppressed));
    for (const b of bots.bots) {
      const ally = ctx.mode !== 'ffa' && b.team === player.team;
      if (!b.alive) continue;
      if (!ally && !seeEnemy(b)) continue;
      const sx = tx(b.pos.x), sz = tz(b.pos.z);
      if (!ally && b.spottedT < 1.6) { // T40: pulse spotted-star (rotating 4-point, pulse-scale) — closes the Task-35 spotted-star residual
        const ph = performance.now() / 1000;
        const r = 6.5 + Math.sin(ph * 5) * 1.6;
        g.save(); g.translate(sx, sz); g.rotate(ph * 1.8);
        g.fillStyle = '#ffd166'; g.beginPath();
        for (let i = 0; i < 8; i++) { const rad = i % 2 ? r * 0.42 : r; const an = i * Math.PI / 4; g.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
        g.closePath(); g.fill(); g.restore();
      } else {
        g.fillStyle = ally ? CFG.COLORS.allyHex : CFG.COLORS.enemyHex;
        g.beginPath(); g.arc(sx, sz, 6, 0, 7); g.fill();
      }
    }
    // pings
    for (const p of this.pings) {
      g.strokeStyle = '#ffd166'; g.lineWidth = 3;
      g.beginPath(); g.arc(tx(p.pos.x), tz(p.pos.z), 8, 0, 7); g.stroke();
    }
    g.restore();
    // player arrow (always center)
    g.save(); g.translate(c, c);
    if (!settings.minimapRotate) g.rotate(-player.yaw); // [v1.50 port T90] §60.1 twin fix: arrow was 90° CCW off the true facing
    g.fillStyle = '#e8ecf2';
    g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill();
    g.restore();
    // [v1.50 port T90] §60.1: north indicator — world north (−z) renders at canvas direction
    // (sin rot, −cos rot) after the map rotation, so the N badge ORBITS the rim with
    // the map. The static DOM #map-n labeled a rotating map wrong and is removed.
    const ndx = Math.sin(rot), ndy = -Math.cos(rot);
    g.fillStyle = 'rgba(41,211,255,0.95)'; g.font = '700 13px Chakra Petch';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', c + ndx * (c - 14), c + ndy * (c - 14));
  }

  // ---------------- compass ----------------
  drawCompass(ctx) {
    const { player, mode } = ctx;
    const g = this.cp, W = 960, H = 72;
    g.clearRect(0, 0, W, H);
    const yawDeg = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const pxPerDeg = W / 120; // 120° visible
    g.font = '600 22px Chakra Petch'; g.textAlign = 'center';
    for (let d = -70; d <= 70; d += 5) {
      const abs = ((yawDeg + d) % 360 + 360) % 360;
      const x = W / 2 + d * pxPerDeg;
      if (abs % 15 === 0) {
        const major = abs % 45 === 0;
        g.fillStyle = major ? 'rgba(232,236,242,0.9)' : 'rgba(232,236,242,0.4)';
        g.fillRect(x - 1, 26, major ? 3 : 2, major ? 16 : 9);
        if (major) {
          const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
          g.fillStyle = 'rgba(154,166,181,0.95)';
          g.fillText(names[abs] ?? abs, x, 20);
        }
      }
    }
    // objective markers
    const put = (wp, label, color) => {
      _v.copy(wp); _v.y = 2; _v.project(this._camera);
      if (_v.z > 1) return;
      // project bearing
      const dx = wp.x - player.pos.x, dz = wp.z - player.pos.z;
      // [v1.50 port T90] §60.1 (v1.48) BUGFIX: bearing must be atan2(dx, −dz) per the strip's own
      // convention (N=−z, E=+x, yawDeg=−yaw) — the old atan2(−dx,−dz) mirrored every
      // objective/ping marker left-right on the compass ribbon. (DDI keeps its own
      // orbit mapping — intentionally untouched, its CSS consumes the opposite sign.)
      const bear = ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
      let rel = bear - yawDeg; while (rel > 180) rel -= 360; while (rel < -180) rel += 360;
      if (Math.abs(rel) > 62) return;
      const x = W / 2 + rel * pxPerDeg;
      g.fillStyle = color; g.beginPath(); g.moveTo(x, 34); g.lineTo(x - 7, 46); g.lineTo(x + 7, 46); g.closePath(); g.fill();
      g.font = '700 16px Chakra Petch'; g.fillText(label, x, 62);
    };
    if (mode === 'dom') for (const f of World.flags) put(f.pos, f.id, f.owner === 0 ? CFG.COLORS.allyHex : f.owner === 1 ? CFG.COLORS.enemyHex : '#9aa6b5');
    for (const p of this.pings) put(p.pos, '◆', '#ffd166');
  }

  // ---------------- scoreboard ----------------
  showScoreboard(show, ctx) {
    this.el.scoreboard.classList.toggle('hidden', !show);
    if (!show) return;
    const { player, bots, mode, match, mp } = ctx;
    this._sbMp = !!mp; // [T118 G-8] MP-only report affordance — offline bots cannot be reported
    if (mp && !this.el.sbFoot) { // the footer hint is built ONCE and lives across rebuilds
      const f = document.createElement('div'); f.className = 'sb-foot'; f.id = 'sb-foot';
      this.el.sbFoot = f; this.el.scoreboard.appendChild(f);
    }
    if (this.el.sbFoot) this.el.sbFoot.textContent = mp ? tr('rep.hint') : '';
    const actors = [player, ...bots.bots].sort((a, b) => b.score - a.score);
    this.el.sbTitle.textContent = tr(SB_TITLE[mode] || 'ix.mdPrac'); // T106 — all 11 modes resolve at card-head parity; unknown modes fall to the range (T2-8 → T106)
    this.el.sbHead.innerHTML = '<tr>' + tr('h.sbHead').map(h => '<th>' + h + '</th>').join('') + '</tr>'; // T2-8
    this.el.sbBody.innerHTML = '';
    for (const a of actors) {
      const tr = document.createElement('tr');
      const ally = mode !== 'ffa' && a.team === player.team;
      tr.className = (a.isPlayer ? 'me ' : '') + (mode === 'ffa' ? (a.isPlayer ? 't-ally' : 't-enemy') : (ally ? 't-ally' : 't-enemy'));
      if (mp && !a.isPlayer) { tr.classList.add('rpt-row'); tr.dataset.name = a.name; } // [T118 G-8] the click affordance — self rows stay inert (self-report is a server 'target' reject anyway)
      tr.innerHTML = `<td>${a.name}</td><td>${a.score}</td><td>${a.kills}</td><td>${a.deaths}</td><td>${a.streak}</td>`;
      this.el.sbBody.appendChild(tr);
    }
  }

  // ---------------- [T118 G-8] the report dialog ----------------
  // ONE-at-a-time overlay; reason segs resolve to the server's REPORT_REASONS enum verbatim
  // ('cheat'|'tox'|'team'|'other') — the submit rides hud.onReport (main.js → sendSoc), the
  // ack arc rides mp.onSoc → hud.announce. ESC/CANCEL/blur-safe: every path funnels reportClose.
  reportDialog(name) {
    if (this._rdlg) return; // one dialog — a second row-click while open is a no-op
    const d = document.createElement('div'); d.id = 'report-dlg';
    const card = document.createElement('div'); card.className = 'rd-card';
    card.innerHTML = `<div class="rd-t">${tr('rep.title', { n: name })}</div>` +
      ['cheat', 'tox', 'team', 'other'].map(k => `<button class="rd-r" data-r="${k}">${tr('rep.' + k)}</button>`).join('') +
      `<div class="rd-row"><button class="rd-go" disabled>${tr('rep.submit')}</button><button class="rd-x">${tr('rep.cancel')}</button></div>`;
    d.appendChild(card); document.body.appendChild(d);
    this._rdlg = { el: d, reason: null };
    d.querySelectorAll('.rd-r').forEach(b => b.onclick = () => {
      if (!this._rdlg) return;
      this._rdlg.reason = b.dataset.r;
      d.querySelectorAll('.rd-r').forEach(x => x.classList.toggle('sel', x === b));
      d.querySelector('.rd-go').disabled = false;
    });
    d.querySelector('.rd-go').onclick = () => {
      const r = this._rdlg && this._rdlg.reason;
      this.reportClose();
      if (r && this.onReport) this.onReport(name, r); // the ONLY submit seam
    };
    d.querySelector('.rd-x').onclick = () => this.reportClose();
    d.onclick = (e) => { if (e.target === d) this.reportClose(); }; // backdrop click cancels
  }

  reportClose() { if (this._rdlg) { this._rdlg.el.remove(); this._rdlg = null; } }

  update(dt, ctx) {
    this._playerTeam = ctx.player.team;
    this._camera = ctx.camera;
    const p = ctx.player, s = ctx.settings;
    // health
    this.el.healthNum.textContent = Math.ceil(p.hp);
    this.el.healthFill.style.transform = `scaleX(${Math.max(0, p.hp) / 100})`;
    this.el.shieldFill.style.transform = `scaleX(${p.shield / CFG.HEALTH.shieldMax})`;
    this.el.lowV.style.opacity = p.hp < 35 && p.alive ? String(1 - p.hp / 35) : '0';
    this.el.dmgV.style.opacity = String(Math.max(0, 1 - p.lastDamageT / 1.2) * 0.9);
    const brEl = this.el.br; // [T171] the BR row — alive count + zone clock + gas warning (self-gated)
    if (brEl && ctx.br) {
      const out = Math.hypot(p.pos.x - ctx.br.cx, p.pos.z - ctx.br.cz) > ctx.br.r;
      const ba = brEl.querySelector('.br-alive'), bz = brEl.querySelector('.br-zone'), bw = brEl.querySelector('.br-warn');
      if (ba) ba.textContent = String(ctx.brAlive);
      if (bz) bz.textContent = (ctx.br.st === 'shrink' ? 'CLOSING' : 'ZONE ' + ((ctx.br.ph || 0) + 1)) + ' ' + Math.max(0, Math.ceil(ctx.br.t)) + 's';
      if (bw) bw.style.opacity = out ? '1' : '0';
      brEl.classList.remove('hidden');
      if (this.el.gasV) this.el.gasV.style.opacity = out && p.alive ? '0.55' : '0';
    } else if (brEl) { brEl.classList.add('hidden'); if (this.el.gasV) this.el.gasV.style.opacity = '0'; }
    // ammo
    const w = ctx.weapons.w;
    if (w) {
      this.el.ammoMag.textContent = w.mag;
      this.el.ammoMag.classList.toggle('low', w.mag <= Math.ceil(w.def.mag * 0.2));
      this.el.ammoMag.classList.toggle('mid', w.mag > Math.ceil(w.def.mag * 0.2) && w.mag <= Math.ceil(w.def.mag * 0.45));
      this.el.ammoReserve.textContent = w.reserve;
      this.el.weaponName.textContent = w.def.name;
      this.el.weaponMode.textContent = w.def.modeLabel || (w.def.auto ? tr('h.auto') : tr('h.semi')); // T1-5 seam fix (Task 37 lead sweep): data-driven — JUDGE shows DBL
      this.el.ammoWrap.classList.toggle('need-reload', w.mag === 0 && w.reserve > 0);
      this.el.fragCount.textContent = ctx.weapons.nades[ctx.weapons.nadeType] ?? 0;
    }
    // ability
    this.el.abilityIcon.textContent = ctx.match.ability ? ctx.match.ability.name : '';
    // [v1.50 port T90] §60.2 (v1.48) M4: touch streak buttons mirror the desktop streak-ready state —
    // the #streak-wrap row is display:none ≤760px, so the tbtns ARE the touch surface.
    for (let i = 0; i < 3; i++) {
      const sb = document.getElementById('btn-streak-' + i);
      if (sb) sb.classList.toggle('hidden', !ctx.match.streakReady[i]);
    }
    const cd = ctx.match.abilityCd, cdMax = ctx.match.ability ? ctx.match.ability.cd : 1;
    const ready = ctx.match.abilityCharges > 0 && cd <= 0;
    this.el.abilityCd.style.setProperty('--cd', ready ? '0%' : `${Math.max(0, Math.min(100, (cd / cdMax) * 100))}%`);
    this.el.abilityCharges.textContent = ctx.match.abilityCharges > 1 ? '×' + ctx.match.abilityCharges : '';
    // streaks
    ctx.match.streakReady.forEach((r, i) => {
      const el = this.el.streaks[i];
      el.classList.toggle('ready', r);
      el.classList.toggle('locked', p.score < CFG.STREAKS[i].cost);
    });
    // objective bar + timer
    const mode = ctx.mode;
    this.el.objBar.classList.toggle('hidden', mode !== 'dom' && mode !== 'tdm' && mode !== 'hp' && mode !== 'kc' && mode !== 'snd' && mode !== 'gg' && mode !== 'ctl' && mode !== 'gf' && mode !== 'inf'); // T98: the ctl MP HUD branch proper (one branch, two feeds) · T105: the gf/inf branches join — the never-queued row lands (9-mode bar)
    if (mode === 'dom') {
      for (const [id, el] of [['A', this.el.objA], ['B', this.el.objB], ['C', this.el.objC]]) {
        const f = World.flags.find(x => x.id === id);
        el.className = 'obj-flag ' + (f.owner === 0 ? 'own' : f.owner === 1 ? 'enemy' : '');
      }
      this.el.scoreAlly.textContent = ctx.match.domScore[0];
      this.el.scoreEnemy.textContent = ctx.match.domScore[1];
      this.el.objInfo.textContent = '';
    } else if (mode === 'tdm') {
      this.el.scoreAlly.textContent = ctx.match.teamKills[0];
      this.el.scoreEnemy.textContent = ctx.match.teamKills[1];
      this.el.objInfo.textContent = '';
    } else if (mode === 'ct') { // [T139] CUTTHROAT — the 2-slot HUD head reads MY team vs the LEADING other (the documented 3-team adaptation; modes.js owns the 3-way truth)
      this.el.scoreAlly.textContent = ctx.match.teamKills[0];
      this.el.scoreEnemy.textContent = ctx.match.teamKills[1];
      this.el.objInfo.textContent = '';
    }
    // T1-1 mode branches (SS22)
    else if (mode === 'hp') {
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      const cur = World.hills[ctx.match.hpIdx];
      if (cur) {
        const el = cur.id === 'A' ? this.el.objA : cur.id === 'B' ? this.el.objB : this.el.objC;
        el.className = 'obj-flag ' + (cur.owner === 0 ? 'own' : cur.owner === 1 ? 'enemy' : '');
      }
      this.el.scoreAlly.textContent = ctx.match.objS[0];
      this.el.scoreEnemy.textContent = ctx.match.objS[1];
      this.el.objInfo.textContent = ctx.match.hpIdx < 0 ? 'HILL IN ' + Math.ceil(ctx.match.hpT) + 's' : 'HILL ' + cur.id + ' · ' + Math.ceil(ctx.match.hpT) + 's';
    } else if (mode === 'kc') {
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      this.el.scoreAlly.textContent = ctx.match.objS[0];
      this.el.scoreEnemy.textContent = ctx.match.objS[1];
      this.el.objInfo.textContent = 'TAGS · ' + ctx.match.kcTags.length + ' LIVE';
    } else if (mode === 'snd') {
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      this.el.scoreAlly.textContent = ctx.match.objS[0];
      this.el.scoreEnemy.textContent = ctx.match.objS[1];
      const s = ctx.match.snd;
      this.el.objInfo.textContent = s ? ('RD ' + s.r + (s.phase === 'live' ? (s.bomb ? ' · BOMB ' + Math.ceil(s.bombT) : ' · ' + Math.ceil(s.roundT)) : s.phase === 'pre' ? ' · STANDBY' : ' · NEXT SOON')) : '';
    } else if (mode === 'gg') {
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      const t = ctx.player.ggTier || 1;
      this.el.objInfo.textContent = 'TIER ' + Math.min(t, GG_LADDER.length + 1) + '/' + (GG_LADDER.length + 1);
    } else if (mode === 'gf') { // T105: the gf objBar branch — the T98 ctl pattern (offline machine field names; the MP mirror writes the same shapes). Timer element STAYS generic (the T90.36 rejection law holds) — the round clock rides objInfo at the snd grammar.
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      this.el.scoreAlly.textContent = ctx.match.objS[0];
      this.el.scoreEnemy.textContent = ctx.match.objS[1];
      const g = ctx.match.gf;
      this.el.objInfo.textContent = g ? ('RD ' + g.r + (g.kit ? ' · KIT ' + g.kit[0].toUpperCase() + '+' + g.kit[1].toUpperCase() : '') + (g.phase === 'live' ? ' · ' + Math.ceil(g.roundT) + 's' : g.phase === 'pre' ? ' · STANDBY' : ' · NEXT SOON')) : '';
    } else if (mode === 'inf') { // T105: the inf objBar branch — scores are the §57.2 HUD surfaces (survivors alive / horde size via teamKills, BOTH feeds); objInfo = the Patient-Zero grammar.
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      this.el.scoreAlly.textContent = ctx.match.teamKills[0];
      this.el.scoreEnemy.textContent = ctx.match.teamKills[1];
      const inf = ctx.match.inf;
      this.el.objInfo.textContent = inf ? (!inf.started ? 'PATIENT ZERO IN ' + Math.ceil(inf.first) + 's' : 'SURVIVE THE HORDE') : '';
    } else if (mode === 'ctl') {
      this.el.objA.className = 'obj-flag'; this.el.objB.className = 'obj-flag'; this.el.objC.className = 'obj-flag';
      this.el.scoreAlly.textContent = ctx.match.objS[0];
      this.el.scoreEnemy.textContent = ctx.match.objS[1];
      const c = ctx.match.ctl, zs = ctx.zones || [];
      zs.forEach(z => { if (z.id === 'A') this.el.objA.className = 'obj-flag ' + (z.done ? 'own' : ''); if (z.id === 'B') this.el.objB.className = 'obj-flag ' + (z.done ? 'own' : ''); });
      this.el.objInfo.textContent = c ? ('RD ' + c.r + (c.phase === 'live' ? ' · ' + ((c.atkMine ?? (c.side === (ctx.player.team ?? 0))) ? 'CAPTURE' : 'HOLD') + ' · ' + zs.map(z => z.id + ' ' + (z.done ? 'DONE' : Math.round((z.prog || 0) * 100) + '%')).join(' · ') : c.phase === 'pre' ? ' · STANDBY' : ' · NEXT SOON')) : '';
    }
    if (mode !== 'practice' && mode !== 'snd') {
      const t = Math.max(0, ctx.match.timeLeft);
      const mmn = Math.floor(t / 60), ss = Math.floor(t % 60);
      this.el.timer.textContent = `${mmn}:${String(ss).padStart(2, '0')}`;
      this.el.timer.classList.toggle('hot', t < 30);
    } else if (mode === 'snd') {
      const s = ctx.match.snd;
      if (s && s.phase === 'live' && s.bomb) { this.el.timer.textContent = 'BOMB ' + Math.ceil(s.bombT); this.el.timer.classList.add('hot'); }
      else if (s && s.phase === 'live') { const t = Math.max(0, s.roundT); const mmn = Math.floor(t / 60), ss = Math.floor(t % 60); this.el.timer.textContent = `${mmn}:${String(ss).padStart(2, '0')}`; this.el.timer.classList.toggle('hot', t < 15); }
      else this.el.timer.textContent = s && s.phase === 'pre' ? 'STANDBY' : '--:--';
    } else this.el.timer.textContent = 'RANGE';
    // ddi, pings, minimap, compass
    this.updateDDI(dt);
    this.updatePings(dt, ctx.camera);
    this.drawMinimap(ctx);
    this.drawCompass(ctx);
    // practice panel
    this.el.practice.classList.toggle('hidden', mode !== 'practice');
    if (mode === 'practice') {
      const pr = ctx.match.practice;
      this.el.ppDps.textContent = ctx.match.dps();
      this.el.ppHits.textContent = pr.hits;
      this.el.ppShots.textContent = pr.shots;
      this.el.ppAcc.textContent = (pr.shots ? Math.round(pr.hits / pr.shots * 100) : 0) + '%';
    }
    // fps
    this.el.fps.style.display = s.fpsCounter ? 'block' : 'none';
    if (s.fpsCounter) this.el.fps.textContent = ctx.fps + ' FPS';
    // respawn timer
    if (!p.alive && this._respawnT !== undefined) {
      this.el.respawnTimer.textContent = (ctx.mode === 'snd' || ctx.mode === 'gf') ? 'AWAITING ROUND END' : `REDEPLOY IN ${Math.max(0, Math.ceil(this._respawnT))}`; // SS22.3: snd sits out the round · T105: gf joins the sit-out law (modes.js:643 noRespawn — the offline law the server gate now mirrors)
    }
  }

  showDeath(show, killerInfo) {
    this.el.death.classList.toggle('hidden', !show);
    if (show && killerInfo) {
      this.el.deathRecap.innerHTML = `<span class="dr-killer">${killerInfo.name}</span> eliminated you<br><span style="color:var(--ink-dim)">${killerInfo.weapon} · ${Math.round(killerInfo.dist)}m · their HP: ${Math.max(1, Math.round(killerInfo.hp))}</span>`;
    }
  }
  setRespawnT(t) { this._respawnT = t; }
}
