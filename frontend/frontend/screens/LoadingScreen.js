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
import { View, ActivityIndicator, Text, Image, StyleSheet } from 'react-native';

import AtmosphereBackground from '../components/AtmosphereBackground';
import { brandImages } from '../constants/brand';
import { spacing, type } from '../constants/theme';

export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <View style={styles.container}>
      <AtmosphereBackground variant="hero" />
      <View style={styles.card}>
        <Image source={brandImages.logo} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#F5F4EE" style={styles.spinner} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
  },
  logo: {
    width: 84,
    height: 76,
    marginBottom: spacing.xl,
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  text: {
    ...type.subtitle,
    color: '#EFE9D8',
  },
});
