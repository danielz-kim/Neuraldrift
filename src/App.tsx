import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from './audio/audioEngine';
import { getBrainwaveBand } from './utils/brainwaveBand';
import BeatDisplay from './components/BeatDisplay';
import CarrierSelector, { type CarrierHz } from './components/CarrierSelector';
import Controls from './components/Controls';
import FrequencyDial from './components/FrequencyDial';
import Presets from './components/Presets';
import SessionTimer, { type SessionPhase } from './components/SessionTimer';

const INITIAL_CARRIER: CarrierHz = 200;
const INITIAL_BEAT = 10;
const DEFAULT_WORK_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const DEFAULT_CYCLES = 2;

function App() {
  const [carrierHz, setCarrierHz] = useState<CarrierHz>(INITIAL_CARRIER);
  const [leftHz, setLeftHz] = useState<number>(INITIAL_CARRIER);
  const [rightHz, setRightHz] = useState<number>(INITIAL_CARRIER + INITIAL_BEAT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pinkNoise, setPinkNoise] = useState(true);
  const [showScience, setShowScience] = useState(false);
  const [volume, setVolume] = useState(100);
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MIN);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MIN);
  const [cycles, setCycles] = useState(DEFAULT_CYCLES);
  const [sessionTimerEnabled, setSessionTimerEnabled] = useState(true);
  const [showElapsedTime, setShowElapsedTime] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const engineRef = useRef<AudioEngine | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beatHz = Math.abs(rightHz - leftHz);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const band = getBrainwaveBand(beatHz);

  const handleToggle = useCallback(async () => {
    const engine = getEngine();

    if (engine.isPlaying()) {
      await engine.fadeOutAndStop();
      setIsPlaying(false);
      setSessionPhase('idle');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    } else {
      engine.init();
      engine.setPinkNoiseEnabled(pinkNoise);
      engine.setMasterGain(volume / 100);
      await engine.start(leftHz, rightHz, { pinkNoise });
      setIsPlaying(true);
      setShowSessionComplete(false);
      if (sessionTimerEnabled && cycles >= 1 && workMinutes >= 1) {
        setSessionPhase('work');
        setCurrentCycle(1);
        setTimeRemainingMs(workMinutes * 60 * 1000);
      } else {
        if (showElapsedTime) setElapsedMs(0);
      }
    }
  }, [getEngine, leftHz, rightHz, pinkNoise, volume, sessionTimerEnabled, showElapsedTime, cycles, workMinutes]);

  const handleLeftChange = useCallback(
    (value: number) => {
      setLeftHz(value);
      if (isPlaying) {
        getEngine().setLeftFrequency(value);
      }
    },
    [getEngine, isPlaying]
  );

  const handleRightChange = useCallback(
    (value: number) => {
      setRightHz(value);
      if (isPlaying) {
        getEngine().setRightFrequency(value);
      }
    },
    [getEngine, isPlaying]
  );

  const handlePresetSelect = useCallback(
    (left: number, right: number) => {
      setLeftHz(left);
      setRightHz(right);
      if (isPlaying) {
        const engine = getEngine();
        engine.setLeftFrequency(left);
        engine.setRightFrequency(right);
      }
    },
    [getEngine, isPlaying]
  );

  const handleCarrierChange = useCallback(
    (carrier: CarrierHz) => {
      setCarrierHz(carrier);
      const newLeft = carrier;
      const newRight = carrier + beatHz;
      setLeftHz(newLeft);
      setRightHz(newRight);
      if (isPlaying) {
        const engine = getEngine();
        engine.setLeftFrequency(newLeft);
        engine.setRightFrequency(newRight);
      }
    },
    [beatHz, getEngine, isPlaying]
  );

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!showScience) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowScience(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showScience]);

  // Timer tick: every 100ms when in work or break (for millisecond display + beeps at 3,2,1 s)
  useEffect(() => {
    if (sessionPhase !== 'work' && sessionPhase !== 'break') return;

    const engine = getEngine();
    const interval = setInterval(() => {
      setTimeRemainingMs((prev) => {
        if (prev <= 0) return prev;
        const next = Math.max(0, prev - 100);
        if (sessionPhase === 'break') {
          if (prev > 3000 && next <= 3000) engine.playCountdownBeep();
          else if (prev > 2000 && next <= 2000) engine.playCountdownBeep();
          else if (prev > 1000 && next <= 1000) engine.playCountdownBeep();
        }
        return next;
      });
    }, 100);
    timerIntervalRef.current = interval;
    return () => {
      clearInterval(interval);
      timerIntervalRef.current = null;
    };
  }, [sessionPhase, getEngine]);

  // Elapsed timer: count up when playing and no session timer running
  useEffect(() => {
    if (!isPlaying || sessionPhase !== 'idle' || !showElapsedTime) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    elapsedIntervalRef.current = interval;
    return () => {
      clearInterval(interval);
      elapsedIntervalRef.current = null;
    };
  }, [isPlaying, sessionPhase, showElapsedTime]);

  // When timer hits 0: transition work -> break (or idle if last cycle) or break -> next work
  useEffect(() => {
    if (sessionPhase !== 'work' && sessionPhase !== 'break') return;
    if (timeRemainingMs > 0) return;

    let cancelled = false;
    const engine = getEngine();

    const run = async () => {
      if (sessionPhase === 'work') {
        engine.playChime();
        await engine.fadeOutAndStop();
        if (cancelled) return;
        setIsPlaying(false);
        if (currentCycle >= cycles) {
          setSessionPhase('idle');
          setShowSessionComplete(true);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          if (sessionCompleteTimeoutRef.current)
            clearTimeout(sessionCompleteTimeoutRef.current);
          sessionCompleteTimeoutRef.current = setTimeout(
            () => setShowSessionComplete(false),
            4000
          );
        } else {
          setSessionPhase('break');
          setTimeRemainingMs(breakMinutes * 60 * 1000);
        }
      } else {
        if (currentCycle >= cycles) {
          setSessionPhase('idle');
          return;
        }
        setCurrentCycle((c) => c + 1);
        setSessionPhase('work');
        setTimeRemainingMs(workMinutes * 60 * 1000);
        engine.init();
        engine.setPinkNoiseEnabled(pinkNoise);
        engine.setMasterGain(volume / 100);
        await engine.start(leftHz, rightHz, { pinkNoise });
        if (cancelled) return;
        setIsPlaying(true);
      }
    };
    run();
    return () => {
      cancelled = true;
      if (sessionCompleteTimeoutRef.current) {
        clearTimeout(sessionCompleteTimeoutRef.current);
        sessionCompleteTimeoutRef.current = null;
      }
    };
  }, [
    sessionPhase,
    timeRemainingMs,
    currentCycle,
    cycles,
    workMinutes,
    breakMinutes,
    getEngine,
    pinkNoise,
    volume,
    leftHz,
    rightHz,
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Neuraldrift</h1>
        <p className="app-description">Binaural soundwave generator and session timer.</p>
        <p className="byline">
          by <a href="https://danielzkim.com/" target="_blank" rel="noopener noreferrer">Daniel Kim</a>
        </p>
        <button
          type="button"
          className="science-toggle-btn"
          onClick={() => setShowScience(true)}
          aria-haspopup="dialog"
        >
          Read about the science!
        </button>
      </header>

      {showScience && (
        <div
          className="science-overlay"
          onClick={() => setShowScience(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="science-modal-title"
        >
          <div
            className="science-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="science-modal-header">
              <h2 id="science-modal-title" className="science-modal-title">
                The science
              </h2>
              <button
                type="button"
                className="science-modal-close"
                onClick={() => setShowScience(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="science-copy">
            <h3>What are binaural beats?</h3>
            <p>
              Your left ear hears one tone (e.g., 200 Hz) and your right ear
              hears a slightly different one (e.g., 210 Hz). Those tones are too
              close for you to hear as two separate pitches—instead, your brain
              merges them and creates a third, phantom “beat” at the difference
              (10 Hz in this example). You don’t actually hear 10 Hz as sound;
              your brain generates it internally.
            </p>

            <h3>How does it work in the brain?</h3>
            <p>
              Each ear sends its signal to both sides of the brain. Structures
              called the superior olivary complex compare the signals from left
              and right and detect the tiny difference in frequency. That
              difference becomes a new rhythm in your neural activity. Some
              research suggests this can drive a “frequency-following response”—
              your brainwaves may shift toward the beat frequency. So a 10 Hz
              beat might encourage more alpha waves (relaxed alertness), while a
              2 Hz beat might promote delta-like states (deep rest). Evidence is
              mixed, and not everyone responds the same way, but many people find
              it helpful for relaxation or focus.
            </p>

            <h3>Brainwave bands</h3>
            <p>
              <strong>Delta (0.5–4 Hz)</strong> — Deep sleep, restoration, healing.
              <br />
              <strong>Theta (4–8 Hz)</strong> — Meditation, light sleep, daydreaming, creativity.
              <br />
              <strong>Alpha (8–12 Hz)</strong> — Relaxed alertness, calm focus, eyes closed.
              <br />
              <strong>Beta (12–30 Hz)</strong> — Concentration, alertness, active thinking.
              <br />
              <strong>Gamma (30–100 Hz)</strong> — Heightened cognition, insight, problem-solving.
            </p>

            <h3>Carrier frequency</h3>
            <p>
              The <strong>carrier</strong> is the base tone (e.g. 100–500 Hz)
              that your left ear hears. The right ear gets carrier + beat. All
              presets keep the same beat; changing the carrier only shifts the
              pitch of the tones. Try a higher value if the tone feels thin,
              harsh, or uncomfortable.
            </p>

            <h3>Pink noise</h3>
            <p>
              <strong>Pink noise</strong> is a soft, even background hiss (like
              rain or wind). It can reduce listener fatigue and make the tones
              feel less piercing. Turn it on for a smoother experience, or off
              for pure tones if you prefer.
            </p>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        <div className="dial-section">
          <div className="dial-row">
            <FrequencyDial
              label="Left"
              value={leftHz}
              onChange={handleLeftChange}
            />
            <BeatDisplay beatHz={beatHz} band={band} isPlaying={isPlaying} />
            <FrequencyDial
              label="Right"
              value={rightHz}
              onChange={handleRightChange}
            />
          </div>
          <Controls
            isPlaying={isPlaying}
            onToggle={handleToggle}
            showPlayingNoTimer={
              isPlaying &&
              sessionPhase === 'idle' &&
              !sessionTimerEnabled
            }
          />
          <Presets
            carrierHz={carrierHz}
            leftHz={leftHz}
            rightHz={rightHz}
            onSelect={handlePresetSelect}
          />
        </div>

        <div className="options-row">
          <CarrierSelector value={carrierHz} onChange={handleCarrierChange} />
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={pinkNoise}
              onChange={(e) => {
                const enabled = e.target.checked;
                setPinkNoise(enabled);
                if (isPlaying) {
                  getEngine().setPinkNoiseEnabled(enabled);
                }
              }}
            />
            <span>Pink noise</span>
          </label>
          <div className="volume-control">
            <span className="volume-label">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => {
                const value = Number(e.target.value);
                setVolume(value);
                if (isPlaying) {
                  getEngine().setMasterGain(value / 100);
                }
              }}
              className="volume-slider"
              aria-label="Volume"
              title="Output volume"
            />
            <span className="volume-value">{volume}%</span>
          </div>
        </div>

        <SessionTimer
          phase={sessionPhase}
          totalCycles={cycles}
          currentCycle={currentCycle}
          timeRemainingMs={timeRemainingMs}
          isTimerActive={sessionPhase === 'work' || sessionPhase === 'break'}
          sessionTimerEnabled={sessionTimerEnabled}
          onSessionTimerEnabledChange={setSessionTimerEnabled}
          showElapsedTime={showElapsedTime}
          onShowElapsedTimeChange={setShowElapsedTime}
          elapsedMs={elapsedMs}
          isPlaying={isPlaying}
          showSessionComplete={showSessionComplete}
          workMinutes={workMinutes}
          breakMinutes={breakMinutes}
          cycles={cycles}
          onWorkChange={setWorkMinutes}
          onBreakChange={setBreakMinutes}
          onCyclesChange={setCycles}
          disabled={sessionPhase !== 'idle'}
        />
      </main>

      <p className="headphone-warning">
        Use headphones or earphones for best effect.
      </p>
    </div>
  );
}

export default App;
