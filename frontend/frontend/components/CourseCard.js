// components/CourseCard.js
// -----------------------------------------------------------------------------
// A single course/class card shown on the Teacher Dashboard.
// Displays the class title, student count, schedule, an "active" status badge,
// and a "View Course Details" action.
//
// Props:
//   course         { title, students, schedule, status }
//   onViewDetails  () => void   (Phase I: placeholder / console.log)
// -----------------------------------------------------------------------------

// components/CourseCard.js
// -----------------------------------------------------------------------------
// Sabeel 114 Course Card Component — Olive Green & White Style (Wide Layout & Large Typography)
// -----------------------------------------------------------------------------

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// High-visibility theme palette mirroring the Olive Green and White layout
const BRONZE_COLORS = {
  bronzeDeep: '#2A3820',    // deep forest olive
  bronzeBright: '#4D5E35',  // main olive brand color
  bronzeAccent: '#6B7A58',  // warm sage trim accent
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  successBg: '#E6EDDA',     // soft olive tint badge background
  successText: '#3C4B28',   // dark olive badge text
};

export default function CourseCard({ course, onViewDetails, style }) {
  const isActive = course.status === 'active';

  return (
    <View style={[styles.card, style]}>
      
      {/* Header Info Section */}
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="book-open-variant" size={26} color={BRONZE_COLORS.bronzeDeep} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={2}>
            {course.title}
          </Text>
          {course.program ? (
            <Text style={styles.program} numberOfLines={1}>
              {course.program}
            </Text>
          ) : null}
        </View>

        {/* Live / Status Pill */}
        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
          <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {course.status}
          </Text>
        </View>
      </View>

      {/* Meta rows (Enlarged icons & text for enhanced visibility) */}
      <View style={styles.metaRow}>
        <Ionicons name="people" size={20} color={BRONZE_COLORS.bronzeBright} />
        <Text style={styles.metaText}>{course.students} Registered Students</Text>
      </View>
      
      <View style={styles.metaRow}>
        <Ionicons name="time" size={20} color={BRONZE_COLORS.textMuted} />
        <Text style={styles.metaText}>{course.schedule}</Text>
      </View>
      
      {course.room ? (
        <View style={styles.metaRow}>
          <Ionicons name="location" size={20} color={BRONZE_COLORS.textMuted} />
          <Text style={styles.metaText}>Room Location: {course.room}</Text>
        </View>
      ) : null}

      {/* Primary Call To Action Button — Spans wide, heavy UI button */}
      <Pressable
        style={({ pressed }) => [styles.detailsBtn, pressed && styles.detailsBtnPressed]}
        onPress={onViewDetails}
      >
        <Text style={styles.detailsBtnText}>Open Student Logs</Text>
        <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    width: '100%', 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleWrap: { flex: 1, paddingRight: 8 },
  title: {
    fontSize: 22, 
    fontWeight: '800',
    color: BRONZE_COLORS.textDark,
    lineHeight: 28,
  },
  program: {
    fontSize: 14,
    fontWeight: '600',
    color: BRONZE_COLORS.bronzeBright,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeActive: { backgroundColor: BRONZE_COLORS.successBg },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: BRONZE_COLORS.successText },
  dotInactive: { backgroundColor: '#9CA3AF' },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  badgeTextActive: { color: BRONZE_COLORS.successText },
  badgeTextInactive: { color: '#6B7280' },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 16, 
    fontWeight: '500',
    color: BRONZE_COLORS.textDark,
  },
  
  detailsBtn: {
    flexDirection: 'row',
    backgroundColor: BRONZE_COLORS.bronzeDeep,
    height: 52, 
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    borderBottomWidth: 3,
    borderBottomColor: BRONZE_COLORS.bronzeAccent, 
  },
  detailsBtnPressed: { 
    backgroundColor: '#5C2509',
    borderBottomWidth: 1,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});