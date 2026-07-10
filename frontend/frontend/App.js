import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setOnAuthFailure } from './api'; // adjust path if api.js lives elsewhere

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, StyleSheet } from 'react-native';

/* Screens */
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import LoadingScreen from './screens/LoadingScreen';
import AddLogScreen from './screens/AddLogScreen';
import StudentViewScreen from './screens/StudentViewScreen';
import CreateClassAccountsScreen from './screens/CreateClassAccountsScreen.js';
import LeaderboardScreen from './screens/LeaderboardScreen.js';
import { AuthContext } from './context/AuthContext';
import { colors, spacing, fonts, radii } from './constants/theme';

/* Admin Screens */
//import AdminDashboardScreen from './admin-portal/AdminDashboardScreen';
//import ManageCourses from './admin-portal/ManageCourses';

const Stack = createNativeStackNavigator();

/* ---------------- SMALL INLINE ERROR VIEW ---------------- */
function AppLoadError({ message, onRetry }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- ROOT APP ---------------- */
export default function App() {

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState(null);

  // Registered once: if api.js ever fails to refresh the access token
  // (refresh token itself expired/invalid), this fires from ANY screen,
  // not just this file, and kicks the user back to AuthStack.
  useEffect(() => {
    setOnAuthFailure(() => {
      setAuthenticated(false);
      setUser(null);
    });
  }, []);

  // Only the very first checkAuth() call (app cold start) should honor the
  // "Remember me" flag. Later calls happen because *this session* just
  // logged in/out, so they must not be gated by a stale flag value.
  const hasCheckedRememberOnBoot = useRef(false);

  const checkAuth = useCallback(async () => {
    console.log('Checking authentication...');
    setLoading(true);
    setUserError(null);

    try {
      if (!hasCheckedRememberOnBoot.current) {
        hasCheckedRememberOnBoot.current = true;

        const remembered = await AsyncStorage.getItem('rememberMe');
        if (remembered !== 'true') {
          // Not remembered — don't resurrect a session left over from a
          // previous run; require a fresh login.
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
        }
      }

      const token = await AsyncStorage.getItem('authToken');
      console.log('TOKEN FROM STORAGE:', token);
      const isAuthed = !!token;
      setAuthenticated(isAuthed);


      if (isAuthed) {
        try {
          // Goes through api.js now: auth header is attached automatically,
          // and if the access token is expired this transparently refreshes
          // and retries before ever reaching this catch block.
          const response = await api.get('/current_user/');
          setUser(response.data);
        } catch (userErr) {

          console.error('Failed to fetch current user:', userErr?.response?.status, userErr?.response?.data);

          if (userErr?.response?.status === 401) {
            // Refresh already happened inside api.js and still failed —
            // this is a genuine logged-out state, not a transient expiry.
            await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
            setAuthenticated(false);
            setUser(null);
            setUserError(null);
          } else {

            setUser(null);
            setUserError(
              userErr?.response?.data?.error ||
                userErr?.response?.data?.message ||
                'Could not load your account. Please try again.'
            );
          }
        }
      } else {
        console.log('No token found, user is not authenticated.');
        setUser(null);
      }
    } catch (err) {

      console.error('Auth check failed:', err);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

  }, [authenticated]);

  if (loading) return <LoadingScreen label="Fetching login…" />;

  // If we're authenticated but still resolving the user's role, keep
  // showing a loading screen rather than mounting the navigator early.
  const showAccountLoading = authenticated && user === null && !userError;

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated, user, setUser, loading }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          {showAccountLoading ? (
            <LoadingScreen label="Signing you in..." />
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {authenticated ? (
                userError ? (
                  <Stack.Screen name="AppError">
                    {() => <AppLoadError message={userError} onRetry={checkAuth} />}
                  </Stack.Screen>
                ) : user.role_id === 1 ? (
                  // Teacher
                  <>
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="AddLog" component={AddLogScreen} />
                    <Stack.Screen name="StudentRoster" component={StudentViewScreen} />
                    <Stack.Screen name="CreateClassAccounts" component={CreateClassAccountsScreen} />
                    <Stack.Screen name="AdminLeaderboard" component={AdminLeaderboardScreen} />
                  </>
                ) : user.role_id !==  1 ? (
                  <>
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                  </>
                ) : (
                  <Stack.Screen name="AppError">
                    {() => (
                      <AppLoadError
                        message={`No screen configured for role "${user.role_id}".`}
                        onRetry={checkAuth}
                      />
                    )}
                  </Stack.Screen>
                )
              ) : (
                // Not authenticated
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Signup" component={SignupScreen} />
                </>
              )}

              {/* Always reachable, logged in or not. */}
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: fonts.sizes.title,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
  },
  retryBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: fonts.sizes.body,
  },
});