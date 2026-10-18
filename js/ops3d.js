// ============================================================
// IRONSIGHT — ops3d.js : the skinned OPERATOR body runtime [T130].
// The roster (10 < 20, the brief's clause) rides CDN-hosted, full-skeleton
// Mixamo-rig GLBs — the SAME domain scope as the engine itself (the
// jsDelivr three@r170 package tree, CORS *) with a verified registry:
//   Soldier.glb          49-bone mixamorig — Idle/Walk/Run/TPose  (faces -Z, the three.js blending example camera law)
//   Xbot.glb             67-bone mixamorig — idle/walk/run/sneak_pose/… (faces +Z, the additive example camera law)
//   RobotExpressive.glb  43-bone ×2        — Death/Jump/Sitting/… (spare; faces +Z)
// EVERY URL was fetched + JSON-chunk-parsed (skins/joints/clips read from
// the bytes, T130 recon) — nothing in the registry is guessed.
//
// LAWS:
//  · CDN-FIRST, PRIMITIVES-SAFE — every load can fail (offline host, blocked
//    CDN); the caller's procedural body stays until `ready`, and `failed`
//    flips instead of throwing. The game never loses a body.
//  · SCALE IS MEASURED, NOT ASSUMED — the bind-pose bbox calibrates the
//    root to the P.height (1.8 m) capsule; feet at y=0, centered on x/z.
//  · CLIPS ARE PROBED, NOT HOPED — the state machine matches loaded clip
//    names through alias lists and RECORDS coverage (stats: found/missing
//    per rig). Missing states fall through honestly (crouch → slowed walk
//    + lowered root; death → caller's fall presentation if no Death clip).
//  · THE HAND IS ANATOMICAL — the in-hand weapon parents to the
//    mixamorig:RightHand BONE. The mount quaternion comes from the bind
//    matrices (model-forward = hand-local −Y → Rx(−π/2) maps a −Z barrel
//    onto the grip axis), not from eyeballed offsets.
//  · NO WIRE CHANGE — bodies are presentation; the MP stream stays
//    untouched (the T119 TPV law: the rig reads the SAME state the
//    physics wrote this frame).
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { World, rayAABB } from './world.js'; // [T138] THE CORPSE GROUND — the death-spot PLANE retires for the real collision mesh (the T133 honest residual). No cycle: world imports config/maps/effects, never ops3d.

const BASE = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/models/gltf/';

// the verified registry — recon-proved T130 (skins/joints/clips parsed from bytes)
export const OPS3D_MODELS = {
  soldier: {
    url: BASE + 'Soldier.glb',
    yawFix: Math.PI,            // faces −Z natively (example camera at −Z sees the front)
    aliases: {
      idle: ['idle'], walk: ['walk'], run: ['run', 'running'],
      crouch: ['sneak'], jump: ['jump'], death: ['death'], emote: ['dance', 'wave'],
      wave: ['wave'], nod: ['nod', 'agree'], // [T123] the mugshot emote states — Soldier.glb has neither (honest missing → the studio's procedural layer), the registry law records it
    },
  },
  xbot: {
    url: BASE + 'Xbot.glb',
    yawFix: 0,                  // faces +Z natively (additive example camera at +Z sees the front)
    aliases: {
      idle: ['idle'], walk: ['walk'], run: ['run', 'running'],
      crouch: ['sneak'], jump: ['jump'], death: ['death'], emote: ['agree', 'wave', 'dance'],
      wave: ['wave'], nod: ['agree', 'headshake'], // [T123] Xbot carries BOTH real — the nullstate line emotes are clips
    },
  },
  robot: {
    url: BASE + 'RobotExpressive/RobotExpressive.glb',
    yawFix: 0,                  // faces +Z (the morph example camera at +Z sees the front)
    aliases: {
      idle: ['idle', 'standing'], walk: ['walking'], run: ['running'],
      crouch: ['sitting'], jump: ['jump', 'walkjump'], death: ['death'], emote: ['dance', 'wave', 'thumbsup'],
      wave: ['wave'], nod: ['nod', 'agree'], // [T123] spare rig stays symmetric
    },
  },
};

// operator → body map (operators.js side law: pact = soldier line, nullstate = xbot line)
export const OPS3D_ASSIGN = {
  ranger: 'soldier', vital: 'soldier', bulwark: 'soldier', quartermaster: 'soldier', herald: 'soldier', aurum: 'soldier',
  wraith: 'xbot', specter: 'xbot', volt: 'xbot', vanta: 'xbot',
};

const HEIGHT = 1.8;          // the capsule law (config.js P.height)
const HAND_MOUNT_ROT = new THREE.Euler(-Math.PI / 2, 0, 0); // bind-matrix law: barrel(−Z) → hand-local −Y
const HAND_MOUNT_POS = new THREE.Vector3(0, -0.04, 0.02);   // grip offset into the palm (single tunable pair)
const FADE = 0.18;           // crossfade seconds (the T120 squash-lerp family)

const CACHE = new Map();     // url → Promise<{scene, clips}> — one fetch per model, SkeletonUtils.clone per rig
const STATS = [];            // per-rig coverage record (the honest log; surfaced on window.__IR.ops3d)

const _box = new THREE.Box3();
const _v = new THREE.Vector3();

// ---------------- [T133] THE VERLET CORPSE — the unity→three ragdoll conversion ----------------
// CoD/Unity drives corpses with an articulated ragdoll (ConfigurableJoints over the
// death pose). three@r170 ships no physics engine, so the conversion is the classic
// particle formulation (Jakobsen's verlet ragdoll — the same constraint math Unity's
// joint solver approximates): KEY SKELETON BONES become verlet particles, skeleton
// adjacency becomes distance sticks, gravity + 4 constraint passes + a ground plane
// replace the rigidbody solver, and the solved positions are written back as BONE
// ROTATIONS ONLY (bone positions stay at rest — the skinning never stretches), with
// the rig ROOT tracking the hips particle so the whole corpse translates with the sim
// (a mid-air death falls; a ground death stays put). Both registry rigs are mixamorig,
// so one name-resolving builder covers the soldier line AND the xbot line (the T131
// law: probe colon + colon-less spellings — the current bytes dropped the ':').
// Fallback law: any missing CORE bone → the legacy Death-clip path keeps the corpse
// (never guessed, recorded in stats.ragdoll). Sleep law: after RAG_SLEEP seconds the
// sim freezes where it lies (the CoD corpse-settle read; zero per-frame cost after).
const RAG_POINTS = [ // [particleKey, boneName, core?] — a bone ORIGIN is the joint it defines
  ['head', 'Head', true], ['chest', 'Spine2', true], ['hips', 'Hips', true],
  ['elbowL', 'LeftForeArm', true], ['handL', 'LeftHand', false],
  ['elbowR', 'RightForeArm', true], ['handR', 'RightHand', false],
  ['kneeL', 'LeftLeg', true], ['footL', 'LeftFoot', false],
  ['kneeR', 'RightLeg', true], ['footR', 'RightFoot', false],
];
const RAG_BONES = [ // [boneName, parentParticle, childParticle] — write-back order = hierarchy order (parents before children)
  ['Spine', 'hips', 'chest'], ['Spine1', 'hips', 'chest'], ['Spine2', 'hips', 'chest'],
  ['Head', 'chest', 'head'],
  ['LeftArm', 'chest', 'elbowL'], ['LeftForeArm', 'elbowL', 'handL'], ['LeftHand', 'elbowL', 'handL'],
  ['RightArm', 'chest', 'elbowR'], ['RightForeArm', 'elbowR', 'handR'], ['RightHand', 'elbowR', 'handR'],
  ['LeftUpLeg', 'hips', 'kneeL'], ['LeftLeg', 'kneeL', 'footL'], ['LeftFoot', 'kneeL', 'footL'],
  ['RightUpLeg', 'hips', 'kneeR'], ['RightLeg', 'kneeR', 'footR'], ['RightFoot', 'kneeR', 'footR'],
];
const RAG_PARENT = { // each mapped bone's quaternion parent — the world-quat walk climbs this
  Spine: 'Hips', Spine1: 'Spine', Spine2: 'Spine1', Head: 'Neck',
  LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
  RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
  LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg',
  RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg',
};
const RAG_SLEEP = 2.4; // seconds of sim before the corpse settles

const _strip = (n) => (n || '').replace(/^mixamorig:?/, ''); // the T131 naming law — colon and colon-less spellings normalize to the bare name
const _rpv = new THREE.Vector3(), _rpq = new THREE.Quaternion(), _rpq2 = new THREE.Quaternion(), _rpq3 = new THREE.Quaternion();
const _rpm = new THREE.Matrix4(), _rpv2 = new THREE.Vector3();

function ragBuild(handle, deadDir, knock) {
  const R = handle._root; if (!R) return null;
  const bone = (n) => R.getObjectByName('mixamorig:' + n) || R.getObjectByName('mixamorig' + n) || R.getObjectByName(n) || null;
  handle.group.updateWorldMatrix(true, true); // one full-subtree refresh — the capture must read the render-current pose
  const pts = {}; const list = [];
  for (const [key, name, core] of RAG_POINTS) {
    const b = bone(name);
    if (!b) { if (core) return null; continue; } // a missing CORE bone → honest null (the legacy clip path keeps the corpse)
    const wp = new THREE.Vector3(); b.getWorldPosition(wp);
    const p = { x: wp.x, y: wp.y, z: wp.z, px: wp.x, py: wp.y, pz: wp.z, r: key === 'head' ? 0.11 : 0.085 };
    pts[key] = p; list.push(p);
  }
  const sticks = []; const seen = new Set();
  for (const [, pk, ck] of RAG_BONES) { // skeleton adjacency → sticks (deduped — Spine/Spine1/Spine2 share the hips|chest pair)
    if (!pts[pk] || !pts[ck]) continue;
    const id = pk < ck ? pk + '|' + ck : ck + '|' + pk;
    if (seen.has(id)) continue; seen.add(id);
    const a = pts[pk], b = pts[ck];
    sticks.push({ a, b, len: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), k: 1 });
  }
  if (pts.head && pts.hips) { const a = pts.hips, b = pts.head; sticks.push({ a, b, len: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), k: 0.85 }); } // the torso brace — without it the spine folds in half
  const gp = new THREE.Vector3(); handle.group.getWorldPosition(gp);
  const rd = { pts, list, sticks, map: [], floor: gp.y, t: 0, damp: 0.985, meshColl: !!(World.colliders && World.colliders.length) }; // [T138] meshColl arms the mesh ground + wall pushout (no colliders yet → the legacy death-spot plane stays)
  // the write-back map + parent-quat wiring: a MAPPED ancestor donates its LIVE solved
  // world quat (plus the static local-quat chain between the two); an unmapped/static
  // chain (Hips → scene root) is baked once — those locals never change during the sim.
  const byName = {};
  for (const [name, pk, ck] of RAG_BONES) {
    if (!pts[pk] || !pts[ck]) continue;
    const b = bone(name); if (!b) continue;
    const e = { bone: b, pa: pts[pk], pb: pts[ck], restLocalQ: b.quaternion.clone(), worldQ: new THREE.Quaternion(), baseRef: null, baseStatic: null };
    b.getWorldQuaternion(e.worldQ);
    e.deathWorldQ = e.worldQ.clone();          // the pose the per-frame delta rotates FROM
    e.restDir = new THREE.Vector3(e.pb.x - e.pa.x, e.pb.y - e.pa.y, e.pb.z - e.pa.z).normalize(); // the DEATH-pose dir — the sticks hold these lengths
    byName[_strip(name)] = e; rd.map.push(e);
  }
  for (const e of rd.map) {
    const acc = new THREE.Quaternion();
    let n = e.bone.parent, done = false;
    while (n) {
      const pe = byName[_strip(n.name)];
      if (pe && pe !== e) { e.baseRef = { q: pe.worldQ, acc }; done = true; break; } // live: parent's solved quat × the static in-between locals
      acc.premultiply(n.quaternion); // unmapped local quats are frozen for the corpse's lifetime — bake them in walking order (higher locals premultiply)
      n = n.parent;
    }
    if (!done) e.baseStatic = acc; // scene root reached: the accumulated chain IS the world quat (the root's own parent is null)
  }
  rd.rootOff = (() => { // the root-follow anchor: hips bone offset from the group origin at capture
    const hb = bone('Hips'); if (!hb) return null;
    const hw = new THREE.Vector3(); hb.getWorldPosition(hw);
    return hw.sub(gp);
  })();
  // the kill impulse — verlet velocity IS (pos − prev), so the injection subtracts from prev.
  // [T138] THE KNOCK LAW — damage-scaled via config.knockFor (1.5 floor + dmg/60, cap 3.0): the
  // flat 2.1 first-take retires. Callers pass the kill's damage (main/bots) or the weapon lookup
  // (mp, via the kill event's w id). Absent/unshaped knock keeps the honest 2.1 default.
  const imp = (typeof knock === 'number' && knock > 0) ? knock : 2.1, c = pts.chest;
  if (deadDir) {
    c.px = c.x - deadDir.x * imp; c.py = c.y - 0.55 * imp; c.pz = c.z - deadDir.z * imp; // the chest takes the hit + the up-shrug (the CoD knock-back read)
    if (pts.head) { const h = pts.head; h.px = h.x - deadDir.x * imp * 0.5; h.py = h.y - 0.2; h.pz = h.z - deadDir.z * imp * 0.5; }
  } else { c.py = c.y + 0.75; } // WORLD deaths (void/fall, no killer dir): a small settle shrug still collapses the torso
  handle.stats.ragdoll = 'on (' + rd.map.length + ' bones, ' + rd.sticks.length + ' sticks)';
  return rd;
}

const _rgO = new THREE.Vector3(), _rgD = new THREE.Vector3(0, -1, 0); // the ground ray scratch (module scratch — the file's idiom)
function ragStep(rd, dt) {
  const d = Math.min(dt, 0.05);
  const g = -9.81 * d * d, damp = rd.damp;
  const coll = rd.meshColl ? World.colliders : null;
  if (coll) { // [T138] THE MESH GROUND — one down-ray PER PARTICLE PER FRAME (11 rays/corpse,
    // constraint passes reuse the sample): a corpse now lands on crates/ledges/slopes at the
    // real collider top, not the death-spot plane. Miss → the death-spot floor stays the fallback.
    for (const p of rd.list) {
      _rgO.set(p.x, p.y + 0.45, p.z);
      const hit = rayAABB(_rgO, _rgD, 3.2);
      p.gy = (hit && hit.t > 0.02) ? (_rgO.y - hit.t) + p.r : rd.floor + p.r; // t≈0 = the origin is INSIDE a box (post-pushout edge) — the plane fallback reads saner than a pop to the lid
    }
  }
  for (const p of rd.list) {
    const nx = p.x + (p.x - p.px) * damp, ny = p.y + (p.y - p.py) * damp + g, nz = p.z + (p.z - p.pz) * damp;
    p.px = p.x; p.py = p.y; p.pz = p.z; p.x = nx; p.y = ny; p.z = nz;
  }
  if (coll) { // [T138] THE WALL READ — once per frame post-integrate (cost-honest): a particle
    // inside a collider (padded by its radius) pushes out along the SHALLOWEST HORIZONTAL face
    // with a damped bounce; the vertical axis stays owned by the ground ray (no pop fights).
    for (const p of rd.list) {
      for (const b of coll) {
        if (p.x <= b.min.x - p.r || p.x >= b.max.x + p.r || p.y <= b.min.y - p.r || p.y >= b.max.y + p.r || p.z <= b.min.z - p.r || p.z >= b.max.z + p.r) continue;
        const ex = (b.max.x + p.r) - p.x, ex0 = p.x - (b.min.x - p.r);
        const ez = (b.max.z + p.r) - p.z, ez0 = p.z - (b.min.z - p.r);
        const m = Math.min(ex, ex0, ez, ez0);
        if (m === ex) { p.x = b.max.x + p.r; p.px = p.x + (p.x - p.px) * 0.45; }
        else if (m === ex0) { p.x = b.min.x - p.r; p.px = p.x + (p.x - p.px) * 0.45; }
        else if (m === ez) { p.z = b.max.z + p.r; p.pz = p.z + (p.z - p.pz) * 0.45; }
        else { p.z = b.min.z - p.r; p.pz = p.z + (p.z - p.pz) * 0.45; }
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    for (const s of rd.sticks) {
      const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, dz = s.b.z - s.a.z;
      const dist = Math.hypot(dx, dy, dz) || 1e-6;
      const f = (dist - s.len) / dist * 0.5 * s.k;
      s.a.x += dx * f; s.a.y += dy * f; s.a.z += dz * f;
      s.b.x -= dx * f; s.b.y -= dy * f; s.b.z -= dz * f;
    }
    for (const p of rd.list) { // the ground contact — [T138] the per-particle mesh sample when armed, the death-spot plane otherwise (the T133 fallback, kept for collider-less worlds)
      const fl = (p.gy !== undefined ? p.gy : rd.floor + p.r);
      if (p.y < fl) {
        p.y = fl;
        p.px = p.x - (p.x - p.px) * 0.55; p.pz = p.z - (p.z - p.pz) * 0.55; // contact friction
        p.py = p.y + (p.y - p.py) * 0.18; // a sliver of restitution
      }
    }
  }
}

function ragPose(rd, handle) {
  for (const e of rd.map) { // world-quat walk — RAG_BONES order guarantees parents solve first
    _rpv.set(e.pb.x - e.pa.x, e.pb.y - e.pa.y, e.pb.z - e.pa.z).normalize();
    _rpq.setFromUnitVectors(e.restDir, _rpv).multiply(e.deathWorldQ); // world: the delta FROM the death pose
    const base = e.baseRef ? _rpq3.copy(e.baseRef.q).multiply(e.baseRef.acc) : e.baseStatic;
    _rpq2.copy(base).invert().multiply(_rpq); // local = parentWorld⁻¹ × targetWorld
    e.bone.quaternion.copy(_rpq2);
    e.worldQ.copy(_rpq);
  }
  if (rd.rootOff) { // THE ROOT FOLLOW — the group tracks the hips particle (a mid-air death falls with the sim); the parent's last-render matrixWorld converts world → local
    const h = rd.pts.hips, par = handle.group.parent;
    if (par) {
      _rpv2.set(h.x - rd.rootOff.x, h.y - rd.rootOff.y, h.z - rd.rootOff.z); // desired group ORIGIN in world
      _rpm.copy(par.matrixWorld).invert();
      _rpv2.applyMatrix4(_rpm);
      handle.group.position.copy(_rpv2);
    }
  }
}

function ragRestore(rd) { // respawn — the captured locals return and the mixer (resuming in the same update) rewrites the full pose
  for (const e of rd.map) e.bone.quaternion.copy(e.restLocalQ);
  rd.t = 0;
}

function loadModel(url) {
  if (!CACHE.has(url)) {
    CACHE.set(url, new Promise((res, rej) => {
      new GLTFLoader().load(url,
        (g) => res({ scene: g.scene, clips: g.animations || [] }),
        undefined, () => { CACHE.delete(url); rej(new Error('ops3d load fail ' + url)); });
    }));
  }
  return CACHE.get(url);
}

function clipFor(clips, aliases) { // case-insensitive contains — 'sneak_pose' matches 'sneak'
  for (const a of aliases) { const hit = clips.find(c => c.name.toLowerCase().includes(a)); if (hit) return hit; }
  return null;
}

function tint(root, hex) { // team/finish tint — clone materials once, mix 45% toward the tint (the finish law keeps STOCK readable)
  if (!hex) return;
  const c = new THREE.Color(hex);
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = (Array.isArray(o.material) ? mats.map(m => m.clone()) : mats[0].clone());
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (m.color) m.color.lerp(c, 0.45);
      if ('roughness' in m) { m.roughness = Math.max(0.55, m.roughness); m.metalness = Math.min(0.35, m.metalness || 0); }
      if (m.map) { m.map.anisotropy = 4; }
    }
  });
}

/**
 * ops3dRig(opId, opts) → handle | null
 *  handle: { group, ready, failed, mode, update(dt, st), hand, attach(g), stats }
 *   group   — add to any parent; feet at local y=0, faces +Z after yawFix (the tpBody contract)
 *   ready   — true once the skinned root is live (caller may drop its primitives then)
 *   failed  — true on load failure (caller keeps primitives forever; no retry spam)
 *   update(dt, st) — st: { speed, grounded, crouch, prone, dead, deadDir, knock, ladder, swim, ads, emote, dt } // [T138] knock: the damage-scaled ragdoll impulse (config.knockFor)
 *   attach(g) — parent a weapon group to the right-hand BONE (returns true on anatomical mount)
 *   stats — { op, model, found:[state…], missing:[state…], height }
 */
export function ops3dRig(opId, opts = {}) {
  const modelKey = OPS3D_ASSIGN[opId] || (opts.model || 'soldier');
  const M = OPS3D_MODELS[modelKey];
  if (!M) return null;
  const group = new THREE.Group();
  const handle = {
    group, ready: false, failed: false, mode: 'gltf', hand: null,
    stats: { op: opId, model: modelKey, found: [], missing: [], height: 0 },
    _mixer: null, _acts: {}, _cur: null, _deathDone: false, _root: null,
    _rag: null, _ragTried: false, // [T133] the verlet corpse — one honest build attempt per life, then the legacy clip path if it failed
  };

  loadModel(M.url).then(({ scene, clips }) => {
    if (handle.disposed) return;
    const root = SkeletonUtils.clone(scene);
    // [T131] THE MEASUREMENT LAW — r170 SkinnedMesh carries its OWN pose-dependent
    // .boundingBox: Box3.setFromObject calls computeBoundingBox, which reads
    // skeleton.boneMatrices — ZERO on a fresh clone until the first render — so the
    // measure collapses to ~0.004 and the 1.8 m calibration would scale the body
    // 180× (the live-reproduced T130 defect). Fix [T131b v2]: refresh world matrices +
    // bone matrices from the CLONED REST transforms, drop any cached box, THEN measure
    // (the earlier pose() call was the overreach — it collapses Xbot, see the v2 law below).
    root.traverse(o => { if (o.isSkinnedMesh) o.boundingBox = null; });
    root.updateMatrixWorld(true);
    root.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.update(); }); // [T131b] THE MEASURE LAW v2 — boneMatrices materialize from the CLONED REST transforms alone; Skeleton.pose() is REMOVED (live-probed A/B: Xbot's bind inverses drive pose() to an origin-collapse — 0.018 m, sub-sanity → every xbot rig silently box-rigged since T115 — while the rest-pose path measures 1.809 m, byte-identical to the source scene; Soldier measures 1.832 m either way). The clone needs updateMatrixWorld + skeleton.update, nothing more.
    root.traverse(o => { if (o.isSkinnedMesh) o.boundingBox = null; });
    // MEASURED scale + recenter: bbox → HEIGHT, feet at 0, centered x/z
    _box.setFromObject(root);
    const h = Math.max(0.01, _box.max.y - _box.min.y);
    // [T131] the calibration sanity window — a humanoid rig must land near 1.8 m;
    // anything outside [0.5, 4] means unusable bytes/pose → fail honestly (the
    // caller's procedural body stays; the CDN-first law never loses a body).
    if (!(h > 0.5 && h < 4)) {
      handle.failed = true; handle.mode = 'failed';
      handle.stats.missing.push('calibration');
      return;
    }
    const s = HEIGHT / h;
    handle.stats.height = +h.toFixed(3);
    root.scale.setScalar(s);
    _box.setFromObject(root);
    root.position.x -= (_box.min.x + _box.max.x) / 2;
    root.position.z -= (_box.min.z + _box.max.z) / 2;
    root.position.y -= _box.min.y;
    root.rotation.y = M.yawFix; // the recon law — each model's native facing corrected to +Z
    const inner = new THREE.Group(); // yawFix wrapper (root position stays the calibration truth)
    inner.add(root); group.add(inner);
    tint(root, opts.tint);
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    handle._root = root;

    const mixer = new THREE.AnimationMixer(root);
    handle._mixer = mixer;
    for (const st of ['idle', 'walk', 'run', 'crouch', 'jump', 'death', 'emote', 'wave', 'nod']) { // [T123] the emote pair joins the probe — found/missing recorded per rig
      const hit = clipFor(clips, M.aliases[st] || [st]);
      if (hit) { handle._acts[st] = mixer.clipAction(hit); handle.stats.found.push(st); }
      else handle.stats.missing.push(st);
    }
    const idle = handle._acts.idle;
    if (idle) { idle.play(); handle._cur = 'idle'; }
    const hand = root.getObjectByName('mixamorig:RightHand') ||
                 root.getObjectByName('mixamorigRightHand') || // [T131] the current gh@r170 bytes name bones WITHOUT the colon — both spellings probed
                 root.getObjectByName('RightHand') ||
                 (root.getObjectByProperty('type', 'Bone') ? root.getObjectByProperty('type', 'Bone').parent : null);
    handle.hand = hand;
    handle.ready = true;
    STATS.push(handle.stats);
    if (STATS.length > 64) STATS.shift();
  }).catch(() => { handle.failed = true; handle.mode = 'failed'; });

  const pick = (st) => { // the honest fallthrough ladder
    if (handle._acts[st]) return st;
    return null;
  };

  handle.update = (dt, st) => {
    if (!handle.ready || !handle._mixer) return;
    // [T133] THE RAGDOLL GATE — death hands the bones to the verlet sim; the mixer stays
    // OFF for the corpse's lifetime (a live action would fight the bone write-back every
    // frame). One build attempt per life; a failed build (missing core bones) falls to
    // the legacy Death-clip path below, exactly as pre-T133.
    if (st.dead && !handle._rag && !handle._ragTried) {
      handle._ragTried = true;
      handle._rag = ragBuild(handle, st.deadDir || null, st.knock); // [T138] the knock rides the state (config.knockFor — the damage-scaled law)
      if (handle._rag) { handle._mixer.stopAllAction(); handle._cur = null; }
    }
    if (!st.dead && handle._rag) { ragRestore(handle._rag); handle._rag = null; handle._ragTried = false; } // respawn: the rest locals return, the mixer resumes in this same call
    if (handle._rag) {
      if (st.dead && handle._rag.t < RAG_SLEEP) { ragStep(handle._rag, dt); ragPose(handle._rag, handle); handle._rag.t += Math.min(dt, 0.05); } // sleep law: past RAG_SLEEP the bones freeze where they lie — zero per-frame cost
      return;
    }
    if (!st.dead) handle._deathDone = false; // [T133] the one-shot resets per life (pre-T133 it never did)
    handle._mixer.update(dt);
    let want = null, rate = 1;
    if (st.dead) { want = pick('death'); if (want && !handle._deathDone) { handle._deathDone = true; } }
    else if (st.emote) { want = (typeof st.emote === 'string' && pick(st.emote)) || pick('emote'); } // [T123] the emote KEY rides — 'wave'/'nod' pick their own clip (boolean true keeps the legacy 'emote' alias; unknown keys fall through honestly)
    else if (st.ladder) { want = pick('walk') || pick('idle'); rate = 0.7; }
    else if (st.swim) { want = pick('walk') || pick('run'); rate = 0.55; }
    else if (!st.grounded && !st.dead) { want = pick('jump') || pick('run') || pick('walk'); rate = 0.8; }
    else if (st.prone > 0.5) { want = pick('crouch') || pick('idle'); rate = 0.45; handle._root.rotation.x = st.proneBack ? -1.25 : 1.25; } // [T132] prone lands on the FRONT by default (+1.25 tips the head along the +Z facing = belly-down — the user playtest: "in prone the character lays on back"); a supine DIVE entry (proneBack, the BO6 omnimovement law) keeps the −1.25 back read. No prone clip on any registry model — the honest procedural lie (rotated root), logged in missing
    else {
      if (st.crouch > 0.5) { want = pick('crouch'); rate = 1; handle._root.rotation.x = 0; }
      if (!want) {
        const sp = st.speed || 0;
        if (sp > 4.6) { want = pick('run'); rate = Math.min(1.5, Math.max(0.8, sp / 6.2)); }
        else if (sp > 0.35) { want = pick('walk'); rate = Math.min(1.6, Math.max(0.55, sp / 2.1)); }
        else want = pick('idle');
      }
      if (handle._root && !(st.prone > 0.5)) handle._root.rotation.x += ((st.crouch > 0.5 ? -0.22 : 0) - handle._root.rotation.x) * Math.min(1, dt * 9);
    }
    if (st.dead && handle._root && st.deadRotate) handle._root.rotation.x = -Math.PI / 2 * Math.min(1, st.deadT || 1); // death without a Death clip: the caller's fall read
    if (!want) want = 'idle' in handle._acts ? 'idle' : null;
    if (want !== handle._cur) {
      const next = want ? handle._acts[want] : null;
      const prev = handle._cur ? handle._acts[handle._cur] : null;
      if (next) { next.reset(); next.fadeIn(FADE).play(); next.timeScale = rate; }
      if (prev) prev.fadeOut(FADE);
      handle._cur = want;
    } else if (want && handle._acts[want]) handle._acts[want].timeScale = rate;
  };

  handle.attach = (g) => { // anatomical hand mount — true when the bone exists
    if (!handle.hand) return false;
    g.position.copy(HAND_MOUNT_POS);
    g.rotation.copy(HAND_MOUNT_ROT);
    handle.hand.add(g);
    return true;
  };

  handle.dispose = () => {
    handle.disposed = true;
    if (handle._mixer) handle._mixer.stopAllAction();
    group.removeFromParent();
  };

  return handle;
}

export function ops3dStats() { return STATS.slice(); }
