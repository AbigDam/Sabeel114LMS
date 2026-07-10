
import { useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import { brand, brandImages } from '../constants/brand';
import { apiCall } from '../api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const WIDE_BREAKPOINT = 900;
// Increased sidebar width to accommodate slightly bigger layout and larger font sizes
const DRAWER_WIDTH = 290; 

const BRONZE_COLORS = {
  bronzeDeep: '#3E3122',    // Deep majestic bronze
  bronzeBright: '#B45309',  // Vibrant focus bronze
  bronzeAccent: '#9A6A3C',  // Warm gold/bronze trim accent
  bgCanvas: '#FAF9F6',      // Alabaster soft white canvas
  surfaceWhite: '#FFFFFF',  // Clean surface card
  textDark: '#111827',      // Ultra-readable deep charcoal
  textMuted: '#4B5563',     // Secondary body text
  borderLight: '#E5E7EB',   // Subtle dividers
  badgeBg: '#FEF3C7',       // Soft bronze tint badge background
  badgeText: '#92400E',     // Dark bronze badge text
};

function LargeStatCard({ icon, value, label }) {
  return (
    <View style={styles.largeStatCard}>
      <View style={styles.statIconBadge}>
        <MaterialCommunityIcons name={icon} size={32} color={BRONZE_COLORS.bronzeDeep} />
      </View>
      <View style={styles.statTextGroup}>
        <Text style={styles.largeStatValue}>{value}</Text>
        <Text style={styles.largeStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  // New toggle state for controlling desktop sidebar presentation 
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]); 
  const { setAuthenticated } = useAuth();

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await apiCall('get', 'select_classes/');
        setCourses(data);
      } catch (error) {
        console.error(error);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await apiCall('get', 'current_user/');
        setTeacher(data);
      } catch (error) {
        console.error(error);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const data = await apiCall('get', 'announcements/');
        setAnnouncements(data);
      } catch (error) {
        console.error(error);
      }
    }

    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (isWide) return;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: menuOpen ? 0 : -DRAWER_WIDTH,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: menuOpen ? 1 : 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: menuOpen ? 1 : 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuOpen, isWide, translateX, backdrop]);

  useEffect(() => {
    if (isWide) setMenuOpen(false);
  }, [isWide]);

  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
  const classCount = courses.length;
  const nextClass = courses[0];
  
async function handleSignOut() {
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('rememberMe');
  setAuthenticated(false);
}
  function handleNavigateClass(course) {
    navigation.navigate('StudentRoster', { course });
    setMenuOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.hubHeader}>
        <View style={styles.headerLeft}>
          {isWide ? (
            // Desktop Sidebar Toggle button
            <Pressable 
              onPress={() => setSidebarVisible(!sidebarVisible)} 
              style={styles.menuIconButton} 
              hitSlop={12}
            >
              <Ionicons name={sidebarVisible ? "close" : "menu"} size={28} color="#9A6A3C" />
            </Pressable>
            
          ) : (
            // Mobile Hamburger Drawer button
            <Pressable 
              onPress={() => setMenuOpen(true)} 
              style={styles.menuIconButton} 
              hitSlop={12}
            >
              <Ionicons name="menu" size={32} color="#9A6A3C" />
            </Pressable>
          )}
          {isWide ? (
            // Show logo and brand name in header on desktop
            <>
              <Image source={brandImages.logo} style={styles.hubLogo} resizeMode="contain" />
              <Text style={styles.hubTitle}>{brand.name}</Text>
            </>
          ) : null}
          
        </View>

        <View style={styles.headerRight}>
          <View style={styles.teacherBadgeContainer}>
            <View style={styles.onlineDot} />
            <Text style={styles.teacherBadgeText}>{teacher?.username}</Text>
          </View>
          <Pressable onPress={handleSignOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.mainLayout}>
        {/* Desktop Sidebar (Render conditionally based on state logic) */}
        {isWide && sidebarVisible && (
          <View style={styles.desktopNavWrapper}>
            <Sidebar
              courses={courses}
              activeId={courses[0]?.id}
              onNavigate={handleNavigateClass}
              onSignOut={handleSignOut}
              onClose={() => setSidebarVisible(false)}
            />
          </View>
        )}

        {/* Content Stream View */}
        <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
          
          {/* Welcome Banner Box */}
          <View style={styles.hubWelcomeBanner}>
            <Text style={styles.hubGreeting}>Teacher {teacher?.username}</Text>
            <Text style={styles.hubSubGreeting}>Al-Hidaya Teacher Portal Dashboard — Manage your active classes and student logs.</Text>
          </View>

          {/* Large High-Visibility Metrics */}
          <View style={styles.metricsContainerGrid}>
            <LargeStatCard icon="account-multiple" value={totalStudents} label="Enrolled Students" />
            <LargeStatCard icon="school" value={classCount} label="Active Class Sections" />
          </View>

          {/* Central Section Grid Layout */}
          <View style={styles.hubContentSplit}>
            
            {/* Primary Left/Center Column: Widened Course Cards */}
            <View style={styles.coursesMainSection}>
              <View style={styles.hubSectionHeader}>
                <View style={styles.sectionTitleIndicator} />
                <Text style={styles.hubSectionTitleText}>Your Teaching Courses</Text>
              </View>
              {teacher?.is_superuser && (
                <Pressable
                  style={styles.createClassButton}
                  onPress={() => navigation.navigate('CreateClassAccounts')}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.createClassButtonText}>Create Class</Text>
                </Pressable>
              )}
              <View style={styles.largeCardGrid}>
                {courses.map((course) => (
                  <View key={course.id} style={styles.courseCardContainerOverride}>
                    <CourseCard
                      course={course}
                      onViewDetails={() => navigation.navigate('StudentRoster', { course })}
                      
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Utility Sidebar Column */}
            <View style={styles.utilitiesSideSection}>

              


              {/* Administrative Notice Board Box */}
              <View style={styles.hubUtilityWidget}>
                <View style={styles.widgetHeaderRow}>
                  <MaterialCommunityIcons name="bullhorn" size={26} color={BRONZE_COLORS.bronzeAccent} />
                  <Text style={styles.widgetHeadingText}>Notice Board</Text>
                </View>
                <View style={styles.announcementsListContainer}>
                  {announcements.map((a) => (
                    <View key={a.id} style={styles.largeNoticeItemBlock}>
                      <View style={styles.noticeMetaRow}>
                        <Text style={styles.noticeDateLabel}>{a.date}</Text>
                      </View>
                      <Text style={styles.noticeTitleLabelText}>{a.title}</Text>
                      <Text style={styles.noticeDetailBodyText}>{a.detail}</Text>
                    </View>
                  ))}
                </View>
              </View>

            </View>

          </View>
        </ScrollView>
      </View>

      {/* Slide-out Mobile Drawer */}
      {!isWide && (
        <View style={StyleSheet.absoluteFill} pointerEvents={menuOpen ? 'auto' : 'none'}>
          <Animated.View style={[styles.mobileBackdropLayer, { opacity: backdrop }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          </Animated.View>

          <Animated.View style={[styles.mobileDrawerContainer, { transform: [{ translateX }] }]}>
            <Sidebar
              courses={courses}
              activeId={courses[0]?.id}
              onNavigate={handleNavigateClass}
              onSignOut={handleSignOut}
              onClose={() => setMenuOpen(false)}
            />
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRONZE_COLORS.bronzeAccent },
  mainLayout: { flex: 1, flexDirection: 'row', backgroundColor: BRONZE_COLORS.bgCanvas },
  desktopNavWrapper: { width: DRAWER_WIDTH, backgroundColor: '#ffffff', borderRightWidth: 1, borderRightColor: BRONZE_COLORS.borderLight },
  
  hubHeader: {
    height: 76,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 4,
    borderBottomColor: BRONZE_COLORS.bronzeAccent,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconButton: { padding: 4, marginRight: 4, justifyContent: 'center', alignItems: 'center' },
  hubLogo: { width: 92, height: 92, borderRadius: 12 },
  hubTitle: { fontSize: 24, fontWeight: '700', color: BRONZE_COLORS.textDark, letterSpacing: 0.3 },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  teacherBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 133, 6, 0.18)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, gap: 10 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#01885b' },
  teacherBadgeText: { color: '#0f0f0f', fontSize: 16, fontWeight: '600' },
  logoutButton: { padding: 8, backgroundColor: 'rgb(221, 5, 5)', borderRadius: 8 },

  scrollCanvas: { padding: 32, maxWidth: 1600, width: '100%', alignSelf: 'center' },
  createClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: BRONZE_COLORS.bronzeBright,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 20,
  },
  createClassButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  hubWelcomeBanner: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    padding: 32,
    borderLeftWidth: 8,
    borderLeftColor: BRONZE_COLORS.bronzeAccent,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
  },
  hubGreeting: { fontSize: 32, fontWeight: '800', color: BRONZE_COLORS.textDark },
  hubSubGreeting: { fontSize: 18, color: BRONZE_COLORS.textMuted, marginTop: 8, lineHeight: 26 },

  metricsContainerGrid: { flexDirection: 'row', gap: 24, flexWrap: 'wrap', marginBottom: 36 },
  largeStatCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
  },
  statIconBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  statTextGroup: { flex: 1 },
  largeStatValue: { fontSize: 34, fontWeight: '800', color: BRONZE_COLORS.textDark, letterSpacing: -0.5 },
  largeStatLabel: { fontSize: 16, fontWeight: '600', color: BRONZE_COLORS.textMuted, marginTop: 4 },

  hubContentSplit: { flexDirection: 'row', gap: 32, flexWrap: 'wrap' },
  coursesMainSection: { flex: 4, minWidth: 450 }, 
  utilitiesSideSection: { flex: 1.5, minWidth: 320, gap: 32 },

  hubSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  sectionTitleIndicator: { width: 6, height: 28, backgroundColor: BRONZE_COLORS.bronzeBright, borderRadius: 3 },
  hubSectionTitleText: { fontSize: 22, fontWeight: '700', color: BRONZE_COLORS.textDark },

  largeCardGrid: { gap: 20 },
  courseCardContainerOverride: { width: '100%' }, 

  hubUtilityWidget: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 24,
  },
  widgetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: BRONZE_COLORS.borderLight, paddingBottom: 12 },
  widgetHeadingText: { fontSize: 18, fontWeight: '700', color: BRONZE_COLORS.textDark },

  announcementsListContainer: { gap: 20 },
  largeNoticeItemBlock: { borderBottomWidth: 1, borderBottomColor: BRONZE_COLORS.borderLight, paddingBottom: 16 },
  noticeMetaRow: { marginBottom: 6 },
  noticeDateLabel: { fontSize: 13, color: BRONZE_COLORS.bronzeBright, fontWeight: '700' },
  noticeTitleLabelText: { fontSize: 17, fontWeight: '700', color: BRONZE_COLORS.textDark },
  noticeDetailBodyText: { fontSize: 15, color: BRONZE_COLORS.textMuted, marginTop: 6, lineHeight: 22 },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(120, 53, 15, 0.4)' },
  mobileDrawerContainer: { position: 'absolute', top: 62, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#FFFFFF' },
});