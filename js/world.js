// ============================================================
// IRONSIGHT — world.js : data-driven arena builder (T1-2).
// Layout data lives in maps/<id>.json (schema: docs/MAPS.md,
// registry/loader/rotation in js/maps.js). This file keeps ALL
// geometry/collision/LoS/minimap CODE; OUTPOST's data was
// extracted 1:1 from the previous hardcoded builders (fidelity
// gate: derived collider list == frozen MP-1 server dump).
// Exports World + buildWorld/setMap + ray/segment math used by
// player, bots, weapons, main.
// ============================================================
import * as THREE from 'three';
import { CFG, DESTRUCT } from './config.js';
import { Maps } from './maps.js';
import { debris } from './effects.js'; // §54.4: NAMED import — FX is the STATE bag, not the fn namespace (Task 35 defect #8 class)

export const World = {
  colliders: [],      // {min:THREE.Vector3, max:THREE.Vector3, metal}
  meshes: [],
  waypoints: [],      // {p:Vector3, e:[i]}
  flags: [],          // {id:'A', pos, owner:-1, prog:0, ring, pole, cloth}
  hills: [],          // T1-1 HP hills {id, pos, owner, prog, ring, disc} — active hill visible only
  sndSites: [],       // T1-1 SnD bomb sites {id, pos, ring} — visible in snd only
  pickups: [],        // {kind:'hp'|'ammo', pos, active, mesh, t}
  jumpPads: [],       // {pos, r}
  spawnsFFA: [], spawnsA: [], spawnsB: [],
  group: null,
  mapCanvas: null,    // minimap prerender
  data: null,         // active map JSON (probe hook: window.__IR.world.data)
};

const C = CFG.COLORS;
let mats = {};

// Boot build — signature unchanged from the pre-pipeline build; first boot is
// always OUTPOST (Maps.currentId default), so map-not-rotated behavior is stable.
export function buildWorld(scene) {
  return setMap(scene, Maps.currentId || 'outpost');
}

// Switch the live world to another roster map (fetch via Maps, then dispose+rebuild).
export async function setMap(scene, id) {
  const data = await Maps.load(id);
  const prevSun = World.sun;
  disposeWorld(scene);
  Maps.setCurrent(data.id || id);
  buildFrom(scene, data);
  // Quality settings (applySettings) own the sun's shadow config — carry it across
  // rebuilds so a mid-session map switch doesn't silently drop shadows.
  if (prevSun && World.sun) {
    World.sun.castShadow = prevSun.castShadow;
    if (prevSun.shadow.mapSize.x !== World.sun.shadow.mapSize.x) {
      World.sun.shadow.mapSize.set(prevSun.shadow.mapSize.x, prevSun.shadow.mapSize.y);
      if (prevSun.shadow.map) { prevSun.shadow.map.dispose(); prevSun.shadow.map = null; }
    }
  }
  return World;
}

function disposeWorld(scene) {
  if (World._sceneBits) {
    for (const o of World._sceneBits) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { o.material.dispose?.(); if (o.material.map) o.material.map.dispose(); }
      scene.remove(o);
    }
    World._sceneBits = null;
  }
  if (World.group) {
    World.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const mm of list) { if (mm.map) mm.map.dispose(); mm.dispose(); }
      }
    });
    scene.remove(World.group);
  }
  World.colliders = []; World.meshes = []; World.waypoints = [];
  World.destructibles = []; // §54.2 U7: [{id, col, mesh, hp, maxHp, stage, color, center}]
  World.flags = []; World.hills = []; World.sndSites = [];
  World.pickups = []; World.jumpPads = [];
  World.ladders = []; World.water = []; World.props = []; // [T130] the verticality/water/props registries (physics reads the first two)
  World.waterMats = []; // [T130] animated water uniforms (main loop advances them)
  World.spawnsFFA = []; World.spawnsA = []; World.spawnsB = [];
  World.mapCanvas = null; World.sun = null; World.group = null; World.data = null;
}

function buildFrom(scene, data) {
  World.data = data;
  World.group = new THREE.Group();
  scene.add(World.group);
  const bits = [];
  makeMats();
  bits.push(...makeSky(scene, data.sky));
  bits.push(...makeLights(scene, data.light, data.lamps)); // T1-2 fix (lead probe P8): lamps live top-level in map JSON (docs/MAPS.md), not inside light
  World._sceneBits = bits;
  makeFloor(data);
  makePerimeter(data);
  buildBlocks(data.blocks);
  buildDestructibles(data.destructibles); // §54.1 U7: optional authored props (absent → no-op)
  makeJumpPads(data.jumpPads);
  buildLadders(data.ladders); // [T130] the climb volumes + the visual ladders
  buildWater(data.water);     // [T130] swim/wade zones + the animated surface
  buildProps(data.props);     // [T130] trees/rocks/grass — the multi-terrain dressing
  makeFlags(data.flags);
  makeHills(data.hills, data.sites);
  makePickups(data.pickups);
  makeSpawns(data);
  buildWaypoints(data.nav);
  prerenderMinimap(data.map);
  return World;
}

function makeMats() {
  const std = (c, r = 0.9, m = 0.05) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  mats = {
    floor: floorMat(),
    wall: std(C.concrete, 0.95), wall2: std(0x757b85, 0.95), dark: std(C.dark, 0.9),
    crate: std(C.crate, 0.85), metal: std(C.metal, 0.55, 0.5), accent: std(C.accentA, 0.5, 0.2),
    accentB: std(C.accentB, 0.5, 0.2), pad: new THREE.MeshStandardMaterial({ color: 0x113244, emissive: C.accentB, emissiveIntensity: 0.9 }),
  };
}
function floorMat() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#2e333b'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 3;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
  for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...(World.data?.floor?.repeat || [22, 16])); // map data read here (makeMats runs after World.data is set)
  return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.96 });
}

function addBox(cx, y0, cz, w, h, d, mat, opts = {}) {
  const { collide = true, shadow = 2, metal = false, group = World.group } = opts; // shadow: 0 none,1 receive,2 cast+receive
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(cx, y0 + h / 2, cz);
  m.receiveShadow = shadow >= 1; m.castShadow = shadow >= 2;
  group.add(m); World.meshes.push(m);
  if (collide) World.colliders.push({
    min: new THREE.Vector3(cx - w / 2, y0, cz - d / 2),
    max: new THREE.Vector3(cx + w / 2, y0 + h, cz + d / 2), metal,
  });
  return m;
}
const strip = (cx, y, cz, w, d, mat) => addBox(cx, y, cz, w, 0.06, d, mat, { collide: false, shadow: 0 }); // emissive trim

function makeSky(scene, sky) {
  const geo = new THREE.SphereGeometry(400, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(sky.top) }, mid: { value: new THREE.Color(sky.mid) }, bot: { value: new THREE.Color(sky.bot) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){ float h = normalize(vP).y;
        vec3 c = h > 0.0 ? mix(mid, top, pow(min(h*1.6,1.0),0.7)) : mix(mid, bot, min(-h*2.4,1.0));
        gl_FragColor = vec4(c,1.0); }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
  // stars
  const sg = new THREE.BufferGeometry(); const pts = [];
  for (let i = 0; i < 300; i++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.12, r = 380;
    pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: sky.star, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.7 }));
  scene.add(stars);
  return [dome, stars];
}

function makeLights(scene, L, lamps = null) {
  const hemi = new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(L.sunC, L.sunI);
  sun.position.set(...L.sunPos);
  sun.shadow.camera.left = L.shadow.l; sun.shadow.camera.right = L.shadow.r;
  sun.shadow.camera.top = L.shadow.t; sun.shadow.camera.bottom = L.shadow.b;
  sun.shadow.camera.far = L.shadow.far; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  World.sun = sun;
  scene.fog = new THREE.Fog(L.fogC, L.fogNear, L.fogFar);
  const bits = [hemi, sun, sun.target];
  for (const [x, z] of (lamps || L.lamps || [])) {
    addBox(x, 0, z, 0.3, 5.2, 0.3, mats.metal);
    addBox(x, 5.2, z, 0.9, 0.22, 0.9, new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0xffd9a0, emissiveIntensity: 1.4 }), { collide: false, shadow: 0 });
    const pl = new THREE.PointLight(0xffc98a, 12, 16, 2); pl.position.set(x, 5.2, z); scene.add(pl);
    bits.push(pl);
  }
  return bits;
}

function makeFloor(data) {
  const W = data.map;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W.halfW * 2 + 4, W.halfD * 2 + 4), mats.floor);
  f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
  World.group.add(f); World.meshes.push(f);
  World.colliders.push({ min: new THREE.Vector3(-W.halfW - 4, -1, -W.halfD - 4), max: new THREE.Vector3(W.halfW + 4, 0, W.halfD + 4) });
}

function makePerimeter(data) {
  const W = data.map, h = data.perimeter.h;
  addBox(0, 0, -W.halfD - 0.5, W.halfW * 2 + 2, h, 1, mats.wall2);
  addBox(0, 0, W.halfD + 0.5, W.halfW * 2 + 2, h, 1, mats.wall2);
  addBox(-W.halfW - 0.5, 0, 0, 1, h, W.halfD * 2 + 2, mats.wall2);
  addBox(W.halfW + 0.5, 0, 0, 1, h, W.halfD * 2 + 2, mats.wall2);
  strip(0, data.perimeter.trimY, -W.halfD - 0.02, W.halfW * 2, 0.06, mats.accent);
}

// Authored static geometry (hub/tower/warehouse/containers/garage/cover for OUTPOST —
// now plain data; see maps/outpost.json "blocks" + docs/MAPS.md §1).
function buildBlocks(blocks) {
  for (const b of blocks) {
    addBox(b.p[0], b.p[1], b.p[2], b.s[0], b.s[1], b.s[2], mats[b.m] || mats.wall,
      { collide: b.col !== 0, shadow: b.sh ?? 2 });
  }
}

// ---------- §54 U7 DESTRUCTIBLES (server-authoritative stage-swap AABB props) ----------
// Data law §54.1: authored optional `destructibles` [{id,p,s,m,hp}] — p/s semantics
// identical to blocks (addBox), so the derived collider matches the server's box
// formula byte-for-byte. Maps WITHOUT the key never reach here (byte-identical
// behavior; MP-1 collider gate untouched).
function buildDestructibles(list) {
  for (const d of list || []) {
    if (!d || !Array.isArray(d.p) || !Array.isArray(d.s) || !Number.isFinite(+d.hp)) continue;
    const mat = mats[d.m] || mats.crate;
    const mesh = addBox(d.p[0], d.p[1], d.p[2], d.s[0], d.s[1], d.s[2], mat, {});
    const col = World.colliders[World.colliders.length - 1]; // addBox pushed ours last
    col.destId = d.id; // §54.3: rayAABB returns the box REFERENCE — hit routing is free
    World.destructibles.push({
      id: d.id, col, mesh, hp: +d.hp, maxHp: +d.hp, stage: 0,
      color: mat.color ? mat.color.getHex() : 0x9a7b52,
      center: new THREE.Vector3(d.p[0], d.p[1] + d.s[1] / 2, d.p[2]),
    });
  }
}
function stageOf(hp, maxHp) { return hp <= 0 ? 2 : (hp / maxHp <= DESTRUCT.STAGE_FRAC ? 1 : 0); }
function damageTint(rec) { // stage-1 damaged tint — material CLONE (shared mats never mutated)
  rec.mesh.material = rec.mesh.material.clone();
  rec.mesh.material.color.multiplyScalar(0.62);
}
function destroyDestRec(rec) { // §54.4 stage 2: collider splice + mesh removal + debris/crumble
  const ci = World.colliders.indexOf(rec.col);
  if (ci >= 0) World.colliders.splice(ci, 1);
  if (rec.mesh && rec.mesh.parent) rec.mesh.parent.remove(rec.mesh);
  debris(rec.center, rec.color);
  import('./audio.js').then(m => m.crumble(rec.center)); // distance-gated (DESTRUCT.CRUMBLE_MAX_D)
}
export function applyDestDamage(id, dmg) { // §54.4 OFFLINE sim (bots included via shared hitscan)
  const rec = World.destructibles.find(r => r.id === id);
  if (!rec || rec.stage >= 2) return null;
  rec.hp = Math.max(0, rec.hp - dmg);
  const st = stageOf(rec.hp, rec.maxHp);
  if (st !== rec.stage) {
    if (st === 1) damageTint(rec);
    else destroyDestRec(rec);
    rec.stage = st;
  }
  return { id, hp: rec.hp, st };
}
export function applyDestNet(d) { // §54.5 MP truth — server owns hp/stage/destroy
  if (!d || typeof d.id !== 'string') return;
  const rec = World.destructibles.find(r => r.id === d.id);
  if (!rec || rec.stage >= 2) return;
  rec.hp = d.hp;
  const st = Math.max(0, Math.min(2, d.st | 0));
  if (st !== rec.stage) {
    if (st === 1) damageTint(rec);
    else destroyDestRec(rec); // FX for ALL viewers — server truth outranks local prediction
    rec.stage = st;
  }
}

// ---------------- [T130] the verticality/water/props builders ----------------
// Schema (map JSON, all optional — absent arrays are no-ops):
//   ladders: [{ p:[x,y,z], h:6.4, w:1.2, rot:0 }]  — p = base center AT the wall face;
//     rot ∈ 0|90|180|270 = the side the climb volume opens toward (0=+Z, 90=+X, 180=−Z, 270=−X).
//     Climb volume = thin AABB: w wide, h tall, 0.85 out from the face (−0.15 in).
//   water:   [{ p:[cx,y0,cz], s:[w,h,d], swim:true }] — surface at y0+h; swim:false = wade-only (ornamental).
//   props:   [{ k:'tree'|'rock'|'grass', p:[x,y,z], s:1, n?:6 }] — s = scale, n = grass tuft count.
// Physics reads World.ladders [{min,max,out}] + World.water [{min,max,swim,surface}].
const LADDER_OUT = [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0)];
function buildLadders(list) {
  if (!Array.isArray(list)) return;
  for (const L of list) {
    const [px, py, pz] = L.p, h = L.h || 6, w = L.w || 1.2, rot = ((L.rot | 0) % 4 + 4) % 4;
    const out = LADDER_OUT[rot];
    // visual — rails + rungs, oriented by rot (the panel plane is perpendicular to `out`)
    const g = new THREE.Group();
    const railGeo = new THREE.BoxGeometry(0.07, h, 0.07);
    const railMat = mats.metal;
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(railGeo, railMat);
      r.position.set(s * (w / 2 - 0.03), h / 2, 0.06);
      g.add(r);
    }
    const rungGeo = new THREE.BoxGeometry(w - 0.1, 0.055, 0.055);
    for (let y = 0.35; y < h - 0.15; y += 0.4) {
      const r = new THREE.Mesh(rungGeo, railMat);
      r.position.set(0, y, 0.06);
      g.add(r);
    }
    // [T132] rot is the NORMALIZED 0..3 index (270 → 2): the old degree branches
    // (rot === 90/270/180) were dead code, so every non-zero ladder rendered unrotated
    // while its climb volume followed LADDER_OUT[rot] (probe_t132 P3: yaw=0, want π).
    // R(θ)·(0,0,1) = (sinθ, 0, cosθ) must equal out — the panel faces along +z rotated to out.
    g.rotation.y = [0, Math.PI / 2, Math.PI, -Math.PI / 2][rot];
    g.position.set(px, py, pz);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    World.group.add(g); World.meshes.push(g);
    // the climb volume (physics truth — opens along `out`: −0.15 into the wall face, +0.85 out)
    const inner = 0.15, outer = 0.85, hw = w / 2;
    let mnx, mxx, mnz, mxz;
    if (out.x > 0) { mnx = px - inner; mxx = px + outer; mnz = pz - hw; mxz = pz + hw; }
    else if (out.x < 0) { mnx = px - outer; mxx = px + inner; mnz = pz - hw; mxz = pz + hw; }
    else if (out.z > 0) { mnx = px - hw; mxx = px + hw; mnz = pz - inner; mxz = pz + outer; }
    else { mnx = px - hw; mxx = px + hw; mnz = pz - outer; mxz = pz + inner; }
    World.ladders.push({
      min: new THREE.Vector3(mnx, py, mnz),
      max: new THREE.Vector3(mxx, py + h, mxz),
      out, top: py + h,
    });
  }
}
function buildWater(list) {
  if (!Array.isArray(list)) return;
  for (const Wl of list) {
    const [cx, y0, cz] = Wl.p, [w, h, d] = Wl.s, swim = Wl.swim !== false && Wl.swim !== undefined ? !!Wl.swim : false;
    const min = new THREE.Vector3(cx - w / 2, y0, cz - d / 2), max = new THREE.Vector3(cx + w / 2, y0 + h, cz + d / 2);
    World.water.push({ min, max, swim, surface: y0 + h });
    // the animated surface (stylized bands — the aesthetic law: flat-shaded, emissive-leaning)
    const uni = { uT: { value: 0 }, uDeep: { value: new THREE.Color(swim ? 0x0e3a4a : 0x1b4a44) }, uShallow: { value: new THREE.Color(swim ? 0x2f8fa8 : 0x3f8f7a) } };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uT; uniform vec3 uDeep, uShallow; varying vec2 vUv;
        void main(){
          float b = sin(vUv.x*28.0 + uT*1.15) * sin(vUv.y*22.0 - uT*0.9);
          float b2 = sin((vUv.x+vUv.y)*41.0 - uT*1.6);
          float m = 0.5 + 0.28*b + 0.16*b2;
          vec3 col = mix(uDeep, uShallow, clamp(m, 0.0, 1.0));
          gl_FragColor = vec4(col, 0.78);
        }`,
    });
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    surf.rotation.x = -Math.PI / 2;
    surf.position.set(cx, y0 + h - 0.05, cz);
    surf.renderOrder = 2;
    World.group.add(surf); World.meshes.push(surf);
    (World.waterMats = World.waterMats || []).push(uni);
  }
}
function buildProps(list) {
  if (!Array.isArray(list)) return;
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.95 });
  const canoA = new THREE.MeshStandardMaterial({ color: 0x2d5a33, roughness: 0.9 });
  const canoB = new THREE.MeshStandardMaterial({ color: 0x3d7040, roughness: 0.9 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a7076, roughness: 0.98, flatShading: true });
  // grass blades: one shared alpha canvas texture (the in-domain law — generated, never hotlinked)
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g2 = cv.getContext('2d');
  g2.strokeStyle = '#3f7040'; g2.lineWidth = 5; g2.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    g2.beginPath(); g2.moveTo(8 + i * 8, 64); g2.quadraticCurveTo(4 + i * 8 + (Math.random() * 10 - 5), 34, 6 + i * 8 + (Math.random() * 14 - 7), 6 + Math.random() * 10); g2.stroke();
  }
  const grassTx = new THREE.CanvasTexture(cv);
  const grassMat = new THREE.MeshBasicMaterial({ map: grassTx, transparent: true, side: THREE.DoubleSide, alphaTest: 0.35 });
  const grassGeo = new THREE.PlaneGeometry(0.9, 0.62);
  for (const Pp of list) {
    const [x, y, z] = Pp.p, s = Pp.s || 1;
    World.props.push(Pp); // [T132] the registry WAS never pushed (probe_t132 P1: json=26 registry=0) — props built but uncounted
    if (Pp.k === 'tree') {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.17 * s, 1.5 * s, 7), trunkMat);
      trunk.position.y = 0.75 * s; trunk.castShadow = true; t.add(trunk);
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.95 * s, 1.5 * s, 8), canoA);
      c1.position.y = 1.9 * s; c1.castShadow = true; t.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.68 * s, 1.15 * s, 8), canoB);
      c2.position.y = 2.7 * s; c2.castShadow = true; t.add(c2);
      t.position.set(x, y, z);
      World.group.add(t); World.meshes.push(t);
      World.colliders.push({ min: new THREE.Vector3(x - 0.24 * s, y, z - 0.24 * s), max: new THREE.Vector3(x + 0.24 * s, y + 1.7 * s, z + 0.24 * s) });
    } else if (Pp.k === 'rock') {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), rockMat);
      r.position.set(x, y + 0.3 * s, z); r.rotation.y = Math.random() * Math.PI; r.castShadow = true; r.receiveShadow = true;
      World.group.add(r); World.meshes.push(r);
      World.colliders.push({ min: new THREE.Vector3(x - 0.5 * s, y, z - 0.5 * s), max: new THREE.Vector3(x + 0.5 * s, y + 0.62 * s, z + 0.5 * s) });
    } else if (Pp.k === 'grass') {
      const n = Math.max(1, Math.min(14, Pp.n || 6));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.random() * 1.3 * s;
        const m = new THREE.Mesh(grassGeo, grassMat);
        m.position.set(x + Math.cos(a) * rr, y + 0.3, z + Math.sin(a) * rr);
        m.rotation.y = Math.random() * Math.PI;
        World.group.add(m); World.meshes.push(m);
      }
    }
  }
}

function makeJumpPads(list) {
  for (const jp of list) {
    const x = jp.pos.x, z = jp.pos.z;
    const m = addBox(x, 0.02, z, 3.2, 0.24, 3.2, mats.pad, { collide: false });
    World.jumpPads.push({ pos: new THREE.Vector3(x, jp.pos.y ?? 0.3, z), r: jp.r, mesh: m });
  }
}

function makeFlags(list) {
  for (const fd of list) {
    const id = fd.id, x = fd.x, z = fd.z;
    const pole = addBox(x, 0, z, 0.18, 4, 0.18, mats.metal);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: 0x9aa6b5, side: THREE.DoubleSide }));
    cloth.position.set(x + 0.85, 3.4, z); World.group.add(cloth);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.55, 40), new THREE.MeshBasicMaterial({ color: 0x9aa6b5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.06, z); World.group.add(ring);
    World.flags.push({ id, pos: new THREE.Vector3(x, 0, z), owner: -1, prog: 0, cloth, ring, letter: id });
  }
}

// T1-1 (SS22): Hardpoint hills share the flag-site coords (no poles — flat rings + discs);
// SnD bomb sites get accent rings. Both hidden by default; mode start/finish toggles visibility.
function makeHills(hillList, siteList) {
  for (const hd of hillList) {
    const x = hd.x, z = hd.z;
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.55, 40), new THREE.MeshBasicMaterial({ color: 0x9aa6b5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.07, z); ring.visible = false; World.group.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0x9aa6b5, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.05, z); disc.visible = false; World.group.add(disc);
    World.hills.push({ id: hd.id, pos: new THREE.Vector3(x, 0, z), owner: -1, prog: 0, ring, disc });
  }
  for (const sd of siteList) {
    const x = sd.x, z = sd.z;
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.55, 40), new THREE.MeshBasicMaterial({ color: C.accentA, transparent: true, opacity: 0.42, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.07, z); ring.visible = false; World.group.add(ring);
    World.sndSites.push({ id: sd.id, pos: new THREE.Vector3(x, 0, z), ring });
  }
}

function makePickups(list) {
  for (const pd of list) {
    const kind = pd.kind, x = pd.x, z = pd.z;
    const color = kind === 'hp' ? 0x35d96b : 0x29d3ff;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55 }));
    m.position.set(x, 0.85, z); m.castShadow = true;
    World.group.add(m);
    World.pickups.push({ kind, pos: new THREE.Vector3(x, 0.85, z), active: true, mesh: m, t: 0 });
  }
}

function makeSpawns(data) {
  const toV3 = (s) => new THREE.Vector3(s.x, s.y || 0, s.z);
  World.spawnsFFA = data.spawnsFFA.map(toV3);
  World.spawnsA = data.spawnsA.map(toV3);
  World.spawnsB = data.spawnsB.map(toV3);
}

// ---------- waypoints (nav graph from map JSON; edge rules = legacy verbatim) ----------
function buildWaypoints(nav) {
  const { dist, maxDy, eye } = nav.link;
  World.waypoints = nav.nodes.map(([x, z, y]) => ({ p: new THREE.Vector3(x, y || 0, z), e: [] }));
  for (let i = 0; i < World.waypoints.length; i++) {
    for (let j = i + 1; j < World.waypoints.length; j++) {
      const a = World.waypoints[i], b = World.waypoints[j];
      const d = a.p.distanceTo(b.p);
      if (d > dist) continue;
      const dy = Math.abs(a.p.y - b.p.y);
      if (dy > maxDy) continue;
      const from = new THREE.Vector3(a.p.x, a.p.y + eye, a.p.z), to = new THREE.Vector3(b.p.x, b.p.y + eye, b.p.z);
      if (segmentBlocked(from, to)) continue;
      a.e.push(j); b.e.push(i);
    }
  }
}

// ---------- ray / collision math (used by player, bots, weapons) ----------
export function rayAABB(o, d, maxDist) {
  let best = null, bestT = maxDist;
  for (const b of World.colliders) {
    let tmin = 0, tmax = bestT, nAxis = -1, nSign = 0;
    let ok = true;
    for (let a = 0; a < 3; a++) {
      const ax = 'xyz'[a];
      const oi = o[ax], di = d[ax], mn = b.min[ax], mx = b.max[ax];
      if (Math.abs(di) < 1e-9) { if (oi < mn || oi > mx) { ok = false; break; } continue; }
      let t1 = (mn - oi) / di, t2 = (mx - oi) / di, s = -1;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = a; nSign = di > 0 ? -1 : 1; }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) { ok = false; break; }
    }
    if (ok && tmin < bestT && tmin >= 0) {
      bestT = tmin; best = { t: tmin, box: b, axis: nAxis, sign: nSign };
    }
  }
  if (best && best.axis >= 0) {
    best.normal = new THREE.Vector3(); best.normal['xyz'[best.axis]] = best.sign;
  }
  return best;
}
const _v1 = new THREE.Vector3();
export function segmentBlocked(a, b) {
  _v1.subVectors(b, a);
  const len = _v1.length(); if (len < 1e-6) return false;
  _v1.divideScalar(len);
  const hit = rayAABB(a, _v1, len - 0.01);
  return !!hit;
}
export function pointInBox(p, b, pad = 0) {
  return p.x >= b.min.x - pad && p.x <= b.max.x + pad && p.y >= b.min.y - pad && p.y <= b.max.y + pad && p.z >= b.min.z - pad && p.z <= b.max.z + pad;
}

// ---------- minimap prerender ----------
function prerenderMinimap(W) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(10,14,20,0.9)'; g.fillRect(0, 0, 512, 512);
  // §62.2 (v1.52) MINIMAP UNIFORM-PROJECTION LAW: one meters-per-pixel for BOTH axes.
  // Canvas half-span M = max(halfW, halfD) + 2 → 256 px = M meters, so square AND
  // non-square maps project geometrically true (the legacy pz had a self-cancelling
  // aspect term; the REAL distortion lived in hud.js's blit rect — see drawMinimap).
  const M = Math.max(W.halfW, W.halfD) + 2;
  const px = (x) => 256 + (x / M) * 256;
  const pz = (z) => 256 + (z / M) * 256;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const b of World.colliders) {
    if (b.max.y < 0.9) continue; // skip floor
    const x = px(b.min.x), z = pz(b.min.z);
    g.fillRect(x, z, Math.max(2, px(b.max.x) - x), Math.max(2, pz(b.max.z) - z));
  }
  World.mapCanvas = cv; World.mapHalf = M; // §62.2: blit consumer (hud.js drawMinimap) reads the PER-MAP half
}
