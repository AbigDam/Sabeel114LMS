// screens/ManageUserScreen.js
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { brand } from '../constants/brand';
import { colors, spacing, radii, fonts, fontFamilies, shadow } from '../constants/theme';
import { apiCall } from '../api.js';

const WIDE_BREAKPOINT = 900;

// Roles as returned by the current_user_details/ endpoint (UserSerializer.role)
const ROLE_PARENT = 0;
const ROLE_TEACHER = 1;
const ROLE_STUDENT = 2;

const GROUPS = [
  { key: 'teacher', role: ROLE_TEACHER, title: 'Teachers', icon: 'school-outline' },
  { key: 'parent', role: ROLE_PARENT, title: 'Parents', icon: 'account-heart-outline' },
  { key: 'student', role: ROLE_STUDENT, title: 'Students', icon: 'account-school-outline' },
];

function initialOf(user) {
  const source = user.first_name || user.username || '?';
  return source.trim().charAt(0).toUpperCase();
}

function fullNameOf(user) {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || user.username;
}

// Which list the UserSerializer response maps to, per role — this is the
// "what the serializer says to display" piece: each role only ever has one
// of these three fields populated.
function roleDetail(user) {
  switch (user.role) {
    case ROLE_TEACHER:
      return { label: 'Classes Teaching', items: user.classes_teacher || [] };
    case ROLE_PARENT:
      return { label: 'Children', items: user.children || [] };
    case ROLE_STUDENT:
      return { label: 'Enrolled In', items: user.classes_student || [] };
    default:
      return { label: null, items: [] };
  }
}

// gender is a nullable boolean on the User model: True = Male, False = Female.
function genderLabelOf(user) {
  if (user.gender === true) return 'Male';
  if (user.gender === false) return 'Female';
  return null;
}

function matchesSearch(user, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    fullNameOf(user).toLowerCase().includes(q) ||
    (user.username || '').toLowerCase().includes(q) ||
    (user.email || '').toLowerCase().includes(q)
  );
}

// Builds the filter dimensions available for a given role, sourced from
// whatever's actually on record for that group (no hardcoded class lists).
function buildFilterDefs(role, users) {
  if (role === ROLE_TEACHER) {
    const classes = new Set();
    users.forEach((u) => (u.classes_teacher || []).forEach((c) => classes.add(c)));
    return [{ key: 'class', label: 'Class', options: Array.from(classes).sort() }];
  }
  if (role === ROLE_PARENT) {
    const students = new Set();
    users.forEach((u) => (u.children || []).forEach((c) => students.add(c)));
    return [{ key: 'student', label: 'Student', options: Array.from(students).sort() }];
  }
  if (role === ROLE_STUDENT) {
    const classes = new Set();
    users.forEach((u) => (u.classes_student || []).forEach((c) => classes.add(c)));
    return [
      { key: 'class', label: 'Class', options: Array.from(classes).sort() },
      { key: 'gender', label: 'Gender', options: ['Male', 'Female'] },
    ];
  }
  return [];
}

function matchesFilters(user, role, selectedFilters) {
  for (const [key, selected] of Object.entries(selectedFilters)) {
    if (!selected || selected.size === 0) continue;

    if (key === 'gender') {
      if (!genderLabelOf(user) || !selected.has(genderLabelOf(user))) return false;
      continue;
    }

    const list =
      key === 'class'
        ? (role === ROLE_TEACHER ? user.classes_teacher : user.classes_student) || []
        : role === ROLE_PARENT
        ? user.children || []
        : [];
    if (!list.some((item) => selected.has(item))) return false;
  }
  return true;
}

function FilterModal({ visible, title, filterDefs, selectedFilters, onToggle, onClear, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter {title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {filterDefs.map((def) => (
              <View key={def.key} style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>{def.label}</Text>
                {def.options.length === 0 ? (
                  <Text style={styles.detailEmpty}>Nothing on record yet</Text>
                ) : (
                  <View style={styles.filterChipsRow}>
                    {def.options.map((option) => {
                      const active = selectedFilters[def.key]?.has(option);
                      return (
                        <Pressable
                          key={option}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => onToggle(def.key, option)}
                        >
                          <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.clearBtn} onPress={onClear}>
            <Text style={styles.clearBtnText}>Clear filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function UserCard({ user }) {
  const detail = roleDetail(user);
  const genderLabel = user.role === ROLE_STUDENT ? genderLabelOf(user) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialOf(user)}</Text>
        </View>
        <View style={styles.cardIdentity}>
          <Text style={styles.cardName} numberOfLines={1}>{fullNameOf(user)}</Text>
          <Text style={styles.cardUsername} numberOfLines={1}>@{user.username}</Text>
        </View>
      </View>

      {user.email ? (
        <View style={styles.cardRow}>
          <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
          <Text style={styles.cardRowText} numberOfLines={1}>{user.email}</Text>
        </View>
      ) : null}

      {genderLabel ? (
        <View style={styles.cardRow}>
          <MaterialCommunityIcons
            name={genderLabel === 'Male' ? 'gender-male' : 'gender-female'}
            size={14}
            color={colors.textMuted}
          />
          <Text style={styles.cardRowText} numberOfLines={1}>{genderLabel}</Text>
        </View>
      ) : null}

      {detail.label ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>{detail.label}</Text>
          {detail.items.length === 0 ? (
            <Text style={styles.detailEmpty}>None on record</Text>
          ) : (
            <View style={styles.detailChips}>
              {detail.items.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.detailChip}>
                  <Text style={styles.detailChipText} numberOfLines={1}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function UserGroupSection({ title, icon, role, users, loading }) {
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({});

  const filterDefs = useMemo(() => buildFilterDefs(role, users), [role, users]);

  const activeFilterCount = useMemo(
    () => Object.values(selectedFilters).reduce((sum, set) => sum + (set ? set.size : 0), 0),
    [selectedFilters]
  );

  const filteredUsers = useMemo(
    () => users.filter((u) => matchesSearch(u, search) && matchesFilters(u, role, selectedFilters)),
    [users, search, selectedFilters, role]
  );

  function toggleFilterValue(key, value) {
    setSelectedFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[key] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[key] = set;
      return next;
    });
  }

  function clearFilters() {
    setSelectedFilters({});
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredUsers.length}</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${title.toLowerCase()}...`}
            placeholderTextColor={colors.placeholder}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filter ${title}`}
        >
          <Ionicons
            name="filter-outline"
            size={18}
            color={activeFilterCount > 0 ? colors.textOnPrimary : colors.primary}
          />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>
            {users.length === 0 ? 'No users in this category.' : 'No users match your search or filters.'}
          </Text>
        </View>
      ) : (
        <View style={styles.cardGrid}>
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </View>
      )}

      <FilterModal
        visible={filterVisible}
        title={title}
        filterDefs={filterDefs}
        selectedFilters={selectedFilters}
        onToggle={toggleFilterValue}
        onClear={clearFilters}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}

export default function ManageUserScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(GROUPS[0].key); // only used on narrow screens

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await apiCall('get', 'current_user_details/');
        setUsers(data);
      } catch (err) {
        console.error(err);
        setError('Could not load users.');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const grouped = useMemo(() => {
    const byRole = { [ROLE_TEACHER]: [], [ROLE_PARENT]: [], [ROLE_STUDENT]: [] };
    for (const user of users) {
      if (byRole[user.role] !== undefined) byRole[user.role].push(user);
    }
    return byRole;
  }, [users]);

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
          <Text style={styles.topBarTitle} numberOfLines={1}>Manage Users</Text>
          <Text style={styles.topBarSub} numberOfLines={1}>{brand.name}</Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {!isWide && (
            <View style={styles.tabRow}>
              {GROUPS.map((group) => (
                <Pressable
                  key={group.key}
                  style={[styles.tabBtn, activeTab === group.key && styles.tabBtnActive]}
                  onPress={() => setActiveTab(group.key)}
                >
                  <Text style={[styles.tabBtnText, activeTab === group.key && styles.tabBtnTextActive]}>
                    {group.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={isWide ? styles.wideRow : undefined}>
              {GROUPS.map((group) => (
                (isWide || activeTab === group.key) && (
                  <View key={group.key} style={isWide ? styles.wideColumn : undefined}>
                    <UserGroupSection
                      title={group.title}
                      icon={group.icon}
                      role={group.role}
                      users={grouped[group.role]}
                      loading={loading}
                    />
                  </View>
                )
              ))}
            </View>
          </ScrollView>
        </>
      )}
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
    fontFamily: fontFamilies.displaySemibold,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
  },
  topBarSub: {
    fontFamily: fontFamilies.bodyMedium,
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
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.textOnPrimary,
  },

  scroll: { padding: spacing.lg, paddingBottom: 60 },

  wideRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'flex-start',
  },
  wideColumn: { flex: 1 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  sectionHeaderText: {
    fontFamily: fontFamilies.displaySemibold,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    minWidth: 26,
    height: 22,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
    color: colors.primaryDark,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.body,
    color: colors.text,
    outlineStyle: 'none',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    color: colors.text,
  },

  cardGrid: { gap: spacing.md },

  card: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fonts.sizes.body,
    color: colors.primaryDark,
  },
  cardIdentity: { flex: 1 },
  cardName: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
    color: colors.text,
  },
  cardUsername: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cardRowText: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    flex: 1,
  },

  detailBlock: { marginTop: spacing.sm },
  detailLabel: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailEmpty: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.caption,
    color: colors.placeholder,
    fontStyle: 'italic',
  },
  detailChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  detailChipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.caption,
    color: colors.primaryDark,
  },

  centerBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: fonts.sizes.body,
    fontFamily: fontFamilies.bodyMedium,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.body,
    fontFamily: fontFamilies.bodyRegular,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(37, 46, 24, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    ...shadow,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fontFamilies.displaySemibold,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
  },
  modalClose: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
    color: colors.primary,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  filterGroup: { gap: spacing.sm },
  filterGroupLabel: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.caption,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  clearBtn: {
    margin: spacing.lg,
    marginTop: 0,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  clearBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
    color: colors.danger,
  },
});
