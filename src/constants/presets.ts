export interface Preset {
  id: string;
  name: string;
  beatHz: number;
  description: string;
}

export const PRESETS: Preset[] = [
  { id: 'delta', name: 'Deep Sleep', beatHz: 2, description: 'Delta 2 Hz' },
  { id: 'theta', name: 'Meditation', beatHz: 6, description: 'Theta 6 Hz' },
  { id: 'alpha', name: 'Relaxed Focus', beatHz: 10, description: 'Alpha 10 Hz' },
  { id: 'beta-low', name: 'Concentration', beatHz: 14, description: 'Beta 14 Hz' },
  { id: 'beta-high', name: 'Alert Focus', beatHz: 20, description: 'Beta 20 Hz' },
  { id: 'gamma', name: 'High Cognition', beatHz: 40, description: 'Gamma 40 Hz' },
];
