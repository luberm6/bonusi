import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileTokens } from "../../../shared/design/tokens";

// Из-за того что файлы экранов еще не созданы в примере, 
// мы импортируем заглушки или рендерим простые компоненты
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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#131313",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.05)",
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 12,
        },
        tabBarActiveTintColor: mobileTokens.color.secondary,
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeTabScreen} 
        options={{ tabBarLabel: "Главная v2" }} 
      />
      <Tab.Screen 
        name="VisitsTab" 
        component={VisitsTabScreen} 
        options={{ tabBarLabel: "История" }} 
      />
      <Tab.Screen 
        name="BookingTab" 
        component={BookingTabScreen} 
        options={{ tabBarLabel: "Сервис" }} 
      />
      <Tab.Screen 
        name="ChatTab" 
        component={ChatTabScreen} 
        options={{ tabBarLabel: "Профиль" }} 
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
