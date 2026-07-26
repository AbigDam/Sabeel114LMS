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

  // Warm gilt accent — used sparingly for seals, ranks, and honors (echoes
  // gold leaf on manuscript work, never a whole surface).
  gold: '#C9A24B',
  goldDark: '#8C6D2A',
  goldBg: '#F6EED3',

  // Kraft-paper card surface (auth backdrop cards, stamps) — warmer than the
  // clinical pure-white `surface`.
  kraft: '#EFE7D3',
  kraftLine: 'rgba(37, 46, 24, 0.14)',
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

// Two-voice type system sampled from the brand mark: Fraunces is a soft-serif
// with real calligraphic character for anything that should feel like the
// logo (headings, big numbers, quotes) — Karla is a warm, grounded sans for
// everything you actually have to read (body copy, inputs, buttons). Neither
// is a default "AI" font (no Inter/Roboto/Space Grotesk).
export const fontFamilies = {
  displayBlack: 'Fraunces_900Black',
  displayBold: 'Fraunces_800ExtraBold',
  displaySemibold: 'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  bodyRegular: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodySemibold: 'Karla_600SemiBold',
  bodyBold: 'Karla_700Bold',
  bodyExtraBold: 'Karla_800ExtraBold',
};

export const fonts = {
  families: fontFamilies,
  sizes: {
    caption: 12,
    body: 14,
    subtitle: 16,
    title: 20,
    heading: 26,
    display: 34,
    jumbo: 46,
  },
};

// Ready-made text styles — spread these instead of hand-rolling
// fontFamily/fontSize/fontWeight combinations on every screen. Custom fonts
// on native only ever render the exact weight that was loaded, so these
// pick the right file rather than pairing fontFamily with fontWeight.
export const type = {
  jumbo: { fontFamily: fontFamilies.displayBlack, fontSize: fonts.sizes.jumbo, color: colors.text, letterSpacing: 0.2 },
  display: { fontFamily: fontFamilies.displayBlack, fontSize: fonts.sizes.display, color: colors.text, letterSpacing: 0.2 },
  heading: { fontFamily: fontFamilies.displayBold, fontSize: fonts.sizes.heading, color: colors.text },
  title: { fontFamily: fontFamilies.displaySemibold, fontSize: fonts.sizes.title, color: colors.text },
  quote: { fontFamily: fontFamilies.displayItalic, fontSize: fonts.sizes.title, color: colors.text },
  subtitle: { fontFamily: fontFamilies.bodySemibold, fontSize: fonts.sizes.subtitle, color: colors.text },
  body: { fontFamily: fontFamilies.bodyRegular, fontSize: fonts.sizes.body, color: colors.text },
  bodyMedium: { fontFamily: fontFamilies.bodyMedium, fontSize: fonts.sizes.body, color: colors.text },
  bodySemibold: { fontFamily: fontFamilies.bodySemibold, fontSize: fonts.sizes.body, color: colors.text },
  bodyBold: { fontFamily: fontFamilies.bodyBold, fontSize: fonts.sizes.body, color: colors.text },
  caption: { fontFamily: fontFamilies.bodyMedium, fontSize: fonts.sizes.caption, color: colors.textMuted },
  eyebrow: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  button: { fontFamily: fontFamilies.bodyBold, fontSize: fonts.sizes.subtitle, color: colors.textOnPrimary },
};

// Gradient recipes for <LinearGradient>, matched to the logo's olive-on-kraft
// mood. "hero" is the deep-olive atmosphere behind auth/chrome surfaces,
// "parchment" is a barely-there warm lift for light cards.
export const gradients = {
  hero: ['#212B18', '#3C4B28', '#5A6E3D'],
  heroRadialHint: '#7A9850',
  parchment: ['#FBFAF4', '#EFE9D8'],
  sidebar: ['#1E2817', '#2A3820'],
  gold: ['#C9A24B', '#8C6D2A'],
};

export default { colors, spacing, radii, shadow, fonts, fontFamilies, type, gradients };
