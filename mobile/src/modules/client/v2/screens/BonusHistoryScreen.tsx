import React from "react";
import { View, Text, Pressable } from "react-native";
import { styles } from "../styles";

export function BonusHistoryScreen({ navigation }: any) {
  return (
    <View style={styles.screenWrap}>
      <View style={styles.screenHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>← Назад</Text>
        </Pressable>
        <Text style={styles.screenTitle}>ИСТОРИЯ БОНУСОВ</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>История начислений</Text>
        <Text style={styles.emptyDescription}>Скоро здесь появится полная детализация списка начислений и списаний баллов.</Text>
      </View>
    </View>
  );
}
