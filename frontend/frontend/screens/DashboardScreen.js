import { useEffect, useMemo, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

import Sidebar from '../components/Sidebar';
import CourseCard from '../components/CourseCard';
import ParentStudentCard from '../components/ParentStudentCard';
import Reveal from '../components/Reveal';
import { brand, brandImages } from '../constants/brand';
import { colors, fontFamilies, gradients } from '../constants/theme';
import { apiCall } from '../api.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const WIDE_BREAKPOINT = 900;
const DRAWER_WIDTH = 290;

// User roles, as returned by the current_user/ endpoint
const ROLE_PARENT = 0;
const ROLE_TEACHER = 1;
const ROLE_STUDENT = 2;

// Superuser-only course filter: their own classes vs. every class in the school
const SCOPE_TABS = [
  ['mine', 'My Classes'],
  ['all', 'All Classes'],
];

// Aliased to the shared theme so this screen can no longer drift from the
// rest of the app's palette — kept as a local name only to avoid rewriting
// every reference below.
const BRONZE_COLORS = {
  bronzeDeep: colors.sidebar,
  bronzeBright: colors.primary,
  bronzeAccent: colors.accent,
  bgCanvas: colors.background,
  surfaceWhite: colors.surface,
  textDark: colors.text,
  textMuted: colors.textMuted,
  borderLight: colors.border,
  badgeBg: colors.primaryLight,
  badgeText: colors.primaryDark,
};

const ADMIN_COLORS = {
  bg: colors.sidebar,
  accent: colors.gold,
  text: colors.sidebarText,
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

function LargeStatCard({ icon, value, label, accent = colors.gold }) {
  return (
    <View style={[styles.largeStatCard, { borderTopColor: accent }]}>
      <View style={[styles.statIconBadge, { borderColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={28} color={accent} />
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
/* Styled like a wax-sealed notice rather than a bootstrap alert: a    */
/* deep-olive banner, a gilt seal badge, and outlined ghost pills with */
/* one filled gold pill for the primary/public action.                 */
/* ------------------------------------------------------------------ */
function AdminBar({ navigation }) {
  return (
    <LinearGradient
      colors={gradients.sidebar}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.adminBar}
    >
      <View style={styles.adminBarLeft}>
        <View style={styles.adminSealBadge}>
          <MaterialCommunityIcons name="shield-crown" size={20} color={colors.goldDark} />
        </View>
        <View>
          <Text style={styles.adminBarTitle}>Admin Only</Text>
          <Text style={styles.adminBarSubtitle}>Superuser tools for the whole school</Text>
        </View>
      </View>
      <View style={styles.adminBarLinks}>
        <Pressable
          style={({ pressed }) => [styles.adminBarLink, pressed && styles.adminBarLinkPressed]}
          onPress={() => navigation.navigate('PrivateLeaderboard')}
        >
          <Ionicons name="trophy-outline" size={17} color={ADMIN_COLORS.text} />
          <Text style={styles.adminBarLinkText}>Private Leaderboard</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.adminBarLink, pressed && styles.adminBarLinkPressed]}
          onPress={() => navigation.navigate('CreateClassAccounts')}
        >
          <Ionicons name="add-circle-outline" size={17} color={ADMIN_COLORS.text} />
          <Text style={styles.adminBarLinkText}>Create Class</Text>
        </Pressable>


        <Pressable
          style={({ pressed }) => [styles.adminBarLink, pressed && styles.adminBarLinkPressed]}
          onPress={() => navigation.navigate('CreateBulkClasses')}
        >
          <Ionicons name="cloud-upload-outline" size={17} color={ADMIN_COLORS.text} />
          <Text style={styles.adminBarLinkText}>Bulk Load Classes</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.adminBarLink, pressed && styles.adminBarLinkPressed]}
          onPress={() => navigation.navigate('ManageUsers')}
        >
          <Ionicons name="people-outline" size={17} color={ADMIN_COLORS.text} />
          <Text style={styles.adminBarLinkText}>Manage Users</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.adminBarLinkPrimary, pressed && styles.adminBarLinkPrimaryPressed]}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="globe-outline" size={17} color={colors.sidebar} />
          <Text style={styles.adminBarLinkPrimaryText}>View Public Leaderboard</Text>
        </Pressable>
      
      </View>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/* Teacher dashboard body                                            */
/* ------------------------------------------------------------------ */
function TeacherDashboardBody({
  teacher,
  courses,
  announcements,
  navigation,
  isSuperuser,
  scope,
  setScope,
}) {
  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
  const classCount = courses.length;
  const showingAll = isSuperuser && scope === 'all';

  return (
    <>
      {teacher?.is_superuser && (
        <Reveal index={0}>
          <AdminBar navigation={navigation} />
        </Reveal>
      )}

      <Reveal index={1}>
        <View style={styles.hubWelcomeBanner}>
          <Image source={brandImages.logo} style={styles.welcomeWatermark} resizeMode="contain" />
          <Text style={styles.hubGreeting}>Teacher {teacher?.username}</Text>
          <View style={styles.welcomeRule} />
          <Text style={styles.hubSubGreeting}>
            Sabeel 114 Teacher Portal Dashboard — Manage your active classes and student logs.
          </Text>
        </View>
      </Reveal>

      <Reveal index={2}>
        <View style={styles.metricsContainerGrid}>
          <LargeStatCard
            icon="account-multiple"
            value={totalStudents}
            label={showingAll ? 'Enrolled Students (All)' : 'Enrolled Students'}
            accent={colors.gold}
          />
          <LargeStatCard
            icon="school"
            value={classCount}
            label={showingAll ? 'Class Sections (All)' : 'Active Class Sections'}
            accent={colors.primary}
          />
        </View>
      </Reveal>

      <View style={styles.hubContentSplit}>
        <View style={styles.coursesMainSection}>
          <View style={styles.hubSectionHeader}>
            <View style={styles.sectionTitleIndicator} />
            <Text style={styles.hubSectionTitleText}>
              {showingAll ? 'All Classes' : 'Your Teaching Courses'}
            </Text>
          </View>

          {isSuperuser && (
            <View style={styles.scopeToggle}>
              {SCOPE_TABS.map(([key, label]) => (
                <Pressable
                  key={key}
                  style={[styles.scopeTab, scope === key && styles.scopeTabActive]}
                  onPress={() => setScope(key)}
                >
                  <Text style={[styles.scopeTabText, scope === key && styles.scopeTabTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.publicLeaderboardButton}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Ionicons name="trophy-outline" size={20} color={BRONZE_COLORS.bronzeBright} />
            <Text style={styles.publicLeaderboardButtonText}>View Public Leaderboard</Text>
          </Pressable>

          <View style={styles.largeCardGrid}>
            {courses.length === 0 ? (
              <Text style={styles.emptyCoursesText}>
                {showingAll
                  ? 'There are no classes yet.'
                  : "You aren't assigned to any classes yet." +
                    (isSuperuser ? ' Switch to All Classes to see the whole school.' : '')}
              </Text>
            ) : (
              courses.map((course, i) => (
                <View key={course.id} style={styles.courseCardContainerOverride}>
                  <Reveal index={i} distance={12} style={styles.courseCardReveal}>
                    <CourseCard
                      course={course}
                      onViewDetails={() => navigation.navigate('StudentRoster', { course })}
                    />
                  </Reveal>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.utilitiesSideSection}>
          <View style={styles.hubUtilityWidget}>
            <View style={styles.widgetHeaderRow}>
              <View style={styles.widgetIconChip}>
                <MaterialCommunityIcons name="bullhorn" size={19} color={colors.primaryDark} />
              </View>
              <Text style={styles.widgetHeadingText}>Notice Board</Text>
            </View>
            <View style={styles.announcementsListContainer}>
              {announcements.map((a) => (
                <View key={a.id} style={styles.largeNoticeItemBlock}>
                  <View style={styles.noticeMetaRow}>
                    <View style={styles.noticeDateChip}>
                      <Text style={styles.noticeDateLabel}>{a.date}</Text>
                    </View>
                    <View style={styles.noticeDots} />
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
/* Student dashboard body                                            */
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
        <View style={styles.widgetIconChip}>
          <MaterialCommunityIcons name="email-outline" size={19} color={colors.primaryDark} />
        </View>
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

      <Reveal index={0}>
        <View style={styles.hubWelcomeBanner}>
          <Image source={brandImages.logo} style={styles.welcomeWatermark} resizeMode="contain" />
          <Text style={styles.hubGreeting}>Welcome, {teacher?.username}</Text>
          <View style={styles.welcomeRule} />
          <Text style={styles.hubSubGreeting}>
            Sabeel 114 Parent Portal Dashboard — Tap on a student to see their calendar for the current week, including daily scores
            and teacher comments.
          </Text>
        </View>
      </Reveal>

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

  // Superusers get every classroom back from select_classes/, so they also get a
  // toggle to narrow it down to the ones they're actually assigned to.
  const [courseScope, setCourseScope] = useState('mine');

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
    if (!teacher || (teacher.role !== ROLE_TEACHER && !teacher.is_superuser)) return;

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

  const isTeacher = teacher?.role === ROLE_TEACHER || !!teacher?.is_superuser;
  const isStudent = teacher?.role === ROLE_STUDENT;
  const isParent = teacher?.role === ROLE_PARENT;
  const isSuperuser = !!teacher?.is_superuser;

  // Classes this user is actually listed as a teacher of. For a regular teacher
  // this is everything select_classes/ returned anyway; for a superuser it's the
  // subset of the school-wide list they're assigned to. Falls back to the full
  // list if the backend didn't send an id, so the grid can never come up empty
  // just because current_user/ is out of date.
  const myCourses = useMemo(() => {
    if (teacher?.id == null) return courses;
    return courses.filter((c) => Array.isArray(c.teachers) && c.teachers.includes(teacher.id));
  }, [courses, teacher?.id]);

  const visibleCourses = isSuperuser && courseScope === 'all' ? courses : myCourses;

  // Sidebar (course list / sign out) is only meaningful for teachers
  const showSidebarChrome = isTeacher;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top Header Bar */}
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={styles.hubHeader}>
        <View style={styles.headerLeft}>
          {showSidebarChrome &&
            (isWide ? (
              <Pressable
                onPress={() => setSidebarVisible(!sidebarVisible)}
                style={styles.menuIconButton}
                hitSlop={12}
              >
                <Ionicons name={sidebarVisible ? 'close' : 'menu'} size={28} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setMenuOpen(true)}
                style={styles.menuIconButton}
                hitSlop={12}
              >
                <Ionicons name="menu" size={32} color="#FFFFFF" />
              </Pressable>
            ))}
          {isWide ? (
            <>
              <Image source={brandImages.logo} style={styles.hubLogo} resizeMode="contain" />
              <View>
                <Text style={styles.hubTitle}>{brand.name}</Text>
                <Text style={styles.hubTagline}>{brand.tagline}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          <View style={styles.teacherBadgeContainer}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherAvatarInitial}>
                {(teacher?.username || '?').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.teacherBadgeText} numberOfLines={1}>{teacher?.username}</Text>
              <View style={styles.teacherStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.teacherStatusText}>Online</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FBEBE9" />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.mainLayout}>
        {showSidebarChrome && isWide && sidebarVisible && (
          <View style={styles.desktopNavWrapper}>
            <Sidebar
              courses={visibleCourses}
              activeId={visibleCourses[0]?.id}
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
              courses={visibleCourses}
              announcements={announcements}
              navigation={navigation}
              isSuperuser={isSuperuser}
              scope={courseScope}
              setScope={setCourseScope}
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
              courses={visibleCourses}
              activeId={visibleCourses[0]?.id}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 3,
    borderBottomColor: colors.gold,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconButton: { padding: 4, marginRight: 4, justifyContent: 'center', alignItems: 'center' },
  hubLogo: { width: 92, height: 84 },
  hubTitle: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
  hubTagline: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10.5,
    color: colors.gold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  teacherBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 75, 0.35)',
    paddingVertical: 6,
    paddingRight: 16,
    paddingLeft: 6,
    borderRadius: 26,
    gap: 10,
  },
  teacherAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  teacherAvatarInitial: { fontFamily: fontFamilies.displayBlack, fontSize: 15, color: colors.sidebar },
  teacherStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3DDC97' },
  teacherBadgeText: { fontFamily: fontFamilies.bodySemibold, color: '#FFFFFF', fontSize: 15 },
  teacherStatusText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  logoutButtonPressed: { backgroundColor: 'rgba(192, 57, 43, 0.45)' },

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
  createClassButtonText: { fontFamily: fontFamilies.bodyBold, color: '#FFFFFF', fontSize: 15 },

  /* Admin bar — a "wax seal" notice banner, not a bootstrap alert */
  adminBar: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 75, 0.4)',
  },
  adminBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminSealBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldBg,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBarTitle: { fontFamily: fontFamilies.bodyExtraBold, color: ADMIN_COLORS.accent, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  adminBarSubtitle: { fontFamily: fontFamilies.bodyRegular, color: ADMIN_COLORS.text, fontSize: 12.5, marginTop: 2, opacity: 0.8 },
  adminBarLinks: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  adminBarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(201, 162, 75, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 75, 0.5)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  adminBarLinkPressed: { backgroundColor: 'rgba(201, 162, 75, 0.28)' },
  adminBarLinkText: { fontFamily: fontFamilies.bodyBold, color: ADMIN_COLORS.text, fontSize: 13.5 },
  adminBarLinkPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.gold,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 9,
  },
  adminBarLinkPrimaryPressed: { backgroundColor: colors.goldDark },
  adminBarLinkPrimaryText: { fontFamily: fontFamilies.bodyExtraBold, color: colors.sidebar, fontSize: 13.5 },

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
  publicLeaderboardButtonText: { fontFamily: fontFamilies.bodyBold, color: BRONZE_COLORS.badgeText, fontSize: 15 },

  /* Superuser course scope toggle */
  scopeToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: BRONZE_COLORS.badgeBg,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 20,
  },
  scopeTab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8 },
  scopeTabActive: { backgroundColor: BRONZE_COLORS.bronzeBright },
  scopeTabText: { fontFamily: fontFamilies.bodyBold, color: BRONZE_COLORS.textMuted, fontSize: 14 },
  scopeTabTextActive: { color: '#ffffff' },

  emptyCoursesText: {
    width: '100%',
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 16,
    color: BRONZE_COLORS.textMuted,
    lineHeight: 24,
    paddingVertical: 24,
  },

  hubWelcomeBanner: {
    backgroundColor: colors.kraft,
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.kraftLine,
    overflow: 'hidden',
  },
  welcomeWatermark: {
    position: 'absolute',
    top: -26,
    right: -22,
    width: 180,
    height: 180,
    opacity: 0.09,
    transform: [{ rotate: '8deg' }],
  },
  welcomeRule: { width: 56, height: 3, borderRadius: 2, backgroundColor: colors.gold, marginTop: 14, marginBottom: 14 },
  hubGreeting: { fontFamily: fontFamilies.displayBlack, fontSize: 32, color: BRONZE_COLORS.textDark },
  hubSubGreeting: { fontFamily: fontFamilies.displayItalic, fontSize: 18, color: BRONZE_COLORS.textMuted, lineHeight: 26, maxWidth: 640 },

  metricsContainerGrid: { flexDirection: 'row', gap: 24, flexWrap: 'wrap', marginBottom: 36 },
  largeStatCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    borderTopWidth: 4,
  },
  statIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextGroup: { flex: 1 },
  largeStatValue: { fontFamily: fontFamilies.displayBlack, fontSize: 36, color: BRONZE_COLORS.textDark, letterSpacing: -0.5 },
  largeStatLabel: { fontFamily: fontFamilies.bodySemibold, fontSize: 16, color: BRONZE_COLORS.textMuted, marginTop: 4 },

  hubContentSplit: { flexDirection: 'row', gap: 32, flexWrap: 'wrap' },
  coursesMainSection: { flex: 4, minWidth: 450 },
  utilitiesSideSection: { flex: 1.5, minWidth: 320, gap: 32 },

  hubSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  sectionTitleIndicator: { width: 6, height: 28, backgroundColor: BRONZE_COLORS.bronzeBright, borderRadius: 3 },
  hubSectionTitleText: { fontFamily: fontFamilies.displayBold, fontSize: 22, color: BRONZE_COLORS.textDark },

  largeCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  courseCardContainerOverride: { flexGrow: 1, flexBasis: 340, maxWidth: 440 },
  courseCardReveal: { width: '100%' },

  hubUtilityWidget: {
    backgroundColor: BRONZE_COLORS.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRONZE_COLORS.borderLight,
    padding: 24,
  },
  widgetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: BRONZE_COLORS.borderLight, paddingBottom: 16 },
  widgetIconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetHeadingText: { fontFamily: fontFamilies.displaySemibold, fontSize: 18, color: BRONZE_COLORS.textDark },

  announcementsListContainer: { gap: 20 },
  largeNoticeItemBlock: { borderBottomWidth: 1, borderBottomColor: BRONZE_COLORS.borderLight, paddingBottom: 16 },
  noticeMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  noticeDateChip: { backgroundColor: colors.goldBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  noticeDateLabel: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 11,
    color: colors.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  noticeDots: {
    flex: 1,
    marginLeft: 10,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.inputBorder,
    marginBottom: 2,
  },
  noticeTitleLabelText: { fontFamily: fontFamilies.displaySemibold, fontSize: 17, color: BRONZE_COLORS.textDark },
  noticeDetailBodyText: { fontFamily: fontFamilies.bodyRegular, fontSize: 15, color: BRONZE_COLORS.textMuted, marginTop: 6, lineHeight: 22 },

  mobileBackdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(33, 43, 24, 0.55)' },
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
  simplePageTitle: { fontFamily: fontFamilies.displayBold, fontSize: 24, color: BRONZE_COLORS.textDark, marginTop: 16 },
  simplePageBody: { fontFamily: fontFamilies.bodyRegular, fontSize: 16, color: BRONZE_COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 24 },
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
  publicLeaderboardButtonLargeText: { fontFamily: fontFamilies.bodyBold, color: '#FFFFFF', fontSize: 16 },

  /* Parent view */
  parentStudentList: { gap: 4 },
  errorTextLarge: { fontFamily: fontFamilies.bodyMedium, fontSize: 16, color: '#B91C1C', marginVertical: 20 },
  emptyStateText: { fontFamily: fontFamilies.bodyRegular, fontSize: 16, color: BRONZE_COLORS.textMuted, marginVertical: 20 },

  /* Parent — email notifications card */
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationRowText: { flex: 1 },
  notificationRowTitle: { fontFamily: fontFamilies.bodyBold, fontSize: 15, color: BRONZE_COLORS.textDark },
  notificationRowSubtitle: { fontFamily: fontFamilies.bodyRegular, fontSize: 13, color: BRONZE_COLORS.textMuted, marginTop: 4, lineHeight: 19 },
  errorTextSmall: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: '#B91C1C', marginTop: 12 },
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