// ============================================================
// IRONSIGHT — maps.js (T1-2, Task 37-b) : map registry /
// JSON loader / match rotation picker. §51 (Task 72): the MP pin is LIFTED —
// private rooms pick ANY roster map (per-room server worlds, room.mapId).
//
// Data files: maps/<id>.json (schema: docs/MAPS.md). Fetches use
// module-relative URLs (import.meta.url) so the document base
// path can never break them; failures fall back to the last good
// map data (offline-safe: same-origin static fetch only).
//
// Rotation: first match after boot plays the boot map (OUTPOST —
// zero-rebuild default); every subsequent startMatch consumes the
// next roster entry, never repeating the map just played.
// MP pin lives in main.js startMatch: CFG.MP.enabled bypasses the
// rotation entirely (server objective tables are OUTPOST-frozen —
// see docs/MAPS.md §3 residual).
// ============================================================

export const Maps = {
  roster: [
    { id: 'outpost', name: 'OUTPOST', file: 'maps/outpost.json', desc: 'asymmetric quadrant blend — hub / tower / warehouse / container yard / garage' },
    { id: 'foundry', name: 'FOUNDRY', file: 'maps/foundry.json', desc: 'close-quarters symmetric 2-lane — quadrant sheds / shadow lanes / cross-street' },
    { id: 'relay', name: 'RELAY', file: 'maps/relay.json', desc: 'vertical two-tier relay mast / corner platforms / canyon racks' },
    // T47 §31 additive content: roster 3 → 6 (docs/MAPS.md §4)
    { id: 'citadel', name: 'CITADEL', file: 'maps/citadel.json', desc: 'fortress compound / arched ring walls / keep + corner bastions' },
    { id: 'drydock', name: 'DRYDOCK', file: 'maps/drydock.json', desc: 'shipyard canal / twin hulls + towers / keel-breaker lane' },
    { id: 'quarry', name: 'QUARRY', file: 'maps/quarry.json', desc: 'terraced spoil bowl / walkable terrace banks / open basin' },
    // T51 §35 additive content: roster 6 → 8 (docs/MAPS.md §4)
    { id: 'yard', name: 'YARD', file: 'maps/yard.json', desc: 'rail yard / boxcar rows + E-W road / crane gantry + loading docks' },
    { id: 'mesa', name: 'MESA', file: 'maps/mesa.json', desc: 'high mesa / 4-tier walkable pyramid / pad-only buttes + ridge walls' },
    // T52 §36 additive content: roster 8 → 10 (docs/MAPS.md §4)
    { id: 'refinery', name: 'REFINERY', file: 'maps/refinery.json', desc: 'fractionating-tower plant / walk-under pipe galleries / N-S flag line' },
    { id: 'bazaar', name: 'BAZAAR', file: 'maps/bazaar.json', desc: 'desert market quarter / quadrant stall grids + courtyard / diagonal flag axis' },
    // T53 §37 additive content: roster 10 → 12 (docs/MAPS.md §4)
    { id: 'stadium', name: 'STADIUM', file: 'maps/stadium.json', desc: 'floodlit arena bowl / stepped stand ring + gate tunnels / concourse loop + center stage' },
    { id: 'temple', name: 'TEMPLE', file: 'maps/temple.json', desc: 'hypostyle colonnade / walk-under lintel rows / raised sanctuary + pad-only side sanctums' },
    // T54 §38 additive content: roster 12 → 14 (docs/MAPS.md §4)
    { id: 'ruin', name: 'RUIN', file: 'maps/ruin.json', desc: 'bombed-out city block / quadrant shell stubs + rubble mounds / chevron flag axis' },
    { id: 'aqueduct', name: 'AQUEDUCT', file: 'maps/aqueduct.json', desc: 'stone water arcade / walk-under deck on pier rows / pad-only channel top + processional road' },
    // T56 §40 additive content: roster 14 → 16 (docs/MAPS.md §4)
    { id: 'harbor', name: 'HARBOR', file: 'maps/harbor.json', desc: 'container terminal / double-stacked rows + crane portals / lighthouse silhouette + L flag axis' },
    { id: 'orchard', name: 'ORCHARD', file: 'maps/orchard.json', desc: 'farm orchard / tree rows with walk-under canopies / windmill + pad-only barn roof' },
    // T57 §41 additive content: roster 16 → 18 (docs/MAPS.md §4)
    { id: 'glacier', name: 'GLACIER', file: 'maps/glacier.json', desc: 'arctic drill site / segmented windbreak lanes + hut canyon / derrick silhouette + pad-only research huts / offset N-S flag line' },
    { id: 'solar', name: 'SOLAR', file: 'maps/solar.json', desc: 'heliostat array at dusk / walk-under mirror rows / receiver tower + salt tank silhouettes / pad-only control buildings / mirrored chevron flag axis' },
    // T58 §42 additive content: roster 18 → 20 (docs/MAPS.md §4)
    { id: 'dam', name: 'DAM', file: 'maps/dam.json', desc: 'hydroelectric dam / full-width gravity wall with 3 gates (roster-first divider) / gate-keeper flag B / intake towers + penstocks / pad-only powerhouse + transformer hall' },
    { id: 'airfield', name: 'AIRFIELD', file: 'maps/airfield.json', desc: 'desert airfield at dawn / enterable hangars + parked transport (walk-under wing band) / control tower + revetments / mirrored diagonal flag axis' },
    // T59 §43 additive content: roster 20 → 22 (docs/MAPS.md §4)
    { id: 'observatory', name: 'OBSERVATORY', file: 'maps/observatory.json', desc: 'night astronomy campus / great dome drum + roster-first RING road nav / radio-telescope silhouette / pad-only admin wings / diagonal-past-the-dome flag axis' },
    { id: 'pier', name: 'PIER', file: 'maps/pier.json', desc: 'amusement pier at golden hour / ferris wheel silhouette (roster-tallest 24.4) over dual sea bands / walk-under coaster ribbon + entrance arch / enterable games hall + pad-only ticket booths / boardwalk line flag axis' },
    // T60 §44 additive content: roster 22 → 24 (docs/MAPS.md §4)
    { id: 'breakers', name: 'BREAKERS', file: 'maps/breakers.json', desc: 'shipbreaking yard at rust dawn / beached hull skeleton — walk-under keel band on open rib lanes / propeller + stern-castle silhouettes / pad-only quarters / tide diagonal flag axis' },
    { id: 'rig', name: 'RIG', file: 'maps/rig.json', desc: 'offshore platform under overcast steel sea / quad sea bands framing the deck / derrick + flare silhouettes / walk-under pipe rack L + helipad decal plaza / deck triangle flag axis (first apex-north)' },
    // T61 §45 additive content: roster 24 → 26 (docs/MAPS.md §4)
    { id: 'caldera', name: 'CALDERA', file: 'maps/caldera.json', desc: 'geothermal plant on a volcanic caldera at ember dusk / 8-mound rock ring enclosing flag B on four gate lanes (roster-first enclosed-B) / volcano cone + fumarole silhouettes / walk-under steam main L / enterable turbine hall / crater-ring flag axis' },
    { id: 'canals', name: 'CANALS', file: 'maps/canals.json', desc: 'canal-city quarter under soft morning / moat ring decals around the island plaza flag / two walkable causeways (roster-first walkable water crossings) / campanile + palazzi / walk-under arcades / island-plaza flag axis' },
    // T62 §46 additive content: roster 26 → 28 (docs/MAPS.md §4)
    { id: 'windfarm', name: 'WINDFARM', file: 'maps/windfarm.json', desc: 'upland wind farm under bright overcast haze / three giant turbine stacks with col-0 rotor crosses (3rd-tallest silhouette) / substation plinth yard + pad-only sheds / col-0 grid roads + trenches / kinked flag axis (roster-first unequal-slope legs)' },
    { id: 'oasis', name: 'OASIS', file: 'maps/oasis.json', desc: 'desert caravanserai at hot noon / palm silhouettes with col-0 frond crosses / civilian pool decal decoupled from the flag axis (roster-first untied water) / caravan well + enterable kasbahs / pad-only store + guard house / dune ridge cover / wide triangle flag axis' },
    // T63 §47 additive content: roster 28 → 30 (docs/MAPS.md §4)
    { id: 'launchpad', name: 'LAUNCHPAD', file: 'maps/launchpad.json', desc: 'coastal launch complex at first light / launch gantry with col-0 crane-arm cross (new 3rd-tallest silhouette 21.2) / launch mount + flame trench on col-0 apron / propellant tank farm + lightning masts / pad-only blockhouse + tracking shed / col-0 crawlerway / second kinked flag axis (mirrored legs)' },
    // [T130] additive content: the verticality + water showcase (the ladders/water/props builders' debut)
    { id: 'meridian', name: 'MERIDIAN', file: 'maps/meridian.json', desc: 'the T130 verticality + water showcase — three-story open tower (stairs + two ladders + railing fights, L2 summit 7.3 m) / swim canal across the bridge axis (the only swim lane) / ornamental wade pool / tree lines + grass clusters + rocks — multi-level and multi-terrain' },
    { id: 'bastion', name: 'BASTION', file: 'maps/bastion.json', desc: 'stone star-fortress at grey noon / gated fortress trace — solid rampart ring pierced by four walk-through gates enclosing the parade core (roster-first gated enclosure) / corner bastion platforms + ravelin outwork / pad-only barracks + magazine / gate-threaded flag axis — A/C flags in the outworks, B on the parade' },
    // T64b §48 additive content ⅩⅣ: roster 30 → 32 (docs/MAPS.md §4)
    { id: 'grain', name: 'GRAIN', file: 'maps/grain.json', desc: 'prairie grain-elevator complex at harvest gold (roster-first bulk-harvest theme): SILO BANK — five 2.6×11 silos (roster-first SILO silhouettes, tops 11 unclaimed) + headhouse (top 8) between the clusters, walk-under conveyor gallery on 6 trestles (deck y2.4–2.9, pipe-rack law, not a pad target), col-0 crop rows (4 E-W strips z ±12/±26) + grain-pit decals, pad-only farm sheds fed by pads (−32,0.3,20)/(32,0.3,−20), hopper carts (eye-level cover), berms ×2 mirrored, drums + crates + lamps ×4; full-diagonal flag axis through BOTH crop-row grids (A inside the north grid, C inside the south); spawns E/W halves' },
    { id: 'backlot', name: 'BACKLOT', file: 'maps/backlot.json', desc: 'film-studio backlot under hazy morning (roster-first film-industry theme): SOUND STAGES ×2 (16×6×10, tops 6 unclaimed), false-front FACADE STREET — twelve 0.3-thick flats of alternating 3.2/3.8/4.4 heights lining a 12-wide boulevard canyon with four 4-wide door gaps (roster-first facade street), four-legged WATER TOWER (top 9.8 unclaimed), col-0 boulevard (104×8), dressing trailers ×3, pad-only prop shed + costume dept fed by pads (38,0.3,−22)/(−38,0.3,−22), prop crates + drums + lamps ×4; boulevard-threaded flag axis — the legs thread the canyon between the facade rows; spawns E/W halves' },
    // [T110 T2-5] the MYTHIC TOKEN STAGES — geometry value-identical presentation
    // variants of the base stages (sky/light re-scored ONLY; scripts/gen_t110_stages.py
    // proves the geometry law in-script). tk = the token price: the setMap server
    // gate (T110) enforces ownership from tokens.js TK_STAGES (mirror-pinned 1:1 to
    // these rows); the host picker marks them, the offline select excludes them.
    { id: 'obsidian', name: 'OBSIDIAN', file: 'maps/obsidian.json', desc: 'mythic token-store stage (TEMPLE lineage) — geometry identical, obsidian-night re-score: ember sun / basalt colonnade dark / vault black', tk: 4000 },
    { id: 'aurora', name: 'AURORA', file: 'maps/aurora.json', desc: 'mythic token-store stage (GLACIER lineage) — geometry identical, aurora re-score: polar green vault / silver frost light / token-store exclusive', tk: 4000 },
  ],

  currentId: 'outpost', // id of the world currently BUILT (boot default = outpost)

  _cache: new Map(), // id -> Promise<mapData>
  _cursor: 0,        // rotation pointer (roster index); consumed per startMatch

  // Module-relative URL — js/maps.js lives in js/, files in maps/.
  fileUrl(file) { return new URL('../' + file, import.meta.url); },

  // Load (and memoize) one map JSON. Rejects only if BOTH the requested
  // file and the outpost fallback are unavailable.
  load(id) {
    const entry = this.roster.find(m => m.id === id) || this.roster[0];
    if (this._cache.has(entry.id)) return this._cache.get(entry.id);
    if (entry.custom) { const p = Promise.resolve(entry.custom); this._cache.set(entry.id, p); return p; } // [T139 G-3] the authored stage rides LS — no fetch, the data IS the file
    const p = fetch(this.fileUrl(entry.file))
      .then(r => { if (!r.ok) throw new Error('map ' + entry.file + ' HTTP ' + r.status); return r.json(); })
      .catch(e => {
        console.warn('[maps] load failed for ' + entry.id + ':', e && e.message);
        this._cache.delete(entry.id); // allow retry on next request
        if (entry.id !== 'outpost' && this._cache.has('outpost')) return this._cache.get('outpost');
        throw e;
      });
    this._cache.set(entry.id, p);
    return p;
  },

  // Warm the whole roster (called once after the boot build).
  preload() { for (const m of this.roster) this.load(m.id); }, // [T139] customEntry() rides the module consumer's first load/preload — the roster insert happens lazily BEFORE any roster scan that matters

  // [T139 G-3] the custom stage joins the roster AT BOOT (before Maps.preload()/nextForMatch run) — safe top-level init
  init() { this.customEntry(); },

  setCurrent(id) { this.currentId = id; },

  // Sync access to the CURRENTLY BUILT map data (undefined before first build).
  current() { return this._cache.get(this.currentId); },

  nameOf(id) { const m = this.roster.find(x => x.id === id); return m ? m.name : (id || '').toUpperCase(); },

  // Next map id for a match. Call ONCE per startMatch (offline path only).
  // First call: keep the boot map (first boot = outpost, byte-stable default).
  // After that: cyclic rotation that never repeats the map just played.
  nextForMatch() {
    const pool = this.roster.filter(m => !m.tk && !m.custom); // [T110] the rotation pool stays FREE-stages — token stages are host-picked MP surfaces (offline has no entitlement ledger) · [T139 G-3] the authored stage is PIN-ONLY (never rotates)
    const n = pool.length;
    if (n <= 1) return this.currentId;
    if (this._cursor === 0) { this._cursor = 1; return this.currentId; }
    let id = this.currentId, guard = 0;
    do { id = pool[this._cursor++ % n].id; } while (id === this.currentId && guard++ < n * 2);
    return id;
  },

  // [T139 G-3] THE AUTHOR HALF — the editor (editor.html) writes the SAME map-JSON shape to
  // localStorage; when one exists it joins the roster head as 'custom' and the EXISTING
  // pinned-pick law (main.js startMatch: settings.mapSelect === 'custom' → setMap) carries it
  // into ANY offline mode. Rotation never picks it (the pool filter above); MP host-pick of
  // 'custom' = the server-registry reject (offline-only stage — documented, honest).
  _custom: null,
  customEntry() {
    if (this._custom !== null) return this._custom;
    this._custom = false;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('ironsight.map.custom.v1');
        if (raw) {
          const m = JSON.parse(raw);
          if (m && Array.isArray(m.blocks) && Array.isArray(m.spawnsFFA) && m.nav && m.nav.nodes) {
            this._custom = { id: 'custom', name: (m.name || 'CUSTOM').toUpperCase().slice(0, 12), file: null, custom: m, desc: (m.desc || 'your authored stage') + ' — T139 G-3 editor' };
            this.roster.unshift(this._custom);
          }
        }
      }
    } catch (e) { /* malformed saved map = no custom entry — never boots a broken world */ }
    return this._custom;
  },

  // [T139 G-3] called by main.js right after Maps import — the roster insert runs AT BOOT
  init() { this.customEntry(); },

  // [T140 G-3] THE WIRE HALF — the hub-registered authored stage lands here (mp.js 'mapdata').
  // The roster entry is REPLACED in place (id 'custom' stays the pin); the cache drops so the
  // next load() resolves the wire truth. Malformed wire data = rejected (never boots a broken
  // world — the customEntry hygiene law). Returns true when the roster now carries it.
  customWire(data) {
    try {
      if (!data || !Array.isArray(data.blocks) || !Array.isArray(data.spawnsFFA) || !data.nav || !data.nav.nodes) return false;
      const name = String(data.name || 'CUSTOM').toUpperCase().slice(0, 12);
      if (this._custom) { this._custom.custom = data; this._custom.name = name; }
      else { this._custom = { id: 'custom', name, file: null, custom: data, desc: 'hub-registered authored stage — T140 G-3' }; this.roster.unshift(this._custom); }
      this._cache.delete('custom');
      return true;
    } catch (e) { return false; }
  },
};
