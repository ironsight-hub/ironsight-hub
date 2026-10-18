// ============================================================
// IRONSIGHT — tokens.js : the T2-5 real-money token leg (currency + packs)
// Task 110 (v1.74) — PSP-AGNOSTIC by construction.
// Research origin: RESEARCH_PASS_N §2.2/§2.3 — the Apex $9.99/$19.99 pack
// anchors [n_07] (OUR-CONSTANT table with the anchors quoted, never
// imported), and THE shaping law: FTC v. Epic — $520M for unsanctioned
// purchases [n_06] ⇒ non-refundable tokens REQUIRE an explicit-confirm
// purchase flow, no dark patterns, plain-language terms (the client modal
// carries the i18n'd terms face; the server NEVER credits without the
// two-leg checkout arc below).
// THE TWO-LEG ARC (the Stripe hosted-checkout + webhook pattern, compressed):
//   leg 1  tkco    — client confirms the FTC modal → server issues a
//                    single-use, TTL'd, server-signed checkout nonce
//                    (HMAC over pid:pack:t — the client cannot forge it).
//   leg 2  tkpack  — the PSP-return leg. In the SANDBOX the client replays
//                    the nonce (the modal confirm IS the simulated PSP
//                    approval); a real PSP integration replaces BOTH the
//                    nonce issuance (hosted-checkout URL) AND this verifier
//                    (the PSP server-to-server webhook signature check).
//                    The client flow shape (packs → confirm → credited) is
//                    IDENTICAL either way — only the middle leg swaps.
// Credits are ACCOUNT-gated (the PARITY_DIFF #22 law — purchases bind to
// accounts, never to bearer pids) and land in the eco record: e.tk balance
// + e.tkhist receipt trail (cap 20). Spending rides the tksku op.
// Pure module: no three.js, no DOM, no imports — bun-importable (the
// cosmetics.js zero-import law). The CATALOG rows do NOT live here: each
// asset carries its own tk price field on its OWN single-truth table
// (operators.js roster rows / cosmetics.js finish-charm-trail rows), and
// the two token-native stages live on the maps.js roster (tk field) with
// TK_STAGES below as the MIRROR PINNED 1:1 by probe T110 (the MG_ECO_POOL
// mirror precedent) — maps.js stays dependency-clean for the disk-truth
// loader.
// ============================================================

// The pack ladder — usd anchors quoted from the researched AAA shape
// [n_07]: $9.99/$19.99 are the Apex anchor points; the ±$ steps and the
// bonus curve (10/20/30/40%) are OUR-CONSTANTS echoing the industry norm
// (bonus = the bigger-pack value law, never a dark pattern: the face shows
// the exact token count and the exact price — nothing animates, nothing
// hides, nothing expires).
export const TK_PACKS = [
  { id: 'p1', usd: 4.99,  tk: 500,   bonus: 0 },  // the entry pack — the researched floor anchor
  { id: 'p2', usd: 9.99,  tk: 1100,  bonus: 10 }, // the Apex $9.99 anchor
  { id: 'p3', usd: 19.99, tk: 2400,  bonus: 20 }, // the Apex $19.99 anchor
  { id: 'p4', usd: 49.99, tk: 6500,  bonus: 30 },
  { id: 'p5', usd: 99.99, tk: 14000, bonus: 40 },
];

export function packById(id) { return TK_PACKS.find(p => p.id === id) || null; }

// The token-native STAGES (the "very rare stages" catalog half). MIRROR of
// the maps.js roster tk rows — probe T110 asserts ids+prices 1:1 against
// Maps.roster.filter(m => m.tk) under BOTH runtimes. The server setMap gate
// reads THIS table (tokens.js is what the room service imports).
export const TK_STAGES = [
  { id: 'obsidian', tk: 4000 }, // TEMPLE lineage — obsidian-night re-score
  { id: 'aurora',   tk: 4000 }, // GLACIER lineage — aurora re-score
];

export function stageById(id) { return TK_STAGES.find(s => s.id === id) || null; }

// Checkout-nonce TTL (leg 1 → leg 2 must land inside 2 minutes; expired
// nonces are dead — the replay window law) and the receipt-trail cap.
export const TK_CO_TTL = 120000;
export const TK_HIST_CAP = 20;
