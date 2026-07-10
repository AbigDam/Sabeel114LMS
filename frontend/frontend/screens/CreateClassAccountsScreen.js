import { useState,useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api.js';
import { Dropdown } from 'react-native-element-dropdown';
const BRONZE_COLORS = {
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
  danger: '#DD0505',
  success: '#01885B',
};

const emptyStudent = () => ({ first_name: '', last_name: '', email: '' });

export default function CreateClassAccountsScreen({ navigation }) {
  // --- Class fields ---
  const [className, setClassName] = useState('');
  const [program, setProgram] = useState('');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([null]);
  // --- Student rows ---
  const [students, setStudents] = useState([emptyStudent()]);

  // --- UI state ---
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // holds created accounts after success

  useEffect(() => {
  async function loadTeachers() {
    try {
      const response = await api.get("/teachers/");
      setTeachers(response.data);
    } catch (err) {
      console.error(err);
    }
  }

  loadTeachers();
}, []);

  function updateStudent(index, field, value) {
    setStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addStudentRow() {
    setStudents((prev) => [...prev, emptyStudent()]);
  }

  function removeStudentRow(index) {
    setStudents((prev) => {
      if (prev.length === 1) return prev; // always keep at least 1 row
      return prev.filter((_, i) => i !== index);
    });
  }
function addTeacherRow() {
  setSelectedTeachers((prev) => [...prev, null]);
}

function removeTeacherRow(index) {
  setSelectedTeachers((prev) => prev.filter((_, i) => i !== index));
}

function updateTeacher(index, teacherId) {
  setSelectedTeachers((prev) => {
    const next = [...prev];
    next[index] = teacherId;
    return next;
  });
}
  function validate() {
    const newErrors = {};

    if (!className.trim()) newErrors.className = 'Class name is required.';
    if (!program.trim()) newErrors.program = 'Program is required.';
    if (!schedule.trim()) newErrors.schedule = 'Schedule is required.';
    if (!room.trim()) newErrors.room = 'Room is required.';

    const studentErrors = students.map((s) => {
      const rowErr = {};
      if (!s.first_name.trim()) rowErr.first_name = 'Required';
      if (!s.last_name.trim()) rowErr.last_name = 'Required';
      return rowErr;
    });

    if (studentErrors.some((e) => Object.keys(e).length > 0)) {
      newErrors.students = studentErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    setResult(null);

    const payload = {
      class_name: className.trim(),
      program: program.trim(),
      schedule: schedule.trim(),
      room: room.trim(),
      teacher_ids: selectedTeachers.filter(id => id !== null),
      first_names: students.map((s) => s.first_name.trim()),
      last_names: students.map((s) => s.last_name.trim()),
      emails: students.map((s) => s.email.trim() || ""),
    };

    try {
      const response = await api.post('/create_class_accounts/', payload);
      setResult(response.data?.created || []);
    } catch (err) {
      console.error(err?.response?.data || err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Could not create the class and accounts. Please try again.';
      Alert.alert('Something went wrong', message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDoneViewResult() {
    navigation.goBack();
  }

  // --- Success screen: show created usernames/IDs ---
  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={26} color={BRONZE_COLORS.bronzeAccent} />
          </Pressable>
          <Text style={styles.headerTitle}>Accounts Created</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollCanvas}>
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={40} color={BRONZE_COLORS.success} />
            <Text style={styles.successTitle}>Class &amp; accounts created</Text>
            <Text style={styles.successSubtitle}>
              {result.length} student {result.length === 1 ? 'account' : 'accounts'} created for{' '}
              {className}.
            </Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Login credentials</Text>
            <Text style={styles.resultCardHint}>
              Share these with each student. Default password: studentpass
            </Text>

            {result.map((r, i) => (
              <View key={r.student_id ?? i} style={styles.resultRow}>
                <View style={styles.resultRowIcon}>
                  <Ionicons name="person" size={18} color={BRONZE_COLORS.bronzeDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultUsername}>{r.username}</Text>
                  <Text style={styles.resultMeta}>Student ID: {r.student_id}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleDoneViewResult}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Main form ---
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={BRONZE_COLORS.bronzeAccent} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Class &amp; Accounts</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollCanvas} keyboardShouldPersistTaps="handled">
        {/* Class details */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleIndicator} />
          <Text style={styles.sectionTitleText}>Class Details</Text>
        </View>

        <View style={styles.card}>
          <Field
            label="Class Name"
            value={className}
            onChangeText={setClassName}
            placeholder="e.g. Quran Memorization A"
            error={errors.className}
          />
          <Field
            label="Program"
            value={program}
            onChangeText={setProgram}
            placeholder="e.g. Weekend Hifz Program"
            error={errors.program}
          />
          <View style={styles.row2}>
            <View style={styles.row2Item}>
              <Field
                label="Schedule"
                value={schedule}
                onChangeText={setSchedule}
                placeholder="e.g. Sat 10am–12pm"
                error={errors.schedule}
              />
            </View>
            <View style={styles.row2Item}>
              <Field
                label="Room"
                value={room}
                onChangeText={setRoom}
                placeholder="e.g. Room 204"
                error={errors.room}
              />
            </View>
          </View>
        </View>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleIndicator} />
          <Text style={styles.sectionTitleText}>Teachers</Text>
        </View>

        {selectedTeachers.map((teacherId, index) => (
            <View key={index} style={styles.teacherCard}>
              <View style={styles.studentCardHeader}>
                <Text style={styles.studentCardHeading}>
                  Teacher {index + 1}
                </Text>

                {selectedTeachers.length > 1 && (
                  <Pressable onPress={() => removeTeacherRow(index)}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={BRONZE_COLORS.danger}
                    />
                  </Pressable>
                )}
              </View>

              <Dropdown
                style={styles.dropdown}
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelected}
                itemTextStyle={styles.dropdownItem}
                data={teachers.map(t => ({
                  label: `${t.first_name} ${t.last_name} (${t.username})`,
                  value: t.id,
                }))}
                labelField="label"
                valueField="value"
                placeholder="Select a teacher..."
                value={teacherId}
                onChange={item => updateTeacher(index, item.value)}
              />
            </View>
          ))}
          <Pressable
              style={styles.addStudentButton}
              onPress={addTeacherRow}
          >
              <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={BRONZE_COLORS.bronzeBright}
              />
              <Text style={styles.addStudentButtonText}>
                  Add Teacher
              </Text>
          </Pressable>
        {/* Students */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleIndicator} />
          <Text style={styles.sectionTitleText}>Students</Text>
        </View>

        {students.map((student, index) => {
          const rowError = errors.students?.[index] || {};
          return (
            <View key={index} style={styles.studentCard}>
              <View style={styles.studentCardHeader}>
                <Text style={styles.studentCardHeading}>Student {index + 1}</Text>
                {students.length > 1 && (
                  <Pressable onPress={() => removeStudentRow(index)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={BRONZE_COLORS.danger} />
                  </Pressable>
                )}
              </View>

              <View style={styles.row2}>
                <View style={styles.row2Item}>
                  <Field
                    label="First Name"
                    value={student.first_name}
                    onChangeText={(t) => updateStudent(index, 'first_name', t)}
                    placeholder="First name"
                    error={rowError.first_name}
                  />
                </View>
                <View style={styles.row2Item}>
                  <Field
                    label="Last Name"
                    value={student.last_name}
                    onChangeText={(t) => updateStudent(index, 'last_name', t)}
                    placeholder="Last name"
                    error={rowError.last_name}
                  />
                </View>
              </View>

              <Field
                label="Email"
                value={student.email}
                onChangeText={(t) => updateStudent(index, 'email', t)}
                placeholder="student@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={rowError.email}
              />
            </View>
          );
        })}

        <Pressable style={styles.addStudentButton} onPress={addStudentRow}>
          <Ionicons name="add-circle-outline" size={20} color={BRONZE_COLORS.bronzeBright} />
          <Text style={styles.addStudentButtonText}>Add Student</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={BRONZE_COLORS.surfaceWhite} />
          ) : (
            <Text style={styles.primaryButtonText}>Create Class &amp; Accounts</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Reusable labeled input ---------------- */
function Field({ label, error, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, error && styles.fieldInputError]}
        placeholderTextColor="#9CA3AF"
        {...inputProps}
      />
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRONZE_COLORS.bgCanvas },

  dropdown: {
  height: 54,
  borderWidth: 1,
  borderColor: BRONZE_COLORS.borderLight,
  borderRadius: 10,
  backgroundColor: '#FFF',
  paddingHorizontal: 14,
},

dropdownPlaceholder: {
  color: '#9CA3AF',
  fontSize: 15,
},

dropdownSelected: {
  color: BRONZE_COLORS.textDark,
  fontSize: 15,
  fontWeight: '600',
},

dropdownItem: {
  fontSize: 15,
},

  header: {
    height: 64,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 4,
    borderBottomColor: BRONZE_COLORS.bronzeAccent,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: BRONZE_COLORS.textDark },

  scrollCanvas: {
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  sectionTitleIndicator: { width: 6, height: 22, backgroundColor: BRONZE_COLORS.bronzeBright, borderRadius: 3 },
  sectionTitleText: { fontSize: 18, fontWeight: '700', color: BRONZE_COLORS.textDark },

  card: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 28,
  },

  studentCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 16,
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentCardHeading: { fontSize: 15, fontWeight: '700', color: BRONZE_COLORS.bronzeAccent },

  row2: { flexDirection: 'row', gap: 16 },
  row2Item: { flex: 1 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: BRONZE_COLORS.textMuted, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: BRONZE_COLORS.textDark,
    backgroundColor: BRONZE_COLORS.bgCanvas,
  },
  fieldInputError: { borderColor: BRONZE_COLORS.danger },
  fieldErrorText: { color: BRONZE_COLORS.danger, fontSize: 12, marginTop: 4 },

  addStudentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BRONZE_COLORS.bronzeBright,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 28,
  },
  addStudentButtonText: { color: BRONZE_COLORS.bronzeBright, fontWeight: '700', fontSize: 15 },

  primaryButton: {
    backgroundColor: BRONZE_COLORS.bronzeBright,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: BRONZE_COLORS.surfaceWhite, fontWeight: '700', fontSize: 16 },

  /* Success state */
  successBanner: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: BRONZE_COLORS.textDark, marginTop: 4 },
  successSubtitle: { fontSize: 14, color: BRONZE_COLORS.textMuted, textAlign: 'center' },

  resultCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 28,
  },
  resultCardTitle: { fontSize: 16, fontWeight: '700', color: BRONZE_COLORS.textDark, marginBottom: 4 },
  resultCardHint: { fontSize: 13, color: BRONZE_COLORS.textMuted, marginBottom: 16 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRONZE_COLORS.borderLight,
  },
  resultRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRONZE_COLORS.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultUsername: { fontSize: 15, fontWeight: '700', color: BRONZE_COLORS.textDark },
  resultMeta: { fontSize: 13, color: BRONZE_COLORS.textMuted, marginTop: 2 },
});