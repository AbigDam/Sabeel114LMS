// screens/StudentViewScreen.js
// -----------------------------------------------------------------------------
// Student roster for a class.
// Navigates here from Dashboard with:  navigation.navigate('StudentRoster', { course })
// Tapping a student navigates to:      navigation.navigate('AddLog', { course, student })
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api.js'
import { brand }                                 from '../constants/brand';
import { colors, radii, shadow, spacing }        from '../constants/theme';

// ---------------------------------------------------------------------------
// Student row
// ---------------------------------------------------------------------------
function StudentRow({ student, onPress }) {
const fullName = student.first_name && student.last_name 
    ? `${student.first_name} ${student.last_name}`
    : student.name ?? 'Unknown Student';

  // Extract initials cleanly from first and last names
  const initials = student.first_name && student.last_name
    ? (student.first_name.charAt(0) + student.last_name.charAt(0)).toUpperCase()
    : '?';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.studentName}>{fullName}</Text>
        {student.level ? (
          <Text style={styles.studentSub}>{student.level}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function StudentView({ route, navigation }) {
  const { course } = route.params;

  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');

  // ------------------------------------------------------------------
  // Fetch roster
  // ------------------------------------------------------------------
const fetchStudents = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const token = await AsyncStorage.getItem('authToken');
    const response = await api.get(`/select_students/${course.id}/`);
    setStudents(response.data);
  } catch (err) {
    console.error(err);
    setError(err.message || 'Failed to fetch student roster.');
  } finally {
    setLoading(false); // <--- This ensures the loader stops spinning
  }
}, [course.id]);

useEffect(() => {
  fetchStudents();
}, [fetchStudents]);
  // ------------------------------------------------------------------
  // Search filter
  // ------------------------------------------------------------------
  const filtered = search.trim()
    ? students.filter(s =>
        s.name?.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : students;

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

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchStudents} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id ?? item._id)}
          renderItem={({ item }) => (
            <StudentRow
              student={item}
              onPress={() => navigation.navigate('AddLog', { course: course, student: item })}
            />
          )}
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
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