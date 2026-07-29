// screens/ChangePasswordScreen.js
// -----------------------------------------------------------------------------
// Change the logged-in user's password.
// Navigate here with:  navigation.navigate('ChangePassword')
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import TextField from '../components/TextField';
import PasswordStrength from '../components/PasswordStrength';
import { validatePassword } from '../constants/validation';
import { colors, spacing, radii, type, shadow } from '../constants/theme';
import { apiCall } from '../api.js';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------
  function validate() {
    const next = {};

    if (!currentPassword) {
      next.currentPassword = 'Enter your current password.';
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      next.newPassword = pwError;
    } else if (currentPassword && newPassword === currentPassword) {
      next.newPassword = 'New password must be different from your current password.';
    }

    if (!confirm) {
      next.confirm = 'Please confirm your new password.';
    } else if (confirm !== newPassword) {
      next.confirm = 'Passwords do not match.';
    }

    return next;
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  async function handleChangePassword() {
    setSuccess(false);
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await apiCall('post', 'change_password/', {
        data: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setErrors({});
      setSuccess(true);
    } catch (error) {
      console.error(error);
      const data = error?.response?.data;
      setErrors({
        currentPassword:
          data?.current_password ||
          data?.error ||
          data?.message ||
          'Could not change your password. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.welcome}>Update your password</Text>
        <Text style={styles.welcomeSub}>
          Enter your current password, then choose a new one.
        </Text>

        {success ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.successText}>Your password has been changed.</Text>
          </View>
        ) : null}

        <TextField
          label="Current password"
          iconName="lock-closed-outline"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          error={errors.currentPassword}
          secureToggle
          autoCapitalize="none"
          returnKeyType="next"
        />

        <TextField
          label="New password"
          iconName="lock-closed-outline"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Create a strong password"
          error={errors.newPassword}
          secureToggle
          autoCapitalize="none"
          returnKeyType="next"
        />

        {/* Live strength meter + rule checklist */}
        <PasswordStrength password={newPassword} />

        <TextField
          label="Confirm new password"
          iconName="lock-closed-outline"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter your new password"
          error={errors.confirm}
          secureToggle
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleChangePassword}
        />

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
            submitting && styles.primaryBtnDisabled,
          ]}
          onPress={handleChangePassword}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Change Password</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

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
    borderBottomColor: colors.border ?? '#E5E7EB',
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...type.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  body: {
    padding: spacing.lg,
  },

  welcome: { ...type.heading, marginBottom: spacing.xs },
  welcomeSub: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '1A',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  successText: {
    ...type.bodyMedium,
    color: colors.primary,
  },

  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadow,
  },
  primaryBtnPressed: { backgroundColor: colors.primaryDark },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { ...type.button },
});

// -----------------------------------------------------------------------------
// NOTES — backend endpoint this screen calls
// -----------------------------------------------------------------------------
// POST change_password/   { current_password, new_password }
//   -> 200 on success
//   -> 400 with { current_password: "..." } (or { error }/{ message }) if the
//      current password is wrong, so it can be shown under that field
// -----------------------------------------------------------------------------