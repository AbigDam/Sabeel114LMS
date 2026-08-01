
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api.js'
import { colors, fontFamilies, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Config: endpoint + display title per user type
// ---------------------------------------------------------------------------
const TYPE_CONFIG = {
  teacher: { endpoint: id => `/teachers/${id}/`, title: 'Teacher' },
  student: { endpoint: id => `/students/${id}/`, title: 'Student' },
  parent:  { endpoint: id => `/parents/${id}/`,  title: 'Parent'  },
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

function InfoRow({ label, children }) {
  return (
    <View style={styles.infoRow}>
      {typeof label === 'string' ? <Text style={styles.infoLabel}>{label}</Text> : label}
      <View style={styles.infoValue}>{children}</View>
    </View>
  );
}

function Badge({ text, tone = 'neutral' }) {
  return (
    <View style={[styles.badge, tone === 'positive' && styles.badgePositive]}>
      <Text style={[styles.badgeText, tone === 'positive' && styles.badgeTextPositive]}>{text}</Text>
    </View>
  );
}

function LinkRow({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.6}>
      <Text style={styles.linkRowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// Same fix as the class roster screen: the navigable label and the remove
// button are SIBLING touchables, not nested, so the remove button's onPress
// reliably fires instead of being swallowed by the outer row.
function RemovableLinkRow({ label, onPress, onRemove, removeLabel }) {
  return (
    <View style={styles.removableRow}>
      <TouchableOpacity style={styles.removableRowMain} onPress={onPress} activeOpacity={0.6}>
        <Text style={styles.linkRowText} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={12}
        style={styles.removeInlineBtn}
        accessibilityLabel={removeLabel}
      >
        <Ionicons name="remove-circle-outline" size={20} color={colors.error ?? '#C0392B'} />
      </TouchableOpacity>
    </View>
  );
}

function SectionLabelRow({ label, addLabel, onAdd }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TouchableOpacity style={styles.addInlineBtn} onPress={onAdd} hitSlop={8}>
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.addInlineBtnText}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ClassRow({ name, onPress }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.6} disabled={!onPress}>
      <Text style={styles.linkRowText}>{name}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </TouchableOpacity>
  );
}

// Temp passwords are sensitive — hidden by default, tap to reveal.
// Once a user has used their temp password, the backend returns null/"No
// password" — show that plainly instead of a maskable secret.
function PasswordRow({ password }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasPassword = password && password !== 'No password';

  if (!hasPassword) {
    return <Text style={styles.valueTextMuted}>No password</Text>;
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.passwordRow}>
      <TouchableOpacity
        style={styles.passwordTextBtn}
        onPress={() => setVisible(v => !v)}
        activeOpacity={0.6}
      >
        <Text style={styles.passwordText}>{visible ? password : '••••••••'}</Text>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity onPress={handleCopy} hitSlop={10} style={styles.copyBtn} accessibilityLabel="Copy password">
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? (colors.success ?? '#2E8B57') : colors.primary} />
        <Text style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}>
          {copied ? 'Copied' : 'Copy'}
        </Text>
      </TouchableOpacity>
    </View>
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
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{config.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchUser} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.body}>
          {/* Identity header */}
          <View style={styles.identityRow}>
            <View style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initialsOf(user)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{fullName}</Text>
              {user.username ? <Text style={styles.username}>@{user.username}</Text> : null}
            </View>
          </View>

          <View style={styles.card}>
            {/* ---------------- Teacher ---------------- */}
            {type === 'teacher' && (
              <>
                <InfoRow label="Email">
                  <Text style={styles.valueText}>{user.email ?? '—'}</Text>
                </InfoRow>

                <InfoRow label="Classes taught">
                  {user.classes?.length ? (
                    user.classes.map(cls => (
                      <ClassRow key={String(cls.id)} name={cls.name} onPress={() => openClass(cls)} />
                    ))
                  ) : (
                    <Text style={styles.valueText}>No classes assigned</Text>
                  )}
                </InfoRow>

                <InfoRow label="Total students">
                  <Text style={styles.valueText}>{user.student_count ?? user.total_students ?? 0}</Text>
                </InfoRow>

                <InfoRow label="Admin">
                  <View style={styles.adminRow}>
                    <Badge text={user.is_admin ? 'Admin' : 'Not admin'} tone={user.is_admin ? 'positive' : 'neutral'} />
                    <TouchableOpacity style={styles.adminToggleBtn} onPress={toggleAdmin} hitSlop={8}>
                      <Ionicons
                        name={user.is_admin ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={18}
                        color={user.is_admin ? (colors.error ?? '#C0392B') : colors.primary}
                      />
                      <Text style={[styles.adminToggleBtnText, user.is_admin && styles.adminToggleBtnTextDanger]}>
                        {user.is_admin ? 'Remove admin' : 'Grant admin'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </InfoRow>

                <InfoRow label="Temporary password">
                  <PasswordRow password={user.temp_password ?? user.temporary_password ?? ''} />
                </InfoRow>
              </>
            )}

            {/* ---------------- Student ---------------- */}
            {type === 'student' && (
              <>
                <InfoRow label={
                  <SectionLabelRow
                    label="Parents"
                    addLabel="Add parent"
                    onAdd={() => navigation.navigate('AddParentToStudent', { student: user })}
                  />
                }>
                  {user.parents?.length ? (
                    user.parents.map(parent => (
                      <RemovableLinkRow
                        key={String(parent.id)}
                        label={personName(parent)}
                        onPress={() => openUser('parent', parent.id)}
                        onRemove={() => removeParentFromStudent(parent)}
                        removeLabel="Remove parent"
                      />
                    ))
                  ) : (
                    <Text style={styles.valueText}>No parents on file</Text>
                  )}
                </InfoRow>

                <InfoRow label="Classes">
                  {user.classes?.length ? (
                    user.classes.map(cls => (
                      <ClassRow key={String(cls.id)} name={cls.name} onPress={() => openClass(cls)} />
                    ))
                  ) : (
                    <Text style={styles.valueText}>Not enrolled in any classes</Text>
                  )}
                </InfoRow>

                <InfoRow label="Score">
                  <Text style={styles.valueText}>{user.score ?? '—'}</Text>
                </InfoRow>

                <InfoRow label="Temporary password">
                  <PasswordRow password={user.temp_password ?? user.temporary_password ?? ''} />
                </InfoRow>
              </>
            )}

            {/* ---------------- Parent ---------------- */}
            {type === 'parent' && (
              <>
                <InfoRow label="Email">
                  <Text style={styles.valueText}>{user.email ?? '—'}</Text>
                </InfoRow>

                <InfoRow label={
                  <SectionLabelRow
                    label="Children"
                    addLabel="Add child"
                    onAdd={() => navigation.navigate('AddChildToParent', { parent: user })}
                  />
                }>
                  {user.children?.length ? (
                    user.children.map(child => (
                      <RemovableLinkRow
                        key={String(child.id)}
                        label={personName(child)}
                        onPress={() => openUser('student', child.id)}
                        onRemove={() => removeChildFromParent(child)}
                        removeLabel="Remove child"
                      />
                    ))
                  ) : (
                    <Text style={styles.valueText}>No children on file</Text>
                  )}
                </InfoRow>

                <InfoRow label="Email notifications">
                  <Badge
                    text={user.email_notifications ? 'On' : 'Off'}
                    tone={user.email_notifications ? 'positive' : 'neutral'}
                  />
                </InfoRow>

                <InfoRow label="Temporary password">
                  <PasswordRow password={user.temp_password ?? user.temporary_password ?? null} />
                </InfoRow>
              </>
            )}
          </View>
        </ScrollView>
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

  body: {
      flex: 1,
    },
    bodyContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
    },

  // Identity
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 19,
    color: colors.text,
  },
  username: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: colors.surface ?? '#fff',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.sm,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  infoValue: {
    gap: 4,
  },
  valueText: {
    fontSize: 15,
    color: colors.text,
  },
  valueTextMuted: {
    fontSize: 15,
    color: colors.textMuted,
  },

  // Section label row (e.g. "Parents" + Add parent button)
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addInlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Removable link row (parents / children lists)
  removableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  removableRowMain: {
    flex: 1,
  },
  removeInlineBtn: {
    padding: 4,
    marginLeft: spacing.sm,
  },

  // Link rows (classes, parents, children)
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  linkRowText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },

  // Password
// Password
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  passwordTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  passwordText: {
    fontSize: 15,
    color: colors.text,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  copyBtnTextCopied: {
    color: colors.success ?? '#2E8B57',
  },
  // Badge
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.md ?? radii.lg,
    backgroundColor: colors.border,
  },
  badgePositive: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  badgeTextPositive: {
    color: '#fff',
  },

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
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  adminToggleBtnTextDanger: {
    color: colors.error ?? '#C0392B',
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

