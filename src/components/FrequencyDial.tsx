const MIN_FREQ = 20;
const MAX_FREQ = 1000;

interface FrequencyDialProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function FrequencyDial({ label, value, onChange }: FrequencyDialProps) {
  const step = 1;
  const handleStepUp = () => onChange(Math.min(MAX_FREQ, value + step));
  const handleStepDown = () => onChange(Math.max(MIN_FREQ, value - step));

  return (
    <div className="frequency-dial">
      <div className="dial-with-arrows">
        <button
          type="button"
          className="dial-arrow dial-arrow-up"
          onClick={handleStepUp}
          aria-label={`Increase ${label} frequency`}
        >
          ▲
        </button>
        <div className="dial-value-large">{value} Hz</div>
        <button
          type="button"
          className="dial-arrow dial-arrow-down"
          onClick={handleStepDown}
          aria-label={`Decrease ${label} frequency`}
        >
          ▼
        </button>
      </div>
      <div className="dial-label">{label}</div>
    </div>
  );
}

export default FrequencyDial;
