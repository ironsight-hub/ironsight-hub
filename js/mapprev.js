// ============================================================
// IRONSIGHT — mapprev.js : LIVE map previews for the menu surfaces.
// ============================================================
// [T117] The menu-parity decree: map surfaces show the LIVE map — a tactical
// top-down render derived from the SAME map JSON the game builds from — never
// a static asset. One module, one cache, one painter; every menu consumer
// (modes map rail, display panel, future lobby pickers) reads through here.
//
// Data law: maps/<id>.json via Maps' module-relative fetch idiom (file://-safe,
// same-origin static only). Rendering is a PURE function of that data —
// deterministic, no THREE, no network after first fetch per session.
//
// Grammar: floor tint ← sky.bot (the map's own ground tone); block fills ←
// the material table (world.js buildBlocks material names); fake 2.5D
// extrusion = per-block offset shadow painted in y-order (sun reads NW);
// objectives/pickups/pads/spawns/water/ladders paint as the HUD minimap's
// cousin language (flag chips, team-color spawn zones, teal water).
// ============================================================

const CACHE = new Map(); // mapId -> parsed JSON (one fetch per map per session)

/** Cached map JSON fetch — the Maps single-truth files, module-relative. */
export function mapData(mapId) {
  if (CACHE.has(mapId)) return Promise.resolve(CACHE.get(mapId));
  const url = new URL('../maps/' + encodeURIComponent(mapId) + '.json', import.meta.url);
  return fetch(url)
    .then((r) => { if (!r.ok) throw new Error('mapPrev ' + r.status); return r.json(); })
    .then((d) => { CACHE.set(mapId, d); return d; });
}

// material table — keyed by the map JSON `m` field (world.js material names).
// Wall family reads light so corridors pop against the floor tint; dark/crate/
// metal keep their identity; accents follow the map's own accent pair.
const MAT = {
  wall:    { f: '#aeb9c4', s: '#39424c', a: 1 },
  wall2:   { f: '#c7d0d8', s: '#424c56', a: 1 },
  dark:    { f: '#2c333b', s: '#171c22', a: 1 },
  crate:   { f: '#97744a', s: '#4d3a22', a: 1 },
  metal:   { f: '#78848f', s: '#2d343b', a: 1 },
  accent:  { f: '#ff5a3c', s: '#7a2a1c', a: 1 }, // replaced per-map below
  accentB: { f: '#29a3ff', s: '#14486e', a: 1 }, // replaced per-map below
  pad:     { f: '#29d3ff', s: '#11525e', a: 0.9 },
  lamp:    { f: '#ffd75e', s: '#5e4a14', a: 0.9 },
};

const hex = (n) => '#' + (n || 0).toString(16).padStart(6, '0').slice(-6);
const shade = (h, f) => { // hex -> multiplied shade (pure, tiny)
  const n = parseInt(h.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

/** Per-map accent pair from the map's own sky/light data (single truth). */
export function mapAccents(data) {
  const mid = hex(data.sky && data.sky.mid);
  return { a: mid, b: '#29d3ff' };
}

/** Data extent (blocks ∪ spawns ∪ water ∪ objectives) with margin. */
export function fitBounds(data, pad = 6) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  const eat = (x, z) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; };
  for (const b of data.blocks || []) { eat(b.p[0] - b.s[0] / 2, b.p[2] - b.s[2] / 2); eat(b.p[0] + b.s[0] / 2, b.p[2] + b.s[2] / 2); }
  for (const w of data.water || []) { eat(w.p[0] - w.s[0] / 2, w.p[2] - w.s[2] / 2); eat(w.p[0] + w.s[0] / 2, w.p[2] + w.s[2] / 2); }
  for (const k of ['spawnsFFA', 'spawnsA', 'spawnsB']) for (const s of data[k] || []) eat(s.x, s.z);
  for (const k of ['flags', 'hills', 'sites']) for (const s of data[k] || []) eat(s.x, s.z);
  for (const p of data.pickups || []) eat(p.x, p.z);
  for (const j of data.jumpPads || []) eat(j.pos.x, j.pos.z);
  if (x0 > x1) { x0 = -40; x1 = 40; z0 = -40; z1 = 40; } // degenerate guard
  return { x0: x0 - pad, x1: x1 + pad, z0: z0 - pad, z1: z1 + pad };
}

/**
 * Paint the live tactical top-down of ONE map onto a canvas.
 * opts: {markers=true, grid=true, glow=true} — pure function of (data, opts).
 */
export function drawMapPreview(cv, data, opts = {}) {
  const g = cv.getContext('2d');
  if (!g || !data) return;
  const W = cv.width, H = cv.height, dpr = opts.dpr || 1;
  const markers = opts.markers !== false, grid = opts.grid !== false;
  const B = fitBounds(data);
  const bw = B.x1 - B.x0, bh = B.z1 - B.z0;
  const sc = Math.min(W / bw, H / bh) * 0.96;
  const ox = W / 2 - (B.x0 + bw / 2) * sc, oz = H / 2 - (B.z0 + bh / 2) * sc;
  const X = (x) => ox + x * sc, Z = (z) => oz + z * sc;
  const acc = mapAccents(data);

  // --- floor: the map's own ground tone (deepened for card contrast) + tactical grid ---
  const skyBot = shade(hex(data.sky && data.sky.bot), 0.58);
  g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, shade(skyBot, 1.22)); bg.addColorStop(1, shade(skyBot, 0.8));
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (grid) {
    g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1;
    const step = 10 * sc; // 10-world-unit grid (the nav node spacing law)
    if (step > 7) {
      g.beginPath();
      for (let x = X(B.x0) - (X(B.x0) % step); x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = Z(B.z0) - (Z(B.z0) % step); y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
    }
  }

  // --- water bodies (swim = strong teal, wade = whisper) ---
  for (const w of data.water || []) {
    g.fillStyle = w.swim ? 'rgba(41,163,255,.34)' : 'rgba(41,163,255,.18)';
    g.fillRect(X(w.p[0] - w.s[0] / 2), Z(w.p[2] - w.s[2] / 2), w.s[0] * sc, w.s[2] * sc);
    g.strokeStyle = 'rgba(120,220,255,.5)'; g.lineWidth = 1;
    g.strokeRect(X(w.p[0] - w.s[0] / 2), Z(w.p[2] - w.s[2] / 2), w.s[0] * sc, w.s[2] * sc);
  }

  // --- blocks in y-order: shadow pass then face pass (the 2.5D read) ---
  const bs = (data.blocks || []).slice().sort((a, b) => a.p[1] - b.p[1]);
  const rect = (b, dx, dz) => [X(b.p[0] - b.s[0] / 2) + dx, Z(b.p[2] - b.s[2] / 2) + dz, Math.max(1.5, b.s[0] * sc), Math.max(1.5, b.s[2] * sc)];
  g.fillStyle = 'rgba(0,0,0,.34)';
  for (const b of bs) { const h = (b.p[1] || 0) + b.s[1]; const o = Math.min(6, 1.5 + h * 0.11) * (sc / 14); const [x, y, w, d] = rect(b, o, o); g.fillRect(x, y, w, d); }
  for (const b of bs) {
    const m = MAT[b.m] || MAT.wall;
    const fill = b.m === 'accent' ? acc.a : b.m === 'accentB' ? acc.b : m.f;
    const [x, y, w, d] = rect(b, 0, 0);
    g.fillStyle = fill; g.globalAlpha = m.a; g.fillRect(x, y, w, d); g.globalAlpha = 1;
    if (Math.min(w, d) > 3) { // top-face whisper for the extruded read
      g.fillStyle = 'rgba(255,255,255,.10)';
      g.fillRect(x, y, w, Math.min(2, d * 0.28));
    }
    g.strokeStyle = m.s; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, d - 1);
  }

  // --- ladders (amber rungs) ---
  for (const l of data.ladders || []) {
    const p = l.p || l.pos || [l.x || 0, 0, l.z || 0];
    const lw = (l.s ? l.s[0] : 1.2) * sc, ld = (l.s ? l.s[2] : 1.2) * sc;
    g.fillStyle = 'rgba(255,215,94,.85)';
    g.fillRect(X(p[0]) - lw / 2, Z(p[2]) - ld / 2, Math.max(2, lw), Math.max(2, ld));
  }

  // --- jump pads (accent rings) ---
  for (const j of data.jumpPads || []) {
    g.strokeStyle = acc.b; g.lineWidth = 2; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(X(j.pos.x), Z(j.pos.z), Math.max(3, (j.r || 1.9) * sc), 0, 7); g.stroke();
    g.globalAlpha = 1;
  }

  // --- pickups (small diamonds, kind-tinted) ---
  const pk = { hp: '#7dff8a', ammo: '#ffd75e', ar: '#29d3ff' };
  for (const p of data.pickups || []) {
    g.fillStyle = pk[p.kind] || '#9aa6b5';
    const s = Math.max(2.2, sc * 0.8);
    g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(Math.PI / 4); g.fillRect(-s / 2, -s / 2, s, s); g.restore();
  }

  if (markers) {
    // --- spawn zones (team-color halos) ---
    const zone = (list, col) => {
      if (!list || !list.length) return;
      let cx = 0, cz = 0;
      for (const s of list) { cx += s.x; cz += s.z; }
      cx /= list.length; cz /= list.length;
      const rg = g.createRadialGradient(X(cx), Z(cz), 1, X(cx), Z(cz), Math.max(9, 4.5 * sc));
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(X(cx), Z(cz), Math.max(9, 4.5 * sc), 0, 7); g.fill();
    };
    if ((data.spawnsA || []).length) zone(data.spawnsA, 'rgba(63,167,255,.30)');
    if ((data.spawnsB || []).length) zone(data.spawnsB, 'rgba(255,82,82,.28)');

    // --- objective chips (A/B/C — flags ⊃ hills ⊃ sites deduped by id+pos) ---
    const objs = [];
    for (const f of data.flags || []) objs.push(f);
    for (const h of data.hills || []) if (!objs.some((o) => o.id === h.id)) objs.push(h);
    for (const s of data.sites || []) if (!objs.some((o) => o.id === s.id)) objs.push(s);
    for (const o of objs) {
      const r = Math.max(6.5, sc * 1.7);
      g.fillStyle = 'rgba(12,14,18,.82)';
      g.beginPath(); g.arc(X(o.x), Z(o.z), r, 0, 7); g.fill();
      g.strokeStyle = '#e8b64c'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#ffd75e'; g.font = `700 ${Math.round(r * 1.25)}px 'Chakra Petch',sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.id || '?', X(o.x), Z(o.z) + 0.5);
    }
  }

  // --- lamp glow (night maps read alive) ---
  for (const l of data.lamps || []) {
    const rg = g.createRadialGradient(X(l[0]), Z(l[1]), 0, X(l[0]), Z(l[1]), Math.max(5, sc * 2.2));
    rg.addColorStop(0, 'rgba(255,215,94,.30)'); rg.addColorStop(1, 'rgba(255,215,94,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(X(l[0]), Z(l[1]), Math.max(5, sc * 2.2), 0, 7); g.fill();
  }

  // --- vignette: the tactical-plate frame ---
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,6,10,.42)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/** Paint the ANY/rotation card face (no map — the rotation glyph). */
export function drawAnyPreview(cv) {
  const g = cv.getContext('2d');
  if (!g) return;
  const W = cv.width, H = cv.height;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a2129'); bg.addColorStop(1, '#0c0f14');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(41,211,255,.16)'; g.lineWidth = 1;
  const st = Math.max(12, W / 9);
  g.beginPath();
  for (let x = 0; x < W; x += st) { g.moveTo(x, 0); g.lineTo(x, H); }
  for (let y = 0; y < H; y += st) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.26;
  g.strokeStyle = 'rgba(41,211,255,.85)'; g.lineWidth = Math.max(2, W / 60);
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(cx, cy - r * 1.35); g.lineTo(cx + r * 0.32, cy + r * 0.55); g.lineTo(cx, cy + r * 0.16); g.lineTo(cx - r * 0.32, cy + r * 0.55); g.closePath();
  g.fillStyle = 'rgba(41,211,255,.9)'; g.fill();
  const vg = g.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, Math.max(W, H) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,6,10,.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/** Async one-shot: sized canvas painted from live map data (the card face). */
export async function mapPrevCanvas(mapId, w, h, opts) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.className = 'map-prev-cv';
  try { drawMapPreview(cv, await mapData(mapId), opts); } catch (e) { drawAnyPreview(cv); }
  return cv;
}
