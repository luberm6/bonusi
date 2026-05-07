import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';

export function BonusHistoryScreen({ navigation }: any) {
  const { bonusBalance, bonusHistory, bonusHistoryLoading, ensureBonusHistoryLoaded } =
    useClientData();

  React.useEffect(() => {
    ensureBonusHistoryLoaded();
  }, [ensureBonusHistoryLoaded]);

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ИСТОРИЯ БОНУСОВ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Balance card ── */}
        <View style={s.balanceCard}>
          <View style={s.balanceRing}>
            <Text style={s.balanceValue}>{bonusBalance}</Text>
            <Text style={s.balanceCaption}>БАЛЛОВ</Text>
          </View>
          <View style={s.balanceInfo}>
            <Text style={s.balanceLabel}>ТЕКУЩИЙ БАЛАНС</Text>
            <Text style={s.balanceDesc}>Доступно для использования при следующем визите</Text>
          </View>
        </View>

        {/* ── History ── */}
        {bonusHistoryLoading ? (
          <View style={s.loaderWrap}>
            <Text style={s.loaderText}>Загрузка истории...</Text>
          </View>
        ) : bonusHistory && bonusHistory.length > 0 ? (
          bonusHistory.map((row) => {
            const isAccrual = row.type === 'accrual';
            return (
              <View key={row.id} style={s.historyCard}>
                <View style={[s.historyIconWrap, isAccrual ? s.iconAccrual : s.iconWriteoff]}>
                  <Text style={{ fontSize: 18 }}>{isAccrual ? '⬆' : '⬇'}</Text>
                </View>
                <View style={s.historyInfo}>
                  <Text style={s.historyComment}>
                    {row.comment || (isAccrual ? 'Начисление баллов' : 'Списание баллов')}
                  </Text>
                  <Text style={s.historyDate}>
                    {new Date(row.createdAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={[s.historyAmount, isAccrual ? s.amountPlus : s.amountMinus]}>
                  {isAccrual ? '+' : '−'}{row.amount}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🏅</Text>
            <Text style={s.emptyTitle}>История пуста</Text>
            <Text style={s.emptySubtext}>
              Здесь появится детализация начислений и списаний баллов после первого визита.
            </Text>
          </View>
        )}
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
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },

  // Balance card
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.3)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  balanceRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    flexShrink: 0,
  },
  balanceValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  balanceCaption: {
    color: colors.textDim,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
  },
  balanceInfo: {
    flex: 1,
    gap: 4,
  },
  balanceLabel: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  balanceDesc: {
    color: colors.textSub,
    fontSize: 13,
    lineHeight: 18,
  },

  // History rows
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconAccrual: {
    backgroundColor: 'rgba(0,188,212,0.12)',
  },
  iconWriteoff: {
    backgroundColor: 'rgba(255,82,82,0.12)',
  },
  historyInfo: {
    flex: 1,
    gap: 3,
  },
  historyComment: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    color: colors.textDim,
    fontSize: 11,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountPlus: {
    color: colors.accent,
  },
  amountMinus: {
    color: '#FF5252',
  },

  loaderWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textDim,
    fontSize: 13,
    letterSpacing: 1,
  },

  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    color: colors.textSub,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  emptySubtext: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
