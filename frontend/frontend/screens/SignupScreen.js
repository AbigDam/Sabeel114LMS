import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AuthScene from '../components/AuthScene';
import TextField from '../components/TextField';
import PasswordStrength from '../components/PasswordStrength';
import { isValidEmail, validatePassword } from '../constants/validation';
import { colors, spacing, radii, fonts, shadow } from '../constants/theme';
import { apiCall } from '../api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  const { setAuthenticated } = useAuth();

  function validate(trimmedUsername, trimmedEmail) {
    const next = {};

    if (!trimmedUsername) {
      next.username = 'Username is required.';
    }

    if (!trimmedEmail) {
      next.email = 'Email is required.';
    } else if (!isValidEmail(trimmedEmail)) {
      next.email = 'Enter a valid email address.';
    }

    const pwError = validatePassword(password);

    if (pwError) {
      next.password = pwError;
    }

    if (!confirm) {
      next.confirm = 'Please confirm your password.';
    } else if (confirm !== password) {
      next.confirm = 'Passwords do not match.';
    }

    return next;
  }
async function handleSignup() {
  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();
  const validationErrors = validate(trimmedUsername, trimmedEmail);
  setErrors(validationErrors);

  if (Object.keys(validationErrors).length > 0) {
    return;
  }

  try {
    const data = await apiCall('post', 'register/', {
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        role: 'Teacher',
      },
    });

    await AsyncStorage.setItem('authToken', data.access);
    if (data.refresh) {
      await AsyncStorage.setItem('refreshToken', data.refresh);
    }

    setAuthenticated(true);
  } catch (error) {
    console.error(error);
    const data = error?.response?.data;
    setErrors({
      email:
        data?.email ||
        data?.error ||
        data?.message ||
        'Registration failed.',
    });
  }
}
  return (
    <AuthScene>
      <Text style={styles.welcome}>Create your account</Text>
      <Text style={styles.welcomeSub}>Join the Al-Hidaya teaching team</Text>

      <TextField
        label="Username"
        iconName="person-outline"
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        error={errors.username}
        autoCapitalize="none"
        returnKeyType="next"
      />

      <TextField
        label="Email"
        iconName="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@al-hidaya.org"
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
      />

      <TextField
        label="Password"
        iconName="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Create a strong password"
        error={errors.password}
        secureToggle
        autoCapitalize="none"
        returnKeyType="next"
      />

      {/* Live strength meter + rule checklist */}
      <PasswordStrength password={password} />

      <TextField
        label="Confirm password"
        iconName="lock-closed-outline"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Re-enter your password"
        error={errors.confirm}
        secureToggle
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={handleSignup}
      />

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        onPress={handleSignup}
      >
        <Text style={styles.primaryBtnText}>Create Account</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>


      <Pressable onPress={() => navigation.navigate('Leaderboard')} hitSlop={8}>
        <Text style={styles.link}>View Leaderboard</Text>
      </Pressable>


    </AuthScene>
  );
}

const styles = StyleSheet.create({
  welcome: { fontSize: fonts.sizes.heading, fontWeight: '800', color: colors.text },
  welcomeSub: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fonts.sizes.body },
  link: { color: colors.primary, fontSize: fonts.sizes.body, fontWeight: '700' },
});