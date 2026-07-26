// components/TextField.js
// -----------------------------------------------------------------------------
// Reusable labelled text input used by both Login and Signup screens.
// Features:
//   - left icon, floating label, placeholder
//   - inline validation error (red text + red border)
//   - optional secure-entry toggle (eye icon) for password fields
//
// Shared so the auth screens stay consistent and we don't repeat input styling.
// -----------------------------------------------------------------------------

import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radii, type } from '../constants/theme';

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  iconName,
  secureToggle = false, // when true, renders password masking + eye toggle
  ...inputProps // keyboardType, autoCapitalize, autoComplete, returnKeyType, etc.
}) {
  // Local state controls whether the password is currently visible.
  const [hidden, setHidden] = useState(true);
  const isSecure = secureToggle && hidden;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {iconName ? (
          <Ionicons
            name={iconName}
            size={18}
            color={error ? colors.danger : colors.textMuted}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={isSecure} // use the platform's secure entry for passwords
          {...inputProps}
        />

        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Inline field error message */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    ...type.eyebrow,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputRowError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...type.bodyMedium,
    fontSize: 16,
    // remove the default web outline so focus matches our own border styling
    outlineStyle: 'none',
  },
  errorText: {
    ...type.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
