import React from "react";
import { View, Text } from "react-native";
import { styles } from "../styles";

export function BookingTabScreen() {
  return (
    <View style={styles.screenWrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>СЕРВИС</Text>
      </View>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Онлайн-запись временно недоступна</Text>
        <Text style={styles.emptyDescription}>Пожалуйста, напишите нам в службу поддержки для записи на ремонт.</Text>
      </View>
    </View>
  );
}
