// ============================================================
// IRONSIGHT — effects.js : pooled FX (tracers, particles, decals,
// explosions, shake, damage numbers) — zero-allocation per frame
// ============================================================
import * as THREE from 'three';
import { CFG, DESTRUCT } from './config.js';
import { padRumble } from './gamepad.js';

export const FX = {
  tracers: [], particles: null, decals: [], shakeAmp: 0, focusT: 0,
  dmgPool: [], flashLights: [], flashSprites: [],
  scene: null, cam: null, q: null,
  _pi: 0, _di: 0, _ti: 0, _fi: 0,
};

const MAXP = 420;
let pGeo, pPts, pVel, pLife, pPos, pCol;

export function setQuality(q) { FX.q = q; }

export function initEffects(scene, camera, quality) {
  FX.scene = scene; FX.cam = camera; FX.q = quality;
  // tracers
  for (let i = 0; i < 64; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const m = new THREE.LineBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const l = new THREE.Line(g, m); l.frustumCulled = false; l.visible = false;
    scene.add(l); FX.tracers.push({ line: l, t: 0, dur: 0.09 });
  }
  // particles
  pPos = new Float32Array(MAXP * 3); pCol = new Float32Array(MAXP * 3);
  pVel = new Float32Array(MAXP * 3); pLife = new Float32Array(MAXP);
  pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pPts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  pPts.frustumCulled = false; scene.add(pPts);
  // decals
  const dGeo = new THREE.PlaneGeometry(0.12, 0.12);
  for (let i = 0; i < quality.decals; i++) {
    const m = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.visible = false; scene.add(m); FX.decals.push(m);
  }
  // muzzle lights
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xffb46a, 0, 9, 2); scene.add(l); FX.flashLights.push(l);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(0.5, 0.5, 0.5); scene.add(s); FX.flashSprites.push(s);
  }
  // damage number DOM pool
  const layer = document.getElementById('dmg-numbers');
  for (let i = 0; i < 26; i++) {
    const el = document.createElement('div'); el.className = 'dmg-num'; el.style.opacity = '0';
    layer.appendChild(el);
    FX.dmgPool.push({ el, live: false, t: 0, wp: new THREE.Vector3(), val: 0, tgt: -1 });
  }
}
function flashTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.4, 'rgba(255,180,90,0.7)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export function tracer(from, to, color = 0xffd28a) {
  const t = FX.tracers[FX._ti++ % FX.tracers.length];
  const pos = t.line.geometry.attributes.position.array;
  pos[0] = from.x; pos[1] = from.y; pos[2] = from.z;
  pos[3] = to.x; pos[4] = to.y; pos[5] = to.z;
  t.line.geometry.attributes.position.needsUpdate = true;
  t.line.material.color.set(color); t.line.material.opacity = 0.85;
  t.line.visible = true; t.t = 0;
}
export function impact(p, n, metal = false) {
  // sparks
  const n2 = Math.round(7 * FX.q.particles);
  for (let i = 0; i < n2; i++) spawnParticle(p, n, metal ? 0xffd9a0 : 0xffb066, 3.2);
  for (let i = 0; i < 3; i++) spawnParticle(p, n, 0x8a8f98, 1.4); // dust
  // decal
  const d = FX.decals[FX._di++ % FX.decals.length];
  d.visible = true;
  d.position.copy(p).addScaledVector(n, 0.012);
  d.lookAt(p.x + n.x, p.y + n.y, p.z + n.z);
  d.rotation.z = Math.random() * Math.PI;
  d.material.opacity = 0.85;
  SFXImpact(p, metal);
}
function SFXImpact(p, metal) { import('./audio.js').then(m => m.impact(p, metal)); }
function spawnParticle(p, n, color, spd) {
  const i = FX._pi++ % MAXP;
  pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
  pVel[i * 3] = n.x * spd * 0.4 + (Math.random() - 0.5) * spd;
  pVel[i * 3 + 1] = n.y * spd * 0.4 + Math.random() * spd * 0.8;
  pVel[i * 3 + 2] = n.z * spd * 0.4 + (Math.random() - 0.5) * spd;
  pLife[i] = 0.35 + Math.random() * 0.3;
  const c = new THREE.Color(color);
  pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
}
export function blood(p, dir) {
  const n2 = Math.round(9 * FX.q.particles);
  for (let i = 0; i < n2; i++) spawnParticle(p, dir, 0xd0202a, 2.6);
}
// §54.6 U7: destructible debris burst (stage-swap destroy) — pooled particles,
// quality-gated; DESTRUCT.DEBRIS_N/DEBRIS_SPD law (config §54.6).
export function debris(p, color = 0x9a7b52) {
  const n2 = Math.round(DESTRUCT.DEBRIS_N * FX.q.particles);
  for (let i = 0; i < n2; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
    spawnParticle(p, dir, Math.random() < 0.65 ? color : 0x8a8f98, DESTRUCT.DEBRIS_SPD);
  }
}
// T2-5 Phase 3 (Task 55, spec §39.3): cosmetics trail wake — ONE low-energy particle,
// quality-gated (FX.q.particles). Callers: local player feet (speed > 9 m/s movement-tech
// band) + remote capsule bases (roster ct). Reuses the pooled system — zero new render infra.
export function trailPuff(p, color) {
  if (Math.random() > FX.q.particles) return;
  spawnParticle(p, { x: 0, y: 0.6, z: 0 }, color, 0.55);
}
export function muzzle(pos, big = false) {
  const i = FX._fi++ % 3;
  const l = FX.flashLights[i], s = FX.flashSprites[i];
  l.position.copy(pos); l.intensity = (big ? 26 : 14) * IR_A11Y.flashCap; // [T161 R13] the strobe cap
  s.position.copy(pos); s.material.opacity = 0.9 * IR_A11Y.flashCap; s.material.rotation = Math.random() * Math.PI;
  s.scale.setScalar(big ? 0.85 : 0.55);
}
export function explosion(p, radius) {
  const n2 = Math.round(26 * FX.q.particles);
  for (let i = 0; i < n2; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.7, Math.random() - 0.5).normalize();
    spawnParticle(p, dir, Math.random() < 0.5 ? 0xffb066 : 0x777777, 7);
  }
  const light = FX.flashLights[FX._fi++ % 3];
  light.position.copy(p); light.intensity = 60 * IR_A11Y.flashCap; light.distance = radius * 3.2; // [T161 R13] the strobe cap
  SFXExplosion(p);
  padRumble('boom', 1); // fixed magnitude v1 (no proximity scaling — call sites have no player ref)
}
function SFXExplosion(p) { import('./audio.js').then(m => m.explosion(p)); }
export function shake(amt) { FX.shakeAmp = Math.min(0.09, FX.shakeAmp + amt * (IR_A11Y.reduced ? 0.2 : 1)); }
// [T161 R13/R15] THE A11Y CAPS — single module state, set from main.js applySettings (the
// fan-out law): reduced = the prefers-reduced-motion analog (screen shake ×0.2, the HUD
// gsap pulses gated at the hud.js call site); flashCap = the photosensitivity strobe
// ceiling (multiplier on every flash light/sprite intensity — the explosion/muzzle strobe
// surface; 1.0 = shipped behavior byte-identical).
export const IR_A11Y = { reduced: false, flashCap: 1 };
export function setA11y(reduced, flashCap) { IR_A11Y.reduced = !!reduced; IR_A11Y.flashCap = Math.max(0, Math.min(1, flashCap == null ? 1 : flashCap)); }

// ---------- damage numbers (Apex-style cumulative stack) ----------
export function dmgNumber(worldPos, val, { crit = false, kill = false, target = -1 } = {}) {
  if (!FX.q) return;
  let slot = FX.dmgPool.find(d => d.live && d.tgt === target && d.t < 0.45);
  if (!slot) slot = FX.dmgPool.reduce((a, b) => (!a.live ? b : (!b.live ? b : (b.t > a.t ? b : a))));
  if (!slot) return;
  slot.live = true; slot.t = 0; slot.tgt = target;
  slot.val += val;
  slot.wp.copy(worldPos); slot.wp.x += (Math.random() - 0.5) * 0.25;
  slot.el.textContent = Math.round(slot.val);
  slot.el.className = 'dmg-num' + (crit ? ' crit' : '') + (kill ? ' kill' : '');
}
const _v = new THREE.Vector3();
export function updateFX(dt, camera) {
  // tracers
  for (const t of FX.tracers) {
    if (!t.line.visible) continue;
    t.t += dt;
    t.line.material.opacity = Math.max(0, 0.85 * (1 - t.t / t.dur));
    if (t.t >= t.dur) t.line.visible = false;
  }
  // particles
  let any = false;
  for (let i = 0; i < MAXP; i++) {
    if (pLife[i] <= 0) { if (pPos[i * 3 + 1] !== -999) { pPos[i * 3 + 1] = -999; any = true; } continue; }
    any = true;
    pLife[i] -= dt;
    pVel[i * 3 + 1] -= 9.8 * dt;
    pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    if (pPos[i * 3 + 1] < 0.02) { pPos[i * 3 + 1] = 0.02; pVel[i * 3 + 1] *= -0.35; pVel[i * 3] *= 0.7; pVel[i * 3 + 2] *= 0.7; }
  }
  if (any) { pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; }
  // flash lights
  for (const l of FX.flashLights) l.intensity = Math.max(0, l.intensity - dt * 220);
  for (const s of FX.flashSprites) s.material.opacity = Math.max(0, s.material.opacity - dt * 9);
  // decals fade (oldest ring)
  for (const d of FX.decals) if (d.visible) d.material.opacity = Math.max(0.4, d.material.opacity - dt * 0.01);
  // shake decay
  FX.shakeAmp = Math.max(0, FX.shakeAmp - dt * 0.35);
  // damage numbers projection
  const w = innerWidth, h = innerHeight;
  for (const d of FX.dmgPool) {
    if (!d.live) continue;
    d.t += dt;
    if (d.t > 0.9) { d.live = false; d.el.style.opacity = '0'; d.val = 0; d.tgt = -1; continue; }
    _v.copy(d.wp); _v.y += d.t * 0.9; _v.project(camera);
    if (_v.z > 1) { d.el.style.opacity = '0'; continue; }
    d.el.style.left = ((_v.x * 0.5 + 0.5) * w) + 'px';
    d.el.style.top = ((-_v.y * 0.5 + 0.5) * h) + 'px';
    d.el.style.opacity = String(Math.min(1, (0.9 - d.t) * 2.2));
  }
}
