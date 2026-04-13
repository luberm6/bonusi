import React from "react";
import { View, Text, ScrollView } from "react-native";
import { styles } from "../styles";
import { useClientData } from "../ClientDataContext";
import { GlassCard } from "../../../../shared/ui/GlassCard";

export function VisitsTabScreen({ navigation }: any) {
  const { visits, visitsLoading, ensureVisitsLoaded } = useClientData();

  React.useEffect(() => {
    ensureVisitsLoaded();
  }, [ensureVisitsLoaded]);

  return (
    <View style={styles.screenWrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ИСТОРИЯ ВИЗИТОВ</Text>
      </View>
      <ScrollView style={styles.pageScroll} contentContainerStyle={{ paddingBottom: 120 }}>
        {visitsLoading ? (
          <View style={styles.loaderWrap}>
            <Text style={styles.loaderText}>Загрузка истории...</Text>
          </View>
        ) : visits && visits.length > 0 ? (
          visits.map(v => (
            <GlassCard key={v.id} style={styles.listCard} elevated>
              <Text style={styles.listTitle}>{v.branchName || "Услуги сервиса"}</Text>
              <Text style={styles.listSubtitle}>{new Date(v.visitDate).toLocaleDateString()}</Text>
              <Text style={styles.listValue}>{v.finalAmount} ₸</Text>
            </GlassCard>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Нет истории визитов</Text>
            <Text style={styles.emptyDescription}>Вы еще не посещали наши сервисные центры.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
