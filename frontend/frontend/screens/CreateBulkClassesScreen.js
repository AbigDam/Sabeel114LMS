import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../api.js';

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

const CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain'];

const ROLE_LABELS = { 0: 'Parent', 1: 'Teacher', 2: 'Student' };

// This field determines which side of campus / roommate group a student is
// placed with, so it is strictly Male or Female — no free-text/custom values.
const GENDER_OPTIONS = ['Male', 'Female'];

// Normalizes loose CSV gender values (M/F/m/f/etc.) into Male or Female.
// Anything that doesn't clearly match either is left blank so it's obvious
// in the preview that it still needs to be set.
function normalizeGenderLabel(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  if (['m', 'male', 'boy'].includes(lower)) return 'Male';
  if (['f', 'female', 'girl'].includes(lower)) return 'Female';
  return '';
}

// Converts a Google Sheets share link (edit/view URL) into the direct CSV
// export URL for that sheet/tab, e.g.
//   https://docs.google.com/spreadsheets/d/ABC123/edit#gid=456
//   -> https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=456
function toGoogleSheetsCsvUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const sheetId = idMatch[1];

  // gid can show up as #gid=123 or ?gid=123
  const gidMatch = trimmed.match(/[#?&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}


function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] ?? '';
      });
      return obj;
    });
}

async function checkExistingAccounts(parsedRows) {
  try {
    const response = await api.post('/check_existing_accounts/', { rows: parsedRows });
    const results = response.data?.results || [];
    return parsedRows.map((row, i) => ({
      ...row,
      teacher_exists: !!results[i]?.teacher_exists,
      ta_exists: !!results[i]?.ta_exists,
      student_exists: !!results[i]?.student_exists,
      parent_exists: !!results[i]?.parent_exists,
    }));
  } catch (err) {
    console.error('check_existing_accounts failed', err);
    // Fail gracefully — preview still works, just without existence badges.
    return parsedRows;
  }
}

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

function GenderTag({ gender }) {
  const label = normalizeGenderLabel(gender);
  if (!label) {
    // Blank or unrecognized value — flag it since housing placement needs Male or Female.
    return (
      <View style={styles.genderTagMissing}>
        <Text style={styles.genderTagMissingText}>Set gender</Text>
      </View>
    );
  }
  return (
    <View style={styles.genderTag}>
      <Text style={styles.genderTagText}>{label}</Text>
    </View>
  );
}

function EditIconButton({ onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.editIconButton}>
      <Ionicons name="pencil" size={13} color={BRONZE_COLORS.bronzeAccent} />
    </Pressable>
  );
}

function EditForm({ values, onChange, onSave, onCancel, showEmail, showGender }) {
  return (
    <View style={styles.editForm}>
      <TextInput
        style={styles.editInput}
        value={values.name}
        onChangeText={(name) => onChange({ ...values, name })}
        placeholder="Name"
        placeholderTextColor={BRONZE_COLORS.textMuted}
        autoFocus
      />
      {showEmail && (
        <TextInput
          style={styles.editInput}
          value={values.email}
          onChangeText={(email) => onChange({ ...values, email })}
          placeholder="Email"
          placeholderTextColor={BRONZE_COLORS.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      )}
      {showGender && (
        <View>
          <Text style={styles.editFieldLabel}>Gender</Text>
          <View style={styles.genderOptionsRow}>
            {GENDER_OPTIONS.map((option) => {
              const selected = normalizeGenderLabel(values.gender) === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => onChange({ ...values, gender: option })}
                  style={[styles.genderOptionButton, selected && styles.genderOptionButtonSelected]}
                >
                  <Text
                    style={[
                      styles.genderOptionButtonText,
                      selected && styles.genderOptionButtonTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <View style={styles.editFormActions}>
        <Pressable onPress={onCancel} style={styles.editCancelButton}>
          <Text style={styles.editCancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onSave} style={styles.editSaveButton}>
          <Text style={styles.editSaveButtonText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

function normalizeRow(raw) {
  const get = (key) => String(raw[key] ?? '').trim();
  return {
    class_name: get('Class'),
    teacher_name: get('Teacher Name'),
    teacher_email: get('Teacher Email'),
    ta_name: get('TA Name'),
    ta_email: get('TA Email'),
    student_name: get('Student'),
    gender: get('Gender'),
    parent_email: get('Parent Email'),
    parent_name: get('Parent Name'),
  };
}

export default function CreateBulkClassesScreen({ navigation }) {
  const [fileName, setFileName] = useState(null);
  const [rows, setRows] = useState(null); // parsed + normalized rows, awaiting confirmation
  const [parsing, setParsing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // response from the backend after submit
  const [editing, setEditing] = useState(null); // { type: 'teacher'|'ta'|'student'|'parent', className?, rowIndex? }
  const [editValues, setEditValues] = useState({});
  const [checking, setChecking] = useState(false); // re-checking existence after an edit

  const groupedRows = useMemo(() => {
    if (!rows) return [];
    const groups = [];
    const indexByClass = new Map();
    rows.forEach((row, originalIndex) => {
      const key = row.class_name || '(No class name)';
      if (!indexByClass.has(key)) {
        indexByClass.set(key, groups.length);
        groups.push({ className: key, rows: [] });
      }
      groups[indexByClass.get(key)].rows.push({ row, originalIndex });
    });
    return groups;
  }, [rows]);

  async function loadRowsFromCsvText(text, sourceName) {
    if (!text || !text.trim()) {
      Alert.alert('Empty sheet', 'That file or sheet appears to be empty.');
      return false;
    }

    const rawRows = parseCSV(text);
    const parsedRows = rawRows
      .map(normalizeRow)
      .filter((row) => row.class_name || row.student_name);

    if (parsedRows.length === 0) {
      Alert.alert(
        'No rows found',
        'That didn\u2019t contain any recognizable rows. Check the column headers match the template.'
      );
      return false;
    }

    const rowsWithExistence = await checkExistingAccounts(parsedRows);

    setFileName(sourceName);
    setRows(rowsWithExistence);
    return true;
  }

  async function handlePickFile() {
    setParsing(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: CSV_MIME_TYPES,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      let text;

      if (Platform.OS === 'web') {
        // On web, asset.uri is a blob: URL — fetch it and read as text.
        const resp = await fetch(asset.uri);
        text = await resp.text();
      } else {
        // Legacy expo-file-system API — stable across SDK versions.
        text = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      await loadRowsFromCsvText(text, asset.name);
    } catch (err) {
      console.error(err);
      Alert.alert('Could not read file', `Please make sure this is a valid .csv file and try again.\n\n${err?.message || ''}`);
    } finally {
      setParsing(false);
    }
  }

  async function handleLoadFromGoogleSheet() {
    const csvUrl = toGoogleSheetsCsvUrl(sheetUrl);
    if (!csvUrl) {
      Alert.alert(
        'Invalid link',
        'That doesn\u2019t look like a Google Sheets link. Paste the full URL from your browser\u2019s address bar.'
      );
      return;
    }

    setLoadingSheet(true);
    try {
      const resp = await fetch(csvUrl);

      if (!resp.ok) {
        Alert.alert(
          'Could not load sheet',
          'Make sure the sheet\u2019s sharing setting is "Anyone with the link can view", then try again.'
        );
        return;
      }

      const text = await resp.text();

      // Google returns an HTML sign-in page (not CSV) when the sheet isn't shared publicly.
      if (text.trim().startsWith('<')) {
        Alert.alert(
          'Could not load sheet',
          'This sheet doesn\u2019t seem to be publicly viewable. In Google Sheets, click Share > General access > "Anyone with the link", then try again.'
        );
        return;
      }

      const loaded = await loadRowsFromCsvText(text, 'Google Sheet');
      if (loaded) setSheetUrl('');
    } catch (err) {
      console.error(err);
      Alert.alert('Could not load sheet', `Please check the link and your connection, then try again.\n\n${err?.message || ''}`);
    } finally {
      setLoadingSheet(false);
    }
  }

  function handleChooseDifferentFile() {
    setRows(null);
    setFileName(null);
    setSheetUrl('');
  }

  function startEditTeacher(className, first) {
    setEditing({ type: 'teacher', className });
    setEditValues({ name: first.teacher_name || '', email: first.teacher_email || '' });
  }

  function startEditTA(className, first) {
    setEditing({ type: 'ta', className });
    setEditValues({ name: first.ta_name || '', email: first.ta_email || '' });
  }

  function startEditStudent(rowIndex, row) {
    setEditing({ type: 'student', rowIndex });
    setEditValues({ name: row.student_name || '', gender: row.gender || '' });
  }

  function startEditParent(rowIndex, row) {
    setEditing({ type: 'parent', rowIndex });
    setEditValues({ name: row.parent_name || '', email: row.parent_email || '' });
  }

  function cancelEdit() {
    setEditing(null);
    setEditValues({});
  }

  async function saveEdit() {
    if (!editing) return;

    let updatedRows;
    if (editing.type === 'teacher') {
      // Teacher is shared across the whole class, so update every row in that class.
      updatedRows = rows.map((r) =>
        r.class_name === editing.className
          ? { ...r, teacher_name: editValues.name.trim(), teacher_email: editValues.email.trim() }
          : r
      );
    } else if (editing.type === 'ta') {
      updatedRows = rows.map((r) =>
        r.class_name === editing.className
          ? { ...r, ta_name: editValues.name.trim(), ta_email: editValues.email.trim() }
          : r
      );
    } else if (editing.type === 'student') {
      updatedRows = rows.map((r, i) =>
        i === editing.rowIndex
          ? { ...r, student_name: editValues.name.trim(), gender: (editValues.gender || '').trim() }
          : r
      );
    } else if (editing.type === 'parent') {
      updatedRows = rows.map((r, i) =>
        i === editing.rowIndex
          ? { ...r, parent_name: editValues.name.trim(), parent_email: editValues.email.trim() }
          : r
      );
    } else {
      updatedRows = rows;
    }

    setEditing(null);
    setEditValues({});

    // Re-check existence for everyone, since a corrected spelling can change whether
    // a name/email now matches (or no longer matches) an existing account.
    setChecking(true);
    try {
      const rechecked = await checkExistingAccounts(updatedRows);
      setRows(rechecked);
    } catch (err) {
      console.error(err);
      setRows(updatedRows); // keep the edit even if the recheck call fails
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const response = await api.post('/bulk_create_classes/', { rows });
      setResult(response.data);
    } catch (err) {
      console.error(err?.response?.data || err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Could not create the classes and accounts. Please try again.';
      Alert.alert('Something went wrong', message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    navigation.goBack();
  }

  // --- Results screen ---
  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={26} color={BRONZE_COLORS.bronzeAccent} />
          </Pressable>
          <Text style={styles.headerTitle}>Upload Complete</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollCanvas}>
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={40} color={BRONZE_COLORS.success} />
            <Text style={styles.successTitle}>Classes & accounts created</Text>
            <Text style={styles.successSubtitle}>
              {result.classes_created} new {result.classes_created === 1 ? 'class' : 'classes'} created
              {result.classes_reused > 0
                ? `, ${result.classes_reused} existing ${result.classes_reused === 1 ? 'class' : 'classes'} updated`
                : ''}
              . {result.accounts_created.length} new {result.accounts_created.length === 1 ? 'account' : 'accounts'}{' '}
              created.
            </Text>
          </View>

          {result.accounts_created.length > 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>New login credentials</Text>
              <Text style={styles.resultCardHint}>
                These accounts didn\u2019t exist before this upload — share these credentials with each person.
              </Text>

              {result.accounts_created.map((acct, i) => (
                <View key={`${acct.username}-${i}`} style={styles.resultRow}>
                  <View style={styles.resultRowIcon}>
                    <Ionicons name="person" size={18} color={BRONZE_COLORS.bronzeDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultUsername}>{acct.username}</Text>
                    <Text style={styles.resultMeta}>
                      {ROLE_LABELS[acct.role] || 'Account'} · password: {acct.temporary_password}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.primaryButton} onPress={handleDone}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Preview screen (file parsed, not yet submitted) ---
  if (rows) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={26} color={BRONZE_COLORS.bronzeAccent} />
          </Pressable>
          <Text style={styles.headerTitle}>Review Upload</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollCanvas}>
          <View style={styles.card}>
            <View style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={22} color={BRONZE_COLORS.bronzeAccent} />
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
            </View>
            <Text style={styles.fieldLabel}>
              {groupedRows.length} {groupedRows.length === 1 ? 'class' : 'classes'}, {rows.length}{' '}
              {rows.length === 1 ? 'student' : 'students'} found. Review below before creating accounts.
            </Text>
          </View>

          {checking && (
            <View style={styles.checkingBanner}>
              <ActivityIndicator size="small" color={BRONZE_COLORS.bronzeAccent} />
              <Text style={styles.checkingBannerText}>Re-checking accounts…</Text>
            </View>
          )}

          {groupedRows.map((group) => {
            const first = group.rows[0]?.row || {};
            const isEditingTeacher = editing?.type === 'teacher' && editing.className === group.className;
            const isEditingTA = editing?.type === 'ta' && editing.className === group.className;

            return (
              <View key={group.className} style={styles.studentCard}>
                <Text style={styles.studentCardHeading}>{group.className}</Text>

                <View style={styles.classStaffBlock}>
                  {/* Teacher */}
                  <View style={styles.classStaffRow}>
                    <Ionicons name="school-outline" size={16} color={BRONZE_COLORS.bronzeAccent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classStaffLabel}>Teacher</Text>
                      {isEditingTeacher ? (
                        <EditForm
                          values={editValues}
                          onChange={setEditValues}
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                          showEmail
                        />
                      ) : (
                        <>
                          <View style={styles.previewNameRow}>
                            <Text style={styles.classStaffName}>{first.teacher_name || '—'}</Text>
                            <ExistingBadge exists={first.teacher_exists} />
                            <EditIconButton onPress={() => startEditTeacher(group.className, first)} />
                          </View>
                          {!!first.teacher_email && (
                            <Text style={styles.resultMeta}>{first.teacher_email}</Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>

                  {/* TA */}
                  {(first.ta_name || first.ta_email || isEditingTA) && (
                    <View style={styles.classStaffRow}>
                      <Ionicons name="account-supervisor-outline" size={16} color={BRONZE_COLORS.bronzeAccent} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.classStaffLabel}>TA</Text>
                        {isEditingTA ? (
                          <EditForm
                            values={editValues}
                            onChange={setEditValues}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            showEmail
                          />
                        ) : (
                          <>
                            <View style={styles.previewNameRow}>
                              <Text style={styles.classStaffName}>{first.ta_name || '—'}</Text>
                              <ExistingBadge exists={first.ta_exists} />
                              <EditIconButton onPress={() => startEditTA(group.className, first)} />
                            </View>
                            {!!first.ta_email && (
                              <Text style={styles.resultMeta}>{first.ta_email}</Text>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>

                {group.rows.map(({ row, originalIndex }) => {
                  const isEditingStudent = editing?.type === 'student' && editing.rowIndex === originalIndex;
                  const isEditingParent = editing?.type === 'parent' && editing.rowIndex === originalIndex;

                  return (
                    <View key={originalIndex} style={styles.previewRow}>
                      <Ionicons name="person-outline" size={16} color={BRONZE_COLORS.bronzeAccent} />
                      <View style={{ flex: 1 }}>
                        {isEditingStudent ? (
                          <EditForm
                            values={editValues}
                            onChange={setEditValues}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            showGender
                          />
                        ) : (
                          <View style={styles.previewNameRow}>
                            <Text style={styles.previewStudentName}>{row.student_name || '(no name)'}</Text>
                            <GenderTag gender={row.gender} />
                            <ExistingBadge exists={row.student_exists} />
                            <EditIconButton onPress={() => startEditStudent(originalIndex, row)} />
                          </View>
                        )}

                        {isEditingParent ? (
                          <View style={{ marginTop: 6 }}>
                            <EditForm
                              values={editValues}
                              onChange={setEditValues}
                              onSave={saveEdit}
                              onCancel={cancelEdit}
                              showEmail
                            />
                          </View>
                        ) : (
                          <View style={styles.previewNameRow}>
                            <Text style={styles.resultMeta}>
                              Parent: {row.parent_name || '—'}
                              {row.parent_email ? ` · ${row.parent_email}` : ''}
                            </Text>
                            <ExistingBadge exists={row.parent_exists} />
                            <EditIconButton onPress={() => startEditParent(originalIndex, row)} />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

          <Pressable
            style={styles.secondaryButton}
            onPress={handleChooseDifferentFile}
            disabled={submitting || checking}
          >
            <Text style={styles.secondaryButtonText}>Choose a Different File</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, (submitting || checking) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || checking}
          >
            {submitting ? (
              <ActivityIndicator color={BRONZE_COLORS.surfaceWhite} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Classes & Accounts</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Initial upload screen ---
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={BRONZE_COLORS.bronzeAccent} />
        </Pressable>
        <Text style={styles.headerTitle}>Bulk Load Classes</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollCanvas}>
        <View style={styles.card}>
          <Text style={styles.sectionTitleText}>Upload a class roster</Text>
          <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 20 }]}>
            Upload a .csv file with one row per student, with columns: Class, Teacher Name, Teacher
            Email, TA Name, TA Email, Student, Gender, Parent Email, Parent Name. Classes, teachers, TAs, students, and
            parents will be created (or reused, if they already exist) and linked together automatically.
          </Text>

          <Pressable
            style={[styles.primaryButton, parsing && styles.primaryButtonDisabled]}
            onPress={handlePickFile}
            disabled={parsing || loadingSheet}
          >
            {parsing ? (
              <ActivityIndicator color={BRONZE_COLORS.surfaceWhite} />
            ) : (
              <View style={styles.uploadButtonContent}>
                <Ionicons name="cloud-upload-outline" size={20} color={BRONZE_COLORS.surfaceWhite} />
                <Text style={styles.primaryButtonText}>Choose CSV File</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Paste a Google Sheets link</Text>
          <TextInput
            style={styles.editInput}
            value={sheetUrl}
            onChangeText={setSheetUrl}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            placeholderTextColor={BRONZE_COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!parsing && !loadingSheet}
          />
          <Text style={[styles.fieldLabel, { fontWeight: '400', marginTop: 6, marginBottom: 14 }]}>
            The sheet's sharing setting must be "Anyone with the link can view."
          </Text>

          <Pressable
            style={[
              styles.secondaryButton,
              { marginBottom: 0 },
              (loadingSheet || !sheetUrl.trim()) && styles.primaryButtonDisabled,
            ]}
            onPress={handleLoadFromGoogleSheet}
            disabled={parsing || loadingSheet || !sheetUrl.trim()}
          >
            {loadingSheet ? (
              <ActivityIndicator color={BRONZE_COLORS.bronzeBright} />
            ) : (
              <Text style={styles.secondaryButtonText}>Load from Google Sheets</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRONZE_COLORS.bgCanvas },

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

  sectionTitleText: { fontSize: 18, fontWeight: '700', color: BRONZE_COLORS.textDark },

  card: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 24,
  },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  fileName: { fontSize: 15, fontWeight: '600', color: BRONZE_COLORS.textDark, flexShrink: 1 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: BRONZE_COLORS.textMuted },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BRONZE_COLORS.borderLight },
  dividerText: { fontSize: 12, fontWeight: '700', color: BRONZE_COLORS.textMuted, letterSpacing: 0.5 },

  studentCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 16,
  },
  studentCardHeading: { fontSize: 15, fontWeight: '700', color: BRONZE_COLORS.bronzeAccent, marginBottom: 12 },

  classStaffBlock: {
    backgroundColor: BRONZE_COLORS.badgeBg,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  classStaffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  classStaffLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BRONZE_COLORS.badgeText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classStaffName: { fontSize: 14, fontWeight: '700', color: BRONZE_COLORS.textDark, marginTop: 1 },

  previewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 2,
  },

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

  genderTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    backgroundColor: '#EDEBF7',
    borderColor: '#8B7FC7',
  },
  genderTagText: { fontSize: 11, fontWeight: '700', color: '#4B3E9E' },
  genderTagMissing: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    backgroundColor: '#FCE7E7',
    borderColor: BRONZE_COLORS.danger,
  },
  genderTagMissingText: { fontSize: 11, fontWeight: '700', color: BRONZE_COLORS.danger },

  editIconButton: {
    padding: 4,
    borderRadius: 6,
  },

  editForm: {
    marginTop: 4,
    marginBottom: 4,
    gap: 8,
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BRONZE_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: BRONZE_COLORS.bronzeBright,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: BRONZE_COLORS.textDark,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
  },
  genderOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOptionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
  },
  genderOptionButtonSelected: {
    backgroundColor: BRONZE_COLORS.bronzeBright,
    borderColor: BRONZE_COLORS.bronzeBright,
  },
  genderOptionButtonText: { fontSize: 13, fontWeight: '600', color: BRONZE_COLORS.textMuted },
  genderOptionButtonTextSelected: { color: BRONZE_COLORS.surfaceWhite },
  editFormActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
  },
  editCancelButtonText: { fontSize: 13, fontWeight: '700', color: BRONZE_COLORS.textMuted },
  editSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: BRONZE_COLORS.bronzeBright,
  },
  editSaveButtonText: { fontSize: 13, fontWeight: '700', color: BRONZE_COLORS.surfaceWhite },

  checkingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BRONZE_COLORS.badgeBg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  checkingBannerText: { fontSize: 13, fontWeight: '700', color: BRONZE_COLORS.badgeText },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: BRONZE_COLORS.borderLight,
  },
  previewStudentName: { fontSize: 14, fontWeight: '600', color: BRONZE_COLORS.textDark },

  uploadButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  primaryButton: {
    backgroundColor: BRONZE_COLORS.bronzeBright,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: BRONZE_COLORS.surfaceWhite, fontWeight: '700', fontSize: 16 },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: BRONZE_COLORS.bronzeBright,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: { color: BRONZE_COLORS.bronzeBright, fontWeight: '700', fontSize: 15 },

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