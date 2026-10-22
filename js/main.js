// ============================================================
// IRONSIGHT — main.js : boot, render loop, damage routing,
// focus slow-mo, flash/UDL, death cam, career persistence
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CFG, DEFAULT_SETTINGS, FLASH, GG_LADDER, SND_SITES, WEAPONS, knockFor } from './config.js'; // [T138] WEAPONS + knockFor join — the kill event's weapon id → the damage-scaled ragdoll impulse (config single truth)
import { buildWorld, setMap, World, rayAABB, segmentBlocked, applyDestDamage, applyDestNet, takeLootPickup, hideGasZone } from './world.js';

// [T170] battle-map camera law — a map JSON may RAISE the far plane via map.far
// (VOSKHOD: 1400). Default maps carry no far field -> camera.far stays 500 byte-stable
// (zero regression). Reads World.data (the actually-built map), set after every setMap.
function applyMapCameraFar() {
  const f = World.data && World.data.map && World.data.map.far;
  if (f && camera && camera.far < f) {
    camera.far = f;
    camera.updateProjectionMatrix();
  }
}
import { Maps } from './maps.js'; // T1-2: map registry/rotation (docs/MAPS.md)
import { histPut } from './history.js'; // §52.1 S1: local match history (IDB, best-effort)
import { applyColorVision, dailyFor, seasonOf, BP_AWARD } from './config.js'; // §52.3 S6 + §52.5 S5 (config single truth) · T89: BP award law + season key + mode trio constants
import * as metagame from './metagame.js'; // T89 L4: challenges/events/feed — deterministic single truth (52 exports, self-tested 62/0 ×2)
import * as achs from './achievements.js'; // [T115 G-5] the achievement single truth (pure, zero-import — the sweep law lives there)
import * as streaks from './streak.js'; // [T116 G-6] the login-streak single truth (pure, zero-import — the clock is INJECTED by the caller, the evDayOf law)
import * as onboard from './onboard.js'; // T89 L10: 7-stage onboarding (scheme-pick-first + skip+reward laws)
import { PlayerController } from './player.js';
import { WeaponSystem, buildViewModel, makeWeapon } from './weapons.js'; // [T121] (4) buildViewModel joins — the TPV props wear the SAME meshes the viewmodel does (one visual truth) · [T171] makeWeapon — BR ground-weapon pickup swaps the primary
import { BotManager } from './bots.js';
import { ops3dRig, ops3dStats } from './ops3d.js'; // [T130] the skinned operator body runtime
import { Match } from './modes.js';
import { HUD } from './hud.js';
import { UI, loadSettings, saveSettings, loadLoadout, saveLoadout, loadCareer, saveCareer } from './ui.js';
import { initInput, Input, requestLock, exitLock, actionDown, consume, consumeRelease, endFrame, resetTouchLatches, applyInputSettings } from './input.js';
import { TRAINER } from './trainer.js'; // [T168] the FPS trainer — 7 opens the panel; the flags hook damagePlayer (god), bots.applyDamage (one-shot), weapons gates (ammo/nades/recoil/spread), CFG.PHYS (speed/jump), bots.update (freeze), career.cr floor (CR)
import { initGamepad, pollGamepad, padRumble } from './gamepad.js';
import { FX, initEffects, updateFX, setQuality, dmgNumber as fxNum } from './effects.js';
import * as FXfns from './effects.js';
const fxShake = FXfns.shake; // module fn (FX const object holds state only)
import * as SFX from './audio.js';
import { mp, initMP, fixedStep as mpFixedStep, frame as mpFrame, sendRespawn, onMatchStart as mpOnMatchStart, installProbe as mpInstallProbe, scoreActors, remoteActors, sendMatchStart, sendSetMode, sendSetMap, sendSetKnob, sendNade, sendStreak, sendAbility, sendReload, sendEmote, sendAuth, sendEco, sendSoc, sendQ, setAuth, serverSpawn, resolveRegion, mpPingRegion, mpLeaderboard, ensureIo, corpseHint as mpCorpseHint, sendMapReg, sendLoot, renderLootManifest, takeLootById } from './mp.js'; // §51/§52/§53: map pick + knobs + account/economy/social/queue senders join the dep list // T43 §27: region resolve/ping for initMP + UI deps; T45 §29.2: sendSetMode for the lobby mode seg; T49 §33: ladder fetch; T55 §39.4: sendEmote · [T120 S-3] ensureIo — the hub's connect-on-demand joins the dep list · [T138] corpseHint — the remote-corpses wire (killer=me legs) · [T140 G-3] sendMapReg — the custom-map registry leg · [T171] sendLoot/renderLootManifest/takeLootById — the BR loot wire
import { applySettings as voiceApplySettings } from './voice.js'; // [T140 G-4] the settings fan-out leg (mp.js owns the socket + the per-frame tick — no double ownership; the fn is a MODULE-level export, not a voice.* member)
import { trailById, emoteById, finishById, charmById } from './cosmetics.js'; // T55 §39: pure defs — local wake color + emote resolve (no cycle: cosmetics imports nothing) · [T120] finishById joins — the TPV body wears the equipped finish
import { Replay, makePlayback, unpackRecord, idbGet as replayIdbGet, idbLatest as replayIdbLatest, RF as RFBIT } from './replay.js';
import { t, setLang } from './i18n.js'; // T2-8 (Task 64, §48): UI locale — t() at call time = live-switch, zero reload // T42 §26: transform replay — record arm + viewer playback engine

const $ = (id) => document.getElementById(id);
const mpCrates = []; // MP-3.1 T2-10: falling supply crate visuals (server-owned landing)

// T2-8 §48.5: locale seed from saved settings (default-merge law) BEFORE boot-line render
try { setLang((loadSettings() && loadSettings().lang) || 'en'); } catch (e) { /* localStorage unavailable → EN */ }

  // ---------- boot log ----------
const bootLines = $('boot-lines');
const LINES = [ // T2-8: t('b.*') at emit time — lang==='en' reproduces the legacy literals byte-for-byte (§48.8)
  t('b.0', { v: CFG.VERSION }),
  t('b.1'), t('b.2'), t('b.3'), t('b.4'), t('b.5'), t('b.6'), t('b.7'),
];
let li = 0;
const bootTimer = setInterval(() => {
  if (li < LINES.length) {
    const d = document.createElement('div'); d.textContent = '> ' + LINES[li];
    bootLines.appendChild(d); bootLines.scrollTop = 99999;
    $('boot-fill').style.width = (++li / LINES.length * 100) + '%';
  } else { clearInterval(bootTimer); setTimeout(() => { bootGame().catch((e) => showBootFail('Boot failed', e)); }, 250); } // [T131] the async boot can never die silently again — an un-caught leg lands on the fail screen (the T122 "zero errors on the menu" black-screen face, closed at its last unguarded door)
}, 130);

// [T131] THE BOOT FAIL SCREEN — the WebGL-unavailable class (user console: "Error creating WebGL
// context · GL_VENDOR = Disabled · Sandboxed = yes"). The renderer leg is the ONE boot leg that
// cannot degrade — T122's BOOT-ARMOR Law covers peripheral legs, but a 3D-only game has no 2D
// fallback. The honest face is a fullscreen remediation overlay and a CLEAN boot stop: the old
// face was throw@L166 (uncaught-in-promise) + the L142 streak timer crashing on hud.announce
// (hud is only assigned at L407 — never reached). Idempotent: one overlay, repeat calls refresh
// the text; fail-soft to the end — the console.error above fires even if the overlay cannot.
function showBootFail(title, err, msg) {
  console.error('[boot-fail]', title, err);
  try {
    let ov = $('boot-fail');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'boot-fail';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0d10;color:#cfd6dd;display:flex;flex-direction:column;align-items:center;justify-content:center;font:13px/1.7 ui-monospace,Menlo,Consolas,monospace;text-align:center;padding:28px;';
      const h = document.createElement('div');
      h.style.cssText = 'font-size:19px;letter-spacing:2px;color:#ff5c5c;margin-bottom:14px;';
      const m = document.createElement('div');
      m.id = 'boot-fail-msg';
      m.style.cssText = 'max-width:660px;white-space:pre-line;';
      const d = document.createElement('div');
      d.id = 'boot-fail-err';
      d.style.cssText = 'max-width:660px;margin-top:16px;font-size:11px;color:#6b7683;word-break:break-all;';
      ov.append(h, m, d);
      document.body.appendChild(ov);
    }
    ov.firstChild.textContent = 'IRON SIGHT — ' + title;
    $('boot-fail-msg').textContent = msg || BOOT_FAIL_MSG;
    $('boot-fail-err').textContent = err ? String(err.message || err) : '';
  } catch { /* the fail screen can never throw — the console got it above */ }
}
const WEBGL_FAIL_MSG = 'The browser could not create a WebGL context — the game needs GPU rendering to run.\n\nFixes that work:\n· Chrome/Edge: Settings → System → turn ON "Use hardware acceleration when available", then relaunch the browser\n· Check chrome://gpu — WebGL must read "Hardware accelerated"\n· Update your GPU drivers / the browser\n· If this tab is sandboxed or remote-desktop, open the game in a normal browser window';
const BOOT_FAIL_MSG = 'The game failed to boot. Reload the page; if it keeps failing, clear this site\'s data and retry.';

// ---------- globals ----------
let renderer, scene, camera, composer, bloomPass;
let player, weapons, bots, match, hud, ui;
let settings, loadout, career;
let inMatch = false, paused = false, timeScale = 1;
let mpResultsUp = false; // Task 35: MP results screen visible (lobby event dismisses it)
let mpResultsShownAt = 0; // [T120] the results face's minimum-display clock (the genre law: a results screen reads for seconds — the live E2E measured the server's end→lobby at <1s, which FLASHED the face away before any read)
let mpRoomId = null; // T45 §29.3: real room id from the joined ack (a private code IS the room id; null = pre-ack)
let mpCareer0 = null; // Task 40: MP match-start baseline for career shot/hit deltas
let mpPid = null; // T44 §28.1: persistent device identity (ironsight.pid.v1) — sent with join
let uiReady = false; // T44 §28.4: ui.js exists only after boot; async MP callbacks guard on this
let mainFireEdge = false, wakeLock = null; // wakeLock: §60.2 M6 immersive-mobile sentinel (startMatch/quitMatch lifecycle)

// [v1.50 port T90] §60.2 (v1.48) M1 — touch aim assist cone (CODM-modeled). Same shape as the
// gamepad assist closure (initGamepad) but TOUCH-tuned constants (v1.50 CFG.TOUCH table:
// 6.0°/45m cone vs 4.2°/65m gamepad) and it REPORTS the angular error + chest point so the
// auto-fire verdict (M7-lite, consumed by input.js actionDown('fire')) and the offline bullet
// magnetism (weapons.js assistPoint consumer) share one ground truth. Desktop/MP look paths
// are untouched: the cone only runs when Input.touchMode. ?? fallbacks quote the v1.50
// CFG.TOUCH row verbatim until the config wave lands the fields (then config wins).
const _tv1 = new THREE.Vector3(), _tv2 = new THREE.Vector3(), _tv3 = new THREE.Vector3();
let assistPos = null;
let assistConeLive = false; // [v1.50 port T90] per-frame flag: the v1.50 cone slowdown owns the look when live (consumed by touchAssistSlow — keeps the pinned T89 call form)
function touchAssistCone() {
  assistPos = null;
  if (!player || !player.alive) return -1;
  const G = CFG.TOUCH;
  const cosCone = Math.cos((G.assistAngle ?? 6.0) * Math.PI / 180);
  player.forward(_tv1);
  let best = -1;
  for (const b of bots.bots) {
    if (!b.alive || b.team === player.team) continue;
    _tv3.copy(b.pos); _tv3.y += 1.2; // chest aim point (bot height 1.8 — gamepad assist idiom)
    _tv2.copy(_tv3).sub(player.pos);
    const d = _tv2.length();
    if (d > (G.assistDist ?? 45) || d < 0.001) continue;
    const dotv = _tv2.divideScalar(d).dot(_tv1);
    if (dotv > cosCone) {
      const err = Math.acos(Math.min(1, dotv));
      if (best < 0 || err < best) { best = err; assistPos = _tv3.clone(); }
    }
  }
  return best;
}
function releaseMobileImmersive() { // [v1.50 port T90] §60.2 M6: best-effort teardown of fullscreen/wake-lock
  document.body.classList.remove('in-match');
  try { wakeLock && wakeLock.release && wakeLock.release(); } catch {} wakeLock = null;
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch {}
}
document.addEventListener('visibilitychange', () => { // [T90 merge] M13 hardening (dead-session wave, adopted): the platform auto-releases the wake-lock on tab hide — re-acquire on return while a touch match is live
  if (!document.hidden && inMatch && Input.touchMode && navigator.wakeLock) { try { navigator.wakeLock.request('screen').then((l) => { wakeLock = l; }).catch(() => {}); } catch {} }
  if (!document.hidden && inMatch) SFX.resumeAudio(); // T99 v1.64 M8 feel pass: bg-return audio resume — iOS suspends the ctx on hide; return re-arms it without waiting for a gesture (NOT touch-gated: desktop returns resume too)
});

// T99 v1.64 M8 feel pass: first-gesture audio unlock — boot-time initAudio runs OUTSIDE any user
// gesture, so on real devices the ctx stays suspended (menu taps silent) until the first FIRE's
// resumeAudio. The capture-net re-arms audio at the earliest valid gesture on any surface; each
// gesture retries cheaply (resumeAudio no-ops when running/absent) and the net self-removes once
// audioReady() (the pre-existing export, REUSED — zero new exports) reports the ctx live.
const audioUnlock = () => { SFX.resumeAudio(); if (SFX.audioReady()) for (const [ev, fn] of audioUnlockNet) removeEventListener(ev, fn, { capture: true }); };
const audioUnlockNet = [['pointerdown', audioUnlock], ['touchstart', audioUnlock], ['keydown', audioUnlock]];
for (const [ev, fn] of audioUnlockNet) addEventListener(ev, fn, { capture: true });
let emoteCdT = 0; // T55 §39.4: local emote cooldown (1.5 s) — complements the server §34 sweep
// T42 §26.4: replay viewer state (?replay=1 boot — presentation only, no live stream, no career)
let replayViewer = false;
const rpv = { pb: null, meta: null, playhead: 0, prevT: 0, playing: true, speed: 1, meshes: new Map(), firePrev: false, adsPrev: false, spacePrev: false, sPrev: false };
let mouseVel = { x: 0, y: 0 };
let lastT = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60, lastCd = -1;
let dmgEvents = [];
const lookV = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);

async function bootGame() {
  // [T132-R] the PWA offline shell — fail-soft registration (the bonus-layer law: a failed
  // SW can never block the game). https/localhost only; every rejection swallowed.
  try {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  } catch { /* fail-soft — the game boots regardless */ }
  settings = loadSettings();
  loadout = loadLoadout();
  career = loadCareer();
  { // [T168] the user's CR grant — ONE-TIME +987,654 into the local wallet (the offline career face the shop's local legs spend). The server-truth CR chip (eco.cr, ui.js:573) rides the hub seed law: index.ts seeds the ADMIN account's eco with the same 987,654 on every fresh deploy — code-not-state, so it survives every wipe.
    try {
      if (!localStorage.getItem('ironsight.t168.cr')) {
        localStorage.setItem('ironsight.t168.cr', '1');
        career.cr = (career.cr | 0) + 987654;
        saveCareer(career);
        setTimeout(() => { if (hud) hud.announce('TRAINER GRANT', '+987,654 CR — wallet credited (T168)'); }, 1400); // the boot-toast arc (the T116 streak-law precedent)
      }
    } catch (e) { /* localStorage unavailable — the grant rides the session only */ }
  }
  { const ab = achs.achUnlock(career, Date.now()); if (ab.unlocked.length) { career = ab.career; saveCareer(career); } } // [T115 G-5] boot catch-up: pre-v1.80 progress unlocks SILENTLY (no toast spam — the CAREER count reveals them; the endMatch path is the toasting one)
  // [T131] this 900 ms toast arms BEFORE the renderer (~L166) and the HUD (L407) exist — if boot
  // died in between (the WebGL-unavailable class), hud is undefined here and this callback was
  // the user-reported second uncaught ("reading 'announce'"); the guard is a silent no-op on a dead boot
  { const sb = streaks.streakLogin(career, metagame.evDayOf(Date.now()), Date.now()); if (sb.changed && sb.reward) { career = sb.career; career.cr = (career.cr || 0) + (sb.reward.cr || 0); saveCareer(career); setTimeout(() => { if (!hud) return; hud.announce(t('st.title'), t('st.toastSub', { d: streaks.streakDayIndex(sb.count), cr: sb.reward.cr })); try { SFX.pickup(null, 1); } catch {} }, 900); sendEco({ op: 'streak', last: career.streak.last, count: career.streak.count, best: career.streak.best }); } } // [T116 G-6] boot login sweep — the ONE crediting path (auto-credit on window advance, idempotent per the §52 04:00 window, ONE clock); the toast rides the onboarding-credit arc (hud.announce + SFX.pickup, the boot-time credit precedent); the §53.2 mirror no-ops offline
  // B15b: input init runs BEFORE the touch quality gate below — the gate reads
  // Input.touchMode, which only initInput() sets (was previously a dead read of the
  // module-literal default false → touch auto-quality-low never engaged).
  initInput();
  Input.onPause = () => { if (inMatch && TRAINER.isOpen()) { TRAINER.closePanel(true); return; } if (inMatch && paused && ui._pauseSettings) { ui.closePauseSettings(); return; } if (inMatch && !paused) pause(); else if (inMatch && paused) resumeMatch(); }; // [T119] Escape TOGGLES — the desktop pause key finally exists (input.js fires it); the touch path shares the same law · [T167] ESC inside the pause-settings modal closes the MODAL (pause stays beneath); the toggle law resumes only from pause itself · [T168] ESC inside the TRAINER panel closes the TRAINER first (pause stays untouched)
  Input.onFireDown = () => { mainFireEdge = true; SFX.resumeAudio(); };
  Input.onLockChange = (locked) => {
    if (!locked && inMatch && !paused && !Input.touchMode && !TRAINER.isOpen()) pause(); // [T168] the trainer's exitLock must NOT read as focus-loss — the panel keeps the sim running (classic trainer law)
  };
  // T44 §28.1: persistent player id — generated ONCE, reused forever. Bearer device identity
  // (spoofable by design until T2-6; §28.6 honest scope). Absent/blocked localStorage = anonymous session.
  try {
    mpPid = localStorage.getItem('ironsight.pid.v1');
    if (!mpPid || typeof mpPid !== 'string' || mpPid.length < 8) {
      mpPid = crypto.randomUUID();
      localStorage.setItem('ironsight.pid.v1', mpPid);
    }
  } catch (e) { mpPid = null; } // SSR/private-mode: anonymous, pre-T44 bytes
  if (new URLSearchParams(location.search).has('mp')) CFG.MP.enabled = true;
  if (Input.touchMode && settings.quality > 1 && !settings.qualityPinned) settings.quality = 0; // [v1.50 port T90] §60.2 M19: in-memory downgrade only — a manual VIDEO choice sets qualityPinned (never clobbers it)
  document.body.classList.toggle('touch', Input.touchMode); // [v1.50 port T90] §60.2 M16: CSS hook — no key glyphs on touch

  const host = $('canvas-host');
  try { // [T131] the renderer leg — the ONE boot leg that cannot degrade (3D-only game; T122 BOOT-ARMOR covers peripheral legs only). WebGL-unavailable now lands on the fail screen with remediation steps and a CLEAN return, not an uncaught throw + black screen.
    renderer = new THREE.WebGLRenderer({ antialias: settings.quality >= 2, powerPreference: 'high-performance' });
  } catch (e) { showBootFail('WebGL unavailable', e, WEBGL_FAIL_MSG); return; }
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // §LIGHT-1 (user report "stages are too dark on average", 2026-10): ACESFilmic crushes
  // mid-tones; the roster skews night/dusk BY AUTHORSHIP (docs/MAPS.md moods — preserved),
  // so the lift is this ONE global multiplicative lever, not per-map JSON edits. 1.18 → 1.45
  // (+23%): dark maps regain readable silhouettes while relative mood ordering survives
  // (exposure is linear — ratios unchanged). PARAMETERS.md §renderer documents the value.
  renderer.toneMappingExposure = 1.45;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 500);
  scene.add(camera);

  await buildWorld(scene); // T1-2: data-driven (maps/outpost.json on first boot — behavior-stable default)
  applyMapCameraFar(); // [T170] no-op for arena maps (no far field)
  Maps.preload(); // warm the rotation roster in the background (fetch only, no rebuild)
  Maps.init(); // [T139 G-3] the authored custom stage joins the roster (LS-gated) BEFORE any pick/pin scan

  player = new PlayerController(camera);
  player.team = 0;
  player.shotsFired = 0; player.shotsHit = 0;

  // MP-1 (Task 27): movement replication behind mp.enabled (?mp=1). Offline path untouched.
  if (new URLSearchParams(location.search).has('mp')) CFG.MP.enabled = true;
  if (CFG.MP.enabled) {
    const mpq = new URLSearchParams(location.search);
    if (mpq.get('room')) CFG.MP.room = mpq.get('room').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'A'; // MP-3
    const wantPriv = mpq.has('priv'); // T45 §29.3: ?mp=1&priv=1 — create a private lobby (server generates the code)
    const wantCode = (mpq.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); // T45 §29.3: ?mp=1&code=XXXXXX — join by code
    const mpAuto = mpq.has('auto'); // [T141] the quick/rank queue navigation — the assigned lobby self-starts its round (the any-member lobby-start law; a LIVE room just rides it, never restarted)
    initMP({
      player, scene,
      settings, // T43 §27.4: join-time region resolution (absent → 'auto', byte-identical)
      pid: mpPid, // T44 §28.1: persistent identity rides join (null = anonymous, payload key dropped)
      spec: mpq.has('spec'), // T41 §25.1: ?mp=1&spec=1 — read-only spectator session
      replay: mpq.has('replay') || settings.replayRec !== false, // T42 §26.1: ?mp=1&replay=1 forces capture; §49.2 (Task 65 W2, rebuilt): REPLAY RECORDING toggle (default ON) arms per-match capture without the URL flag — MP-scoped (initMP only runs on ?mp=1), offline path untouched
      priv: wantPriv, // T45 §29.3: private create rides initMP → join payload (false = key dropped)
      code: wantCode || undefined, // T45 §29.3: join-by-code rides initMP (absent = key dropped = pre-T45 bytes)
      loadout: () => loadout, // MP-3.1: ability binding rides join
      onJoined: (d) => { if (d && d.room) mpRoomId = d.room; if (d && d.code) hud.announce(t('a.privLobby'), t('a.privLobbyS', { code: d.code, link: location.pathname + '?mp=1&code=' + d.code })); if (mp.spec && d && d.spawn) { specSeed.set(d.spawn.x, d.spawn.y, d.spawn.z); specSeedOk = true; hud.spectateMode(true); } if (d && d.profile && uiReady) ui.setMpProfile(d.profile); if (d && d.ranked && uiReady) ui.setMpRanked(d.ranked); mpOnMatchStart(); if (mpAuto && !mp.spec) { if (d.live) startMatch(d.md || 'ffa', ui.difficulty, true); else if (uiReady) ui.show('page-private'); } }, // T41 §25.1: ack spawn = camera seed; T44 §28.3: server-truth profile → identity corner; T45 §29.3: real room id + private invite announce; T46 §30.6: ranked view → corner RANK row · [T157] THE PARITY CHAIN (what game mode > what game type > lobby > THEN game): the ack carries SERVER-TRUTH live + md (the T157 hub ROOM-STATE LAW — the old ack never did, so `!d.live` was always true and this branch self-started hardcoded ffa even mid-live tdm). LIVE/countdown room → port INTO the round with the SERVER's mode (fromServer=true: the round is already owned — no startMatch re-emit, the host-gate + §34.1 rate cap stay untouched). IDLE lobby → land on the LOBBY FACE (page-private: roster + mode + map + rules + DEPLOY) — the round starts FROM the lobby (any-member §34.1 law), never a blind in-match dump
      // MP-2 combat FX (server verdicts → presentation; main.js owns hud/match/SFX)
      onKill: (k) => {
        const vv = { name: k.vn };
        if (k.mine) { match.registerKill(player, vv, k.h, k.w); career.weaponKills = career.weaponKills || {}; career.weaponKills[k.w] = (career.weaponKills[k.w] || 0) + 1;
          { // [T139 N7] the per-CLASS kill-sum (career.pk) — resolves by id ∪ name (the T138 corpse-wire find precedent, BOTH keyings safe); cls is the WEAPONS single truth
            const wpk = WEAPONS.find(x => x.id === k.w || x.name === k.w);
            if (wpk && wpk.cls) { career.pk = career.pk || {}; career.pk[wpk.cls] = (career.pk[wpk.cls] || 0) + 1; }
          }
          if (k.v != null && k.v !== mp.myId) { // [T138] THE REMOTE CORPSE WIRE — MY kills feed the hint the snapshot loop turns into the corpse drive (killer=me: my pos IS the killer truth; remote killers feed themselves inside mp.js's own kill listener)
            const wd = WEAPONS.find(x => x.id === k.w);
            mpCorpseHint(k.v, player.pos.x, player.pos.z, knockFor(wd ? wd.dmg : 24));
          }
        } // streaks/banner/killfeed via match hooks · [T90 wave] camo per-weapon counters: NAME-keyed (zero new identity layering — the w string IS the id), persisted by the endMatch saveCareer
        else if (k.theirs) { // server-confirmed own death (kill event, victim === me)
          player.alive = false; player.hp = 0;
          resetTouchLatches(); // §62.4 M17 (v1.54): death clears input latches — dead thumbs can't keep firing/looking
          hud.showDeath(true, { name: k.kn, weapon: k.w, dist: 0, hp: 0 });
          killcamStart(k.kid, k.kn, k.w, k.h); // G-2: engage the killer-POV playback when the capture can serve it (orbit cam = fallback)
          match.registerKill(null, player, k.h, k.w); // victim side: streak reset + respawn queue (modes.js)
        }
        else hud.killfeed(k.kn === 'GRAVITY' ? null : { name: k.kn }, vv, k.w, k.h);
      },
      onHitConfirm: (m) => { // mirrors routeDamageToBot's feedback branch
        player.shotsHit++; // T40: MP accuracy was never counted (logged career residual) — same per-damaging-event convention as the offline path
        SFX.hitmark(false, m.head); if (settings.hitMarker) hud.hitmarker(false, m.head); // T1-8: visual toggle (audio stays)
        if (m.head) SFX.hsDing();
        if (m.kill) { SFX.hitmark(true, m.head); if (settings.hitMarker) hud.hitmarker(true, false); }
      },
      onAmmo: (m) => { // T40 §24: server-authoritative ammo correction → reconcile matching slot weapon
        for (const sw of [weapons.slotWeapons[0], weapons.slotWeapons[1]]) {
          if (sw && sw.def && sw.def.id === m.w) { sw.mag = m.mag; sw.reserve = m.res; }
        } // hud ammo is per-frame — no explicit refresh (weapons.js onAmmoChanged hook is a no-op here)
      },
      onHurt: (m) => { // mirrors damagePlayer's victim-FX branch (hp math stays server-side)
        player.lastDamageT = 0;
        if (m.fx) {
          const dx = m.fx[0] - player.pos.x, dz = m.fx[1] - player.pos.z;
          hud.ddi(Math.atan2(-dx, -dz) - player.yaw);
        }
        fxShake(Math.min(0.05, m.dmg * 0.0012));
        padRumble('hurt', Math.min(1, 0.4 + m.dmg / 80));
        vib('hit'); // T99 v1.64: MP mirror twin — FX-only, hp math stays server-side
      },
      onMatch: (d) => { // MP-3: server lifecycle → announcements (limits/scores stay server-side)
        if (d.ev === 'start') { hud.announce(t('a.matchStart'), t('a.matchStartS', { md: d.md.toUpperCase(), room: mpRoomId || CFG.MP.room })); mpCareer0 = { s: player.shotsFired || 0, h: player.shotsHit || 0 }; if (!inMatch && mp.ready && !mp.spec) startMatch(d.md || 'ffa', ui.difficulty, true); } // T45 §29.3: real room id (private code visible at match start) · [T157] THE LOBBY-RIDER LAW — a joined, not-yet-deployed player (in the LOBBY face, or a menu) deploys when the round actually starts: the parameter chain's THEN-game step is server-driven (the starter's own ev:'start' arrives inMatch → the !inMatch guard skips it; the rider's startMatch runs fromServer=true — the server ALREADY started, no re-emit). Old servers send no md → ffa fallback byte-honest
        else if (d.ev === 'lobbyMode') hud.announce(t('a.lobbyMode'), t('a.lobbyModeS', { md: (d.md || '').toUpperCase(), by: d.by ? t('a.lobbyModeBy', { by: d.by }) : '' })); // T45 §29.2: host lobby pick broadcast
        else if (d.ev === 'lobbyMap') hud.announce('MAP SELECTED', ((Maps.nameOf(d.map) || d.map || '') + '').toUpperCase() + (d.by ? ' — by ' + d.by : '')); // §51.3: host map pick broadcast (EN literal — i18n keys pending, documented residual)
        else if (d.ev === 'lobbyKnobs') hud.announce('HOST RULES UPDATED', 'score ' + ((d.knobs && d.knobs.sl) || 'default') + ' · time ' + ((d.knobs && d.knobs.tl) ? Math.round(d.knobs.tl / 60) + ' min' : 'default')); // §52.4: knob broadcast (EN literal residual)
        else if (d.ev === 'brLoot') renderLootManifest(d.loot); // [T171] the room's ground-loot manifest → client meshes
        else if (d.ev === 'lootNew') renderLootManifest([d.it]); // [T171] BR death-drop delta
        else if (d.ev === 'lootTake') takeLootById(d.id); // [T171] someone (incl. me) took it — hide everywhere
        else if (d.ev === 'live') { hud.announce(t('a.live'), ''); if (!mpCareer0) mpCareer0 = { s: player.shotsFired || 0, h: player.shotsHit || 0 }; }
        else if (d.ev === 'flag') hud.announce(d.owner === mp.myTeam ? t('a.flagCap', { id: d.id }) : t('a.flagLost', { id: d.id }), d.owner === mp.myTeam ? t('a.flagCapS', { xp: CFG.XP.capture }) : '');
        // --- T1-1 (SS22): hill / round / bomb / tier events ---
        else if (d.ev === 'hill') hud.announce(t('a.hill', { id: d.id }), t('a.hillS'));
        else if (d.ev === 'round') { // SND round transition: per-receiver spawn (server teleports)
          killcamEnd(); // G-2: a round transition during death reclaims the camera before the redeploy
          hud.announce(t('a.round', { r: d.r }), d.side === mp.myTeam ? t('a.attackS') : t('a.defendS'));
          if (d.spawn) serverSpawn({ x: d.spawn[0], y: d.spawn[1] || 0.05, z: d.spawn[2] });
          player.alive = true; player.hp = CFG.HEALTH.maxHP; hud.showDeath(false); refillLoadout(); weapons.equip(0, true);
        }
        else if (d.ev === 'bomb') hud.announce(d.st === 'planted' ? t('a.planted') : d.st === 'defused' ? t('a.defused') : t('a.destroyed'), d.why || '');
        else if (d.ev === 'mode') hud.announce(d.why || '', d.st === 'pz' ? t('a.modeEv') : ''); // T89 L1/L2/L3: trio chain events (additive wire law — old clients fall through)
        else if (d.ev === 'gfkit') gfKit(d.kit, d.r, true); // T89 L1: server-owned Gunfight kit → temp-loadout apply (wire path)
        else if (d.ev === 'tier') { if (d.id === mp.myId) mpOnTier(d.t, d.wid); }
        else if (d.ev === 'end') {
          killcamEnd(); // G-2: the results screen never plays under the killcam
          hud.announce(t('a.matchOver'), d.draw ? t('a.moDraw', { reason: d.reason }) : (d.mine ? t('a.moWin', { reason: d.reason }) : t('a.moLose', { reason: d.reason })));
          // Task 35: results screen from the end-event board[] (residual-of-residuals).
          // Pause-semantics reuse: paused=true before exitLock so the lockchange handler
          // does not hijack the results page into page-pause. Dismiss on 'lobby'.
          if (inMatch && Array.isArray(d.board)) {
            paused = true; exitLock(); mpResultsUp = true; mpResultsShownAt = performance.now();
            // [T120] inMatch stays TRUE through the results (the room still owns the round and
            // the lobby-hud's ESC→pause→QUIT path needs it) — the results EXIT is a ROOM QUIT
            // (ui.js btn-res-menu branches on deps.mp), not a page show; the live E2E caught
            // the original show('page-main') being refused by the slip-guard (the MP.8 trap).
            if (!mp.spec) { // T41 §25.4: spectators watch — career counts only PLAYED matches
            // T40: MP career/accuracy accounting (logged Task-35 residual) — server-truth board
            // me-row for kills/deaths/win, client shot/hit deltas for accuracy. bestStreak stays
            // offline-owned in career (MP streaks are server-side; no client streak counter — §24).
            const me = d.board.find(r => r.me) || {};
            career.mpMatches = (career.mpMatches || 0) + 1;
            career.matches = (career.matches || 0) + 1;
            if (d.mine) career.wins = (career.wins || 0) + 1;
            career.kills = (career.kills || 0) + (me.k || 0);
            career.deaths = (career.deaths || 0) + (me.de || 0);
            career.shots = (career.shots || 0) + Math.max(0, (player.shotsFired || 0) - (mpCareer0 ? mpCareer0.s : 0));
            career.hits = (career.hits || 0) + Math.max(0, (player.shotsHit || 0) - (mpCareer0 ? mpCareer0.h : 0));
            career.kd = career.deaths ? (career.kills / career.deaths).toFixed(2) : career.kills.toFixed(0);
            career.acc = career.shots ? Math.round(career.hits / career.shots * 100) : 0;
            saveCareer(career); ui.refreshCareer();
            const end = d; // §52.1: end-event alias (needle-shaped local)
            recordHistoryAndDaily(end.md || '', !!d.mine, me.s || 0, me.k || 0, me.de || 0, 0, 0, true); // §52.1: MP end hook (inside the !mp.spec gate)
            achCheckMatchEnd(); // [T132] the MP end sweep — the offline endMatch had the ONLY toasting unlock path; an MP win never checked (the user playtest: "I won a match, didn't get any achievements" — 'Get 1 elim' stayed locked). career.kills landed on the lines above, so the eval sees the same truth the offline path sees.
            }
            ui.showMpResults(d, match.session);
          }
        }
        else if (d.ev === 'lobby') {
          hud.announce(t('a.lobby'), t('a.lobbyWait'));
          // [T120] the auto-dismiss only owns the screen while the RESULTS FACE is still up —
          // a player who already clicked MAIN MENU keeps their menus (the live E2E caught the
          // lobby event yanking the just-opened menu-root away — the MP.8 seam).
          if (mpResultsUp && ui._curPage === 'page-results' && performance.now() - mpResultsShownAt > 3500) { // results auto-dismiss when the server returns the room to lobby — NOT before the 3.5s minimum read (the [T120] clock)
            mpResultsUp = false; paused = false;
            ui.hideAll(); $('hud').classList.remove('hidden');
            // pointer re-lock needs a user gesture (browser reality): the canvas click
            // path (input.js requestLock on fire-down) re-engages it — no auto requestLock.
          }
        }
      },
      // --- MP-3.1 residuals (Task 33): server-owned grenades / streaks / abilities / host ---
      onNadeSpawn: (d) => { // T2-9: visual via THE weapons projectile path (sim local, verdict server)
        weapons.spawnProjectile(new THREE.Vector3(d.o[0], d.o[1], d.o[2]), new THREE.Vector3(d.d[0], d.d[1], d.d[2]), d.kind || 'frag', d.f); // Task 35: kind renders frag vs flash
      },
      onBoom: (d) => { // T2-9/T2-10: authoritative detonation — FX/audio here, damage already applied server-side
        const p3 = new THREE.Vector3(d.x, d.y, d.z);
        // FIX (Task 35 probe find): was FX.explosion — FX is the STATE bag (tracers/particles/...),
        // not the function namespace; the boom FX call has been throwing (socket.io swallows
        // listener exceptions) and the browser never rendered boom FX since Task 33.
        FXfns.explosion(p3, d.r); SFX.explosion(p3); fxShake(0.05);
      },
      onDestNet: (d) => applyDestNet(d), // §54.5 U7: server-owned destructible truth → world apply (FX incl. for all viewers)
      onCrate: (d) => { // T2-10: falling supply crate visual (9 m/s — modes.js:102 verbatim)
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x3a4048, emissive: 0x29d3ff, emissiveIntensity: 0.25 }));
        mesh.position.set(d.x, 26, d.z); mesh.castShadow = true;
        scene.add(mesh);
        mpCrates.push(mesh);
      },
      onSupply: (d) => { // T2-10: crate landed — shield is server-applied (snapshot mirrors it)
        while (mpCrates.length) { scene.remove(mpCrates.pop()); }
        if (d.mine) { hud.banner(0, 'SUPPLY DROP SECURED'); refillLoadout(); SFX.pickup(null, 0); }
      },
      onStreakEv: (d) => { // T2-10: UAV/AIRSTRIKE announcements (modes.js:246/255 verbatim strings) — [T155 R6] the def name rides d.nm: default-slot defs keep the i-keys, non-default defs announce their own name (the WEAPONS proper-noun law)
        const loArr = (Array.isArray(loadout && loadout.streaks) && loadout.streaks.length === 3) ? loadout.streaks : [0, 1, 2];
        const evDef = (d.i >= 0 && d.i <= 2) ? CFG.STREAKS[loArr[d.i]] : null;
        if (d.nm && evDef && evDef.name !== d.nm) { hud.announce(d.nm, d.nm + ' ONLINE'); SFX.announceSting(1); }
        else if (d.i === 0) { hud.announce(t('a.uav'), t('a.uavS')); SFX.pickup(null, 0); }
        else if (d.i === 1) { hud.announce(t('a.strike'), t('a.strikeS')); SFX.announceSting(1); }
      },
      onMatchErr: (d) => hud.announce(t('a.matchErr'), d.why === 'notHost' ? t('a.errHost') : d.why === 'sndNoRespawn' ? t('a.errSnd') : t('a.errGeneric')), // T2-12 + SS22.3
      onFlashEv: (d) => { // Task 35: flashbang broadcast — FX/audio for the room, blind only for tagged victims
        const p3 = new THREE.Vector3(d.x, d.y, d.z);
        FXfns.muzzle(p3, true); SFX.flashRing(1); // weapons.detonate flash branch parity (offline); FXfns = function namespace (FX is the state bag)
        if (d.mineStr != null) applyBlind(d.mineStr, FLASH); // server computed strength (doFlash verbatim)
      },
      onRoster: (d) => { // T2-12: lobby affordances (mp.js gates live-match rosters out)
        if (d.priv && d.code) hud.announce(t('a.privCode', { code: d.code }), d.meHost ? t('a.privHostS') : t('a.privGuestS')); // T45 §29.3: private lobby code visibility
        else if (d.meHost) hud.announce(t('a.lobbyHost'), t('a.lobbyHostS'));
        else if (d.hostN) hud.announce(t('a.lobby'), t('a.lobbyHostN', { n: d.hostN }));
        if (d.map && d.map !== Maps.currentId && d.map !== 'custom') setMap(scene, d.map).then(applyMapCameraFar).catch((e) => console.warn('aps] roster rebuild to ' + d.map + ' failed, keeping ' + Maps.currentId)); // §51.3: rebuild on host map change (rotation-failure law) · [T140 G-3] 'custom' is EXCLUDED here — mp.js owns the wire-map path (host LS original / joiner mapdata pull → onWireMap)
        if (uiReady) ui.setMpLobby({ priv: !!d.priv, code: d.code || null, md: d.md || null, map: d.map || null, knobs: d.knobs || null, meHost: !!d.meHost, ps: d.ps || [], specs: d.specs || 0 }); // T45 §29.3 + §51.3/§52.4: additive map + knobs (Task 73 supersession) · [T157] ps + specs ride — the LOBBY face renders the player list (names + clan tags + the spectator count); the roster chain's player rows were dropped at this seam before, so the lobby never showed who was in it
      },
      onCareer: (d) => { if (uiReady) ui.careerAward(d); }, // T44 §28.3: per-socket XP award at match end → results screen
      onRanked: (d) => { if (uiReady) ui.rankedAward(d); }, // T46 §30.6: per-socket ranked award (ranked matches only) → results RP line + corner catch-up
      onEmote: (d) => { if (inMatch) hud.announce(d.text, d.n); }, // T55 §39.4: remote taunt → announce(text, name) — announce-based surface (§39 honest scope)
      playerPos: () => (player && player.pos ? player.pos : null), // [T140 G-4] the voice listener env — the local eye feeds the proximity panner math (mp.js polls per frame)
      onWireMap: (id) => { if (Maps.currentId !== id) setMap(scene, id).then(applyMapCameraFar).catch((e) => console.warn('aps] wire-map rebuild to ' + id + ' failed', e && e.message)); }, // [T140 G-3] the custom-map rebuild AFTER the registered data landed (mp.js ordering law)
      onJoinErr: (d) => hud.announce('JOIN FAILED', String((d && d.why) || '?').toUpperCase()), // [T140] the honest join face (flood/code/noRoom/powfail — EN literal, the §51.3 documented-residual precedent)
    });
    mpInstallProbe();
  }

// T1-1 (SS22.4): Gun Game tier landing — equip rides the server 'tier' event's wid
// (server ladder is authoritative; IRON_GGLAD probe shortening stays invisible to the
// client ladder). Snapshot me.g deltas land here with wid=null (fallback mirror).
function mpOnTier(t, wid) {
  if (wid && wid !== 'melee') weapons.equipWeapon(wid, true);
  const total = (GG_LADDER.length + 1);
  if (t <= GG_LADDER.length) hud.announce('', t('a.ggTier', { t, total, w: String(wid || '').toUpperCase() }));
  else if (t === total) hud.announce(t('a.knifeFin'), t('a.knifeFinS'));
}

  weapons = new WeaponSystem(camera, player, {
    targets: () => bots ? bots.bots : [],
    scene: () => scene,
    getSettings: () => settings,
    mouseVel: () => mouseVel,
    onShotNoise: (pos) => { bots.addNoise(pos, 0, 34); match.trackShot(); player.shotsFired++; vib('fire'); onbEvent('onb-fire'); }, // T89: haptic fire + onboarding S4
    onReload: (w, empty) => { if (CFG.MP.enabled) sendReload(w.def.id, empty); }, // T40 §24: server reload gate (shell-load approximated — spec)
    onDamage: (target, dmg, head, attacker, wdef) => routeDamageToBot(target, dmg, head, attacker, wdef),
    onDest: (id, dmg) => { if (!CFG.MP.enabled) applyDestDamage(id, dmg); }, // §54.3 U7: offline local sim; MP = server truth via 'dest' (no-op here)
    onDry: () => {},
    onAmmoChanged: () => {},
    onExplosion: (pos, radius, dmg, owner) => { if (CFG.MP.enabled) return; match.areaDamage(pos, radius, dmg, owner); fxShake(0.04); }, // MP: server owns blast verdicts (T2-9)
    onFlash: (pos, cfg) => doFlash(pos, cfg),
    onNade: CFG.MP.enabled ? (pos, vel, fuse, kind) => { sendNade(pos, vel, fuse, kind); vib('fire'); onbEvent('onb-equip'); } : (pos, vel, fuse, kind) => { weapons.spawnProjectile(pos, vel, kind, fuse); vib('fire'); onbEvent('onb-equip'); }, // T2-9 server-owned flight · [T117] offline spawn RESTORED — the T89 haptics edit made this hook always-defined and dropped the verbatim spawn (nades decremented + whoosh, nothing flew); the else-fallback in throwNade is dead when the hook exists
  });

  bots = new BotManager(scene, {
    player, mode: () => match.mode, camera: () => camera, settings: () => settings,
    onPlayerHit: (dmg, attacker, head, hitPoint) => damagePlayer(dmg, attacker, head, attacker.weapon.name),
    onBotHitByBot: (bot, dmg, head, attacker) => {
      const res = bots.applyDamage(bot, dmg, head, attacker, attacker.weapon.name);
      if (res.died) match.registerKill(attacker, bot, head, attacker.weapon.name);
    },
  });

  TRAINER.init({ // [T168] the trainer wakes with the sim — deps are closures (player/career/ui resolve at call time)
    inMatch: () => inMatch,
    announce: (a, b) => { if (hud) hud.announce(a, b); },
    requestLock: () => { try { requestLock(); } catch (e) {} },
    exitLock: () => { try { exitLock(); } catch (e) {} },
    wallet: () => (career && (career.cr | 0)) || 0,
    walletRefresh: () => { try { if (uiReady && ui) ui.refreshCareer(); } catch (e) {} }, // the CR page/strip mirror (ui.js:1561 refreshCareer)
  });

  match = new Match({
    player, bots, weapons,
    camera: () => camera, scene: () => scene, settings: () => settings,
    loadout: () => loadout, state: () => match.state, difficulty: () => ui.difficulty,
    streakLoadout: (loadout && Array.isArray(loadout.streaks) && loadout.streaks.length === 3) ? loadout.streaks : [0, 1, 2], // [T155 R6] slot→STREAKS-def equip (the loadout single truth; default = the pre-T155 slots verbatim)
    mp: () => CFG.MP.enabled, // MP-3.1: modes.js MP-lite gate (server owns time/DOM/win checks)
    onKill: (k, v, h, w) => { if (k && k.isPlayer && h) player.headshots = (player.headshots || 0) + 1; vib('kill'); match.registerKill(k, v, h, w); onbEvent('onb-objective', true); }, // T89: headshot stat + haptic kill; objective event SOFT here (ping/cap are the real sites — see onbEvent soft law)
    announce: (t, s) => hud.announce(t, s),
    banner: (pts, l) => hud.banner(pts, l),
    killfeed: (k, v, w, h) => hud.killfeed(k, v, w, h),
    respawnPlayer: () => respawnPlayer(),
    refillLoadout: () => refillLoadout(),
    damagePlayer: (dmg, from, head, wpn) => damagePlayer(dmg, from, head, wpn),
    endMatch: (res) => endMatch(res),
    cycleDifficulty: () => {
      ui.difficulty = (ui.difficulty + 1) % 4;
      hud.announce('', t('a.botSkill', { n: t('ix.d' + ui.difficulty) })); // ix.d0..d3 == BOT_TIERS names (§48.8)
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', +b.dataset.d === ui.difficulty));
    },
  });

  hud = new HUD();
  hud.onReport = (name, reason) => { sendSoc({ op: 'report', name, reason, tok: ui && ui.auth && ui.auth.tok, pid: mpPid || undefined }); }; // [T118 G-8] the scoreboard report seam — the server resolves the name via pidByName (the §53.3 friendReq precedent); the ack arc rides mp.onSoc below · [T122 G-8] the payload rides the device pid (the T44 §28.1 identity, the hub's sendQ idiom): the anonymous client's tok is undefined and WITHOUT the pid the server's identity gate rejects every report (live-caught in the T122 E2E — the silent-drop law's fifth face, an identity-less payload)
  initEffects(scene, camera, CFG.QUALITY[settings.quality]);

  ui = new UI({
    settings, loadout, career,
    startMatch: (mode, diff) => startMatch(mode, diff),
    gfKit: (kit, r) => gfKit(kit, r), // T89 L1: Gunfight temp-loadout kit apply (the pre-rewind giveKit leak fix)
    onbEvent: (name) => onbEvent(name), // T89 L10: stage completion feed (modes.js objective/cap sites)
    resumeMatch: () => resumeMatch(),
    quitMatch: () => quitMatch(),
    inMatch: () => inMatch, // [T119] the slip-guard reads the LIVE match state (ui.show refuses menu pages over a running round)
    rematch: () => startMatch(match.mode, ui.difficulty),
    settingsChanged: () => applySettings(),
    settingsSwap: (s) => { settings = s; }, // [T122] (4) the identity-swap propagation — the profile load + the settings-wide restore rebind THE binding the per-frame loop reads (live-caught: the swap left main.js's `settings` stale and applySettings re-persisted the OLD values)
    resolveRegion, mpPingRegion, // T43 §27: ONLINE tab — injected, ui.js stays decoupled from the net stack
    mpLeaderboard, // T49 §33: SEASON LADDER row — injected, ui.js stays decoupled from the net stack
    ensureIo: (s, cb) => ensureIo(s, cb), // [T120 S-3] the hub's connect-on-demand — injected, ui.js stays decoupled from the net stack
    mp: () => CFG.MP.enabled, // T45 §29.3: PRIVATE row gate (offline menu byte-identical)
    mpState: () => ({ joined: mp.joined, ready: mp.ready, inLive: mp.inLiveMatch }), // [T157] the lobby face reads connection/live truth (CONNECTING vs LOBBY status; DEPLOY hides on a live room — the port path owns that case)
    setMode: (m) => sendSetMode(m), // T45 §29.3: LOBBY MODE seg — injected, ui.js stays decoupled from the net stack
    setRoomMap: (id) => { // §51.3: LOBBY MAP host pick · [T140 G-3] custom = mapreg FIRST (the registered stage), then setMap — the honest order the server enforces
      if (id === 'custom') { const ce = Maps.customEntry(); if (ce && ce.custom) sendMapReg(ce.custom); }
      sendSetMap(id);
    },
    setKnob: (k) => sendSetKnob(k), // §52.4: HOST RULES APPLY
    sendAuth: (p) => sendAuth(p), // §53.7: account/economy/social/queue senders + device pid
    sendEco: (p) => sendEco(p),
    mpLive: () => mp.connected, // T102 v1.67: the meta economy's server-session gate — the ui stays decoupled from the net stack (the resolveRegion injection law)
    sendSoc: (p) => sendSoc(p),
    sendQ: (p) => sendQ(p),
    devicePid: () => mpPid, // §53.1: register/login bind the account to THIS device pid (merge law)
    replayLastPacked: () => !!Replay.lastPacked, // §49.2 (Task 65 W2, rebuilt): results WATCH REPLAY gate
    watchReplay: (id) => { location.search = id ? '?replay=' + id : '?replay=1'; }, // §49.2: boots the documented T42 §26.4 viewer path (latest record when id absent)
  });
  // §53.7: AUTH hydration (stays-signed-in) + response routing (persist on register/login)
  const savedAuth = JSON.parse(localStorage.getItem('ironsight.auth.v1') || 'null');
  if (savedAuth && savedAuth.tok) { setAuth(savedAuth); ui.auth = savedAuth; } // [T166] the bands + gate hydrate from the persisted session immediately (name + tok + disc) — the server acks refresh them on the first live op
  mp.onAuth = (d) => {
    if (!d) return;
    if ((d.op === 'register' || d.op === 'login') && d.tok) {
      setAuth(d);
      try { localStorage.setItem('ironsight.auth.v1', JSON.stringify({ name: d.name, tok: d.tok, disc: d.disc })); } catch (e) {} // [T166] the pilot ID persists with the session
      if (uiReady && ui.onAuth) ui.onAuth(d);
    } else if (d.op === 'me' && d.tok) { setAuth(d); if (uiReady && ui.onAuth) ui.onAuth(d); }
    else if (d.op === 'logout') { setAuth(null); try { localStorage.removeItem('ironsight.auth.v1'); } catch (e) {} if (uiReady && ui.onAuth) ui.onAuth(d); }
    else if (d.err) { if (uiReady && ui.onAuth) ui.onAuth(d); } // [T121 S-2] the server's auth ERR answers ride ui.onAuth too (the err map → the hub status line) — the T120 second-silent-drop law: response handlers enumerate the SERVER's answer set, not just the success set
  };
  mp.onEco = (d) => { if (uiReady && ui.onEco) ui.onEco(d); }; // §53.2: ecoState pushes + op acks
  mp.onSoc = (d) => { if (uiReady && ui.onSoc) ui.onSoc(d); if (d && d.op === 'report' && !d.err) hud.announce(t('rep.done'), d.dup ? t('rep.dup') : ''); else if (d && d.op === 'report' && d.err) hud.announce(t('rep.fail'), t('rep.e.' + String(d.err)) || String(d.err)); }; // §53.3: social state pushes + [T118 G-8] the report ack arc (the T116 boot-sweep toast precedent) · [T122 G-8] the server errs map readable (rep.e.* — the T121 onAuth err-map idiom), raw token stays the fallback
  mp.onQueue = (d) => { if (d && d.room && (d.op === 'pop' || d.op === 'quick')) location.href = location.pathname + '?mp=1&room=' + d.room + '&auto=1' + (d.mode ? '&md=' + d.mode : ''); if (mp.onQueueUi) mp.onQueueUi(d); }; // §53.4: pop → existing join flow · [T120 S-3] the quick ack joins the same way (the server answers quick SYNCHRONOUSLY with the room id — the room id IS the join contract) + the hub mirror rides every ack · [T141] auto=1 — the assigned lobby is the join contract · [T157] md rides the redirect — the lobby face shows the queue's mode DURING the boot/dial window (the mode > type > lobby > game chain starts at the click, not at the ack)
  mp.onQueueUi = (d) => { if (uiReady && ui.queueStatus) ui.queueStatus(d); }; // [T120 S-3] queue acks/errors → the hub status line (rank position + the honest error faces)
  // §52.2 S3 first-boot law + v1.55 T89 L10 upgrade: staged onboarding (onboard.js single
  // truth) — active stages show page-onboard in STAGED form; the §52.2 primer content stays
  // as the S-completion fallback (page renders stages until onbActive() is false).
  let returning = !!localStorage.getItem('ironsight.pid.v1'); // §52.2 S3: pid-existed counts as returning
  if (!returning) returning = !!localStorage.getItem('ironsight.onboarded.v1'); // OR the onboarded flag (first-run primer seen)
  if (!returning) returning = !onboard.onbActive(onboard.onbState()); // T89: migrated/complete tutorial state counts too
  ui.showLoading(); ui.hideLoading();
  // [T166] THE BOOT ACCOUNT GATE — the CoD law: the game OPENS on the account face. A live
  // saved session skips it (the stays-signed-in law [j_02] — zero-friction return); everyone
  // else lands on page-account (the T122 face + the T166 first-pilot card: one-click ADMIN,
  // register, or continue offline). First visits finish onboarding first — onbFinish() routes
  // them into the same gate (the tutorial → account → menu order).
  const hasSession = !!(savedAuth && savedAuth.tok);
  if (returning) ui.show(hasSession ? 'page-main' : 'page-account');
  else ui.show('page-onboard'); // first visit → staged onboarding (renderOnboard drives it)
  if (CFG.MP.enabled && CFG.MP.room && new URLSearchParams(location.search).has('auto') && !new URLSearchParams(location.search).has('spec')) ui.show('page-private'); // [T157] THE CONNECTING FACE — an auto queue boot (?mp=1&room=X&auto=1) lands on the LOBBY face immediately, not the main menu: the "reload → main page → wait → in-match dump" the user reported becomes reload → LOBBY (CONNECTING status) → roster fills → deploy/game. The joined ack re-renders the same page with live roster truth
  uiReady = true; // T44 §28.4: async MP callbacks (onJoined profile / onCareer) may target ui from here on

  // gamepad layer [W3C standard mapping — js/gamepad.js header]
  const _av1 = new THREE.Vector3(), _av2 = new THREE.Vector3();
  initGamepad({
    settings: () => settings,
    announce: (t, s) => hud.announce(t, s),
    assist: () => { // near-target cone test for rotational aim assist
      if (!player.alive) return false;
      const G = CFG.GAMEPAD;
      const cosCone = Math.cos(G.assistAngle * Math.PI / 180);
      player.forward(_av1);
      for (const b of bots.bots) {
        if (!b.alive || b.team === player.team) continue;
        _av2.copy(b.pos); _av2.y += 1.2; // chest aim point (bot height 1.8)
        _av2.sub(player.pos);
        const d = _av2.length();
        if (d > G.assistDist || d < 0.001) continue;
        if (_av2.divideScalar(d).dot(_av1) > cosCone) return true;
      }
      return false;
    },
  });

  player.hooks.fallDamage = (d) => { if (player.dropT > 0) return; damagePlayer(d, { name: 'GRAVITY' }, false, 'FALL'); }; // [T171] the BR insertion drop never reads as a fall
  player.hooks.dropGlide = (p, ev) => { // [T171] BR insertion: capped fall + forward glide feel; landing/water disarms the drop (a reservoir splash must NOT leave fall damage disabled for the match)
    if (p.dropT > 0) {
      p.vel.y = Math.max(p.vel.y, CFG.MODES.br.dropFall);
      if (ev.land || p.swimming || p.wading) p.dropT = 0;
    }
  };
  player.hooks.pickup = () => checkPickups();
  // [T119] TPV (issue 4) — the over-the-shoulder body rig + the boom obstruction hook.
  // Primitives rig (Lambert, team-neutral), visible ONLY in third-person; the viewmodel
  // stays FP-only. The boom pull-in marches the AABB set — the camera never goes behind a wall.
  // [T120] TPV body cosmetics (the R4 polish): the rig wears the EQUIPPED weapon finish
  // (cosmetics.js FINISHES carry body/accent — STOCK keeps the military-green defaults);
  // materials stay refs so the per-frame motion block can animate them.
  {
    const g = new THREE.Group();
    const fin = (typeof loadout !== 'undefined' && loadout) ? finishById(loadout.finish) : null;
    const uni = new THREE.MeshLambertMaterial({ color: (fin && fin.body) || 0x5a6b52 });
    const dark = new THREE.MeshLambertMaterial({ color: (fin && fin.accent) ? new THREE.Color(fin.accent).multiplyScalar(0.55).getHex() : 0x39423a });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.62, 4, 10), uni); torso.position.y = 1.02;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), dark); head.position.y = 1.62;
    // [T121] the skeletal tier: the single leg mass splits into TWO swing limbs inside a
    // pivot that KEEPS the old transform contract (position.y 0.38 — the T120 squash block
    // drives rig.legs.scale.y/.position.y unchanged); arms join as shoulder-pivoted swing
    // limbs. Same primitives law, same two materials — additive members, zero renamed keys.
    const legs = new THREE.Group(); legs.position.y = 0.38;
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.5, 4, 8), dark); legL.position.x = -0.105;
    const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.5, 4, 8), dark); legR.position.x = 0.105;
    legs.add(legL, legR);
    const armL = new THREE.Group(); armL.position.set(-0.345, 1.3, 0);
    const armLm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 4, 8), uni); armLm.position.y = -0.21; armL.add(armLm);
    const armR = new THREE.Group(); armR.position.set(0.345, 1.3, 0);
    const armRm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 4, 8), uni); armRm.position.y = -0.21; armR.add(armRm);
    g.add(torso, head, legs, armL, armR); g.visible = false;
    g.userData.rig = { torso, head, legs, legL, legR, armL, armR };
    player.tpBody = g; scene.add(g);
    // [T130] the skinned operator body — the verified CDN registry (ops3d.js), the
    // primitives above stay as the live fallback until `ready` flips (and forever on
    // load failure). Tint = the equipped finish body color (the T120 finish law).
    try {
      const opId = (typeof loadout !== 'undefined' && loadout && loadout.operator) || 'ranger';
      const r3 = ops3dRig(opId, { tint: (fin && fin.body) || 0x5a6b52 });
      if (r3) {
        r3.group.visible = false;
        g.add(r3.group);
        player._tp3d = r3; player._tp3dOp = opId; // [T115] the op stamp — the TPV poll rebuilds the rig on operator change
      }
    } catch (e) { player._tp3d = null; }
  }
  player.hooks.obstruct = (a, b) => { // [T119] 8-step march — last free point wins; never behind a wall
    let last = null;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
      let hit = false;
      for (const c of World.colliders) {
        if (x > c.min.x - 0.3 && x < c.max.x + 0.3 && y > c.min.y - 0.2 && y < c.max.y + 0.2 && z > c.min.z - 0.3 && z < c.max.z + 0.3) { hit = true; break; }
      }
      if (hit) break;
      last = new THREE.Vector3(x, y, z);
    }
    return last || a.clone();
  };

  applySettings();
  addEventListener('resize', onResize);
  // T42 §26.4: replay viewer boot — ?replay=1 WITHOUT mp (no join, no live stream; newest record or ?replay=<id>)
  const rvq = new URLSearchParams(location.search);
  if (rvq.has('replay') && !CFG.MP.enabled) startReplayViewer(rvq.get('replay'));
  // test/verification hook (also lets power users script the sim)
  // [T121] the remotes read joins the hook — the fill-bot pathfinding E2E reads bot
  // transforms through the SAME remoteActors the spectate rig cycles (mp.js:586).
  window.__IR = {
    CFG, Input, player, weapons, bots, match, world: World, hud, settings, ui, requestLock, damagePlayer, inMatch: () => inMatch, isPaused: () => paused,
    trainer: TRAINER, // [T168] the trainer joins the probe surface (the T121 remotes-read precedent — power users + acceptance probes script the toggles)
    remotes: () => remoteActors(),
    ops3d: () => ops3dStats(), // [T130] the per-rig clip-coverage record (the honest audit: found vs missing per operator)
    touchAssist: () => ({ err: Input.touchMode ? touchAssistCone() : -1, pos: assistPos, autoFire: Input.autoFireOn }),
    replay: () => ({ viewer: replayViewer, ...Replay.state(), lastPacked: !!Replay.lastPacked, playhead: rpv.playhead, speed: rpv.speed, playing: rpv.playing, actors: rpv.meshes.size }),
    killcam: () => ({ active: killcamActive(), windowMs: KC_WINDOW_MS, liveCastHidden: mp.killcamHide }),
  }; // [v1.50 port T90] §60.2 M1/M7-lite verification hook · G-2 killcam surface joins
  requestAnimationFrame(loop);
}

// ---------------- T41 §25.4: spectate rig ----------------
// Chase cam between known player transforms (SPIKE_REPLAY verdict (c)): follows the
// cycled remote actor's interpolated transform; mouse free-look orbit via Input.mdx/mdy;
// slow auto-orbit on the join spawn seed when the room has no alive actors. Pure
// presentation — no local sim, no wire sends (server enforces read-only via joined:false).
const specSeed = new THREE.Vector3();
let specSeedOk = false, specTargetId = null, specYaw = 0, specPitch = 0.22, specFreeT = 0;
let specEdgeNext = false, specEdgePrev = false, specPrevAds = false;
function specRig(dt, actorProvider) { // T42 §26.4: parameterized provider — default arg preserves the §25 spectate path byte-identically; viewer passes playback actors (same {id,name,alive,pos,yaw} shape)
  const actors = actorProvider || remoteActors().filter(a => a.alive);
  if (Input.mdx || Input.mdy) specFreeT = 2.5; // mouse activity opens the free-look window
  specYaw -= Input.mdx * 0.0022;
  specPitch = Math.max(-0.9, Math.min(1.2, specPitch - Input.mdy * 0.0022));
  specFreeT = Math.max(0, specFreeT - dt);
  const nextE = specEdgeNext, prevE = specEdgePrev; specEdgeNext = specEdgePrev = false;
  if (!actors.length) { // empty room / no alive actors: auto-orbit the camera seed (§25.1 join spawn)
    specYaw += dt * 0.25;
    const c = specSeedOk ? specSeed : player.pos; // pre-ack fallback: the player entity's spawn
    const cy = specSeedOk ? specSeed.y : c.y;
    const cx = c.x, cz = c.z; // capture BEFORE mutating camera.position (c may alias it)
    camera.position.set(cx + Math.sin(specYaw) * 6, cy + 2.4, cz + Math.cos(specYaw) * 6);
    camera.lookAt(cx, cy + 1.2, cz);
    hud.spectate(null, 0, 0);
    return;
  }
  let idx = actors.findIndex(a => a.id === specTargetId);
  if (nextE || prevE || idx < 0) { // cycle (re-arms chase mode)
    idx = idx < 0 ? 0 : (idx + (prevE && !nextE ? -1 : 1) + actors.length) % actors.length;
    specTargetId = actors[idx].id;
    specFreeT = 0; specYaw = actors[idx].yaw;
    hud.spectate(actors[idx].name, idx + 1, actors.length);
  }
  const t = actors[idx];
  if (specFreeT > 0) { // free-look orbit around the target
    const d = 4.2, cp = Math.cos(specPitch);
    camera.position.set(t.pos.x + Math.sin(specYaw) * cp * d, t.pos.y + 1.9 + Math.sin(specPitch) * d * 0.6, t.pos.z + Math.cos(specYaw) * cp * d);
    camera.lookAt(t.pos.x, t.pos.y + 1.4, t.pos.z);
  } else { // chase: behind-and-above the target facing (rotation.y convention: fwd = (−sin yaw, 0, −cos yaw)); position smoothed
    const fx = -Math.sin(t.yaw), fz = -Math.cos(t.yaw);
    const dx = t.pos.x - fx * 4.2, dy = t.pos.y + 1.9, dz = t.pos.z - fz * 4.2;
    const k = Math.min(1, dt * 12);
    camera.position.x += (dx - camera.position.x) * k;
    camera.position.y += (dy - camera.position.y) * k;
    camera.position.z += (dz - camera.position.z) * k;
    camera.lookAt(t.pos.x, t.pos.y + 1.4, t.pos.z);
  }
}

// ---------------- T115 G-2: killcam — COD-style watch-the-kill on the §26 capture ----------------
// Rides the EXISTING Replay capture (the G-2 ledger verdict): at own death the trailing
// ~3.3s window is packed from the live rings (Replay.packWindow — a pure read; the full
// match record still packs at segment end) and played back FIRST-PERSON from the killer's
// recorded transform. The live remote cast steps aside (mp.killcamHide gate in mp.js) and
// a replay cast (viewer mesh parity — capsule + team color) takes the stage. The killer's
// own body is never rendered — you ARE the killer (COD law). Any fresh fire edge skips;
// respawn / round edge / match end always reclaim the camera. Offline deaths (bots) have
// no wire capture — the orbit death cam continues untouched (MP-scoped, §26.5 law).
const KC_WINDOW_MS = 3300; // window length — respawn delay 3.5s (config.js) minus the HUD beat
let kcv = null;            // { pb, killerRef, t0, dur, meshes, firePrev }
function killcamActive() { return !!kcv; }
function killcamStart(killerId, killerName, weapon, head) {
  if (!CFG.MP.enabled || settings.killcam === false || !Replay.recording || killerId == null || kcv) return false;
  const win = Replay.packWindow(KC_WINDOW_MS);
  if (!win || win.rec.durationMs < 400) return false; // window too thin (join/match-start edge) → orbit cam
  let pb;
  try { pb = makePlayback(unpackRecord(win.rec.bin)); } catch (e) { return false; } // a corrupt window never blocks the death flow
  const killerRef = win.refOf(killerId);
  if (killerRef < 0) return false; // killer absent from the captured window (world kill / just-joined)
  kcv = { pb, killerRef, t0: performance.now(), dur: pb.durationMs, meshes: new Map(), firePrev: false };
  mp.killcamHide = true; // live cast steps aside — the replay cast takes the stage
  const cast = new THREE.CapsuleGeometry(0.38, 1.05, 4, 10); // one shared geometry (mp.js makeRemote parity)
  for (let ref = 0; ref < pb.names.length; ref++) {
    const mesh = new THREE.Mesh(cast, new THREE.MeshStandardMaterial({ color: 0x9aa6b5, roughness: 0.6, metalness: 0.2 }));
    mesh.visible = false;
    scene.add(mesh);
    kcv.meshes.set(ref, { mesh, tm: -1 });
  }
  hud.killcamShow(t('a.killcam'), killerName + ' · ' + weapon + (head ? ' · HEADSHOT' : ''), t('a.killcamSkip')); // killer/weapon/HEADSHOT = proper nouns (§48.7)
  return true;
}
function killcamFrame(dt, now) {
  if (!kcv) return false;
  if (player.alive || match.state !== 'live') { killcamEnd(); return false; } // respawn / round edge / match end reclaims the camera
  const tRel = now - kcv.t0;
  if (tRel >= kcv.dur) { killcamEnd(); return false; } // window played out → orbit for the remainder
  const out = kcv.pb.playbackAt(tRel);
  const k = out.byRef.get(kcv.killerRef);
  if (!k) { killcamEnd(); return false; }
  // killer POV — updateCamera convention (Euler pitch/yaw 'YXZ') + the eye law (player.js:50
  // crouch −0.55; wire y = feet — the eye offset is added here, bob/landDip not on the wire)
  camera.position.set(k.x, k.y + ((k.f & 1) ? CFG.PHYS.eyeHeight - 0.55 : CFG.PHYS.eyeHeight), k.z);
  camera.quaternion.setFromEuler(new THREE.Euler(k.pitch, k.yaw, 0, 'YXZ'));
  for (const [ref, m] of kcv.meshes) { // replay cast — colors = the replayFrame team law
    const a = out.byRef.get(ref);
    if (!a || a.al !== 1 || ref === kcv.killerRef) { m.mesh.visible = false; continue; } // killer body never rendered
    m.mesh.visible = true;
    m.mesh.position.set(a.x, a.y, a.z);
    m.mesh.rotation.y = a.yaw;
    if (a.tm !== m.tm) { m.tm = a.tm; m.mesh.material.color.set(a.tm === 0 ? 0x3fa7ff : a.tm === 1 ? 0xff5252 : 0x9aa6b5); }
  }
  const fire = actionDown('fire'); // skip affordance: any fresh fire edge (locked LMB / touch fire)
  if (fire && !kcv.firePrev) { killcamEnd(); return false; }
  kcv.firePrev = fire;
  hud.killcamTick(tRel, kcv.dur);
  return true;
}
function killcamEnd() {
  if (!kcv) return;
  const geo = kcv.meshes.size ? [...kcv.meshes.values()][0].mesh.geometry : null;
  for (const [, m] of kcv.meshes) { scene.remove(m.mesh); m.mesh.material.dispose(); }
  if (geo) geo.dispose();
  kcv = null;
  mp.killcamHide = false; // live cast returns
  hud.killcamHide();
}

// ---------------- T42 §26.4: replay viewer (?replay=1, no mp) ----------------
// Presentation-only playback of a RECORDED match (transform stream, the Fortnite model —
// SPIKE_REPLAY verdict (b)). No join, no live stream, no sim, no career (§26.5). Meshes
// are driven ONLY by makePlayback().playbackAt(); camera reuses THE spectate rig via its
// §26.4 parameterization; killfeed rides recorded 'kill' events in the crossed window.
async function startReplayViewer(idParam) {
  replayViewer = true;
  ui.hideAll(); ui.hideLoading();
  $('hud').classList.remove('hidden');
  hud.spectateMode(true); // §25 reuse: combat HUD hidden — map/score/timer/feed stay
  hud.replayBarInit();
  hud.onReplayScrub = (v) => { rpv.playhead = v; rpv.prevT = v; }; // manual scrub: skip the crossed event batch
  let rec = null;
  try { rec = idParam ? await replayIdbGet(+idParam) : await replayIdbLatest(); } catch (e) { /* IDB unavailable — in-memory fallback below */ }
  if (!rec && !idParam && Replay.lastPacked) rec = Replay.lastPacked; // just-finished match on this page session (§26.3)
  if (!rec) { hud.replayShow('empty'); hud.announce(t('a.replay'), t('a.replayNone')); return; }
  let pb;
  try { pb = makePlayback(unpackRecord(rec.bin)); }
  catch (e) { hud.replayShow('empty'); hud.announce(t('a.replay'), t('a.replayCorrupt')); return; }
  rpv.pb = pb; rpv.meta = rec;
  buildReplayMeshes(pb.names);
  rpv.playhead = 0; rpv.prevT = 0; rpv.playing = true; rpv.speed = 1;
  hud.replayShow('play', { dur: pb.durationMs });
  hud.announce(t('a.replay'), ((rec.mode || 'match') + ' · ' + (rec.map || 'outpost')).toUpperCase()); // mode·map = proper nouns (§48.7)
}

function buildReplayMeshes(names) { // mp.js makeRemote visual parity: box body + name tag (§26.4)
  names.forEach((name, ref) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.8, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x9aa6b5 })
    );
    mesh.visible = false;
    scene.add(mesh);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const cx = cv.getContext('2d');
    cx.font = 'bold 28px Rajdhani, sans-serif'; cx.textAlign = 'center';
    cx.fillStyle = '#e8ecf1'; cx.shadowColor = '#000'; cx.shadowBlur = 6;
    cx.fillText(name || ('P' + ref), 128, 40);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
    tag.scale.set(1.6, 0.4, 1); tag.position.y = 2.1;
    mesh.add(tag);
    rpv.meshes.set(ref, { mesh, tm: -1, cr: -1 });
  });
}

function replayFrame(dt, now) {
  if (!rpv.pb) { // no record loaded (or empty store): showcase orbit (menu-idle parity) while IDB resolves
    const t = now / 12000;
    camera.position.set(Math.sin(t) * 42, 14 + Math.sin(t * 0.7) * 3, Math.cos(t) * 30);
    camera.lookAt(0, 2, 0);
    updateFX(dt, camera);
    return;
  }
  // viewer controls, Input-direct (consume() bookkeeping is not engaged in viewer):
  // SPACE play/pause · S speed 0.5/1/2/4 · LMB/SPACE next actor · RMB prev (§25.4 rig edges)
  const fireDown = actionDown('fire'), adsDown = actionDown('ads'), spaceDown = Input.keys.has('Space');
  specEdgeNext = (fireDown && !rpv.firePrev) || (spaceDown && !rpv.spacePrev);
  specEdgePrev = adsDown && !rpv.adsPrev;
  rpv.firePrev = fireDown; rpv.adsPrev = adsDown; rpv.spacePrev = spaceDown;
  const sDown = Input.keys.has('KeyS');
  if (sDown && !rpv.sPrev) rpv.speed = ({ 0.5: 1, 1: 2, 2: 4, 4: 0.5 })[rpv.speed] || 1;
  rpv.sPrev = sDown;

  if (rpv.playing) {
    rpv.playhead += rpv.speed * dt * 1000;
    if (rpv.playhead >= rpv.pb.durationMs) { rpv.playhead = rpv.pb.durationMs; rpv.playing = false; }
  }
  const out = rpv.pb.playbackAt(rpv.playhead);
  for (const [ref, m] of rpv.meshes) { // meshes driven ONLY by the record (§26.4)
    const a = out.byRef.get(ref);
    if (!a || a.al !== 1) { m.mesh.visible = false; continue; }
    m.mesh.visible = true;
    m.mesh.position.set(a.x, a.y, a.z);
    m.mesh.rotation.y = a.yaw;
    const cr = (a.f & RFBIT.CROUCH) ? 1 : 0;
    if (cr !== m.cr) { m.mesh.scale.y = 1 - cr * 0.3; m.cr = cr; }
    if (a.tm !== m.tm) { m.tm = a.tm; m.mesh.material.color.set(a.tm === 0 ? 0x3fa7ff : a.tm === 1 ? 0xff5252 : 0x9aa6b5); }
  }
  for (const e of rpv.pb.eventsBetween(rpv.prevT, rpv.playhead)) { // killfeed rides recorded events (§26.4)
    if (e.name === 'kill' && e.p) hud.killfeed({ name: e.p.kn, team: 1 }, { name: e.p.vn, team: 0 }, e.p.w, e.p.h);
  }
  rpv.prevT = rpv.playhead;
  if (out.m) { // timer/score from the recorded m-block (elements stay visible under spectateMode)
    const el = $('match-timer');
    if (el) el.textContent = Math.floor(out.m.tl / 60) + ':' + String(out.m.tl % 60).padStart(2, '0');
    const s0 = $('score-ally'), s1 = $('score-enemy');
    if (s0) s0.textContent = out.m.s0; if (s1) s1.textContent = out.m.s1;
  }
  hud.replayTick({ t: rpv.playhead, dur: rpv.pb.durationMs, speed: rpv.speed, playing: rpv.playing });
  const actors = out.actors.filter(a => a.al === 1).map(a => ({ id: a.ref, name: a.name, alive: true, pos: { x: a.x, y: a.y, z: a.z }, yaw: a.yaw }));
  specRig(dt, actors); // ONE rig (§26.4) — §25.4 constants, single truth point
  updateFX(dt, camera);
  // audio listener not engaged in viewer (no live audio path — §26.6 honest scope)
}

// ---------------- settings application ----------------
function applySettings() {
  saveSettings(settings); // persistence FIRST — settings survive even if a peripheral leg of the fan-out fails
  try { // [T122] THE BOOT-ARMOR LAW (the user black-screen class, root-caused live): ONE era-skewed
    // peripheral leg (voice/SFX/hud of any cached module vintage) used to kill this fan-out and
    // with it bootGame → the render loop never started → in-match black screen, zero errors on
    // the menu. The fan-out DEGRADES from now on: a failed leg is a console.warn, never a boot kill.
    applyInputSettings(settings); // v1.54 §62.4: input-affecting settings (binds/aimMode/touchSens/touch numerics) live-apply on EVERY change — single fan-out point
    applyColorVision(settings.colorVision); // §52.3 S6: palette law (unknown → default)
    camera.fov = settings.fov; camera.updateProjectionMatrix();
    weapons.setFovScale(settings.fov);
    hud.buildCrosshair({ ...settings.ch }); // G-1 (v1.78): style normalization lives in hud.renderCrosshairInto (5 known shapes; unknown → 'cross')
    SFX.applyVolumes?.();
    // [T161 R13/R15] the a11y fan-out leg — the strobe cap + the shake gate (effects module
    // state), the hud a11y surfaces (subtitles/reduced-motion), the audio a11y (mono/pitch),
    // the body theme + scale. Boot-armor covers it like every peripheral leg.
    try {
      FXfns.setA11y(settings.reducedMotion, settings.flashCap > 0 ? 1 - settings.flashCap : 1);
      hud.setSubtitles(!!settings.subtitles); hud.setReducedMotion(!!settings.reducedMotion);
      SFX.setMono?.(!!settings.mono); SFX.setHitPitch?.(settings.hitSound === 'low' ? 0.7 : settings.hitSound === 'high' ? 1.35 : 1);
      document.body.classList.toggle('ir-hc', !!settings.highContrast);
      document.body.style.setProperty('--ir-ui-scale', String(settings.uiScale || 1));
    } catch (e2) { console.warn('[a11y] leg degraded (game continues):', e2 && e2.message); }
    voiceApplySettings(settings); // [T140 G-4] the fan-out leg — voiceOn/volVoice live-apply (boot-armor protects it like every peripheral leg)
    const q = CFG.QUALITY[settings.quality];
    setQuality(q);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Math.max(0.6, q.pr)));
    const sun = World.sun;
    if (q.shadow > 0) {
      sun.castShadow = true;
      if (sun.shadow.mapSize.x !== q.shadow) {
        sun.shadow.mapSize.set(q.shadow, q.shadow);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
    } else sun.castShadow = false;
    buildComposer(q);
    document.body.style.setProperty('--uiscale', 'clamp(.8rem, 1.05vw + .55rem, 1.15rem)');
  } catch (e) { console.warn('[settings] fan-out degraded (game continues):', e && e.message); } // [T122] boot-armor
}
function buildComposer(q) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (q.bloom) { // [v1.50 port T90] §60.2 (v1.48) M14: QUALITY.LOW declares bloom:false — honor it (a fullscreen
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.86); // blur pass on a 0.66-pr canvas burns phone battery/GPU for zero LOW-tier value)
    composer.addPass(bloomPass);
  }
  composer.addPass(new OutputPass());
  composer.setSize(innerWidth, innerHeight);
}
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}

// ---------------- match flow ----------------
async function startMatch(mode, diff, fromServer) { // [T157] fromServer — the deploy was SERVER-DRIVEN (live-port onJoined / the lobby-rider ev:'start'): the round is already owned, so sendMatchStart is SKIPPED (a re-emit mid-countdown either churns the countdown as host or is dropped by the §34.1 rate cap — both wasteful); local deploy + spawn sync still run
  // --- T1-2 map rotation (offline only) ---
  // MP PIN: the authoritative room's objective tables (FLAG_DEFS/HP_HILLS/SND_SITES
  // mirrors, mini-services/ironsight-room/index.ts) and its collision world
  // (maps/outpost.json via MAP_PATH) are no longer outpost-pinned — §51 per-room worlds
  // never rotates. Map-aware server objectives = logged residual (worklog Task 37-b).
  if (!CFG.MP.enabled) {
    const pick = settings.mapSelect; // §51.1: the saved map pin ('any' = rotation)
    const pinned = mode === 'br' || (pick && pick !== 'any' && Maps.roster.some(m => m.id === pick)); // [T171] BR pins the battle map regardless of the saved pin (reads the PARAM — match.mode is still the previous mode here)
    const want = mode === 'br' ? 'voskhod' : pinned ? pick : Maps.nextForMatch(); // §51.1: pinned-pick law — rotation only for 'any'
    if (want !== Maps.currentId) {
      // A failed rotation build must never kill match start — keep the current world.
      // (Maps.load only rejects when BOTH the map file and the outpost fallback are gone.)
      try { await setMap(scene, want); applyMapCameraFar(); } // no-op fetch path: roster preloaded at boot
      catch (e) { console.warn('[maps] rotation to ' + want + ' failed, keeping ' + Maps.currentId, e && e.message); }
    }
  }
  SFX.initAudio(settings); SFX.resumeAudio(); SFX.prewarm(); // [T117] boot sweep — every mapped remote voice fetched+decoded DURING the loading screen (cold-cache synth race dead: first play of each voice is the real take)
  inMatch = true; paused = false;
  // [v1.50 port T90] §60.2 (v1.48) M6 + M16 + M20: immersive mobile play — fullscreen + landscape lock +
  // screen wake (all best-effort, every leg catch-guarded); touch hint surfaces; the
  // in-match body class carries the portrait hint veil (style.css).
  document.body.classList.add('in-match');
  if (Input.touchMode) {
    try { const fs = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (fs && fs.catch) fs.catch(() => {}); } catch {}
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch {}
    try { navigator.wakeLock && window.self === window.top && navigator.wakeLock.request('screen').then((l) => { wakeLock = l; }).catch(() => {}); } catch {} // [T122] standalone-only — embedded docs (chat.z.ai preview, the host iframe) lack the screen-wake-lock permission: the request fired a policy Violation per match start (console noise the user reported); the PWA/own-tab path keeps it
    const rh = $('reload-hint'); if (rh) rh.textContent = t('ix.rld'); // M16: no [R] key glyphs on touch
  }
  ui.hideAll();
  $('hud').classList.remove('hidden');
  $('touch-ui').classList.toggle('hidden', !Input.touchMode);
  player.score = 0; player.kills = 0; player.deaths = 0; player.streak = 0;
  player.captures = 0; player.confirms = 0; // §52.5 S5: per-player daily counters reset
  player.shotsFired = 0; player.shotsHit = 0; player.damageDealt = 0;
  weapons.setLoadout(loadout, settings);
  match.start(mode, diff);
  respawnPlayer(true);
  if (CFG.MP.enabled) { bots.clear(); mpOnMatchStart(); sendRespawn(player.pos); if (!fromServer) sendMatchStart(mode); } // MP sandbox: no bots, sync spawn + server match (MP-3) · [T157] server-driven deploys skip the re-emit (the fromServer law)
  hud.showDeath(false);
  if (mode === 'practice') { match.practice.count = 3; }
  hud.announce(mode === 'practice' ? t('m.modePrac') : t('a.startTitle'), CFG.MODES[mode] ? (mode === 'dom' ? t('a.domS') : mode === 'tdm' ? t('a.tdmS') : mode === 'ct' ? t('a.ctS') : mode === 'ffa' ? t('a.ffaS') : mode === 'hp' ? t('a.hpS') : mode === 'kc' ? t('a.kcS') : mode === 'snd' ? t('a.sndS') : mode === 'gg' ? t('a.ggS') : mode === 'gf' ? t('a.gfS') : mode === 'inf' ? t('a.infS') : mode === 'ctl' ? t('a.ctlS') : mode === 'br' ? t('a.brS') : t('a.pracS')) : '');
  if (!Input.touchMode) requestLock();
  SFX.setCombatIntensity(0.2);
}
function quitMatch() {
  inMatch = false; paused = false; mpResultsUp = false; // [T120] a manual exit disarms the lobby auto-dismiss
  releaseMobileImmersive(); // [v1.50 port T90] §60.2 M6
  exitLock();
  hideGasZone(); World.brZone = null; // [T171] gas meshes down on exit
  $('hud').classList.add('hidden');
  $('touch-ui').classList.add('hidden');
  bots.clear();
  match.state = 'idle';
  ui.show('page-main'); ui.refreshCareer();
  SFX.setCombatIntensity(0.1);
}
function pause() {
  paused = true;
  const mw = $('map-wrap'); if (mw) mw.classList.add('hidden'); // [T121] (5b) the minimap never rides a menu face (the user report: BACK on the pause page)
  exitLock();
  ui.show('page-pause');
}
function resumeMatch() {
  paused = false;
  const mw = $('map-wrap'); if (mw && inMatch) mw.classList.remove('hidden'); // [T121] (5b) restored only IN the round
  ui.hideAll();
  if (!Input.touchMode) requestLock();
}

// §52.1 S1 + §52.5 S5: local match history + deterministic daily challenge credit.
// History is IDB best-effort (history.js law: failures warn, NEVER throw into game flow).
// Daily: date-roll law → progress from END-measurable counters only → one credit/day.
function recordHistoryAndDaily(mode, win, score, k, d, caps, confirms, mpMatch) {
  histPut({ t: Date.now(), mode, map: Maps.currentId, win, score, k, d, mp: mpMatch });
  const today = metagame.evDayOf(Date.now()); // §52.5 S5 date-roll law + T89 ev window law (04:00 local shift — one clock, single truth)
  if (!career.daily || career.daily.d !== today) career.daily = { d: today, p: 0, done: false };
  const ch = dailyFor(today);
  if (!career.daily.done) {
    const v = ch.metric === 'kills' ? k : ch.metric === 'wins' ? (win ? 1 : 0) : ch.metric === 'score' ? score : ch.metric === 'caps' ? caps : ch.metric === 'confirms' ? confirms : (career.acc || 0);
    career.daily.p = Math.max(career.daily.p || 0, v);
    const reached = ch.metric === 'score' ? v >= ch.n : ch.metric === 'acc40' ? (career.acc || 0) >= 40 : career.daily.p >= ch.n;
    if (reached) {
      career.daily.done = true;
      career.dailyDone = (career.dailyDone || 0) + 1;
      hud.announce('DAILY CHALLENGE COMPLETE', ch.label);
    }
  }
  // --- v1.55 T89 L6: BP XP award (BP_AWARD single truth) — season-keyed reset law: a stale
  // season key resets XP (the destroyed v1.48 bpState law, verbatim). Offline AND MP paths
  // both run this hook (MP: main.js:207), so the BP mirror is real in both worlds.
  const season = seasonOf(Date.now()).id;
  if (!career.bp || career.bp.s !== season) career.bp = { x: 0, s: season };
  const bpGain = BP_AWARD.match + (win ? BP_AWARD.win : 0);
  career.bp.x += bpGain;
  // --- v1.55 T89 L4/L5: metagame challenge windows + cumulative end-measurable stats ---
  // Deterministic via metagame single truth (evDayOf/weekMonOf/evsWindowRollover — the
  // pre-rewind ISO-week law). Claims happen on page-missions (ui.renderMissions → evsClaim).
  const week = metagame.weekMonOf(today);
  if (!career.evs || career.evs.v !== metagame.EV_PERSIST_V) career.evs = metagame.evChPersistShape();
  if (metagame.evsWindowRollover(career.evs, today, week)) career.evs = metagame.evChPersistShape();
  const es = career.evs.stats;
  es.kills += k || 0; es.wins += win ? 1 : 0; es.matches += 1; es.xp += bpGain;
  es.headshots += (player.headshots || 0); // [T90 fix] window-ACCUMULATED headshots — the previous `es.headshots = career.hs` assigned the LIFETIME total, auto-completing the weekly headshot challenge after any window rollover (90-e audit defect 1)
  career.hs = (career.hs || 0) + (player.headshots || 0); player.headshots = 0;
  saveCareer(career);
}

// ---------------- v1.55 T89 L1: Gunfight kit (temp-loadout law) ----------------
// The pre-rewind giveKit defect, verbatim: reassigning the MODULE loadout leaked the round
// kit into later matches. Fix (fragment-preserved): build a TEMP object; startMatch re-applies
// the saved loadout each match, so the temp dies with the round. Bots ride setBotWeapon.
let gfKitActive = null;
function gfKit(kit, r, fromWire = false) {
  gfKitActive = { kit, r };
  if (CFG.MP.enabled && !fromWire) return; // offline: kit applies immediately; MP: kit rides the server 'gfkit' chain event (server truth)
  const temp = { ...loadout, weapon: kit[0], secondary: kit[1] }; // loadout key = weapon (DEFAULT_LOADOUT law), NOT primary
  weapons.setLoadout(temp, settings);
  weapons.equipWeapon(kit[0], true);
  for (const b of bots.bots) if (bots.setBotWeapon) bots.setBotWeapon(b, kit[0]); // [v1.50 port T90] §57.2 gfApplyKit law: bots mirror the round-kit primary (MP: bots cleared — no-op)
  hud.announce('', 'KIT ' + r + ': ' + kit[0].toUpperCase() + ' + ' + kit[1].toUpperCase());
}

// ---------------- v1.55 T89 L10: onboarding event feed ----------------
// Real-game-event dispatch sites: fire (onShotNoise) · swap (quickswap/slot consumes) ·
// equip (nade/ability) · objective (ping) · move/look (loop detectors, once-flags).
// Soft-call law: onbEvent(name, soft) — soft events NEVER claim rewards (kills are not the
// objective stage); hard events (ping/capture) claim via onbMarkEvent → onbClaim.
let _onbMoved = false, _onbLooked = false;
function onbEvent(name, soft = false) {
  const st = onboard.onbState();
  if (!onboard.onbActive(st)) return;
  const next = onboard.onbNext(st);
  if (!next) return;
  const want = onboard.onbEventFor(next.id);
  if (want !== name) return;
  if (soft) { hud.announce('', t('onb.progressHint')); return; } // stage hint only — the real completion site claims
  const claimed = onboard.onbClaim(next.id, onboard.onbMarkEvent(name, st));
  if (claimed && claimed.reward) {
    career.cr = (career.cr || 0) + (claimed.reward.cr || 0);
    if (!career.bp || career.bp.s !== seasonOf(Date.now()).id) career.bp = { x: 0, s: seasonOf(Date.now()).id };
    career.bp.x += claimed.reward.bp || 0;
    saveCareer(career); ui.refreshCareer();
    hud.announce(t('onb.stageDone', { n: next.n }), '+' + claimed.reward.cr + ' CR' + (claimed.reward.bp ? ' · +' + claimed.reward.bp + ' BP' : ''));
    SFX.pickup(null, 1);
  }
}

// ---------------- v1.55 T89 L12: touch haptics + aim magnetism ----------------
function vib(kind) { // L12 touch haptics — CFG.ASSIST single truth; settings.touchHaptics=false kills it
  if (!Input.touchMode || !CFG.ASSIST.haptics || settings.touchHaptics === false) return;
  const p = CFG.ASSIST.hapticPatterns[kind];
  if (p && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} }
}
function touchAssistSlow() { // L12 magnetism: near-target cone slowdown on touch ADS look (CoD Mobile law)
  if (assistConeLive) return CFG.TOUCH.slowFactor ?? 0.6; // [v1.50 port T90] §60.2 M1: the v1.50 assist cone owns the look slowdown when live (0.6 = v1.50 TOUCH table; cone runs with or without ADS — v1.50 law)
  if (!Input.touchMode || !weapons || !weapons.ads || !bots) return 1;
  const G = CFG.ASSIST, _a1 = touchAssistSlow._a1 || (touchAssistSlow._a1 = new THREE.Vector3()), _a2 = touchAssistSlow._a2 || (touchAssistSlow._a2 = new THREE.Vector3());
  const cosCone = Math.cos(G.magAngle * Math.PI / 180);
  player.forward(_a1);
  for (const b of bots.bots) {
    if (!b.alive || b.team === player.team) continue;
    _a2.copy(b.pos); _a2.y += 1.2; _a2.sub(player.pos);
    const dist = _a2.length();
    if (dist > G.magDist || dist < 0.001) continue;
    if (_a2.divideScalar(dist).dot(_a1) > cosCone) return G.magFactor;
  }
  return 1;
}

function endMatch(res) {
  inMatch = false; paused = false;
  TRAINER.closePanel(false); // [T168] the panel never floats over the results/menu faces (relock skipped — the locker is already gone with the round)
  releaseMobileImmersive(); // [v1.50 port T90] §60.2 M6
  exitLock();
  $('hud').classList.add('hidden'); // [T119] the round-end face is clean — HUD (minimap/timer/feed) never rides the killcam/results (issue-6 live evidence)
  if (weapons.vmRoot) weapons.vmRoot.visible = false; // [T119] the weapon leaves with the round (was: the viewmodel floated over the death cam + results — issue-6 live evidence)
  $('touch-ui').classList.add('hidden');
  resetTouchLatches(); // §62.4 M17 (v1.54): match end clears every latch (touch UI hides — no wedge carry-over into the next match)
  // career
  career.matches = (career.matches || 0) + 1;
  if (res.win && res.mode !== 'practice') career.wins = (career.wins || 0) + 1;
  career.kills = (career.kills || 0) + player.kills;
  career.deaths = (career.deaths || 0) + player.deaths;
  career.shots = (career.shots || 0) + player.shotsFired;
  career.hits = (career.hits || 0) + player.shotsHit;
  career.bestStreak = Math.max(career.bestStreak || 0, match.session.bestStreak);
  career.kd = career.deaths ? (career.kills / career.deaths).toFixed(2) : career.kills.toFixed(0);
  career.acc = career.shots ? Math.round(career.hits / career.shots * 100) : 0;
  saveCareer(career);
  recordHistoryAndDaily(res.mode, !!res.win, player.score, player.kills, player.deaths, player.captures || 0, player.confirms || 0, false); // §52.1: offline end hook (history + daily credit)
  achCheckMatchEnd(); // [T115 G-5] the match-end sweep — toasts + the §53.2 mirror (sendEco no-ops offline)
  ui.refreshCareer();
  setTimeout(() => ui.showResults(res, match.allActors(), match, career), 1400);
  hud.showDeath(false);
}

// [T115 G-5] the match-end achievement sweep — the ONLY toasting unlock path (boot catch-up
// stays silent). Staggered announces (2.2 s) because the announcer is a single surface; the
// §53.2 mirror pushes the ids to the server 'ach' op (sendEco no-ops when the socket is down).
function achCheckMatchEnd() {
  const r = achs.achUnlock(career, Date.now());
  if (!r.unlocked.length) return;
  career = r.career;
  saveCareer(career);
  r.unlocked.forEach((id, i) => setTimeout(() => {
    hud.announce(t('ach.toast'), t('ach.' + id + '.n'));
    try { SFX.uiTick(false); } catch {}
  }, i * 2200));
  sendEco({ op: 'ach', ids: r.unlocked });
}

function respawnPlayer(instant = false) {
  killcamEnd(); // G-2 safety: an instant/queue respawn never leaves the killcam engaged (its own player.alive guard is the primary)
  const pool = (match.mode === 'tdm' || match.mode === 'dom' || match.mode === 'hp' || match.mode === 'kc' || match.mode === 'snd' || match.mode === 'gf' || match.mode === 'inf' || match.mode === 'ctl') ? World.spawnsA : World.spawnsFFA; // T1-1 team modes (SS22.5) + T89 trio (gf/inf/ctl spawn on team pools; horde/attackers re-pick inside respawnAt)
  let best = pool[0], bestScore = -1;
  for (let i = 0; i < 5; i++) {
    const sp = pool[Math.floor(Math.random() * pool.length)];
    let score = 1e9;
    for (const b of bots.bots) if (b.alive && b.team !== player.team) score = Math.min(score, sp.distanceTo(b.pos));
    if (score > bestScore) { bestScore = score; best = sp; }
  }
  player.pos.copy(best); player.pos.y += 0.05;
  if (match.mode === 'br' && !CFG.MP.enabled) { player.pos.y = CFG.MODES.br.drop; player.dropT = 1; } // [T171] air-drop insertion — 115 m up, glide-capped (dropGlide), landing disarms the fall guard (offline truth; MP drops ride the server spawn)
  player.vel.set(0, 0, 0);
  player.yaw = Math.atan2(-(0 - player.pos.x), -(0 - player.pos.z));
  player.pitch = 0; player.roll = 0;
  player.hp = CFG.HEALTH.maxHP; player.shield = 0; player.alive = true;
  player.spawnProt = CFG.HEALTH.spawnProtTime; player.lastDamageT = 9;
  player.recoilPitch = 0; player.recoilYaw = 0;
  resetTouchLatches(); // [v1.50 port T90] §60.2 (v1.48) M17: latched ADS/crouch never survives the redeploy (CODM law)
  weapons.equip(0, true);
  if (match.mode === 'inf' && player.team === 1) weapons.equipWeapon('melee', true); // [v1.50 port T90] §57.2: horde redeploy stays melee-only (converted players respawn on the horde side)
  weapons.nades = { frag: 3, flash: 2 };
  hud.showDeath(false);
  if (CFG.MP.enabled && mp.joined) sendRespawn(player.pos); // server validates spawn points (§11)
  if (!instant && !Input.touchMode) requestLock();
}
function refillLoadout() {
  for (const w of weapons.slotWeapons) if (w) { w.reserve = w.def.reserve; w.mag = w.def.mag; }
  weapons.nades = { frag: 3, flash: 2 };
}

// ---------------- damage routing ----------------
function routeDamageToBot(target, dmg, head, attacker, wdef) {
  if (!target.alive || match.state !== 'live') return;
  player.shotsHit++;
  player.damageDealt += dmg;
  if (target.spawnProt > 0) return;
  match.trackHit(dmg);
  dmgEvents.push(performance.now() / 1000);
  SFX.hitmark(false, head);
  if (head) SFX.hsDing();
  if (settings.hitMarker) hud.hitmarker(false, head); // T1-8: visual toggle (audio stays)
  if (settings.damageNumbers) fxNum(target.centerPos(new THREE.Vector3()), dmg, { crit: head, target: target.name });
  const res = bots.applyDamage(target, dmg, head, attacker, wdef.name);
  if (res.died) {
    SFX.hitmark(true, head);
    if (settings.hitMarker) hud.hitmarker(true, false); // T1-8: visual toggle (audio stays)
    match.registerKill(player, target, head, wdef.name);
    const w = wdef.name; // [T90 wave] camo per-weapon counters — offline kill site keyed by the registerKill weapon NAME (zero new identity layering); saveCareer rides endMatch (no per-kill LS write)
    career.weaponKills = career.weaponKills || {}; career.weaponKills[w] = (career.weaponKills[w] || 0) + 1;
    if (wdef.cls) { career.pk = career.pk || {}; career.pk[wdef.cls] = (career.pk[wdef.cls] || 0) + 1; } // [T139 N7] the per-CLASS kill-sum — the def carries cls directly (offline site law)
    fxNum(target.centerPos(new THREE.Vector3()), 0, { kill: true, target: target.name + '_k' });
  }
}
function damagePlayer(dmg, from, head, wpnName) {
  if (CFG.MP.enabled) return; // MP: server-authoritative combat (Task 28's mp.js dmg/kill events drive FX; hp mirrors via snapshots)
  if (TRAINER.on.god) return; // [T168] GOD MODE — the local sim's ONLY inbound damage choke (bots' onPlayerHit, fall-damage hook, area damage all funnel here); MP stays server-owned (the panel says so on the row)
  const p = player;
  if (!p.alive || match.state !== 'live') return;
  if (p.spawnProt > 0) return;
  if (p.juggT > 0) dmg *= (p.juggCut || 1); // [T161 R6] the juggernaut suit's damage-taken law — the cut rides BEFORE shield math (the armor plate then absorbs the reduced hit)
  p.lastDamageT = 0;
  dmgEvents.push(performance.now() / 1000);
  let dmgLeft = dmg;
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, dmgLeft);
    p.shield -= absorbed; dmgLeft -= absorbed;
  }
  p.hp -= dmgLeft;
  // directional indicator
    if (from && from.pos) {
      const dx = from.pos.x - p.pos.x, dz = from.pos.z - p.pos.z;
      const worldAng = Math.atan2(-dx, -dz);
      let rel = worldAng - p.yaw;
      hud.ddi(rel);
    }
    fxShake(Math.min(0.05, dmg * 0.0012));
    padRumble('hurt', Math.min(1, 0.4 + dmg / 80));
    vib('hit'); // T99 v1.64 M8 feel pass: damage haptic — the CFG.ASSIST.hapticPatterns.hit pair fires (padRumble hurt's touch twin; vib self-gates: touchMode + ASSIST.haptics + settings.touchHaptics)
  if (p.hp <= 0) {
    p.hp = 0; p.alive = false; p.deaths++;
    p.deadDir = (from && from.pos) ? new THREE.Vector3(p.pos.x - from.pos.x, 0, p.pos.z - from.pos.z).normalize() : null; // [T133] the kill impulse — killer→victim, horizontal (the verlet knock-back read)
    p.deadKnock = knockFor(dmg); // [T138] THE KNOCK LAW — damage-scaled impulse (config single truth: 1.5 + dmg/60, cap 3.0)
    if (p === player) resetTouchLatches(); // §62.4 M17 (v1.54): own death clears input latches (bot deaths untouched)
    const dist = from && from.pos ? p.pos.distanceTo(from.pos) : 0;
    hud.showDeath(true, { name: from?.name || 'WORLD', weapon: wpnName || '?', dist, hp: from?.hp ?? 0 });
    const killerActor = from && (from.isPlayer === true || from.isPlayer === false) ? from : null;
    match.registerKill(killerActor, p, head, wpnName);
  }
}

function doFlash(pos, cfg) {
  const p = player;
  // player blind [CS2 model]
  const eye = p.eyePos(new THREE.Vector3());
  const d = eye.distanceTo(pos);
  if (d < cfg.radius * 2.2) {
    const facing = lookV.copy(pos).sub(eye).normalize().dot(p.forward(new THREE.Vector3()));
    // FIX (Task 35 probe find): this was World.segmentBlocked — a method that NEVER
    // existed (segmentBlocked is a bare module export of world.js). Every offline
    // flashbang blind crashed silently since the feature shipped; P8 only probed frag.
    const blocked = segmentBlocked(pos.clone().add(new THREE.Vector3(0, 0.1, 0)), eye);
    if (!blocked && facing > -0.2) {
      const strength = THREE.MathUtils.clamp((1 - d / (cfg.radius * 2.2)) * (facing > 0.4 ? 1 : 0.45), 0, 1);
      applyBlind(strength, cfg); // Task 35: extracted verbatim (overlay + deafen) — shared with the MP flash event
    }
  }
  // bots blinded
  for (const b of bots.bots) {
    if (!b.alive) continue;
    const bd = b.eyePos(new THREE.Vector3()).distanceTo(pos);
    if (bd < cfg.radius * 1.6 && !segmentBlocked(pos.clone().add(new THREE.Vector3(0, 0.1, 0)), b.eyePos(new THREE.Vector3()))) {
      b.blindedT = Math.max(b.blindedT, cfg.full * THREE.MathUtils.clamp(1 - bd / (cfg.radius * 1.6), 0.3, 1));
      b.target = null; b.state = 'hunt';
    }
  }
}

// Task 35: the overlay/deafen tail of doFlash, extracted VERBATIM so the MP flash
// event (server-computed strength) drives the identical presentation path.
function applyBlind(strength, cfg) {
  const el = $('flash-overlay');
  el.style.transition = 'none'; el.style.opacity = String(strength);
  const full = cfg.full * strength, fade = cfg.fade * strength;
  setTimeout(() => {
    el.style.transition = `opacity ${fade}s ease-in`;
    el.style.opacity = '0';
  }, full * 1000);
  SFX.setDeafened(true);
  setTimeout(() => SFX.setDeafened(false), cfg.deafen * 1000 * strength);
}

function checkPickups() {
  const consume = (pk) => { if (pk.lootId && CFG.MP.enabled) sendLoot(pk.lootId); if (pk.loot || match.mode === 'br') takeLootPickup(pk, true); else { pk.active = false; pk.mesh.visible = false; pk.t = CFG.MAP.pickups.respawn; } }; // [T171] loot/BR pickups never respawn; map pickups ride the 20 s clock; MP loot informs the room
  for (const pk of World.pickups) {
    if (pk.dead) continue; // [T171] BR loot already taken
    if (!pk.active) { pk.t -= 1 / 60; if (pk.t <= 0) { pk.active = true; pk.mesh.visible = true; } continue; }
    const d = Math.hypot(player.pos.x - pk.pos.x, player.pos.z - pk.pos.z);
    if (d < 1.2 && Math.abs(player.pos.y - pk.pos.y) < 1.6) {
      if (pk.kind === 'hp' && player.hp < 100) {
        player.hp = Math.min(100, player.hp + CFG.MAP.pickups.healthAmt);
        consume(pk);
        SFX.pickup(null, 0); hud.banner(0, '+50 HEALTH');
      } else if (pk.kind === 'ammo') {
        const w = weapons.w;
        if (w && w.reserve < w.def.reserve) {
          w.reserve = Math.min(w.def.reserve, w.reserve + w.def.mag * CFG.MAP.pickups.ammoMagMult);
          consume(pk);
          SFX.pickup(null, 1); hud.banner(0, 'AMMUNITION');
        }
      } else if (pk.kind === 'arm' && player.shield < CFG.HEALTH.shieldMax) { // [T171] armor plate — the shield layer tops up
        player.shield = Math.min(CFG.HEALTH.shieldMax, player.shield + 50);
        consume(pk);
        SFX.pickup(null, 0); hud.banner(0, 'ARMOR PLATE');
      } else if (pk.kind === 'wpn' && pk.wid && (!weapons.w || weapons.w.def.id !== pk.wid)) { // [T171] ground weapon — swaps the primary, full ammo
        weapons.slotWeapons[0] = makeWeapon(pk.wid, []);
        weapons.equip(0, true);
        const nw = weapons.w; if (nw) nw.reserve = nw.def.reserve;
        consume(pk);
        SFX.pickup(null, 1); hud.banner(0, nw ? nw.def.name : 'WEAPON');
      }
    }
  }
}

// ---------------- ping ----------------
function doPing() {
  if (!inMatch || !player.alive) return;
  const dir = player.forward(new THREE.Vector3());
  const o = player.eyePos(new THREE.Vector3());
  const hit = rayAABB(o, dir, 100);
  const pos = o.clone().addScaledVector(dir, hit ? hit.t : 40);
  hud.addPing(pos, 'PING');
  SFX.uiTick(false);
  onbEvent('onb-objective'); // T89 L10 S7: objective stage completes on a real ping
}

// ---------------- main loop ----------------
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  if (settings.fpsCap > 0 && now - lastT < 1000 / settings.fpsCap - 0.5) return; // [v1.50 port T90] §60.2 M14: frame-rate target — dt accumulates via lastT (no sim/need re-entry)
  let dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }

  // focus slow-mo [NOVEL C1] — disabled in MP (server cannot slow time; spec §2)
  if (CFG.MP.enabled) { if (match.focusT > 0) match.focusT = 0; }
  else if (match.focusT > 0) { match.focusT -= dt; if (timeScale !== CFG.FOCUS.scale) { timeScale = CFG.FOCUS.scale; SFX.setFocus(true); $('focus-overlay').style.opacity = '0.85'; } }
  else if (timeScale !== 1) { timeScale = 1; SFX.setFocus(false); $('focus-overlay').style.opacity = '0'; }
  const wdt = dt * (paused ? 0 : timeScale);

  if (replayViewer) { // T42 §26.4: playback viewer branch — presentation only (§26.5: sim/weapons/career never engage)
    replayFrame(dt, now);
  } else if (inMatch && !paused) {
    pollGamepad(Input, dt); // gamepad sticks/buttons → Input channels (dt = unscaled: parity with mouse deltas)
    // ---- look ----
    // [v1.50 port T90] §60.2 — the touch/mobile aim law: M1 assist cone + M7-lite auto-fire
    // verdict + M3 adsSens on the touch look channel. The pinned T89 yaw/pitch lines are
    // byte-identical (probe b15b.55); the cone slowdown folds into `mag` (touch-only —
    // Input.mdx is 0 on touch) and touchAssistSlow stays the fallback surface.
    const adsNow = actionDown('ads'); // computed once — scope2/pIn reuse it below (v1.50 law)
    const coneErr = Input.touchMode ? touchAssistCone() : -1;
    const coneOn = coneErr >= 0;
    const touchAssist = coneOn && settings.touchAssist !== false;
    Input.autoFireOn = coneOn && settings.fireAuto === true && player.alive; // M7-lite verdict — input.js 'fire' channel consumes it (opt-in via settings.fireAuto)
    weapons.assistPoint = (coneOn && (touchAssist || Input.autoFireOn)) ? assistPos : null; // M1b offline bullet magnetism point (weapons.js consumer, MP-gated there)
    if (adsNow && settings.adsSens) { Input.lookDX *= settings.adsSens; Input.lookDY *= settings.adsSens; } // M3: settings.adsSens finally consumed while ADS — touch/gamepad look channel only (mouse mdx path untouched; touchSens already rides input.js source-side)
    const sens = settings.sens * CFG.LOOK.yawPerCount;
    assistConeLive = touchAssist; // [v1.50 port T90] hand the cone verdict to the magnetism surface
    const mag = touchAssistSlow(); // T89 L12: magnetism cone slowdown — touch ADS near-target law · [v1.50 port T90] returns the M1 cone factor when the cone is live
    player.yaw -= (Input.mdx * sens + Input.lookDX * 0.0022 * settings.sens) * mag;
    player.pitch -= (Input.mdy * sens + Input.lookDY * 0.0022 * settings.sens) * (settings.invertY ? -1 : 1) * mag;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -CFG.LOOK.pitchClamp, CFG.LOOK.pitchClamp);
    mouseVel.x = Input.mdx; mouseVel.y = Input.mdy;
    // T89 L10 onboarding move/look detectors (once-flags — dispatch until claimed)
    if (!_onbMoved && inMatch && player.alive && Math.hypot(player.vel.x, player.vel.z) > 4) { _onbMoved = true; onbEvent('onb-move'); }
    if (!_onbLooked && inMatch && (Math.abs(Input.lookDX) + Math.abs(Input.lookDY) > 60)) { _onbLooked = true; onbEvent('onb-look'); }

    // ---- weapon input ----
    // [T168] the trainer's per-frame holds ride the SAME clock the spenders run on: ammo/nades
    // pin BEFORE tryFire reads them, the CR floor holds in menus too (inside hold()).
    TRAINER.hold(weapons, career, saveCareer);
    if (consume('trainer')) TRAINER.togglePanel(); // [T168] [7] — the trainer toggle rides OUTSIDE the dead-hands gate (the panel opens while eliminated too); input.js binds it to Digit7 ahead of streak2, so Supply Drop reads 8 now (the mergeBinds migration carries old saves)
    // [T132] THE DEAD-HANDS LAW — the whole weapon/stance/meta input block gates on alive:
    // the user playtest reloaded + swapped on the eliminated screen (the death recap rides
    // the SAME loop). Dead hands hold LOOK and nothing else (the §62.4 M17 latch law,
    // now wired for the keyboard/pad paths too — cam/ability/streaks included).
    if (player.alive) {
    if (consume('reload')) weapons.reload();
    if (consume('inspect') && weapons.state === 'idle') { weapons.state = 'inspect'; weapons.inspectT = 0; }
    if (consume('quickswap')) { weapons.equip(1 - weapons.cur); onbEvent('onb-swap'); } // T89 L10 S5
    if (consume('slot1')) { weapons.equip(0); onbEvent('onb-swap'); }
    if (consume('slot2')) { weapons.equip(1); onbEvent('onb-swap'); }
    if (consume('melee')) weapons.melee();
    if (consume('camtoggle')) { // [T119] TPV toggle (issue 4) — the perspective flip, announced; persistence rides the settings save path
      settings.camMode = settings.camMode === 'tp' ? 'fp' : 'tp';
      hud.announce(t('s.camMode'), settings.camMode === 'tp' ? 'THIRD-PERSON' : 'FIRST-PERSON');
      saveSettings(settings); SFX.uiTick(false);
    }
    if (consume('ability')) { match.useAbility(); onbEvent('onb-equip'); if (CFG.MP.enabled) sendAbility(loadout.ability); } // MP: local prediction + server truth (T2-10) · T89 L10 S6
    if (consume('streak0')) { CFG.MP.enabled ? sendStreak(0) : match.useStreak(0); } // MP: server-owned streaks (T2-10)
    if (consume('streak1')) { CFG.MP.enabled ? sendStreak(1) : match.useStreak(1); }
    if (consume('streak2')) { CFG.MP.enabled ? sendStreak(2) : match.useStreak(2); }
    // T55 §39.4: emote (KeyB) — local announce + viewmodel dip; MP: broadcast to others
    // (1.5 s local cooldown; server §34 sweep 2/2s covers the wire)
    if (consume('emote')) {
      const em = emoteById(loadout.emote);
      if (em.id !== 'none' && performance.now() >= (emoteCdT || 0)) {
        emoteCdT = performance.now() + 1500;
        hud.announce(em.text, t('a.you'));
        weapons.playEmote();
        if (CFG.MP.enabled) sendEmote(em.id);
      }
    }
    if (consume('ping')) doPing();
    if (!CFG.MP.enabled) { // practice bot controls are offline-only (MP sandbox: no bots)
      if (consume('p_add')) match.practiceAdd();
      if (consume('p_rem')) match.practiceRemove();
      if (consume('p_diff')) match.practiceDiff();
      if (consume('p_strafe')) match.practiceStrafe();
      if (consume('p_reset')) match.practiceReset();
    }
    // grenade cook (hold G) / instant on touch
    if (consume('prone')) { // [T121] (9) the prone toggle — jump/crouch edges STAND you up first (the genre law), the crawl never slides/climbs/jumps
      const wasProne = player.prone > 0.5;
      player.prone = wasProne ? 0 : 1;
      hud.announce(t('a.prone'), player.prone > 0.5 ? t('a.proneS') : t('a.proneS2'));
      if (player.prone > 0.5) {
        // [T132] OMNIMOVEMENT DIVE + LANDING ORIENTATION (the CoD BO6 law, callofduty.com
        // training guide: "sprint, slide, and dive in all directions"; SCUF/ModernWarzone:
        // "when you dive, you actually dive and land on the side that you're diving in" —
        // the supine read). A prone entry at sprint momentum is a DIVE: velocity is KEPT
        // (the crawl target bleeds it — zero new physics state); a backward-dominant move
        // intent lands SUPINE (proneBack → the rigs flip the lie), anything else lands on
        // the FRONT (the user playtest: prone laid on its back — now the dive decides).
        const sp2 = Math.hypot(player.vel.x, player.vel.z);
        player.proneBack = !wasProne && (player.sprinting || sp2 > CFG.PHYS.walkSpeed * 1.05) &&
          actionDown('moveB') && !actionDown('moveF');
        player.slide.active = false; player.sprinting = false;
      } else player.proneBack = false;
    }
    if (player.prone > 0.5 && (player.jumpEdge || consume('crouch_toggle'))) { player.prone = 0; hud.announce(t('a.prone'), t('a.proneS2')); } // stand-up edges
    Input.proneLatch = player.prone > 0.5; // [T122] (1) the stance-cycle mirror — the crouch edge (kb C / pad B / touch) reads the CURRENT stance to advance crouched→prone→standing
    if (consume('nade')) {
      if (Input.touchMode) weapons.throwNade();
      else { weapons.cooking = true; weapons.cookT = 0; SFX.pinPull(); } // [T119] the pin rides the cook start
    }
    if (consumeRelease('nade') && weapons.cooking) { weapons.cooking = false; weapons.throwNade(); }
    // scope 2-stage toggle [4x/8x] — [v1.50 port T90] §60.2 (v1.48) M5: EDGE law. The old
    // consecutive-frame test (adsNow && prevAds) oscillated every 2 frames while ADS was
    // latched. scope2 is an explicit edge raised by input.js double-tap law (mouse re-press,
    // toggle re-tap, ADS button re-tap — all share one <280ms clock; input.js T90 side landed).
    if (consume('scope2') && weapons.def.scope && adsNow) weapons.scope2 = !weapons.scope2;
    } // [T132] end the dead-hands gate

    const pIn = {
      f: actionDown('moveF'), b: actionDown('moveB'), l: actionDown('moveL'), r: actionDown('moveR'),
      sprint: actionDown('sprint'), crouch: actionDown('crouch'),
      crouchEdge: consume('crouch_toggle'),
      jumpEdge: consume('jump'),
      ads: adsNow, prone: player.prone > 0.5 ? 1 : 0, autoSprint: settings.autoSprint || (Input.touchMode && settings.touchAutoSprint !== false), // [v1.50 port T90] §60.2 M2: CODM auto-sprint default for touch (desktop byte-identical) · [T121] prone rides additive
      bob: settings.bob, tilt: settings.tilt,
      stickX: Input.stick.x, stickY: Input.stick.y, // MP-1: stick travels via the input object (was module-global read)
    };
    if (!player.alive) { pIn.f = pIn.b = pIn.l = pIn.r = false; pIn.jumpEdge = false; }

    // ---- update systems ----
    const mpSpecActive = CFG.MP.enabled && mp.spec && mp.joined; // T41 §25.4: server-confirmed spectator
    if (mpSpecActive) { // spectator: capture rig edges; NO local sim, NO input stream (§25.2/§25.4)
      specEdgeNext = mainFireEdge || pIn.jumpEdge;
      specEdgePrev = adsNow && !specPrevAds; specPrevAds = adsNow;
    }
    else if (CFG.MP.enabled && mp.ready) mpFixedStep(wdt, pIn); // MP: fixed-step accumulator drives prediction + input stream (spec §2)
    else player.update(wdt, pIn);
    if (mpSpecActive) { if (weapons.vmRoot) weapons.vmRoot.visible = false; } // T41 §25.4: spectator carries no weapon
    else weapons.update(wdt, {
      fireHeld: actionDown('fire') && player.alive && !weapons.cooking,
      fireEdge: mainFireEdge && player.alive && !weapons.cooking, ads: adsNow && player.alive,
    });
    mainFireEdge = false;
    match.update(wdt);
    // [T119] per-frame presentation ownership: TP body ↔ FP viewmodel (one owner, no drift)
    const tpOn = inMatch && settings.camMode === 'tp'; // [T133] THE CORPSE LAW — the alive clause is DROPPED: a hidden rig can't ragdoll, so a TPV death keeps the body on stage and the verlet owns the fall. inMatch re-read: endMatch may have fired INSIDE match.update this very frame (the results face must stay clean)
    const corpseOn = inMatch && !player.alive; // [T138] THE FPV CORPSE LAW — the last honest T133 residual closes: in FPV death the ORBIT CAM owns the eye (the pre-G-2 fallback at the camera block), so the FP-clip reason is GONE — the body shows + drives under the orbit, exactly like the TPV corpse
    if (player.tpBody) {
      player.tpBody.visible = tpOn || corpseOn;
      if (tpOn || corpseOn) {
        if (player.alive) { player.tpBody.position.set(player.pos.x, player.pos.y, player.pos.z); player.tpBody.rotation.y = player.yaw + Math.PI; } // [T133] THE FROZEN FRAME — the corpse container stays at its last ALIVE transform: the ragdoll solves in WORLD space, a moving container would drag the skeleton off its particles
        // [T121] (4) the researched holster/equip convention (opsive UCC + UE TPS template):
        // the ACTIVE weapon parents to the right HAND, the inactive PRIMARY slings across
        // the BACK (diagonal), the pistol-class secondary rides the right HIP. Rebuild on slot
        // change — the same buildViewModel meshes the FP viewmodel uses (one visual truth).
        const slot = weapons.cur !== undefined ? weapons.cur : 0; // the WeaponSystem's active index (weapons.cur)
        if (player._tpSlot !== slot || !player._tpProps) {
          player._tpSlot = slot;
          if (player._tpProps) player._tpProps.forEach(m => { if (m.parent) m.parent.remove(m); }); // [T130] the hand-bone mount parents outside tpBody — remove from wherever it rides
          const props = [];
          const r3p = player._tp3d;
          try {
            const defs = [weapons.slotWeapons[0], weapons.slotWeapons[1]];
            defs.forEach((sw, i) => {
              if (!sw || !sw.def) return;
              const g = buildViewModel(sw.def, finishById(loadout.finish), charmById(loadout.charm));
              g.scale.setScalar(0.9);
              if (i === slot) { // [T130] the in-hand weapon rides the ANATOMICAL hand bone when the skinned body is live; fixed socket otherwise
                if (r3p && r3p.ready && r3p.attach(g)) {
                  (g.userData.hands || []).forEach(h => { if (h.parent) h.parent.remove(h); }); // [T132] the skinned hand does the gripping — the FP fists would double it
                  props.push(g); return;
                }
                const rig0 = player.tpBody.userData.rig;
                if (rig0 && rig0.armR) { // [T132] THE IN-HAND FALLBACK (the Warzone read): no skinned body → the weapon rides the PRIMITIVES arm near the fist (grip seated, muzzle out along the arm) instead of the old floating shoulder socket the user flagged; the buildViewModel fists stay on the grips
                  g.scale.setScalar(0.8);
                  g.position.set(0.02, -0.58, 0.04); g.rotation.set(Math.PI / 2.2, 0.1, 0);
                  rig0.armR.add(g); props.push(g); return;
                }
                g.position.set(0.3, 1.08, 0.28); g.rotation.set(0, 0, 0); // the right-hand socket (legacy, pre-rig)
              }
              else if (r3p && r3p.ready) return; // [T130] skinned body: back-sling/hip props stay off (they'd float — the carried weapon is the read)
              else if (/pistol/i.test(sw.def.cls || '')) { g.position.set(0.3, 0.86, 0.02); g.rotation.set(0, 0, Math.PI / 2); } // hip holster (pistol-class secondary)
              else { g.position.set(0.05, 1.28, 0.16); g.rotation.set(0, 0.35, Math.PI / 2.3); } // back sling (diagonal)
              player.tpBody.add(g); props.push(g);
            });
          } catch (e) { /* the props never break the rig */ }
          player._tpProps = props;
        }
        // [T120] the competition-grade body motion: crouch squash + speed sway (cheap,
        // presentation-only, reads the SAME state the physics wrote this frame)
        const rig = player.tpBody.userData.rig;
        // [T130] the skinned operator drive — when the CDN body is live it owns the frame:
        // the mixer reads the same per-frame state, the primitives step aside (fallback
        // law: any load failure keeps them on stage forever).
        // [T115] the operator poll — the rig was boot-stamped with the THEN-equipped op;
        // an operator change must REBUILD (the "only one character had the 3d body" fix):
        // old rig disposed, primitives re-shown (the fallback law until the new body is
        // live), props cleared so the weapon re-mounts on the NEW hand bone.
        const wantOp = (typeof loadout !== 'undefined' && loadout && loadout.operator) || 'ranger';
        if (player._tp3d && player._tp3dOp !== wantOp) {
          try { player._tp3d.dispose(); } catch { /* the rebuild never breaks the frame */ }
          player._tp3d = null; player._tpProps = null; player._tpSlot = -1;
          if (rig) { rig.torso.visible = true; rig.head.visible = true; rig.legs.visible = true; rig.armL.visible = true; rig.armR.visible = true; }
        }
        if (!player._tp3d) {
          try {
            const fin2 = finishById(loadout.finish);
            const nr = ops3dRig(wantOp, { tint: (fin2 && fin2.body) || 0x5a6b52 });
            if (nr) { nr.group.visible = false; player.tpBody.add(nr.group); player._tp3d = nr; player._tp3dOp = wantOp; }
          } catch { /* the CDN-first law: the procedural body never breaks */ }
        }
        const r3 = player._tp3d;
        if (r3 && r3.ready) {
          r3.group.visible = true;
          if (rig) { rig.torso.visible = false; rig.head.visible = false; rig.legs.visible = false; rig.armL.visible = false; rig.armR.visible = false; }
          r3.update(dt, {
            speed: player.speed2D ? player.speed2D() : 0,
            grounded: player.grounded, crouch: player.crouch,
            prone: player.prone > 0.5 ? 1 : 0,
            proneBack: player.proneBack === true, // [T132] the supine read (the BO6 dive law)
            dead: !player.alive, deadDir: player.deadDir || null, knock: player.deadKnock || 2.1, ladder: !!player.onLadder, swim: !!player.swimming, // [T138] the knock rides (config.knockFor — the damage-scaled impulse)
            ads: adsNow, emote: (player.emoteT || 0) > 0,
          });
        }
        else if (rig) {
          const sqT = (player.crouch > 0.5 && !(player.prone > 0.5)) ? 1 : 0;
          player._tpSq = (player._tpSq || 0) + (sqT - (player._tpSq || 0)) * Math.min(1, dt * 10);
          const sq = player._tpSq;
          rig.legs.scale.y = 1 - 0.35 * sq; rig.legs.position.y = 0.38 - 0.1 * sq;
          rig.torso.position.y = 1.02 - 0.2 * sq; rig.head.position.y = 1.62 - 0.32 * sq;
          const sp = Math.min(1, player.speed2D ? player.speed2D() / 6 : 0);
          // [T121] the skeletal/animation tier — the stride is the ONE truth (player.bobPhase
          // advances a half-cycle per step, player.js:101): the legs swing on the phase, the
          // arms counter them, amp fades with the crouch squash and dies in prone.
          const prT = player.prone > 0.5 ? 1 : 0;
          player._tpPr = (player._tpPr || 0) + (prT - (player._tpPr || 0)) * Math.min(1, dt * 9);
          const pr = player._tpPr;
          const swing = Math.sin(player.bobPhase || 0) * 0.62 * sp * (1 - sq * 0.45) * (1 - pr);
          if (rig.legL) { rig.legL.rotation.x = swing; rig.legR.rotation.x = -swing; }
          if (rig.armL) { const pF0 = (player.proneBack && pr > 0.5) ? 0 : 1; rig.armL.rotation.x = -swing * 0.75 + pr * 1.5 * pF0; rig.armR.rotation.x = swing * 0.75 + pr * 1.5 * pF0; } // [T132] supine lie: the crawl arms drop flat
          // [T122] (R36) the strafe-direction walk blend: the LATERAL velocity ratio (vel ·
          // the local right axis — physics.js:273 forward law f=(-sin,-cos) ⇒ right=(cos,-sin))
          // counter-rolls the legs on z and leans the torso — the forward swing above stays
          // the phase truth, this adds the SIDE component; amp fades with the crouch squash
          // and dies in prone (the same envelope the swing uses).
          const stRaw = Math.max(-1, Math.min(1, ((player.vel.x * Math.cos(player.yaw || 0) - player.vel.z * Math.sin(player.yaw || 0)) / 6) * (1 - pr)));
          player._tpSt = (player._tpSt || 0) + (stRaw - (player._tpSt || 0)) * Math.min(1, dt * 8);
          const stL = player._tpSt;
          const roll = stL * 0.22 * (1 - sq * 0.5);
          if (rig.legL) { rig.legL.rotation.z = -roll; rig.legR.rotation.z = -roll; }
          rig.torso.rotation.z = -stL * 0.1;
          // [T121] the prone pose mesh (the R23 animation tier): the body folds to the deck
          // — the torso pitches forward (−z is facing), the head rides out ahead, the legs
          // swing back, the mass drops toward the physics prone eye. [T132] the lie is now
          // ORIENTATION-AWARE (the BO6 supine law): the front lie folds toward −z as before
          // (the user playtest killed the on-back default), a proneBack DIVE lies on the
          // back (torso folds +, head rides behind, legs flat, arms down).
          const pF = player.proneBack ? 0 : 1; // 1 = front lie
          rig.torso.rotation.x = Math.sin(performance.now() * 0.011) * 0.045 * sp - pr * 1.3 * (pF ? 1 : -1);
          rig.torso.position.y = (1.02 - 0.2 * sq) - pr * 0.4;
          rig.head.position.y = (1.62 - 0.32 * sq) - pr * 1.1;
          rig.head.position.z = -pr * 0.42 * (pF ? 1 : -1);
          rig.legs.rotation.x = -pr * 1.42 * pF;
        }
      }
    }
    if (weapons.vmRoot) weapons.vmRoot.visible = inMatch && player.alive && !tpOn && !mpSpecActive; // [T132] THE ALIVE GATE — this line re-armed the viewmodel every frame and CLOBBERED updateVM's death hide (the user playtest: "when eliminated in-round the weapon floats in the eliminated screen"): a dead FP frame forced visible=TRUE right after weapons.update hid it. endMatch's T119 hide only won the frame it fired; the IN-ROUND death leaked. player.alive joins the conjunction — the weapon leaves with the life.
    // T55 §39.3: local trail wake — movement-tech band only (speed2D > 9; sprint 7.35 stays
    // clean). Trail colors your own tap-strafe/wall-bounce/superglide, offline AND MP.
    if (loadout.trail && loadout.trail !== 'none') {
      const td = trailById(loadout.trail);
      if (td.id !== 'none' && player.speed2D() > 9) FXfns.trailPuff(player.pos, td.color);
    }
    if (CFG.MP.enabled) { /* MP-1: bots cleared at start; server owns remote players */ }
    else if (match.state === 'live') bots.update(wdt, player, match.uavT > 0);
    if (CFG.MP.enabled) mpFrame(wdt); // correction blend + remote interpolation (before camera, spec §8/§9)
    for (const u of World.waterMats) u.uT.value += wdt; // [T130] the water surface clock (all zones, one uniform sweep)
    if (CFG.MP.enabled) { // T2-10: falling crate visuals (9 m/s — modes.js:102 verbatim)
      for (const cm of mpCrates) cm.position.y = Math.max(0.45, cm.position.y - 9 * wdt);
    }
    updateFX(wdt, camera);

    // camera
    if (mpSpecActive) specRig(dt); // T41 §25.4: rig runs AFTER mpFrame — freshest interpolated transforms
    else player.updateCamera(dt, settings.camMode === 'tp' && player.alive && !killcamActive(), player.hooks.obstruct, settings.camMode === 'tp' && player.alive && !killcamActive() && adsNow); // [T119] TPV boom rides the same Euler convention (issue 4) · [T120] the ADS tighten rides the SAME lerp rig
    // sprint FOV kick [feel sources] (T41 §25.4: skipped in spectate — rig keeps fov neutral)
    if (!mpSpecActive) {
      const sprintKick = player.sprinting ? 0.055 : 0;
      const tpAdsPinch = (settings.camMode === 'tp' && adsNow && player.alive) ? 0.92 : 1; // [T120] the TPV ADS read: a mild additional pinch on the camera fov (FP optics law untouched)
      camera.fov += (weapons.targetFov() * (1 + sprintKick) * tpAdsPinch - camera.fov) * Math.min(1, dt * 14);
      camera.updateProjectionMatrix();
    }
    // shake (T1-8: settings.camShake toggle — default ON == legacy)
    if (settings.camShake !== false && FX.shakeAmp > 0.0001) {
      camera.position.x += (Math.random() - 0.5) * FX.shakeAmp;
      camera.position.y += (Math.random() - 0.5) * FX.shakeAmp;
      camera.position.z += (Math.random() - 0.5) * FX.shakeAmp;
    }
    // scope overlay
    const scoped = weapons.def.scope && weapons.adsAmt > 0.7 && player.alive;
    $('scope-overlay').classList.toggle('hidden', !scoped);
    hud._scoped = scoped;
    // death cam: G-2 killcam owns the camera while engaged; orbit = fallback (pre-G-2 path verbatim)
    if (!player.alive) {
      const q = match.respawnQueue.find(r => r.actor.isPlayer);
      hud.setRespawnT(q ? q.t : 0);
      if (!killcamFrame(dt, now)) {
        const ang = now / 900;
        const c = player.pos;
        camera.position.set(c.x + Math.sin(ang) * 4, c.y + 2.6, c.z + Math.cos(ang) * 4);
        camera.lookAt(c.x, c.y + 1, c.z);
      }
    }
    // dynamic music intensity [NOVEL C2]
    const tNow = now / 1000;
    dmgEvents = dmgEvents.filter(t => tNow - t < 3);
    SFX.setCombatIntensity(Math.min(1, dmgEvents.length * 0.22 + (match.state === 'live' ? 0.12 : 0)));

    // audio listener (T41 §25.4: spectate listener rides the rig camera; G-2: killcam POV too)
    if (mpSpecActive || killcamActive()) {
      lookV.copy(camera.position);
      const fwd = camera.getWorldDirection(new THREE.Vector3());
      SFX.updateListener(lookV, fwd, upV);
    } else {
      player.eyePos(lookV);
      const fwd = player.forward(new THREE.Vector3());
      SFX.updateListener(lookV, fwd, upV);
    }

    // HUD
    // MP-3.1 (T1-9): server-truth HUD mirrors — scores arrive team-perspective-swapped
    // (server s0 = team 0; offline domScore[0]/teamKills[0] = ALLY) + server timer.
    // World.flags themselves are mirrored in mp.js onSnap.
    if (CFG.MP.enabled && mp.mBlock) {
      const mB = mp.mBlock;
      match.timeLeft = mp.matchTl;
      const ally = mp.myTeam === 0 ? mB.s0 : mB.s1, enemy = mp.myTeam === 0 ? mB.s1 : mB.s0;
      if (mB.md === 'dom') { match.domScore[0] = ally; match.domScore[1] = enemy; }
      else if (mB.md === 'ct') { // [T139] CUTTHROAT MP feed — server wires s0/s1/s2 (3 team slots); the 2-slot HUD head reads MY team vs the LEADING other (the hud ct adaptation's feed law)
        const ts = [mB.s0, mB.s1, mB.s2 || 0];
        const mine = ts[mp.myTeam] != null ? ts[mp.myTeam] : 0;
        const others = ts.filter((_, i) => i !== mp.myTeam);
        match.teamKills[0] = mine; match.teamKills[1] = Math.max(others[0] || 0, others[1] || 0); match.teamKills[2] = 0;
      }
      else if (mB.md === 'hp' || mB.md === 'kc' || mB.md === 'snd') { match.objS[0] = ally; match.objS[1] = enemy; } // T1-1 (SS22)
      else if (mB.md === 'gf' || mB.md === 'inf' || mB.md === 'ctl') { match.objS[0] = ally; match.objS[1] = enemy; } // T90-a defect fix: the trio are round/survivor-scored (objS surface) — they were falling into the kill-tally branch (teamKills)
      else { match.teamKills[0] = ally; match.teamKills[1] = enemy; }
      // T1-1 mirrors (SS22): hill clock/index, kc tags, snd round block
      if (mB.md === 'hp') { match.hpIdx = mp.hpIdx ?? -1; match.hpT = mp.hpT ?? 0; }
      if (mB.md === 'kc') match.kcTags = (mp.tags || []).map(t => ({ x: t[0], z: t[1], team: t[2], t: 9 }));
      if (mB.md === 'snd' && mp.sndB) match.snd = { r: mp.sndB.r, phase: mp.sndB.ph, side: mp.sndB.side, roundT: mp.sndB.rt, bombT: mp.sndB.bt >= 0 ? mp.sndB.bt : 0, bomb: mp.sndB.bt >= 0 && mp.sndB.bx != null ? { x: mp.sndB.bx, z: mp.sndB.bz } : null, pp: mp.sndB.pp, dp: mp.sndB.dp };
      // T98 (v1.63): server per-site ctlDone -> client zone flags. mB.ctl = {r, side, ph, rt, caps, sites, zf:[[done,prog] per site]};
      // the mirror writes the OFFLINE machine's field names (phase/roundT) so ONE hud branch serves both feeds; zf lands on the
      // SND_SITES latches (the exact flags offline updateCtl writes); atkMine pre-swapped (side is TEAM-indexed, objS arrive ally-perspective).
      if (mB.md === 'ctl' && mB.ctl) {
        match.ctl = { r: mB.ctl.r, side: mB.ctl.side, phase: mB.ctl.ph, roundT: mB.ctl.rt, caps: mB.ctl.caps, sites: mB.ctl.sites, atkMine: mB.ctl.side === (mp.myTeam ?? 0) };
        (mB.zf || []).forEach((z, i) => { const s = SND_SITES[i]; if (s) { s.ctlDone = !!z[0]; s.ctlProg = z[1]; } });
      } else if (mB.md && mB.md !== 'ctl') match.ctl = null;
      // T105 (v1.69): the gf/inf HUD branches join the mirror — the T98 ctl pattern verbatim: the
      // mirror writes the OFFLINE machine's field names so ONE hud branch serves both feeds. The
      // T89 additive wire fields (mB.gf/mB.inf) were landing on the wire unread; inf's scoreboard
      // surfaces (survivors alive / horde size) compute from the server's own alive/team truth
      // (remoteActors + self = the full snapshot pl) — the offline allActors idiom.
      if (mB.md === 'gf' && mB.gf) match.gf = { r: mB.gf.r, side: mB.gf.side, phase: mB.gf.ph, roundT: mB.gf.rt, kit: mB.gf.kit };
      else if (mB.md && mB.md !== 'gf') match.gf = null;
      if (mB.md === 'inf' && mB.inf) {
        match.inf = { started: mB.inf.started, first: mB.inf.first };
        const ra = remoteActors(), meTeam = mp.myTeam ?? player.team;
        match.teamKills[0] = ra.filter(a => a.team === 0 && a.alive).length + (meTeam === 0 && player.alive ? 1 : 0);
        match.teamKills[1] = ra.filter(a => a.team === 1).length + (meTeam === 1 ? 1 : 0);
      } else if (mB.md && mB.md !== 'inf') match.inf = null;
    }
    if (CFG.MP.enabled) hud.replayRec(Replay.armed && Replay.recording); // T42 §26.1: REC indicator while a per-match record is live
    const spreadPx = Math.tan(weapons.currentSpread ? weapons.currentSpread() : 0.002) * (innerHeight / 2) / Math.tan(camera.fov * Math.PI / 360);
    hud.updateCrosshairDynamic(spreadPx, weapons.adsAmt > 0.5);
    hud.update(dt, {
      player, bots, settings, weapons, match, camera, fps,
      mode: match.mode,
      bots: CFG.MP.enabled ? { bots: remoteActors() } : bots, // T2-10: remotes on the minimap via field-compatible pseudo-actors (zero hud changes)
      uav: CFG.MP.enabled ? mp.uavT > 0 : match.uavT > 0,
      zones: match.mode === 'ctl' ? SND_SITES.map(s => ({ id: s.id, done: !!s.ctlDone, prog: s.ctlProg || 0 })) : null, // T98: one zone feed, two writers (offline updateCtl / MP zf mirror)
      br: match.mode === 'br' ? (CFG.MP.enabled ? (mp.brB || null) : match.br) : null, // [T171] the BR HUD row — offline reads the machine, MP reads the zone mirror
      brAlive: match.mode === 'br' ? (CFG.MP.enabled ? remoteActors().filter(a => a.alive).length + (player.alive ? 1 : 0) : [...bots.bots].filter(b => b.alive).length + (player.alive ? 1 : 0)) : 0,
    });
    // scoreboard hold
    if (Input.keys.has('Tab') || Input.padScoreboard) {
      if (CFG.MP.enabled) hud.showScoreboard(true, { player, bots: { bots: scoreActors() }, mode: match.mode, match, mp: true }); // MP-2: remotes from snapshot meta · [T118 G-8] mp:true arms the report affordance
      else hud.showScoreboard(true, { player, bots, mode: match.mode, match, mp: false }); // [T118 G-8] offline bots cannot be reported
    }
    else hud.showScoreboard(false);

    // countdown announcer (throttled to int change)
    if (match.state === 'countdown') {
      const c = Math.ceil(match.countdownT);
      if (lastCd !== c) { lastCd = c; hud.announce(t('a.deploying'), c + '…'); }
    } else lastCd = -1;
  } else {
    // menu idle: slow orbit showcase
    if (scene) {
      const t = now / 12000;
      camera.position.set(Math.sin(t) * 42, 14 + Math.sin(t * 0.7) * 3, Math.cos(t) * 30);
      camera.lookAt(0, 2, 0);
      updateFX(dt, camera);
    }
  }

  if (composer && !document.hidden) composer.render();
  else if (renderer) renderer.render(scene, camera);
  endFrame();
}
