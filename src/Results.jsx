import { useEffect } from 'react';
import { MODES, coach, formatScore } from './engine.js';

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// Where clicks landed, rotated so every flick travels left to right.
function BiasPlot({ flicks, along, perp }) {
  const S = 220;
  const c = S / 2;
  const unit = 30; // pixels per target radius
  const clamp = (v) => Math.max(-3.4, Math.min(3.4, v));
  return (
    <figure className="bias">
      <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} role="img" aria-label="Where your clicks landed relative to the target">
        <rect x="0" y="0" width={S} height={S} className="bias-bg" rx="10" />
        <line x1="0" y1={c} x2={S} y2={c} className="bias-axis" />
        <line x1={c} y1="0" x2={c} y2={S} className="bias-axis" />
        <circle cx={c} cy={c} r={unit * 2} className="bias-ring faint" />
        <circle cx={c} cy={c} r={unit} className="bias-ring" />
        <path d={`M ${14} ${S - 16} L ${S - 22} ${S - 16}`} className="bias-arrow" markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="bias-arrowhead" />
          </marker>
        </defs>
        {flicks.map(([a, p, h], i) => (
          <circle
            key={i}
            cx={c + clamp(a) * unit}
            cy={c + clamp(p) * unit}
            r="3.2"
            className={h ? 'dot-hit' : 'dot-miss'}
          />
        ))}
        {along !== null && (
          <g className="bias-mean" transform={`translate(${c + clamp(along) * unit} ${c + clamp(perp) * unit})`}>
            <line x1="-7" y1="0" x2="7" y2="0" />
            <line x1="0" y1="-7" x2="0" y2="7" />
          </g>
        )}
      </svg>
      <figcaption>
        Each dot is a click, turned so your mouse was always moving left to right (the arrow).
        Dots right of centre overshot, dots left of it stopped short. The cross is your average.
        <span className="legend">
          <i className="lg-hit" /> hit <i className="lg-miss" /> miss
        </span>
      </figcaption>
    </figure>
  );
}

function Spark({ history, mode }) {
  const pts = history.slice(-12);
  if (pts.length < 2) return null;
  const vals = pts.map((h) => (mode === 'tracking' ? h.onPct : h.score));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const W = 180;
  const H = 44;
  const xy = vals.map((v, i) => [
    (i / (vals.length - 1)) * (W - 8) + 4,
    H - 6 - ((v - min) / (max - min || 1)) * (H - 12),
  ]);
  const flip = !MODES[mode].higherBetter;
  return (
    <div className="spark">
      <span className="spark-label">
        Last {pts.length} rounds{flip ? ' (lower is better)' : ''}
      </span>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        <polyline points={xy.map((p) => p.join(',')).join(' ')} className="spark-line" />
        <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3.5" className="spark-dot" />
      </svg>
    </div>
  );
}

export default function Results({ result, best, isPB, history, onAgain, onBack, routine }) {
  const m = result.mode;
  const info = MODES[m];
  const tips = coach(result);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
        e.preventDefault();
        if (routine && routine.next) routine.onNext();
        else onAgain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAgain, routine]);

  let stats;
  if (m === 'tracking') {
    stats = [
      ['On target', `${result.onPct.toFixed(1)}%`],
      ['Longest stretch', `${result.bestStreak.toFixed(1)} s`],
    ];
  } else if (m === 'reaction') {
    stats = [
      ['Average', `${Math.round(result.avg)} ms`],
      ['Fastest', `${Math.round(result.best)} ms`],
      ['Early clicks', result.early],
    ];
  } else {
    stats = [
      ['Hits', result.hits],
      ['Accuracy', `${Math.round(result.acc * 100)}%`],
      [m === 'gridshot' ? 'Time per kill' : 'Time to hit', `${Math.round(result.avgKill)} ms`],
      ['Hits per minute', Math.round(result.perMin)],
    ];
    if (m === 'precision') stats.push(['Vanished', result.expired]);
  }

  return (
    <section className="results" aria-live="polite">
      <div className="results-head">
        <div>
          <p className="results-mode">
            {info.name}
            {routine && <span className="results-routine">Warm-up {routine.index + 1} of {routine.total}</span>}
          </p>
          <p className="results-score">{formatScore(result)}</p>
          <p className={`results-pb ${isPB ? 'is-pb' : ''}`}>
            {isPB
              ? 'New personal best'
              : best && best.at === result.at
                ? `First score at this target size${MODES[m].timed ? ' and round length' : ''}`
                : best
                  ? `Personal best ${formatScore(best)}`
                  : ''}
          </p>
        </div>
        <Spark history={history} mode={m} />
      </div>

      <div className="stats">
        {stats.map(([l, v]) => (
          <Stat key={l} label={l} value={v} />
        ))}
      </div>

      {m === 'reaction' && (
        <div className="rt-bars" aria-label="Reaction time for each round">
          {result.times.map((t, i) => (
            <div className="rt-bar" key={i}>
              <span style={{ width: `${Math.min(100, (t / 600) * 100)}%` }} />
              <em>{Math.round(t)} ms</em>
            </div>
          ))}
        </div>
      )}

      <div className={`results-body ${result.flicks ? 'has-plot' : ''}`}>
        {result.flicks && result.flicks.length > 3 && (
          <BiasPlot flicks={result.flicks} along={result.along} perp={result.perp} />
        )}
        <div className="tips">
          <h3>What to work on</h3>
          <ul>
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="results-actions">
        {routine && routine.next ? (
          <>
            <button className="btn btn-primary" onClick={routine.onNext}>
              Next: {MODES[routine.next].name}
            </button>
            <button className="btn" onClick={onAgain}>Repeat {info.name}</button>
            <button className="btn btn-quiet" onClick={routine.onQuit}>End warm-up</button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={onAgain}>Play again</button>
            <button className="btn" onClick={onBack}>
              {routine ? 'Finish warm-up' : 'Choose another mode'}
            </button>
          </>
        )}
        <span className="key-hint">Press R or Space to {routine && routine.next ? 'continue' : 'play again'}</span>
      </div>
    </section>
  );
}
