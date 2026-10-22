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
  STREAKS: [ // [T155 R6] 3→10 defs — the MW Smartstreak grammar: 10 defs, 3 equip slots,
    // career.streakLoadout maps slot→def (default [0,1,2] = the pre-T155 slots VERBATIM, so
    // old bytes/rooms are byte-compatible). Every def rides a PROVEN effect family (reveal /
    // refill / heal / strike / burn / crate / shield) — zero new engine systems, real in BOTH
    // sims (modes.js offline + hub server-owned, T2-10 law). Costs ladder 400→2000 [CoD class].
    // MW4 carries 17 Smartstreaks — the depth delta is NAMED, not hidden (MATURITY_RANKING R6).
    { name: 'UAV', fx: 'uav', cost: 400, dur: 30 },       // [BO2: 350pts/30s, score-scaled]
    { name: 'AMMO DROP', fx: 'ammo', cost: 500 },          // full loadout refill (the resupply-kit law)
    { name: 'STIM RIG', fx: 'stim', cost: 600, heal: 50, healTime: 3 }, // the stim-kit law, score-earned
    { name: 'AIRSTRIKE', fx: 'strike', cost: 700, bombs: 6, dmg: 200, radius: 6, delay: 2.2, waves: 1 },
    { name: 'PRECISION STRIKE', fx: 'strike', cost: 900, bombs: 1, dmg: 350, radius: 4, delay: 1.2, waves: 1 },
    { name: 'SUPPLY DROP', fx: 'supply', cost: 1000, shieldTime: 8 },
    { name: 'SWARM', fx: 'strike', cost: 1200, bombs: 6, dmg: 90, radius: 5, delay: 2.6, waves: 2 },
    { name: 'ARMOR DROP', fx: 'armor', cost: 1400, shield: 50, shieldTime: 10 }, // the aegis-kit law, score-earned
    { name: 'ARTILLERY', fx: 'strike', cost: 1600, bombs: 5, dmg: 160, radius: 5, delay: 2.0, waves: 3 },
    { name: 'NAPALM', fx: 'napalm', cost: 2000, dmg: 25, radius: 6, delay: 1.8, burn: 8 }, // burn zone: 25 dps × 8s
    // [T161 R6] the AI-UNIT classes join — the named R6 rung ("the AI-unit streak classes
    // (chopper/juggernaut) are the remaining rungs") closes:
    //   JUGGERNAUT = the aegis-kit family extended to a SUIT: shield 100 + 35% damage-taken
    //     cut + walk-speed down (the MW juggernaut grammar: slow, armored, deadly) — rides the
    //     shipped shield/armor law in BOTH sims (modes.js armor fx + the hub's server-owned
    //     shield; the dmg-cut reads player.juggT in the damage path).
    //   CHOPPER = the strike family's AI-TRACKING variant: 4 waves, and each wave's target
    //     point RETARGETS to the nearest enemy alive at wave-time (offline sim: modes.js
    //     retargets from the live bot list; hub: server-owned wave scheduler picks the
    //     densest enemy cluster from room state — targeting intelligence, not a fixed point).
    { name: 'JUGGERNAUT', fx: 'jugg', cost: 1800, shield: 100, shieldTime: 20, cut: 0.65, speed: 0.82 },
    { name: 'CHOPPER', fx: 'strike', cost: 2200, bombs: 2, dmg: 130, radius: 4.5, delay: 1.0, waves: 4, ai: true },
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
    // --- [T171] BATTLE ROYALE (mode 13) — last-alive on the battle map (VOSKHOD pin) ---
    // Warzone-class grammar, ORIGINAL numerics (SPEC DECISION logged): 30 combatants (engine-honest
    // scale — the researched ~150-per-drop class is documented, not carryable at 60 Hz with lite bots),
    // air-drop insertion at 115 m with a capped-vel glide, ground-loot economy (weapons/armor/ammo on
    // nav nodes), 6 gas closures (wait→shrink, dps ramps 2→14), no respawns, last-alive wins.
    // time 780 s = the anti-stall cap; expiry resolves by the same last-alive law (modes.js finish).
    br: { players: 30, time: 780,
      drop: 115, dropFall: -9, // insertion altitude (m) + fall-vel cap (m/s) while gliding
      gas: { r0: 340, // covers the 1.0 km2 map halves (±500) with margin
        phases: [ // {r, wait, shrink, dps} — SPEC DECISION band, original values
          { r: 240, wait: 50, shrink: 45, dps: 2 },
          { r: 160, wait: 45, shrink: 40, dps: 4 },
          { r: 100, wait: 40, shrink: 35, dps: 6 },
          { r: 60, wait: 35, shrink: 30, dps: 8 },
          { r: 30, wait: 30, shrink: 25, dps: 11 },
          { r: 12, wait: 25, shrink: 20, dps: 14 }] },
      lootN: 90, deathDropCr: 0.7, deathDropArm: 0.25 }, // ground loot spawns / drop chances on elimination
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
export const ECO_GIFT = { cap: 5000 }; // [T156 R11] the gift-verb ceiling (OUR-CONSTANT; the friend-gate is the §53.3 social law — no cold transfers; the recipient receipt rides the inbox)
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
  { id: 'render', label: 'RENDER (LIVE)',  endpoint: 'https://ironsight-hub.onrender.com' }, // [T144] the user's own Render deployment — LIVE, wire-verified (/healthz 200, engine.io open + namespace 40-ack, ACAO *); the honest default below
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
export const GG_LADDER = ['match', 'scorpion', 'p9', 'viper', 'sting', 'ghost', 'hornet', 'wasp', 'tempest', 'bison', 'bobcat', 'fenrir', 'raider', 'vanguard', 'warden', 'talon', 'sabre', 'centurion', 'anvil', 'nomad', 'ripper', 'vulture', 'atlas', 'mauler', 'hammer', 'judge', 'breacher', 'marauder', 'longbow', 'lance', 'longshot', 'reaper']; // [T161 R30] the ladder re-walks the FULL 32-arm armory (melee tier = LN+1) — worst→best arc over the 13 new ids; consumers are length-dynamic (modes.js LN, server GG_TOTAL)
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
export const BR_LOOT = ['sabre', 'vanguard', 'raider', 'ripper', 'mauler', 'p9', 'sting', 'hornet', 'wasp', 'judge', 'longshot']; // [T171] BR ground-loot weapon pool (all provenance WEAPONS ids — GF_KITS + the T129 audit)
export const RANKED_MIN_PLAYERS = 2; // §30.1: no RP vs nobody (anonymous players COUNT toward the minimum, earn nothing — §28.1)
export const RP_AWARD = { win: 25, draw: 10, loss: -20, kill: 2 }; // §30.2 SPEC DECISION: result-driven ladder, loss still bleeds
export const rpDelta = (result, kills) => RP_AWARD[result] + kills * RP_AWARD.kill; // §30.2 pure; result = §28.2 per-player res (computed once, shared with XP)
export const RP_TIERS = [ { n: 'BRONZE', min: 0 }, { n: 'SILVER', min: 600 }, { n: 'GOLD', min: 1400 }, { n: 'PLATINUM', min: 2400 }, { n: 'DIAMOND', min: 3600 }, { n: 'CHAMPION', min: 5000 }, { n: 'CRIMSON', min: 6600 }, { n: 'IRIDESCENT', min: 8400 } ]; // §30.3 SPEC DECISION: 6 tiers, ~30-40 wins between tiers at 50% wr — [T155 R12/R17] 6→8: the MW-lineage top pair (CRIMSON / IRIDESCENT) joins; tierOf's top-down scan + softReset are tier-count agnostic
export const tierOf = (rp) => { let t = RP_TIERS[0]; for (const x of RP_TIERS) if (rp >= x.min) t = x; return t.n; }; // §30.3 top-down scan
export const SEASON = { epoch: 1788048000000, weeks: 6 }; // §30.4: 2026-08-30T00:00:00Z, 6 weeks — season 1 ends 2026-10-11T00:00:00Z
export const SEASON_MS = SEASON.weeks * 604800000;
export const seasonOf = (now) => { const id = Math.floor((now - SEASON.epoch) / SEASON_MS) + 1; return { id, endsAt: SEASON.epoch + id * SEASON_MS }; }; // §30.4 pure (now-arg injected)
export const softReset = (rp) => Math.floor(rp / 2); // §30.4 SPEC DECISION: Krunker-style partial carry (hard reset punishes mid-ladder joiners, full carry makes seasons meaningless)
// [T161 R12/R17] THE PLACEMENTS LAW — the ranked-breadth rung: the first RANKED_PLACEMENTS
// ranked matches of each season carry ×2 RP volatility (the CS2/MW placement grammar —
// uncertain skill resolves fast), then the ladder standard RP_AWARD applies. Server-truth:
// the hub counts per-career rpMatches within the season (career.season.rpMatches), the client
// renders the PLACEMENTS face + progress (n/5) on the ranked card. Tier icons: RP_TIERS rows
// gain c (hex) — the scoreboard/lobby badges read THIS (single palette source).
export const RANKED_PLACEMENTS = 5;
// [T161] tier badge colors — single source for scoreboard + lobby + profile rank faces.
RP_TIERS[0].c = '#b08d57'; RP_TIERS[1].c = '#c0c7cf'; RP_TIERS[2].c = '#e8b23a'; RP_TIERS[3].c = '#7fd4e8';
RP_TIERS[4].c = '#8a7dff'; RP_TIERS[5].c = '#ff5a3c'; RP_TIERS[6].c = '#d43a3a'; RP_TIERS[7].c = '#c7a2ff';

// [T161 R8] THE DUAL PRESTIGE PATHS (E4 — the MW Regular/Classic grammar): the prestige
// confirm offers BOTH paths; the pick rides career.prPath ('regular'|'classic') + rec.pr
// stays the lifetime count. Regular = the shipped law verbatim (level reset, keep everything,
// +PRESTIGE.cr). Classic = the second path's TEETH: the same level reset PLUS a ×1.5 CR grant
// (PRESTIGE_CLASSIC.cr) and the RP ladder soft-resets TOO (softReset(rec.rp) — the classic
// ladder rerun), while unlocks/inventory stay (the modern-CoD classic compromise — a full
// stat wipe would corrupt the achievements/camo ladders, documented, not hidden).
export const PRESTIGE_CLASSIC = { cr: 1500 };

// ---- §55.2 RANKED SEASON REWARDS (v1.55 T89 L6 re-land — destroyed with v1.47) ----
// Season-rollover credit: highest tier REACHED (peak rp) pays CR once, credited by the
// server at the lazy rollover site BEFORE softReset (index.ts ranked award law).
export const RANK_REWARDS = { BRONZE: 100, SILVER: 250, GOLD: 500, PLATINUM: 750, DIAMOND: 1000, CHAMPION: 1500, CRIMSON: 1750, IRIDESCENT: 2000 }; // CR per peak tier at rollover (OUR-CONSTANT table, ECO_PRICE-anchored: legendary = 2000 ceiling — IRIDESCENT lands exactly ON it)

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
export const BP = { tiers: 60, per: 1000 }; // [T96 v1.62] the §60.4 chaptered re-land: 30→50 — 10 chapters × 5 tiers (the GEOMETRY NOTE integrator call) — [T155 R33] 50→60: 12 chapters × 5 tiers, 60 tiers × 1,000 XP, ~8 matches/tier at avg 125 match XP; the 20 BPX rows and bpOf geometry are tier-count agnostic (pure fn of BP.tiers)
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

// ---- [T155 R9] PER-WEAPON SPRAY IDENTITY — 20 unique patterns (CS2 lineage: each
// weapon's sweep is its own learnable lore, not a shared class fn — the class fns above
// remain as the T40-era lineage reference; no def points at them anymore). Same grammar
// fn(i) → [pitchKick, yawKick]; what is per-weapon: climb height, drift freq/phase,
// horizontal bias, reset index. The TTK/kill-ladder math is untouched.
const patternVN = (i) => i < 5 ? [0.0072, i % 2 ? 0.0004 : -0.0003] : i < 11 ? [0.0062, Math.sin(i * 1.7) * 0.0016] : [0.0034, Math.sin(i * 0.9) * 0.0034]; // vanguard — the doc'd AR shape
const patternWP = (i) => [0.0042 + Math.min(i, 14) * 0.00042, Math.sin(i * 1.15) * 0.0021]; // wasp — climb then drift
const patternML = () => [0.019, 0.0008]; // mauler — pump thump
const patternLS = (i) => [0.021 + Math.min(i, 3) * 0.004, i % 2 ? 0.0012 : -0.0009]; // longshot — bolt climb
const patternRP = (i) => [0.0056 + Math.min(i, 12) * 0.00026, Math.sin(i * 0.72 + 0.4) * 0.0028]; // ripper — slow wide sweep
const patternP9 = (i) => [0.0105, i % 2 ? 0.0011 : -0.0011]; // p9 — flip-flop
const patternSB = (i) => i < 4 ? [0.0058, i % 2 ? 0.0002 : -0.0002] : i < 9 ? [0.0051, Math.sin(i * 2.1) * 0.0011] : [0.0028, Math.sin(i * 1.3) * 0.0022]; // sabre — fast settle
const patternRD = (i) => i < 6 ? [0.005, (i % 3 - 1) * 0.0005] : [0.0038, Math.sin(i * 1.05) * 0.0026]; // raider — 6 stable then walk
const patternHN = (i) => [0.0036 + Math.min(i, 10) * 0.00052, Math.sin(i * 1.45) * 0.0017]; // hornet — snappy climb
const patternBR = (i) => [0.0066 + Math.min(i, 8) * 0.0003, Math.sin(i * 0.95) * 0.0023]; // breacher — auto-shotty grind
const patternLB = (i) => [0.0115 + Math.min(i, 6) * 0.0022, i % 2 ? 0.0008 : -0.0011]; // longbow — DMR follow-ups
const patternVT = (i) => [0.0048 + Math.min(i, 16) * 0.00022, Math.sin(i * 0.6) * 0.0031]; // vulture — long shallow pendulum
const patternST = (i) => [0.009, i % 2 ? 0.0016 : -0.0016]; // sting — machine-pistol flip
const patternJD = (i) => [0.024, i % 2 ? 0.0016 : -0.0016]; // judge — DBL kick
const patternAN = (i) => i < 4 ? [0.0086, i % 2 ? 0.0005 : -0.0004] : [0.0072, Math.sin(i * 0.85) * 0.003]; // anvil — heavy slow climb
const patternBC = (i) => [0.003 + Math.min(i, 12) * 0.00048, Math.sin(i * 1.65) * 0.0015]; // bobcat — fast jitter climb
const patternTL = (i) => i < 3 ? [0.006, i % 2 ? 0.0003 : -0.0003] : [0.005, Math.sin(i * 1.9) * 0.0024]; // talon — 3 stable then wide
const patternLC = (i) => [0.0098 + Math.min(i, 5) * 0.0016, i % 2 ? 0.0006 : -0.0006]; // lance — DMR follow-up climb
const patternAT = (i) => [0.0052 + Math.min(i, 18) * 0.00018, Math.sin(i * 0.5 + 0.3) * 0.0033]; // atlas — very long shallow
const patternDE = (i) => [0.0165, i % 2 ? 0.0014 : -0.0014]; // deadeye — hand-cannon thump
// ---- [T161 R30] the 13-widening wave: 20→33 (the Krunker v9.0.0 parity row — 33
// LIVE-verified 2026-10-20: 16 primary + 12 secondary + 2 melee + 6 killstreak weapons).
// Same def grammar verbatim; each weapon rides its own pattern + its own SIGNATURE catalog.
const patternCN = (i) => i % 3 === 2 ? [0.0125, 0] : [0.0075, i % 2 ? 0.0006 : -0.0006]; // centurion — 3-round burst pulse
const patternWD = (i) => [0.0062 + Math.min(i, 6) * 0.0004, Math.sin(i * 1.1) * 0.0016]; // warden — marksman flat-top
const patternFR = (i) => [0.0075 + Math.min(i, 10) * 0.00045, Math.sin(i * 1.35) * 0.0019]; // fenrir — compact climb
const patternTP = (i) => [0.0135 + Math.min(i, 14) * 0.00035, Math.sin(i * 0.75) * 0.003]; // tempest — hyper shake
const patternBS = (i) => [0.0055 + Math.min(i, 20) * 0.0002, Math.sin(i * 0.55) * 0.0028]; // bison — drum pendulum
const patternGH = (i) => [0.0034 + Math.min(i, 12) * 0.0004, Math.sin(i * 1.55) * 0.0014]; // ghost — hushed whisper climb
const patternHM = (i) => [0.0098, i % 2 ? 0.0012 : -0.0012]; // hammer — semi thud
const patternMR = (i) => [0.0195, i % 2 ? 0.0009 : -0.0009]; // marauder — slug shove
const patternNM = (i) => [0.0068 + Math.min(i, 9) * 0.00035, Math.sin(i * 0.9) * 0.0024]; // nomad — light-belt walk
const patternRE = (i) => [0.028, i % 2 ? 0.0008 : -0.0008]; // reaper — anti-materiel slam
const patternVP = (i) => [0.004 + Math.min(i, 8) * 0.0005, Math.sin(i * 1.7) * 0.0015]; // viper — staccato climb
const patternSC = (i) => [0.0055, i % 2 ? 0.0018 : -0.0018]; // scorpion — zip flip
const patternMT = (i) => [0.0028 + Math.min(i, 5) * 0.00035, Math.sin(i * 1.25) * 0.0011]; // match — target rail

export const WEAPONS = [
  {
    id: 'vanguard', name: 'VANGUARD', cls: 'ASSAULT RIFLE', slot: 1,
    rpm: 780, auto: true, dmg: 26, hs: 1.5, mag: 30, reserve: 120,
    ads: 0.25, sprintOut: 0.22, swap: 0.45,
    reloadT: 1.9, reloadE: 2.4, emptyChamber: 0.45,
    spreadBase: 0.0016, spreadMove: 0.011, spreadJump: 0.045, bloom: 0.0011, bloomMax: 0.006,
    recoilRec: 7.5, falloff: [24, 48, 0.72], pattern: patternVN, tracer: '#ffd28a',
    pellets: 1, zoom: 1.28, scope: false, sound: 'ar',
    stats: { damage: 62, rate: 72, range: 68, accuracy: 60, mobility: 62 },
  },
  {
    id: 'wasp', name: 'WASP', cls: 'SMG', slot: 2,
    rpm: 950, auto: true, dmg: 19, hs: 1.5, mag: 32, reserve: 160,
    ads: 0.18, sprintOut: 0.18, swap: 0.38,
    reloadT: 1.7, reloadE: 2.2, emptyChamber: 0.4,
    spreadBase: 0.0026, spreadMove: 0.008, spreadJump: 0.038, bloom: 0.0013, bloomMax: 0.007,
    recoilRec: 8.5, falloff: [12, 26, 0.6], pattern: patternWP, tracer: '#ffd28a',
    pellets: 1, zoom: 1.2, scope: false, sound: 'smg',
    stats: { damage: 44, rate: 88, range: 38, accuracy: 48, mobility: 82 },
  },
  {
    id: 'mauler', name: 'MAULER', cls: 'PUMP SHOTGUN', slot: 1, modeLabel: 'PUMP',
    rpm: 68, auto: false, dmg: 12, hs: 1.25, mag: 6, reserve: 24, pellets: 8,
    ads: 0.22, sprintOut: 0.24, swap: 0.55,
    reloadT: 1.1, reloadE: 1.1, shellLoad: true, emptyChamber: 0,
    spreadBase: 0.011, spreadMove: 0.014, spreadJump: 0.05, bloom: 0.0, bloomMax: 0,
    recoilRec: 6, falloff: [8, 18, 0.35], pattern: patternML, tracer: '#ffc27a',
    pellets: 8, zoom: 1.12, scope: false, sound: 'shotgun',
    stats: { damage: 96, rate: 18, range: 16, accuracy: 30, mobility: 58 },
  },
  {
    id: 'longshot', name: 'LONGSHOT', cls: 'BOLT DMR', slot: 1,
    rpm: 43, auto: false, dmg: 105, hs: 2.0, mag: 5, reserve: 25,
    ads: 0.38, sprintOut: 0.3, swap: 0.6,
    reloadT: 2.6, reloadE: 3.1, emptyChamber: 0.5,
    spreadBase: 0.05, spreadMove: 0.09, spreadJump: 0.14, bloom: 0, bloomMax: 0, adsSpread: 0.00012,
    recoilRec: 5, falloff: [999, 999, 1], pattern: patternLS, tracer: '#cfe9ff',
    pellets: 1, zoom: 4.2, scope: true, scopeZoom2: 8.0, sound: 'sniper',
    stats: { damage: 100, rate: 12, range: 100, accuracy: 96, mobility: 40 },
  },
  {
    id: 'ripper', name: 'RIPPER', cls: 'LMG', slot: 1,
    rpm: 700, auto: true, dmg: 24, hs: 1.5, mag: 60, reserve: 180,
    ads: 0.40, sprintOut: 0.3, swap: 0.62,
    reloadT: 3.2, reloadE: 3.9, emptyChamber: 0.5,
    spreadBase: 0.003, spreadMove: 0.016, spreadJump: 0.05, bloom: 0.0009, bloomMax: 0.005,
    recoilRec: 6.5, falloff: [30, 60, 0.75], pattern: patternRP, tracer: '#ffd28a',
    pellets: 1, zoom: 1.25, scope: false, sound: 'lmg',
    stats: { damage: 58, rate: 66, range: 74, accuracy: 55, mobility: 36 },
  },
  {
    id: 'p9', name: 'P9 SIDEARM', cls: 'PISTOL', slot: 3,
    rpm: 420, auto: false, dmg: 24, hs: 2.0, mag: 12, reserve: 72,
    ads: 0.17, sprintOut: 0.15, swap: 0.3,
    reloadT: 1.5, reloadE: 1.9, emptyChamber: 0.35,
    spreadBase: 0.0022, spreadMove: 0.01, spreadJump: 0.05, bloom: 0.0016, bloomMax: 0.007,
    recoilRec: 9, falloff: [15, 32, 0.65], pattern: patternP9, tracer: '#ffd28a',
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
    recoilRec: 6.5, falloff: [30, 62, 0.72], pattern: patternSB, tracer: '#ffd28a',
    pellets: 1, zoom: 1.3, scope: false, sound: 'ar', vmLen: 0.66,
    stats: { damage: 78, rate: 40, range: 72, accuracy: 66, mobility: 58 },
  },
  {
    id: 'raider', name: 'RAIDER', cls: 'CARBINE', slot: 1,
    rpm: 750, auto: true, dmg: 26, hs: 1.5, mag: 30, reserve: 120,
    ads: 0.23, sprintOut: 0.2, swap: 0.42,
    reloadT: 1.8, reloadE: 2.3, emptyChamber: 0.4,
    spreadBase: 0.0018, spreadMove: 0.01, spreadJump: 0.04, bloom: 0.0011, bloomMax: 0.0055,
    recoilRec: 8, falloff: [18, 40, 0.6], pattern: patternRD, tracer: '#ffd28a',
    pellets: 1, zoom: 1.26, scope: false, sound: 'ar', vmLen: 0.54,
    stats: { damage: 60, rate: 74, range: 58, accuracy: 62, mobility: 70 },
  },
  {
    id: 'hornet', name: 'HORNET', cls: 'PDW SMG', slot: 1,
    rpm: 900, auto: true, dmg: 16, hs: 1.4, mag: 50, reserve: 150,
    ads: 0.19, sprintOut: 0.17, swap: 0.36,
    reloadT: 2.0, reloadE: 2.5, emptyChamber: 0.4,
    spreadBase: 0.003, spreadMove: 0.009, spreadJump: 0.036, bloom: 0.0012, bloomMax: 0.007,
    recoilRec: 9, falloff: [10, 22, 0.55], pattern: patternHN, tracer: '#ffd28a',
    pellets: 1, zoom: 1.2, scope: false, sound: 'smg', vmLen: 0.48, vmMagH: 0.24,
    stats: { damage: 38, rate: 84, range: 30, accuracy: 46, mobility: 84 },
  },
  {
    id: 'breacher', name: 'BREACHER', cls: 'AUTO SHOTGUN', slot: 1,
    rpm: 300, auto: true, dmg: 13, hs: 1.25, mag: 12, reserve: 36, pellets: 8,
    ads: 0.24, sprintOut: 0.24, swap: 0.5,
    reloadT: 2.6, reloadE: 2.6, emptyChamber: 0,
    spreadBase: 0.012, spreadMove: 0.015, spreadJump: 0.05, bloom: 0.0, bloomMax: 0,
    recoilRec: 5.5, falloff: [5, 13, 0.3], pattern: patternBR, tracer: '#ffc27a',
    pellets: 8, zoom: 1.12, scope: false, sound: 'shotgun', vmLen: 0.7, vmMagH: 0.16,
    stats: { damage: 92, rate: 46, range: 12, accuracy: 30, mobility: 60 },
  },
  {
    id: 'longbow', name: 'LONGBOW', cls: 'DMR', slot: 1,
    rpm: 240, auto: false, dmg: 68, hs: 1.75, mag: 10, reserve: 50,
    ads: 0.32, sprintOut: 0.28, swap: 0.55,
    reloadT: 2.4, reloadE: 2.9, emptyChamber: 0.45,
    spreadBase: 0.045, spreadMove: 0.08, spreadJump: 0.13, bloom: 0, bloomMax: 0, adsSpread: 0.00018,
    recoilRec: 5.5, falloff: [60, 110, 0.8], pattern: patternLB, tracer: '#cfe9ff',
    pellets: 1, zoom: 2.8, scope: true, scopeZoom2: 4.6, sound: 'sniper', vmLen: 0.92, vmMagH: 0.14,
    stats: { damage: 84, rate: 26, range: 92, accuracy: 90, mobility: 48 },
  },
  {
    id: 'vulture', name: 'VULTURE', cls: 'BELT LMG', slot: 1,
    rpm: 650, auto: true, dmg: 22, hs: 1.4, mag: 100, reserve: 200,
    ads: 0.42, sprintOut: 0.3, swap: 0.65,
    reloadT: 4.4, reloadE: 5.2, emptyChamber: 0.6,
    spreadBase: 0.0032, spreadMove: 0.017, spreadJump: 0.05, bloom: 0.0008, bloomMax: 0.0045,
    recoilRec: 6, falloff: [26, 55, 0.7], pattern: patternVT, tracer: '#ffd28a',
    pellets: 1, zoom: 1.25, scope: false, sound: 'lmg', vmLen: 0.72, vmMagH: 0.34,
    stats: { damage: 55, rate: 62, range: 70, accuracy: 50, mobility: 30 },
  },
  {
    id: 'sting', name: 'STING', cls: 'MACHINE PISTOL', slot: 3,
    rpm: 950, auto: true, dmg: 14, hs: 1.5, mag: 18, reserve: 90,
    ads: 0.16, sprintOut: 0.14, swap: 0.28,
    reloadT: 1.6, reloadE: 2.0, emptyChamber: 0.35,
    spreadBase: 0.0032, spreadMove: 0.011, spreadJump: 0.05, bloom: 0.0019, bloomMax: 0.009,
    recoilRec: 9.5, falloff: [10, 24, 0.55], pattern: patternST, tracer: '#ffd28a',
    pellets: 1, zoom: 1.16, scope: false, sound: 'pistol', vmLen: 0.3, vmNoStock: true,
    stats: { damage: 34, rate: 86, range: 26, accuracy: 44, mobility: 90 },
  },
  {
    id: 'judge', name: 'JUDGE', cls: 'DOUBLE-BARREL', slot: 1, modeLabel: 'DBL',
    rpm: 150, auto: false, dmg: 14, hs: 1.25, mag: 2, reserve: 24, pellets: 9,
    ads: 0.2, sprintOut: 0.22, swap: 0.5,
    reloadT: 0.95, reloadE: 0.95, shellLoad: true, emptyChamber: 0,
    spreadBase: 0.013, spreadMove: 0.016, spreadJump: 0.055, bloom: 0.0, bloomMax: 0,
    recoilRec: 5, falloff: [4, 10, 0.25], pattern: patternJD, tracer: '#ffc27a',
    pellets: 9, zoom: 1.1, scope: false, sound: 'shotgun', vmLen: 0.44, vmNoStock: true,
    stats: { damage: 98, rate: 24, range: 10, accuracy: 26, mobility: 62 },
  },
  // ---- [T155 R30] the 6-widening wave: 14→20. Same def grammar verbatim; each weapon
  // rides its own [T155 R9] pattern + its own [T152 E3] SIGNATURE catalog (7 parts).
  // Classes chosen against the roster's EMPTY cells (no heavy AR / no micro SMG / no
  // semi DMR / no 100-mag LMG / no hand cannon secondary) — breadth by gap-fill, not dupes.
  {
    id: 'anvil', name: 'ANVIL', cls: 'HEAVY AR', slot: 1,
    rpm: 640, auto: true, dmg: 32, hs: 1.5, mag: 25, reserve: 100,
    ads: 0.28, sprintOut: 0.26, swap: 0.5,
    reloadT: 2.1, reloadE: 2.6, emptyChamber: 0.5,
    spreadBase: 0.0014, spreadMove: 0.012, spreadJump: 0.05, bloom: 0.001, bloomMax: 0.005,
    recoilRec: 6.5, falloff: [30, 60, 0.78], pattern: patternAN, tracer: '#ffd28a',
    pellets: 1, zoom: 1.3, scope: false, sound: 'ar',
    stats: { damage: 78, rate: 52, range: 76, accuracy: 68, mobility: 48 },
  },
  {
    id: 'bobcat', name: 'BOBCAT', cls: 'MICRO SMG', slot: 1,
    rpm: 1100, auto: true, dmg: 16, hs: 1.4, mag: 26, reserve: 156,
    ads: 0.16, sprintOut: 0.16, swap: 0.34,
    reloadT: 1.6, reloadE: 2.0, emptyChamber: 0.38,
    spreadBase: 0.003, spreadMove: 0.007, spreadJump: 0.04, bloom: 0.0014, bloomMax: 0.0075,
    recoilRec: 9.5, falloff: [9, 20, 0.5], pattern: patternBC, tracer: '#ffd28a',
    pellets: 1, zoom: 1.18, scope: false, sound: 'smg',
    stats: { damage: 34, rate: 94, range: 30, accuracy: 42, mobility: 90 },
  },
  {
    id: 'talon', name: 'TALON', cls: 'ASSAULT RIFLE', slot: 1,
    rpm: 880, auto: true, dmg: 22, hs: 1.5, mag: 35, reserve: 140,
    ads: 0.22, sprintOut: 0.2, swap: 0.42,
    reloadT: 1.8, reloadE: 2.3, emptyChamber: 0.42,
    spreadBase: 0.002, spreadMove: 0.01, spreadJump: 0.044, bloom: 0.0012, bloomMax: 0.006,
    recoilRec: 8, falloff: [20, 42, 0.68], pattern: patternTL, tracer: '#ffd28a',
    pellets: 1, zoom: 1.25, scope: false, sound: 'ar',
    stats: { damage: 52, rate: 82, range: 58, accuracy: 54, mobility: 66 },
  },
  {
    id: 'lance', name: 'LANCE', cls: 'SEMI DMR', slot: 1,
    rpm: 260, auto: false, dmg: 60, hs: 1.8, mag: 12, reserve: 60,
    ads: 0.3, sprintOut: 0.28, swap: 0.55,
    reloadT: 2.3, reloadE: 2.8, emptyChamber: 0.5,
    spreadBase: 0.02, spreadMove: 0.06, spreadJump: 0.1, bloom: 0, bloomMax: 0, adsSpread: 0.0003,
    recoilRec: 6, falloff: [70, 120, 0.85], pattern: patternLC, tracer: '#cfe9ff',
    pellets: 1, zoom: 3.0, scope: true, sound: 'sniper',
    stats: { damage: 70, rate: 30, range: 88, accuracy: 84, mobility: 52 },
  },
  {
    id: 'atlas', name: 'ATLAS', cls: 'BELT LMG', slot: 1,
    rpm: 640, auto: true, dmg: 25, hs: 1.5, mag: 100, reserve: 200,
    ads: 0.34, sprintOut: 0.32, swap: 0.65,
    reloadT: 3.4, reloadE: 4.2, emptyChamber: 0.6,
    spreadBase: 0.0028, spreadMove: 0.014, spreadJump: 0.055, bloom: 0.0009, bloomMax: 0.005,
    recoilRec: 7, falloff: [28, 58, 0.74], pattern: patternAT, tracer: '#ffd28a',
    pellets: 1, zoom: 1.25, scope: false, sound: 'lmg',
    stats: { damage: 58, rate: 58, range: 70, accuracy: 62, mobility: 34 },
  },
  {
    id: 'deadeye', name: 'DEADEYE', cls: 'HAND CANNON', slot: 3,
    rpm: 180, auto: false, dmg: 55, hs: 2.0, mag: 7, reserve: 35,
    ads: 0.2, sprintOut: 0.2, swap: 0.4,
    reloadT: 1.9, reloadE: 2.4, emptyChamber: 0.5,
    spreadBase: 0.004, spreadMove: 0.012, spreadJump: 0.05, bloom: 0.0018, bloomMax: 0.008, adsSpread: 0.0008,
    recoilRec: 7.5, falloff: [18, 38, 0.7], pattern: patternDE, tracer: '#ffd28a',
    pellets: 1, zoom: 1.2, scope: false, sound: 'pistol',
    stats: { damage: 76, rate: 22, range: 44, accuracy: 60, mobility: 74 },
  },
  // ---- [T161 R30] the 13-widening wave: 20→33 — the roster's EMPTY cells filled again
  // (burst AR / marksman AR / compact AR / hyper SMG / drum SMG / stealth SMG / semi shotgun /
  // slug shotgun / light LMG / anti-materiel / auto-sidearm pair / target pistol). Each rides
  // its own [T161] pattern + its own SIGNATURE catalog (7 parts, grammar verbatim).
  // burst:3 = the ONE new engine field — weapons.js fire loop consumes it (3-round burst
  // per trigger pull at the def's rpm cadence; MW burst-class lineage), all other defs
  // undefined → the legacy path byte-identical.
  {
    id: 'centurion', name: 'CENTURION', cls: 'BURST AR', slot: 1,
    rpm: 850, auto: false, burst: 3, dmg: 30, hs: 1.5, mag: 24, reserve: 96,
    ads: 0.25, sprintOut: 0.23, swap: 0.45,
    reloadT: 2.0, reloadE: 2.5, emptyChamber: 0.45,
    spreadBase: 0.0017, spreadMove: 0.011, spreadJump: 0.045, bloom: 0.001, bloomMax: 0.005,
    recoilRec: 7, falloff: [26, 52, 0.74], pattern: patternCN, tracer: '#ffd28a',
    pellets: 1, zoom: 1.28, scope: false, sound: 'ar',
    stats: { damage: 68, rate: 66, range: 66, accuracy: 70, mobility: 58 },
  },
  {
    id: 'warden', name: 'WARDEN', cls: 'MARKSMAN AR', slot: 1,
    rpm: 340, auto: false, dmg: 42, hs: 1.7, mag: 20, reserve: 80,
    ads: 0.24, sprintOut: 0.22, swap: 0.44,
    reloadT: 1.9, reloadE: 2.4, emptyChamber: 0.45,
    spreadBase: 0.0014, spreadMove: 0.01, spreadJump: 0.04, bloom: 0.0007, bloomMax: 0.004, adsSpread: 0.0004,
    recoilRec: 7.5, falloff: [34, 68, 0.8], pattern: patternWD, tracer: '#ffd28a',
    pellets: 1, zoom: 1.42, scope: false, sound: 'ar',
    stats: { damage: 74, rate: 38, range: 78, accuracy: 78, mobility: 56 },
  },
  {
    id: 'fenrir', name: 'FENRIR', cls: 'COMPACT AR', slot: 1,
    rpm: 820, auto: true, dmg: 23, hs: 1.5, mag: 28, reserve: 112,
    ads: 0.21, sprintOut: 0.19, swap: 0.4,
    reloadT: 1.75, reloadE: 2.2, emptyChamber: 0.4,
    spreadBase: 0.0021, spreadMove: 0.0095, spreadJump: 0.042, bloom: 0.0012, bloomMax: 0.006,
    recoilRec: 8.5, falloff: [20, 42, 0.66], pattern: patternFR, tracer: '#ffd28a',
    pellets: 1, zoom: 1.24, scope: false, sound: 'ar', vmLen: 0.5,
    stats: { damage: 54, rate: 78, range: 56, accuracy: 58, mobility: 72 },
  },
  {
    id: 'tempest', name: 'TEMPEST', cls: 'HYPER SMG', slot: 1,
    rpm: 1200, auto: true, dmg: 14, hs: 1.4, mag: 30, reserve: 180,
    ads: 0.17, sprintOut: 0.16, swap: 0.35,
    reloadT: 1.9, reloadE: 2.35, emptyChamber: 0.4,
    spreadBase: 0.0034, spreadMove: 0.0085, spreadJump: 0.038, bloom: 0.0015, bloomMax: 0.008,
    recoilRec: 10, falloff: [8, 18, 0.5], pattern: patternTP, tracer: '#ffd28a',
    pellets: 1, zoom: 1.18, scope: false, sound: 'smg', vmLen: 0.44,
    stats: { damage: 30, rate: 96, range: 24, accuracy: 40, mobility: 88 },
  },
  {
    id: 'bison', name: 'BISON', cls: 'DRUM SMG', slot: 1,
    rpm: 800, auto: true, dmg: 18, hs: 1.4, mag: 66, reserve: 198,
    ads: 0.22, sprintOut: 0.2, swap: 0.42,
    reloadT: 3.1, reloadE: 3.8, emptyChamber: 0.5,
    spreadBase: 0.0028, spreadMove: 0.011, spreadJump: 0.045, bloom: 0.0012, bloomMax: 0.007,
    recoilRec: 8, falloff: [13, 28, 0.58], pattern: patternBS, tracer: '#ffd28a',
    pellets: 1, zoom: 1.2, scope: false, sound: 'smg', vmMagH: 0.3,
    stats: { damage: 42, rate: 72, range: 34, accuracy: 46, mobility: 70 },
  },
  {
    id: 'ghost', name: 'GHOST', cls: 'STEALTH SMG', slot: 1,
    rpm: 760, auto: true, dmg: 21, hs: 1.5, mag: 30, reserve: 120,
    ads: 0.19, sprintOut: 0.18, swap: 0.38,
    reloadT: 1.8, reloadE: 2.25, emptyChamber: 0.4,
    spreadBase: 0.0024, spreadMove: 0.009, spreadJump: 0.04, bloom: 0.0011, bloomMax: 0.0055,
    recoilRec: 9, falloff: [14, 30, 0.6], pattern: patternGH, tracer: '#9fb3b8',
    pellets: 1, zoom: 1.22, scope: false, sound: 'smg', suppressed: true, vmLen: 0.58,
    stats: { damage: 48, rate: 70, range: 40, accuracy: 56, mobility: 80 },
  },
  {
    id: 'hammer', name: 'HAMMER', cls: 'SEMI SHOTGUN', slot: 1,
    rpm: 160, auto: false, dmg: 11, hs: 1.25, mag: 8, reserve: 32, pellets: 8,
    ads: 0.21, sprintOut: 0.22, swap: 0.48,
    reloadT: 2.2, reloadE: 2.2, emptyChamber: 0,
    spreadBase: 0.0105, spreadMove: 0.0135, spreadJump: 0.05, bloom: 0, bloomMax: 0,
    recoilRec: 6, falloff: [9, 20, 0.38], pattern: patternHM, tracer: '#ffc27a',
    pellets: 8, zoom: 1.12, scope: false, sound: 'shotgun',
    stats: { damage: 90, rate: 30, range: 14, accuracy: 34, mobility: 62 },
  },
  {
    id: 'marauder', name: 'MARAUDER', cls: 'SLUG SHOTGUN', slot: 1,
    rpm: 110, auto: false, dmg: 85, hs: 1.6, mag: 5, reserve: 25, pellets: 1,
    ads: 0.23, sprintOut: 0.24, swap: 0.52,
    reloadT: 2.4, reloadE: 2.4, shellLoad: true, emptyChamber: 0,
    spreadBase: 0.006, spreadMove: 0.011, spreadJump: 0.05, bloom: 0, bloomMax: 0, adsSpread: 0.0016,
    recoilRec: 5.5, falloff: [22, 44, 0.62], pattern: patternMR, tracer: '#ffc27a',
    pellets: 1, zoom: 1.3, scope: false, sound: 'shotgun',
    stats: { damage: 88, rate: 20, range: 30, accuracy: 48, mobility: 55 },
  },
  {
    id: 'nomad', name: 'NOMAD', cls: 'LIGHT LMG', slot: 1,
    rpm: 720, auto: true, dmg: 23, hs: 1.45, mag: 75, reserve: 225,
    ads: 0.33, sprintOut: 0.28, swap: 0.58,
    reloadT: 2.9, reloadE: 3.5, emptyChamber: 0.5,
    spreadBase: 0.0029, spreadMove: 0.014, spreadJump: 0.05, bloom: 0.0009, bloomMax: 0.005,
    recoilRec: 7, falloff: [24, 50, 0.7], pattern: patternNM, tracer: '#ffd28a',
    pellets: 1, zoom: 1.24, scope: false, sound: 'lmg', vmMagH: 0.26,
    stats: { damage: 55, rate: 64, range: 66, accuracy: 54, mobility: 44 },
  },
  {
    id: 'reaper', name: 'REAPER', cls: 'ANTI-MATERIEL', slot: 1,
    rpm: 36, auto: false, dmg: 150, hs: 2.0, mag: 4, reserve: 16,
    ads: 0.42, sprintOut: 0.34, swap: 0.68,
    reloadT: 3.0, reloadE: 3.6, emptyChamber: 0.55,
    spreadBase: 0.055, spreadMove: 0.095, spreadJump: 0.15, bloom: 0, bloomMax: 0, adsSpread: 0.0001,
    recoilRec: 4.5, falloff: [999, 999, 1], pattern: patternRE, tracer: '#cfe9ff',
    pellets: 1, zoom: 5.0, scope: true, scopeZoom2: 8.0, sound: 'sniper', vmLen: 1.0, vmMagH: 0.12,
    stats: { damage: 100, rate: 8, range: 100, accuracy: 98, mobility: 30 },
  },
  {
    id: 'viper', name: 'VIPER', cls: 'MACHINE PISTOL', slot: 3,
    rpm: 1000, auto: true, dmg: 13, hs: 1.5, mag: 16, reserve: 80,
    ads: 0.16, sprintOut: 0.14, swap: 0.28,
    reloadT: 1.55, reloadE: 1.95, emptyChamber: 0.35,
    spreadBase: 0.0034, spreadMove: 0.011, spreadJump: 0.05, bloom: 0.002, bloomMax: 0.0095,
    recoilRec: 9.5, falloff: [9, 22, 0.52], pattern: patternVP, tracer: '#ffd28a',
    pellets: 1, zoom: 1.16, scope: false, sound: 'pistol', vmLen: 0.28, vmNoStock: true,
    stats: { damage: 32, rate: 90, range: 24, accuracy: 42, mobility: 92 },
  },
  {
    id: 'scorpion', name: 'SCORPION', cls: 'COMPACT PISTOL', slot: 3,
    rpm: 500, auto: false, dmg: 26, hs: 2.0, mag: 14, reserve: 70,
    ads: 0.16, sprintOut: 0.14, swap: 0.27,
    reloadT: 1.5, reloadE: 1.85, emptyChamber: 0.35,
    spreadBase: 0.0024, spreadMove: 0.01, spreadJump: 0.05, bloom: 0.0015, bloomMax: 0.007,
    recoilRec: 9.5, falloff: [14, 30, 0.6], pattern: patternSC, tracer: '#ffd28a',
    pellets: 1, zoom: 1.18, scope: false, sound: 'pistol', vmLen: 0.24, vmNoStock: true,
    stats: { damage: 48, rate: 52, range: 36, accuracy: 60, mobility: 90 },
  },
  {
    id: 'match', name: 'MATCH', cls: 'TARGET PISTOL', slot: 3,
    rpm: 300, auto: false, dmg: 38, hs: 2.2, mag: 8, reserve: 48,
    ads: 0.18, sprintOut: 0.15, swap: 0.3,
    reloadT: 1.6, reloadE: 2.0, emptyChamber: 0.4,
    spreadBase: 0.0016, spreadMove: 0.009, spreadJump: 0.045, bloom: 0.001, bloomMax: 0.005, adsSpread: 0.0004,
    recoilRec: 9, falloff: [18, 38, 0.68], pattern: patternMT, tracer: '#ffd28a',
    pellets: 1, zoom: 1.34, scope: false, sound: 'pistol',
    stats: { damage: 60, rate: 34, range: 46, accuracy: 76, mobility: 84 },
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
// [T152 E3] the UNIVERSAL tier — 3 legacy ids every weapon accepts. Saved loadouts and the
// hub's ld.at validator (mini-services/ironsight-room buildWdefs) stay byte-valid: unknown-id
// stripping + the cap live server-side, pre-expansion saves keep applying untouched. The
// foregrip apply moved to the COMPOSITION LAW (multiply into the current value — a signature
// part equipping before/after it now composes instead of clobbering; solo effect identical).
export const ATTACHMENTS = {
  suppressor: { cat: 'muzzle', name: 'SUPPRESSOR', pros: 'no radar ping · quieter', cons: '−18% range', apply: w => { w.falloff = [w.falloff[0] * 0.82, w.falloff[1] * 0.82, w.falloff[2]]; w.suppressed = true; } }, // [MW Gunsmith]
  extmag: { cat: 'mag', name: 'EXTENDED MAG', pros: '+50% mag', cons: '+0.3s reload', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reserve = Math.round(w.reserve * 1.25); w.reloadT += 0.3; w.reloadE += 0.3; } },
  foregrip: { cat: 'grip', name: 'FOREGRIP', pros: '−15% recoil', cons: '+40ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.ads += 0.04; } },
  // [T161 R7] the UNIVERSAL tier 3→8 — five more every-weapon parts (the gunsmith breadth
  // rung: 8+7 = 15 options/weapon vs MW4's 28 — the residual narrows, still named). All ride
  // the SAME grammar: cat family, multiply-into-current apply, only consumed fields moved.
  lightcomp: { cat: 'muzzle', name: 'LIGHT COMPENSATOR', pros: '−8% recoil · −4% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.bloom *= 0.96; w.bloomMax *= 0.96; } },
  laser: { cat: 'grip', name: 'LASER SIGHT', pros: '−12% hip spread', cons: '+6% ADS', apply: w => { w.spreadBase *= 0.88; w.ads *= 1.06; } },
  fastmag: { cat: 'mag', name: 'FAST MAG', pros: '−12% reload', cons: '', apply: w => { w.reloadT *= 0.88; w.reloadE *= 0.88; } },
  hairtrigger: { cat: 'grip', name: 'HAIR TRIGGER', pros: '+6% fire rate', cons: '+10% recoil', apply: w => { w.rpm = Math.round(w.rpm * 1.06); w._recoilMult = (w._recoilMult || 1) * 1.1; } },
  riser: { cat: 'stock', name: 'RISER STOCK', pros: '−12% move spread · −15% sprint-out', cons: '+5% swap', apply: w => { w.spreadMove *= 0.88; w.sprintOut *= 0.85; w.swap *= 1.05; } },
};

// [T152 E3] THE SIGNATURE LAW — per-weapon gunsmith catalogs (MW lineage: each weapon tunes
// its OWN parts; Apex lineage: unlock-once via the weapon's kill ladder). Every entry rides
// the same shape as the universal tier {name, pros, cons, apply} + {cat, unlock}:
//   cat    = MW slot family (muzzle|barrel|mag|grip|stock) — display grouping only
//   unlock = weapon-kill threshold (career.weaponKills[weapon NAME] — the camo-ladder stat,
//            name-keyed at BOTH kill sites: main.js offline wdef.name + hub kill event w:
//            wdef.name, verified T152). Persistent = unlock-once, cross-session.
//   apply  = the COMPOSITION LAW: multiply into the CURRENT value (w.falloff[0]*1.1), never
//            assign from base — parts stack in any equip order, client and hub.
// Only CONSUMED def fields are moved (verified T152 by grep): dmg/hs/mag/reserve/reloadT/
// reloadE/rpm/ads/sprintOut/swap/spreadBase/spreadMove/bloom/bloomMax/recoilRec/_recoilMult/
// falloff/adsSpread/zoom/pellets/stats. sprintOut was a DEAD stat (authored on all 14 defs,
// consumed nowhere) — weapons.js wires the sprint-to-fire gate THIS task, so stock parts
// move a real number. Unlock gates are client-side (the FINISHES career-stat precedent,
// ui.js locked-chip idiom); the hub validates ids+cap, not career state (documented trust
// tier, T40 §24 lineage). Catalog depth: 7 signature + 3 universal = 10 options/weapon
// vs MW4's 28 — the depth delta is named, not hidden (MATURITY_RANKING R7 re-score).
export const SIGNATURE = {
  vanguard: [ // AR all-rounder — balanced tradeoffs
    { id: 'vg_m1', cat: 'muzzle', unlock: 10, name: 'TACTICAL COMPENSATOR', pros: '−12% recoil', cons: '+6% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.06; } },
    { id: 'vg_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'vg_b1', cat: 'barrel', unlock: 50, name: 'MARKSMAN BARREL', pros: '+12% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'vg_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−22% reload', cons: '', apply: w => { w.reloadT *= 0.78; w.reloadE *= 0.78; } },
    { id: 'vg_g2', cat: 'mag', unlock: 150, name: 'DRUM MAG', pros: '+50% mag', cons: '+30% reload · +4% ADS', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reloadT *= 1.3; w.reloadE *= 1.3; w.ads *= 1.04; } },
    { id: 'vg_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'vg_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−30% sprint-out · +10% swap', cons: '', apply: w => { w.sprintOut *= 0.7; w.swap *= 0.9; } },
  ],
  wasp: [ // SMG — mobility identity
    { id: 'wp_m1', cat: 'muzzle', unlock: 10, name: 'PORTED SLIDE', pros: '−10% recoil · −4% ADS', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads *= 0.96; } },
    { id: 'wp_m2', cat: 'muzzle', unlock: 100, name: 'SUBSONIC ROUNDS', pros: '+12% range', cons: '−5% damage', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.dmg *= 0.95; } },
    { id: 'wp_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '−14% move spread · −8% hip spread', cons: '', apply: w => { w.spreadMove *= 0.86; w.spreadBase *= 0.92; } },
    { id: 'wp_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'wp_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+38% mag', cons: '+25% reload', apply: w => { w.mag = Math.round(w.mag * 1.38); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 'wp_h1', cat: 'grip', unlock: 25, name: 'SKELETON GRIP', pros: '−8% recoil · −4% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.swap *= 0.96; } },
    { id: 'wp_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out · +8% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.92; } },
  ],
  mauler: [ // PUMP SHOTGUN — shell identity
    { id: 'ml_m1', cat: 'muzzle', unlock: 10, name: 'CHOKE', pros: '−12% hip spread', cons: '+4% ADS', apply: w => { w.spreadBase *= 0.88; w.ads *= 1.04; } },
    { id: 'ml_m2', cat: 'muzzle', unlock: 100, name: 'MUZZLE BRAKE', pros: '−15% recoil · +6% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.swap *= 0.94; } },
    { id: 'ml_b1', cat: 'barrel', unlock: 50, name: 'RIFLED BARREL', pros: '+15% range · −6% hip spread', cons: '', apply: w => { w.falloff = [w.falloff[0] * 1.15, w.falloff[1] * 1.15, w.falloff[2]]; w.spreadBase *= 0.94; } },
    { id: 'ml_g1', cat: 'mag', unlock: 25, name: 'SPEED SHELLS', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'ml_g2', cat: 'mag', unlock: 150, name: 'TUBE EXTENSION', pros: '+2 shells', cons: '+12% swap', apply: w => { w.mag += 2; w.reserve = Math.round(w.reserve * 1.2); w.swap *= 1.12; } },
    { id: 'ml_h1', cat: 'grip', unlock: 25, name: 'PUMP GRIP', pros: '−15% reload · −4% swap', cons: '', apply: w => { w.reloadT *= 0.85; w.reloadE *= 0.85; w.swap *= 0.96; } },
    { id: 'ml_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; } },
  ],
  longshot: [ // BOLT DMR — precision identity (falloff already 999: range is capped, parts move adsSpread/cycle)
    { id: 'ls_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads *= 1.05; } },
    { id: 'ls_m2', cat: 'muzzle', unlock: 100, name: 'BRAKE', pros: '−15% recoil', cons: '+8% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.ads *= 1.08; } },
    { id: 'ls_b1', cat: 'barrel', unlock: 50, name: 'MATCH BARREL', pros: '−15% ADS spread', cons: '+6% ADS', apply: w => { w.adsSpread *= 0.85; w.ads *= 1.06; } },
    { id: 'ls_g1', cat: 'mag', unlock: 25, name: 'QUICK-DRAW MAG', pros: '−15% reload', cons: '', apply: w => { w.reloadT *= 0.85; w.reloadE *= 0.85; } },
    { id: 'ls_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+2 rounds', cons: '+25% reload', apply: w => { w.mag += 2; w.reserve = Math.round(w.reserve * 1.2); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 'ls_h1', cat: 'grip', unlock: 25, name: 'CHEEK REST', pros: '−12% recoil', cons: '+4% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.04; } },
    { id: 'ls_s1', cat: 'stock', unlock: 200, name: 'ADJ. STOCK', pros: '−20% sprint-out · −8% swap', cons: '', apply: w => { w.sprintOut *= 0.8; w.swap *= 0.92; } },
  ],
  ripper: [ // LMG — suppression identity
    { id: 'rp_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−12% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; } },
    { id: 'rp_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'rp_b1', cat: 'barrel', unlock: 50, name: 'HEAVY PROFILE BARREL', pros: '+10% range', cons: '+8% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.1, w.falloff[1] * 1.1, w.falloff[2]]; w.ads *= 1.08; } },
    { id: 'rp_g1', cat: 'mag', unlock: 25, name: 'EXTENDED BELT', pros: '+33% mag', cons: '+15% reload', apply: w => { w.mag = Math.round(w.mag * 1.33); w.reloadT *= 1.15; w.reloadE *= 1.15; } },
    { id: 'rp_g2', cat: 'mag', unlock: 200, name: 'SPEED BELT', pros: '−25% reload', cons: '', apply: w => { w.reloadT *= 0.75; w.reloadE *= 0.75; } },
    { id: 'rp_h1', cat: 'grip', unlock: 25, name: 'VERTICAL GRIP', pros: '−10% recoil', cons: '+5% sprint-out', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.sprintOut *= 1.05; } },
    { id: 'rp_s1', cat: 'stock', unlock: 150, name: 'CARRY HANDLE', pros: '−10% ADS · −6% swap', cons: '', apply: w => { w.ads *= 0.9; w.swap *= 0.94; } },
  ],
  p9: [ // PISTOL — sidearm identity
    { id: 'p9_m1', cat: 'muzzle', unlock: 10, name: 'MATCH TRIGGER', pros: '−10% hip spread · −6% bloom', cons: '', apply: w => { w.spreadBase *= 0.9; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'p9_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−14% recoil · +5% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.86; w.swap *= 0.95; } },
    { id: 'p9_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '+12% range', cons: '+6% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.ads *= 1.06; } },
    { id: 'p9_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'p9_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+33% mag', cons: '+20% reload', apply: w => { w.mag = Math.round(w.mag * 1.33); w.reloadT *= 1.2; w.reloadE *= 1.2; } },
    { id: 'p9_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −6% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.swap *= 0.94; } },
    { id: 'p9_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out · +8% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.92; } },
  ],
  sabre: [ // BATTLE RIFLE — heavy-hitter identity
    { id: 'sb_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−12% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; } },
    { id: 'sb_m2', cat: 'muzzle', unlock: 100, name: 'MUZZLE BRAKE', pros: '−16% recoil', cons: '+6% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.84; w.ads *= 1.06; } },
    { id: 'sb_b1', cat: 'barrel', unlock: 50, name: 'PRECISE BARREL', pros: '+10% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.1, w.falloff[1] * 1.1, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'sb_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'sb_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+40% mag', cons: '+25% reload', apply: w => { w.mag = Math.round(w.mag * 1.4); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 'sb_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'sb_s1', cat: 'stock', unlock: 200, name: 'MARKSMAN STOCK', pros: '−20% sprint-out · −10% move spread', cons: '', apply: w => { w.sprintOut *= 0.8; w.spreadMove *= 0.9; } },
  ],
  raider: [ // CARBINE — cqb-hybrid identity
    { id: 'rd_m1', cat: 'muzzle', unlock: 10, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'rd_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−13% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.87; w.ads *= 1.05; } },
    { id: 'rd_b1', cat: 'barrel', unlock: 50, name: 'CQB BARREL', pros: '+10% swap', cons: '−8% range', apply: w => { w.swap *= 0.9; w.falloff = [w.falloff[0] * 0.92, w.falloff[1] * 0.92, w.falloff[2]]; } },
    { id: 'rd_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'rd_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+33% mag', cons: '+20% reload', apply: w => { w.mag = Math.round(w.mag * 1.33); w.reloadT *= 1.2; w.reloadE *= 1.2; } },
    { id: 'rd_h1', cat: 'grip', unlock: 25, name: 'SKELETON GRIP', pros: '−8% recoil · −4% ADS', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.ads *= 0.96; } },
    { id: 'rd_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−28% sprint-out · +6% swap', cons: '', apply: w => { w.sprintOut *= 0.72; w.swap *= 0.94; } },
  ],
  hornet: [ // PDW — spray identity
    { id: 'hn_m1', cat: 'muzzle', unlock: 10, name: 'PORTED SLIDE', pros: '−8% recoil · −6% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'hn_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−12% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.05; } },
    { id: 'hn_b1', cat: 'barrel', unlock: 50, name: 'MARKSMAN BARREL', pros: '+12% range', cons: '+6% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.ads *= 1.06; } },
    { id: 'hn_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'hn_g2', cat: 'mag', unlock: 150, name: 'DRUM MAG', pros: '+40% mag', cons: '+30% reload', apply: w => { w.mag = Math.round(w.mag * 1.4); w.reloadT *= 1.3; w.reloadE *= 1.3; } },
    { id: 'hn_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −5% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.swap *= 0.95; } },
    { id: 'hn_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; } },
  ],
  breacher: [ // AUTO SHOTGUN — room-clearing identity
    { id: 'br_m1', cat: 'muzzle', unlock: 10, name: 'CHOKE', pros: '−10% hip spread', cons: '+4% ADS', apply: w => { w.spreadBase *= 0.9; w.ads *= 1.04; } },
    { id: 'br_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−14% recoil · +5% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.86; w.swap *= 0.95; } },
    { id: 'br_b1', cat: 'barrel', unlock: 50, name: 'CHOKE BORE', pros: '+12% range · −6% hip spread', cons: '', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.spreadBase *= 0.94; } },
    { id: 'br_g1', cat: 'mag', unlock: 25, name: 'SPEED LOADER', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'br_g2', cat: 'mag', unlock: 150, name: 'DRUM MAG', pros: '+50% mag', cons: '+30% reload', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reloadT *= 1.3; w.reloadE *= 1.3; } },
    { id: 'br_h1', cat: 'grip', unlock: 25, name: 'VERTICAL GRIP', pros: '−10% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.spreadMove *= 0.94; } },
    { id: 'br_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; } },
  ],
  longbow: [ // DMR — midrange precision
    { id: 'lb_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−12% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; } },
    { id: 'lb_m2', cat: 'muzzle', unlock: 100, name: 'FLUTED BRAKE', pros: '−15% recoil · −12% ADS spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.adsSpread *= 0.88; } },
    { id: 'lb_b1', cat: 'barrel', unlock: 50, name: 'PRECISION BORE', pros: '+8% range', cons: '+4% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.08, w.falloff[1] * 1.08, w.falloff[2]]; w.ads *= 1.04; } },
    { id: 'lb_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'lb_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+30% mag', cons: '+22% reload', apply: w => { w.mag = Math.round(w.mag * 1.3); w.reloadT *= 1.22; w.reloadE *= 1.22; } },
    { id: 'lb_h1', cat: 'grip', unlock: 25, name: 'CHEEK REST', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'lb_s1', cat: 'stock', unlock: 200, name: 'ADJ. STOCK', pros: '−20% sprint-out · −8% swap', cons: '', apply: w => { w.sprintOut *= 0.8; w.swap *= 0.92; } },
  ],
  vulture: [ // BELT LMG — anchor identity
    { id: 'vt_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−12% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; } },
    { id: 'vt_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −8% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.92; } },
    { id: 'vt_b1', cat: 'barrel', unlock: 50, name: 'STAMPED BARREL', pros: '−12% ADS', cons: '+8% hip spread', apply: w => { w.ads *= 0.88; w.spreadBase *= 1.08; } },
    { id: 'vt_g1', cat: 'mag', unlock: 25, name: 'SPEED BELT', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'vt_g2', cat: 'mag', unlock: 150, name: 'AMMO CRATE', pros: '+30% reserve', cons: '+10% reload', apply: w => { w.reserve = Math.round(w.reserve * 1.3); w.reloadT *= 1.1; w.reloadE *= 1.1; } },
    { id: 'vt_h1', cat: 'grip', unlock: 25, name: 'VERTICAL GRIP', pros: '−10% recoil', cons: '+5% sprint-out', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.sprintOut *= 1.05; } },
    { id: 'vt_s1', cat: 'stock', unlock: 200, name: 'CARRY HANDLE', pros: '−10% ADS · −6% swap', cons: '', apply: w => { w.ads *= 0.9; w.swap *= 0.94; } },
  ],
  sting: [ // MACHINE PISTOL — cqb identity (vmNoStock: the stock slot is a frame-lightening part, honest to the viewmodel)
    { id: 'st_m1', cat: 'muzzle', unlock: 10, name: 'PORTED SLIDE', pros: '−10% recoil · −6% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'st_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−13% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.87; w.ads *= 1.05; } },
    { id: 'st_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '+12% range', cons: '+6% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.06; } },
    { id: 'st_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'st_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+39% mag', cons: '+25% reload', apply: w => { w.mag = Math.round(w.mag * 1.39); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 'st_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −6% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.swap *= 0.94; } },
    { id: 'st_s1', cat: 'stock', unlock: 200, name: 'LIGHT FRAME', pros: '−25% sprint-out · +10% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.9; } },
  ],
  judge: [ // DOUBLE-BARREL — finisher identity
    { id: 'jd_m1', cat: 'muzzle', unlock: 10, name: 'CHOKE', pros: '−12% hip spread', cons: '+4% ADS', apply: w => { w.spreadBase *= 0.88; w.ads *= 1.04; } },
    { id: 'jd_m2', cat: 'muzzle', unlock: 100, name: 'SAWED BARREL', pros: '−10% swap', cons: '+15% hip spread', apply: w => { w.swap *= 0.9; w.spreadBase *= 1.15; } },
    { id: 'jd_b1', cat: 'barrel', unlock: 50, name: 'RIFLED BARREL', pros: '+18% range · −8% hip spread', cons: '', apply: w => { w.falloff = [w.falloff[0] * 1.18, w.falloff[1] * 1.18, w.falloff[2]]; w.spreadBase *= 0.92; } },
    { id: 'jd_g1', cat: 'mag', unlock: 25, name: 'SPEED SHELLS', pros: '−15% reload', cons: '', apply: w => { w.reloadT *= 0.85; w.reloadE *= 0.85; } },
    { id: 'jd_g2', cat: 'mag', unlock: 150, name: 'SHELL HOLDER', pros: '+1 shell', cons: '+10% swap', apply: w => { w.mag += 1; w.reserve = Math.round(w.reserve * 1.2); w.swap *= 1.1; } },
    { id: 'jd_h1', cat: 'grip', unlock: 25, name: 'PUMP GRIP', pros: '−8% swap · −10% reload', cons: '', apply: w => { w.swap *= 0.92; w.reloadT *= 0.9; w.reloadE *= 0.9; } },
    { id: 'jd_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; } },
  ],
  // ---- [T155 R30] the 6 new weapons join the SIGNATURE LAW (T152 E3): 7 tuned parts
  // each — same cat families (muzzle×2, barrel, mag×2, grip, stock), same unlock ladder
  // 10/25/50/100/150/200, same apply-into-clone grammar. Ids prefix per weapon.
  anvil: [ // HEAVY AR — anchor identity
    { id: 'an_m1', cat: 'muzzle', unlock: 10, name: 'TACTICAL COMPENSATOR', pros: '−12% recoil', cons: '+6% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.06; } },
    { id: 'an_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'an_b1', cat: 'barrel', unlock: 50, name: 'MARKSMAN BARREL', pros: '+12% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'an_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−22% reload', cons: '', apply: w => { w.reloadT *= 0.78; w.reloadE *= 0.78; } },
    { id: 'an_g2', cat: 'mag', unlock: 150, name: 'DRUM MAG', pros: '+50% mag', cons: '+30% reload · +4% ADS', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reloadT *= 1.3; w.reloadE *= 1.3; w.ads *= 1.04; } },
    { id: 'an_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'an_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−30% sprint-out · +10% swap', cons: '', apply: w => { w.sprintOut *= 0.7; w.swap *= 0.9; } },
  ],
  bobcat: [ // MICRO SMG — shred identity
    { id: 'bc_m1', cat: 'muzzle', unlock: 10, name: 'PORTED SLIDE', pros: '−10% recoil · −4% ADS', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads *= 0.96; } },
    { id: 'bc_m2', cat: 'muzzle', unlock: 100, name: 'SUBSONIC ROUNDS', pros: '+12% range', cons: '−5% damage', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.dmg *= 0.95; } },
    { id: 'bc_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '−14% move spread · −8% hip spread', cons: '', apply: w => { w.spreadMove *= 0.86; w.spreadBase *= 0.92; } },
    { id: 'bc_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'bc_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+38% mag', cons: '+25% reload', apply: w => { w.mag = Math.round(w.mag * 1.38); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 'bc_h1', cat: 'grip', unlock: 25, name: 'SKELETON GRIP', pros: '−8% recoil · −4% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.swap *= 0.96; } },
    { id: 'bc_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out · +8% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.92; } },
  ],
  talon: [ // AGGRESSIVE AR — rush identity
    { id: 'tl_m1', cat: 'muzzle', unlock: 10, name: 'TACTICAL COMPENSATOR', pros: '−12% recoil', cons: '+6% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.06; } },
    { id: 'tl_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'tl_b1', cat: 'barrel', unlock: 50, name: 'MARKSMAN BARREL', pros: '+12% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'tl_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−22% reload', cons: '', apply: w => { w.reloadT *= 0.78; w.reloadE *= 0.78; } },
    { id: 'tl_g2', cat: 'mag', unlock: 150, name: 'DRUM MAG', pros: '+50% mag', cons: '+30% reload · +4% ADS', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reloadT *= 1.3; w.reloadE *= 1.3; w.ads *= 1.04; } },
    { id: 'tl_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'tl_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−30% sprint-out · +10% swap', cons: '', apply: w => { w.sprintOut *= 0.7; w.swap *= 0.9; } },
  ],
  lance: [ // SEMI DMR — marksman identity
    { id: 'lc_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'lc_m2', cat: 'muzzle', unlock: 100, name: 'MUZZLE BRAKE', pros: '−15% recoil · +6% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.swap *= 1.06; } },
    { id: 'lc_b1', cat: 'barrel', unlock: 50, name: 'LONG BARREL', pros: '+15% range', cons: '+8% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.15, w.falloff[1] * 1.15, w.falloff[2]]; w.ads *= 1.08; } },
    { id: 'lc_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'lc_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+50% mag', cons: '+25% reload', apply: w => { w.mag = Math.round(w.mag * 1.5); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 'lc_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'lc_s1', cat: 'stock', unlock: 200, name: 'SNIPER STOCK', pros: '−20% ADS sway · −25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; w.adsSpread = (w.adsSpread || 0.0003) * 0.85; } },
  ],
  atlas: [ // BELT LMG — suppression identity
    { id: 'at_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'at_m2', cat: 'muzzle', unlock: 100, name: 'HEAVY BOLT', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'at_b1', cat: 'barrel', unlock: 50, name: 'MARKSMAN BARREL', pros: '+12% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'at_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'at_g2', cat: 'mag', unlock: 150, name: 'DOUBLE DRUM', pros: '+25% mag', cons: '+15% reload · +4% ADS', apply: w => { w.mag = Math.round(w.mag * 1.25); w.reloadT *= 1.15; w.reloadE *= 1.15; w.ads *= 1.04; } },
    { id: 'at_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'at_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−30% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.7; } },
  ],
  deadeye: [ // HAND CANNON — finisher identity
    { id: 'de_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'de_m2', cat: 'muzzle', unlock: 100, name: 'PORTED BARREL', pros: '−12% recoil · −8% hip spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.spreadBase *= 0.92; } },
    { id: 'de_b1', cat: 'barrel', unlock: 50, name: 'LONG BARREL', pros: '+15% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.15, w.falloff[1] * 1.15, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'de_g1', cat: 'mag', unlock: 25, name: 'SPEED LOADER', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'de_g2', cat: 'mag', unlock: 150, name: 'EXTENDED CYLINDER', pros: '+2 mag', cons: '+15% reload', apply: w => { w.mag += 2; w.reserve = Math.round(w.reserve * 1.2); w.reloadT *= 1.15; w.reloadE *= 1.15; } },
    { id: 'de_h1', cat: 'grip', unlock: 25, name: 'SKELETON GRIP', pros: '−8% swap', cons: '', apply: w => { w.swap *= 0.92; } },
    { id: 'de_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out · −8% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.92; } },
  ],
  // ---- [T161 R30] the 13 new arms join the SIGNATURE LAW (T152 E3): 7 tuned parts each —
  // same cat families (muzzle×2, barrel, mag×2, grip, stock), same unlock ladder
  // 10/25/50/100/150/200, same apply-into-clone grammar. Ids prefix per weapon.
  centurion: [ // BURST AR — pulse discipline
    { id: 'cn_m1', cat: 'muzzle', unlock: 10, name: 'BURST COMPENSATOR', pros: '−12% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.05; } },
    { id: 'cn_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'cn_b1', cat: 'barrel', unlock: 50, name: 'MATCH BARREL', pros: '+12% range', cons: '+8% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.08; } },
    { id: 'cn_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'cn_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+33% mag', cons: '+22% reload', apply: w => { w.mag = Math.round(w.mag * 1.33); w.reloadT *= 1.22; w.reloadE *= 1.22; } },
    { id: 'cn_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −6% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'cn_s1', cat: 'stock', unlock: 200, name: 'MARKSMAN STOCK', pros: '−20% sprint-out · −10% move spread', cons: '', apply: w => { w.sprintOut *= 0.8; w.spreadMove *= 0.9; } },
  ],
  warden: [ // MARKSMAN AR — flat-top identity
    { id: 'wd_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'wd_m2', cat: 'muzzle', unlock: 100, name: 'FLUTED BRAKE', pros: '−14% recoil · −10% ADS spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.86; w.adsSpread *= 0.9; } },
    { id: 'wd_b1', cat: 'barrel', unlock: 50, name: 'LONG BARREL', pros: '+14% range', cons: '+6% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.14, w.falloff[1] * 1.14, w.falloff[2]]; w.ads *= 1.06; } },
    { id: 'wd_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'wd_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+30% mag', cons: '+20% reload', apply: w => { w.mag = Math.round(w.mag * 1.3); w.reloadT *= 1.2; w.reloadE *= 1.2; } },
    { id: 'wd_h1', cat: 'grip', unlock: 25, name: 'CHEEK REST', pros: '−10% recoil', cons: '+30ms ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads += 0.03; } },
    { id: 'wd_s1', cat: 'stock', unlock: 200, name: 'PRECISION STOCK', pros: '−18% sprint-out · −20% ADS spread', cons: '', apply: w => { w.sprintOut *= 0.82; w.adsSpread *= 0.8; } },
  ],
  fenrir: [ // COMPACT AR — runner identity
    { id: 'fr_m1', cat: 'muzzle', unlock: 10, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'fr_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−12% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.05; } },
    { id: 'fr_b1', cat: 'barrel', unlock: 50, name: 'CQB BARREL', pros: '+10% swap', cons: '−8% range', apply: w => { w.swap *= 0.9; w.falloff = [w.falloff[0] * 0.92, w.falloff[1] * 0.92, w.falloff[2]]; } },
    { id: 'fr_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'fr_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+33% mag', cons: '+20% reload', apply: w => { w.mag = Math.round(w.mag * 1.33); w.reloadT *= 1.2; w.reloadE *= 1.2; } },
    { id: 'fr_h1', cat: 'grip', unlock: 25, name: 'SKELETON GRIP', pros: '−8% recoil · −4% ADS', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.ads *= 0.96; } },
    { id: 'fr_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−28% sprint-out · +6% swap', cons: '', apply: w => { w.sprintOut *= 0.72; w.swap *= 0.94; } },
  ],
  tempest: [ // HYPER SMG — torrent identity
    { id: 'tp_m1', cat: 'muzzle', unlock: 10, name: 'PORTED SLIDE', pros: '−9% recoil · −6% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.91; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'tp_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−11% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.89; w.ads *= 1.05; } },
    { id: 'tp_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '+12% range', cons: '+6% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.ads *= 1.06; } },
    { id: 'tp_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'tp_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+40% mag', cons: '+26% reload', apply: w => { w.mag = Math.round(w.mag * 1.4); w.reloadT *= 1.26; w.reloadE *= 1.26; } },
    { id: 'tp_h1', cat: 'grip', unlock: 25, name: 'SKELETON GRIP', pros: '−8% recoil · −4% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.swap *= 0.96; } },
    { id: 'tp_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; } },
  ],
  bison: [ // DRUM SMG — suppression identity
    { id: 'bs_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'bs_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −8% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.92; } },
    { id: 'bs_b1', cat: 'barrel', unlock: 50, name: 'HEAVY PROFILE BARREL', pros: '+10% range', cons: '+8% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.1, w.falloff[1] * 1.1, w.falloff[2]]; w.ads *= 1.08; } },
    { id: 'bs_g1', cat: 'mag', unlock: 25, name: 'DRUM SPEED LOADER', pros: '−14% reload', cons: '', apply: w => { w.reloadT *= 0.86; w.reloadE *= 0.86; } },
    { id: 'bs_g2', cat: 'mag', unlock: 150, name: 'AMMO CRATE', pros: '+30% reserve', cons: '+10% reload', apply: w => { w.reserve = Math.round(w.reserve * 1.3); w.reloadT *= 1.1; w.reloadE *= 1.1; } },
    { id: 'bs_h1', cat: 'grip', unlock: 25, name: 'VERTICAL GRIP', pros: '−10% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.spreadMove *= 0.94; } },
    { id: 'bs_s1', cat: 'stock', unlock: 200, name: 'CARRY HANDLE', pros: '−10% ADS · −6% swap', cons: '', apply: w => { w.ads *= 0.9; w.swap *= 0.94; } },
  ],
  ghost: [ // STEALTH SMG — silent identity
    { id: 'gh_m1', cat: 'muzzle', unlock: 10, name: 'INTEGRAL PORTING', pros: '−10% recoil · −6% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'gh_m2', cat: 'muzzle', unlock: 100, name: 'SUBSONIC ROUNDS', pros: '+12% range', cons: '−4% damage', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.dmg *= 0.96; } },
    { id: 'gh_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '−12% hip spread', cons: '+6% ADS', apply: w => { w.spreadBase *= 0.88; w.ads *= 1.06; } },
    { id: 'gh_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'gh_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+33% mag', cons: '+20% reload', apply: w => { w.mag = Math.round(w.mag * 1.33); w.reloadT *= 1.2; w.reloadE *= 1.2; } },
    { id: 'gh_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −5% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.swap *= 0.95; } },
    { id: 'gh_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out · +8% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.92; } },
  ],
  hammer: [ // SEMI SHOTGUN — cadence identity
    { id: 'hm_m1', cat: 'muzzle', unlock: 10, name: 'CHOKE', pros: '−10% hip spread', cons: '+4% ADS', apply: w => { w.spreadBase *= 0.9; w.ads *= 1.04; } },
    { id: 'hm_m2', cat: 'muzzle', unlock: 100, name: 'MUZZLE BRAKE', pros: '−14% recoil · +5% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.86; w.swap *= 0.95; } },
    { id: 'hm_b1', cat: 'barrel', unlock: 50, name: 'CHOKE BORE', pros: '+12% range · −6% hip spread', cons: '', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.spreadBase *= 0.94; } },
    { id: 'hm_g1', cat: 'mag', unlock: 25, name: 'SPEED LOADER', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'hm_g2', cat: 'mag', unlock: 150, name: 'TUBE EXTENSION', pros: '+2 shells', cons: '+12% swap', apply: w => { w.mag += 2; w.reserve = Math.round(w.reserve * 1.2); w.swap *= 1.12; } },
    { id: 'hm_h1', cat: 'grip', unlock: 25, name: 'PUMP GRIP', pros: '−12% reload · −4% swap', cons: '', apply: w => { w.reloadT *= 0.88; w.reloadE *= 0.88; w.swap *= 0.96; } },
    { id: 'hm_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; } },
  ],
  marauder: [ // SLUG SHOTGUN — duelist identity
    { id: 'mr_m1', cat: 'muzzle', unlock: 10, name: 'SLUG CHOKE', pros: '−12% hip spread', cons: '+5% ADS', apply: w => { w.spreadBase *= 0.88; w.ads *= 1.05; } },
    { id: 'mr_m2', cat: 'muzzle', unlock: 100, name: 'BRAKE', pros: '−15% recoil', cons: '+8% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.ads *= 1.08; } },
    { id: 'mr_b1', cat: 'barrel', unlock: 50, name: 'RIFLED BARREL', pros: '+18% range · −8% hip spread', cons: '', apply: w => { w.falloff = [w.falloff[0] * 1.18, w.falloff[1] * 1.18, w.falloff[2]]; w.spreadBase *= 0.92; } },
    { id: 'mr_g1', cat: 'mag', unlock: 25, name: 'SPEED SHELLS', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'mr_g2', cat: 'mag', unlock: 150, name: 'SHELL HOLDER', pros: '+1 shell', cons: '+10% swap', apply: w => { w.mag += 1; w.reserve = Math.round(w.reserve * 1.2); w.swap *= 1.1; } },
    { id: 'mr_h1', cat: 'grip', unlock: 25, name: 'CHEEK REST', pros: '−10% recoil · −10% ADS spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.adsSpread *= 0.9; } },
    { id: 'mr_s1', cat: 'stock', unlock: 200, name: 'ADJ. STOCK', pros: '−20% sprint-out · −8% swap', cons: '', apply: w => { w.sprintOut *= 0.8; w.swap *= 0.92; } },
  ],
  nomad: [ // LIGHT LMG — mobile anchor
    { id: 'nm_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'nm_m2', cat: 'muzzle', unlock: 100, name: 'PORTED MUZZLE', pros: '−8% recoil · −6% move spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.92; w.spreadMove *= 0.94; } },
    { id: 'nm_b1', cat: 'barrel', unlock: 50, name: 'STAMPED BARREL', pros: '−12% ADS', cons: '+8% hip spread', apply: w => { w.ads *= 0.88; w.spreadBase *= 1.08; } },
    { id: 'nm_g1', cat: 'mag', unlock: 25, name: 'SPEED BELT', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'nm_g2', cat: 'mag', unlock: 150, name: 'AMMO CRATE', pros: '+30% reserve', cons: '+10% reload', apply: w => { w.reserve = Math.round(w.reserve * 1.3); w.reloadT *= 1.1; w.reloadE *= 1.1; } },
    { id: 'nm_h1', cat: 'grip', unlock: 25, name: 'VERTICAL GRIP', pros: '−10% recoil', cons: '+5% sprint-out', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.sprintOut *= 1.05; } },
    { id: 'nm_s1', cat: 'stock', unlock: 200, name: 'CARRY HANDLE', pros: '−10% ADS · −6% swap', cons: '', apply: w => { w.ads *= 0.9; w.swap *= 0.94; } },
  ],
  reaper: [ // ANTI-MATERIEL — siege identity
    { id: 're_m1', cat: 'muzzle', unlock: 10, name: 'BRAKE', pros: '−15% recoil', cons: '+8% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.85; w.ads *= 1.08; } },
    { id: 're_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−10% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.ads *= 1.05; } },
    { id: 're_b1', cat: 'barrel', unlock: 50, name: 'MATCH BARREL', pros: '−15% ADS spread', cons: '+6% ADS', apply: w => { w.adsSpread *= 0.85; w.ads *= 1.06; } },
    { id: 're_g1', cat: 'mag', unlock: 25, name: 'QUICK-DRAW MAG', pros: '−15% reload', cons: '', apply: w => { w.reloadT *= 0.85; w.reloadE *= 0.85; } },
    { id: 're_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+1 round', cons: '+25% reload', apply: w => { w.mag += 1; w.reserve = Math.round(w.reserve * 1.2); w.reloadT *= 1.25; w.reloadE *= 1.25; } },
    { id: 're_h1', cat: 'grip', unlock: 25, name: 'CHEEK REST', pros: '−12% recoil', cons: '+4% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.04; } },
    { id: 're_s1', cat: 'stock', unlock: 200, name: 'SNIPER STOCK', pros: '−20% ADS sway · −25% sprint-out', cons: '', apply: w => { w.sprintOut *= 0.75; w.adsSpread = (w.adsSpread || 0.0001) * 0.85; } },
  ],
  viper: [ // MACHINE PISTOL — shred identity
    { id: 'vp_m1', cat: 'muzzle', unlock: 10, name: 'PORTED SLIDE', pros: '−10% recoil · −6% bloom', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'vp_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−12% recoil', cons: '+5% ADS', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.88; w.ads *= 1.05; } },
    { id: 'vp_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '+12% range', cons: '+6% swap', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.swap *= 1.06; } },
    { id: 'vp_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'vp_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+37% mag', cons: '+22% reload', apply: w => { w.mag = Math.round(w.mag * 1.37); w.reloadT *= 1.22; w.reloadE *= 1.22; } },
    { id: 'vp_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −6% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.swap *= 0.94; } },
    { id: 'vp_s1', cat: 'stock', unlock: 200, name: 'LIGHT FRAME', pros: '−25% sprint-out · +10% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.9; } },
  ],
  scorpion: [ // COMPACT PISTOL — draw identity
    { id: 'sc_m1', cat: 'muzzle', unlock: 10, name: 'MATCH TRIGGER', pros: '−10% hip spread · −6% bloom', cons: '', apply: w => { w.spreadBase *= 0.9; w.bloom *= 0.94; w.bloomMax *= 0.94; } },
    { id: 'sc_m2', cat: 'muzzle', unlock: 100, name: 'COMPENSATOR', pros: '−13% recoil · +5% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.87; w.swap *= 0.95; } },
    { id: 'sc_b1', cat: 'barrel', unlock: 50, name: 'TARGET BARREL', pros: '+12% range', cons: '+6% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.12, w.falloff[1] * 1.12, w.falloff[2]]; w.ads *= 1.06; } },
    { id: 'sc_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−20% reload', cons: '', apply: w => { w.reloadT *= 0.8; w.reloadE *= 0.8; } },
    { id: 'sc_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+28% mag', cons: '+18% reload', apply: w => { w.mag = Math.round(w.mag * 1.28); w.reloadT *= 1.18; w.reloadE *= 1.18; } },
    { id: 'sc_h1', cat: 'grip', unlock: 25, name: 'RUBBERIZED GRIP', pros: '−10% recoil · −6% swap', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.swap *= 0.94; } },
    { id: 'sc_s1', cat: 'stock', unlock: 200, name: 'CQB STOCK', pros: '−25% sprint-out · +8% swap', cons: '', apply: w => { w.sprintOut *= 0.75; w.swap *= 0.92; } },
  ],
  match: [ // TARGET PISTOL — rail identity
    { id: 'mt_m1', cat: 'muzzle', unlock: 10, name: 'COMPENSATOR', pros: '−10% recoil', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; } },
    { id: 'mt_m2', cat: 'muzzle', unlock: 100, name: 'MATCH MUZZLE', pros: '−14% recoil · −10% ADS spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.86; w.adsSpread *= 0.9; } },
    { id: 'mt_b1', cat: 'barrel', unlock: 50, name: 'PRECISION BARREL', pros: '+14% range', cons: '+6% ADS', apply: w => { w.falloff = [w.falloff[0] * 1.14, w.falloff[1] * 1.14, w.falloff[2]]; w.ads *= 1.06; } },
    { id: 'mt_g1', cat: 'mag', unlock: 25, name: 'SPEED MAG', pros: '−18% reload', cons: '', apply: w => { w.reloadT *= 0.82; w.reloadE *= 0.82; } },
    { id: 'mt_g2', cat: 'mag', unlock: 150, name: 'EXTENDED MAG', pros: '+2 mag', cons: '+18% reload', apply: w => { w.mag += 2; w.reserve = Math.round(w.reserve * 1.2); w.reloadT *= 1.18; w.reloadE *= 1.18; } },
    { id: 'mt_h1', cat: 'grip', unlock: 25, name: 'CHEEK REST', pros: '−10% recoil · −8% ADS spread', cons: '', apply: w => { w._recoilMult = (w._recoilMult || 1) * 0.9; w.adsSpread *= 0.92; } },
    { id: 'mt_s1', cat: 'stock', unlock: 200, name: 'TARGET FRAME', pros: '−20% sprint-out · −15% ADS spread', cons: '', apply: w => { w.sprintOut *= 0.8; w.adsSpread *= 0.85; } },
  ],
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
  mpRegion: 'render',  // T2-7 (Task 43, §27): region id — [T144] the honest default IS the live free hub (Render, wire-verified); on a STATIC page the same-origin 'auto' mount has no room service (live-proven). Old saves keep their stored value (default-merge law) — the fail face's USE-HUB chip now prefers this row. CUSTOM still takes any hub URL; docs/HUB_HOSTING.md carries the free-host paths
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
  // [T161 R13/R15] THE A11Y PACK — the depth+breadth rungs (defaults = shipped behavior
  // byte-identical; default-merge law covers old saves):
  subtitles: false,      // the caption bar mirrors announce lines (deaf/hoh access)
  reducedMotion: false,  // screen shake ×0.2 + HUD gsap pulses gated (the prefers-reduced-motion analog)
  highContrast: false,   // the high-contrast UI theme (body.ir-hc → style.css)
  uiScale: 1.0,          // HUD/menu scale (the --ir-ui-scale CSS var; 0.8–1.4)
  flashCap: 0,           // photosensitivity strobe ceiling 0..0.8 (0 = full strobe = shipped)
  hitSound: 'default',   // hit-marker pitch 'default'|'low'|'high' (pitch-differentiated feedback)
  mono: false,           // the master-bus mono downmix (single-sided hearing)
  reportOpen: true,      // [T161 R21] the scoreboard REPORT affordance (the row menu) — ON by default
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
  streaks: [0, 1, 2], // [T155 R6] scorestreak equip — 3 slots → CFG.STREAKS def indices (the smartstreak grammar; default = the pre-T155 slots verbatim; spread-merge gives old saves the key for free)
};
