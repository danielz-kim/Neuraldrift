export type SessionPhase = 'idle' | 'work' | 'break';

export interface SessionTimerConfig {
  workMinutes: number;
  breakMinutes: number;
  cycles: number;
}

interface SessionTimerProps {
  phase: SessionPhase;
  totalCycles: number;
  currentCycle: number;
  timeRemainingMs: number;
  isTimerActive: boolean;
  sessionTimerEnabled: boolean;
  onSessionTimerEnabledChange: (enabled: boolean) => void;
  /** Show elapsed time (count-up) when playing without session timer */
  showElapsedTime: boolean;
  onShowElapsedTimeChange: (enabled: boolean) => void;
  elapsedMs: number;
  isPlaying: boolean;
  showSessionComplete: boolean;
  workMinutes: number;
  breakMinutes: number;
  cycles: number;
  onWorkChange: (value: number) => void;
  onBreakChange: (value: number) => void;
  onCyclesChange: (value: number) => void;
  disabled?: boolean;
}

function formatTimeMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function SessionTimer({
  phase,
  totalCycles,
  currentCycle,
  timeRemainingMs,
  isTimerActive,
  sessionTimerEnabled,
  onSessionTimerEnabledChange,
  showElapsedTime,
  onShowElapsedTimeChange,
  elapsedMs,
  isPlaying,
  showSessionComplete,
  workMinutes,
  breakMinutes,
  cycles,
  onWorkChange,
  onBreakChange,
  onCyclesChange,
  disabled = false,
}: SessionTimerProps) {
  const phaseLabel = phase === 'work' ? 'Session' : phase === 'break' ? 'Break' : null;
  const cycleLabel =
    totalCycles > 0 ? `Cycle ${currentCycle} of ${totalCycles}` : null;
  const showElapsedDisplay =
    !sessionTimerEnabled && showElapsedTime && isPlaying;

  return (
    <div
      className={`session-timer ${!sessionTimerEnabled ? 'session-timer--disabled' : ''}`}
    >
      <div className="session-timer-header">
        <span className="session-timer-label">Session timer</span>
        <div className="session-timer-toggles">
          <label className="session-timer-toggle">
            <input
              type="checkbox"
              checked={sessionTimerEnabled}
              onChange={(e) => onSessionTimerEnabledChange(e.target.checked)}
              disabled={disabled}
            />
            <span>Use timer</span>
          </label>
          {!sessionTimerEnabled && (
            <label className="session-timer-toggle">
              <input
                type="checkbox"
                checked={showElapsedTime}
                onChange={(e) => onShowElapsedTimeChange(e.target.checked)}
                disabled={disabled}
              />
              <span>Show elapsed time</span>
            </label>
          )}
        </div>
      </div>
      <div className="session-timer-inputs">
        <label className="session-timer-field">
          <span className="session-timer-field-label">Session (min)</span>
          <input
            type="number"
            min={1}
            max={120}
            value={workMinutes}
            onChange={(e) => onWorkChange(Number(e.target.value) || 1)}
            disabled={disabled}
            className="session-timer-input"
          />
        </label>
        <label className="session-timer-field">
          <span className="session-timer-field-label">Break (min)</span>
          <input
            type="number"
            min={0}
            max={60}
            value={breakMinutes}
            onChange={(e) => onBreakChange(Math.max(0, Number(e.target.value) || 0))}
            disabled={disabled}
            className="session-timer-input"
          />
        </label>
        <label className="session-timer-field">
          <span className="session-timer-field-label">Cycles</span>
          <input
            type="number"
            min={1}
            max={20}
            value={cycles}
            onChange={(e) => onCyclesChange(Math.max(1, Number(e.target.value) || 1))}
            disabled={disabled}
            className="session-timer-input"
          />
        </label>
      </div>
      {showSessionComplete && (
        <div className="session-timer-complete" aria-live="polite">
          Session complete
        </div>
      )}
      {showElapsedDisplay && (
        <div className="session-timer-display session-timer-display--elapsed">
          <span className="session-timer-phase session-timer-phase--elapsed">
            Elapsed
          </span>
          <span className="session-timer-time">
            {formatTimeMs(elapsedMs)}
          </span>
        </div>
      )}
      {isTimerActive && phaseLabel && !showSessionComplete && (
        <div className="session-timer-display">
          <span className={`session-timer-phase session-timer-phase--${phase}`}>
            {phaseLabel}
          </span>
          {cycleLabel && (
            <span className="session-timer-cycle">{cycleLabel}</span>
          )}
          <span className="session-timer-time">
            {formatTimeMs(timeRemainingMs)}
          </span>
        </div>
      )}
    </div>
  );
}

export default SessionTimer;
