import { useEffect, useRef, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import ParentStudentCard from '../components/ParentStudentCard';
import { brand, brandImages } from '../constants/brand';
import { apiCall } from '../api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const WIDE_BREAKPOINT = 900;
const DRAWER_WIDTH = 290;

// User roles, as returned by the current_user/ endpoint
const ROLE_PARENT = 0;
const ROLE_TEACHER = 1;
const ROLE_STUDENT = 2;

const BRONZE_COLORS = {
  bronzeDeep: '#3E3122',
  bronzeBright: '#B45309',
  bronzeAccent: '#9A6A3C',
  bgCanvas: '#FAF9F6',
  surfaceWhite: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#4B5563',
  borderLight: '#E5E7EB',
  badgeBg: '#FEF3C7',
  badgeText: '#92400E',
};

const ADMIN_COLORS = {
  bg: '#1F1B16',
  accent: '#D97706',
  text: '#F5F1EA',
};

/* ------------------------------------------------------------------ */
/* Small reusable animated pill switch (replaces the old icon toggle)  */
/* ------------------------------------------------------------------ */
function AnimatedSwitch({ value, onValueChange, disabled }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating color + layout, not transform-only
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D1D5DB', BRONZE_COLORS.bronzeBright],
  });

  const knobTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <Pressable onPress={() => !disabled && onValueChange(!value)} disabled={disabled} hitSlop={10}>
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.switchKnob, { transform: [{ translateX: knobTranslate }] }]} />
      </Animated.View>
    </Pressable>
  );
}

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

/* ------------------------------------------------------------------ */
/* Admin bar — only ever rendered for superusers                       */
/* ------------------------------------------------------------------ */
function AdminBar({ navigation }) {
  return (
    <View style={styles.adminBar}>
      <View style={styles.adminBarLeft}>
        <MaterialCommunityIcons name="shield-crown" size={22} color={ADMIN_COLORS.accent} />
        <Text style={styles.adminBarTitle}>Admin Only</Text>
      </View>
      <View style={styles.adminBarLinks}>
        <Pressable
          style={styles.adminBarLink}
          onPress={() => navigation.navigate('PrivateLeaderboard')}
        >
          <Ionicons name="trophy-outline" size={18} color={ADMIN_COLORS.text} />
          <Text style={styles.adminBarLinkText}>Private Leaderboard</Text>
        </Pressable>
        <Pressable
          style={styles.adminBarLink}
          onPress={() => navigation.navigate('CreateClassAccounts')}
        >
          <Ionicons name="add-circle-outline" size={18} color={ADMIN_COLORS.text} />
          <Text style={styles.adminBarLinkText}>Create Class</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Teacher dashboard body                                              */
/* ------------------------------------------------------------------ */
function TeacherDashboardBody({ teacher, courses, announcements, navigation }) {
  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
  const classCount = courses.length;

  return (
    <>
      {teacher?.is_superuser && <AdminBar navigation={navigation} />}

      <View style={styles.hubWelcomeBanner}>
        <Text style={styles.hubGreeting}>Teacher {teacher?.username}</Text>
        <Text style={styles.hubSubGreeting}>
          Sabeel 114 Teacher Portal Dashboard — Manage your active classes and student logs.
        </Text>
      </View>

      <View style={styles.metricsContainerGrid}>
        <LargeStatCard icon="account-multiple" value={totalStudents} label="Enrolled Students" />
        <LargeStatCard icon="school" value={classCount} label="Active Class Sections" />
      </View>

      <View style={styles.hubContentSplit}>
        <View style={styles.coursesMainSection}>
          <View style={styles.hubSectionHeader}>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.hubSectionTitleText}>Your Teaching Courses</Text>
          </View>

          <Pressable
            style={styles.publicLeaderboardButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Ionicons name="trophy-outline" size={20} color={BRONZE_COLORS.bronzeBright} />
            <Text style={styles.publicLeaderboardButtonText}>View Public Leaderboard</Text>
          </Pressable>

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

        <View style={styles.utilitiesSideSection}>
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
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Student dashboard body                                              */
/* ------------------------------------------------------------------ */
function StudentDashboardBody({ teacher, navigation }) {
  return (
    <View style={styles.simplePageWrapper}>
      <View style={styles.simplePageCard}>
        <MaterialCommunityIcons
          name="school-outline"
          size={56}
          color={BRONZE_COLORS.bronzeAccent}
        />
        <Text style={styles.simplePageTitle}>Welcome, {teacher?.username}</Text>
        <Text style={styles.simplePageBody}>
          The student portal hasn't been built yet. Check back soon — in the meantime, you
          can view the public leaderboard below.
        </Text>
        <Pressable
          style={styles.publicLeaderboardButtonLarge}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="trophy-outline" size={22} color="#FFFFFF" />
          <Text style={styles.publicLeaderboardButtonLargeText}>View Public Leaderboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Parent-only: email notification preference toggle                   */
/* ------------------------------------------------------------------ */
function EmailNotificationsCard({ enabled, onToggle, saving, error }) {
  return (
    <View style={styles.hubUtilityWidget}>
      <View style={styles.widgetHeaderRow}>
        <MaterialCommunityIcons name="email-outline" size={26} color={BRONZE_COLORS.bronzeAccent} />
        <Text style={styles.widgetHeadingText}>Email Notifications</Text>
      </View>

      <View style={styles.notificationRow}>
        <View style={styles.notificationRowText}>
          <Text style={styles.notificationRowTitle}>Student email updates</Text>
          <Text style={styles.notificationRowSubtitle}>
            Receive emails about your student's scores, attendance, and teacher comments.
          </Text>
        </View>

        <View style={styles.notificationSwitchArea}>
          {saving ? (
            <ActivityIndicator color={BRONZE_COLORS.bronzeBright} />
          ) : (
            <AnimatedSwitch value={enabled} onValueChange={onToggle} disabled={saving} />
          )}
        </View>
      </View>

      {error ? <Text style={styles.errorTextSmall}>{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Parent dashboard body                                               */
/* ------------------------------------------------------------------ */
function ParentDashboardBody({
  teacher,
  students,
  studentsLoading,
  studentsError,
  emailNotifications,
  onToggleEmailNotifications,
  notificationsSaving,
  notificationsError,
  navigation,
}) {
  return (
    <>

      <View style={styles.hubWelcomeBanner}>
        <Text style={styles.hubGreeting}>Welcome, {teacher?.username}</Text>
        <Text style={styles.hubSubGreeting}>
          Sabeel 114 Parent Portal Dashboard — Tap on a student to see their calendar for the current week, including daily scores
          and teacher comments.
        </Text>
      </View>

      <View style={styles.hubContentSplit}>
        <View style={styles.coursesMainSection}>
          <View style={styles.hubSectionHeader}>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.hubSectionTitleText}>Your Children</Text>

          </View>
        <Pressable
          style={styles.publicLeaderboardButtonLarge}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="trophy-outline" size={22} color="#FFFFFF" />
          <Text style={styles.publicLeaderboardButtonLargeText}>View Public Leaderboard</Text>
        </Pressable>
          
          {studentsLoading ? (
            <ActivityIndicator color={BRONZE_COLORS.bronzeBright} style={{ marginVertical: 40 }} />
          ) : studentsError ? (
            <Text style={styles.errorTextLarge}>{studentsError}</Text>
          ) : students.length === 0 ? (
            <Text style={styles.emptyStateText}>No children are linked to your account yet.</Text>
          ) : (
            <View style={styles.parentStudentList}>
              {students.map((student) => (
                <ParentStudentCard key={student.id} student={student} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.utilitiesSideSection}>
          <EmailNotificationsCard
            enabled={emailNotifications}
            onToggle={onToggleEmailNotifications}
            saving={notificationsSaving}
            error={notificationsError}
          />
        </View>
      </View>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */
export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);

  const [emailNotifications, setEmailNotifications] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);

  const { setAuthenticated } = useAuth();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await apiCall('get', 'current_user/');
        setTeacher(data);
        setEmailNotifications(!!data?.email_notifications);
      } catch (error) {
        console.error(error);
      }
    }
    loadUser();
  }, []);

  // Teacher-only data
  useEffect(() => {
    if (!teacher || teacher.role !== ROLE_TEACHER) return;

    async function loadCourses() {
      try {
        const data = await apiCall('get', 'select_classes/');
        setCourses(data);
      } catch (error) {
        console.error(error);
      }
    }
    async function loadAnnouncements() {
      try {
        const data = await apiCall('get', 'announcements/');
        setAnnouncements(data);
      } catch (error) {
        console.error(error);
      }
    }

    loadCourses();
    loadAnnouncements();
  }, [teacher]);

  // Parent-only data
  useEffect(() => {
    if (!teacher || teacher.role !== ROLE_PARENT) return;

    async function loadStudents() {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const data = await apiCall('get', 'parent/students/');
        setStudents(data);
      } catch (error) {
        console.error(error);
        setStudentsError('Could not load your students right now.');
      } finally {
        setStudentsLoading(false);
      }
    }
    loadStudents();
  }, [teacher]);

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

  async function handleToggleEmailNotifications() {
    const next = !emailNotifications;
    setEmailNotifications(next); // optimistic
    setNotificationsSaving(true);
    setNotificationsError(null);
    try {
      await apiCall('patch', 'notifications/', {
        data: { email_notifications: next },
      });
      setTeacher((prev) => (prev ? { ...prev, email_notifications: next } : prev));
    } catch (error) {
      console.error(error);
      setEmailNotifications(!next); // revert on failure
      setNotificationsError('Could not save your preference. Please try again.');
    } finally {
      setNotificationsSaving(false);
    }
  }

  const isTeacher = teacher?.role === ROLE_TEACHER;
  const isStudent = teacher?.role === ROLE_STUDENT;
  const isParent = teacher?.role === ROLE_PARENT;

  // Sidebar (course list / sign out) is only meaningful for teachers
  const showSidebarChrome = isTeacher;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.hubHeader}>
        <View style={styles.headerLeft}>
          {showSidebarChrome &&
            (isWide ? (
              <Pressable
                onPress={() => setSidebarVisible(!sidebarVisible)}
                style={styles.menuIconButton}
                hitSlop={12}
              >
                <Ionicons name={sidebarVisible ? 'close' : 'menu'} size={28} color="#9A6A3C" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setMenuOpen(true)}
                style={styles.menuIconButton}
                hitSlop={12}
              >
                <Ionicons name="menu" size={32} color="#9A6A3C" />
              </Pressable>
            ))}
          {isWide ? (
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
        {showSidebarChrome && isWide && sidebarVisible && (
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

        <ScrollView contentContainerStyle={styles.scrollCanvas} showsVerticalScrollIndicator={false}>
          {!teacher ? (
            <ActivityIndicator color={BRONZE_COLORS.bronzeBright} style={{ marginTop: 60 }} />
          ) : isTeacher ? (
            <TeacherDashboardBody
              teacher={teacher}
              courses={courses}
              announcements={announcements}
              navigation={navigation}
            />
          ) : isStudent ? (
            <StudentDashboardBody teacher={teacher} navigation={navigation} />
          ) : isParent ? (
            <ParentDashboardBody
              teacher={teacher}
              students={students}
              studentsLoading={studentsLoading}
              studentsError={studentsError}
              emailNotifications={emailNotifications}
              onToggleEmailNotifications={handleToggleEmailNotifications}
              notificationsSaving={notificationsSaving}
              notificationsError={notificationsError}
              navigation={navigation}
            />
          ) : null}
        </ScrollView>
      </View>

      {/* Slide-out Mobile Drawer (teachers only) */}
      {showSidebarChrome && !isWide && (
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

  /* Admin bar */
  adminBar: {
    backgroundColor: ADMIN_COLORS.bg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.accent,
  },
  adminBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminBarTitle: { color: ADMIN_COLORS.accent, fontWeight: '800', fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' },
  adminBarLinks: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  adminBarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.18)',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  adminBarLinkText: { color: ADMIN_COLORS.text, fontWeight: '700', fontSize: 14 },

  publicLeaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: BRONZE_COLORS.badgeBg,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 20,
  },
  publicLeaderboardButtonText: { color: BRONZE_COLORS.badgeText, fontWeight: '700', fontSize: 15 },

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

  /* Student simple page */
  simplePageWrapper: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  simplePageCard: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
  },
  simplePageTitle: { fontSize: 24, fontWeight: '800', color: BRONZE_COLORS.textDark, marginTop: 16 },
  simplePageBody: { fontSize: 16, color: BRONZE_COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 24 },
  publicLeaderboardButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BRONZE_COLORS.bronzeBright,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  publicLeaderboardButtonLargeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  /* Parent view */
  parentStudentList: { gap: 4 },
  errorTextLarge: { fontSize: 16, color: '#B91C1C', marginVertical: 20 },
  emptyStateText: { fontSize: 16, color: BRONZE_COLORS.textMuted, marginVertical: 20 },

  /* Parent — email notifications card */
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationRowText: { flex: 1 },
  notificationRowTitle: { fontSize: 15, fontWeight: '700', color: BRONZE_COLORS.textDark },
  notificationRowSubtitle: { fontSize: 13, color: BRONZE_COLORS.textMuted, marginTop: 4, lineHeight: 19 },
  errorTextSmall: { fontSize: 13, color: '#B91C1C', marginTop: 12 },
  notificationSwitchArea: { width: 46, alignItems: 'center', justifyContent: 'center' },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});