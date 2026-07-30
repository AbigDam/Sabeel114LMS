// screens/UserDetailScreen.js
// -----------------------------------------------------------------------------
// Full detail view for a single teacher / student / parent, reached from
// UserListScreen (navigation.navigate('UserDetail', { type, id })).
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api.js'
import { brand } from '../constants/brand';
import { colors, fonts, fontFamilies, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Config: endpoint + display title/icon per user type
// ---------------------------------------------------------------------------
const TYPE_CONFIG = {
  teacher: { endpoint: id => `/teachers/${id}/`, title: 'Teacher', icon: 'school-outline' },
  student: { endpoint: id => `/students/${id}/`, title: 'Student', icon: 'account-school-outline' },
  parent:  { endpoint: id => `/parents/${id}/`,  title: 'Parent',  icon: 'account-heart-outline' },
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function initialsOf(person) {
  return person.first_name && person.last_name
    ? (person.first_name.charAt(0) + person.last_name.charAt(0)).toUpperCase()
    : '?';
}

function personName(person) {
  return person.first_name && person.last_name
    ? `${person.first_name} ${person.last_name}`
    : person.name ?? 'Unknown';
}

// Alert.alert's button callbacks don't fire on Expo/React Native web — the
// dialog silently no-ops there. window.confirm is synchronous and works on
// web; Alert.alert is used everywhere else.
function confirmAsync(title, message, confirmLabel = 'Remove') {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: confirmLabel === 'Remove' ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

// A titled card section — the building block every group of fields below
// (Contact, Classes, Access, ...) is wrapped in.
function Section({ icon, title, count, right, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        {icon ? <MaterialCommunityIcons name={icon} size={18} color={colors.primary} /> : null}
        <Text style={styles.sectionHeaderText}>{title}</Text>
        {typeof count === 'number' ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        ) : null}
        {right}
      </View>
      {children}
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Pill({ text, tone = 'neutral' }) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}`]]}>
      <Text style={[styles.pillText, styles[`pillText_${tone}`]]}>{text}</Text>
    </View>
  );
}

function AddButton({ label, onPress }) {
  return (
    <Pressable style={styles.addBtn} onPress={onPress} hitSlop={8}>
      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

// A single linked entity row (class / parent / child) — tap the row to open
// it, tap the trailing icon to remove the link. The two are sibling
// Pressables (not nested) so the remove tap can't be swallowed by the row's
// own onPress.
function EntityRow({ icon, label, onPress, onRemove, removeLabel }) {
  return (
    <View style={styles.entityRow}>
      <Pressable
        style={styles.entityRowMain}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        <View style={styles.entityIconWrap}>
          <MaterialCommunityIcons name={icon} size={16} color={colors.primaryDark} />
        </View>
        <Text style={styles.entityRowText} numberOfLines={1}>{label}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
      </Pressable>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          style={styles.entityRemoveBtn}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
        >
          <Ionicons name="close-circle" size={18} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Temp passwords are sensitive — hidden by default, tap to reveal.
// Once a user has used their temp password, the backend returns null/"No
// password" — show that plainly instead of a maskable secret.
function PasswordChip({ password }) {
  const [visible, setVisible] = useState(false);
  const hasPassword = password && password !== 'No password';

  if (!hasPassword) {
    return <Text style={styles.valueTextMuted}>No password on file</Text>;
  }

  return (
    <Pressable style={styles.passwordChip} onPress={() => setVisible(v => !v)}>
      <Text style={styles.passwordText}>{visible ? password : '••••••••'}</Text>
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textMuted} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function UserDetailScreen({ route, navigation }) {
  const { type, id } = route.params;
  const config = TYPE_CONFIG[type];

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(config.endpoint(id));
      setUser(response.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch user.');
    } finally {
      setLoading(false);
    }
  }, [config, id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Refresh whenever this screen regains focus (e.g. returning from the
  // Add Parent / Add Child pickers), so newly added links show up.
  useFocusEffect(
    useCallback(() => {
      fetchUser();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, id]),
  );

  const fullName = user
    ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name ?? 'Unknown')
    : '';

  const removeParentFromStudent = useCallback(async (parent) => {
    const confirmed = await confirmAsync(
      'Remove parent',
      `Remove ${personName(parent)} as a parent of ${fullName}?`,
    );
    if (!confirmed) return;

    const previous = user;
    setUser(prev => ({ ...prev, parents: prev.parents.filter(p => p.id !== parent.id) }));
    try {
      await api.post(`/remove_parent/${id}/`, { parent_id: parent.id });
    } catch (err) {
      console.error(err);
      setUser(previous);
      Alert.alert('Something went wrong', 'Could not remove that parent. Please try again.');
    }
  }, [id, user, fullName]);

  const removeChildFromParent = useCallback(async (child) => {
    const confirmed = await confirmAsync(
      'Remove child',
      `Remove ${personName(child)} as a child of ${fullName}?`,
    );
    if (!confirmed) return;

    const previous = user;
    setUser(prev => ({ ...prev, children: prev.children.filter(c => c.id !== child.id) }));
    try {
      await api.post(`/remove_child/${id}/`, { student_id: child.id });
    } catch (err) {
      console.error(err);
      setUser(previous);
      Alert.alert('Something went wrong', 'Could not remove that child. Please try again.');
    }
  }, [id, user, fullName]);

  const toggleAdmin = useCallback(async () => {
    const grantingAdmin = !user.is_admin;
    const confirmed = await confirmAsync(
      grantingAdmin ? 'Grant admin access' : 'Remove admin access',
      grantingAdmin
        ? `Give ${fullName} administrative access?`
        : `Remove ${fullName}'s administrative access?`,
      grantingAdmin ? 'Grant' : 'Remove',
    );
    if (!confirmed) return;

    const previous = user;
    setUser(prev => ({ ...prev, is_admin: grantingAdmin }));
    try {
      await api.post(`/set_admin/${id}/`, { is_admin: grantingAdmin });
    } catch (err) {
      console.error(err);
      setUser(previous);
      Alert.alert('Something went wrong', 'Could not update admin access. Please try again.');
    }
  }, [id, user, fullName]);

  const openClass = (course) => {
    if (!course?.id) return;
    navigation.navigate('StudentRoster', { course });
  };

  const openUser = (nextType, nextId) => {
    navigation.push('UserDetail', { type: nextType, id: nextId });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{config.title} Profile</Text>
          <Text style={styles.topBarSub} numberOfLines={1}>{brand.name}</Text>
        </View>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={fetchUser} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Identity header */}
          <View style={styles.identityCard}>
            <View style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initialsOf(user)}</Text>
            </View>
            <Text style={styles.name}>{fullName}</Text>
            {user.username ? <Text style={styles.username}>@{user.username}</Text> : null}
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name={config.icon} size={14} color={colors.primaryDark} />
              <Text style={styles.roleBadgeText}>{config.title}</Text>
            </View>
          </View>

          {/* ---------------- Teacher ---------------- */}
          {type === 'teacher' && (
            <>
              <Section title="Contact">
                <Field label="Email">
                  <Text style={styles.valueText}>{user.email ?? '—'}</Text>
                </Field>
              </Section>

              <Section
                icon="school-outline"
                title="Classes teaching"
                count={user.classes?.length ?? 0}
                right={
                  <View style={styles.statInline}>
                    <Text style={styles.statInlineNumber}>{user.student_count ?? user.total_students ?? 0}</Text>
                    <Text style={styles.statInlineLabel}>students</Text>
                  </View>
                }
              >
                {user.classes?.length ? (
                  user.classes.map(cls => (
                    <EntityRow
                      key={String(cls.id)}
                      icon="school-outline"
                      label={cls.name}
                      onPress={() => openClass(cls)}
                    />
                  ))
                ) : (
                  <Text style={styles.valueTextMuted}>No classes assigned</Text>
                )}
              </Section>

              <Section title="Access">
                <Field label="Admin">
                  <View style={styles.adminRow}>
                    <Pill text={user.is_admin ? 'Admin' : 'Not admin'} tone={user.is_admin ? 'positive' : 'neutral'} />
                    <Pressable style={styles.adminToggleBtn} onPress={toggleAdmin} hitSlop={8}>
                      <Ionicons
                        name={user.is_admin ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={16}
                        color={user.is_admin ? colors.danger : colors.primary}
                      />
                      <Text style={[styles.adminToggleBtnText, user.is_admin && styles.adminToggleBtnTextDanger]}>
                        {user.is_admin ? 'Remove admin' : 'Grant admin'}
                      </Text>
                    </Pressable>
                  </View>
                </Field>
                <Field label="Temporary password">
                  <PasswordChip password={user.temp_password ?? user.temporary_password ?? ''} />
                </Field>
              </Section>
            </>
          )}

          {/* ---------------- Student ---------------- */}
          {type === 'student' && (
            <>
              <Section
                icon="account-heart-outline"
                title="Parents"
                count={user.parents?.length ?? 0}
                right={<AddButton label="Add parent" onPress={() => navigation.navigate('AddParentToStudent', { student: user })} />}
              >
                {user.parents?.length ? (
                  user.parents.map(parent => (
                    <EntityRow
                      key={String(parent.id)}
                      icon="account-heart-outline"
                      label={personName(parent)}
                      onPress={() => openUser('parent', parent.id)}
                      onRemove={() => removeParentFromStudent(parent)}
                      removeLabel="Remove parent"
                    />
                  ))
                ) : (
                  <Text style={styles.valueTextMuted}>No parents on file</Text>
                )}
              </Section>

              <Section icon="school-outline" title="Classes" count={user.classes?.length ?? 0}>
                {user.classes?.length ? (
                  user.classes.map(cls => (
                    <EntityRow
                      key={String(cls.id)}
                      icon="school-outline"
                      label={cls.name}
                      onPress={() => openClass(cls)}
                    />
                  ))
                ) : (
                  <Text style={styles.valueTextMuted}>Not enrolled in any classes</Text>
                )}
              </Section>

              <Section title="Progress">
                <Field label="Score">
                  <View style={styles.scoreTile}>
                    <Text style={styles.scoreTileNumber}>{user.score ?? 0}</Text>
                  </View>
                </Field>
                <Field label="Temporary password">
                  <PasswordChip password={user.temp_password ?? user.temporary_password ?? ''} />
                </Field>
              </Section>
            </>
          )}

          {/* ---------------- Parent ---------------- */}
          {type === 'parent' && (
            <>
              <Section title="Contact">
                <Field label="Email">
                  <Text style={styles.valueText}>{user.email ?? '—'}</Text>
                </Field>
              </Section>

              <Section
                title="Children"
                count={user.children?.length ?? 0}
                right={<AddButton label="Add child" onPress={() => navigation.navigate('AddChildToParent', { parent: user })} />}
              >
                {user.children?.length ? (
                  user.children.map(child => (
                    <EntityRow
                      key={String(child.id)}
                      label={personName(child)}
                      onPress={() => openUser('student', child.id)}
                      onRemove={() => removeChildFromParent(child)}
                      removeLabel="Remove child"
                    />
                  ))
                ) : (
                  <Text style={styles.valueTextMuted}>No children on file</Text>
                )}
              </Section>

              <Section title="Preferences">
                <Field label="Email notifications">
                  <Pill
                    text={user.email_notifications ? 'On' : 'Off'}
                    tone={user.email_notifications ? 'positive' : 'neutral'}
                  />
                </Field>
                <Field label="Temporary password">
                  <PasswordChip password={user.temp_password ?? user.temporary_password ?? null} />
                </Field>
              </Section>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

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

  scroll: { padding: spacing.lg, paddingBottom: 60, gap: spacing.xl },

  // Identity
  identityCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    ...shadow,
  },
  avatarLg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLgText: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fonts.sizes.title,
    color: colors.textOnPrimary,
  },
  name: {
    fontFamily: fontFamilies.displaySemibold,
    fontSize: fonts.sizes.title,
    color: colors.text,
    textAlign: 'center',
  },
  username: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.md,
  },
  roleBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
    color: colors.primaryDark,
  },

  // Section card
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadow,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    minWidth: 24,
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
  statInline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statInlineNumber: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fonts.sizes.subtitle,
    color: colors.primaryDark,
  },
  statInlineLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
  },

  // Field (label + value, stacked inside a Section)
  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  valueText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
  },
  valueTextMuted: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.subtitle,
    color: colors.placeholder,
    fontStyle: 'italic',
  },

  // Entity rows (classes / parents / children)
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  entityRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityRowText: {
    flex: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
  },
  entityRemoveBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },

  // Add button (Add parent / Add child)
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
    color: colors.primary,
  },

  // Password chip
  passwordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    minWidth: 140,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  passwordText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
    letterSpacing: 1,
  },

  // Pill (status badges)
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pill_neutral: { backgroundColor: colors.border },
  pill_positive: { backgroundColor: colors.primaryLight },
  pillText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
  },
  pillText_neutral: { color: colors.textMuted },
  pillText_positive: { color: colors.primaryDark },

  // Admin toggle
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminToggleBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
    color: colors.primary,
  },
  adminToggleBtnTextDanger: {
    color: colors.danger,
  },

  // Score tile (student progress)
  scoreTile: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scoreTileNumber: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fonts.sizes.heading,
    color: colors.primaryDark,
  },

  // Empty / error / loading
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.body,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
    color: colors.textOnPrimary,
  },
});
