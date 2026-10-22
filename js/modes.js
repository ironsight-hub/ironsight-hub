// ============================================================
// IRONSIGHT — modes.js : FFA / TDM / DOM / Practice
// Scorestreaks [BO2/MW parity], abilities, respawn scheduling,
// DOM capture [COD: 6s, contest freeze, +1/5s/flag, win 200]
// ============================================================
import * as THREE from 'three';
import { CFG, GG_LADDER, SND_SITES, SND_BOMB, ABILITIES, WEAPONS, BR_LOOT } from './config.js';
import { World, rayAABB, segmentBlocked, makeLootPickup, takeLootPickup, updateGasZone, hideGasZone } from './world.js';
import * as FX from './effects.js';
import * as SFX from './audio.js';

const _v1 = new THREE.Vector3();

export class Match {
  constructor(hooks) {
    this.hooks = hooks; // {player, bots, weapons, announce(t,s), banner(pts,label), killfeed(k,v,wpn,head,me), endMatch(res), camera(), scene(), practiceDps(...), settings()}
    this.mode = 'ffa';
    this.state = 'idle';
    this.timeLeft = 0;
    this.teamKills = [0, 0, 0];
    this.domScore = [0, 0]; // [ally, enemy] from player perspective
    this.uavT = 0;
    this.multikills = [];   // timestamps
    this.respawnQueue = []; // {actor, t}
    this.ability = null; this.abilityCd = 0; this.abilityCharges = 0;
    this.streakReady = [false, false, false];
    this.loadout = hooks.streakLoadout || [0, 1, 2]; // [T155 R6] slot→STREAKS-def map (career.streakLoadout, injected by main.js; default = the pre-T155 slots verbatim)
    this.airstrikes = []; // {t, target, dir, def}
    this.supplyCrates = []; // {mesh, owner, def}
    this.burnZones = []; // [T155 R6] napalm DoT residue {center, r, t, dps, owner, acc}
    this.lastDamageFrom = null;
    this.session = { bestStreak: 0, bestMulti: 0 };
    // --- T1-1 modes (SS22) ---
    this.objS = [0, 0];        // hp points / kc confirms / snd round wins [ally, enemy] (player perspective)
    this.hills = [];           // World.hills mirror refs {id,pos,owner,prog}
    this.hpIdx = -1;           // active hill index (-1 = lead-in)
    this.hpT = 0;              // hill clock: leadIn then hillTime per hill
    this.hpTickT = 0;          // 1 pt/s tick accumulator
    this.kcTags = [];          // {x, z, team, t}
    this.snd = null;           // {r, side, phase, roundT, bombT, pp, dp, bomb:{x,z}|null, siteIdx}
    this.ggWinner = null;      // actor who completed the ladder
    this.sndInterT = 0;        // intermission clock
    // --- v1.55 T89 mode-trio re-lands (L1/L2/L3) ---
    this.gf = null;            // {r, side, phase, roundT, kit} — Gunfight round machine (snd structure)
    this.inf = null;           // {started, first, pz} — Infected countdown + conversion machine (snapshot truth law)
    this.ctl = null;           // {r, side, phase, roundT, caps, extraUsed, sites} — Control machine (78-a numerics)
    this.gfInterT = 0; this.ctlInterT = 0;
    this.br = null;            // [T171] Battle Royale machine — {ph, st, t, cx, cz, r, tx, tz, tr, dps, acc, spectT}
  }

  start(mode, difficulty) {
    this.mode = mode; this.state = 'countdown';
    this.timeLeft = CFG.MODES[mode].time || 0;
    this.countdownT = 3.0;
    this.teamKills = [0, 0, 0]; this.domScore = [0, 0];
    this.multikills = []; this.respawnQueue = [];
    this.uavT = 0; this.airstrikes = []; this.supplyCrates = []; this.burnZones = [];
    this.session = { bestStreak: 0, bestMulti: 0 };
    // T1-1 resets (SS22)
    this.objS = [0, 0]; this.hpIdx = -1; this.hpT = 0; this.hpTickT = 0;
    this.kcTags = []; this.ggWinner = null; this.sndInterT = 0; this.sndPreT = 0;
    for (const h of World.hills) { h.owner = -1; h.prog = 0; h.ring.visible = false; h.disc.visible = false; }
    this.snd = null;
    const ab = ABILITIES.find(a => a.id === (this.hooks.loadout ? this.hooks.loadout().ability : null)) || ABILITIES[0];
    this.ability = ab; this.abilityCd = 0;
    this.abilityCharges = ab.charges || 1;
    for (const f of World.flags) { f.owner = -1; f.prog = 0; }
    const m = CFG.MODES[mode];
    const botCount = mode === 'practice' ? 3 : (m.players - 1);
    this.hooks.bots.spawn(botCount, 0, difficulty, mode);
    this.practice = { shots: 0, hits: 0, dmgWindow: [], strafe: true, count: 3 };
    // T1-1 per-mode boot (SS22)
    for (const a of this.allActors()) a.ggTier = 0;
    if (mode === 'hp') { this.hpT = m.leadIn; } // first hill activates 20s into live [e_11]
    if (mode === 'snd') { this.snd = { r: 1, side: 0, phase: 'pre', roundT: 0, bombT: 0, pp: 0, dp: 0, bomb: null, siteIdx: 0 }; this.sndRoundStart(); }
    for (const s of World.sndSites) s.ring.visible = (mode === 'snd' || mode === 'ctl'); // SS22.3 + T89 L3: site rings in snd AND ctl (two zones)
    if (mode === 'gf') { this.gf = { r: 1, side: 0, phase: 'pre', roundT: 0, kit: null }; this.gfRoundStart(); } // L1: round machine boot
    if (mode === 'inf') { this.inf = { started: false, first: m.first, pz: null }; } // L2: snapshot truth inf:{started:false, first:15, alive0:1}
    if (mode === 'ctl') { this.ctl = { r: 1, side: 0, phase: 'pre', roundT: 0, caps: 0, extraUsed: false, sites: [] }; this.ctlRoundStart(); } // L3: two zones, attackers = team 0
    if (mode === 'br') this.brStart(); // [T171] gas machine + loot economy + the announce
    if (mode === 'gg') this.hooks.announce('GUN GAME', GG_LADDER.length + ' WEAPONS + KNIFE FINISHER');
  }

  update(dt) {
    if (this.state === 'ended') return;
    if (this.state === 'countdown') {
      this.countdownT -= dt;
      if (this.countdownT <= 0) this.state = 'live';
      return;
    }
    // MP (T1-9/T2-10): the SERVER owns time, DOM capture, win checks and streak world
    // (Task 33) — the local match object stays presentation-only: respawn queue, ability
    // cd for the HUD, multikill window. Local win checks would fire a phantom end screen
    // (local allActors has no bots/remotes) and local DOM sim would fight the m.fl mirror.
    if (this.hooks.mp && this.hooks.mp()) { this.updateMpLite(dt); return; }
    // time (snd/gf/ctl own their own round clocks — SS22.3 + T89 L1/L3 clock-exclusion law; the
    // server mirror MUST carry the same exclusion — the pre-rewind live probe caught
    // matchFinish(room,'time') firing on the first tick when ctl was left out of the list)
    if (this.mode !== 'practice' && this.mode !== 'snd' && this.mode !== 'gf' && this.mode !== 'ctl') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.finish('time'); return; }
    }
    // respawns
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i];
      r.t -= dt;
      if (r.t <= 0) {
        this.respawnQueue.splice(i, 1);
        if (r.actor.isPlayer) this.hooks.respawnPlayer();
        else this.hooks.bots.respawnAt(r.actor);
      }
    }
    // DOM
    if (this.mode === 'dom') this.updateDom(dt);
    // T1-1 objective machines (SS22)
    if (this.mode === 'hp') this.updateHardpoint(dt);
    if (this.mode === 'kc') this.updateKc(dt);
    if (this.mode === 'snd') this.updateSnd(dt);
    // v1.55 T89 mode trio (L1/L2/L3)
    if (this.mode === 'gf') this.updateGf(dt);
    if (this.mode === 'inf') this.updateInf(dt);
    if (this.mode === 'ctl') this.updateCtl(dt);
    if (this.mode === 'br') this.updateBr(dt); // [T171] gas machine + elimination law
    // streaks
    if (this.uavT > 0) this.uavT -= dt;
    // abilities
    if (this.abilityCd > 0) this.abilityCd -= dt;
    // airstrike scheduling
    for (let i = this.airstrikes.length - 1; i >= 0; i--) {
      const a = this.airstrikes[i];
      a.t -= dt;
      if (a.t <= 0) {
        const st = a.def || CFG.STREAKS[1]; // [T155 R6] the strike's OWN def (waves/bombs/dmg per streak)
        // [T161 R6] the AI-TRACKING wave law — st.ai (CHOPPER, the AI-UNIT class): each wave
        // retargets to the nearest live enemy of the owner at WAVE-TIME (targeting
        // intelligence, not a fixed point); no live enemy → the last point stands.
        if (st.ai) {
          let best = null, bd = Infinity;
          for (const b of this.hooks.bots.bots) {
            if (!b.alive || b.team === a.owner.team) continue;
            const d2 = b.pos.distanceToSquared(a.owner.pos);
            if (d2 < bd) { bd = d2; best = b; }
          }
          if (best) { a.target.copy(best.pos); a.target.y = 0; }
        }
        const bombs = st.bombs || 1;
        for (let b = 0; b < bombs; b++) {
          setTimeout(() => {
            if (this.state === 'ended') return;
            const p = a.target.clone().addScaledVector(a.dir, (b - (bombs - 1) / 2) * 3.2);
            p.y = 0.4;
            FX.explosion(p, st.radius);
            SFX.explosion(p);
            FX.shake(0.05);
            this.areaDamage(p, st.radius, st.dmg, a.owner);
          }, b * 130);
        }
        if (st.fx === 'napalm') { // [T155 R6] the burn zone lands after the last bomb — 25 dps × 8s area denial
          setTimeout(() => {
            if (this.state === 'ended') return;
            this.burnZones.push({ center: a.target.clone(), r: st.radius, t: st.burn, dps: st.dmg, owner: a.owner, acc: 0 });
          }, bombs * 130);
        }
        this.airstrikes.splice(i, 1);
      }
    }
    // supply crates falling
    for (let i = this.supplyCrates.length - 1; i >= 0; i--) {
      const c = this.supplyCrates[i];
      c.mesh.position.y -= 9 * dt;
      if (c.mesh.position.y <= 0.45) {
        c.mesh.position.y = 0.45;
        this.grantSupply(c.owner, c.mesh.position, c.def);
        this.hooks.scene().remove(c.mesh);
        this.supplyCrates.splice(i, 1);
      }
    }
    // [T155 R6] napalm burn zones — half-second damage ticks (the modes-side of the hub's room.burns)
    for (let i = this.burnZones.length - 1; i >= 0; i--) {
      const z = this.burnZones[i];
      z.t -= dt;
      if (z.t <= 0) { this.burnZones.splice(i, 1); continue; }
      z.acc += dt;
      if (z.acc >= 0.5) {
        z.acc = 0;
        this.areaDamage(z.center, z.r, z.dps * 0.5, z.owner);
      }
    }
    // multikill window cleanup
    const now = performance.now() / 1000;
    this.multikills = this.multikills.filter(t => now - t < CFG.MULTI.window);
    // win checks
    const m = CFG.MODES[this.mode];
    if (this.mode === 'ffa') {
      const top = this.allActors().find(a => a.kills >= m.killLimit);
      if (top) this.finish('limit');
    } else if (this.mode === 'tdm') {
      const ally = this.teamKills[0], enemy = this.teamKills[1];
      if (ally >= m.teamLimit || enemy >= m.teamLimit) this.finish('limit');
    } else if (this.mode === 'ct') { // [T139] CUTTHROAT 3v3v3 — THREE-way limit check (the m_00 "3v3v3" shape; teamLimit 40 = SPEC DECISION logged, no numerics on disk)
      if (this.teamKills[0] >= m.teamLimit || this.teamKills[1] >= m.teamLimit || this.teamKills[2] >= m.teamLimit) this.finish('limit');
    } else if (this.mode === 'dom') {
      if (this.domScore[0] >= m.pointLimit || this.domScore[1] >= m.pointLimit) this.finish('limit');
    }
    // T1-1 win checks (SS22)
    else if (this.mode === 'hp') {
      if (this.objS[0] >= m.pointLimit || this.objS[1] >= m.pointLimit) this.finish('limit');
    } else if (this.mode === 'kc') {
      if (this.objS[0] >= m.teamLimit || this.objS[1] >= m.teamLimit) this.finish('limit');
    } else if (this.mode === 'gg') {
      if (this.ggWinner) this.finish('limit');
    }
  }

  allActors() { return [this.hooks.player, ...this.hooks.bots.bots]; }

  // MP-lite tick (Task 33): server owns the match; local object keeps the HUD alive
  updateMpLite(dt) {
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i];
      r.t -= dt;
      if (r.t <= 0) {
        this.respawnQueue.splice(i, 1);
        if (r.actor.isPlayer) this.hooks.respawnPlayer();
      }
    }
    if (this.abilityCd > 0) this.abilityCd -= dt; // HUD cooldown (server re-validates use)
    const now = performance.now() / 1000;
    this.multikills = this.multikills.filter(t => now - t < CFG.MULTI.window);
  }

  // ---------------- DOM ----------------
  updateDom(dt) {
    const m = CFG.MODES.dom;
    const pl = this.hooks.player;
    for (const f of World.flags) {
      const inR = (a) => a.alive && Math.hypot(a.pos.x - f.pos.x, a.pos.z - f.pos.z) < 3.6 && a.pos.y < 3;
      const allies = this.allActors().filter(a => (a.team === pl.team ? true : false) && inR(a));
      const enemies = this.allActors().filter(a => a.team !== pl.team && inR(a));
      if (allies.length && !enemies.length) {
        const speed = m.captureTime / (1 + m.extraCapper * (allies.length - 1));
        if (f.owner !== 0) {
          f.prog += dt / speed * (f.owner === -1 ? 1 : 1);
          if (f.prog >= 1) {
            const wasEnemy = f.owner === 1;
            f.owner = 0; f.prog = 0;
            if (inR(pl)) { if (pl.isPlayer) pl.captures = (pl.captures || 0) + 1; this.hooks.banner(CFG.XP.capture, wasEnemy ? 'FLAG CAPTURED' : 'FLAG TAKEN'); pl.score += CFG.XP.capture; }
            else if (wasEnemy) this.hooks.announce('FLAG CAPTURED', 'objective secured');
            SFX.pickup(null, 0);
          }
        } else f.prog = 0;
      } else if (enemies.length && !allies.length) {
        if (f.owner !== 1) {
          f.prog += dt / m.captureTime;
          if (f.prog >= 1) { f.owner = 1; f.prog = 0; this.hooks.announce('FLAG LOST', 'enemy captured ' + f.id); SFX.pickup(null, 1); }
        } else f.prog = 0;
      }
      // visuals
      const col = f.owner === 0 ? 0x3fa7ff : f.owner === 1 ? 0xff5252 : 0x9aa6b5;
      f.ring.material.color.set(col);
      f.cloth.material.color.set(col);
      f.ring.material.opacity = 0.4 + 0.3 * Math.sin(performance.now() / 300) * 0.5 + (f.prog > 0 ? 0.3 : 0);
    }
    // tick score every 5s
    this.domTickT = (this.domTickT ?? 0) - dt;
    if (this.domTickT <= 0) {
      this.domTickT = m.tickSec;
      for (const f of World.flags) if (f.owner === 0) this.domScore[0]++;
      for (const f of World.flags) if (f.owner === 1) this.domScore[1]++;
    }
  }

  // ---------------- T1-1: HARDPOINT (SS22.1) — DOM math reused, single active hill ----------------
  updateHardpoint(dt) {
    const m = CFG.MODES.hp;
    const pl = this.hooks.player;
    // hill clock: leadIn (first activation 20s into live [e_11]) then hillTime per hill
    if (this.hpIdx === -1) {
      this.hpT -= dt;
      if (this.hpT <= 0) { this.hpIdx = 0; this.hpT = m.hillTime; this.hpTickT = 0; this.hooks.announce('HILL A ACTIVE', 'hold the hardpoint'); }
      return;
    }
    this.hpT -= dt;
    if (this.hpT <= 0) { // rotate [e_11: every 60s]
      this.hpIdx = (this.hpIdx + 1) % World.hills.length;
      const h = World.hills[this.hpIdx];
      h.owner = -1; h.prog = 0;
      this.hpT = m.hillTime; this.hpTickT = 0;
      this.hooks.announce('HILL ' + h.id + ' ACTIVE', 'hardpoint moved');
    }
    const hill = World.hills[this.hpIdx];
    const inR = (a) => a.alive && Math.hypot(a.pos.x - hill.pos.x, a.pos.z - hill.pos.z) < 3.6 && a.pos.y < 3; // DOM inR parity
    const allies = this.allActors().filter(a => a.team === pl.team && inR(a));
    const enemies = this.allActors().filter(a => a.team !== pl.team && inR(a));
    // capture (DOM math verbatim: extraCapper divisor, contest freeze)
    if (allies.length && !enemies.length) {
      if (hill.owner !== pl.team) {
        const speed = m.captureTime / (1 + m.extraCapper * (allies.length - 1));
        hill.prog += dt / speed;
        if (hill.prog >= 1) {
          const wasEnemy = hill.owner === 1 - pl.team;
          hill.owner = pl.team; hill.prog = 0;
          if (inR(pl)) { this.hooks.banner(CFG.XP.capture, wasEnemy ? 'HILL CAPTURED' : 'HILL TAKEN'); pl.score += CFG.XP.capture; }
          else this.hooks.announce('HILL ' + hill.id + ' SECURED', '');
          SFX.pickup(null, 0);
        }
      }
      // scoring: 1 pt/s while secured [e_11]
      if (hill.owner === pl.team) {
        this.hpTickT -= dt;
        if (this.hpTickT <= 0) { this.hpTickT = m.tickSec; this.objS[0]++; }
      }
    } else if (enemies.length && !allies.length) {
      if (hill.owner !== 1 - pl.team) {
        hill.prog += dt / m.captureTime;
        if (hill.prog >= 1) { hill.owner = 1 - pl.team; hill.prog = 0; this.hooks.announce('HILL LOST', 'enemy holds ' + hill.id); }
      } else { // enemy secures: they score from the player's perspective
        this.hpTickT -= dt;
        if (this.hpTickT <= 0) { this.hpTickT = m.tickSec; this.objS[1]++; }
      }
    } else this.hpTickT = Math.max(this.hpTickT, 0.001); // contest freeze: capture AND scoring paused
    // visuals: only the active hill shows; colors mirror DOM (modes.js:175)
    for (let i = 0; i < World.hills.length; i++) {
      const h = World.hills[i];
      const active = i === this.hpIdx;
      h.ring.visible = active; h.disc.visible = active;
      if (!active) continue;
      const col = h.owner === 0 ? 0x3fa7ff : h.owner === 1 ? 0xff5252 : 0x9aa6b5;
      h.ring.material.color.set(col); h.disc.material.color.set(col);
      h.ring.material.opacity = 0.4 + 0.3 * Math.sin(performance.now() / 300) * 0.5 + (h.prog > 0 ? 0.3 : 0);
    }
  }

  // ---------------- T1-1: KILL CONFIRMED (SS22.2) — server-simmed presence pickup ----------------
  updateKc(dt) {
    const mk = CFG.MODES.kc;
    const pl = this.hooks.player;
    for (let i = this.kcTags.length - 1; i >= 0; i--) {
      const tg = this.kcTags[i];
      tg.t -= dt;
      if (tg.t <= 0) { this.kcTags.splice(i, 1); continue; } // TTL despawn (SPEC DECISION 12s)
      for (const a of this.allActors()) {
        if (!a.alive || a.team === undefined) continue;
        if (Math.hypot(a.pos.x - tg.x, a.pos.z - tg.z) < mk.tagRadius) {
          this.kcTags.splice(i, 1);
          if (a.team !== tg.team) { // CONFIRM: enemy tag [e_12]
            if (a.team === pl.team) this.objS[0]++; else this.objS[1]++;
            if (a.isPlayer) { a.confirms = (a.confirms || 0) + 1; a.score += CFG.XP.confirm; this.hooks.banner(CFG.XP.confirm, 'CONFIRMED'); SFX.pickup(null, 1); }
            else a.score += CFG.XP.confirm; // bot collector XP (server kcUpdate parity: any collector credited)
            if (tg.killer && tg.killer !== a) tg.killer.score += CFG.XP.deny; // killer +25 confirm assist [CoD Wiki e_12] (the 25 = deny constant)
          } else { // DENY: own tag, no team point [e_12]
            if (a.isPlayer) { a.score += CFG.XP.deny; this.hooks.banner(CFG.XP.deny, 'TAG DENIED'); SFX.pickup(null, 0); }
          }
          break;
        }
      }
    }
  }

  // ---------------- T1-1: SEARCH & DESTROY (SS22.3) — round machine, presence plant/defuse ----------------
  sndAttackTeam() { return this.snd.side; } // side = team index attacking THIS round (swap after 5 [e_13])
  sndRoundStart() {
    const s = this.snd, m = CFG.MODES.snd;
    s.phase = 'pre'; s.roundT = 0; s.bombT = 0; s.pp = 0; s.dp = 0; s.bomb = null;
    s.siteIdx = (s.r - 1) % 2; // sites alternate A/B per round, round 1 = site A (A(-40,0)/B(40,0))
    // re-arm everyone at team pools (no-respawn rounds start fresh)
    for (const b of this.hooks.bots.bots) { if (!b.alive) this.hooks.bots.respawnAt(b); b.hp = CFG.HEALTH.maxHP; b.alive = true; }
    if (s.r > 1) this.hooks.respawnPlayer(); // round 1: main.js respawnPlayer runs right after start()
    this.hooks.announce('ROUND ' + s.r, s.side === this.hooks.player.team ? 'ATTACK — PLANT THE BOMB' : 'DEFEND THE SITES');
  }
  sndRoundEnd(winnerTeam, why) {
    const s = this.snd, m = CFG.MODES.snd;
    s.phase = 'inter'; this.sndInterT = m.intermission;
    const mine = winnerTeam === this.hooks.player.team;
    this.objS[winnerTeam === this.hooks.player.team ? 0 : 1]++;
    this.hooks.announce(mine ? 'ROUND WON' : 'ROUND LOST', why);
    SFX.announceSting(mine ? 2 : 0);
  }
  updateSnd(dt) {
    const s = this.snd, m = CFG.MODES.snd, pl = this.hooks.player;
    if (!s) return;
    if (s.phase === 'pre') {
      s.roundT = m.preRound;
      this.sndPreT = (this.sndPreT ?? 0) - dt;
      if (this.sndPreT <= 0) { this.sndPreT = 0; s.phase = 'live'; s.roundT = m.roundTime; this.hooks.announce('LIVE', s.side === pl.team ? 'plant at site ' + SND_SITES[s.siteIdx].id : 'defend'); }
      return;
    }
    if (s.phase === 'inter') {
      this.sndInterT -= dt;
      if (this.sndInterT <= 0) {
        // side swap after 5 rounds regardless of outcome [e_13]; first to roundLimit wins
        if (s.r >= m.swapAfter && s.r === m.swapAfter) { s.side = 1 - s.side; this.hooks.announce('SIDES SWAP', s.side === pl.team ? 'you attack now' : 'you defend now'); }
        if (this.objS[0] >= m.roundLimit || this.objS[1] >= m.roundLimit) { this.finish('limit'); return; }
        s.r++; this.sndRoundStart();
      }
      return;
    }
    // live round
    const atkTeam = s.side;
    const site = SND_SITES[s.siteIdx];
    const actors = this.allActors();
    if (!s.bomb) {
      // plant: attacker presence in site (DOM inR parity 3.6m, y<3)
      const planters = actors.filter(a => a.alive && a.team === atkTeam && Math.hypot(a.pos.x - site.x, a.pos.z - site.z) < 3.6 && a.pos.y < 3);
      if (planters.length) {
        s.pp += dt / m.plantTime; // [e_13: 5s plant]
        if (s.pp >= 1) {
          s.bomb = { x: site.x, z: site.z }; s.pp = 0; s.bombT = m.bombTime; // [e_13: 45s bomb, BO6; AW 40s conflict logged]
          const who = planters[0];
          if (who.isPlayer) { who.score += CFG.XP.plant; this.hooks.banner(CFG.XP.plant, 'BOMB PLANTED'); }
          this.hooks.announce('BOMB PLANTED', '45 seconds to detonation');
          SFX.announceSting(1);
        }
      } else s.pp = Math.max(0, s.pp - dt * 0.5); // progress decays off-site
      // round timer (only before plant)
      s.roundT -= dt;
      if (s.roundT <= 0) { this.sndRoundEnd(1 - atkTeam, 'TIME — SITES HELD'); return; } // no plant at expiry -> defenders win [e_13]
    } else {
      // bomb armed: round timer superseded by the bomb clock
      s.bombT -= dt;
      const defusers = actors.filter(a => a.alive && a.team !== atkTeam && Math.hypot(a.pos.x - s.bomb.x, a.pos.z - s.bomb.z) < 3.6);
      if (defusers.length) {
        s.dp += dt / m.defuseTime; // [e_13: 7.5s defuse]
        if (s.dp >= 1) {
          const who = defusers[0];
          if (who.isPlayer) { who.score += CFG.XP.defuse; this.hooks.banner(CFG.XP.defuse, 'BOMB DEFUSED'); }
          this.sndRoundEnd(1 - atkTeam, 'BOMB DEFUSED');
          return;
        }
      } else s.dp = Math.max(0, s.dp - dt * 0.5);
      if (s.bombT <= 0) {
        this.areaDamage(new THREE.Vector3(s.bomb.x, 0.5, s.bomb.z), SND_BOMB.radius, SND_BOMB.dmg, null); // SPEC DECISION 250r12
        this.sndRoundEnd(atkTeam, 'TARGET DESTROYED');
        return;
      }
    }
    // elimination checks (dead sit out — no respawn mid-round)
    const atkAlive = actors.some(a => a.alive && a.team === atkTeam);
    const defAlive = actors.some(a => a.alive && a.team !== atkTeam);
    if (!defAlive) { this.sndRoundEnd(atkTeam, 'DEFENDERS ELIMINATED'); return; }
    if (!atkAlive && !s.bomb) { this.sndRoundEnd(1 - atkTeam, 'ATTACKERS ELIMINATED'); return; }
    // planted + all attackers dead: defenders still must defuse [e_13 esports rule] — bomb timer decides
  }

  // ---------------- v1.55 T89 L1: GUNFIGHT (gf) — 2v2 round machine, shared kit per round ----------------
  // Structure = snd verbatim (round/pre/inter phases, swap-after, roundLimit); kit rides the
  // gfKit hook (main.js builds a TEMP loadout — the pre-rewind giveKit leak fix: reassigning
  // the module loadout leaked the round kit into later matches; startMatch re-applies the
  // saved loadout each match, so the temp object dies with the round).
  gfRoundStart() {
    const g = this.gf, m = CFG.MODES.gf;
    g.phase = 'pre'; g.roundT = 0;
    const kit = CFG.GF_KITS[(g.r - 1) % CFG.GF_KITS.length]; // deterministic per round (no seed needed — r is the seed)
    g.kit = kit;
    if (this.hooks.gfKit) this.hooks.gfKit(kit, g.r); // temp-loadout apply (player + bots) — hook is optional (server-lite contexts)
    for (const b of this.hooks.bots.bots) { if (!b.alive) this.hooks.bots.respawnAt(b); b.hp = CFG.HEALTH.maxHP; b.alive = true; }
    if (g.r > 1) this.hooks.respawnPlayer();
    this.hooks.announce('ROUND ' + g.r, 'KIT: ' + kit[0].toUpperCase() + ' + ' + kit[1].toUpperCase());
  }
  gfRoundEnd(winnerTeam, why) {
    const g = this.gf, m = CFG.MODES.gf;
    g.phase = 'inter'; this.gfInterT = m.intermission;
    const mine = winnerTeam === this.hooks.player.team;
    this.objS[winnerTeam === this.hooks.player.team ? 0 : 1]++;
    this.hooks.announce(mine ? 'ROUND WON' : 'ROUND LOST', why);
    SFX.announceSting(mine ? 2 : 0);
  }
  updateGf(dt) {
    const g = this.gf, m = CFG.MODES.gf, pl = this.hooks.player;
    if (!g) return;
    if (g.phase === 'pre') {
      g.roundT = m.preRound;
      this.gfPreT = (this.gfPreT ?? 0) - dt;
      if (this.gfPreT <= 0) { this.gfPreT = 0; g.phase = 'live'; g.roundT = m.roundTime; this.hooks.announce('LIVE', '40 seconds — eliminate or hold'); }
      return;
    }
    if (g.phase === 'inter') {
      this.gfInterT -= dt;
      if (this.gfInterT <= 0) {
        if (g.r === m.swapAfter) { g.side = 1 - g.side; this.hooks.announce('SIDES SWAP', 'switching ends'); }
        if (this.objS[0] >= m.roundLimit || this.objS[1] >= m.roundLimit) { this.finish('limit'); return; }
        g.r++; this.gfRoundStart();
      }
      return;
    }
    // live round: 40s expiry -> round to the team with more players alive; tie -> defenders(side 1) [COD Gunfight]
    g.roundT -= dt;
    const actors = this.allActors();
    if (g.roundT <= 0) {
      const a0 = actors.filter(a => a.alive && a.team === 0).length, a1 = actors.filter(a => a.alive && a.team === 1).length;
      this.gfRoundEnd(a0 > a1 ? 0 : 1, 'TIME — MOST ALIVE'); // tie -> team 1 (side law, documented)
      return;
    }
    // elimination checks (dead sit out — no respawn mid-round)
    if (!actors.some(a => a.alive && a.team === 0)) { this.gfRoundEnd(1, 'SQUAD ELIMINATED'); return; }
    if (!actors.some(a => a.alive && a.team === 1)) { this.gfRoundEnd(0, 'SQUAD ELIMINATED'); return; }
  }

  // ---------------- v1.55 T89 L2: INFECTED (inf) — Patient-Zero countdown + conversion ----------------
  // Snapshot truth law (surviving live-wire fragment): inf:{started:false, first:15, alive0:1}.
  // Survivors (team 0) win the 3:00 clock; horde (team 1) wins by converting everyone.
  // Speed: bots only — speedMult consumed at followPath (bots.js), physics module untouched.
  infConvert(victim) {
    if (victim.team === 1) return; // horde death — normal respawn, no conversion
    victim.team = 1; // COD Infected law: the dead join the horde
    this.infArmMelee(victim); // [v1.50 port T90] §57.2: conversion = melee-only equip (gg finisher pattern)
    const name = victim.isPlayer ? 'YOU' : victim.name;
    this.hooks.announce(victim.isPlayer ? 'YOU ARE INFECTED' : name + ' WAS INFECTED', victim.isPlayer ? 'hunt the survivors — melee only' : 'survive or convert');
    SFX.announceSting(0);
  }
  infArmMelee(a) { // [v1.50 port T90] §57.2 (v1.47) infect() law: the infected fight melee-only — player equips the knife (modes.js gg finisher idiom); bots ride setBotWeapon ('melee' → smg stand-in, bots have no melee behavior — DEVLOG v1.9)
    if (a.isPlayer) this.hooks.weapons.equipWeapon('melee', true);
    else if (this.hooks.bots.setBotWeapon) this.hooks.bots.setBotWeapon(a, 'melee');
  }
  updateInf(dt) {
    const inf = this.inf, m = CFG.MODES.inf, pl = this.hooks.player;
    if (!inf) return;
    // T105 (v1.69): the §57.2 HUD surfaces hoist ABOVE the started gate — survivors/horde counts
    // are live from the countdown (pre-start: everyone alive is a survivor, horde 0 — the hud inf
    // branch reads teamKills in BOTH phases; the all-converted finish check stays live-phase only).
    const actors = this.allActors();
    this.teamKills[0] = actors.filter(a => a.alive && a.team === 0).length; // [v1.50 port T90] §57.2 HUD surfaces: survivors alive
    this.teamKills[1] = actors.filter(a => a.team === 1).length; // horde size (MP: server mirror owns the block — updateMpLite returns earlier)
    if (!inf.started) {
      inf.first -= dt; // 15s Patient-Zero countdown (snapshot law: first:15, ticking)
      if (inf.first <= 0) {
        inf.started = true;
        const pool = actors.filter(a => a.alive); // [v1.50 port T90] §57.2: Patient Zero is picked from the LIVING (a countdown-period death must not become PZ)
        const pz = pool[Math.floor(Math.random() * pool.length)] || actors[0]; // alive0 = 1 (snapshot law)
        pz.team = 1; pz.ctlLives = undefined; inf.pz = pz;
        this.infArmMelee(pz); // [v1.50 port T90] §57.2: patient zero joins the horde — melee-only equip law
        this.hooks.announce(pz.isPlayer ? 'YOU ARE PATIENT ZERO' : pz.name + ' IS PATIENT ZERO', 'SURVIVE THE HORDE');
        SFX.announceSting(0);
      }
      return;
    }
    // live horde phase: global clock owns the 3:00 survive win (finish('time') → survivors win)
    if (!actors.some(a => a.alive && a.team === 0)) this.finish('limit'); // all converted -> horde wins
  }

  // ---------------- v1.55 T89 L3: CONTROL (ctl) — two zones, capture-all, lives attrition ----------------
  // 78-a numerics (research M-c): attackers = team 0 capture BOTH zones to win the round;
  // defenders win via respawns/attrition (attackers bleed 12 lives/player dry) or round time.
  // +60s per capture (captureBonus); extraUsed per-round reset law (pre-rewind self-review
  // defect: without the reset, round 2's first capture loses its +60s).
  ctlRoundStart() {
    const c = this.ctl, m = CFG.MODES.ctl;
    c.phase = 'pre'; c.roundT = 0; c.caps = 0; c.extraUsed = false; // extraUsed reset — the +60s must land once per capture, fresh each round
    c.sites = [0, 1]; // both zone indexes live this round (A + B)
    SND_SITES.forEach(s => { s.ctlProg = 0; s.ctlDone = false; }); // zone latches fresh per round
    for (const a of this.allActors()) a.ctlLives = m.lives; // 12 lives per player, fresh per round
    for (const b of this.hooks.bots.bots) { if (!b.alive) this.hooks.bots.respawnAt(b); b.hp = CFG.HEALTH.maxHP; b.alive = true; }
    if (c.r > 1) this.hooks.respawnPlayer();
    this.hooks.announce('ROUND ' + c.r, c.side === 0 ? 'ATTACK — CAPTURE A + B' : 'DEFEND — HOLD A + B');
  }
  ctlRoundEnd(winnerTeam, why) {
    const c = this.ctl, m = CFG.MODES.ctl;
    c.phase = 'inter'; this.ctlInterT = m.intermission;
    const mine = winnerTeam === this.hooks.player.team;
    this.objS[winnerTeam === this.hooks.player.team ? 0 : 1]++;
    this.hooks.announce(mine ? 'ROUND WON' : 'ROUND LOST', why);
    SFX.announceSting(mine ? 2 : 0);
  }
  updateCtl(dt) {
    const c = this.ctl, m = CFG.MODES.ctl, pl = this.hooks.player;
    if (!c) return;
    if (c.phase === 'pre') {
      c.roundT = m.preRound;
      this.ctlPreT = (this.ctlPreT ?? 0) - dt;
      if (this.ctlPreT <= 0) { this.ctlPreT = 0; c.phase = 'live'; c.roundT = m.roundTime; this.hooks.announce('LIVE', c.side === 0 ? 'capture A + B' : 'defend A + B'); }
      return;
    }
    if (c.phase === 'inter') {
      this.ctlInterT -= dt;
      if (this.ctlInterT <= 0) {
        if (c.r === m.roundLimit - 1) { c.side = 1 - c.side; this.hooks.announce('SIDES SWAP', 'attackers and defenders switch'); } // swap-every-round law (2-round match = swap at half)
        if (this.objS[0] >= m.roundLimit || this.objS[1] >= m.roundLimit) { this.finish('limit'); return; }
        c.r++; this.ctlRoundStart();
      }
      return;
    }
    // live round — clock PAUSES during pre/inter by the exclusion law; live ticks down, +60s per capture
    const actors = this.allActors();
    if (c.side === 0) { // attackers capturing (player-perspective: side 0 = team 0 attacks)
      for (const si of c.sites) {
        const site = SND_SITES[si];
        const inR = (a) => a.alive && a.team === 0 && Math.hypot(a.pos.x - site.x, a.pos.z - site.z) < m.capRadius && a.pos.y < 3; // DOM inR parity
        const contest = (t) => actors.filter(a => a.alive && a.team === t && Math.hypot(a.pos.x - site.x, a.pos.z - site.z) < m.capRadius && a.pos.y < 3).length;
        if (contest(0) > 0 && contest(1) === 0) {
          const speed = m.captureTime / (1 + m.extraCapper * (contest(0) - 1)); // extraCapper = DOM verbatim
          site.ctlProg = (site.ctlProg || 0) + dt / speed;
          if (site.ctlProg >= 1) {
            site.ctlProg = 0; site.ctlDone = true; c.caps++; // ctlDone = the round-capture latch (prog resets, done persists)
            c.roundT += m.captureBonus; // +60s per capture (78-a); extraUsed tracking keeps the law auditable
            c.extraUsed = true;
            const who = actors.find(inR);
            if (who && who.isPlayer) { who.score += CFG.XP.capture; who.captures = (who.captures || 0) + 1; this.hooks.banner(CFG.XP.capture, 'ZONE ' + site.id + ' CAPTURED  +60s'); }
            this.hooks.announce('ZONE ' + site.id + ' CAPTURED', '+' + m.captureBonus + ' SECONDS');
            SFX.pickup(null, 0);
          }
        } else site.ctlProg = Math.max(0, (site.ctlProg || 0) - dt * 0.5); // progress decays contested/empty (DOM decay parity)
      }
      const capsNow = SND_SITES.filter((s, i) => c.sites.includes(i) && s.ctlDone).length;
      if (capsNow >= c.sites.length) { this.ctlRoundEnd(0, 'ALL ZONES CAPTURED'); return; }
    } else {
      SND_SITES.forEach((s, i) => { if (c.sites.includes(i)) s.ctlDone = false; }); // defenders' round: zones reset to held
    }
    c.roundT -= dt;
    if (c.roundT <= 0) { this.ctlRoundEnd(1, 'TIME — ZONES HELD'); return; }
    // attrition: attackers (team 0 when side 0... side IS the attacking team index) out of lives
    const atkAlive = actors.some(a => a.alive && a.team === c.side);
    const atkLives = actors.filter(a => a.team === c.side).reduce((s, a) => s + Math.max(0, (a.ctlLives ?? m.lives) - (a.alive ? 0 : 1)), 0);
    if (!atkAlive && atkLives <= 0) { this.ctlRoundEnd(1 - c.side, 'ATTACKERS OUT OF LIVES'); return; }
  }

  // ---------------- [T171] BATTLE ROYALE machine ----------------
  // Offline truth; the room authority mirrors it (mini-services/ironsight-room brUpdate).
  brStart() { // gas machine boot + the ground-loot economy (nav-node scatter: 9 m pass + top-up pass to the quota)
    const br = CFG.MODES.br, ph = br.gas.phases[0];
    this.br = { ph: 0, st: 'wait', t: ph.wait, cx: 0, cz: 0, r: br.gas.r0, tx: 0, tz: 0, tr: ph.r, dps: ph.dps, acc: 0, spectT: null };
    this.brPick();
    const nodes = World.waypoints.map((w, i) => i);
    for (let i = nodes.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = nodes[i]; nodes[i] = nodes[j]; nodes[j] = tmp; }
    let placed = 0; const pts = [];
    for (const ni of nodes) { // pass 1: 9 m spacing
      if (placed >= br.lootN) break;
      const p = World.waypoints[ni].p;
      if (pts.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 9)) continue;
      pts.push(p);
      const roll = Math.random();
      const kind = roll < 0.42 ? 'wpn' : roll < 0.62 ? 'arm' : roll < 0.82 ? 'ammo' : 'hp';
      makeLootPickup(p.x + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 2, kind, kind === 'wpn' ? BR_LOOT[(Math.random() * BR_LOOT.length) | 0] : undefined);
      placed++;
    }
    for (const ni of nodes) { // pass 2: top-up without spacing (clustered nav still fills the quota)
      if (placed >= br.lootN) break;
      const p = World.waypoints[ni].p;
      if (pts.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 2.5)) continue;
      pts.push(p);
      const roll = Math.random();
      const kind = roll < 0.42 ? 'wpn' : roll < 0.62 ? 'arm' : roll < 0.82 ? 'ammo' : 'hp';
      makeLootPickup(p.x + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 2, kind, kind === 'wpn' ? BR_LOOT[(Math.random() * BR_LOOT.length) | 0] : undefined);
      placed++;
    }
    this.hooks.announce('BATTLE ROYALE', br.players + ' COMBATANTS — LAST ALIVE WINS');
  }
  brPick() { // next closure target: center drifts within 0.6·(rCur − rNext) — the circle always stays inside the current one
    const next = CFG.MODES.br.gas.phases[this.br.ph];
    const m = Math.max(0, (this.br.r - next.r) * 0.6);
    const a = Math.random() * Math.PI * 2, d = Math.random() * m;
    this.br.tx = this.br.cx + Math.cos(a) * d; this.br.tz = this.br.cz + Math.sin(a) * d;
    this.br.tr = next.r; this.br.dps = next.dps;
  }
  updateBr(dt) { // wait→shrink phase machine + gas DoT + elimination/spectate law
    const br = this.br;
    if (br.st === 'wait') {
      br.t -= dt;
      if (br.t <= 0) { br.st = 'shrink'; br.t = CFG.MODES.br.gas.phases[br.ph].shrink; br.sr = br.r; br.scx = br.cx; br.scz = br.cz; this.hooks.announce('THE GAS CLOSES', 'ZONE ' + (br.ph + 1) + ' — GET INSIDE'); }
    } else {
      br.t -= dt;
      const dur = CFG.MODES.br.gas.phases[br.ph].shrink;
      const k = 1 - Math.max(0, br.t) / dur;
      br.r = br.sr + (br.tr - br.sr) * k; br.cx = br.scx + (br.tx - br.scx) * k; br.cz = br.scz + (br.tz - br.scz) * k;
      if (br.t <= 0) { br.r = br.tr; br.cx = br.tx; br.cz = br.tz; if (br.ph < CFG.MODES.br.gas.phases.length - 1) { br.ph++; br.st = 'wait'; br.t = CFG.MODES.br.gas.phases[br.ph].wait; this.brPick(); } else br.t = 0; } // final circle holds at the last dps
    }
    updateGasZone(br.cx, br.cz, br.r, br.tx, br.tz, br.tr); // wall + next-ring pose
    World.brZone = { cx: br.cx, cz: br.cz, r: br.r }; // bots.js rotate law reads this
    br.acc += dt;
    if (br.acc >= 0.5) { // gas DoT — 0.5 s tick, flat dps outside the wall (no LoS, no falloff — it's gas)
      const tick = br.acc; br.acc = 0;
      for (const a of this.allActors()) {
        if (!a.alive) continue;
        if (Math.hypot(a.pos.x - br.cx, a.pos.z - br.cz) <= br.r) continue;
        if (a.isPlayer) this.hooks.damagePlayer(br.dps * tick, { name: 'THE GAS', pos: a.pos.clone() }, false, 'GAS');
        else this.hooks.bots.applyDamage(a, br.dps * tick, false, null, 'GAS');
      }
    }
    if (this.state !== 'live') return;
    const pl = this.hooks.player;
    if (!pl.alive) { br.spectT = (br.spectT ?? 5) - dt; if (br.spectT <= 0) this.finish('wiped'); return; } // eliminated → short spectate → resolve
    const alive = this.allActors().filter(a => a.alive).length;
    if (alive <= 1) this.finish('lastalive'); // last-alive law (the player is the 1 — win)
  }
  brDeathDrop(victim) { // [T171] the dead leave loot: ammo 70% + armor 25% (config chances)
    const br = CFG.MODES.br;
    const jx = () => (Math.random() - 0.5) * 1.6;
    if (Math.random() < br.deathDropCr) makeLootPickup(victim.pos.x + jx(), victim.pos.z + jx(), 'ammo');
    if (Math.random() < br.deathDropArm) makeLootPickup(victim.pos.x + jx(), victim.pos.z + jx(), 'arm');
  }

  areaDamage(pos, radius, maxDmg, attacker) {
    const pl = this.hooks.player;
    for (const a of this.allActors()) {
      if (!a.alive) continue;
      const c = a.centerPos ? a.centerPos(new THREE.Vector3()) : a.pos;
      // [T129 item4] "grenade radius needs correcting per documentation" — the docs
      // promise a 4.5 m RADIUS (PARAMETERS.md §frag, FEATURE_MATRIX A23) and the radius
      // must be measured to the BODY, not to the chest center: center-to-center spent
      // ~0.9 m of the budget on the vertical offset to the chest alone, so a floor-level
      // frag delivered ~4.2 m of its advertised 4.5 m, and the edge read as dead. The
      // measure is now the closest point of the body column (feet→stand-height, shrunk
      // by the capsule radius): a body SURFACE at 4.5 m takes exactly 0 — the doc-literal
      // locus. Falloff stays linear 130→0, LoS cover stays 65%. Mirrored VERBATIM in the
      // room authority (mini-services/ironsight-room applyAreaDamage) — the T1-1 parity
      // law; both sides read the SAME CFG.PHYS constants from config.js (P is CFG.PHYS —
      // physics.js:16 — not re-exported).
      const feetY = a.pos ? a.pos.y : c.y - CFG.PHYS.height * 0.5;
      const hd = Math.hypot(c.x - pos.x, c.z - pos.z);
      const topY = feetY + CFG.PHYS.height; // standing body column (crouch margin: slightly generous at the head, exact at the waist — documented approximation, identical both sides)
      const dy = pos.y > topY ? pos.y - topY : (pos.y < feetY ? feetY - pos.y : 0);
      const d = Math.hypot(Math.max(0, hd - CFG.PHYS.playerRadius), dy);
      if (d > radius) continue;
      // LoS: cover blocks 65% [COD class]
      let dmg = maxDmg * (1 - d / radius);
      const blocked = segmentBlocked(pos.clone().setY(0.5), c);
      if (blocked) dmg *= 0.35;
      if (a.isPlayer) this.hooks.damagePlayer(dmg, attacker || { name: 'AIRSTRIKE' }, false, 'AIRSTRIKE');
      else {
        const res = this.hooks.bots.applyDamage(a, dmg, false, attacker && attacker.isPlayer ? attacker : null, 'AIRSTRIKE');
        if (res.died && attacker && attacker.isPlayer) this.hooks.onKill(attacker, a, false, 'AIRSTRIKE');
      }
    }
  }

  grantSupply(owner, pos, def) {
    SFX.pickup(null, 0);
    if (!owner || !owner.isPlayer) return;
    const pl = owner;
    pl.shield = CFG.HEALTH.shieldMax; pl.shieldT = (def && def.shieldTime) || CFG.STREAKS[2].shieldTime;
    this.hooks.refillLoadout();
    this.hooks.banner(0, 'SUPPLY DROP SECURED');
  }

  // ---------------- kills / score ----------------
  registerKill(killer, victim, head, weaponName) {
    // player killer side
    if (killer && killer.isPlayer) {
      killer.kills++; killer.streak++;
      killer.score += CFG.XP.kill + (head ? CFG.XP.headshot : 0);
      this.session.bestStreak = Math.max(this.session.bestStreak, killer.streak);
      this.hooks.banner(CFG.XP.kill + (head ? CFG.XP.headshot : 0), head ? 'HEADSHOT' : 'ELIMINATED');
      if (victim.lastKiller === killer) killer.score += CFG.XP.revenge; // revenge [COD]
      victim.lastKiller = killer;
      // multikill + FOCUS slow-mo [NOVEL C1]
      const now = performance.now() / 1000;
      this.multikills.push(now);
      const multi = this.multikills.length;
      if (multi >= 2 && multi <= 5) {
        this.hooks.announce(CFG.MULTI.strings[Math.min(multi - 2, 3)], '');
        SFX.announceSting(multi - 2);
        this.session.bestMulti = Math.max(this.session.bestMulti, multi);
        if (multi >= CFG.FOCUS.kills && now - (this.lastFocusT ?? -99) > CFG.FOCUS.cooldown) {
          this.focusT = CFG.FOCUS.dur; this.lastFocusT = now;
        }
      }
      if (CFG.STREAK_STRINGS[killer.streak]) this.hooks.announce(CFG.STREAK_STRINGS[killer.streak], `${killer.streak} streak`);
      // scorestreak unlocks [BO2 score-based]
      CFG.STREAKS.forEach((s, di) => { // [T155 R6] unlock check walks the EQUIPPED slots, not def indices
        const si = this.loadout.indexOf(di);
        if (si < 0 || si >= this.streakReady.length) return;
        if (!this.streakReady[si] && killer.score >= s.cost) {
          this.streakReady[si] = true;
          this.hooks.announce('', s.name + ' READY — [' + (si + 5) + ']');
          SFX.pickup(null, 1);
        }
      });
    }
    // victim side
    if (victim.isPlayer) victim.streak = 0;
    this.hooks.killfeed(killer, victim, weaponName, head);
    // v1.55 T89 respawn laws: gf dead sit out the round (snd parity); inf converts survivors
    // (COD Infected law — the dead join the horde, no survivor respawn); ctl respawns ONLY
    // while lives remain (attrition law — 0 lives = sit out the round, attackers bleed out)
    const noRespawn = this.mode === 'snd' || this.mode === 'gf' || this.mode === 'br'; // [T171] BR: one life — no respawn queue
    const outOfLives = this.mode === 'ctl' && ((victim.ctlLives ?? CFG.MODES.ctl.lives) - 1) <= 0;
    if (!noRespawn && !outOfLives) this.respawnQueue.push({ actor: victim, t: CFG.HEALTH.respawnDelay });
    if (this.mode === 'br' && victim.pos) this.brDeathDrop(victim); // [T171] the dead leave loot
    if (this.mode === 'inf' && this.inf && this.inf.started) this.infConvert(victim); // L2: conversion (after any queue push — converted respawn on the horde side)
    if (this.mode === 'ctl' && victim.ctlLives != null) victim.ctlLives--; // L3 attrition law: every death burns a life (the only decrement site)
    // T1-1 kill hooks (SS22): kc tag drop + gg ladder advance
    if (this.mode === 'kc' && victim.team !== undefined) {
      const mk = CFG.MODES.kc;
      this.kcTags.push({ x: victim.pos.x, z: victim.pos.z, team: victim.team, t: mk.tagTtl, killer: killer && killer.isPlayer !== undefined ? killer : null });
      while (this.kcTags.length > mk.tagCap) this.kcTags.shift(); // wire/visual cap (SS22.2)
    }
    if (this.mode === 'gg' && killer && (killer.isPlayer || killer.kills !== undefined)) {
      const t = (killer.ggTier || 0) + 1; // deaths do NOT reset tier [e_14 Arms Race]
      killer.ggTier = t;
      const LN = GG_LADDER.length; // 12 ladder weapons; t=13 = melee finisher; t=14 = winning kill
      if (t <= LN) {
        const wid = GG_LADDER[t - 1];
        if (killer.isPlayer) { this.hooks.weapons.equipWeapon(wid, true); this.hooks.announce('', 'TIER ' + t + '/' + (LN + 1) + ' — ' + wid.toUpperCase()); }
        else if (this.hooks.bots.setBotWeapon) this.hooks.bots.setBotWeapon(killer, wid);
      } else if (t === LN + 1) {
        if (killer.isPlayer) { this.hooks.weapons.equipWeapon('melee', true); this.hooks.announce('KNIFE FINISHER', 'final kill wins'); }
        else if (this.hooks.bots.setBotWeapon) this.hooks.bots.setBotWeapon(killer, 'melee');
      } else {
        this.ggWinner = killer; // kill AT the melee tier = win [e_14 gold-kill structure]
      }
    }
    // team tally (single source of truth — TDM)
    if (this.mode === 'tdm') {
      const killerTeam = killer ? (killer.isPlayer ? this.hooks.player.team : killer.team) : 1 - this.hooks.player.team;
      if (killerTeam === this.hooks.player.team) this.teamKills[0]++; else this.teamKills[1]++;
    }
    // [T139] CUTTHROAT tally — the killer's OWN team slot scores (3-way); a suicide (killer null)
    // credits NOBODY (the honest 3-team law — the TDM enemy-credit fallback is a 2-team shape)
    if (this.mode === 'ct') {
      const kt = killer ? (killer.isPlayer ? this.hooks.player.team : killer.team) : -1;
      if (kt >= 0 && kt <= 2) this.teamKills[kt]++;
    }
    // bot killer stats
    if (killer && !killer.isPlayer && killer.kills !== undefined) { killer.kills++; killer.score += CFG.XP.kill; }
    this.hooks.killfeed(killer, victim, weaponName, head);
  }

  useStreak(i) {
    if (this.mode === 'gg') return; // SS22.4: no scorestreaks in gun game [SPEC DECISION]
    if (!this.streakReady[i] || this.state !== 'live') return;
    this.streakReady[i] = false;
    const def = CFG.STREAKS[(this.loadout && this.loadout[i] != null) ? this.loadout[i] : i] || CFG.STREAKS[i]; // [T155 R6] slot→def (10 defs, 3 slots)
    const pl = this.hooks.player;
    if (def.fx === 'uav') { this.uavT = def.dur; this.hooks.announce('UAV ONLINE', 'enemy positions revealed'); SFX.pickup(null, 0); }
    if (def.fx === 'ammo') { this.hooks.refillLoadout(); this.hooks.announce('AMMO DROP', 'resupplied'); SFX.pickup(null, 0); } // the resupply-kit law, score-earned
    if (def.fx === 'stim') { pl.healRate = def.heal / def.healTime; pl.healT = def.healTime; this.hooks.announce('STIM RIG', 'healing'); SFX.pickup(null, 0); } // the stim-kit law, score-earned
    if (def.fx === 'armor') { pl.shield = Math.min(CFG.HEALTH.shieldMax, pl.shield + def.shield); pl.shieldT = def.shieldTime; this.hooks.announce('ARMOR DROP', 'plates up'); SFX.pickup(null, 1); } // the aegis-kit law, score-earned
    if (def.fx === 'jugg') { // [T161 R6] the AI-UNIT class: the JUGGERNAUT SUIT — aegis-family shield + the damage-taken cut (pl.juggT read by the receive path) + the walk-speed law (pl.juggSpeed read by the move path); score-earned, the MW grammar (slow, armored, deadly)
      pl.shield = Math.min(CFG.HEALTH.shieldMax, pl.shield + def.shield); pl.shieldT = def.shieldTime;
      pl.juggT = def.shieldTime; pl.juggCut = 1 - def.cut; pl.juggSpeed = def.speed;
      this.hooks.announce('JUGGERNAUT', 'suit online'); SFX.pickup(null, 1);
    }
    if (def.fx === 'strike' || def.fx === 'napalm') {
      const cam = this.hooks.camera();
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const target = new THREE.Vector3();
      const o = pl.eyePos(new THREE.Vector3());
      const hit = rayAABB(o, dir, 120);
      target.copy(o).addScaledVector(dir, hit ? hit.t : 40); target.y = 0;
      for (let wv = 0; wv < (def.waves || 1); wv++) { // [T155 R6] waves: staggered bomb volleys (ARTILLERY ×3, SWARM ×2)
        this.airstrikes.push({ t: def.delay + wv * 1.4, target: target.clone(), dir: new THREE.Vector3(Math.cos(Math.random() * Math.PI), 0, Math.sin(Math.random() * Math.PI)), owner: pl, def });
      }
      this.hooks.announce(def.name + ' INBOUND', 'take cover');
      SFX.announceSting(1);
    }
    if (def.fx === 'supply') {
      const cam = this.hooks.camera();
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); dir.y = 0; dir.normalize();
      const pos = pl.pos.clone().addScaledVector(dir, 7);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x3a4048, emissive: 0x29d3ff, emissiveIntensity: 0.25 }));
      mesh.position.set(pos.x, 26, pos.z); mesh.castShadow = true;
      this.hooks.scene().add(mesh);
      this.supplyCrates.push({ mesh, owner: pl, def });
      this.hooks.announce(def.name, 'inbound');
    }
  }

  useAbility() {
    if (this.state !== 'live') return;
    const pl = this.hooks.player;
    if (this.abilityCd > 0 || this.abilityCharges <= 0) return;
    this.abilityCharges--;
    if (this.abilityCd <= 0) this.abilityCd = this.ability.cd;
    const ab = this.ability;
    if (ab.id === 'dash') {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.hooks.camera().quaternion); dir.y = 0; dir.normalize();
      pl.vel.x += dir.x * 15; pl.vel.z += dir.z * 15; pl.vel.y = Math.max(pl.vel.y, 1.5);
      SFX.swing();
    } else if (ab.id === 'stim') {
      pl.healRate = ab.heal / ab.healTime; pl.healT = ab.healTime; pl.stimT = ab.speedTime;
      SFX.pickup(null, 0);
    } else if (ab.id === 'pulse') {
      let found = 0;
      for (const b of this.hooks.bots.bots) {
        if (b.alive && b.team !== pl.team && b.pos.distanceTo(pl.pos) < ab.radius) { b.spottedT = 0; found++; }
      }
      SFX.pickup(null, found ? 1 : 0);
      this.hooks.announce('', found ? `RECON — ${found} CONTACT${found > 1 ? 'S' : ''}` : 'RECON — CLEAR');
    }
    // [T108 N8] the 5 operator kits — each rides an existing law (config.js ABILITIES comment)
    else if (ab.id === 'aegis') { // the streak overshield idiom (line 602) with the kit's own params
      pl.shield = Math.min(CFG.HEALTH.shieldMax, pl.shield + ab.shield); pl.shieldT = ab.shieldTime;
      SFX.pickup(null, 1);
    } else if (ab.id === 'resupply') { // the main.js refillLoadout hook verbatim (full mag+reserve+nades)
      this.hooks.refillLoadout();
      SFX.pickup(null, 1);
      this.hooks.announce('', 'RESUPPLY — KIT RESTOCKED');
    } else if (ab.id === 'ghost') { // the bots.js spot law gate: player.ghostT blocks the b.spottedT=0 reset
      pl.ghostT = ab.dur;
      SFX.pickup(null, 0);
      this.hooks.announce('', 'GHOST — UNTRACKED');
    } else if (ab.id === 'surge') { // the followPath speedMult consumption law (bots-only, modes.js:465 note)
      let hit = 0;
      for (const b of this.hooks.bots.bots) {
        if (b.alive && b.team !== pl.team && b.pos.distanceTo(pl.pos) < ab.radius) { b.slowT = ab.slowTime; b.slowMult = ab.slowMult; hit++; }
      }
      SFX.pickup(null, hit ? 1 : 0);
      this.hooks.announce('', hit ? `SURGE — ${hit} SLOWED` : 'SURGE — CLEAR');
    } else if (ab.id === 'rally') { // the stim healRate idiom (self) + ally bots heal (b.hp)
      pl.healRate = ab.heal / 2; pl.healT = 2;
      let healed = 0;
      for (const b of this.hooks.bots.bots) {
        if (b.alive && b.team === pl.team && !b.isPlayer && b.pos.distanceTo(pl.pos) < ab.radius) { b.hp = Math.min(100, b.hp + ab.heal); healed++; }
      }
      SFX.pickup(null, 1);
      this.hooks.announce('', healed ? `RALLY — ${healed} HEALED` : 'RALLY — HEALED');
    }
  }

  finish(reason) {
    this.state = 'ended';
    for (const h of World.hills) { h.ring.visible = false; h.disc.visible = false; } // SS22: hide objective meshes on end
    for (const s of World.sndSites) s.ring.visible = false;
    hideGasZone(); World.brZone = null; // [T171] gas meshes down on every end (safe no-op off-br)
    const pl = this.hooks.player;
    let win = false, draw = false;
    if (this.mode === 'ffa') {
      const sorted = [...this.allActors()].sort((a, b) => b.kills - a.kills);
      win = sorted[0] === pl; draw = sorted[0].kills === sorted[1]?.kills;
    } else if (this.mode === 'tdm') {
      win = this.teamKills[0] > this.teamKills[1]; draw = this.teamKills[0] === this.teamKills[1];
    } else if (this.mode === 'ct') { // [T139] CUTTHROAT — top-of-three wins; draw = a SHARED top (the 2-team tie law generalized)
      const t = this.teamKills, top = Math.max(t[0], t[1], t[2]);
      const leaders = [t[0], t[1], t[2]].map((v, i) => [v, i]).filter((x) => x[0] === top);
      win = leaders.some((x) => x[1] === pl.team); draw = leaders.length > 1;
    } else if (this.mode === 'dom') {
      win = this.domScore[0] > this.domScore[1]; draw = this.domScore[0] === this.domScore[1];
    }
    // T1-1 finish (SS22)
    else if (this.mode === 'hp') {
      win = this.objS[0] > this.objS[1]; draw = this.objS[0] === this.objS[1];
    } else if (this.mode === 'kc') {
      win = this.objS[0] > this.objS[1]; draw = this.objS[0] === this.objS[1];
    } else if (this.mode === 'snd') {
      win = this.objS[0] > this.objS[1]; draw = this.objS[0] === this.objS[1];
    } else if (this.mode === 'gg') {
      win = this.ggWinner === pl; draw = false;
    } else if (this.mode === 'gf' || this.mode === 'ctl') { // T89 L1/L3: round-scored modes
      win = this.objS[0] > this.objS[1]; draw = this.objS[0] === this.objS[1];
    } else if (this.mode === 'inf') { // T89 L2: survivors win the clock; horde wins the conversion
      win = pl.team !== 1; draw = false;
    } else if (this.mode === 'br') { // [T171] LAST-ALIVE law: survived to the resolve = win (lastalive, or time expiry while alive); wiped = loss
      win = pl.alive; draw = false;
    } else win = true;
    SFX.victoryJingle(win && !draw);
    pl.score += win && this.mode !== 'practice' ? CFG.XP.win : (this.mode !== 'practice' ? CFG.XP.loss : 0);
    this.hooks.endMatch({ mode: this.mode, win, draw, reason });
  }

  // practice controls
  practiceAdd() { if (this.mode !== 'practice') return; this.practice.count++; this.hooks.bots.spawn(this.practice.count, 0, this.hooks.difficulty(), 'practice'); }
  practiceRemove() { if (this.mode !== 'practice' || this.practice.count <= 1) return; this.practice.count--; this.hooks.bots.spawn(this.practice.count, 0, this.hooks.difficulty(), 'practice'); }
  practiceDiff() { if (this.mode !== 'practice') return; this.hooks.cycleDifficulty(); this.hooks.bots.spawn(this.practice.count, 0, this.hooks.difficulty(), 'practice'); }
  practiceStrafe() { if (this.mode !== 'practice') return; this.practice.strafe = !this.practice.strafe; }
  practiceReset() { if (this.mode !== 'practice') return; this.practice.shots = 0; this.practice.hits = 0; this.practice.dmgWindow = []; }
  trackShot() { if (this.mode === 'practice') this.practice.shots++; }
  trackHit(dmg) {
    if (this.mode !== 'practice') return;
    this.practice.hits++;
    const now = performance.now() / 1000;
    this.practice.dmgWindow.push({ t: now, dmg });
    this.practice.dmgWindow = this.practice.dmgWindow.filter(e => now - e.t < 2.0);
  }
  dps() {
    if (this.mode !== 'practice') return 0;
    const now = performance.now() / 1000;
    const w = this.practice.dmgWindow.filter(e => now - e.t < 2.0);
    return w.length ? Math.round(w.reduce((s, e) => s + e.dmg, 0) / 2) : 0;
  }
}
