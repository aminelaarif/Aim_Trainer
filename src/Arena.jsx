import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MODES,
  createGame,
  update,
  click,
  liveStats,
  summarize,
  timeLeft,
  currentRadius,
  REACTION_ROUNDS,
} from './engine.js';
import { playSound } from './sound.js';

function Crosshair({ x, y, style, color }) {
  const s = { transform: `translate(${x}px, ${y}px)`, '--ch': color };
  return (
    <div className={`crosshair ch-${style}`} style={s} aria-hidden="true">
      {style === 'cross' && (
        <>
          <span className="ch-l ch-top" />
          <span className="ch-l ch-bottom" />
          <span className="ch-l ch-left" />
          <span className="ch-l ch-right" />
          <span className="ch-dot" />
        </>
      )}
      {style === 'dot' && <span className="ch-dot big" />}
      {style === 'circle' && (
        <>
          <span className="ch-ring" />
          <span className="ch-dot" />
        </>
      )}
    </div>
  );
}

export default function Arena({ mode, settings, onFinish, autoStart, routineLabel }) {
  const ref = useRef(null);
  const game = useRef(null);
  const raf = useRef(0);
  const timer = useRef(0);
  const [phase, setPhase] = useState('ready'); // ready | countdown | running
  const [count, setCount] = useState(3);
  const [, setFrame] = useState(0);
  const pointer = useRef({ x: 0, y: 0, inside: false });

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    clearInterval(timer.current);
    game.current = null;
  }, []);

  // Reset whenever the mode or settings change.
  useEffect(() => {
    stop();
    setPhase('ready');
  }, [mode, settings.size, settings.duration, stop]);

  useEffect(() => () => stop(), [stop]);

  const begin = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    playSound('unlock', settings.sound);
    setPhase('countdown');
    setCount(3);
    let n = 3;
    clearInterval(timer.current);
    const iv = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        playSound('tick', settings.sound);
        return;
      }
      clearInterval(iv);
      const rect = el.getBoundingClientRect();
      const now = performance.now();
      game.current = createGame(mode, settings, rect.width, rect.height, now);
      game.current.pointer = pointer.current;
      setPhase('running');
      playSound('go', settings.sound);
      let last = now;
      const loop = (t) => {
        const g = game.current;
        if (!g) return;
        const dt = Math.min((t - last) / 1000, 0.05);
        last = t;
        update(g, t, dt);
        if (g.done) {
          const s = summarize(g);
          s.size = settings.size;
          s.duration = settings.duration;
          game.current = null;
          setPhase('ready');
          playSound('end', settings.sound);
          onFinish(s);
          return;
        }
        setFrame((f) => (f + 1) % 1e6);
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
    }, 600);
    timer.current = iv;
    playSound('tick', settings.sound);
  }, [mode, settings, onFinish]);

  // "Play again" from the results screen mounts the arena with autoStart.
  useEffect(() => {
    if (autoStart) begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && (game.current || timer.current)) {
        stop();
        setPhase('ready');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);

  const localPoint = (e) => {
    const rect = ref.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMove = (e) => {
    const p = localPoint(e);
    pointer.current.x = p.x;
    pointer.current.y = p.y;
    pointer.current.inside = true;
    if (!game.current) setFrame((f) => (f + 1) % 1e6);
  };

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const g = game.current;
    if (!g) return;
    e.preventDefault();
    const p = localPoint(e);
    pointer.current.x = p.x;
    pointer.current.y = p.y;
    pointer.current.inside = true;
    const res = click(g, p.x, p.y, performance.now());
    if (res) playSound(res, settings.sound);
  };

  const g = game.current;
  const now = performance.now();
  const info = MODES[mode];
  const left = g ? timeLeft(g, now) : null;
  const stats = g ? liveStats(g, now) : [];
  const p = pointer.current;

  return (
    <div
      className={`arena ${phase === 'running' ? 'is-running' : ''}`}
      ref={ref}
      onPointerMove={onMove}
      onPointerDown={onDown}
      onPointerLeave={() => {
        pointer.current.inside = false;
        setFrame((f) => (f + 1) % 1e6);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {phase === 'running' && g && (
        <>
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">{info.timed ? 'Time' : 'Mode'}</span>
              <span className="hud-value">
                {info.timed ? `${(left / 1000).toFixed(1)}` : info.name}
              </span>
            </div>
            {stats.map((s) => (
              <div className="hud-item" key={s.label}>
                <span className="hud-label">{s.label}</span>
                <span className="hud-value">{s.value}</span>
              </div>
            ))}
            <div className="hud-hint">Esc to stop</div>
          </div>
          {info.timed && (
            <div className="timebar">
              <span style={{ transform: `scaleX(${left / g.duration})` }} />
            </div>
          )}

          {mode === 'reaction' && g.state === 'wait' && (
            <div className="arena-msg">Wait for it…</div>
          )}

          {g.targets.map((t) => {
            const r = currentRadius(g, t, now);
            return (
              <div
                key={t.id}
                className={`target ${mode === 'tracking' ? 'tracking' : ''} ${t.on ? 'on' : ''}`}
                style={{
                  width: r * 2,
                  height: r * 2,
                  transform: `translate(${t.x - r}px, ${t.y - r}px)`,
                }}
              />
            );
          })}

          {g.fx.map((f) => (
            <div
              key={f.id}
              className={`fx fx-${f.kind}`}
              style={{ transform: `translate(${f.x}px, ${f.y}px)` }}
            />
          ))}
        </>
      )}

      {phase === 'countdown' && <div className="countdown" key={count}>{count}</div>}

      {phase === 'ready' && (
        <div className="ready">
          {routineLabel && <p className="ready-routine">{routineLabel}</p>}
          <h2 className="ready-title">{info.name}</h2>
          <p className="ready-blurb">{info.blurb}</p>
          <p className="ready-meta">
            {info.timed ? `${settings.duration} seconds` : `${REACTION_ROUNDS} rounds`}, {sizeName(settings.size)} targets
          </p>
          <button
            className="btn btn-primary"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={begin}
            autoFocus
          >
            Start
          </button>
        </div>
      )}

      {p.inside && phase !== 'ready' && (
        <Crosshair x={p.x} y={p.y} style={settings.crosshair} color={settings.color} />
      )}
    </div>
  );
}

function sizeName(s) {
  return { S: 'small', M: 'medium', L: 'large' }[s];
}
