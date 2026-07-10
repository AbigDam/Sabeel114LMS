// screens/LoadingScreen.js
// -----------------------------------------------------------------------------
// App-wide loading state (used while checking auth on boot, and as a fallback
// inside AppStack while user/role data is being fetched).
//
// This component is purely presentational — it does NOT decide when to stop
// showing itself. Whatever renders <LoadingScreen /> is responsible for
// swapping it out once its async work finishes (see App.js for the pattern:
// try/catch/finally with setLoading(false) in finally, guaranteed to run
// whether the fetch succeeds or fails).
// -----------------------------------------------------------------------------

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '../constants/theme';

export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
  },
  text: {
    marginTop: spacing.lg,
    fontSize: fonts.sizes.subtitle,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
