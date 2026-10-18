// ============================================================
// IRONSIGHT — mugshot.js : the menu-side 3D OPERATOR MUGSHOT studio [T123].
// Item 3 of the user's 12-item decree: (b) 3D mugshots replace the
// initial-letter placeholder IN THE SAME SPACE (the .op-tile-face square /
// the .op-portrait detail face), (c) the detail face is a LIVE rotatable
// showcase — drag yaw + auto-turntable, showcase-idle default, WAVE/NOD
// emote chips. Ask (a) the square grid is ALREADY the law (.op-tile-face
// aspect-ratio 1/1, T117/T124) — the mugshot fills it.
//
// LAWS:
//  · THE SAME BODIES — every rig is ops3dRig (ops3d.js): the same skinned
//    roster the match renders, the same measured 1.8 m calibration, the
//    same CDN-first honesty. No new assets, no new inputs (the T1-3 law).
//  · SAME-SPACE FALLBACK — the studio NEVER touches the DOM containers:
//    a failed/unready snapshot leaves the CSS letter portrait visible
//    (the img simply never gets a src); the game never loses a face.
//  · EMOTES ARE HONEST — a clip emote plays the real mixamorig take
//    (Xbot line: wave + agree); a missing clip falls to the PROCEDURAL
//    layer (arm-wave / head-nod bone overlays, save-restore exact) and the
//    route is logged. Nothing is faked silently (the ops3d stats law).
//  · MIXER ORDER — the procedural overlay applies AFTER rig.update (the
//    mixer writes the idle pose each frame; the overlay bends the bones on
//    top of what the mixer just wrote, or it would be silently erased).
//  · NO RENDER-LOOP COUPING — the studio owns its own tiny renderers; the
//    live loop self-dies the moment its canvas leaves the DOM (the
//    re-entrant renderOperators law: no RAF leaks, no context pile-up).
//  · PURE MENU MODULE — import cycle: mugshot → ops3d → three only, and
//    mugshot → operators.js (pure data). No wire change, no HUD coupling.
// ============================================================
import * as THREE from 'three';
import { ops3dRig } from './ops3d.js';

// ---------- the shared studio light rig ----------
function dressScene(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2e38, 1.05));
  const key = new THREE.DirectionalLight(0xfff2e0, 1.35); key.position.set(1.8, 2.6, 2.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.7); rim.position.set(-2.2, 2.2, -1.8); scene.add(rim); // the cool rim separates the shoulders off the accent backdrop
  return scene;
}

// bust framing: head + shoulders, slight 3/4 hero angle (the ops_menu portrait grammar)
function dressCam(cam, dist) {
  cam.fov = 30; cam.near = 0.1; cam.far = 12;
  cam.position.set(0.5, 1.72, dist);
  cam.lookAt(0, 1.5, 0);
  cam.updateProjectionMatrix();
}

const RIG_YAW = 0.45; // the 3/4 snapshot pose (the rig faces +Z after ops3d's yawFix)

function findBone(root, names) { // the ops3d bone-probe idiom — colon, bare, fallback
  for (const n of names) { const b = root.getObjectByName(n); if (b) return b; }
  return null;
}
const ARM_BONES = ['mixamorig:RightArm', 'mixamorigRightArm', 'RightArm'];
const FORE_BONES = ['mixamorig:RightForeArm', 'mixamorigRightForeArm', 'RightForeArm'];
const HEAD_BONES = ['mixamorig:Head', 'mixamorigHead', 'Head'];

// ---------- the procedural emote layer (missing-clip honesty) ----------
// Additive bone rotations applied AFTER rig.update — the mixer writes the
// idle pose, the overlay bends the arm/head on top, restore is EXACT (saved
// quaternions). Route log: 'procedural-wave' / 'procedural-nod'.
const EMOTE_DUR = { wave: 1.6, nod: 1.5 };

function applyProcedural(handle, kind, t01) {
  const root = handle._root; if (!root) return;
  const env = Math.sin(Math.min(1, t01) * Math.PI); // 0→1→0 envelope
  if (kind === 'wave') {
    const arm = findBone(root, ARM_BONES); const fore = findBone(root, FORE_BONES);
    if (arm) arm.rotation.z += -2.2 * env; // raise the upper arm laterally (A-pose axis)
    if (fore) fore.rotation.z += -0.55 + Math.sin(t01 * Math.PI * 5) * 0.5; // the hand waves
  } else if (kind === 'nod') {
    const head = findBone(root, HEAD_BONES);
    if (head) head.rotation.x += Math.sin(t01 * Math.PI * 4) * 0.24 * env; // two nods
  }
}

// snapshot the saved quats, step per frame, restore EXACTLY on end
function emoteLifecycle(handle, kind) {
  const root = handle._root;
  const bones = kind === 'wave' ? [findBone(root, ARM_BONES), findBone(root, FORE_BONES)] : [findBone(root, HEAD_BONES)];
  const saved = bones.filter(Boolean).map(b => ({ b, q: b.quaternion.clone() }));
  return {
    step: (t01) => applyProcedural(handle, kind, t01),
    end: () => saved.forEach(({ b, q }) => b.quaternion.copy(q)),
  };
}

// ---------- snapshots (the roster grid) ----------
const SNAP = { renderer: null, scene: null, cam: null, cache: new Map(), jobs: new Map() };

function snapStudio() {
  if (!SNAP.renderer) {
    SNAP.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); // preserve: toDataURL reads the frame (the §26 proof law)
    SNAP.renderer.setSize(288, 288);
    SNAP.renderer.setPixelRatio(2);
    SNAP.renderer.setClearColor(0x000000, 0); // transparent — the tile's rarity gradient IS the backdrop
    SNAP.scene = dressScene(new THREE.Scene());
    SNAP.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 12);
    dressCam(SNAP.cam, 1.95);
  }
  return SNAP;
}

/**
 * mugSnapshot(opId, tintHex) → Promise<string|null>
 * One rig at a time through the studio; the dataURL is cached for the
 * session. Resolves NULL on CDN failure / calibration fault — the caller's
 * letter portrait stays, the same-space law.
 */
export function mugSnapshot(opId, tintHex) {
  const hit = SNAP.cache.get(opId);
  if (hit) return Promise.resolve(hit);
  const inflight = SNAP.jobs.get(opId);
  if (inflight) return inflight;
  const S = snapStudio();
  const job = new Promise((resolve) => {
    const rig = ops3dRig(opId, { tint: tintHex });
    let waited = 0;
    const poll = setInterval(() => {
      if (rig.ready || rig.failed || (waited += 80) > 10000) {
        clearInterval(poll);
        if (!rig.ready) { rig.dispose(); SNAP.jobs.delete(opId); resolve(null); return; } // honest null — letter portrait stays
        rig.group.rotation.y = RIG_YAW;
        S.scene.add(rig.group);
        for (let i = 0; i < 22; i++) rig.update(1 / 30, { speed: 0, grounded: true }); // settle 0.73 s into the showcase-idle pose
        S.renderer.render(S.scene, SNAP.cam);
        const url = S.renderer.domElement.toDataURL('image/png');
        S.scene.remove(rig.group);
        rig.dispose();
        SNAP.cache.set(opId, url);
        SNAP.jobs.delete(opId);
        resolve(url);
      }
    }, 80);
  });
  SNAP.jobs.set(opId, job);
  return job;
}

/**
 * mugLive(canvas, opId, tintHex) → controller { emote(kind), stats, dispose }
 * The DETAIL showcase: showcase-idle default + gentle auto-turntable,
 * pointer-drag yaw, emote chips (clip when the model carries it,
 * procedural otherwise). The RAF self-dies when the canvas disconnects —
 * renderOperators re-renders never leak loops (the re-entrancy law).
 */
export function mugLive(canvas, opId, tintHex) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = dressScene(new THREE.Scene());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 12);
  dressCam(cam, 2.25); // a step wider than the snapshot — the showcase shows the torso line
  const rig = ops3dRig(opId, { tint: tintHex });
  scene.add(rig.group);
  let yaw = RIG_YAW, dragging = false, lastX = 0, lastDrag = 0, lw = 0, lh = 0;
  let em = null; // { kind, t, clip, dur } | { kind, t, clip:false, step, end }
  const stats = { emotes: [] }; // the honest route log ('clip:wave' / 'procedural:nod')

  const onDown = (e) => { dragging = true; lastX = e.clientX; lastDrag = performance.now(); if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch {} canvas.style.cursor = 'grabbing'; };
  const onMove = (e) => { if (!dragging) return; yaw += (e.clientX - lastX) * 0.012; lastX = e.clientX; lastDrag = performance.now(); };
  const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  let raf = 0, last = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!canvas.isConnected) { cancelAnimationFrame(raf); renderer.dispose(); return; } // the self-die law
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h && (w !== lw || h !== lh)) { lw = w; lh = h; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (!dragging && now - lastDrag > 2500) yaw += dt * 0.4; // the showcase turntable (pauses for the operator's hand)
    rig.group.rotation.y = yaw;
    let st = { speed: 0, grounded: true };
    let procT = null;
    if (em) {
      em.t += dt;
      const t01 = em.t / EMOTE_DUR[em.kind];
      if (em.clip) { if (em.t < em.dur) st.emote = em.kind; else em = null; } // the clip route — ops3d picks the real take
      else if (t01 >= 1) { const end = em.end; end(); em = null; }
      else procT = t01;
    }
    rig.update(dt, st);
    if (procT !== null && em && em.step) em.step(procT); // AFTER the mixer write — the overlay survives
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);

  return {
    emote(kind) {
      if (!EMOTE_DUR[kind] || !rig.ready) return;
      if (em && em.end) em.end();
      if (rig._acts[kind]) { // the clip route — real mixamorig take, one pass then idle
        em = { kind, t: 0, clip: true, dur: rig._acts[kind].getClip().duration || 2 };
        stats.emotes.push('clip:' + kind);
      } else { // the procedural route — honest overlay, exact restore
        const life = emoteLifecycle(rig, kind);
        em = { kind, t: 0, clip: false, step: life.step, end: life.end };
        stats.emotes.push('procedural:' + kind);
      }
    },
    stats,
    dispose() { if (em && em.end) em.end(); rig.dispose(); renderer.dispose(); cancelAnimationFrame(raf); },
  };
}
