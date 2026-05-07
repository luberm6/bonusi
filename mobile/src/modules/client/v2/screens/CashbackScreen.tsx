import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../../../theme/colors';

const FEATURES = [
  {
    icon: '🔧',
    title: 'Service',
    description: 'Проходите техническое обслуживание и ремонт в наших сервисных центрах',
  },
  {
    icon: '⚡',
    title: 'Earn 5%',
    description: 'Получайте 5% от суммы каждого визита в виде бонусных баллов на счёт',
  },
  {
    icon: '🎟',
    title: 'Redeem',
    description: 'Оплачивайте бонусами до 50% стоимости следующего обслуживания',
  },
];

const DETAILS = [
  { label: 'Ставка кэшбэка', value: '5%' },
  { label: 'Срок действия баллов', value: '12 месяцев' },
  { label: 'Мин. сумма списания', value: '500 ₸' },
  { label: 'Макс. оплата баллами', value: '50% от суммы' },
];

export function CashbackScreen({ navigation }: any) {
  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>СИСТЕМА КЭШБЕКА</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero title ── */}
        <View style={s.heroBlock}>
          <Text style={s.heroLine}>
            <Text style={s.heroWhite}>How our </Text>
            <Text style={s.heroCyan}>loyalty program</Text>
            <Text style={s.heroWhite}> works</Text>
          </Text>
          <Text style={s.heroSub}>
            Простая система накопления и использования бонусных баллов
          </Text>
        </View>

        {/* ── Feature cards ── */}
        {FEATURES.map((f) => (
          <View key={f.title} style={s.featureCard}>
            <View style={s.featureIconWrap}>
              <Text style={{ fontSize: 22 }}>{f.icon}</Text>
            </View>
            <View style={s.featureInfo}>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.description}</Text>
            </View>
          </View>
        ))}

        {/* ── Program Details ── */}
        <View style={s.detailsCard}>
          <View style={s.detailsHeader}>
            <Text style={{ fontSize: 16 }}>ℹ</Text>
            <Text style={s.detailsLabel}>PROGRAM DETAILS</Text>
          </View>
          <View style={s.detailsDivider} />
          {DETAILS.map((d, i) => (
            <View key={d.label} style={[s.detailRow, i < DETAILS.length - 1 && s.detailRowBorder]}>
              <Text style={s.detailRowLabel}>{d.label}</Text>
              <Text style={s.detailRowValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.accent,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 12,
  },

  heroBlock: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  heroLine: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  heroWhite: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  heroCyan: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  heroSub: {
    color: colors.textSub,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureInfo: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureDesc: {
    color: colors.textSub,
    fontSize: 13,
    lineHeight: 19,
  },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  detailsLabel: {
    color: colors.textSub,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowLabel: {
    color: colors.textSub,
    fontSize: 13,
  },
  detailRowValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
