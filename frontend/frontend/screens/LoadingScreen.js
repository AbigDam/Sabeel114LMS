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
