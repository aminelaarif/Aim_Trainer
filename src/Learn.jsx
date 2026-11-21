import { useState } from 'react';
import { MODES } from './engine.js';

export const ROUTINE = ['reaction', 'flick', 'gridshot', 'tracking', 'precision'];

const GAMES = [
  { id: 'cs', name: 'Counter-Strike 2 / Apex Legends', yaw: 0.022 },
  { id: 'val', name: 'Valorant', yaw: 0.07 },
  { id: 'ow', name: 'Overwatch 2', yaw: 0.0066 },
];

function SensCalc() {
  const [dpi, setDpi] = useState('800');
  const [sens, setSens] = useState('1.2');
  const [game, setGame] = useState('cs');
  const yaw = GAMES.find((g) => g.id === game).yaw;
  const d = parseFloat(dpi);
  const s = parseFloat(sens);
  const ok = d > 0 && s > 0;
  const cm = ok ? (360 / (d * s * yaw)) * 2.54 : null;
  let feel = '';
  if (cm !== null) {
    if (cm < 20) feel = 'Very fast. Great for quick turns, hard for precise shots.';
    else if (cm < 30) feel = 'Fast. Common for players who aim mostly with the wrist.';
    else if (cm < 50) feel = 'Medium. The range most tactical shooter players land in.';
    else feel = 'Slow. Very stable aim; needs a large mouse pad and arm movement.';
  }
  return (
    <div className="calc">
      <div className="calc-fields">
        <label>
          Game
          <select value={game} onChange={(e) => setGame(e.target.value)}>
            {GAMES.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
        <label>
          Mouse DPI
          <input inputMode="decimal" value={dpi} onChange={(e) => setDpi(e.target.value)} />
        </label>
        <label>
          In-game sensitivity
          <input inputMode="decimal" value={sens} onChange={(e) => setSens(e.target.value)} />
        </label>
      </div>
      <div className="calc-out">
        {ok ? (
          <>
            <p>
              <strong>{cm.toFixed(1)} cm</strong> of mouse movement for a full 360° turn.
              Your eDPI is <strong>{Math.round(d * s)}</strong>.
            </p>
            <p className="calc-feel">{feel}</p>
          </>
        ) : (
          <p>Enter your DPI and sensitivity as numbers to see your cm/360.</p>
        )}
      </div>
    </div>
  );
}

export default function Learn({ onStartRoutine, onPlay }) {
  return (
    <article className="learn">
      <header className="learn-intro">
        <h2>How to get better at aiming</h2>
        <p>
          Aim is a handful of separate skills. Each mode in this trainer isolates one, so you can
          see which is holding you back and practise it on purpose.
        </p>
      </header>

      <section className="learn-routine">
        <div>
          <h3>Five-minute warm-up</h3>
          <p>Play these in order before a session, with 60 second rounds. Each one wakes up a different part of your aim.</p>
          <ol>
            {ROUTINE.map((m) => (
              <li key={m}>
                <strong>{MODES[m].name}</strong> <span>{MODES[m].skill}</span>
              </li>
            ))}
          </ol>
        </div>
        <button className="btn btn-primary" onClick={onStartRoutine}>Start warm-up</button>
      </section>

      <section className="learn-grid">
        <div className="lesson">
          <h3>Set up before you aim</h3>
          <p>
            Sit so your forearm rests on the desk and the mouse is in line with your shoulder.
            Hold the mouse loosely: a tight grip makes small corrections jerky. Turn off
            &ldquo;enhance pointer precision&rdquo; (mouse acceleration) in Windows so the same
            hand movement always moves the same distance.
          </p>
        </div>
        <div className="lesson">
          <h3>Flicking</h3>
          <p>
            A flick is one fast movement that lands on the target. Look at the target first, then
            move. If your clicks land past the target, you are overshooting; if you have to make a
            second small movement, you are stopping short. The results screen shows which one you do.
          </p>
          <button className="link" onClick={() => onPlay('flick')}>Practise flicking</button>
        </div>
        <div className="lesson">
          <h3>Tracking</h3>
          <p>
            Tracking is keeping your crosshair on something that moves. Match the target&rsquo;s
            speed rather than chasing its position. Use your arm for wide movements and your
            fingers or wrist for small corrections.
          </p>
          <button className="link" onClick={() => onPlay('tracking')}>Practise tracking</button>
        </div>
        <div className="lesson">
          <h3>Speed versus accuracy</h3>
          <p>
            Aim for 85–90% accuracy. Higher than that means you can go faster; lower means slow
            down. Players who only practise fast build a habit of missing, and players who only
            practise slow never learn to react.
          </p>
          <button className="link" onClick={() => onPlay('gridshot')}>Practise speed</button>
        </div>
        <div className="lesson">
          <h3>Micro-adjustment</h3>
          <p>
            Small targets punish the last few millimetres of movement. Slow down as you approach
            the target and stop cleanly before you click. Clicking while still moving is a very
            common cause of misses.
          </p>
          <button className="link" onClick={() => onPlay('precision')}>Practise precision</button>
        </div>
        <div className="lesson">
          <h3>Practise little and often</h3>
          <p>
            Fifteen focused minutes a day beats two hours once a week. Stop when you are tired:
            practising with a sloppy hand trains sloppy aim. Expect your scores to dip for a few
            days after any change to sensitivity or setup.
          </p>
        </div>
      </section>

      <section className="learn-sens">
        <h3>Find your sensitivity</h3>
        <p>
          Players compare sensitivity in centimetres per 360° turn, since DPI and in-game numbers
          mean different things in each game. Pick one value and stick with it across games.
        </p>
        <SensCalc />
        <p className="note">
          This trainer uses your normal desktop cursor, so it trains hand–eye coordination,
          clicking and target reading rather than your exact in-game sensitivity.
        </p>
      </section>
    </article>
  );
}
