// components/BrandHeader.js
// -----------------------------------------------------------------------------
// Compact Al-Hidaya branding block (real logo + name + portal label) shown at
// the top of the auth form on narrow screens. On wide screens the AuthScene
// hero panel carries the branding instead.
// -----------------------------------------------------------------------------

import { View, Text, Image, StyleSheet } from 'react-native';

import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, fonts } from '../constants/theme';

export default function BrandHeader() {
  return (
    <View style={styles.container}>
      <Image source={brandImages.logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>{brand.name}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>School Portal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 96,
    height: 88,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: fonts.sizes.title,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  pill: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  pillText: {
    color: colors.primaryDark,
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
