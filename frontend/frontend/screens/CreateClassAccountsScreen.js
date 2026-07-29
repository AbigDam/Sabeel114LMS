import { useState, useEffect, useMemo } from 'react';
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
  bronzeDeep: '#2A3820',
  bronzeBright: '#4D5E35',
  bronzeAccent: '#6B7A58',
  bgCanvas: '#F5F4EE',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  badgeBg: '#E6EDDA',
  badgeText: '#3C4B28',
  danger: '#DD0505',
  success: '#01885B',
};

const ROLE_LABELS = { 0: 'Parent', 1: 'Teacher', 2: 'Student' };

// --- Entry factories -------------------------------------------------
// Every entry (teacher / student / parent) carries a `mode` of 'existing'
// (picked from a dropdown of real accounts — always an "existing" account)
// or 'new' (typed by hand — existence is checked against the backend so
// staff don't accidentally create a duplicate).

const emptyTeacherEntry = () => ({
  mode: 'existing', // 'existing' | 'new'
  teacher_id: null,
  first_name: '',
  last_name: '',
  email: '',
  exists: undefined,
});

const emptyStudentEntry = () => ({
  mode: 'new', // students are usually brand new, but existing can be picked too
  student_id: null,
  first_name: '',
  last_name: '',
  exists: undefined,
  parents: [], // committed parent entries: { mode, parent_id?, first_name?, last_name?, email?, exists }
  // Draft fields for the "add a parent" control living under each student
  parentDraftMode: 'existing',
  parentDraftFirstName: '',
  parentDraftLastName: '',
  parentDraftEmail: '',
});

function ExistingBadge({ exists }) {
  if (exists === undefined) return null;
  return (
    <View style={[styles.badge, exists ? styles.badgeExisting : styles.badgeNew]}>
      <Text style={[styles.badgeLabel, exists ? styles.badgeLabelExisting : styles.badgeLabelNew]}>
        {exists ? 'Existing account' : 'New account'}
      </Text>
    </View>
  );
}

// Small segmented control for switching an entry between picking an existing
// account and typing a brand new one.
function ModeToggle({ mode, onChange, existingLabel = 'Choose Existing', newLabel = 'Enter New' }) {
  return (
    <View style={styles.modeToggleRow}>
      <Pressable
        style={[styles.modeToggleButton, mode === 'existing' && styles.modeToggleButtonActive]}
        onPress={() => onChange('existing')}
      >
        <Text style={[styles.modeToggleText, mode === 'existing' && styles.modeToggleTextActive]}>
          {existingLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.modeToggleButton, mode === 'new' && styles.modeToggleButtonActive]}
        onPress={() => onChange('new')}
      >
        <Text style={[styles.modeToggleText, mode === 'new' && styles.modeToggleTextActive]}>{newLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function CreateClassAccountsScreen({ navigation }) {
  // --- Class fields ---
  const [className, setClassName] = useState('');
  const [gender, setGender] = useState('');

  // --- Existing accounts fetched from the backend, for the dropdowns ---
  const [teachersList, setTeachersList] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  // --- Form entries ---
  const [teachers, setTeachers] = useState([emptyTeacherEntry()]);
  const [students, setStudents] = useState([emptyStudentEntry()]);

  // --- Existence-check state (only matters for 'new'-mode entries — dropdown
  // picks are existing accounts by definition) ---
  const [checkingExistence, setCheckingExistence] = useState(false);

  // --- UI state ---
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // holds created accounts after success

  useEffect(() => {
    async function loadTeachers() {
      try {
        const response = await api.get('/teachers/');
        setTeachersList(response.data);
      } catch (err) {
        console.error(err);
      }
    }

    async function loadParents() {
      try {
        const response = await api.get('/parents/');
        setParentsList(response.data);
      } catch (err) {
        console.error(err);
      }
    }

    async function loadStudents() {
      try {
        const response = await api.get('/students/');
        setStudentsList(response.data);
      } catch (err) {
        console.error(err);
      }
    }

    loadTeachers();
    loadParents();
    loadStudents();
  }, []);

  // --- Debounced existence check for every typed (mode: 'new') entry ---
  const existenceSignature = useMemo(
    () =>
      JSON.stringify({
        className: className.trim(),
        teachers: teachers.map((t) =>
          t.mode === 'new' ? [t.first_name.trim(), t.last_name.trim(), t.email.trim()] : null
        ),
        students: students.map((s) => ({
          self: s.mode === 'new' ? [s.first_name.trim(), s.last_name.trim()] : null,
          parents: (s.parents || []).map((p) =>
            p.mode === 'new' ? [p.first_name.trim(), p.last_name.trim(), p.email.trim()] : null
          ),
        })),
      }),
    [className, teachers, students]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      runExistenceChecks();
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existenceSignature]);

  async function runExistenceChecks() {
    const checkItems = [];

    teachers.forEach((t, i) => {
      if (t.mode === 'new' && (t.first_name.trim() || t.last_name.trim() || t.email.trim())) {
        checkItems.push({
          kind: 'teacher',
          teacherIndex: i,
          row: {
            class_name: className.trim(),
            teacher_name: `${t.first_name.trim()} ${t.last_name.trim()}`.trim(),
            teacher_email: t.email.trim(),
            ta_name: '',
            ta_email: '',
            student_name: '',
            parent_name: '',
            parent_email: '',
          },
        });
      }
    });

    students.forEach((s, si) => {
      if (s.mode === 'new' && (s.first_name.trim() || s.last_name.trim())) {
        checkItems.push({
          kind: 'student',
          studentIndex: si,
          row: {
            class_name: className.trim(),
            teacher_name: '',
            teacher_email: '',
            ta_name: '',
            ta_email: '',
            student_name: `${s.first_name.trim()} ${s.last_name.trim()}`.trim(),
            parent_name: '',
            parent_email: '',
          },
        });
      }

      (s.parents || []).forEach((p, pi) => {
        if (p.mode === 'new' && (p.first_name.trim() || p.last_name.trim() || p.email.trim())) {
          checkItems.push({
            kind: 'parent',
            studentIndex: si,
            parentIndex: pi,
            row: {
              class_name: className.trim(),
              teacher_name: '',
              teacher_email: '',
              ta_name: '',
              ta_email: '',
              student_name: '',
              parent_name: `${p.first_name.trim()} ${p.last_name.trim()}`.trim(),
              parent_email: p.email.trim(),
            },
          });
        }
      });
    });

    if (checkItems.length === 0) return;

    setCheckingExistence(true);
    try {
      const response = await api.post('/check_existing_accounts/', {
        rows: checkItems.map((c) => c.row),
      });
      const results = response.data?.results || [];

      setTeachers((prev) => {
        const next = [...prev];
        checkItems.forEach((item, i) => {
          if (item.kind === 'teacher') {
            next[item.teacherIndex] = { ...next[item.teacherIndex], exists: !!results[i]?.teacher_exists };
          }
        });
        return next;
      });

      setStudents((prev) => {
        const next = prev.map((s) => ({ ...s, parents: [...(s.parents || [])] }));
        checkItems.forEach((item, i) => {
          if (item.kind === 'student') {
            next[item.studentIndex] = { ...next[item.studentIndex], exists: !!results[i]?.student_exists };
          } else if (item.kind === 'parent') {
            const parentsArr = [...next[item.studentIndex].parents];
            parentsArr[item.parentIndex] = {
              ...parentsArr[item.parentIndex],
              exists: !!results[i]?.parent_exists,
            };
            next[item.studentIndex] = { ...next[item.studentIndex], parents: parentsArr };
          }
        });
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingExistence(false);
    }
  }

  // --- Teacher entry handlers ---
  function updateTeacherField(index, field, value) {
    setTeachers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function setTeacherMode(index, mode) {
    setTeachers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], mode, exists: undefined };
      return next;
    });
  }

  function addTeacherRow() {
    setTeachers((prev) => [...prev, emptyTeacherEntry()]);
  }

  function removeTeacherRow(index) {
    setTeachers((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  // --- Student entry handlers ---
  function updateStudentField(index, field, value) {
    setStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function setStudentMode(index, mode) {
    setStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], mode, exists: undefined };
      return next;
    });
  }

  function addStudentRow() {
    setStudents((prev) => [...prev, emptyStudentEntry()]);
  }

  function removeStudentRow(index) {
    setStudents((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  // --- Parent handlers (nested inside each student) ---
  function updateParentDraftField(studentIndex, field, value) {
    setStudents((prev) => {
      const next = [...prev];
      next[studentIndex] = { ...next[studentIndex], [field]: value };
      return next;
    });
  }

  function setParentDraftMode(studentIndex, mode) {
    setStudents((prev) => {
      const next = [...prev];
      next[studentIndex] = { ...next[studentIndex], parentDraftMode: mode };
      return next;
    });
  }

  function addExistingParent(studentIndex, parentId) {
    if (parentId === null || parentId === undefined) return;
    setStudents((prev) => {
      const student = prev[studentIndex];
      const already = (student.parents || []).some((p) => p.mode === 'existing' && p.parent_id === parentId);
      if (already) return prev;
      const next = [...prev];
      next[studentIndex] = {
        ...student,
        parents: [...(student.parents || []), { mode: 'existing', parent_id: parentId, exists: true }],
      };
      return next;
    });
  }

  function addNewParent(studentIndex) {
    setStudents((prev) => {
      const student = prev[studentIndex];
      const fn = student.parentDraftFirstName.trim();
      const ln = student.parentDraftLastName.trim();
      const em = student.parentDraftEmail.trim();
      if (!fn || !em) return prev; // require at least a first name + email to add

      const next = [...prev];
      next[studentIndex] = {
        ...student,
        parents: [
          ...(student.parents || []),
          { mode: 'new', first_name: fn, last_name: ln, email: em, exists: undefined },
        ],
        parentDraftFirstName: '',
        parentDraftLastName: '',
        parentDraftEmail: '',
      };
      return next;
    });
  }

  function removeParentFromStudent(studentIndex, parentIndex) {
    setStudents((prev) => {
      const next = [...prev];
      next[studentIndex] = {
        ...next[studentIndex],
        parents: (next[studentIndex].parents || []).filter((_, i) => i !== parentIndex),
      };
      return next;
    });
  }

  function validate() {
    const newErrors = {};
    if (!className.trim()) newErrors.className = 'Class name is required.';

    const teacherErrors = teachers.map((t) => {
      const err = {};
      if (t.mode === 'existing') {
        if (!t.teacher_id) err.teacher_id = 'Select a teacher, or switch to "Enter New".';
      } else {
        if (!t.first_name.trim()) err.first_name = 'Required';
        if (!t.last_name.trim()) err.last_name = 'Required';
        if (!t.email.trim()) err.email = 'Required';
      }
      return err;
    });
    if (teacherErrors.some((e) => Object.keys(e).length > 0)) newErrors.teachers = teacherErrors;

    const studentErrors = students.map((s) => {
      const err = {};
      if (s.mode === 'existing') {
        if (!s.student_id) err.student_id = 'Select a student, or switch to "Enter New".';
      } else {
        if (!s.first_name.trim()) err.first_name = 'Required';
        if (!s.last_name.trim()) err.last_name = 'Required';
      }
      return err;
    });
    if (studentErrors.some((e) => Object.keys(e).length > 0)) newErrors.students = studentErrors;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    setResult(null);

    const payload = {
      class_name: className.trim(),
      gender: gender,
      teachers: teachers.map((t) =>
        t.mode === 'existing'
          ? { teacher_id: t.teacher_id }
          : { first_name: t.first_name.trim(), last_name: t.last_name.trim(), email: t.email.trim() }
      ),
      students: students.map((s) => ({
        ...(s.mode === 'existing'
          ? { student_id: s.student_id }
          : { first_name: s.first_name.trim(), last_name: s.last_name.trim() }),
        parents: (s.parents || []).map((p) =>
          p.mode === 'existing'
            ? { parent_id: p.parent_id }
            : { first_name: p.first_name.trim(), last_name: p.last_name.trim(), email: p.email.trim() }
        ),
      })),
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

  function personLabel(person) {
    if (!person) return '';
    const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
    return name || person.username || '';
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
              {result.length} new {result.length === 1 ? 'account' : 'accounts'} created for {className}.
            </Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Login credentials</Text>
            <Text style={styles.resultCardHint}>
              Share these with each person. Passwords shown here are temporary — new accounts only.
            </Text>

            {result.map((r, i) => (
              <View key={r.id ?? r.student_id ?? r.username ?? i} style={styles.resultRow}>
                <View style={styles.resultRowIcon}>
                  <Ionicons name="person" size={18} color={BRONZE_COLORS.bronzeDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultUsername}>{r.username}</Text>
                  <Text style={styles.resultMeta}>
                    {ROLE_LABELS[r.role] ?? 'Account'}
                    {r.temporary_password ? ` · password: ${r.temporary_password}` : ''}
                  </Text>
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
          <View style={styles.row2Item}>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelected}
              itemTextStyle={styles.dropdownItem}
              data={[
                { label: 'Male', value: true },
                { label: 'Female', value: false },
              ]}
              labelField="label"
              valueField="value"
              placeholder="Select a gender..."
              value={gender}
              onChange={(item) => setGender(item.value)}
            />
          </View>
        </View>

        {/* Teachers */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleIndicator} />
          <Text style={styles.sectionTitleText}>Teachers</Text>
          {checkingExistence && (
            <View style={styles.checkingInline}>
              <ActivityIndicator size="small" color={BRONZE_COLORS.bronzeAccent} />
              <Text style={styles.checkingInlineText}>Checking accounts…</Text>
            </View>
          )}
        </View>

        {teachers.map((t, index) => {
          const tErr = errors.teachers?.[index] || {};
          const usedTeacherIds = teachers
            .filter((_, i) => i !== index)
            .map((tt) => tt.teacher_id)
            .filter(Boolean);
          const availableTeachers = teachersList.filter((tl) => !usedTeacherIds.includes(tl.id));

          return (
            <View key={index} style={styles.teacherCard}>
              <View style={styles.studentCardHeader}>
                <View style={styles.studentHeadingRow}>
                  <Text style={styles.studentCardHeading}>Teacher {index + 1}</Text>
                  <ExistingBadge exists={t.mode === 'existing' ? (t.teacher_id ? true : undefined) : t.exists} />
                </View>

                {teachers.length > 1 && (
                  <Pressable onPress={() => removeTeacherRow(index)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={BRONZE_COLORS.danger} />
                  </Pressable>
                )}
              </View>

              <ModeToggle mode={t.mode} onChange={(mode) => setTeacherMode(index, mode)} />

              {t.mode === 'existing' ? (
                <>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelected}
                    itemTextStyle={styles.dropdownItem}
                    search
                    searchPlaceholder="Search teachers..."
                    maxHeight={400}
                    data={availableTeachers.map((tt) => ({
                      label: `${personLabel(tt)}${tt.username ? ` (${tt.username})` : ''}`,
                      value: tt.id,
                    }))}
                    labelField="label"
                    valueField="value"
                    placeholder="Select a teacher..."
                    value={t.teacher_id}
                    onChange={(item) => updateTeacherField(index, 'teacher_id', item.value)}
                  />
                  {tErr.teacher_id ? <Text style={styles.fieldErrorText}>{tErr.teacher_id}</Text> : null}
                </>
              ) : (
                <>
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <Field
                        label="First Name"
                        value={t.first_name}
                        onChangeText={(v) => updateTeacherField(index, 'first_name', v)}
                        placeholder="First name"
                        error={tErr.first_name}
                      />
                    </View>
                    <View style={styles.row2Item}>
                      <Field
                        label="Last Name"
                        value={t.last_name}
                        onChangeText={(v) => updateTeacherField(index, 'last_name', v)}
                        placeholder="Last name"
                        error={tErr.last_name}
                      />
                    </View>
                  </View>
                  <Field
                    label="Email"
                    value={t.email}
                    onChangeText={(v) => updateTeacherField(index, 'email', v)}
                    placeholder="teacher@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={tErr.email}
                  />
                </>
              )}
            </View>
          );
        })}
        <Pressable style={styles.addStudentButton} onPress={addTeacherRow}>
          <Ionicons name="add-circle-outline" size={20} color={BRONZE_COLORS.bronzeBright} />
          <Text style={styles.addStudentButtonText}>Add Teacher</Text>
        </Pressable>

        {/* Students */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleIndicator} />
          <Text style={styles.sectionTitleText}>Students</Text>
        </View>

        {students.map((s, index) => {
          const rowError = errors.students?.[index] || {};
          const usedStudentIds = students
            .filter((_, i) => i !== index)
            .map((ss) => ss.student_id)
            .filter(Boolean);
          const availableStudents = studentsList.filter((sl) => !usedStudentIds.includes(sl.id));

          const studentParents = s.parents || [];
          const usedParentIds = studentParents.filter((p) => p.mode === 'existing').map((p) => p.parent_id);
          const availableParentsForDraft = parentsList.filter((p) => !usedParentIds.includes(p.id));
          const canAddNewParent = s.parentDraftFirstName.trim() && s.parentDraftEmail.trim();

          return (
            <View key={index} style={styles.studentCard}>
              <View style={styles.studentCardHeader}>
                <View style={styles.studentHeadingRow}>
                  <Text style={styles.studentCardHeading}>Student {index + 1}</Text>
                  <ExistingBadge exists={s.mode === 'existing' ? (s.student_id ? true : undefined) : s.exists} />
                </View>
                {students.length > 1 && (
                  <Pressable onPress={() => removeStudentRow(index)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={BRONZE_COLORS.danger} />
                  </Pressable>
                )}
              </View>

              <ModeToggle mode={s.mode} onChange={(mode) => setStudentMode(index, mode)} />

              {s.mode === 'existing' ? (
                <>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelected}
                    itemTextStyle={styles.dropdownItem}
                    search
                    searchPlaceholder="Search students..."
                    maxHeight={400}
                    data={availableStudents.map((sl) => ({
                      label: `${personLabel(sl)}${sl.username ? ` (${sl.username})` : ''}`,
                      value: sl.id,
                    }))}
                    labelField="label"
                    valueField="value"
                    placeholder="Select a student..."
                    value={s.student_id}
                    onChange={(item) => updateStudentField(index, 'student_id', item.value)}
                  />
                  {rowError.student_id ? <Text style={styles.fieldErrorText}>{rowError.student_id}</Text> : null}
                </>
              ) : (
                <View style={styles.row2}>
                  <View style={styles.row2Item}>
                    <Field
                      label="First Name"
                      value={s.first_name}
                      onChangeText={(v) => updateStudentField(index, 'first_name', v)}
                      placeholder="First name"
                      error={rowError.first_name}
                    />
                  </View>
                  <View style={styles.row2Item}>
                    <Field
                      label="Last Name"
                      value={s.last_name}
                      onChangeText={(v) => updateStudentField(index, 'last_name', v)}
                      placeholder="Last name"
                      error={rowError.last_name}
                    />
                  </View>
                </View>
              )}

              {/* Parents */}
              <View style={styles.parentsSection}>
                <Text style={styles.fieldLabel}>Parents</Text>

                {studentParents.length > 0 && (
                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {studentParents.map((p, pi) => {
                      const existingParentObj =
                        p.mode === 'existing' ? parentsList.find((pl) => pl.id === p.parent_id) : null;
                      const name =
                        p.mode === 'existing' ? personLabel(existingParentObj) : `${p.first_name} ${p.last_name}`.trim();
                      const email = p.mode === 'existing' ? existingParentObj?.username : p.email;

                      return (
                        <View key={pi} style={styles.parentRow}>
                          <Ionicons name="person-circle-outline" size={18} color={BRONZE_COLORS.bronzeAccent} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.parentRowName}>{name || 'Parent'}</Text>
                            {!!email && <Text style={styles.resultMeta}>{email}</Text>}
                          </View>
                          <ExistingBadge exists={p.mode === 'existing' ? true : p.exists} />
                          <Pressable onPress={() => removeParentFromStudent(index, pi)} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color={BRONZE_COLORS.textMuted} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                <ModeToggle
                  mode={s.parentDraftMode}
                  onChange={(mode) => setParentDraftMode(index, mode)}
                  existingLabel="Choose Existing"
                  newLabel="Enter New"
                />

                {s.parentDraftMode === 'existing' ? (
                  <Dropdown
                    style={styles.dropdownSmall}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelected}
                    itemTextStyle={styles.dropdownItem}
                    data={availableParentsForDraft.map((p) => ({
                      label: `${personLabel(p)}${p.username ? ` (${p.username})` : ''}`,
                      value: p.id,
                    }))}
                    labelField="label"
                    valueField="value"
                    placeholder="+ Add a parent"
                    value={null}
                    onChange={(item) => addExistingParent(index, item.value)}
                  />
                ) : (
                  <View>
                    <View style={styles.row2}>
                      <View style={styles.row2Item}>
                        <Field
                          label="Parent First Name"
                          value={s.parentDraftFirstName}
                          onChangeText={(v) => updateParentDraftField(index, 'parentDraftFirstName', v)}
                          placeholder="First name"
                        />
                      </View>
                      <View style={styles.row2Item}>
                        <Field
                          label="Parent Last Name"
                          value={s.parentDraftLastName}
                          onChangeText={(v) => updateParentDraftField(index, 'parentDraftLastName', v)}
                          placeholder="Last name"
                        />
                      </View>
                    </View>
                    <Field
                      label="Parent Email"
                      value={s.parentDraftEmail}
                      onChangeText={(v) => updateParentDraftField(index, 'parentDraftEmail', v)}
                      placeholder="parent@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={[styles.addParentButton, !canAddNewParent && styles.primaryButtonDisabled]}
                      onPress={() => addNewParent(index)}
                      disabled={!canAddNewParent}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={BRONZE_COLORS.bronzeBright} />
                      <Text style={styles.addParentButtonText}>Add Parent</Text>
                    </Pressable>
                  </View>
                )}
              </View>
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

  dropdownSmall: {
    height: 44,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    borderRadius: 10,
    backgroundColor: BRONZE_COLORS.bgCanvas,
    paddingHorizontal: 12,
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

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8, flexWrap: 'wrap' },
  sectionTitleIndicator: { width: 6, height: 22, backgroundColor: BRONZE_COLORS.bronzeBright, borderRadius: 3 },
  sectionTitleText: { fontSize: 18, fontWeight: '700', color: BRONZE_COLORS.textDark },

  checkingInline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  checkingInlineText: { fontSize: 12, fontWeight: '600', color: BRONZE_COLORS.textMuted },

  card: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 28,
  },

  teacherCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 16,
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
  studentHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  studentCardHeading: { fontSize: 15, fontWeight: '700', color: BRONZE_COLORS.bronzeAccent },

  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeExisting: {
    backgroundColor: '#FCEFC7',
    borderColor: '#E8B93A',
  },
  badgeNew: {
    backgroundColor: '#DCF3E8',
    borderColor: BRONZE_COLORS.success,
  },
  badgeLabel: { fontSize: 11, fontWeight: '700' },
  badgeLabelExisting: { color: '#7A5B06' },
  badgeLabelNew: { color: BRONZE_COLORS.success },

  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: BRONZE_COLORS.bgCanvas,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeToggleButtonActive: {
    backgroundColor: BRONZE_COLORS.bronzeBright,
  },
  modeToggleText: { fontSize: 13, fontWeight: '700', color: BRONZE_COLORS.textMuted },
  modeToggleTextActive: { color: BRONZE_COLORS.surfaceWhite },

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

  /* Parents (nested inside each student card) */
  parentsSection: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BRONZE_COLORS.borderLight,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BRONZE_COLORS.badgeBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  parentRowName: { fontSize: 14, fontWeight: '700', color: BRONZE_COLORS.badgeText },

  addParentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: BRONZE_COLORS.bronzeBright,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  addParentButtonText: { color: BRONZE_COLORS.bronzeBright, fontWeight: '700', fontSize: 13 },

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