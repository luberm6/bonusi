import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';

export function VisitsTabScreen({ navigation }: any) {
  const { visits, visitsLoading, ensureVisitsLoaded } = useClientData();

  React.useEffect(() => {
    ensureVisitsLoaded();
  }, [ensureVisitsLoaded]);

  const completedCount = visits?.length ?? 0;
  const integrityPct = Math.min(100, 60 + completedCount * 4);

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ИСТОРИЯ РЕМОНТА</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── System Integrity card ── */}
        <View style={s.integrityCard}>
          <View style={s.integrityRingWrap}>
            {/* Ring */}
            <View style={s.integrityRingOuter}>
              <View style={s.integrityRingInner}>
                <Text style={s.integrityPct}>{integrityPct}%</Text>
              </View>
            </View>
          </View>
          <View style={s.integrityInfo}>
            <Text style={s.integrityTitle}>SYSTEM INTEGRITY</Text>
            <Text style={s.integrityStatus}>Optimal Performance</Text>
            <View style={s.integrityBar}>
              <View style={[s.integrityBarFill, { width: `${integrityPct}%` }]} />
            </View>
            <Text style={s.integrityHint}>{completedCount} ВИЗИТОВ ВЫПОЛНЕНО</Text>
          </View>
        </View>

        {/* ── Visit list ── */}
        {visitsLoading ? (
          <View style={s.loaderWrap}>
            <Text style={s.loaderText}>Загрузка истории...</Text>
          </View>
        ) : visits && visits.length > 0 ? (
          visits.map((v) => (
            <View key={v.id} style={s.visitCard}>
              <View style={s.visitRow}>
                {/* File icon */}
                <View style={s.fileIconWrap}>
                  <Text style={{ fontSize: 22 }}>📄</Text>
                </View>

                {/* Info */}
                <View style={s.visitInfo}>
                  <Text style={s.visitDate}>
                    {new Date(v.visitDate).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={s.visitTitle}>{v.branchName || 'Услуги сервиса'}</Text>
                  <Text style={s.visitSubtitle}>
                    {v.serviceNames?.join(', ') ||
                      (v.servicesCount ? `${v.servicesCount} услуг` : 'Ремонтные работы')}
                  </Text>
                </View>
              </View>

              {/* Bottom row */}
              <View style={s.visitFooter}>
                <View style={s.completedBadge}>
                  <Text style={s.completedBadgeText}>COMPLETED</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [s.viewBtn, pressed && s.pressed]}
                  onPress={() => navigation.navigate('VisitDetails', { visitId: v.id })}
                >
                  <Text style={s.viewBtnText}>VIEW</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>🔧</Text>
            <Text style={s.emptyTitle}>Нет истории визитов</Text>
            <Text style={s.emptySubtext}>
              Вы ещё не посещали наши сервисные центры.
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

  // Integrity card
  integrityCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  integrityRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  integrityRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityPct: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  integrityInfo: {
    flex: 1,
    gap: 4,
  },
  integrityTitle: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  integrityStatus: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  integrityBar: {
    height: 3,
    backgroundColor: colors.surface3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  integrityBarFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  integrityHint: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginTop: 2,
  },

  // Visit card
  visitCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  visitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitInfo: {
    flex: 1,
    gap: 2,
  },
  visitDate: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  visitTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  visitSubtitle: {
    color: colors.textSub,
    fontSize: 12,
  },

  visitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedBadge: {
    backgroundColor: 'rgba(0,188,212,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  viewBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  viewBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
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

  pressed: {
    opacity: 0.65,
  },
});
