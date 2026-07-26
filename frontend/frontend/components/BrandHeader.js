// components/BrandHeader.js
// -----------------------------------------------------------------------------
// Compact Al-Hidaya branding block (real logo + name + portal label) shown at
// the top of the auth form on narrow screens. On wide screens the AuthScene
// hero panel carries the branding instead.
// -----------------------------------------------------------------------------

import { View, Text, Image, StyleSheet } from 'react-native';

import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, type } from '../constants/theme';

export default function BrandHeader() {
  return (
    <View style={styles.container}>
      <Image source={brandImages.logo} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>{brand.name}</Text>
      <View style={styles.rule} />
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
    width: 138,
    height: 126,
    marginBottom: spacing.md,
  },
  name: {
    ...type.title,
    fontSize: 24,
    letterSpacing: 0.3,
  },
  rule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginTop: spacing.sm,
  },
  pill: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  pillText: {
    ...type.eyebrow,
    color: colors.primaryDark,
    fontSize: 11,
  },
});
