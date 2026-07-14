// constants/theme.js
// -----------------------------------------------------------------------------
// Central design tokens for the Sabeel 114 School Portal.
//
// The palette is taken from the Sabeel 114 logo: deep olive/forest green
// background with warm cream calligraphy. We pair that olive green with dark
// forest surfaces and a warm off-white background so the app feels like an
// extension of their brand (NOT the generic blue/grey "AI default" look).
// -----------------------------------------------------------------------------

import { Platform } from 'react-native';

export const colors = {
  // Brand (sampled from the Sabeel 114 logo olive green)
  primary: '#4D5E35',        // olive green — primary actions, brand
  primaryDark: '#3C4B28',    // pressed / darker olive
  primaryLight: '#E6EDDA',   // light olive tint — active states, badges, icon chips
  accent: '#7A9850',         // sage/chartreuse highlight

  // Surfaces
  background: '#F5F4EE',     // warm off-white app background
  surface: '#FFFFFF',        // cards, inputs
  sidebar: '#2A3820',        // deep olive/forest sidebar for contrast & focus
  sidebarText: '#C5D1A8',    // muted cream-olive text on the dark sidebar
  sidebarActive: '#384D2B',  // active nav item background on the sidebar

  // Text
  text: '#252E18',           // very dark olive — primary text
  textMuted: '#6B7A58',      // secondary text / subtext
  textOnPrimary: '#FFFFFF',  // text on olive buttons

  // Status
  success: '#2E8B57',        // "active" badge text (green reads universally)
  successBg: '#E6F2EB',
  warning: '#B7791F',
  warningBg: '#FBF1DD',
  danger: '#C0392B',         // sign out + validation errors
  dangerBg: '#FBEBE9',

  // Lines / misc
  border: '#D5DEC5',
  inputBorder: '#C8D4B5',
  placeholder: '#8E9E78',
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
  web: { boxShadow: '0 6px 16px rgba(37, 46, 24, 0.10)' },
  default: {
    shadowColor: '#252E18',
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
