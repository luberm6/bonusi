import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/core";
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

  return (
    <Tab.Navigator
      id="ClientMainTabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeTabScreen} />
      <Tab.Screen name="ChatTab" component={ChatTabScreen} />
    </Tab.Navigator>
  );
}

export function ClientNavigator() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Stack.Navigator id="ClientRootStack" screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Booking" component={BookingTabScreen} />
          <Stack.Screen name="Visits" component={VisitsTabScreen} />
          <Stack.Screen name="VisitDetails" component={VisitDetailsScreen} />
          <Stack.Screen name="BonusHistory" component={BonusHistoryScreen} />
          <Stack.Screen name="Cashback" component={CashbackScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
