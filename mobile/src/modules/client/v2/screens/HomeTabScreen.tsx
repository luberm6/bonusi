import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';

export function HomeTabScreen({ navigation }: any) {
  const {
    me,
    bonusBalance,
    ensureBranchesLoaded,
    ensureVisitsLoaded,
    ensureBonusHistoryLoaded,
  } = useClientData();

  const clientName = me?.fullName?.trim()?.toUpperCase() || me?.email?.toUpperCase() || 'КЛИЕНТ';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable style={s.headerIconBtn} hitSlop={8}>
          <Text style={s.mapIcon}>⊕</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerLabel}>PRECISION LOYALTY</Text>
        </View>
        <View style={s.avatarCircle}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
      </View>

      {/* ── Gauge ── */}
      <View style={s.gaugeWrapper}>
        {/* Outer glow ring */}
        <View style={s.gaugeGlow} />
        <View style={s.gaugeOuter}>
          {/* Corner labels */}
          <Text style={[s.gaugeCornerLabel, s.gaugeLabelLeft]}>0 KM</Text>
          <Text style={[s.gaugeCornerLabel, s.gaugeLabelRight]}>157 KM</Text>

          {/* Arc decoration — two quarter rings via border trick */}
          <View style={s.arcTopLeft} />
          <View style={s.arcTopRight} />

          {/* Center */}
          <View style={s.gaugeCenter}>
            <Text style={s.gaugeValue}>{bonusBalance}</Text>
            <Text style={s.gaugeCaption}>БОНУСОВ</Text>
          </View>
        </View>
      </View>

      {/* ── Identity ── */}
      <View style={s.identityBlock}>
        <Text style={s.identityName}>{clientName}</Text>
        <Text style={s.identitySubtitle}>АВТОСЕРВИС · ПРОГРАММА ЛОЯЛЬНОСТИ</Text>
      </View>

      {/* ── Mini gauges ── */}
      <View style={s.miniGaugeRow}>
        <View style={s.miniGauge}>
          <View style={s.miniGaugeHeader}>
            <Text style={s.miniGaugeLabelInactive}>C</Text>
            <Text style={s.miniGaugeLabelActive}>H</Text>
          </View>
          <View style={s.miniGaugeTrack}>
            <View style={[s.miniGaugeFill, { width: '40%' }]} />
          </View>
          <Text style={s.miniGaugeName}>ТЕМПЕРАТУРА</Text>
        </View>
        <View style={s.miniGauge}>
          <View style={s.miniGaugeHeader}>
            <Text style={s.miniGaugeLabelActive}>E</Text>
            <Text style={s.miniGaugeLabelInactive}>F</Text>
          </View>
          <View style={s.miniGaugeTrack}>
            <View style={[s.miniGaugeFill, { width: '70%' }]} />
          </View>
          <Text style={s.miniGaugeName}>ТОПЛИВО</Text>
        </View>
      </View>

      {/* ── Car circle ── */}
      <View style={s.carCircleWrap}>
        <View style={s.carCircle}>
          <View style={s.carCircleInner}>
            <Text style={{ fontSize: 72 }}>🚗</Text>
          </View>
        </View>
      </View>

      {/* ── Action grid ── */}
      <View style={s.actionGrid}>
        {/* Left: 3 outline buttons */}
        <View style={s.actionCol}>
          <Pressable
            style={({ pressed }) => [s.outlineBtn, pressed && s.pressed]}
            onPress={() =>
              ensureBranchesLoaded().then(() => navigation.navigate('BookingTab'))
            }
          >
            <Text style={s.outlineBtnIcon}>🔧</Text>
            <Text style={s.outlineBtnText}>РЕМОНТ</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.outlineBtn, pressed && s.pressed]}
            onPress={() =>
              ensureVisitsLoaded().then(() => navigation.navigate('VisitsTab'))
            }
          >
            <Text style={s.outlineBtnIcon}>📅</Text>
            <Text style={s.outlineBtnText}>ИСТОРИЯ</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.outlineBtn, pressed && s.pressed]}
            onPress={() =>
              ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback'))
            }
          >
            <Text style={s.outlineBtnIcon}>💳</Text>
            <Text style={s.outlineBtnText}>КЭШБЭК</Text>
          </Pressable>
        </View>

        {/* Right: circle button */}
        <View style={s.actionCircleCol}>
          <Pressable
            style={({ pressed }) => [s.circleBtn, pressed && s.pressed]}
            onPress={() => navigation.navigate('ChatTab')}
          >
            <Text style={{ fontSize: 28 }}>💬</Text>
            <Text style={s.circleBtnText}>{'НАЧАТЬ\nЧАТ'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const GAUGE_SIZE = 240;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIcon: {
    color: colors.accent,
    fontSize: 22,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerLabel: {
    color: colors.textSub,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gauge
  gaugeWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  gaugeGlow: {
    position: 'absolute',
    width: GAUGE_SIZE + 40,
    height: GAUGE_SIZE + 40,
    borderRadius: (GAUGE_SIZE + 40) / 2,
    backgroundColor: 'transparent',
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 0,
  },
  gaugeOuter: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    borderRadius: GAUGE_SIZE / 2,
    backgroundColor: '#0A1520',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gaugeCornerLabel: {
    position: 'absolute',
    top: 16,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },
  gaugeLabelLeft: {
    left: 44,
    color: colors.textDim,
  },
  gaugeLabelRight: {
    right: 28,
    color: colors.accent,
  },
  arcTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: GAUGE_SIZE / 2 + 2,
    height: GAUGE_SIZE / 2 + 2,
    borderTopLeftRadius: GAUGE_SIZE / 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(0,188,212,0.25)',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  arcTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: GAUGE_SIZE / 2 + 2,
    height: GAUGE_SIZE / 2 + 2,
    borderTopRightRadius: GAUGE_SIZE / 2,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.accent,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeValue: {
    color: colors.text,
    fontSize: 52,
    fontWeight: '700',
    lineHeight: 56,
    letterSpacing: -2,
  },
  gaugeCaption: {
    color: colors.textSub,
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 6,
    fontWeight: '600',
  },

  // Identity
  identityBlock: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  identityName: {
    color: colors.text,
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: '700',
  },
  identitySubtitle: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 6,
    fontWeight: '600',
  },

  // Mini gauges
  miniGaugeRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 20,
  },
  miniGauge: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniGaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  miniGaugeLabelActive: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  miniGaugeLabelInactive: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  miniGaugeTrack: {
    height: 3,
    backgroundColor: colors.surface3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniGaugeFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  miniGaugeName: {
    color: colors.textDim,
    fontSize: 8,
    marginTop: 6,
    letterSpacing: 1.5,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Car circle
  carCircleWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  carCircle: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  carCircleInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action grid
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  actionCol: {
    flex: 1,
    gap: 10,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,188,212,0.6)',
    borderRadius: 14,
    backgroundColor: 'transparent',
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: colors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  outlineBtnIcon: {
    fontSize: 16,
  },
  outlineBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  actionCircleCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(0,188,212,0.6)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  circleBtnText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
