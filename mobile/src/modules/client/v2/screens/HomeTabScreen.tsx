import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { GlassCard } from "../../../../shared/ui/GlassCard";
import { styles } from "../styles";
import { useClientData } from "../ClientDataContext";

// Обертка для навигации в Tab
export function HomeTabScreen({ navigation }: any) {
  const { 
    me, 
    bonusBalance, 
    ensureBranchesLoaded, 
    ensureVisitsLoaded, 
    ensureBonusHistoryLoaded 
  } = useClientData();

  const clientName = me?.fullName?.trim() || me?.email || "Клиент";

  return (
    <View style={{ flex: 1, paddingBottom: 120 }}>
      {/* Welcome Section */}
      <View style={styles.brandCard}>
        <Text style={styles.brandTitle}>С ВОЗВРАЩЕНИЕМ</Text>
        <Text style={styles.welcomeText}>{clientName}</Text>
      </View>

      {/* Loyalty Gauge */}
      <GlassCard elevated animated style={styles.bonusCard}>
        <View style={styles.gaugeContainer}>
          <Image 
            source={{ uri: "https://lh3.googleusercontent.com/aida/ADBb0uj9KA2KJkFr7_GHIUDLSf7LCkcuhE4l92aj31aYoNABVzY2Kx4lrZzucyt25yLXdVFBmeLUo8kSGKdujQGdOkJx1ApQuXaHDMXpSCYzXA2ghcJ4TYQOdRkuUtaoS8xrw9G6LJkQMiTI2Kzdre5Wf4pVtht1-ecpx3C1aHe-GMNlpEDMP_rOJ3gvUDNDA-PAX2ZXkDvw5fQUJCuFdQxYvAREhqGGqUiTbY9aeiE4da0C-NnyshpF8Tl8z_TqRvg8qELAqKYvsGbUMjs" }} 
            style={styles.gaugeImage}
          />
          <Text style={styles.bonusValue}>{bonusBalance}</Text>
          <Text style={styles.bonusCaption}>Бонусных баллов</Text>
        </View>
      </GlassCard>

      {/* Bento Grid */}
      <View style={styles.actionGrid}>
        <Pressable
          style={({ pressed }) => [styles.actionTileBig, pressed && styles.pressedTile]}
          onPress={() => {
            void ensureBranchesLoaded().then(() => navigation.navigate("BookingTab"));
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20 }}>🛠️</Text>
          </View>
          <Text style={styles.actionTileLabelDark}>Запись на ремонт</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
          onPress={() => {
            void ensureVisitsLoaded().then(() => navigation.navigate("VisitsTab"));
          }}
        >
          <Text style={{ fontSize: 24 }}>📅</Text>
          <View>
            <Text style={styles.actionTileLabel}>История визитов</Text>
            <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>12 ВЫПОЛНЕНО</Text>
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionTile, pressed && styles.pressedTile]}
          onPress={() => {
            void ensureBonusHistoryLoaded().then(() => navigation.navigate("Cashback"));
          }}
        >
          <Text style={{ fontSize: 24 }}>💳</Text>
          <View>
            <Text style={styles.actionTileLabel}>Кэшбэк система</Text>
            <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>СТАВКА 5%</Text>
          </View>
        </Pressable>
      </View>

      {/* Status Card */}
      <View style={styles.infoCard}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18 }}>🚗</Text>
        </View>
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.infoTitle}>Следующее ТО</Text>
          <Text style={styles.infoSubtitle}>Запланировано на 24 октября 2024</Text>
        </View>
      </View>
    </View>
  );
}
