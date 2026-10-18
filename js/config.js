// ============================================================
// IRONSIGHT — config.js : SINGLE SOURCE OF TRUTH
// Every value provenance-tagged → see docs/PARAMETERS.md + docs/RESEARCH.md
// ============================================================
export const CFG = {
  VERSION: '1.0.0',
  PHYS: {
    gravity: 20.5,            // quake-class tuned (800u/s²≈15.2, widened for 1.2m apex @7.0 jump)
    walkSpeed: 4.9,           // [CS2 250u/s≈4.76][COD base 4.8]
    sprintMult: 1.5,          // [COD wiki: sprint = base × 1.5] → 7.35
    proneMult: 0.45, proneHeight: 1.0, // [T121] (9) prone: crawl speed ×0.45, hitbox/eye height 1.0 m (was: absent)
    crouchMult: 0.52,         // [CS2 crouch ≈ 1/3 run] widened slightly
    adsMoveMult: 0.55,        // [COD/Warzone ADS strafe class]
    accel: 12, friction: 8.2, // quake-class ground (sv_accelerate 10 lineage)
    airAccel: 20, airWishCap: 2.4, // [QUAKE 30u/s cap formula, adrianb.io, widened ×4 for feel]
    jumpVel: 7.0,
    jumpBuffer: 0.15,
    bhopRetention: 0.96,      // frame-perfect hop keeps 96% horizontal
    slideGate: 3.8,           // [APEX 200hu/s]
    slideBoost: 1.12, slideDecay: 0.85, slideMinTime: 0.21, // [APEX 0.21s tech window] · [T121] (8) the user's genre law: a slide gives a SLIGHT boost (was 1.32 — a launch)
    slideHopKeep: 0.97,
    stepHeight: 0.55,
    playerRadius: 0.38, eyeHeight: 1.62, height: 1.8, crouchHeight: 1.25,
    crouchLerp: 12,           // 1/s
    fallDamageH: 8.5, fallDmgPerM: 12, fallDmgCap: 65, // [COD class]
    landDipVel: 5.0,
  },
  LOOK: {
    yawPerCount: 0.0022,      // [CS2 0.022°/count at sens 1]
    sensDefault: 1.0, sensRange: [0.05, 3.0],
    adsSensDefault: 0.8, pitchClamp: 89 * Math.PI / 180,
    tiltStrafe: 2 * Math.PI / 180, // camera strafe roll [Titanfall feel sources]
    bobAmp: 0.035, bobFreq: 2.1,   // [accessibility: toggleable]
  },
  HEALTH: {
    maxHP: 100, regenDelay: 5.0, regenRate: 35, // [COD MW2019: 5s wiki verbatim]
    shieldMax: 50, shieldDecay: 1,             // Supply Drop overshield (C-layer)
    spawnProtTime: 2.5,                        // [UT/arena sources]
    respawnDelay: 3.5,
  },
  STREAKS: [
    { name: 'UAV', cost: 400, dur: 30 },       // [BO2: 350pts/30s, score-scaled]
    { name: 'AIRSTRIKE', cost: 700, bombs: 6, dmg: 200, radius: 6, delay: 2.2 },
    { name: 'SUPPLY DROP', cost: 1000, shieldTime: 8 },
  ],
  XP: { kill: 100, headshot: 25, assist: 50, revenge: 50, capture: 150, neutralize: 75, win: 500, loss: 100,
    // T1-1 modes (SS22): confirm/deny [CoD Wiki e_12]; plant/defuse personal XP — SPEC DECISION (sources silent), scaled to capture/2
    confirm: 50, deny: 25, plant: 100, defuse: 100 },
  MULTI: { window: 4.0, strings: ['DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'] }, // ≤5th
  STREAK_STRINGS: { 5: 'KILLING SPREE', 10: 'UNSTOPPABLE', 15: 'GODLIKE' }, // unreal lineage
  FOCUS: { kills: 3, window: 4.0, dur: 2.2, scale: 0.45, cooldown: 25 }, // NOVEL C1
  MP: { // MP-1 movement replication (Task 27) — design: docs/INTEGRATION_SPEC.md
    enabled: false,                   // flipped by ?mp=1 URL param at boot; default off = shipped path untouched
    server: '/room',                  // [T129] same-origin MOUNT PREFIX — the proxy (Next route handler / nginx / caddy, docs/HOSTING.md) strips /room/ and dials 127.0.0.1:3010; the page's own scheme rides so mixed content is structurally dead on any host
    socketPath: '/room/socket.io/',   // [T129] the engine.io route ON the mount — io('/room') would parse as a socket.io NAMESPACE; the mount dials io('/', {path}) (mp.js dialTarget)
    interpDelay: 100,                 // remote interpolation buffer ms (spike-proven: 2 snapshot intervals)
    blendRate: 30,                    // correction smoothing 1/s; geometric per-step factor min(1, dt*30) -> ~98% consumed in 100ms (spec §8)
    room: 'A',                        // MP-3: room id (server-side modes/rooms; ?room= override at boot)
  },
  TOUCH: { // §62.4 CONTROL OFFICIAL NUMERICS (v1.54, Task 87) OUR-CONSTANTS — the full touch tuning table (rewind-lost v1.49 scope, re-declared).
    // ZERO-REGRESSION LAW: every default == the shipped Task-81 behavior byte-identical (stickMax was the hardcoded 60 in onStickMove;
    // dead-zones 0 = no-op; hybridDrag 0 = every hybrid drag aims immediately; curve stays linear — aim-curve exponent is M8 scope).
    hybridFire: 1,   // §62.1 fire-hybrid master (hold=fire, drag=aim) — 0 disables drag-aim (M8-lite tuning row)
    lookBase: 2.6,   // §60.2 (recovered, Task 81) M3 law: lookDX += d × lookBase × touchSens
    stickMax: 60,    // px stick travel radius (move stick normalizes to [-1,1] over this)
    stickDead: 0.0,  // move-stick radial dead-zone, fraction of range — mag<dead → 0, else (mag−dead)/(1−dead)
    lookDead: 0.0,   // look-feed dead-zone px per axis — |d|<lookDead contributes 0 (sub-pixel jitter filter)
    hybridDrag: 0,   // px a hybrid fire touch must travel before aim engages — 0 = hold=fire, drag=aim immediately (§62.1 law)
    magnetismDeg: 2.0, // [v1.50 port T90] §60 (v1.48) bullet-path magnetism ceiling (offline only) — no current consumer; the cone-slowdown heir lives in CFG.ASSIST (magAngle/magDist/magFactor)
  }, // M9 live sens rides settings.touchSens (DEFAULT_SETTINGS; applyInputSettings → Input.touchSens) — NOT a const (user tuning)
  GYRO: { // [T90 merge] M8a gyro aim (CoD Mobile grammar): gate rides settings.gyroAim, multiplier rides settings.gyroSens (0.2–3.0, live-apply via applyInputSettings → Input.gyroSens)
    sensBase: 1.0,   // OUR-CONSTANT: base-multiplier reference — deltas ride the M3 law (d × CFG.TOUCH.lookBase × gyroSens, input.js), so 1° device tilt ≈ 0.33° screen turn at gyroSens 1.0; ~1:1 needs the slider max 3.0 (CoD Mobile gyro-multiplier band)
    maxDelta: 45,    // OUR-CONSTANT: per-event spike guard (deg) — a beta/gamma jump > 45° in one event is a sensor glitch or re-orientation, discarded (no aim warp)
  },
  AIM_CURVE: {
    exp: 1.5,        // OUR-CONSTANT (M8 order pins 1.5; industry response-curve exponent band 1.3–1.6, CoD 'standard'-class): CLASSIC shapes TOUCH look deltas only — d' = sign(d)·|d|^exp (aimCurveDelta, input.js). Sub-1px deltas damp (micro-precision), larger deltas sharpen (flicks). Desktop mouse stays raw.
  },
  GAMEPAD: { // [W3C gamepad spec + MDN gamepad docs — see gamepad.js header]
    moveDeadzone: 0.15, lookDeadzone: 0.12, // radial, rescaled (v−dz)/(1−dz)
    outerSnap: 0.98, curveGamma: 1.35, // rim snap + fine-control exponent curve
    lookRate: 3.1, // rad/s at full deflection, sens = 1 (≈178°/s)
    triggerThresh: 0.12, // analog trigger actuation
    assistAngle: 4.2, assistDist: 65, assistFactor: 0.55, // near-target look slowdown cone
    rumble: { shot: [0.5, 0.15, 45], hurt: [0.25, 0.75, 130], boom: [0.7, 0.9, 260] }, // [weak, strong, ms]
  },
  MODES: {
    ffa: { players: 12, killLimit: 30, time: 600 },
    tdm: { players: 12, teamLimit: 75, time: 600 },
    // [T139] the 12th mode — CUTTHROAT 3v3v3 [m_00 pass M verbatim shape: "3v3v3 - Cutthroat" (MW3 launch list); teamLimit 40 = SPEC DECISION logged (no numerics on disk — 9-lobby scale under the TDM 75 band); 3 teams round-robin, top-of-three wins, suicide credits nobody]
    ct: { players: 9, teamLimit: 40, time: 600 },
    dom: { players: 12, pointLimit: 200, time: 600, tickSec: 5, captureTime: 6.0, extraCapper: 0.65 }, // [COD Domination]
    practice: { players: 0, time: 0 },
    // --- T1-1 mode variety (SS22) ---
    hp: { players: 12, pointLimit: 250, time: 600, hillTime: 60, leadIn: 20, tickSec: 1, captureTime: 6.0, extraCapper: 0.65 }, // [COD Hardpoint e_11: 60s rotation, 1pt/s secured, 250 win; leadIn 20s MW verbatim; capture DOM constants reused]
    kc: { players: 12, teamLimit: 65, time: 600, tagTtl: 12, tagRadius: 2.0, tagCap: 12 }, // [COD Kill Confirmed e_12: 65 confirms; tagTtl/tagRadius = SPEC DECISION, logged SS22.2]
    snd: { players: 12, roundLimit: 6, time: 0, roundTime: 90, bombTime: 45, plantTime: 5, defuseTime: 7.5, swapAfter: 5, preRound: 3, intermission: 4 }, // [COD SnD e_13: plant 5s + defuse 7.5s IGN AW verbatim; bomb 45s BO6 (AW 40s conflict logged); round 90s + swap after 5 + first to 6]
    gg: { players: 12, time: 600 }, // [CS Gun Game / Arms Race e_14: kill->advance, final-weapon kill wins]
    // --- v1.55 T89 Lost-Ledger re-lands (L1/L2/L3) — mode trio destroyed with v1.47-50 ---
    gf: { players: 4, time: 0, roundTime: 40, roundLimit: 6, swapAfter: 3, preRound: 3, intermission: 4 }, // [COD Gunfight e_15: 2v2, 40s rounds, random shared kit per round, first to 6, swap at 3 — structure mirrors snd 78-verbatim round law]
    inf: { players: 12, time: 180, first: 15, alive0: 1, speedMult: 1.15, infectRespawn: 2.0 }, // [COD Infected e_16: 3:00 survive clock ("Inf boots at the 3:00 law" — surviving fragment), 15s Patient-Zero countdown (inf.first — snapshot truth md:inf inf:{started:false,first:15,alive0:1}), 1 initial infected, infected speed via bots speedMult (documented adaptation, physics untouched)] · infectRespawn 2.0 = [v1.50 port T90] §57 infected respawn delay (s) — v1.50 field, not yet consumed (modes.js L2 wave may adopt)
    ctl: { players: 12, time: 0, roundTime: 300, roundLimit: 2, lives: 12, captureTime: 45, captureBonus: 60, preRound: 5, intermission: 6, extraCapper: 0.65, capRadius: 3.6, // [MWIII Control — research 78-a numerics (L15 re-run pending full 18): two zones A/B (SND_SITES reuse), attackers(=team0) capture ALL to win, defenders win via respawns/attrition, 12 lives per player, +60s per capture (ctlBonus law; s.extraUsed per-round reset), swap-every-round, pre-phase timer pause (clock-exclusion law), solo capture 45s (mid of researched 45-60s band, OUR-CONSTANT-within-range documented), extraCapper = DOM verbatim]
      // [v1.50 port T90] §61.1 OFFICIAL numerics (v1.49 Task 78-a, research/t78_ctl_SUMMARY.md quoted verbatim)
      // carried byte-for-byte for the modes.js L15 full-18 adoption — NOT consumed by the current
      // snapshot-truth re-land (fields above are the wired set). Semantics: extraOnCapture == the
      // captureBonus 60s law; zoneRadius is the v1.50 OUR-CONSTANT 5.0 (re-land shipped capRadius 3.6);
      // firstTo/maxRounds/swapEveryRound/pauseOnCapture/segsPerZone/maxCaptureRate = P13/P14/P4/P5/P6 laws.
      firstTo: 3, maxRounds: 5, swapEveryRound: true, extraOnCapture: 60, pauseOnCapture: true, segsPerZone: 3, maxCaptureRate: 4, zoneRadius: 5.0 },
  },
  // GF kit pool (L1): shared 2-weapon kit per round, deterministic pick — surviving live-wire fragment: "gfkit sabre+vanguard". Pairs are provenance-tagged WEAPONS ids.
  GF_KITS: [ ['sabre', 'p9'], ['vanguard', 'sting'], ['raider', 'hornet'], ['ripper', 'wasp'], ['mauler', 'judge'] ], // 5 kits — seeded round pick, both teammates share the kit [Gunfight law]
  ASSIST: { // L12 touch magnetism (v1.55 re-land): CoD Mobile aim-magnetism cone — same cone shape as GAMEPAD.assist, touch-tuned
    magAngle: 5.0, magDist: 55, magFactor: 0.35, // degrees / meters / slowdown factor (OUR-CONSTANT touch band, pad 4.2/65/0.55 precedent)
    haptics: true, // L12 touch haptics master toggle (settings.touchHaptics overrides at runtime)
    hapticPatterns: { fire: [8, 12], hit: [16, 24], kill: [24, 40] }, // [weak, strong] ms pairs — navigator.vibrate
  },
  BOT_TIERS: [ // name, reaction ms, aim error deg, err decay, burst, strafe, hear radius
    { name: 'RECRUIT', react: 0.70, err: 6.5, errDecay: 0.9, burst: 3, strafe: 0.35, hear: 18, dmgMult: 0.8 },
    { name: 'REGULAR', react: 0.48, err: 4.2, errDecay: 1.4, burst: 4, strafe: 0.6, hear: 24, dmgMult: 0.95 },
    { name: 'VETERAN', react: 0.30, err: 2.4, errDecay: 2.2, burst: 6, strafe: 0.8, hear: 30, dmgMult: 1.05 },
    { name: 'ELITE', react: 0.17, err: 1.2, errDecay: 3.2, burst: 8, strafe: 1.0, hear: 38, dmgMult: 1.15 },
  ],
  BOT_NAMES: ['VIPER','HAVOC','MIRAGE','RAZOR','TALON','GHOST','BLITZ','NOVA','SABLE','ORION','KESTREL','DIESEL','ONYX','PIKE','VOLT','CINDER','GRIM','LYNX','FURY','SPECTRE'],
  MAP: {
    size: 120, halfW: 60, halfD: 44,
    jumpPadLaunch: 13.5,           // vertical slice of [Titanfall] movement fantasy
    pickups: { healthAmt: 50, ammoMagMult: 1, respawn: 20 }, // [T129 item2] ammoMagMult 2→1 — "real ammo limits": one mag per crate (capped at def.reserve, main.js:1171), the CS2/CoD scarcity read; at 2 the world showered 2 free mags per 20 s and limits never mattered. Def mags/reserves are already AAA-class (30/120 AR, 32/160 SMG, 60/180 LMG, 5/25 bolt, 100/200 belt — audited T129, see PARAMETERS.md §ammo)
  },
  QUALITY: [
    { name: 'LOW', pr: 0.66, shadow: 0, bloom: false, particles: 0.4, decals: 32 },
    { name: 'MEDIUM', pr: 0.85, shadow: 1024, bloom: true, particles: 0.7, decals: 64 },
    { name: 'HIGH', pr: 1.0, shadow: 2048, bloom: true, particles: 1.0, decals: 128 },
    { name: 'ULTRA', pr: 2.0, shadow: 4096, bloom: true, particles: 1.4, decals: 128 },
  ],
  PAY: { // [T134] the real-money checkout leg (payments.js) — PSP-agnostic, zero-backend, the native-face law (no provider insignias in the game UI)
    enabled: false, // flips TRUE when per-pack hosted-checkout URLs land below — false keeps the SANDBOX legs (honestly tagged in the shop face)
    checkout: { p1: '', p2: '', p3: '', p4: '', p5: '' }, // per-pack HOSTED checkout URLs — paste YOUR links: PayPal payment links (PayPal+Venmo+Apple Pay+cards, ~3.49%+$0.49 US) or Lemon Squeezy product pages (PayPal+Apple Pay(Safari)+cards, 5%+$0.50, MoR global tax). Hosted pages only — never a raw card form (the PCI law)
    lsRedeem: false, // the Lemon Squeezy license-key redeem engine (payments.js redeemLS) — the zero-backend verifier; needs LS products with license keys enabled
    lsProductMap: [ // LS product/variant name → pack id (name-contains match, case-insensitive) — the redeem mapping is CONFIG, never guessed
      // { contains: '500 TK', pack: 'p1' },
    ],
  },
  COLORS: {
    sky: 0x1a2433, fog: 0x141c28, sun: 0xffc38a, hemiSky: 0x35435c, hemiGround: 0x1c1a18,
    concrete: 0x8a8f98, dark: 0x3a3f46, accentA: 0xff5a3c, accentB: 0x29d3ff, crate: 0x6d5b3f, metal: 0x5c6672,
    allyHex: '#3fa7ff', enemyHex: '#ff5252',
  },
};

// ============================================================
// §53.2 ECONOMY LAW (Task 74, P2 pass) — single truth point, pure exports.
// Earn: CR is earned FREE by playing (Krunker structure [p2_eco_a/j_06]) — no
// real-money leg anywhere (honest residual, GAP_LEDGER T2-5).
// ============================================================
export const ECO_EARN = { base: 15, kill: 2, win: 10 }; // OUR-CONSTANT (documented, no corpus law)
export const ECO_CLAIM = { cr: 50, lvl: 5, minMatches: 1, hours: 12 }; // VERBATIM [p2_eco_b]: KR free-claim gates
export const ECO_RARITY = [ { r: 'common', w: 60 }, { r: 'rare', w: 25 }, { r: 'epic', w: 12 }, { r: 'legendary', w: 3 } ]; // weights sum 100
export const ECO_PRICE = { common: 150, rare: 400, epic: 900, legendary: 2000 };
export const ECO_CASE_COST = 100;
export const ECO_DUPE_REFUND = 40; // dupe from a case refunds flat CR
export const ECO_CAPS = { tradePerSide: 5, listings: 10, pendingTrades: 10 }; // tradePerSide ≤5 VERBATIM [j_06]
export const ECO_STAT_KEY = { matches: 'm', wins: 'w', kills: 'k', bestStreak: 'bs' }; // server-verifiable career fields (bs = §53.2 bestStreak)
export const crDelta = (kills, win) => ECO_EARN.base + (kills | 0) * ECO_EARN.kill + (win ? ECO_EARN.win : 0); // integer coercion via |0 — fractional kills coerce down
export function statOwns(req, rec) { // ownership = stat ∪ inventory (server-verifiable stats only)
  if (!req) return true;
  const field = ECO_STAT_KEY[req.k];
  if (!field) return false; // an unverifiable key is NOT ownable by stat
  return ((rec || {})[field] || 0) >= req.n;
}
export function casePick(table, rnd) { // weighted band pick — bands: common <60, rare <85, epic <97, legendary ≤100
  let acc = 0;
  for (const row of table) { acc += row.w; if (rnd * 100 < acc) return row.r; }
  return table[table.length - 1].r;
}

// §53.3 CLAN LAW — bounds VERBATIM [p2_soc_c] (Voxiom), joinLvl VERBATIM [p2_soc_d]
// (Krunker lvl-10 gate). Charset: bounds-only per evidence (spaces admitted — live-probe
// S3b fix; Voxiom evidence records bounds, not charset).
// [T127 G-7] war: the competition half joins the single truth — win 3 / draw 1 / loss 0,
// accrued SERVER-side only on ranked-eligible public matches (the T46 ranked predicate IS the
// anti-farm gate: !priv + RANKED_MODES + RANKED_MIN_PLAYERS). The ladder reads the same rows.
export const CLAN = { nameMin: 3, nameMax: 18, tagMin: 2, tagMax: 4, joinLvl: 10, createCost: 500, war: { win: 3, draw: 1 } };

// §53.4 QUEUE LAW — SBMM = bucket by the PUBLIC RP tier (§30.8 RP≠MMR stands);
// casual (quickplay) = open matching. Widen with wait time [p2_mmr_a].
export const Q_WIDEN = [15, 30]; // seconds waiting before each widen step
export const widenTiers = (waitS) => (waitS >= Q_WIDEN[1] ? 2 : waitS >= Q_WIDEN[0] ? 1 : 0);

// ============================================================
// §52.3 S6 COLORVISION PALETTES (Task 73, P1 pass) — default values are the
// SHIPPED constants verbatim (zero-regression law); the three colorblind
// ramps are authored (accessibility row, PARITY_DIFF #21).
// ============================================================
export const PALETTES = {
  default: { allyHex: '#3fa7ff', enemyHex: '#ff5252', accentA: 0xff5a3c, accentB: 0x29d3ff },
  deutan:  { allyHex: '#3d9bff', enemyHex: '#ffb84d', accentA: 0xffa23c, accentB: 0x3dd6ff },
  protan:  { allyHex: '#4db8ff', enemyHex: '#ffc46b', accentA: 0xffb03c, accentB: 0x35d9ff },
  tritan:  { allyHex: '#39c4ff', enemyHex: '#ff6e6e', accentA: 0xff5ad0, accentB: 0x2ef2e0 },
};
export function applyColorVision(name) { // mutates CFG.COLORS in place — unknown → default
  const p = PALETTES[name] || PALETTES.default;
  CFG.COLORS.allyHex = p.allyHex; CFG.COLORS.enemyHex = p.enemyHex;
  CFG.COLORS.accentA = p.accentA; CFG.COLORS.accentB = p.accentB;
}

// ============================================================
// §54.6 U7 DESTRUCTIBLES (spec §54, RESEARCH_PASS_L) — stage-swap AABB
// props; server mirrors STAGE_FRAC verbatim (index.ts NADE_GRAV precedent
// for mirrored constants). STAGE_FRAC: hp/maxHp at or below → stage 1
// (damaged tint); stage 2 (destroyed) at hp<=0.
// ============================================================
export const DESTRUCT = {
  STAGE_FRAC: 0.5,   // damaged-stage threshold (hp/maxHp)
  DEBRIS_N: 12,      // destroy debris burst count (quality-gated)
  DEBRIS_SPD: 5.2,   // destroy debris ejection speed
  CRUMBLE_MAX_D: 46, // crumble SFX distance gate (Web Audio listener)
};

// ============================================================
// §52.5 S5 DAILY CHALLENGE (Task 73, P1 pass) — deterministic day-pick over
// end-measurable metrics only (no corpus evidence for live-ops cadence —
// PARITY_DIFF #24 residual logged; bot-fill NOT built).
// ============================================================
export const DAILY_CHALLENGES = [
  { id: 'd_kills5',   label: 'Eliminate 5 combatants',        metric: 'kills',    n: 5 },
  { id: 'd_kills12',  label: 'Eliminate 12 combatants',       metric: 'kills',    n: 12 },
  { id: 'd_win1',     label: 'Win 1 match',                   metric: 'wins',     n: 1 },
  { id: 'd_acc40',    label: 'Finish a match at 40% accuracy', metric: 'acc40',   n: 1 },
  { id: 'd_score2k',  label: 'Score 2000 points in one match', metric: 'score',   n: 2000 },
  { id: 'd_caps2',    label: 'Capture 2 domination flags',    metric: 'caps',     n: 2 },
  { id: 'd_conf3',    label: 'Confirm 3 tags',                metric: 'confirms', n: 3 },
  { id: 'd_score5k',  label: 'Score 5000 points in one match', metric: 'score',   n: 5000 },
];
export function dailyFor(dateStr) { // deterministic: same day = same pick (hash lands in-table)
  let h = 0;
  const s = String(dateStr);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return DAILY_CHALLENGES[h % DAILY_CHALLENGES.length];
}


// T2-7 (Task 43, spec §27.1): region registry — the HONEST fleet. This deployment runs
// ONE room service (:3010 behind the Caddy gateway); no fabricated geo-rows. Consumers:
// mp.js resolveRegion (join-time URL) + ui.js ONLINE tab (seg labels). Any deployment
// edits THIS table only — ids are settings.mpRegion values, endpoint semantics:
//   null    → legacy derivation (CFG.MP.server + existing one-shot :3010 fallback)
//   'direct'→ http://<host>:3010 built at resolve time (gateway skipped)
//   'custom'→ settings.mpRegionUrl (http/https-validated at resolve; invalid → auto + warn)
//   'http(s)://…' → [T114] the row's OWN absolute endpoint, dialed as-is (a hosted hub
//     Space: the static game page cannot host the room service — every same-origin dial
//     died at the mount, the user's live report — so the fleet names the hub URL
//     directly; dialTarget passes it straight to io() with the service's root path).
//     The HF row is PRO-GATED (HF 2026 policy: Docker/Gradio Spaces need a PRO sub —
//     create_repo 402s on free; live-caught T114) — the row activates the moment that
//     Space exists: scripts/hf_deploy_hub_t114.py creates+fills it in one command.
//     FREE hosting (no PRO): docs/HUB_HOSTING.md — the same container on Render/Koyeb
//     free tiers or your own box; paste the URL into CUSTOM (no code edit needed).
export const MP_REGIONS = [
  { id: 'hub',    label: 'HF HUB (PRO)',   endpoint: 'https://ideations3-ao-is-hub.hf.space' }, // [T114] activates when the PRO Space exists (the join-fail chip auto-switches here — the user's auto-resolve ask)
  { id: 'auto',   label: 'AUTO (SAME-ORIGIN)', endpoint: null },
  { id: 'direct', label: 'DIRECT :3010',   endpoint: 'direct' },
  { id: 'custom', label: 'CUSTOM',         endpoint: 'custom' },
];

// ---------------- T1-1 MODE CONSTANTS (SS22 — module exports) ----------------
// Gun Game ladder — GG v2 (Task 40): full 14-weapon armory, worst→best arc
// (machine pistol → pistol → PDW → SMG → carbine → AR → BR → LMGs → shotguns → DMRs → bolt),
// closes the Task-37-a logged residual ("GG v2 ladder featuring the full 14-weapon armory").
// Consumers are length-dynamic: modes.js LN=GG_LADDER.length announce/tiers, server
// GG_TOTAL=(GGLAD||len)+1, melee tier = LN+1, win = kill AT melee tier. GGLAD probe env
// still overrides length server-side (SS22.4 pattern).
export const GG_LADDER = ['sting', 'p9', 'hornet', 'wasp', 'raider', 'vanguard', 'sabre', 'ripper', 'vulture', 'mauler', 'judge', 'breacher', 'longbow', 'longshot'];
// Hardpoint hills reuse the DOM flag sites A/B/C (world.js:251) — rotation order A->B->C (SS22.1)
export const HP_HILLS = [ { id: 'A', x: -40, z: 0 }, { id: 'B', x: 0, z: 0 }, { id: 'C', x: 40, z: 0 } ];
// SnD bomb sites A/B reuse flag sites A/C (SS22.3)
export const SND_SITES = [ { id: 'A', x: -40, z: 0 }, { id: 'B', x: 40, z: 0 } ];
export const SND_BOMB = { dmg: 250, radius: 12 }; // SPEC DECISION (sources silent on lethal radius) — SS22.3

// ---------------- T2-2 CAREER LAW (§28.2 — single truth point, browser AND bun import this) ----------------
// XP awards computed ONLY from the match-end board (k/de/s) + winner field, server-side (§28.2).
// perScore converts objective score points (dom captures / hp holds / kc confirms — board `s`)
// uniformly. Spectators earn NOTHING (§25 read-only cannot farm). SPEC DECISION logged §28.2.
export const XP_AWARD = { kill: 100, win: 500, draw: 250, loss: 100, perScore: 1 };
// Cumulative XP required to REACH level L (L2=1,000 · L3=2,500 · L4=4,500 · L5=7,000).
// SPEC DECISION (§28.2): superlinear — early levels feel earned, late levels reachable.
// lvlFromXp is the exact inverse scan (levels are small ints; no closed form needed).
export const xpForLevel = (L) => 750 * (L - 1) + 250 * (L - 1) * (L - 1);
export const lvlFromXp = (xp) => {
  let lvl = 1;
  while (xpForLevel(lvl + 1) <= xp) lvl++;
  return lvl;
};

// ---------------- G-9 PRESTIGE LAW (v1.90 — single truth point, browser AND bun import this) ----------------
// The CoD/CODM norm: a DEFINED max level, then the reset loop. PRODUCT CALL on the curve
// (the G-9 ledger line): MAX_LVL = 50 caps the §28.2 curve — xpForLevel(50) = 637,000
// cumulative XP (CoD-classic-55-adjacent; a season-scale grind that stays "reachable" per
// the §28.2 decision). MODERN-CoD RULES: prestige resets level+XP to 1 and KEEPS everything
// modern — CR, inventory, BP (season-keyed, untouched), clans, stats, RP — the loop's teeth
// are the level-gated faces re-locking (the lvl-5 eco claim, the lvl-10 clan join). The
// reward is the prestige marker (rec.pr, lifetime count) + a CR grant anchored to the
// rank-reward ladder (the Diamond tier = 1000, under the 2000 legendary ceiling — never
// inflationary).
export const MAX_LVL = 50;
export const PRESTIGE = { cr: 1000 };

// ---------------- T2-3 RANKED LAW (§30.2-30.4 — single truth point, browser AND bun import this) ----------------
// Ranked = a SERVER-DESIGNATED match class (§30): public room + ranked-eligible mode + live opponent.
// RP is the genre's public ladder currency [e_01], NOT hidden MMR — delta is result + kills (§30.8).
export const RANKED_MODES = ['tdm', 'dom', 'hp', 'kc', 'snd']; // §30.1 team-objective core; ffa/gg/practice OUT (SPEC DECISION §30.1)
export const RANKED_MIN_PLAYERS = 2; // §30.1: no RP vs nobody (anonymous players COUNT toward the minimum, earn nothing — §28.1)
export const RP_AWARD = { win: 25, draw: 10, loss: -20, kill: 2 }; // §30.2 SPEC DECISION: result-driven ladder, loss still bleeds
export const rpDelta = (result, kills) => RP_AWARD[result] + kills * RP_AWARD.kill; // §30.2 pure; result = §28.2 per-player res (computed once, shared with XP)
export const RP_TIERS = [ { n: 'BRONZE', min: 0 }, { n: 'SILVER', min: 600 }, { n: 'GOLD', min: 1400 }, { n: 'PLATINUM', min: 2400 }, { n: 'DIAMOND', min: 3600 }, { n: 'CHAMPION', min: 5000 } ]; // §30.3 SPEC DECISION: 6 tiers, ~30-40 wins between tiers at 50% wr
export const tierOf = (rp) => { let t = RP_TIERS[0]; for (const x of RP_TIERS) if (rp >= x.min) t = x; return t.n; }; // §30.3 top-down scan
export const SEASON = { epoch: 1788048000000, weeks: 6 }; // §30.4: 2026-08-30T00:00:00Z, 6 weeks — season 1 ends 2026-10-11T00:00:00Z
export const SEASON_MS = SEASON.weeks * 604800000;
export const seasonOf = (now) => { const id = Math.floor((now - SEASON.epoch) / SEASON_MS) + 1; return { id, endsAt: SEASON.epoch + id * SEASON_MS }; }; // §30.4 pure (now-arg injected)
export const softReset = (rp) => Math.floor(rp / 2); // §30.4 SPEC DECISION: Krunker-style partial carry (hard reset punishes mid-ladder joiners, full carry makes seasons meaningless)

// ---- §55.2 RANKED SEASON REWARDS (v1.55 T89 L6 re-land — destroyed with v1.47) ----
// Season-rollover credit: highest tier REACHED (peak rp) pays CR once, credited by the
// server at the lazy rollover site BEFORE softReset (index.ts ranked award law).
export const RANK_REWARDS = { BRONZE: 100, SILVER: 250, GOLD: 500, PLATINUM: 750, DIAMOND: 1000, CHAMPION: 1500 }; // CR per peak tier at rollover (OUR-CONSTANT table, ECO_PRICE-anchored: legendary = 2000 ceiling)

// ---- §55.3 ISO-WEEK SEASON LAW (v1.55 T89 L6 re-land) ----
// The destroyed v1.47 fix, verbatim: 2027-01-01 belongs to ISO week 2026-W53 (ISO 8601
// week-1 = the week with the year's first Thursday; 2027-01-01 is a Friday → week 53 of
// 2026). year-attribution follows the week, not the calendar year — the original build
// AND its probe expectation both got this wrong; three fixes were required. Pure.
export function isoWeekOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // ISO: Monday=0..Sunday=6
  d.setUTCDate(d.getUTCDate() - day + 3); // this week's Thursday
  const isoYear = d.getUTCFullYear();
  const thu = d.getTime();
  d.setUTCMonth(0, 1); // Jan 1 of the (possibly shifted) year
  if (d.getUTCDay() !== 4) { // snap Jan1 to its week's Thursday
    d.setUTCDate(d.getUTCDate() + ((4 - d.getUTCDay()) + 7) % 7);
  }
  const week = 1 + Math.round((thu - d.getTime()) / 604800000);
  return { year: isoYear, week, id: isoYear + '-W' + String(week).padStart(2, '0') };
}
export const isoWeekMonday = (dateStr) => { // deterministic week key anchor (metagame weekly law mirrors this shape)
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
};

// ---- §62.5b BP XP LAW (v1.54, Task 87 — rewind-lost v1.49 scope re-declared) ----
// SPEC DECISION: battle pass = deterministic tier ladder over the SAME XP single truth
// (server mpProfile.xp / careerAward d.total). Zero new state, zero fabrication: offline
// (no server identity) the BP mirrors stay HIDDEN — same corner law as the ranked view
// (T46 §30.6). Season epochs (per-season reset via seasonOf) join at the server-reset
// increment — career-total pass is the honest v1 (logged residual).
export const BP = { tiers: 50, per: 1000 }; // [T96 v1.62] the §60.4 chaptered re-land: 30→50 — 10 chapters × 5 tiers (the GEOMETRY NOTE integrator call) — 50 tiers × 1,000 XP, ~8 matches/tier at avg 125 match XP
export const BP_AWARD = { match: 125, win: 50 }; // T89 L6 companion: BP XP per match end — the §62.5b comment anchors 125/match; win bonus OUR-CONSTANT (~6 matches/tier on wins)
export const bpOf = (xp) => { // §62.5b pure; xp = lifetime server XP (number)
  const t = Math.min(BP.tiers, Math.floor(Math.max(0, xp) / BP.per) + 1);
  const into = Math.max(0, xp) - (t - 1) * BP.per;
  return { tier: t, into: Math.min(into, BP.per), need: BP.per - Math.min(into, BP.per), pct: Math.min(100, Math.round((Math.min(into, BP.per) / BP.per) * 100)) };
};

// ---------------- WEAPONS ----------------
// dmg falloff: linear from near→far to min mult.  [COD class structure; AK pattern shape from dmarket/leetify]
// pattern: fn(i) → [pitchKick rad, yawKick rad] per shot index (spray pattern)
const patternAR = (i) => {
  if (i < 5) return [0.0072, (i % 2 ? 0.0004 : -0.0003)];           // 5 stable [AK docs]
  if (i < 11) return [0.0062, Math.sin(i * 1.7) * 0.0016];          // climb + drift start
  return [0.0034, Math.sin(i * 0.9) * 0.0034];                      // L/R horizontal [AK 10-11 drift]
};
const patternSMG = (i) => [0.0042 + Math.min(i, 14) * 0.00042, Math.sin(i * 1.15) * 0.0021];
const patternLMG = (i) => [0.0056 + Math.min(i, 10) * 0.0003, Math.sin(i * 0.8) * 0.0026];
const patternPISTOL = (i) => [0.0105, (i % 2 ? 0.0011 : -0.0011)];
const patternPUMP = () => [0.019, 0.0008];

export const WEAPONS = [
  {
    id: 'vanguard', name: 'VANGUARD', cls: 'ASSAULT RIFLE', slot: 1,
    rpm: 780, auto: true, dmg: 26, hs: 1.5, mag: 30, reserve: 120,
    ads: 0.25, sprintOut: 0.22, swap: 0.45,
    reloadT: 1.9, reloadE: 2.4, emptyChamber: 0.45,
    spreadBase: 0.0016, spreadMove: 0.011, spreadJump: 0.045, bloom: 0.0011, bloomMax: 0.006,
    recoilRec: 7.5, falloff: [24, 48, 0.72], pattern: patternAR, tracer: '#ffd28a',
    pellets: 1, zoom: 1.28, scope: false, sound: 'ar',
    stats: { damage: 62, rate: 72, range: 68, accuracy: 60, mobility: 62 },
  },
  {
    id: 'wasp', name: 'WASP', cls: 'SMG', slot: 2,
    rpm: 950, auto: true, dmg: 19, hs: 1.5, mag: 32, reserve: 160,
    ads: 0.18, sprintOut: 0.18, swap: 0.38,
    reloadT: 1.7, reloadE: 2.2, emptyChamber: 0.4,
    spreadBase: 0.0026, spreadMove: 0.008, spreadJump: 0.038, bloom: 0.0013, bloomMax: 0.007,
    recoilRec: 8.5, falloff: [12, 26, 0.6], pattern: patternSMG, tracer: '#ffd28a',
    pellets: 1, zoom: 1.2, scope: false, sound: 'smg',
    stats: { damage: 44, rate: 88, range: 38, accuracy: 48, mobility: 82 },
  },
  {
    id: 'mauler', name: 'MAULER', cls: 'PUMP SHOTGUN', slot: 1, modeLabel: 'PUMP',
    rpm: 68, auto: false, dmg: 12, hs: 1.25, mag: 6, reserve: 24, pellets: 8,
    ads: 0.22, sprintOut: 0.24, swap: 0.55,
    reloadT: 1.1, reloadE: 1.1, shellLoad: true, emptyChamber: 0,
    spreadBase: 0.011, spreadMove: 0.014, spreadJump: 0.05, bloom: 0.0, bloomMax: 0,
    recoilRec: 6, falloff: [8, 18, 0.35], pattern: patternPUMP, tracer: '#ffc27a',
    pellets: 8, zoom: 1.12, scope: false, sound: 'shotgun',
    stats: { damage: 96, rate: 18, range: 16, accuracy: 30, mobility: 58 },
  },
  {
    id: 'longshot', name: 'LONGSHOT', cls: 'BOLT DMR', slot: 1,
    rpm: 43, auto: false, dmg: 105, hs: 2.0, mag: 5, reserve: 25,
    ads: 0.38, sprintOut: 0.3, swap: 0.6,
    reloadT: 2.6, reloadE: 3.1, emptyChamber: 0.5,
    spreadBase: 0.05, spreadMove: 0.09, spreadJump: 0.14, bloom: 0, bloomMax: 0, adsSpread: 0.00012,
    recoilRec: 5, falloff: [999, 999, 1], pattern: patternPUMP, tracer: '#cfe9ff',
    pellets: 1, zoom: 4.2, scope: true, scopeZoom2: 8.0, sound: 'sniper',
    stats: { damage: 100, rate: 12, range: 100, accuracy: 96, mobility: 40 },
  },
  {
    id: 'ripper', name: 'RIPPER', cls: 'LMG', slot: 1,
    rpm: 700, auto: true, dmg: 24, hs: 1.5, mag: 60, reserve: 180,
    ads: 0.40, sprintOut: 0.3, swap: 0.62,
    reloadT: 3.2, reloadE: 3.9, emptyChamber: 0.5,
    spreadBase: 0.003, spreadMove: 0.016, spreadJump: 0.05, bloom: 0.0009, bloomMax: 0.005,
    recoilRec: 6.5, falloff: [30, 60, 0.75], pattern: patternLMG, tracer: '#ffd28a',
    pellets: 1, zoom: 1.25, scope: false, sound: 'lmg',
    stats: { damage: 58, rate: 66, range: 74, accuracy: 55, mobility: 36 },
  },
  {
    id: 'p9', name: 'P9 SIDEARM', cls: 'PISTOL', slot: 3,
    rpm: 420, auto: false, dmg: 24, hs: 2.0, mag: 12, reserve: 72,
    ads: 0.17, sprintOut: 0.15, swap: 0.3,
    reloadT: 1.5, reloadE: 1.9, emptyChamber: 0.35,
    spreadBase: 0.0022, spreadMove: 0.01, spreadJump: 0.05, bloom: 0.0016, bloomMax: 0.007,
    recoilRec: 9, falloff: [15, 32, 0.65], pattern: patternPISTOL, tracer: '#ffd28a',
    pellets: 1, zoom: 1.18, scope: false, sound: 'pistol',
    stats: { damage: 46, rate: 44, range: 40, accuracy: 62, mobility: 88 },
  },
  // --- T1-5 weapon expansion (Task 37-a): 8 additions, 6 -> 14 total. TTK sheets +
  // provenance: docs/PARAMETERS.md section "T1-5 weapon expansion". Schema identical to the
  // six originals; vmLen/vmMagH/vmNoStock are NEW data-driven viewmodel fields consumed by
  // weapons.js buildViewModel (additive + guarded — undefined keeps the legacy id-based sizes).
  {
    id: 'sabre', name: 'SABRE', cls: 'BATTLE RIFLE', slot: 1,
    rpm: 740, auto: false, dmg: 34, hs: 1.6, mag: 20, reserve: 80,
    ads: 0.27, sprintOut: 0.22, swap: 0.45,
    reloadT: 2.0, reloadE: 2.5, emptyChamber: 0.45,
    spreadBase: 0.0018, spreadMove: 0.012, spreadJump: 0.045, bloom: 0.0012, bloomMax: 0.0065,
    recoilRec: 6.5, falloff: [30, 62, 0.72], pattern: patternAR, tracer: '#ffd28a',
    pellets: 1, zoom: 1.3, scope: false, sound: 'ar', vmLen: 0.66,
    stats: { damage: 78, rate: 40, range: 72, accuracy: 66, mobility: 58 },
  },
  {
    id: 'raider', name: 'RAIDER', cls: 'CARBINE', slot: 1,
    rpm: 750, auto: true, dmg: 26, hs: 1.5, mag: 30, reserve: 120,
    ads: 0.23, sprintOut: 0.2, swap: 0.42,
    reloadT: 1.8, reloadE: 2.3, emptyChamber: 0.4,
    spreadBase: 0.0018, spreadMove: 0.01, spreadJump: 0.04, bloom: 0.0011, bloomMax: 0.0055,
    recoilRec: 8, falloff: [18, 40, 0.6], pattern: patternAR, tracer: '#ffd28a',
    pellets: 1, zoom: 1.26, scope: false, sound: 'ar', vmLen: 0.54,
    stats: { damage: 60, rate: 74, range: 58, accuracy: 62, mobility: 70 },
  },
  {
    id: 'hornet', name: 'HORNET', cls: 'PDW SMG', slot: 1,
    rpm: 900, auto: true, dmg: 16, hs: 1.4, mag: 50, reserve: 150,
    ads: 0.19, sprintOut: 0.17, swap: 0.36,
    reloadT: 2.0, reloadE: 2.5, emptyChamber: 0.4,
    spreadBase: 0.003, spreadMove: 0.009, spreadJump: 0.036, bloom: 0.0012, bloomMax: 0.007,
    recoilRec: 9, falloff: [10, 22, 0.55], pattern: patternSMG, tracer: '#ffd28a',
    pellets: 1, zoom: 1.2, scope: false, sound: 'smg', vmLen: 0.48, vmMagH: 0.24,
    stats: { damage: 38, rate: 84, range: 30, accuracy: 46, mobility: 84 },
  },
  {
    id: 'breacher', name: 'BREACHER', cls: 'AUTO SHOTGUN', slot: 1,
    rpm: 300, auto: true, dmg: 13, hs: 1.25, mag: 12, reserve: 36, pellets: 8,
    ads: 0.24, sprintOut: 0.24, swap: 0.5,
    reloadT: 2.6, reloadE: 2.6, emptyChamber: 0,
    spreadBase: 0.012, spreadMove: 0.015, spreadJump: 0.05, bloom: 0.0, bloomMax: 0,
    recoilRec: 5.5, falloff: [5, 13, 0.3], pattern: patternPUMP, tracer: '#ffc27a',
    pellets: 8, zoom: 1.12, scope: false, sound: 'shotgun', vmLen: 0.7, vmMagH: 0.16,
    stats: { damage: 92, rate: 46, range: 12, accuracy: 30, mobility: 60 },
  },
  {
    id: 'longbow', name: 'LONGBOW', cls: 'DMR', slot: 1,
    rpm: 240, auto: false, dmg: 68, hs: 1.75, mag: 10, reserve: 50,
    ads: 0.32, sprintOut: 0.28, swap: 0.55,
    reloadT: 2.4, reloadE: 2.9, emptyChamber: 0.45,
    spreadBase: 0.045, spreadMove: 0.08, spreadJump: 0.13, bloom: 0, bloomMax: 0, adsSpread: 0.00018,
    recoilRec: 5.5, falloff: [60, 110, 0.8], pattern: patternPUMP, tracer: '#cfe9ff',
    pellets: 1, zoom: 2.8, scope: true, scopeZoom2: 4.6, sound: 'sniper', vmLen: 0.92, vmMagH: 0.14,
    stats: { damage: 84, rate: 26, range: 92, accuracy: 90, mobility: 48 },
  },
  {
    id: 'vulture', name: 'VULTURE', cls: 'BELT LMG', slot: 1,
    rpm: 650, auto: true, dmg: 22, hs: 1.4, mag: 100, reserve: 200,
    ads: 0.42, sprintOut: 0.3, swap: 0.65,
    reloadT: 4.4, reloadE: 5.2, emptyChamber: 0.6,
    spreadBase: 0.0032, spreadMove: 0.017, spreadJump: 0.05, bloom: 0.0008, bloomMax: 0.0045,
    recoilRec: 6, falloff: [26, 55, 0.7], pattern: patternLMG, tracer: '#ffd28a',
    pellets: 1, zoom: 1.25, scope: false, sound: 'lmg', vmLen: 0.72, vmMagH: 0.34,
    stats: { damage: 55, rate: 62, range: 70, accuracy: 50, mobility: 30 },
  },
  {
    id: 'sting', name: 'STING', cls: 'MACHINE PISTOL', slot: 3,
    rpm: 950, auto: true, dmg: 14, hs: 1.5, mag: 18, reserve: 90,
    ads: 0.16, sprintOut: 0.14, swap: 0.28,
    reloadT: 1.6, reloadE: 2.0, emptyChamber: 0.35,
    spreadBase: 0.0032, spreadMove: 0.011, spreadJump: 0.05, bloom: 0.0019, bloomMax: 0.009,
    recoilRec: 9.5, falloff: [10, 24, 0.55], pattern: patternPISTOL, tracer: '#ffd28a',
    pellets: 1, zoom: 1.16, scope: false, sound: 'pistol', vmLen: 0.3, vmNoStock: true,
    stats: { damage: 34, rate: 86, range: 26, accuracy: 44, mobility: 90 },
  },
  {
    id: 'judge', name: 'JUDGE', cls: 'DOUBLE-BARREL', slot: 1, modeLabel: 'DBL',
    rpm: 150, auto: false, dmg: 14, hs: 1.25, mag: 2, reserve: 24, pellets: 9,
    ads: 0.2, sprintOut: 0.22, swap: 0.5,
    reloadT: 0.95, reloadE: 0.95, shellLoad: true, emptyChamber: 0,
    spreadBase: 0.013, spreadMove: 0.016, spreadJump: 0.055, bloom: 0.0, bloomMax: 0,
    recoilRec: 5, falloff: [4, 10, 0.25], pattern: patternPUMP, tracer: '#ffc27a',
    pellets: 9, zoom: 1.1, scope: false, sound: 'shotgun', vmLen: 0.44, vmNoStock: true,
    stats: { damage: 98, rate: 24, range: 10, accuracy: 26, mobility: 62 },
  },
];
export const MELEE = { dmg: 55, backstab: 150, range: 2.2, swing: 0.45, swap: 0.25 }; // [CS2 knife class]
export const FRAG = { fuse: 3.5, radius: 4.5, dmg: 130, throwVel: 16, upVel: 4.5, bounce: 0.42, cookable: true };
// [T138] THE KNOCK LAW — the ragdoll kill impulse is DAMAGE-SCALED (the T133 flat 2.1 was the
// honest first take; now a pistol shove reads lighter than a bolt hit): 1.5 floor + dmg/60,
// capped 3.0. Band: 19-dmg SMG ≈ 1.82 · 26 AR ≈ 1.93 · 55 melee ≈ 2.42 · 105 bolt / 130 frag = 3.0.
// SINGLE TRUTH: main.js (local deaths), bots.js (bot deaths) and mp.js (remote corpses, via the
// kill event's weapon id) all call THIS — one formula, three call sites, zero drift.
export const knockFor = (dmg) => 1.5 + Math.min(1.5, (dmg || 24) / 60);
export const FLASH = { full: 1.6, fade: 1.4, radius: 9, deafen: 3.0, lowpassTo: 800 }; // [CS2 class]
export const ABILITIES = [
  { id: 'dash', name: 'DASH', desc: '6m instant burst · 2 charges · 8s cd', cd: 8, charges: 2 },
  { id: 'stim', name: 'STIM', desc: '+50 HP over 3s · +25% speed · 14s cd', cd: 14, heal: 50, healTime: 3, speedTime: 3, speedMult: 1.25 },
  { id: 'pulse', name: 'RECON PULSE', desc: 'reveal enemies 15m · 5s · 20s cd', cd: 20, radius: 15, dur: 5 },
  // [T108 N8] the 5 operator kits — every mechanic rides an EXISTING system (the N8 scope law):
  // aegis = the player.shield overshield law (modes.js streak idiom); resupply = the main.js
  // refillLoadout() hook verbatim; ghost = the bots.js spot law (b.spottedT reset gate) via
  // player.ghostT; surge = the followPath speedMult consumption (bots-only law); rally = the
  // stim healRate idiom extended to ally bots (b.hp). Bot-sim scope = the pulse precedent
  // (this.hooks.bots.bots) — MP remotes see the ability event; per-target effects stay
  // client-sim (logged honest, DEVLOG v1.72). charges omitted → the ab.charges||1 law.
  { id: 'aegis', name: 'AEGIS', desc: '+50 overshield · decays over 8s · 18s cd', cd: 18, shield: 50, shieldTime: 8 },
  { id: 'resupply', name: 'RESUPPLY', desc: 'full ammo + grenade restock · 25s cd', cd: 25 },
  { id: 'ghost', name: 'GHOST', desc: 'untrackable by enemies 5s · 22s cd', cd: 22, dur: 5 },
  { id: 'surge', name: 'SURGE', desc: 'slow enemies 12m 45% · 4s · 20s cd', cd: 20, radius: 12, slowTime: 4, slowMult: 0.55 },
  { id: 'rally', name: 'RALLY', desc: 'heal squad 12m +40 HP · 24s cd', cd: 24, radius: 12, heal: 40 },
];
export const ATTACHMENTS = {
  suppressor: { name: 'SUPPRESSOR', pros: 'no radar ping · quieter', cons: '−18% range', apply: w => { w.falloff = [w.falloff[0] * 0.82, w.falloff[1] * 0.82, w.falloff[2]]; w.suppressed = true; } }, // [MW Gunsmith]
  extmag: { name: 'EXTENDED MAG', pros: '+50% mag', cons: '+0.3s reload', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reserve = Math.round(w.reserve * 1.25); w.reloadT += 0.3; w.reloadE += 0.3; } },
  foregrip: { name: 'FOREGRIP', pros: '−15% recoil', cons: '+40ms ADS', apply: w => { w._recoilMult = 0.85; w.ads += 0.04; } },
};

// ---------------- T1-7 INPUT BINDINGS (Task 38) ----------------
// localStorage key shared by ui.js (settings owner) + input.js (bind consumer) — single source.
export const SETTINGS_LS_KEY = 'ironsight.settings.v1';
// Controller button map, action → W3C standard button index. Defaults reproduce the
// shipped gamepad.js mapping verbatim (EDGE table + held buttons + analog triggers).
// gamepad.js reads settings.padBinds per-frame and falls back to THIS table per action;
// keyboard/mouse defaults live in input.js BINDINGS (labels are a UI concern there).
export const PAD_BINDS = {
  fire: 7, aim: 6,               // RT / LT (analog triggers — actuation threshold semantics)
  jump: 0, crouch_toggle: 1, reload: 2, quickswap: 3, ability: 4, nade: 5,
  scoreboard: 8, pause: 9, sprint: 10, melee: 11,
  streak0: 12, ping: 13, streak2: 14, streak1: 15,
  camtoggle: 16,                 // [T122] (2) TPV/FPV toggle — BTN 16 (HOME/GUIDE); remappable in the Controls tab (the capture UI renders every PAD_BINDS key)
};

// ---------------- DEFAULT SETTINGS ----------------
export const DEFAULT_SETTINGS = {
  sens: 1.0, adsSens: 0.8, invertY: false, fov: 95,
  gpSens: 1.0, gpDeadzone: 0.15, gpAssist: true, gpVibration: true,
  gpLookDeadzone: 0.12, // T1-7 (Task 38): look-stick radial deadzone — default == legacy GAMEPAD.lookDeadzone (behavior identical)
  aimMode: 'hold',      // T1-8 (Task 38): 'hold' = today's RMB/E/LT hold-to-aim (default unchanged) | 'toggle'
  bob: true, tilt: true, autoSprint: false,
  camShake: true,      // T1-8 (Task 38, lead sweep): camera-shake toggle — default ON == legacy behavior
  hitMarker: true,     // T1-8 (Task 38, lead sweep): hit-marker visual toggle — default ON == legacy behavior
  quality: 2, viewmodel: true, damageNumbers: true, fpsCounter: false, nameTags: true,
  volMaster: 0.8, volSfx: 0.9, volMusic: 0.55,
  voiceOn: false, volVoice: 0.8, // [T140 G-4] the mic NEVER opens by default (the honest browser-mic law — an opt-in toggle in SETTINGS→AUDIO; volume is the per-speaker gain default)
  minimapRotate: true,
  mpRegion: 'auto',    // T2-7 (Task 43, §27): region id — 'auto' == pre-T43 behavior byte-identical (default-merge law covers old saves). [T114] the honest default: on a STATIC page the same-origin mount has no room service — the fail face then offers the chips (RETRY / USE HF HUB once that Space exists) and docs/HUB_HOSTING.md carries the free-host paths (CUSTOM takes any hub URL)
  mpRegionUrl: '',     // T2-7 (Task 43, §27): custom endpoint — http/https-validated at resolve time; invalid → auto + warn
  lang: 'en',          // T2-8 (Task 64, §48.4): UI locale id — 'en' == pre-T64 behavior byte-identical (default-merge law covers old saves); valid ids = i18n.js LANGS
  touchSens: 1.0,      // §62.4 M9 (v1.54): touch look sensitivity — 1.0 == pre-M9 behavior byte-identical (Input.touchSens default); slider lives in the controls TOUCH section
  touchStickDead: 0.0,   // §62.4 (v1.54): user override of CFG.TOUCH.stickDead — 0 == official default == legacy
  touchLookDead: 0.0,    // §62.4 (v1.54): user override of CFG.TOUCH.lookDead (px) — 0 == official default == legacy
  touchHybridDrag: 0,    // §62.4 (v1.54): user override of CFG.TOUCH.hybridDrag (px) — 0 == official default == legacy
  touchHaptics: true,    // T89 L12: touch haptic feedback (navigator.vibrate) — default ON == CFG.ASSIST.haptics master
  touchAdsSens: 0.8,     // [v1.50 port T90] §60 (v1.48) M3: touch ADS-stage look multiplier — lost with the touch layer; default-merge law covers old saves
  touchAssist: true,     // [v1.50 port T90] §60 M1: rotational aim assist (cone friction) master toggle
  touchAutoSprint: true, // [v1.50 port T90] §60 M2: CODM auto-sprint default for touch (push-stick-forward)
  fireAuto: false,       // [v1.50 port T90] §60 M7-lite: auto-fire while crosshair rests on target
  fpsCap: 0,             // [v1.50 port T90] §60 M14: frame-rate target — 0 = uncapped (30/60 supported)
  gyroAim: false,        // [T90 merge] M8a: gyro aim (CoD Mobile grammar) — default OFF (motion aim is opt-in; iOS motion permission is requested from the settings-toggle click gesture)
  gyroSens: 1.0,         // [T90 merge] M8a: gyro look multiplier — 1.0 == CFG.GYRO.sensBase (slider 0.2–3.0; live-apply clamp mirrors this band)
  aimCurve: 'classic',   // [T90 merge] M8b: touch look response curve — 'classic' (exponent CFG.AIM_CURVE.exp) | 'linear' (raw deltas). CLASSIC default per M8 order — deliberate touch-feel change, touch paths ONLY (desktop mouse raw)
  touchLayout: 'default', // [T90 merge] M8c: #touch-ui preset — 'default' | 'lefty' (mirrored) | 'compact' (~80% scale); applied as data-layout attr in applyInputSettings, CSS-only transforms
  hudVars: null,         // T89 L8: HUD-editor anchor offsets {anchorId: {dx, dy}} — null == default layout (restore law)
  mapSelect: 'any', // W4 §51.1: offline map pin — 'any' preserves the rotation cursor law; a pinned roster id is honored every match
  colorVision: 'default', // §52.3 S6: colorblind palette key (PALETTES; default = shipped constants verbatim)
  replayRec: true, // §49.2 (Task 65 W2, rebuilt): per-match MP replay recording ON by default (ONLINE-tab toggle); default-merge law covers old saves
  killcam: true, // G-2 (v1.79): COD-style watch-the-kill on the §26 capture — ON by default (ONLINE-tab toggle); default-merge law covers old saves; rides replayRec (no capture = no killcam, orbit cam continues)
  ch: { style: 'cross', color: '#66ff66', size: 6, gap: 3, thickness: 2, dot: false, dynamic: true, outline: true, opacity: 1, dotSize: 2 }, // G-1 (v1.78): +outline/opacity/dotSize — the loadSettings shallow-merge migrates old saves (the binds law)
  // T1-7: keyboard/mouse binds are NOT stored here — the labeled BINDINGS table lives in
  // input.js (DEFAULT_BINDS derived from it); ui.js loadSettings() merges saved binds over
  // those defaults. Keeps config.js data-only and avoids a config→input import cycle.
};
export const DEFAULT_LOADOUT = {
  weapon: 'vanguard', secondary: 'p9',
  // T1-5 (Task 37-a): attachment keys exist for EVERY weapon id — ui.js toggle needs the
  // array; ui.js also lazily creates the key for pre-T1-5 saved loadouts (migration guard).
  attachments: { vanguard: [], wasp: [], mauler: [], longshot: [], ripper: [], p9: [],
    sabre: [], raider: [], hornet: [], breacher: [], longbow: [], vulture: [], sting: [], judge: [] },
  ability: 'dash', nade: 'frag', difficulty: 1,
  op: null, // [T108 N8] operator id (operators.js OPERATORS) — the kit authority when set: op.ability drives `ability`. null = legacy free ability picker (zero-regression migration: pre-N8 saves keep their pick; equip on the OPERATORS page sets both keys)
  mapSelect: 'any', // W4 §51.1: offline map pin — 'any' preserves the rotation cursor law; a pinned roster id is honored every match
  colorVision: 'default', // §52.3 S6: colorblind palette key (PALETTES; default = shipped constants verbatim)
  finish: 'default', // T2-5 Phase 1 (Task 48): weapon finish id — cosmetics.js FINISHES
  charm: 'none', trail: 'none', emote: 'none', // T2-5 Phase 3 (Task 55, spec §39): cosmetics ids — CHARMS/TRAILS/EMOTES; loadLoadout spread-merge gives old saves these keys for free
};
