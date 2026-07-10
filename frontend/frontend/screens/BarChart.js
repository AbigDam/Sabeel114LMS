import { View, Text, StyleSheet } from 'react-native';

/**
 * Lightweight bar chart with no external chart library dependency.
 *
 * props:
 *  - data: [{ label: string, value: number }]
 *  - color: bar color
 *  - height: pixel height of the chart plot area (default 140)
 */
export default function BarChart({ data = [], color = '#B45309', height = 140 }) {
  const maxValue = Math.max(1, ...data.map((d) => Number(d.value) || 0));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.plotArea, { height }]}>
        {data.map((d, idx) => {
          const val = Number(d.value) || 0;
          const barHeight = Math.max(4, (val / maxValue) * (height - 24));
          return (
            <View key={idx} style={styles.barColumn}>
              <Text style={styles.valueLabel}>{val > 0 ? val : '-'}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: val > 0 ? color : '#E5E7EB',
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
  valueLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 4 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  axisLabelWrap: { flex: 1, alignItems: 'center' },
  axisLabel: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
});