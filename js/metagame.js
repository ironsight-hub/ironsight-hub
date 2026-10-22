// ============================================================
// IRONSIGHT — metagame.js (Lost-Ledger L4 · Task 89-a · rebuild of the
// rewind-lost Agent-E module, docs/REGRESSION_CHECK.md L4): EVENTS
// (limited-time themed events) + CHALLENGES (deterministic daily/weekly)
// + FEED (picker of which surface shows) + rewards paying CR (§53.2 soft
// currency) and BP XP (§62.5b). 52 contract exports, zero stubs, zero imports.
// T90 (v1.50 semantic-gap audit): the SHA-verified v1.50 original
// (scratch/vrestore/v150/js/metagame.js) was audited against this rebuild —
// additive ports live in L4.10 (career.bp season-key law + the v1.50 season
// reward table) and the persist shape gained the stats leg the main.js/ui.js
// contract already consumed ([T90 contract repair]).
//
// DETERMINISM LAW (the dailyFor mirror): every pick is a PURE function of
// the date string — hashOf(seed) lands the pick in-table exactly like
// config.js dailyFor ("same day = same pick"). No Date.now() anywhere in
// this module — the clock lives in the caller; new Date(dateStr) is the
// only construction (date-only ES parse = UTC midnight, TZ-stable).
//
// DEPENDENCY LAW: self-contained ESM — ZERO imports (not even config.js:
// provenance anchors are quoted in comments, never imported; i18n.js is
// NOT imported by law — every user-facing string is returned as a KEY and
// ui.js translates it via t(), per the L11 i18n fold).
//
// CONSUMER MAP (consumed-by-design — every export is claimed; T89 = the L4
// wiring increment that lands the main.js/ui.js hooks next):
//   main.js (T89 step 2 — MP-end EVP hook: challenge feed + EV_CH_REWARD
//   awards into the §53.2 CR wallet + §62.5b BP mirror):
//     evChallengesFor · EV_CH_REWARD · challengeDone · challengeProgress ·
//     evAwardLines · evRewardTotal · evAwardSummary · evsClaimable ·
//     evsClaim · evFeedTop · evFeedFor · evDayOf · evDailyKey · evWeeklyKey ·
//     migrateEvs · evChPersistShape · statOf · challengeRemaining ·
//     evProgressPct
//   ui.js (T89 step 3 — EVENTS/EVP page + BP pages, §55.1 card grammar):
//     EV_THEMES · evActive · evActiveIndex · evThemeOf · evThemeColors ·
//     evNextTheme · evEventWindowOf · evSurfaceLabelKey · evSurfaceColor ·
//     evI18nKeys · dailyChallengesFor · weeklyChallengesFor ·
//     evChallengeById · challengeMetric · evRewardFor
//   T90 v1.50-port block (ADDITIVE — see L4.10; nothing above changes):
//     bpSeasonState · migrateBp · BP_CHAPTERS · BP_TIERS_PER_CH · BP_TIERS ·
//     BP_TIER_CR · BP_FREE_CR · BP_DUPE_REFUND · BP_FREE_CHARMS · MG_ECO_POOL ·
//     BPX_FINISHES · PREMIUM_REWARDS · bpRewardFor · bpFreeChapterReward
//     [T94 v1.60 premium legs]: BP_PASS_PRICE · bpPassBuyable · bpPassBuy ·
//     bpClaimablePremium · bpClaimPremium
//   scripts/probe_t89_meta.mjs (the L4 self-test suite, 38-check class):
//     hashOf · lcgNext · pickSeeded · evChallengeSeed · isoDateOf · addDays ·
//     isoWeekOf · weekMonOf · EV_CH_KINDS · EV_CH_WINDOW · EV_CH_COUNT ·
//     EV_CH_POOL_DAILY · EV_CH_POOL_WEEKLY · EV_STATS · EV_FEED_PRIO ·
//     EV_KEY_PREFIX · EV_PERSIST_V · evsWindowRollover
//   (shared exports are listed under their PRIMARY consumer; the probe
//   exercises the whole surface regardless.)
// ============================================================

// ---------------- L4.1 namespace + window tables ----------------
export const EV_KEY_PREFIX = 'ev.'; // i18n namespace law — every key this module hands out starts here (L11 folds them into i18n.js ×9 locales)
export const EV_CH_KINDS = ['daily', 'weekly']; // the two challenge windows (closed set — kind is never anything else)
export const EV_CH_WINDOW = { // window-reset law: daily rolls at 04:00 LOCAL (evDayOf shifts the clock day back by dailyHour — a 02:00 match belongs to YESTERDAY's window); weekly rolls ISO-MONDAY (weeklyDow=1 on the getUTCDay Mon=1..Sun=7 scale, isoWeekOf single truth).
  dailyHour: 4,   // 04:00 local — genre-standard daily reset (SPEC DECISION, OUR-CONSTANT)
  weeklyDow: 1,   // Monday = ISO-8601 first day of week [ISO 8601 law]
  weeklyBaseTiers: [0, 0.25, 0.5], // deterministic pre-credited floor for WEEKLY challenges (base = fraction of goal seeded per item — the "start with progress" weekly pattern; dailies are base:0 always)
};
export const EV_CH_COUNT = { daily: 3, weekly: 3 }; // window shape law — 3 daily + 3 weekly (L5 MISSIONS parity: "3 daily + 3 weekly, deterministic")
export const EV_CH_REWARD = { // per-kind reward table — SINGLE TRUTH (items EMBED a copy at generation; consumers read either). Provenance: daily cr 50 == ECO_CLAIM.cr (§53.2 free-claim law); weekly 4× daily. BP: 250 == BP.per/4 and 1000 == BP.per (§62.5b, 1 tier) — OUR-CONSTANT, anchors quoted not imported.
  daily: { cr: 50, bp: 250 },
  weekly: { cr: 200, bp: 1000 },
};
export const EV_STATS = ['kills', 'wins', 'matches', 'headshots', 'xp']; // the ONLY metrics a challenge may measure — the stats object law (challengeProgress/statOf enforce membership; callers pass WINDOW-DELTA stats: lifetime minus the window snapshot persisted in career.evs)
export const EV_FEED_PRIO = { event: 0, daily: 10, weekly: 20 }; // feed sort law — lower prio shows first (event teaser, then today's daily, then this week's weekly)
export const EV_PERSIST_V = 1; // career.evs schema version (migrateEvs resets on mismatch — same reset law as the career.bp.s season key)

export const EV_THEMES = [ // 6 themed events, weekly rotation (evActiveIndex). Colors echo CFG.COLORS (quoted, not imported). key/desc are i18n KEYS (evI18nKeys hands them to ui.js → t()).
  { id: 'solarfire', key: 'ev.th.solarfire', desc: 'ev.th.solarfireD', color: '#ff5a3c' }, // CFG.COLORS.accentA
  { id: 'cryofront', key: 'ev.th.cryofront', desc: 'ev.th.cryofrontD', color: '#29d3ff' }, // CFG.COLORS.accentB
  { id: 'nightops',  key: 'ev.th.nightops',  desc: 'ev.th.nightopsD',  color: '#3fa7ff' }, // CFG.COLORS.allyHex
  { id: 'bloodrust', key: 'ev.th.bloodrust', desc: 'ev.th.bloodrustD', color: '#ff5252' }, // CFG.COLORS.enemyHex
  { id: 'sandstorm', key: 'ev.th.sandstorm', desc: 'ev.th.sandstormD', color: '#ffc38a' }, // CFG.COLORS.sun
  { id: 'ironforge', key: 'ev.th.ironforge', desc: 'ev.th.ironforgeD', color: '#b9bec6' }, // CFG.COLORS.concrete lifted for contrast
];

export const EV_CH_POOL_DAILY = [ // daily candidate table (8) — dailyChallengesFor seeded-picks 3. metric ∈ EV_STATS; key is the i18n face key.
  { id: 'dk10',   metric: 'kills',     goal: 10,   key: 'ev.ch.dk10' },
  { id: 'dk18',   metric: 'kills',     goal: 18,   key: 'ev.ch.dk18' },
  { id: 'dw1',    metric: 'wins',      goal: 1,    key: 'ev.ch.dw1' },
  { id: 'dw2',    metric: 'wins',      goal: 2,    key: 'ev.ch.dw2' },
  { id: 'dm3',    metric: 'matches',   goal: 3,    key: 'ev.ch.dm3' },
  { id: 'dh6',    metric: 'headshots', goal: 6,    key: 'ev.ch.dh6' },
  { id: 'dh10',   metric: 'headshots', goal: 10,   key: 'ev.ch.dh10' },
  { id: 'dx2500', metric: 'xp',        goal: 2500, key: 'ev.ch.dx2500' },
];
export const EV_CH_POOL_WEEKLY = [ // weekly candidate table (8) — bigger goals, same law
  { id: 'wk60',   metric: 'kills',     goal: 60,    key: 'ev.ch.wk60' },
  { id: 'wk100',  metric: 'kills',     goal: 100,   key: 'ev.ch.wk100' },
  { id: 'ww4',    metric: 'wins',      goal: 4,     key: 'ev.ch.ww4' },
  { id: 'ww7',    metric: 'wins',      goal: 7,     key: 'ev.ch.ww7' },
  { id: 'wm12',   metric: 'matches',   goal: 12,    key: 'ev.ch.wm12' },
  { id: 'wm15',   metric: 'matches',   goal: 15,    key: 'ev.ch.wm15' },
  { id: 'wh25',   metric: 'headshots', goal: 25,    key: 'ev.ch.wh25' },
  { id: 'wx12k',  metric: 'xp',        goal: 12000, key: 'ev.ch.wx12k' },
];

const SEED_SALT = 'is1'; // seed-epoch salt — decouples metagame picks from config.js dailyFor's raw-date hash domain (both laws can coexist without echoing each other's picks)
const CH_COLORS = { daily: '#29d3ff', weekly: '#3fa7ff' }; // challenge card colors (ui.js feed) — accentB/allyHex echoes, OUR-CONSTANT
const DAY_MS = 86400000;
const pad2 = (n) => String(n).padStart(2, '0');

// ---------------- L4.2 time law (pure; UTC for dateStr math, LOCAL only in evDayOf) ----------------
export function isoDateOf(ms) { // ms → 'YYYY-MM-DD' (UTC formatters — dateStr arithmetic single truth)
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

export function addDays(dateStr, n) { // dateStr + n days → dateStr (pure UTC hop; invalid input → '')
  const d = new Date(String(dateStr));
  if (isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + (Number(n) | 0));
  return isoDateOf(d.getTime());
}

export function isoWeekOf(dateStr) { // → { y, w, id } ISO-8601 week (weeks own their THURSDAY). W53 law on disk: 2027-01-01 → 2026-W53 (2026 opens on a Thursday = 53-week year).
  const t = new Date(String(dateStr));
  if (isNaN(t.getTime())) return { y: 0, w: 0, id: '' };
  const day = t.getUTCDay() || 7; // Mon=1..Sun=7 (Sun 0 → 7)
  t.setUTCDate(t.getUTCDate() + 4 - day); // snap to this week's Thursday
  const y = t.getUTCFullYear();
  const jan1 = Date.UTC(y, 0, 1);
  const w = Math.ceil(((t.getTime() - jan1) / DAY_MS + 1) / 7);
  return { y, w, id: y + '-W' + pad2(w) };
}

export function weekMonOf(dateStr) { // the MONDAY dateStr of the ISO week containing dateStr (weekly window anchor)
  const t = new Date(String(dateStr));
  if (isNaN(t.getTime())) return '';
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() - (day - 1));
  return isoDateOf(t.getTime());
}

export function evDayOf(d) { // challenge-day law: a timestamp before 04:00 LOCAL belongs to the PREVIOUS day's window (EV_CH_WINDOW.dailyHour). Accepts a Date or ms. This is the ONE local-clock surface — because the 04:00 reset is a local-time law by definition.
  const ms = d instanceof Date ? d.getTime() : Number(d);
  if (!isFinite(ms)) return '';
  const dt = new Date(ms - EV_CH_WINDOW.dailyHour * 3600000);
  return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
}

export function evDailyKey(dateStr) { // daily window key ('ev.d:YYYY-MM-DD') — persist window + seed single truth
  return EV_KEY_PREFIX + 'd:' + String(dateStr);
}

export function evWeeklyKey(dateStr) { // weekly window key ('ev.w:YYYY-Wnn') — persist window + seed single truth
  return EV_KEY_PREFIX + 'w:' + isoWeekOf(dateStr).id;
}

// ---------------- L4.3 seed law (the dailyFor mirror) ----------------
export function hashOf(s) { // mirrors config.js dailyFor: h = h*31 + charCodeAt, 32-bit unsigned — same seed string ⇒ same hash, everywhere, forever
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function lcgNext(h) { // one LCG step (Numerical-Recipes 1664525/1013904223) — the deterministic WALK on top of hashOf (dailyFor picks n=1 and needs no walk; 3-of-8 does)
  return (h * 1664525 + 1013904223) >>> 0;
}

export function pickSeeded(table, seedStr, n) { // n DISTINCT rows from table, purely from seedStr (used by dailyChallengesFor/weeklyChallengesFor — "same day = same pick" at n=3)
  const src = Array.isArray(table) ? table : [];
  const want = Math.max(0, Math.min(Number(n) | 0, src.length));
  const out = [];
  const used = new Set();
  let h = hashOf(seedStr);
  for (let guard = 0; out.length < want && guard < 64; guard++) { // 64-step deterministic walk (covers every residue class well within guard for |table| ≤ 64)
    h = lcgNext(h);
    const i = h % src.length;
    if (!used.has(i)) { used.add(i); out.push(src[i]); }
  }
  for (const row of src) { // deterministic completion walk — total function by law (never fires on the shipped pools)
    if (out.length >= want) break;
    if (out.indexOf(row) < 0) out.push(row);
  }
  return out;
}

export function evChallengeSeed(kind, dateStr) { // THE seed string single truth: 'is1|ev.d:DATE' / 'is1|ev.w:WEEK' — both pickers and the probe derive from this, never from a raw date
  return SEED_SALT + '|' + (kind === 'weekly' ? evWeeklyKey(dateStr) : evDailyKey(dateStr));
}

// ---------------- L4.4 challenges (deterministic per window) ----------------
export function dailyChallengesFor(dateStr) { // 3 daily items for the challenge-day — pure fn of dateStr
  const seed = evChallengeSeed('daily', dateStr);
  return pickSeeded(EV_CH_POOL_DAILY, seed, EV_CH_COUNT.daily).map((p) => ({
    id: p.id, kind: 'daily', metric: p.metric, goal: p.goal,
    base: 0, // dailies always start at floor 0 (EV_CH_WINDOW.weeklyBaseTiers is weekly-only)
    reward: { cr: EV_CH_REWARD.daily.cr, bp: EV_CH_REWARD.daily.bp }, // embedded copy of the single truth
    key: p.key,
  }));
}

export function weeklyChallengesFor(dateStr) { // 3 weekly items for the ISO week — pure fn of dateStr (ALL 7 days of a week yield the SAME three)
  const seed = evChallengeSeed('weekly', dateStr);
  return pickSeeded(EV_CH_POOL_WEEKLY, seed, EV_CH_COUNT.weekly).map((p) => {
    const tier = EV_CH_WINDOW.weeklyBaseTiers[hashOf(seed + '|' + p.id) % EV_CH_WINDOW.weeklyBaseTiers.length];
    return {
      id: p.id, kind: 'weekly', metric: p.metric, goal: p.goal,
      base: Math.round(p.goal * tier), // pre-credited floor (deterministic per week+item — the weekly "start with progress" law)
      reward: { cr: EV_CH_REWARD.weekly.cr, bp: EV_CH_REWARD.weekly.bp },
      key: p.key,
    };
  });
}

export function evChallengesFor(dateStr) { // THE main.js entrypoint (L4 recipe: "main.js needs evChallengesFor/EV_CH_REWARD from metagame.js") — { daily:[3], weekly:[3] }
  return { daily: dailyChallengesFor(dateStr), weekly: weeklyChallengesFor(dateStr) };
}

export function evChallengeById(dateStr, id) { // find a challenge by id across both kinds (feed deep-link; null when absent)
  const all = dailyChallengesFor(dateStr).concat(weeklyChallengesFor(dateStr));
  return all.find((ch) => ch.id === String(id)) || null;
}

export function challengeMetric(ch) { // the metric a challenge measures (EV_STATS member, or null for junk — ui.js renders the stat label from it)
  return ch && EV_STATS.indexOf(ch.metric) >= 0 ? ch.metric : null;
}

export function statOf(stats, metric) { // safe stat read — 0 unless stats[metric] is a finite number ≥ 0 (the window-delta stats law)
  if (!stats || EV_STATS.indexOf(metric) < 0) return 0;
  const v = stats[metric];
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0;
}

export function challengeProgress(ch, stats) { // PURE 0..1 clamp: (stat − base) / (goal − base) — base is the pre-credited floor baked into ch at generation
  if (!ch) return 0;
  const goal = Number(ch.goal) | 0;
  const base = Number(ch.base) | 0;
  const span = Math.max(1, goal - base); // span floor 1 — goal==base can never divide-by-zero (pools guarantee goal > base; junk input clamps to 0)
  const v = (statOf(stats, ch.metric) - base) / span;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function challengeDone(ch, stats) { // done ⇔ the raw stat reached the FULL goal (base only pre-credits progress, never completion)
  return !!ch && statOf(stats, ch.metric) >= (Number(ch.goal) | 0);
}

export function challengeRemaining(ch, stats) { // integer copy for HUD rows: how much of the goal is still missing
  if (!ch) return 0;
  return Math.max(0, (Number(ch.goal) | 0) - Math.floor(statOf(stats, ch.metric)));
}

export function evProgressPct(ch, stats) { // integer 0..100 for ui.js progress bars — the only rounding surface (progress stays pure)
  return Math.round(challengeProgress(ch, stats) * 100);
}

// ---------------- L4.5 rewards (CR §53.2 + BP XP §62.5b) ----------------
export function evRewardFor(ch) { // fresh {cr,bp} copy from the EV_CH_REWARD single truth (never hands out ch.reward itself)
  if (!ch || !EV_CH_REWARD[ch.kind]) return { cr: 0, bp: 0 };
  return { cr: EV_CH_REWARD[ch.kind].cr, bp: EV_CH_REWARD[ch.kind].bp };
}

export function evRewardTotal(chs) { // sum a challenge list's embedded rewards (window potential)
  let cr = 0, bp = 0;
  for (const ch of Array.isArray(chs) ? chs : []) {
    if (!ch || !ch.reward) continue;
    cr += ch.reward.cr | 0;
    bp += ch.reward.bp | 0;
  }
  return { cr, bp };
}

export function evAwardLines(chs, stats) { // receipt for the MP-end hook — ONLY done challenges: [{ id, kind, cr, bp }] (main.js awards these + toasts the lines)
  return (Array.isArray(chs) ? chs : [])
    .filter((ch) => challengeDone(ch, stats))
    .map((ch) => ({ id: ch.id, kind: ch.kind, cr: ch.reward.cr, bp: ch.reward.bp }));
}

export function evAwardSummary(dateStr) { // whole-window award potential {cr,bp} over all 6 (career page "available this window" row)
  const all = evChallengesFor(dateStr);
  return evRewardTotal(all.daily.concat(all.weekly));
}

// ---------------- L4.6 events (weekly themed rotation) ----------------
export function evActiveIndex(dateStr) { // rotation single truth — hash of the WEEKLY window key lands in EV_THEMES (evActive = EV_THEMES[evActiveIndex]; weekly dwell, anchored to the ISO-week law)
  return hashOf(evWeeklyKey(dateStr)) % EV_THEMES.length;
}

export function evActive(dateStr) { // the active EV_THEME for a date — deterministic (same date ⇒ same theme, forever)
  return EV_THEMES[evActiveIndex(dateStr)];
}

export function evThemeOf(id) { // theme lookup by id (feed cards / deep-links; null-safe)
  return EV_THEMES.find((th) => th.id === String(id)) || null;
}

export function evThemeColors() { // fresh { id: color } map every call — ui.js injects card/border colors without ever mutating EV_THEMES internals
  const m = {};
  for (const th of EV_THEMES) m[th.id] = th.color;
  return m;
}

export function evEventWindowOf(dateStr) { // the active event's run: Monday→Sunday of its ISO week (an event IS its week — evEventWindowOf and evActive always agree)
  const start = weekMonOf(dateStr);
  return { start, end: addDays(start, 6) };
}

export function evNextTheme(dateStr) { // NEXT week's theme — the "up next" teaser card (ui.js EVENTS page footer)
  return evActive(addDays(weekMonOf(dateStr), 7));
}

// ---------------- L4.7 feed (which surface shows) ----------------
export function evFeedFor(dateStr) { // ordered surfaces for the date: weekly event teaser first, then the FIRST daily, then the FIRST weekly (prio law EV_FEED_PRIO). ui.js renders in order; main.js EVP hook takes the top.
  const th = evActive(dateStr);
  const chs = evChallengesFor(dateStr);
  return [
    { type: 'event', id: th.id, prio: EV_FEED_PRIO.event },
    { type: 'challenge', id: chs.daily[0].id, prio: EV_FEED_PRIO.daily },
    { type: 'challenge', id: chs.weekly[0].id, prio: EV_FEED_PRIO.weekly },
  ];
}

export function evFeedTop(dateStr) { // the ONE surface the MP-end EVP hook shows first (evFeedFor[0] single truth)
  return evFeedFor(dateStr)[0];
}

export function evSurfaceLabelKey(s, dateStr) { // i18n KEY of a surface (event → its theme key; challenge → its ch key). ui.js: t(evSurfaceLabelKey(s, dateStr)). Unknown/junk → the generic feed key (never an empty label).
  if (!s) return EV_KEY_PREFIX + 'feed';
  if (s.type === 'event') {
    const th = evThemeOf(s.id);
    return th ? th.key : EV_KEY_PREFIX + 'feed';
  }
  const ch = dateStr ? evChallengeById(dateStr, s.id) : null;
  return ch ? ch.key : EV_KEY_PREFIX + 'feed';
}

export function evSurfaceColor(s, dateStr) { // card color law: event surfaces wear their theme color; challenge surfaces wear their kind color (CH_COLORS)
  if (!s) return '';
  if (s.type === 'event') {
    const th = evThemeOf(s.id);
    return th ? th.color : '';
  }
  const ch = dateStr ? evChallengeById(dateStr, s.id) : null;
  return ch ? (CH_COLORS[ch.kind] || '') : '';
}

// ---------------- L4.8 persist (career.evs — best-effort store law, history.js §52.1 analog) ----------------
const evStatsFresh = () => { const m = {}; for (const k of EV_STATS) m[k] = 0; return m; }; // [T90 contract repair] zero counters in EV_STATS order — a window opens at floor 0
const evStatsSanitize = (raw) => { // [T90 contract repair] copy-on-write stats normalize: EV_STATS keys only, finite non-negative integers, junk → 0 (never trusts a persisted counter)
  const out = evStatsFresh();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const k of EV_STATS) { const v = raw[k]; if (typeof v === 'number' && isFinite(v) && v > 0) out[k] = Math.floor(v); }
  return out;
};

export function evChPersistShape() { // DOCUMENTED shape of career.evs (the store main.js owns; ui.js reads). Real self-consistent example values — the LAW, not a stub: v versions the schema; d/w are the window keys (reset-on-mismatch); claimed holds ch ids per kind.
  return {
    v: EV_PERSIST_V,
    d: '2026-10-12',                          // evDailyKey window the state belongs to (challenge-day, evDayOf law)
    w: isoWeekOf('2026-10-12').id,            // evWeeklyKey window (computed — always self-consistent with d)
    claimed: { daily: [], weekly: [] },       // claimed challenge ids per kind (progress itself is NEVER persisted — it recomputes from window-delta stats; persisting derivable state would drift)
    stats: evStatsFresh(),                    // [T90 contract repair] the WINDOW-ACCUMULATED end-measurable counters: main.js recordHistoryAndDaily does es.kills += … per match end (main.js:684 reads career.evs.stats) and ui.js renderMissions reads the same object for challengeProgress; a window rollover resets the WHOLE shape incl. stats (main.js:687 law). Raw counters ≠ challenge progress — the never-persist-progress law stands.
    ms: [],                                   // [T91] claimed milestone ids (EV_MILESTONES row ids — static table, 8 rows, weekly scope; claims die with the window like every other field here)
    store: { t: 0 },                          // [T91] event-store tiers bought THIS window (cap-7 law: t + sku.tiers ≤ EV_STORE_CAP; resets with the window — the Apex "buy up to seven battle pass levels" cap is PER EVENT)
  };
}

export function evsWindowRollover(state, curDay, curWeek) { // true when persisted state belongs to a CLOSED window (version/key mismatch) — the single truth migrateEvs and the main.js boot check share
  if (!state || typeof state !== 'object') return true;
  if (state.v !== EV_PERSIST_V) return true;
  if (typeof curDay !== 'string' || typeof curWeek !== 'string') return true;
  return state.d !== curDay || state.w !== curWeek;
}

export function migrateEvs(raw, curDay, curWeek) { // safe parse of persisted career.evs — NEVER throws, never trusts: junk → fresh; junk claimed ids stripped/deduped/capped; window mismatch → fresh (the career.bp.s season-key reset law: claims die with their window, never leak across)
  const fresh = (d, w) => ({ v: EV_PERSIST_V, d: String(d || ''), w: String(w || ''), claimed: { daily: [], weekly: [] }, ms: [], store: { t: 0 } });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fresh(curDay, curWeek);
  const clean = (arr) => Array.isArray(arr) ? [...new Set(arr.filter((x) => typeof x === 'string'))].slice(0, EV_CH_POOL_DAILY.length + EV_CH_POOL_WEEKLY.length) : [];
  const out = fresh(typeof raw.d === 'string' ? raw.d : curDay, typeof raw.w === 'string' ? raw.w : curWeek);
  out.claimed.daily = clean(raw.claimed && raw.claimed.daily);
  out.claimed.weekly = clean(raw.claimed && raw.claimed.weekly);
  out.stats = evStatsSanitize(raw.stats); // [T90 contract repair] a valid raw carries its sanitized window counters through the parse (the junk/rollover paths return the exact 4-field fresh — counters die with their window, same law as claims)
  // [T91] additive T91 fields — old v1.55/v1.56 states (no ms/store) parse to the defaults: backward-compatible, EV_PERSIST_V stays 1
  out.ms = Array.isArray(raw.ms) ? [...new Set(raw.ms.filter((x) => typeof x === 'string' && EV_MILESTONES.some((m) => m.id === x)))].slice(0, EV_MILESTONES.length) : []; // junk ids stripped against the static table, deduped, capped at 8
  const st = raw.store;
  out.store = { t: (st && typeof st === 'object' && typeof st.t === 'number' && isFinite(st.t)) ? Math.min(EV_STORE_CAP, Math.max(0, Math.floor(st.t))) : 0 }; // floored 0..7 — junk → 0, over-cap → clamp (never trust, never throw)
  if (curDay && evsWindowRollover(raw, String(curDay), String(curWeek))) return fresh(curDay, curWeek); // rollover reads the RAW state — a version/window mismatch in what was PERSISTED is what closes the window
  return out;
}

export function evsClaimable(ch, stats, state) { // claim gate: done + in the CURRENT window + not already claimed
  if (!ch || !state || !state.claimed) return false;
  const claimed = state.claimed[ch.kind];
  if (!Array.isArray(claimed) || claimed.indexOf(ch.id) >= 0) return false;
  return challengeDone(ch, stats);
}

export function evsClaim(ch, stats, state) { // PURE claim: returns { state, reward } with the id appended (input untouched), or null when not claimable — main.js persists state and credits reward via the §53.2/§62.5b mirrors
  if (!evsClaimable(ch, stats, state)) return null;
  const claimed = {
    daily: (state.claimed.daily || []).slice(),
    weekly: (state.claimed.weekly || []).slice(),
  };
  claimed[ch.kind].push(ch.id);
  return {
    state: { v: EV_PERSIST_V, d: state.d, w: state.w, claimed, stats: evStatsSanitize(state.stats), ms: evMsSanitize(state.ms), store: { t: evStoreBought(state) } }, // [T90 contract repair] stats ride the claim copy-on-write — dropping them here would blank the window counters at the FIRST claim (main.js accumulates into the very shape ui.js claims from) · [T91] ms/store ride the same copy-on-write
    reward: { cr: ch.reward.cr, bp: ch.reward.bp },
  };
}

// ---------------- [T91 v1.57] N3-completion (milestones + event store) + N4 bundle rotation ----------------
// FM rows N3/N4 (v1.50 addendum, byte-true): "14-day window, 3 daily challenges, 8 milestones,
// event store (BP skips cap-7 verbatim)" · "Bundle rotation: 2×14d windows, 5 curated items,
// Σ×0.7 pricing". SUPERSESSION NOTE: the v1.50 14-day event window is superseded by the
// needle-pinned weekly ISO-week event law (Task 89 evEventWindowOf; T75/T89 probes pin it) —
// milestones + store ride the WEEKLY window (claims die with it, migrateEvs law). FM annotated.

export const EV_MILESTONES = [ // 8 per event week (FM N3 verbatim count) — STATIC single-truth table (PREMIUM_REWARDS idiom: season gates progression, never contents). metric ∈ EV_STATS; goals escalate per metric; rewards escalate (OUR-CONSTANTS anchored: EV_CH_REWARD.weekly {cr:200,bp:1000} is the per-challenge ceiling — milestones are the week's BIG goals; bp 2000 = 2 tiers of BP.per=1000, §62.5b)
  { id: 'ms1', metric: 'matches',   goal: 3,    cr: 100, bp: 250 },
  { id: 'ms2', metric: 'kills',     goal: 15,   cr: 100, bp: 250 },
  { id: 'ms3', metric: 'wins',      goal: 2,    cr: 150, bp: 500 },
  { id: 'ms4', metric: 'kills',     goal: 40,   cr: 150, bp: 500 },
  { id: 'ms5', metric: 'xp',        goal: 5000, cr: 200, bp: 1000 },
  { id: 'ms6', metric: 'headshots', goal: 20,   cr: 200, bp: 1000 },
  { id: 'ms7', metric: 'kills',     goal: 100,  cr: 300, bp: 1500 },
  { id: 'ms8', metric: 'wins',      goal: 8,    cr: 400, bp: 2000 },
];

export function evMsSanitize(arr) { // sanitize a claimed-ms list (migrateEvs/evsClaim share) — junk-safe, deduped, table-membership enforced, capped at 8
  return Array.isArray(arr) ? [...new Set(arr.filter((x) => typeof x === 'string' && EV_MILESTONES.some((m) => m.id === x)))].slice(0, EV_MILESTONES.length) : [];
}

export function evMilestoneDone(ms, stats) { // done ⇔ the window-delta counter reached the goal (statOf junk-safe law — same read as challenges); junk ms row → false (never guess)
  if (!ms || typeof ms.goal !== 'number') return false; // [T91 probe defect fix] `0 >= null` coerces true — the null-ms guard is load-bearing
  return statOf(stats, ms.metric) >= ms.goal;
}

export function evMilestoneClaimable(ms, stats, state) { // claim gate: done + not already claimed (milestones are window-scoped — the window IS the membership test, no key read needed)
  return !!ms && !!state && Array.isArray(state.ms) && !state.ms.includes(ms.id) && evMilestoneDone(ms, stats);
}

export function evMilestoneClaim(ms, stats, state) { // PURE claim (evsClaim idiom): { state, reward } with the id appended, input untouched, null when not claimable
  if (!evMilestoneClaimable(ms, stats, state)) return null;
  return {
    state: { v: EV_PERSIST_V, d: state.d, w: state.w, claimed: { daily: (state.claimed && state.claimed.daily || []).slice(), weekly: (state.claimed && state.claimed.weekly || []).slice() }, stats: evStatsSanitize(state.stats), ms: evMsSanitize([...(state.ms || []), ms.id]), store: { t: evStoreBought(state) } },
    reward: { cr: ms.cr, bp: ms.bp },
  };
}

export const EV_STORE_CAP = 7; // "Players can buy up to seven battle pass levels via the new event store" — m_05 verbatim (research/m_05.json [1]); the cap counts TIERS bought per event window, enforced in evStoreBuyable
export const EV_STORE_SKUS = [ // 3 BP-skip SKUs — OUR-CONSTANT pricing: per-tier base = BP_TIER_CR×2 = 300 CR (BP_TIER_CR=150 is the v1.50 payout anchor, quoted not used — zero-import); multi-packs carry the FM N4 Σ×0.7 law (5×300×0.7=1050, 10×300×0.7=2100)
  { id: 'skip1',  tiers: 1,  cr: 300 },
  { id: 'skip5',  tiers: 5,  cr: 1050 },
  { id: 'skip10', tiers: 10, cr: 2100 },
];

export function evStoreBought(state) { // tiers bought this window — junk-safe read (the single truth migrateEvs/evsClaim/renderEvents share)
  const st = state && state.store;
  return (st && typeof st === 'object' && typeof st.t === 'number' && isFinite(st.t)) ? Math.min(EV_STORE_CAP, Math.max(0, Math.floor(st.t))) : 0;
}

export function evStoreSkuById(id) { return EV_STORE_SKUS.find((s) => s.id === id) || null; } // junk-safe lookup (renderEvents delegation; null → no-op)

export function evStoreBuyable(sku, state) { // cap-7 verbatim: bought + sku.tiers ≤ 7 — the ONLY gate besides the CR check the caller owns
  return !!sku && evStoreBought(state) + sku.tiers <= EV_STORE_CAP;
}

export function evStoreBuy(sku, state) { // PURE buy (evsClaim idiom): { state, tiers } with the counter bumped, input untouched, null when the cap forbids — caller debits CR and credits BP.per×tiers via the §62.5b mirror
  if (!evStoreBuyable(sku, state)) return null;
  return {
    state: { v: EV_PERSIST_V, d: state.d, w: state.w, claimed: { daily: (state.claimed && state.claimed.daily || []).slice(), weekly: (state.claimed && state.claimed.weekly || []).slice() }, stats: evStatsSanitize(state.stats), ms: evMsSanitize(state.ms), store: { t: evStoreBought(state) + sku.tiers } },
    tiers: sku.tiers,
  };
}

// ---- N4 bundle rotation (FM N4 verbatim: 2×14d windows, 5 curated items, Σ×0.7 pricing) ----
// BLOCK MOVED TO END-OF-FILE [T91]: BN_CATALOG spreads MG_ECO_POOL/BPX_FINISHES at module
// top level — the spread is init-time, so the block must sit AFTER those consts (TDZ law).

// ---------------- L4.9 i18n key surface (KEYS ONLY — i18n.js is never imported) ----------------
export function evI18nKeys(ev, dateStr) { // the key list a metagame page must render: page chrome + the theme's faces; with dateStr also the 6 live challenge faces + kind labels. ui.js renders t(key) for each (EN fallback §48.2 until the L11 fold).
  const keys = [
    EV_KEY_PREFIX + 'feed', EV_KEY_PREFIX + 'active', EV_KEY_PREFIX + 'ends',
    EV_KEY_PREFIX + 'claim', EV_KEY_PREFIX + 'claimed', EV_KEY_PREFIX + 'reward',
  ];
  if (ev && ev.key) keys.push(ev.key, ev.desc);
  if (dateStr) {
    const chs = evChallengesFor(dateStr);
    for (const ch of chs.daily.concat(chs.weekly)) keys.push(ch.key);
    keys.push(EV_KEY_PREFIX + 'kind.daily', EV_KEY_PREFIX + 'kind.weekly');
  }
  return keys;
}

// ---------------- L4.10 [v1.50 port T90] BP season-key law + season reward table ----------------
// Source of truth: the SHA-verified v1.50 original (scratch/vrestore/v150/js/metagame.js,
// Task 75-E), audited against this rebuild at T90. Everything in this section is ADDITIVE:
// the 52-export contract surface, the deterministic window law and the pinned EV_CH_REWARD
// CR+BP reward law are untouched. Zero imports holds — config anchors are mirrored/quoted
// with sync notes, the same idiom the v1.50 module used for its ECO pool mirror.

// ---- career.bp season-key law (v1.50 bpState/initBp, ported onto the CURRENT {x, s} shape) ----
// v1.50 law verbatim: the BP subtree is keyed by season — a stale/absent key reads as a FRESH
// pass (XP dies with its season) and every reader sanitizes (xp must be a finite ≥0 number).
// v1.50 carried that on {s, xp, prem, claimed}; the live v1.55 shape is {x, s} (the inline
// main.js:675 / ui.js:298 reset law). [T94 v1.60] the premium-purchase/claim legs are now
// ADOPTED on the live shape — bp.prem (pass ownership, dies with its season like every BP
// field) + claims.premium (tier set) join claims.free; EVERY writer returns the FULL
// canonical shape via bpCarry (the carry law: a pass buy survives a free claim and vice
// versa — T93's {x, s, claims:{free}} rebuild would have dropped a bought pass).
export function bpSeasonState(career, seasonId) { // pure READ: keyed-right → sanitized {s, x}; absent/stale/junk → fresh {x:0}. Never mutates; seasonId is injected (the clock stays with the caller — determinism law).
  const s = String(seasonId === undefined || seasonId === null ? '' : seasonId);
  const bp = (career && typeof career === 'object' && career.bp && typeof career.bp === 'object' && career.bp.s === s) ? career.bp : null;
  const x = (bp && typeof bp.x === 'number' && isFinite(bp.x) && bp.x > 0) ? Math.floor(bp.x) : 0;
  return { s, x };
}

export function migrateBp(raw, seasonId) { // pure canonicalize of persisted career.bp — never throws, never mutates: junk → fresh; STALE season key → fresh {x:0} (the v1.50 initBp law, the exact reset main.js:675 enforces inline); x sanitized to a floored finite ≥0. [T93] claims ride the canonicalize (junk-safe chapter set; stale season kills claims with the window — the claims-die-with-the-window law). [T94] prem + claims.premium ride the same canonicalize (prem must be EXACTLY true — junk/absent → false; premium tier set bounded 1..BP_TIERS)
  const s = String(seasonId === undefined || seasonId === null ? '' : seasonId);
  const shaped = !!raw && typeof raw === 'object' && !Array.isArray(raw);
  const stale = !shaped || raw.s !== s;
  const x = (!stale && typeof raw.x === 'number' && isFinite(raw.x) && raw.x > 0) ? Math.floor(raw.x) : 0;
  const prem = !stale && raw.prem === true;
  const claims = (!stale && raw.claims && typeof raw.claims === 'object') ? raw.claims : {};
  const free = Array.isArray(claims.free)
    ? [...new Set(claims.free.map(Number).filter((n) => n >= 1 && n <= BP_CHAPTERS))].sort((a, b) => a - b)
    : [];
  const premium = Array.isArray(claims.premium)
    ? [...new Set(claims.premium.map(Number).filter((n) => n >= 1 && n <= BP_TIERS))].sort((a, b) => a - b)
    : [];
  return { x, s, prem, claims: { free, premium } };
}

function bpCarry(bp, prem, free, premium) { // [T94] PRIVATE copy-carry — every BP writer returns the FULL canonical shape (the carry law: a pass buy must survive a free claim and vice versa; the T93 {x,s,claims:{free}} rebuild would have dropped a bought pass)
  return {
    x: (bp && typeof bp.x === 'number' && isFinite(bp.x)) ? Math.floor(bp.x) : 0,
    s: bp ? bp.s : undefined,
    prem: !!prem,
    claims: { free, premium },
  };
}

export const BP_PASS_PRICE = 1000; // [T94] SPEC_UI_META N1 verbatim: "premium 1000 CR (no real-money leg, T2-5 law)" — CR-only buyout, dies with its season (the reset law)

export function bpPassBuyable(bp, cr) { // [T94] has-pass gate: unowned + affordable — the CR debit stays with the caller (evStoreBuy idiom); junk bp → false
  if (!bp || typeof bp !== 'object') return false;
  if (bp.prem === true) return false;
  const c = Number(cr);
  return isFinite(c) && c >= BP_PASS_PRICE;
}

export function bpPassBuy(bp, cr) { // [T94] PURE pass buy (evStoreBuy idiom): { bp, cost } copy-on-write — prem flips true, claims ride through UNTOUCHED (the carry law); null when the gate forbids. Caller debits cost and persists.
  if (!bpPassBuyable(bp, cr)) return null;
  const claims = (bp.claims && typeof bp.claims === 'object') ? bp.claims : {};
  const free = Array.isArray(claims.free) ? claims.free.slice() : [];
  const premium = Array.isArray(claims.premium) ? claims.premium.slice() : [];
  return { bp: bpCarry(bp, true, free, premium), cost: BP_PASS_PRICE };
}

// ---- the v1.50 season reward table (authored content, verbatim) ----
// GEOMETRY NOTE (T96 v1.62 — the integrator call is MADE): the live BP XP mirror is §62.5b —
// config.js BP {tiers:50, per:1000} + bpOf owns every tier row ui.js renders, and the LIVE
// geometry is the v1.50-AUTHORED 10×5 chaptered shape _02 verbatim: "10 Chapters, where
// each Chapter contains 5 Premium tiers and rewards a free Chapter completion"]. [T96
// chaptered re-land] BP.tiers 30→50: the table below graduates from reference data to THE
// live claim content (the T90 "re-anchor then" call, adopted by the T94 claim pass) —
// rows 31-50 render + claim, free chapters 7-10 join the track (rotation wrap + dupe
// conversion verbatim), event-store skips reach tier 31+. XP economics unchanged (per:1000;
// §60.4's 750+25·t stays the documented OUR-CONSTANT tension).
export const BP_CHAPTERS = 12;      // [v1.50 port T90] [m_02 verbatim]
export const BP_TIERS_PER_CH = 5;   // [v1.50 port T90] [m_02 verbatim]
export const BP_TIERS = 60;         // [T155 R33] 50→60 = 12 × 5 (config BP.tiers walks WITH the mirror — the sync law) · was: 10 × 5 [m_02 verbatim]
export const BP_TIER_CR = 150;      // [v1.50 port T90] CR payout at every 5th premium tier (10 payouts/season)
export const BP_FREE_CR = 100;      // [v1.50 port T90] free chapter-completion CR
export const BP_DUPE_REFUND = 40;   // [v1.50 port T90] mirror of config.js ECO_DUPE_REFUND (zero-import law: quoted, never imported — keep in sync)
export const BP_FREE_CHARMS = ['dogtag', 'luckydie', 'voidorb', 'goldshell']; // [v1.50 port T90] free-track charm rotation — real ECO_POOL ids, chapters 1-4 then repeat+convert (verified 1:1 vs the live cosmetics.js pool at T90)

export const MG_ECO_POOL = [ // [v1.50 port T90] the v1.50 mirror of cosmetics.js ECO_POOL (24 rows since T93; id/label/r/d verified 1:1 against the live pool — the zero-import law forbids the import, the mirror IS the v1.50 idiom). [T93 mirror repair] the T90-c camo ladder joined ECO_POOL (20→24) after the T90 mirror froze — the 4 camo rows below close the drift; BN_CATALOG 40→44 · [T155] the R32 waves joined (24→36): the 8 finishes + 4 charms below keep the mirror 1:1
  { id: 'fieldcoat',    label: 'FIELD COAT',    r: 'common',    d: 'fin' },
  { id: 'desertfade',   label: 'DESERT FADE',   r: 'rare',      d: 'fin' },
  { id: 'rustbelt',     label: 'RUST BELT',     r: 'common',    d: 'fin' },
  { id: 'arctic',       label: 'ARCTIC',        r: 'rare',      d: 'fin' },
  { id: 'embers',       label: 'EMBERS',        r: 'epic',      d: 'fin' },
  { id: 'deepvoid',     label: 'DEEP VOID',     r: 'legendary', d: 'fin' },
  { id: 'goldstandard', label: 'GOLD STANDARD', r: 'legendary', d: 'fin' },
  { id: 'ironmark',     label: 'IRON MARK',     r: 'epic',      d: 'fin' },
  { id: 'dogtag',       label: 'DOG TAG',       r: 'common',    d: 'ch' },
  { id: 'luckydie',     label: 'LUCKY DIE',     r: 'rare',      d: 'ch' },
  { id: 'voidorb',      label: 'VOID ORB',      r: 'epic',      d: 'ch' },
  { id: 'goldshell',    label: 'GOLD SHELL',    r: 'legendary', d: 'ch' },
  // [T155 R32] the 8-deep finish wave + the 4-deep charm wave — 1:1 with cosmetics.js (id/label/r/d)
  { id: 'ghostgrey',    label: 'GHOST GREY',    r: 'common',    d: 'fin' },
  { id: 'topride',      label: 'TOP RIDE',      r: 'rare',      d: 'fin' },
  { id: 'frostbite',    label: 'FROSTBITE',     r: 'rare',      d: 'fin' },
  { id: 'nightfall',    label: 'NIGHTFALL',     r: 'epic',      d: 'fin' },
  { id: 'bloodline',    label: 'BLOODLINE',     r: 'epic',      d: 'fin' },
  { id: 'steelrain',    label: 'STEEL RAIN',    r: 'legendary', d: 'fin' },
  { id: 'royalsun',     label: 'ROYAL SUN',     r: 'legendary', d: 'fin' },
  { id: 'voidopal',     label: 'VOID OPAL',     r: 'legendary', d: 'fin' },
  { id: 'ironround',    label: 'IRON ROUND',    r: 'common',    d: 'ch' },
  { id: 'warcandy',     label: 'WAR CANDY',     r: 'epic',      d: 'ch' },
  { id: 'stormtag',     label: 'STORM TAG',     r: 'epic',      d: 'ch' },
  { id: 'suncore',      label: 'SUN CORE',      r: 'legendary', d: 'ch' },
  { id: 'ion',          label: 'ION WAKE',      r: 'common',    d: 'tr' },
  { id: 'ember',        label: 'EMBER WAKE',    r: 'rare',      d: 'tr' },
  { id: 'venom',        label: 'VENOM WAKE',    r: 'epic',      d: 'tr' },
  { id: 'gold',         label: 'GOLD WAKE',     r: 'legendary', d: 'tr' },
  { id: 'gg',           label: 'GG',            r: 'common',    d: 'em' },
  { id: 'taunt',        label: 'TAUNT',         r: 'rare',      d: 'em' },
  { id: 'salute',       label: 'SALUTE',        r: 'epic',      d: 'em' },
  { id: 'flex',         label: 'FLEX',          r: 'legendary', d: 'em' },
  { id: 'camo-sand',    label: 'SAND',          r: 'epic',      d: 'fin' },  // [T93 mirror repair] ×4 — ECO_POOL grew 20→24 at T90-c; the mirror froze at 20
  { id: 'camo-jungle',  label: 'JUNGLE',        r: 'epic',      d: 'fin' },
  { id: 'camo-digital', label: 'DIGITAL',       r: 'legendary', d: 'fin' },
  { id: 'camo-gold',    label: 'GOLD',          r: 'legendary', d: 'fin' },
  { id: "olivetan", label: "OLIVE TAN", r: "common", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "slatecoat", label: "SLATE COAT", r: "common", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "emberline", label: "EMBER LINE", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "tundra", label: "TUNDRA", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "jadeband", label: "JADE BAND", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "copperhead", label: "COPPERHEAD", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "midnight2", label: "MIDNIGHT II", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "sunspire", label: "SUN SPIRE", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "toxicfold", label: "TOXIC FOLD", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "crimsonfold", label: "CRIMSON FOLD", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "cobaltring", label: "COBALT RING", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "duneveil", label: "DUNE VEIL", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "arcticveil", label: "ARCTIC VEIL", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "obsidianrim", label: "OBSIDIAN RIM", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "royalplum", label: "ROYAL PLUM", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "titaniumx", label: "TITANIUM X", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "riftline", label: "RIFT LINE", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "solarcrown", label: "SOLAR CROWN", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "abyssglow", label: "ABYSS GLOW", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "ironvein", label: "IRON VEIN", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "brassround", label: "BRASS ROUND", r: "common", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "slatetag", label: "SLATE TAG", r: "common", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "venomdie", label: "VENOM DIE", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "frosttag", label: "FROST TAG", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "emberorb", label: "EMBER ORB", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "voidshell", label: "VOID SHELL", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "golddie", label: "GOLD DIE", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "titanorb", label: "TITAN ORB", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "toxic", label: "TOXIC WAKE", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "violet", label: "VIOLET WAKE", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "azure", label: "AZURE WAKE", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "solar", label: "SOLAR WAKE", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "wave", label: "WAVE", r: "common", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "ggs", label: "GGS", r: "common", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "threat", label: "THREAT", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "focus", label: "FOCUS", r: "rare", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "domin", label: "DOMIN", r: "epic", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
  { id: "legend", label: "LEGEND", r: "legendary", d: undefined }, // [T161 R32] mirror wave — 1:1 with cosmetics.js ECO_POOL
];

export const BPX_FINISHES = [ // [v1.50 port T90] authored BP-exclusive premium finishes (EN labels inline — §48.7 proper-noun law; v1.50 verbatim, 20 rows)
  { id: 'bpx_tidebreaker',  label: 'TIDE BREAKER',     r: 'epic' },
  { id: 'bpx_ghostlattice', label: 'GHOST LATTICE',    r: 'legendary' },
  { id: 'bpx_emberfall',    label: 'EMBERFALL',        r: 'epic' },
  { id: 'bpx_vectorprism',  label: 'VECTOR PRISM',     r: 'legendary' },
  { id: 'bpx_duneshadow',   label: 'DUNE SHADOW',      r: 'epic' },
  { id: 'bpx_frostbite',    label: 'FROSTBITE',        r: 'legendary' },
  { id: 'bpx_solargrain',   label: 'SOLAR GRAIN',      r: 'epic' },
  { id: 'bpx_nighthaze',    label: 'NIGHT HAZE',       r: 'legendary' },
  { id: 'bpx_carbonrite',   label: 'CARBON RITE',      r: 'epic' },
  { id: 'bpx_ionstorm',     label: 'ION STORM',        r: 'legendary' },
  { id: 'bpx_voidstripe',   label: 'VOID STRIPE',      r: 'epic' },
  { id: 'bpx_sandblast',    label: 'SANDBLAST',        r: 'legendary' },
  { id: 'bpx_neontracer',   label: 'NEON TRACER',      r: 'epic' },
  { id: 'bpx_arcticfrac',   label: 'ARCTIC FRACTURE',  r: 'legendary' },
  { id: 'bpx_coppervein',   label: 'COPPER VEIN',      r: 'epic' },
  { id: 'bpx_slatedrift',   label: 'SLATE DRIFT',      r: 'legendary' },
  { id: 'bpx_pulsegrid',    label: 'PULSE GRID',       r: 'epic' },
  { id: 'bpx_onyxfade',     label: 'ONYX FADE',        r: 'legendary' },
  { id: 'bpx_aurumedge',    label: 'AURUM EDGE',       r: 'epic' },
  { id: 'bpx_ironiris',     label: 'IRON IRIS',        r: 'legendary' },
];

export const PREMIUM_REWARDS = (() => { // [v1.50 port T90] the 50-row static single-truth table — v1.50 law: season gates progression/claims, NEVER table contents; every 5th tier = CR, odd tiers walk the eco pool, even tiers walk the finishes
  const out = []; let k1 = 0, k2 = 0;
  for (let t = 1; t <= BP_TIERS; t++) {
    if (t % BP_TIERS_PER_CH === 0) out.push({ type: 'cr', n: BP_TIER_CR });
    else if (t % 2 === 1) { const p = MG_ECO_POOL[k1++ % MG_ECO_POOL.length]; out.push({ type: 'eco', id: p.id, label: p.label, r: p.r, d: p.d }); }
    else { const f = BPX_FINISHES[k2++ % BPX_FINISHES.length]; out.push({ type: 'finish', id: f.id, label: f.label, r: f.r }); }
  }
  return out;
})();

export function bpRewardFor(tier) { // [v1.50 port T90] premium-table lookup 1..50 (v1.50 inlined PREMIUM_REWARDS[t-1] inside bpClaim); junk/out-of-range → null
  const t = Number(tier) | 0;
  return (t >= 1 && t <= BP_TIERS) ? PREMIUM_REWARDS[t - 1] : null;
}

export function bpFreeChapterReward(chapter, charmOwned) { // [v1.50 port T90] free-track reward law (v1.50 bpClaim 'f' branch, pure form): chapter CR + its charm; an OWNED charm converts to the dupe refund (the dupe interplay IS the repeat-completion path — v1.50 verbatim)
  const ch = Number(chapter) | 0;
  if (!(ch >= 1 && ch <= BP_CHAPTERS)) return null;
  const charmId = BP_FREE_CHARMS[(ch - 1) % BP_FREE_CHARMS.length];
  const rw = { cr: BP_FREE_CR, charm: charmOwned ? null : charmId, dupe: charmOwned ? charmId : null };
  if (charmOwned) rw.dupeRefund = BP_DUPE_REFUND;
  return rw;
}

export function bpClaimableFree(bp, ch, tier) { // [T93] free-track claim gate: chapter in range + its BP_TIERS_PER_CH tiers reached (caller injects the §62.5b tier — the mirror stays with the caller, determinism law) + not already claimed. bp.claims.free is the migrateBp-canonicalized chapter set.
  if (!bp || typeof bp !== 'object') return false;
  const c = Number(ch) | 0;
  if (!(c >= 1 && c <= BP_CHAPTERS)) return false;
  const claims = (bp.claims && typeof bp.claims === 'object' && Array.isArray(bp.claims.free)) ? bp.claims.free : [];
  if (claims.indexOf(c) >= 0) return false;
  const tr = Number(tier) | 0;
  return tr >= c * BP_TIERS_PER_CH;
}

export function bpClaimFree(bp, ch, tier, charmOwned) { // [T93] PURE free-track claim (the evsClaim idiom — the v1.50 bpClaim 'f' branch consumer): { bp, reward } copy-on-write, input untouched, claims.free appends the chapter; reward = bpFreeChapterReward verbatim (owned charm → the dupe refund). Caller persists bp + credits cr/dupeRefund + marks the charm owned. null when not claimable. [T94] returns the FULL canonical shape via bpCarry — prem + claims.premium survive the copy (the carry law)
  if (!bpClaimableFree(bp, ch, tier)) return null;
  const c = Number(ch) | 0;
  const claims = (bp.claims && typeof bp.claims === 'object' && Array.isArray(bp.claims.free)) ? bp.claims.free : [];
  const premClaims = (bp.claims && typeof bp.claims === 'object' && Array.isArray(bp.claims.premium)) ? bp.claims.premium : [];
  return {
    bp: bpCarry(bp, bp.prem === true, [...claims, c].sort((a, b) => a - b), premClaims.slice()),
    reward: bpFreeChapterReward(c, !!charmOwned),
  };
}

export function bpClaimablePremium(bp, tier, liveTier) { // [T94] premium claim gate: pass OWNED (has-pass law — bp.prem === true, junk → false) + tier in range + REACHED (caller injects the §62.5b live tier — the mirror stays with the caller, determinism law) + not already claimed. bp.claims.premium is the migrateBp-canonicalized tier set.
  if (!bp || typeof bp !== 'object' || bp.prem !== true) return false;
  const tr = Number(tier) | 0;
  if (!(tr >= 1 && tr <= BP_TIERS)) return false;
  const claims = (bp.claims && typeof bp.claims === 'object' && Array.isArray(bp.claims.premium)) ? bp.claims.premium : [];
  if (claims.indexOf(tr) >= 0) return false;
  const lv = Number(liveTier) | 0;
  return lv >= tr;
}

export function bpClaimPremium(bp, tier, liveTier, owned) { // [T94] PURE premium claim (the bpClaimFree idiom — the v1.50 bpClaim premium branch consumer): { bp, reward } copy-on-write; reward = bpRewardFor(tier) verbatim — 'cr' rows pass through; 'eco'/'finish' rows GRANT the id unless the caller-injected ∪ read says owned → the dupe refund (BP_DUPE_REFUND, the same interplay the free track rides). Caller persists bp + credits cr/dupeRefund + marks the granted id owned (cosOwned — the claimed leg of the §53.2 ∪ law, feeds EVERY picker). null when not claimable.
  if (!bpClaimablePremium(bp, tier, liveTier)) return null;
  const tr = Number(tier) | 0;
  const src = bpRewardFor(tr);
  const claims = (bp.claims && typeof bp.claims === 'object' && Array.isArray(bp.claims.premium)) ? bp.claims.premium : [];
  const free = (bp.claims && typeof bp.claims === 'object' && Array.isArray(bp.claims.free)) ? bp.claims.free.slice() : [];
  const isOwned = typeof owned === 'function' ? !!owned(src.id) : false;
  const reward = src.type === 'cr'
    ? { type: 'cr', cr: src.n }
    : isOwned
      ? { type: src.type, dupe: src.id, dupeRefund: BP_DUPE_REFUND }
      : { type: src.type, id: src.id, label: src.label, r: src.r };
  return { bp: bpCarry(bp, bp.prem === true, free, [...claims, tr].sort((a, b) => a - b)), reward };
}

// ---- N4 bundle rotation (FM N4 verbatim: 2×14d windows, 5 curated items, Σ×0.7 pricing) ----
// [T91 v1.57] sits AFTER MG_ECO_POOL/BPX_FINISHES — BN_CATALOG spreads them at module init (TDZ law).
export const BN_WINDOW_DAYS = 14; // FM N4 verbatim
export const BN_ITEM_COUNT = 5;   // FM N4 verbatim
export const BN_DISCOUNT = 0.7;   // FM N4 Σ×0.7 verbatim (O4 recipe "bundle discount norm")
export const BN_PRICE = { common: 150, rare: 400, epic: 900, legendary: 2000 }; // mirror of config.js ECO_PRICE (zero-import law: MG_ECO_POOL/BPX_FINISHES are already mirrors — keep in sync)
export const BN_CATALOG = [ // 40-row curated pool: MG_ECO_POOL (20) ∪ BPX_FINISHES (20, d:'fin' — finishes by definition). Zero-import mirrors only.
  ...MG_ECO_POOL.map((p) => ({ id: p.id, label: p.label, r: p.r, d: p.d })),
  ...BPX_FINISHES.map((f) => ({ id: f.id, label: f.label, r: f.r, d: 'fin' })),
];

export function bundleWindowOf(dateStr, slot) { // ONE 14-day window containing dateStr — slot 0 anchors at day 0, slot 1 offsets +7 (two staggered windows, FM "2×14d"). Epoch-anchored: same date ⇒ same window, forever (hashOf/pickSeeded determinism law)
  const ds = String(dateStr || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return null; // junk → null (renderers no-op)
  const days = Math.floor(Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10)) / 86400000);
  const start = (slot === 1 ? Math.floor((days - 7) / BN_WINDOW_DAYS) * BN_WINDOW_DAYS + 7 : Math.floor(days / BN_WINDOW_DAYS) * BN_WINDOW_DAYS);
  const id = 'bn.' + (slot === 1 ? 'B' : 'A') + ':' + start;
  const items = pickSeeded(BN_CATALOG, id, BN_ITEM_COUNT); // 5 DISTINCT curated rows — same window ⇒ same bundle, forever (pickSeeded law)
  return { id, slot: slot === 1 ? 'B' : 'A', items, price: bundlePrice(items), start: isoDateOf(start * 86400000), end: isoDateOf((start + BN_WINDOW_DAYS) * 86400000) };
}

export function bundlesFor(dateStr) { // the TWO live windows for a date (renderBundles renders both cards)
  return [bundleWindowOf(dateStr, 0), bundleWindowOf(dateStr, 1)].filter(Boolean);
}

export function bundlePrice(items) { // Σ(rarity prices) × 0.7, floored — FM N4 pricing law verbatim; junk rows contribute 0 (never guess)
  if (!Array.isArray(items)) return 0;
  return Math.floor(items.reduce((s, it) => s + (it && BN_PRICE[it.r] || 0), 0) * BN_DISCOUNT);
}

export function bnOwned(state, winId) { // purchase marker read — career.bn[windowId] (main/ui persist; [T93] the loadout-consumption leg is LANDED below: bundleOwnedItems)
  return !!(state && typeof state === 'object' && state[winId]);
}

export function bundleOwnedItems(bn) { // [T93 — the T2-5 consumption leg] PURE derive: the union of catalog item ids across OWNED bundle windows. Window markers invert deterministically: 'bn.A:20734' → epoch-day 20734, slot A → bundleWindowOf re-derivation (the id must re-derive EXACT — a raw key is never trusted). Junk-safe: non-object / falsy markers / malformed ids / junk dates all skip (never guess). Returns a Set (ui.js ∪ law: server inventory ∪ bundle-derived ∪ claimed cosmetics).
  const out = new Set();
  if (!bn || typeof bn !== 'object' || Array.isArray(bn)) return out;
  for (const k of Object.keys(bn)) {
    if (!bn[k]) continue;
    const m = /^bn\.([AB]):(\d+)$/.exec(String(k));
    if (!m) continue;
    const w = bundleWindowOf(isoDateOf(Number(m[2]) * 86400000), m[1] === 'B' ? 1 : 0);
    if (!w || w.id !== String(k)) continue;
    for (const it of w.items) out.add(it.id);
  }
  return out;
}
