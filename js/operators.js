// ============================================================
// IRONSIGHT — operators.js : the N8 operator roster layer
// Task 108 (v1.72) — client data + ownership law, NON-MONETARY here.
// Research origin: RESEARCH_PASS_N §2.1 — the unlock/identity economy:
// the 8,000-KC agent norm [valorant.fandom / redbull.com, n_02], the release-
// window event discount [support.riotgames.com, n_02], the "player identity"
// loadout direction [callofduty.com MW4 blog, n_14], and the rarity→price
// ladder SHAPE [CODM, n_03] mapped onto OUR CR economy (ECO_PRICE cosmetic
// ceiling 2000; operators are the PREMIUM ladder above it — the researched
// 5-10× premium-over-cosmetics ratio, prices are OUR-CONSTANTS with the
// anchors quoted, never imported).
// KIT LAW: an operator's `ability` is the kit authority — equipping sets
// loadout.op AND loadout.ability (ui equip flow); op=null preserves the
// pre-N8 free ability picker (DEFAULT_LOADOUT.op = null, zero-regression).
// Mechanics ride existing systems only (config.js ABILITIES comment block).
// Mythic tier: [T110 v1.74] the T2-5 token leg LANDED — the reservation is
// FULFILLED: two token-exclusive mythic rows ride the roster (price: -1 =
// never CR-purchasable, tk: = the token price the tksku op prices from).
// Mythic ops REUSE existing kits by identity design (rarity is identity,
// NOT power — no new abilities, the N8 scope law holds; the kit map stays
// surjective: every kit still owned, two kits now carry a mythic carrier).
// [T118 v2.4] the COD-2026 faction grammar — research/ops_menu_b_01 (gamesatlas:
// BO7 "24 total Operators at launch, divided between JSOC Operators and Guild
// Operators"; X/WarzoneCenter + IGN: "split between two factions"). Two SIDES
// container the roster; names are the untranslated-proper-noun class (the
// WEAPONS/op name law — zero i18n churn, never imported CoD IP). The split
// follows role doctrine: the line (assault/support/vanguard/logistics/command/
// warden) vs the shadow (recon/infiltrator/disruptor/phantom); the mythic pair
// splits across BOTH (identity tier is not a faction — CoD crossovers live
// inside both factions too). Additive field: consumers ignore unknown fields
// (the career.ops zero-migration law).
// Pure module: no three.js, no DOM — bun-importable for probes AND for the
// room-service join validator (the cosmetics.js cos.FINISHES precedent).
// ============================================================

// Rarity meta: hex = the card accent / portrait gradient color (ui.js reads
// it via opRarityHex). order = sort/display order. mythic reserved (above).
export const OP_RARITY = {
  starter:   { hex: 0x8a94a0, order: 0 },
  uncommon:  { hex: 0x53b96a, order: 1 },
  rare:      { hex: 0x35a7e0, order: 2 },
  epic:      { hex: 0xb44adf, order: 3 },
  legendary: { hex: 0xd4af37, order: 4 },
  mythic:    { hex: 0xff5a3c, order: 5 }, // T2-5 token-exclusive tier — RESERVED, no roster row yet
};

// [T118] the two sides (raw proper nouns — the untranslated class, NO i18n keys).
// Insertion order = display order (the OP_RARITY.order idiom).
export const OP_SIDES = { pact: 'IRON PACT', nullstate: 'NULL STATE' };

// The N8 roster — 8 operators, 8 kits (3 pre-existing + 5 T108 kits).
// price: 0 = free starter (always owned); CR price = premium ladder
// (uncommon 1500/2000 → rare 3000/4500 → epic 8000 [the 8,000 norm, n_02]
// → legendary 12000 [the Apex 12,000 legend-token norm, PASS_MC §3]).
// bio: i18n key suffix — op.bio.<id> (all 9 locales; names/roles are the
// untranslated-proper-noun class, the WEAPONS name law).
// side: [T118] the faction container — IRON PACT (the line) / NULL STATE (the shadow).
export const OPERATORS = [
  { id: 'ranger',  name: 'RANGER',       role: 'ASSAULT',     ability: 'dash',     r: 'starter',   price: 0,     side: 'pact' },
  { id: 'vital',   name: 'VITAL',        role: 'SUPPORT',     ability: 'stim',     r: 'starter',   price: 0,     side: 'pact' },
  { id: 'wraith',  name: 'WRAITH',       role: 'RECON',       ability: 'pulse',    r: 'uncommon',  price: 1500,  side: 'nullstate' },
  { id: 'bulwark', name: 'BULWARK',      role: 'VANGUARD',    ability: 'aegis',    r: 'uncommon',  price: 2000,  side: 'pact' },
  { id: 'quartermaster', name: 'QUARTERMASTER', role: 'LOGISTICS', ability: 'resupply', r: 'rare', price: 3000, side: 'pact' },
  { id: 'specter', name: 'SPECTER',      role: 'INFILTRATOR', ability: 'ghost',    r: 'rare',      price: 4500,  side: 'nullstate' },
  { id: 'volt',    name: 'VOLT',         role: 'DISRUPTOR',   ability: 'surge',    r: 'epic',      price: 8000,  side: 'nullstate' },
  { id: 'herald',  name: 'HERALD',       role: 'COMMANDER',   ability: 'rally',    r: 'legendary', price: 12000, side: 'pact' },
  // [T110 T2-5] the token-exclusive mythic pair — price: -1 = NEVER CR (the
  // server CR-buy path gates price > 0; opOwned gates price === 0 — both
  // honestly exclude -1); tk = the token price (the tksku op prices from
  // THIS field — the roster single-truth law verbatim). Kits reuse the
  // existing ghost/aegis (identity tier, no power creep).
  { id: 'vanta',   name: 'VANTA',        role: 'PHANTOM',     ability: 'ghost',    r: 'mythic',    price: -1, tk: 6500, side: 'nullstate' },
  { id: 'aurum',   name: 'AURUM',        role: 'WARDEN',      ability: 'aegis',    r: 'mythic',    price: -1, tk: 6500, side: 'pact' },
];

// [T108] ownership = the §53.2 ∪ law shape (server inventory ∪ claimed ∪
// free-starter). careerOps = career.ops ([id,...] additive field, missing =
// empty — the weaponKills zero-migration law); ecoOwn = the eco.own server
// inventory map (authed leg — the T2-5 store writes the same map).
export function opById(id) { return OPERATORS.find(o => o.id === id) || null; }

export function opOwned(id, careerOps, ecoOwn) {
  const o = opById(id);
  if (!o) return false;
  if (o.price === 0) return true; // free starter — always owned
  if (Array.isArray(careerOps) && careerOps.includes(id)) return true;
  if (ecoOwn && typeof ecoOwn === 'object' && ecoOwn[id] > 0) return true;
  return false;
}

// The equip transform — THE one selection path (the applyWeaponSelect law):
// ui equip + probes share this. Returns a NEW loadout (copy-on-write — the
// evsClaim idiom); null when the operator is unknown.
export function opEquip(loadout, opId) {
  const o = opById(opId);
  if (!o) return null;
  return { ...loadout, op: o.id, ability: o.ability };
}

// Display helpers (ui.js): rarity hex → css color; kit summary line.
export function opRarityHex(r) { return (OP_RARITY[r] || OP_RARITY.starter).hex; }
export function opRarityOrder(r) { return (OP_RARITY[r] || OP_RARITY.starter).order; }
