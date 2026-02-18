import { useCallback, useEffect, useRef } from 'react';

const MIN_FREQ = 20;
const MAX_FREQ = 1000;

interface FrequencyDialProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function FrequencyDial({ label, value, onChange }: FrequencyDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const valueToDeg = useCallback((val: number) => {
    const normalized = (val - MIN_FREQ) / (MAX_FREQ - MIN_FREQ);
    return 135 + normalized * 270;
  }, []);

  const angleToValue = useCallback((angleDeg: number) => {
    // Dial sweep: 135° (min) to 45° (max) clockwise
    let sweep = (angleDeg - 135 + 360) % 360;
    if (sweep > 270) sweep = 270;
    const normalized = sweep / 270;
    return Math.round(MIN_FREQ + normalized * (MAX_FREQ - MIN_FREQ));
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || !dialRef.current) return;

      const rect = dialRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      angle = angle < 0 ? angle + 360 : angle;

      const newValue = angleToValue(angle);
      onChange(Math.max(MIN_FREQ, Math.min(MAX_FREQ, newValue)));
    },
    [onChange, angleToValue]
  );

  const handlePointerUpRef = useRef<() => void>(() => {});
  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUpRef.current);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handlePointerMove]);

  useEffect(() => {
    handlePointerUpRef.current = handlePointerUp;
  }, [handlePointerUp]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUpRef.current);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      handlePointerMove(e.nativeEvent);
    },
    [handlePointerMove]
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUpRef.current);
    };
  }, [handlePointerMove]);

  const rotation = valueToDeg(value);
  const sweep = Math.min(270, Math.max(0, rotation - 135));

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
        <div
          ref={dialRef}
          className="dial-container"
          onPointerDown={handlePointerDown}
        >
          <div className="dial-track">
            <div
              className="dial-fill"
              style={{
                background: `conic-gradient(from 135deg, #555 0deg, #555 ${sweep}deg, #2a2a2a ${sweep}deg, 270deg)`,
              }}
            />
          </div>
          <div
            className="dial-knob"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="dial-pointer" />
          </div>
        </div>
        <button
          type="button"
          className="dial-arrow dial-arrow-down"
          onClick={handleStepDown}
          aria-label={`Decrease ${label} frequency`}
        >
          ▼
        </button>
      </div>
      <div className="dial-value">{value} Hz</div>
      <div className="dial-label">{label}</div>
    </div>
  );
}

export default FrequencyDial;
