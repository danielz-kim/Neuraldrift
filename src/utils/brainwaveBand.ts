export type BrainwaveBand =
  | 'delta'
  | 'theta'
  | 'alpha'
  | 'beta'
  | 'gamma'
  | null;

const BAND_LABELS: Record<NonNullable<BrainwaveBand>, string> = {
  delta: 'Delta',
  theta: 'Theta',
  alpha: 'Alpha',
  beta: 'Beta',
  gamma: 'Gamma',
};

export function getBrainwaveBand(beatHz: number): BrainwaveBand {
  if (beatHz < 0.5) return null;
  if (beatHz < 4) return 'delta';
  if (beatHz < 8) return 'theta';
  if (beatHz < 12) return 'alpha';
  if (beatHz < 30) return 'beta';
  if (beatHz < 100) return 'gamma';
  return null;
}

export function getBandLabel(band: BrainwaveBand): string {
  return band ? BAND_LABELS[band] : '—';
}
