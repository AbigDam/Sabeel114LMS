import { View, Text, StyleSheet } from 'react-native';

/**
 * Lightweight bar chart with no external chart library dependency.
 *
 * props:
 *  - data: [{ label: string, value: number, displayText?: string, barColor?: string }]
 *      - value drives the bar height (e.g. a 0-6 score)
 *      - displayText, if provided, is shown above the bar INSTEAD of the raw value
 *        (used so parents see a category like "Good" rather than a number)
 *  - maxValue: fixed scale for the y-axis (defaults to the max value in data)
 *  - color: default bar color, used when a data point doesn't set barColor
 *  - height: pixel height of the chart plot area (default 140)
 */
export default function BarChart({ data = [], color = '#B45309', height = 140, maxValue }) {
  const scaleMax = maxValue ?? Math.max(1, ...data.map((d) => Number(d.value) || 0));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.plotArea, { height }]}>
        {data.map((d, idx) => {
          const val = Number(d.value) || 0;
          const barHeight = Math.max(4, (val / scaleMax) * (height - 28));
          const barColor = d.barColor || color;
          return (
            <View key={idx} style={styles.barColumn}>
              <Text style={styles.valueLabel} numberOfLines={1}>
                {d.displayText ?? (val > 0 ? val : '-')}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        {data.map((d, idx) => (
          <View key={idx} style={styles.axisLabelWrap}>
            <Text style={styles.axisLabel} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  plotArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  bar: { width: 22, borderRadius: 6 },
  valueLabel: { fontSize: 10, fontWeight: '700', color: '#4B5563', marginBottom: 4, maxWidth: 64, textAlign: 'center' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  axisLabelWrap: { flex: 1, alignItems: 'center' },
  axisLabel: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
});