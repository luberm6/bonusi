import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ImageBackground,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useClientData } from '../ClientDataContext';

// ─── Ассеты из Figma ─────────────────────────────────────────────────────────
const ASSETS = {
  bgWater:     require('../../../../../assets/images/bg_water.jpg'),
  gaugeBubble: require('../../../../../assets/images/gauge_bubble.png'),
  tempGauge:   require('../../../../../assets/images/temp_gauge.png'),
  fuelGauge:   require('../../../../../assets/images/fuel_gauge.png'),
  glowButton:  require('../../../../../assets/images/glow_button.png'),
} as const;

// Figma baseline (iPhone 16 & 17 Pro Max)
const FW = 440;
const FH = 956;

export function HomeTabScreen({ navigation }: any) {
  const { width: SW, height: SH } = useWindowDimensions();
  const sx = (v: number) => (v * SW) / FW;
  const sy = (v: number) => (v * SH) / FH;

  const {
    bonusBalance,
    me,
    ensureBranchesLoaded,
    ensureVisitsLoaded,
    ensureBonusHistoryLoaded,
  } = useClientData();

  const clientName =
    me?.fullName?.trim()?.toUpperCase() || me?.email?.toUpperCase() || 'КЛИЕНТ';

  // Гейдж — размер и центр
  const gaugeLeft   = sx(99);
  const gaugeTop    = sy(84);
  const gaugeSize   = sx(260);
  const gaugeCenterX = gaugeLeft + gaugeSize / 2;   // центр по X
  const gaugeCenterY = gaugeTop  + gaugeSize * 0.48; // центр по Y (~48% вниз)

  const numFontSize = sx(52);
  const numW        = sx(160);
  const numH        = numFontSize * 1.2;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ minHeight: SH }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* ── Фон ── */}
      <ImageBackground
        source={ASSETS.bgWater}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* ── Верхняя панель: MAP ── */}
      <View style={[s.mapRow, { top: sy(18), left: sx(20) }]}>
        <Text style={[s.mapArrow, { fontSize: sx(20) }]}>↩</Text>
        <Text style={[s.label, { fontSize: sx(14), marginLeft: sx(6) }]}>КАРТА</Text>
      </View>

      {/* ── 0 КМ (верх центр) ── */}
      <Text style={[s.label, {
        position: 'absolute',
        top: sy(56),
        width: SW,
        textAlign: 'center',
        fontSize: sx(13),
        letterSpacing: 1,
      }]}>
        0 КМ
      </Text>

      {/* ── Гейдж (пузыри) ── */}
      <Image
        source={ASSETS.gaugeBubble}
        style={{
          position: 'absolute',
          left: gaugeLeft,
          top:  gaugeTop,
          width:  gaugeSize,
          height: gaugeSize,
          borderRadius: gaugeSize / 2,
          overflow: 'hidden',
        }}
        resizeMode="cover"
      />

      {/* ── Количество бонусов (по центру гейджа) ── */}
      <Text style={[s.bonusNum, {
        position: 'absolute',
        top:  gaugeCenterY - numH / 2 - sx(8),
        left: gaugeCenterX - numW / 2,
        width: numW,
        fontSize: numFontSize,
        lineHeight: numFontSize * 1.1,
      }]}>
        {bonusBalance}
      </Text>

      {/* ── "бонусов" ── */}
      <Text style={[s.label, {
        position: 'absolute',
        top: gaugeCenterY + numH / 2 - sx(4),
        width: SW,
        textAlign: 'center',
        fontSize: sx(13),
        letterSpacing: 2,
      }]}>
        бонусов
      </Text>

      {/* ── 157 КМ (правый край, рядом с дугой) ── */}
      <View style={{
        position: 'absolute',
        top: sy(178),
        right: sx(14),
        alignItems: 'center',
      }}>
        <Text style={[s.label, { fontSize: sx(15), fontWeight: '700' }]}>157</Text>
        <Text style={[s.label, { fontSize: sx(12) }]}>КМ</Text>
      </View>

      {/* ── Датчик температуры ── */}
      <Image source={ASSETS.tempGauge} style={{
        position: 'absolute',
        left: sx(16),
        top:  sy(360),
        width:  sx(78),
        height: sx(78),
      }} resizeMode="contain" />

      {/* ── Имя клиента ── */}
      <Text style={[s.clientName, {
        position: 'absolute',
        top:  sy(350),
        width: SW,
        fontSize: sx(16),
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      }]} numberOfLines={1}>
        {clientName}
      </Text>

      {/* ── Марка авто ── */}
      <Text style={[s.label, {
        position: 'absolute',
        top:  sy(372),
        width: SW,
        textAlign: 'center',
        fontSize: sx(16),
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      }]}>
        БМВ М5
      </Text>

      {/* ── Датчик топлива ── */}
      <Image source={ASSETS.fuelGauge} style={{
        position: 'absolute',
        right: sx(16),
        top:   sy(375),
        width:  sx(72),
        height: sx(48),
      }} resizeMode="contain" />

      {/* ─────────── Кнопки (нижняя зона) ─────────── */}

      {/* Полупрозрачная подложка под кнопками */}
      <View style={{
        position: 'absolute',
        left: 0, right: 0,
        top:  sy(680),
        height: sy(276),
        backgroundColor: 'rgba(0,0,0,0.45)',
      }} />

      {/* ЗАПИСАТЬСЯ НА РЕМОНТ */}
      <Pressable
        style={({ pressed }) => [
          s.glowBtn,
          { left: sx(12), top: sy(692), width: sx(150), height: sy(82) },
          pressed && s.pressed,
        ]}
        onPress={() =>
          void ensureBranchesLoaded().then(() => navigation.navigate('BookingTab'))
        }
      >
        <Image source={ASSETS.glowButton} style={StyleSheet.absoluteFillObject} resizeMode="stretch" />
        <Text style={[s.btnText, { fontSize: sx(13) }]}>{'ЗАПИСАТЬСЯ\nНА РЕМОНТ'}</Text>
      </Pressable>

      {/* ИСТОРИЯ РЕМОНТА */}
      <Pressable
        style={({ pressed }) => [
          s.glowBtn,
          { left: sx(12), top: sy(782), width: sx(150), height: sy(82) },
          pressed && s.pressed,
        ]}
        onPress={() =>
          void ensureVisitsLoaded().then(() => navigation.navigate('VisitsTab'))
        }
      >
        <Image source={ASSETS.glowButton} style={StyleSheet.absoluteFillObject} resizeMode="stretch" />
        <Text style={[s.btnText, { fontSize: sx(13) }]}>{'ИСТОРИЯ\nРЕМОНТА'}</Text>
      </Pressable>

      {/* СИСТЕМА КЭШБЕКА */}
      <Pressable
        style={({ pressed }) => [
          s.glowBtn,
          { left: sx(12), top: sy(872), width: sx(150), height: sy(72) },
          pressed && s.pressed,
        ]}
        onPress={() =>
          void ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback'))
        }
      >
        <Image source={ASSETS.glowButton} style={StyleSheet.absoluteFillObject} resizeMode="stretch" />
        <Text style={[s.btnText, { fontSize: sx(13) }]}>{'СИСТЕМА\nКЭШБЕКА'}</Text>
      </Pressable>

      {/* НАЧАТЬ ЧАТ (круглая кнопка) */}
      <Pressable
        style={({ pressed }) => [
          s.fabBtn,
          {
            right: sx(18),
            top:   sy(770),
            width:  sx(112),
            height: sx(112),
            borderRadius: sx(56),
          },
          pressed && s.pressed,
        ]}
        onPress={() => navigation.navigate('ChatTab')}
      >
        <Text style={[s.btnText, { fontSize: sx(14), letterSpacing: 1 }]}>
          {'НАЧАТЬ\nЧАТ'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const FONT = 'Montserrat-Regular';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapArrow: {
    color: '#fff',
    fontFamily: FONT,
  },
  label: {
    color: '#fff',
    fontFamily: FONT,
  },
  bonusNum: {
    color: '#fff',
    fontFamily: FONT,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clientName: {
    color: '#fff',
    fontFamily: FONT,
    textAlign: 'center',
    fontWeight: '600',
  },
  glowBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.5)',
    borderRadius: 12,
  },
  fabBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(125,172,197,0.9)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    shadowColor: '#7DACC5',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontFamily: FONT,
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.65,
  },
});
