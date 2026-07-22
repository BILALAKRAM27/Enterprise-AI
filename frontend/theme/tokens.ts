// theme/tokens.ts
//
// Design-system tokens for Enterprise AI (DESIGN.md §2).
// Two palettes: light and dark. The app reads these through `useTokens()`
// (hooks.tsx) which resolves the active color scheme via NativeWind's
// `useColorScheme()`. All values must have both a light and a dark entry.

export interface Tokens {
  // backgrounds
  bgPage: string;
  bgSurface: string;
  bgRaised: string;
  bgSubtle: string;

  // text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // borders
  borderDefault: string;
  borderStrong: string;

  // ink (indigo) — structure / product decisions
  inkDefault: string;
  inkMuted: string;
  inkSubtle: string;

  // signal (teal) — AI / retrieval / confidence
  signalDefault: string;
  signalStrong: string;
  signalFaint: string;

  // utility
  positiveDefault: string;
}

export const lightTokens: Tokens = {
  bgPage: '#FAFAFA',
  bgSurface: '#FFFFFF',
  bgRaised: '#F7F7F8',
  bgSubtle: '#F4F4F5',

  textPrimary: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#71717A',

  borderDefault: '#E4E4E7',
  borderStrong: '#D4D4D8',

  inkDefault: '#3652E3',
  inkMuted: '#2A3FB8',
  inkSubtle: '#EEF1FF',

  signalDefault: '#0EA5A5',
  signalStrong: '#0B8383',
  signalFaint: '#E6FBF9',

  positiveDefault: '#1B8A3D',
};

export const darkTokens: Tokens = {
  bgPage: '#0B0D12',
  bgSurface: '#14161c',
  bgRaised: '#191c24',
  bgSubtle: '#101215',

  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#9C9CA6',

  borderDefault: '#23262f',
  borderStrong: '#33363f',

  inkDefault: '#6E85FF',
  inkMuted: '#AAB6FF',
  inkSubtle: '#161B33',

  signalDefault: '#2DD4C6',
  signalStrong: '#5CE8DB',
  signalFaint: '#0E2624',

  positiveDefault: '#4ADE80',
};

/** Maps a 0-100 retrieval similarity score to ribbon colours and width. */
export function ribbonForScore(
  score: number,
  tokens: Tokens
): { widthPct: number; colors: [string, string] } {
  const widthPct = Math.max(4, Math.min(100, score));

  if (score >= 80) {
    // High confidence — saturated signal gradient
    return { widthPct, colors: [tokens.signalStrong, tokens.signalDefault] };
  }
  if (score >= 50) {
    // Medium confidence — muted teal
    return { widthPct, colors: [tokens.signalDefault, tokens.signalFaint === '#0E2624' ? '#5CE8DB' : '#B9EFEA'] };
  }
  // Low confidence — almost-border hairline
  return { widthPct, colors: [tokens.borderStrong, tokens.borderDefault] };
}
