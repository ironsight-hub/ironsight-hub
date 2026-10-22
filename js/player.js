// ============================================================
// IRONSIGHT — player.js : movement controller
// Quake-style ground accel + air-strafe [adrianb.io formula],
// per-axis AABB collision w/ step-up, Apex-class slide, bhop buffer
// MP-1 (Task 27): movement math lives in physics.js (shared with the
// authoritative room service — no fork). This file owns look +
// presentation: camera, bob, SFX triggers, land dip, fall-damage
// hook, HP/regen systems. Offline behavior zero-delta (gated).
// ============================================================
import * as THREE from 'three';
import { CFG } from './config.js';
import { World, rayAABB } from './world.js';
import * as SFX from './audio.js';
import { Input } from './input.js';
import { stepState } from './physics.js';

const P = CFG.PHYS, L = CFG.LOOK;
const TAP_DOUBLE_S = 0.28;   // T1-3: double-tap/flick window (input.js raises KB edges; stick handled here)
const STICK_FLICK = 0.75;    // touch parity: full-ish strafe deflection counts as a flick

export class PlayerController {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3(0, 0, 30);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI; this.pitch = 0; this.roll = 0;
    this.crouch = 0;           // 0..1
    this.grounded = false; this.groundedTime = 9;
    this.jumpBufT = 0;
    this.slide = { active: false, t: 0, dir: new THREE.Vector3() };
    this.apexY = 0;
    this.stepAcc = 0;
    this.bobPhase = 0; this.bobY = 0; this.landDip = 0;
    this.climbK = 0; // [T117] mantle impulse 1→0 — the viewmodel arms haul the weapon up over the ledge (weapons.js reads it)
    this.recoilPitch = 0; this.recoilYaw = 0;   // written by weapons
    this.sprinting = false; this.ads = false;   // ads mirrored by weapons
    this.focusT = 0;
    // combat state
    this.hp = 100; this.shield = 0; this.alive = true;
    this.ghostT = 0; // [T108 N8] GHOST kit timer — set by modes.js useAbility, decayed in update()
    this.lastDamageT = 9; this.spawnProt = 0;
    this.team = 0; this.isPlayer = true;
    this.name = 'YOU';
    this.kills = 0; this.deaths = 0; this.score = 0; this.streak = 0; this.assists = 0;
    this.damageDealt = 0;
    this.hooks = {};
    // T1-3 tap-strafe touch-parity trackers (stick double-flick)
    this._stkL = false; this._stkR = false; this._flickL = -9; this._flickR = -9;
  }
  get height() { return THREE.MathUtils.lerp(P.height, P.crouchHeight, this.crouch); }
  eyeY() { const c = THREE.MathUtils.lerp(P.eyeHeight, P.eyeHeight - 0.55, this.crouch); return this.pos.y + (this.prone > 0.5 ? 0.55 : c) + this.bobY - this.landDip; } // [T121] (9) prone eye — the 3-stop stance lerp: stand/crouch/prone · [T132] 0.35→0.55 m: the user playtest "prone in FPV is too close to the ground"; still a deep prone read (the 1.0 m hitbox owns collision truth — the eye is presentation)
  eyePos(out = new THREE.Vector3()) { return out.set(this.pos.x, this.eyeY(), this.pos.z); }
  centerPos(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z); }
  speed2D() { return Math.hypot(this.vel.x, this.vel.z); }

  update(dt, input) {
    if (!this.alive) return;
    // move axes from keys + stick (MP-1 adaptation: stick read via the input object,
    // was module-global Input.stick — main.js injects stickX/stickY for local play)
    const ix = (input.r ? 1 : 0) - (input.l ? 1 : 0) + (input.stickX || 0);
    const iz = (input.f ? 1 : 0) - (input.b ? 1 : 0) - (input.stickY || 0);
    // T1-3 tap-strafe input (offline only — MP inputs are whitelist-shaped and never
    // carry tap/tech; mp.fixedStep re-enters here with CFG.MP.enabled true → inert).
    let tapEdge = 0;
    if (!CFG.MP.enabled) {
      if (Input.tapStrafeEdge) { tapEdge = Input.tapStrafeEdge; Input.tapStrafeEdge = 0; } // KB double-tap A/D (input.js)
      const now = performance.now() / 1000, sx = Input.stick.x; // touch parity: stick double-flick
      if (sx <= -STICK_FLICK) { if (!this._stkL && now - this._flickL < TAP_DOUBLE_S) tapEdge = -1; this._stkL = true; this._flickL = now; } else this._stkL = false;
      if (sx >= STICK_FLICK) { if (!this._stkR && now - this._flickR < TAP_DOUBLE_S) tapEdge = 1; this._stkR = true; this._flickR = now; } else this._stkR = false;
    }
    // authoritative movement step (shared core; offline = this call IS the truth)
    // [T130] the ladder/water registries ride the world param — the climb/swim states
    // land on `this` (onLadder/swimming/wading) for the presentation layer to read.
    const ev = stepState(this,
      { ix, iz, sprint: input.sprint, ads: input.ads, crouch: input.crouch, crouchEdge: input.crouchEdge, jumpEdge: input.jumpEdge, autoSprint: input.autoSprint,
        tech: !CFG.MP.enabled, tapEdge },
      { colliders: World.colliders, jumpPads: World.jumpPads, ladders: World.ladders, water: World.water }, dt);
    if (ev.splash && ev.splash.v > 2.5) SFX.footstep(null, true); // [T130] the water entry beat rides the existing step voice (no audio.js edit)
    if (this.hooks.dropGlide) this.hooks.dropGlide(this, ev); // [T171] BR insertion law (main.js): fall-vel cap while gliding + dropT cleared on landing

    // presentation reattached from physics events
    if (ev.slideStart) SFX.footstep(null, true);
    if (ev.bounce) SFX.footstep(null, true); // T1-3 wall bounce whoosh (existing SFX, no audio.js edit)
    if (ev.jumped) SFX.footstep(null, true);
    if (ev.climb) { SFX.mantle(); this.landDip = Math.max(this.landDip, 0.1); this.climbK = 1; } // [T119] the pull-up: Dive_Over_Wall take + a small camera dip · [T117] climbK feeds the viewmodel haul-up
    if (ev.land) {
      this.landDip = Math.min(0.28, Math.max(0, (-ev.land.impactV) * 0.022));
      SFX.landThud(-ev.land.impactV, this.groundMetal ? 1 : 0, ev.land.fall > P.fallDamageH); // [T119] surface-aware + damage-land voice
      if (ev.land.fall > P.fallDamageH && this.hooks.fallDamage) this.hooks.fallDamage(Math.min(P.fallDmgCap, (ev.land.fall - P.fallDamageH) * P.fallDmgPerM));
    }
    if (ev.pad) SFX.jumpPad(ev.pad);

    // pickups (player only)
    if (this.hooks.pickup) this.hooks.pickup(this);

    // footsteps + bob
    const sp2 = this.speed2D();
    if (this.grounded && sp2 > 0.5 && !this.slide.active) {
      this.stepAcc += sp2 * dt;
      // [T132] THE CADENCE LAW (the user playtest: "footsteps-per-distance for some reason
      // happen faster than while running" — at the 4.9 m/s walk the T121 0.9 m stride fired
      // 5.4 steps/s vs sprint's 4.6: walking audibly DENSER than sprinting, and both
      // tap-dance fast). The ear hears RATE: stride = speed / cadence keeps the band
      // natural — walk 4.9/2.2 ≈ 2.2 Hz, sprint 7.35/2.55 ≈ 2.9 Hz (the CoD cadence band),
      // crawl 2.2/1.55 ≈ 1.4 Hz. Per-distance walking stays (correctly, biomechanics)
      // slightly denser than sprinting; per-SECOND sprinting is now clearly faster.
      const stride = this.prone > 0.5 ? 1.55 : (this.sprinting ? 2.55 : 2.2);
      if (this.stepAcc > stride) { this.stepAcc = 0; SFX.footstep(null, this.sprinting, this.groundMetal ? 1 : 0); if (this.hooks.footstep) this.hooks.footstep(this.sprinting); } // [T119] surface rides — metal platforms get the metal steps
      this.bobPhase += (sp2 / Math.max(stride, 0.01)) * Math.PI * dt; // [T121] ONE bob half-cycle per step — the stride is the single truth for sound AND view bob
      this.bobY = input.bob ? Math.sin(this.bobPhase) * L.bobAmp * Math.min(1, sp2 / P.sprintSpeed || sp2 / 7.4) : 0;
    } else { this.bobY += (0 - this.bobY) * Math.min(1, dt * 8); }

    // strafe tilt [Titanfall feel]
    const targetRoll = input.tilt ? (-ix * L.tiltStrafe * (this.slide.active ? 3.2 : 1)) : 0;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 10);
    // landing dip decay
    this.landDip = Math.max(0, this.landDip - dt * 0.9);
    this.climbK = Math.max(0, this.climbK - dt * 2.2); // [T117] mantle impulse decay
    // stim timer
    if (this.stimT > 0) this.stimT -= dt;
    if (this.ghostT > 0) this.ghostT -= dt; // [T108 N8] GHOST decay — the bots.js spot law reads this
    if (this.healRate > 0) { this.hp = Math.min(100, this.hp + this.healRate * dt); this.healT -= dt; if (this.healT <= 0) this.healRate = 0; }
    // regen [COD 5s]
    this.lastDamageT += dt;
    if (this.alive && this.lastDamageT > CFG.HEALTH.regenDelay && this.hp < CFG.HEALTH.maxHP) this.hp = Math.min(CFG.HEALTH.maxHP, this.hp + CFG.HEALTH.regenRate * dt);
    // shield decay (supply overshield)
    if (this.shield > 0) { this.shieldT -= dt; if (this.shieldT <= 0) this.shield = Math.max(0, this.shield - CFG.HEALTH.shieldDecay * dt * 10); }
    if (this.juggT > 0) this.juggT -= dt; // [T161 R6] the juggernaut suit clock — cut+speed laws read it, expiry returns the base body
    // spawn protection
    if (this.spawnProt > 0) this.spawnProt -= dt;
  }

  updateCamera(dt, tp = false, obstruct = null, ads = false) {
    const c = this.cam;
    const e = new THREE.Euler(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, this.roll, 'YXZ');
    c.quaternion.setFromEuler(e);
    if (!tp) { c.position.set(this.pos.x, this.eyeY(), this.pos.z); this._boom = null; return; }
    // [T119] third-person boom (issue 4) — over-the-shoulder rig on the SAME Euler
    // convention (no new rotation state); the obstruction hook pulls the boom to the
    // last free point so the camera never goes behind a wall.
    // [T120] ADS boom behavior (the R4 polish): aiming tightens the rig toward the
    // shoulder and drops the height (the CODM TPP-ADS read) — a rate-limited LERP
    // (min(1, dt*12), frame-rate independent), NOT a snap; FP path untouched.
    const want = ads ? { x: 0.68, y: 0.1, b: 1.9 } : { x: 0.55, y: 0.25, b: 3.1 };
    const cur = this._boom || { ...want };
    const k = Math.min(1, dt * 12);
    cur.x += (want.x - cur.x) * k; cur.y += (want.y - cur.y) * k; cur.b += (want.b - cur.b) * k;
    this._boom = cur;
    const back = new THREE.Vector3(0, 0, 1).applyEuler(e);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(e);
    const eye = new THREE.Vector3(this.pos.x, this.eyeY(), this.pos.z);
    const pos = eye.clone().addScaledVector(right, cur.x).addScaledVector(back, cur.b).add(new THREE.Vector3(0, cur.y, 0));
    if (obstruct) { const free = obstruct(eye, pos); if (free) pos.copy(free); }
    c.position.copy(pos);
  }
  forward(out = new THREE.Vector3()) { return out.set(0, 0, -1).applyEuler(new THREE.Euler(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, 0, 'YXZ')); }
}
