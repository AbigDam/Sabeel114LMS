import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiCall } from '../api.js';
import BarChart from './BarChart';
import { computeScore, isPresent, scoreToCategory, SCORE_MAX } from '../utils/score';
import { colors, fontFamilies } from '../constants/theme';

const BRONZE = {
  bronzeDeep: colors.sidebar,
  bronzeBright: colors.primary,
  bronzeAccent: colors.accent,
  surfaceWhite: colors.surface,
  textDark: colors.text,
  textMuted: colors.textMuted,
  borderLight: colors.border,
  badgeBg: colors.primaryLight,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Returns YYYY-MM-DD for the Monday of the week containing `date`
function getMondayOf(date) {
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function getCurrentWeekMonday() {
  return getMondayOf(new Date());
}

// Add `days` days to a YYYY-MM-DD string, return YYYY-MM-DD
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// "Jan 5 - Jan 11" style range label for the header
function formatWeekRange(startDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} \u2013 ${end.toLocaleDateString(undefined, opts)}`;
}

export default function ParentStudentCard({ student }) {
  const [expanded, setExpanded] = useState(false);

  // Which week is currently being viewed (Monday, YYYY-MM-DD). Defaults to
  // the real current week; only changes via the prev/next arrows.
  const currentWeekMonday = getCurrentWeekMonday();
  const [weekStart, setWeekStart] = useState(currentWeekMonday);

  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState(null);

  // Cache of already-fetched weeks, keyed by start date, so paging back and
  // forth doesn't re-hit the API for weeks we've already loaded.
  const weekCache = useRef({});
  const [, forceRender] = useState(0); // bump to re-render after cache writes

  const [perfLoading, setPerfLoading] = useState(true);
  const [perfData, setPerfData] = useState([]);
  const [perfError, setPerfError] = useState(null);

  // Load the 5-day performance chart data as soon as the card mounts
  useEffect(() => {
    async function loadPerformance() {
      setPerfLoading(true);
      setPerfError(null);
      try {
        const data = await apiCall(
          'get',
          `parent/students/${student.id}/performance/?days=5`
        );
        setPerfData(data);
      } catch (error) {
        console.error(error);
        setPerfError('Could not load performance data.');
      } finally {
        setPerfLoading(false);
      }
    }
    loadPerformance();
  }, [student.id]);

  async function fetchWeek(startDate) {
    setWeekLoading(true);
    setWeekError(null);
    try {
      const data = await apiCall(
        'get',
        `parent/students/${student.id}/week/?start_date=${startDate}`
      );
      weekCache.current[startDate] = data;
      forceRender((n) => n + 1);
    } catch (error) {
      console.error(error);
      setWeekError('Could not load this week\u2019s calendar.');
    } finally {
      setWeekLoading(false);
    }
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && !weekCache.current[weekStart]) {
      fetchWeek(weekStart);
    }
  }

  function goToPreviousWeek() {
    const prevStart = addDays(weekStart, -7);
    setWeekStart(prevStart);
    if (!weekCache.current[prevStart]) {
      fetchWeek(prevStart);
    }
  }

  function goToNextWeek() {
    if (weekStart === currentWeekMonday) return; // already at the newest allowed week
    const nextStart = addDays(weekStart, 7);
    setWeekStart(nextStart);
    if (!weekCache.current[nextStart]) {
      fetchWeek(nextStart);
    }
  }

  const isAtCurrentWeek = weekStart === currentWeekMonday;
  const weekData = weekCache.current[weekStart] || null;

  // Build chart data: bar height uses the raw score, but the label shown to
  // the parent is a category (Excellent / Good / Needs Improvement) rather
  // than the number itself.
  const chartData = perfData.map((d) => {
    const score = computeScore(d);
    const { label, color } = scoreToCategory(score);
    return {
      label: formatShortDate(d.date),
      value: score,
      displayText: label,
      barColor: color,
    };
  });

  return (
    <View style={styles.card}>
      <Pressable style={styles.headerRow} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={26} color={BRONZE.bronzeDeep} />
          </View>
          <Text style={styles.studentName}>
            {student.first_name} {student.last_name}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={BRONZE.bronzeAccent}
        />
      </Pressable>

      {/* 5-Day performance chart, always visible on the card */}
      <View style={styles.chartSection}>
        <View style={styles.chartSectionHeaderRow}>
          <Text style={styles.chartSectionLabel}>Last 5 Days Performance</Text>
        </View>
        {perfLoading ? (
          <ActivityIndicator color={BRONZE.bronzeBright} style={{ marginVertical: 20 }} />
        ) : perfError ? (
          <Text style={styles.errorText}>{perfError}</Text>
        ) : (
          <>
            <BarChart data={chartData} maxValue={SCORE_MAX} />
            <Text style={styles.scaleNote}>
              Daily performance is shown as either Needs Improvement, Good, or Excellent.
            </Text>
          </>
        )}
      </View>

      {/* Expandable week calendar, with prev/next navigation */}
      {expanded && (
        <View style={styles.weekSection}>
          <View style={styles.weekNavRow}>
            <Pressable onPress={goToPreviousWeek} hitSlop={10} style={styles.weekNavBtn}>
              <Ionicons name="chevron-back" size={20} color={BRONZE.bronzeAccent} />
            </Pressable>

            <View style={styles.weekNavCenter}>
              <Text style={styles.chartSectionLabel}>
                {isAtCurrentWeek ? 'This Week' : formatWeekRange(weekStart)}
              </Text>
            </View>

            <Pressable
              onPress={goToNextWeek}
              hitSlop={10}
              style={styles.weekNavBtn}
              disabled={isAtCurrentWeek}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isAtCurrentWeek ? BRONZE.borderLight : BRONZE.bronzeAccent}
              />
            </Pressable>
          </View>

          {weekLoading ? (
            <ActivityIndicator color={BRONZE.bronzeBright} style={{ marginVertical: 20 }} />
          ) : weekError ? (
            <Text style={styles.errorText}>{weekError}</Text>
          ) : (
            <View style={styles.weekGrid}>
              {(weekData || []).map((day, idx) => {
                const score = computeScore(day);
                const present = isPresent(day.attendance);
                const { label, color, bg } = scoreToCategory(score);
                return (
                  <View key={day.date} style={styles.dayCell}>
                    <Text style={styles.dayLabel}>{DAY_LABELS[idx] || ''}</Text>
                    <Text style={styles.dayDate}>{formatShortDate(day.date)}</Text>
                    <View style={[styles.dayScoreBadge, { backgroundColor: bg }]}>
                      <Text style={[styles.dayScoreText, { color }]}>{label}</Text>
                    </View>
                    <Text style={styles.dayAttendanceText}>
                      {present ? 'Present' : 'Absent'}
                    </Text>
                    {!!day.comment && (
                      <Text style={styles.dayComment} numberOfLines={4}>
                        {day.comment}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRONZE.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE.borderLight,
    padding: 20,
    marginBottom: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRONZE.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: { fontFamily: fontFamilies.displaySemibold, fontSize: 19, color: BRONZE.textDark },

  chartSection: { marginTop: 20 },
  chartSectionHeaderRow: { marginBottom: 10 },
  chartSectionLabel: { fontFamily: fontFamilies.bodyBold, fontSize: 14, color: BRONZE.textMuted },
  scaleNote: { fontFamily: fontFamilies.displayItalic, fontSize: 12, color: BRONZE.textMuted, marginTop: 10 },
  errorText: { fontFamily: fontFamilies.bodyMedium, fontSize: 14, color: '#B91C1C', marginVertical: 12 },

  weekSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: BRONZE.borderLight,
    paddingTop: 18,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekNavBtn: {
    padding: 4,
  },
  weekNavCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dayCell: {
    width: 120,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRONZE.borderLight,
    padding: 10,
    alignItems: 'center',
  },
  dayLabel: { fontFamily: fontFamilies.bodyBold, fontSize: 13, color: BRONZE.bronzeAccent },
  dayDate: { fontFamily: fontFamilies.bodyRegular, fontSize: 12, color: BRONZE.textMuted, marginTop: 2, marginBottom: 8 },
  dayScoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayScoreText: { fontFamily: fontFamilies.bodyExtraBold, fontSize: 13, textAlign: 'center' },
  dayAttendanceText: { fontFamily: fontFamilies.bodySemibold, fontSize: 12, color: BRONZE.textMuted, marginTop: 6 },
  dayComment: { fontFamily: fontFamilies.bodyRegular, fontSize: 11, color: BRONZE.textMuted, marginTop: 8, textAlign: 'center' },
});