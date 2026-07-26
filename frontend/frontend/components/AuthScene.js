// components/AuthScene.js
// -----------------------------------------------------------------------------
// Shared layout wrapper for the Login and Signup screens.
//
// The form floats as a single kraft-paper "card" on a deep olive atmosphere
// (gradient + scattered brand-mark cutouts, echoing the promo art) at every
// screen width. The logo BrandHeader sits atop the form, and the card is
// width-capped so it stays readable and centered on wide screens.
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

import AtmosphereBackground from './AtmosphereBackground';
import BrandHeader from './BrandHeader';
import Reveal from './Reveal';
import { colors, spacing, radii } from '../constants/theme';

const cardShadow = Platform.select({
  web: { boxShadow: '0 24px 60px rgba(15, 20, 8, 0.35)' },
  default: {
    shadowColor: '#0F1408',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
  },
});

export default function AuthScene({ children }) {
  return (
    <View style={styles.safe}>
      <AtmosphereBackground variant="hero" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Reveal index={0} distance={14}>
                <BrandHeader />
              </Reveal>
              <Reveal index={1} distance={18}>
                {children}
              </Reveal>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...cardShadow,
  },
});
