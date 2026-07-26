import { useMemo, useState } from 'react';
import {
  View,
  Text,
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
import { File } from 'expo-file-system';
import * as XLSX from 'xlsx';
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

const SPREADSHEET_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

const ROLE_LABELS = { 0: 'Parent', 1: 'Teacher', 2: 'Student' };

function normalizeRow(raw) {
  const get = (key) => String(raw[key] ?? '').trim();
  return {
    class_name: get('Class'),
    teacher_name: get('Teacher Name'),
    teacher_email: get('Teacher Email'),
    ta_name: get('TA Name'),
    ta_email: get('TA Email'),
    student_name: get('Student'),
    parent_email: get('Parent Email'),
    parent_name: get('Parent Name'),
  };
}

export default function CreateBulkClassesScreen({ navigation }) {
  const [fileName, setFileName] = useState(null);
  const [rows, setRows] = useState(null); // parsed + normalized rows, awaiting confirmation
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // response from the backend after submit

  const groupedRows = useMemo(() => {
    if (!rows) return [];
    const groups = [];
    const indexByClass = new Map();
    for (const row of rows) {
      const key = row.class_name || '(No class name)';
      if (!indexByClass.has(key)) {
        indexByClass.set(key, groups.length);
        groups.push({ className: key, rows: [] });
      }
      groups[indexByClass.get(key)].rows.push(row);
    }
    return groups;
  }, [rows]);

  async function handlePickFile() {
    setParsing(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: SPREADSHEET_MIME_TYPES,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];
      let workbook;

      if (Platform.OS === 'web' && asset.base64) {
        workbook = XLSX.read(asset.base64, { type: 'base64' });
      } else {
        const file = new File(asset.uri);
        const buffer = await file.arrayBuffer();
        workbook = XLSX.read(buffer, { type: 'array' });
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const parsedRows = rawRows
        .map(normalizeRow)
        .filter((row) => row.class_name || row.student_name);

      if (parsedRows.length === 0) {
        Alert.alert(
          'No rows found',
          'That file didn’t contain any recognizable rows. Check the column headers match the template.'
        );
        return;
      }

      setFileName(asset.name);
      setRows(parsedRows);
    } catch (err) {
      console.error(err);
      Alert.alert('Could not read file', 'Please make sure this is a valid .xlsx or .csv file and try again.');
    } finally {
      setParsing(false);
    }
  }

  function handleChooseDifferentFile() {
    setRows(null);
    setFileName(null);
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
                These accounts didn’t exist before this upload — share these credentials with each person.
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

          {groupedRows.map((group) => (
            <View key={group.className} style={styles.studentCard}>
              <Text style={styles.studentCardHeading}>{group.className}</Text>
              {group.rows.map((row, i) => (
                <View key={i} style={styles.previewRow}>
                  <Ionicons name="person-outline" size={16} color={BRONZE_COLORS.bronzeAccent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewStudentName}>{row.student_name || '(no name)'}</Text>
                    <Text style={styles.resultMeta}>
                      Teacher: {row.teacher_name || '—'}
                      {row.ta_name ? ` · TA: ${row.ta_name}` : ''}
                      {row.parent_name ? ` · Parent: ${row.parent_name}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <Pressable style={styles.secondaryButton} onPress={handleChooseDifferentFile} disabled={submitting}>
            <Text style={styles.secondaryButtonText}>Choose a Different File</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
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
            Upload an .xlsx spreadsheet with one row per student, with columns: Class, Teacher Name, Teacher
            Email, TA Name, TA Email, Student, Parent Email, Parent Name. Classes, teachers, TAs, students, and
            parents will be created (or reused, if they already exist) and linked together automatically.
          </Text>

          <Pressable
            style={[styles.primaryButton, parsing && styles.primaryButtonDisabled]}
            onPress={handlePickFile}
            disabled={parsing}
          >
            {parsing ? (
              <ActivityIndicator color={BRONZE_COLORS.surfaceWhite} />
            ) : (
              <View style={styles.uploadButtonContent}>
                <Ionicons name="cloud-upload-outline" size={20} color={BRONZE_COLORS.surfaceWhite} />
                <Text style={styles.primaryButtonText}>Choose Excel File</Text>
              </View>
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

  studentCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 20,
    marginBottom: 16,
  },
  studentCardHeading: { fontSize: 15, fontWeight: '700', color: BRONZE_COLORS.bronzeAccent, marginBottom: 12 },

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
