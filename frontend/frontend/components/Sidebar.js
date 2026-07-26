// components/Sidebar.js
// -----------------------------------------------------------------------------
// LEFT navigation sidebar (the olive/forest panel) for the Teacher Dashboard.
//
// Sized to comfortably fit each class's icon AND name on one row — no wasted
// empty space. Layout, top to bottom:
//   - Sabeel 114 logo + name
//   - one row per class (icon chip + full class name)
//   - red "Sign Out" pinned at the bottom
//
// Props:
//   courses      array of { id, title }  — the teacher's classes
//   activeId     id of the currently highlighted class
//   onNavigate   (course) => void        — Phase I: placeholder / console.log
//   onSignOut    () => void              — returns to Login
// -----------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import AtmosphereBackground from './AtmosphereBackground';
import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, type } from '../constants/theme';

const SIDEBAR_WIDTH = 290;

// One course row. Owns its own Animated.Values so the icon chip can crossfade
// color/icon-tint on select (instead of snapping) and pop on tap.
function SidebarItem({ course, active, onPress }) {
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 1.12,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pressScale, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    onPress?.();
  };

  const chipBackground = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.sidebarActive, colors.primary],
  });

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.item, active && styles.itemActive]}
      accessibilityRole="button"
      accessibilityLabel={course.title}
    >
      <Animated.View
        style={[styles.iconChip, { backgroundColor: chipBackground, transform: [{ scale: pressScale }] }]}
      >
        <MaterialCommunityIcons
          name="book-education-outline"
          size={20}
          color={colors.sidebarText}
          style={styles.iconLayer}
        />
        <Animated.View style={[styles.iconLayer, { opacity: activeProgress }]}>
          <MaterialCommunityIcons name="book-education-outline" size={20} color={colors.textOnPrimary} />
        </Animated.View>
      </Animated.View>
      <Text
        style={[styles.itemLabel, active && styles.itemLabelActive]}
        numberOfLines={2}
      >
        {course.title}
      </Text>
    </Pressable>
  );
}

export default function Sidebar({ courses = [], activeId, onNavigate, onSignOut, onClose }) {
  return (
    <View style={styles.sidebar}>
      <AtmosphereBackground variant="panel" />
      {/* Brand */}
      <View style={styles.brandRow}>
        <View style={styles.logoChip}>
          <Image source={brandImages.logo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName} numberOfLines={1}>{brand.shortName}</Text>
          <Text style={styles.brandSub} numberOfLines={1}>{brand.portal}</Text>
        </View>
      </View>

      <View style={styles.sectionRule} />
      <Text style={styles.sectionLabel}>Classes</Text>

      {/* Class rows: icon + name */}
      <View style={styles.list}>
        {courses.map((course) => (
          <SidebarItem
            key={course.id}
            course={course}
            active={course.id === activeId}
            onPress={() => onNavigate?.(course)}
          />
        ))}
      </View>

      {/* Spacer pushes Sign Out to the bottom */}
      <View style={{ flex: 1 }} />

      {/* Sign Out (red) */}
      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.textOnPrimary} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.sidebar,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    // height:100% (not flex:1) gives full height in BOTH contexts — the desktop
    // row and the mobile drawer — without flexBasis:0 overriding `width`.
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  logoChip: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logo: { width: '100%', height: '100%' },
  brandName: { ...type.title, fontSize: 17, color: '#FFFFFF' },
  brandSub: { ...type.caption, color: colors.sidebarText, marginTop: 1 },
  sectionRule: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.gold,
    opacity: 0.9,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  list: { gap: spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  itemActive: { backgroundColor: colors.sidebarActive },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    ...type.bodySemibold,
    color: colors.sidebarText,
    lineHeight: 18,
  },
  itemLabelActive: { color: '#FFFFFF' },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
  },
  signOutPressed: { opacity: 0.85 },
  signOutText: { ...type.bodyBold, color: colors.textOnPrimary },
});