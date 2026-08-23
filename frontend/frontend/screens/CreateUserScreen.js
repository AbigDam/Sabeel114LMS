import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api.js';
import { colors, fontFamilies, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Config: which fields + role value + endpoint per user type
// ---------------------------------------------------------------------------
const GENDER_OPTIONS = ['Male', 'Female'];

const TYPE_CONFIG = {
  parent: {
    title: 'Create Parent',
    role: 0,
    showEmail: true,
    showGender: false,
    showEmailNotifications: true, // only parents get this
    picker: 'children', // pick students
  },
  teacher: {
    title: 'Create Teacher',
    role: 1,
    showEmail: true,
    showGender: false,
    showEmailNotifications: false,
    picker: 'classes', // pick classes taught
  },
  student: {
    title: 'Create Student',
    role: 2,
    showEmail: false,
    showGender: true,
    showEmailNotifications: false,
    picker: 'classesAndParents', // pick classes enrolled + parents
  },
};

const CREATE_USER_ENDPOINT = '/create_user/';
const OPTIONS_ENDPOINTS = {
  students: '/students/',
  parents: '/parents/',
  classes: '/select_classes/',
};

function personLabel(p) {
  if (p.first_name || p.last_name) return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return p.name ?? p.username ?? `#${p.id}`;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function FieldLabel({ children }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function GenderPicker({ value, onChange }) {
  return (
    <View style={styles.genderRow}>
      {GENDER_OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onChange(option)}
            style={[styles.genderOption, selected && styles.genderOptionSelected]}
            activeOpacity={0.7}
          >
            <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CredentialRow({ label, value, copyable }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.credentialRow}>
      <Text style={styles.credentialLabel}>{label}</Text>
      <View style={styles.credentialValueRow}>
        <Text style={styles.credentialValue}>{value}</Text>
        {copyable && (
          <TouchableOpacity onPress={handleCopy} hitSlop={10} style={styles.copyBtn}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied ? (colors.success ?? '#2E8B57') : colors.primary}
            />
            <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Generic optional multi-select: chips for current selection + a searchable
// checklist below. Used for children / classes / parents pickers.
function MultiSelectSection({
  label,
  items,
  loading,
  loadError,
  onRetry,
  selectedIds,
  onToggle,
  getLabel,
  emptyText,
}) {
  const [query, setQuery] = useState('');

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.includes(it.id)),
    [items, selectedIds],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => getLabel(it).toLowerCase().includes(q));
  }, [items, query, getLabel]);

  return (
    <View style={styles.pickerSection}>
      <FieldLabel>{label} (optional)</FieldLabel>

      {loading ? (
        <View style={styles.pickerLoadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.pickerHintText}>Loading options…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.pickerLoadingRow}>
          <Text style={styles.errorTextSmall}>Couldn't load options.</Text>
          <TouchableOpacity onPress={onRetry} hitSlop={8}>
            <Text style={styles.retryInlineText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.pickerHintText}>{emptyText}</Text>
      ) : (
        <>
          {selectedItems.length > 0 && (
            <View style={styles.chipRow}>
              {selectedItems.map((it) => (
                <View key={String(it.id)} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>{getLabel(it)}</Text>
                  <TouchableOpacity onPress={() => onToggle(it.id)} hitSlop={8}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${label.toLowerCase()}…`}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.pickerListBox}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredItems.length === 0 ? (
                <Text style={[styles.pickerHintText, { padding: spacing.sm }]}>No matches.</Text>
              ) : (
                filteredItems.map((it) => {
                  const selected = selectedIds.includes(it.id);
                  return (
                    <TouchableOpacity
                      key={String(it.id)}
                      style={styles.pickerRow}
                      onPress={() => onToggle(it.id)}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.pickerRowText} numberOfLines={1}>{getLabel(it)}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

// Fetches a single options list (students/parents/classes) on demand.
function useOptionsList(shouldLoad, endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api
      .get(endpoint)
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : res.data?.results ?? []);
      })
      .catch((err) => {
        console.error(`Failed to load ${endpoint}`, err);
        if (!cancelled) setLoadError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad, endpoint, attempt]);

  return { items, loading, loadError, retry: () => setAttempt((a) => a + 1) };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function CreateUserScreen({ route, navigation }) {
  const { type } = route.params || {};
  const config = TYPE_CONFIG[type];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { id, username, temporary_password }

  const [selectedChildIds, setSelectedChildIds] = useState([]);   // parent -> students
  const [selectedClassIds, setSelectedClassIds] = useState([]);   // teacher/student -> classes
  const [selectedParentIds, setSelectedParentIds] = useState([]); // student -> parents

  const needsStudents = config?.picker === 'children';
  const needsClasses = config?.picker === 'classes' || config?.picker === 'classesAndParents';
  const needsParents = config?.picker === 'classesAndParents';

  const studentsList = useOptionsList(needsStudents, OPTIONS_ENDPOINTS.students);
  const classesList = useOptionsList(needsClasses, OPTIONS_ENDPOINTS.classes);
  const parentsList = useOptionsList(needsParents, OPTIONS_ENDPOINTS.parents);

  function toggleId(ids, setIds, id) {
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create User</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Unsupported user type: "{String(type)}"</Text>
        </View>
      </SafeAreaView>
    );
  }

  function validate() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing name', 'Please enter a first and last name.');
      return false;
    }
    if (config.showEmail && !email.trim()) {
      Alert.alert('Missing email', 'Please enter an email address.');
      return false;
    }
    if (config.showGender && !gender) {
      Alert.alert('Missing gender', 'Please select Male or Female.');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        role: config.role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      if (config.showEmail) payload.email = email.trim();
      if (config.showGender) payload.gender = gender === 'Male';
      if (config.showEmailNotifications) payload.email_notifications = emailNotifications;

      if (needsStudents && selectedChildIds.length) payload.child_ids = selectedChildIds;
      if (needsClasses && selectedClassIds.length) payload.class_ids = selectedClassIds;
      if (needsParents && selectedParentIds.length) payload.parent_ids = selectedParentIds;

      const response = await api.post(CREATE_USER_ENDPOINT, payload);
      setResult(response.data);
    } catch (err) {
      console.error(err?.response?.data || err);
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Could not create this account. Please try again.';
      Alert.alert('Something went wrong', message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    navigation.goBack();
  }

  function handleViewProfile() {
    navigation.replace('UserDetail', { type, id: result.id });
  }

  // --- Success state ---
  if (result) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>{config.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.bodyContent}>
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success ?? '#2E8B57'} />
            <Text style={styles.successTitle}>Account created</Text>
            <Text style={styles.successSubtitle}>
              Share these credentials with {firstName} — they'll need them to log in for the first time.
            </Text>
          </View>

          <View style={styles.card}>
            <CredentialRow label="Username" value={result.username} copyable />
            <CredentialRow label="Temporary password" value={result.temporary_password} copyable />
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewProfile}>
            <Text style={styles.secondaryButtonText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Form state ---
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <FieldLabel>First name</FieldLabel>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Jane"
            placeholderTextColor={colors.textMuted}
          />

          <FieldLabel>Last name</FieldLabel>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
            placeholderTextColor={colors.textMuted}
          />

          {config.showEmail && (
            <>
              <FieldLabel>Email</FieldLabel>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="jane.doe@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </>
          )}

          {config.showGender && (
            <>
              <FieldLabel>Gender</FieldLabel>
              <GenderPicker value={gender} onChange={setGender} />
            </>
          )}

          {config.showEmailNotifications && (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Email notifications</FieldLabel>
                <Text style={styles.switchHint}>Send account and activity emails to this address.</Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ true: colors.primary }}
              />
            </View>
          )}

          {needsStudents && (
            <MultiSelectSection
              label="Children"
              items={studentsList.items}
              loading={studentsList.loading}
              loadError={studentsList.loadError}
              onRetry={studentsList.retry}
              selectedIds={selectedChildIds}
              onToggle={(id) => toggleId(selectedChildIds, setSelectedChildIds, id)}
              getLabel={personLabel}
              emptyText="No students on file yet."
            />
          )}

          {needsClasses && (
            <MultiSelectSection
              label="Classes"
              items={classesList.items}
              loading={classesList.loading}
              loadError={classesList.loadError}
              onRetry={classesList.retry}
              selectedIds={selectedClassIds}
              onToggle={(id) => toggleId(selectedClassIds, setSelectedClassIds, id)}
              getLabel={(c) => c.title}
              emptyText="No classes on file yet."
            />
          )}

          {needsParents && (
            <MultiSelectSection
              label="Parents"
              items={parentsList.items}
              loading={parentsList.loading}
              loadError={parentsList.loadError}
              onRetry={parentsList.retry}
              selectedIds={selectedParentIds}
              onToggle={(id) => toggleId(selectedParentIds, setSelectedParentIds, id)}
              getLabel={personLabel}
              emptyText="No parents on file yet."
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{config.title}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface ?? colors.background,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.displayBold,
    fontSize: 17,
    color: colors.text,
  },

  bodyContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },

  card: {
    backgroundColor: colors.surface ?? '#fff',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs ?? 6,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md ?? radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },

  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md ?? radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderOptionText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  genderOptionTextSelected: { color: '#fff' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  switchHint: { fontSize: 12, color: colors.textMuted, marginTop: -2 },

  // Multi-select picker
  pickerSection: { marginTop: spacing.sm },
  pickerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickerHintText: { fontSize: 13, color: colors.textMuted },
  errorTextSmall: { fontSize: 13, color: colors.error ?? '#C0392B' },
  retryInlineText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    borderRadius: radii.md ?? radii.lg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary, flexShrink: 1 },

  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md ?? radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  pickerListBox: {
    maxHeight: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md ?? radii.lg,
    backgroundColor: colors.background,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerRowText: { fontSize: 14, color: colors.text, flexShrink: 1 },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700', fontSize: 15 },

  successBanner: {
    backgroundColor: colors.surface ?? '#fff',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 6,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
  successSubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  credentialRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  credentialLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  credentialValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialValue: { fontSize: 15, fontWeight: '600', color: colors.text, letterSpacing: 0.5 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  copyBtnTextCopied: { color: colors.success ?? '#2E8B57' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { fontSize: 15, color: colors.error ?? '#C0392B', textAlign: 'center' },
});