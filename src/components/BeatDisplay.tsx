import { getBandLabel, type BrainwaveBand } from '../utils/brainwaveBand';

interface BeatDisplayProps {
  beatHz: number;
  band: BrainwaveBand;
  isPlaying: boolean;
}

function BeatDisplay({ beatHz, band, isPlaying }: BeatDisplayProps) {
  const bandLabel = getBandLabel(band);

  return (
    <div className="beat-display">
      <div className="beat-value">{beatHz.toFixed(1)} Hz</div>
      <div className={`beat-band ${band ?? ''} ${isPlaying ? 'active' : ''}`}>
        {bandLabel}
      </div>
    </div>
  );
}

export default BeatDisplay;
