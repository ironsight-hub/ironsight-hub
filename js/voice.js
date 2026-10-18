// ============================================================
// IRONSIGHT — voice.js [T124 C2 G-4] : push-to-talk voice chat.
// Design law (the GAP_LEDGER G-4 infra-spike verdict): the ROOM SERVICE owns the
// transport — socket.io already carries the room, so a second RTC stack would be a
// second truth. This module is the CLIENT half only:
//   capture   getUserMedia → AudioWorklet (shared game ctx) → linear resample 16k
//             Int16 → 40 ms frames → socket.emit('voice', {s:seq}, ArrayBuffer)
//             ONLY while the PTT action is held (Input.binds.ptt — the lobby-hygiene
//             law: the mic is NEVER open off-key) and ONLY in MP (joined).
//   playback  room relay → per-speaker HRTF panner chain (gain→panner→voiceBus) —
//             proximity is CLIENT-side: receivers attenuate by the speaker's live
//             interpolated mesh position, hard-gated at 45 m (voice silence beyond).
//             Chunk-scheduled AudioBuffers with drift correction (no jitter-buffer
//             machinery — 40 ms frames scheduled back-to-back on one clock).
//   UI        self-managed #voice-ui badge (the [T124 C3b] native-skin law — styles
//             live in style.css, zero index.html churn): MIC tx chip + talker chips.
// Server contract (mini-services/ironsight-room/index.ts socket.on('voice')):
//   d = { i: senderActorId, s: seq }, bin = ArrayBuffer Int16 @16k ≤1600 B.
// Zero-stub: every face real; the offline path never runs this (mp.js gates).
// ============================================================
import { Input } from './input.js';
import { voiceBus } from './audio.js';

const SR = 16000;                 // voice band sample rate (16 kHz — the telephony law)
const FRAME = 640;                // 40 ms @16k samples per wire frame
const TX_SILENCE = 0.007;         // RMS gate: skip near-silent frames (bandwidth hygiene, not VAD theater)
const HEAR_MAX = 45;              // hard hearing gate (m) — exponential panners have no maxDistance cutoff
const TALK_T = 0.7;               // talk-chip hold after the last packet (s)
const GC_T = 12;                  // speaker GC after the last packet (s)

// The capture worklet — inline via Blob URL (no extra fetch; the module law keeps
// voice self-contained). Linear resampler: fractional-index interpolation from the
// context rate down to 16k, packed to Int16, posted as a transferable 40 ms frame.
const WORKLET_SRC = `
class VCap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / ${SR};
    this.frac = 0; this.prev = 0;
    this.out = new Float32Array(${FRAME}); this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i];
      while (this.frac < 1) {
        const v = this.prev + (s - this.prev) * this.frac;
        this.out[this.n++] = v;
        if (this.n >= ${FRAME}) {
          const pcm = new Int16Array(${FRAME});
          for (let j = 0; j < ${FRAME}; j++) {
            const x = Math.max(-1, Math.min(1, this.out[j]));
            pcm[j] = x < 0 ? x * 0x8000 : x * 0x7fff;
          }
          this.port.postMessage(pcm.buffer, [pcm.buffer]);
          this.n = 0;
        }
        this.frac += this.step;
      }
      this.frac -= 1;
      this.prev = s;
    }
    return true;
  }
}
registerProcessor('vcap', VCap);
`;

export const voice = {
  on: false,          // runtime master (settings.voiceOn mirror — live-applied)
  tx: false,          // transmitting right now (badge face)
  ready: false,       // capture chain built
  err: null,          // last capture error (honest face — badge shows it once)
};

let S = null;                  // settings ref ({ voiceOn, volVoice })
let socket = null;             // the mp socket (set by mp.js on settle)
let env = null;                // { remotes, player, spec } — refreshed per tick by mp.js
let seq = 0;                   // outgoing frame seq
let pttHeld = false;           // rising-edge tracker
let micStream = null, worklet = null, capSrc = null, capCtxBus = null;
let speakers = new Map();      // actorId -> { pan, gain, nextT, lastSeq, talkT, gcT, dist, gcOff }
let ui = null;                 // #voice-ui root
let uiLast = '';               // badge DOM write gate (no per-frame innerHTML churn)

// ---------- wire (mp.js owns the socket lifecycle) ----------
export function setSocket(s) {
  if (socket && socket !== s) releaseCapture(); // a NEW socket = an old session's capture chain is stale
  socket = s || null;
}
export function reset() { // disconnect/rematch seam — playback state dies, capture lives (the permission grant is sticky-honest: the tab keeps the mic indicator while voiceOn)
  for (const sp of speakers.values()) { try { sp.pan.disconnect(); sp.gain.disconnect(); } catch (_) {} }
  speakers = new Map();
  seq = 0;
}

// ---------- settings (main.js applySettings fan-out) ----------
export function applySettings(s) {
  S = s;
  voice.on = !!(s && s.voiceOn);
  for (const sp of speakers.values()) sp.gain.gain.value = (S && S.volVoice) != null ? S.volVoice : 0.8;
  if (!voice.on) { voice.tx = false; }
}

// ---------- badge (self-managed DOM — the C3b native-skin law) ----------
function badge() {
  if (ui) return ui;
  ui = document.createElement('div');
  ui.id = 'voice-ui';
  ui.innerHTML = '<div class="v-tx" id="v-tx">MIC</div><div class="v-talkers" id="v-talkers"></div>';
  document.body.appendChild(ui);
  return ui;
}
function drawBadge() {
  const b = badge();
  let face = '';
  if (voice.err) face = '<span class="v-err">MIC OFF</span>';
  else {
    if (voice.tx) face += '<span class="v-tx on">MIC</span>';
    const talking = [];
    for (const [id, sp] of speakers) if (sp.talkT > 0) {
      const r = env && env.remotes && env.remotes.get(id);
      talking.push((r && r.name) || 'PLAYER');
    }
    if (talking.length) face += '<span class="v-talk">' + talking.map(n => '◉ ' + n.replace(/</g, '&lt;')).join('</span><span class="v-talk">') + '</span>';
  }
  if (face !== uiLast) {
    uiLast = face;
    const tx = b.querySelector('#v-tx'), tk = b.querySelector('#v-talkers');
    tx.className = 'v-tx' + (voice.tx ? ' on' : '');
    tx.style.display = voice.tx || voice.err ? '' : 'none';
    if (voice.err) { tx.textContent = 'MIC OFF'; tx.className = 'v-tx err'; tx.style.display = ''; }
    tk.innerHTML = talking.length ? talking.map(n => '<span class="v-talk">◉ ' + n.replace(/</g, '&lt;') + '</span>').join('') : '';
  }
}

// ---------- capture ----------
async function ensureCapture() {
  if (voice.ready || !capCtxBus) return;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
    await capCtxBus.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    worklet = new AudioWorkletNode(capCtxBus.ctx, 'vcap');
    worklet.port.onmessage = (e) => onFrame(e.data);
    capSrc = capCtxBus.ctx.createMediaStreamSource(micStream);
    capSrc.connect(worklet); // the worklet is a DEAD END (no connect to destination) — no monitor loopback, the echo law at the graph level
    voice.ready = true;
    voice.err = null;
  } catch (e) {
    voice.err = (e && e.name === 'NotAllowedError') ? 'denied' : 'fail';
    console.warn('[voice] capture unavailable:', e && e.message);
  }
}
function releaseCapture() {
  try { if (capSrc) capSrc.disconnect(); } catch (_) {}
  try { if (worklet) worklet.disconnect(); } catch (_) {}
  if (micStream) for (const t of micStream.getTracks()) t.stop();
  micStream = null; worklet = null; capSrc = null;
  voice.ready = false; voice.tx = false;
}
function onFrame(buf) {
  if (!socket || !socket.connected || !voice.on || !env || env.spec) return;
  if (!pttHeld || !env.joined) return; // the PTT gate — the mic NEVER transmits off-key
  const pcm = new Int16Array(buf);
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) { const v = pcm[i] / 32768; sum += v * v; }
  if (Math.sqrt(sum / pcm.length) < TX_SILENCE) return; // near-silence hygiene: the rate budget is not spent on room tone
  socket.emit('voice', { s: seq++ }, buf); // socket.io attaches the ArrayBuffer as binary
  voice.tx = true;
}

// ---------- playback ----------
function speakerFor(id) {
  let sp = speakers.get(id);
  if (sp) return sp;
  const bus = capCtxBus || voiceBus();
  const pan = bus.ctx.createPanner();
  pan.panningModel = 'HRTF'; pan.distanceModel = 'exponential';
  pan.refDistance = 5; pan.rolloffFactor = 1.5;
  pan.positionZ && (pan.positionZ.value = 0);
  const gain = bus.ctx.createGain();
  gain.gain.value = (S && S.volVoice) != null ? S.volVoice : 0.8;
  gain.connect(pan); pan.connect(bus.in);
  sp = { pan, gain, nextT: 0, lastSeq: -1, talkT: 0, gcT: 0, dist: 0 };
  speakers.set(id, sp);
  return sp;
}
export function onPacket(d) { // [T140] EXPORTED — mp.js's socket handler is the sole caller (the module-graph law: an unexported named import is a link-time death for the whole graph)
  if (!voice.on || !d || typeof d !== 'object') return;
  const bin = d.a;
  if (!(bin instanceof ArrayBuffer) || bin.byteLength < 80 || bin.byteLength % 2 !== 0) return;
  const bus = capCtxBus || voiceBus();
  if (!bus) return;
  const sp = speakerFor(d.i);
  if (d.s <= sp.lastSeq) return; // seq guard (ordered on WS — defense in depth, the §10 law's client mirror)
  sp.lastSeq = d.s;
  sp.talkT = TALK_T; sp.gcT = 0;
  if (sp.dist > HEAR_MAX) return; // proximity hard gate (exponential panners never clamp)
  const n = bin.byteLength >> 1;
  const f32 = new Float32Array(n);
  const pcm = new Int16Array(bin);
  for (let i = 0; i < n; i++) f32[i] = pcm[i] / 32768;
  const ab = bus.ctx.createBuffer(1, n, SR);
  ab.copyToChannel(f32, 0);
  const src = bus.ctx.createBufferSource();
  src.buffer = ab; src.connect(sp.gain);
  const now = bus.ctx.currentTime;
  if (sp.nextT < now + 0.02) sp.nextT = now + 0.03; // drift correction: underrun resets the schedule (40 ms frames make gaps inaudible)
  src.start(sp.nextT);
  sp.nextT += n / SR + 0.002; // +2 ms guard against consecutive-start clipping
}

// ---------- per-frame (mp.js mpFrame — the MP-only path) ----------
export function tick(dt, e) {
  env = e || env;
  if (!capCtxBus) capCtxBus = voiceBus();
  if (!capCtxBus) return; // audio not booted yet (pre-gesture) — the game never transmits/plays before initAudio
  // PTT edge (Input is the single key law — the bind is rebindable, hold action)
  const down = voice.on && Input.actionDown('ptt');
  if (down && !pttHeld) {
    pttHeld = true;
    if (voice.err) voice.err = null; // re-try on a fresh press (the user may have fixed the permission)
    if (!voice.ready) ensureCapture(); // sticky capture: granted once, gated per-frame by pttHeld
  } else if (!down && pttHeld) {
    pttHeld = false;
    voice.tx = false;
  }
  if (!down) voice.tx = false;
  // speaker positions ride the interpolated remote meshes (the listener is main.js's per-frame updateListener)
  if (env && env.remotes) {
    const p = env.player && env.player.pos;
    for (const [id, sp] of speakers) {
      const r = env.remotes.get(id);
      if (r) {
        const mp3 = r.mesh.position;
        if (sp.pan.positionX) {
          sp.pan.positionX.value = mp3.x; sp.pan.positionY.value = mp3.y + 1.2; sp.pan.positionZ.value = mp3.z;
        } else sp.pan.setPosition(mp3.x, mp3.y + 1.2, mp3.z);
        sp.dist = p ? Math.hypot(mp3.x - p.x, mp3.y - p.y, mp3.z - p.z) : 0;
        sp.gcT = 0;
      } else {
        sp.gcT += dt;
        if (sp.gcT > GC_T) { try { sp.pan.disconnect(); sp.gain.disconnect(); } catch (_) {} speakers.delete(id); continue; }
      }
      sp.talkT = Math.max(0, sp.talkT - dt);
    }
  }
  drawBadge();
}

// probe surface (window.__voice via main.js installProbe idiom — read-only state)
export function probeState() {
  return { on: voice.on, tx: voice.tx, ready: voice.ready, err: voice.err, speakers: speakers.size, seq };
}
