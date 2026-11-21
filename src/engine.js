// Game engine: plain JS state, driven by the Arena's animation loop.

export const MODES = {
  gridshot: {
    name: 'Gridshot',
    skill: 'Speed and target switching',
    blurb: 'Three targets on screen at once. Clear them as fast as you can without spraying clicks.',
    timed: true,
    higherBetter: true,
  },
  flick: {
    name: 'Flick',
    skill: 'Flicking',
    blurb: 'One target at a time, always far from your last click. Snap to it in one motion.',
    timed: true,
    higherBetter: true,
  },
  precision: {
    name: 'Precision',
    skill: 'Micro-adjustment',
    blurb: 'Targets shrink until they vanish. Hit them while they are still there.',
    timed: true,
    higherBetter: true,
  },
  tracking: {
    name: 'Tracking',
    skill: 'Smooth tracking',
    blurb: 'Keep your crosshair on a target that keeps changing direction. No clicking needed.',
    timed: true,
    higherBetter: true,
  },
  reaction: {
    name: 'Reaction',
    skill: 'Reaction time',
    blurb: 'Wait for the target, then click anywhere the instant it appears. Five rounds.',
    timed: false,
    higherBetter: false,
  },
};

export const MODE_ORDER = ['gridshot', 'flick', 'precision', 'tracking', 'reaction'];
export const SIZES = { S: 14, M: 22, L: 32 };
export const REACTION_ROUNDS = 5;
const PRECISION_LIFE = 1700;

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

function margin(g, r) {
  return r + 12;
}

function randomPoint(g, r) {
  const m = margin(g, r);
  return { x: rand(m, g.w - m), y: rand(m + 40, g.h - m) }; // leave room for the HUD
}

function addTarget(g, x, y, r, now) {
  g.targets.push({ id: g.nextId++, x, y, r, born: now });
}

function spawnGrid(g, now, avoidCell) {
  const cols = 5;
  const rows = 4;
  const areaW = Math.min(g.w * 0.62, 720);
  const areaH = Math.min(g.h * 0.62, 460);
  const x0 = (g.w - areaW) / 2;
  const y0 = (g.h - areaH) / 2 + 16;
  const taken = new Set(g.targets.map((t) => t.cell));
  if (avoidCell !== undefined) taken.add(avoidCell);
  const free = [];
  for (let i = 0; i < cols * rows; i++) if (!taken.has(i)) free.push(i);
  const cell = free[Math.floor(Math.random() * free.length)];
  const cx = cell % cols;
  const cy = Math.floor(cell / cols);
  const x = x0 + (cx + 0.5) * (areaW / cols);
  const y = y0 + (cy + 0.5) * (areaH / rows);
  g.targets.push({ id: g.nextId++, x, y, r: g.r * 1.15, born: now, cell });
}

function spawnFlick(g, now) {
  const minD = Math.min(g.w, g.h) * 0.32;
  let p = randomPoint(g, g.r);
  for (let i = 0; i < 40; i++) {
    if (dist(p.x, p.y, g.lastPos.x, g.lastPos.y) >= minD) break;
    p = randomPoint(g, g.r);
  }
  addTarget(g, p.x, p.y, g.r, now);
}

function spawnPrecision(g, now) {
  const r = g.r * 0.95;
  const p = randomPoint(g, r);
  addTarget(g, p.x, p.y, r, now);
}

export function currentRadius(g, t, now) {
  if (g.mode !== 'precision') return t.r;
  return Math.max(0, t.r * (1 - (now - t.born) / PRECISION_LIFE));
}

export function createGame(mode, settings, w, h, now) {
  const g = {
    mode,
    w,
    h,
    r: SIZES[settings.size] || SIZES.M,
    start: now,
    duration: settings.duration * 1000,
    targets: [],
    fx: [],
    hits: 0,
    misses: 0,
    expired: 0,
    clicks: [],
    kills: [],
    lastPos: { x: w / 2, y: h / 2 },
    lastKillAt: now,
    nextId: 1,
    pointer: { x: w / 2, y: h / 2, inside: false },
    done: false,
  };

  if (mode === 'gridshot') for (let i = 0; i < 3; i++) spawnGrid(g, now);
  if (mode === 'flick') spawnFlick(g, now);
  if (mode === 'precision') spawnPrecision(g, now);
  if (mode === 'tracking') {
    addTarget(g, w / 2, h / 2, g.r * 1.6, now);
    g.heading = rand(0, Math.PI * 2);
    g.turnRate = rand(-2.5, 2.5);
    g.nextTurn = now + rand(400, 1100);
    g.speed = Math.min(w, h) * 0.38;
    g.speedMul = 1;
    g.onTime = 0;
    g.total = 0;
    g.onStreak = 0;
    g.bestStreak = 0;
  }
  if (mode === 'reaction') {
    g.round = 0;
    g.times = [];
    g.early = 0;
    g.state = 'wait';
    g.showAt = now + rand(1300, 3600);
  }
  return g;
}

export function timeLeft(g, now) {
  if (!MODES[g.mode].timed) return null;
  return Math.max(0, g.duration - (now - g.start));
}

export function update(g, now, dt) {
  if (g.done) return;
  if (MODES[g.mode].timed && now - g.start >= g.duration) {
    g.done = true;
    return;
  }
  g.fx = g.fx.filter((f) => now - f.at < 320);

  if (g.mode === 'precision') {
    for (const t of [...g.targets]) {
      if (currentRadius(g, t, now) <= 0) {
        g.expired++;
        g.targets = g.targets.filter((o) => o.id !== t.id);
        g.fx.push({ id: g.nextId++, x: t.x, y: t.y, at: now, kind: 'expire' });
        spawnPrecision(g, now);
      }
    }
  }

  if (g.mode === 'tracking') {
    const t = g.targets[0];
    if (now >= g.nextTurn) {
      // Mix gentle curves with the occasional hard reversal, the way players strafe.
      if (Math.random() < 0.28) g.heading += Math.PI + rand(-0.5, 0.5);
      g.turnRate = rand(-3, 3);
      g.speedMul = rand(0.65, 1.35);
      g.nextTurn = now + rand(350, 1200);
    }
    g.heading += g.turnRate * dt;
    const v = g.speed * g.speedMul;
    t.x += Math.cos(g.heading) * v * dt;
    t.y += Math.sin(g.heading) * v * dt;
    const m = margin(g, t.r);
    const top = m + 40;
    if (t.x < m || t.x > g.w - m) {
      t.x = Math.min(Math.max(t.x, m), g.w - m);
      g.heading = Math.PI - g.heading;
    }
    if (t.y < top || t.y > g.h - m) {
      t.y = Math.min(Math.max(t.y, top), g.h - m);
      g.heading = -g.heading;
    }
    g.total += dt;
    const on = g.pointer.inside && dist(g.pointer.x, g.pointer.y, t.x, t.y) <= t.r;
    t.on = on;
    if (on) {
      g.onTime += dt;
      g.onStreak += dt;
      g.bestStreak = Math.max(g.bestStreak, g.onStreak);
    } else {
      g.onStreak = 0;
    }
  }

  if (g.mode === 'reaction' && g.state === 'wait' && now >= g.showAt) {
    g.state = 'show';
    g.shownAt = now;
    g.targets = [];
    addTarget(g, g.w / 2, g.h / 2 + 10, g.r * 2.2, now);
  }
}

// Returns 'hit' | 'miss' | 'early' | null so the UI can play a sound.
export function click(g, x, y, now) {
  if (g.done) return null;

  if (g.mode === 'tracking') return null;

  if (g.mode === 'reaction') {
    if (g.state === 'wait') {
      g.early++;
      g.showAt = now + rand(1300, 3600);
      g.fx.push({ id: g.nextId++, x, y, at: now, kind: 'expire' });
      return 'early';
    }
    g.times.push(now - g.shownAt);
    g.round++;
    g.targets = [];
    g.fx.push({ id: g.nextId++, x, y, at: now, kind: 'hit' });
    if (g.round >= REACTION_ROUNDS) g.done = true;
    else {
      g.state = 'wait';
      g.showAt = now + rand(1300, 3600);
    }
    return 'hit';
  }

  if (!g.targets.length) return null;

  // Judge the click against the nearest target.
  let best = null;
  let bestD = Infinity;
  for (const t of g.targets) {
    const d = dist(x, y, t.x, t.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  const t = best;
  const curR = Math.max(currentRadius(g, t, now), 2);
  const hit = bestD <= curR;

  // Offset of the click from the target centre, in target radii,
  // split into "along the flick" (overshoot +, undershoot -) and "across it".
  const ox = (x - t.x) / t.r;
  const oy = (y - t.y) / t.r;
  const tx = t.x - g.lastPos.x;
  const ty = t.y - g.lastPos.y;
  const travel = Math.hypot(tx, ty);
  const rec = { ox, oy, hit, along: null, perp: null };
  if (travel > t.r * 3 && bestD < t.r * 4) {
    const ux = tx / travel;
    const uy = ty / travel;
    rec.along = ox * ux + oy * uy;
    rec.perp = -ox * uy + oy * ux;
  }
  g.clicks.push(rec);
  g.lastPos = { x, y };

  if (hit) {
    g.hits++;
    g.kills.push(now - (g.mode === 'gridshot' ? g.lastKillAt : t.born));
    g.lastKillAt = now;
    g.targets = g.targets.filter((o) => o.id !== t.id);
    g.fx.push({ id: g.nextId++, x: t.x, y: t.y, at: now, kind: 'hit' });
    if (g.mode === 'gridshot') spawnGrid(g, now, t.cell);
    if (g.mode === 'flick') spawnFlick(g, now);
    if (g.mode === 'precision') spawnPrecision(g, now);
    return 'hit';
  }
  g.misses++;
  g.fx.push({ id: g.nextId++, x, y, at: now, kind: 'miss' });
  return 'miss';
}

export function liveStats(g, now) {
  if (g.mode === 'tracking') {
    const pct = g.total ? (g.onTime / g.total) * 100 : 0;
    return [{ label: 'On target', value: `${pct.toFixed(0)}%` }];
  }
  if (g.mode === 'reaction') {
    return [
      { label: 'Round', value: `${Math.min(g.round + 1, REACTION_ROUNDS)}/${REACTION_ROUNDS}` },
      { label: 'Last', value: g.times.length ? `${Math.round(g.times[g.times.length - 1])} ms` : '–' },
    ];
  }
  const shots = g.hits + g.misses + g.expired;
  return [
    { label: 'Hits', value: g.hits },
    { label: 'Accuracy', value: shots ? `${Math.round((g.hits / shots) * 100)}%` : '–' },
  ];
}

export function summarize(g) {
  const base = { mode: g.mode, at: Date.now(), size: null };
  if (g.mode === 'tracking') {
    const pct = g.total ? (g.onTime / g.total) * 100 : 0;
    return { ...base, score: Math.round(pct * 10), onPct: pct, bestStreak: g.bestStreak };
  }
  if (g.mode === 'reaction') {
    const avg = mean(g.times);
    return {
      ...base,
      score: Math.round(avg),
      avg,
      best: Math.min(...g.times),
      times: g.times,
      early: g.early,
    };
  }
  const shots = g.hits + g.misses + g.expired;
  const acc = shots ? g.hits / shots : 0;
  const perHit = g.mode === 'precision' ? 150 : 100;
  const flicks = g.clicks.filter((c) => c.along !== null);
  return {
    ...base,
    score: Math.round(g.hits * perHit * acc),
    hits: g.hits,
    misses: g.misses,
    expired: g.expired,
    acc,
    avgKill: mean(g.kills),
    perMin: g.hits / (g.duration / 60000),
    along: flicks.length >= 4 ? mean(flicks.map((c) => c.along)) : null,
    perp: flicks.length >= 4 ? mean(flicks.map((c) => c.perp)) : null,
    spread: flicks.length >= 4 ? mean(flicks.map((c) => Math.hypot(c.along, c.perp))) : null,
    flicks: flicks.slice(-80).map((c) => [c.along, c.perp, c.hit ? 1 : 0]),
  };
}

// Plain-language coaching based on what the numbers show.
export function coach(s) {
  const tips = [];
  if (s.mode === 'tracking') {
    if (s.onPct < 45)
      tips.push(
        'You are spending most of the time chasing. Move with the target rather than towards where it was: watch its direction, not just its position.',
      );
    else if (s.onPct < 70)
      tips.push(
        'Solid base. When the target reverses you lose it for a moment. Expect the change: keep a light grip so you can react without overcorrecting.',
      );
    else
      tips.push('Strong tracking. Try the small target size to make it harder.');
    if (s.bestStreak < 1.5)
      tips.push('Your longest stretch on target was short. Aim to stay on for two seconds at a time before worrying about the total.');
    tips.push('Track with your arm for big movements and fingers or wrist for small corrections.');
    return tips;
  }
  if (s.mode === 'reaction') {
    if (s.early > 0)
      tips.push(`You clicked early ${s.early} time${s.early > 1 ? 's' : ''}. Reacting to the target beats guessing the timing.`);
    if (s.avg > 320)
      tips.push('Your average is on the slow side. Rest your finger on the button with slight pressure so the click is a twitch, not a press.');
    else if (s.avg > 250)
      tips.push('That is a typical human range. Sleep, warm-up and a relaxed hand move this number more than practice does.');
    else tips.push('Very quick reactions. Your gains now come from aim, not reflexes.');
    return tips;
  }

  if (s.acc < 0.75)
    tips.push('Accuracy is under 75%. Slow down until you hit 85% or more, then build speed back. Missed shots cost more than slow ones.');
  if (s.along !== null) {
    if (s.along > 0.25)
      tips.push('You overshoot: your clicks land past the target in the direction you moved. Ease off before the end of each flick, or try a slightly lower sensitivity.');
    else if (s.along < -0.25)
      tips.push('You stop short and correct afterwards. Commit to the full distance of the flick; a slightly higher sensitivity can also help.');
    if (Math.abs(s.perp) > 0.25)
      tips.push('Your clicks drift to one side of your movement path. Check that your mouse is held straight and your arm is not angled.');
  }
  if (s.acc >= 0.92 && s.avgKill > (s.mode === 'gridshot' ? 520 : 700))
    tips.push('Accuracy is excellent, so you can afford to push speed. Move first and let your accuracy catch up.');
  if (!tips.length) tips.push('Well balanced speed and accuracy. Try a smaller target size or a 60 second round to push further.');
  return tips.slice(0, 3);
}

export function formatScore(s) {
  if (s.mode === 'reaction') return `${s.score} ms`;
  if (s.mode === 'tracking') return `${s.onPct.toFixed(1)}%`;
  return s.score.toLocaleString();
}

export function isBetter(mode, a, b) {
  return MODES[mode].higherBetter ? a > b : a < b;
}
