import React from "react";
import { View, Text, Pressable } from "react-native";
import { styles } from "../styles";

export function VisitDetailsScreen({ navigation }: any) {
  return (
    <View style={styles.screenWrap}>
      <View style={styles.screenHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>← Назад</Text>
        </Pressable>
        <Text style={styles.screenTitle}>ДЕТАЛИ ЗАКАЗА</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Заказ-наряд</Text>
        <Text style={styles.emptyDescription}>Скоро здесь появится детализация работ по заказ-наряду из 1С.</Text>
      </View>
    </View>
  );
}
