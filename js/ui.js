// ============================================================
// IRONSIGHT — ui.js : menus, settings, loadout, persistence
// GSAP microinteractions + menu parallax [aesthetic brief]
// ============================================================
import { CFG, WEAPONS, ABILITIES, ATTACHMENTS, DEFAULT_SETTINGS, DEFAULT_LOADOUT, SETTINGS_LS_KEY, PAD_BINDS, MP_REGIONS, xpForLevel, RANKED_MODES, RP_TIERS, tierOf, applyColorVision, dailyFor, ECO_PRICE, ECO_CLAIM, ECO_EARN, BP, bpOf, RANK_REWARDS, isoWeekOf, seasonOf, MAX_LVL, PRESTIGE, CLAN } from './config.js'; // T89 L6: RANK_REWARDS + isoWeekOf + seasonOf join the single truth · [T119 S-1] ECO_CLAIM joins — the free-claim gates render on the offline shop face · [G-9] MAX_LVL/PRESTIGE join — the prestige gate + reward are the config's own law · [T127 G-7] CLAN joins — the warNote faces read the CLAN.war point law (the single truth, never duplicated) · [T136] ECO_EARN joins — the affordability gate states the earn path (never a dead disabled card)
import * as metagame from './metagame.js'; // T89 L4: challenges/events deterministic single truth (feed/claim laws)
import * as onboard from './onboard.js'; // T89 L10: 7-stage onboarding (scheme-pick-first + skip+reward) // T43 §27: registry labels for the ONLINE tab; T44 §28.2: XP law (client mirrors server via the SAME export); T46 §30: ranked law joins it (tier/season single truth); §62.5b (v1.54): BP law joins the same single truth
import { BINDINGS, mergeBinds, applyInputSettings, tryAssignBind } from './input.js'; // T1-7: binds live-apply (input.js imports config only — no cycle)
import { FINISHES, CHARMS, TRAILS, EMOTES, isUnlocked, stateLabel, ECO_POOL, camoCardData, CAMO_TIERS, finishById, charmById, PK_TIERS, pkCardData, classFinishUnlocked } from './cosmetics.js'; // T2-5 Phase 1+3 (Task 48/55): pure defs — no cycle · [T90 merge]: camo mastery ladder joins (v1.56 dead-session wave) · [T120] finish/charm resolvers join for the weapon preview · [T139 N7] the per-CLASS variant law joins the same bridge
import { makeWeapon, buildViewModel } from './weapons.js'; // [T120] loadout preview + attachment-aware stat display (weapons imports config/cosmetics only — no cycle)
import * as THREE from 'three'; // [T120] the loadout weapon preview renderer (shared module instance with main.js)
import { OPERATORS, OP_SIDES, opById, opOwned, opEquip, opRarityHex, opRarityOrder } from './operators.js'; // [T108 N8] the operator roster + ownership ∪ law + THE equip transform (pure module, no cycle); OP_SIDES = [T118] the faction container
import { mugSnapshot, mugLive } from './mugshot.js'; // [T123] the 3D mugshot studio — the roster wears the match's own skinned bodies (same-space law, honest CDN-fail fallback)
import { t, td, LANGS, lang as i18nLang, setLang as i18nSetLang } from './i18n.js'; // T2-8 (Task 64, §48): UI locale
import { Maps } from './maps.js'; // §51.1 W4: roster names for the map picker (maps.js imports nothing — no cycle)
import { mapData, drawMapPreview, drawAnyPreview } from './mapprev.js'; // [T117] the LIVE map previews — each surface renders from its OWN map json (mapprev imports nothing — no cycle)
import { TK_PACKS, TK_STAGES, packById } from './tokens.js'; // [T110 T2-5] the token leg — packs + the stage mirror (tokens.js imports nothing — no cycle) · [T134] packById joins for the redeem credit
import * as pay from './payments.js'; // [T134] the real-money checkout leg — per-pack hosted checkout URLs + the LS license redeem engine (pure module, no cycle)
import { ACH_DEFS, ACH_TIER_HEX, achProgress, achCount } from './achievements.js'; // [T115 G-5] the achievement single truth (pure module, no cycle)
import { STREAK_REWARDS, streakView } from './streak.js'; // [T116 G-6] the login-streak single truth (pure module, no cycle)
import { PadNav } from './padnav.js'; // [T122] (3) the controller menu navigation (d-pad/LS focus + A confirm + B back)
import { histList, histClear } from './history.js'; // §52.1 S1: local match history reads

const $ = (id) => document.getElementById(id);
const LS_S = SETTINGS_LS_KEY, LS_L = 'ironsight.loadout.v1', LS_C = 'ironsight.career.v1';
const LS_LO2 = 'ironsight.loadouts.v2'; // [T120] (d) the 10-slot loadout book — v1 blob stays the active-slot mirror (back-compat)
const R_HEX = { common: '#9aa6b5', rare: '#29a3ff', epic: '#c792ff', legendary: '#e8b64c' }; // [T117] the rarity accent map (ECO_RARITY tiers single truth; op rarities ride opRarityHex)
const R_INIT = (label) => (label || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(); // [T117] the card-glyph initials (config data, deterministic)
const CLASS_HEX = ['#ff5a3c', '#29d3ff', '#7dff8a', '#ffd166', '#c792ff', '#5effc9', '#ff9d5e', '#3fa7ff']; // [T117] the weapon-class accent cycle (first-appearance order, wraps)

export function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_S) || '{}') || {}; } catch { saved = {}; }
  return {
    ...structuredClone(DEFAULT_SETTINGS), ...saved,
    ch: { ...DEFAULT_SETTINGS.ch, ...(saved.ch || {}) },
    binds: mergeBinds(saved.binds), // T1-7 (Task 38): per-action default fallback — partial/garbage/absent saved binds migrate cleanly
    padBinds: { ...PAD_BINDS, ...(saved.padBinds || {}) }, // T1-7 (Task 38)
  };
}
export function saveSettings(s) { try { localStorage.setItem(LS_S, JSON.stringify(s)); } catch {} }
export function loadLoadout() {
  try { return { ...structuredClone(DEFAULT_LOADOUT), ...JSON.parse(localStorage.getItem(LS_L) || '{}') }; }
  catch { return structuredClone(DEFAULT_LOADOUT); }
}
// [T120] (d) the slot book: 10 loadouts, one active. Migration is additive — the v1 blob
// (if any) becomes slot 1; slots 2-10 start as fresh defaults. loadLoadout() semantics are
// UNCHANGED (the active slot object merged over defaults) — main.js and the MP join
// payload keep reading the same shape.
export function loadSlots() {
  try {
    const b = JSON.parse(localStorage.getItem(LS_LO2) || 'null');
    if (b && b.v === 2 && Array.isArray(b.slots) && b.slots.length === 10) return b;
  } catch {}
  let first = null;
  try { first = JSON.parse(localStorage.getItem(LS_L) || 'null'); } catch {}
  const slots = Array.from({ length: 10 }, (_, i) => (i === 0 && first && typeof first === 'object') ? first : structuredClone(DEFAULT_LOADOUT));
  const b = { v: 2, active: 0, slots };
  try { localStorage.setItem(LS_LO2, JSON.stringify(b)); } catch {}
  return b;
}
export function saveLoadout(l) {
  try { localStorage.setItem(LS_L, JSON.stringify(l)); } catch {} // the v1 mirror (active slot)
  try { const b = loadSlots(); b.slots[b.active] = l; localStorage.setItem(LS_LO2, JSON.stringify(b)); } catch {} // [T120] the book upsert
}
export function loadCareer() { try { return JSON.parse(localStorage.getItem(LS_C) || '{}'); } catch { return {}; } }
export function saveCareer(c) { try { localStorage.setItem(LS_C, JSON.stringify(c)); } catch {} }

// ============================================================
// [v1.50 port T90] §60.2 deferred M-rows (Task 78-e, wave B) — pure models + probe-tested exports:
//   M7 fire-mode chip model (config WEAPONS data law) · M18 slot-chip model ·
//   M21 dead deploy-prompt parser · M8 minimap tap-expand (visual clone ONLY —
//   the shipped §60.1 minimap transform law in hud.js is NOT re-derived here).
// i18n: NEW keys m7./m18./m21./m8. ride the metagame.js L() idiom — t(key) first
//   (main-agent patch pass fills the 9 locales), embedded-EN fallback literal.
// ============================================================
const L = (t, key, fb, p) => { // same EN-fallback idiom as js/metagame.js (t missing key → key itself → fb)
  let v;
  try { v = (typeof t === 'function') ? t(key, p) : undefined; } catch { v = undefined; }
  return (typeof v === 'string' && v && v !== key) ? v : ((fb || '').replace(/\{(\w+)\}/g, (m, k) => (p && p[k] !== undefined) ? String(p[k]) : m));
};

// --- M7: per-weapon fire-mode model. DATA TRUTH (config.js WEAPONS): the only
// fire-mode fields are `auto: true|false` and the optional display override
// `modeLabel` ('PUMP' MAULER / 'DBL' JUDGE) — the same law hud.js renders at
// #weapon-mode (modeLabel || auto ? AUTO : SEMI). NO weapon def carries a second
// selectable mode, so every current weapon resolves to a ONE-segment, non-interactive
// chip (the task's single-mode law). Multi-mode segments light up data-driven IF a
// future def ever lists fireModes — no interactive dead code ships today.
export function fireModesOf(def, tt) {
  if (!def) return [];
  if (Array.isArray(def.fireModes) && def.fireModes.length) {
    return def.fireModes.map(m => ({
      id: m,
      label: m === 'auto' ? L(tt, 'h.auto', 'AUTO') : m === 'semi' ? L(tt, 'h.semi', 'SEMI') : String(m).toUpperCase(),
    }));
  }
  if (def.modeLabel) return [{ id: 'fixed:' + def.modeLabel, label: def.modeLabel }]; // PUMP / DBL — fixed by data
  return [def.auto ? { id: 'auto', label: L(tt, 'h.auto', 'AUTO') } : { id: 'semi', label: L(tt, 'h.semi', 'SEMI') }];
}
export function fireModeChipHtml(def, tt) { // tt = the live t() (keys h.auto/h.semi already shipped ×9 locales)
  const segs = fireModesOf(def, tt);
  if (!segs.length) return '';
  const cur = def && def.modeLabel ? 'fixed:' + def.modeLabel : (def && def.auto ? 'auto' : 'semi');
  const aria = L(tt, 'm7.fireMode', 'FIRE MODE');
  return segs.map(s =>
    `<span class="fm-seg${s.id === cur ? ' on' : ''}" aria-label="${aria}">${s.label}</span>`).join('');
}

// --- M18: slot-chip model (data-driven groups over config WEAPONS slot fields:
// slot 1|2 = PRIMARY, slot 3 = SECONDARY (pistols — the ui.js slot law). Melee has
// NO loadout slot in config (MELEE is a bind, not a loadout weapon) → no fake group.
export function applyWeaponSelect(loadout, w) { // THE selection transform — rows AND chips land here via ui.selectWeapon
  if (w.slot === 3) return { ...loadout, secondary: w.id };
  return { ...loadout, weapon: w.id };
}
export function slotChipGroups(loadout) {
  const att = (id) => (loadout && loadout.attachments && loadout.attachments[id]) || [];
  const sel = (id) => id === loadout.weapon || id === loadout.secondary;
  const groups = [];
  for (const [key, test] of [['primary', s => s === 1 || s === 2], ['secondary', s => s === 3]]) {
    const ws = WEAPONS.filter(w => test(w.slot));
    if (ws.length) groups.push({ key, weapons: ws.map(w => ({ id: w.id, name: w.name, cls: w.cls, att: att(w.id).length, sel: sel(w.id) })) });
  }
  return groups;
}
export function slotChipsHtml(loadout, tt) {
  return slotChipGroups(loadout).map(g =>
    `<div class="ms-group">${L(tt, 'm18.slot' + g.key, g.key === 'primary' ? 'PRIMARY' : 'SECONDARY')}</div>` +
    `<div class="lw-slot-row">` + g.weapons.map(w =>
      `<button class="ms-chip lw-slot${w.sel ? ' on' : ''}" data-wid="${w.id}" aria-label="${w.name}">${w.name}` +
      `<span class="lw-att">${w.att ? w.att + ' ATT' : L(tt, 'm18.stock', 'STOCK')}</span></button>`).join('') +
    `</div>`).join('');
}

// [T117] deployChipInfo REMOVED with the M21 chip — the parser had no other importer.
// The death screen (#death-screen + #respawn-timer) owns the ONE redeploy countdown.

// --- M8: minimap tap-expand — a drawImage CLONE of the SHIPPED #minimap canvas at
// 2.5× internal resolution. The §60.1 render law (rot=+yaw, exact blit, compass) stays
// the ONLY renderer; this is presentation cloning, zero re-derivation. While open, the
// mirror tick re-blits every frame (hud redraws #minimap per frame).
export const MAP_XL_SRC = 360;            // shipped minimap internal size (hud.js drawMinimap S)
export const MAP_XL_SCALE = 2.5;          // enlarge law (~2.5×) — CODM tap-expand parity
const MapXL = { open: false, cv: null };
export function mapXLSet(on) {
  const hostEl = $('map-xl');
  if (!hostEl) return;
  if (on && !MapXL.open) {
    const cv = document.createElement('canvas');
    cv.id = 'minimap-xl';
    cv.width = cv.height = Math.round(MAP_XL_SRC * MAP_XL_SCALE);
    hostEl.innerHTML = ''; hostEl.appendChild(cv);
    hostEl.classList.remove('hidden');
    MapXL.cv = cv; MapXL.open = true;
    mapXLBlit(); // first frame immediately; hudMirrorTick keeps it fresh while open
  } else if (!on && MapXL.open) {
    hostEl.classList.add('hidden'); hostEl.innerHTML = ''; // clone REMOVED, not just veiled
    MapXL.cv = null; MapXL.open = false;
  }
}
export function mapXLBlit() {
  if (!MapXL.open || !MapXL.cv) return;
  const src = $('minimap');
  if (!src || typeof src.getContext !== 'function') return;
  const g = MapXL.cv.getContext('2d');
  if (!g) return;
  g.drawImage(src, 0, 0, MapXL.cv.width, MapXL.cv.height); // whole-canvas copy — no transform math
}
export const mapXLState = () => ({ open: MapXL.open, size: MapXL.cv ? MapXL.cv.width : 0 });

// ---------------- T1-7 bind-UI helpers (module-level, pure — probe-tested) ----------------
const PAD_ACTION_LABELS = {
  fire: 'Fire (RT)', aim: 'Aim / Scope (LT)', jump: 'Jump (A)', crouch_toggle: 'Crouch / Slide (B)',
  reload: 'Reload (X)', quickswap: 'Quick-Swap (Y)', ability: 'Tactical Ability (LB)', nade: 'Grenade (RB)',
  scoreboard: 'Scoreboard (VIEW)', pause: 'Pause (MENU)', sprint: 'Sprint (L3)', melee: 'Melee (R3)',
  streak0: 'UAV (D-PAD UP)', ping: 'Ping (D-PAD LEFT)', streak1: 'Airstrike (D-PAD RIGHT)', streak2: 'Supply Drop (D-PAD DOWN)',
  camtoggle: 'Camera Perspective (HOME)', // [T122] (2) the TPV/FPV pad action
};
const PAD_BUTTON_NAMES = ['A / CROSS', 'B / CIRCLE', 'X / SQUARE', 'Y / TRIANGLE', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'L3', 'R3', 'D-PAD UP', 'D-PAD DOWN', 'D-PAD LEFT', 'D-PAD RIGHT', 'BTN 16', 'BTN 17'];
function padLabel(idx) { return PAD_BUTTON_NAMES[idx] || ('BTN ' + idx); }
function codeLabel(code) {
  const M = { Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', ShiftLeft: 'SHIFT', ControlLeft: 'CTRL', Space: 'SPACE', Tab: 'TAB' };
  if (M[code]) return M[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code.toUpperCase();
}
export function tryAssignPadBind(padBinds, action, idx) { // conflict-rejecting pad assignment
  if (!(action in PAD_BINDS)) return { ok: false, reason: 'unknown pad action' };
  if (!Number.isInteger(idx) || idx < 0 || idx > 17) return { ok: false, reason: 'bad button index' };
  if (padBinds[action] === idx) return { ok: true, noop: true };
  for (const a of Object.keys(padBinds)) {
    if (a !== action && padBinds[a] === idx)
      return { ok: false, conflict: a, reason: padLabel(idx) + ' already bound to ' + (PAD_ACTION_LABELS[a] || a) };
  }
  return { ok: true };
}

export class UI {
  constructor(deps) {
    this.deps = deps; // {settings, loadout, startMatch, resumeMatch, quitMatch, applyVideoSettings, onSettingsChanged, career}
    // [T132-R] the PWA install law — LIFETIME listeners live at constructor level (never per-render):
    // the beforeinstallprompt event is captured one-shot (consumed on use); appinstalled retires it.
    this._pwaPrompt = null; // the captured BeforeInstallPromptEvent (null = unavailable/used)
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this._pwaPrompt = e; }, { passive: false }); // captured, not shown — the row decides the face
    window.addEventListener('appinstalled', () => { this._pwaPrompt = null; }); // the honest state flip
    this.mpProfile = null; // T44 §28.3: server-truth MP career (joined.profile) — null = anonymous/old server/offline-only
    this.mpRanked = null; // T46 §30.6: server-truth ranked view (joined.ranked) — null = anonymous/old server (corner RANK row hidden)
    this.mpLobby = null; this.mpRow = null; // T45 §29.3: {priv, code, md, meHost} roster mirror + the injected page-modes row (null offline = menu byte-identical)
    this.shopTab = 'store'; this.auth = null; this.eco = null; this.social = null; this._tkRetry = null; this._upsellCost = null; this._upsellLabel = null; this._socMsg = ''; this._socBad = false; this._socLeaveArm = false; this._prArm = false; // §53: P2 client state (hydrated by onAuth/onEco/onSoc) · [T123 G-7] the social status line + the two-step leave arm live here (re-render reads them) · [G-9] the two-step prestige arm joins the same state line · [T137] the armed purchase + the open shelf state (the upsell funnel)
    this.difficulty = 1;
    this.pageStack = ['page-main'];
    applyInputSettings(this.deps.settings); // T1-7: push saved binds/aimMode into the input layer at boot
    this.wireNav();
    this.buildCareerStrip();
    this.buildLoadout();
    this.buildSettings();
    this.buildHelp();
    this.buildMpRow(); // T45 §29.3: MP-only PRIVATE MATCH row under the mode grid (offline: no-op) · [T122] (6) the row MOVED into page-private
    this.buildMapRow(); // §51.1 W4: offline MAP picker on page-modes (MP: LOBBY MAP row owns it)
    this.buildAccount(); // [T122] (7) the account page body (identity card + session + danger zone; re-renders on auth acks)
    this.parallax();
    this.hoverFx();
    PadNav.attach(this); // [T122] (3) the controller menu nav loop (inert until a pad connects; menu-root-gated)
    this.applyHudVars(); // T89 L8: saved HUD-anchor offsets re-apply at boot (restore law)
    // [v1.50 port T90] §60.2 deferred M-rows (Task 78-e): minimap tap-expand binding + the per-frame
    // HUD mirror (M7 fire-mode chip · M21 deploy chip · M8 XL re-blit). rAF-early-out
    // keeps this free while menus are up; probe rAF stub runs exactly one tick.
    this.wireMapXL();
    this._fmKey = null; this._depShown = null; this._depText = null;
    this._startHudMirror();
  }

  // ---------- nav ----------
  // [v1.50 port T90] §55.2/§55.3 (v1.47) nav-depth law MERGED over the v1.55 body: pageStack
  // forward-push/back-pop + nav chrome render. The v1.50 gsap exit timeline + .pg-enter fallback
  // are superseded by the current V3 CSS law (Task 89 L7 pageIn/pageInBack — back direction rides
  // the [data-nav=back] hook below); current T89 hooks + gsap enter kept verbatim.
  show(page, opts = {}) {
    // [T121] (10) TRUE VISIT HISTORY — the old pageStack was a nav-tree depth (deduping
    // repeats), so BACK landed on "up one level", not "where I just was". _hist records
    // the literal previous page on every transition (capped 24).
    if (this._curPage && this._curPage !== page && !opts.back) {
      this._hist = this._hist || [];
      if (this._hist[this._hist.length - 1] !== this._curPage) this._hist.push(this._curPage);
      if (this._hist.length > 24) this._hist.shift();
    }
    // [T119] the slip-guard (issue 7): menu pages never surface over a LIVE round — the
    // drive caught page-main exposed behind a locked, running match via a stray show().
    // The only in-match faces: pause + results (+ the boot onboarding).
    if (this.deps.inMatch && this.deps.inMatch() && page !== 'page-pause' && page !== 'page-results' && page !== 'page-onboard') return;
    document.querySelectorAll('.menu-page').forEach(p => p.classList.add('hidden'));
    $('menu-root').classList.remove('hidden');
    const el = $(page);
    el.classList.remove('hidden');
    if (opts && opts.back) el.setAttribute('data-nav', 'back'); else el.removeAttribute('data-nav'); // [v1.50 port T90] §55.2: back direction via the current V3 CSS hook
    this._curPage = page; // [v1.50 port T90] §55.3: nav-depth tracking (goBack / renderNavChrome read it)
    if (opts.back) this.pageStack = this.pageStack.filter(p => p !== page); // [v1.50 port T90] §55.3 nav depth: forward push / back pop
    else if (this.pageStack[this.pageStack.length - 1] !== page) this.pageStack.push(page);
    if (this.pageStack.length > 12) this.pageStack.splice(0, this.pageStack.length - 12);
    this.renderNavChrome(page); // [v1.50 port T90] §55.3 (guarded — inert until index.html re-lands #menu-topbar/#mobile-tabs)
    if (page === 'page-main') this.maybeFetchLadderStrip(); // §49.3 (Task 65 W3, rebuilt): SEASON LADDER strip — auto-fetch ONCE per session, n=10, shared renderer
    if (page === 'page-onboard') this.renderOnboard(); // T89 L10: staged onboarding renders on every show (state-driven)
    if (page === 'page-missions') this.renderMissions(); // T89 L5: missions render on show (window-fresh)
    if (page === 'page-bp') this.renderBp(); // [T91 v1.57] meta pages render on show (window-fresh, missions idiom) — the T90 shells' INTEGRATION step
    if (page === 'page-events') this.renderEvents();
    if (page === 'page-bundles') this.renderBundles();
    if (page === 'page-camos') this.renderCamos();
    if (page === 'page-operators') this.renderOperators(); // [T108 N8] the roster page renders on show (meta-pages idiom)
    if (window.gsap) gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' });
  }
  // [v1.50 port T90] §55.3 (v1.47): persistent topbar + breadcrumb + tab-bar active state —
  // byte-port; no-ops while index.html lacks the #menu-topbar mount (cross-module need filed).
  renderNavChrome(page) {
    const topbar = $('menu-topbar');
    if (topbar) {
      const labels = { 'page-main': 'ix.pgMain', 'page-modes': 'ix.pgModes', 'page-online': 'ix.pgOnline', 'page-loadout': 'ix.pgLoadout', 'page-settings': 'ix.pgSettings', 'page-help': 'ix.pgHelp', 'page-history': 'ix.pgHistory', 'page-shop': 'ix.pgShop', 'page-social': 'ix.pgSocial', 'page-results': 'ix.pgResults', 'page-missions': 'ix.pgMissions', 'page-pause': 'ix.pgPause', 'page-bp': 'ix.pgBp', 'page-events': 'ix.pgEvents', 'page-bundles': 'ix.pgBundles', 'page-camos': 'ix.pgCamos', 'page-operators': 'ix.pgOps' }; // [T108 N8] page-operators joins the breadcrumb chain · [T117] page-online joins it
      if (page === 'page-main') topbar.classList.add('hidden');
      else {
        topbar.classList.remove('hidden');
        const chain = this.pageStack.filter(p => labels[p] && p !== 'page-main').slice(-2);
        $('menu-crumbs').innerHTML = `<span>${t(labels['page-main'])}</span>` + chain.map(p => `<span class="cr-sep">▸</span><span class="${p === page ? 'cr-here' : ''}">${t(labels[p])}</span>`).join('');
      }
    }
    document.querySelectorAll('#mobile-tabs .mtab').forEach(b => b.classList.toggle('on', b.dataset.go === page));
  }
  // [v1.50 port T90] §55.3 (v1.47): back = pop (breadcrumb honesty); empty stack lands main
  goBack() {
    this._hist = this._hist || [];
    const target = this._hist.pop() || 'page-main'; // [T121] (10) BACK = the literal previous VISITED page
    this.show(target, { back: true });
    SFXtick();
  }
  hideAll() { $('menu-root').classList.add('hidden'); }
  showLoading() { $('loading-screen').classList.remove('hidden'); }
  hideLoading() { $('loading-screen').classList.add('hidden'); }

  wireNav() {
    const go = (p) => { this.show(p); SFXtick(); };
    $('btn-play').onclick = () => go('page-modes');
    $('btn-online').onclick = () => { this.renderOnline(); go('page-online'); }; // [T117] the CoD-2026-style top-level ONLINE hub
    const sob = $('btn-online-back'); if (sob) sob.onclick = () => go('page-main');
    $('btn-loadout').onclick = () => { this.refreshLoadout(); go('page-loadout'); };
    $('btn-settings').onclick = () => go('page-settings');
    $('btn-help').onclick = () => go('page-help');
    $('btn-history').onclick = () => { this.renderHistory(); go('page-history'); };
    $('btn-career').onclick = () => { this.renderCareer(); go('page-career'); }; // v1.52 §62.3: metagame hub
    const mb = $('btn-missions'); if (mb) mb.onclick = () => { this.renderMissions(); go('page-missions'); }; // T89 L5: MISSIONS page (3+3 deterministic, CR+BP rewards)
    const pbb = $('btn-bp'); if (pbb) pbb.onclick = () => { this.renderBp(); go('page-bp'); }; // [T91 v1.57] the four T90 meta shells were DEAD buttons — wired now (index.html T90 INTEGRATION note)
    const pev = $('btn-events'); if (pev) pev.onclick = () => { this.renderEvents(); go('page-events'); };
    const pbn = $('btn-bundles'); if (pbn) pbn.onclick = () => { this.renderBundles(); go('page-bundles'); };
    const pcm = $('btn-camos'); if (pcm) pcm.onclick = () => { this.renderCamos(); go('page-camos'); };
    const pop = $('btn-ops'); if (pop) pop.onclick = () => { this.renderOperators(); go('page-operators'); }; // [T108 N8] OPERATORS page (the roster + kit identity layer)
    const cback = $('btn-career-back'); if (cback) cback.onclick = () => go('page-main');
    const chist = $('btn-career-history'); if (chist) chist.onclick = () => { this.renderHistory(); go('page-history'); };
    $('btn-shop').onclick = () => { this.renderShop(); go('page-shop'); };
    $('btn-social').onclick = () => { this.renderSocial(); go('page-social'); };
    const hb = $('btn-history-back'); if (hb) hb.onclick = () => go('page-main');
    const sb2 = $('btn-shop-back'); if (sb2) sb2.onclick = () => go('page-main');
    const so2 = $('btn-social-back'); if (so2) so2.onclick = () => go('page-main');
    const hc = $('btn-history-clear'); if (hc) hc.onclick = () => { histClear().then(() => this.renderHistory()).catch(() => {}); };
    const sc = $('btn-shop-claim'); if (sc) sc.onclick = () => { this.deps.sendEco({ op: 'claim', tok: this.auth && this.auth.tok }); };
    const sr = $('btn-social-refresh'); if (sr) sr.onclick = () => { this.deps.sendSoc({ op: 'state', tok: this.auth && this.auth.tok }); this.deps.sendEco({ op: 'state', tok: this.auth && this.auth.tok }); };
    const tb = $('btn-tb-back'); if (tb) tb.onclick = () => this.goBack(); // [v1.50 port T90] §55.3 topbar back = pop (guarded — #btn-tb-back re-lands with index.html)
    // [T120] MP results: MAIN MENU = leave the round (quitMatch clears inMatch THEN shows
    // page-main — the slip-guard refused the raw show while the room held the round; the live
    // E2E caught the dead button). Offline keeps the literal page show.
    const rmBtn = $('btn-res-menu');
    if (rmBtn) rmBtn.onclick = () => {
      SFXtick();
      if (this.deps.mp && this.deps.mp()) { this.deps.quitMatch(); return; }
      this.pageStack = ['page-main']; this.show('page-main'); // [v1.50 port T90] results: literal MAIN MENU (label honesty) — NOT a pop (guarded)
    };
    document.querySelectorAll('#mobile-tabs .mtab').forEach(b => b.onclick = () => { // [v1.50 port T90] §55.3 adaptive shell (inert until #mobile-tabs re-lands in index.html)
      const p = b.dataset.go; SFXtick();
      if (p === 'page-missions') { this.renderMissions(); this.show(p); }
      else if (p === 'page-loadout') { this.refreshLoadout(); this.show(p); }
      else if (p === 'page-shop') { this.renderShop(); this.show(p); }
      else this.show(p);
    });
    $('career-strip').addEventListener('click', (e) => { // [v1.50 port T90] §56.1: DAILY chip → missions page (delegation survives strip re-renders)
      if (e.target.closest('#chip-daily')) { this.renderMissions(); this.show('page-missions'); }
    });
    // [v1.50 port T90] NOTE: current data-back grammar (explicit dataset target) is KEPT — all
    // current buttons carry literal data-back="main" and the results MAIN MENU must land literal
    // main (v1.50's own btn-res-menu law). The pop law rides goBack()/btn-tb-back when the §55.3
    // topbar mount returns to index.html (filed cross-module need).
    const og = $('btn-onboard-go'), os = $('btn-onboard-skip');
    if (og) og.onclick = () => { SFXtick(); this.onbAdvance(); }; // T89 L10: skip+reward law — both advance AND pay
    if (os) os.onclick = () => { SFXtick(); this.onbAdvance(); };
    document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => go('page-' + b.dataset.back));
    document.querySelectorAll('.mode-card:not([data-priv])').forEach(c => c.onclick = () => { // [T122] (6) the PRIVATE card opts out of startMatch — it is a TRAVERSAL, not a mode
      SFXtick();
      this.deps.startMatch(c.dataset.mode, this.difficulty);
    });
    const privCard = document.querySelector('.mode-card[data-priv]'); // [T122] (6) the nesting decree: the modes page carries the ENTRY; the private surfaces live one page deeper
    if (privCard) privCard.onclick = () => { SFXtick(); this.show('page-private'); };
    const pb = $('btn-priv-back'); if (pb) pb.onclick = () => this.goBack(); // [T122] (6) BACK = the visited-history pop (the goBack law)
    // v1.52 (Task 83) ROOT-CAUSE: this loop ran on EVERY .diff-btn — it silently STOMPED
    // the back/clear/onboard buttons bound above (history/shop/social/career backs,
    // onboard go/skip, history-clear) with the difficulty handler; live-caught when the
    // career back button no-op'd (handler source was the difficulty setter). Difficulty
    // buttons are exactly the .diff-btn carrying data-d — scope to them. The <select
    // class="diff-btn" id="map-sel"> is likewise excluded.
    document.querySelectorAll('.diff-btn[data-d]').forEach(b => b.onclick = () => {
      document.querySelectorAll('.diff-btn[data-d]').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); this.difficulty = +b.dataset.d; SFXtick();
    });
    $('btn-resume').onclick = () => this.deps.resumeMatch();
    $('btn-quit').onclick = () => this.deps.quitMatch();
    $('btn-pause-settings').onclick = () => go('page-settings');
    $('btn-rematch').onclick = () => { this.hideAll(); this.deps.rematch(); };
    const rrBtn = $('btn-res-replay'); if (rrBtn) rrBtn.onclick = () => this.deps.watchReplay(); // §49.2 (Task 65 W2, rebuilt): results WATCH REPLAY (lastPacked-gated at render time)
    const hd = $('btn-hud-done'), hr = $('btn-hud-reset'); // T89 L8: HUD editor bar
    if (hd) hd.onclick = () => { SFXtick(); this.endHudEdit(false); };
    if (hr) hr.onclick = () => { SFXtick(); this.endHudEdit(true); };
    $('btn-set-defaults').onclick = () => {
      this.deps.settings = { ...structuredClone(DEFAULT_SETTINGS), ch: { ...DEFAULT_SETTINGS.ch } };
      if (this.deps.settingsSwap) this.deps.settingsSwap(this.deps.settings); // [T122] (4) the swap propagates to main.js's binding (the stale-reference fix)
      i18nSetLang(this.deps.settings.lang || 'en'); // T2-8 §48.4: restore resets locale too (live re-apply)
      applyInputSettings(this.deps.settings); // T1-7: binds/padBinds/aimMode keys absent → defaults (reset-to-defaults law)
      this.deps.settingsChanged(); this.buildSettings();
    };
    // settings tabs
    document.querySelectorAll('.stab').forEach(t => t.onclick = () => {
      document.querySelectorAll('.stab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      this.renderSettingsTab(t.dataset.tab);
    });
  }

  // ---------- T45 §29.3: private-lobby row (page-modes; deps.mp/setMode injected — no net-stack import) ----------
  // [T120 R1] user decree: Private Match must stay ACCESSIBLE — the row renders OFFLINE too
  // now (the old hard gate hid it from the modes page unless an MP session was live); state
  // honesty lives in renderMpRow (the offline note), not in hiding the entry.
  buildMpRow() {
    const host = document.getElementById('priv-host'); // [T122] (6) the nesting decree: the row MOVED into page-private — ids/handlers/i18n byte-preserved, the container is the only change
    if (!host || this.mpRow) return;
    const row = document.createElement('div');
    row.id = 'mp-priv-row';
    host.appendChild(row);
    this.mpRow = row;
    this.renderMpRow();
  }
  renderMpRow() {
    if (!this.mpRow) return;
    const MODES = [['ffa','FREE-FOR-ALL'],['tdm','TEAM DEATHMATCH'],['ct','CUTTHROAT'],['dom','DOMINATION'],['practice','TRAINING RANGE'],['hp','HARDPOINT'],['kc','KILL CONFIRMED'],['snd','SEARCH & DESTROY'],['gg','GUN GAME'],['gf','GUNFIGHT 2V2'],['inf','INFECTED'],['ctl','CONTROL']]; // order == index.html mode-card order (T89: trio joins — 10 cards + practice) · [T139] ct joins — the 12th card (mode count 11 → 12)
    const s = this.mpLobby || { priv: false, code: null, md: null, meHost: false };
    const priv = s.priv && s.code;
    const inp = `<input type="text" id="mp-code-in" value="" placeholder="CODE" maxlength="6" spellcheck="false" class="soc-in" style="letter-spacing:.14em;width:9ch;text-transform:uppercase;flex:0 0 auto">`; // [T123] the input skin rides the theme class (the inline literals moved to style.css)
    const btn = (id, label) => `<button id="${id}" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.22);color:#dfe8f2;padding:6px 14px;font:inherit;letter-spacing:.1em;cursor:pointer;font-family:inherit">${label}</button>`;
    const offline = !(this.deps.mp && this.deps.mp()); // [T120 R1] honest state on the always-visible row
    // [T120] the parity-pass-II decree: the inline-styled flat rows retire into the panel
    // grammar (.priv-panel cards — the 2026 lobby anatomy), the LOBBY MAP select retires into
    // the T117 display+rail idiom with LIVE mapprev previews. Every id/handler/server op is
    // byte-preserved: mp-priv-create/join/code-in/copy-link, the .mp-lm setMode law, the
    // host-gates, the tk marker (now a card chip — the server setMap gate still enforces),
    // APPLY → deps.setRoomMap, and the HOST RULES numIn row (the t73 pins verbatim).
    let html = `<div class="map-row-head priv-head"><b>${t('m.privateMatch')}</b><span class="set-note">${priv ? 'CODE <span class="priv-code">' + s.code + '</span> · ' + (s.meHost ? t('m.youAreHost') : t('m.hosted')) : ''}</span></div>`;
    if (!priv) html += `<div class="priv-panel"><div class="map-row-head"><b>${t('m.createPriv')} · ${t('m.join')}</b></div><div class="priv-row">${btn('mp-priv-create', t('m.createPriv'))}<span class="set-note">${t('m.orJoin')}</span>${inp}${btn('mp-priv-join', t('m.join'))}</div><div id="mp-priv-msg" class="set-note priv-msg">${offline ? t('on.offline') : ''}</div></div>`;
    else html += `<div class="priv-panel"><div class="priv-row">${btn('mp-copy-link', t('m.copyLink'))}<span class="set-note">${t('m.copyHint', { code: s.code })}</span></div><div id="mp-priv-msg" class="set-note priv-msg"></div></div>`;
    const seg = MODES.map(([m, l]) => `<button class="mp-lm" data-md="${m}" ${s.meHost ? '' : 'disabled'} style="background:${s.md === m ? 'rgba(232,182,76,.18)' : 'rgba(255,255,255,.05)'};border:1px solid ${s.md === m ? 'rgba(232,182,76,.55)' : 'rgba(255,255,255,.14)'};color:${s.md === m ? '#e8b64c' : '#8fa3b8'};padding:4px 9px;font-size:10px;letter-spacing:.08em;cursor:${s.meHost ? 'pointer' : 'default'};font-family:inherit">${l}${RANKED_MODES.includes(m) ? ' <span title="' + t('m.rankTip') + '" style="color:#e8b64c">·R</span>' : ''}</button>`).join('');
    html += `<div class="priv-panel"><div class="map-row-head"><b>${t('m.lobbyMode')}${s.meHost ? '' : t('m.hostPicks')}</b><span class="set-note">${t('m.rankedOnly')}</span></div><div class="priv-row">${seg}</div></div>`;
    this.mpRow.innerHTML = html;
    const msg = (t, warn) => { const el = document.getElementById('mp-priv-msg'); if (el) { el.textContent = t; el.style.color = warn ? '#e06c5a' : '#8fa3b8'; } };
    const cr = document.getElementById('mp-priv-create');
    if (cr) cr.onclick = () => { location.href = location.pathname + '?mp=1&priv=1'; };
    const ji = document.getElementById('mp-code-in');
    if (ji) ji.addEventListener('input', () => { ji.value = ji.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
    const jb = document.getElementById('mp-priv-join');
    if (jb) jb.onclick = () => { const c = ji ? ji.value.trim() : ''; if (!/^[A-Z0-9]{6}$/.test(c)) { msg(t('m.enterCode'), true); return; } location.href = location.pathname + '?mp=1&code=' + c; };
    const cp = document.getElementById('mp-copy-link');
    if (cp) cp.onclick = () => { const url = location.origin + location.pathname + '?mp=1&code=' + s.code; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => msg(t('m.linkCopied')), () => msg(url)); else msg(url); };
    this.mpRow.querySelectorAll('.mp-lm').forEach(b => { b.onclick = () => { if (!s.meHost) return; this.deps.setMode(b.dataset.md); }; }); // T45 §29.3: host pick → server (setMode validates host/idle/mode)
    // [T120] §51.3: LOBBY MAP host pick — the select-era face retires: a big DISPLAY panel + a
    // card RAIL of LIVE previews (js/mapprev.js, the T117 page-modes idiom). The contract is
    // byte-preserved: host-gated writes, the [T110] FULL roster with the TK marker (now a card
    // chip — the server setMap gate still enforces ownership), APPLY → deps.setRoomMap. A card
    // click STAGES (display-only until APPLY — the server write stays the single explicit act).
    const curMap = s.map || 'outpost';
    const stage = this._privMapStage && Maps.roster.some((m) => m.id === this._privMapStage) ? this._privMapStage : curMap;
    const mcard = (m) => `<button class="map-card ${stage === m.id ? 'on' : ''}" data-map="${m.id}" ${s.meHost ? '' : 'disabled'}><span class="map-card-face"></span><span class="map-card-name">${Maps.nameOf(m.id)}${m.tk ? '<span class="map-card-tk">TK</span>' : ''}<span class="map-card-state">${stage === m.id ? (s.meHost && stage !== curMap ? 'STAGED' : 'ROOM') : (m.tk ? '' : '')}</span></span></button>`;
    let mapRowHtml = `<div class="priv-panel"><div class="map-row-head"><b>LOBBY MAP</b><span class="set-note">${s.meHost ? 'HOVER = PREVIEW · CLICK = STAGE · APPLY = SET' : t('m.hostPicks')}</span></div><div class="map-display" id="mp-map-display"></div><div class="rail-wrap"><button class="rail-arrow l" id="mp-rail-l" aria-label="scroll left">◀</button><div class="rail map-rail" id="mp-rail"></div><button class="rail-arrow r" id="mp-rail-r" aria-label="scroll right">▶</button></div><div class="priv-row" style="margin-top:8px"><button class="mp-lm" id="mp-map-apply" ${s.meHost ? '' : 'disabled'}>APPLY</button><span class="set-note">room map: ${Maps.nameOf(curMap)}</span></div></div>`;
    this.mpRow.insertAdjacentHTML('beforeend', mapRowHtml);
    const rail = this.mpRow.querySelector('#mp-rail');
    if (rail) { // [T120] the live rail wiring — the renderMapRow idiom verbatim (canvas per card, live data or the rotation glyph, display-swap-on-hover)
      rail.innerHTML = Maps.roster.map(mcard).join('');
      rail.querySelectorAll('.map-card').forEach((b) => {
        const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200;
        b.querySelector('.map-card-face').appendChild(cv);
        const id = b.dataset.map;
        mapData(id).then((d) => drawMapPreview(cv, d)).catch(() => drawAnyPreview(cv));
        if (s.meHost) b.onclick = () => { if (this._privMapStage === id) return; this._privMapStage = id; SFXtick(); this.renderMpRow(); }; // stage ≠ set — APPLY is the server write
        b.addEventListener('mouseenter', () => this.privMapDisplayShow(id, s)); // display swap only — the hover law
      });
      const rl = this.mpRow.querySelector('#mp-rail-l'), rr = this.mpRow.querySelector('#mp-rail-r');
      if (rl) rl.onclick = () => rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' });
      if (rr) rr.onclick = () => rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' });
      this.privMapDisplayShow(stage, s);
    }
    const ma = this.mpRow.querySelector('#mp-map-apply');
    if (ma) ma.onclick = () => { if (!s.meHost) return; const staged = this._privMapStage; if (!staged || !Maps.roster.some((m) => m.id === staged) || staged === curMap) return; this.deps.setRoomMap(staged); this._privMapStage = null; }; // [T120] the select retired — APPLY writes the STAGED rail pick (the host-gate + setRoomMap law verbatim)
    // §52.4: HOST RULES row — host-gated score/time inputs + APPLY (min × 60 wire law)
    const numIn = (id, min, max, ph, w) => `<input type="number" id="${id}" min="${min}" max="${max}" value="${ph || ''}" placeholder="default" class="soc-in" style="width:${w}px">`; // [T123] the theme class owns the input skin
    const knobsHtml = `<div class="priv-panel"><div class="map-row-head"><b>HOST RULES</b></div><div class="priv-row"><label style="font-size:10px;color:#8fa3b8">SCORE ${numIn('mp-knob-sl', 5, 500, (s.knobs && s.knobs.sl) || '', 64)}</label><label style="font-size:10px;color:#8fa3b8">TIME (MIN) ${numIn('mp-knob-tl', 1, 60, (s.knobs && s.knobs.tl) ? Math.round(s.knobs.tl / 60) : '', 56)}</label><button class="mp-lm" id="mp-knob-apply" ${s.meHost ? '' : 'disabled'}>APPLY</button></div></div>`;
    this.mpRow.insertAdjacentHTML('beforeend', knobsHtml);
    const ka = this.mpRow.querySelector('#mp-knob-apply');
    if (ka) ka.onclick = () => {
      if (!s.meHost) return;
      const sIn = this.mpRow.querySelector('#mp-knob-sl'), tIn = this.mpRow.querySelector('#mp-knob-tl');
      const sl = sIn && sIn.value !== '' ? Math.max(5, Math.min(500, Math.round(+sIn.value))) : 0;
      const tl = tIn && tIn.value !== '' ? Math.min(3600, Math.round(+tIn.value) * 60) : 0; // min × 60 wire law (server validates out-of-range → matchErr knobs)
      this.deps.setKnob({ sl, tl });
    };

  }
  privMapDisplayShow(id, s) { // [T120] the private display panel — the mapDisplayShow idiom on the lobby surface (live art + data faces, zero writes)
    const disp = this.mpRow && this.mpRow.querySelector('#mp-map-display'); if (!disp) return;
    const m = Maps.roster.find((x) => x.id === id);
    const isRoom = id === (s.map || 'outpost');
    disp.innerHTML = `<div class="map-display-art"></div><div class="map-display-info"><div class="map-display-rule"></div><div class="map-display-name">${m ? Maps.nameOf(m.id) : '—'}</div><div class="map-display-desc">${m && m.desc ? m.desc : ''}</div><div class="map-display-meta"><span class="rw-chip">${m && m.tk ? 'TK — TOKEN STAGE' : 'STAGE'}</span><span class="rw-chip">${isRoom ? 'ROOM MAP' : (s.meHost ? 'STAGED' : 'PREVIEW')}</span><span class="rw-chip">${(m ? m.id : id).toUpperCase()}</span></div></div>`;
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
    disp.querySelector('.map-display-art').appendChild(cv);
    if (m) mapData(m.id).then((d) => drawMapPreview(cv, d)).catch(() => drawAnyPreview(cv));
    else drawAnyPreview(cv);
  }
  setMpLobby(s) { this.mpLobby = s || null; this.renderMpRow(); } // roster-driven re-render (offline: mpRow null → no-op)

  hoverFx() {
    document.querySelectorAll('.mbtn, .mode-card, .lw-item, .ab-chip, .la-chip').forEach(el => {
      el.addEventListener('mouseenter', () => SFXtick(true));
    });
  }

  parallax() {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('mousemove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
    });
    setInterval(() => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      $('menu-bg').style.transform = `translate(${cx * -14}px,${cy * -10}px) scale(1.03)`;
      $('menu-bg2').style.transform = `translate(${cx * -30}px,${cy * -22}px)`;
    }, 16);
  }

  buildCareerStrip() {
    const c = this.deps.career;
    const row = (l, v) => `<div>${l} <b>${v}</b></div>`;
    let mp = '';
    if (this.mpProfile) { // T44 §28.4: identity corner — MP level + progress (server truth; offline stats stay as-is)
      const p = this.mpProfile;
      const cur = Math.max(0, p.xp - xpForLevel(p.lvl));
      const span = Math.max(1, xpForLevel(p.lvl + 1) - xpForLevel(p.lvl));
      const pct = Math.min(100, Math.round((cur / span) * 100));
      mp = row(t('m.level'), p.lvl + (p.pr ? ' · P' + p.pr : '')) + `<div class="lvl-bar" title="${cur} / ${span} XP to next level"><i style="width:${pct}%"></i></div><div class="lvl-xp">${cur} / ${span} XP</div>`; // [G-9] the prestige marker rides the SAME server truth (P = the genre's prestige-rank shorthand; zero new state)
      const bp = bpOf(p.xp); // §62.5b (v1.54): BP tier mirror — SAME XP single truth as the level row (zero new state; hidden offline — corner law)
      mp += row(t('m.bp'), bp.tier + ' / ' + BP.tiers) + `<div class="lvl-bar" title="${bp.into} / ${BP.per} BP XP"><i style="width:${bp.pct}%"></i></div><div class="lvl-xp">${bp.need ? bp.need + ' XP → ' + t('m.bpNext') : t('m.bpMax')}</div>`;
    }
    if (this.mpRanked) { // T46 §30.6: ranked corner — tier + RP + season (server truth; hidden for anonymous/old server)
      const r = this.mpRanked;
      const curT = RP_TIERS.filter(t => t.min <= r.rp).pop();
      const nextT = RP_TIERS.find(t => t.min > r.rp);
      const pct = nextT ? Math.min(100, Math.round(((r.rp - curT.min) / (nextT.min - curT.min)) * 100)) : 100;
      const tip = nextT ? (nextT.min - r.rp) + ' RP → ' + nextT.n : t('m.peak', { rp: Math.max(r.pk || 0, r.rp) });
      mp += row(t('m.rank'), tierOf(r.rp) + ' · ' + r.rp + ' RP · S' + r.s) + `<div class="lvl-bar" title="${tip}"><i style="width:${pct}%"></i></div><div class="lvl-xp">${nextT ? (nextT.min - r.rp) + ' RP → ' + nextT.n : t('m.topTier', { rp: Math.max(r.pk || 0, r.rp) })}</div>`;
    }
    if (this.auth) mp += row('ACCOUNT', this.auth.name) + row('CR', (this.eco && this.eco.cr) || 0); // §53.7: signed-in identity + CR chip (server truth)
    mp += this.dailyChip(c); // §52.5 S5: deterministic daily chip
    $('career-strip').innerHTML = mp + row(t('m.matches'), c.matches || 0) + row(t('m.wins'), c.wins || 0) + row(t('m.elims'), c.kills || 0) + row(t('m.kd'), c.kd || '—') + row(t('m.acc'), (c.acc || 0) + '%') + row(t('m.bestStreak'), c.bestStreak || 0);
    if (!$('page-career').classList.contains('hidden')) this.renderCareer(); // v1.52 §62.3: live page mirrors the strip
  }

  // ============================================================
  // v1.52 §62.3 — CAREER page (metagame hub, rebuilt post-rewind).
  // Single truth = the SAME stores the career strip reads: local career LS +
  // server-truth mpProfile/mpRanked (T44/T46) + deterministic daily (config
  // dailyFor, §52.5 date-roll law). Zero new state. History rows render via
  // textContent — XSS-safe by construction (same law as renderHistory).
  // ============================================================
  // ---------- v1.55 T89 L5: MISSIONS page — deterministic 3 daily + 3 weekly, CR+BP rewards ----------
  // Single truth = metagame.js (deterministic picks, progress clamps, claim gates). Rewards
  // credit the LOCAL career ledger (career.cr / career.bp) — server-eco credit joins via MP
  // end chain (honest split, §53.2 law: server owns multiplayer CR).
  renderMissions() {
    const body = $('missions-body'); if (!body) return;
    const career = this.deps.career;
    const seasonOfId = () => seasonOf(Date.now()).id; // T89 season-key helper (BP reset law — same single truth as main.js)
    const L = this.metaLedger(); // [T103] the earn surface joins the ledger law — the v1.55 split's earn leg closes server-side
    const win = (L && L.evs && L.evs.win) ? L.evs.win : null; // [T103] the SERVER's window IS the window when live (d/w ride the view; the deterministic lists re-derive from them)
    const today = win ? win.d : metagame.evDayOf(Date.now());
    const week = win ? win.w : metagame.weekMonOf(today);
    if (!win) { // local shape maintenance (the boot law verbatim) — server truth arrives pre-shaped (the evsRec carry law)
      if (!career.evs || career.evs.v !== metagame.EV_PERSIST_V) career.evs = metagame.evChPersistShape();
      if (metagame.evsWindowRollover(career.evs, today, week)) career.evs = metagame.evChPersistShape();
    }
    const evsL = win || career.evs; // [T103] ONE ledger either way — rows + claims read it
    const stats = evsL.stats;
    const th = metagame.evActive(today);
    const thColor = (metagame.evThemeColors())[th.id] || '#29d3ff';
    let html = `<div class="ev-banner" style="border-color:${thColor}"><div class="ev-name">${t('ev.eventLive')} · <b>${t(th.key)}</b></div><div class="ev-desc">${t(th.desc)}</div></div>`; // [T90 fix] th.key/th.desc ALREADY carry the ev. prefix (metagame namespace law) — the EV_KEY_PREFIX double-concat rendered the raw fallback key (90-e audit defect 2)
    html += `<div class="la-title" style="margin-top:14px">${t('ev.daily')}</div>`;
    html += this._missionRows(metagame.evChallengesFor(today).daily, today, stats, evsL, thColor);
    html += `<div class="la-title" style="margin-top:14px">${t('ev.weekly')}</div>`;
    html += this._missionRows(metagame.evChallengesFor(today).weekly, today, stats, evsL, thColor);
    body.innerHTML = html;
    body.querySelectorAll('[data-mission]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.mission;
      const ch = metagame.evChallengeById(today, id);
      if (!ch) return;
      if (this.metaSpend('evclaim', { id })) return; // [T103] MP: server-authoritative — the server re-derives the window lists + the pure evsClaim law owns every rejection (onEco re-renders)
      const res = metagame.evsClaim(ch, stats, evsL);
      if (!res) return;
      career.evs = res.state;
      career.cr = (career.cr || 0) + (res.reward.cr || 0);
      if (!career.bp || career.bp.s !== seasonOfId()) career.bp = { x: 0, s: seasonOfId() };
      career.bp.x += res.reward.bp || 0;
      saveCareer(career); this.buildCareerStrip(); this.renderMissions(); SFXtick();
      this.setMsg(t('ev.claimed', { cr: res.reward.cr, bp: res.reward.bp }));
    });
  }
  _missionRows(list, today, stats, evsL, chColor) { // [T103] 4th arg = the ledger state (career.evs offline · the server window view live) — the row read was ledger-coupled, not career-coupled · [T117] 5th arg = the challenge accent (the event theme color)
    return list.map(ch => {
      const pct = metagame.evProgressPct(ch, stats);
      const claimable = metagame.evsClaimable(ch, stats, evsL);
      const claimed = (evsL.claimed[ch.kind] || []).includes(ch.id);
      const done = metagame.challengeDone(ch, stats);
      const rw = metagame.evRewardFor(ch);
      const btn = claimed ? `<span class="ev-claimed">${t('ev.claimedTag')}</span>` : claimable ? `<button class="diff-btn" data-mission="${ch.id}">${t('ev.claim')}</button>` : '';
      const chips = `<span class="rw-chip" style="--r:#e8b64c">+${rw.cr} CR</span>${rw.bp ? `<span class="rw-chip" style="--r:#29d3ff">+${rw.bp} BP</span>` : ''}`; // [T117] the reward chips leave the button — the claim action is the action, the reward is the DISPLAY
      return `<div class="mission-row ch-card ${done ? 'done' : ''}" style="--ch:${chColor || 'var(--acc2)'}"><div class="mr-head"><span>${t(ch.key)}</span><span style="opacity:.7">${metagame.challengeRemaining(ch, stats)} ${t('ev.toGo')}</span></div><div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div><div class="ch-rewards">${chips}${btn}</div></div>`;
    }).join('');
  }

  // ---------- [T91 v1.57] meta-game page renderers (page-bp / page-events / page-bundles / page-camos) ----------
  // The T90 index.html shells (#bp-wrap/#ev-wrap/#bn-wrap/#cm-wrap + 4 main-menu buttons) shipped
  // with NO renderers — this block is the INTEGRATION step the T90 shell comment filed. Card
  // grammar rides the missions/ev idiom (mission-row/mission-bar/ev-banner classes); claim/buy
  // delegation rides the data-* pattern; every face is an i18n key (mg.* / ev.ms.* namespaces).
  // BP law: the §62.5b LIVE curve (config BP {tiers:50, per:1000} — [T96 v1.62] chaptered re-land, career.bp.x) is the progression
  // single truth; reward content = PREMIUM_REWARDS rows 1..50 [T96 v1.62] + bpFreeChapterReward (v1.50 port,
  // metagame.js) — rows 31-50 of the v1.50 table await the §60.4 chaptered re-land (FM open).
  metaLedger() { // [T102] the meta pages' ledger — server truth when an auth'd server session is live (the §53.2 honest split, now bidirectional: the MP-end chain owns the meta economy too), local career otherwise · [T103] evs grows the challenge-window view (win: d/wk/claimed/stats/ms — null until the first state push, the gate keeps the page honest)
    if (this.auth && this.eco && this.eco.bp && this.deps.mpLive && this.deps.mpLive()) return { bp: this.eco.bp, bn: this.eco.bn || {}, evs: { v: metagame.EV_PERSIST_V, store: this.eco.evsStore || { t: 0 }, win: this.eco.evs || null }, cr: this.eco.cr || 0 };
    return null;
  }
  metaSpend(op, payload) { // [T102] server-authoritative meta economy op — the T99 MP-combat-law mirror for the eco ledger (offline paths stay local, byte-identical); the server re-validates EVERY gate (CR/pass/window/cap/claims)
    if (this.auth && this.deps.mpLive && this.deps.mpLive() && this.deps.sendEco) { this.deps.sendEco(Object.assign({ op }, payload || {})); return true; }
    return false;
  }
  ecoGate(msg) { // [T135] THE SILENT SHOP law — every server-economy leg STATES its gate instead of dropping silently (`sendEco is if(socket)` never speaks; the T135 user finding: shop BUY = "nothing happened" — the tabbed face renders on the ?mp=1 BOOT FLAG while the socket is dead)
    if (this.deps.mpLive && this.deps.mpLive()) return true;
    this.setMsg(msg || 'STORE OFFLINE — this economy rides the hub; connect with an account (ONLINE tab).');
    return false;
  }
  tkBal() { // [T137] the spendable face — the SAME sum the TOKENS line prints (account TK + browser wallet, the renderTokensTab balance idiom); ONE balance truth so the shelf and the shortfall modal never drift
    const w = pay.walletLoad();
    return ((this.eco && this.eco.tk) | 0) + ((w && w.tk) | 0);
  }
  needTk(cost, label, retry) { // [T137] THE TOKENS UPSELL law — the user finding: "when clicking to purchase and there's not enough in the account there should be whatever that is prominent to ask user to Add tokens & upsell the tokens professionally like CoD does". An unaffordable premium spend never dead-ends in a toast: it opens the pack shelf (the shortfall in big type, THE SAME pack buttons, terms on the face) with the purchase ARMED — tkCreditLanded resumes it through its own FTC confirm the moment a credit covers (the CoD auto-complete, never around the confirm). Affords → true (unchanged path); broke → the shelf + false.
    const c = cost | 0;
    if (!(c > 0) || this.tkBal() >= c) return true;
    this.upsellModal(c, label, retry);
    return false;
  }
  upsellModal(cost, label, retry) { // [T137] THE TOKENS UPSELL shelf — the CoD-native shortfall moment on the native face (zero provider insignias, the T134 law): NEED N MORE TK in big type, the item named, the balance line verbatim from the TOKENS face, the pack grid one tap away (packBtn — single-body law), the FTC terms on the shelf itself, and the connection truth stated BEFORE money moves (an offline top-up cannot spend offline — the honest chain, pre-stated, not discovered after the wallet fills).
    const old = document.getElementById('tk-upsell'); if (old) old.remove();
    this._upsellCost = cost; this._upsellLabel = label;
    this._tkRetry = (typeof retry === 'function') ? { cost, fn: retry } : null;
    const live = !!(this.deps.mpLive && this.deps.mpLive());
    const wal = pay.walletLoad();
    const bal = this.tkBal();
    const ov = document.createElement('div'); ov.id = 'tk-upsell';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,10,.82);z-index:390;display:flex;align-items:center;justify-content:center'; // BELOW the FTC confirm (400) — the pack confirm stacks ON TOP of the shelf
    const box = document.createElement('div');
    box.style.cssText = 'background:rgba(10,16,24,.97);border:1px solid rgba(255,90,60,.55);padding:24px 28px;width:min(560px,92vw);max-height:86vh;overflow:auto;font:inherit;color:#dfe8f2';
    const h = document.createElement('div'); h.style.cssText = 'font-size:13px;letter-spacing:.16em;margin-bottom:8px;color:#ff5a3c'; h.textContent = 'NOT ENOUGH TOKENS';
    const big = document.createElement('div'); big.style.cssText = 'font-size:26px;font-weight:700;letter-spacing:.04em;margin-bottom:6px'; big.textContent = 'NEED ' + (cost - bal).toLocaleString('en-US') + ' MORE TK';
    const sub = document.createElement('div'); sub.className = 'set-note'; sub.style.marginBottom = '12px'; sub.textContent = 'for ' + label + ' — balance ' + bal.toLocaleString('en-US') + ' TK' + (wal.tk > 0 ? ' (+' + wal.tk.toLocaleString('en-US') + ' WALLET · binds to this browser)' : '');
    const gh = document.createElement('div'); gh.className = 'la-title'; gh.style.marginBottom = '8px'; gh.textContent = 'GET TOKENS';
    const pg = document.createElement('div'); pg.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px';
    for (const p of TK_PACKS) pg.appendChild(this.packBtn(p));
    const note = document.createElement('div'); note.className = 'set-note'; note.style.cssText = 'margin-bottom:10px;opacity:.85';
    note.textContent = live
      ? (CFG.PAY.enabled ? 'Checkout opens the payment tab — REDEEM the license key on the TOKENS tab to credit (the webhook tier makes it instant).' : 'Sandbox checkout — the hub credits your account balance on confirm.')
      : 'OFFLINE — packs credit this browser wallet (binds to this device). Token spends ride the hub: connect with an account (ONLINE tab) to spend.';
    const terms = document.createElement('div'); terms.className = 'set-note'; terms.style.cssText = 'margin-bottom:12px;opacity:.75'; terms.textContent = t('tk.terms'); // the legal face — EVERY purchase surface carries it (the T110 FTC law)
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px';
    const cl = document.createElement('button'); cl.className = 'diff-btn'; cl.textContent = t('tk.cancel');
    cl.onclick = () => ov.remove();
    row.appendChild(cl);
    box.appendChild(h); box.appendChild(big); box.appendChild(sub); box.appendChild(gh); box.appendChild(pg); box.appendChild(note); box.appendChild(terms); box.appendChild(row);
    ov.appendChild(box); document.body.appendChild(ov);
  }
  packBtn(p) { // [T137] the pack button EXTRACTED VERBATIM from renderTokensTab (single-body law: one confirm flow, one three-way split by connection truth, one truth) — the TOKENS tab and the upsell shelf render the SAME buttons; the wallet leg joins the credit funnel so the armed purchase resumes
    const b = document.createElement('button'); b.className = 'diff-btn'; b.style.minWidth = '170px';
    const co = pay.checkoutUrl(CFG.PAY, p);
    b.textContent = '$' + p.usd.toFixed(2) + ' — ' + p.tk.toLocaleString('en-US') + ' TK' + (p.bonus ? ' (+' + p.bonus + '%)' : '') + ((co && CFG.PAY.enabled) ? '' : pay.SANDBOX_TAG);
    b.onclick = () => { this.confirmModal('tk.title', 'tk.packBody', { usd: '$' + p.usd.toFixed(2), n: p.tk.toLocaleString('en-US') }, () => {
      if (co && CFG.PAY.enabled) { // [T134] the REAL leg — [T135] it STATES its arc instead of a silent tab pop · [T138] THE WEBHOOK BIND — an authed checkout carries the pid as LS custom data (checkout[custom][pid]), so the hub's signed webhook credits the ACCOUNT with no REDEEM step; the license-key redeem face stays as the zero-backend fallback (PAYMENTS.md §webhook)
        let url = co;
        if (this.auth && this.auth.pid) {
          url += (url.includes('?') ? '&' : '?') + 'checkout[custom][pid]=' + encodeURIComponent(this.auth.pid) + '&checkout[custom][pack]=' + encodeURIComponent(p.id);
        }
        try { window.open(url, '_blank', 'noopener'); } catch (e) { /* the checkout never breaks the frame */ }
        this.setMsg(this.auth && this.auth.pid ? 'CHECKOUT OPENED in the payment tab — the hub webhook credits your account automatically when the payment lands.' : 'CHECKOUT OPENED in the payment tab — complete the purchase, then REDEEM the license key below (sign in next time and the webhook credits you automatically).');
      } else if (this.deps.mpLive && this.deps.mpLive()) { // [T135] the SANDBOX leg SPLIT BY CONNECTION TRUTH (the T119 S-1 law) — the T134 blind sendEco was THE SILENT SHOP: `if (socket)` dropped it with zero feedback when the hub was dead
        this.deps.sendEco({ op: 'tkco', pack: p.id, tok: this.auth && this.auth.tok }); // hub live → the server arc stays the single truth (the hub's answer credits the account — the ack funnels tkCreditLanded)
        this.setMsg('SANDBOX CHECKOUT — the hub carries this credit (the modal confirm simulated the approval).');
      } else { // [T135] hub NOT live → the local wallet IS the sandbox ledger — visible balance + receipt, honestly tagged browser-bound (never a silent drop again)
        pay.walletCredit(p, 'sandbox');
        this.setMsg('SANDBOX +' + p.tk.toLocaleString('en-US') + ' TK — simulated approval credited to the browser wallet (binds to this device).');
        this.tkCreditLanded(); // [T137] the armed purchase resumes when the wallet now covers it
        if (!$('page-shop').classList.contains('hidden')) this.renderShop(); // the fresh face carries the new balance + receipt (the redeem-path idiom)
      }
    }); };
    return b;
  }
  tkCreditLanded() { // [T137] ONE funnel for every balance raise (the sandbox wallet credit, the LS REDEEM, the hub's d.tk ack) — the CoD auto-resume: the armed purchase fires through its OWN FTC confirm the moment the balance first covers; a partial top-up instead re-speaks the shortfall with the fresh balance (the shelf never goes stale, the promise never lies)
    const r = this._tkRetry;
    if (r && this.tkBal() >= r.cost) {
      this._tkRetry = null; this._upsellCost = null; this._upsellLabel = null;
      const up = document.getElementById('tk-upsell'); if (up) up.remove();
      this.toast('TOKENS ADDED — completing your purchase…');
      try { r.fn(); } catch (e) { /* the resume never breaks the credit face */ }
      return;
    }
    if (document.getElementById('tk-upsell') && this._upsellCost) this.upsellModal(this._upsellCost, this._upsellLabel, r ? r.fn : null);
  }
  toast(msg) { // [T136] THE TOAST LAW — the shop (and every non-settings page) has NO _msgEl: the T135 "the gate speaks" messages were spoken into the VOID (the user's second "no response" report). One fixed element, reused across pages, auto-fades — the setMsg voice for everywhere else.
    let el = document.getElementById('ui-toast');
    if (!el) {
      el = document.createElement('div'); el.id = 'ui-toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:420;background:rgba(10,16,24,.95);border:1px solid rgba(255,90,60,.55);color:#dfe8f2;padding:10px 18px;font:inherit;font-size:12px;letter-spacing:.05em;max-width:min(620px,88vw);text-align:center;pointer-events:none;opacity:0;transition:opacity .18s';
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity = '1';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { el.style.opacity = '0'; }, 3600);
  }
  renderTokensTab(el, eco) { // [T136] the T110 tokens face EXTRACTED — the offline shop face now reuses it verbatim: the packs are the ZERO-BACKEND arc (hosted checkout / sandbox wallet) and never needed the hub; the catalog legs inside still ride ecoGate (they speak, and the toast makes it visible)
    const wal = pay.walletLoad(); // [T134] the local wallet — the redeemed TK rides the same face (the honest trust boundary: the browser binds the wallet, the DEVLOG documents it)
    const bal = document.createElement('div'); bal.className = 'set-note';
    bal.textContent = 'TOKENS ' + ((eco.tk | 0) + wal.tk).toLocaleString('en-US') + (wal.tk > 0 ? ' (+' + wal.tk.toLocaleString('en-US') + ' WALLET · binds to this browser)' : '') + ' · packs are non-refundable · purchases bind to your account';
    el.appendChild(bal);
    const ph = document.createElement('div'); ph.className = 'la-title'; ph.style.marginTop = '12px'; ph.textContent = 'PACKS';
    el.appendChild(ph);
    const pg = document.createElement('div'); pg.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
    for (const p of TK_PACKS) pg.appendChild(this.packBtn(p)); // [T137] the pack button lives in packBtn() VERBATIM — the upsell shelf renders THE SAME buttons (single-body law: one confirm flow, one three-way split, one truth)
    el.appendChild(pg);
    if (CFG.PAY.lsRedeem) { // [T134] the REDEEM face — the zero-backend verifier (LS License API); native markup only (the insignia law)
      const rh = document.createElement('div'); rh.className = 'la-title'; rh.style.marginTop = '14px'; rh.textContent = 'REDEEM';
      el.appendChild(rh);
      const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;align-items:center';
      const inp = document.createElement('input'); inp.className = 'soc-in'; inp.placeholder = 'LICENSE KEY'; inp.spellcheck = false; inp.autocomplete = 'off'; inp.style.cssText = 'flex:1;letter-spacing:.15em;text-transform:uppercase';
      const rb = document.createElement('button'); rb.className = 'diff-btn'; rb.textContent = 'REDEEM';
      const note = document.createElement('div'); note.className = 'set-note';
      rb.onclick = async () => { // the async chain lives INSIDE the click — the redeem never races the re-render
        const k = (inp.value || '').trim().toLowerCase();
        if (!k) return;
        rb.disabled = true; note.textContent = 'VALIDATING…';
        const res = await pay.redeemLS(CFG.PAY, k, 'ironsight-' + ((this.auth && this.auth.pid) || 'pilot'));
        rb.disabled = false;
        if (!res.ok) { note.textContent = res.error === 'unreachable' ? 'VALIDATION UNREACHABLE (network) — TRY AGAIN' : res.error === 'unmapped' ? 'KEY VALID — NO PACK MAPPED (PAY.lsProductMap)' : res.error === 'invalid' ? 'INVALID KEY' : 'REDEEM: ' + res.error; return; }
        if (pay.walletHas(k)) { note.textContent = 'ALREADY REDEEMED ON THIS DEVICE'; return; }
        const pk = packById(res.packId);
        if (!pk) { note.textContent = 'UNMAPPED PACK'; return; } // config drift — honest, never a guess
        pay.walletCredit(pk, 'license'); pay.walletMark(k); this.tkCreditLanded(); // [T137] the REDEEM joins the credit funnel — the armed purchase resumes when the key covers it
        this.setMsg('REDEEMED +' + pk.tk.toLocaleString('en-US') + ' TK');
        if (!$('page-shop').classList.contains('hidden')) this.renderShop(); // the fresh face carries the new balance + receipt (the renderShop idiom)
      };
      row.appendChild(inp); row.appendChild(rb); el.appendChild(row); el.appendChild(note);
    }
    const ch = document.createElement('div'); ch.className = 'la-title'; ch.style.marginTop = '14px'; ch.textContent = 'RARE CATALOG';
    el.appendChild(ch);
    const cg = document.createElement('div'); cg.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
    const skus = [ // the tk-flagged rows of EACH table + the token-native stages — ONE read per single truth, no duplicates
      ...OPERATORS.filter(o => o.tk > 0).map(o => ({ id: o.id, label: o.name, kind: 'OPERATOR', tk: o.tk })),
      ...FINISHES.filter(f => f.tk > 0).map(f => ({ id: f.id, label: f.label, kind: 'FINISH', tk: f.tk })),
      ...CHARMS.filter(c => c.tk > 0).map(c => ({ id: c.id, label: c.label, kind: 'CHARM', tk: c.tk })),
      ...TRAILS.filter(x => x.tk > 0).map(x => ({ id: x.id, label: x.label, kind: 'TRAIL', tk: x.tk })),
      ...TK_STAGES.map(s => ({ id: s.id, label: Maps.nameOf(s.id), kind: 'STAGE', tk: s.tk })),
    ];
    for (const s of skus) {
      const owned = (eco.own[s.id] || 0) > 0;
      const b = document.createElement('button'); b.className = 'diff-btn'; b.style.minWidth = '190px';
      b.textContent = s.label + ' · ' + s.kind + ' · ' + s.tk.toLocaleString('en-US') + ' TK' + (owned ? ' · OWNED' : '');
      if (!owned) b.onclick = () => { const go = () => this.confirmModal('tk.title', 'tk.skuBody', { n: s.tk.toLocaleString('en-US'), name: s.label }, () => { if (!this.ecoGate('STORE OFFLINE — token spends ride the hub; connect with an account (ONLINE tab).')) return; this.deps.sendEco({ op: 'tksku', id: s.id, tok: this.auth && this.auth.tok }); }); if (!this.needTk(s.tk, s.label + ' · ' + s.kind, go)) return; go(); }; // [T135] the gate speaks · [T137] THE TOKENS UPSELL: the broke click opens the pack shelf with the purchase ARMED — the FTC confirm stays ON the spend path (the resume fires it, never skips it)
      cg.appendChild(b);
    }
    el.appendChild(cg);
    const hh = document.createElement('div'); hh.className = 'la-title'; hh.style.marginTop = '14px'; hh.textContent = 'RECEIPTS';
    el.appendChild(hh);
    const hg = document.createElement('div');
    const hist = [
      ...wal.hist.map(h => ({ pack: h.pack + ' · W', tk: h.tk, usd: h.usd })), // [T134] the local wallet receipts ride first (the W tag — honest origin)
      ...(eco.tkhist || []),
    ].slice(-5).reverse();
    if (!hist.length) { const d = document.createElement('div'); d.className = 'set-note'; d.textContent = 'No purchases yet.'; hg.appendChild(d); }
    for (const h of hist) { const d = document.createElement('div'); d.className = 'set-note'; d.textContent = (h.pack || '?') + ' · +' + (h.tk | 0).toLocaleString('en-US') + ' TK · $' + (h.usd || 0).toFixed(2); hg.appendChild(d); }
    el.appendChild(hg);
  }
  renderBp() {
    const wrap = $('bp-wrap'); if (!wrap) return;
    const bal = $('bp-balance');
    const career = this.deps.career;
    const seasonId = seasonOf(Date.now()).id;
    if (!career.bp || career.bp.s !== seasonId) career.bp = { x: 0, s: seasonId }; // T89 season-key reset law (renderMissions single truth)
    const L = this.metaLedger(); // [T102] server truth when authed — bp/claims/prem render the MP-end chain's own ledger
    const bpv = L ? L.bp : career.bp;
    const crv = L ? L.cr : (career.cr || 0);
    const bp = bpOf(bpv.x); // §62.5b live mirror — { tier, into, need, pct }
    if (bal) bal.textContent = `${crv} CR · ${bpv.x} BP · ${t('mg.season')} ${seasonId}`;
    let html = `<div class="mission-row"><div class="mr-head"><b>${t('mg.tier')} ${bp.tier}/${BP.tiers}</b><span style="opacity:.7">${bp.into}/${BP.per} ${t('mg.bpToNext')}</span></div><div class="mission-bar"><div class="mission-fill" style="width:${bp.pct}%"></div></div></div>`;
    html += `<div class="la-title" style="margin-top:14px">${t('mg.premiumTrack')}</div>`;
    const bnSetBp = metagame.bundleOwnedItems(L ? L.bn : career.bn); // [T93] the ∪ ownership law (refreshLoadout idiom) — [T94] hoisted ABOVE the premium section so both tracks read ONE truth · [T102] the bn leg reads server truth when authed
    const cosOwnedBp = (career.cosOwned && typeof career.cosOwned === 'object') ? career.cosOwned : {};
    const ownedBp = L ? ((this.eco && this.eco.own) || {}) : cosOwnedBp; // [T102] server inventory (server-side claims/bundles grant INTO eco.own) when authed — the ∪ read's claimed leg
    const charmOwned = (id) => !!ownedBp[id] || bnSetBp.has(id) || (() => { const f = CHARMS.find((c) => c.id === id); return !!f && isUnlocked(f, career); })();
    const premOwned = (id) => !!ownedBp[id] || bnSetBp.has(id) || (() => { const row = CHARMS.find((x) => x.id === id) || FINISHES.find((x) => x.id === id) || TRAILS.find((x) => x.id === id) || EMOTES.find((x) => x.id === id); return !!row && isUnlocked(row, career); })(); // [T94] the premium ∪ read — all four cosmetic tables (premium odd tiers walk charms/emotes/trails, even walk finishes)
    const premOn = bpv.prem === true; // [T94] has-pass read — the SPEC N1 buyout (1000 CR, no real-money leg)
    html += `<div class="mission-row"><div class="mr-head"><b>${premOn ? t('mg.passOwned') : t('mg.passBuy', { n: metagame.BP_PASS_PRICE })}</b>${premOn ? '' : `<button class="diff-btn" data-bppass="1">${t('mg.buy')}</button>`}</div></div>`;
    const premClaims = (bpv.claims && Array.isArray(bpv.claims.premium)) ? bpv.claims.premium : [];
    const claimsF = (bpv.claims && Array.isArray(bpv.claims.free)) ? bpv.claims.free : []; // [T124] hoisted above the track — the free lane reads the same claims
    // [T124] the researched TIER TRACK (research/pgx_07: "A Free Track (available to everyone)
    // — A Premium Track (paid entry with better rewards) — Tiers that unlock with XP"; the
    // dual-track theory carried since the wz_menu pass) — ONE lane cell per tier: the premium
    // face on top, the free chapter marker at each lane boundary (tr % TPC === 0). Every state
    // rides the EXISTING ctl ladder faces and the SAME data-bpprem/data-bpfree attributes, so
    // the proven claim handlers below bind unchanged — zero i18n churn, zero new wire paths.
    const TPC = metagame.BP_TIERS_PER_CH;
    html += '<div class="bp-track">';
    for (let tr = 1; tr <= BP.tiers; tr++) {
      const rw = metagame.bpRewardFor(tr);
      if (!rw) continue;
      const face = rw.type === 'cr' ? `${rw.n} CR` : rw.label;
      const claimed = premClaims.indexOf(tr) >= 0;
      const claimable = metagame.bpClaimablePremium(bpv, tr, bp.tier);
      const reached = tr <= bp.tier;
      const ctl = claimed ? `<span class="ev-claimed">${t('mg.banked')}</span>`
        : claimable ? `<button class="diff-btn" data-bpprem="${tr}">${t('mg.claim')}</button>`
        : reached ? `<span style="opacity:.6">${t('mg.passLock')}</span>`
        : `<span style="opacity:.6">${t('mg.tierLock', { n: tr })}</span>`;
      const ch = Math.ceil(tr / TPC);
      const isCh = tr % TPC === 0;
      const freeCtl = !isCh ? '' : claimsF.indexOf(ch) >= 0 ? `<span class="ev-claimed">${t('mg.banked')}</span>`
        : metagame.bpClaimableFree(bpv, ch, bp.tier) ? `<button class="diff-btn" data-bpfree="${ch}">${t('mg.claim')} · ${t('mg.ch')} ${ch}</button>`
        : `<span style="opacity:.6">${t('mg.ch')} ${ch}</span>`;
      const art = rw.type === 'cr' ? `<span class="bp-art" style="--r:${R_HEX.legendary}"><b>${rw.n} CR</b></span>` : `<span class="bp-art" style="--r:${R_HEX[rw.r] || R_HEX.common}"><b>${R_INIT(rw.label)}</b></span>`; // [T117] the tier card gets a reward ART face (rarity-tinted) — the tier rail reads as a card carousel
      html += `<div class="bp-cell ${claimed || reached ? 'past' : ''}${tr === bp.tier ? ' cur' : ''}">${art}<span class="bp-n">${t('mg.tier')} ${tr}</span><span class="bp-rw r-${rw.r || 'cr'}">${face}</span><span class="bp-ctl">${ctl}</span>${freeCtl ? `<span class="bp-free">${freeCtl}</span>` : ''}</div>`;
    }
    html += '</div>';
    // [T117] the v1.50-era flat PREMIUM row list RETIRED — the tier track above IS the premium
    // display now (every cell carries the SAME data-bpprem/data-bpfree wires + the ctl ladder);
    // the duplicate list was the T90 integration-era face. The FREE track list below stays —
    // it is the charm-reward DETAIL display (dupe-conversion faces), not duplication.
    html += `<div class="la-title" style="margin-top:14px">${t('mg.freeTrack')}</div>`;
    for (let ch = 1; ch <= Math.ceil(BP.tiers / metagame.BP_TIERS_PER_CH); ch++) {
      const charmId = metagame.BP_FREE_CHARMS[(ch - 1) % metagame.BP_FREE_CHARMS.length];
      const rw = metagame.bpFreeChapterReward(ch, charmOwned(charmId)); // [T93] the claim leg is LANDED — the preview now carries the REAL charmOwned state (dupe conversion face) — T91 preview-pin superseded same-turn
      if (!rw) continue;
      const claimed = claimsF.indexOf(ch) >= 0;
      const claimable = metagame.bpClaimableFree(bpv, ch, bp.tier);
      const charmLbl = () => { const c = CHARMS.find((x) => x.id === charmId); return c ? c.label : String(charmId).toUpperCase(); };
      const rwFace = rw.charm ? `${rw.cr} CR + ${charmLbl()}` : `${rw.cr} CR + ${t('mg.dupeFace', { n: rw.dupeRefund })}`;
      const ctl = claimed ? `<span class="ev-claimed">${t('mg.banked')}</span>`
        : claimable ? `<button class="diff-btn" data-bpfree="${ch}">${t('mg.claim')} — ${rwFace}</button>`
        : `<span style="opacity:.6">${t('mg.tierLock', { n: ch * metagame.BP_TIERS_PER_CH })}</span>`;
      html += `<div class="bp-row ${claimed ? 'past' : ''}"><span class="bp-n">${t('mg.ch')} ${ch}</span><span class="bp-rw">${rwFace}</span><span class="bp-tag">${ctl}</span></div>`;
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-bppass]').forEach((btn) => btn.onclick = () => { // [T94] pass buy — the SPEC N1 1000-CR buyout, the evStoreBuy caller idiom (pure returns { bp, cost }, the caller debits)
      if (this.metaSpend('bppass')) return; // [T102] MP: server-authoritative — the eco chain carries { cr, bp } and onEco re-renders
      const res = metagame.bpPassBuy(career.bp, career.cr);
      if (!res) return;
      career.bp = res.bp;
      career.cr = (career.cr || 0) - res.cost;
      saveCareer(career); this.buildCareerStrip(); this.renderBp(); SFXtick();
      this.setMsg(t('mg.passOwned'));
    });
    wrap.querySelectorAll('[data-bpprem]').forEach((btn) => btn.onclick = () => { // [T94] premium claim — the renderEvents claim idiom verbatim (copy-on-write res + saveCareer + rebuild); the grant rides cosOwned (the claimed leg of the §53.2 ∪ law — feeds EVERY picker with zero picker changes)
      const tr = Number(btn.dataset.bpprem) | 0;
      if (this.metaSpend('bpclaim', { tr })) return; // [T102] MP: server-authoritative — the server re-validates pass/tier/claims
      const res = metagame.bpClaimPremium(career.bp, tr, bp.tier, premOwned);
      if (!res) return;
      career.bp = res.bp;
      const credit = (res.reward.cr || 0) + (res.reward.dupeRefund || 0);
      career.cr = (career.cr || 0) + credit;
      if (res.reward.id) { if (!career.cosOwned || typeof career.cosOwned !== 'object') career.cosOwned = {}; career.cosOwned[res.reward.id] = true; }
      saveCareer(career); this.buildCareerStrip(); this.renderBp(); SFXtick();
      this.setMsg(t('ev.claimed', { cr: credit, bp: 0 }));
    });
    wrap.querySelectorAll('[data-bpfree]').forEach((btn) => btn.onclick = () => { // [T93] free-track claim — the renderEvents claim idiom verbatim (copy-on-write res + saveCareer + rebuild)
      const ch = Number(btn.dataset.bpfree) | 0;
      if (this.metaSpend('bpclaim', { ch })) return; // [T102] MP: server-authoritative — the server re-validates chapter/tier/claims
      const res = metagame.bpClaimFree(career.bp, ch, bp.tier, charmOwned(metagame.BP_FREE_CHARMS[(ch - 1) % metagame.BP_FREE_CHARMS.length]));
      if (!res) return;
      career.bp = res.bp;
      career.cr = (career.cr || 0) + (res.reward.cr || 0) + (res.reward.dupeRefund || 0);
      if (res.reward.charm) { if (!career.cosOwned || typeof career.cosOwned !== 'object') career.cosOwned = {}; career.cosOwned[res.reward.charm] = true; }
      saveCareer(career); this.buildCareerStrip(); this.renderBp(); SFXtick();
      this.setMsg(t('ev.claimed', { cr: (res.reward.cr || 0) + (res.reward.dupeRefund || 0), bp: 0 }));
    });
  }

  // page-events = the T89 missions surface + the T91 milestones (FM N3 count verbatim: 8) +
  // the event store (cap-7 verbatim, m_05). Challenge rows REUSE _missionRows verbatim.
  renderEvents() {
    const body = $('ev-wrap'); if (!body) return;
    const career = this.deps.career;
    const seasonOfId = () => seasonOf(Date.now()).id;
    const L = this.metaLedger(); // [T103] hoisted — the earn surface AND the store read ONE ledger (the [T102] store swap keeps its shape below)
    const win = (L && L.evs && L.evs.win) ? L.evs.win : null; // [T103] the SERVER's window IS the window when live (d/w ride the view)
    const today = win ? win.d : metagame.evDayOf(Date.now());
    const week = win ? win.w : metagame.weekMonOf(today);
    if (!win) { // local shape maintenance (the boot law verbatim) — server truth arrives pre-shaped (the evsRec carry law)
      if (!career.evs || career.evs.v !== metagame.EV_PERSIST_V) career.evs = metagame.evChPersistShape();
      if (metagame.evsWindowRollover(career.evs, today, week)) career.evs = metagame.evChPersistShape();
    }
    const evsWin = win || career.evs; // [T103] the missions/milestones ledger — the store's evsL (the L.evs shape with .store) stays below
    const stats = evsWin.stats;
    const th = metagame.evActive(today);
    const thColor = (metagame.evThemeColors())[th.id] || '#29d3ff';
    const win2 = metagame.evEventWindowOf(today);
    let html = `<div class="ev-banner" style="border-color:${thColor}"><div class="ev-name">${t('ev.eventLive')} · <b>${t(th.key)}</b></div><div class="ev-desc">${t(th.desc)} · ${win2.start} → ${win2.end}</div></div>`;
    html += `<div class="la-title" style="margin-top:14px">${t('ev.daily')}</div>`;
    html += this._missionRows(metagame.evChallengesFor(today).daily, today, stats, evsWin, thColor);
    html += `<div class="la-title" style="margin-top:14px">${t('ev.weekly')}</div>`;
    html += this._missionRows(metagame.evChallengesFor(today).weekly, today, stats, evsWin, thColor);
    html += `<div class="la-title" style="margin-top:14px">${t('mg.milestones')}</div>`;
    // [T124] the researched milestone LADDER (research/pgx_04's track grammar + the wz_menu event
    // window law) — the ladder renders as a connected rail (CSS only on the existing rows); the
    // data-ms attributes and the proven claim handler below bind unchanged.
    html += '<div class="ev-ms-track">' + metagame.EV_MILESTONES.map((ms) => {
      const cur = Math.min(metagame.statOf(stats, ms.metric), ms.goal);
      const pct = Math.min(100, Math.round((cur / ms.goal) * 100));
      const claimable = metagame.evMilestoneClaimable(ms, stats, evsWin);
      const claimed = (evsWin.ms || []).includes(ms.id);
      const done = metagame.evMilestoneDone(ms, stats);
      const btn = claimed ? `<span class="ev-claimed">${t('ev.claimedTag')}</span>` : claimable ? `<button class="diff-btn" data-ms="${ms.id}">${t('ev.claim')} ${ms.cr} CR + ${ms.bp} BP</button>` : '';
      return `<div class="mission-row ${done ? 'done' : ''}"><div class="mr-head"><span>${t('ev.ms.' + ms.metric, { n: ms.goal })}</span><span style="opacity:.7">${cur}/${ms.goal}</span></div><div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>${btn}</div>`;
    }).join('') + '</div>';
    const evsL = L ? L.evs : career.evs;
    const crL = L ? L.cr : (career.cr || 0);
    const bought = metagame.evStoreBought(evsL);
    html += `<div class="la-title" style="margin-top:14px">${t('mg.store')}</div>`;
    html += `<div class="ev-store-note">${t('mg.storeNote', { n: metagame.EV_STORE_CAP - bought })}</div>`;
    html += metagame.EV_STORE_SKUS.map((sku) => {
      const ok = metagame.evStoreBuyable(sku, evsL) && crL >= sku.cr;
      return `<div class="mission-row"><div class="mr-head"><span>${t('mg.skipN', { n: sku.tiers })}</span><span style="opacity:.7">${sku.cr} CR</span></div><button class="diff-btn" data-sku="${sku.id}" ${ok ? '' : 'disabled'}>${t('mg.buy')}</button></div>`;
    }).join('');
    body.innerHTML = html;
    body.querySelectorAll('[data-mission]').forEach((btn) => btn.onclick = () => { // challenge claim — the renderMissions idiom verbatim (this page mirrors it)
      const ch = metagame.evChallengeById(today, btn.dataset.mission);
      if (!ch) return;
      if (this.metaSpend('evclaim', { id: ch.id })) return; // [T103] MP: server-authoritative — the server re-derives the window lists + the pure evsClaim law owns every rejection (onEco re-renders)
      const res = metagame.evsClaim(ch, stats, evsWin);
      if (!res) return;
      career.evs = res.state;
      career.cr = (career.cr || 0) + (res.reward.cr || 0);
      if (!career.bp || career.bp.s !== seasonOfId()) career.bp = { x: 0, s: seasonOfId() };
      career.bp.x += res.reward.bp || 0;
      saveCareer(career); this.buildCareerStrip(); this.renderEvents(); SFXtick();
      this.setMsg(t('ev.claimed', { cr: res.reward.cr, bp: res.reward.bp }));
    });
    body.querySelectorAll('[data-ms]').forEach((btn) => btn.onclick = () => { // [T91] milestone claim — evMilestoneClaim idiom
      const ms = metagame.EV_MILESTONES.find((x) => x.id === btn.dataset.ms);
      if (!ms) return;
      if (this.metaSpend('msclaim', { id: ms.id })) return; // [T103] MP: server-authoritative — the static 8-row table is single-truth both sides; the pure law owns every rejection
      const res = metagame.evMilestoneClaim(ms, stats, evsWin);
      if (!res) return;
      career.evs = res.state;
      career.cr = (career.cr || 0) + (res.reward.cr || 0);
      if (!career.bp || career.bp.s !== seasonOfId()) career.bp = { x: 0, s: seasonOfId() };
      career.bp.x += res.reward.bp || 0;
      saveCareer(career); this.buildCareerStrip(); this.renderEvents(); SFXtick();
      this.setMsg(t('ev.claimed', { cr: res.reward.cr, bp: res.reward.bp }));
    });
    body.querySelectorAll('[data-sku]').forEach((btn) => btn.onclick = () => { // [T91] event-store buy — cap-7 enforced by evStoreBuy; CR debit + §62.5b BP credit are REAL (the only purchase law with a live consumer)
      const sku = metagame.evStoreSkuById(btn.dataset.sku);
      if (!sku) return;
      if (this.metaSpend('evsku', { id: sku.id })) return; // [T102] MP: server-authoritative — the server re-validates CR + the cap-7 window counter
      if ((career.cr || 0) < sku.cr) return;
      const res = metagame.evStoreBuy(sku, career.evs);
      if (!res) return;
      career.evs = res.state;
      career.cr -= sku.cr;
      if (!career.bp || career.bp.s !== seasonOfId()) career.bp = { x: 0, s: seasonOfId() };
      career.bp.x += BP.per * res.tiers;
      saveCareer(career); this.buildCareerStrip(); this.renderEvents(); SFXtick();
      this.setMsg(t('mg.bought', { n: res.tiers }));
    });
  }

  // page-bundles = N4 rotation viewer + local acquisition (career.bn[windowId] marker; the
  // loadout-consumption leg rides the T2-5 economy row — logged open, FM annotated).
  renderBundles() {
    const wrap = $('bn-wrap'); if (!wrap) return;
    const career = this.deps.career;
    career.bn = (career.bn && typeof career.bn === 'object') ? career.bn : {};
    const wins = metagame.bundlesFor(metagame.evDayOf(Date.now()));
    const L = this.metaLedger(); // [T102] server truth when authed
    const bnL = L ? L.bn : career.bn;
    const crL = L ? L.cr : (career.cr || 0);
    // [T124] the researched store arrangement (research/pgx_06: "Every Featured Bundle and Pack
    // is unique, containing a thematic collection"; "Featured Spotlight, Operators and
    // Blueprints bundles in the current item shop") — the FIRST live window renders as the
    // FEATURED card, the rotation follows in the bn-grid; same mission-row/bn-item grammar and
    // the same data-bn attribute, so the proven acquire handler binds unchanged.
    const bnCard = (w, feat) => { // [T117] the store arrangement goes FULL CARD GRAMMAR: the first live window = the FEATURED hero display; the rotation = the item-card grid. Same data-bn wires, same owned/disabled gates.
      const owned = metagame.bnOwned(bnL, w.id);
      const rows = w.items.map((it) => `<span class="rw-chip" style="--r:${R_HEX[it.r] || R_HEX.common}"><span class="rr">${it.label}</span> ${it.d} · ${metagame.BN_PRICE[it.r]} CR</span>`).join('');
      const glyph = R_INIT(w.items.map((it) => it.label).join(' '));
      const buy = owned ? `<span class="item-card-badge own" style="position:static">${t('mg.owned')}</span>` : `<button class="diff-btn" data-bn="${w.id}" ${crL >= w.price ? '' : 'disabled'}>${t('mg.buy')}</button><span class="hero-card-price">${w.price} CR</span>`;
      if (feat) return `<div class="hero-card" style="--r:#e8b64c"><span class="hero-card-art"><span class="hero-card-glyph">${glyph}</span></span><span class="hero-card-body"><span class="hero-card-kicker">${t('mg.bnWin', { s: w.slot })} · ${w.start} → ${w.end}</span><span class="hero-card-name">${w.items.length} ITEMS · Σ × ${metagame.BN_DISCOUNT}</span><span class="hero-card-items">${rows}</span><span class="hero-card-foot">${buy}</span></span></div>`;
      return `<div class="item-card" style="--r:${R_HEX[(w.items[0] || {}).r] || R_HEX.common}"><span class="item-card-art"><span class="item-card-glyph">${glyph}</span></span><span class="item-card-body"><span class="item-card-name">${t('mg.bnWin', { s: w.slot })}</span><span class="item-card-row"><span class="item-card-rar">${w.start} → ${w.end}</span><span class="item-card-price">${w.price} CR</span></span><span class="hero-card-items">${rows}</span><span class="hero-card-foot">${buy}</span></span></div>`;
    };
    wrap.innerHTML = (wins.length ? bnCard(wins[0], true) : '') + `<div class="bn-grid">${wins.slice(1).map((w) => bnCard(w, false)).join('')}</div>`;
    wrap.querySelectorAll('[data-bn]').forEach((btn) => btn.onclick = () => { // [T91] bundle acquire — CR debit + window-id marker (deterministic window ⇒ the SAME set re-renders owned until rotation)
      if (this.metaSpend('bnbuy', { id: btn.dataset.bn })) return; // [T102] MP: server-authoritative — live-window-only, the server re-validates CR + owned
      const w = wins.find((x) => x.id === btn.dataset.bn);
      if (!w || (career.cr || 0) < w.price || career.bn[w.id]) return;
      career.cr -= w.price;
      career.bn[w.id] = true;
      saveCareer(career); this.buildCareerStrip(); this.renderBundles(); SFXtick();
      this.setMsg(t('mg.ownedMsg', { s: w.slot }));
    });
  }

  // page-camos = the N7 per-weapon mastery ladder (T90-c law) as a full page — camoCardData +
  // CAMO_TIERS + career.weaponKills, the SAME single truth as the loadout mastery card.
  renderCamos() {
    const wrap = $('cm-wrap'); if (!wrap) return;
    const career = this.deps.career || {};
    const wk = career.weaponKills || {};
    // [T117] the researched grouping law (research/wz_menu_02+05: the reward ladder is the
    // page's key part; common-region containers group parsed-before-read layouts; CODM
    // mastery pages group ladders per class): rows GROUP by the weapon class under la-title
    // headers — cls is config single-truth data surfaced raw (the loadout idiom ui.js:1251),
    // zero i18n churn; class order = first-appearance order in WEAPONS (deterministic).
    const classes = [];
    for (const w of WEAPONS) { if (!classes.includes(w.cls)) classes.push(w.cls); }
    let cmIx = 0; this._clsHex = this._clsHex || {}; const clsHexOf = (cls) => { if (!(cls in this._clsHex)) this._clsHex[cls] = CLASS_HEX[cmIx++ % CLASS_HEX.length]; return this._clsHex[cls]; }; // [T117] stable per-class accent (first-appearance order — the renderCamos class law)
    const pk = career.pk || {}; // [T139 N7] the per-CLASS kill-sum (§60.4 variant — camo.js PK law)
    const clsCards = (cls, hex) => { // [T139 N7] the CLASS MASTERY card heads every class group — pkCardData renders the SAME shape the per-weapon cards already do (one card grammar, two ladders)
      const cd = pkCardData(pk, cls);
      const pips = PK_TIERS.map((_, i) => `<span class="cm-pip${i < cd.tier ? ' on' : ''}"></span>`).join('');
      const tierRow = cd.next != null ? `${t('m.camoNext', { label: (PK_TIERS[Math.min(cd.tier, PK_TIERS.length - 1)] || {}).label || '', n: cd.next })} (${cd.pct}%)` : t('m.camoMax');
      return `<div class="cm-card cls ${cd.next == null ? 'done' : ''}" style="--r:${hex}"><div class="cm-card-head"><span class="cm-glyph">★</span><b>${cls}</b><span class="cm-kills">${t('mg.cmKills', { n: cd.kills })}</span></div><div class="mission-bar"><div class="mission-fill" style="width:${cd.pct}%"></div></div><div class="cm-pips">${pips}</div><div class="cm-tier">${t('mg.tier')} ${cd.tier}/${PK_TIERS.length} · ${tierRow}</div></div>`;
    };
    wrap.innerHTML = classes.map((cls) => {
      const rows = WEAPONS.filter((w) => w.cls === cls).map((w) => {
      const cd = camoCardData(w.name, wk);
      const kills = wk[w.name] || 0;
      const tierRow = cd.next != null ? `${t('m.camoNext', { label: (CAMO_TIERS[Math.min(cd.tier, CAMO_TIERS.length - 1)] || {}).label || '', n: cd.next })} (${cd.pct}%)` : t('m.camoMax');
      // [T124] the researched camo-TRACK law (research/pgx_04+05: "Progress a weapon's main
      // Camo Track"; the trackers "tick off every camo challenge weapon by weapon" with
      // "percentage completed trackers") — the track renders as TIER PIPS under the bar
      // (CAMO_TIERS is config single-truth data, zero i18n churn), the pct face stays.
      const pips = CAMO_TIERS.map((_, i) => `<span class="cm-pip${i < cd.tier ? ' on' : ''}"></span>`).join('');
      // [T117] the mastery LADDER becomes a CARD GRID: class-glyph head + kills face + bar + pips (the mg.cmKills face law verbatim)
      return `<div class="cm-card ${cd.next == null ? 'done' : ''}" style="--r:${clsHexOf(cls)}"><div class="cm-card-head"><span class="cm-glyph">${R_INIT(cls)}</span><b>${w.name}</b><span class="cm-kills">${t('mg.cmKills', { n: kills })}</span></div><div class="mission-bar"><div class="mission-fill" style="width:${cd.pct}%"></div></div><div class="cm-pips">${pips}</div><div class="cm-tier">${t('mg.tier')} ${cd.tier}/${CAMO_TIERS.length} · ${tierRow}</div></div>`;
      }).join('');
      return `<div class="la-title">${cls}</div><div class="cm-grid">${clsCards(cls, clsHexOf(cls))}${rows}</div>`; // [T139 N7] the class card LEADS its group (the §60.4 variant — the class ladder is the group's head)
    }).join('');
  }
  // ---------- [/T91 meta-game page renderers] ----------

  // ---------- [T108 N8] page-operators renderer (the OPERATORS page) ----------
  // [T118 v2.4] the COD-2026 operators grammar (research/ops_menu_00..b_04): the roster is
  // CONTAINED BY FACTION (ops_menu_b_01: BO7 "divided between JSOC Operators and Guild
  // Operators" — the two-faction law), shown as a PORTRAIT TILE GRID (ops_menu_01/b_01:
  // "the skins' images of all Operators"), with SELECT → DETAIL (ops_menu_00 IGN: "This
  // will bring you to the customization screen"; ops_menu_b_00: the detail carries the
  // unlock + the select action). The faction TABS are the 2026 display-filter analog
  // (ops_menu_b_03, MW4 Season 1 Operator Skin toggle: display-only, equipped operator
  // unchanged, off by default — switching tabs here NEVER writes the loadout). Rarity
  // remains the TILE ACCENT (OP_RARITY hex — the T117 common-region law re-expressed:
  // faction = container, rarity = accent). Every label rides the EXISTING faces
  // (op.rar/op.equip/op.equipped/op.buy/op.note/mg.owned/ix.pgOps; sides+names+roles are
  // the untranslated-proper-noun class) — zero i18n churn, the 482,265-byte law holds.
  // Ownership = the §53.2 ∪ law shape via opOwned(career.ops ∪ eco.own ∪ free-starter).
  // Equip = THE one transform (opEquip — copy-on-write, sets op AND ability). Buy = the
  // eco channel (sendEco idiom ui.js:507 — server validates + prices via the same
  // operators.js single truth; onEco re-renders the page when the ack lands).
  renderOperators() {
    const wrap = $('ops-wrap'); if (!wrap) return;
    if (this._mugLive) { this._mugLive.dispose(); this._mugLive = null; } // [T123] the live showcase dies on every re-render (the re-entrancy law; its RAF also self-dies on canvas disconnect)
    const career = this.deps.career || {};
    const careerOps = Array.isArray(career.ops) ? career.ops : [];
    const ecoOwn = (this.eco && this.eco.own) || {};
    const equipped = this.deps.loadout.op;
    const ownedOf = (o) => opOwned(o.id, careerOps, ecoOwn);
    // the active faction: remembered per view (CoD's faction memory), defaults to the
    // equipped operator's side, else the first side; a selected tile opens the DETAIL.
    const sides = Object.keys(OP_SIDES);
    if (!this.opsSide || !sides.includes(this.opsSide)) this.opsSide = (opById(equipped) || {}).side || sides[0];
    const side = this.opsSide;
    const list = OPERATORS.filter(o => o.side === side).sort((a, b) => opRarityOrder(a.r) - opRarityOrder(b.r));
    // [T124] the VISUAL-STAGE law (the user decree, the ops_menu portrait grammar carried one
    // step further): the cards sit at the BOTTOM of the viewspace with the space above a visual
    // for the focused operator to be seen. Focus follows HOVER (display only — the 2026
    // filter law: it never writes the loadout), defaults to the equipped operator of the
    // active faction. Data faces ride the existing proper-noun + op.rar.* classes — zero i18n.
    if (!this.opsFocus || !list.some(o => o.id === this.opsFocus)) this.opsFocus = (list.find(o => o.id === equipped) || list[0] || {}).id;
    const tile = (o) => {
      const owned = ownedOf(o);
      const isOn = equipped === o.id;
      const hex = '#' + opRarityHex(o.r).toString(16).padStart(6, '0');
      return `<button class="op-tile ${isOn ? 'on' : ''}" style="--op-accent:${hex}" data-op="${o.id}"><span class="op-tile-face"><span class="op-vis"></span><span class="op-sh"></span><span class="op-init">${o.name[0]}</span><img class="op-mug" alt="" data-mug="${o.id}"></span><span class="op-tile-name">${o.name}</span><span class="op-tile-rar">${t('op.rar.' + o.r)}</span><span class="op-tile-state">${isOn ? t('op.equipped') : (owned ? t('op.equip') : t('op.buy'))}</span></button>`; // [T117] the letter tile retires — a PROCEDURAL PORTRAIT bust (rarity rim + visor glow, pure CSS) wears the face · [T123] the 3D mugshot floats over it (the same-space law — the letter stays as the CDN-fail fallback)
    };
    // the DETAIL state (CoD select→customize): the T108 card grammar enlarged — the
    // op-card/op-portrait/op-head/op-bio/op-kit/op-foot classes reused, portrait 9rem.
    const detail = (o) => {
      const ab = ABILITIES.find(a => a.id === o.ability) || {};
      const owned = ownedOf(o);
      const isOn = equipped === o.id;
      const hex = '#' + opRarityHex(o.r).toString(16).padStart(6, '0');
      return `<div class="op-card op-detail" style="--op-accent:${hex}"><div class="op-portrait"><span class="op-vis"></span><span class="op-sh"></span><span class="op-init">${o.name[0]}</span><canvas class="op-live"></canvas><span class="op-live-hint">${t('ix.emHint')}</span><span class="op-live-chips"><button class="op-live-chip" data-em="wave">${t('ix.emWave')}</button><button class="op-live-chip" data-em="nod">${t('ix.emNod')}</button></span></div><div class="op-body"><div class="op-head"><span class="op-name">${o.name}</span><span class="op-role">${o.role}</span><span class="op-rar" style="color:${hex}">${t('op.rar.' + o.r)}</span><span class="op-detail-side">${OP_SIDES[o.side] || ''}</span></div><div class="op-bio">${t('op.bio.' + o.id)}</div><div class="op-kit"><span class="ab-chip on">${ab.name || o.ability}<span class="ab-desc">${ab.desc || ''}</span></span></div><div class="op-foot">${owned ? (isOn ? `<span class="op-state on">${t('op.equipped')}</span>` : `<button class="diff-btn op-btn" data-equip="${o.id}">${t('op.equip')}</button>`) : `<span class="op-price">${o.tk ? o.tk.toLocaleString('en-US') + ' TK' : (o.price || 0).toLocaleString('en-US') + ' CR'}</span><button class="diff-btn op-btn" data-buy="${o.id}">${t('op.buy')}</button>`}</div><button class="diff-btn op-detail-back" data-opsback="1">◀ ${t('ix.pgOps')}</button></div></div>`;
    };
    // [T124] the visual stage — the portrait grammar of the tile grid, enlarged (the
    // op-portrait/op-detail idiom): initial-letter portrait + name + faction + rarity + role.
    const visual = (o) => {
      const hex = '#' + opRarityHex(o.r).toString(16).padStart(6, '0');
      return `<div class="ops-visual" style="--op-accent:${hex}"><div class="ops-visual-portrait"><span class="op-vis"></span><span class="op-sh"></span><span class="op-init">${o.name[0]}</span></div><div class="ops-visual-info"><span class="ops-visual-name">${o.name}</span><span class="ops-visual-side">${OP_SIDES[o.side] || ''}</span><span class="ops-visual-rar" style="color:${hex}">${t('op.rar.' + o.r)}</span><span class="ops-visual-role">${o.role}</span></div></div>`;
    };
    const bandMeta = $('ops-meta');
    if (bandMeta) bandMeta.textContent = `${OPERATORS.filter(ownedOf).length}/${OPERATORS.length} ${t('mg.owned')}`; // the bp-balance idiom — the band context face
    const tabs = sides.map((s) => `<button class="ops-tab ${s === side ? 'on' : ''}" data-ops-side="${s}">${OP_SIDES[s]}<span class="ops-tab-n">${OPERATORS.filter(o => o.side === s).length}</span></button>`).join('');
    wrap.innerHTML = `<div class="ops-filters">${tabs}</div>` + (this.opsSel ? detail(opById(this.opsSel) || OPERATORS[0]) : `<div class="ops-roster">${visual(opById(this.opsFocus) || list[0] || OPERATORS[0])}<div class="ops-note">${t('op.note')}</div><div class="ops-grid">${list.map(tile).join('')}</div></div>`); // [T124] the roster: visual stage above, the card grid pinned to the bottom of the viewspace
    // [T123] the mugshot fan-out — each tile fills with its 3D bust as the studio renders it (the
    // letter portrait stays until the dataURL lands; CDN-fail = the letter stays forever). The DETAIL
    // face starts the LIVE showcase — drag yaw, auto-turntable, showcase-idle, WAVE/NOD chips.
    wrap.querySelectorAll('[data-mug]').forEach(img => { const o = opById(img.dataset.mug); if (o) mugSnapshot(o.id, '#' + opRarityHex(o.r).toString(16).padStart(6, '0')).then(u => { if (u && img.isConnected) { img.src = u; img.classList.add('ok'); } }); });
    const liveCv = wrap.querySelector('.op-live');
    if (liveCv) {
      const so = opById(this.opsSel) || OPERATORS[0];
      this._mugLive = mugLive(liveCv, so.id, '#' + opRarityHex(so.r).toString(16).padStart(6, '0'));
      wrap.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { SFXtick(); this._mugLive && this._mugLive.emote(b.dataset.em); }); // the honest route: clip when the model carries it, procedural otherwise (mugshot.js stats)
    }
    wrap.querySelectorAll('[data-ops-side]').forEach(b => b.onclick = () => { this.opsSide = b.dataset.opsSide; this.opsSel = null; this.renderOperators(); }); // [T118] the 2026 filter law: tab switches DISPLAY only — zero loadout writes
    wrap.querySelectorAll('[data-op]').forEach(b => b.onclick = () => { this.opsSel = b.dataset.op; this.renderOperators(); }); // select → detail
    const vis = wrap.querySelector('.ops-visual'); // [T124] focus follows hover — the visual swaps IN PLACE (zero re-render, the tiles keep their pointer); re-queried per event so the swapped node stays live
    if (vis) wrap.querySelectorAll('[data-op]').forEach(b => b.addEventListener('mouseenter', () => { const o = opById(b.dataset.op); const v = wrap.querySelector('.ops-visual'); if (o && v) { this.opsFocus = o.id; v.outerHTML = visual(o); } }));
    wrap.querySelectorAll('[data-opsback]').forEach(b => b.onclick = () => { this.opsSel = null; this.renderOperators(); }); // detail → roster
    wrap.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => {
      const next = opEquip(this.deps.loadout, b.dataset.equip);
      if (next) { Object.assign(this.deps.loadout, next); saveLoadout(this.deps.loadout); SFXtick(); this.renderOperators(); this.refreshLoadout(); } // the kit authority law: op AND ability move together
    });
    wrap.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const o = opById(b.dataset.buy);
      if (o && o.tk > 0) { const go = () => this.confirmModal('tk.title', 'tk.skuBody', { n: o.tk.toLocaleString('en-US'), name: o.name }, () => { if (!this.ecoGate('STORE OFFLINE — token spends ride the hub; connect with an account (ONLINE tab).')) return; this.deps.sendEco({ op: 'tksku', id: o.id, tok: this.auth && this.auth.tok }); }); if (!this.needTk(o.tk, o.name + ' · OPERATOR', go)) return; go(); return; } // [T110] the token-exclusive tier rides tksku + the FTC-confirm modal (never the CR buy path) · [T135] the gate SPEAKS (the silent-shop law) · [T137] THE TOKENS UPSELL: broke opens the shelf, the resume keeps the FTC confirm on the spend path
      if (!this.ecoGate('STORE OFFLINE — operator unlocks ride the hub; connect with an account (ONLINE tab).')) return; // [T135] server-priced, server-owned — offline it says so
      const cop = opById(b.dataset.buy); const cprice = (cop && cop.price) | 0; // [T137] the CR afford pre-empt — the SAME prominent earn-speak the offline face states (CR is earned, never bought — the honest economy answers with the play path, not a dead end)
      if (((this.eco && this.eco.cr) | 0) < cprice) { this.toast('NEEDS ' + cprice.toLocaleString('en-US') + ' CR — you have ' + ((this.eco && this.eco.cr) | 0).toLocaleString('en-US') + '. Earn CR by playing: wins pay ' + ECO_EARN.base + ' base +' + ECO_EARN.kill + ' per kill +' + ECO_EARN.win + ' per win.'); return; }
      this.deps.sendEco({ op: 'buy', id: b.dataset.buy, tok: this.auth && this.auth.tok }); // the shop idiom (ui.js:507 gate inside sendEco) — server prices via operators.js
    });
  }
  // ---------- [/T108 N8 page-operators] ----------

  // ---------- v1.55 T89 L10: staged onboarding (renderOnboard drives page-onboard) ----------
  // scheme-pick-first + skip+reward laws (onboard.js single truth). The §52.2 primer cards
  // stay below as reference; the stage card + progress lead the page.
  renderOnboard() {
    const body = $('onb-stage'); if (!body) return;
    const st = onboard.onbState();
    const next = onboard.onbNext(st);
    if (!next) { this.onbFinish(); return; }
    const scheme = st.scheme || 'mouse';
    const titleKey = next.id === onboard.ONB_SCHEME_STAGE ? 'onb.s1.title' : onboard.onbSchemeWording(next, scheme, 'title');
    const bodyKey = next.id === onboard.ONB_SCHEME_STAGE ? 'onb.s1.body' : onboard.onbSchemeWording(next, scheme, 'body');
    const hintKey = next.id === onboard.ONB_SCHEME_STAGE ? 'onb.s1.hint' : onboard.onbSchemeWording(next, scheme, 'hint');
    const dots = onboard.ONB_STAGES.map(sg => `<span class="onb-dot ${onboard.onbComplete(sg.id, st) ? 'done' : ''} ${sg.id === next.id ? 'cur' : ''}"></span>`).join('');
    let stage = `<div class="onb-stage-card"><div class="onb-prog">${dots}</div><h3>${t(titleKey)}</h3><p>${t(bodyKey)}</p><p class="onb-hint">${t(hintKey)}</p>`;
    if (next.id === onboard.ONB_SCHEME_STAGE) {
      stage += `<div class="onb-schemes">${onboard.ONB_SCHEMES.map(sc => `<button class="diff-btn ${st.scheme === sc ? 'active' : ''}" data-scheme="${sc}">${t('onb.scheme.' + sc)}</button>`).join('')}</div>`;
    }
    stage += `<div class="onb-reward">${t('onb.stageReward', { cr: next.reward.cr, bp: next.reward.bp })}</div></div>`;
    body.innerHTML = stage;
    body.querySelectorAll('[data-scheme]').forEach(b => b.onclick = () => {
      const s2 = onboard.onbState(); s2.scheme = b.dataset.scheme;
      this.onbPersist(s2); this.renderOnboard(); SFXtick();
    });
  }
  onbPersist(st) { try { localStorage.setItem(onboard.ONB_LS_KEY, JSON.stringify(st)); } catch (e) {} }
  onbAdvance() { // GOT IT + SKIP share the skip+reward law: both advance AND pay
    const st = onboard.onbState();
    const next = onboard.onbNext(st);
    if (!next) { this.onbFinish(); return; }
    const res = onboard.onbClaim(next.id, st);
    this.onbPersist(res.state);
    const career = this.deps.career;
    career.cr = (career.cr || 0) + (res.reward.cr || 0);
    if (!career.bp || career.bp.s !== seasonOf(Date.now()).id) career.bp = { x: 0, s: seasonOf(Date.now()).id };
    career.bp.x += res.reward.bp || 0;
    saveCareer(career); this.buildCareerStrip();
    if (onboard.onbNext(res.state)) this.renderOnboard();
    else this.onbFinish();
  }
  onbFinish() { // §52.2 flag law: the legacy onboarded flag lands when the tutorial goes inactive
    try { localStorage.setItem('ironsight.onboarded.v1', '1'); } catch (e) {}
    this.show('page-main');
  }

  // ---------- v1.55 T89 L8: HUD editor (drag → vars → persist → restore) ----------
  static HUD_ANCHORS = ['#bl-cluster', '#ammo-wrap', '#streak-wrap', '#map-wrap', '#tc-cluster', '#killfeed', '#banners'];
  applyHudVars() {
    const vars = (this.deps.settings && this.deps.settings.hudVars) || {};
    for (const sel of UI.HUD_ANCHORS) {
      const el = document.querySelector(sel); if (!el) continue;
      el.setAttribute('data-hud-anchor', sel.slice(1));
      const v = vars[sel.slice(1)];
      el.style.transform = v ? `translate(${v.dx || 0}px, ${v.dy || 0}px)` : '';
    }
  }
  startHudEdit() { // menu-hidden preview: the HUD shows over the canvas; drag anchors; DONE persists
    if (this._he) return; // [v1.50 port T90] §55.6: the per-button editor session owns the shared edit bar — mutual exclusion
    this._hudEdit = true;
    document.body.classList.add('hud-editing');
    this.hideAll(); $('hud').classList.remove('hidden');
    const bar = $('hud-edit-bar'); if (bar) bar.classList.remove('hidden');
    this._hudDrag = null;
    this._hudDown = (e) => {
      const el = e.target.closest('[data-hud-anchor]'); if (!el) return;
      const id = el.getAttribute('data-hud-anchor');
      this._hudDrag = { id, x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    this._hudMove = (e) => {
      if (!this._hudDrag) return;
      const dx = e.clientX - this._hudDrag.x, dy = e.clientY - this._hudDrag.y;
      const el = document.querySelector(`[data-hud-anchor="${this._hudDrag.id}"]`);
      if (el) el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    this._hudUp = () => {
      if (!this._hudDrag) return;
      const el = document.querySelector(`[data-hud-anchor="${this._hudDrag.id}"]`);
      if (el) {
        const m = /translate\((-?[\d.]+)px, (-?[-\d.]+)px\)/.exec(el.style.transform);
        const s = this.deps.settings;
        s.hudVars = s.hudVars || {};
        s.hudVars[this._hudDrag.id] = { dx: m ? +m[1] : 0, dy: m ? +m[2] : 0 };
        saveSettings(s); this.deps.settingsChanged(); // persist + live-apply (T1-7 law)
      }
      this._hudDrag = null;
    };
    document.addEventListener('pointerdown', this._hudDown, true);
    document.addEventListener('pointermove', this._hudMove, true);
    document.addEventListener('pointerup', this._hudUp, true);
  }
  endHudEdit(reset = false) {
    if (this._he) { this.exitHudEdit(); return; } // [v1.50 port T90] shared edit bar: route to the §55.6 per-button session when it owns the bar
    this._hudEdit = false;
    document.body.classList.remove('hud-editing');
    const bar = $('hud-edit-bar'); if (bar) bar.classList.add('hidden');
    document.removeEventListener('pointerdown', this._hudDown, true);
    document.removeEventListener('pointermove', this._hudMove, true);
    document.removeEventListener('pointerup', this._hudUp, true);
    if (reset) { this.deps.settings.hudVars = null; saveSettings(this.deps.settings); }
    this.applyHudVars(); // restore law: vars re-apply from the store (or clear on reset)
    this.show('page-settings'); this.renderSettingsTab('mobile');
  }

  // ---------- v1.55 T89 L9: MOBILE settings tab (touch tuning + HUD editor entry) ----------
  renderMobileTab() {
    const body = $('set-body'); const s = this.deps.settings;
    const seasonOfId = () => seasonOf(Date.now()).id; // T89 season-key helper (BP reset law — same single truth as main.js)
    const row = (label, ctrlHTML, note = '') => {
      const d = document.createElement('div'); d.className = 'set-row';
      d.innerHTML = `<span class="set-label">${label}</span>${ctrlHTML}`;
      if (note) d.innerHTML += `<span class="set-note" style="flex-basis:100%">${note}</span>`;
      body.appendChild(d); return d;
    };
    const slider = (key, min, max, step, fmt = v => v) =>
      `<input type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}" data-key="${key}"><span class="set-val" data-val="${key}">${fmt(s[key])}</span>`;
    const bindSlider = (d, key, fmt) => {
      const inp = d.querySelector('input');
      inp.oninput = () => { s[key] = +inp.value; d.querySelector(`[data-val="${key}"]`).textContent = fmt(+inp.value); applyInputSettings(s); this.deps.settingsChanged(); SFXtick(); };
    };
    const seg = (key, opts, cur) => `<span class="seg-group">${opts.map(o => `<button class="seg-btn ${o === cur ? 'on' : ''}" data-seg="${key}" data-v="${o}">${o}</button>`).join('')}</span>`;
    const bindToggle = (d, key) => d.querySelectorAll(`[data-seg="${key}"]`).forEach(b => b.onclick = () => {
      s[key] = b.dataset.v === 'ON'; d.querySelectorAll(`[data-seg="${key}"]`).forEach(x => x.classList.toggle('on', x === b)); this.deps.settingsChanged(); SFXtick();
    });
    const m1 = row(t('s.touchSens'), slider('touchSens', 0.4, 2.5, 0.05, v => (+v).toFixed(2)), t('s.touchSensDesc')); bindSlider(m1, 'touchSens', v => (+v).toFixed(2));
    const m2 = row(t('s.touchHaptics'), seg('touchHaptics', ['ON', 'OFF'], s.touchHaptics === false ? 'OFF' : 'ON'), t('s.touchHapticsDesc')); bindToggle(m2, 'touchHaptics');
    const m3 = row(t('s.touchStickDead'), slider('touchStickDead', 0, 0.3, 0.01, v => (+v).toFixed(2)), t('s.touchStickDeadDesc')); bindSlider(m3, 'touchStickDead', v => (+v).toFixed(2));
    const m4 = row(t('s.touchLookDead'), slider('touchLookDead', 0, 12, 1, v => v + ' px'), t('s.touchLookDeadDesc')); bindSlider(m4, 'touchLookDead', v => v + ' px');
    const m5 = row(t('s.touchHybridDrag'), slider('touchHybridDrag', 0, 40, 2, v => v + ' px'), t('s.touchHybridDragDesc')); bindSlider(m5, 'touchHybridDrag', v => v + ' px');
    // ---- [T90 merge] M8-beyond-buttons (v1.56 dead-session wave) — same row/slider/seg/binding grammar as the Task-89 rows above ----
    const m6 = row(t('s.gyroAim'), seg('gyroAim', ['ON', 'OFF'], s.gyroAim ? 'ON' : 'OFF'), t('s.gyroAimDesc')); // M8a: gyro aim — iOS motion permission must be requested from THIS click gesture
    const g6seg = m6.querySelectorAll('[data-seg="gyroAim"]');
    const g6off = (msg) => { s.gyroAim = false; g6seg.forEach(x => x.classList.toggle('on', x.dataset.v === 'OFF')); if (msg) { const n = m6.querySelector('.set-note'); if (n) n.textContent = msg; } applyInputSettings(s); this.deps.settingsChanged(); SFXtick(); };
    const g6on = () => { s.gyroAim = true; g6seg.forEach(x => x.classList.toggle('on', x.dataset.v === 'ON')); applyInputSettings(s); this.deps.settingsChanged(); SFXtick(); };
    g6seg.forEach(b => b.onclick = () => {
      try {
        if (b.dataset.v !== 'ON') { g6off(); return; }
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          // iOS 13+ law: requestPermission only resolves from a user gesture (this click). Reject → toggle back OFF + inline note.
          DeviceOrientationEvent.requestPermission().then(r => (r === 'granted' ? g6on() : g6off(t('s.gyroDeny')))).catch(() => g6off(t('s.gyroDeny')));
        } else g6on(); // Android/desktop: no permission gate — events simply flow (listener attach is input.js _applyGyro)
      } catch { g6off(t('s.gyroDeny')); }
    });
    const m7 = row(t('s.gyroSens'), slider('gyroSens', 0.2, 3.0, 0.05, v => (+v).toFixed(2)), t('s.gyroSensDesc')); bindSlider(m7, 'gyroSens', v => (+v).toFixed(2)); // M8a: 1.0 ≈ 0.33°/° — 3.0 ≈ 1:1 (CFG.GYRO.sensBase note)
    const m8 = row(t('s.aimCurve'), seg('aimCurve', ['LINEAR', 'CLASSIC'], s.aimCurve === 'linear' ? 'LINEAR' : 'CLASSIC'), t('s.aimCurveDesc')); // M8b: label≠value law (§48.7) — lowercase ids stored
    m8.querySelectorAll('[data-seg="aimCurve"]').forEach(b => b.onclick = () => {
      s.aimCurve = b.dataset.v.toLowerCase();
      m8.querySelectorAll('[data-seg="aimCurve"]').forEach(x => x.classList.toggle('on', x === b));
      applyInputSettings(s); this.deps.settingsChanged(); SFXtick();
    });
    const m9 = row(t('s.touchLayout'), seg('touchLayout', ['DEFAULT', 'LEFTY', 'COMPACT'], (s.touchLayout || 'default').toUpperCase()), t('s.touchLayoutDesc')); // M8c: preset — CSS-only data-layout transform of the existing touch surface
    m9.querySelectorAll('[data-seg="touchLayout"]').forEach(b => b.onclick = () => {
      s.touchLayout = b.dataset.v.toLowerCase();
      m9.querySelectorAll('[data-seg="touchLayout"]').forEach(x => x.classList.toggle('on', x === b));
      applyInputSettings(s); this.deps.settingsChanged(); SFXtick(); // applyInputSettings sets #touch-ui[data-layout] (init + live)
    });
    const he = document.createElement('div'); he.className = 'set-row';
    he.innerHTML = `<span class="set-label">${t('s.hudEditor')}</span><button class="diff-btn" id="btn-hud-edit">${t('s.hudEditOpen')}</button><span class="set-note" style="flex-basis:100%">${t('s.hudEditDesc')}</span>`;
    body.appendChild(he);
    const hb = he.querySelector('#btn-hud-edit'); if (hb) hb.onclick = () => this.startHudEdit();
    // ---- [v1.50 port T90] §55.6 V7 (v1.47): HUD layout editor — m_04 CODM verbatim feature set
    // (per-button scale/opacity/reposition + presets over the 11 .tbtn touch buttons). The write
    // path lands here; input.js T90 already re-lands the saved-vars apply at bind time; the CSS
    // vars consumer (.tbtn translate/scale/opacity via --mx/--my/--ms/--mo) is a filed cross-module
    // need for style.css. i18n: v1.50 ix.hud* keys ride the §60.2 L() idiom (current i18n lacks
    // them yet — EN fallbacks embedded from the v1.50 dictionary).
    const TB = ['btn-fire-r', 'btn-fire-l', 'btn-ads', 'btn-jump', 'btn-crouch', 'btn-reload', 'btn-swap', 'btn-nade', 'btn-melee', 'btn-ability', 'btn-pause-t'];
    const tu = s.touchUI = s.touchUI || { v: 1, btns: {} };
    const rec = (id) => tu.btns[id] = tu.btns[id] || { s: 1, o: 1, x: 0, y: 0 };
    const applyBtnId = (id) => {
      const el = document.getElementById(id); const r = rec(id);
      if (el) { el.style.setProperty('--ms', r.s); el.style.setProperty('--mo', r.o); el.style.setProperty('--mx', r.x + 'px'); el.style.setProperty('--my', r.y + 'px'); }
    };
    const btnSel = `<select id="he-btn" style="pointer-events:auto;background:#141a22;color:var(--ink);border:1px solid var(--ink-faint);padding:.25rem .4rem;font-family:inherit">${TB.map(id => `<option value="${id}">${id.replace('btn-', '').toUpperCase()}</option>`).join('')}</select>`;
    const db = row(L(t, 'ix.hudBtn', 'BUTTON'), btnSel);
    const dS = row(L(t, 'ix.hudScale', 'SCALE'), `<input type="range" id="he-s" min="0.6" max="1.6" step="0.05"><span class="set-val" id="he-sv"></span>`);
    const dO = row(L(t, 'ix.hudOpacity', 'OPACITY'), `<input type="range" id="he-o" min="0.3" max="1" step="0.05"><span class="set-val" id="he-ov"></span>`);
    const PLBL = { DEFAULT: 'DEFAULT', COMPACT: 'COMPACT', BOLD: 'BOLD' };
    const pr = row(L(t, 'ix.hudPresets', 'PRESETS'), `<span class="seg-group">${['DEFAULT', 'COMPACT', 'BOLD'].map(p => `<button class="seg-btn" data-preset="${p}">${L(t, 'ix.hudP' + p.charAt(0) + p.slice(1).toLowerCase(), PLBL[p])}</button>`).join('')}</span>`);
    const ed = row(L(t, 'ix.hudEdit', 'EDIT LAYOUT'), `<button class="seg-btn" id="btn-he-open">${L(t, 'ix.hudEdit', 'EDIT LAYOUT')}</button>`, L(t, 'ix.hudHint', 'Hold a button 0.35s, then drag to move it. Persists automatically.'));
    [db, dS, dO, pr, ed].forEach(d => body.appendChild(d));
    const cur = () => rec(db.querySelector('#he-btn').value);
    const syncSliders = () => {
      const r = cur();
      dS.querySelector('#he-s').value = r.s; dS.querySelector('#he-sv').textContent = (+r.s).toFixed(2);
      dO.querySelector('#he-o').value = r.o; dO.querySelector('#he-ov').textContent = (+r.o).toFixed(2);
    };
    db.querySelector('#he-btn').onchange = () => { syncSliders(); applyBtnId(db.querySelector('#he-btn').value); };
    dS.querySelector('#he-s').oninput = () => { const r = cur(); r.s = +dS.querySelector('#he-s').value; dS.querySelector('#he-sv').textContent = r.s.toFixed(2); applyBtnId(db.querySelector('#he-btn').value); this.deps.settingsChanged(); };
    dO.querySelector('#he-o').oninput = () => { const r = cur(); r.o = +dO.querySelector('#he-o').value; dO.querySelector('#he-ov').textContent = r.o.toFixed(2); applyBtnId(db.querySelector('#he-btn').value); this.deps.settingsChanged(); };
    pr.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
      const P = { DEFAULT: { s: 1, o: 1 }, COMPACT: { s: 0.8, o: 0.85 }, BOLD: { s: 1.15, o: 1 } }[b.dataset.preset];
      TB.forEach(id => { const r = rec(id); r.s = P.s; r.o = P.o; if (b.dataset.preset === 'DEFAULT') { r.x = 0; r.y = 0; } applyBtnId(id); });
      syncSliders(); this.deps.settingsChanged(); SFXtick();
    });
    ed.querySelector('#btn-he-open').onclick = () => this.enterHudEdit();
    TB.forEach(applyBtnId); // [v1.50 port T90] restore saved vars live (preview + persistence law)
    syncSliders();
    // ---- [v1.50 port T90] §60.2 (v1.48) mobile playability rows with live consumers —
    // touchAssist (main.js magnetism-cone gate = filed cross-module need) + fireAuto (the
    // Input.autoFireOn consumer is re-landed by the input.js T90 port; the main.js writer =
    // filed need). touchAdsSens/fpsCap rows WITHHELD: zero consumers in the current tree
    // (honest-gap law) — filed with the coordinator instead of shipping dead controls.
    const mA = row(L(t, 's.touchAssist', 'AIM ASSIST (TOUCH)'), seg('touchAssist', ['ON', 'OFF'], s.touchAssist !== false ? 'ON' : 'OFF'), L(t, 's.touchAssistDesc', 'rotational friction inside the near-target cone — CODM-style thumb tracking help')); bindToggle(mA, 'touchAssist');
    const mF = row(L(t, 's.fireAuto', 'AUTO-FIRE ON TARGET'), seg('fireAuto', ['ON', 'OFF'], !!s.fireAuto ? 'ON' : 'OFF'), L(t, 's.fireAutoDesc', 'fires automatically while your crosshair rests on an enemy (touch)')); bindToggle(mF, 'fireAuto');
  }

  // ---- [v1.50 port T90] §55.6 (v1.47) — HUD edit session (m_04 CODM verbatim: reposition). Menu hides,
  // touch-ui force-shows on ANY device; 350ms hold arms a drag, then move writes
  // --mx/--my into settings.touchUI.btns[id] (clamped ±35% viewport, spec §55.6).
  // Short taps never move a button; input.js ignores game bindings while editing
  // (editGate re-landed by the input.js T90 port).
  static HE_BTNS = ['btn-fire-r', 'btn-fire-l', 'btn-ads', 'btn-jump', 'btn-crouch', 'btn-reload', 'btn-swap', 'btn-nade', 'btn-melee', 'btn-ability', 'btn-pause-t'];
  enterHudEdit() {
    if (this._he || this._hudEdit) return; // [v1.50 port T90] + mutual exclusion with the T89 anchor editor (shared edit bar)
    this._he = { prev: this._curPage || 'page-settings' };
    document.body.classList.add('hud-editing');
    $('menu-root').classList.add('hidden');
    $('touch-ui').classList.remove('hidden');
    $('hud-edit-bar').classList.remove('hidden');
    const s = this.deps.settings;
    const tu = s.touchUI = s.touchUI || { v: 1, btns: {} };
    this._he.cleanup = [];
    UI.HE_BTNS.forEach((id) => {
      const el = document.getElementById(id); if (!el) return; // [v1.50 port T90] tbtn DOM re-lands with index.html (input.js T90 null-guard law)
      const rec = tu.btns[id] = tu.btns[id] || { s: 1, o: 1, x: 0, y: 0 };
      el.style.setProperty('--ms', rec.s); el.style.setProperty('--mo', rec.o);
      el.style.setProperty('--mx', rec.x + 'px'); el.style.setProperty('--my', rec.y + 'px');
      let t0 = 0, armed = false, sx = 0, sy = 0, ox = 0, oy = 0;
      const down = (e) => {
        e.preventDefault(); e.stopPropagation();
        t0 = performance.now(); armed = false; drag = false;
        sx = e.clientX; sy = e.clientY; ox = rec.x; oy = rec.y;
        document.querySelectorAll('.tbtn.sel').forEach(x => x.classList.remove('sel'));
      };
      let drag = false;
      const move = (e) => {
        if (!t0 || e.buttons === 0 && e.pointerType === 'mouse') return;
        if (!armed && performance.now() - t0 >= 350) { armed = true; drag = true; el.classList.add('sel'); const ht = $('he-target'); if (ht) ht.textContent = id.replace('btn-', '').toUpperCase(); } // [v1.50 port T90] he-target read guarded — mount re-lands with index.html
        if (!drag) return;
        const cx = Math.max(-innerWidth * 0.35, Math.min(innerWidth * 0.35, ox + (e.clientX - sx)));
        const cy = Math.max(-innerHeight * 0.35, Math.min(innerHeight * 0.35, oy + (e.clientY - sy)));
        rec.x = Math.round(cx); rec.y = Math.round(cy);
        el.style.setProperty('--mx', rec.x + 'px'); el.style.setProperty('--my', rec.y + 'px');
        e.preventDefault(); e.stopPropagation();
      };
      const up = () => { if (drag) this.deps.settingsChanged(); t0 = 0; armed = false; drag = false; };
      el.addEventListener('pointerdown', down, { capture: true });
      el.addEventListener('pointermove', move, { capture: true });
      el.addEventListener('pointerup', up, { capture: true });
      el.addEventListener('pointercancel', up, { capture: true });
      this._he.cleanup.push(() => { el.removeEventListener('pointerdown', down, { capture: true }); el.removeEventListener('pointermove', move, { capture: true }); el.removeEventListener('pointerup', up, { capture: true }); el.removeEventListener('pointercancel', up, { capture: true }); el.classList.remove('sel'); });
    });
    const bd = $('btn-he-done'); if (bd) bd.onclick = () => this.exitHudEdit(); // [v1.50 port T90] guarded — #btn-he-done re-lands with index.html
  }
  exitHudEdit() {
    if (!this._he) return;
    (this._he.cleanup || []).forEach(f => f());
    document.body.classList.remove('hud-editing');
    $('hud-edit-bar').classList.add('hidden');
    $('touch-ui').classList.add('hidden');
    const prev = this._he.prev;
    this._he = null;
    this.deps.settingsChanged(); // persistence law — drag edits survive reload
    this.show(prev); // back to the settings page (stack keeps its position)
  }

  renderCareer() {
    const career = this.deps.career;
    const card = (h, body) => `<div class="cr-card"><h3>${h}</h3>${body}</div>`;
    let id = '';
    if (this.mpProfile) { // T44 §28.4 identity corner — server truth
      const p = this.mpProfile;
      const cur = Math.max(0, p.xp - xpForLevel(p.lvl));
      const span = Math.max(1, xpForLevel(p.lvl + 1) - xpForLevel(p.lvl));
      const pct = Math.min(100, Math.round((cur / span) * 100));
      id += `<div class="cr-row">${t('m.level')} <b>${p.lvl}</b></div><div class="lvl-bar" title="${cur} / ${span} XP"><i style="width:${pct}%"></i></div><div class="lvl-xp">${cur} / ${span} XP</div>`;
      if (p.pr) id += `<div class="cr-row">${t('cr.prestige')} <b>${p.pr}</b></div>`; // [G-9] the lifetime prestige marker (the corner's own cr-row anatomy)
      if (p.lvl >= MAX_LVL) id += `<div class="cr-row"><button class="diff-btn" id="btn-prestige">${this._prArm ? t('cr.prSure') : t('cr.prGo')}</button></div>`; // [G-9] at-gate: the two-step arm (the clan-leave idiom — the destructive op never fires on the first click)
      else id += `<div class="cr-row" style="opacity:.6">${t('cr.prAt', { n: MAX_LVL })}</div>`; // [G-9] below-gate: the S-1 law — the face STATES its gate instead of hiding the loop
      const bp = bpOf(p.xp); // §62.5b (v1.54): BP mirror — same XP single truth as the level row above (zero new state)
      id += `<div class="cr-row">${t('m.bp')} <b>${bp.tier} / ${BP.tiers}</b></div><div class="lvl-bar" title="${bp.into} / ${BP.per} BP XP"><i style="width:${bp.pct}%"></i></div><div class="lvl-xp">${bp.need ? bp.need + ' XP → ' + t('m.bpNext') : t('m.bpMax')}</div>`;
    }
    if (this.mpRanked) { // T46 §30.6 ranked corner — server truth
      const r = this.mpRanked;
      const curT = RP_TIERS.filter(x => x.min <= r.rp).pop();
      const nextT = RP_TIERS.find(x => x.min > r.rp);
      const pct = nextT ? Math.min(100, Math.round(((r.rp - curT.min) / (nextT.min - curT.min)) * 100)) : 100;
      id += `<div class="cr-row">${t('m.rank')} <b>${tierOf(r.rp)} · ${r.rp} RP · S${r.s}</b></div><div class="lvl-bar"><i style="width:${pct}%"></i></div>`;
    }
    if (this.auth) id += `<div class="cr-row">ACCOUNT <b>${this.auth.name}</b></div><div class="cr-row">CR <b>${(this.eco && this.eco.cr) || 0}</b></div>`;
    // deterministic daily card (§52.5: same day = same challenge; progress from career.daily)
    const today = new Date().toISOString().slice(0, 10);
    const chl = dailyFor(today);
    const dstate = career.daily && career.daily.d === today ? career.daily : { p: 0, done: false };
    const dPct = dstate.done ? 100 : (chl.metric === 'acc40' ? Math.min(100, Math.round((career.acc || 0) / 40 * 100)) : Math.min(100, Math.round(((dstate.p || 0) / chl.n) * 100)));
    const dProg = dstate.done ? t('cr.done') : (chl.metric === 'acc40' ? `${(career.acc || 0)}% / 40%` : `${Math.min(dstate.p || 0, chl.n)} / ${chl.n}`);
    const daily = `<div class="cr-row">${chl.label}</div><div class="lvl-bar"><i style="width:${dPct}%"></i></div><div class="lvl-xp">${dProg}</div>`;
    const tile = (lab, v) => `<div class="stat-tile"><div class="st-big">${v}</div><div class="st-lab">${lab}</div></div>`; // [T117] the form reads as STAT TILES — the big-number card grammar, not stacked text rows
    const form =
      `<div class="stat-tiles">` +
      tile(t('m.matches'), career.matches || 0) +
      tile(t('m.wins'), career.wins || 0) +
      tile(t('m.elims'), career.kills || 0) +
      tile(t('m.kd'), career.kd || '—') +
      tile(t('m.acc'), (career.acc || 0) + '%') +
      tile(t('m.bestStreak'), career.bestStreak || 0) +
      `</div>`;
    $('career-page-body').innerHTML =
      card(t('cr.identity'), id || `<div class="cr-row">${t('cr.anon')}</div>`) +
      card(t('cr.daily'), daily) +
      card(t('cr.form'), form);
    const pb = $('btn-prestige'); if (pb) pb.onclick = () => { // [G-9] the two-step prestige arm (the clan-leave idiom) — the sendEco idiom carries the account tok; the server owns every gate
      if (!this._prArm) { this._prArm = true; this.renderCareer(); return; }
      this._prArm = false; this.deps.sendEco({ op: 'prestige', tok: this.auth && this.auth.tok });
    };
    const hEl = document.createElement('div'); hEl.className = 'cr-card';
    const h3 = document.createElement('h3'); h3.textContent = t('cr.history'); hEl.appendChild(h3);
    const hBody = document.createElement('div'); hEl.appendChild(hBody);
    $('career-page-body').appendChild(hEl);
    // --- v1.55 T89 L6: BP progress panel + ranked season rewards (single-truth reads) ---
    const bpEl = document.createElement('div'); bpEl.className = 'career-bp';
    const cbp = this.deps.career && this.deps.career.bp;
    if (cbp && typeof cbp.x === 'number') {
      const bp = bpOf(cbp.x);
      bpEl.innerHTML = `<div class="cr-row">${t('m.bp')} <b>${bp.tier} / ${BP.tiers}</b> · ${t('m.bpInto', { pct: bp.pct })}</div><div class="bp-bar"><div class="bp-fill" style="width:${bp.pct}%"></div></div><div class="cr-row" style="opacity:.7">${t('m.bpSeason', { s: cbp.s })}</div>`;
    } else bpEl.innerHTML = `<div class="cr-row" style="opacity:.6">${t('m.bpOffline')}</div>`;
    $('career-page-body').appendChild(bpEl);
    const rw = document.createElement('div'); rw.className = 'career-rewards';
    const wk = isoWeekOf(new Date().toISOString().slice(0, 10));
    rw.innerHTML = `<div class="la-title" style="margin-top:12px">${t('m.seasonRewards')} — ${t('m.seasonWeek', { w: wk.id })}</div><table class="res-table" style="width:100%">${RP_TIERS.map(tr => `<tr><td>${tr.n}</td><td style="text-align:right">${RANK_REWARDS[tr.n]} CR</td></tr>`).join('')}</div>`;
    $('career-page-body').appendChild(rw);
    const ac = document.createElement('div'); ac.className = 'cr-card'; ac.style.marginTop = '12px'; // [T115 G-5] the achievements surface — deterministic grid from the SAME pure truth
    const acList = achProgress(career);
    const acDone = acList.filter(a => a.done).length;
    ac.innerHTML = `<h3>${t('ach.title')} · ${t('ach.count', { n: acDone, m: acList.length })}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px">${acList.map(a => `<div class="ach-card${a.done ? ' done' : ''}" style="border:1px solid ${ACH_TIER_HEX[a.tier]}${a.done ? '' : '55'};border-radius:6px;padding:8px;background:${a.done ? ACH_TIER_HEX[a.tier] + '14' : 'transparent'}"><div style="display:flex;justify-content:space-between;gap:6px"><b style="font-size:12px">${t('ach.' + a.id + '.n')}</b><span style="color:${ACH_TIER_HEX[a.tier]};font-size:10px">${a.tier}</span></div><div style="opacity:.75;font-size:11px;margin-top:4px">${a.done ? t('ach.' + a.id + '.d') : t('ach.locked') + ' · ' + a.cur + ' / ' + a.goal}</div></div>`).join('')}</div>`;
    $('career-page-body').appendChild(ac);
    const stl = document.createElement('div'); stl.className = 'cr-card'; stl.style.marginTop = '12px'; // [T116 G-6] the login-streak board — the SAME pure truth (inline layout, zero CSS churn)
    const sv = streakView(career);
    stl.innerHTML = `<h3>${t('st.title')} · ${t('st.count', { n: sv.count })} · ${t('st.best')} ${sv.best}</h3><div style="opacity:.7;font-size:11px;margin-bottom:8px">${t('st.sub')}</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">${sv.board.map((b) => `<div title="${b.state === 'past' ? t('st.claimed') : b.state === 'next' ? t('st.next') : ''}" style="border:1px solid ${b.state === 'today' ? '#29d3ff' : b.state === 'past' ? '#3fa74f66' : '#ffffff22'};border-radius:6px;padding:6px 4px;text-align:center;background:${b.state === 'today' ? '#29d3ff14' : 'transparent'};opacity:${b.state === 'next' ? '.55' : '1'}"><div style="font-size:10px;letter-spacing:.08em;${b.state === 'today' ? 'color:#29d3ff' : ''}">${t('st.chip', { n: b.d })}</div><div style="font-size:11px;margin-top:3px">+${b.cr} CR</div>${b.state === 'past' ? `<div style="font-size:9px;color:#3fa74f;margin-top:2px">${t('st.claimed')}</div>` : ''}</div>`).join('')}</div>`;
    $('career-page-body').appendChild(stl);
    histList(5).then((rows) => { // newest-5 teaser; full list stays on page-history
      hBody.textContent = '';
      if (!rows || !rows.length) { hBody.innerHTML = `<div class="cr-row">${t('cr.nohist')}</div>`; return; }
      for (const r of rows) {
        const d = document.createElement('div'); d.className = 'cr-row';
        d.textContent = `${new Date(r.t).toLocaleDateString()} · ${(r.mode || '').toUpperCase()} · ${r.win ? 'WIN' : 'LOSS'} · ${r.score || 0} pts`;
        hBody.appendChild(d);
      }
    }).catch(() => { hBody.textContent = t('cr.nohist'); });
  }

  // T44 §28.4: server-truth MP profile → identity corner re-render (called from onJoined)
  setMpProfile(p) {
    if (!p || typeof p.xp !== 'number') return;
    this.mpProfile = p;
    this.buildCareerStrip();
  }

  // T46 §30.6: server-truth ranked view → identity corner RANK row (mirror of setMpProfile)
  setMpRanked(p) {
    if (!p || typeof p.rp !== 'number' || typeof p.s !== 'number') return;
    this.mpRanked = { s: p.s, rp: p.rp, pk: p.pk || 0, m: p.m || 0, w: p.w || 0 };
    this.buildCareerStrip();
  }

  // T44 §28.4: per-socket career award at match end → results XP line.
  // Server emits career AFTER the match end event (socket.io per-socket order), so this
  // appends to an already-rendered res-xp row; next match's showResults rebuilds it fresh.
  careerAward(d) {
    if (!d || typeof d.gained !== 'number' || !d.lvl) return;
    const el = $('res-xp');
    if (!el || el.closest('.hidden')) return; // results not up (e.g. award raced a dismiss) — profile refresh still lands via next joined
    const up = d.up ? ` <b class="lvl-up">${t('m.levelUp')}</b>` : '';
    el.insertAdjacentHTML('beforeend', `<span class="res-award">${t('m.xpTotal', { gained: d.gained, total: d.total, lvl: d.lvl })}${up}</span>`);
    if (typeof d.total === 'number') this.setMpProfile({ xp: d.total, lvl: d.lvl, m: d.m, k: d.k, d: d.d, w: d.w }); // identity corner catches up
    if (typeof d.crG === 'number') el.insertAdjacentHTML('beforeend', `<span class="res-award">CR <b>+${d.crG}</b> · ${d.cr}</span>`); // §53.2: CR earned line (results)
    const bpPrev = bpOf(d.total - d.gained), bpNow = bpOf(d.total); // §62.5b (v1.54): BP tier-up derivation — same award event, zero new state
    if (bpNow.tier > bpPrev.tier) el.insertAdjacentHTML('beforeend', `<span class="res-award">${t('m.bp')} <b>▲ ${bpNow.tier}</b> / ${BP.tiers}</span>`);
  }

  // T46 §30.6: per-socket ranked award at match end → results RP line (mirror of careerAward).
  // Server emits ranked AFTER career in the same loop iteration (§30.5), so this appends
  // beside the XP span; non-ranked matches never emit (zero bytes — §30.5).
  rankedAward(d) {
    if (!d || typeof d.rp !== 'number' || !d.tier || typeof d.delta !== 'number') return;
    const el = $('res-xp');
    if (!el || el.closest('.hidden')) return; // results not up — corner catch-up still lands
    const up = d.up ? ' <b class="lvl-up">▲ ' + d.tier + '</b>' : '';
    el.insertAdjacentHTML('beforeend', `<span class="res-award">RP <b>${d.delta > 0 ? '+' : ''}${d.delta}</b> · ${d.tier} <b>${d.rp}</b> · S${d.s}${up}</span>`);
    this.setMpRanked({ s: d.s, rp: d.rp, pk: d.pk, m: d.m, w: d.w }); // identity corner catches up
  }
  refreshCareer() { this.buildCareerStrip(); }

  // ---------- loadout ----------
  buildLoadout() {
    const list = $('lw-list');
    list.innerHTML = '';
    let lastCls = null; // [T124] the researched class-grouping law (research/pgx_02+03 — the gunsmith list reads weapon classes; the T117 common-region containers + the renderCamos idiom): cls is config single-truth data surfaced raw, zero i18n churn
    for (const w of WEAPONS) {
      if (w.cls !== lastCls) {
        lastCls = w.cls;
        const h = document.createElement('div');
        h.className = 'la-title';
        h.textContent = w.cls;
        list.appendChild(h);
      }
      const b = document.createElement('button');
      b.className = 'lw-item' + (w.id === this.deps.loadout.weapon || w.id === this.deps.loadout.secondary ? ' sel' : '');
      b.textContent = w.name;
      b.dataset.id = w.id;
      b.onclick = () => this.selectWeapon(w); // [v1.50 port T90] §60.2 M18: rows AND chips share THE one selection path
      list.appendChild(b);
    }
    this._renderSlotChips(); // [v1.50 port T90] §60.2 M18: compact slot chips (additive surface above the rows; no-op until #lw-chips re-lands)
    // abilities — [T108 N8] the kit authority law: an equipped operator IS the ability slot
    // (op.ability); the legacy free picker renders ONLY when op is null (pre-N8 saves byte-identical)
    const ap = $('ability-pick'); ap.innerHTML = '';
    const equippedOp = this.deps.loadout.op ? opById(this.deps.loadout.op) : null;
    if (equippedOp) {
      const kab = ABILITIES.find(a => a.id === equippedOp.ability) || {};
      const b = document.createElement('button');
      b.className = 'ab-chip on';
      b.innerHTML = `${equippedOp.name} · ${kab.name || equippedOp.ability}<span class="ab-desc">${kab.desc || ''}</span>`;
      b.onclick = () => { this.renderOperators(); this.show('page-operators'); }; // the kit note points to the roster
      ap.appendChild(b);
      const note = document.createElement('div');
      note.style.cssText = 'font-size:.66rem;color:var(--ink-faint);letter-spacing:.08em;margin-top:.4rem';
      note.textContent = t('op.kitNote');
      ap.appendChild(note);
    } else {
      for (const a of ABILITIES) {
        const b = document.createElement('button');
        b.className = 'ab-chip' + (this.deps.loadout.ability === a.id ? ' on' : '');
        b.innerHTML = `${a.name}<span class="ab-desc">${a.desc}</span>`;
        b.onclick = () => { this.deps.loadout.ability = a.id; saveLoadout(this.deps.loadout); SFXtick(); this.buildLoadout(); this.refreshLoadout(); }; // [T120 a] the picker REBUILDS — the .on marker moves (the stale-marker defect read as "can't select")
        ap.appendChild(b);
      }
    }
    // nades
    const np = $('nade-pick'); np.innerHTML = '';
    for (const [id, name, desc] of [['frag', t('m.frag'), t('m.fragDesc')], ['flash', t('m.flash'), t('m.flashDesc')]]) {
      const b = document.createElement('button');
      b.className = 'ab-chip' + (this.deps.loadout.nade === id ? ' on' : '');
      b.innerHTML = `${name}<span class="ab-desc">${desc}</span>`;
      b.onclick = () => { this.deps.loadout.nade = id; saveLoadout(this.deps.loadout); SFXtick(); this.buildLoadout(); this.refreshLoadout(); }; // [T120 a] same rebuild law as the ability row
      np.appendChild(b);
    }
    this._renderSlots(); // [T120 d] the 1-10 slot selector rides the picker build
  }
  refreshLoadout() {
    const sel = this.deps.loadout.weapon;
    const w = WEAPONS.find(x => x.id === sel);
    const mw = makeWeapon(sel, this.deps.loadout.attachments[sel] || []); // [T120 b] the display reads the ATTACHMENT-MODIFIED def (makeWeapon clones — the roster stays untouched)
    const attachFx = (this.deps.loadout.attachments[sel] || []).map(id => ATTACHMENTS[id] && ATTACHMENTS[id].pros).filter(Boolean); // [T120 b] the equipped-effects line (localized pros strings)
    const careerNow = this.deps.career || {}; // [T90 merge] hoisted: the camo mastery card (lw-stats) and the fin-pick loop share the career read
    const bnSet = metagame.bundleOwnedItems(this.deps.career && this.deps.career.bn); // [T93] bundle-derived half of the ∪ law — window markers invert via bundleOwnedItems
    const cosOwned = (this.deps.career && this.deps.career.cosOwned && typeof this.deps.career.cosOwned === 'object') ? this.deps.career.cosOwned : {}; // [T93] claimed-cosmetics leg (BP free-track charms land here)
    const ecoOwned = (id) => !!(this.eco && this.eco.own && this.eco.own[id] > 0) || bnSet.has(id) || !!cosOwned[id]; // §53.2 ∪ law COMPLETE (T93): server inventory ∪ bundle-derived ∪ claimed — one read feeds EVERY picker (finish/charm/trail/emote)
    $('lw-name').textContent = `${w.name} — ${w.cls}`;
    // stat bars from real config values
    const rows = [
      [t('m.damage'), w.stats.damage], [t('m.fireRate'), w.stats.rate], [t('m.range'), w.stats.range],
      [t('m.accuracy'), w.stats.accuracy], [t('m.mobility'), w.stats.mobility],
      [t('m.adsStat'), Math.max(4, 100 - mw.def.ads * 220)], [t('m.mag'), Math.min(100, mw.def.mag)], // [T120 b] ADS/MAG read the attachment-modified def (the rows attachments actually move)
    ];
    $('lw-stats').innerHTML = rows.map(([n, v]) =>
      `<div class="stat-row"><span class="st-name">${n}</span><div class="st-bar"><div class="st-fill" style="transform:scaleX(${(v / 100).toFixed(2)})"></div></div><span class="st-val">${Math.round(v)}</span></div>`).join('') +
      `<div class="set-note">TTK ${(this.ttk(w) * 1000).toFixed(0)}ms @100HP · HS×${w.hs} · ${w.rpm} RPM</div>` +
      (attachFx.length ? `<div class="set-note" style="color:var(--acc2)">▲ ${attachFx.join(' · ')}</div>` : '') + // [T120 b] the attachment effects surface (the "nothing changes" read)
      (() => { // [T90 merge] T90-c (v1.56): camo mastery card — per-weapon kill ladder (100/250/500/1000 validated-keep law, chat L6333)
        const cd = camoCardData(w.name, careerNow.weaponKills);
        const nxt = cd.next != null ? ` · ${t('m.camoNext', { label: (CAMO_TIERS[Math.min(cd.tier, CAMO_TIERS.length - 1)] || {}).label || '', n: cd.next })} (${cd.pct}%)` : ` · ${t('m.camoMax')}`;
        return `<div class="set-note">${t('m.camoTitle')} (${t('m.camoPerWeapon')}) · ${cd.tierLabel} — ${cd.kills} ${t('m.camoKills')}${nxt}</div>`;
      })();
    // attachments
    const slots = $('la-slots'); slots.innerHTML = '';
    const cur = this.deps.loadout.attachments[sel] || [];
    for (const [id, a] of Object.entries(ATTACHMENTS)) {
      const b = document.createElement('button');
      b.className = 'la-chip' + (cur.includes(id) ? ' on' : '');
      b.innerHTML = `${a.name}<span class="la-pros">${a.pros}</span><span class="la-cons">${a.cons}</span>`;
      b.onclick = () => {
        const arr = this.deps.loadout.attachments[sel]
          || (this.deps.loadout.attachments[sel] = []); // T1-5: lazily create for pre-expansion saved loadouts
        if (arr.includes(id)) this.deps.loadout.attachments[sel] = arr.filter(x => x !== id);
        else if (arr.length < 3) arr.push(id);
        saveLoadout(this.deps.loadout);
        SFXtick(); this.refreshLoadout();
      };
      slots.appendChild(b);
    }
    // T2-5 Phase 1 (Task 48): weapon finishes — career-stat unlocks, client-side (cosmetics.js)
    const fp = $('fin-pick'); fp.innerHTML = '';
    for (const f of FINISHES) {
      const unlocked = isUnlocked(f, careerNow, w && w.name, careerNow.weaponKills) || ecoOwned(f.id) || classFinishUnlocked(f, careerNow.pk, w && w.cls); // [T90 merge] T90-c: weapon-scoped wreq finishes read the EQUIPPED weapon's kill tier — non-wreq finishes ignore the extra args (byte-identical legacy behavior) · [T139 N7] the ∪ CLASS leg: tier-t of the class ladder unlocks the tier-t finish on every weapon of that class (the §60.4 variant — the never-guess law holds: junk/missing anything reads false)
      const selected = this.deps.loadout.finish === f.id;
      const b = document.createElement('button');
      b.className = 'la-chip fin-chip' + (selected ? ' on' : '') + (unlocked ? '' : ' locked');
      const hex = (n) => '#' + (n || 0).toString(16).padStart(6, '0');
      b.innerHTML = (f.body !== undefined ? `<span class="fin-swatch" style="background:${hex(f.body)};border-color:${hex(f.accent)}"></span>` : '') +
        `${f.label}<span class="la-pros">${stateLabel(f, selected, unlocked, 'fin')}</span>`;
      b.onclick = () => {
        if (!unlocked) return; // locked chip: label states the requirement — no toast spam
        this.deps.loadout.finish = f.id;
        saveLoadout(this.deps.loadout);
        SFXtick(); this.refreshLoadout();
      };
      fp.appendChild(b);
    }
    // T2-5 Phase 3 (Task 55, §39): charms / trails / emotes — SAME unlock law + chip UI as
    // finishes (isUnlocked over career stats; locked chip states the requirement; stock-first).
    // Emotes render text-only (no swatch); charms/trails swatch from their color field.
    const hexc = (n) => '#' + (n || 0).toString(16).padStart(6, '0');
    const cosChips = (el, defs, curVal, swatch, apply, domain) => {
      el.innerHTML = '';
      for (const f of defs) {
        const unlocked = isUnlocked(f, careerNow) || ecoOwned(f.id);
        const selected = curVal === f.id;
        const b = document.createElement('button');
        b.className = 'la-chip fin-chip' + (selected ? ' on' : '') + (unlocked ? '' : ' locked');
        b.innerHTML = (swatch ? `<span class="fin-swatch" style="background:${hexc(f.color)};border-color:${hexc(f.color)}"></span>` : '') +
          `${f.label}<span class="la-pros">${stateLabel(f, selected, unlocked, domain)}</span>`;
        b.onclick = () => {
          if (!unlocked) return; // locked chip: label states the requirement — no toast spam
          apply(f.id);
          saveLoadout(this.deps.loadout);
          SFXtick(); this.refreshLoadout();
        };
        el.appendChild(b);
      }
    };
    cosChips($('charm-pick'), CHARMS, this.deps.loadout.charm, true, v => this.deps.loadout.charm = v, 'ch');
    cosChips($('trail-pick'), TRAILS, this.deps.loadout.trail, true, v => this.deps.loadout.trail = v, 'tr');
    cosChips($('emote-pick'), EMOTES, this.deps.loadout.emote, false, v => this.deps.loadout.emote = v, 'em');
    this._renderPreview(mw); // [T120 c] the weapon preview re-renders on EVERY detail refresh (attachments/finish/charm/weapon)
    // selection highlight
    document.querySelectorAll('.lw-item').forEach(el => {
      el.classList.toggle('sel', el.dataset.id === sel || el.dataset.id === this.deps.loadout.secondary);
    });
    this._renderSlotChips(); // [v1.50 port T90] §60.2 M18: chips re-sync on every selection change (same cycle as the rows)
  }
  // ---- [v1.50 port T90] §60.2 M18 (Task 78-e): loadout slot chips — compact selectable ms-chip row ----
  selectWeapon(w) { // THE selection path — classic rows and the M18 chips both call this (byte-equal behavior to the pre-M18 row handler)
    if (w.slot === 3) this.deps.loadout.secondary = w.id;
    else this.deps.loadout.weapon = w.id;
    saveLoadout(this.deps.loadout);
    SFXtick(); this.refreshLoadout();
  }
  // ---------- [T120 d] the 10-slot loadout book — switchSlot mutates the LIVE loadout in
  // place (deps.loadout identity preserved: main.js/weapons/MP join all read the same
  // object), so weapon/attachment/ability changes propagate through the EXISTING paths.
  switchSlot(i) {
    const b = loadSlots();
    if (i === b.active) return;
    b.slots[b.active] = this.deps.loadout; // serialize the live object under the OLD active
    b.active = i;
    try { localStorage.setItem(LS_LO2, JSON.stringify(b)); } catch {}
    Object.assign(this.deps.loadout, { ...structuredClone(DEFAULT_LOADOUT), ...structuredClone(b.slots[i] || {}) });
    saveLoadout(this.deps.loadout); // upserts the book at the NEW active
    SFXtick(); this.buildLoadout(); this.refreshLoadout();
  }
  _renderSlots() {
    const mount = $('lw-slots-row'); if (!mount) return;
    const b = loadSlots();
    mount.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'la-title'; label.style.margin = '0';
    label.textContent = t('ix.loadout'); // reuse — no new i18n keys (chips are numerals)
    mount.appendChild(label);
    const row = document.createElement('div'); row.className = 'lw-slots';
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('button');
      c.className = 'lw-slot-num' + (i === b.active ? ' on' : '');
      c.textContent = String(i + 1);
      c.onclick = () => this.switchSlot(i);
      row.appendChild(c);
    }
    mount.appendChild(row);
  }
  // ---------- [T120 c] the weapon preview — buildViewModel(modified def, finish, charm)
  // in a small side-view scene; one renderer, rAF gated on the page's visibility.
  _renderPreview(mw) {
    const mount = $('lw-preview'); if (!mount) return;
    if (!this._pv) {
      const cw = mount.clientWidth || 480, ch = mount.clientHeight || 150;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      r.setSize(cw, ch);
      mount.appendChild(r.domElement);
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xdfe8f2, 0x22282f, 1.15));
      const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(1.5, 2, 2.5); sc.add(dl);
      const cam = new THREE.PerspectiveCamera(38, cw / ch, 0.01, 20);
      cam.position.set(0, 0.1, 0.95); cam.lookAt(0, 0, 0);
      const holder = new THREE.Group(); sc.add(holder);
      this._pv = { r, sc, cam, holder, t: 0 };
      if (!this._pvLoop) {
        this._pvLoop = true;
        const loop = () => { requestAnimationFrame(loop); const p = this._pv; if (!p) return; const pg = document.getElementById('page-loadout'); if (!pg || pg.classList.contains('hidden')) return; p.t += 0.012; p.holder.rotation.y = Math.sin(p.t) * 0.5 + 0.45; p.holder.rotation.z = 0.06; p.r.render(p.sc, p.cam); };
        loop();
      }
    }
    const pv = this._pv;
    while (pv.holder.children.length) { // dispose-swap (no leak across selections)
      const m = pv.holder.children.pop();
      if (m.traverse) m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => x.dispose()); });
    }
    const g = buildViewModel(mw.def, finishById(this.deps.loadout.finish), charmById(this.deps.loadout.charm));
    const bb = new THREE.Box3().setFromObject(g);
    const size = bb.getSize(new THREE.Vector3());
    const c = bb.getCenter(new THREE.Vector3());
    g.position.sub(c); // center at the origin — the boom orbits the gun, not the FP anchor
    g.scale.setScalar(0.6 / Math.max(size.x, size.y, size.z, 0.001));
    pv.holder.add(g);
  }
  _renderSlotChips() {
    const chips = $('lw-chips');
    if (!chips) return; // [v1.50 port T90] guarded — #lw-chips mount re-lands with index.html (cross-module need)
    chips.innerHTML = slotChipsHtml(this.deps.loadout, t);
    chips.querySelectorAll('.lw-slot').forEach(b => {
      b.onclick = () => { const w = WEAPONS.find(x => x.id === b.dataset.wid); if (w) this.selectWeapon(w); };
    });
  }

  // ---- [v1.50 port T90] §60.2 M7 + M21 + M8 (Task 78-e): per-frame HUD mirror ----
  // One rAF loop, gated on #hud visibility (menus = two classList reads). Touch-only
  // surfaces live in #touch-ui (the Input.touchMode show law, main.js) — desktop is
  // byte-untouched. M5/M7-lite ADS/auto-fire logic is NOT touched: chips are
  // pointer-events:none mirrors of the hud.js mode law + death surfaces.
  _startHudMirror() {
    const tick = () => {
      this._mirrorRaf = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(tick) : 0;
      this.hudMirrorTick();
    };
    tick();
  }
  hudMirrorTick() {
    const hud = $('hud');
    const live = !!hud && !hud.classList.contains('hidden');
    this.syncFireModeChip(live);
    // [T117] the M21 deploy-chip mirror is RETIRED — it duplicated #death-screen's respawn
    // countdown as a second "DEPLOY IN" face. The death screen owns the ONE countdown.
    if (MapXL.open && !live) mapXLSet(false); // match over / quit → dismiss the expanded map
    else if (MapXL.open) mapXLBlit(); // M8: re-clone the shipped minimap render while open
  }
  syncFireModeChip(live) { // M7: mirror the CURRENT weapon's mode from config data (name → WEAPONS def), hud.js mode-law equivalent
    const chip = $('firemode-chip');
    if (!chip) return; // [v1.50 port T90] guarded — #firemode-chip mount re-lands with index.html
    if (!live) { if (chip.innerHTML) { chip.innerHTML = ''; this._fmKey = null; } return; }
    const nameEl = $('weapon-name');
    const w = WEAPONS.find(x => x.name === (nameEl ? nameEl.textContent : ''));
    const key = w ? w.id : null;
    if (key === this._fmKey) return; // per-frame cheap-out (re-render only on weapon change)
    this._fmKey = key;
    chip.innerHTML = w ? fireModeChipHtml(w, t) : '';
  }
  // [T117] syncDeployChip REMOVED — the M21 touch chip mirrored #death-screen + #respawn-timer
  // as a second "DEPLOY IN" face; the playtest flagged the duplicate. deployChipInfo retired with it.

  // ---- [v1.50 port T90] §60.2 M8 (Task 78-e): minimap tap-expand binding ----
  wireMapXL() {
    const mw = $('map-wrap');
    if (mw) {
      mw.setAttribute('aria-label', L(t, 'm8.mapExpand', 'EXPAND MAP'));
      mw.addEventListener('click', () => {
        if (document.body.classList.contains('hud-editing')) return; // §55.6: HUD editor owns the session
        mapXLSet(!MapXL.open); // tap toggles; the #map-xl veil covers map-wrap while open → second tap = dismiss
      });
    }
    const xl = $('map-xl');
    if (xl) {
      xl.setAttribute('aria-label', L(t, 'm8.mapClose', 'CLOSE MAP'));
      xl.addEventListener('click', () => mapXLSet(false)); // outside-tap / second-tap dismiss
    }
  }

  ttk(w) { // [TTK calculator formula] — T1-5: pellet weapons counted per FULL shot (pellets × dmg);
    // body-damage close-range paper TTK, unchanged formula otherwise (falloff/HS shown as separate labels)
    const perShot = (w.pellets || 1) * w.dmg;
    const shots = Math.ceil(100 / perShot);
    return (shots - 1) * 60 / w.rpm;
  }

  // ---------- settings ----------
  buildSettings() { this.renderSettingsTab('gameplay'); }
  // ---------- [T122] (4) the per-page settings header — RESTORE PAGE DEFAULTS + PROFILES ----------
  // The Settings-wide restore (btn-set-defaults) is UNTOUCHED; this row resets ONLY the
  // active tab's keys (the TAB_KEYS law) and the profile row snapshots/restores the WHOLE
  // settings object under a user name (localStorage ironsight.settings.profiles.v1 — an
  // additive store, the settings key ironsight.settings.v1 is never touched by profiles).
  setTabHeader(tab, body) {
    const s = this.deps.settings;
    const hdr = document.createElement('div'); hdr.className = 'set-row';
    hdr.innerHTML = `<span class="set-label">${t('s.restoreTab')}</span><button class="seg-btn" id="set-tab-reset">RESTORE</button>`;
    hdr.querySelector('#set-tab-reset').onclick = () => {
      this.applyTabDefaults(tab);
      this.deps.settingsChanged(); this.renderSettingsTab(tab); SFXtick();
      const el = document.getElementById('set-tab-msg'); if (el) el.textContent = t('s.restoreTabDone');
    };
    body.appendChild(hdr);
    let profs = {};
    try { profs = JSON.parse(localStorage.getItem('ironsight.settings.profiles.v1') || '{}') || {}; } catch (_) { profs = {}; }
    const persist = () => { try { localStorage.setItem('ironsight.settings.profiles.v1', JSON.stringify(profs)); } catch (_) {} };
    const names = Object.keys(profs).sort();
    const pr = document.createElement('div'); pr.className = 'set-row'; pr.style.flexWrap = 'wrap';
    pr.innerHTML = `<span class="set-label">${t('s.profiles')}</span><select id="set-prof-sel" class="soc-in" style="max-width:150px">${names.map(n => '<option>' + n.replace(/</g, '&lt;') + '</option>').join('')}</select><input type="text" id="set-prof-name" class="soc-in" placeholder="${t('s.profileNamePh')}" maxlength="24" style="max-width:130px"><button class="seg-btn" id="set-prof-save">${t('s.profileSave')}</button><button class="seg-btn" id="set-prof-load">${t('s.profileLoad')}</button><button class="seg-btn" id="set-prof-del">${t('s.profileDelete')}</button><span class="set-note" id="set-tab-msg" style="min-width:100%">${names.length ? '' : t('s.profilesEmpty')}</span>`;
    const msg = (k) => { const el = pr.querySelector('#set-tab-msg'); if (el) el.textContent = t(k); };
    pr.querySelector('#set-prof-save').onclick = () => {
      const name = (pr.querySelector('#set-prof-name').value || '').trim().slice(0, 24);
      if (!name) { msg('s.profileBadName'); return; }
      profs[name] = { at: Date.now(), settings: structuredClone(this.deps.settings) }; // same-name save OVERWRITES the profile (that is the point of a named slot)
      persist(); this.renderSettingsTab(tab);
      const sel = document.getElementById('set-prof-sel'); if (sel) sel.value = name;
      msg('s.profileSaved');
    };
    pr.querySelector('#set-prof-load').onclick = () => {
      const sel = pr.querySelector('#set-prof-sel'); const name = sel && sel.value;
      const snap = name && profs[name] && profs[name].settings;
      if (!snap || typeof snap !== 'object') { msg('s.profilesEmpty'); return; }
      this.deps.settings = structuredClone(snap); // the btn-set-defaults replacement law (fresh object; identity swap)
      if (this.deps.settingsSwap) this.deps.settingsSwap(this.deps.settings); // [T122] (4) the swap propagates to main.js's binding (the stale-reference fix)
      i18nSetLang(this.deps.settings.lang || 'en'); // the locale rides the snapshot (§48.4 live re-apply)
      applyInputSettings(this.deps.settings);
      this.deps.settingsChanged(); this.renderSettingsTab(tab); msg('s.profileLoaded');
    };
    pr.querySelector('#set-prof-del').onclick = () => {
      const sel = pr.querySelector('#set-prof-sel'); const name = sel && sel.value;
      if (!name || !profs[name]) { msg('s.profilesEmpty'); return; }
      delete profs[name]; persist(); this.renderSettingsTab(tab); msg('s.profileDeleted');
    };
    body.appendChild(pr);
  }
  applyTabDefaults(tab) { // [T122] (4) per-tab defaults — the TAB_KEYS law (each tab owns its key set; anything unlisted keeps its value)
    const s = this.deps.settings;
    const K = {
      gameplay: ['colorVision', 'sens', 'adsSens', 'invertY', 'fov', 'autoSprint', 'damageNumbers', 'hitMarker', 'camShake', 'lang'],
      video: ['quality', 'qualityPinned', 'viewmodel', 'bob', 'tilt', 'fpsCounter', 'minimapRotate'],
      audio: ['volMaster', 'volSfx', 'volMusic', 'voiceOn', 'volVoice'], // [T140 G-4] the voice keys join the tab-defaults law
      crosshair: [], // s.ch = the clone below (the editor's object key set)
      controls: ['binds', 'padBinds', 'aimMode', 'crouchMode', 'camMode', 'gpSens', 'gpDeadzone', 'gpLookDeadzone', 'gpVibration', 'gpAssist', 'touchSens', 'touchStickDead', 'touchLookDead', 'touchHybridDrag', 'gyroAim', 'gyroSens', 'aimCurve', 'touchLayout', 'fireAuto', 'touchAssist'],
      online: ['mpRegion', 'mpRegionUrl'],
      mobile: ['touchSens', 'touchHaptics', 'touchStickDead', 'touchLookDead', 'touchHybridDrag', 'gyroAim', 'gyroSens', 'touchAdsSens', 'touchAssist', 'touchAutoSprint', 'touchLayout', 'fireAuto'],
    }[tab] || [];
    for (const k of K) {
      if (k === 'binds') s.binds = mergeBinds();
      else if (k === 'padBinds') s.padBinds = { ...PAD_BINDS };
      else s[k] = structuredClone(DEFAULT_SETTINGS[k]); // an absent DEFAULT key restores the absent-key default law (e.g. crouchMode → 'double')
    }
    if (tab === 'crosshair') s.ch = structuredClone(DEFAULT_SETTINGS.ch);
    if (tab === 'gameplay') { applyColorVision('default'); i18nSetLang('en'); s.lang = 'en'; } // the live-applies ride the restore (the §48.4 law)
    if (tab === 'controls') applyInputSettings(s);
  }
  renderSettingsTab(tab) {
    const body = $('set-body'); body.innerHTML = '';
    const s = this.deps.settings;
    if (tab === 'mobile') { this.setTabHeader(tab, body); this.renderMobileTab(); return; } // T89 L9: MOBILE tab — touch tuning + HUD editor entry · [T122] the header rides EVERY tab
    this.setTabHeader(tab, body); // [T122] (4) the per-page law — RESTORE PAGE DEFAULTS + PROFILES on every tab's head
    const row = (label, ctrlHTML, note = '') => {
      const d = document.createElement('div'); d.className = 'set-row';
      d.innerHTML = `<span class="set-label">${label}</span>${ctrlHTML}`;
      if (note) d.innerHTML += `<span class="set-note" style="flex-basis:100%">${note}</span>`;
      body.appendChild(d);
      return d;
    };
    const slider = (key, min, max, step, fmt = v => v) =>
      `<input type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}" data-key="${key}" data-fmt="${typeof fmt === 'string' ? fmt : ''}"><span class="set-val" data-val="${key}">${fmt(s[key])}</span>`;
    const bindSlider = (d, key, fmt) => {
      const inp = d.querySelector('input');
      inp.oninput = () => {
        s[key] = +inp.value;
        d.querySelector(`[data-val="${key}"]`).textContent = fmt(+inp.value);
        this.deps.settingsChanged();
      };
    };
    const seg = (key, opts, cur) => {
      return `<span class="seg-group">${opts.map(o => `<button class="seg-btn ${o === cur ? 'on' : ''}" data-seg="${key}" data-v="${o}">${o}</button>`).join('')}</span>`;
    };
    const bindSeg = (d, key, parse = v => v) => {
      d.querySelectorAll(`[data-seg="${key}"]`).forEach(b => b.onclick = () => {
        s[key] = parse(b.dataset.v);
        d.querySelectorAll(`[data-seg="${key}"]`).forEach(x => x.classList.toggle('on', x === b));
        this.deps.settingsChanged(); SFXtick();
      });
    };
    const toggle = (key, on) => seg(key, ['ON', 'OFF'], on ? 'ON' : 'OFF');
    const bindToggle = (d, key) => bindSeg(d, key, v => v === 'ON');

    if (tab === 'gameplay') {
      // T2-8 (Task 64, §48.4): LANGUAGE — first row, Task-43 seg() pattern reused verbatim;
      // options are endonyms (§48.1); onChange live-applies (§48.5) via setLang + re-render.
      const dl = row(t('s.language'), seg('lang', LANGS.map(l => l.label), LANGS.find(l => l.id === i18nLang()).label), t('s.languageDesc'));
      dl.querySelectorAll('[data-seg=lang]').forEach(b => b.onclick = () => {
        const hit = LANGS.find(x => x.label === b.dataset.v);
        if (!hit) return;
        i18nSetLang(hit.id); s.lang = hit.id;
        dl.querySelectorAll('[data-seg=lang]').forEach(x => x.classList.toggle('on', x === b));
        this.renderSettingsTab(tab); this.buildCareerStrip(); this.deps.settingsChanged(); SFXtick();
      });
      // §52.3 S6: COLOR VISION — live-applied palette row (default = shipped constants verbatim)
      const cv = row('COLOR VISION', seg('colorVision', ['DEFAULT', 'DEUTAN', 'PROTAN', 'TRITAN'], (s.colorVision || 'default').toUpperCase()), 'Colorblind-safe ally/enemy ramps — applied live (HUD dots, SnD ring, accents).');
      cv.querySelectorAll('[data-seg=colorVision]').forEach(b => b.onclick = () => {
        s.colorVision = (b.dataset.v || 'default').toLowerCase();
        cv.querySelectorAll('[data-seg=colorVision]').forEach(x => x.classList.toggle('on', x === b));
        applyColorVision(s.colorVision);
        this.deps.settingsChanged(); SFXtick();
      });
      body.appendChild(cv);
      const d1 = row(t('s.mouseSens'), slider('sens', 0.05, 3, 0.05, v => (+v).toFixed(2)), t('s.mouseSensDesc', { cm: (37.7 / s.sens).toFixed(1) }));
      bindSlider(d1, 'sens', v => (+v).toFixed(2));
      const d2 = row(t('s.adsSens'), slider('adsSens', 0.4, 1, 0.05, v => (+v).toFixed(2)));
      bindSlider(d2, 'adsSens', v => (+v).toFixed(2));
      const d3 = row(t('s.invertY'), toggle('invertY', s.invertY)); bindToggle(d3, 'invertY', );
      const d4 = row(t('s.fov'), slider('fov', 70, 120, 1, v => v + '°'), t('s.fovDesc'));
      bindSlider(d4, 'fov', v => v + '°');
      const d5 = row(t('s.autoSprint'), toggle('autoSprint', s.autoSprint)); bindToggle(d5, 'autoSprint');
      const d6 = row(t('s.dmgNums'), toggle('damageNumbers', s.damageNumbers)); bindToggle(d6, 'damageNumbers');
      const d7 = row(t('s.hitMarker'), toggle('hitMarker', s.hitMarker)); bindToggle(d7, 'hitMarker');   // T1-8 (Task 38 lead sweep)
      const d8 = row(t('s.camShake'), toggle('camShake', s.camShake)); bindToggle(d8, 'camShake');     // T1-8 (Task 38 lead sweep)
    }
    if (tab === 'video') {
      const d1 = row(t('s.quality'), seg('quality', ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'], ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'][s.quality]), t('s.qualityDesc')); // preset names stay EN (§48.7 residual: value==label data path)
      bindSeg(d1, 'quality', v => ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'].indexOf(v));
      d1.querySelectorAll('[data-seg=quality]').forEach(b => b.addEventListener('click', () => { this.deps.settings.qualityPinned = true; })); // [v1.50 port T90] §60.2 M19: a manual tier choice pins quality against the touch auto-downgrade (persists via saveSettings; main.js downgrade consumer = filed cross-module need)
      const d2 = row(t('s.viewmodel'), toggle('viewmodel', s.viewmodel)); bindToggle(d2, 'viewmodel');
      const d3 = row(t('s.headBob'), toggle('bob', s.bob), t('s.headBobDesc'));
      bindToggle(d3, 'bob');
      const d4 = row(t('s.camTilt'), toggle('tilt', s.tilt)); bindToggle(d4, 'tilt');
      const d5 = row(t('s.fpsCounter'), toggle('fpsCounter', s.fpsCounter)); bindToggle(d5, 'fpsCounter');
      const d6 = row(t('s.minimapRot'), toggle('minimapRotate', s.minimapRotate)); bindToggle(d6, 'minimapRotate');
    }
    if (tab === 'audio') {
      const d1 = row(t('s.volMaster'), slider('volMaster', 0, 1, 0.05, v => Math.round(v * 100) + '%')); bindSlider(d1, 'volMaster', v => Math.round(v * 100) + '%');
      const d2 = row(t('s.volSfx'), slider('volSfx', 0, 1, 0.05, v => Math.round(v * 100) + '%')); bindSlider(d2, 'volSfx', v => Math.round(v * 100) + '%');
      const d3 = row(t('s.volMusic'), slider('volMusic', 0, 1, 0.05, v => Math.round(v * 100) + '%')); bindSlider(d3, 'volMusic', v => Math.round(v * 100) + '%');
      const d4v = row(t('s.voiceOn'), toggle('voiceOn', s.voiceOn)); bindToggle(d4v, 'voiceOn'); // [T140 G-4] the mic is an OPT-IN (the honest browser-mic law — default OFF; PTT = hold T in MP)
      const d5v = row(t('s.volVoice'), slider('volVoice', 0, 1, 0.05, v => Math.round(v * 100) + '%')); bindSlider(d5v, 'volVoice', v => Math.round(v * 100) + '%'); // [T140 G-4] the per-speaker gain default
    }
    if (tab === 'crosshair') {
      // G-1 (v1.78): the editor completion — 5 shapes + outline/opacity/dot-size + presets + share code,
      // on the T1-8 tab surface (row/chRow/chSeg/chSlider local grammar unchanged); the preview host is
      // now WIRED — hud.buildCrosshair renders into #ch-preview-host on every settingsChanged.
      const p = document.createElement('div'); p.className = 'chx-preview';
      const inner = document.createElement('div'); inner.id = 'ch-preview-host'; inner.style.position = 'relative'; inner.style.width = inner.style.height = '0';
      p.appendChild(inner); body.appendChild(p);
      const chRow = (label, ctrl) => { const d = row(label, ctrl); return d; };
      const chSeg = (key, opts) => `<span class="seg-group">${opts.map(o => `<button class="seg-btn ${s.ch[key] === o ? 'on' : ''}" data-chseg="${key}" data-v="${o}">${o}</button>`).join('')}</span>`;
      const chSlider = (key, min, max, step, fmt = v => v) => `<input type="range" min="${min}" max="${max}" step="${step}" value="${s.ch[key]}" data-chkey="${key}"><span class="set-val" data-chval="${key}">${fmt(s.ch[key])}</span>`;
      const SHAPES = [['cross', 'CROSS'], ['dot', 'DOT'], ['circle', 'CIRCLE'], ['tshape', 'T-SHAPE'], ['x', 'X']]; // EN value==label render grammar (§48.7, the quality-preset residual)
      const d1 = chRow(t('s.style'), `<span class="seg-group">${SHAPES.map(([v, l]) => `<button class="seg-btn ${s.ch.style === v ? 'on' : ''}" data-chseg="style" data-v="${v}">${l}</button>`).join('')}</span>`);
      d1.querySelectorAll('[data-chseg=style]').forEach(b => b.onclick = () => { s.ch.style = b.dataset.v; d1.querySelectorAll('[data-chseg=style]').forEach(x => x.classList.toggle('on', x === b)); this.deps.settingsChanged(); });
      const d2 = chRow(t('s.color'), `<input type="color" value="${s.ch.color}" id="ch-color">`);
      d2.querySelector('#ch-color').oninput = (e) => { s.ch.color = e.target.value; this.deps.settingsChanged(); };
      const d3 = chRow(t('s.size'), chSlider('size', 2, 16, 1));
      const d4 = chRow(t('s.gap'), chSlider('gap', 0, 14, 1));
      const d5 = chRow(t('s.thickness'), chSlider('thickness', 1, 6, 1));
      const d6 = chRow(t('s.outline'), chSeg('outline', [true, false]));
      d6.querySelectorAll('[data-chseg=outline]').forEach(b => { b.textContent = b.dataset.v === 'true' ? 'ON' : 'OFF'; b.onclick = () => { s.ch.outline = b.dataset.v === 'true'; d6.querySelectorAll('[data-chseg=outline]').forEach(x => x.classList.toggle('on', x === b)); this.deps.settingsChanged(); }; });
      const d7 = chRow(t('s.opacity'), chSlider('opacity', 0.2, 1, 0.05, v => Math.round(v * 100) + '%'));
      const d8 = chRow(t('s.centerDot'), chSeg('dot', [true, false]));
      d8.querySelectorAll('[data-chseg=dot]').forEach(b => { b.textContent = b.dataset.v === 'true' ? 'ON' : 'OFF'; b.onclick = () => { s.ch.dot = b.dataset.v === 'true'; d8.querySelectorAll('[data-chseg=dot]').forEach(x => x.classList.toggle('on', x === b)); this.deps.settingsChanged(); }; });
      const d9 = chRow(t('s.dotSize'), chSlider('dotSize', 1, 8, 1));
      const d10 = chRow(t('s.dynSpread'), chSeg('dynamic', [true, false]));
      d10.querySelectorAll('[data-chseg=dynamic]').forEach(b => { b.textContent = b.dataset.v === 'true' ? 'ON' : 'OFF'; b.onclick = () => { s.ch.dynamic = b.dataset.v === 'true'; d10.querySelectorAll('[data-chseg=dynamic]').forEach(x => x.classList.toggle('on', x === b)); this.deps.settingsChanged(); }; });
      for (const [d, k, f] of [[d3, 'size'], [d4, 'gap'], [d5, 'thickness'], [d9, 'dotSize'], [d7, 'opacity', v => Math.round(v * 100) + '%']]) {
        const inp = d.querySelector('input');
        inp.oninput = () => { s.ch[k] = +inp.value; d.querySelector(`[data-chval="${k}"]`).textContent = (f || (v => v))(+inp.value); this.deps.settingsChanged(); };
      }
      // presets (EN names — the value==label grammar) + the share code (the Krunker signature:
      // 'AO1:' + base64 of the ch object; apply = validated shallow-merge, clamped to slider ranges)
      const CH_PRESETS = {
        DEFAULT: { style: 'cross', color: '#66ff66', size: 6, gap: 3, thickness: 2, dot: false, dynamic: true, outline: true, opacity: 1, dotSize: 2 },
        CLASSIC: { style: 'cross', color: '#ffffff', size: 7, gap: 4, thickness: 2, dot: false, dynamic: false, outline: true, opacity: 1, dotSize: 2 },
        TIGHT: { style: 'cross', color: '#00e5ff', size: 4, gap: 1, thickness: 2, dot: true, dynamic: true, outline: true, opacity: 1, dotSize: 2 },
        CIRCLE: { style: 'circle', color: '#ff5252', size: 8, gap: 2, thickness: 2, dot: false, dynamic: true, outline: true, opacity: 1, dotSize: 2 },
        DOT: { style: 'dot', color: '#ffd740', size: 6, gap: 3, thickness: 2, dot: false, dynamic: false, outline: true, opacity: 1, dotSize: 4 },
      };
      const dP = chRow(t('s.presets'), `<span class="seg-group">${Object.keys(CH_PRESETS).map(n => `<button class="seg-btn" data-chpre="${n}">${n}</button>`).join('')}</span>`);
      dP.querySelectorAll('[data-chpre]').forEach(b => b.onclick = () => { Object.assign(s.ch, structuredClone(CH_PRESETS[b.dataset.chpre])); this.renderSettingsTab('crosshair'); SFXtick(); }); // re-render adopts the preset across every row
      const st = `<span class="set-val" id="ch-code-status" style="min-width:72px;text-align:left"></span>`;
      const dC = chRow(t('s.shareCode'), `<input type="text" id="ch-code" spellcheck="false" placeholder="AO1:…" style="flex:1;min-width:120px;background:#151b26;border:1px solid rgba(255,255,255,.14);border-radius:4px;color:#e8ecf1;padding:4px 6px;font-size:12px"><button class="seg-btn" id="ch-code-copy">${t('s.codeCopy')}</button><button class="seg-btn" id="ch-code-apply">${t('s.codeApply')}</button>${st}`);
      const flash = (key) => { const el = document.getElementById('ch-code-status'); if (!el) return; el.textContent = t(key); clearTimeout(el._t); el._t = setTimeout(() => { el.textContent = ''; }, 1600); }; // re-queries the LIVE status node — apply re-renders the tab and detaches any captured one
      const copyFallback = (code) => { const inp = dC.querySelector('#ch-code'); inp.value = code; inp.select(); try { document.execCommand('copy'); flash('s.codeCopied'); } catch (e) { /* clipboard unavailable — the code sits in the input for manual copy */ } };
      dC.querySelector('#ch-code-copy').onclick = () => {
        const code = 'AO1:' + btoa(JSON.stringify(s.ch));
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => flash('s.codeCopied'), () => copyFallback(code));
        else copyFallback(code);
      };
      dC.querySelector('#ch-code-apply').onclick = () => {
        const raw = (dC.querySelector('#ch-code').value || '').trim();
        try {
          if (!raw.startsWith('AO1:')) throw 0;
          const c = JSON.parse(atob(raw.slice(4)));
          if (!c || typeof c !== 'object' || Array.isArray(c)) throw 0;
          const v = {};
          if (['cross', 'dot', 'circle', 'tshape', 'x'].includes(c.style)) v.style = c.style;
          if (typeof c.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.color)) v.color = c.color;
          for (const [k, lo, hi] of [['size', 2, 16], ['gap', 0, 14], ['thickness', 1, 6], ['dotSize', 1, 8], ['opacity', 0.2, 1]]) if (typeof c[k] === 'number' && c[k] >= lo && c[k] <= hi) v[k] = c[k];
          for (const k of ['dot', 'dynamic', 'outline']) if (typeof c[k] === 'boolean') v[k] = c[k];
          if (!Object.keys(v).length) throw 0;
          Object.assign(s.ch, v);
          this.renderSettingsTab('crosshair'); // adopt + re-render (the preset law)
          flash('s.codeApplied');
        } catch (e) { flash('s.codeInvalid'); }
      };
      this.deps.settingsChanged();
    }
    if (tab === 'controls') {
      // ---- T1-7 (Task 38): click-to-rebind tables — settings.binds / settings.padBinds,
      // live-applied via applyInputSettings, persisted through settingsChanged (applySettings → saveSettings).
      const msg = document.createElement('div');
      msg.className = 'set-note'; msg.style.minHeight = '1.2em'; msg.style.marginBottom = '8px';
      msg.textContent = UI.CAP_HINT;
      body.appendChild(msg); this._msgEl = msg;

      const tkb = document.createElement('table'); tkb.className = 'controls-table';
      tkb.innerHTML = Object.entries(BINDINGS).filter(([, b]) => !b.fixed)
        .map(([a, b]) => `<tr data-kb="${a}" style="cursor:pointer"><td>${b.label}</td><td data-kbcode="${a}">${b.keys.map(codeLabel).join(' / ')}</td></tr>`).join('');
      body.appendChild(tkb);
      tkb.querySelectorAll('tr[data-kb]').forEach(tr => tr.onclick = () => this.captureKB(tr.dataset.kb));
      const fixedNote = document.createElement('div'); fixedNote.className = 'set-note'; fixedNote.style.marginTop = '6px';
      fixedNote.textContent = t('s.fixedNote');
      body.appendChild(fixedNote);

      // T1-8 + [T119]: aim input mode — the AAA triple (hold / toggle / 2×tap)
      const AIM_MODES = [['HOLD', 'hold'], ['TOGGLE', 'toggle'], ['2X-TAP', 'double']];
      const aimSeg = (key, val) => (AIM_MODES.find(m => m[1] === val) || AIM_MODES[0])[0];
      const dAim = row(t('s.aimMode'), seg('aimMode', AIM_MODES.map(m => m[0]), aimSeg('aimMode', s.aimMode)), t('s.aimModeDesc')); // values stay EN (value==label data path, §48.7)
      dAim.querySelectorAll('[data-seg=aimMode]').forEach(b => b.onclick = () => {
        s.aimMode = (AIM_MODES.find(m => m[0] === b.dataset.v) || AIM_MODES[0])[1];
        dAim.querySelectorAll('[data-seg=aimMode]').forEach(x => x.classList.toggle('on', x === b));
        applyInputSettings(s); this.deps.settingsChanged(); SFXtick();
      });
      // [T119] crouch stance mode — the same AAA triple (issue 3): 2X-TAP latches on a
      // <280ms pair, a single press stays momentary; TOGGLE latches per press; HOLD = pressed
      const dCr = row(t('s.crouchMode'), seg('crouchMode', AIM_MODES.map(m => m[0]), aimSeg('crouchMode', s.crouchMode || 'double')), t('s.crouchModeDesc'));
      dCr.querySelectorAll('[data-seg=crouchMode]').forEach(b => b.onclick = () => {
        s.crouchMode = (AIM_MODES.find(m => m[0] === b.dataset.v) || AIM_MODES[2])[1];
        dCr.querySelectorAll('[data-seg=crouchMode]').forEach(x => x.classList.toggle('on', x === b));
        applyInputSettings(s); this.deps.settingsChanged(); SFXtick();
      });
      dAim.after(dCr);
      // [T119] camera perspective (issue 4) — FIRST-PERSON classic / THIRD-PERSON over-the-shoulder
      const dCam = row(t('s.camMode'), seg('camMode', ['FIRST-PERSON', 'THIRD-PERSON'], s.camMode === 'tp' ? 'THIRD-PERSON' : 'FIRST-PERSON'), t('s.camModeDesc'));
      dCam.querySelectorAll('[data-seg=camMode]').forEach(b => b.onclick = () => {
        s.camMode = b.dataset.v === 'THIRD-PERSON' ? 'tp' : 'fp';
        dCam.querySelectorAll('[data-seg=camMode]').forEach(x => x.classList.toggle('on', x === b));
        this.deps.settingsChanged(); SFXtick();
      });
      dCr.after(dCam);

      const tpad = document.createElement('table'); tpad.className = 'controls-table'; tpad.style.marginTop = '14px';
      tpad.innerHTML = Object.keys(PAD_BINDS).map(a => {
        const v = (s.padBinds && s.padBinds[a] !== undefined) ? s.padBinds[a] : PAD_BINDS[a];
        return `<tr data-pad="${a}" style="cursor:pointer"><td>${PAD_ACTION_LABELS[a] || a}</td><td data-padcode="${a}">${padLabel(v)}</td>`;
      }).join('');
      body.appendChild(tpad);
      tpad.querySelectorAll('tr[data-pad]').forEach(tr => tr.onclick = () => this.capturePad(tr.dataset.pad));
      const padNote = document.createElement('div'); padNote.className = 'set-note'; padNote.style.marginTop = '6px';
      padNote.textContent = t('s.padNote');
      body.appendChild(padNote);

      // reference tables (semantic descriptions — current keys shown above)
      // FIX (Task 87 batch sweep): this table was `const t` — SHADOWING the i18n t() in the
      // same block, so t('s.refLook') threw TypeError and the whole controls tab render
      // died at this line (gamepad sliders + restore below never reached). Renamed tbl.
      const tbl = document.createElement('table'); tbl.className = 'controls-table';
      tbl.style.marginTop = '14px';
      tbl.innerHTML = [
        ['MOUSE', t('s.refLook')], ['ESC', t('s.refPause')], ['RMB + tap', t('s.refAim')],
        ['CTRL / C', t('s.refCrouch')], ['SPACE', t('s.refJump')],
        ['G (hold)', t('s.refNade')], ['1 / 2', t('s.refSwap')],
      ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
      body.appendChild(tbl);
      const t2 = document.createElement('table'); t2.className = 'controls-table';
      t2.style.marginTop = '14px';
      t2.innerHTML = [
        ['LEFT STICK', t('s.refMove')], ['RIGHT STICK', t('s.refPadLook')],
        ['L3', t('s.refSprint')], ['R3', t('s.refMelee')],
        ['B / CIRCLE', t('s.refPadCrouch')],
        ['A / CROSS', t('s.refPadJump')], ['RB', t('s.refNade')], ['LB', t('s.refAbility')],
        ['D-PAD U / R / D', t('s.refStreaks')], ['D-PAD L', t('s.refPing')],
        ['VIEW', t('s.refBoard')], ['MENU', t('s.refPause')],
        ['HOME (BTN 16)', t('s.refCam')], ['MENUS', t('s.refPadMenu')], // [T122] (2)+(3) the controller camera + menu-nav rows
      ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
      body.appendChild(t2);

      const g1 = row(t('s.gpSens'), slider('gpSens', 0.3, 2.5, 0.05, v => (+v).toFixed(2)), t('s.gpSensDesc'));
      bindSlider(g1, 'gpSens', v => (+v).toFixed(2));
      const g2 = row(t('s.moveDead'), slider('gpDeadzone', 0.05, 0.3, 0.01, v => (+v).toFixed(2)), t('s.moveDeadDesc'));
      bindSlider(g2, 'gpDeadzone', v => (+v).toFixed(2));
      const g2b = row(t('s.lookDead'), slider('gpLookDeadzone', 0.05, 0.3, 0.01, v => (+v).toFixed(2)), t('s.lookDeadDesc'));
      bindSlider(g2b, 'gpLookDeadzone', v => (+v).toFixed(2));
      const g3 = row(t('s.aimAssist'), toggle('gpAssist', s.gpAssist)); bindToggle(g3, 'gpAssist');
      const g4 = row(t('s.vibration'), toggle('gpVibration', s.gpVibration)); bindToggle(g4, 'gpVibration');

      // §62.4 TOUCH (v1.54): M9 sens + numerics overrides — official defaults live in
      // CFG.TOUCH; these settings apply live via applySettings → applyInputSettings
      // (defaults == official numbers == legacy behavior byte-identical).
      const tk1 = row(t('s.touchSens'), slider('touchSens', 0.2, 3.0, 0.05, v => (+v).toFixed(2)), t('s.touchSensDesc'));
      bindSlider(tk1, 'touchSens', v => (+v).toFixed(2));
      const tk2 = row(t('s.touchStickDead'), slider('touchStickDead', 0, 0.5, 0.01, v => (+v).toFixed(2)), t('s.touchStickDeadDesc'));
      bindSlider(tk2, 'touchStickDead', v => (+v).toFixed(2));
      const tk3 = row(t('s.touchLookDead'), slider('touchLookDead', 0, 20, 1, v => String(Math.round(+v))), t('s.touchLookDeadDesc'));
      bindSlider(tk3, 'touchLookDead', v => String(Math.round(+v)));
      const tk4 = row(t('s.touchHybridDrag'), slider('touchHybridDrag', 0, 80, 2, v => String(Math.round(+v))), t('s.touchHybridDragDesc'));
      bindSlider(tk4, 'touchHybridDrag', v => String(Math.round(+v)));

      const rrow = row(t('s.restore'), `<button class="seg-btn" id="set-ctl-reset">${t('s.resetCtl')}</button>`, t('s.resetCtlDesc'));
      rrow.querySelector('#set-ctl-reset').onclick = () => {
        s.binds = mergeBinds();                 // per-action defaults
        s.padBinds = { ...PAD_BINDS };
        s.aimMode = DEFAULT_SETTINGS.aimMode;
        s.gpLookDeadzone = DEFAULT_SETTINGS.gpLookDeadzone;
        s.touchSens = DEFAULT_SETTINGS.touchSens; s.touchStickDead = DEFAULT_SETTINGS.touchStickDead; // §62.4 (v1.54): TOUCH section joins the restore law
        s.touchLookDead = DEFAULT_SETTINGS.touchLookDead; s.touchHybridDrag = DEFAULT_SETTINGS.touchHybridDrag;
        s.gyroAim = DEFAULT_SETTINGS.gyroAim; s.gyroSens = DEFAULT_SETTINGS.gyroSens; s.aimCurve = DEFAULT_SETTINGS.aimCurve; // [T90 merge] M8: beyond-buttons join the restore law
        s.touchLayout = DEFAULT_SETTINGS.touchLayout;
        s.fireAuto = DEFAULT_SETTINGS.fireAuto; s.touchAssist = DEFAULT_SETTINGS.touchAssist; // [T90 fix] MOBILE toggles join the restore law (p2 audit: they had no reset path short of store wipe)
        applyInputSettings(s); this.deps.settingsChanged();
        this.renderSettingsTab('controls'); this.setMsg(t('s.resetDone')); SFXtick();
      };
    }
    if (tab === 'online') {
      // ---- T2-7 (Task 43): region selection — spec §27. Honest fleet (§27.1): this
      // deployment's real topology + a validated custom endpoint (no fabricated geo-rows);
      // live ping rides the EXISTING unguarded server ping/pong handler (§27.2) injected
      // as deps.mpPingRegion/resolveRegion — ui.js stays decoupled from the net stack.
      const cur = MP_REGIONS.find(r => r.id === s.mpRegion) ? s.mpRegion : 'auto';
      const labelOf = (id) => (MP_REGIONS.find(r => r.id === id) || MP_REGIONS[0]).label;
      const d1 = row(t('s.region'), seg('mpRegion', MP_REGIONS.map(r => r.label), labelOf(cur)), t('s.regionDesc'));
      d1.querySelectorAll('[data-seg=mpRegion]').forEach(b => b.onclick = () => {
        const hit = MP_REGIONS.find(x => x.label === b.dataset.v);
        s.mpRegion = hit ? hit.id : 'auto';
        d1.querySelectorAll('[data-seg=mpRegion]').forEach(x => x.classList.toggle('on', x === b));
        this.deps.settingsChanged(); SFXtick();
      });
      const d2 = row(t('s.customEndpoint'), `<input type="text" id="mp-region-url" value="${String(s.mpRegionUrl || '').replace(/"/g, '&quot;')}" placeholder="http://host:3010" spellcheck="false" class="soc-in" style="max-width:300px;letter-spacing:.04em">`, t('s.customEndpointDesc')); // [T123] the theme class owns the input skin
      d2.querySelector('#mp-region-url').oninput = (e) => { s.mpRegionUrl = e.target.value; this.deps.settingsChanged(); };
      const d3 = row(t('s.pingRegions'), `<button class="seg-btn" id="mp-ping-btn">${t('s.pingBtn')}</button>`, t('s.pingDesc'));
      const res = document.createElement('div'); res.className = 'set-note'; res.style.minWidth = '100%';
      body.appendChild(res);
      d3.querySelector('#mp-ping-btn').onclick = () => {
        const btn = d3.querySelector('#mp-ping-btn'); btn.disabled = true;
        // auto pings the gateway (the production endpoint itself); custom only when valid (§27.4 truth table)
        const targets = [
          { id: 'auto', label: labelOf('auto'), url: CFG.MP.server },
          { id: 'direct', label: labelOf('direct'), url: 'http://' + location.hostname + ':3010' },
        ];
        const cv = this.deps.resolveRegion(s, location.hostname);
        if (s.mpRegion === 'custom' || (typeof s.mpRegionUrl === 'string' && s.mpRegionUrl.trim())) targets.push({ id: 'custom', label: labelOf('custom'), url: cv.fellBack ? null : cv.url });
        let pending = targets.length;
        res.innerHTML = targets.map(t => `<div data-ping="${t.id}">${t.label} — …</div>`).join('');
        targets.forEach((t) => {
          const el = res.querySelector(`[data-ping="${t.id}"]`);
          if (!t.url) { el.textContent = t.label + ' — ' + t('s.invalidUrl'); pending--; return; }
          this.deps.mpPingRegion(t.url, { onDone: (out) => {
            el.textContent = t.label + ' — ' + (out.median != null ? Math.round(out.median) + ' ms (' + out.samples.length + '/5)' : t('s.unreachable'));
            if (--pending <= 0) btn.disabled = false;
          } });
        });
      };
      // [T140 A5] THE GO-LIVE FACE — the seller's last mile is CONFIG + SECRETS; this panel says
      // exactly which one is unset (the "add account ID" turnkey). Reads CFG.PAY (client truth)
      // + the hub's /healthz headers (server truth). No secret values are EVER displayed —
      // faces only (the privacy law). Unreachable hub = the honest offline face.
      const gl = document.createElement('div'); gl.className = 'set-note'; gl.style.minWidth = '100%'; gl.style.marginTop = '8px';
      const payCfg = CFG.PAY || {};
      const glMiss = ['p1', 'p2', 'p3', 'p4', 'p5'].filter(k => !payCfg.checkout || !payCfg.checkout[k]);
      const glRow = (k, v) => '<div style="margin-top:3px"><b>' + k + '</b> — ' + v + '</div>';
      gl.innerHTML = '<div class="map-row-head"><b>GO-LIVE (SELLER)</b></div>' +
        glRow('CHECKOUT', payCfg.enabled ? '<span style="color:#7ed49a">ARMED</span> — real hosted checkout live' : '<span style="color:#e8b64c">SANDBOX</span>' + (glMiss.length ? ' — paste ' + glMiss.join(', ') + ' into js/config.js \u2192 CFG.PAY.checkout, then set enabled = true' : ' — CFG.PAY.enabled = true is the only step left')) +
        glRow('LS REDEEM', payCfg.lsRedeem ? '<span style="color:#7ed49a">ARMED</span>' : 'off — optional; the armed webhook arc auto-credits accounts (docs/PAYMENTS.md)') +
        '<div data-gl-hub style="margin-top:3px"><b>HUB</b> — checking…</div>';
      body.appendChild(gl);
      (() => { // the healthz probe — the headers carry the server truth ([T140] additive, zero-break); [T141] the UNREACHABLE face grows a CLICKABLE RETRY (the same suggestion law) and the probe re-runs itself
        const el = gl.querySelector('[data-gl-hub]');
        const glReg = this.deps.resolveRegion(s, location.hostname, location.protocol); // §27.4 truth table — [T114] the probe reads the SAME resolution the join path dials (the hub row rides; no second derivation to drift)
        const glBase = /^https?:\/\//.test(String(glReg.url)) ? glReg.url : CFG.MP.server;
        const probeHub = () => {
          const glCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const glTimer = glCtrl && setTimeout(() => glCtrl.abort(), 4000);
          const glUrl = String(glBase).replace(/\/+$/, '') + '/healthz'; // the mount-prefix law — '/room' + '/healthz' (a RELATIVE base would throw inside new URL and kill the tab render live-caught T140); an absolute region base carries its own /room mount
          fetch(glUrl, { signal: glCtrl ? glCtrl.signal : undefined }).then((r) => {
            if (glTimer) clearTimeout(glTimer);
            const h = (k) => (r.headers.get(k) || '').trim();
            el.innerHTML = '<b>HUB</b> — <span style="color:#7ed49a">REACHABLE</span>' + (h('x-iron-players') ? ' · players ' + h('x-iron-players') + ' · rooms ' + (h('x-iron-rooms') || '?') : '') +
              ' · WEBHOOK ' + (h('x-iron-ls-armed') === '1' ? '<span style="color:#7ed49a">ARMED</span>' : 'UNARMED (set IRON_LS_WEBHOOK_SECRET on the Space)') +
              ' · JOIN-PoW ' + (Number(h('x-iron-pow')) > 0 ? 'ARMED (' + h('x-iron-pow') + ' bits)' : 'off (IRON_POW)'); // the resolved face IS the auto-resolve (the T141 suggestion law — no stale warn survives a landed condition)
          }).catch(() => {
            el.innerHTML = '<b>HUB</b> — <span style="color:#e8b64c">UNREACHABLE</span> (the offline face; the shop legs state their own gates) ';
            const rb = document.createElement('button'); rb.className = 'seg-btn'; rb.textContent = t('on.retry'); rb.style.marginLeft = '6px';
            rb.onclick = () => { el.innerHTML = '<b>HUB</b> — checking…'; probeHub(); };
            el.appendChild(rb);
          });
        };
        el.innerHTML = '<b>HUB</b> — checking…';
        probeHub();
      })();
      // ---- T49 (Task 49, spec §33): SEASON LADDER — top-list over the server career store.
      // Read-only 'lb' query via deps.mpLeaderboard (same temp-connection pattern as the ping);
      // endpoint = the ACTIVE region resolution (the fleet the join path itself would use).
      // PRIVACY: rows carry no pids — names are rendered via textContent (no innerHTML for
      // user-controlled strings); your own row is server-stamped `you` / delivered as `self`.
      const d4 = row(t('s.ladder'), `<button class="seg-btn" id="mp-lb-btn">${t('s.fetchBtn')}</button>`, t('s.ladderDesc'));
      // [T139 G-LB] the SCOPE chips — ALL / FRIENDS / CLAN (the server 'lb' sc param; per-mode boards documented-out server-side, the honest call logged in GAP_LEDGER). The strip (page-main) stays ALL — the chips live on the ONLINE tab where identity exists.
      const lbScopes = [['ALL', 'rp'], ['FRIENDS', 'friends'], ['CLAN', 'clan']];
      this._lbScope = this._lbScope || 'rp';
      const lbSeg = document.createElement('div'); lbSeg.className = 'set-note'; lbSeg.style.minWidth = '100%';
      lbSeg.innerHTML = lbScopes.map(([l, sc]) => `<button class="seg-btn lb-sc" data-sc="${sc}" style="margin-right:6px;${this._lbScope === sc ? 'color:#e8b64c;border-color:rgba(232,182,76,.55)' : ''}">${l}</button>`).join('');
      body.appendChild(lbSeg);
      lbSeg.querySelectorAll('.lb-sc').forEach(b => b.onclick = () => {
        this._lbScope = b.dataset.sc;
        lbSeg.querySelectorAll('.lb-sc').forEach(x => { const on = x === b; x.style.color = on ? '#e8b64c' : ''; x.style.borderColor = on ? 'rgba(232,182,76,.55)' : ''; });
      });
      const lbRes = document.createElement('div'); lbRes.className = 'set-note'; lbRes.style.minWidth = '100%'; lbRes.style.display = 'none';
      body.appendChild(lbRes);
      d4.querySelector('#mp-lb-btn').onclick = () => {
        const btn = d4.querySelector('#mp-lb-btn'); btn.disabled = true;
        lbRes.style.display = 'block'; lbRes.textContent = t('s.fetching');
        const cv = this.deps.resolveRegion(s, location.hostname); // §27.4 truth table — same endpoint family the next join uses
        this.deps.mpLeaderboard(cv.url, { sc: this._lbScope, onDone: (out) => {
          btn.disabled = false;
          lbRes.textContent = '';
          this.renderLadderRows(lbRes, out); // §49.3: SHARED renderer (same rows as the page-main strip); errors reported here per §27.2 law
        }});
      };
      // ---- §53.7 (Task 74): ACCOUNT + QUICKPLAY + RANKED QUEUE rows (pre-join senders) ----
      const acct = document.createElement('div'); acct.className = 'set-note'; acct.style.minWidth = '100%'; acct.id = 'account-status';
      acct.textContent = this.auth ? ('ACCOUNT: ' + this.auth.name) : 'ACCOUNT: anonymous — register/login (server) unlocks the store, market, trades and clans';
      body.appendChild(acct);
      // ---- [T121 S-2] §53.7: the ACCOUNT FORM (the authRow() builder — shared with the
      // ONLINE hub). The sender (sendAuth), the response routing (mp.onAuth → setAuth →
      // persist → ui.onAuth) and the server ops (register/login/logout/me) all existed;
      // nothing called them — the HELP page promised "Create an account on the ONLINE tab"
      // with no form behind it. Validation is the SERVER's — the err map in onAuth surfaces
      // name/pass/taken/bad verbatim-honest; input maxLength mirrors the server constraints.
      body.appendChild(this.authRow());
      const aRow = row('PLAY WITH PEOPLE', `<button class="seg-btn" id="q-quick-btn">QUICKPLAY</button> <button class="seg-btn" id="q-rank-btn">JOIN RANKED QUEUE</button>`, 'QUICKPLAY drops you into the fullest open lobby; the ranked queue widens the bucket by RP tier as you wait (§30.8: RP is public rank, not hidden MMR).');
      body.appendChild(aRow);
      const quickB = aRow.querySelector('#q-quick-btn'); quickB.textContent = 'QUICKPLAY';
      quickB.onclick = () => { this.deps.sendQ({ op: 'quick', mode: 'ffa', tok: this.auth && this.auth.tok, pid: this.deps.devicePid() }); const q0 = aRow.querySelector('#q-status'); if (q0) q0.textContent = 'Finding the fullest open lobby…'; };
      const rankB = aRow.querySelector('#q-rank-btn'); rankB.textContent = 'JOIN RANKED QUEUE';
      rankB.onclick = () => { this.deps.sendQ({ op: 'rank', mode: 'tdm', tok: this.auth && this.auth.tok, pid: this.deps.devicePid() }); const q1 = aRow.querySelector('#q-status'); if (q1) q1.textContent = 'Ranked queue: bucketed by RP tier — widening with wait…'; };
      const qStat = document.createElement('div'); qStat.className = 'set-note'; qStat.style.minWidth = '100%'; qStat.id = 'q-status';
      qStat.textContent = 'Idle.';
      body.appendChild(qStat);
      // ---- §49.2 (Task 65 W2, rebuilt): REPLAY RECORDING toggle (default ON) + WATCH LAST REPLAY ----
      const recRow = row('REPLAY RECORDING', `<button class="seg-btn" id="rr-on">ON</button> <button class="seg-btn" id="rr-off">OFF</button>`, 'Records your multiplayer matches locally (transform replay — newest 20, 10-minute retention). WATCH REPLAY appears on the results screen after a recorded match.');
      body.appendChild(recRow);
      const setRec = (v) => { s.replayRec = v; recRow.querySelector('#rr-on').classList.toggle('on', v === true); recRow.querySelector('#rr-off').classList.toggle('on', v !== true); this.deps.settingsChanged(); };
      setRec(s.replayRec !== false); // default ON (config law); OFF = pre-T65 inert capture behavior
      recRow.querySelector('#rr-on').onclick = () => setRec(true);
      recRow.querySelector('#rr-off').onclick = () => setRec(false);
      const wlRow = row('REPLAYS', `<button class="seg-btn" id="watch-last-btn">WATCH LAST REPLAY</button>`, 'Boots the replay viewer on your newest local recording (?replay=1 — presentation only, no live stream, no career).');
      body.appendChild(wlRow);
      wlRow.querySelector('#watch-last-btn').onclick = () => this.deps.watchReplay();
      // ---- T115 G-2: KILLCAM toggle (default ON) — COD-style watch-the-kill rides the §26 capture ----
      const kcRow = row('KILLCAM', `<button class="seg-btn" id="kc-on">ON</button> <button class="seg-btn" id="kc-off">OFF</button>`, 'On death, watch the kill from the killer\'s point of view (rides the local replay capture — recording itself stays independent).');
      body.appendChild(kcRow);
      const setKc = (v) => { s.killcam = v; kcRow.querySelector('#kc-on').classList.toggle('on', v === true); kcRow.querySelector('#kc-off').classList.toggle('on', v !== true); this.deps.settingsChanged(); };
      setKc(s.killcam !== false); // default ON (config law); OFF = the orbit death cam, pre-G-2 behavior
      kcRow.querySelector('#kc-on').onclick = () => setKc(true);
      kcRow.querySelector('#kc-off').onclick = () => setKc(false);
    }
  }


  // ============================================================
  // §51.1 W4 — offline MAP picker (page-modes). Offline-only render; MP rooms use the
  // LOBBY MAP row (host-gated). 'any' = rotation cursor law preserved; a pinned roster
  // id rides main.js startMatch (pinned-pick law, §51.1).
  // ============================================================
  buildMapRow() {
    const rowEl = $('map-row');
    if (!rowEl) return;
    if (this.deps.mp && this.deps.mp()) return; // MP: the host picks via LOBBY MAP (§51.3)
    // [T117] the menu-parity decree: the raw <select> retires — the offline picker is now a
    // LIVE map rail under a big display panel (js/mapprev.js renders every roster stage
    // top-down from its OWN map json — the same data world.js builds from; never a static
    // asset). The CONTRACT is byte-preserved: settings.mapSelect ('any' | roster id) +
    // settingsChanged() on write, the tk-gated roster, the MP hide. Hover = display swap
    // ONLY (the ops-visual hover law — zero state writes); click = THE selection transform.
    rowEl.innerHTML = `<div class="map-row-head"><b>MAP</b><span class="set-note" style="margin:0">${Maps.roster.filter((m) => !m.tk).length + 1} SURFACES · HOVER = PREVIEW · CLICK = PIN</span></div><div class="map-display" id="map-display"></div><div class="rail-wrap"><button class="rail-arrow l" id="map-rail-l" aria-label="scroll left">◀</button><div class="rail map-rail" id="map-rail"></div><button class="rail-arrow r" id="map-rail-r" aria-label="scroll right">▶</button></div>`;
    rowEl.style.display = ''; // [T117] the shell ships the row veiled (index.html display:none) — the select-era un-hide law verbatim
    this._mapPick = (id) => { if (this.deps.settings.mapSelect === id) return; this.deps.settings.mapSelect = id; this.deps.settingsChanged(); this.renderMapRow(); SFXtick(); };
    this.renderMapRow();
  }
  renderMapRow() { // [T117] the map rail body — cards + display re-derive from the SAME state (the renderMissions window-fresh idiom)
    const rail = $('map-rail'); if (!rail) return;
    const roster = Maps.roster.filter((m) => !m.tk); // [T110] the tk-gated stages stay OUT (the select-era law verbatim)
    const cur = roster.some((m) => m.id === this.deps.settings.mapSelect) ? this.deps.settings.mapSelect : 'any';
    const card = (id, name) => `<button class="map-card ${cur === id ? 'on' : ''}" data-map="${id}"><span class="map-card-face"></span><span class="map-card-name">${name}<span class="map-card-state">${cur === id ? 'PINNED' : ''}</span></span></button>`;
    rail.innerHTML = card('any', 'ANY') + roster.map((m) => card(m.id, m.name)).join('');
    rail.querySelectorAll('.map-card').forEach((b) => {
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200;
      b.querySelector('.map-card-face').appendChild(cv);
      const id = b.dataset.map;
      if (id === 'any') drawAnyPreview(cv);
      else mapData(id).then((d) => drawMapPreview(cv, d)).catch(() => drawAnyPreview(cv)); // live data or the rotation glyph — never a broken card
      b.onclick = () => this._mapPick && this._mapPick(id);
      b.addEventListener('mouseenter', () => this.mapDisplayShow(id)); // display swap only — the hover law
    });
    $('map-rail-l').onclick = () => rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' });
    $('map-rail-r').onclick = () => rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' });
    this.mapDisplayShow(cur);
  }
  mapDisplayShow(id) { // [T117] the big display panel — LIVE art + data faces, zero selection writes
    const disp = $('map-display'); if (!disp) return;
    const m = Maps.roster.find((x) => x.id === id);
    const pinned = (this.deps.settings.mapSelect || 'any') === id;
    disp.innerHTML = `<div class="map-display-art"></div><div class="map-display-info"><div class="map-display-rule"></div><div class="map-display-name">${m ? m.name : 'ANY'}</div><div class="map-display-desc">${m ? m.desc : 'ROTATION — the roster cycles; the boot map opens the session.'}</div><div class="map-display-meta"><span class="rw-chip">${m ? 'STAGE' : 'ROTATION'}</span><span class="rw-chip">${pinned ? 'PINNED' : 'PREVIEW'}</span><span class="rw-chip">${m ? m.id.toUpperCase() : Maps.nameOf('outpost').toUpperCase() + ' OPENS'}</span></div></div>`;
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
    disp.querySelector('.map-display-art').appendChild(cv);
    if (m) mapData(m.id).then((d) => drawMapPreview(cv, d)).catch(() => drawAnyPreview(cv));
    else drawAnyPreview(cv);
  }

  // ============================================================
  // §52.1 S1 — MATCH HISTORY page (newest-20 local IDB; names/modes rendered via
  // textContent — XSS-safe by construction, same law as the ladder table).
  // ============================================================
  renderHistory() {
    const el = $('history-list');
    if (!el) return;
    const meta = $('hist-meta'); // [T125] the band summary face (the bp-balance idiom) — the Valorant Career Summary law rides the identity band (shs_04: "The Progression, Summary, and Timeline tabs now have an updated layout")
    el.textContent = 'Loading…';
    histList().then((rows) => {
      el.textContent = '';
      if (meta) meta.textContent = rows && rows.length ? (rows.length + ' MATCHES · ' + rows.filter((r) => r.win).length + ' WINS') : '';
      if (!rows || !rows.length) {
        const d = document.createElement('div'); d.className = 'set-note';
        d.textContent = 'No matches recorded yet — finish a match and it lands here (newest 20, stored locally).';
        el.appendChild(d); return;
      }
      // [T125] the researched match-row voice (shs_03 tracker.gg "you can click on any match to get a detailed" per-match anatomy → result-accented rows; shs_04 spikestats "an easy-to-swipe layout organized by game modes" → the la-title first-appearance mode grouping, the T117/T124 idiom, mode data raw; shs_05 "two sets of numbers (kills, damage dealt)" → the stats leg rides the row). Newest-first unchanged; textContent-only (the ladder-table law).
      let last = '';
      for (const r of rows) {
        const mode = (r.mode || '').toUpperCase();
        if (mode && mode !== last) {
          last = mode;
          const h = document.createElement('div'); h.className = 'la-title hist-group'; h.textContent = mode;
          el.appendChild(h);
        }
        const row = document.createElement('div'); row.className = 'hist-row hist-card ' + (r.win ? 'win' : 'loss'); // the W/L accent = .res-team.t0/t1 token idiom · [T117] the card spine joins (hist-card grammar)
        const res = document.createElement('span'); res.className = 'hist-res'; res.textContent = r.win ? 'WIN' : 'LOSS';
        const map = document.createElement('span'); map.className = 'hist-map'; map.textContent = (r.map || '').toUpperCase();
        const st = document.createElement('span'); st.className = 'hist-stats'; st.textContent = String(r.k || 0) + ' K / ' + String(r.d || 0) + ' D · ' + String(r.score || 0) + ' PTS';
        const when = document.createElement('span'); when.className = 'hist-when'; when.textContent = new Date(r.t).toLocaleString();
        row.append(res, map, st, when);
        el.appendChild(row);
      }
    }).catch(() => { el.textContent = 'History unavailable (storage blocked).'; });
  }

  // §52.5 S5 — DAILY chip (career strip): label + progress + DONE + lifetime count.
  dailyChip(c) {
    const today = new Date().toISOString().slice(0, 10);
    const ch = dailyFor(today);
    const st = c && c.daily && c.daily.d === today ? c.daily : { p: 0, done: false };
    const accV = (c && c.acc) || 0;
    const shown = ch.metric === 'acc40' ? accV : (st.p || 0);
    const target = ch.metric === 'acc40' ? 40 : ch.n;
    const pct = Math.min(100, Math.round((shown / target) * 100));
    const state = st.done ? 'DONE' : (shown >= target ? 'READY' : pct + '%');
    return `<div id="chip-daily" title="${ch.label}" style="cursor:pointer">DAILY <b>${ch.label}</b> <b>${state}</b> · lifetime ${((c && c.dailyDone) || 0)}</div>`; // [v1.50 port T90] §56.1: chip is the missions-page link (wired by the career-strip delegation)
  }

  // ============================================================
  // §53.2/§53.3 P2 — SHOP (store/cases/market/trades) + SOCIAL hub renderers.
  // EVERYTHING renders SERVER truth (ecoState/socialState pushes); user-controlled
  // strings go through textContent (the ladder-table law).
  // ============================================================
  renderShop() {
    const el = $('shop-body');
    if (!el) return;
    el.textContent = '';
    if (!this.deps.mp || !this.deps.mp()) {
      // [T119 S-1] the offline store face — the CR half banks LOCALLY (the renderBundles idiom:
      // career.cr debit + the cosOwned grant — the claimed leg of the §53.2 ∪ law, so every
      // loadout picker lights up offline with zero picker changes); cases/market/trades/tokens
      // stay honest-gated (server single-truth: escrow, dupes, p2p, the non-refundable PSP arc);
      // the CLAIM button states its gates instead of dropping silently (sendEco is `if (socket)`
      // — the S-1 finding; the claim is account-side by design, never double-credited locally).
      const career = this.deps.career;
      career.cosOwned = (career.cosOwned && typeof career.cosOwned === 'object') ? career.cosOwned : {};
      const bnSet0 = metagame.bundleOwnedItems(career.bn);
      const meta = $('shop-meta'); // [T125] the CR/inventory face MOVED verbatim to the band (the online-meta idiom)
      if (meta) meta.textContent = 'CR ' + (career.cr | 0) + ' · inventory ' + (Object.keys(career.cosOwned).length + bnSet0.size) + ' item(s)';
      const grid = document.createElement('div'); grid.className = 'item-grid'; // [T117] the text-button row retires — the store is CARDS: rarity art face + price chip + owned badge (the same acquire law underneath)
      for (const it of ECO_POOL) {
        const owned = career.cosOwned[it.id] > 0 || bnSet0.has(it.id);
        const price = ECO_PRICE[it.r] || 0;
        const b = document.createElement('button');
        b.className = 'item-card'; b.style.setProperty('--r', R_HEX[it.r] || R_HEX.common);
        b.innerHTML = `<span class="item-card-art"><span class="item-card-glyph">${R_INIT(it.label)}</span></span><span class="item-card-body"><span class="item-card-name">${it.label}</span><span class="item-card-row"><span class="item-card-rar">${(it.r || '').toUpperCase()}</span><span class="item-card-price">${price} CR</span></span></span>` + (owned ? '<span class="item-card-badge">OWNED</span>' : '');
        // [T136] the affordability gate SPEAKS — a disabled card cannot even carry a click (the user's "no response" report, part 1: a fresh 0-CR profile saw the whole store dead with zero feedback). The card stays clickable and states the gate + the earn path instead.
        b.onclick = () => {
          if (owned) return;
          if ((career.cr | 0) < price) { this.toast('NEEDS ' + price.toLocaleString('en-US') + ' CR — you have ' + (career.cr | 0).toLocaleString('en-US') + '. Earn CR by playing: wins pay ' + ECO_EARN.base + ' base +' + ECO_EARN.kill + ' per kill +' + ECO_EARN.win + ' per win.'); return; }
          career.cr -= price;
          career.cosOwned[it.id] = 1;
          saveCareer(career); this.buildCareerStrip(); this.renderShop(); SFXtick();
          this.setMsg(it.label + ' acquired — equip it in LOADOUT.');
        };
        grid.appendChild(b);
      }
      el.appendChild(grid);
      const note = document.createElement('div'); note.className = 'set-note'; note.style.marginTop = '10px';
      note.textContent = 'The store above banks on this device (the BUNDLES economy) — ownership rides every loadout picker. Cases, market and trades need the room service (the hub). TOKEN PACKS below work right here — the zero-backend arc: real checkout or the sandbox browser wallet.'; // [T136] the note tells the truth about the face it ships in — the packs ARE reachable offline now
      el.appendChild(note);
      const gates = document.createElement('div'); gates.className = 'set-note'; gates.style.marginTop = '6px';
      gates.textContent = 'FREE CR CLAIM: level ' + ECO_CLAIM.lvl + ' · at least ' + ECO_CLAIM.minMatches + ' match · every ' + ECO_CLAIM.hours + 'h — credits when you play connected (the claim is account-side).';
      el.appendChild(gates);
      const claimOff = $('btn-shop-claim'); if (claimOff) { claimOff.disabled = true; claimOff.title = 'Needs a connected account — see the gates above'; }
      const tkh = document.createElement('div'); tkh.className = 'la-title'; tkh.style.marginTop = '16px'; tkh.textContent = 'TOKEN PACKS'; // [T136] the OFFLINE face carries the packs — the fundraise-demo arc lives on the plain URL (no ?mp=1 needed); the same renderTokensTab the online tab uses
      el.appendChild(tkh);
      this.renderTokensTab(el, this.eco || { cr: 0, own: {}, out: [], inbox: [], market: [] });
      return;
    }
    const claimOn = $('btn-shop-claim'); if (claimOn) { claimOn.disabled = false; claimOn.title = ''; } // [T119 S-1] the offline face disables it — the online face MUST re-enable (the static markup persists)
    const eco = this.eco || { cr: 0, own: {}, out: [], inbox: [], market: [] };
    const meta = $('shop-meta'); // [T125] the band face — the CR/TK/inventory line MOVED verbatim from the retired in-body note (the [T110] TK leg rides; the bp-balance idiom)
    if (meta) meta.textContent = 'CR ' + (eco.cr | 0) + ' · TK ' + (eco.tk | 0) + ' · inventory ' + Object.keys(eco.own || {}).length + ' item(s)';
    // [T125] the featured-first spotlight (shs_00 callofduty.com "Featured Bundles and Bundles Tabs. These showcase the most popular store Bundles, along with how many days the Bundle is available, the price"; shs_00 codmwstore "Featured Spotlight"; shs_02 the Apex "main section, called Featured" law) — it LEADS the page and navigates the EXISTING rail (display-only, zero new flows); its faces are the case product's own literals verbatim.
    const feat = document.createElement('button'); feat.className = 'shop-feat';
    const ft = document.createElement('span'); ft.className = 'shop-feat-t'; ft.textContent = 'CASES';
    const fd = document.createElement('span'); fd.className = 'shop-feat-d'; fd.textContent = 'OPEN CASE — 100 CR (dupe refunds 40 CR)';
    feat.append(ft, fd);
    feat.onclick = () => { this.shopTab = 'cases'; SFXtick(); this.renderShop(); };
    el.appendChild(feat);
    // [T125] the category rail (shs_00 tracker.gg "the Featured, Operators & Identity, and Blueprints categories") — the ops-tab token idiom; the same five tabs, the same handler.
    const bar = document.createElement('div'); bar.className = 'shop-tabs';
    for (const [id, label] of [['store', 'STORE'], ['cases', 'CASES'], ['market', 'MARKET'], ['trades', 'TRADES'], ['tokens', 'TOKENS']]) {
      const b = document.createElement('button');
      b.className = 'shop-tab' + (this.shopTab === id ? ' on' : '');
      b.textContent = label;
      b.onclick = () => { this.shopTab = id; SFXtick(); this.renderShop(); };
      bar.appendChild(b);
    }
    el.appendChild(bar);
    const grid = document.createElement('div'); grid.className = 'shop-grid';
    const tok = this.auth && this.auth.tok;
    if (this.shopTab === 'store') {
      for (const it of ECO_POOL) {
        const owned = (eco.own[it.id] || 0) > 0;
        const b = document.createElement('button');
        b.className = 'diff-btn'; b.style.minWidth = '150px';
        b.textContent = it.label + ' · ' + (it.r || '').toUpperCase() + ' · ' + (ECO_PRICE[it.r] || '?') + ' CR' + (owned ? ' · OWNED' : '');
        b.onclick = () => { if (owned || !this.ecoGate('STORE OFFLINE — the item store rides the hub; connect with an account (ONLINE tab).')) return; const pr = ECO_PRICE[it.r] || 0; if (((this.eco && this.eco.cr) | 0) < pr) { this.toast('NEEDS ' + pr.toLocaleString('en-US') + ' CR — you have ' + ((this.eco && this.eco.cr) | 0).toLocaleString('en-US') + '. Earn CR by playing: wins pay ' + ECO_EARN.base + ' base +' + ECO_EARN.kill + ' per kill +' + ECO_EARN.win + ' per win.'); return; } this.deps.sendEco({ op: 'buy', id: it.id, tok }); }; // [T135] the gate speaks (the silent-shop law) · [T137] the CR afford pre-empt states the earn path (never a blind fire into the server's reject)
        grid.appendChild(b);
      }
    } else if (this.shopTab === 'cases') {
      const b = document.createElement('button');
      b.className = 'diff-btn'; b.textContent = 'OPEN CASE — 100 CR (dupe refunds 40 CR)';
      b.onclick = () => { if (!this.ecoGate('STORE OFFLINE — cases ride the hub; connect with an account (ONLINE tab).')) return; if (((this.eco && this.eco.cr) | 0) < 100) { this.toast('NEEDS 100 CR — you have ' + ((this.eco && this.eco.cr) | 0).toLocaleString('en-US') + '. Earn CR by playing: wins pay ' + ECO_EARN.base + ' base +' + ECO_EARN.kill + ' per kill +' + ECO_EARN.win + ' per win.'); return; } this.deps.sendEco({ op: 'case', tok }); }; // [T135] · [T137] the CR afford pre-empt — the earn path speaks before the blind fire
      grid.appendChild(b);
    } else if (this.shopTab === 'market') {
      const list = eco.market || [];
      if (!list.length) { const d = document.createElement('div'); d.className = 'set-note'; d.textContent = 'Market is empty — list an inventory item to seed it.'; grid.appendChild(d); }
      for (const l of list) {
        const b = document.createElement('button');
        b.className = 'diff-btn'; b.style.minWidth = '170px';
        b.textContent = ((eco.names && eco.names[l.seller]) || l.sellerName || 'PILOT') + ' · ' + l.itemId + ' · ' + l.price + ' CR';
        b.onclick = () => { if (!this.ecoGate('STORE OFFLINE — the market rides the hub; connect with an account (ONLINE tab).')) return; if (((this.eco && this.eco.cr) | 0) < (l.price | 0)) { this.toast('NEEDS ' + (l.price | 0).toLocaleString('en-US') + ' CR — you have ' + ((this.eco && this.eco.cr) | 0).toLocaleString('en-US') + '. Earn CR by playing: wins pay ' + ECO_EARN.base + ' base +' + ECO_EARN.kill + ' per kill +' + ECO_EARN.win + ' per win.'); return; } this.deps.sendEco({ op: 'buyListing', lid: l.id, tok }); }; // [T135] · [T137] the CR afford pre-empt
        grid.appendChild(b);
      }
      const mine = eco.out || [];
      for (const l of mine) {
        const b = document.createElement('button');
        b.className = 'diff-btn';
        b.textContent = 'YOUR LISTING · ' + l.itemId + ' · ' + l.price + ' CR — UNLIST';
        b.onclick = () => { if (this.ecoGate('STORE OFFLINE — listings ride the hub; connect with an account (ONLINE tab).')) this.deps.sendEco({ op: 'unlist', lid: l.id, tok }); }; // [T135]
        grid.appendChild(b);
      }
    } else if (this.shopTab === 'tokens') { // [T110 T2-5] the TOKEN leg — [T136] the body lives in renderTokensTab (the OFFLINE face reuses it — the packs never needed the hub)
      this.renderTokensTab(el, eco);
    } else { // trades
      const inbox = eco.inbox || [];
      if (!inbox.length) { const d = document.createElement('div'); d.className = 'set-note'; d.textContent = 'No pending trades.'; grid.appendChild(d); }
      for (const o of inbox) {
        const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:6px;align-items:center';
        const lbl = document.createElement('span'); lbl.className = 'set-note';
        lbl.textContent = ((eco.names && eco.names[o.from]) || o.n || 'PILOT') + ': gives [' + (o.give || []).join(', ') + '] wants [' + (o.want || []).join(', ') + ']';
        const ok = document.createElement('button'); ok.className = 'diff-btn'; ok.textContent = 'ACCEPT';
        ok.onclick = () => { if (this.ecoGate('STORE OFFLINE — trades ride the hub; connect with an account (ONLINE tab).')) this.deps.sendEco({ op: 'respond', oid: o.id, accept: true, tok }); }; // [T135]
        const no = document.createElement('button'); no.className = 'diff-btn'; no.textContent = 'DENY';
        no.onclick = () => { if (this.ecoGate('STORE OFFLINE — trades ride the hub; connect with an account (ONLINE tab).')) this.deps.sendEco({ op: 'respond', oid: o.id, accept: false, tok }); }; // [T135]
        wrap.appendChild(lbl); wrap.appendChild(ok); wrap.appendChild(no);
        grid.appendChild(wrap);
      }
    }
    el.appendChild(grid);
  }

  confirmModal(titleKey, bodyKey, params, onYes) { // [T110] the FTC-clean confirm modal — the Pass N §2.3 boundary law (FTC v. Epic): non-refundable tokens require an EXPLICIT confirm + plain-language terms, no dark patterns. Generic — packs AND catalog spends share it. DOM overlay, not window.confirm.
    const old = document.getElementById('tk-confirm'); if (old) old.remove();
    const ov = document.createElement('div'); ov.id = 'tk-confirm';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,10,.78);z-index:400;display:flex;align-items:center;justify-content:center';
    const box = document.createElement('div');
    box.style.cssText = 'background:rgba(10,16,24,.96);border:1px solid rgba(255,90,60,.5);padding:22px 26px;max-width:420px;font:inherit;color:#dfe8f2';
    const h = document.createElement('div'); h.style.cssText = 'font-size:13px;letter-spacing:.14em;margin-bottom:10px;color:#ff5a3c'; h.textContent = t(titleKey);
    const b = document.createElement('div'); b.className = 'set-note'; b.style.marginBottom = '10px'; b.textContent = t(bodyKey, params);
    const terms = document.createElement('div'); terms.className = 'set-note'; terms.style.cssText = 'margin-bottom:14px;opacity:.75'; terms.textContent = t('tk.terms'); // the legal face — i18n'd ×9, EVERY purchase shows it
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px';
    const yes = document.createElement('button'); yes.className = 'diff-btn'; yes.textContent = t('tk.confirm');
    const no = document.createElement('button'); no.className = 'diff-btn'; no.textContent = t('tk.cancel');
    yes.onclick = () => { ov.remove(); onYes(); };
    no.onclick = () => ov.remove();
    row.appendChild(yes); row.appendChild(no);
    box.appendChild(h); box.appendChild(b); box.appendChild(terms); box.appendChild(row);
    ov.appendChild(box); document.body.appendChild(ov);
  }

  pwaRow() { // [T132-R] the PWA install row — the three honest states, zero fabrication:
    // (1) standalone-running: display-mode standalone || navigator.standalone (iOS)
    // (2) prompt-available: a captured beforeinstallprompt is pending → a real one-tap install
    // (3) manual hint: the browser menu path (iOS Safari / hardened configs — no beforeinstallprompt)
    const standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const box = document.createElement('div');
    const lab = document.createElement('div'); lab.className = 'la-title'; lab.textContent = t('s.pwaTitle');
    box.appendChild(lab);
    if (standalone) {
      const ok = document.createElement('div'); ok.className = 'set-note'; ok.textContent = t('s.pwaRunning');
      box.appendChild(ok);
    } else if (this._pwaPrompt) {
      const btn = document.createElement('button'); btn.className = 'diff-btn'; btn.textContent = t('s.pwaBtn');
      btn.onclick = async () => { const p = this._pwaPrompt; this._pwaPrompt = null; try { await p.prompt(); } catch { /* one-shot consumed — the hint face returns on re-render */ } };
      box.appendChild(btn);
    } else {
      const hint = document.createElement('div'); hint.className = 'set-note'; hint.textContent = t('s.pwaHint');
      box.appendChild(hint);
    }
    return box;
  }

  renderOnline() { // [T117] the CoD-2026-style top-level ONLINE hub — the multiplayer entry used to
    // live only in SETTINGS → ONLINE + the SOCIAL page; the playtest flagged it as invisible.
    // The wiring REUSES the proven senders verbatim (sendQ quick/rank rows + the ?mp= room
    // flows) — no new net paths, one visible face. Honest-fleet: the offline note states
    // exactly what connects when the room service is down.
    // [T124] the researched play-hub arrangement (research/pgx_00+01: the featured playlist
    // boxes LEAD — MW2019 quick play "the first box says 'Find A Match.' Next to it, a box
    // that says 'Filter'"; BO7 "Open, Standard, and Quick Play matchmaking" sections) —
    // matchmaking LEFT, private + account RIGHT (the T117 one-menu-one-purpose grouping);
    // the ACCOUNT face rides the identity band (the bp-balance idiom). Same ids/handlers.
    const el = $('online-body');
    if (!el) return;
    el.textContent = '';
    const online = !!(this.deps.mp && this.deps.mp());
    const live = !!(this.deps.mpLive && this.deps.mpLive()); // [T120 S-3] the note gate reads the CONNECTION truth, not the boot flag — a menu-side ensureIo connect retires it on re-render
    const meta = $('online-meta'); // [T124] the band context face — the ACCOUNT literal MOVED verbatim from the retired in-body head note
    if (meta) meta.textContent = this.auth ? ('ACCOUNT: ' + this.auth.name) : 'ACCOUNT: anonymous';
    const grid = document.createElement('div'); grid.className = 'onl-grid';
    const play = document.createElement('div'); play.className = 'onl-play';
    const side = document.createElement('div'); side.className = 'onl-side';
    const q = document.createElement('button'); q.className = 'onl-card'; // [T124] the featured-first playlist card (the "Find A Match" first box)
    const qt = document.createElement('span'); qt.className = 'onl-card-t'; qt.textContent = t('on.quick');
    const qd = document.createElement('span'); qd.className = 'onl-card-d'; qd.textContent = t('ix.onlineHint'); // the hub's own hint face rides the card
    q.append(qt, qd);
    q.onclick = () => this.onlineQueue('quick', t('on.quickWait')); // [T120 S-3] connect-on-demand — the first intent boots the transport
    const r = document.createElement('button'); r.className = 'onl-card'; // [T124] the box BESIDE the featured one (the researched pairing)
    const rt2 = document.createElement('span'); rt2.className = 'onl-card-t'; rt2.textContent = t('on.rank');
    const rd = document.createElement('span'); rd.className = 'onl-card-d'; rd.textContent = t('on.rankWait');
    r.append(rt2, rd);
    r.onclick = () => this.onlineQueue('rank', t('on.rankWait')); // [T120 S-3] same law, ranked row
    const qp = document.createElement('div'); qp.className = 'set-note'; qp.textContent = t('on.qpPref'); // the honest port-to-live preface sits under the playlist cards
    const stat = document.createElement('div'); stat.className = 'set-note'; stat.style.minHeight = '16px'; stat.id = 'online-status';
    play.append(q, r, qp, stat);
    // [T124] PRIVATE — the third matchmaking surface, one traversal deeper by the [T122] nesting decree (the location.href flows unchanged); the section faces reuse m.privateMatch/ix.account
    const prH = document.createElement('div'); prH.className = 'la-title'; prH.textContent = t('m.privateMatch');
    const c = document.createElement('button'); c.className = 'diff-btn'; c.textContent = t('on.create');
    c.onclick = () => { location.href = location.pathname + '?mp=1&priv=1'; };
    const ji = document.createElement('input'); ji.id = 'online-code';
    ji.placeholder = t('on.codePh'); ji.spellcheck = false;
    ji.className = 'soc-in'; // [T123] the theme class owns the input skin
    ji.style.cssText = 'width:9ch;letter-spacing:.3em;text-transform:uppercase;flex:0 0 auto';
    ji.addEventListener('input', () => { ji.value = ji.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }); // the social-page code law, same shape
    const jb = document.createElement('button'); jb.className = 'diff-btn'; jb.textContent = t('on.join');
    jb.onclick = () => { const code = ji.value.trim(); if (!/^[A-Z0-9]{6}$/.test(code)) { this.setOnlineMsg(t('m.enterCode'), true); return; } location.href = location.pathname + '?mp=1&code=' + code; };
    const row2 = document.createElement('div'); row2.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px';
    const orLbl = document.createElement('span'); orLbl.className = 'set-note'; orLbl.textContent = t('on.or');
    row2.append(c, orLbl, ji, jb);
    const accH = document.createElement('div'); accH.className = 'la-title'; accH.textContent = t('ix.account');
    side.append(prH, row2, accH, this.authRow()); // [T121 S-2] the §53.7 form rides the HUB — the face the HELP-page promise and the S-2 hint name (the settings ONLINE tab carries the same builder)
    side.appendChild(this.pwaRow()); // [T132-R] the platform row — three honest states (running / prompt / hint)
    if (!online && !live) {
      const d = document.createElement('div'); d.className = 'set-note';
      d.textContent = t('on.offline');
      side.appendChild(d);
    }
    if (!live && this.deps.resolveRegion) { // [T114] the honest static face — a same-origin mount has no room service on a static Space (the user's live report: every online click died at the dial); when the ACTIVE resolution is that mount, the tab says so and names the free fix (the "tell me how" ask, in the UI where the join dies). An absolute hub row / CUSTOM URL renders no note — nothing to confess.
      const rr = this.deps.resolveRegion(this.deps.settings, location.hostname, location.protocol);
      if (rr && !/^https?:\/\//.test(String(rr.url))) {
        const hn = document.createElement('div'); hn.className = 'set-note';
        hn.textContent = t('on.hostHub');
        side.appendChild(hn);
      }
    }
    grid.append(play, side);
    el.appendChild(grid);
  }
  setOnlineMsg(txt, warn, retry) { // [T141] the suggestion law — the user's own ask: a failed line carries a CLICKABLE fix (retry) and a warned line AUTO-RESOLVES the moment the underlying condition lands (mpLive flips true → the face re-renders honest; the line never stays stale-red)
    const s = $('online-status'); if (!s) return;
    s.textContent = txt || ''; s.style.color = warn ? '#e06c5a' : '#8fa3b8';
    if (this._statRetry) { this._statRetry.remove(); this._statRetry = null; }
    if (this._statWatch) { clearInterval(this._statWatch); this._statWatch = null; }
    if (retry && !(this.deps.mpLive && this.deps.mpLive())) { // the fail face carries its own fix — one click re-runs the flow (no dead-end status line)
      const chips = document.createElement('span'); chips.style.display = 'inline-flex'; chips.style.gap = '8px'; chips.style.marginLeft = '8px';
      const b = document.createElement('button'); b.className = 'seg-btn'; b.textContent = t('on.retry'); // the chip label: t() ×9 (the i18n law — no raw-EN chrome on this surface)
      b.onclick = () => { const reg = this.deps.resolveRegion(this.deps.settings, location.hostname); this.setOnlineMsg(t('on.connecting', { url: (reg || {}).url || '' })); retry(); };
      chips.appendChild(b);
      const cur = this.deps.settings && this.deps.settings.mpRegion; // [T114] the AUTO-RESOLVE chip — the user's own ask, upgraded: the fail face doesn't just re-dial the dead endpoint, it OFFERS the working one; one click flips mpRegion to the hub and the SAME retry closure re-resolves to it and re-runs the op (the region re-derives at every onlineQueue/authSend entry)
      const hubRow = MP_REGIONS.find(r => r.id === 'hub');
      if (cur !== 'hub' && hubRow && typeof hubRow.endpoint === 'string') {
        const hb = document.createElement('button'); hb.className = 'seg-btn'; hb.textContent = t('on.useHub');
        hb.onclick = () => { this.deps.settings.mpRegion = 'hub'; this.deps.settingsChanged(); this.setOnlineMsg(t('on.connecting', { url: hubRow.endpoint })); retry(); };
        chips.appendChild(hb);
      }
      s.appendChild(chips); this._statRetry = chips; // the auto-resolve watcher removes the WHOLE chip row (the mpLive law stays intact)
    } else if (warn && this.deps.mpLive) { // the auto-resolve watcher — 30 × 1 s, then it gives up quietly (a permanently-dead hub keeps the honest warn)
      let n = 0;
      this._statWatch = setInterval(() => {
        if (this.deps.mpLive()) {
          clearInterval(this._statWatch); this._statWatch = null;
          if (this._statRetry) { this._statRetry.remove(); this._statRetry = null; }
          const p = $('page-online'); if (p && !p.classList.contains('hidden')) this.renderOnline(); // the face re-reads mpLive — the fresh line states the truth
        } else if (++n > 30) { clearInterval(this._statWatch); this._statWatch = null; }
      }, 1000);
    }
  }

  onlineQueue(op, waitMsg) {
    if (op === 'quick') this.setOnlineMsg(t('on.qpPref')); // [T121] (6) the port-to-live preface — rank unaffected, mid-start join // [T120 S-3] connect-on-demand — the first queue intent boots the transport (the senders' `if (socket)` law meant every menu-side sendQ dropped silently), then the queue op rides the proven sender verbatim; unreachable endpoints REPORT on the status line, never throw (the §27.2 law)
    const pid = this.deps.devicePid && this.deps.devicePid();
    if (!pid) { this.setOnlineMsg(t('on.qPid'), true); return; }
    const reg = this.deps.resolveRegion(this.deps.settings, location.hostname);
    this.setOnlineMsg(t('on.connecting', { url: reg.url }));
    this.deps.ensureIo(this.deps.settings, ({ error }) => {
      if (error) { this.setOnlineMsg(t('on.connectFail', { url: reg.url }), true, () => this.onlineQueue(op, waitMsg)); return; } // [T141] the RETRY chip rides the fail face — the user's suggestion law
      this.renderOnline(); // the face re-reads mpLive — the offline note retires the moment the transport is real
      this.setOnlineMsg(waitMsg);
      this.deps.sendQ({ op, mode: op === 'rank' ? 'tdm' : 'ffa', tok: this.auth && this.auth.tok, pid });
    });
  }

  authSend(op, name, pass) { // [T121 S-2] the account form's send path — the onlineQueue idiom verbatim (pid check → resolveRegion → ensureIo → honest fail face), then the proven sender; the server's answer (tok or the err map) lands via onAuth
    const pid = this.deps.devicePid && this.deps.devicePid();
    if (!pid) { this.setOnlineMsg(t('on.qPid'), true); return; }
    const reg = this.deps.resolveRegion(this.deps.settings, location.hostname);
    this.setOnlineMsg(t('on.connecting', { url: reg.url }));
    this.deps.ensureIo(this.deps.settings, ({ error }) => {
      if (error) { this.setOnlineMsg(t('on.connectFail', { url: reg.url }), true, () => this.authSend(op, name, pass)); return; } // [T141] the RETRY chip (the same suggestion law on the auth arc)
      this.setOnlineMsg(t('on.authSent'));
      this.deps.sendAuth({ op, name, pass, pid });
    });
  }

  authRow() { // [T121 S-2] the §53.7 account form — ONE builder, two faces (the ONLINE hub + the SETTINGS → ONLINE section); anonymous → name/pass/REGISTER/LOG IN, authed → LOG OUT (logout rides a live transport — the honest need-live line otherwise)
    const wrap = document.createElement('div');
    if (!this.auth) {
      wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px;min-width:100%';
      const ni = document.createElement('input'); ni.id = 'auth-name'; ni.placeholder = t('on.authName'); ni.spellcheck = false; ni.maxLength = 16;
      ni.className = 'soc-in'; ni.style.flex = '1 1 16ch'; // [T123 G-7] the themed input class (the inline literals moved to style.css — the native-skin single-truth law)
      const pi = document.createElement('input'); pi.id = 'auth-pass'; pi.placeholder = t('on.authPass'); pi.type = 'password'; pi.maxLength = 72;
      pi.className = 'soc-in'; pi.style.flex = '1 1 14ch';
      const rb = document.createElement('button'); rb.className = 'diff-btn'; rb.textContent = t('on.authRegister');
      const lb = document.createElement('button'); lb.className = 'diff-btn'; lb.textContent = t('on.authLogin');
      rb.onclick = () => this.authSend('register', ni.value.trim(), pi.value);
      lb.onclick = () => this.authSend('login', ni.value.trim(), pi.value);
      wrap.append(ni, pi, rb, lb);
    } else {
      const lo = document.createElement('button'); lo.className = 'diff-btn'; lo.textContent = t('on.authLogout'); lo.style.marginTop = '6px';
      lo.onclick = () => { if (!this.deps.mpLive || !this.deps.mpLive()) { this.setOnlineMsg(t('on.authNeedLive'), true); return; } this.deps.sendAuth({ op: 'logout', tok: this.auth.tok }); };
      wrap.appendChild(lo);
    }
    return wrap;
  }

  // ---------- [T122] (7) ACCOUNT page — the account surfaces AGGREGATED ----------
  // NO new server ops (register/login/logout/me existed §53.6) and NO new state: the
  // identity card reads auth/mpProfile/eco (the same truths the identity corner reads),
  // the session block REUSES authRow() (its THIRD face: online hub, settings→online,
  // account) and the danger zone clears LOCAL data only (arm-then-confirm, then reload).
  buildAccount() {
    const body = $('account-body'); if (!body) return;
    body.innerHTML = '';
    const a = this.auth, p = this.mpProfile, c = this.deps.career || {};
    const pid = this.deps.devicePid ? (this.deps.devicePid() || '') : '';
    const lvl = p ? p.lvl : (c.lvl || 1); // the mpProfile truth leads; the device career backs it (the social-band idiom)
    const tile = (lab, v) => `<div class="stat-tile"><div class="st-big">${v}</div><div class="st-lab">${lab}</div></div>`; // [T117] the career stat-tile grammar verbatim
    // [T120] the parity-pass-II decree: the stacked set-row text retires — the identity DISPLAY
    // (procedural portrait bust + big name face, the T117 ops grammar) + big-number STAT TILES.
    // The session panel + authRow third face + the arm-then-confirm danger zone ride verbatim.
    const card = document.createElement('div'); card.className = 'priv-panel acc-hero';
    card.innerHTML = `<div class="acc-id"><span class="acc-bust"><span class="op-tile-face" style="--op-accent:#e8b64c"><span class="op-vis"></span><span class="op-sh"></span><span class="op-init">${(a ? a.name : 'O')[0].toUpperCase()}</span></span></span><div class="acc-id-body"><div class="acc-name">${a ? a.name : t('ac.anon')}</div><div class="acc-sub">${t('m.level').toUpperCase()} ${p ? (p.lvl + (p.pr ? ' · P' + p.pr : '')) : '—'} · ${t('ac.pid')} ${pid ? String(pid).slice(0, 10) + '…' : '—'}</div></div></div>`
      + `<div class="stat-tiles">` + tile(t('m.level'), lvl) + tile('CR', (this.eco && this.eco.cr) || 0) + tile('MATCHES', c.matches || 0) + `</div>`;
    body.appendChild(card);
    const sess = document.createElement('div'); sess.className = 'priv-panel';
    sess.innerHTML = `<div class="map-row-head"><b>${t('ac.session')}</b></div><div class="set-note" style="margin-bottom:4px">${a ? a.name : t('ac.notSigned')}</div>`;
    sess.appendChild(this.authRow()); // [T122] the shared §53.7 form rides the account face
    body.appendChild(sess);
    const dz = document.createElement('div'); dz.className = 'priv-panel';
    dz.innerHTML = `<div class="map-row-head"><b>${t('ac.danger')}</b></div><button class="diff-btn" id="acc-reset">${t('ac.resetLocal')}</button><div class="set-note" style="margin-top:6px">${t('ac.resetDesc')}</div>`;
    body.appendChild(dz);
    const rb = dz.querySelector('#acc-reset');
    rb.onclick = () => { // arm-then-confirm — a single click never destroys local data
      if (rb.dataset.armed !== '1') { rb.dataset.armed = '1'; rb.textContent = t('ac.resetArm'); rb.style.color = 'var(--bad)'; return; }
      try { localStorage.clear(); } catch (_) {}
      location.reload();
    };
    const nav = document.createElement('div'); nav.style.cssText = 'display:flex;gap:10px;margin-top:12px';
    nav.innerHTML = `<button class="diff-btn" id="acc-career">${t('ac.careerGo')}</button><button class="diff-btn" id="acc-back">◀ BACK</button>`;
    body.appendChild(nav);
    nav.querySelector('#acc-career').onclick = () => { SFXtick(); this.show('page-career'); };
    nav.querySelector('#acc-back').onclick = () => { SFXtick(); this.goBack(); };
  }

  queueStatus(d) { // [T120 S-3] the queue-response mirror (mp.onQueueUi) — acks/errors land on the hub status line; pop/quick acks navigate via the existing §53.4 law
    if (!d) return;
    if (d.err === 'pid') this.setOnlineMsg(t('on.qPid'), true);
    else if (d.err) this.setOnlineMsg(t('on.qErr', { err: String(d.err) }), true);
    else if (d.op === 'rank' && typeof d.pos === 'number') this.setOnlineMsg(t('on.rankPos', { pos: d.pos }));
  }

  renderSocial() {
    const el = $('social-body');
    if (!el) return;
    el.textContent = '';
    const live = !!(this.deps.mpLive && this.deps.mpLive()); // [T121 S-2] the note gate reads the CONNECTION truth (the T120 law) — a menu-side ensureIo connect retires this face on re-render
    if ((!this.deps.mp || !this.deps.mp()) && !live) {
      // [T121 S-2] the offline social face — the LOCAL identity card (device pid + the career
      // truth the room service binds to an account), the honest unlock list (friends/clans/
      // trades are server single-truth: presence, escrow, p2p — and sendSoc is `if (socket)`,
      // the S-1 finding, so nothing mirrors locally) + the connection hint. Raw-EN set-note
      // idiom: this branch family is the §53.2 EN island (the T119 S-1 precedent).
      const career = this.deps.career || {};
      const pid = this.deps.devicePid && this.deps.devicePid();
      const who = (this.auth && this.auth.name) || (pid ? 'pid ' + pid.slice(0, 8) : 'anonymous (no device identity — reload once)');
      const meta = $('soc-meta'); // [T125] the identity line MOVED verbatim to the band (the online-meta idiom)
      if (meta) meta.textContent = 'OPERATOR: ' + who + ' · level ' + (career.lvl || 1) + ' · ' + (career.cr | 0) + ' CR · ' + (career.matches || 0) + ' match(es)';
      const unl = document.createElement('div'); unl.className = 'set-note'; unl.style.marginTop = '6px';
      unl.textContent = 'Friends, clans and trades are server truth — this device keeps only your identity and career. FRIENDS: add by exact name. CLAN: create costs 500 CR, joining needs level 10. TRADES: up to 5 items per side.';
      const hint = document.createElement('div'); hint.className = 'set-note'; hint.style.marginTop = '6px';
      hint.textContent = 'Connect on the ONLINE tab: QUICKPLAY connects this device on intent; REGISTER / LOG IN there binds your account to this device (the device career merges once, server-side).';
      // [T120] the offline face rides the panel grammar — the notes read inside a card, not bare
      const off = document.createElement('div'); off.className = 'priv-panel';
      off.innerHTML = `<div class="map-row-head"><b>SOCIAL</b><span class="set-note">SERVER TRUTH</span></div>`;
      off.appendChild(unl); off.appendChild(hint);
      el.appendChild(off);
      return;
    }
    const s = this.social || { friends: [], reqsIn: [], clan: null };
    const tok = this.auth && this.auth.tok;
    // [T123 G-7] the live clan face — structure inherited from THIS page's own anatomy
    // (set-note lines · flex-wrap rows · diff-btn controls · the authRow input-row form),
    // skinned by the .soc-* token classes (style.css). The blocking prompt/confirm dialog
    // foreign look is retired: create/join ride inline forms, leave is a two-step button, the
    // owner's member list carries KICK and the join requests carry ACCEPT/DENY — all
    // speaking the server's own ops (clanCreate/clanJoinReq/clanResp/clanKick/clanLeave).
    const meta = $('soc-meta'); // [T125] the band identity face (the online-meta idiom) — 'OPERATOR: ' rides the offline face's own literal
    if (meta) meta.textContent = this.auth ? ('OPERATOR: ' + this.auth.name) : 'OPERATOR: anonymous';
    const st = document.createElement('div'); st.id = 'soc-status'; st.className = 'soc-status' + (this._socBad ? ' bad' : ''); // the ack/err line (the setOnlineMsg T121 idiom — this page's own element)
    st.textContent = this._socMsg || '';
    el.appendChild(st);
    const clearMsg = () => { this._socMsg = ''; this._socBad = false; };
    // [T125] the top-bar tab law (shs_06 IGN "Select the Friends tab from the top bar menu"; GameSpot Vanguard "go to the Clan tab") — the ops-tab count idiom; the pley.gg separation law keeps the status line ABOVE the rail. The clan head retires into its tab's face VERBATIM (t('clan.head') / clan.none); the friends head (fr.head) retires into its tab's face VERBATIM.
    this.socTab = this.socTab === 'clan' ? 'clan' : 'friends';
    const tabs = document.createElement('div'); tabs.className = 'soc-tabs';
    const tabClan = document.createElement('button'); tabClan.className = 'soc-tab' + (this.socTab === 'clan' ? ' on' : '');
    tabClan.textContent = s.clan ? t('clan.head', { t: s.clan.tag, n: s.clan.name, c: (s.clan.members || []).length }) : t('clan.none');
    tabClan.onclick = () => { this.socTab = 'clan'; SFXtick(); this.renderSocial(); };
    const tabFr = document.createElement('button'); tabFr.className = 'soc-tab' + (this.socTab !== 'clan' ? ' on' : '');
    tabFr.textContent = t('fr.head', { c: (s.friends || []).length });
    tabFr.onclick = () => { this.socTab = 'friends'; SFXtick(); this.renderSocial(); };
    tabs.append(tabClan, tabFr);
    el.appendChild(tabs);
    if (this.socTab === 'clan') { // [T125] the CLAN tab — the T123 G-7 anatomy byte-verbatim inside the tab
      const note = document.createElement('div'); note.className = 'set-note'; note.textContent = t('clan.note');
      const grid = document.createElement('div'); grid.className = 'soc-body';
      if (!s.clan) {
      const ci = document.createElement('input'); ci.className = 'soc-in'; ci.placeholder = t('clan.namePh'); ci.spellcheck = false; ci.maxLength = 18; ci.style.flex = '1 1 16ch';
      const tg = document.createElement('input'); tg.className = 'soc-in'; tg.placeholder = t('clan.tagPh'); tg.spellcheck = false; tg.maxLength = 4; tg.style.flex = '0 1 9ch'; tg.style.textTransform = 'uppercase';
      const cb = document.createElement('button'); cb.className = 'diff-btn'; cb.textContent = t('clan.create');
      cb.onclick = () => { const name = ci.value.trim(); const tag = tg.value.trim().toUpperCase(); if (!name) { this.setSocMsg(t('soc.e.name'), true); return; } if (!tag) { this.setSocMsg(t('soc.e.tag'), true); return; } clearMsg(); this.deps.sendSoc({ op: 'clanCreate', name, tag, tok }); }; // [T123 E2E] the gate names the EMPTY field (the combined face blamed the name for an empty tag)
      const cf = document.createElement('div'); cf.className = 'soc-row'; cf.append(ci, tg, cb);
      const ji = document.createElement('input'); ji.className = 'soc-in'; ji.placeholder = t('clan.joinPh'); ji.spellcheck = false; ji.maxLength = 18; ji.style.flex = '1 1 16ch';
      const jb = document.createElement('button'); jb.className = 'diff-btn'; jb.textContent = t('clan.join');
      jb.onclick = () => { const name = ji.value.trim(); if (!name) { this.setSocMsg(t('soc.e.noClan'), true); return; } clearMsg(); this.deps.sendSoc({ op: 'clanJoinReq', name, tok }); };
      const jf = document.createElement('div'); jf.className = 'soc-row'; jf.append(ji, jb);
      grid.appendChild(cf); grid.appendChild(jf); grid.appendChild(note);
    } else {
      const me = this.auth && this.auth.pid;
      const iAmOwner = s.clan.owner === me;
      for (const m of [...(s.clan.members || [])].sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0))) { // [T125] presence-first (the shs_08 Riot snapshot law) — render-order only
        const row = document.createElement('div'); row.className = 'soc-row';
        const lbl = document.createElement('span'); lbl.className = 'set-note';
        lbl.textContent = m.n + (m.pid === s.clan.owner ? ' · ' + t('clan.ownerTag') : '') + ' · ' + (m.on ? t('soc.on', { r: m.room }) : t('soc.off'));
        row.appendChild(lbl);
        if (iAmOwner && m.pid !== me) {
          const k = document.createElement('button'); k.className = 'diff-btn'; k.textContent = t('clan.kick');
          k.onclick = () => { clearMsg(); this.deps.sendSoc({ op: 'clanKick', pid: m.pid, tok }); };
          row.appendChild(k);
        }
        grid.appendChild(row);
      }
      if (iAmOwner) for (const o of s.clan.reqs || []) {
        const row = document.createElement('div'); row.className = 'soc-row';
        const lbl = document.createElement('span'); lbl.className = 'set-note'; lbl.textContent = t('clan.reqs') + ': ' + o.n;
        const ok = document.createElement('button'); ok.className = 'diff-btn'; ok.textContent = t('clan.accept');
        ok.onclick = () => { clearMsg(); this.deps.sendSoc({ op: 'clanResp', from: o.from, accept: true, tok }); };
        const no = document.createElement('button'); no.className = 'diff-btn'; no.textContent = t('clan.deny');
        no.onclick = () => { clearMsg(); this.deps.sendSoc({ op: 'clanResp', from: o.from, accept: false, tok }); };
        row.append(lbl, ok, no);
        grid.appendChild(row);
      }
      const lb = document.createElement('button'); lb.className = 'diff-btn'; lb.textContent = this._socLeaveArm ? t('clan.leaveSure') : t('clan.leave');
      lb.onclick = () => { if (!this._socLeaveArm) { this._socLeaveArm = true; this.renderSocial(); return; } this._socLeaveArm = false; clearMsg(); this.deps.sendSoc({ op: 'clanLeave', tok }); };
      grid.appendChild(lb);
      grid.appendChild(note);
      // [T127 G-7] the WAR FACE + the WEEKLY LADDER — the competition half rides THIS tab's own
      // anatomy (the native-skin law: .set-note faces + .diff-btn rows, zero new CSS literals).
      // Fetch throttle: request ONLY when the store is stale (>5s) — the ack re-renders with a
      // fresh .t so the render→fetch→render loop cannot close. Offline/no-server renders the
      // honest empty face (the ladderNone note), never a blank.
      if (!this._warLadder || Date.now() - this._warLadder.t > 5000) this.deps.sendSoc({ op: 'clanLadder', tok });
      const war = (s.war && s.war.week) ? s.war : (this._warLadder && this._warLadder.mine) ? this._warLadder.mine : null; // the snapshot's face leads (freshest on every soc push); the ladder ack's mine is the fallback
      const wband = document.createElement('div'); wband.className = 'set-note';
      if (war) wband.textContent = t('clan.warPts', { p: war.pts, w: war.w, m: war.m, r: war.rank }); // no-war-yet (old server / first render) renders the head alone — never a duplicated face
      const whead = document.createElement('div'); whead.className = 'set-note';
      whead.innerHTML = '<b>' + t('clan.war', { w: war ? war.week : (this._warLadder ? this._warLadder.week : '') }) + '</b>';
      grid.appendChild(whead); if (war) grid.appendChild(wband);
      const wnote = document.createElement('div'); wnote.className = 'set-note'; wnote.textContent = t('clan.warNote', { w: CLAN.war.win, d: CLAN.war.draw }); // the point law rides the config truth ({w}/{d} fed, never hardcoded)
      grid.appendChild(wnote);
      const lhead = document.createElement('div'); lhead.className = 'set-note'; lhead.innerHTML = '<b>' + t('clan.ladder') + '</b>';
      grid.appendChild(lhead);
      const rows = (this._warLadder && this._warLadder.rows) || [];
      if (!rows.length) { const none = document.createElement('div'); none.className = 'set-note'; none.textContent = t('clan.ladderNone'); grid.appendChild(none); }
      else for (const r of rows) {
        const row = document.createElement('div'); row.className = 'soc-row';
        const lbl = document.createElement('span'); lbl.className = 'set-note';
        lbl.textContent = t('clan.ladderRow', { r: rows.indexOf(r) + 1, t: r.tag, n: r.name, p: r.pts, w: r.w, m: r.m }) + (s.clan && r.cid === s.clan.id ? ' ◄' : ''); // the caller's clan marker (the presence-first face idiom)
        row.appendChild(lbl); grid.appendChild(row);
      }
      }
      el.appendChild(grid);
    } else { // [T125] the FRIENDS tab (the IGN primary tab) — the fr head retires into the tab face (MOVED verbatim); the pley.gg law keeps the request rows distinct
      const fg = document.createElement('div'); fg.className = 'soc-body';
    const fadd = document.createElement('div'); fadd.className = 'soc-row'; // the add-by-name form rides the same inline anatomy (the inline-form conversion complete)
    const fi = document.createElement('input'); fi.className = 'soc-in'; fi.placeholder = t('fr.namePh'); fi.spellcheck = false; fi.maxLength = 16; fi.style.flex = '1 1 16ch';
    const fab = document.createElement('button'); fab.className = 'diff-btn'; fab.textContent = t('fr.add');
    fab.onclick = () => { const name = fi.value.trim(); if (!name) { this.setSocMsg(t('soc.e.to'), true); return; } clearMsg(); this.deps.sendSoc({ op: 'friendReq', name, tok }); };
    fadd.append(fi, fab);
    fg.appendChild(fadd);
      for (const f of [...(s.friends || [])].sort((a, b) => (b.on ? 1 : 0) - (a.on ? 1 : 0))) { // [T125] presence-first (the shs_08 law) — render-order only
      const row = document.createElement('div'); row.className = 'soc-row';
      const lbl = document.createElement('span'); lbl.className = 'set-note';
      lbl.textContent = f.n + ' · ' + (f.on ? t('soc.on', { r: f.room }) : t('soc.off'));
      const rm = document.createElement('button'); rm.className = 'diff-btn';
      let armed = false;
      rm.textContent = t('fr.remove');
      rm.onclick = () => { if (!armed) { armed = true; rm.textContent = t('fr.sure'); return; } this.deps.sendSoc({ op: 'friendRemove', pid: f.pid, tok }); };
      row.append(lbl, rm);
      fg.appendChild(row);
    }
    for (const o of s.reqsIn || []) {
      const wrap = document.createElement('div'); wrap.className = 'soc-row';
      const lbl = document.createElement('span'); lbl.className = 'set-note'; lbl.textContent = t('fr.requests') + ': ' + o.n;
      const ok = document.createElement('button'); ok.className = 'diff-btn'; ok.textContent = t('fr.accept');
      ok.onclick = () => { clearMsg(); this.deps.sendSoc({ op: 'friendResp', from: o.from, accept: true, tok }); };
      const no = document.createElement('button'); no.className = 'diff-btn'; no.textContent = t('fr.deny');
      no.onclick = () => { clearMsg(); this.deps.sendSoc({ op: 'friendResp', from: o.from, accept: false, tok }); };
      wrap.append(lbl, ok, no);
      fg.appendChild(wrap);
      }
      el.appendChild(fg);
    }
  }

  // §53.7 hooks — main.js routes the server mirrors here (auth/eco/soc).
  onAuth(d) {
    if (!d) return;
    if (d.err) {
      this.setMsg('AUTH: ' + d.err);
      // [T121 S-2] the ONLINE tab is the auth surface — the server's err code becomes a
      // readable, honest line on its status element (setMsg stays for the menu strip);
      // 'pid' reuses the qPid remedy, 'anon' = the expired stays-signed-in session.
      const authErr = { name: t('on.authErrName'), pass: t('on.authErrPass'), taken: t('on.authErrTaken'), bad: t('on.authErrBad'), pid: t('on.qPid'), anon: t('on.authErrAnon') }[d.err] || String(d.err);
      this.setOnlineMsg(authErr, true);
      return;
    }
    if (d.tok) this.auth = { name: d.name, tok: d.tok, pid: d.pid };
    if (d.op === 'logout') { this.auth = null; this.mpProfile = null; this.mpRanked = null; } // [G-9] the logout clears the server-truth corner (the anon face returns)
    if (d.profile) this.setMpProfile(d.profile); // [G-9] the auth ack's profile hydrates the identity corner — the payload RODE since T123 but the client never drank it (E2E-caught: the corner stayed dark until a room join; a max-level player must see the prestige arm at the CAREER page right after login)
    if (d.ranked) this.setMpRanked(d.ranked); // [G-9] the ranked corner joins the same hydration (the onJoined idiom verbatim)
    if (d.eco) this.eco = d.eco;
    if (d.social) this.social = d.social;
    this.buildCareerStrip();
    if (!$('page-shop').classList.contains('hidden')) this.renderShop();
    if (!$('page-social').classList.contains('hidden')) this.renderSocial();
    if (!$('page-online').classList.contains('hidden')) this.renderOnline(); // [T121 S-2] the account form re-renders to its authed face (LOG OUT) or back to the anonymous face
    if (!$('page-account').classList.contains('hidden')) this.buildAccount(); // [T122] (7) the account face mirrors the auth truth live
    const acc = $('account-status');
    if (acc) acc.textContent = this.auth ? ('ACCOUNT: ' + this.auth.name + ' · pid ' + (this.auth.pid || '').slice(0, 8)) : 'ACCOUNT: anonymous — register/login (server) unlocks the store, market, trades and clans';
  }
  onEco(d) {
    if (!d) return;
    if (d.op === 'prestige' && d.err) { this.setMsg(t('cr.prErrLvl', { n: MAX_LVL })); return; } // [G-9] the readable gate line BEFORE the generic raw fallback (the onSoc err-map idiom — the server's fail('lvl') becomes the face's own words)
    if (d.op === 'prestige' && d.ok) { // [G-9] the reset lands: the profile rides the ack (xp 0 / lvl 1 / pr+1 — the T123 ack-shape law), the CR grant rides the generic d.cr law below, the arm disarms, the career page live-mirrors
      this._prArm = false;
      if (d.profile) this.setMpProfile(d.profile);
      else if (typeof d.pr === 'number' && this.mpProfile) this.setMpProfile({ ...this.mpProfile, xp: 0, lvl: 1, pr: d.pr });
      this.setMsg(t('cr.prDone', { n: d.pr || 1, cr: PRESTIGE.cr }));
      if (!$('page-career').classList.contains('hidden')) this.renderCareer();
    }
    if (d.err) { this.setMsg('SHOP: ' + d.err); return; }
    if (d.op === 'claim' && !d.err) this.setMsg('CLAIMED +50 CR');
    if (d.op === 'tkco' && d.co) { this.deps.sendEco({ op: 'tkpack', co: d.co, tok: this.auth && this.auth.tok }); return; } // [T110] the SANDBOX PSP-return leg — the modal confirm simulated the approval; a real PSP replaces this auto-leg with the hosted-checkout redirect + its signed webhook → the credited face arrives identically
    if (d.tk !== undefined && this.eco) this.eco.tk = d.tk; // [T110] the token balance rides the chain (state + every tk ack)
    if (d.tkhist && this.eco) this.eco.tkhist = d.tkhist; // [T110] the receipt trail rides
    this.tkCreditLanded(); // [T137] the hub's credit acks funnel the armed purchase (the CoD auto-resume; a no-op with nothing armed)
    if (d.cr !== undefined) this.eco.cr = d.cr; this.buildCareerStrip();
    if (d.own && this.eco) this.eco.own = d.own;
    if (d.market) this.eco.market = d.market;
    if (d.inbox) this.eco.inbox = d.inbox;
    if (d.out) this.eco.out = d.out;
    if (d.names) this.eco.names = d.names;
    if (d.bp && this.eco) this.eco.bp = d.bp; // [T102] the meta ledger views ride the eco chain (state + every meta op response)
    if (d.bn && this.eco) this.eco.bn = d.bn;
    if (d.evsStore && this.eco) this.eco.evsStore = d.evsStore;
    if (d.evs && this.eco) this.eco.evs = d.evs; // [T103] the challenge-window view rides the eco chain (state + claim acks) — the missions pages' server truth
    if (!$('page-bp').classList.contains('hidden')) this.renderBp(); // [T102] the meta pages re-render on chain truth (the onAuth shop/social idiom)
    if (!$('page-missions').classList.contains('hidden')) this.renderMissions(); // [T103] the earn surface joins the chain re-render
    if (!$('page-events').classList.contains('hidden')) this.renderEvents();
    if (!$('page-operators').classList.contains('hidden')) this.renderOperators(); // [T108 N8] the roster re-renders on chain truth (buy acks land here)
    if (!$('page-bundles').classList.contains('hidden')) this.renderBundles();
    this.refreshLoadout();
    if (!$('page-shop').classList.contains('hidden')) this.renderShop();
  }
  onSoc(d) {
    if (!d) return;
    if (d.err && d.op !== 'report') { // [T123 G-7] the soc err map — the server's err code becomes a readable line on THIS page (the T121 onAuth / T122 rep.e.* law); report errs stay on the hud arc (the T122 law), raw token stays the fallback
      const map = { name: t('soc.e.name'), tag: t('soc.e.tag'), taken: t('soc.e.taken'), cr: t('soc.e.cr'), lvl: t('soc.e.lvl'), member: t('soc.e.member'), noClan: t('soc.e.noClan'), dup: t('soc.e.dup'), owner: t('soc.e.owner'), noReq: t('soc.e.noReq'), self: t('soc.e.self'), to: t('soc.e.to'), cap: t('soc.e.cap'), friends: t('soc.e.friends'), pid: t('soc.e.pid') };
      const line = map[d.err] || String(d.err);
      this.setSocMsg(line, true);
      this.setMsg('SOCIAL: ' + line);
      return;
    }
    if (d.op === 'clanLadder') { // [T127 G-7] the weekly ladder ack — stored on the SIDE (the merge law untouched: rows are NOT social state, they are the war table); a re-render consumes the fresh store — the ack's fresh .t breaks the render→fetch→render loop
      this._warLadder = { week: d.week, rows: d.rows || [], mine: d.mine || null, t: Date.now() };
      if (!$('page-social').classList.contains('hidden')) this.renderSocial();
      return;
    }
    // [T123 G-7] the MERGE law — a partial ack no longer blanks the friends list (the
    // pre-T123 clanCreate ack REPLACED this.social, losing friends/reqsIn until the next
    // full push); the server now rides the full state on every mutating ack (the
    // friendResp §53.3 precedent) AND the client merges — both truths hold.
    const hasState = d.friends || d.reqsIn || d.clan !== undefined || d.memberOf !== undefined;
    if (hasState) this.social = { friends: [], reqsIn: [], clan: null, ...(this.social || {}), ...d };
    if (typeof d.cr === 'number' && this.eco) { this.eco.cr = d.cr; this.buildCareerStrip(); } // the clanCreate 500-CR debit rides the soc chain (the onEco idiom) — the CR chip never goes stale
    if (d.op === 'clanJoinReq' && d.ok) this.setSocMsg(t('clan.okJoin'));
    if (d.op === 'friendReq' && d.ok) this.setSocMsg(t('soc.okFriend'));
    if (hasState && !$('page-social').classList.contains('hidden')) this.renderSocial();
  }

  setSocMsg(txt, bad) { // [T123 G-7] the social status line (the setOnlineMsg T121 idiom — the page's own element, written through the re-render so the face and the state never diverge)
    this._socMsg = txt || ''; this._socBad = !!bad; this._socLeaveArm = false; // a fresh message disarms the two-step leave (the honest face resets with the conversation)
    if (!$('page-social').classList.contains('hidden')) this.renderSocial();
  }

  // ---------- T1-7 capture (keyboard/mouse + gamepad) ----------

  static get CAP_HINT() { return t('s.capHint'); } // T2-8: live locale
  setMsg(t) {
    if (this._msgEl && document.contains(this._msgEl)) { // [T136] the ATTACHED-els law — the settings-controls element must not eat the voice once the user left that page (a detached node made every shop message invisible)
      this._msgEl.textContent = t;
      clearTimeout(this._msgT);
      this._msgT = setTimeout(() => { if (this._msgEl) this._msgEl.textContent = UI.CAP_HINT; }, 3200);
      return;
    }
    this.toast(t); // [T136] the menu-wide fallback — the shop/roster/online pages speak through the toast
  }
  captureKB(action) {
    if (this._cap) { this._endCapture(); this.renderSettingsTab('controls'); } // restore the previous capture row's label
    this._cap = { kind: 'kb', action };
    const td = document.querySelector(`tr[data-kb="${action}"] td[data-kbcode]`);
    if (td) td.textContent = t('s.pressKey');
    this.setMsg(t('s.pressKeyMsg', { action: BINDINGS[action] ? BINDINGS[action].label : action }));
    this._capKey = (e) => { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') { this._endCapture(); return; } this.assignKB(action, e.code); };
    this._capMouse = (e) => { e.preventDefault(); e.stopPropagation(); this.assignKB(action, 'Mouse' + e.button); };
    document.addEventListener('keydown', this._capKey, true);
    document.addEventListener('mousedown', this._capMouse, true);
  }
  assignKB(action, code) {
    const s = this.deps.settings;
    if (!s.binds) s.binds = mergeBinds();
    const r = tryAssignBind(s.binds, action, code);
    if (!r.ok) this.setMsg('\u26D4 ' + (r.reason || t('s.conflict')));
    else {
      s.binds[action] = [code];
      applyInputSettings(s); this.deps.settingsChanged(); // settingsChanged persists + re-applies video/hud (existing pattern)
    }
    SFXtick(); this._endCapture(); this.renderSettingsTab('controls'); // re-render FIRST: setMsg targets the fresh element
    this.setMsg(r.ok ? (BINDINGS[action] ? BINDINGS[action].label : action) + ' \u2192 ' + codeLabel(code) : '\u26D4 ' + (r.reason || t('s.conflict')));
  }
  capturePad(action) {
    if (this._cap) { this._endCapture(); this.renderSettingsTab('controls'); }
    this._cap = { kind: 'pad', action, t0: performance.now() };
    const td = document.querySelector(`tr[data-pad="${action}"] td[data-padcode]`);
    if (td) td.textContent = t('s.pressPad');
    this.setMsg(t('s.pressPadMsg', { action: PAD_ACTION_LABELS[action] || action }));
    this._capKey = (e) => { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') this._endCapture(); };
    document.addEventListener('keydown', this._capKey, true);
    const step = () => {
      if (!this._cap || this._cap.kind !== 'pad') return;
      const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
      for (const gp of (pads || [])) {
        if (!gp || !gp.connected) continue;
        for (let i = 0; i < gp.buttons.length; i++) {
          const b = gp.buttons[i];
          if (b && (b.pressed || b.value > 0.5)) { this.assignPad(action, i); return; }
        }
      }
      if (performance.now() - this._cap.t0 > 5000) {
        this.setMsg('No pad input — connect a controller and press any button to wake it, then retry.');
        this._endCapture(); this.renderSettingsTab('controls'); return;
      }
      this._capRaf = requestAnimationFrame(step);
    };
    this._capRaf = requestAnimationFrame(step);
  }
  assignPad(action, idx) {
    const s = this.deps.settings;
    if (!s.padBinds) s.padBinds = { ...PAD_BINDS };
    const r = tryAssignPadBind(s.padBinds, action, idx);
    if (!r.ok) this.setMsg('\u26D4 ' + (r.reason || t('s.conflict')));
    else {
      s.padBinds[action] = idx;
      this.deps.settingsChanged(); // gamepad.js reads padBinds live via the settings getter
    }
    SFXtick(); this._endCapture(); this.renderSettingsTab('controls'); // re-render FIRST: setMsg targets the fresh element
    this.setMsg(r.ok ? (PAD_ACTION_LABELS[action] || action) + ' \u2192 ' + padLabel(idx) : '\u26D4 ' + (r.reason || 'conflict'));
  }
  _endCapture() {
    if (this._capKey) document.removeEventListener('keydown', this._capKey, true);
    if (this._capMouse) document.removeEventListener('mousedown', this._capMouse, true);
    if (this._capRaf) cancelAnimationFrame(this._capRaf);
    this._cap = null; this._capKey = null; this._capMouse = null; this._capRaf = null;
  }

  // ============================================================
  // §49.2/§49.3 (Task 65 W2+W3, rebuilt) — SHARED ladder renderer + page-main strip.
  // One renderer, two surfaces: the ONLINE-tab row (fetch button) and the page-main
  // strip (auto-fetch once per session). n=10 client slice; rows via textContent
  // (XSS-safe law, §33); errors reported in the ONLINE tab, silent on the strip.
  // ============================================================
  renderLadderRows(container, out) {
    container.textContent = '';
    if (out.error) { container.textContent = t('s.ladderErr', { err: out.error }); return; }
    if (out.err === 'pid') { container.textContent = 'SIGN IN ON THE ACCOUNT TAB — FRIEND/CLAN LADDERS NEED AN IDENTITY.'; return; } // [T139 G-LB] the honest scope errors (server sc legs) — never a fabricated global board
    if (out.err === 'noclan') { container.textContent = 'NO CLAN YET — JOIN ONE ON THE SOCIAL TAB, THEN THE CLAN LADDER ANSWERS.'; return; } // [T139 G-LB]
    const rows = (Array.isArray(out.rows) ? out.rows : []).slice(0, 10); // n=10
    const head = document.createElement('div'); head.style.marginBottom = '6px';
    head.textContent = t('s.seasonEnds', { s: out.s, d: out.endsAt ? new Date(out.endsAt).toISOString().slice(0, 10) : '—' }) + (rows.length ? '' : t('s.noRecords'));
    container.appendChild(head);
    if (!rows.length) return;
    const tb = document.createElement('table'); tb.className = 'res-table';
    const thead = document.createElement('thead'); const htr = document.createElement('tr');
    t('s.lbHead').forEach(h => { const th = document.createElement('th'); th.textContent = h; htr.appendChild(th); });
    thead.appendChild(htr); tb.appendChild(thead);
    const tbody = document.createElement('tbody');
    const addRow = (r, me) => {
      const tr = document.createElement('tr'); if (me) tr.className = 'me'; // .res-table tr.me highlight (existing style)
      [String(r.rank), r.n, r.tier, String(r.rp), String(r.pk), r.w + '/' + r.m].forEach(v => { const td = document.createElement('td'); td.textContent = v == null ? '' : String(v); tr.appendChild(td); }); // textContent = XSS-safe for user names
      tbody.appendChild(tr);
    };
    rows.forEach(r => addRow(r, !!r.you));
    if (out.self && out.self.you) addRow(out.self, true); // outside the top slice — best-effort own row
    tb.appendChild(tbody); container.appendChild(tb);
  }

  maybeFetchLadderStrip() {
    if (this._lbFetched) return; // auto-fetch ONCE per session (§49.3 law)
    this._lbFetched = true;
    const strip = $('lb-strip'); if (!strip || !this.deps.mpLeaderboard) return;
    const cv = this.deps.resolveRegion(this.deps.settings, location.hostname); // §27.4 truth table — same endpoint family the next join uses
    this.deps.mpLeaderboard(cv.url, { onDone: (out) => { if (out && !out.error && Array.isArray(out.rows) && out.rows.length) this.renderLadderRows(strip, out); } }); // silent on error/empty — the strip is a teaser; the ONLINE tab reports errors
  }

  // ---------- results ----------
  showResults(res, actors, match, careerRow) {
    this.show('page-results');
    const rr = $('btn-res-replay'); if (rr) rr.hidden = !(this.deps.replayLastPacked && this.deps.replayLastPacked()); // §49.2: lastPacked-gated WATCH REPLAY
    const resT = $('res-title'); // [T119] the element var NO LONGER shadows the i18n t() — the shadow made every results render THROW at the resHead translate (the "stuck game-end face" mechanism, live-caught)
    resT.textContent = res.mode === 'practice' ? 'RANGE COMPLETE' : res.draw ? 'DRAW' : res.win ? 'VICTORY' : 'DEFEAT';
    resT.className = res.mode !== 'practice' ? (res.draw ? 'draw' : res.win ? '' : 'defeat') : '';
    // [T132] the OFFLINE scoreboard joins the T121 TEAM CHARTS — team modes group each team
    // into its own card (the user playtest: "Scorecard shows but should group each team
    // together"); FFA/practice keep the single sorted table. Same idiom as showMpResults
    // (res-teams wrap BEFORE the table — a div inside a table is invalid DOM — and the flat
    // table hides in team faces). Team totals ride match.teamKills when the mode tracks them.
    const TEAM_MODES_UI = ['tdm', 'dom', 'hp', 'kc', 'snd', 'gf', 'inf', 'ctl'];
    const isTeam = TEAM_MODES_UI.includes((res.mode || '').toLowerCase()) && actors.some(a => a.team !== undefined);
    const sorted = [...actors].sort((a, b) => b.score - a.score);
    const headHtml = '<tr>' + t('a.resHead').map(h => '<th>' + h + '</th>').join('') + '</tr>';
    const rowHtml = (a, i) => `<tr class="${a.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td>${a.name}</td><td>${a.score}</td><td>${a.kills}</td><td>${a.deaths}</td></tr>`;
    document.querySelectorAll('.res-teams').forEach(el => el.remove()); // re-render dedupe (the T121 law)
    $('res-head').innerHTML = headHtml;
    if (isTeam) {
      const teams = [[], []];
      sorted.forEach(a => teams[a.team === 1 ? 1 : 0].push(a));
      const tk = match && Array.isArray(match.teamKills) ? match.teamKills : null;
      const ts = tk || [teams[0].reduce((s, a) => s + (a.score || 0), 0), teams[1].reduce((s, a) => s + (a.score || 0), 0)];
      $('res-body').innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'res-teams';
      teams.forEach((rows, ti) => {
        const card = document.createElement('div'); card.className = 'res-team' + (ti === 0 ? ' t0' : ' t1');
        card.innerHTML = `<div class="res-team-h">${ti === 0 ? t('m.teamAlpha') : t('m.teamBravo')}${ts[ti] != null ? ' · <b>' + ts[ti] + '</b>' : ''}</div>` +
          '<table><thead>' + headHtml + '</thead><tbody>' + rows.map((a, i) => rowHtml(a, i)).join('') + '</tbody></table>';
        wrap.appendChild(card);
      });
      const tbl = $('res-body').closest('table');
      tbl.parentNode.insertBefore(wrap, tbl);
      tbl.style.display = 'none';
    } else {
      $('res-body').closest('table').style.display = '';
      $('res-body').innerHTML = sorted.map((a, i) => rowHtml(a, i)).join('');
    }
    const me = actors.find(a => a.isPlayer);
    const acc = me.shotsFired ? Math.round(me.shotsHit / me.shotsFired * 100) : 0;
    $('res-xp').innerHTML = `<span>SCORE <b>${me.score}</b></span><span>ELIMS <b>${me.kills}</b></span><span>ACCURACY <b>${acc}%</b></span><span>BEST STREAK <b>${match.session.bestStreak}</b></span><span>BEST MULTI <b>${match.session.bestMulti ? '×' + match.session.bestMulti : '—'}</b></span>`;
    $('res-highlights').innerHTML = res.mode === 'practice' ? '<div class="hl-chip">LIVE DPS TELEMETRY AVAILABLE IN-RANGE</div>' :
      (res.win ? '<div class="hl-chip">★ <b>OPERATION SUCCESSFUL</b></div>' : '') +
      (match.session.bestMulti >= 3 ? `<div class="hl-chip">BEST MULTI <b>×${match.session.bestMulti}</b></div>` : '');
    this.refreshCareer();
  }

  // Task 35: MP results screen from the end-event board[] (residual-of-residuals).
  // Server-truth table only — career/accuracy stay offline-owned (client shotsHit is
  // not authoritative in MP; MP career accounting is a separate ledger decision).
  showMpResults(end, session) {
    this.show('page-results');
    const rr = $('btn-res-replay'); if (rr) rr.hidden = !(this.deps.replayLastPacked && this.deps.replayLastPacked()); // §49.2: lastPacked-gated WATCH REPLAY
    const resT = $('res-title'); // [T119] same shadow kill as showResults — the MP face died at the same translate
    resT.textContent = end.draw ? 'DRAW' : end.mine ? 'VICTORY' : 'DEFEAT';
    resT.className = end.draw ? 'draw' : end.mine ? '' : 'defeat';
    // [T121] (1) the end-of-round TEAM CHARTS: team modes render ONE CHART PER TEAM (aligned
    // in a wrap-safe flex grid — stacked under 700px, side-by-side above; never overlapping at
    // any device size); FFA keeps the single sorted table.
    const TEAM_MODES_UI = ['tdm', 'dom', 'hp', 'kc', 'snd', 'gf', 'inf', 'ctl'];
    const board = [...(end.board || [])].sort((a, b) => b.s - a.s);
    const rowHtml = (b, i) => `<tr class="${b.me ? 'me' : ''}"><td>${i + 1}</td><td>${b.n}</td><td>${b.s}</td><td>${b.k}</td><td>${b.de}</td></tr>`;
    const headHtml = '<tr>' + t('a.resHead').map(h => '<th>' + h + '</th>').join('') + '</tr>';
    if (TEAM_MODES_UI.includes((end.md || '').toLowerCase()) && board.some(b => b.team !== undefined)) {
      document.querySelectorAll('.res-teams').forEach(el => el.remove()); // [T121] re-render dedupe
      const teams = [[], []];
      board.forEach(b => teams[b.team === 1 ? 1 : 0].push(b));
      const ts = end.teamS || [null, null];
      $('res-head').innerHTML = headHtml;
      $('res-body').innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'res-teams';
      teams.forEach((rows, ti) => {
        const card = document.createElement('div'); card.className = 'res-team' + (ti === 0 ? ' t0' : ' t1');
        card.innerHTML = `<div class="res-team-h">${ti === 0 ? t('m.teamAlpha') : t('m.teamBravo')}${ts[ti] != null ? ' · <b>' + ts[ti] + '</b>' : ''}</div>` +
          '<table><thead>' + headHtml + '</thead><tbody>' + rows.map((b, i) => rowHtml(b, i)).join('') + '</tbody></table>';
        wrap.appendChild(card);
      });
      const tbl = $('res-body').closest('table'); // [T121] the wrap goes BEFORE the table (a div inside a table is invalid DOM)
      tbl.parentNode.insertBefore(wrap, tbl);
      tbl.style.display = 'none';
    } else {
      document.querySelectorAll('.res-teams').forEach(el => el.remove()); // a team render must not leak into the FFA face
      $('res-body').closest('table').style.display = '';
      $('res-head').innerHTML = headHtml;
      $('res-body').innerHTML = board.map((b, i) => rowHtml(b, i)).join('');
    }
    $('res-xp').innerHTML = `<span>${t('m.mode')} <b>${(end.md || '').toUpperCase()}</b></span><span>${t('m.bestStreak')} <b>${session && session.bestStreak ? session.bestStreak : '—'}</b></span><span>${t('m.bestMulti')} <b>${session && session.bestMulti ? '×' + session.bestMulti : '—'}</b></span>`;
    $('res-highlights').innerHTML = end.draw ? `<div class="hl-chip">${t('m.stalemate')}</div>` :
      (end.mine ? `<div class="hl-chip">★ <b>${t('m.opSuccess')}</b></div>` : `<div class="hl-chip">${t('m.matchComplete', { reason: (end.reason || '').toUpperCase() })}</div>`);
  }

  buildHelp() {
    // T2-8 (Task 64, §48.2): help body translated — headers via m.help*H, paragraphs m.help*P
    // [T120] the parity-pass-II decree: the raw h3+p text wall retires into the CARD GRID —
    // every topic a .help-card (the 2026 field-manual anatomy), and the MAPS card carries LIVE
    // previews (the decree's "level images: just show live preview" law rides the manual too —
    // js/mapprev.js renders outpost/canals/meridian from their OWN json). i18n keys verbatim.
    $('help-body').innerHTML = `<div class="help-grid">`
      + `<div class="help-card"><h3>${t('m.helpMvH')}</h3><p>${t('m.helpMvP')}</p></div>`
      + `<div class="help-card"><h3>${t('m.helpGunH')}</h3><p>${t('m.helpGunP')}</p></div>`
      + `<div class="help-card"><h3>${t('m.helpAwH')}</h3><p>${t('m.helpAwP')}</p></div>`
      + `<div class="help-card"><h3>${t('m.helpObjH')}</h3><p>${t('m.helpObjP')}</p></div>`
      + `<div class="help-card"><h3>${t('m.helpRngH')}</h3><p>${t('m.helpRngP')}</p></div>`
      + `<div class="help-card"><h3>${t('m.helpPadH')}</h3><p>${t('m.helpPadP')}</p></div>`
      + `<div class="help-card help-maps"><h3>MAPS</h3><p><b>${Maps.roster.filter(m => !m.tk).length} maps</b> rotate by default (+[T110] 2 token-store stages). Set MAP on <b>ANY</b> to keep the rotation, or pin a favorite to lock it. Private rooms pick the <b>LOBBY MAP</b> — everyone rebuilds automatically at match start.</p><div class="help-map-strip" id="help-map-strip"></div></div>`
      + `<div class="help-card"><h3>MULTIPLAYER</h3><p>QUICKPLAY drops you into the fullest open lobby; the ranked queue buckets you by RP tier and widens as you wait. Private rooms: <b>?mp=1&amp;priv=1</b> creates one and hands you an invite link; <b>?mp=1&amp;code=XXXXXX</b> joins by code. <b>?mp=1&amp;spec=1</b> spectates read-only. Regions auto-resolve — pin one on the ONLINE tab and PING it first.</p></div>`
      + `<div class="help-card"><h3>MOVEMENT TECH II</h3><p>Sprint (Shift) then crouch-slide (C) down ramps to carry speed; slide-jumping off pads chains routes. Jump on landing frames to preserve momentum, and strafe-peek corners to break bot tracking. Full movement tech lives in the repo docs (MOVEMENT_TECH.md).</p></div>`
      + `<div class="help-card"><h3>REPLAYS</h3><p>Multiplayer matches record locally by default — toggle REPLAY RECORDING on the ONLINE tab. WATCH REPLAY appears on the results screen right after a recorded match; WATCH LAST REPLAY (ONLINE tab) boots the viewer anytime. Records are transform replays: newest 20 kept, pruned after 10 minutes.</p></div>`
      + `<div class="help-card"><h3>ACCOUNT · SHOP · SOCIAL</h3><p>Create an account on the ONLINE tab (your device career merges once, server-side). CR is earned free by playing — claim free CR every 12 hours once level 5 with a match played. Spend it in the shop, open cases, list on the market or trade with players — up to 5 items per side. Friends add by exact name; clans cost 500 CR and need level 10 to join.</p></div>`
      + `</div>`;
    // [T120] the MAPS card's live strip — the mapDisplayShow idiom on the field manual
    const strip = document.getElementById('help-map-strip');
    if (strip) for (const id of ['outpost', 'canals', 'meridian']) {
      const m = Maps.roster.find((x) => x.id === id); if (!m) continue;
      const cell = document.createElement('div'); cell.className = 'help-map-cell';
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 200;
      const lb = document.createElement('span'); lb.className = 'help-map-name'; lb.textContent = m.name.toUpperCase();
      cell.append(cv, lb); strip.appendChild(cell);
      mapData(id).then((d) => drawMapPreview(cv, d)).catch(() => drawAnyPreview(cv)); // live data or the rotation glyph — never a broken cell
    }
  }
}

function SFXtick(hover = false) { import('./audio.js').then(m => { if (m.audioReady()) m.uiTick(hover); }); }
