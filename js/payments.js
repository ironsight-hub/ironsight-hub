// ============================================================
// IRONSIGHT — payments.js : the T134 real-money checkout leg
// (currency redemption engine for the token shop)
// PSP-AGNOSTIC (the tokens.js v1.74 law kept): the BUY leg opens a
// PER-PACK HOSTED CHECKOUT URL (any provider's link — a PayPal payment
// link, a Lemon Squeezy product page, any MoR) and the REDEEM leg
// verifies a Lemon Squeezy license key CLIENT-SIDE (the LS License
// API IS the zero-backend verifier — api.lemonsqueezy.com/v1/licenses).
//
// THE NATIVE-FACE LAW (user: "not use their insignias (must look
// native) like CoD"): ZERO provider branding in the game UI — the
// provider's hosted checkout page carries its own face; ours stays
// IronSight. The FTC law (tokens.js header: explicit confirm, no dark
// patterns, plain terms) rides the SAME confirm modal as the sandbox.
//
// THE METHODS (recon T134, docs-first): PayPal Payment Links carry
// PayPal + Venmo + Apple Pay + major cards (developer.paypal.com
// payment-links-buttons, updated 2026-08; ~3.49% + $0.49 US standard).
// Lemon Squeezy checkout carries PayPal + Apple Pay (Safari) + cards
// (docs.lemonsqueezy.com help/checkout/payment-methods; 5% + $0.50,
// +1.5% PayPal surcharge, MoR = global tax handled). Both non-Stripe.
//
// THE HONEST TRUST BOUNDARY: the deploy surface is a static Space —
// no server reads a webhook. The credited balance is therefore a LOCAL
// wallet (localStorage): the license key is verified by LS's servers
// and fenced by LS activation limits + a local key ledger, but the
// wallet itself binds to the BROWSER, and spending it server-side
// (the eco ops) is the follow-up webhook tier. Documented, not hidden.
// Pure module: no imports, no DOM — bun-importable (the tokens.js law).
// ============================================================

// per-pack checkout URL lookup — cfg = CFG.PAY, pack = a TK_PACKS row
export function checkoutUrl(cfg, pack) {
  if (!cfg || !pack) return '';
  const t = cfg.checkout || {};
  return (t[pack.id] || '').trim();
}

// ---- the local wallet (the credited face; the browser binds the balance) ----
const WALLET_KEY = 'ironsight.wallet.v1';

export function walletLoad() {
  try {
    const w = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}');
    return { tk: w.tk | 0, hist: Array.isArray(w.hist) ? w.hist : [], keys: Array.isArray(w.keys) ? w.keys : [] };
  } catch { return { tk: 0, hist: [], keys: [] }; }
}

export function walletSave(w) { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch { /* private-mode — the wallet stays session-only */ } }

export function walletCredit(pack, source) { // source: 'license' | 'sandbox' | … (the receipt's origin tag)
  const w = walletLoad();
  w.tk = (w.tk | 0) + (pack.tk | 0);
  w.hist.push({ pack: pack.id, tk: pack.tk | 0, usd: pack.usd, t: Date.now(), src: source || 'pay' });
  while (w.hist.length > 20) w.hist.shift(); // the TK_HIST_CAP law (tokens.js)
  walletSave(w);
  return w;
}

export function walletHas(srcId) { return walletLoad().keys.indexOf(srcId) !== -1; } // srcId = the license key (lowercased) — the device-side replay fence
export function walletMark(srcId) {
  const w = walletLoad();
  w.keys.push(srcId);
  while (w.keys.length > 64) w.keys.shift(); // the fence ledger stays bounded
  walletSave(w);
}

// ---- the Lemon Squeezy license redeem engine ----
// validate:  GET  {LS_API}validate?license_key=K
// activate:  POST {LS_API}activate   (license_key + instance_name, form-urlencoded)
// (docs.lemonsqueezy.com/api/license-api — JSON, 60 req/min, status ∈
//  active|inactive|expired|disabled)
export const LS_API = 'https://api.lemonsqueezy.com/v1/licenses/';

// map a validated license to a pack — meta.product_name/variant_name are
// matched by the CONFIGURED name-contains rows (cfg.lsProductMap); no match
// is an honest error, never a guess.
export function packForLicense(cfg, meta) {
  const rows = (cfg && cfg.lsProductMap) || [];
  const m = meta || {};
  const hay = (String(m.product_name || '') + ' ' + String(m.variant_name || '')).toLowerCase();
  for (const r of rows) {
    if (r && r.contains && hay.indexOf(String(r.contains).toLowerCase()) !== -1) return r.pack || null;
  }
  return null;
}

export async function redeemLS(cfg, key, instanceName) {
  const k = String(key || '').trim();
  if (!k) return { ok: false, error: 'empty' };
  const hdrs = { Accept: 'application/json' };
  let v = null;
  try {
    const r = await fetch(LS_API + 'validate?license_key=' + encodeURIComponent(k), { headers: hdrs });
    v = await r.json();
  } catch (e) {
    return { ok: false, error: 'unreachable' }; // network/CORS — surfaced verbatim in the shop face (the honest failure)
  }
  if (!v || !v.valid) return { ok: false, error: (v && v.error) || 'invalid' };
  if (v.status === 'expired' || v.status === 'disabled') return { ok: false, error: v.status };
  const packId = packForLicense(cfg, v.meta || {});
  if (!packId) return { ok: false, error: 'unmapped' };
  // the activation call — LS's instance ledger is the cross-device replay
  // fence (default 5 activations). A failed activation does NOT fail the
  // redeem: validation already proved the key server-side, and the local
  // key mark below fences THIS device.
  if (v.activation_limit === undefined || v.activation_usage === undefined || v.activation_usage < v.activation_limit) {
    try {
      const a = await fetch(LS_API + 'activate', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'license_key=' + encodeURIComponent(k) + '&instance_name=' + encodeURIComponent(instanceName || 'ironsight'),
      }).then(x => x.json());
      if (a && a.error && a.activated === undefined && a.license_key === undefined) return { ok: false, error: String(a.error) };
    } catch (e) { /* the fence note above */ }
  }
  return { ok: true, packId, status: v.status || 'active' };
}

// the SANDBOX leg kept honest (pre-T134 behavior, now tagged in the face):
// the modal confirm IS the simulated PSP approval — no network, no credit
// unless the eco server (the room service) answers the tkpack op.
export const SANDBOX_TAG = ' · SANDBOX';
