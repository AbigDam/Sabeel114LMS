// components/CourseCard.js
// -----------------------------------------------------------------------------
// Course/class card for the Teacher Dashboard, styled like a hand-filed
// classroom dossier rather than a generic SaaS card: a manila folder tab
// carries the program name, a wax-seal stamp (same motif as the admin bar)
// carries the status, a colored "spine" identifies the class at a glance,
// and the meta rows read like ledger lines with dotted leaders.
//
// Props:
//   course         { title, students, schedule, status, program, room }
//   onViewDetails  () => void
// -----------------------------------------------------------------------------

import { useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontFamilies } from '../constants/theme';

// A small family of warm, brand-safe inks used to give each class its own
// "spine color" — like books on a shelf — cycling deterministically off the
// course title so the same class always lands on the same color.
const SPINE_PALETTE = [colors.primary, colors.accent, colors.gold, colors.goldDark, '#8A4B32'];

function spineColorFor(title = '') {
  let sum = 0;
  for (let i = 0; i < title.length; i += 1) sum += title.charCodeAt(i);
  return SPINE_PALETTE[sum % SPINE_PALETTE.length];
}

function LedgerRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.ledgerRow}>
      <Ionicons name={icon} size={15} color={colors.textMuted} style={styles.ledgerIcon} />
      <Text style={styles.ledgerLabel}>{label}</Text>
      <View style={styles.ledgerDots} />
      <Text style={styles.ledgerValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function CourseCard({ course, onViewDetails, style }) {
  const isActive = course.status === 'active';
  const spine = spineColorFor(course.title);
  const initial = (course.title || '?').trim().charAt(0).toUpperCase();

  const pressAnim = useRef(new Animated.Value(0)).current;

  function animateTo(toValue) {
    Animated.timing(pressAnim, {
      toValue,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  const btnScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <View style={[styles.cardWrap, style]}>
      {/* Manila folder tab — carries the program/track name */}
      {course.program ? (
        <View style={[styles.folderTab, { backgroundColor: spine }]}>
          <Text style={styles.folderTabText} numberOfLines={1}>{course.program}</Text>
        </View>
      ) : null}

      {/* Wax-seal status stamp, matching the admin bar's seal motif */}
      <View
        style={[
          styles.seal,
          { borderColor: isActive ? colors.gold : colors.border },
          { backgroundColor: isActive ? colors.goldBg : '#F3F4F0' },
        ]}
      >
        <View style={[styles.sealDot, { backgroundColor: isActive ? colors.success : '#9CA3AF' }]} />
        <Text style={[styles.sealText, { color: isActive ? colors.goldDark : colors.textMuted }]}>
          {isActive ? 'Active' : course.status}
        </Text>
      </View>

      <View style={[styles.card, { borderLeftColor: spine }]}>
        {/* Header: illuminated-manuscript-style drop cap + title */}
        <View style={styles.headerRow}>
          <Text style={[styles.dropCap, { color: spine }]}>{initial}</Text>
          <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
        </View>

        {/* Ledger lines */}
        <View style={styles.ledger}>
          <LedgerRow icon="people-outline" label="Students" value={`${course.students}`} />
          <LedgerRow icon="time-outline" label="Schedule" value={course.schedule} />
          {course.room ? <LedgerRow icon="location-outline" label="Room" value={course.room} /> : null}
        </View>

        {/* CTA */}
        <Pressable
          onPressIn={() => animateTo(1)}
          onPressOut={() => animateTo(0)}
          onPress={onViewDetails}
        >
          <Animated.View style={[styles.detailsBtn, { backgroundColor: spine, transform: [{ scale: btnScale }] }]}>
            <Text style={styles.detailsBtnText}>OPEN STUDENT LOGS</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: '100%',
    paddingTop: 14,
  },
  folderTab: {
    position: 'absolute',
    top: 0,
    left: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    zIndex: 2,
  },
  folderTabText: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  seal: {
    position: 'absolute',
    top: 0,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    zIndex: 2,
  },
  sealDot: { width: 7, height: 7, borderRadius: 3.5 },
  sealText: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 7,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropCap: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 42,
    lineHeight: 42,
    marginTop: -2,
  },
  title: {
    flex: 1,
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 25,
    color: colors.text,
    marginTop: 2,
  },

  ledger: { marginBottom: 20 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ledgerIcon: { marginRight: 8 },
  ledgerLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  ledgerDots: {
    flex: 1,
    marginHorizontal: 8,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.inputBorder,
    marginBottom: 3,
  },
  ledgerValue: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 14.5,
    color: colors.text,
    maxWidth: '55%',
  },

  detailsBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  detailsBtnText: {
    fontFamily: fontFamilies.bodyExtraBold,
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 1,
  },
});
