import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js'
import { colors, fontFamilies, radii, shadow, spacing } from '../constants/theme';

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
function TeacherPickRow({ teacher, added, adding, onPress }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={added || adding}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initialsOf(teacher)}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.studentName}>{fullNameOf(teacher)}</Text>
        {teacher.subject ?? teacher.role ? (
          <Text style={styles.studentSub}>{teacher.subject ?? teacher.role}</Text>
        ) : null}
      </View>

      {adding ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : added ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : (
        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function AddTeacherToClass({ route, navigation }) {
  const { course } = route.params;

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [addedIds, setAddedIds] = useState(() => new Set());
  const [addingId, setAddingId] = useState(null);

  // ------------------------------------------------------------------
  // Fetch all teachers
  // ------------------------------------------------------------------
  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/teachers/');
      setTeachers(response.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch teachers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // ------------------------------------------------------------------
  // Add handler
  // ------------------------------------------------------------------
  const addTeacher = useCallback(async (teacher) => {
    setAddingId(teacher.id);
    try {
      await api.post(`/add_teacher/${course.id}/`, { teacher_id: teacher.id });
      setAddedIds(prev => new Set(prev).add(teacher.id));
    } catch (err) {
      console.error(err);
      Alert.alert('Something went wrong', 'Could not add that teacher. Please try again.');
    } finally {
      setAddingId(null);
    }
  }, [course.id]);

  // ------------------------------------------------------------------
  // Search filter
  // ------------------------------------------------------------------
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter(t => fullNameOf(t).toLowerCase().includes(query));
  }, [teachers, search]);

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          Add Teacher
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teachers…"
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
          <TouchableOpacity onPress={fetchTeachers} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id ?? item._id)}
          renderItem={({ item }) => (
            <TeacherPickRow
              teacher={item}
              added={addedIds.has(item.id)}
              adding={addingId === item.id}
              onPress={() => addTeacher(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {search ? 'No teachers match your search' : 'No teachers found'}
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
  doneBtn: {
    width: 44,
    alignItems: 'flex-end',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
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
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  studentSub: {
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

