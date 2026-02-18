import { PRESETS } from '../constants/presets';

interface PresetsProps {
  carrierHz: number;
  leftHz: number;
  rightHz: number;
  onSelect: (leftHz: number, rightHz: number) => void;
}

function Presets({ carrierHz, leftHz, rightHz, onSelect }: PresetsProps) {
  return (
    <div className="presets">
      <div className="presets-label">Presets</div>
      <div className="presets-grid">
        {PRESETS.map((preset) => {
          const presetLeft = carrierHz;
          const presetRight = carrierHz + preset.beatHz;
          const isActive =
            Math.abs(leftHz - presetLeft) < 0.5 &&
            Math.abs(rightHz - presetRight) < 0.5;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(presetLeft, presetRight)}
            >
              <span className="preset-name">{preset.name}</span>
              <span className="preset-desc">{preset.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Presets;
