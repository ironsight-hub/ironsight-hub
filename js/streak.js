// IRONSIGHT — streak.js : T116 G-6 (v1.81) — the daily login streak single truth.
// PURE module, zero imports (the achievements.js/tokens.js zero-import law): browser AND
// bun import the SAME table; the server 'streak' op shape-validates the mirror against
// the SAME version stamp. The module owns NO clock and NO persistence: the caller injects
// the window dateStr (metagame.evDayOf — the §52 04:00 local law, ONE clock single truth)
// and career stays the single ledger (the cr credit line lives in main.js, the eco law).
//
// LAWS:
//  · DETERMINISTIC SINGLE TRUTH — every read is a pure fn of the career object
//    (defensively defaulted — junk/tampered careers evaluate to a fresh streak, never throw).
//  · COPY-ON-WRITE — streakLogin returns the SAME career reference when the window is
//    already claimed (zero churn, no spurious saveCareer) and a NEW object when the
//    streak advances (probe-pinned).
//  · IDEMPOTENCE — streak.last === todayStr ⇒ no-op: relogging inside the same window
//    never re-credits (probe-pinned).
//  · CONSECUTIVITY — the streak advances ONLY when last === yesterday(today); any gap
//    resets the count to 1 (the genre norm: miss a day, start over — best survives).
//  · CYCLE — rewards repeat every STREAK_DAYS (7): day index = ((count-1) % 7) + 1;
//    count itself is unbounded, best tracks the record.
//  · ONE CLOCK — todayStr comes from the caller (metagame.evDayOf, the 04:00 law);
//    a 03:00 login belongs to YESTERDAY's window — identical to the daily challenge.
//  · i18n — faces ride the V166 layer (st.* ×9 REAL translations); numbers ride t()
//    params ({n}/{d}/{cr}) — the substitution law, zero string-built keys.

export const STREAK_VERSION = 1; // schema bump key — streakCarry migrates on version flips
export const STREAK_DAYS = 7; // the cycle length (genre norm: the weekly login board)

// THE REWARD TABLE — single truth (the ui board renders from THIS; the boot credit reads
// the row). Provenance anchors, quoted not imported (the OUR-CONSTANT law): base 25 =
// half the §52 daily challenge (login alone pays less than playing); arithmetic +25
// climb to day 6; day 7 = 300 = 6× the daily challenge — the cap bonus. Cycle total 825 cr.
export const STREAK_REWARDS = [
  { d: 1, cr: 25 }, { d: 2, cr: 50 }, { d: 3, cr: 75 },
  { d: 4, cr: 100 }, { d: 5, cr: 125 }, { d: 6, cr: 150 },
  { d: 7, cr: 300 },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateStr = (s) => typeof s === 'string' && DATE_RE.test(s);
const num = (v) => (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0; // defensive read — junk → 0
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;

// yesterdayOf — private mirror of metagame.addDays(-1) (the zero-import law forbids the
// import; the UTC arithmetic is the same law: the noon anchor makes the hop DST-immune).
function yesterdayOf(dateStr) {
  if (!isDateStr(dateStr)) return '';
  const t = Date.parse(dateStr + 'T12:00:00Z');
  if (!isFinite(t)) return '';
  return new Date(t - 86400000).toISOString().slice(0, 10);
}

// Defensive shape read — junk streak fields → the empty streak (never throws).
function streakShape(c) {
  const s = obj(c.streak) || {};
  return {
    last: isDateStr(s.last) ? s.last : '',
    count: num(s.count),
    best: num(s.best),
    v: num(s.v) || STREAK_VERSION,
  };
}

// Reward row for a 1-based login count (pure; the cycle law). count<=0 → the day-1 row.
export function streakRewardFor(count) {
  const n = num(count);
  return STREAK_REWARDS[n > 0 ? (n - 1) % STREAK_DAYS : 0];
}

// 1..7 display day for a login count (the board position; day 8 → 1 again).
export function streakDayIndex(count) {
  const n = num(count);
  return n > 0 ? ((n - 1) % STREAK_DAYS) + 1 : 1;
}

// THE login sweep — deterministic, copy-on-write, idempotent.
// Returns { career, changed, reward, count, reset } — career is the SAME reference when
// the window is already claimed; a NEW object (with the advanced streak) otherwise.
// NOTE: the cr CREDIT itself stays with the caller (career.cr is the caller's ledger
// line — main.js owns the eco law); this module advances the record + returns the row.
export function streakLogin(career, todayStr, now) {
  const c = (career && typeof career === 'object') ? career : {};
  const today = isDateStr(todayStr) ? todayStr : '';
  const cur = streakShape(c);
  if (!today) return { career: c, changed: false, reward: null, count: cur.count, reset: false };
  if (cur.last === today) return { career: c, changed: false, reward: null, count: cur.count, reset: false }; // idempotence
  const consec = cur.last !== '' && cur.last === yesterdayOf(today);
  const count = consec ? cur.count + 1 : 1;
  const reward = streakRewardFor(count);
  const streak = { last: today, count, best: Math.max(cur.best, count), v: STREAK_VERSION };
  return { career: { ...c, streak }, changed: true, reward, count, reset: !consec && cur.count > 1 };
}

// UI view — the board read: { count, best, day, reward, active, board } (deterministic
// render; board states past/today/next drive the chip faces). Never throws on junk.
export function streakView(career) {
  const c = (career && typeof career === 'object') ? career : {};
  const s = streakShape(c);
  const count = s.count;
  const day = streakDayIndex(Math.max(count, 1));
  return {
    count,
    best: Math.max(s.best, count),
    day,
    reward: streakRewardFor(Math.max(count, 1)),
    active: count > 0 && s.last !== '',
    board: STREAK_REWARDS.map((r) => ({ d: r.d, cr: r.cr, state: r.d < day ? 'past' : r.d === day ? 'today' : 'next' })),
  };
}

// Migration carry (the achCarry idiom): keep a VALID streak shape, drop junk, stamp the
// version. streakLogin self-heals on every advance, so the caller MAY skip this — it
// exists for bulk migrations and the probe law.
export function streakCarry(career) {
  const c = (career && typeof career === 'object') ? career : {};
  const s = streakShape(c);
  return { ...c, streak: { last: s.last, count: s.count, best: Math.max(s.best, s.count), v: STREAK_VERSION } };
}
