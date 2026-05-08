import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ImageBackground,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useClientData } from '../ClientDataContext';

// ─── Ассеты из Figma (сохранены в assets/images/) ───────────────────────────
const ASSETS = {
  bgWater:    require('../../../../../assets/images/bg_water.jpg'),
  gaugeBubble:require('../../../../../assets/images/gauge_bubble.png'),
  tempGauge:  require('../../../../../assets/images/temp_gauge.png'),
  fuelGauge:  require('../../../../../assets/images/fuel_gauge.png'),
  glowButton: require('../../../../../assets/images/glow_button.png'),
} as const;

// ─── Масштабирование под экран (дизайн: 440 × 956 px) ────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const FW = 440; // Figma design width
const FH = 956; // Figma design height
const sx = (v: number) => (v * SW) / FW;   // горизонтальный масштаб
const sy = (v: number) => (v * SH) / FH;   // вертикальный масштаб

export function HomeTabScreen({ navigation }: any) {
  const {
    bonusBalance,
    me,
    ensureBranchesLoaded,
    ensureVisitsLoaded,
    ensureBonusHistoryLoaded,
  } = useClientData();

  const clientName =
    me?.fullName?.trim()?.toUpperCase() || me?.email?.toUpperCase() || 'КЛИЕНТ';

  return (
    <View style={s.root}>
      {/* ── Фоновое фото (капли воды + автомобиль) ── */}
      <ImageBackground
        source={ASSETS.bgWater}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* ── MAP (стрелка + надпись) ── */}
      <View style={[s.mapRow, { top: sy(16), left: sx(24) }]}>
        {/* SVG стрелки заменяем простым символом */}
        <Text style={[s.mapArrow, { fontSize: sx(22) }]}>↩</Text>
        <Text style={[s.label, { fontSize: sx(14), marginLeft: sx(4) }]}>КАРТА</Text>
      </View>

      {/* ── 0 КМ (верхний центр) ── */}
      <Text
        style={[s.label, {
          position: 'absolute',
          top: sy(58),
          width: SW,
          textAlign: 'center',
          fontSize: sx(14),
        }]}
      >
        0 КМ
      </Text>

      {/* ── Гейдж (пузыри) ── */}
      <Image
        source={ASSETS.gaugeBubble}
        style={{
          position: 'absolute',
          left: sx(99),
          top: sy(84),
          width: sx(260),
          height: sx(254),
          borderRadius: sx(130),
          overflow: 'hidden',
        }}
        resizeMode="cover"
      />

      {/* ── Количество бонусов ── */}
      <Text
        style={[s.bonusNum, {
          position: 'absolute',
          top: sy(160),
          left: sx(155),
          width: sx(140),
          fontSize: sx(52),
        }]}
      >
        {bonusBalance}
      </Text>

      {/* ── "бонусов" ── */}
      <Text
        style={[s.label, {
          position: 'absolute',
          top: sy(218),
          width: SW,
          textAlign: 'center',
          fontSize: sx(14),
        }]}
      >
        бонусов
      </Text>

      {/* ── 157 КМ (правый край) ── */}
      <Text
        style={[s.label, {
          position: 'absolute',
          top: sy(185),
          right: sx(16),
          textAlign: 'center',
          lineHeight: sx(18),
          fontSize: sx(14),
        }]}
      >
        {'157\nКМ'}
      </Text>

      {/* ── Датчик температуры (слева) ── */}
      <Image
        source={ASSETS.tempGauge}
        style={{
          position: 'absolute',
          left: sx(21),
          top: sy(366),
          width: sx(80),
          height: sx(80),
        }}
        resizeMode="contain"
      />

      {/* ── Имя клиента ── */}
      <Text
        style={[s.clientName, {
          position: 'absolute',
          top: sy(354),
          width: SW,
          fontSize: sx(17),
        }]}
        numberOfLines={1}
      >
        {clientName}
      </Text>

      {/* ── Модель авто ── */}
      <Text
        style={[s.label, {
          position: 'absolute',
          top: sy(378),
          width: SW,
          textAlign: 'center',
          fontSize: sx(17),
        }]}
      >
        БМВ М5
      </Text>

      {/* ── Датчик топлива (справа) ── */}
      <Image
        source={ASSETS.fuelGauge}
        style={{
          position: 'absolute',
          right: sx(20),
          top: sy(385),
          width: sx(72),
          height: sx(49),
        }}
        resizeMode="contain"
      />

      {/* ─────────── Кнопки навигации (нижняя зона) ─────────── */}

      {/* ── ЗАПИСАТЬСЯ НА РЕМОНТ ── */}
      <Pressable
        style={({ pressed }) => [
          s.glowBtn,
          { left: sx(15), top: sy(700), width: sx(148), height: sx(148) },
          pressed && s.pressed,
        ]}
        onPress={() =>
          void ensureBranchesLoaded().then(() => navigation.navigate('BookingTab'))
        }
      >
        <Image
          source={ASSETS.glowButton}
          style={StyleSheet.absoluteFillObject}
          resizeMode="stretch"
        />
        <Text style={[s.btnText, { fontSize: sx(15) }]}>
          {'ЗАПИСАТЬСЯ\nНА РЕМОНТ'}
        </Text>
      </Pressable>

      {/* ── ИСТОРИЯ РЕМОНТА ── */}
      <Pressable
        style={({ pressed }) => [
          s.glowBtn,
          { left: sx(15), top: sy(774), width: sx(148), height: sx(148) },
          pressed && s.pressed,
        ]}
        onPress={() =>
          void ensureVisitsLoaded().then(() => navigation.navigate('VisitsTab'))
        }
      >
        <Image
          source={ASSETS.glowButton}
          style={StyleSheet.absoluteFillObject}
          resizeMode="stretch"
        />
        <Text style={[s.btnText, { fontSize: sx(15) }]}>
          {'ИСТОРИЯ\nРЕМОНТА'}
        </Text>
      </Pressable>

      {/* ── СИСТЕМА КЭШБЕКА ── */}
      <Pressable
        style={({ pressed }) => [
          s.glowBtn,
          { left: sx(15), top: sy(848), width: sx(148), height: sx(148) },
          pressed && s.pressed,
        ]}
        onPress={() =>
          void ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback'))
        }
      >
        <Image
          source={ASSETS.glowButton}
          style={StyleSheet.absoluteFillObject}
          resizeMode="stretch"
        />
        <Text style={[s.btnText, { fontSize: sx(15) }]}>
          {'СИСТЕМА\nКЭШБЕКА'}
        </Text>
      </Pressable>

      {/* ── НАЧАТЬ ЧАТ (круглая кнопка) ── */}
      <Pressable
        style={({ pressed }) => [
          s.fabBtn,
          {
            right: sx(20),
            top: sy(815),
            width: sx(107),
            height: sx(107),
            borderRadius: sx(54),
          },
          pressed && s.pressed,
        ]}
        onPress={() => navigation.navigate('ChatTab')}
      >
        <Text style={[s.btnText, { fontSize: sx(15) }]}>
          {'НАЧАТЬ\nЧАТ'}
        </Text>
      </Pressable>
    </View>
  );
}

const MONTSERRAT = 'Montserrat-Regular';

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
    fontFamily: MONTSERRAT,
  },
  label: {
    color: '#fff',
    fontFamily: MONTSERRAT,
  },
  bonusNum: {
    color: '#fff',
    fontFamily: MONTSERRAT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  clientName: {
    color: '#fff',
    fontFamily: MONTSERRAT,
    textAlign: 'center',
    fontWeight: '600',
  },
  glowBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fabBtn: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#7DACC5',
    backgroundColor: 'transparent',
    shadowColor: '#7DACC5',
    shadowOpacity: 0.5,
    shadowRadius: sx(8),
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontFamily: MONTSERRAT,
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
