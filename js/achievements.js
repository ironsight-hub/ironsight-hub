// IRONSIGHT — achievements.js : T115 G-5 (v1.80) — the achievements/trophies single truth.
// PURE module, zero imports (the operators.js/tokens.js zero-import law): browser AND bun
// import the SAME table, so the server 'ach' op validates ids against the SAME definitions.
//
// LAWS:
//  · DETERMINISTIC SINGLE TRUTH — every condition is a pure fn of the career object
//    (the localStorage free-form career: every field read is defensively defaulted —
//    junk/tampered careers evaluate false, never throw).
//  · COPY-ON-WRITE — achUnlock returns a NEW career object (the bpCarry/claim idiom);
//    the input is NEVER mutated (probe-pinned).
//  · IDEMPOTENCE — career.ach[id] presence IS the unlock record (unix ms); an already-
//    unlocked id never re-unlocks and never re-toasts (probe-pinned).
//  · OFFLINE-FIRST — evaluation needs NO server; the MP push (main.js sendEco ach op) is
//    a mirror for the future trophy trail, not a gate.
//  · i18n — faces ride the V165 layer (ach.<id>.n / ach.<id>.d ×9 REAL translations);
//    numbers live INSIDE the strings (the proper-noun law) — zero interpolation.

export const ACH_VERSION = 1; // schema bump key — achCarry migrates on version flips (forward law)

// Tier palette single truth (ui renders the card accents from THIS table).
export const ACH_TIER_HEX = { BRONZE: '#cd7f32', SILVER: '#c0c0c0', GOLD: '#ffd700' };

// THE TABLE — 22 achievements, 6 families. Conditions read ONLY established career fields:
//   kills/deaths/wins/matches/hs (main.js endMatch) · dailyDone (recordHistoryAndDaily) ·
//   weaponKills{} name-keyed (both kill sites) · bn{} (bundle markers, T91) ·
//   bp.prem (pass buyout, T94) · ops[] (operator ownership, T108) · cosOwned{} (the ∪ claimed
//   leg, T93/T102). Ranked-RP trophies intentionally ABSENT (server-lifetime rp — documented
//   residual; they join with the trophy/anti-cheat pass, not guessed client-side).
export const ACH_DEFS = [
  // — COMBAT —
  { id: 'first_blood', tier: 'BRONZE', stat: 'kills', goal: 1 },
  { id: 'kills_100', tier: 'BRONZE', stat: 'kills', goal: 100 },
  { id: 'kills_1000', tier: 'SILVER', stat: 'kills', goal: 1000 },
  { id: 'kills_10000', tier: 'GOLD', stat: 'kills', goal: 10000 },
  { id: 'hs_100', tier: 'SILVER', stat: 'hs', goal: 100 },
  { id: 'hs_1000', tier: 'GOLD', stat: 'hs', goal: 1000 },
  { id: 'kd_2', tier: 'SILVER', kd: 2, sample: 200 }, // kills>=200 && deaths>0 && k/d>=2 — the sample floor blocks the 1-kill-0-deaths degenerate
  // — GLORY —
  { id: 'first_win', tier: 'BRONZE', stat: 'wins', goal: 1 },
  { id: 'wins_10', tier: 'BRONZE', stat: 'wins', goal: 10 },
  { id: 'wins_50', tier: 'SILVER', stat: 'wins', goal: 50 },
  { id: 'wins_100', tier: 'GOLD', stat: 'wins', goal: 100 },
  // — GRIND —
  { id: 'matches_10', tier: 'BRONZE', stat: 'matches', goal: 10 },
  { id: 'matches_100', tier: 'SILVER', stat: 'matches', goal: 100 },
  { id: 'daily_10', tier: 'SILVER', stat: 'dailyDone', goal: 10 },
  { id: 'daily_50', tier: 'GOLD', stat: 'dailyDone', goal: 50 },
  // — ARSENAL (camo law 100/250/500/1000 — the 250/1000 rungs surface here) —
  { id: 'camo_digital', tier: 'SILVER', weaponKills: 250 },
  { id: 'camo_gold', tier: 'GOLD', weaponKills: 1000 },
  { id: 'arsenal_5', tier: 'SILVER', variety: { weapons: 5, per: 100 } },
  // — COLLECTION —
  { id: 'first_buy', tier: 'BRONZE', bundles: 1 },
  { id: 'pass_owner', tier: 'SILVER', pass: true },
  { id: 'operator', tier: 'SILVER', operators: 1 },
  { id: 'collector_10', tier: 'GOLD', cosmetics: 10 },
];

const num = (v) => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0; // defensive read — junk → 0
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;

function achMet(def, career) {
  if (def.stat) return num(career[def.stat]) >= def.goal;
  if (def.kd) {
    const k = num(career.kills), d = num(career.deaths);
    return k >= def.sample && d > 0 && (k / d) >= def.kd;
  }
  if (def.weaponKills) {
    const wk = obj(career.weaponKills); if (!wk) return false;
    return Object.values(wk).some((v) => num(v) >= def.weaponKills);
  }
  if (def.variety) {
    const wk = obj(career.weaponKills); if (!wk) return false;
    return Object.values(wk).filter((v) => num(v) >= def.variety.per).length >= def.variety.weapons;
  }
  if (def.bundles) {
    const bn = obj(career.bn); return !!bn && Object.keys(bn).length >= def.bundles;
  }
  if (def.pass) {
    const bp = obj(career.bp); return !!bp && bp.prem === true;
  }
  if (def.operators) return Array.isArray(career.ops) && career.ops.length >= def.operators;
  if (def.cosmetics) {
    const co = obj(career.cosOwned); return !!co && Object.keys(co).length >= def.cosmetics;
  }
  return false; // unknown def shape → locked (never throw)
}

// Current progress toward a def (0..goal, integer display copy). Special shapes carry their
// own cur; unknown → 0. done ⇔ the SAME law as achMet (one truth, two views).
export function achCur(def, career) {
  if (def.stat) return Math.min(num(career[def.stat]), def.goal);
  if (def.kd) {
    const k = num(career.kills), d = num(career.deaths);
    if (k < def.sample || d <= 0) return 0; // pre-sample: 0 (the floor progress is NOT the ratio — mixing units would break cur<=goal)
    return Math.min(Math.floor((k / d) * 100) / 100, def.kd); // 2-decimal ratio, capped
  }
  if (def.weaponKills) {
    const wk = obj(career.weaponKills); if (!wk) return 0;
    return Math.min(Object.values(wk).reduce((a, v) => Math.max(a, num(v)), 0), def.weaponKills);
  }
  if (def.variety) {
    const wk = obj(career.weaponKills); if (!wk) return 0;
    return Math.min(Object.values(wk).filter((v) => num(v) >= def.variety.per).length, def.variety.weapons);
  }
  if (def.bundles) { const bn = obj(career.bn); return Math.min(bn ? Object.keys(bn).length : 0, def.bundles); }
  if (def.pass) return (obj(career.bp) || {}).prem === true ? 1 : 0;
  if (def.operators) return Math.min(Array.isArray(career.ops) ? career.ops.length : 0, def.operators);
  if (def.cosmetics) { const co = obj(career.cosOwned); return Math.min(co ? Object.keys(co).length : 0, def.cosmetics); }
  return 0;
}

// THE unlock sweep — ids in ACH_DEFS order, deterministic. Reads career.ach (the unlock
// record map) but NEVER writes it: achUnlock does the copy-on-write.
export function achEval(career) {
  const c = career && typeof career === 'object' ? career : {};
  const ach = obj(c.ach) || {};
  return ACH_DEFS.filter((def) => ach[def.id] == null && achMet(def, c)).map((def) => def.id);
}

// Copy-on-write unlock: returns { career, unlocked } — career is the SAME reference when
// nothing unlocked (zero-churn), a NEW object with the merged ach map otherwise.
export function achUnlock(career, now) {
  const c = (career && typeof career === 'object') ? career : {};
  const ids = achEval(c);
  const ts = (typeof now === 'number' && isFinite(now) && now > 0) ? now : 0;
  if (!ids.length) return { career: c, unlocked: [] };
  const ach = { ...(obj(c.ach) || {}) };
  for (const id of ids) ach[id] = ts;
  return { career: { ...c, ach }, unlocked: ids };
}

// UI view — per-def { id, tier, cur, goal, done } in table order (deterministic render).
export function achProgress(career) {
  const c = career && typeof career === 'object' ? career : {};
  const ach = obj(c.ach) || {};
  return ACH_DEFS.map((def) => ({
    id: def.id,
    tier: def.tier,
    cur: achCur(def, c),
    goal: def.kd ? def.kd : (def.goal != null ? def.goal : (def.weaponKills || def.variety?.weapons || def.bundles || def.operators || def.cosmetics || 1)),
    done: ach[def.id] != null,
  }));
}

// Unlocked count (the CAREER page head count + the catch-up probe).
export function achCount(career) {
  const ach = obj(career && career.ach);
  return ach ? ACH_DEFS.filter((def) => ach[def.id] != null).length : 0; // only VALID ids count (junk-in → ignored)
}

// Migration carry (the bpCarry idiom): keep valid unlock records, drop junk, stamp version.
export function achCarry(career) {
  const c = (career && typeof career === 'object') ? career : {};
  const ach = obj(c.ach) || {};
  const next = {};
  for (const def of ACH_DEFS) if (ach[def.id] != null) next[def.id] = ach[def.id];
  return { ...c, ach: next, achV: ACH_VERSION };
}
