import { useCallback, useEffect, useState } from 'react';
import Arena from './Arena.jsx';
import Results from './Results.jsx';
import Learn, { ROUTINE } from './Learn.jsx';
import { MODES, MODE_ORDER, formatScore, isBetter } from './engine.js';

const KEY = 'aimrange.v1';
const DEFAULT_SETTINGS = {
  duration: 30,
  size: 'M',
  crosshair: 'cross',
  color: '#63E0BE',
  sound: true,
};
const COLORS = [
  ['#63E0BE', 'Mint'],
  ['#FFFFFF', 'White'],
  ['#FFE15C', 'Yellow'],
  ['#FF6BD5', 'Pink'],
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable */
  }
  return {};
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

// Personal bests are tracked per mode, target size and round length so they stay comparable.
const pbKey = (r) => `${r.mode}:${r.size}:${MODES[r.mode].timed ? r.duration : 'x'}`;

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="seg-row">
      <span className="seg-label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            className={value === v ? 'on' : ''}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [stored] = useState(load);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...(stored.settings || {}) });
  const [history, setHistory] = useState(stored.history || {});
  const [bests, setBests] = useState(stored.bests || {});
  const [view, setView] = useState('play');
  const [mode, setMode] = useState('gridshot');
  const [result, setResult] = useState(null);
  const [isPB, setIsPB] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [arenaKey, setArenaKey] = useState(0);
  const [routine, setRoutine] = useState(null); // index into ROUTINE

  useEffect(() => save({ settings, history, bests }), [settings, history, bests]);

  const set = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));

  const onFinish = useCallback(
    (r) => {
      const k = pbKey(r);
      const prev = bests[k];
      const pb = !prev || isBetter(r.mode, r.score, prev.score);
      setIsPB(pb && !!prev);
      if (pb) setBests((b) => ({ ...b, [k]: r }));
      setHistory((h) => {
        const list = [...(h[r.mode] || []), { score: r.score, onPct: r.onPct, at: r.at }].slice(-40);
        return { ...h, [r.mode]: list };
      });
      setResult(r);
    },
    [bests],
  );

  const playMode = (m, start = false) => {
    setView('play');
    setMode(m);
    setResult(null);
    setAutoStart(start);
    setArenaKey((k) => k + 1);
  };

  const pick = (m) => {
    setRoutine(null);
    playMode(m);
  };

  const again = () => playMode(mode, true);

  const startRoutine = () => {
    setRoutine(0);
    playMode(ROUTINE[0]);
  };

  const routineProps =
    routine === null
      ? null
      : {
          index: routine,
          total: ROUTINE.length,
          next: ROUTINE[routine + 1] || null,
          onNext: () => {
            const n = routine + 1;
            setRoutine(n);
            playMode(ROUTINE[n], true);
          },
          onQuit: () => {
            setRoutine(null);
            setResult(null);
          },
        };

  const bestFor = (m) => bests[pbKey({ mode: m, size: settings.size, duration: settings.duration })];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="16" cy="16" r="3.5" fill="var(--coral)" />
            <path d="M16 1v7M16 24v7M1 16h7M24 16h7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          Aim Range
        </div>
        <nav className="tabs" aria-label="Sections">
          <button className={view === 'play' ? 'on' : ''} onClick={() => setView('play')}>
            Train
          </button>
          <button className={view === 'learn' ? 'on' : ''} onClick={() => setView('learn')}>
            Learn
          </button>
        </nav>
      </header>

      {view === 'learn' ? (
        <main className="learn-wrap">
          <Learn onStartRoutine={startRoutine} onPlay={(m) => pick(m)} />
        </main>
      ) : (
        <main className="play">
          <aside className="side">
            <h2 className="side-title">Modes</h2>
            <ul className="modes">
              {MODE_ORDER.map((m) => {
                const b = bestFor(m);
                return (
                  <li key={m}>
                    <button
                      className={`mode ${mode === m ? 'on' : ''}`}
                      onClick={() => pick(m)}
                      aria-pressed={mode === m}
                    >
                      <span className="mode-name">{MODES[m].name}</span>
                      <span className="mode-skill">{MODES[m].skill}</span>
                      <span className="mode-pb">{b ? `Best ${formatScore(b)}` : 'Not played yet'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <h2 className="side-title">Settings</h2>
            <div className="settings">
              <Segmented
                label="Round length"
                value={settings.duration}
                options={[[30, '30 s'], [60, '60 s']]}
                onChange={set('duration')}
              />
              <Segmented
                label="Target size"
                value={settings.size}
                options={[['S', 'Small'], ['M', 'Medium'], ['L', 'Large']]}
                onChange={set('size')}
              />
              <Segmented
                label="Crosshair"
                value={settings.crosshair}
                options={[['cross', 'Cross'], ['dot', 'Dot'], ['circle', 'Circle']]}
                onChange={set('crosshair')}
              />
              <div className="seg-row">
                <span className="seg-label">Crosshair colour</span>
                <div className="swatches" role="radiogroup" aria-label="Crosshair colour">
                  {COLORS.map(([c, name]) => (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={settings.color === c}
                      aria-label={name}
                      title={name}
                      className={`swatch ${settings.color === c ? 'on' : ''}`}
                      style={{ background: c }}
                      onClick={() => set('color')(c)}
                    />
                  ))}
                </div>
              </div>
              <Segmented
                label="Sound"
                value={settings.sound}
                options={[[true, 'On'], [false, 'Off']]}
                onChange={set('sound')}
              />
            </div>
          </aside>

          <section className="stage">
            {result ? (
              <Results
                result={result}
                best={bests[pbKey(result)]}
                isPB={isPB}
                history={history[result.mode] || []}
                onAgain={again}
                onBack={() => {
                  setRoutine(null);
                  setResult(null);
                }}
                routine={routineProps}
              />
            ) : (
              <Arena
                key={arenaKey}
                mode={mode}
                settings={settings}
                onFinish={onFinish}
                autoStart={autoStart}
                routineLabel={routine !== null ? `Warm-up ${routine + 1} of ${ROUTINE.length}` : null}
              />
            )}
          </section>
        </main>
      )}
    </div>
  );
}
