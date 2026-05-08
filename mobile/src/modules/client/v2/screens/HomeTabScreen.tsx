import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useClientData } from '../ClientDataContext';

// ─── Ассеты ──────────────────────────────────────────────────────────────────
const ASSETS = {
  bgCar:       require('../../../../../assets/images/bg_water.jpg'),
  gaugeBubble: require('../../../../../assets/images/gauge_bubble.png'),
  tempGauge:   require('../../../../../assets/images/temp_gauge.png'),
  fuelGauge:   require('../../../../../assets/images/fuel_gauge.png'),
  glowButton:  require('../../../../../assets/images/glow_button.png'),
} as const;

// Figma baseline: 440 × 956 pt
const FW = 440;
const FH = 956;

export function HomeTabScreen({ navigation }: any) {
  const { width: SW, height: SH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // useFonts внутри компонента — не блокирует рендер
  const [fontsReady] = useFonts({
    'Mont-Regular': require('../../../../../assets/fonts/Montserrat-Regular.ttf'),
    'Mont-Bold':    require('../../../../../assets/fonts/Montserrat-Bold.ttf'),
  });
  const F  = fontsReady ? 'Mont-Regular' : undefined;
  const FB = fontsReady ? 'Mont-Bold'    : undefined;

  // Реальная высота содержимого (tab bar скрыт, safe area уже вычтена снаружи)
  const contentH = SH - insets.top - insets.bottom;
  const sx = (v: number) => (v * SW) / FW;
  const sy = (v: number) => (v * contentH) / FH;

  const {
    bonusBalance, me,
    ensureBranchesLoaded, ensureVisitsLoaded, ensureBonusHistoryLoaded,
  } = useClientData();

  const clientName =
    me?.fullName?.trim()?.toUpperCase() ||
    me?.email?.toUpperCase() ||
    'КЛИЕНТ';

  // ── Геометрия гейджа (строго по Figma) ──
  const gaugeSize = sx(260);
  const gaugeL    = (SW - gaugeSize) / 2;       // горизонтально центр
  const gaugeT    = sy(84);                       // Figma: top 84
  const gaugeCX   = gaugeL + gaugeSize / 2;
  const gaugeCY   = gaugeT + gaugeSize / 2;       // центр круга
  const numSize   = sx(60);                       // Figma: ~60px число

  // Фото авто начинается с 45% высоты экрана → верх всегда чёрный
  const carPhotoTop = contentH * 0.45;

  return (
    <View style={s.root}>

      {/* Фото авто — якорь снизу, пропорции сохранены.
          Bentley руль внизу изображения всегда виден. */}
      <Image
        source={ASSETS.bgCar}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: SW,
          height: SW * (956 / 440),   // точные пропорции Figma-фрейма 440×956
        }}
        resizeMode="stretch"
      />

      {/* ── Сплошной чёрный фон для верхней зоны (гейдж) ── */}
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: carPhotoTop,
        backgroundColor: '#000000',
      }} />

      {/* ── MAP (стрелка + надпись) ── */}
      <View style={[s.row, { top: sy(24), left: sx(24), gap: sx(8) }]}>
        {/* Треугольная стрелка навигации — без emoji */}
        <View style={s.mapArrowShape} />
        <Text style={[s.text, { fontSize: sx(14), fontFamily: F, letterSpacing: 1.5 }]}>
          MAP
        </Text>
      </View>

      {/* ── «0 КМ» верхний центр ── */}
      <Text style={[s.text, {
        position: 'absolute',
        top: sy(56), width: SW, textAlign: 'center',
        fontSize: sx(13), fontFamily: F, letterSpacing: 2,
      }]}>
        0 КМ
      </Text>

      {/* ── Гейдж (пузыри) ── */}
      <Image
        source={ASSETS.gaugeBubble}
        style={{
          position: 'absolute',
          left: gaugeL, top: gaugeT,
          width: gaugeSize, height: gaugeSize,
          borderRadius: gaugeSize / 2,
          overflow: 'hidden',
        }}
        resizeMode="cover"
      />

      {/* Тёмный овал в центре гейджа — скрывает текст спидометра (KMH и цифры)
          который находится ВНУТРИ картинки gauge_bubble.png */}
      <View style={{
        position: 'absolute',
        left: gaugeCX - sx(88),
        top:  gaugeCY - sx(62),
        width: sx(176),
        height: sx(110),
        borderRadius: sx(55),
        backgroundColor: 'rgba(0,0,0,0.82)',
      }} />

      {/* ── Цифра бонусов — строго по центру гейджа ── */}
      <Text style={{
        position: 'absolute',
        left: gaugeCX - sx(90),
        top:  gaugeCY - numSize * 0.65,
        width: sx(180),
        textAlign: 'center',
        fontSize: numSize,
        lineHeight: numSize,
        color: '#fff',
        fontFamily: FB,
        fontWeight: fontsReady ? undefined : '700',
        includeFontPadding: false,
      }}>
        {bonusBalance}
      </Text>

      {/* ── «бонусов» ── */}
      <Text style={[s.text, {
        position: 'absolute',
        top: gaugeCY + numSize * 0.45,
        width: SW, textAlign: 'center',
        fontSize: sx(14), fontFamily: F, letterSpacing: 3,
      }]}>
        бонусов
      </Text>

      {/* ── «157 КМ» справа ── */}
      <View style={{
        position: 'absolute',
        top: sy(190), right: sx(18), alignItems: 'center',
      }}>
        <Text style={[s.text, { fontSize: sx(17), fontFamily: FB, fontWeight: '700' }]}>157</Text>
        <Text style={[s.text, { fontSize: sx(11), fontFamily: F, letterSpacing: 1 }]}>КМ</Text>
      </View>

      {/* ── Датчик температуры (слева) ── */}
      <Image source={ASSETS.tempGauge} style={{
        position: 'absolute',
        left: sx(20), top: sy(370),
        width: sx(76), height: sx(76),
      }} resizeMode="contain" />

      {/* ── Имя клиента ── */}
      <Text style={[s.text, {
        position: 'absolute',
        top: sy(368), width: SW, textAlign: 'center',
        fontSize: sx(16), fontFamily: FB, fontWeight: '700',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      }]} numberOfLines={1}>
        {clientName}
      </Text>

      {/* ── Модель авто ── */}
      <Text style={[s.text, {
        position: 'absolute',
        top: sy(392), width: SW, textAlign: 'center',
        fontSize: sx(15), fontFamily: F, letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      }]}>
        БМВ М5
      </Text>

      {/* ── Датчик топлива (справа) ── */}
      <Image source={ASSETS.fuelGauge} style={{
        position: 'absolute',
        right: sx(20), top: sy(376),
        width: sx(70), height: sx(46),
      }} resizeMode="contain" />

      {/* ────────── Зона кнопок — якорь к низу ────────── */}
      <View style={[s.btnZone, { paddingBottom: Platform.OS === 'ios' ? 18 : 12 }]}>
        <View style={s.btnOverlay} />

        {/* Три кнопки слева */}
        <View style={s.colLeft}>
          {([
            ['ЗАПИСАТЬСЯ\nНА РЕМОНТ', () => void ensureBranchesLoaded().then(() => navigation.navigate('BookingTab'))],
            ['ИСТОРИЯ\nРЕМОНТА',      () => void ensureVisitsLoaded().then(() => navigation.navigate('VisitsTab'))],
            ['СИСТЕМА\nКЭШБЕКА',       () => void ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback'))],
          ] as [string, () => void][]).map(([label, onPress]) => (
            <Pressable
              key={label}
              style={({ pressed }) => [s.underlineBtn, pressed && s.pressed]}
              onPress={onPress}
            >
              <Text style={{ color: '#fff', fontSize: sx(14), fontFamily: F, textAlign: 'left', lineHeight: 20 }}>
                {label}
              </Text>
              {/* Подчёркивание снизу как в Figma */}
              <View style={s.underline} />
            </Pressable>
          ))}
        </View>

        {/* Круглая кнопка ЧАТ справа */}
        <View style={s.colRight}>
          <Pressable
            style={({ pressed }) => [s.fabBtn, {
              width: sx(108), height: sx(108), borderRadius: sx(54),
            }, pressed && s.pressed]}
            onPress={() => navigation.navigate('ChatTab')}
          >
            <Text style={{ color: '#fff', fontSize: sx(14), fontFamily: F, textAlign: 'center', lineHeight: 20 }}>
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
    backgroundColor: '#000',   // верх всегда чёрный
  },
  row: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
  },
  // Треугольная стрелка MAP (белый треугольник вправо, не emoji)
  mapArrowShape: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  btnZone: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 12,
    minHeight: 240,
  },
  btnOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  colLeft: {
    flex: 1,
    justifyContent: 'space-around',
    gap: 8,
  },
  colRight: {
    width: 124,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Кнопки как в Figma — только текст + подчёркивание снизу
  underlineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  underline: {
    height: 1,
    backgroundColor: 'rgba(0,188,212,0.7)',
    marginTop: 4,
  },
  glowBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.6)',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 12,
    shadowColor: '#00BCD4',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  fabBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(125,172,197,0.9)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    shadowColor: '#7DACC5',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  pressed: { opacity: 0.6 },
});
