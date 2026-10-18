// ============================================================
// IRONSIGHT — bots.js : waypoint A* nav, combat FSM, 4 tiers
// Vision/hearing perception, burst fire, strafing, cover retreat
// ============================================================
import * as THREE from 'three';
import { CFG, knockFor } from './config.js'; // [T138] knockFor joins — the damage-scaled ragdoll impulse (config single truth)
import { World, rayAABB, segmentBlocked } from './world.js';
import * as FX from './effects.js';
import * as SFX from './audio.js';
import { rayBoxForBots } from './aiutil.js';
import { ops3dRig } from './ops3d.js'; // [T130] the skinned bot body (no cycle: ops3d imports three/addons only)

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const R = 0.38;

export class Bot {
  constructor(name, team, tier, weaponId) {
    this.name = name; this.team = team; this.tier = tier; this.isPlayer = false;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.hp = 100; this.alive = true; this.height = 1.8;
    this.kills = 0; this.deaths = 0; this.score = 0; this.streak = 0; this.assists = 0;
    this.skill = 0.82 + Math.random() * 0.36; // ±18%
    this.weapon = botWeapon(weaponId);
    this.state = 'patrol';
    this.path = []; this.pathI = 0; this.goalNode = -1;
    this.target = null; this.lastSeenPos = new THREE.Vector3(); this.lastSeenT = -99;
    this.reactT = 0; this.burstLeft = 0; this.pauseT = 0; this.fireT = 0;
    this.err = 0; this.strafeDir = 1; this.strafeT = 0;
    this.perceptT = Math.random() * 0.15; this.thinkT = Math.random() * 0.3;
    this.blindedT = 0; this.suppressT = 0;
    this.slowT = 0; this.slowMult = 1; // [T108 N8] SURGE kit — decayed in the tick loop, consumed at followPath (the speedMult law's single consumption point)
    this.stepAcc = 0; this.grounded = true;
    this.spottedT = 99;   // time-since-spotted (large = never)
    this.firedT = 99;
    this.deadT = 0;
    this.mesh = null; this.tag = null;
    this.moveSpeed = CFG.PHYS.walkSpeed * (0.92 + tier * 0.04);
    this.aimErrDeg = tier.err;
  }
  headPos(out) { return out.set(this.pos.x, this.pos.y + 1.58, this.pos.z); }
  centerPos(out) { return out.set(this.pos.x, this.pos.y + 0.9, this.pos.z); }
  eyePos(out) { return out.set(this.pos.x, this.pos.y + 1.62, this.pos.z); }
  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); }
}

// Bot weapon stat blocks — SCALED-DOWN mirrors of the config.js WEAPONS defs (same
// dmg ratio family as the four originals: wasp 17/19, vanguard 22/26, ripper 21/24,
// mauler 10/12 ≈ ×0.85; bots also carry tier dmgMult on top). Sound/tracer keys MUST stay
// within audio.js gunshot cases + FX.tracer palette. T1-5 (Task 37-a): 8 new kinds for the
// expanded armory; ids mirror config.js WEAPONS 1:1.
function botWeapon(kind) {
  switch (kind) {
    case 'smg': return { id: 'wasp', name: 'WASP', dmg: 17, rpm: 850, auto: true, burst: null, falloff: [12, 26, 0.6], hs: 1.5, sound: 'smg', tracer: 0xffb08a };
    case 'lmg': return { id: 'ripper', name: 'RIPPER', dmg: 21, rpm: 640, auto: true, falloff: [30, 60, 0.75], hs: 1.5, sound: 'lmg', tracer: 0xffb08a };
    case 'shotgun': return { id: 'mauler', name: 'MAULER', dmg: 10, rpm: 70, auto: false, pellets: 7, falloff: [8, 18, 0.35], hs: 1.25, sound: 'shotgun', tracer: 0xffb08a };
    // --- T1-5 (Task 37-a) new kinds ---
    case 'br': return { id: 'sabre', name: 'SABRE', dmg: 28, rpm: 600, auto: false, falloff: [30, 62, 0.72], hs: 1.6, sound: 'ar', tracer: 0xffb08a };
    case 'carbine': return { id: 'raider', name: 'RAIDER', dmg: 21, rpm: 750, auto: true, falloff: [18, 40, 0.6], hs: 1.5, sound: 'ar', tracer: 0xffb08a };
    case 'pdw': return { id: 'hornet', name: 'HORNET', dmg: 13, rpm: 900, auto: true, falloff: [10, 22, 0.55], hs: 1.4, sound: 'smg', tracer: 0xffb08a };
    case 'autosg': return { id: 'breacher', name: 'BREACHER', dmg: 10, rpm: 280, auto: true, pellets: 7, falloff: [5, 13, 0.3], hs: 1.25, sound: 'shotgun', tracer: 0xffb08a };
    case 'dmr': return { id: 'longbow', name: 'LONGBOW', dmg: 52, rpm: 200, auto: false, falloff: [60, 110, 0.8], hs: 1.75, sound: 'sniper', tracer: 0xcfe9ff };
    case 'belt': return { id: 'vulture', name: 'VULTURE', dmg: 18, rpm: 640, auto: true, falloff: [26, 55, 0.7], hs: 1.4, sound: 'lmg', tracer: 0xffb08a };
    case 'mp': return { id: 'sting', name: 'STING', dmg: 11, rpm: 900, auto: true, falloff: [10, 24, 0.55], hs: 1.5, sound: 'pistol', tracer: 0xffb08a };
    case 'dbl': return { id: 'judge', name: 'JUDGE', dmg: 11, rpm: 140, auto: false, pellets: 8, falloff: [4, 10, 0.25], hs: 1.25, sound: 'shotgun', tracer: 0xffb08a };
    default: return { id: 'vanguard', name: 'VANGUARD', dmg: 22, rpm: 720, auto: true, falloff: [24, 48, 0.72], hs: 1.5, sound: 'ar', tracer: 0xffb08a };
  }
}

// T1-5 (Task 37-a): per-tier weapon pools — Recruits keep the classic five kinds;
// higher tiers mix in the expanded armory. Index = CFG.BOT_TIERS difficulty.
const BOT_POOLS = [
  ['ar', 'ar', 'smg', 'lmg', 'shotgun'],                                       // RECRUIT
  ['ar', 'smg', 'lmg', 'shotgun', 'carbine', 'pdw'],                           // REGULAR
  ['ar', 'smg', 'lmg', 'shotgun', 'carbine', 'pdw', 'br', 'belt'],             // VETERAN
  ['ar', 'carbine', 'br', 'pdw', 'belt', 'dmr', 'autosg', 'dbl'],              // ELITE
];

// ---------------- manager ----------------
export class BotManager {
  constructor(scene, hooks) {
    this.scene = scene; this.hooks = hooks; // {player, onDamage(bot->player), onBotDie(bot, killer, head), mode}
    this.bots = [];
    this.noises = []; // {pos, t, team}
    this.usedNames = new Set();
  }
  clear() {
    for (const b of this.bots) this.removeMesh(b);
    this.bots.length = 0;
  }
  // T1-1 (SS22.4): Gun Game tier swap for bots (ladder ids unchanged at 12 tiers — see config.js).
  // The bot sim resolves any WEAPONS id to one of its stat-block kinds (botWeapon); since T1-5
  // the map below covers the full armory. 'melee' stays a weapon stand-in — bots have no
  // melee behavior (logged DEVLOG v1.9).
  setBotWeapon(b, wid) {
    // T1-5 (Task 37-a): full ladder/armory id -> bot-kind map; 'melee' stays the no-melee
    // stand-in (bots have no melee behavior — DEVLOG v1.9), default 'ar' preserved.
    const kind = wid === 'melee' ? 'smg'
      : wid === 'wasp' ? 'smg'
      : wid === 'hornet' ? 'pdw'
      : wid === 'sting' ? 'mp'
      : wid === 'ripper' ? 'lmg'
      : wid === 'vulture' ? 'belt'
      : wid === 'mauler' ? 'shotgun'
      : wid === 'breacher' ? 'autosg'
      : wid === 'judge' ? 'dbl'
      : wid === 'longbow' ? 'dmr'
      : wid === 'sabre' ? 'br'
      : wid === 'raider' ? 'carbine'
      : wid === 'longshot' ? 'dmr'   // legacy armory: bolt sniper -> dmr block
      : wid === 'p9' ? 'mp'          // legacy armory: sidearm -> machine-pistol block
      : 'ar';
    const w = botWeapon(kind);
    w.name = wid.toUpperCase();
    b.weapon = w;
    b.burstLeft = 0; b.fireT = 0;
  }
  removeMesh(b) { if (b.rig3d) { b.rig3d.dispose(); b.rig3d = null; } if (b.mesh) { this.scene.remove(b.mesh); b.mesh = null; } if (b.tag) { this.scene.remove(b.tag); b.tag = null; } }

  spawn(count, teamSize, difficulty, mode) {
    this.clear();
    const tier = CFG.BOT_TIERS[difficulty];
    const names = [...CFG.BOT_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      let team;
      if (mode === 'ffa' || mode === 'gg') team = i + 1; // everyone hostile (player = 0) — gg joins the ffa rule (SS22.4)
      else if (mode === 'inf') team = 0; // T89 L2: Infected boots ALL-survivor (team 0) — Patient Zero converts at first:15 (modes.js), snapshot law alive0:1
      else if (mode === 'ct') team = (i + 1) % 3; // [T139] CUTTHROAT 3v3v3: round-robin — player(0) + bots 3,3,3 across teams 0/1/2 (players:9 → 8 bots; (i+1)%3 lands exactly 3/3/3)
      else team = i < count / 2 ? 0 : 1; // first half allies of player(0)
      // T1-5 (Task 37-a): tier-weighted pool (BOT_POOLS above) instead of the fixed five-kind list
      const kinds = BOT_POOLS[Math.min(BOT_POOLS.length - 1, Math.max(0, difficulty))] || BOT_POOLS[0];
      const b = new Bot(names[i % names.length] + (i >= names.length ? '-' + (Math.floor(i / names.length) + 1) : ''), team, tier, kinds[i % kinds.length]);
      this.buildMesh(b);
      this.bots.push(b);
      this.respawnAt(b, true);
    }
  }
  buildMesh(b) {
    const g = new THREE.Group();
    const isAlly = this.hooks.mode() !== 'ffa' && b.team === 0;
    const cBase = isAlly ? 0x2d4a66 : 0x5a2d33;
    const mat = new THREE.MeshStandardMaterial({ color: cBase, roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), mat); torso.position.y = 1.14; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), dark); head.position.y = 1.62; head.castShadow = true;
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.82, 0.26), dark); legs.position.y = 0.41; legs.castShadow = true;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.7), dark); gun.position.set(0.22, 1.2, -0.35);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: isAlly ? CFG.COLORS.accentB : CFG.COLORS.accentA, emissive: isAlly ? CFG.COLORS.accentB : CFG.COLORS.accentA, emissiveIntensity: 0.7 }));
    trim.position.y = 1.4;
    g.add(torso, head, legs, gun, trim);
    g.traverse(o => { o.frustumCulled = false; });
    this.scene.add(g);
    b.mesh = g; b.gunMesh = gun; b.boxRig = { torso, head, legs, trim, gun }; // [T115] the procedural parts the skinned swap must retire
    // [T130] the skinned bot body — ally line wears soldier, enemy line wears xbot (the
    // silhouette IS the team read); the boxes stay visible until the GLTF is live.
    try {
      const rig = ops3dRig('bot', { model: isAlly ? 'soldier' : 'xbot', tint: isAlly ? CFG.COLORS.accentB : CFG.COLORS.accentA });
      if (rig) { rig.group.rotation.y = Math.PI; /* [T125 §POLARITY-1] the rig faces +Z (ops3d contract, the tpBody law) but this parent applies raw b.yaw (fwd = (−sin,−cos) — physics.js:273): without the π the skinned body faces 180° off aim (the primitives were −Z-native so pre-swap hid it) */ rig.group.visible = false; g.add(rig.group); b.rig3d = rig; }
    } catch (e) { /* the body never breaks the bot */ }
    // nametag sprite
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const c2 = cv.getContext('2d');
    c2.font = '700 34px Chakra Petch, sans-serif'; c2.textAlign = 'center';
    c2.fillStyle = isAlly ? '#3fa7ff' : '#ff8d8d';
    c2.shadowColor = '#000'; c2.shadowBlur = 6;
    c2.fillText(b.name, 128, 44);
    const tex = new THREE.CanvasTexture(cv);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    tag.scale.set(1.9, 0.48, 1); tag.position.y = 2.2;
    this.scene.add(tag); b.tag = tag;
    b.isAllyVisual = isAlly;
  }

  respawnAt(b, instant = false) {
    b.alive = true; b.hp = 100; b.state = 'patrol'; b.target = null; b.path = []; b.blindedT = 0;
    b.spottedT = 99; b.firedT = 99; b.vel.set(0, 0, 0);
    const mode = this.hooks.mode();
    const pool = mode === 'tdm' || mode === 'dom' || mode === 'hp' || mode === 'kc' || mode === 'snd' || mode === 'gf' || mode === 'inf' || mode === 'ctl' ? (b.team === 0 ? World.spawnsA : World.spawnsB) : World.spawnsFFA; // T1-1 team modes (SS22.5) + T89 trio: gf/inf/ctl are team modes (2v2 gunsight pools / horde spawnsB / control site pools)
    // spawn scoring: farthest-from-enemies among 4 random picks [UT/arena sources]
    let best = null, bestScore = -1;
    const foes = [];
    const pl = this.hooks.player;
    if (pl && pl.alive && pl.team !== b.team) foes.push(pl);
    for (const e of this.enemiesOf(b.team)) if (e !== b && e.alive) foes.push(e);
    for (let i = 0; i < 4; i++) {
      const sp = pool[Math.floor(Math.random() * pool.length)];
      let score = 1e9;
      for (const f of foes) score = Math.min(score, sp.distanceTo(f.pos));
      if (score > bestScore) { bestScore = score; best = sp; }
    }
    b.pos.copy(best || pool[0]); b.pos.y += 0.05;
    b.yaw = Math.atan2(-(0 - b.pos.x), -(0 - b.pos.z));
    if (b.mesh) { b.mesh.visible = true; b.mesh.rotation.set(0, 0, 0); }
    if (b.tag) b.tag.visible = true;
  }

  enemiesOf(team) {
    const mode = this.hooks.mode();
    return this.bots.filter(b => b.alive && (mode === 'ffa' ? b.team !== team : b.team !== team));
  }
  visibleEnemiesOf(bot) {
    const player = this.hooks.player;
    const list = [];
    if (player.alive && player.team !== bot.team && this.canSee(bot, player)) list.push(player);
    for (const b of this.bots) if (b.alive && b.team !== bot.team && this.canSee(bot, b)) list.push(b);
    return list;
  }
  canSee(bot, other) {
    if (!other.alive) return false;
    const d = bot.eyePos(_v1).distanceTo(other.centerPos(_v2));
    if (d > 62) return false;
    const fw = bot.forward(_v3);
    const to = _v2.subVectors(other.centerPos(new THREE.Vector3()), bot.eyePos(new THREE.Vector3())).normalize();
    if (fw.dot(to) < 0.08) return false; // ~170° fov cone generous
    return !this.blockedEyes(bot, other);
  }
  blockedEyes(bot, other) {
    const a = bot.eyePos(new THREE.Vector3());
    const c = other.centerPos(new THREE.Vector3());
    if (segmentBlocked(a, c)) {
      const h = other.headPos ? other.headPos(new THREE.Vector3()) : c;
      if (segmentBlocked(a, h)) return true;
    }
    return false;
  }
  addNoise(pos, team, radius) { this.noises.push({ pos: pos.clone(), team, t: 0.8, radius: radius || 30 }); }

  // ---------------- A* ----------------
  astar(fromPos, toPos) {
    const wps = World.waypoints;
    if (!wps.length) return [];
    let si = 0, sd = 1e9, gi = 0, gd = 1e9;
    for (let i = 0; i < wps.length; i++) {
      const d1 = wps[i].p.distanceTo(fromPos), d2 = wps[i].p.distanceTo(toPos);
      if (d1 < sd) { sd = d1; si = i; }
      if (d2 < gd) { gd = d2; gi = i; }
    }
    const open = [si], came = {}, g = { [si]: 0 }, f = { [si]: sd + gd };
    const closed = new Set();
    let guard = 0;
    while (open.length && guard++ < 400) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if ((f[open[i]] ?? 1e9) < (f[open[bi]] ?? 1e9)) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === gi) {
        const path = [cur]; let c = cur;
        while (came[c] !== undefined) { c = came[c]; path.unshift(c); }
        return path;
      }
      closed.add(cur);
      for (const nb of wps[cur].e) {
        if (closed.has(nb)) continue;
        const ng = g[cur] + wps[cur].p.distanceTo(wps[nb].p);
        if (g[nb] === undefined || ng < g[nb]) {
          came[nb] = cur; g[nb] = ng; f[nb] = ng + wps[nb].p.distanceTo(wps[gi].p);
          if (!open.includes(nb)) open.push(nb);
        }
      }
    }
    return [si];
  }
  setGoal(b, goalPos) {
    b.path = this.astar(b.pos, goalPos); b.pathI = 0;
  }

  // ---------------- update ----------------
  update(dt, player, uavActive) {
    // consume noises
    for (const n of this.noises) n.t -= dt;
    this.noises = this.noises.filter(n => n.t > 0);
    const mode = this.hooks.mode();

    for (const b of this.bots) {
      if (!b.alive) {
        b.deadT += dt;
        // [T133] THE CORPSE DRIVE — the loop's continue starved rig3d.update for dead bots
        // (a corpse froze on its last alive frame; the ops3d death branch NEVER ran for a
        // bot). The verlet ragdoll needs per-frame integration: dead bots now drive ONLY
        // the rig — AI/physics/mesh-sync stay frozen (the corpse doesn't slide).
        if (b.rig3d && b.rig3d.ready) b.rig3d.update(Math.min(dt, 0.05), { speed: 0, grounded: true, crouch: 0, prone: 0, dead: true, deadDir: b.deadDir || null, knock: b.deadKnock || 2.1, ladder: false, swim: false, ads: false, emote: false }); // [T138] the knock rides (config.knockFor — the damage-scaled impulse)
        continue;
      }
      b.blindedT = Math.max(0, b.blindedT - dt);
      // perception (staggered)
      b.perceptT -= dt;
      if (b.perceptT <= 0) {
        b.perceptT = 0.15;
        const foes = [];
        const pl = this.hooks.player;
        if (pl.alive && pl.team !== b.team && this.canSee(b, pl)) foes.push(pl);
        for (const o of this.bots) if (o.alive && o !== b && o.team !== b.team && this.canSee(b, o)) foes.push(o);
        if (foes.length && b.blindedT <= 0) {
          if (!b.target) b.reactT = tier(b).react / b.skill;
          // nearest visible
          let best = foes[0], bd = 1e9;
          for (const f of foes) { const d = b.pos.distanceTo(f.pos); if (d < bd) { bd = d; best = f; } }
          if (b.target !== best) { b.reactT = Math.max(b.reactT, tier(b).react / b.skill * 0.6); b.err = b.aimErrDeg / b.skill; }
          b.target = best;
          b.lastSeenPos.copy(best.pos); b.lastSeenT = 0; b.state = 'combat';
          if (best.isPlayer && !(best.ghostT > 0)) b.spottedT = 0; // [T108 N8] GHOST kit: the spot law gate — ghosted player can't be (re)spotted; hearing stays live (noise carries no actor ref — scope law, DEVLOG v1.72)
        } else if (b.target) {
          if (b.lastSeenT > 3.2 || !b.target.alive) { b.target = null; b.state = 'hunt'; b.err = b.aimErrDeg / b.skill; }
        }
        if (!b.target && b.state === 'patrol') {
          // hearing
          for (const n of this.noises) {
            if (n.team === b.team) continue;
            if (b.pos.distanceTo(n.pos) < tier(b).hear * b.skill) { b.state = 'hunt'; this.setGoal(b, n.pos); b.huntT = 4; break; }
          }
        }
      }
      b.lastSeenT += dt; b.spottedT += dt; b.firedT += dt;
      if (b.slowT > 0) b.slowT -= dt; // [T108 N8] SURGE decay

      // state behavior
      if (b.state === 'combat' && b.target) this.combat(b, dt, player);
      else if (b.state === 'hunt') this.hunt(b, dt);
      else this.patrol(b, dt);

      // physics
      this.physics(b, dt);
      // mesh sync
      if (b.mesh) {
        b.mesh.position.copy(b.pos);
        b.mesh.rotation.y = b.yaw;
        const spd = Math.hypot(b.vel.x, b.vel.z);
        b.mesh.position.y += Math.abs(Math.sin(b.stepAcc * 2.6)) * 0.03 * Math.min(1, spd / 4);
        // [T130] the skinned drive — the same state the bot sim wrote this frame
        if (b.rig3d) {
          if (b.rig3d.ready) {
            if (!b.rig3dSwapped) { // [T115] THE SWAP — the skinned body retires the procedural boxes
              b.rig3dSwapped = true; // one-shot: the fallback law only flows ready→render
              if (b.boxRig) { b.boxRig.torso.visible = false; b.boxRig.head.visible = false; b.boxRig.legs.visible = false; b.boxRig.trim.visible = false; }
              if (b.gunMesh) { try { if (!b.rig3d.attach(b.gunMesh)) b.gunMesh.visible = false; } catch { b.gunMesh.visible = false; } } // the anatomical hand mount (the ops3d attach law); no bone → the gun steps aside rather than float
            }
            b.rig3d.group.visible = true;
            b.rig3d.update(Math.min(dt, 0.05), { speed: Math.min(spd, 9), grounded: true, crouch: 0, prone: 0, dead: !b.alive, ladder: false, swim: false, ads: false, emote: false });
          } else if (b.rig3dSwapped && b.boxRig) { // [T115] lost/failed rig — the fallback law restores the boxes
            b.rig3dSwapped = false;
            b.boxRig.torso.visible = true; b.boxRig.head.visible = true; b.boxRig.legs.visible = true; b.boxRig.trim.visible = true;
            if (b.gunMesh) b.gunMesh.visible = true;
          }
        }
      }
      if (b.tag) {
        const d = b.tag.position.distanceTo(player.pos);
        b.tag.position.set(b.pos.x, b.pos.y + 2.25, b.pos.z);
        const visible = this.hooks.settings().nameTags !== false && (b.isAllyVisual || (b.spottedT < 1.5 || uavActive)) && d < 60;
        b.tag.visible = visible;
        if (b.tag.visible) {
          const p = b.tag.position.clone().project(this.hooks.camera());
          b.tag.material.opacity = p.z < 1 ? 0.95 : 0;
          if (p.z < 1) { b.tag.position.set(b.pos.x, b.pos.y + 2.25, b.pos.z); }
        }
      }
    }
  }

  patrol(b, dt) {
    if (!b.path.length || b.pathI >= b.path.length) {
      const wps = World.waypoints;
      const goal = Math.floor(Math.random() * wps.length);
      this.setGoal(b, wps[goal].p);
    }
    this.followPath(b, dt, (this.hooks.mode() === 'inf' && b.team === 1) ? 0.55 * CFG.MODES.inf.speedMult : 0.55); // T89 L2: infected speed rides the EXISTING speedMult param (documented adaptation — physics module untouched)
  }
  hunt(b, dt) {
    b.huntT = (b.huntT ?? 4) - dt;
    if (!b.path.length || b.pathI >= b.path.length) {
      if (b.huntT <= 0) { b.state = 'patrol'; return; }
      this.setGoal(b, b.lastSeenPos);
    }
    this.followPath(b, dt, (this.hooks.mode() === 'inf' && b.team === 1) ? 0.85 * CFG.MODES.inf.speedMult : 0.85); // T89 L2: hunt-state infected speed (same adaptation law)
  }
  combat(b, dt, player) {
    const t = b.target;
    if (!t || !t.alive) { b.state = 'hunt'; return; }
    const d = b.pos.distanceTo(t.pos);
    const tierD = tier(b);
    // face target smoothly
    const toT = _v1.subVectors(t.centerPos(new THREE.Vector3()), b.eyePos(new THREE.Vector3()));
    const wantYaw = Math.atan2(-toT.x, -toT.z);
    let dy = wantYaw - b.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    b.yaw += dy * Math.min(1, dt * (6 + b.tier.errDecay * 2.5));
    b.pitch = THREE.MathUtils.lerp(b.pitch, Math.asin(THREE.MathUtils.clamp(toT.clone().normalize().y, -1, 1)), Math.min(1, dt * 8));
    // strafing + range keeping
    b.strafeT -= dt;
    if (b.strafeT <= 0) { b.strafeT = 0.5 + Math.random() * 0.8; b.strafeDir = Math.random() < 0.5 ? -1 : 1; }
    const fw = new THREE.Vector3(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
    const right = new THREE.Vector3(-fw.z, 0, fw.x);
    const pref = 14 + b.skill * 10;
    const adv = d > pref + 4 ? 1 : d < pref - 5 ? -0.8 : 0;
    const wish = new THREE.Vector3().addScaledVector(fw, adv).addScaledVector(right, b.strafeDir * tierD.strafe);
    if (wish.lengthSq() > 0) wish.normalize();
    const sp = CFG.PHYS.walkSpeed * 0.85 * (b.hp < 35 ? 1.1 : 1);
    b.vel.x = wish.x * sp; b.vel.z = wish.z * sp;
    // retreat if hurt
    if (b.hp < 30 && Math.random() < dt * 1.2) { b.state = 'hunt'; this.setGoal(b, World.waypoints[Math.floor(Math.random() * World.waypoints.length)].p); b.huntT = 2.5; return; }
    // firing
    b.reactT -= dt;
    if (b.blindedT > 0 || b.reactT > 0) { b.fireT = Math.max(b.fireT, 0.12); return; }
    b.fireT -= dt; b.pauseT -= dt;
    if (b.pauseT <= 0 && b.fireT <= 0) {
      if (b.burstLeft <= 0) {
        b.burstLeft = Math.max(2, Math.round(tierD.burst * b.skill * (b.weapon.auto ? 1 : 1)));
        b.pauseT = 0.35 + Math.random() * 0.55 / b.skill;
      }
      const w = b.weapon;
      b.fireT = 60 / w.rpm;
      b.burstLeft--;
      // aim with error (decays while tracking)
      b.err = Math.min(b.aimErrDeg / b.skill, b.err === 0 ? b.aimErrDeg / b.skill : Math.max(0.3, b.err - tierD.errDecay * dt * b.aimErrDeg));
      this.botShoot(b, t, w);
    }
  }
  botShoot(b, t, w) {
    const origin = b.eyePos(new THREE.Vector3());
    const aimAt = t.headPos ? (Math.random() < 0.22 + b.skill * 0.12 ? t.headPos(new THREE.Vector3()) : t.centerPos(new THREE.Vector3())) : t.centerPos(new THREE.Vector3());
    const dir = aimAt.sub(origin).normalize();
    // error cone
    const errRad = THREE.MathUtils.degToRad(b.err) * (0.4 + Math.random() * 0.6);
    const a = Math.random() * Math.PI * 2;
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    dir.addScaledVector(right, Math.cos(a) * errRad).addScaledVector(up, Math.sin(a) * errRad).normalize();
    SFX.gunshot(w.sound, origin.clone(), false);
    b.firedT = 0;
    this.addNoise(b.centerPos(new THREE.Vector3()), b.team, tier(b).hear);
    const muzzle = origin.clone().addScaledVector(dir, 0.6); muzzle.y -= 0.25;
    FX.muzzle(muzzle);
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const d2 = i === 0 ? dir.clone() : jitter(dir, 0.028);
      // world occlusion
      const wHit = rayAABB(origin, d2, 200);
      // player hit?
      const pl = this.hooks.player;
      let hitPl = -1, hitPlHead = false;
      if (pl.alive && pl.team !== b.team) {
        const c = pl.centerPos(new THREE.Vector3());
        const h = new THREE.Vector3(c.x, pl.eyeY(), c.z);
        const tb = rayBoxForBots(origin, d2, c.x - 0.42, c.y - 0.9, c.z - 0.42, c.x + 0.42, c.y + 0.9, c.z + 0.42);
        const th = rayBoxForBots(origin, d2, h.x - 0.19, h.y - 0.19, h.z - 0.19, h.x + 0.19, h.y + 0.19, h.z + 0.19);
        const head = th >= 0 && (tb < 0 || th <= tb);
        const tBest = head ? th : tb;
        if (tBest >= 0 && (!wHit || tBest < wHit.t)) { hitPl = tBest; hitPlHead = head; }
      }
      // bot-vs-bot
      let hitBot = null, hitBotT = 1e9, hitBotHead = false;
      for (const o of this.bots) {
        if (!o.alive || o === b || o.team === b.team) continue;
        const c = o.centerPos(new THREE.Vector3());
        const tb = rayBoxForBots(origin, d2, c.x - 0.42, c.y - 0.9, c.z - 0.42, c.x + 0.42, c.y + 0.9, c.z + 0.42);
        const hh = o.headPos(new THREE.Vector3());
        const th = rayBoxForBots(origin, d2, hh.x - 0.19, hh.y - 0.19, hh.z - 0.19, hh.x + 0.19, hh.y + 0.19, hh.z + 0.19);
        let tB = -1, head = false;
        if (th >= 0 && (tb < 0 || th <= tb)) { tB = th; head = true; } else if (tb >= 0) tB = tb;
        if (tB >= 0 && tB < hitBotT && (!wHit || tB < wHit.t)) { hitBotT = tB; hitBot = o; hitBotHead = head; }
      }
      let end = origin.clone().addScaledVector(d2, wHit ? wHit.t : 120);
      if (hitPl >= 0) {
        end = origin.clone().addScaledVector(d2, hitPl);
        const dist = hitPl;
        const [n, f, mn] = w.falloff;
        const mult = dist > n ? THREE.MathUtils.lerp(1, mn, Math.min(1, (dist - n) / Math.max(0.1, f - n))) : 1;
        this.hooks.onPlayerHit(w.dmg * (hitPlHead ? w.hs : 1) * mult * tier(b).dmgMult, b, hitPlHead, end);
        FX.blood(end, d2.clone().negate());
      } else if (hitBot) {
        end = origin.clone().addScaledVector(d2, hitBotT);
        const [n, f, mn] = w.falloff;
        const dist = hitBotT;
        const mult = dist > n ? THREE.MathUtils.lerp(1, mn, Math.min(1, (dist - n) / Math.max(0.1, f - n))) : 1;
        this.hooks.onBotHitByBot(hitBot, w.dmg * (hitBotHead ? w.hs : 1) * mult, hitBotHead, b);
        FX.blood(end, d2.clone().negate());
      } else if (wHit) {
        FX.impact(end, wHit.normal || d2.clone().negate(), wHit.box.metal);
        // whizby if near player
        const pl = this.hooks.player;
        if (pl.alive) {
          const cp = closestPointOnRay(origin, d2, pl.centerPos(new THREE.Vector3()));
          if (cp.distanceTo(pl.centerPos(new THREE.Vector3())) < 1.4) SFX.whizby(cp);
        }
      }
      FX.tracer(muzzle, end, w.tracer);
    }
  }
  applyDamage(b, dmg, head, attacker, weaponName) {
    if (!b.alive) return { died: false };
    b.hp -= dmg;
    b.spottedT = 0;
    // aggro
    if (attacker && attacker !== b && (!b.target || Math.random() < 0.7)) {
      if (attacker.team !== b.team) { b.target = attacker; b.lastSeenPos.copy(attacker.pos); b.lastSeenT = 0; b.state = 'combat'; b.reactT = Math.max(b.reactT, 0.08); }
    }
    if (b.hp <= 0) {
      b.alive = false; b.hp = 0; b.deadT = 0; b.deaths++;
      b.deadDir = (attacker && attacker.pos) ? new THREE.Vector3(b.pos.x - attacker.pos.x, 0, b.pos.z - attacker.pos.z).normalize() : null; // [T133] the kill impulse — killer→victim, horizontal (the verlet knock-back read)
      b.deadKnock = knockFor(dmg); // [T138] THE KNOCK LAW — damage-scaled impulse (config single truth: 1.5 + dmg/60, cap 3.0)
      if (b.mesh) { b.mesh.rotation.z = Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); b.mesh.position.y = 0.4; }
      if (b.tag) b.tag.visible = false;
      return { died: true, head };
    }
    return { died: false };
  }

  physics(b, dt) {
    // gravity + ground
    b.vel.y -= CFG.PHYS.gravity * dt;
    b.pos.y += b.vel.y * dt;
    let ground = 0;
    for (const c of World.colliders) {
      if (b.pos.x + R > c.min.x && b.pos.x - R < c.max.x && b.pos.z + R > c.min.z && b.pos.z - R < c.max.z) {
        if (b.pos.y >= c.max.y - 0.4 && c.max.y > ground && b.pos.y - c.max.y < 0.4) ground = c.max.y;
      }
    }
    if (b.pos.y <= ground) { b.pos.y = ground; b.vel.y = 0; b.grounded = true; } else b.grounded = false;
    // horizontal with collision (steps ≤0.56m walkable → stairs auto-climb)
    const nx = b.pos.x + b.vel.x * dt, nz = b.pos.z + b.vel.z * dt;
    if (!this.blockedAt(b, nx, b.pos.y, b.pos.z)) b.pos.x = nx; else b.vel.x = 0, b.strafeDir *= -1;
    if (!this.blockedAt(b, b.pos.x, b.pos.y, nz)) b.pos.z = nz; else b.vel.z = 0, b.strafeDir *= -1;
    // footsteps
    const sp = Math.hypot(b.vel.x, b.vel.z);
    if (sp > 0.5) {
      b.stepAcc += sp * dt;
      if (b.stepAcc > 2.4) { b.stepAcc = 0; SFX.footstep(b.pos.clone().setY(b.pos.y + 0.1), false, 0, this.hooks.player ? b.team === this.hooks.player.team : false); } // [T132] the friendly flag — teammate steps ride 60% volume (the CoD emphasis law: enemies are the loudest thing on the mix)
    }
  }
  blockedAt(b, x, y, z) {
    for (const c of World.colliders) {
      if (x + R > c.min.x && x - R < c.max.x && z + R > c.min.z && z - R < c.max.z && y < c.max.y - 0.02 && y + 1.7 > c.min.y + 0.02) {
        if (c.max.y - y <= 0.56) continue; // walkable step (stairs)
        return true;
      }
    }
    return false;
  }
  followPath(b, dt, speedMult) {
    if (!b.path.length) return;
    const wps = World.waypoints;
    const node = wps[b.path[Math.min(b.pathI, b.path.length - 1)]];
    const to = _v1.subVectors(node.p, b.pos); to.y = 0;
    const d = to.length();
    if (d < 1.3) { b.pathI++; if (b.pathI >= b.path.length) { b.path = []; return; } return; }
    to.normalize();
    const face = Math.atan2(-to.x, -to.z);
    let dy = face - b.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    b.yaw += dy * Math.min(1, dt * 7);
    b.pitch *= Math.max(0, 1 - dt * 4);
    const sp = CFG.PHYS.walkSpeed * speedMult * (0.9 + b.skill * 0.12) * (b.slowT > 0 ? (b.slowMult || 1) : 1); // [T108 N8] SURGE consumption at the single speed law
    b.vel.x = to.x * sp; b.vel.z = to.z * sp;
  }
}

function tier(b) { return b.tier; }
function jitter(dir, amt) {
  const a = Math.random() * Math.PI * 2;
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir).normalize();
  return dir.clone().addScaledVector(right, Math.cos(a) * amt * Math.random()).addScaledVector(up, Math.sin(a) * amt * Math.random()).normalize();
}
function closestPointOnRay(o, d, p) {
  const t = Math.max(0, p.clone().sub(o).dot(d));
  return o.clone().addScaledVector(d, t);
}
