// ============================================================
// IRONSIGHT — weapons.js : weapon system + procedural viewmodels
// Recoil patterns [AK docs: 5 stable → climb → L/R drift],
// tactical/empty reload, shotgun shell load, grenades, flash, melee
// ============================================================
import * as THREE from 'three';
import { CFG, WEAPONS, MELEE, FRAG, FLASH, ATTACHMENTS } from './config.js';
import { World, rayAABB, segmentBlocked } from './world.js';
import * as FX from './effects.js';
import * as SFX from './audio.js';
import { padRumble } from './gamepad.js';
import { sendFire } from './mp.js'; // MP-2: fire rays to the authoritative server (no-op unless mp.joined)
import { finishById, charmById } from './cosmetics.js'; // T2-5 Phase 1+3 (Task 48/55): pure defs — no cycle (cosmetics imports nothing)

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

export function makeWeapon(defId, attachIds = []) {
  const base = WEAPONS.find(w => w.id === defId);
  const def = { ...base, falloff: [...base.falloff], stats: { ...base.stats } };
  for (const a of attachIds) if (ATTACHMENTS[a]) ATTACHMENTS[a].apply(def);
  def.recoilMult = def._recoilMult || 1;
  def.attachIds = [...attachIds];
  return { def, mag: def.mag, reserve: def.reserve, attachIds: def.attachIds };
}

// ---------------- viewmodel building ----------------
const vmMat = (c, m = 0.6, r = 0.45) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
function box(g, x, y, z, w, h, d, mat) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.position.set(x, y, z); g.add(b); return b;
}
export function buildViewModel(def, fin = null, charm = null, hands = true) {
  const g = new THREE.Group();
  const dark = vmMat(0x23272e, 0.5, 0.5), body = vmMat(0x3a4048, 0.55, 0.4),
    grip = vmMat(0x1b1e24, 0.3, 0.8), accent = vmMat(0x6a4a2f, 0.2, 0.7);
  // T2-5 Phase 1 (Task 48): finish tint — body+accent only (grip/dark stay gunmetal for
  // silhouette depth); materials are per-build fresh (vmMat above) so mutation is bleed-free.
  // 'default'/null → stock look, byte-compat with pre-T48 builds.
  if (fin && fin.body !== undefined) {
    body.color.setHex(fin.body); body.metalness = fin.metal ?? 0.6; body.roughness = fin.rough ?? 0.45;
    accent.color.setHex(fin.accent); accent.metalness = fin.metal ?? 0.6; accent.roughness = fin.rough ?? 0.45;
  }
  // T1-5 (Task 37-a): viewmodel size is DATA-DRIVEN via def.vmLen/vmMagH/vmNoStock; the
  // legacy id-based ternaries remain as fallbacks for the six original weapons (byte-compat).
  const L = def.vmLen || (def.id === 'longshot' ? 1.0 : def.id === 'mauler' ? 0.78 : def.id === 'p9' ? 0.32 : 0.6);
  box(g, 0, 0, -L * 0.4, 0.09, 0.11, L, body);                        // receiver
  const barrel = box(g, 0, 0.015, -L * 0.4 - L * 0.55, 0.045, 0.045, L * 1.1, dark); // barrel
  box(g, 0, -0.085, -0.06, 0.07, 0.14, 0.1, grip);                    // grip
  const mag = box(g, 0, -0.11, -L * 0.38, 0.07, def.vmMagH || (def.id === 'wasp' || def.id === 'ripper' ? 0.3 : 0.2), 0.09, dark);
  if (def.id !== 'p9' && !def.vmNoStock) box(g, 0, -0.005, 0.16, 0.07, 0.09, 0.24, accent); // stock — [T129 item1] y +0.02→−0.005: the butt end dropped 2.5 cm (the T117 pose pitch alone still left the rear riding high on screen)
  // sights / scope
  if (def.scope) {
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 12), dark);
    sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.095, -L * 0.35); g.add(sc);
  } else {
    box(g, 0, 0.075, -L * 0.72, 0.016, 0.035, 0.02, dark);            // front post
    box(g, 0, 0.07, -0.05, 0.03, 0.03, 0.02, dark);                   // rear
  }
  if (def.attachIds?.includes('suppressor')) box(g, 0, 0.015, -L * 0.4 - L * 1.15, 0.055, 0.055, 0.26, dark);
  if (def.attachIds?.includes('foregrip')) box(g, 0, -0.075, -L * 0.72, 0.05, 0.12, 0.05, grip);
  // [T132] the held-weapon hands (the user playtest: "hands-holding-weapon (or just fists)"):
  // two glove fists wrapping the pistol grip + the handguard — they ride the vm group so
  // EVERY existing animation (sway/reload/sprint/melee) carries them for free. The skinned
  // TPV mount strips them (userData.hands — the skeleton hand does the gripping); the
  // primitives TPV mount and the FP viewmodel keep them.
  if (hands) {
    const glove = vmMat(0x24262c, 0.15, 0.85);
    const hArr = [];
    hArr.push(box(g, 0.012, -0.105, -0.055, 0.088, 0.105, 0.115, glove)); // trigger fist (wraps the grip)
    hArr.push(box(g, 0.01, -0.15, 0.02, 0.075, 0.07, 0.1, glove));       // wrist stub behind the grip
    if (def.id === 'p9') hArr.push(box(g, -0.048, -0.12, -0.045, 0.075, 0.09, 0.1, glove)); // support cup (the two-hand pistol grip)
    else hArr.push(box(g, 0, -0.095, -L * 0.7, 0.082, 0.095, 0.115, glove)); // support fist (handguard — rides the foregrip when equipped)
    g.userData.hands = hArr;
  }
  // muzzle anchor
  const mz = new THREE.Object3D(); mz.position.set(0, 0.015, -L * 0.4 - L * 1.1 - (def.attachIds?.includes('suppressor') ? 0.26 : 0));
  g.add(mz); g.userData.muzzle = mz;
  g.userData.mag = mag;
  // T2-5 Phase 3 (Task 55, §39.2): viewmodel charm — LOCAL ONLY, zero wire (remote actors
  // are capsule-only; §32.3 law extended). Pendulum pivot at the receiver rear; geometry
  // by shape; userData.charm carries the pivot for the dt-driven swing in update().
  if (charm && charm.shape) {
    const cm = new THREE.MeshStandardMaterial({ color: charm.color, metalness: 0.85, roughness: 0.3 });
    const pivot = new THREE.Group(); pivot.position.set(0, -0.02, 0.12);
    box(pivot, 0, -0.045, 0, 0.008, 0.05, 0.008, grip); // pendulum link (grip metal)
    if (charm.shape === 'tag') box(pivot, 0, -0.095, 0, 0.05, 0.065, 0.008, cm);
    else if (charm.shape === 'die') box(pivot, 0, -0.09, 0, 0.045, 0.045, 0.045, cm);
    else if (charm.shape === 'shell') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 8), cm); b.position.set(0, -0.1, 0); pivot.add(b); }
    else { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.032, 0), cm); b.position.set(0, -0.095, 0); pivot.add(b); } // orb
    g.add(pivot); g.userData.charm = pivot;
  }
  return g;
}

// ---------------- weapon system ----------------
export class WeaponSystem {
  constructor(camera, player, hooks) {
    this.cam = camera; this.player = player; this.hooks = hooks; // hooks: {targets(), onDamage(...), onShotNoise(pos), getSettings()}
    this.vmRoot = new THREE.Group();
    camera.add(this.vmRoot);
    this.slotWeapons = [null, null];      // primary, secondary instances
    this.cur = 0; this.lastSlot = 1;
    this.vm = null;                       // current viewmodel group
    this.state = 'idle';                  // idle|reload|swap|inspect|melee|nade
    this.stateT = 0; this.stateDur = 0; this.reloadStage = 0;
    this.fireT = 0; this.bloomT = 0; this.shotIdx = 0; this.triggerHeld = false;
    this.adsAmt = 0; this.ads = false; this.adsEdge = false; this.scope2 = false;
    this.sprintAmt = 0;
    this.swayX = 0; this.swayY = 0; this.kickZ = 0; this.kickRot = 0;
    this.nades = { frag: 3, flash: 2 };
    this.nadeType = 'frag';
    this.cooking = false; this.cookT = 0;
    this.meleeT = 0; this.meleeCd = 0;
    this.projectiles = [];                // grenades/flash
    this.inspectT = 0;
    this.reloadTotal = 0;
    this.baseFov = 95;
    this.charm = null;                    // T2-5 Phase 3 (Task 55): charmById def, ride the loadout
    this.emoteT = 0;                      // §39.4: emote dip timer — cosmetic, NO state-machine interaction
    this._cA = 0; this._cV = 0;           // §39.2: charm pendulum angle/velocity (deterministic)
  }

  setLoadout(loadout, settings) {
    this.slotWeapons[0] = makeWeapon(loadout.weapon, loadout.attachments[loadout.weapon] || []);
    this.slotWeapons[1] = makeWeapon(loadout.secondary, loadout.attachments[loadout.secondary] || []);
    this.nadeType = loadout.nade || 'frag';
    this.nades = { frag: 3, flash: 2 };
    this.baseFov = settings.fov;
    this.finish = finishById(loadout.finish); // T2-5 Phase 1 (Task 48): ride the loadout finish
    this.charm = charmById(loadout.charm); // T2-5 Phase 3 (Task 55): ride the loadout charm (garbage → 'none' fallback law)
    this.emoteT = 0; this._cA = 0; this._cV = 0; // fresh cosmetic state on loadout change
    this.cur = 0;
    if (this.vm) { this.vmRoot.remove(this.vm); this.vm = null; } // force fresh viewmodel (loadout may have changed)
    this.equip(0, true);
  }

  get w() { return this.slotWeapons[this.cur]; }
  get def() { return this.w.def; }

  equip(slot, instant = false) {
    if (!this.slotWeapons[slot] || (slot === this.cur && this.vm)) return;
    if (!instant) { this.lastSlot = this.cur; }
    this.cur = slot;
    this.state = instant ? 'idle' : 'swap'; this.stateT = 0; this.stateDur = instant ? 0 : this.def.swap;
    if (this.vm) this.vmRoot.remove(this.vm);
    this.vm = buildViewModel(this.def, this.finish, this.charm); // T2-5 Phase 1+3: finish- and charm-aware build
    this.vm.traverse(o => { o.frustumCulled = false; o.castShadow = false; o.renderOrder = 999; });
    this._cA = 0; this._cV = 0; // §39.2: pendulum resets on rebuild (equip path)
    this.vmRoot.add(this.vm);
    this.ads = false; this.scope2 = false; this.shotIdx = 0;
    SFX.equip(); // [T119] hotlinked draw takes (wpnArm) — the synth mag-out fallback lives in audio.equip
  }

  // T1-1 (SS22.4): Gun Game tier equip — build the weapon by id into the LIVE slot (full mag).
  // 'melee' tier needs NO equip: the knife is always available (KeyV -> weapons.melee(), MELEE
  // verbatim) — the finisher rule is "kill AT the melee tier", caller announces it.
  equipWeapon(id, instant = true) {
    if (id === 'melee') return;
    const def = WEAPONS.find(w => w.id === id);
    if (!def) return;
    this.slotWeapons[this.cur] = makeWeapon(id, []);
    this.slotWeapons[this.cur].reserve = def.reserve; // full loadout on advance
    this.equip(this.cur, instant);
  }

  reload() {
    const w = this.w, d = this.def;
    if (this.state !== 'idle' || w.mag >= d.mag || w.reserve <= 0) return;
    const empty = w.mag === 0;
    this.state = 'reload'; this.stateT = 0; this.reloadStage = 0;
    this.stateDur = empty ? d.reloadE : d.reloadT;
    this.reloadTotal = this.stateDur;
    this.ads = false;
    if (!d.shellLoad) SFX.reloadStart(d.id, empty); // [T117] hotlinked full reload take (not-empty vs empty); shellLoad feeds per-shell foley below
    if (this.hooks.onReload) this.hooks.onReload(w, empty); // T40 §24: MP server reload gate (fires once per reload start; shell-load approximated server-side)
    if (d.shellLoad) this.stateDur = 0; // handled incrementally
  }

  startReloadSounds() {
    const w = this.w, d = this.def;
    if (d.shellLoad) return;
    const p = this.stateT / this.stateDur;
    if (this.reloadStage === 0 && p > 0.15) { this.reloadStage = 1; SFX.reloadSounds(0, d.id); } // [T119] wid rides — staged bolt rifles play the repo start/loop/end takes
    if (this.reloadStage === 1 && p > 0.55) { this.reloadStage = 2; SFX.reloadSounds(1, d.id); }
    if (this.reloadStage === 2 && p > 0.85) { this.reloadStage = 3; SFX.reloadSounds(2, d.id); }
  }

  // ---------------- firing ----------------
  currentSpread() {
    const d = this.def, s = this.hooks.getSettings(), p = this.player;
    let sp = d.spreadBase;
    if (this.ads && d.adsSpread !== undefined) return d.adsSpread * (p.crouch > 0.5 ? 0.7 : 1);
    sp += Math.min(d.bloomMax, this.shotIdx * d.bloom);
    const move = p.speed2D() / CFG.PHYS.walkSpeed;
    sp += Math.min(1.4, move) * d.spreadMove * (this.ads ? 0.4 : 1);
    if (!p.grounded) sp += d.spreadJump;
    if (p.crouch > 0.5) sp *= 0.7;               // [CS2 crouch accuracy bonus]
    if (this.ads) sp *= 0.25;
    return sp;
  }

  tryFire(dt) {
    const d = this.def, w = this.w;
    if (this.state !== 'idle') { if (d.auto && this.triggerHeld) this.triggerHeld = false; return; }
    this.fireT -= dt;
    const want = d.auto ? this.triggerHeld : this._fireEdge;
    if (want && this.fireT <= 0) {
      if (w.mag <= 0) { SFX.dryFire(); this._fireEdge = false; this.triggerHeld = false; this.hooks.onDry && this.hooks.onDry(); if (w.reserve > 0) this.reload(); return; }
      this.fireT = 60 / d.rpm;
      this.shoot();
      this._fireEdge = false;
      if (!d.auto) this.triggerHeld = false;
    }
  }

  shoot() {
    const d = this.def, w = this.w, p = this.player, s = this.hooks.getSettings();
    w.mag--;
    this.shotIdx++;
    SFX.gunshot(d.sound, null, !!d.suppressed, d.id); // [T117] wid rides — the hotlink layer picks the per-weapon real voice
    padRumble('shot', (d.dmg || 20) / 34); // dual-rumble per shot, scaled by weapon damage class
    if (!d.suppressed) this.hooks.onShotNoise && this.hooks.onShotNoise(p.centerPos(_v3));
    // recoil [pattern per shot]
    const [pk, yk] = d.pattern(this.shotIdx - 1);
    p.recoilPitch += pk * d.recoilMult * (this.ads ? 0.82 : 1);
    p.recoilYaw += yk * d.recoilMult;
    // viewmodel kick
    this.kickZ = Math.min(0.09, this.kickZ + 0.045);
    this.kickRot = Math.min(0.14, this.kickRot + 0.05);
    // muzzle fx
    if (this.vm) {
      const mz = this.vm.userData.muzzle.getWorldPosition(_v1);
      FX.muzzle(mz, d.pellets > 1);
    }
    // rays — dedicated vectors (shared temps _v1/_v2 are consumed inside hitscan)
    const spread = this.currentSpread();
    const origin = p.eyePos(new THREE.Vector3());
    const fwd = p.forward(new THREE.Vector3());
    const targets = this.hooks.targets();
    const muzzleWorld = this.vm ? this.vm.userData.muzzle.getWorldPosition(new THREE.Vector3()) : origin.clone();
    const _apV = new THREE.Vector3(); // [v1.50 port T90] M1b temp
    for (let pel = 0; pel < d.pellets; pel++) {
      const dir = fwd.clone();
      if (spread > 0) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      }
      // [v1.50 port T90] §60.2 (v1.48) M1b: touch bullet magnetism — inside CFG.TOUCH.magnetismDeg (2.0°)
      // of the assisted target chest point, the ray bends to it. OFFLINE ONLY: in MP the
      // server owns the verdict (§10/§11) and a bent client ray would desync the wire.
      // assistPoint is set by main.js ONLY while the touch assist/auto-fire cone is live.
      if (!CFG.MP.enabled && this.assistPoint) {
        _apV.copy(this.assistPoint).sub(origin).normalize();
        if (dir.dot(_apV) > Math.cos(CFG.TOUCH.magnetismDeg * Math.PI / 180)) dir.copy(_apV);
      }
      if (CFG.MP.enabled) sendFire(origin, dir, d.id); // MP-2: the server owns the verdict (§10/§11); local FX stay
      this.hitscan(origin, dir, d, muzzleWorld, targets, pel === 0);
    }
    this.hooks.onAmmoChanged && this.hooks.onAmmoChanged();
  }

  hitscan(origin, dir, d, muzzleWorld, targets, showTracer) {
    // world hit
    const wHit = rayAABB(origin, dir, 300);
    let bestT = wHit ? wHit.t : 300, hitTarget = null, hitHead = false, hitPoint = null;
    for (const t of targets) {
      if (!t.alive || t === this.player && !this._canSelfHit) continue;
      // head box then body box
      const headC = t.headPos ? t.headPos(_v1) : t.centerPos(_v1).add(new THREE.Vector3(0, t.height * 0.3, 0));
      const bodyC = t.centerPos(_v2);
      const hs = 0.19;
      const tHead = rayBox(origin, dir, headC.x - hs, headC.y - hs, headC.z - hs, headC.x + hs, headC.y + hs, headC.z + hs);
      const bw = 0.42, bh = t.height ? t.height * 0.5 : 0.9;
      const tBody = rayBox(origin, dir, bodyC.x - bw, bodyC.y - bh, bodyC.z - bw, bodyC.x + bw, bodyC.y + bh * 0.9, bodyC.z + bw);
      let tHit = -1, head = false;
      if (tHead >= 0 && (tBody < 0 || tHead <= tBody)) { tHit = tHead; head = true; }
      else if (tBody >= 0) { tHit = tBody; }
      if (tHit >= 0 && tHit < bestT) { bestT = tHit; hitTarget = t; hitHead = head; hitPoint = origin.clone().addScaledVector(dir, tHit); }
    }
    if (hitTarget && hitPoint) { /* hit actor */ }
    else if (wHit) hitPoint = origin.clone().addScaledVector(dir, wHit.t);
    else hitPoint = origin.clone().addScaledVector(dir, 120);
    if (showTracer) FX.tracer(muzzleWorld, hitPoint, d.tracer !== undefined ? d.tracer : 0xffd28a);
    // damage falloff
    if (hitTarget) {
      const dist = bestT;
      let mult = 1;
      const [near, far, minM] = d.falloff;
      if (dist > near) mult = THREE.MathUtils.lerp(1, minM, Math.min(1, (dist - near) / Math.max(0.1, far - near)));
      const dmg = d.dmg * (hitHead ? d.hs : 1) * mult;
      FX.impact(hitPoint, dir.clone().negate(), false);
      FX.blood(hitPoint, dir.clone().negate());
      this.hooks.onDamage && this.hooks.onDamage(hitTarget, dmg, hitHead, this.player, this.def);
    } else if (wHit && wHit.t < 300) {
      FX.impact(hitPoint, wHit.normal || dir.clone().negate(), wHit.box.metal);
      if (wHit.box && wHit.box.destId) {
        // §54.3 U7: destructible prop — falloff, NO headshot (HEAD_HS is actor-only);
        // offline → local sim via hooks.onDest; MP → no-op (impact FX = prediction,
        // server truth arrives via 'dest' — T40 §24 ammo-sync split).
        const [near, far, minM] = d.falloff;
        let mult = 1;
        if (wHit.t > near) mult = THREE.MathUtils.lerp(1, minM, Math.min(1, (wHit.t - near) / Math.max(0.1, far - near)));
        const dmg = d.dmg * mult;
        this.hooks.onDest && this.hooks.onDest(wHit.box.destId, dmg, hitPoint, this.player);
      }
    }
  }

  // ---------------- grenades ----------------
  throwNade() {
    if (this.nades[this.nadeType] <= 0 || this.state === 'nade') return;
    this.nades[this.nadeType]--;
    const p = this.player;
    const dir = p.forward(new THREE.Vector3());
    const pos = p.eyePos(new THREE.Vector3()).addScaledVector(dir, 0.4);
    const vel = dir.multiplyScalar(FRAG.throwVel); vel.y += FRAG.upVel;
    const fuse = this.cooking ? Math.max(0.05, FRAG.fuse - this.cookT) : FRAG.fuse;
    // MP (T2-9): server owns the flight + verdict — client only sends the throw (spec §11);
    // the visual comes back as nadeSpawn via THE same projectile path. Offline: verbatim spawn.
    // Task 35: kind rides the hook so the server knows frag vs flash (offline: unused arg).
    if (this.hooks.onNade) this.hooks.onNade(pos, vel, fuse, this.nadeType);
    else this.spawnProjectile(pos, vel, this.nadeType, fuse);
    SFX.throwNade();
    this.hooks.onAmmoChanged && this.hooks.onAmmoChanged();
  }
  spawnProjectile(pos, vel, kind, fuse) {
    const color = kind === 'flash' ? 0xdddddd : 0x4a5d3a;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color, emissive: kind === 'flash' ? 0x666666 : 0x223311, emissiveIntensity: 0.4 }));
    mesh.position.copy(pos); mesh.castShadow = true;
    this.hooks.scene().add(mesh);
    this.projectiles.push({ pos: pos.clone(), vel: vel.clone(), kind, fuse, mesh, rest: 0 });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.fuse -= dt;
      if (pr.fuse <= 0) { this.detonate(pr); this.removeProj(i); continue; }
      pr.vel.y -= 18 * dt;
      // integrate w/ simple collision: step & reflect on AABB
      const step = pr.vel.clone().multiplyScalar(dt);
      const len = step.length();
      if (len > 0.001) {
        const dir = step.clone().divideScalar(len);
        const hit = rayAABB(pr.pos, dir, len + 0.11);
        if (hit) {
          const n = hit.normal || dir.clone().negate();
          pr.pos.addScaledVector(dir, Math.max(0, hit.t - 0.12));
          const vn = pr.vel.dot(n);
          pr.vel.addScaledVector(n, -vn * (1 + FRAG.bounce));
          pr.vel.multiplyScalar(0.82);
          if (pr.vel.length() > 2) SFX.bounceNade(pr.pos);
        } else pr.pos.add(step);
      }
      pr.mesh.position.copy(pr.pos);
      pr.mesh.rotation.x += dt * 8; pr.mesh.rotation.z += dt * 5;
    }
  }
  removeProj(i) {
    const pr = this.projectiles[i];
    this.hooks.scene().remove(pr.mesh);
    this.projectiles.splice(i, 1);
  }
  detonate(pr) {
    const isFlash = pr.kind === 'flash';
    if (!isFlash) {
      if (!CFG.MP.enabled) { // MP: FX fires on the server's boom event (no double-render)
        FX.explosion(pr.pos, FRAG.radius);
        this.hooks.onExplosion && this.hooks.onExplosion(pr.pos, FRAG.radius, FRAG.dmg, this.player);
      }
    } else {
      if (!CFG.MP.enabled) { // MP: FX fire on the server's flash event (main.js onFlashEv) —
        // same no-double-render rule as the frag branch. Task 35 probe find: unguarded,
        // the local echo projectile's detonate() crashed doFlash EVERY FRAME (removeProj
        // unreachable behind the throw) and froze the loop downstream.
        this.hooks.onFlash && this.hooks.onFlash(pr.pos, FLASH);
        SFX.flashRing(1);
        FX.muzzle(pr.pos, true);
      }
    }
  }

  melee() {
    if (this.meleeCd > 0 || this.state === 'nade') return;
    this.meleeCd = MELEE.swing + 0.12;
    this.meleeT = MELEE.swing;
    SFX.swing();
    const p = this.player, dir = p.forward(new THREE.Vector3()), origin = p.eyePos(new THREE.Vector3());
    const targets = this.hooks.targets();
    let best = null, bestT = MELEE.range + 0.4;
    for (const t of targets) {
      if (!t.alive) continue;
      const c = t.centerPos(_v1);
      const toT = _v2.subVectors(c, origin); const dist = toT.length();
      if (dist > bestT) continue;
      if (toT.normalize().dot(dir) < 0.55) continue;
      if (segmentBlocked(origin, c)) continue;
      best = t; bestT = dist;
    }
    setTimeout(() => {
      if (!best || !best.alive) return;
      const c = best.centerPos(new THREE.Vector3());
      // backstab: victim facing same direction as attacker
      const vf = best.forward ? best.forward(new THREE.Vector3()) : new THREE.Vector3(0, 0, -1);
      const back = vf.dot(dir) > 0.35;
      const dmg = back ? MELEE.backstab : MELEE.dmg;
      SFX.knifeHit();
      FX.blood(c, dir);
      this.hooks.onDamage && this.hooks.onDamage(best, dmg, false, this.player, { id: 'knife', name: 'KNIFE' });
    }, 140);
  }

  // ---------------- per-frame ----------------
  update(dt, input, opts = {}) {
    const p = this.player, s = this.hooks.getSettings();
    this.triggerHeld = input.fireHeld;
    if (input.fireEdge) this._fireEdge = true;
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    // recoil recovery
    const rec = this.def ? this.def.recoilRec : 8;
    p.recoilPitch *= Math.max(0, 1 - rec * dt);
    p.recoilYaw *= Math.max(0, 1 - rec * dt);
    // ADS
    const canAds = this.state === 'idle' || this.state === 'reload' && false;
    const wantAds = input.ads && this.state === 'idle';
    this.ads = wantAds;
    this.adsAmt += ((wantAds ? 1 : 0) - this.adsAmt) * Math.min(1, dt / Math.max(0.001, (this.def ? this.def.ads : 0.2) * 0.55));
    // sprint pose
    this.sprintAmt += ((p.sprinting && this.state === 'idle' ? 1 : 0) - this.sprintAmt) * Math.min(1, dt * 9);
    // states
    if (this.state === 'swap') { this.stateT += dt; if (this.stateT >= this.stateDur) this.state = 'idle'; }
    else if (this.state === 'reload') {
      const d = this.def;
      if (d.shellLoad) {
        this.stateT += dt;
        if (this.stateT >= d.reloadT * 0.55) {
          this.stateT = 0; SFX.reloadSounds(1, d.id); // [T117] wid rides — hotlinked shell-load foley
          const w = this.w;
          if (w.mag < d.mag && w.reserve > 0 && this.state === 'reload') { w.mag++; w.reserve--; this.hooks.onAmmoChanged && this.hooks.onAmmoChanged(); }
          if (w.mag >= d.mag || w.reserve <= 0 || this._fireEdge) { this.state = 'idle'; this._fireEdge = false; SFX.pump(d.id); } // [T119] the rack on completion
        }
      } else {
        this.stateT += dt; this.startReloadSounds();
        if (this.stateT >= this.stateDur) {
          const w = this.w, need = d.mag - w.mag, take = Math.min(need, w.reserve);
          w.mag += take; w.reserve -= take;
          this.state = 'idle'; this.hooks.onAmmoChanged && this.hooks.onAmmoChanged();
        }
      }
    }
    else if (this.state === 'inspect') {
      this.inspectT += dt;
      if (this.inspectT > 2.2 || input.fireEdge || input.ads) { this.state = 'idle'; this.inspectT = 0; }
    }
    // firing / inputs
    if (p.alive) this.tryFire(dt);
    // nade cook
    if (this.cooking) {
      this.cookT += dt;
      if (this.cookT >= FRAG.fuse - 0.05) { // cook-off in hand
        const pos = p.eyePos(new THREE.Vector3());
        if (this.hooks.onNade) this.hooks.onNade(pos, new THREE.Vector3(0, -0.5, 0), 0.05, this.nadeType); // MP (T2-9): server detonates at feet (boom/flash event carries FX); self-damage per offline owner-null semantics
        else {
          FX.explosion(pos, FRAG.radius);
          this.hooks.onExplosion && this.hooks.onExplosion(pos, FRAG.radius, FRAG.dmg, null);
        }
        this.cooking = false; this.nades[this.nadeType] = Math.max(0, this.nades[this.nadeType] - 1);
      }
    }
    this.updateProjectiles(dt);
    // viewmodel animation
    this.updateVM(dt, p, s, opts);
  }

  updateVM(dt, p, s) {
    if (!this.vm || !s.viewmodel) { if (this.vm) this.vmRoot.visible = false; return; }
    this.vmRoot.visible = !p.alive ? false : !(this.ads && this.def.scope && this.adsAmt > 0.7);
    // sway from mouse velocity
    const mvx = this.hooks.mouseVel ? this.hooks.mouseVel().x : 0;
    const mvy = this.hooks.mouseVel ? this.hooks.mouseVel().y : 0;
    this.swayX += (THREE.MathUtils.clamp(-mvx * 0.00028, -0.03, 0.03) - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (THREE.MathUtils.clamp(mvy * 0.00028, -0.03, 0.03) - this.swayY) * Math.min(1, dt * 8);
    this.kickZ = Math.max(0, this.kickZ - dt * 0.45);
    this.kickRot = Math.max(0, this.kickRot - dt * 0.7);
    // ADS position lerp: base → centered
    // [T132] the COD hip framing — closer to the body (z −0.42→−0.34), pushed right+down so
    // the STOCK exits the lower-right frame corner (the user playtest: "the weapon-in-hand
    // needs to be closer to self — it shows the stock"). The ADS aim pose is untouched
    // (the sight-picture law).
    const hip = { x: 0.27, y: -0.235, z: -0.34 };
    const aim = { x: 0, y: this.def.scope ? -0.062 : -0.082, z: -0.3 };
    const a = this.adsAmt, sp = this.sprintAmt;
    let px = THREE.MathUtils.lerp(hip.x, aim.x, a) + this.swayX;
    let py = THREE.MathUtils.lerp(hip.y, aim.y, a) + this.swayY + p.bobY * 0.4 * (1 - a);
    let pz = THREE.MathUtils.lerp(hip.z, aim.z, a) + this.kickZ;
    // sprint pose: gun lowered + rotated
    px += sp * 0.1 * (1 - a); py -= sp * 0.09 * (1 - a);
    // [T117] COD-style jump/land arms — the weapon carries weight in the hands: push-off
    // dips the gun, airborne it lags the body's vertical motion, landing absorbs the
    // impact with a spring, mantle hauls it up over the ledge. Pure presentation — the
    // only inputs are the player state this module already receives (grounded/vel/climbK).
    const gr = p.grounded;
    if (this._airG === undefined) this._airG = gr;
    if (!gr && this._airG && p.vel.y > 1) this._jumpK = 1; // push-off impulse (a jump, not a walk-off)
    if (gr && !this._airG) { // landed this frame — spring from the last airborne fall rate
      const impact = Math.min(1, Math.abs(this._fallV || 0) / 10);
      this._landK = Math.max(this._landK || 0, 0.4 + impact * 0.6);
    }
    this._airG = gr;
    if (!gr) this._fallV = p.vel.y;
    this._jumpK = Math.max(0, (this._jumpK || 0) - dt * 2.4);
    this._landK = Math.max(0, (this._landK || 0) - dt * 1.7);
    const airT = gr ? 0 : THREE.MathUtils.clamp(p.vel.y * 0.014, -0.05, 0.05); // rising → gun drops, falling → gun floats up
    this._airLag = (this._airLag || 0) + (airT - (this._airLag || 0)) * Math.min(1, dt * 7);
    const climbK = p.climbK || 0;
    const wgt = 1 - a * 0.75; // weight law: ADS keeps 25% — hands feel alive, sight picture stays true
    py -= ((this._jumpK || 0) * 0.085 + (this._landK || 0) * 0.15 + (this._airLag || 0) + climbK * 0.09) * wgt;
    // [T117] hip-pose stock drop — playtest: the receiver rear rode too high on screen. Small
    // positive rx pitches the stock DOWN / muzzle up (+x rotation moves the -z front up); the
    // (1 - a) factor lerps it out in ADS so the sight picture stays perfectly centered.
    // [T129 item1] 0.085→0.135 — the T129 playtest said the rear STILL rode high after the
    // T117 pass. [T132] 0.135→0.08 — the NEXT playtest reads the muzzle HIGH: "bring the
    // nose/barrel of the gun slightly down". The T129 stock-y drop now carries the
    // rear-seated read on its own, so the pitch bias gives the ~3.2° muzzle-down back;
    // (1 - a) still lerps it out in ADS so the sight picture stays perfectly centered.
    let rx = this.kickRot * 0.8 + sp * 0.5 * (1 - a) + 0.08 * (1 - a)
      + ((this._landK || 0) * 0.2 + (this._jumpK || 0) * 0.1 + climbK * 0.45) * wgt; // [T117] muzzle dips absorbing the landing · haul-up tips it over the ledge
    let ry = sp * 0.55 * (1 - a) + this.swayX * 2;
    let rz = -this.swayX * 1.4 + sp * 0.18 * (1 - a) + (this._landK || 0) * 0.08 * wgt; // [T117] landing cant — the hands settle the weapon
    // reload dip anim
    if (this.state === 'reload') {
      const t = this.stateT / Math.max(0.01, this.stateDur || this.def.reloadT);
      const dip = Math.sin(Math.min(1, t) * Math.PI) * 0.12;
      py -= dip; rx += dip * 2.2; rz += dip * 1.4;
      const magObj = this.vm.userData.mag;
      if (magObj) magObj.position.y = -0.11 - Math.sin(Math.min(1, t) * Math.PI) * 0.14;
    } else {
      const magObj = this.vm.userData.mag;
      if (magObj) magObj.position.y = -0.11;
    }
    if (this.state === 'swap') { const t = this.stateT / this.stateDur; py -= Math.sin(t * Math.PI) * 0.28; rx += Math.sin(t * Math.PI) * 0.9; }
    if (this.state === 'inspect') {
      const t = this.inspectT / 2.2;
      const k = Math.sin(Math.min(1, t) * Math.PI);
      ry += k * 1.5; rz += k * 0.7; pz -= k * 0.08;
    }
    if (this.meleeT > 0) { this.meleeT -= dt; const t = 1 - this.meleeT / MELEE.swing; const k = Math.sin(t * Math.PI); px -= k * 0.2; pz -= k * 0.18; ry += k * 1.1; rx += k * 0.6; }
    if (this.cooking) { py += 0.06; rx += 0.3; }
    // T2-5 Phase 3 (Task 55, §39.2/§39.4): charm pendulum + emote dip — additive terms in the
    // SAME transform locals (fire/reload/state machine untouched; deterministic dt-driven swing)
    if (this.vm && this.vm.userData.charm) {
      this._cV += (-26 * Math.sin(this._cA) - 5.5 * this._cV - this.swayX * 3.5) * dt;
      this._cA = THREE.MathUtils.clamp(this._cA + this._cV * dt, -0.9, 0.9);
      this.vm.userData.charm.rotation.z = this._cA;
    }
    if (this.emoteT > 0) {
      this.emoteT = Math.max(0, this.emoteT - dt);
      const k = Math.sin(Math.PI * (1 - this.emoteT / 0.9));
      py -= 0.12 * k; rx += 0.35 * k;
    }
    this.vm.position.set(px, py, pz);
    this.vm.rotation.set(rx, ry, rz);
  }

  setFovScale(baseFov) { this.baseFov = baseFov; }
  playEmote() { // T2-5 Phase 3 (Task 55, §39.4): 0.9 s viewmodel dip — pure cosmetic timer, no state change
    this.emoteT = 0.9;
  }
  targetFov() {
    const d = this.def;
    let f = this.baseFov;
    if (this.adsAmt > 0.001) f = THREE.MathUtils.lerp(this.baseFov, this.baseFov / (this.scope2 && d.scopeZoom2 ? d.scopeZoom2 : d.zoom), this.adsAmt);
    return f;
  }
}

function rayBox(o, d, minx, miny, minz, maxx, maxy, maxz) {
  let tmin = 0, tmax = 1e9;
  const mins = [minx, miny, minz], maxs = [maxx, maxy, maxz], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < mins[a] || oo[a] > maxs[a]) return -1; continue; }
    let t1 = (mins[a] - oo[a]) / dd[a], t2 = (maxs[a] - oo[a]) / dd[a];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}
