// ============================================================
// IRONSIGHT — cosmetics.js : weapon finishes
// T2-5 PHASE 1 (Task 48) — client, NON-MONETARY.
// Research origin: GAP_LEDGER T2-5 (Krunker marketplace [e_01], Pass E) — the
// shop/currency/trading layer is PRODUCT-GATED; this slice builds the researched
// core with zero product decision: data defs + career-stat unlocks + loadout UI
// + viewmodel application.
// Unlocks read the OFFLINE career store (ironsight.career.v1 fields written by
// endMatch: kills/wins/matches/bestStreak) — no server dependency in Phase 1.
// T90-c (v1.56): additive career field weaponKills = { [weaponId]: n } backs the
// per-weapon camo ladder — store shape + increment law documented at the CAMO
// section below. Zero migration: a missing map reads as all-zero.
// Logged residuals: Phase 2 = finish id rides the MP join payload (remote actors
// render it); Phase 3 = currency/shop/trading (product-gated, stays OUT until
// the monetization decision is made explicitly).
// Pure module: no three.js, no DOM — bun-importable for probes.
// ============================================================

// Finish fields: body/accent = hex for the viewmodel receiver/stock materials;
// metal/rough = PBR params (vmMat defaults 0.6/0.45). req = null (always) or
// { k: careerField, n: threshold, t: human label }. Missing career fields read 0.
export const FINISHES = [
  { id: 'default',      label: 'STOCK',         req: null,                                   desc: 'Factory finish — always available' },
  { id: 'fieldcoat',    label: 'FIELD COAT',    body: 0x4a5240, accent: 0x2e332a, metal: 0.50, rough: 0.45, req: { k: 'matches',    n: 1,   t: 'PLAY 1 MATCH' }   , r: 'common' },
  { id: 'desertfade',   label: 'DESERT FADE',   body: 0x8a7a5c, accent: 0x6a5c42, metal: 0.45, rough: 0.60, req: { k: 'wins',       n: 3,   t: 'WIN 3 MATCHES' }   , r: 'rare' },
  { id: 'rustbelt',     label: 'RUST BELT',     body: 0x6e3f2a, accent: 0x4a2b1e, metal: 0.35, rough: 0.75, req: { k: 'kills',      n: 25,  t: '25 ELIMINATIONS' }   , r: 'common' },
  { id: 'arctic',       label: 'ARCTIC',        body: 0xb8c2c8, accent: 0x7d8992, metal: 0.55, rough: 0.50, req: { k: 'wins',       n: 10,  t: 'WIN 10 MATCHES' }   , r: 'rare' },
  { id: 'embers',       label: 'EMBERS',        body: 0x8a2f22, accent: 0xd96a2f, metal: 0.50, rough: 0.45, req: { k: 'kills',      n: 100, t: '100 ELIMINATIONS' }   , r: 'epic' },
  { id: 'deepvoid',     label: 'DEEP VOID',     body: 0x14161c, accent: 0x2a2f3a, metal: 0.70, rough: 0.30, req: { k: 'bestStreak', n: 8,   t: 'REACH AN 8 STREAK' }   , r: 'legendary' },
  { id: 'goldstandard', label: 'GOLD STANDARD', body: 0xc9a227, accent: 0x8a6d1d, metal: 0.95, rough: 0.25, req: { k: 'kills',      n: 250, t: '250 ELIMINATIONS' }   , r: 'legendary' },
  { id: 'ironmark',     label: 'IRON MARK',     body: 0x23272e, accent: 0xff5a3c, metal: 0.80, rough: 0.35, req: { k: 'wins',       n: 25,  t: 'WIN 25 MATCHES' }   , r: 'epic' },
  // T90-c (v1.56, FM row N7 "camo/mastery ladder"): the 4 weapon-scoped camo
  // finishes. Thresholds 100/250/500/1000 are RESEARCH-VALIDATED, kept VERBATIM
  // (chat log L6333: "camo 100/250/500/1000 validated keep" — zero guessing).
  // req semantics EXTENDED (wreq: true): the threshold reads the EQUIPPED
  // WEAPON's own kill count from career.weaponKills (per-weapon), NOT a global
  // career field. body hex = the CAMO_TIERS row hex (single palette source);
  // accent/metal/rough are OUR-CONSTANT PBR partners (darker tone-on-tone accent,
  // matte for cloth-style wraps, mirror-gold for the master tier — goldstandard
  // 0.95/0.25 precedent). rarity: epic for the grind tiers, legendary for the
  // 500/1000 prestige pair. Full PBR tuple kept (probe_t48 unlockable-shape law).
  { id: 'camo-sand',    label: 'SAND',          body: 0xc2b280, accent: 0x8f855c, metal: 0.45, rough: 0.65, req: { k: 'weaponKills', n: 100,  t: '100 KILLS (PER WEAPON)', wreq: true }, r: 'epic',      tier: 1, desc: 'Desert tan wrap — 100 eliminations with this weapon' },
  { id: 'camo-jungle',  label: 'JUNGLE',        body: 0x4a5d3a, accent: 0x2f3a26, metal: 0.40, rough: 0.70, req: { k: 'weaponKills', n: 250,  t: '250 KILLS (PER WEAPON)', wreq: true }, r: 'epic',      tier: 2, desc: 'Woodland green wrap — 250 eliminations with this weapon' },
  { id: 'camo-digital', label: 'DIGITAL',       body: 0x5a6470, accent: 0x3e4550, metal: 0.55, rough: 0.55, req: { k: 'weaponKills', n: 500,  t: '500 KILLS (PER WEAPON)', wreq: true }, r: 'legendary', tier: 3, desc: 'Digital slate wrap — 500 eliminations with this weapon' },
  { id: 'camo-gold',    label: 'GOLD',          body: 0xd4af37, accent: 0x9c7c1e, metal: 0.95, rough: 0.25, req: { k: 'weaponKills', n: 1000, t: '1000 KILLS (PER WEAPON)', wreq: true }, r: 'legendary', tier: 4, desc: 'Master gold — 1000 eliminations with this weapon' },
  // [T93 — BP-exclusives gain their visual form] the 20 BPX_FINISHES ids (metagame.js mirror,
  // zero-import law) were labels-only since T90; bundles could sell them but the loadout had
  // nothing to render. The colorways below are OUR authored PBR reconstruction of the v1.50
  // labels (the zips carried no material data — honest authorship, logged in DEVLOG v1.59).
  // Gating law: req.k='bpx' is never satisfied naturally (career.bpx does not exist) — the
  // ∪ ownership law (ui ecoOwned: server inventory ∪ bundle-derived ∪ claimed) is the ONLY
  // key. bpx rows stay OUT of ECO_POOL (the MG mirror holds at 24; the shop never sells them).
  { id: 'bpx_tidebreaker',  label: 'TIDE BREAKER',    body: 0x1e5f6e, accent: 0x0e3a44, metal: 0.55, rough: 0.45, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_ghostlattice', label: 'GHOST LATTICE',   body: 0xdfe6e8, accent: 0x9fb3b8, metal: 0.30, rough: 0.35, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_emberfall',    label: 'EMBERFALL',       body: 0xa63a1e, accent: 0xe8863a, metal: 0.50, rough: 0.40, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_vectorprism',  label: 'VECTOR PRISM',    body: 0x3a3f5c, accent: 0x7de3ff, metal: 0.75, rough: 0.25, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_duneshadow',   label: 'DUNE SHADOW',     body: 0x8a7a5c, accent: 0x4f4636, metal: 0.40, rough: 0.65, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_frostbite',    label: 'FROSTBITE',       body: 0xa8c8d8, accent: 0x5a7d92, metal: 0.60, rough: 0.30, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_solargrain',   label: 'SOLAR GRAIN',     body: 0xd4b13a, accent: 0x8a6d1d, metal: 0.80, rough: 0.30, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_nighthaze',    label: 'NIGHT HAZE',      body: 0x232338, accent: 0x4a4a72, metal: 0.50, rough: 0.35, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_carbonrite',   label: 'CARBON RITE',     body: 0x1c1e22, accent: 0x3a3e46, metal: 0.35, rough: 0.60, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_ionstorm',     label: 'ION STORM',       body: 0x2a3a52, accent: 0x59a8ff, metal: 0.70, rough: 0.28, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_voidstripe',   label: 'VOID STRIPE',     body: 0x1a1420, accent: 0x3d2a52, metal: 0.60, rough: 0.30, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_sandblast',    label: 'SANDBLAST',       body: 0xcfc5a5, accent: 0x8f855c, metal: 0.35, rough: 0.70, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_neontracer',   label: 'NEON TRACER',     body: 0x26282e, accent: 0x2affd5, metal: 0.65, rough: 0.30, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_arcticfrac',   label: 'ARCTIC FRACTURE', body: 0xe8eef2, accent: 0x7d8992, metal: 0.55, rough: 0.30, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_coppervein',   label: 'COPPER VEIN',     body: 0x9c5a2e, accent: 0x5c3418, metal: 0.85, rough: 0.30, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_slatedrift',   label: 'SLATE DRIFT',     body: 0x4a525c, accent: 0x2e343c, metal: 0.50, rough: 0.45, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_pulsegrid',    label: 'PULSE GRID',      body: 0x1e2a30, accent: 0x2fd5ff, metal: 0.60, rough: 0.35, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_onyxfade',     label: 'ONYX FADE',       body: 0x121418, accent: 0x2a2e36, metal: 0.80, rough: 0.22, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_aurumedge',    label: 'AURUM EDGE',      body: 0xb8912a, accent: 0x6e5314, metal: 0.90, rough: 0.25, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'epic',      bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  { id: 'bpx_ironiris',     label: 'IRON IRIS',       body: 0x3c4048, accent: 0x5c646e, metal: 0.75, rough: 0.28, req: { k: 'bpx', n: 1, t: 'BUNDLE EXCLUSIVE' }, r: 'legendary', bpx: true, desc: 'BP-exclusive finish — bundles page only' },
  // [T110 T2-5] the token-exclusive mythic finishes — tk: = the token price
  // (the tksku op prices from THIS field); the tk flag also EXCLUDES them
  // from ECO_POOL (never CR-sold, never case-gambled — the FTC-clean law:
  // the token catalog is purchased, not randomized).
  { id: 'tk_vanta', label: 'VANTA PRIME',  body: 0x0a0a0e, accent: 0xff5a3c, metal: 0.88, rough: 0.18, req: { k: 'tk', n: 1, t: 'TOKEN EXCLUSIVE' }, r: 'mythic', tk: 2500, desc: 'Token-exclusive mythic finish — vantablack with ember accents' },
  { id: 'tk_prism', label: 'PRISM HEART',  body: 0x3a2f5c, accent: 0x7de3ff, metal: 0.75, rough: 0.22, req: { k: 'tk', n: 1, t: 'TOKEN EXCLUSIVE' }, r: 'mythic', tk: 2500, desc: 'Token-exclusive mythic finish — refractive prism sheen' },
];

export function finishById(id) { return FINISHES.find(f => f.id === id) || FINISHES[0]; }
// T90-c: unlock check EXTENDED for the per-weapon camo law. The non-wreq branch
// is the T2-5 expression VERBATIM (old finishes byte-identical — zero regression;
// extra params are simply ignored by it). wreq branch: reads the EQUIPPED
// weapon's count — the weaponKills map param wins when given, else the career
// store field career.weaponKills (store lives inside the career object).
// Missing weaponId/map/count ⇒ locked (false) — attribution is never guessed.
export function isUnlocked(f, career, weaponId, weaponKills) {
  if (!f.req) return true;
  if (f.req.wreq) return camoFinishUnlocked(f, weaponKills || (career && career.weaponKills), weaponId);
  return !!career && ((career[f.req.k] || 0) >= f.req.n);
}
// T2-8 (Task 64, §48.7): requirement text translates via the c.<domain>.<id> content dict
// (labels stay EN — proper names); domain = 'fin'|'ch'|'tr'|'em' from the caller.
import { t, td } from './i18n.js';
const EQUIPPED = () => t('m.equipped'); const READY = () => t('m.ready');
export function unlockLabel(f, domain) { if (f && f.bpx) return t('m.bundleLocked'); return (domain && f.req) ? td(domain, f.id) : (f.req ? f.req.t : 'ALWAYS AVAILABLE'); } // [T93] bpx rows share ONE translated face (m.bundleLocked ×9) — 20 per-id c.fin.* keys would be 180 duplicate lines for one sentence; the req.t stays as the EN byte-fallback
export function stateLabel(f, selected, unlocked, domain) { return !unlocked ? unlockLabel(f, domain) : selected ? EQUIPPED() : READY(); }

// ============================================================
// T2-5 PHASE 3 (Task 55, spec §39) — charms · trails · emotes.
// Same law as FINISHES: pure data, career-stat unlocks, stock-first
// ('none' req null), byId falls back to the stock entry (never throw).
// Charm = LOCAL VIEWMODEL ONLY, zero wire (§39.2: remote actors are
// capsule-only — a charm field that renders nowhere is dead wire weight).
// Trail = §32 pattern verbatim (join.trl + roster.ct, undefined drops).
// Emote = announce text + viewmodel dip + ONE socket event (§39.4).
// ============================================================

// Charm fields: shape = tag|die|shell|orb (viewmodel geometry), color = hex.
export const CHARMS = [
  { id: 'none',      label: 'NONE',        req: null,                            desc: 'No charm — always available' },
  { id: 'dogtag',    label: 'DOG TAG',     shape: 'tag',   color: 0xb8c2c8, req: { k: 'matches',    n: 5,  t: 'PLAY 5 MATCHES' }   , r: 'common' },
  { id: 'luckydie',  label: 'LUCKY DIE',   shape: 'die',   color: 0xd96a2f, req: { k: 'kills',      n: 50, t: '50 ELIMINATIONS' }   , r: 'rare' },
  { id: 'voidorb',   label: 'VOID ORB',    shape: 'orb',   color: 0x7a5cff, req: { k: 'bestStreak', n: 5,  t: 'REACH A 5 STREAK' }   , r: 'epic' },
  { id: 'goldshell', label: 'GOLD SHELL',  shape: 'shell', color: 0xc9a227, req: { k: 'wins',       n: 15, t: 'WIN 15 MATCHES' }   , r: 'legendary' },
  // [T110 T2-5] the token-exclusive mythic charm — tk price + the ECO_POOL exclusion (never gambled)
  { id: 'tk_sigil',  label: 'MYTHIC SIGIL', shape: 'orb',   color: 0xff5a3c, req: { k: 'tk', n: 1, t: 'TOKEN EXCLUSIVE' }   , r: 'mythic', tk: 1800 },
];

// Trail fields: color = wake particle hex. Wake spawns above the movement-tech
// speed band (9 m/s — sprint 7.35 stays clean; spec §39.3).
export const TRAILS = [
  { id: 'none',  label: 'NONE',       req: null,                               desc: 'No trail — always available' },
  { id: 'ion',   label: 'ION WAKE',   color: 0x5ad9ff, req: { k: 'matches',    n: 10, t: 'PLAY 10 MATCHES' }   , r: 'common' },
  { id: 'ember', label: 'EMBER WAKE', color: 0xff7a3c, req: { k: 'kills',      n: 75, t: '75 ELIMINATIONS' }   , r: 'rare' },
  { id: 'venom', label: 'VENOM WAKE', color: 0x7dff5a, req: { k: 'wins',       n: 8,  t: 'WIN 8 MATCHES' }   , r: 'epic' },
  { id: 'gold',  label: 'GOLD WAKE',  color: 0xffd75a, req: { k: 'bestStreak', n: 10, t: 'REACH A 10 STREAK' }   , r: 'legendary' },
  // [T110 T2-5] the token-exclusive mythic trail — tk price + the ECO_POOL exclusion (never gambled)
  { id: 'tk_comet', label: 'COMET WAKE', color: 0xff5a3c, req: { k: 'tk', n: 1, t: 'TOKEN EXCLUSIVE' }   , r: 'mythic', tk: 2200 },
];

// Emote fields: text = announce line (announce-based surface, spec §39.4).
export const EMOTES = [
  { id: 'none',   label: 'NONE',   req: null,                              desc: 'No emote — always available' },
  { id: 'gg',     label: 'GG',     text: 'GG WP',     req: { k: 'matches',    n: 3,  t: 'PLAY 3 MATCHES' }   , r: 'common' },
  { id: 'taunt',  label: 'TAUNT',  text: 'GET REKT',  req: { k: 'kills',      n: 10, t: '10 ELIMINATIONS' }   , r: 'rare' },
  { id: 'salute', label: 'SALUTE', text: 'O7',        req: { k: 'wins',       n: 5,  t: 'WIN 5 MATCHES' }   , r: 'epic' },
  { id: 'flex',   label: 'FLEX',   text: 'IRON FLEX', req: { k: 'bestStreak', n: 6,  t: 'REACH A 6 STREAK' }   , r: 'legendary' },
];

export function charmById(id) { return CHARMS.find(c => c.id === id) || CHARMS[0]; }
export function trailById(id) { return TRAILS.find(t => t.id === id) || TRAILS[0]; }
export function emoteById(id) { return EMOTES.find(e => e.id === id) || EMOTES[0]; }

// ============================================================
// §53.2 ECO POOL (Task 74, P2 pass) — the NON-STOCK cosmetics become the
// economy pool (12 fin since T90-c [was 8] + 4 charm + 4 trail + 4 emote;
// was 20 items, 24 since T90-c; rarity split 5/5/6/6 [was 5/5/5/5] — the 4
// camo finishes ride EXISTING rarities, so ECO_PRICE needs no new keys).
// Stock items ('default'/'none') stay outside the economy forever. Dual acquisition
// law intact: stat-req unlocks STILL work (∪ inventory ownership, server §53.2).
// ============================================================
export const ECO_POOL = [
  ...FINISHES.filter(f => f.id !== 'default' && !f.bpx && !f.tk), // [T93] bpx rows stay OUT — the shop never sells BP-exclusives; the MG_ECO_POOL mirror holds 1:1 at 24 · [T110] tk rows stay OUT too — the token catalog is never CR-sold, never case-gambled
  ...CHARMS.filter(c => c.id !== 'none' && !c.tk), // [T110] the tk exclusion
  ...TRAILS.filter(t => t.id !== 'none' && !t.tk), // [T110] the tk exclusion
  ...EMOTES.filter(e => e.id !== 'none'),
]; // 24 items since T90-c (was 20; T93 keeps it 24 — the 20 BPX finishes ride FINISHES + the bundle ∪ law, NOT the pool; [T110] the 4 token rows ride the tksku op, NOT the pool) — every member carries r (ECO_PRICE keyed)
export function ecoItemById(id) { // pool member → item; stock ids → null (NEVER a stock fallback)
  if (!id || id === 'default' || id === 'none') return null;
  return ECO_POOL.find(x => x.id === id) || null;
}


// ============================================================
// [T125] camo → MODULE: the camo mastery ladder now lives in js/camo.js
// (the user's 12-item decree item 6). The ladder LAW block moved VERBATIM —
// zero behavior change; this bridge re-exports the whole surface so ui.js's
// import contract (and probe_t90c/probe_t48 needles) stay byte-identical.
// The 4 camo FINISHES rows above stay HERE (they are finishes, not ladder
// math); their body hexes still cross-check CAMO_TIERS[].hex (palette
// single-source, probe_t90c asserts the pair).
// ============================================================
import { camoFinishUnlocked } from './camo.js'; // isUnlocked's wreq branch (line 90) needs the check — camo.js is pure, no cycle
export { CAMO_TIERS, camoTierFor, camoNextFor, camoCardData, camoFinishUnlocked, PK_TIERS, pkTierFor, pkNextFor, pkCardData, classFinishUnlocked } from './camo.js'; // [T125] the bridge · [T139 N7] the per-CLASS variant law joins the same bridge

