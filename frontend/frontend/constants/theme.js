// constants/theme.js
// -----------------------------------------------------------------------------
// Central design tokens for the Al-Hidaya Center Teacher Portal.
//
// The palette is taken from the Al-Hidaya Center logo: a warm bronze/brown dome
// & minaret on cream/white. We pair that bronze with deep espresso surfaces and
// a cream background so the app feels like an extension of their brand (NOT the
// generic blue/grey "AI default" look).
// -----------------------------------------------------------------------------

import { Platform } from 'react-native';

export const colors = {
  // Brand (sampled from the Al-Hidaya logo bronze)
  primary: '#9A6A3C', // bronze — primary actions, brand
  primaryDark: '#7C5430', // pressed / darker bronze
  primaryLight: '#F3E9DC', // cream tint — active states, badges, icon chips
  accent: '#C9A24B', // gold highlight

  // Surfaces
  background: '#F7F4EF', // warm off-white app background
  surface: '#FFFFFF', // cards, inputs
  sidebar: '#2B2117', // deep espresso sidebar for contrast & focus
  sidebarText: '#D8CCBC', // muted text on the dark sidebar
  sidebarActive: '#3E3122', // active nav item background on the sidebar

  // Text
  text: '#2A2118', // espresso — primary text
  textMuted: '#8A7E70', // secondary text / subtext
  textOnPrimary: '#FFFFFF', // text on bronze buttons

  // Status
  success: '#2E8B57', // "active" badge text (green reads universally)
  successBg: '#E6F2EB',
  warning: '#B7791F',
  warningBg: '#FBF1DD',
  danger: '#C0392B', // sign out + validation errors
  dangerBg: '#FBEBE9',

  // Lines / misc
  border: '#E7E0D6',
  inputBorder: '#DCD3C6',
  placeholder: '#A99E8E',
};

// Consistent spacing scale (multiples of 4).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border radii for a rounded, friendly UI.
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

// Reusable soft shadow.
// NOTE: react-native-web deprecates the shadow* props (warns "use boxShadow"),
// while native iOS/Android still use shadow*/elevation. Platform.select gives
// each platform the right API and silences the web deprecation warning.
export const shadow = Platform.select({
  web: { boxShadow: '0 6px 16px rgba(42, 33, 24, 0.10)' },
  default: {
    shadowColor: '#2A2118',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
});

export const fonts = {
  // System fonts keep the bundle light and look native on each platform.
  sizes: {
    caption: 12,
    body: 14,
    subtitle: 16,
    title: 20,
    heading: 26,
    display: 30,
  },
};

export default { colors, spacing, radii, shadow, fonts };
