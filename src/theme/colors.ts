/**
 * Color tokens for American Rotation Scorer.
 * Player colors: P1 = orange, P2 = green (mirrors TotalPool's pocketed-ball coding).
 */
export const colors = {
  // Brand / background
  bgTop: '#1FA2D8',
  bgBottom: '#0B3A52',
  surface: '#0E4763',
  surfaceAlt: '#0B3A52',
  border: 'rgba(255,255,255,0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textTertiary: 'rgba(255,255,255,0.45)',

  // Players
  p1: '#E91E63', // deep magenta
  p2: '#00E5FF', // electric cyan
  inactive: '#7A8A93',

  // Ball-grid neutrals
  ballUnpocketed: '#9AA5AC',
  ballUnpocketedText: '#1B2A33',

  // UI accents
  primary: '#1FA2D8',
  success: '#34C759',
  danger: '#FF453A',
} as const;

export const playerColor = (slot: 0 | 1) => (slot === 0 ? colors.p1 : colors.p2);
