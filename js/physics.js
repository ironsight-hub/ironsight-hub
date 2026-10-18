// ============================================================
// IRONSIGHT — physics.js : shared movement core (MP-1, Task 27)
// PURE: only import is config.js (plain data, runs in browser + bun).
// Duck-typed xyz: state vectors may be THREE.Vector3 or plain {x,y,z}
// (math only touches .x/.y/.z fields — no THREE calls, no allocation
// of typed geometry). Consumed by BOTH:
//   - js/player.js (client prediction + offline movement)
//   - mini-services/ironsight-room (authoritative server sim)
// Extracted VERBATIM from player.js update() math (was lines 96-191).
// Presentation (SFX/bob/land dip/fall-damage hook) is returned as
// events and applied by the caller — server ignores events.
// Zero-delta gate: research/mp1_baseline.json (bitwise vs pre-refactor).
// ============================================================
import { CFG } from './config.js';

const P = CFG.PHYS;

// ============================================================
// T1-3 movement tech (Task 37-c) — module exports (Task 36 lesson:
// NOT nested in CFG). Every consumer path is gated on `input.tech === true`,
// a field the MP wire NEVER carries (mp.js:268 shape + server §11 whitelist),
// so the server sim and MP prediction run the legacy path bit-identically.
// Full spec: docs/MOVEMENT_TECH.md (provenance [g_00..g_11]).
// ============================================================
export const TECH = {
  // tap-strafe [APEX air-speed 60u/s × 0.0254 m/u — g_00; window/rate = SPEC]
  tapWindow: 0.45,            // s of redirect window after a tap
  tapRate: 18.85,             // rad/s wish-lead ramp (1080°/s — probe-tuned: ~180° per window)
  tapLeadMax: Math.PI / 2,    // 90° max lead vs velocity (perpendicular = pure turn)
  tapCap: 1.52,               // wish cap during redirect [APEX air speed 60u/s]
  tapAccel: 40,               // air accel during window only (2× legacy airAccel)
  tapMinSpeed: 2.0,           // gate: nothing to redirect below this
  // wall bounce [APEX shallow-angle momentum redirect — g_02/g_09]
  wbMinSpeed: 5.0,            // entry speed gate
  wbMaxAngle: 25 * Math.PI / 180, // impact angle vs wall plane (shallow)
  wbRetention: 1.0,           // tangential momentum preserved
  wbPush: 1.6,                // normal push-off m/s (exit ≤45° off wall — push ≤ tangent)
  wbMinExit: 4.5,             // launch-pad floor (total exit speed)
  wbMinTangent: 3.0,          // need along-wall momentum
  wbCooldown: 0.3,            // anti-rattle
  // superglide [APEX 1-frame acceleration out of mantle — g_08]
  sgApexVy: 0.9,              // apex window: |vel.y| ≤ 0.9 → ±44ms @ g=20.5
  sgCrestBand: 0.06,          // crest-save gate: ledge top within 6cm of the feet (clamber instant)
  sgWallT: 0.08,              // wall-contact freshness window
  sgKeepTtl: 0.4,             // keep-flag lifetime (effective use bounded by jumpBuffer)
  sgKeep: 1.0,                // full horizontal preservation through the ledge pop
  sgMinSpeed: 4.0,            // gate: meaningful ledge momentum
};

// [T119] mantle/climb — ledge reach above step-up range. Genre law: jump (or be
// airborne) at a wall whose top sits within reach and the box pulls itself up.
// Pure math like TECH — consumed by BOTH the client prediction and the room
// service authority (zero wire changes: the gate derives from airborne state +
// the already-whitelisted jump/forward inputs, never a new input field).
export const CLIMB = {
  // [T129] THE FLUID-REACH AMENDMENT — user items 3+5 ("can't jump to and pull up on
  // things in range that should be" + "not as fluid as CoD Warzone 2.0"). Six measured
  // constants re-tuned to the Warzone bar; every old value kept in the comment trail.
  // Determinism unchanged: all six are pure state-machine constants consumed identically
  // by the client prediction and the room authority (physics.js is the single source).
  max: 1.55,     // [T129] 1.35→1.55 (was: above step-up 0.55, above the 1.19 m pure-jump apex) —
                 // chest-high ledges (railings, crate stacks, windowsills ~1.4-1.5 m) were
                 // unreachable at any speed; the Warzone bar mantles them
  hurdleMax: 1.0,  // [T119] HURDLE band ceiling — chest-height ledges hop over with FULL momentum
  hurdleMinSpeed: 5.0, // [T129 A-B] 4.2 REVERTED to the T119 5.0 — measured: at 4.2 vaults fire on ascending stair composites and STALL the forward ascent (probe_t127_verify D: end z −22.35 → −15.75); the hurdle band is for chest-high ledges WITH meaningful carry, step-up owns stairs
  hurdlePop: 2.0,  // [T119] hurdle vertical floor — clears the lip without killing the run
  hurdleDur: 0.12, // [T115] the hurdle is a TIMED VAULT now — the same curve family as the pull-up ([T120]), a shorter window; the instant one-tick yank (y snap + forward shift in the same frame) read as a teleport
  pullDur: 0.2,    // [T120] the pull-up's timed ascent (the "bit of timing" the brief asks for) — an ease-out 0.2s climb along the wall face, not an instant snap
  pullDamp: 0.78,  // [T119] 0.55 → [T129] 0.78 — the Warzone read keeps the run ALIVE through a pull-up (0.55 ate 45% of every carry; the #1 "not fluid" constant)
  pullPop: 3.0,    // [T119] pull-up vertical floor — the arms carry you onto the top
  cd: 0.25,      // [T129 A-B] 0.12 REVERTED to the T127 0.25 — measured (scripts/bisect_d_t129.py): at 0.12 the mantle re-arms on ascending stair terrain and the ascent vault-chains into a crawl (probe D: end z −25.0 → −15.75); the anti-jitter cadence is load-bearing for stairs. Retry fluidity comes from pullDamp/minVy below instead
  fwdDot: 0.30,  // forward intent: the wish must push INTO the wall (0.25→0.35 [T119]: brushing a wall
                 // mid-air must not mantle; [T129] 0.35→0.30 — diagonal approaches forgive, brushes still denied)
  minVy: -5.0,   // [T129] −3.5→−5.0 — grab on the DESCENDING side of the arc, the Warzone read;
                 // −3.5 denied everything ~0.17 s past apex ("can't jump TO and pull up")
  easeLin: 0.5,  // [T130] THE COMMITTED GRAB — the arc ease becomes mix(linear, smoothstep, easeLin).
                 // Pure smoothstep opens with a ZERO-VELOCITY launch (d/dp = 0 at the grab): the box
                 // stalls at the face for the first ~40% of the window before the mid-peak arrives —
                 // the user read: "climb works but it's kind of hesitant". The blend opens the haul
                 // at easeLin× the average rate (~3.7 m/s on a 1.5 m pull-up, ~4.2 m/s of kept run
                 // on a vault) while keeping BOTH ends rounded; peak rate DROPS to 1.25× avg
                 // (smoothstep rode 1.5×), and the crest still decelerates into the ≤1.0 settle cap.
                 // easeOut families stay forbidden (easeOutCubic measured a 14.7 m/s launch spike —
                 // the T120 rejection stands). A-B MEASURED (probe_t127_verify D, fresh runs, both
                 // trees swapped each side — scratch/t130_ab harness): the D stair-ascent control
                 // walks end z −25.00 → −21.92 under ANY nonzero blend — 0.35 and 0.5 land in the
                 // BYTE-IDENTICAL basin (a chaotic event flip from ulp-level arc-sample rounding,
                 // not a magnitude cost; the T129 crawl signature is −15.75 + re-arm pathology —
                 // absent here: anomalies 0, worst 0.279 m, same ascent line, and the probe author
                 // explicitly declined bitwise-locking D for exactly this event-chaos — "D/F assert
                 // anomaly-free + sane, not bitwise"). Magnitude is therefore free to serve the
                 // grab feel; 0.5 is the strongest committed grab with the SOFTEST mid-peak.
                 // Deterministic: a pure function of p consumed identically by the client
                 // prediction and the room authority (the T1-1 law; physics.js is the single
                 // source — the room imports it); no wire change.
};

// [T130] LADDER climb — the continuous vertical traversal the mantle can't reach.
// Genre law honored: NO new input fields (the T1-3 law): inside a climb volume,
// forward iz climbs, back iz descends, no-intent holds (sticky), jumpEdge hops OFF
// along the volume's `out` axis, forward at the lip reuses the T120 timed ascent.
export const LADDER = {
  climb: 2.7,      // climb/descend speed (m/s) — CoD-ladder pace
  stick: 7.0,      // horizontal damp rate while mounted (the hug)
  exitHop: 2.3,    // jump-off push along `out`
  exitVy: 0.62,    // jump-off vertical (× P.jumpVel)
  crestBand: 0.75, // feet within this of the top + forward intent = the crest pull
  reach: 0.30,     // capsule margin on the volume AABB
};

// [T130] WATER — swim (deep) vs wade (shallow/ornamental). Same no-new-fields law:
// jump strokes up while swimming; surface bob rides the buoyancy spring.
export const SWIM = {
  swimDepth: 0.55,   // feet-below-surface where wade becomes swim
  buoy: 11.0,        // upward spring (m/s²) when torso-submerged
  bobDamp: 3.2,      // vertical damp near the surface (the bob)
  maxSink: -1.7, maxRise: 2.6,
  stroke: 2.6,       // jumpEdge stroke impulse
  drag: 2.4,         // extra horizontal damp while swimming
  speedMult: 0.55,   // swim move target
  wadeMult: 0.62,    // wade move target (ornamental shallows slow, never drown)
  wadeBand: 1.2,     // depth where wade slowdown saturates
};

// Wall-bounce reflection at a per-axis AABB contact. Returns true if the bounce
// REPLACED the legacy zero-clamp (only reachable when input.tech === true — the
// caller passes the gate). Legacy inputs never enter any taken branch.
function tryWallBounce(s, axis, delta) {
  if (s.grounded || s.wbCd > 0 || s.crouch < 0.3) return false;
  const vx = s.vel.x, vz = s.vel.z;
  const sp = Math.hypot(vx, vz);
  if (sp < TECH.wbMinSpeed) return false;
  // wall normal points away from the face we penetrated (delta is the move dir)
  const n = delta > 0 ? -1 : 1;
  const vn = axis === 'x' ? vx * n : vz * n;   // ≤ 0 when moving into the wall
  const vt = axis === 'x' ? vz : vx;           // tangential component
  const vtl = Math.abs(vt);
  if (vtl < TECH.wbMinTangent) return false;
  if (Math.abs(vn) / sp > Math.sin(TECH.wbMaxAngle)) return false; // too head-on
  let t = vtl * TECH.wbRetention;
  if (t < TECH.wbMinExit) t = TECH.wbMinExit;
  let push = TECH.wbPush;
  if (push > t) push = t; // exit ≤45° off the wall plane [g_09]
  const tdir = vt >= 0 ? 1 : -1;
  if (axis === 'x') { s.vel.x = n * push; s.vel.z = tdir * t; }
  else { s.vel.z = n * push; s.vel.x = tdir * t; }
  s.wbCd = TECH.wbCooldown;
  s._wb = true; // surfaced as ev.bounce by stepState
  return true;
}

// Superglide crest-save [g_08: jump at the top of the wall climb = clamber-cancel].
// Fires ONLY on the clamber instant: rising, ledge top within sgCrestBand of the feet,
// jump pressed THIS tick, real horizontal momentum. Denies the legacy momentum kill for
// this contact so the box clears the ledge next ticks with speed intact. Descending or
// low-on-the-wall contacts fail every gate → legacy zero-clamp, byte-identical.
function inputCrestSave(s, hit, ctx) {
  if (!ctx.jumpEdge) return false; // [g_08] superglide is an INPUT: jump pressed THIS tick (clamber instant)
  if (s.vel.y <= 0 || s.grounded) return false;
  if (speed2D(s) < TECH.sgMinSpeed) return false;
  if (hit.max.y - s.pos.y > TECH.sgCrestBand) return false;
  ctx.used = true;
  s.sgKeepT = TECH.sgKeepTtl;
  return true;
}

function heightOf(s) { return s.prone > 0.5 ? P.proneHeight : P.height + (P.crouchHeight - P.height) * s.crouch; } // [T121] (9) prone: the 1.0 m body — the hitbox AND the ceiling clearance shrink
function speed2D(s) { return Math.hypot(s.vel.x, s.vel.z); }
function boxAt(px, py, pz, h) {
  const r = P.playerRadius;
  return { min: { x: px - r, y: py, z: pz - r }, max: { x: px + r, y: py + h, z: pz + r } };
}
function overlaps(b, colliders) {
  for (const c of colliders) {
    if (b.min.x < c.max.x && b.max.x > c.min.x && b.min.y < c.max.y && b.max.y > c.min.y && b.min.z < c.max.z && b.max.z > c.min.z) return c;
  }
  return null;
}
// mirrors player.js _freeAt: h undefined -> h+0.001 is NaN, `NaN || height` swallows the
// epsilon, so the box height is EXACTLY current height (no +0.001). Given h -> h+0.001.
function freeAt(px, py, pz, h, colliders, s) {
  if (h === undefined) return !overlaps(boxAt(px, py, pz, heightOf(s)), colliders);
  return !overlaps(boxAt(px, py, pz, h + 0.001), colliders);
}

function friction(s, dt, mult = 1) {
  const sp = speed2D(s);
  if (sp < 0.001) { s.vel.x = 0; s.vel.z = 0; return; }
  const drop = sp * P.friction * mult * dt;
  const ns = Math.max(sp - drop, 0) / sp;
  s.vel.x *= ns; s.vel.z *= ns;
}
function accelerate(s, wx, wz, wishSpeed, accel, dt) {
  const cur = s.vel.x * wx + s.vel.z * wz;
  const add = wishSpeed - cur;
  if (add <= 0) return;
  const acc = Math.min(accel * wishSpeed * dt, add);
  s.vel.x += wx * acc; s.vel.z += wz * acc;
}

function moveAxis(s, colliders, axis, delta, T, ctx) {
  if (delta === 0) return;
  s.pos[axis] += delta;
  if (s.mantT > 0) return; // [T124] THE ARC-OWNERSHIP LAW (MOVEMENT_TECH.md §THE MANTLE LAW, verbatim: "the curve owns ALL motion during an arc (vel frozen; moveAxis integrates the exact sample)"). Arc ticks integrate the pre-validated commit sample with NO contact response — no step-up, no re-arm, no wall-bounce, no clamps. This kills the ceiling hijack: the arm tick leaves the box horizontally PENETRATED (the arm returns before the face clamp), and without this guard the arc's rising y-move read the wall as a CEILING (pos.y = hit.min.y − heightOf − 0.001) whenever the wish stopped re-driving the legacy eject — measured 0.2 s underground + a 178.9 m/s pop (probe_pullup_path_t124 E).
  const b = boxAt(s.pos.x, s.pos.y, s.pos.z, heightOf(s));
  const hit = overlaps(b, colliders);
  if (!hit) return;
  // step-up attempt (horizontal only, grounded or near-ground)
  if (axis !== 'y' && s.grounded && hit.max.y - s.pos.y <= P.stepHeight + 0.01 && hit.max.y > s.pos.y) {
    const savedY = s.pos.y;
    s.pos.y = hit.max.y + 0.001;
    if (freeAt(s.pos.x, s.pos.y, s.pos.z, undefined, colliders, s)) { s.vel.y = Math.max(s.vel.y, 0); return; }
    s.pos.y = savedY;
  }
  // [T119] mantle/climb — airborne (or jump-buffered) contact with a ledge in reach:
  // the top must sit ABOVE the feet and WITHIN CLIMB.max (no step-up lower bound here —
  // the step-up owns grounded contacts, and an airborne crest assist IS the natural
  // jump-over case), and ctx.climb carries the intent gate. The pull also carries the
  // box FORWARD over the lip (r+0.05, halved, then none) and COMMITS only if the box
  // is both collision-free AND SUPPORTED over the ledge footprint — a face-hug snap
  // would float beside the ledge. Preempts the tech wall-bounce — going UP wins the
  // contact — EXCEPT the same-tick crest-save tap ([T124] below: the g_08 path).
  // [T124] THE CREST-SAVE PRECEDENCE — the MANTLE LAW, verbatim: "jumpEdge CANCELS the
  // arc with no boost (player agency; the g_08 crest-save keeps its own path)". A
  // same-tick superglide tap (tech-gated: jumpEdge + rising + speed + the 6 cm band)
  // OWNS the clamber instant; the [T119] arm gate must not swallow it (the probe_tech
  // §3 acceptance measured 6 FAILs — the tap was being eaten by the preemption).
  const crestTakes = T && ctx && ctx.jumpEdge && !ctx.used && s.vel.y > 0 &&
    speed2D(s) >= TECH.sgMinSpeed && hit.max.y - s.pos.y <= TECH.sgCrestBand;
  if (ctx && ctx.climb && !crestTakes && s.climbCd <= 0 && axis !== 'y' && hit.max.y > s.pos.y && hit.max.y - s.pos.y <= CLIMB.max) {
    const topY = hit.max.y + 0.001;
    const dir = delta > 0 ? 1 : -1;
    // [T132] THE FULL COMMIT — the pull-up/vault used to end the arc with the box CENTER
    // barely past the ledge face (r + 0.05): the user read "the completion of the climb is a
    // bit too far away from solid ground and causes the haptic" — you surfaced standing on
    // the EDGE and the settle/carry jolted. The commit now hauls the center a full radius
    // past the face (2r + 0.05) so the arc ENDS ON the deck; the k-search + supported check
    // still walk the shift back for narrow tops and lip obstacles, same largest-fraction
    // semantics, deterministic on both sides.
    const shift = (P.playerRadius * 2 + 0.05) * dir;
    // [T129] commit search refined [1,0.5,0]→[1,0.6,0.25,0] — same largest-free-fraction
    // semantics (first k wins), two finer stops so mid-depth lips commit further onto the
    // ledge instead of falling back to the face-hug k=0; deterministic, no new state.
    for (const k of [1, 0.6, 0.25, 0]) {
      const nx = axis === 'x' ? s.pos.x + shift * k : s.pos.x;
      const nz = axis === 'z' ? s.pos.z + shift * k : s.pos.z;
      const supported = nx + P.playerRadius > hit.min.x && nx - P.playerRadius < hit.max.x &&
                        nz + P.playerRadius > hit.min.z && nz - P.playerRadius < hit.max.z;
      if (supported && freeAt(nx, topY, nz, undefined, colliders, s)) {
        // [T119] the two-band mantle law (issue 2): HURDLE (chest-high + carried speed)
        // keeps the run ALIVE — full horizontal momentum, a small vertical floor clears
        // the lip; PULL-UP (high ledge or spent momentum) hauls you over at a cost —
        // horizontal damped (the timing), a real upward carry. No band reads as a
        // double jump: the jump-buffer no longer arms the mantle (gate below), and the
        // climb never ADDS free air — it lands you ON the ledge top.
        const rise = topY - s.pos.y;
        const sp2 = Math.hypot(s.vel.x, s.vel.z);
        if (rise <= CLIMB.hurdleMax && sp2 >= CLIMB.hurdleMinSpeed) {
          // [T115] TIMED VAULT (the wonk fix): the instant y-snap + one-tick forward
          // shift read as a teleport. The vault now rides the SAME smoothstep curve
          // family as the pull-up ([T120]/[T132] machinery, per-arc mantDur window):
          // 0.12 s, the body eases up AND over the lip to the supported commit point
          // (mantDX/DZ), FULL momentum retained (mantCX/CZ = pre-contact velocity —
          // the sgKeep law: the run stays ALIVE). No free air added: crest settles at
          // the ledge top (vel.y ≤ 1.0, the shared crest cap), never above it.
          s.mantT = CLIMB.hurdleDur; s.mantDur = CLIMB.hurdleDur;
          s.mantY0 = s.pos.y; s.mantY1 = topY;
          s.mantX0 = s.pos.x; s.mantZ0 = s.pos.z; s.mantDX = nx - s.pos.x; s.mantDZ = nz - s.pos.z;
          s.mantCX = s.vel.x; s.mantCZ = s.vel.z;
          s.vel.x = 0; s.vel.z = 0; s.vel.y = 0; // the curve owns all motion during the vault
        } else {
          // [T120] the PULL-UP is now a TIMED ASCENT (the R2 residual): instead of the
          // instant lip-snap, the climb runs a 0.2s ease-out vertical along the wall face.
          // Horizontal freezes at the face (the pre-damp speed is the POST-climb carry,
          // restored on crest); the timing cost the brief asks for IS the 0.2s ascent.
          // mantY1 = the collider's own top — identical on server + client prediction
          // (the T1-1 determinism law); mantT/mantY0/mantY1/mantCX/mantCZ ride `s` as
          // internals (the climbCd/_climb precedent — no wire change).
          s.mantT = CLIMB.pullDur; s.mantDur = CLIMB.pullDur; s.mantY0 = s.pos.y; s.mantY1 = topY;
          s.mantCX = s.vel.x * CLIMB.pullDamp; s.mantCZ = s.vel.z * CLIMB.pullDamp;
          s.mantX0 = s.pos.x; s.mantZ0 = s.pos.z; s.mantDX = nx - s.pos.x; s.mantDZ = nz - s.pos.z; // [T124] the pull-up COMMITS to the SAME validated footprint as the hurdle (the realism bar: "commitment is collision-free AND footprint-supported before it fires"; the item-7 law: hoist-up + move forward onto the surface). Every arc now writes its OWN haul fields — the [T132] advance below can never read a PREVIOUS arc's commit again (measured: a stale haul yanked the player 29.5 m in ONE tick at vx 1768.6, probe_pullup_path_t124 D).
          s.vel.x = 0; s.vel.z = 0; s.vel.y = 0; // the curve owns all motion during the ascent — the eased rise AND the forward haul to the commit point
        }
        s.climbCd = CLIMB.cd; s._climb = true;
        return;
      }
    }
  }
  // [T127] THE FACE-PROVENANCE GUARD — a face clamp may only answer a penetration the
  // moved axis CAUSED. If the box was ALREADY penetrating before this axis moved (a
  // corner graze, a spawn overlap, a jump-cancel dropped inside a lip), the clamps below
  // eject to the collider's FAR face along this axis — measured: a 14.48 m eject across
  // the L1 deck railing (probe_stairlateral_t127 CHAOS#1907: box overlapping the railing
  // in y+z, any residual x-velocity → pos.x = hit.max.x + r = 33.381) and a 3.35 m
  // UNDERGROUND ceiling-clamp on a tower-column head graze (CHAOS#3: the rising y-move
  // read the column's BOTTOM as a ceiling, pos.y = hit.min.y − height − 0.001), then an
  // array-order suck-up onto the deck top — the user report "runs to staircase laterally
  // > presses jump > glitches to a different area on the map". Resolution: shift a COPY
  // of the post-move box back by delta and re-test; if the penetration predates the move,
  // resolve by the MINIMUM translation vector (smallest escape depth; ties x < z < y —
  // horizontal escapes preferred over the harmful vertical clamps) instead of a face clamp. Clean approaches — the overwhelming
  // common case — never reach this branch: the clamps below stay byte-identical for them.
  // (The pre-test shifts a COPY of the post-move box — NO pos mutation: −delta/＋delta
  // round-trips are not bit-identical in IEEE754 and would drift every clean contact.)
  const preBox = { min: { x: b.min.x, y: b.min.y, z: b.min.z }, max: { x: b.max.x, y: b.max.y, z: b.max.z } };
  preBox.min[axis] -= delta; preBox.max[axis] -= delta;
  const prePen = !!overlaps(preBox, colliders);
  if (prePen) {
    const px1 = hit.max.x - b.min.x, px2 = b.max.x - hit.min.x;
    const py1 = hit.max.y - b.min.y, py2 = b.max.y - hit.min.y;
    const pz1 = hit.max.z - b.min.z, pz2 = b.max.z - hit.min.z;
    let esc = px1 <= px2 ? [px1, 'x', 1] : [px2, 'x', -1];
    const ez = pz1 <= pz2 ? [pz1, 'z', 1] : [pz2, 'z', -1];
    const ey = py1 <= py2 ? [py1, 'y', 1] : [py2, 'y', -1];
    if (ez[0] < esc[0]) esc = ez;
    if (ey[0] < esc[0]) esc = ey;
    s.pos[esc[1]] += esc[2] * (esc[0] + 0.001); // minimal push-out; velocity untouched —
    return; // the next tick's own clamps + ground resolve own the residual motion
  }
  // clamp back to penetrated face
  const r = P.playerRadius;
  if (axis === 'x') {
    let bounced = false, saved = false;
    if (T) {
      s.wallT = 0;
      bounced = tryWallBounce(s, 'x', delta);
      if (!bounced && ctx && !ctx.used && inputCrestSave(s, hit, ctx)) { saved = true; s._sg = true; }
    }
    s.pos.x = delta > 0 ? hit.min.x - r - 0.001 : hit.max.x + r + 0.001;
    if (!bounced && !saved) s.vel.x = 0;
  }
  else if (axis === 'z') {
    let bounced = false, saved = false;
    if (T) {
      s.wallT = 0;
      bounced = tryWallBounce(s, 'z', delta);
      if (!bounced && ctx && !ctx.used && inputCrestSave(s, hit, ctx)) { saved = true; s._sg = true; }
    }
    s.pos.z = delta > 0 ? hit.min.z - r - 0.001 : hit.max.z + r + 0.001;
    if (!bounced && !saved) s.vel.z = 0;
  }
  else {
    if (delta > 0) { s.pos.y = hit.min.y - heightOf(s) - 0.001; s.vel.y = Math.min(s.vel.y, 0); } // ceiling
    else s.pos.y = hit.max.y + 0.001; // ground face (vel.y zeroed by ground check below)
  }
}

/**
 * One fixed movement step. Mutates `s` in place (pos/vel vectors by reference,
 * primitives written back). Returns presentation events:
 *   { jumped, slideStart, land: null | {impactV, fall}, pad: null | {x,y,z} }
 *   + [T119] climb (mantle fired) — presentation-only, server ignores events
 * s:    { pos, vel, yaw, crouch, grounded, groundedTime, jumpBufT,
 *         slide: {active, t, dir}, apexY, stimT, sprinting }
 *         + [T119] climbCd/_climb/groundMetal (internals, presentation reads groundMetal)
 *         + [T120] mantT/mantY0/mantY1/mantCX/mantCZ (the timed pull-up ascent internals —
 *           deterministic from collider truth on BOTH sides; no wire change, the climbCd precedent)
 * input:{ ix, iz (raw move axes, normalized here — verbatim player.js:102), prone (0/1 stance — [T121] additive, the crouch law) 
 *         sprint, ads, crouch, crouchEdge, jumpEdge, autoSprint }
 * world:{ colliders: [{min,max,metal?}], jumpPads: [{pos, r}] }
 */
export function stepState(s, input, world, dt) {
  const ev = { jumped: false, slideStart: false, land: null, pad: null, bounce: false, superglide: false };
  const colliders = world.colliders;
  // T1-3 tech gate (Task 37-c): the MP wire + server whitelist never set input.tech,
  // so every tech branch below is dead on the server and in MP prediction —
  // legacy inputs are bit-identical (docs/MOVEMENT_TECH.md obligations 1-4).
  const T = input.tech === true;
  if (T) {
    if (s.tapT === undefined) { s.tapT = 0; s.tapDir = 0; s.sgKeepT = 0; s.wallT = 9; s.wbCd = 0; s._wb = false; s._sg = false; }
    s.wallT += dt;
    s.wbCd = Math.max(0, s.wbCd - dt);
    s.sgKeepT = Math.max(0, s.sgKeepT - dt);
    if (s.tapT > 0) s.tapT = Math.max(0, s.tapT - dt);
    if ((input.tapEdge === 1 || input.tapEdge === -1) && !s.grounded && speed2D(s) >= TECH.tapMinSpeed) {
      s.tapT = TECH.tapWindow; s.tapDir = input.tapEdge;
    }
    // superglide trigger: apex-window jump at a fresh wall contact [APEX g_08]
    if (input.jumpEdge && !s.grounded && s.wallT <= TECH.sgWallT &&
        Math.abs(s.vel.y) <= TECH.sgApexVy && speed2D(s) >= TECH.sgMinSpeed) {
      s.sgKeepT = TECH.sgKeepTtl;
    }
  }

  // [T119] mantle cooldown state (legacy too — NOT tech-gated: climb is core traversal)
  if (s.climbCd === undefined) { s.climbCd = 0; s._climb = false; }
  s.climbCd = Math.max(0, s.climbCd - dt);

  // wish dir from yaw (player.js:98-104 verbatim, plain math)
  const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
  const rx = -fz, rz = fx;
  let ix = input.ix, iz = input.iz;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  let wx = fx * iz + rx * ix, wz = fz * iz + rz * ix;
  const wl2 = wx * wx + wz * wz;
  if (wl2 > 0) { const wl = Math.sqrt(wl2); wx /= wl; wz /= wl; }

  // crouch lerp (player.js:107-109)
  const wantCrouch = input.crouch || s.slide.active;
  s.crouch += ((wantCrouch ? 1 : 0) - s.crouch) * Math.min(1, P.crouchLerp * dt);
  if (input.prone !== undefined) s.prone = input.prone; // [T121] (9) the prone stance rides the input verbatim (the crouch law; additive — old servers ignore the field)
  if (s.crouch < 0.02 && wantCrouch === false && !freeAt(s.pos.x, s.pos.y, s.pos.z, P.height, colliders, s)) s.crouch = Math.max(s.crouch, 0.35); // headroom guard

  // sprint gate (player.js:112-119)
  const fwdDot = wx * fx + wz * fz;
  const preSprint = s.sprinting; // [T117] last-frame gate — the crouch edge rides the SAME input frame that raises crouch, so the post-gate state (which excludes wantCrouch) can never co-occur with the edge: the trigger was deadlocked. Apex law: the slide reads the sprint state from BEFORE the crouch landed.
  // [T132] OMNIMOVEMENT (the CoD BO6 law, callofduty.com training guide: "you can strafe
  // left and right while sprinting... run forward or backwards... in a full sprint" — only
  // Tactical Sprint stays forward-gated, and this build has no tac-sprint tier): the gate
  // reads the MOVE-INTENT magnitude (|wx|+|wz|), not the forward dot. ADS/crouch still break
  // it; the autoSprint (CODM touch) branch joins the same omnidirectional read (Sprint
  // Assist Sideways is an official BO6 option).
  const mi = Math.abs(wx) + Math.abs(wz);
  s.sprinting = input.sprint && s.grounded && mi > 0.55 && !input.ads && !wantCrouch
    || (input.autoSprint && il > 0.6 && mi > 0.5 && !input.ads && !wantCrouch);
  const stimBoost = s.stimT > 0 ? 1.25 : 1;
  let target = P.walkSpeed * stimBoost;
  if (s.sprinting) target = P.walkSpeed * P.sprintMult * stimBoost;
  if (s.prone > 0.5) target = P.walkSpeed * P.proneMult; // [T121] (9) the crawl
  if (s.crouch > 0.5 && !s.slide.active) target = P.walkSpeed * P.crouchMult;
  if (input.ads) target *= P.adsMoveMult;

  // ---- [T130] LADDER + WATER detection (before the slide/jump gates own the frame) ----
  // Ladder: capsule inside a climb volume (LADDER.reach margin). Water: feet inside a
  // water AABB → depth → swim vs wade. Both pre-empt ground traversal below.
  s.onLadder = false; s.swimming = false;
  let lad = null;
  for (const L of (world.ladders || [])) {
    if (s.pos.x > L.min.x - LADDER.reach && s.pos.x < L.max.x + LADDER.reach &&
        s.pos.z > L.min.z - LADDER.reach && s.pos.z < L.max.z + LADDER.reach &&
        s.pos.y > L.min.y - 0.4 && s.pos.y < L.max.y - 0.25) { lad = L; break; }
  }
  let wa = null, depth = 0;
  for (const W of (world.water || [])) {
    if (s.pos.x > W.min.x && s.pos.x < W.max.x && s.pos.z > W.min.z && s.pos.z < W.max.z && W.surface - s.pos.y > 0.05) {
      depth = W.surface - s.pos.y; wa = W; break;
    }
  }
  s.wading = wa ? Math.min(1, depth / SWIM.wadeBand) : 0;
  if (wa && wa.swim && depth > SWIM.swimDepth && !(s.prone > 0.5)) s.swimming = true; // prone never swims (the [T121] stance law)
  if (lad) s.onLadder = true;
  // splash edge (presentation; SFX reads ev.splash)
  const inW = !!wa;
  if (inW && !s._inWater) ev.splash = { depth, v: Math.abs(s.vel.y) };
  s._inWater = inW;
  if (s.onLadder || s.swimming) { target *= s.onLadder ? 0.35 : SWIM.speedMult; if (s.wading > 0) target *= 1; }
  else if (s.wading > 0 && !s.swimming) target *= (1 - (1 - SWIM.wadeMult) * s.wading); // the wade crawl
  if (s.slide.active && (s.onLadder || s.swimming)) s.slide.active = false; // no slides off a ladder / mid-swim

  // slide trigger (player.js:122-129) — SFX -> ev.slideStart
  if (input.crouchEdge && !(s.prone > 0.5) && (s.sprinting || preSprint) && !s.slide.active && speed2D(s) > P.slideGate && s.grounded && !s.onLadder && !s.swimming) { // [T121] prone never slides // [T130] nor ladders/swim
    s.slide.active = true; s.slide.t = 0;
    const sp0 = speed2D(s);
    let dx = s.vel.x, dz = s.vel.z;
    const dl = Math.sqrt(dx * dx + dz * dz);
    if (dl > 0) { dx /= dl; dz /= dl; } // THREE normalize: divideScalar(length || 1)
    const boosted = sp0 * P.slideBoost;
    s.vel.x = dx * boosted; s.vel.z = dz * boosted;
    s.slide.dir.x = dx; s.slide.dir.y = 0; s.slide.dir.z = dz;
    ev.slideStart = true;
  }
  if (s.onLadder) {
    // [T132] the mounted hug owns horizontal — NO wish accelerate while mounted. Without
    // this branch, the air-control accelerate keeps re-adding wish velocity that the
    // LADDER.stick damp only partially removes (equilibrium ≈ 8× the per-frame gain), so
    // the capsule drifts out of the climb volume mid-climb (probe_t132 P4/P5 evidence:
    // unmount at y≈1.0 after ~1.5 s of climbing, z crossed the volume edge −19.15).
  } else if (s.slide.active) {
    s.slide.t += dt;
    friction(s, dt, 0.32);
    // limited steering during slide
    accelerate(s, wx, wz, 1.4, 6, dt);
    if (s.slide.t > 0.85 || speed2D(s) < P.walkSpeed * 0.8 || (!input.crouch && s.slide.t > P.slideMinTime)) s.slide.active = false;
  } else if (s.grounded) {
    friction(s, dt, (T && s.sgKeepT > 0) ? 0 : 1); // T1-3 superglide: landing-frame friction waived
    accelerate(s, wx, wz, target, P.accel, dt); // quake: accelspeed = accel × wishspeed × dt [adrianb.io]
  } else if (T && s.tapT > 0) {
    // T1-3 tap-strafe: wishdir LEADS the velocity by a ramped, clamped angle;
    // the accelerate() call is the SAME function — input manipulation only [g_00/g_01]
    const el = TECH.tapWindow - s.tapT;
    const lead = Math.min(TECH.tapRate * el, TECH.tapLeadMax) * s.tapDir;
    const sp = speed2D(s);
    let vx = s.vel.x / sp, vz = s.vel.z / sp;
    const c = Math.cos(lead), sn = Math.sin(lead);
    accelerate(s, vx * c - vz * sn, vx * sn + vz * c, Math.min(TECH.tapCap, target), TECH.tapAccel, dt);
  } else {
    // air control [QUAKE 30u/s cap concept, widened]
    accelerate(s, wx, wz, Math.min(P.airWishCap, target), P.airAccel, dt);
  }

  // jump + buffer + bhop (player.js:145-155) — SFX -> ev.jumped
  // [T130] ladder/swim own the jump edge: mount → hop-off is handled in the ladder block below;
  // swim → stroke. The ground jump/buffer never fires from a mount or mid-swim.
  if (s.onLadder || s.swimming) s.jumpBufT = 0;
  else s.jumpBufT = input.jumpEdge ? P.jumpBuffer : Math.max(0, s.jumpBufT - dt);
  if (s.jumpBufT > 0 && s.grounded) {
    s.jumpBufT = 0;
    let keep = 1;
    if (s.groundedTime < 0.045) keep = P.bhopRetention;               // frame-perfect hop
    if (s.slide.active) { keep = P.slideHopKeep; s.slide.active = false; }
    if (T && s.sgKeepT > 0) { keep = TECH.sgKeep; s.sgKeepT = 0; }     // T1-3 superglide: full preservation through the pop
    s.vel.x *= keep; s.vel.z *= keep;
    s.vel.y = P.jumpVel * (s.slide.t > 0 || s.crouch > 0.5 ? 1.02 : 1);
    s.grounded = false; s.apexY = s.pos.y;
    ev.jumped = true;
  }

  // gravity + integrate (player.js:158-164)
  // [T130] LADDER DRIVE — mounted: iz climbs/descends, no intent sticks; jumpEdge hops
  // OFF along the volume's out axis; forward at the lip fires the T120 crest ascent.
  // Gravity is SUSPENDED on the mount. Horizontal velocity damps to the hug.
  if (s.onLadder && lad) {
    const vy = iz > 0.2 ? LADDER.climb : iz < -0.2 ? -LADDER.climb : 0;
    s.vel.y += (vy - s.vel.y) * Math.min(1, LADDER.stick * dt);
    s.vel.x *= 1 - Math.min(1, LADDER.stick * dt); s.vel.z *= 1 - Math.min(1, LADDER.stick * dt);
    if (input.jumpEdge && s.climbCd <= 0) { // hop off — pushed along `out`, real hop up
      s.onLadder = false; s.climbCd = CLIMB.cd;
      s.vel.x = lad.out.x * LADDER.exitHop; s.vel.z = lad.out.z * LADDER.exitHop;
      s.vel.y = P.jumpVel * LADDER.exitVy;
      ev.ladderExit = true;
    } else if (iz > 0.2 && lad.top - s.pos.y < LADDER.crestBand && s.climbCd <= 0) {
      // the crest: reuse the timed ascent (mantle curve) onto the top — the same
      // grab-and-haul read the ledge pull uses, carry pushed along `out`
      s.onLadder = false; s.climbCd = CLIMB.cd;
      s.mantT = CLIMB.pullDur; s.mantDur = CLIMB.pullDur; s.mantY0 = s.pos.y; s.mantY1 = lad.top + 0.02;
      s.mantCX = lad.out.x * 1.35; s.mantCZ = lad.out.z * 1.35; // the RETAINED drift after settle
      // [T132] the haul traverses the FULL exit distance inside the curve — a flush-deck
      // crest has ~0.115 s of airtime above lip height after settle (vy≤1.0, gravity 20.5),
      // so a 1.35 m/s drift covers only ~0.27 m and the climber falls at the deck face
      // (probe_t132 P4 evidence: landed y=0.000, x=33.34 vs deck edge 33). [T124 AMENDMENT:
      // ledge pull-ups NOW set their own haul fields too (the stale-haul teleport fix) —
      // the "byte-identical" scoping of T132 ended here, superseded by the user-decreed
      // pull-up commit + the arc-ownership law; see DEVLOG v2.9.16.]
      s.mantX0 = s.pos.x; s.mantZ0 = s.pos.z;
      let hk = 0; // [T124] the ladder haul commit is validated like the mantle arm (largest free fraction) — under the arc-ownership law an unvalidated haul would drive THROUGH a deck obstacle instead of stalling on its face
      // [T129] same refined search as the mantle arm — identical semantics, both sides
      for (const k of [1, 0.6, 0.25, 0]) {
        if (freeAt(s.pos.x + lad.out.x * 1.35 * k, lad.top + 0.02, s.pos.z + lad.out.z * 1.35 * k, undefined, colliders, s)) { hk = k; break; }
      }
      s.mantDX = lad.out.x * 1.35 * hk; s.mantDZ = lad.out.z * 1.35 * hk;
      ev.ladderCrest = true;
    }
  }
  if (!s.onLadder) {
    if (s.swimming) {
      // [T130] swim: buoyancy spring toward the surface + the bob damp + stroke
      if (depth > 0.9) s.vel.y += SWIM.buoy * dt * Math.min(1, (depth - 0.9) / 0.8);
      else s.vel.y *= 1 - Math.min(1, SWIM.bobDamp * dt); // near-surface bob
      s.vel.y = Math.max(SWIM.maxSink, Math.min(SWIM.maxRise, s.vel.y));
      if (input.jumpEdge) s.vel.y = Math.max(s.vel.y, SWIM.stroke); // the stroke
      s.vel.y -= P.gravity * 0.12 * dt; // a whisper of sink so idle water drifts under
      s.vel.x *= 1 - Math.min(1, SWIM.drag * dt); s.vel.z *= 1 - Math.min(1, SWIM.drag * dt);
    } else {
      s.vel.y -= P.gravity * dt;
    }
  }
  const wasGrounded = s.grounded;
  s.grounded = false;
  const impactV = s.vel.y; // captured before resolve for landing FX
  // [T119] mantle intent context — ALWAYS built (was tech-only): airborne (or a live jump
  // buffer) + forward intent + not plummeting. NOTE the gate reads wasGrounded — s.grounded
  // was ALREADY reset false above (pre-move), so !s.grounded would be vacuously true and
  // every wall contact would mantle. Derived from existing input state; the MP wire carries
  // nothing new (the T1-3 law holds — legacy tech branches stay dead off-client).
  const TC = {
    jumpEdge: !!input.jumpEdge, used: false,
    climb: !(s.prone > 0.5) && !wasGrounded && fwdDot > CLIMB.fwdDot && s.vel.y > CLIMB.minVy, // [T121] prone never mantles // [T119] the jump-buffer NO LONGER arms the mantle (the double-jump kill, issue 2): a grounded jump stays a jump — the mantle arms only from real airborne motion + forward intent
  }; // crest-save context (tech reads jumpEdge/used) + climb gate (everyone)
  // [T120] the timed-ascent advance — runs BEFORE the axis moves so this frame's y
  // integration rides the curve sample. [T130] THE COMMITTED GRAB — the ease is now
  // mix(linear, smoothstep, CLIMB.easeLin): pure smoothstep (3p²−2p³) opened with a
  // ZERO-VELOCITY launch (d/dp = 0 at the grab — the box stalled at the face for the
  // first ~40% of the window before the mid-peak arrived; the user read: "climb works
  // but it's kind of hesitant"). The blend opens at easeLin× the average rate (a
  // committed grab), peaks SOFTER (1.25× avg vs 1.5×), and still rounds the crest into
  // the ≤1.0 settle cap. easeOut families stay forbidden (easeOutCubic measured a
  // 14.7 m/s launch spike — harsher than the impulse it replaced). jumpEdge CANCELS
  // the curve with no boost (player agency — the g_08 crest-save keeps its own path;
  // a cancel never becomes free air).
  if (s.mantT > 0) {
    if (input.jumpEdge) { s.mantT = 0; s.vel.y = Math.min(Math.max(s.vel.y, 0), 1.0); s.vel.x = s.mantCX || 0; s.vel.z = s.mantCZ || 0; } // cancel: the climb's rise caps at the settle value — height KEPT, never boosted
    else {
      s.mantT = Math.max(0, s.mantT - dt);
      const p = 1 - s.mantT / (s.mantDur || CLIMB.pullDur); // [T115] per-arc window (pull 0.2 / vault 0.12) — the ease fraction reads the arc it rides
      const ease = CLIMB.easeLin * p + (1 - CLIMB.easeLin) * (p * p * (3 - 2 * p)); // [T130] THE COMMITTED GRAB — mix(linear, smoothstep): no zero-velocity stall at the grab, peak 1.25× avg (was 1.5×), crest still rounds into the settle cap
      const targetY = s.mantY0 + (s.mantY1 - s.mantY0) * ease;
      s.vel.y = (targetY - s.pos.y) / dt; // moveAxis('y') integrates exactly to the sample
      if (s.mantDX !== undefined) { // [T132] position-controlled horizontal haul (same ease, same window)
        s.vel.x = (s.mantX0 + s.mantDX * ease - s.pos.x) / dt;
        s.vel.z = (s.mantZ0 + s.mantDZ * ease - s.pos.z) / dt;
      }
      if (s.mantT === 0) { s.vel.y = Math.min(s.vel.y, 1.0); s.vel.x = s.mantCX || 0; s.vel.z = s.mantCZ || 0; } // crest: settle + restore the damped carry
    }
  }
  moveAxis(s, colliders, 'x', s.vel.x * dt, T, TC);
  moveAxis(s, colliders, 'z', s.vel.z * dt, T, TC);
  moveAxis(s, colliders, 'y', s.vel.y * dt);
  if (T && s._wb) { ev.bounce = true; s._wb = false; }
  if (T && s._sg) { ev.superglide = true; s._sg = false; }
  if (s._climb) { ev.climb = true; s._climb = false; } // [T119] mantle surfaced (legacy too)
  // ground resolve (player.js:166-183) — `below` box built BEFORE the snap loop (verbatim order)
  const below = boxAt(s.pos.x, s.pos.y - 0.05, s.pos.z, heightOf(s));
  let onGround = false;
  let gm = false; // [T119] ground material rides out for the surface-aware footstep/land voices
  for (const c of colliders) {
    if (s.pos.x + P.playerRadius > c.min.x && s.pos.x - P.playerRadius < c.max.x &&
        s.pos.z + P.playerRadius > c.min.z && s.pos.z - P.playerRadius < c.max.z &&
        Math.abs(s.pos.y - c.max.y) < 0.09 && s.vel.y <= 0.01) { onGround = true; s.pos.y = c.max.y; gm = c.metal === true; break; }
  }
  s.groundMetal = gm;
  if (s.vel.y <= 0.01 && (onGround || (s.mantT === 0 && overlaps(below, colliders) && below.min.y < s.pos.y))) { // [T124] the below-box fallback is LEGACY-CONTACT-only: during an arc the arm-tick penetration made it false-ground the climber mid-air (probe t8 g=1 — one tick of ground physics inside the climb). The exact |Δy|<0.09 path still grounds the settle tick (pos.y ≈ topY by the curve's own final sample).
    // land
    if (!wasGrounded && impactV < -1) {
      const fall = s.apexY - s.pos.y;
      ev.land = { impactV, fall };
    }
    s.grounded = true; s.vel.y = 0; s.groundedTime = 0;
  } else s.groundedTime += dt;
  if (s.grounded) s.apexY = s.pos.y; else s.apexY = Math.max(s.apexY, s.pos.y);
  // T1-3 superglide expiry: landed with no buffered pop coming → drop the keep flag
  if (T && s.grounded && s.jumpBufT <= 0) s.sgKeepT = 0;

  // jump pads (player.js:186-191) — SFX -> ev.pad
  for (const jp of world.jumpPads) {
    if (s.grounded && Math.hypot(s.pos.x - jp.pos.x, s.pos.z - jp.pos.z) < jp.r && Math.abs(s.pos.y - jp.pos.y) < 1.2) {
      s.vel.y = CFG.MAP.jumpPadLaunch; s.grounded = false; s.apexY = s.pos.y;
      ev.pad = { x: jp.pos.x, y: jp.pos.y, z: jp.pos.z };
    }
  }
  return ev;
}
