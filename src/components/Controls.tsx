interface ControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  /** Show "Playing · no timer" when playing with session timer off */
  showPlayingNoTimer?: boolean;
}

function Controls({
  isPlaying,
  onToggle,
  showPlayingNoTimer = false,
}: ControlsProps) {
  return (
    <div className="controls">
      <button
        type="button"
        className={`control-btn ${isPlaying ? 'stop' : 'start'}`}
        onClick={onToggle}
        aria-label={isPlaying ? 'Stop' : 'Start'}
      >
        <span className="control-btn-icon" aria-hidden>
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
        {isPlaying ? 'Stop' : 'Start'}
      </button>
      <p className="controls-headphone-hint">
        Use headphones for binaural effect.
      </p>
      {showPlayingNoTimer && (
        <p className="controls-playing-no-timer" aria-live="polite">
          Playing · no timer
        </p>
      )}
    </div>
  );
}

export default Controls;
