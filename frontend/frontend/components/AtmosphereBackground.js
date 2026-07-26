// components/AtmosphereBackground.js
// -----------------------------------------------------------------------------
// Ambient backdrop echoing the Sabeel 114 promo art: the brand mark scattered
// across a handful of tilted kraft-paper cards over a deep olive gradient.
// Absolutely filled, pointer-events disabled — purely atmosphere, never
// interactive. Two variants:
//   - "hero"  deep olive gradient + scattered kraft cards (auth canvas, the
//             empty margin around the dashboard shell on wide screens)
//   - "panel" a much quieter version for use behind dark chrome (sidebar)
// -----------------------------------------------------------------------------

import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { brandImages } from '../constants/brand';
import { colors, gradients } from '../constants/theme';

const HERO_MARKS = [
  { top: '6%', left: '-4%', size: 150, rotate: '-14deg', opacity: 0.12 },
  { top: '58%', left: '2%', size: 110, rotate: '9deg', opacity: 0.1 },
  { top: '14%', left: '82%', size: 130, rotate: '11deg', opacity: 0.12 },
  { top: '68%', left: '78%', size: 170, rotate: '-8deg', opacity: 0.1 },
  { top: '40%', left: '46%', size: 90, rotate: '-6deg', opacity: 0.07 },
];

const PANEL_MARKS = [
  { top: '72%', left: '-10%', size: 130, rotate: '-10deg', opacity: 0.08 },
  { top: '4%', left: '58%', size: 100, rotate: '8deg', opacity: 0.06 },
];

function Mark({ top, left, size, rotate, opacity }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.markCard,
        {
          top,
          left,
          width: size,
          height: size,
          opacity,
          transform: [{ rotate }],
        },
      ]}
    >
      <Image source={brandImages.logo} style={styles.markImage} resizeMode="contain" />
    </View>
  );
}

export default function AtmosphereBackground({ variant = 'hero' }) {
  const marks = variant === 'panel' ? PANEL_MARKS : HERO_MARKS;
  const colorsSet = variant === 'panel' ? gradients.sidebar : gradients.hero;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colorsSet}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {marks.map((m, i) => (
        <Mark key={i} {...m} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  markCard: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: colors.kraft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14%',
  },
  markImage: {
    width: '100%',
    height: '100%',
  },
});
