export const CARRIER_MIN = 100;
export const CARRIER_MAX = 500;
export const CARRIER_STEP = 5;
export type CarrierHz = number;

interface CarrierSelectorProps {
  value: number;
  onChange: (carrier: number) => void;
}

function CarrierSelector({ value, onChange }: CarrierSelectorProps) {
  return (
    <div className="carrier-selector">
      <span className="carrier-label">Carrier</span>
      <input
        type="range"
        min={CARRIER_MIN}
        max={CARRIER_MAX}
        step={CARRIER_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="carrier-slider"
        aria-label="Carrier frequency"
        title="Base tone frequency (100–500 Hz)"
      />
      <span className="carrier-value">{value} Hz</span>
    </div>
  );
}

export default CarrierSelector;
