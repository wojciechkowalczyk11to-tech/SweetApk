// App.tsx
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { COLORS } from './src/lib/theme';
import { useAuthStore } from './src/store/useAuthStore';
import { useCoupleStore } from './src/store/useCoupleStore';

import AuthScreen from './src/screens/AuthScreen';
import PairingScreen from './src/screens/PairingScreen';
import HomeScreen from './src/screens/HomeScreen';
import MomentsScreen from './src/screens/MomentsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import LocationScreen from './src/screens/LocationScreen';
import NudgeScreen from './src/screens/NudgeScreen';
import PetShopScreen from './src/screens/PetShopScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Suppress known harmless warnings from libraries
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Setting a timer',
]);

// ─── Type definitions for navigators ────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Pairing: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Moments: undefined;
  Calendar: undefined;
  Location: undefined;
  Nudge: undefined;
  PetShop: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab icons (emoji-based, zero external deps) ────────────
const TAB_ICONS: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Home:     { active: '🏠', inactive: '🏡' },
  Moments:  { active: '📸', inactive: '🖼️' },
  Calendar: { active: '📅', inactive: '🗓️' },
  Location: { active: '📍', inactive: '🗺️' },
  Nudge:    { active: '💗', inactive: '💤' },
  PetShop:  { active: '🐕', inactive: '🛍️' },
  Profile:  { active: '⚙️', inactive: '👤' },
};

const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  Home: 'Dom',
  Moments: 'Chwile',
  Calendar: 'Kalendarz',
  Location: 'Mapa',
  Nudge: 'Zaczepki',
  PetShop: 'Sklepik',
  Profile: 'Profil',
};

// ─── Main tab navigator ─────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabel: TAB_LABELS[route.name as keyof MainTabParamList],
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <View style={styles.tabIcon}>
              <View style={[styles.tabIconText]}>
                {/* React Native <Text> inside tabBarIcon requires explicit import */}
              </View>
            </View>
          );
        },
        // Use tabBarLabel for showing emoji + label since RN doesn't render emoji well in tabBarIcon on all devices
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'SweetSync 💕',
          tabBarLabel: '🏠 Dom',
        }}
      />
      <Tab.Screen
        name="Moments"
        component={MomentsScreen}
        options={{
          title: 'Nasze chwile 📸',
          tabBarLabel: '📸 Chwile',
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Kalendarz 📅',
          tabBarLabel: '📅 Plan',
        }}
      />
      <Tab.Screen
        name="Location"
        component={LocationScreen}
        options={{
          title: 'Gdzie jesteś? 📍',
          tabBarLabel: '📍 Mapa',
        }}
      />
      <Tab.Screen
        name="Nudge"
        component={NudgeScreen}
        options={{
          title: 'Zaczepki 💗',
          tabBarLabel: '💗 Bzzz',
        }}
      />
      <Tab.Screen
        name="PetShop"
        component={PetShopScreen}
        options={{
          title: 'Sklepik 🐕',
          tabBarLabel: '🐕 Piesek',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil ⚙️',
          tabBarLabel: '⚙️ Profil',
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root app with auth state machine ───────────────────────
export default function App() {
  const { user, couple, isInitialized, initialize } = useAuthStore();
  const { loadCoupleData } = useCoupleStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // When couple is loaded, fetch all couple-specific data
  useEffect(() => {
    if (couple?.id) {
      loadCoupleData(couple.id);
    }
  }, [couple?.id, loadCoupleData]);

  // ── Loading splash ──
  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Navigation state machine ──
  // No user → Auth screen
  // User but no couple → Pairing screen
  // User + couple → Main tabs
  const initialRoute: keyof RootStackParamList =
    !user ? 'Auth' : !couple ? 'Pairing' : 'Main';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={COLORS.background} />
        <NavigationContainer>
          <RootStack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, animation: 'fade' }}
          >
            {!user ? (
              <RootStack.Screen name="Auth" component={AuthScreen} />
            ) : !couple ? (
              <RootStack.Screen name="Pairing" component={PairingScreen} />
            ) : (
              <RootStack.Screen name="Main" component={MainTabs} />
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 20,
  },
});
