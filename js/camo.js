// ============================================================
// IRONSIGHT — camo.js : the CAMO MASTERY LADDER module [T125].
// Decree (user 12-item debug decree, item 6 "camo→module"): the camo ladder
// leaves cosmetics.js as its OWN pure module. Extraction is VERBATIM — every
// line, comment and constant below is the T90-c (v1.56) law byte-carried;
// zero behavior change. cosmetics.js re-exports the whole surface (the import
// contract ui.js + probe_t90c hold stays byte-identical) and keeps the 4 camo
// FINISHES rows (they are finishes, not ladder math).
//
// LAWS:
//  · PURE — imports NOTHING, no DOM/window/LS (the cosmetics purity law holds
//    here; node/bun-importable, the probe runs it on both runtimes).
//  · PALETTE SINGLE-SOURCE — CAMO_TIERS[].hex is the one palette truth; the
//    camo-sand/jungle/digital/gold FINISHES rows in cosmetics.js MUST equal
//    the row hexes (cross-checked by scripts/probe_t90c_camo.mjs).
//  · NO CYCLE — camo.js ← cosmetics.js ← {ui.js, main.js, weapons.js, mp.js}.
//    camo.js imports nothing, so the cosmetics "no cycle" law survives.
// ============================================================

// ============================================================
// T90-c (v1.56): CAMO MASTERY LADDER — pure per-weapon kill-tier law.
// FM row N7 = "camo/mastery ladder"; Task-89 residual B4; pre-rewind v1.48 had
// the pages live (chat log L6234). Thresholds 100/250/500/1000 are the
// research-validated constants (chat log L6333: "camo 100/250/500/1000
// validated keep") — kept VERBATIM, zero guessing. Labels/hex/desc are
// OUR-CONSTANT military tones (documented per row).
//
// PER-WEAPON KILLS STORE LAW (additive career field — zero migration):
//   career.weaponKills = { [weaponId]: n }      e.g. { vanguard: 137, wasp: 42 }
//   · weaponId = CFG.WEAPONS id ('vanguard', 'wasp', ...) — NEVER the display name.
//   · copy-on-write: the map is created/initialized as a WHOLE object (never a
//     shared default mutated in place); missing map == all-zero — every reader
//     below defaults to 0, so old careers need no migration pass.
//   · INCREMENT LAW (main agent wires the player-kill site — BOTH paths):
//       career.weaponKills[w] = (career.weaponKills[w] || 0) + 1;
//     with `w` = the weapon-in-hand id at kill confirm (weapons.def.id —
//     weapons.js:124 getter; CFG.WEAPONS member, so .id always present).
//     Offline site: Match onKill hook (main.js ~:312) inside the k.isPlayer
//     branch. MP site: onKill hook (main.js ~:139) inside the k.mine branch.
//     Grenade/airstrike kills credit the weapon in hand (documented OUR-CONSTANT
//     attribution; COD-style camos count weapon-in-hand confirms).
//   · Persistence rides the EXISTING endMatch saveCareer(career) — no per-kill
//     LS write (same persistence class as career.kills, endMatch main.js ~:757).
//   · MP attribution is CLIENT-side: the server 'kill' chain carries the display
//     NAME (ironsight-room/index.ts:630 `w: weaponName`), not the id — and the
//     career store is the client single truth anyway (career.kills += me.k law,
//     main.js:203). Server career.json mirror stays global-only.
//
// TIER SEMANTICS (OUR-CONSTANT): tier = number of thresholds reached, 0..4.
//   tier 0 = no camo (stock); 1 = SAND ≥100; 2 = JUNGLE ≥250; 3 = DIGITAL ≥500;
//   4 = GOLD ≥1000 (maxed). Invariant: while tier < 4, CAMO_TIERS[tier] is the
//   tier being chased (its n is `next`, its label is `label`).
// PROGRESS LAW (OUR-CONSTANT formula, pinned by the normative example below):
//   pct = round( (kills − currentTierBase) / nextThreshold × 100 ), clamped 0..100
//   where currentTierBase = the previous threshold (0 for tier 0).
//   Worked example (normative, task 90-c spec): 150 kills → tier 1 (SAND held),
//   next 250, banked 150−100 = 50 → 50/250 = pct 20.
// ============================================================

// Palette: one row per tier — n VERBATIM (validated-keep law), hex = the body
// color the matching camo-sand/jungle/digital/gold finish renders (finish body
// hex in cosmetics.js MUST equal the row hex — single palette source,
// cross-checked by probe_t90c). desc lines are the card copy (EN literals;
// i18n content keys ride the c.* dict per §48.7).
export const CAMO_TIERS = [
  { n: 100,  label: 'SAND',    hex: 0xc2b280, desc: 'Desert tan wrap — 100 eliminations with this weapon' },
  { n: 250,  label: 'JUNGLE',  hex: 0x4a5d3a, desc: 'Woodland green wrap — 250 eliminations with this weapon' },
  { n: 500,  label: 'DIGITAL', hex: 0x5a6470, desc: 'Digital slate wrap — 500 eliminations with this weapon' },
  { n: 1000, label: 'GOLD',    hex: 0xd4af37, desc: 'Master gold — 1000 eliminations with this weapon' },
];

// Kills → tier index 0..4. Pure, clamped: negatives/junk/NaN read 0 (floor of a
// number coercion), fractional kills floor (never rounds a 99.5 up to SAND).
export function camoTierFor(kills) {
  const k = Math.max(0, Math.floor(Number(kills) || 0));
  let tier = 0;
  for (let i = 0; i < CAMO_TIERS.length; i++) { if (k >= CAMO_TIERS[i].n) tier = i + 1; else break; }
  return tier;
}

// Kills → progress payload toward the NEXT tier.
//   tier  = current tier 0..4 (camoTierFor law)
//   next  = next threshold number, or null when maxed (tier 4)
//   pct   = 0..100 progress to next (formula above); tier 4 ⇒ 100 (bar full)
//   label = label of the tier being chased; maxed ⇒ the held top tier ('GOLD')
export function camoNextFor(kills) {
  const k = Math.max(0, Math.floor(Number(kills) || 0));
  const tier = camoTierFor(k);
  if (tier >= CAMO_TIERS.length) { // maxed: nothing to chase — bar full on the top tier
    return { tier, next: null, pct: 100, label: CAMO_TIERS[CAMO_TIERS.length - 1].label };
  }
  const chasing = CAMO_TIERS[tier]; // CAMO_TIERS[tier] invariant (see TIER SEMANTICS)
  const base = tier > 0 ? CAMO_TIERS[tier - 1].n : 0;
  const pct = Math.min(100, Math.max(0, Math.round(((k - base) / chasing.n) * 100)));
  return { tier, next: chasing.n, pct, label: chasing.label };
}

// The exact payload the loadout card renders for one weapon's camo ladder.
//   kills     = this weapon's banked kills (missing/garbage map values read 0)
//   tier      = 0..4 (camoTierFor law)
//   tierLabel = label of the HELD tier; tier 0 ⇒ 'NONE' (stock, cosmetics 'none'
//               id convention) — never undefined, card renders without guards
//   next/pct  = camoNextFor passthrough (null/100 when maxed)
export function camoCardData(weaponId, weaponKills) {
  const raw = weaponKills ? weaponKills[weaponId] : 0;
  const kills = (typeof raw === 'number' && raw > 0) ? Math.floor(raw) : 0;
  const nx = camoNextFor(kills);
  return {
    kills,
    tier: nx.tier,
    tierLabel: nx.tier > 0 ? CAMO_TIERS[nx.tier - 1].label : 'NONE',
    next: nx.next,
    pct: nx.pct,
  };
}

// The wreq check, exported for UI reuse (ui.js chip locks + camo card).
// true ⇔ finish.req.wreq AND weaponKills[weaponId] ≥ finish.req.n.
// Anything missing/garbage (no finish, no req, not wreq, no map, no id,
// non-numeric count) ⇒ false — the check never guesses attribution and never
// throws. Non-wreq finishes route here only defensively; global-req finishes
// keep using isUnlocked's T2-5 branch (byte-identical, zero regression).
export function camoFinishUnlocked(finish, weaponKills, weaponId) {
  if (!finish || !finish.req || !finish.req.wreq || !weaponKills || !weaponId) return false;
  const n = weaponKills[weaponId];
  return typeof n === 'number' && n >= finish.req.n;
}

// ============================================================
// [T139 N7] THE PER-CLASS VARIANT (§60.4 — the FM's ONLY ⬜ row closes).
// §60.4 names the ladder base→gold→platinum→orbital; `career.pk` is the
// per-CLASS kill-sum store the row declared missing:
//   career.pk = { [cls]: n }        e.g. { 'ASSAULT RIFLE': 412, 'SMG': 87 }
//   · cls = CFG.WEAPONS[].cls verbatim ('ASSAULT RIFLE', 'SMG', ...) — the
//     display string IS the key (the loadout idiom ui.js:1251 law: config
//     single-truth data surfaced raw; zero new identity layering).
//   · copy-on-write additive field — missing map == all-zero, zero migration.
//   · INCREMENT LAW (main agent wires BOTH kill sites, mirroring each site's
//     own weaponKills keying): MP site k.w resolves by id ∪ name (the T138
//     corpse wire's find precedent); offline site reads wdef.cls directly.
// THRESHOLDS: the validated 100/250/500/1000 keep law REUSED VERBATIM
// (per-weapon T90-c constants — one validated band, two ladders; documented
// OUR-CONSTANT, zero guessing). LABELS: the §60.4 row names them verbatim.
// UNLOCK LAW (the VARIANT itself): tier t of a class ladder gates the tier-t
// finish on EVERY weapon of that class — the picker's unlock reads the ∪ of
// the per-weapon wreq leg (isUnlocked, byte-identical) and THIS class leg.
// ============================================================
export const PK_TIERS = [
  { n: 100,  label: 'BASE',     hex: 0xc2b280, desc: 'Class base — 100 eliminations with any weapon of this class' },
  { n: 250,  label: 'GOLD',     hex: 0xd4af37, desc: 'Class gold — 250 eliminations with this class' },
  { n: 500,  label: 'PLATINUM', hex: 0xb8c0c8, desc: 'Class platinum — 500 eliminations with this class' },
  { n: 1000, label: 'ORBITAL',  hex: 0x7a5fd0, desc: 'Class orbital — 1000 eliminations with this class' },
];

// Class kills-sum → tier index 0..4 (the camoTierFor law over PK_TIERS).
export function pkTierFor(pk, cls) {
  const raw = pk ? pk[cls] : 0;
  const k = Math.max(0, Math.floor((typeof raw === 'number' && raw > 0) ? raw : 0));
  let tier = 0;
  for (let i = 0; i < PK_TIERS.length; i++) { if (k >= PK_TIERS[i].n) tier = i + 1; else break; }
  return tier;
}

// Class kills-sum → progress payload (the camoNextFor law over PK_TIERS).
export function pkNextFor(pk, cls) {
  const raw = pk ? pk[cls] : 0;
  const k = Math.max(0, Math.floor((typeof raw === 'number' && raw > 0) ? raw : 0));
  const tier = pkTierFor(pk, cls);
  if (tier >= PK_TIERS.length) return { tier, next: null, pct: 100, label: PK_TIERS[PK_TIERS.length - 1].label };
  const chasing = PK_TIERS[tier];
  const base = tier > 0 ? PK_TIERS[tier - 1].n : 0;
  const pct = Math.min(100, Math.max(0, Math.round(((k - base) / chasing.n) * 100)));
  return { tier, next: chasing.n, pct, label: chasing.label };
}

// The exact payload the class mastery card renders (the camoCardData shape).
export function pkCardData(pk, cls) {
  const nx = pkNextFor(pk, cls);
  const raw = pk ? pk[cls] : 0;
  const kills = (typeof raw === 'number' && raw > 0) ? Math.floor(raw) : 0;
  return {
    kills,
    tier: nx.tier,
    tierLabel: nx.tier > 0 ? PK_TIERS[nx.tier - 1].label : 'NONE',
    next: nx.next,
    pct: nx.pct,
  };
}

// The ∪ gate's CLASS leg: true ⇔ finish.tier exists AND pk[cls] ≥ PK_TIERS[tier-1].n.
// Missing/garbage anything ⇒ false — never guesses attribution, never throws
// (the camoFinishUnlocked law verbatim). Non-tier finishes route here only
// defensively; the picker ORs this with the per-weapon leg (zero regression).
export function classFinishUnlocked(finish, pk, cls) {
  if (!finish || !finish.tier || !pk || !cls) return false;
  const row = PK_TIERS[finish.tier - 1];
  if (!row) return false;
  const n = pk[cls];
  return typeof n === 'number' && n >= row.n;
}
