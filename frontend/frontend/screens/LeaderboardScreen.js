// screens/LeaderboardScreen.js
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { brand } from '../constants/brand';
import { colors, spacing, radii, fonts, shadow } from '../constants/theme';
import { apiCall } from '../api.js';

const WIDE_BREAKPOINT = 700;

function RankBadge({ rank }) {
  const medalColor =
    rank === 1 ? '#D4AF37' : rank === 2 ? '#A8A9AD' : rank === 3 ? '#B45309' : null;

  return (
    <View style={[styles.rankBadge, medalColor && { backgroundColor: medalColor }]}>
      {medalColor ? (
        <MaterialCommunityIcons name="medal" size={16} color="#FFFFFF" />
      ) : (
        <Text style={styles.rankBadgeText}>{rank}</Text>
      )}
    </View>
  );
}

function LeaderboardList({ title, icon, names, loading, error }) {
  return (
    <View style={styles.listCard}>
      <View style={styles.listHeaderRow}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
        <Text style={styles.listHeaderText}>{title}</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : names.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No entries yet.</Text>
        </View>
      ) : (
        names.map((name, index) => (
          <View key={`${name}-${index}`} style={styles.row}>
            <RankBadge rank={index + 1} />
            <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function LeaderboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [maleNames, setMaleNames] = useState([]);
  const [femaleNames, setFemaleNames] = useState([]);
  const [maleLoading, setMaleLoading] = useState(true);
  const [femaleLoading, setFemaleLoading] = useState(true);
  const [maleError, setMaleError] = useState(null);
  const [femaleError, setFemaleError] = useState(null);
  const [activeTab, setActiveTab] = useState('male'); // only used on narrow screens

  useEffect(() => {
    async function loadMale() {
      try {
        const data = await apiCall('get', 'male_list/');
        setMaleNames(data);
      } catch (error) {
        console.error(error);
        setMaleError('Could not load the leaderboard.');
      } finally {
        setMaleLoading(false);
      }
    }
    loadMale();
  }, []);

  useEffect(() => {
    async function loadFemale() {
      try {
        const data = await apiCall('get', 'female_list/');
        setFemaleNames(data);
      } catch (error) {
        console.error(error);
        setFemaleError('Could not load the leaderboard.');
      } finally {
        setFemaleLoading(false);
      }
    }
    loadFemale();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        {navigation?.canGoBack?.() ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Leaderboard</Text>
          <Text style={styles.topBarSub} numberOfLines={1}>{brand.name}</Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {!isWide && (
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'male' && styles.tabBtnActive]}
            onPress={() => setActiveTab('male')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'male' && styles.tabBtnTextActive]}>
              Male
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'female' && styles.tabBtnActive]}
            onPress={() => setActiveTab('female')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'female' && styles.tabBtnTextActive]}>
              Female
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={isWide ? styles.wideRow : undefined}>
          {(isWide || activeTab === 'male') && (
            <View style={isWide ? styles.wideColumn : undefined}>
              <LeaderboardList
                title="Male"
                icon="account"
                names={maleNames}
                loading={maleLoading}
                error={maleError}
              />
            </View>
          )}
          {(isWide || activeTab === 'female') && (
            <View style={isWide ? styles.wideColumn : undefined}>
              <LeaderboardList
                title="Female"
                icon="account"
                names={femaleNames}
                loading={femaleLoading}
                error={femaleError}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  backBtnPlaceholder: { width: 32 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: {
    fontSize: fonts.sizes.subtitle,
    fontWeight: '800',
    color: colors.text,
  },
  topBarSub: {
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    marginTop: 1,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: fonts.sizes.body,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.textOnPrimary,
  },

  scroll: { padding: spacing.lg, paddingBottom: 60 },

  wideRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  wideColumn: { flex: 1 },

  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  listHeaderText: {
    fontSize: fonts.sizes.subtitle,
    fontWeight: '800',
    color: colors.text,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowName: {
    fontSize: fonts.sizes.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },

  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: fonts.sizes.caption,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  centerBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: fonts.sizes.body,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.body,
  },
});