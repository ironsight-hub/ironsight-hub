// ============================================================
// IRONSIGHT — onboard.js (Lost Ledger L10, Task 89-b, v1.55) : 7-stage
// onboarding — Apex "Rookie Tutorial" pattern. Self-contained browser ESM:
// ZERO imports (config.js was checked — DEFAULT_SETTINGS/SETTINGS_LS_KEY own
// the settings store; the tutorial deliberately runs its OWN module-owned
// store after the history.js pattern, see onbPersistShape). Reads are
// best-effort and headless-safe; WRITES stay with the integrator.
//
// LAWS (pinned by the recovery spec — surviving chat fragments):
//  1. SCHEME-PICK-FIRST — S1 asks mouse / gamepad / touch BEFORE any movement
//     teaching, and the chosen scheme gates the wording of every later stage
//     (each face key takes a .mouse / .gamepad / .touch suffix).
//  2. SKIP + REWARD — every stage is skippable; skipping still grants the
//     stage reward (onbSkipAll marks all stages done + claimed, so totals
//     reconcile to {cr:325, bp:150} either way). Nothing punishes skipping.
//  3. ONE SCREEN AT A TIME — a stage is {id, n, key, done, reward}: a pinned
//     i18n key prefix, a completion signal on real game events (onbEventFor)
//     and an escalating CR/BP reward.
//
// STAGES (pinned): S1 scheme-pick · S2 move (walk+sprint) · S3 look ·
// S4 fire+ADS · S5 reload+swap (quickswap) · S6 grenade+ability ·
// S7 objective+ping (mode-aware hint). Rewards 25/25/25/50/50/50+50/100+100
// → 325 CR + 150 BP XP total (onbRewardTotal).
//
// STATE SHAPE (pinned) — {done:[stageId...], scheme, claimed:{stageId:true}}
// at ONB_LS_KEY. done is canonical ONB order; scheme is '' until S1 resolves;
// claimed only ever holds COMPLETE stages (a claim = the reward granted).
// i18n: 81 keys (7 stages × title/body/hint × 3 schemes + 18 common) — every
// key ships an EN fallback in ONB_EN (§48.2 class); the 9-locale parity patch
// is the integrator's L11 wave. Interpolation tokens: {n} {cr} {bp} — plain
// string replace at render time.
// ============================================================

// ---------------- PINNED CONSTANTS ----------------
export const ONB_VERSION = 1;  // state-schema version — migrateOnb tolerates a wrapper {v, ...} and strips it
export const ONB_LS_KEY = 'ironsight.onboard.v1'; // module-owned store (main.js keeps 'ironsight.onboarded.v1' = the §52.2 first-boot flag)

// The three control schemes, in pick order. LAW 1 gates all wording on these.
export const ONB_SCHEMES = Object.freeze(['mouse', 'gamepad', 'touch']);
export const ONB_SCHEME_STAGE = 's1'; // LAW 1: the scheme-pick stage LEADS the array

// done = the exact game event that completes the stage (S2..S7 fire from the
// integrator's input/mode code; S1 fires on the scheme pick — onbComplete ALSO
// honors a bare state.scheme so migrated saves read complete without the event).
// Rewards escalate 25→100 CR; BP joins at S6. Copy binds mirror input.js
// BINDINGS + config.js PAD_BINDS + the §62.1 touch buttons at v1.54.
export const ONB_STAGES = Object.freeze([
  { id: 's1', n: 1, key: 'onb.s1', done: 'onb-scheme',    reward: Object.freeze({ cr: 25,  bp: 0 }) },
  { id: 's2', n: 2, key: 'onb.s2', done: 'onb-move',      reward: Object.freeze({ cr: 25,  bp: 0 }) },
  { id: 's3', n: 3, key: 'onb.s3', done: 'onb-look',      reward: Object.freeze({ cr: 25,  bp: 0 }) },
  { id: 's4', n: 4, key: 'onb.s4', done: 'onb-fire',      reward: Object.freeze({ cr: 50,  bp: 0 }) },
  { id: 's5', n: 5, key: 'onb.s5', done: 'onb-swap',      reward: Object.freeze({ cr: 50,  bp: 0 }) },
  { id: 's6', n: 6, key: 'onb.s6', done: 'onb-equip',     reward: Object.freeze({ cr: 50,  bp: 50 }) },
  { id: 's7', n: 7, key: 'onb.s7', done: 'onb-objective', reward: Object.freeze({ cr: 100, bp: 100 }) },
].map(Object.freeze));

// ---------------- SMALL HELPERS (pure, never throw) ----------------
const IDS = ONB_STAGES.map(s => s.id);
const byId = new Map(ONB_STAGES.map(s => [s.id, s]));
const byEvent = new Map(ONB_STAGES.map(s => [s.done, s]));
const FRESH = () => ({ done: [], scheme: '', claimed: {} });

// Copy-on-write clone — the pure ops below NEVER mutate their input state.
const clone = (st) => ({
  done: Array.isArray(st && st.done) ? st.done.filter(id => byId.has(id)) : [],
  scheme: (st && typeof st.scheme === 'string') ? st.scheme : '',
  claimed: (st && st.claimed && typeof st.claimed === 'object' && !Array.isArray(st.claimed))
    ? { ...st.claimed } : {},
});
// Foreign state coercion: anything object-shaped is cloned, everything else
// (null, undefined, garbage from a bad save) becomes the fresh state.
const coerce = (st) => (st && typeof st === 'object' && !Array.isArray(st)) ? clone(st) : FRESH();

// ---------------- STATE — MIGRATE / READ / SHAPE ----------------

// migrateOnb — safe parse of ANYTHING (raw localStorage string, parsed object,
// garbage, null) into the pinned shape. Unknown ids/fields are dropped, done is
// canonicalized to ONB order, claimed keeps only true flags on known stage ids.
// A wrapper object (e.g. {v:9, done, ...}) is tolerated: its state fields are
// read, everything else is stripped. Never throws, never returns the input.
export function migrateOnb(raw) {
  let o = raw;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return FRESH(); } }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return FRESH();
  const done = [];
  if (Array.isArray(o.done)) {
    for (const id of o.done) if (typeof id === 'string' && byId.has(id) && !done.includes(id)) done.push(id);
    done.sort((a, b) => byId.get(a).n - byId.get(b).n); // canonical ONB order
  }
  const scheme = ONB_SCHEMES.includes(o.scheme) ? o.scheme : '';
  const claimed = {};
  if (o.claimed && typeof o.claimed === 'object' && !Array.isArray(o.claimed)) {
    for (const id of Object.keys(o.claimed)) if (byId.has(id) && o.claimed[id] === true) claimed[id] = true;
  }
  return { done, scheme, claimed };
}

// onbState — best-effort read of the module store (history.js law: failure is
// caught and NEVER thrown into game flow). Headless-safe: no localStorage
// (node, bun, workers) or a throwing read (privacy mode) → fresh state.
export function onbState() {
  try {
    if (typeof localStorage === 'undefined') return FRESH();
    return migrateOnb(localStorage.getItem(ONB_LS_KEY));
  } catch { return FRESH(); }
}

// onbPersistShape — the machine-usable persistence contract for the integrator.
const SHAPE = Object.freeze({
  key: ONB_LS_KEY,
  v: ONB_VERSION,
  json: '{"done":["s1","s2"],"scheme":"mouse","claimed":{"s1":true,"s2":true}}',
  fields: Object.freeze({
    done: 'string[] — stage ids (ONB_STAGES ids, canonical order); [] until stages complete',
    scheme: '"" | "mouse" | "gamepad" | "touch" — "" until S1 resolves (law 1)',
    claimed: 'map stageId → true — COMPLETE stages only; a claim = the stage reward granted',
  }),
  note: 'Module-owned store (history.js best-effort pattern). onbState() reads; WRITES stay with the integrator. main.js keeps ironsight.onboarded.v1 (§52.2 first-boot flag) — set it when onbActive first turns false.',
});
export function onbPersistShape() { return SHAPE; }

// ---------------- PROGRESS LAWS ----------------

// Stage lookup by id → the frozen stage object, or null. Single source for the
// integrator's per-stage rendering (reward lives at stage.reward).
export function onbStage(id) { return byId.get(id) || null; }

// onbComplete — LAW 1: S1 completes on the scheme pick. The 'onb-scheme' event
// lands in done via onbMarkEvent, AND a bare state.scheme (migrated saves,
// integrator shortcuts) satisfies the predicate on its own. S2..S7 complete
// only from their pinned event landing in done.
export function onbComplete(stageId, state) {
  if (!byId.has(stageId)) return false;
  const s = coerce(state);
  if (s.done.includes(stageId)) return true;
  return stageId === ONB_SCHEME_STAGE && !!s.scheme;
}

// onbNext — the first incomplete stage in ONB order (the one-screen law: this
// is the stage the page shows), or null when every stage is complete.
export function onbNext(state) {
  const s = coerce(state);
  return ONB_STAGES.find(st => !onbComplete(st.id, s)) || null;
}

// onbActive — any stage incomplete AND not opted out. There is NO separate
// opt-out flag: onbSkipAll IS the opt-out (all done+claimed ⇒ inactive), so
// the persisted shape stays exactly the pinned {done, scheme, claimed}.
export function onbActive(state) { return onbNext(state) !== null; }

// onbClaim — pure, copy-on-write: records the claim for a COMPLETE stage (the
// integrator grants stage.reward when the flag flips; totals reconcile via
// onbRewardTotal). Incomplete or already-claimed → unchanged copy (no reward
// for nothing; claiming twice is idempotent).
export function onbClaim(stageId, state) {
  const s = coerce(state);
  if (!byId.has(stageId) || !onbComplete(stageId, s) || s.claimed[stageId] === true) return s;
  const out = clone(s);
  out.claimed[stageId] = true;
  return out;
}

// onbSkipAll — LAW 2: skipping grants everything. All stages → done + claimed
// (scheme preserved), so a skipped tutorial still banks onbRewardTotal. Pure.
export function onbSkipAll(state) {
  const s = coerce(state);
  return { done: [...IDS], scheme: s.scheme, claimed: Object.fromEntries(IDS.map(id => [id, true])) };
}

// onbEventFor — the game-event name a stage completes on (done IS the event
// name — single source of truth). Unknown id → null.
export function onbEventFor(stageId) {
  const st = byId.get(stageId);
  return st ? st.done : null;
}

// onbMarkEvent — pure reducer for the integrator's event feed: a pinned event
// name ('onb-move'...) lands its stage in done, canonical ONB order, deduped.
// Unknown events pass through unchanged (as a copy).
export function onbMarkEvent(event, state) {
  const s = coerce(state);
  const st = byEvent.get(event);
  if (!st || s.done.includes(st.id)) return s;
  const out = clone(s);
  out.done = IDS.filter(id => out.done.includes(id) || id === st.id);
  return out;
}

// ---------------- WORDING · KEYS · TOTALS · PROGRESS ----------------

const FACES = ['title', 'body', 'hint'];

// onbSchemeWording — LAW 1: the scheme gates the wording. Returns the face key
// suffixed with the scheme ('onb.s2.body.mouse'). An unknown/absent scheme
// falls back to 'mouse' (the canonical default), an unknown face to 'body'.
// Accepts a stage object or a stage id; unknown stage → ''.
export function onbSchemeWording(stage, scheme, face = 'body') {
  const st = (stage && stage.key) ? stage : byId.get(stage);
  if (!st) return '';
  const sc = ONB_SCHEMES.includes(scheme) ? scheme : 'mouse';
  const f = FACES.includes(face) ? face : 'body';
  return st.key + '.' + f + '.' + sc;
}

// Common (scheme-agnostic) faces the page renders around the stage card.
const COMMON_KEYS = Object.freeze([
  'onb.title', 'onb.stage', 'onb.hintLabel', 'onb.skip', 'onb.next', 'onb.finish',
  'onb.reward', 'onb.rewardCr', 'onb.rewardBp', 'onb.claimed', 'onb.schemeQ',
  'onb.scheme.mouse', 'onb.scheme.gamepad', 'onb.scheme.touch',
  'onb.skipNote', 'onb.doneAll', 'onb.objCap', 'onb.objPing',
]);

// onbI18nKeys — every key the staged page must render: per stage the
// title/body/hint grid × 3 schemes (63) + the 18 common faces = 81. Cached +
// frozen; the same array every call (stable identity for probe + i18n patch).
const ONB_KEYS_CACHE = Object.freeze(
  ONB_STAGES
    .flatMap(st => FACES.flatMap(f => ONB_SCHEMES.map(sc => st.key + '.' + f + '.' + sc)))
    .concat(COMMON_KEYS)
);
export function onbI18nKeys() { return ONB_KEYS_CACHE; }

// onbRewardTotal — derived from the pinned stage table (single source): the
// recovery spec pins 25+25+25+50+50+50+100 CR and 50+100 BP = {cr:325, bp:150}.
const TOTAL = Object.freeze(ONB_STAGES.reduce(
  (t, st) => ({ cr: t.cr + st.reward.cr, bp: t.bp + st.reward.bp }), { cr: 0, bp: 0 }
));
export function onbRewardTotal() { return TOTAL; }

// onbProgress — feed for the progress bar + banked tally. n = stages complete
// (scheme predicate included), claimed = claims recorded, cr/bp = banked sums
// over CLAIMED stages only (a completed-but-unclaimed stage pays nothing yet).
export function onbProgress(state) {
  const s = coerce(state);
  const n = ONB_STAGES.filter(st => onbComplete(st.id, s)).length;
  let claimed = 0, cr = 0, bp = 0;
  for (const id of IDS) {
    if (s.claimed[id] === true) {
      claimed++;
      const r = byId.get(id).reward;
      cr += r.cr; bp += r.bp;
    }
  }
  return { n, total: ONB_STAGES.length, claimed, cr, bp };
}

// S7 mode-aware hint — capture modes (config.js MODES entries carrying a
// capture beat: dom.captureTime, hp.hillTime) get the ring lesson; every other
// mode gets the ping lesson. Re-check this set when MODES grows (T1-1 law).
const CAP_MODES = Object.freeze(['dom', 'hp']);
export function onbModeHintKey(mode) { return CAP_MODES.includes(mode) ? 'onb.objCap' : 'onb.objPing'; }

// ---------------- [v1.50 port T90] first-run gate + start/replay laws (ADDITIVE) ----------------
// Provenance: the SHA-verified v1.50 original (scratch/vrestore/v150/js/onboard.js, Task
// 78-f), audited against this rebuild at T90. Additive only — the pinned stage table, the
// skip+reward totals and the 3-field persist shape are untouched. The v1.50 module read
// CFG + FRAG from config.js for its copy params; this rebuild keeps the zero-import law,
// so the laws below port as pure data/functions (no config leg).

// First-run gate law (v1.50 ONB_FIRST_RUN verbatim): the tutorial is offered to EVERY
// first-run player — touch AND desktop both (CODM parity framing); showOnce = the
// absent-only gate (an in-progress tutorial is a RESUME surface, never a second first-run);
// the flag doubles as the kill-switch (flip a leg off → never offered). The enforcement
// site stays with the integrator (the ironsight.onboarded.v1 §52.2 flag — onbPersistShape.note).
export const ONB_FIRST_RUN = Object.freeze({ touch: true, desktop: true, showOnce: true }); // [v1.50 port T90]
// Calibration anchor (v1.50 verbatim): Apex Rookie Tutorial ≈ 3 min — the up-front
// time-cost promise. ONB_EN is a pinned exact key set (no new faces), so the integrator
// folds this into page copy at the i18n wave if desired.
export const ONB_TARGET_MINUTES = 3; // [v1.50 port T90]

// onbShouldShowFirstRun — v1.50 onboardShouldShow law on the module-owned store: TRUE only
// when nothing is persisted yet (the absent-only gate — fresh-looking state IS nothing
// persisted, because every opt-out path writes a full state) AND the first-run flag is on.
// Pure, never throws; feed it onbState() (or any coerce-able state).
export function onbShouldShowFirstRun(state) { // [v1.50 port T90] v1.50 onboardShouldShow
  if (!ONB_FIRST_RUN || !(ONB_FIRST_RUN.touch || ONB_FIRST_RUN.desktop)) return false;
  const s = coerce(state);
  return s.done.length === 0 && !s.scheme && Object.keys(s.claimed).length === 0;
}

// onbStart — v1.50 onboardStart three-branch law, current shape: nothing persisted → the
// fresh seed (START); started but incomplete → the UNTOUCHED copy (RESUME — never resets
// progress); complete → the fresh seed (REPLAY — v1.50's 'onb:replay' lobby-tile law: a
// done tutorial can be restarted; v1.50 noted the prior completion in times.replay, which
// the pinned 3-field shape does not carry — the integrator notes it on the §52.2 flag if
// needed). REWARD LAW: a replayed run re-banks stage rewards exactly like v1.50's replay
// (a fresh run pays again), so this MUST ride the explicit start/replay action only —
// never an automatic boot path; the integrator gates the replay tile. Pure copy-on-write;
// persist the returned state.
export function onbStart(state) { // [v1.50 port T90] v1.50 onboardStart
  const s = coerce(state);
  const started = s.done.length > 0 || !!s.scheme || Object.keys(s.claimed).length > 0;
  return started && onbNext(s) !== null ? s : FRESH(); // started+incomplete = resume; started+complete = replay; absent = start
}

// ---------------- EN FALLBACKS (§48.2 class — English only; the 9-locale
// parity patch is the integrator's L11 wave) ----------------
export const ONB_EN = Object.freeze({
  // common faces
  'onb.title': 'ROOKIE TUTORIAL',
  'onb.stage': 'STAGE {n} OF 7',
  'onb.hintLabel': 'FIELD NOTE',
  'onb.skip': 'SKIP',
  'onb.next': 'CONTINUE',
  'onb.finish': 'FINISH — DEPLOY',
  'onb.reward': 'REWARD',
  'onb.rewardCr': '+{cr} CR',
  'onb.rewardBp': '+{bp} BP XP',
  'onb.claimed': 'BANKED',
  'onb.schemeQ': 'CHOOSE YOUR CONTROL SCHEME',
  'onb.scheme.mouse': 'MOUSE + KEYBOARD',
  'onb.scheme.gamepad': 'GAMEPAD',
  'onb.scheme.touch': 'TOUCH',
  'onb.skipNote': 'SKIP PAYS THE REWARD TOO — NOTHING HERE LOCKS MODES OR LOADOUTS.',
  'onb.doneAll': 'TUTORIAL COMPLETE — {cr} CR + {bp} BP XP BANKED',
  'onb.objCap': 'CAP MODES (DOM / HP): stand in the ring and hold it — it ticks while friendly. PING the approaches on the way in.',
  'onb.objPing': 'NO RING IN THIS MODE? PING ANYWAY — it marks threats and loot for the whole team.',
  // S1 — scheme pick (the detection notice rides the title variant)
  'onb.s1.title.mouse': 'CHOOSE YOUR SCHEME · MOUSE DETECTED',
  'onb.s1.title.gamepad': 'CHOOSE YOUR SCHEME · GAMEPAD DETECTED',
  'onb.s1.title.touch': 'CHOOSE YOUR SCHEME · TOUCH DETECTED',
  'onb.s1.body.mouse': 'We detected mouse + keyboard. Lock it in, or switch — every lesson after this one speaks your scheme.',
  'onb.s1.body.gamepad': 'We detected a gamepad. Lock it in, or switch — every lesson after this one speaks your scheme.',
  'onb.s1.body.touch': 'We detected a touch screen. Lock it in, or switch — every lesson after this one speaks your scheme.',
  'onb.s1.hint.mouse': 'This pick only re-words the tutorial — change it any time in SETTINGS → CONTROLS.',
  'onb.s1.hint.gamepad': 'This pick only re-words the tutorial — change it any time in SETTINGS → CONTROLS.',
  'onb.s1.hint.touch': 'This pick only re-words the tutorial — change it any time in SETTINGS → CONTROLS.',
  // S2 — move: walk + sprint
  'onb.s2.title.mouse': 'MOVE — KEYBOARD',
  'onb.s2.title.gamepad': 'MOVE — CONTROLLER',
  'onb.s2.title.touch': 'MOVE — TOUCH',
  'onb.s2.body.mouse': 'WASD to move · SPACE to jump · C to crouch / slide. Walk the range first.',
  'onb.s2.body.gamepad': 'Left stick to move · A to jump · B to crouch / slide. Walk the range first.',
  'onb.s2.body.touch': 'Touch the left zone to spawn the move stick · tap the buttons to jump and crouch / slide. Walk the range first.',
  'onb.s2.hint.mouse': 'Now hold SHIFT and sprint the long lane — the stage banks when walk AND sprint both register.',
  'onb.s2.hint.gamepad': 'Now click L3 and sprint the long lane — the stage banks when walk AND sprint both register.',
  'onb.s2.hint.touch': 'Now push the stick to its rim and sprint the long lane — the stage banks when walk AND sprint both register.',
  // S3 — look
  'onb.s3.title.mouse': 'LOOK — MOUSE',
  'onb.s3.title.gamepad': 'LOOK — RIGHT STICK',
  'onb.s3.title.touch': 'LOOK — DRAG',
  'onb.s3.body.mouse': 'Move the mouse to turn · sensitivity lives in SETTINGS → CONTROLS.',
  'onb.s3.body.gamepad': 'The right stick turns the camera — full deflection ≈ 178°/s · sensitivity lives in SETTINGS → CONTROLS.',
  'onb.s3.body.touch': 'Drag the look pad to turn · speed rides the TOUCH slider in SETTINGS → CONTROLS.',
  'onb.s3.hint.mouse': 'Sweep the camera wall to wall across the range — the stage banks on the sweep.',
  'onb.s3.hint.gamepad': 'Roll the stick edge to edge and sweep the range — the stage banks on steady turns.',
  'onb.s3.hint.touch': 'Drag across the look pad until you have swept the range — the stage banks on the drag.',
  // S4 — fire + ADS
  'onb.s4.title.mouse': 'FIRE + ADS — MOUSE',
  'onb.s4.title.gamepad': 'FIRE + ADS — TRIGGERS',
  'onb.s4.title.touch': 'FIRE + ADS — BUTTONS',
  'onb.s4.body.mouse': 'LMB fires · hold RMB (or E) to aim down sights — ADS tightens spread and slows your stride.',
  'onb.s4.body.gamepad': 'RT fires · LT aims down sights — ADS tightens spread and slows your stride.',
  'onb.s4.body.touch': 'Hold a FIRE button to shoot · tap ADS to toggle sights — aiming tightens spread and slows your stride.',
  'onb.s4.hint.mouse': 'Put rounds down-range, then ADS on a target — the stage banks when both register.',
  'onb.s4.hint.gamepad': 'Put rounds down-range, then ADS on a target — the stage banks when both register.',
  'onb.s4.hint.touch': 'Put rounds down-range, then ADS on a target — the stage banks when both register.',
  // S5 — reload + swap (quickswap)
  'onb.s5.title.mouse': 'RELOAD + SWAP — KEYS',
  'onb.s5.title.gamepad': 'RELOAD + SWAP — FACE BUTTONS',
  'onb.s5.title.touch': 'RELOAD + SWAP — TAPS',
  'onb.s5.body.mouse': 'R reloads · 1 / 2 switch slots · Q quick-swaps. Dry mag mid-fight? The quick-swap beats the reload.',
  'onb.s5.body.gamepad': 'X reloads · Y quick-swaps. Dry mag mid-fight? The quick-swap beats the reload.',
  'onb.s5.body.touch': 'Tap RELOAD when dry · tap SWAP to quick-swap. Dry mag mid-fight? The swap beats the reload.',
  'onb.s5.hint.mouse': 'Empty the mag, reload (R), then quick-swap (Q) — the stage banks on the full beat.',
  'onb.s5.hint.gamepad': 'Empty the mag, reload (X), then quick-swap (Y) — the stage banks on the full beat.',
  'onb.s5.hint.touch': 'Empty the mag, tap RELOAD, then tap SWAP — the stage banks on the full beat.',
  // S6 — grenade + ability
  'onb.s6.title.mouse': 'GRENADE + ABILITY — G / 4',
  'onb.s6.title.gamepad': 'GRENADE + ABILITY — BUMPERS',
  'onb.s6.title.touch': 'GRENADE + ABILITY — HOLD + TAP',
  'onb.s6.body.mouse': 'G lobs a frag — hold to cook it · 4 fires your tactical ability. Both recharge; waste neither.',
  'onb.s6.body.gamepad': 'RB lobs a frag · LB fires your tactical ability. Both recharge; waste neither.',
  'onb.s6.body.touch': 'Hold the grenade button to cook it, then release · tap the ability button. Both recharge; waste neither.',
  'onb.s6.hint.mouse': 'Cook a frag behind cover, then spend the ability — the stage banks when both have fired.',
  'onb.s6.hint.gamepad': 'Cook a frag behind cover, then spend the ability — the stage banks when both have fired.',
  'onb.s6.hint.touch': 'Cook a frag behind cover, then spend the ability — the stage banks when both have fired.',
  // S7 — objective + ping (mode-aware: pair with onb.objCap / onb.objPing)
  'onb.s7.title.mouse': 'OBJECTIVE + PING — Z / MMB',
  'onb.s7.title.gamepad': 'OBJECTIVE + PING — D-PAD',
  'onb.s7.title.touch': 'OBJECTIVE + PING',
  'onb.s7.body.mouse': 'Objectives score the match — hold rings, plant, confirm tags. Z or middle-mouse PINGS the world: your team sees what you see.',
  'onb.s7.body.gamepad': 'Objectives score the match — hold rings, plant, confirm tags. The D-pad PINGS the world: your team sees what you see.',
  'onb.s7.body.touch': 'Objectives score the match — hold rings, plant, confirm tags. Ping marks threats: your team sees what you see.',
  'onb.s7.hint.mouse': 'Capture a point or land a ping — either beat banks the last reward. Then hit DEPLOY.',
  'onb.s7.hint.gamepad': 'Capture a point or land a ping — either beat banks the last reward. Then hit DEPLOY.',
  'onb.s7.hint.touch': 'Capture a point or land a ping — either beat banks the last reward. Then hit DEPLOY.',
});
