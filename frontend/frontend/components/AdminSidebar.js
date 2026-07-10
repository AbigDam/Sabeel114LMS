// components/Sidebar.js
// -----------------------------------------------------------------------------
// LEFT navigation sidebar (the brown/espresso panel) for the Teacher Dashboard.
//
// Sized to comfortably fit each class's icon AND name on one row — no wasted
// empty space. Layout, top to bottom:
//   - Al-Hidaya logo + name
//   - one row per class (icon chip + full class name)
//   - red "Sign Out" pinned at the bottom
//
// Props:
//   courses      array of { id, title }  — classes
//   activeId     id of the currently highlighted class
//   onNavigate   (course) => void        — Phase I: placeholder / console.log
//   onSignOut    () => void              — returns to Login
// -----------------------------------------------------------------------------

import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { brand, brandImages } from '../constants/brand';
import { colors, spacing, radii, fonts } from '../constants/theme';

const SIDEBAR_WIDTH = 290;


export default function Sidebar({ courses = [], activeId, onNavigate, onSignOut, onClose }) {
  const navigation = useNavigation();

  return (
    <View style={styles.sidebar}>
      {/* Brand */}
      <View style={styles.brandRow}>
        <View style={styles.logoChip}>
          <Image source={brandImages.logo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandName} numberOfLines={1}>{brand.shortName}</Text>
          <Text style={styles.brandSub} numberOfLines={1}>{brand.portal}</Text>
        </View>
        {/* Close (✕) — only rendered in the mobile drawer (onClose provided) */}
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close menu">
            <Ionicons name="arrow-back-outline" size={22} color={colors.sidebarText} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>General</Text>

      {/* Class rows: icon + name */}
      {/* Dashboard button */}
      <View style={styles.list}>
        <Pressable
          onPress={() => navigation.navigate('AdminDashboardScreen')}
          style={[styles.item, !activeId && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Main Dashboard"
        >
          <View style={[styles.iconChip, !activeId && styles.iconChipActive]}>
            <MaterialCommunityIcons
              name="view-dashboard"
              size={20}
              color={!activeId ? colors.textOnPrimary : colors.sidebarText}
            />
          </View>
          <Text
            style={[styles.itemLabel, !activeId && styles.itemLabelActive]}
            numberOfLines={2}
          >
            Dashboard
          </Text>
        </Pressable>
        </View>

      {/* Class button */}
      <View style={styles.list}>
        <Pressable
          onPress={() => navigation.navigate('ManageCourses')}
          style={[styles.item, !activeId && styles.itemActive]}
          accessibilityRole="button"
          accessibilityLabel="Manage Courses"
        >
          <View style={[styles.iconChip, !activeId && styles.iconChipActive]}>
            <MaterialCommunityIcons
              name="book-open-variant"
              size={20}
              color={!activeId ? colors.textOnPrimary : colors.sidebarText}
            />
          </View>
          <Text
            style={[styles.itemLabel, !activeId && styles.itemLabelActive]}
            numberOfLines={2}
          >
            Manage Courses
          </Text>
        </Pressable>
        </View>

      <View style={styles.list}>
        {courses.map((course) => {
          const active = course.id === activeId;
          return (
            <Pressable
              key={course.id}
              onPress={() => onNavigate?.(course)}
              style={[styles.item, active && styles.itemActive]}
              accessibilityRole="button"
              accessibilityLabel={course.title}
            >
              <View style={[styles.iconChip, active && styles.iconChipActive]}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={20}
                  color={active ? colors.textOnPrimary : colors.sidebarText}
                />
              </View>
              <Text
                style={[styles.itemLabel, active && styles.itemLabelActive]}
                numberOfLines={2}
              >
                {course.title}
              </Text>
            </Pressable>
          );
        })}
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
    // height:100% (not flex:1) gives full height in BOTH contexts — the desktop
    // row and the mobile drawer — without flexBasis:0 overriding `width`.
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
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
  brandName: { color: '#FFFFFF', fontSize: fonts.sizes.subtitle, fontWeight: '800' },
  brandSub: { color: colors.sidebarText, fontSize: fonts.sizes.caption, marginTop: 1 },
  sectionLabel: {
    color: colors.sidebarText,
    fontSize: fonts.sizes.body,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
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
    backgroundColor: colors.sidebarActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: { backgroundColor: colors.primary },
  itemLabel: {
    flex: 1,
    color: colors.sidebarText,
    fontSize: fonts.sizes.body,
    lineHeight: 18,
    fontWeight: '600',
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
  signOutText: { color: colors.textOnPrimary, fontSize: fonts.sizes.body, fontWeight: '700' },
});