import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/core";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

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
  return (
    <Tab.Navigator
      id="ClientMainTabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeTabScreen} />
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
          <Stack.Screen name="Chat" component={ChatTabScreen} />
          <Stack.Screen name="VisitDetails" component={VisitDetailsScreen} />
          <Stack.Screen name="BonusHistory" component={BonusHistoryScreen} />
          <Stack.Screen name="Cashback" component={CashbackScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
