// components/PasswordStrength.js
// -----------------------------------------------------------------------------
// Live password feedback shown under the Signup password field:
//   - a 4-segment strength bar (color reflects strength)
//   - a checklist of the individual rules, each ticking green as it's satisfied
//
// Driven entirely by helpers in constants/validation.js so the rules stay in
// one place.
// -----------------------------------------------------------------------------

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PASSWORD_RULES, getPasswordChecks, getPasswordStrength } from '../constants/validation';
import { colors, spacing, radii, fonts } from '../constants/theme';

// Bar color by strength score (0..4).
const STRENGTH_COLORS = [colors.danger, colors.danger, colors.warning, colors.accent, colors.success];

export default function PasswordStrength({ password }) {
  // Nothing typed yet → render nothing (keeps the form clean).
  if (!password) return null;

  const { checks } = getPasswordChecks(password);
  const { score, label } = getPasswordStrength(password);
  const barColor = STRENGTH_COLORS[score];

  return (
    <View style={styles.container}>
      {/* Strength bar: 4 segments fill up as strength increases */}
      <View style={styles.barRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < score ? barColor : colors.border },
            ]}
          />
        ))}
        <Text style={[styles.strengthLabel, { color: barColor }]}>{label}</Text>
      </View>

      {/* Rule checklist */}
      <View style={styles.checklist}>
        {PASSWORD_RULES.map((rule) => {
          const ok = checks[rule.key];
          return (
            <View key={rule.key} style={styles.checkItem}>
              <Ionicons
                name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                size={15}
                color={ok ? colors.success : colors.placeholder}
              />
              <Text style={[styles.checkText, ok && styles.checkTextOk]}>{rule.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: radii.pill,
  },
  strengthLabel: {
    marginLeft: spacing.sm,
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    width: 64,
    textAlign: 'right',
  },
  checklist: {
    gap: spacing.xs,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkText: {
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
  },
  checkTextOk: {
    color: colors.text,
  },
});
