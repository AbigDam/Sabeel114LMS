import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiCall } from '../api.js';

const WIDE_BREAKPOINT = 900;

const BRONZE = {
  bronzeDeep: '#3E3122',
  bronzeBright: '#B45309',
  bronzeAccent: '#9A6A3C',
  bgCanvas: '#FAF9F6',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  badgeBg: '#FEF3C7',
  badgeText: '#92400E',
};

const ADMIN_COLORS = {
  bg: '#1F1B16',
  accent: '#D97706',
  text: '#F5F1EA',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
];

// Backend sends gender as a boolean: true = Male, false = Female.
function normalizeGender(raw) {
  return raw === true ? 'male' : 'female';
}

function genderDisplayLabel(raw) {
  return normalizeGender(raw) === 'male' ? 'Male' : 'Female';
}

function RankBadge({ rank }) {
  const isTopThree = rank <= 3;
  const colors = {
    1: { bg: '#FEF3C7', text: '#92400E', icon: 'trophy' },
    2: { bg: '#E5E7EB', text: '#374151', icon: 'trophy' },
    3: { bg: '#FDE68A', text: '#78350F', icon: 'trophy' },
  };
  const c = colors[rank];

  return (
    <View
      style={[
        styles.rankBadge,
        { backgroundColor: isTopThree ? c.bg : '#F3F4F6' },
      ]}
    >
      {isTopThree && <MaterialCommunityIcons name={c.icon} size={14} color={c.text} />}
      <Text style={[styles.rankBadgeText, { color: isTopThree ? c.text : BRONZE.textMuted }]}>
        {rank}
      </Text>
    </View>
  );
}

function GenderPill({ gender }) {
  const norm = normalizeGender(gender);
  const palette = {
    male: { bg: '#DBEAFE', text: '#1D4ED8' },
    female: { bg: '#FCE7F3', text: '#BE185D' },
  }[norm];

  return (
    <View style={[styles.genderPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.genderPillText, { color: palette.text }]}>
        {genderDisplayLabel(gender)}
      </Text>
    </View>
  );
}

export default function PrivateLeaderboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [genderFilter, setGenderFilter] = useState('all');

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiCall('get', 'leaderboard/');
        setStudents(data);
      } catch (err) {
        console.error(err);
        setError('Could not load the leaderboard right now.');
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  // Rank is computed once across ALL students (highest score = rank 1),
  // so filtering by gender never changes a student's overall rank.
  const rankedStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return sorted.map((s, idx) => ({ ...s, rank: idx + 1 }));
  }, [students]);

  const visibleStudents = useMemo(() => {
    if (genderFilter === 'all') return rankedStudents;
    return rankedStudents.filter((s) => normalizeGender(s.gender) === genderFilter);
  }, [rankedStudents, genderFilter]);

  function renderTableRow({ item }) {
    return (
      <View style={styles.tableRow}>
        <View style={styles.colRank}>
          <RankBadge rank={item.rank} />
        </View>
        <View style={styles.colName}>
          <Text style={styles.primaryText}>
            {item.first_name} {item.last_name}
          </Text>
        </View>
        <View style={styles.colUsername}>
          <Text style={styles.secondaryText}>@{item.username}</Text>
        </View>
        <View style={styles.colScore}>
          <Text style={styles.scoreText}>{item.score}</Text>
        </View>
        <View style={styles.colGender}>
          <GenderPill gender={item.gender} />
        </View>
      </View>
    );
  }

  function renderCard({ item }) {
    return (
      <View style={styles.studentCard}>
        <View style={styles.studentCardTop}>
          <RankBadge rank={item.rank} />
          <View style={styles.studentCardNameBlock}>
            <Text style={styles.primaryText}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.secondaryText}>@{item.username}</Text>
          </View>
          <GenderPill gender={item.gender} />
        </View>
        <View style={styles.studentCardScoreRow}>
          <Text style={styles.studentCardScoreLabel}>Score</Text>
          <Text style={styles.scoreText}>{item.score}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#9A6A3C" />
          </Pressable>
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
        <View style={styles.adminTag}>
          <MaterialCommunityIcons name="shield-crown" size={16} color={ADMIN_COLORS.accent} />
          <Text style={styles.adminTagText}>Admin Only</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Gender filter */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = genderFilter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setGenderFilter(f.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.filterCountWrap}>
            <Text style={styles.filterCountText}>
              {visibleStudents.length} student{visibleStudents.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={BRONZE.bronzeBright} style={{ marginTop: 60 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : visibleStudents.length === 0 ? (
          <Text style={styles.emptyText}>No students match this filter.</Text>
        ) : isWide ? (
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, styles.colRank]}>Rank</Text>
              <Text style={[styles.tableHeaderText, styles.colName]}>Name</Text>
              <Text style={[styles.tableHeaderText, styles.colUsername]}>Username</Text>
              <Text style={[styles.tableHeaderText, styles.colScore]}>Score</Text>
              <Text style={[styles.tableHeaderText, styles.colGender]}>Gender</Text>
            </View>
            <FlatList
              data={visibleStudents}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderTableRow}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        ) : (
          <FlatList
            data={visibleStudents}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRONZE.bgCanvas },

  header: {
    height: 76,
    backgroundColor: BRONZE.surfaceWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 4,
    borderBottomColor: BRONZE.bronzeAccent,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: BRONZE.textDark },
  adminTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminTagText: { fontSize: 12, fontWeight: '800', color: ADMIN_COLORS.accent, letterSpacing: 0.5, textTransform: 'uppercase' },

  body: { flex: 1, padding: 28, maxWidth: 1200, width: '100%', alignSelf: 'center' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: BRONZE.surfaceWhite,
    borderWidth: 1,
    borderColor: BRONZE.borderLight,
  },
  filterChipActive: { backgroundColor: BRONZE.bronzeBright, borderColor: BRONZE.bronzeBright },
  filterChipText: { fontSize: 14, fontWeight: '700', color: BRONZE.textMuted },
  filterChipTextActive: { color: '#FFFFFF' },
  filterCountWrap: { marginLeft: 'auto' },
  filterCountText: { fontSize: 14, color: BRONZE.textMuted, fontWeight: '600' },

  errorText: { fontSize: 16, color: '#B91C1C', marginTop: 40, textAlign: 'center' },
  emptyText: { fontSize: 16, color: BRONZE.textMuted, marginTop: 40, textAlign: 'center' },

  /* Wide table layout */
  tableWrapper: {
    backgroundColor: BRONZE.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE.borderLight,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF3E7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRONZE.borderLight,
  },
  tableHeaderText: { fontSize: 13, fontWeight: '800', color: BRONZE.bronzeDeep, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRONZE.borderLight,
  },
  colRank: { width: 90 },
  colName: { flex: 2 },
  colUsername: { flex: 1.4 },
  colScore: { width: 90 },
  colGender: { width: 110, alignItems: 'flex-start' },

  primaryText: { fontSize: 15, fontWeight: '700', color: BRONZE.textDark },
  secondaryText: { fontSize: 13, color: BRONZE.textMuted, marginTop: 2 },
  scoreText: { fontSize: 16, fontWeight: '800', color: BRONZE.bronzeBright },

  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rankBadgeText: { fontSize: 14, fontWeight: '800' },

  genderPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  genderPillText: { fontSize: 12, fontWeight: '700' },

  /* Narrow card layout */
  studentCard: {
    backgroundColor: BRONZE.surfaceWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRONZE.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  studentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentCardNameBlock: { flex: 1 },
  studentCardScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRONZE.borderLight,
  },
  studentCardScoreLabel: { fontSize: 13, fontWeight: '600', color: BRONZE.textMuted },
});