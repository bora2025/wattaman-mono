import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from './src/AuthContext';
import { getToken, getUser, logout as apiLogout } from './src/api';
import { COLORS } from './src/theme';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SearchScreen from './src/screens/SearchScreen';
import UsersScreen from './src/screens/UsersScreen';
import ClassesScreen from './src/screens/ClassesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import StaffReportsScreen from './src/screens/StaffReportsScreen';
import EditAttendanceScreen from './src/screens/EditAttendanceScreen';
import HolidaysScreen from './src/screens/HolidaysScreen';
import SessionSettingsScreen from './src/screens/SessionSettingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const savedUser = await getUser();
          if (savedUser) setUser(savedUser);
        }
      } catch {}
      setIsReady(true);
    })();
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async () => {
        const savedUser = await getUser();
        setUser(savedUser);
      },
      signOut: async () => {
        await apiLogout();
        setUser(null);
      },
      user,
    }),
    [user]
  );

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {user ? (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen
                name="Scanner"
                component={ScannerScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Users"
                component={UsersScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Classes"
                component={ClassesScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="StaffReports"
                component={StaffReportsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="EditAttendance"
                component={EditAttendanceScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Holidays"
                component={HolidaysScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="SessionSettings"
                component={SessionSettingsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="MyReports"
                component={MyReportsScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
