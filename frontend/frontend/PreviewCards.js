// TEMP visual-QA harness for the CourseCard redesign. Not wired into App.js
// routing — index.js is pointed at this file only while testing, then
// reverted. Safe to delete.
import { View, ScrollView, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_800ExtraBold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  Karla_400Regular,
  Karla_500Medium,
  Karla_600SemiBold,
  Karla_700Bold,
  Karla_800ExtraBold,
} from '@expo-google-fonts/karla';

import CourseCard from './components/CourseCard';
import { colors } from './constants/theme';

const MOCK_COURSES = [
  { id: 1, title: 'Qur’an Memorization — Level 2', program: 'Hifz Track', students: 14, schedule: 'Mon/Wed 4:00–5:30 PM', room: '204', status: 'active' },
  { id: 2, title: 'Arabic Foundations', program: 'Language', students: 22, schedule: 'Tue/Thu 5:00–6:00 PM', room: '108', status: 'active' },
  { id: 3, title: 'Tajweed & Recitation', students: 9, schedule: 'Sat 10:00 AM–12:00 PM', status: 'inactive' },
  { id: 4, title: 'Seerah Studies', program: 'History', students: 31, schedule: 'Fri 6:00–7:00 PM', room: 'Hall B', status: 'active' },
];

export default function PreviewCards() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Fraunces_800ExtraBold,
    Fraunces_900Black,
    Karla_400Regular,
    Karla_500Medium,
    Karla_600SemiBold,
    Karla_700Bold,
    Karla_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {MOCK_COURSES.map((course) => (
          <View key={course.id} style={styles.cell}>
            <CourseCard course={course} onViewDetails={() => {}} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 32, maxWidth: 1000 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  cell: { flexGrow: 1, flexBasis: 340, maxWidth: 440 },
});
