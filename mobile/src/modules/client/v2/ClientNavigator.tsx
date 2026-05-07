import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../theme/colors";

import { HomeTabScreen } from "./screens/HomeTabScreen";
import { VisitsTabScreen } from "./screens/VisitsTabScreen";
import { BookingTabScreen } from "./screens/BookingTabScreen";
import { ChatTabScreen } from "./screens/ChatTabScreen";

import { VisitDetailsScreen } from "./screens/VisitDetailsScreen";
import { BonusHistoryScreen } from "./screens/BonusHistoryScreen";
import { CashbackScreen } from "./screens/CashbackScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  
  const tabLabelStyle = {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: tabLabelStyle,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabScreen}
        options={{ tabBarLabel: "DASHBOARD" }}
      />
      <Tab.Screen
        name="VisitsTab"
        component={VisitsTabScreen}
        options={{ tabBarLabel: "HISTORY" }}
      />
      <Tab.Screen
        name="BookingTab"
        component={BookingTabScreen}
        options={{ tabBarLabel: "CONTACT" }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatTabScreen}
        options={{ tabBarLabel: "CHAT" }}
      />
    </Tab.Navigator>
  );
}

export function ClientNavigator() {
  return (
    <NavigationContainer independent={true}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="VisitDetails" component={VisitDetailsScreen} />
        <Stack.Screen name="BonusHistory" component={BonusHistoryScreen} />
        <Stack.Screen name="Cashback" component={CashbackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
