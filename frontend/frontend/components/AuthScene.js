// components/AuthScene.js
// -----------------------------------------------------------------------------
// Shared layout wrapper for the Login and Signup screens.
//
// Just the form: a single centered column on the cream background at EVERY
// screen width (no side hero panel / slogans / prayer-times info). The logo
// BrandHeader sits atop the form, and the form card is width-capped so it stays
// readable and centered on wide screens.
//
// The actual form (fields + buttons) is passed in as `children`.
// -----------------------------------------------------------------------------

import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrandHeader from './BrandHeader';
import { colors, spacing } from '../constants/theme';

export default function AuthScene({ children }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <BrandHeader />
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440, // keeps the form centered & readable on wide screens
  },
});
