import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../../../theme/colors';

export function VisitDetailsScreen({ navigation }: any) {
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ДЕТАЛИ ЗАКАЗА</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>Заказ-наряд</Text>
          <Text style={s.emptyDesc}>
            Детализация работ по заказ-наряду из 1С появится здесь после синхронизации.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.accent, fontSize: 28, lineHeight: 30, fontWeight: '300' },
  headerTitle: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },

  emptyCard: {
    marginTop: 40,
    backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 32, alignItems: 'center', gap: 12,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  emptyDesc: {
    color: colors.textSub, fontSize: 13, lineHeight: 20,
    textAlign: 'center', paddingHorizontal: 8,
  },
});
