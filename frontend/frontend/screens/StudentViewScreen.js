// screens/StudentViewScreen.js
// -----------------------------------------------------------------------------
// Roster for a class: teachers + students.
// Navigates here from Dashboard with:  navigation.navigate('StudentRoster', { course })
// Tapping a student navigates to:      navigation.navigate('AddLog', { course, student })
//
// Adding people navigates to picker screens (not built here — see notes at
// bottom of file for the screens + backend endpoints this file assumes exist):
//   navigation.navigate('AddStudentToClass', { course })
//   navigation.navigate('AddTeacherToClass', { course })
//
// Add/remove actions (add teacher, add student, remove teacher, remove
// student) are only available to superusers. This is determined by calling
// GET /current_user/ and checking the `is_superuser` field on the response.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api.js'
import { brand }                                 from '../constants/brand';
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

// Alert.alert's button callbacks don't fire on Expo/React Native web — the
// dialog silently no-ops there. window.confirm is synchronous and works on
// web; Alert.alert is used everywhere else.
function confirmAsync(title, message) {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// ---------------------------------------------------------------------------
// Shared row (used for both teachers and students)
// ---------------------------------------------------------------------------
function PersonRow({ person, subtitle, onPress, onRemove, removeLabel }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(person)}</Text>
        </View>

        <View style={styles.rowBody}>
          <Text style={styles.studentName}>{fullNameOf(person)}</Text>
          {subtitle ? <Text style={styles.studentSub}>{subtitle}</Text> : null}
        </View>

        {onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </TouchableOpacity>

      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={12}
          style={styles.removeBtn}
          accessibilityLabel={removeLabel}
        >
          <Ionicons name="remove-circle-outline" size={22} color={colors.error ?? '#C0392B'} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function StudentView({ route, navigation }) {
  const { course } = route.params;

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');

  // Permissions — only superusers can add/remove teachers or students.
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // ------------------------------------------------------------------
  // Fetch current user (for permission checks)
  // ------------------------------------------------------------------
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/current_user/');
      setIsSuperuser(Boolean(res.data?.is_superuser));
    } catch (err) {
      console.error(err);
      // Fail closed: if we can't confirm superuser status, hide privileged actions.
      setIsSuperuser(false);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  // ------------------------------------------------------------------
  // Fetch roster (students + teachers together)
  // ------------------------------------------------------------------
  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        api.get(`/select_students/${course.id}/`),
        api.get(`/select_teachers/${course.id}/`),
      ]);
      setStudents(studentsRes.data);
      setTeachers(teachersRes.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch class roster.');
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Refresh whenever this screen regains focus (e.g. returning from the
  // Add Student / Add Teacher pickers), so newly added people show up.
  useFocusEffect(
    useCallback(() => {
      fetchRoster();
      fetchCurrentUser();
    }, [fetchRoster, fetchCurrentUser]),
  );

  // ------------------------------------------------------------------
  // Remove handlers (optimistic update + rollback on failure)
  // ------------------------------------------------------------------
  const removeStudent = useCallback(async (student) => {
    if (!isSuperuser) return;

    const confirmed = await confirmAsync(
      'Remove student',
      `Remove ${fullNameOf(student)} from this class?`,
    );
    if (!confirmed) return;

    const previous = students;
    setStudents(prev => prev.filter(s => s.id !== student.id));
    try {
      await api.post(`/remove_student/${course.id}/`, { student_id: student.id });
    } catch (err) {
      console.error(err);
      setStudents(previous);
      Alert.alert('Something went wrong', 'Could not remove that student. Please try again.');
    }
  }, [course, students, isSuperuser]);

  const removeTeacher = useCallback(async (teacher) => {
    if (!isSuperuser) return;

    const confirmed = await confirmAsync(
      'Remove teacher',
      `Remove ${fullNameOf(teacher)} from this class?`,
    );
    if (!confirmed) return;

    const previous = teachers;
    setTeachers(prev => prev.filter(t => t.id !== teacher.id));
    try {
      await api.post(`/remove_teacher/${course.id}/`, { teacher_id: teacher.id });
    } catch (err) {
      console.error(err);
      setTeachers(previous);
      Alert.alert('Something went wrong', 'Could not remove that teacher. Please try again.');
    }
  }, [course, teachers, isSuperuser]);

  // ------------------------------------------------------------------
  // Search filter (students only)
  // ------------------------------------------------------------------
  const filtered = search.trim()
    ? students.filter(s =>
        fullNameOf(s).toLowerCase().includes(search.trim().toLowerCase()),
      )
    : students;

  // ------------------------------------------------------------------
  // List header: teachers section + search bar + students section title
  // ------------------------------------------------------------------
  const ListHeader = (
    <View>
      {/* Teachers */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Teachers</Text>
        {isSuperuser ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddTeacherToClass', { course })}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addBtnText}>Add teacher</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {teachers.length === 0 ? (
        <Text style={styles.emptySectionText}>No teachers assigned yet</Text>
      ) : (
        teachers.map(teacher => (
          <PersonRow
            key={String(teacher.id ?? teacher._id)}
            person={teacher}
            subtitle={teacher.subject ?? teacher.role ?? null}
            onRemove={isSuperuser ? () => removeTeacher(teacher) : undefined}
            removeLabel="Remove teacher"
          />
        ))
      )}

      <View style={styles.sectionDivider} />

      {/* Students section title + add */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Students</Text>
        {isSuperuser ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddStudentToClass', { course })}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addBtnText}>Add student</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.name ?? course.title ?? 'Class'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchRoster} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id ?? item._id)}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              subtitle={item.level ?? null}
              onPress={() => navigation.navigate('AddLog', { course: course, student: item })}
              onRemove={isSuperuser ? () => removeStudent(item) : undefined}
              removeLabel="Remove student"
            />
          )}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {search ? 'No students match your search' : 'No students in this class'}
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

  // Header
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

  // Section headers (Teachers / Students)
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 15,
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptySectionText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
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
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  removeBtn: {
    padding: 6,
    marginLeft: spacing.sm,
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
