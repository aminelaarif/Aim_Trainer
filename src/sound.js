let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

const SOUNDS = {
  hit: { f: 880, f2: 1320, d: 0.07, type: 'triangle', v: 0.18 },
  miss: { f: 160, f2: 90, d: 0.09, type: 'sine', v: 0.22 },
  early: { f: 220, f2: 110, d: 0.2, type: 'square', v: 0.08 },
  tick: { f: 520, f2: 520, d: 0.05, type: 'sine', v: 0.12 },
  go: { f: 780, f2: 1040, d: 0.14, type: 'triangle', v: 0.16 },
  end: { f: 660, f2: 330, d: 0.3, type: 'triangle', v: 0.16 },
};

export function playSound(name, enabled) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (!enabled || name === 'unlock') return;
  const s = SOUNDS[name];
  if (!s) return;
  try {
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = s.type;
    o.frequency.setValueAtTime(s.f, t);
    o.frequency.exponentialRampToValueAtTime(s.f2, t + s.d);
    g.gain.setValueAtTime(s.v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + s.d);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + s.d + 0.02);
  } catch {
    /* audio unavailable */
  }
}
