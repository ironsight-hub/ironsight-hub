// ============================================================
// IRONSIGHT — history.js (S1, Task 73, spec §52.1) : local match
// history — IndexedDB, newest 20, zero wire. Mirrors the replay.js
// §26.3 IDB law: best-effort (every failure is caught + warned,
// NEVER thrown into game flow), browser-local only.
// Record: { id, t, mode, map, win, score, k, d, mp }
// ============================================================

const DB_NAME = 'ironsight.history.v1';
const STORE = 'matches';
const KEEP = 20; // newest-N retention (PARITY_DIFF: "last ~20 results")

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'));
    const q = indexedDB.open(DB_NAME, 1);
    q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(STORE)) q.result.createObjectStore(STORE, { keyPath: 'id' }); };
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error || new Error('idb-open'));
  });
}

// Put one finished match + prune to the newest KEEP (by t). Best-effort by contract.
export async function histPut(rec) {
  try {
    if (!rec || typeof rec !== 'object') return;
    const full = { id: rec.id || ('h' + rec.t + '-' + Math.random().toString(36).slice(2, 8)), t: rec.t || Date.now(), mode: rec.mode || '', map: rec.map || '', win: !!rec.win, score: rec.score || 0, k: rec.k || 0, d: rec.d || 0, mp: !!rec.mp };
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(full);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
    // prune: keep the newest KEEP by t
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).getAll();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => reject(rq.error);
    });
    if (all.length > KEEP) {
      const dead = all.sort((a, b) => b.t - a.t).slice(KEEP).map(r => r.id);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        for (const id of dead) st.delete(id);
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    }
  } catch (e) { console.warn('[history] persist unavailable (best-effort by contract §52.1)', e && e.message); }
}

// Newest-first list (up to n). Best-effort: failure = [] (history is decorative — never blocks UI).
export async function histList(n = KEEP) {
  try {
    const db = await idbOpen();
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).getAll();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => reject(rq.error);
    });
    return all.sort((a, b) => b.t - a.t).slice(0, n);
  } catch (e) { return []; }
}

export async function histClear() {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } catch (e) { console.warn('[history] clear unavailable', e && e.message); }
}
