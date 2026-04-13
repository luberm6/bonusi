import React from "react";
import { View, Text, Pressable } from "react-native";
import { styles } from "../styles";

export function CashbackScreen({ navigation }: any) {
  return (
    <View style={styles.screenWrap}>
      <View style={styles.screenHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>← Назад</Text>
        </Pressable>
        <Text style={styles.screenTitle}>КЭШБЭК</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <View style={styles.cashbackCard}>
        <Text style={styles.cashbackTitle}>ваша ставка кэшбэка</Text>
        <Text style={styles.cashbackValue}>5%</Text>
        <Text style={styles.cashbackHint}>Чем чаще вы обслуживаетесь у нас, тем выше ваш уровень кэшбэка.</Text>
      </View>
    </View>
  );
}
