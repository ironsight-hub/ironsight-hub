// AI util — ray/AABB slab test (shared by bot ballistics)
export function rayBoxForBots(o, d, minx, miny, minz, maxx, maxy, maxz) {
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
