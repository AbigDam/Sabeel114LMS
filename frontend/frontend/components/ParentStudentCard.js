import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiCall } from '../api.js';
import BarChart from './BarChart';
import { computeScore, isPresent, scoreToCategory } from '../utils/score';

const BRONZE = {
  bronzeDeep: '#2A3820',
  bronzeBright: '#4D5E35',
  bronzeAccent: '#6B7A58',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  badgeBg: '#E6EDDA',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SCORE_MAX = 6; // scores are always on a 0-6 scale

// Returns YYYY-MM-DD for the Monday of the current week
function getCurrentWeekMonday() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ParentStudentCard({ student }) {
  const [expanded, setExpanded] = useState(false);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekData, setWeekData] = useState(null);
  const [weekError, setWeekError] = useState(null);

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

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && !weekData) {
      setWeekLoading(true);
      setWeekError(null);
      try {
        const startDate = getCurrentWeekMonday();
        const data = await apiCall(
          'get',
          `parent/students/${student.id}/week/?start_date=${startDate}`
        );
        setWeekData(data);
      } catch (error) {
        console.error(error);
        setWeekError('Could not load this week\u2019s calendar.');
      } finally {
        setWeekLoading(false);
      }
    }
  }

  // Build chart data: bar height uses the raw 0-6 score, but the label
  // shown to the parent is a category (Excellent / Good / Needs Improvement)
  // rather than the number itself.
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
              Daily performance is scored on a scale of 0 to {SCORE_MAX}, shown here as
              Needs Improvement, Good, or Excellent.
            </Text>
          </>
        )}
      </View>

      {/* Expandable current-week calendar */}
      {expanded && (
        <View style={styles.weekSection}>
          <Text style={styles.chartSectionLabel}>This Week</Text>
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
  studentName: { fontSize: 18, fontWeight: '700', color: BRONZE.textDark },

  chartSection: { marginTop: 20 },
  chartSectionHeaderRow: { marginBottom: 10 },
  chartSectionLabel: { fontSize: 14, fontWeight: '700', color: BRONZE.textMuted },
  scaleNote: { fontSize: 12, color: BRONZE.textMuted, marginTop: 10, fontStyle: 'italic' },
  errorText: { fontSize: 14, color: '#B91C1C', marginVertical: 12 },

  weekSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: BRONZE.borderLight,
    paddingTop: 18,
  },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dayCell: {
    width: 120,
    backgroundColor: '#FAF9F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRONZE.borderLight,
    padding: 10,
    alignItems: 'center',
  },
  dayLabel: { fontSize: 13, fontWeight: '700', color: BRONZE.bronzeAccent },
  dayDate: { fontSize: 12, color: BRONZE.textMuted, marginTop: 2, marginBottom: 8 },
  dayScoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayScoreText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  dayAttendanceText: { fontSize: 12, fontWeight: '600', color: BRONZE.textMuted, marginTop: 6 },
  dayComment: { fontSize: 11, color: BRONZE.textMuted, marginTop: 8, textAlign: 'center' },
});