import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api.js'
import { colors, fontFamilies, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'teacher', label: 'Teachers', endpoint: '/teachers/' },
  { key: 'student', label: 'Students', endpoint: '/students/' },
  { key: 'parent',  label: 'Parents',  endpoint: '/parents/'  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fullNameOf(person) {
  return person.first_name && person.last_name
    ? `${person.first_name} ${person.last_name}`
    : person.name ?? 'Unknown';
}

function initialsOf(person) {
  return person.first_name && person.last_name
    ? (person.first_name.charAt(0) + person.last_name.charAt(0)).toUpperCase()
    : '?';
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------
function UserRow({ user, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(user)}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.userName}>{fullNameOf(user)}</Text>
        {subtitle ? <Text style={styles.userSub}>{subtitle}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function UserListScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('teacher');
  const [dataByTab, setDataByTab] = useState({ teacher: null, student: null, parent: null });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');

  const tabConfig = TABS.find(t => t.key === activeTab);

  // ------------------------------------------------------------------
  // Fetch the active tab's list
  // ------------------------------------------------------------------
  const fetchTab = useCallback(async (tabKey) => {
    const config = TABS.find(t => t.key === tabKey);
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(config.endpoint);
      setDataByTab(prev => ({ ...prev, [tabKey]: response.data }));
    } catch (err) {
      console.error(err);
      setError(err.message || `Failed to fetch ${config.label.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab, fetchTab]);

  // Refresh the active tab whenever the screen regains focus (e.g. after
  // editing/removing a user from their detail page).
  useFocusEffect(
    useCallback(() => {
      fetchTab(activeTab);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]),
  );

  const list = dataByTab[activeTab] ?? [];

  // ------------------------------------------------------------------
  // Search filter
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter(u => fullNameOf(u).toLowerCase().includes(query));
  }, [list, search]);

  // ------------------------------------------------------------------
  // Subtitle per tab (light context under the name)
  // ------------------------------------------------------------------
  const subtitleFor = useCallback((user) => {
    if (activeTab === 'teacher' || activeTab === 'parent') return user.username ?? user.email ?? null;
    if (activeTab === 'student') return user.level ?? null;
    return null;
  }, [activeTab]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => { setActiveTab(tab.key); setSearch(''); }}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${tabConfig.label.toLowerCase()}…`}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchTab(activeTab)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id ?? item._id)}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              subtitle={subtitleFor(item)}
              onPress={() => navigation.navigate('UserDetail', { type: activeTab, id: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {search ? `No ${tabConfig.label.toLowerCase()} match your search` : `No ${tabConfig.label.toLowerCase()} found`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface ?? colors.background,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.displayBold,
    fontSize: 17,
    color: colors.text,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface ?? '#fff',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md ?? radii.lg,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: '#fff',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface ?? '#fff',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 15,
    color: colors.text,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  userSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Empty / error / loading
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: colors.error ?? '#C0392B',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
