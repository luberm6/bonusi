import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';

const STEPS = [
  {
    num: '1',
    icon: '🔧',
    title: 'Делаете ремонт',
    desc: 'Проходите техническое обслуживание или ремонт в Центре Radius Service',
  },
  {
    num: '2',
    icon: '💰',
    title: 'Получаете бонусы',
    desc: '5% от стоимости выполненных ремонтных работ начисляется бонусными баллами на ваш счёт',
  },
  {
    num: '3',
    icon: '🎁',
    title: 'Оплачиваете бонусами',
    desc: 'Накопленные баллы можно использовать для оплаты следующего визита',
  },
];

const DETAILS = [
  { label: 'Начисление',        value: '5% от суммы работ' },
  { label: 'Срок действия',     value: '12 месяцев' },
  { label: 'Начисление на',     value: 'Только ремонт' },
  { label: 'Запчасти',          value: 'Не начисляется' },
];

export function CashbackScreen({ navigation }: any) {
  const { bonusBalance } = useClientData();

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>СИСТЕМА КЭШБЕКА</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Текущий баланс */}
        <View style={s.balanceCard}>
          <View style={s.balanceLeft}>
            <Text style={s.balanceLabel}>ВАШ БАЛАНС</Text>
            <Text style={s.balanceValue}>{bonusBalance}</Text>
            <Text style={s.balanceSub}>бонусных баллов</Text>
          </View>
          <View style={s.balanceRight}>
            <Text style={s.rateLabel}>СТАВКА</Text>
            <Text style={s.rateValue}>5%</Text>
            <Text style={s.rateSub}>с ремонтных работ</Text>
          </View>
        </View>

        {/* Как работает */}
        <Text style={s.sectionTitle}>КАК ЭТО РАБОТАЕТ</Text>
        {STEPS.map((step) => (
          <View key={step.num} style={s.stepCard}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>{step.num}</Text>
            </View>
            <View style={s.stepIcon}>
              <Text style={{ fontSize: 22 }}>{step.icon}</Text>
            </View>
            <View style={s.stepInfo}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}

        {/* Условия */}
        <Text style={s.sectionTitle}>УСЛОВИЯ ПРОГРАММЫ</Text>
        <View style={s.detailsCard}>
          {DETAILS.map((d, i) => (
            <View key={d.label} style={[s.detailRow, i < DETAILS.length - 1 && s.detailRowBorder]}>
              <Text style={s.detailLabel}>{d.label}</Text>
              <Text style={s.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Важно */}
        <View style={s.noteCard}>
          <Text style={s.noteTitle}>⚠️  Важно знать</Text>
          <Text style={s.noteText}>
            Бонусы начисляются только на стоимость ремонтных работ.{'\n'}
            На стоимость запасных частей и материалов бонусы не начисляются.{'\n\n'}
            Баллы сгорают через 12 месяцев с момента последнего начисления.
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
  scrollContent: { padding: 20, paddingBottom: 48, gap: 12 },

  // Баланс
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.3)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLeft: { flex: 1 },
  balanceLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  balanceValue: { color: colors.accent, fontSize: 48, fontWeight: '700', lineHeight: 54 },
  balanceSub: { color: colors.textSub, fontSize: 13 },
  balanceRight: {
    alignItems: 'center',
    backgroundColor: colors.surface3,
    borderRadius: 14,
    padding: 16,
    minWidth: 90,
  },
  rateLabel: { color: colors.textDim, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  rateValue: { color: colors.accent, fontSize: 36, fontWeight: '700', lineHeight: 42 },
  rateSub: { color: colors.textSub, fontSize: 10, textAlign: 'center', marginTop: 2 },

  sectionTitle: {
    color: colors.textDim, fontSize: 11, letterSpacing: 2,
    fontWeight: '700', marginTop: 8, marginBottom: 4,
  },

  // Шаги
  stepCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  stepNumText: { color: '#000', fontSize: 14, fontWeight: '700' },
  stepIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepInfo: { flex: 1 },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepDesc: { color: colors.textSub, fontSize: 13, lineHeight: 19, marginTop: 4 },

  // Условия
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.textSub, fontSize: 13 },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '700' },

  // Важно
  noteCard: {
    backgroundColor: 'rgba(255,193,7,0.08)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,193,7,0.25)',
    padding: 16, gap: 8,
  },
  noteTitle: { color: '#FFC107', fontSize: 14, fontWeight: '700' },
  noteText: { color: colors.textSub, fontSize: 13, lineHeight: 20 },
});
