import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ImageBackground,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useClientData } from '../ClientDataContext';

// ─── Ассеты ──────────────────────────────────────────────────────────────────
const ASSETS = {
  bgWater:     require('../../../../../assets/images/bg_water.jpg'),
  gaugeBubble: require('../../../../../assets/images/gauge_bubble.png'),
  tempGauge:   require('../../../../../assets/images/temp_gauge.png'),
  fuelGauge:   require('../../../../../assets/images/fuel_gauge.png'),
  glowButton:  require('../../../../../assets/images/glow_button.png'),
} as const;

// Figma baseline: iPhone 16 & 17 Pro Max = 440 × 956 pt
const FW = 440;
const FH = 956;

export function HomeTabScreen({ navigation }: any) {
  const { width: SW, height: SH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Загружаем Montserrat локально — useFonts внутри компонента работает
  // и не блокирует рендер (система покажет пока загружается)
  const [fontsReady] = useFonts({
    'Mont-Regular': require('../../../../../assets/fonts/Montserrat-Regular.ttf'),
    'Mont-Bold':    require('../../../../../assets/fonts/Montserrat-Bold.ttf'),
  });

  const FONT      = fontsReady ? 'Mont-Regular' : undefined;
  const FONT_BOLD = fontsReady ? 'Mont-Bold'    : undefined;

  // Реальная высота контента (tab bar скрыт на этом экране)
  const contentH = SH - insets.top - insets.bottom;

  const sx = (v: number) => (v * SW) / FW;
  const sy = (v: number) => (v * contentH) / FH;

  const {
    bonusBalance,
    me,
    ensureBranchesLoaded,
    ensureVisitsLoaded,
    ensureBonusHistoryLoaded,
  } = useClientData();

  const clientName =
    me?.fullName?.trim()?.toUpperCase() ||
    me?.email?.toUpperCase() ||
    'КЛИЕНТ';

  // ── Геометрия гейджа (увеличен до 270 как в Figma) ──
  const gaugeSize = sx(270);
  const gaugeL    = (SW - gaugeSize) / 2;
  const gaugeT    = sy(65);
  const gaugeCX   = gaugeL + gaugeSize / 2;
  const gaugeCY   = gaugeT + gaugeSize * 0.465;
  const numSize   = sx(56);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Фоновое фото */}
      <ImageBackground
        source={ASSETS.bgWater}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* ② Затемнение верхней зоны — скрывает «D» и «POWER» с фото */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        // Покрываем от края View (включая paddingTop зону через negative offset)
        height: insets.top + sy(100),
        backgroundColor: 'rgba(0,0,0,0.72)',
      }} />

      {/* ③ MAP — изогнутая стрелка навигации как в Figma */}
      <View style={[s.mapRow, { top: sy(10), left: sx(18) }]}>
        <Text style={{ color: '#fff', fontSize: sx(20), fontFamily: FONT_BOLD }}>↪</Text>
        <Text style={{ color: '#fff', fontSize: sx(14), fontFamily: FONT, marginLeft: sx(6), letterSpacing: 1.5 }}>
          MAP
        </Text>
      </View>

      {/* «0 КМ» верх центр */}
      <Text style={{
        position: 'absolute',
        top: sy(46),
        width: SW,
        textAlign: 'center',
        color: '#fff',
        fontSize: sx(13),
        fontFamily: FONT,
        letterSpacing: 2,
      }}>
        0 КМ
      </Text>

      {/* ⑤ Гейдж */}
      <Image
        source={ASSETS.gaugeBubble}
        style={{
          position: 'absolute',
          left: gaugeL,
          top:  gaugeT,
          width:  gaugeSize,
          height: gaugeSize,
          borderRadius: gaugeSize / 2,
          overflow: 'hidden',
        }}
        resizeMode="cover"
      />

      {/* ① Цифра бонусов — Montserrat Bold по центру гейджа */}
      <Text style={{
        position: 'absolute',
        left: gaugeCX - sx(90),
        top:  gaugeCY - numSize * 0.65,
        width: sx(180),
        fontSize: numSize,
        lineHeight: numSize * 1.05,
        color: '#fff',
        fontFamily: FONT_BOLD,
        textAlign: 'center',
        includeFontPadding: false,
      }}>
        {bonusBalance}
      </Text>

      {/* «бонусов» */}
      <Text style={{
        position: 'absolute',
        top: gaugeCY + numSize * 0.5,
        width: SW,
        textAlign: 'center',
        color: '#fff',
        fontSize: sx(13),
        fontFamily: FONT,
        letterSpacing: 3,
      }}>
        бонусов
      </Text>

      {/* «157 КМ» справа */}
      <View style={{ position: 'absolute', top: sy(168), right: sx(16), alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: sx(17), fontFamily: FONT_BOLD }}>157</Text>
        <Text style={{ color: '#fff', fontSize: sx(11), fontFamily: FONT, letterSpacing: 1 }}>КМ</Text>
      </View>

      {/* Датчик температуры */}
      <Image source={ASSETS.tempGauge} style={{
        position: 'absolute', left: sx(18), top: sy(340),
        width: sx(76), height: sx(76),
      }} resizeMode="contain" />

      {/* Имя клиента */}
      <Text style={{
        position: 'absolute',
        top: sy(338),
        width: SW,
        textAlign: 'center',
        color: '#fff',
        fontSize: sx(15),
        fontFamily: FONT_BOLD,
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.95)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
      }} numberOfLines={1}>
        {clientName}
      </Text>

      {/* Модель авто */}
      <Text style={{
        position: 'absolute',
        top: sy(360),
        width: SW,
        textAlign: 'center',
        color: '#fff',
        fontSize: sx(15),
        fontFamily: FONT,
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.95)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
      }}>
        БМВ М5
      </Text>

      {/* Датчик топлива */}
      <Image source={ASSETS.fuelGauge} style={{
        position: 'absolute', right: sx(18), top: sy(344),
        width: sx(70), height: sx(46),
      }} resizeMode="contain" />

      {/* ──────── Зона кнопок — якорь к низу ──────── */}
      <View style={[s.buttonsZone, {
        height: sy(295),
        paddingBottom: Platform.OS === 'ios' ? 16 : 10,
      }]}>

        {/* Подложка */}
        <View style={s.buttonsOverlay} />

        {/* Левая колонка — 3 кнопки */}
        <View style={s.leftCol}>
          {[
            { label: 'ЗАПИСАТЬСЯ\nНА РЕМОНТ', onPress: () => void ensureBranchesLoaded().then(() => navigation.navigate('BookingTab')) },
            { label: 'ИСТОРИЯ\nРЕМОНТА',      onPress: () => void ensureVisitsLoaded().then(() => navigation.navigate('VisitsTab')) },
            { label: 'СИСТЕМА\nКЭШБЕКА',       onPress: () => void ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback')) },
          ].map((btn) => (
            <Pressable
              key={btn.label}
              style={({ pressed }) => [s.glowBtn, pressed && s.pressed]}
              onPress={btn.onPress}
            >
              <Image source={ASSETS.glowButton} style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} resizeMode="stretch" />
              <Text style={{ color: '#fff', fontSize: sx(13), fontFamily: FONT, textAlign: 'center', lineHeight: 18 }}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Правая кнопка ЧАТ */}
        <View style={s.rightCol}>
          <Pressable
            style={({ pressed }) => [s.fabBtn, {
              width: sx(110), height: sx(110), borderRadius: sx(55),
            }, pressed && s.pressed]}
            onPress={() => navigation.navigate('ChatTab')}
          >
            <Text style={{ color: '#fff', fontSize: sx(14), fontFamily: FONT, textAlign: 'center', lineHeight: 20 }}>
              {'НАЧАТЬ\nЧАТ'}
            </Text>
          </Pressable>
        </View>
      </View>

    </View>
  );
}

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
  buttonsZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  buttonsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  leftCol: {
    flex: 1,
    justifyContent: 'space-around',
    gap: 8,
  },
  rightCol: {
    width: 128,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.55)',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 11,
    shadowColor: '#00BCD4',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  fabBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(125,172,197,0.85)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    shadowColor: '#7DACC5',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  pressed: { opacity: 0.6 },
});
