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
import { useClientData } from '../ClientDataContext';

// ─── Ассеты из Figma ─────────────────────────────────────────────────────────
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

// Шрифт: Montserrat загружается через @expo-google-fonts/montserrat
// Ключ должен совпадать с именем экспорта из пакета
const FONT      = 'Montserrat_400Regular';
const FONT_BOLD = 'Montserrat_700Bold';

export function HomeTabScreen({ navigation }: any) {
  const { width: SW, height: SH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Реальная высота контента (без статус-бара и индикатора домой)
  // Tab bar скрыт на HomeTab, поэтому вычитаем только safe area
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

  // Геометрия гейджа
  const gaugeSize = sx(260);
  const gaugeL    = (SW - gaugeSize) / 2;   // центрируем горизонтально
  const gaugeT    = sy(72);
  const gaugeCX   = gaugeL + gaugeSize / 2;
  const gaugeCY   = gaugeT + gaugeSize * 0.47;

  const numSize   = sx(54);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ① Фоновое фото — капли воды + автомобиль */}
      <ImageBackground
        source={ASSETS.bgWater}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* ⑥ Тёмный градиент вверху — скрывает «D» и «POWER» с фото */}
      <View style={[s.topOverlay, { height: sy(90) }]} />

      {/* ③④ MAP (стрелка + надпись по-английски, как в Figma) */}
      <View style={[s.mapRow, { top: sy(14), left: sx(20) }]}>
        <Text style={[s.mapArrow, { fontSize: sx(18) }]}>→</Text>
        <Text style={[s.label, { fontSize: sx(14), marginLeft: sx(6), letterSpacing: 1 }]}>
          MAP
        </Text>
      </View>

      {/* «0 КМ» — верх центр */}
      <Text style={[s.label, {
        position: 'absolute',
        top: sy(50),
        width: SW,
        textAlign: 'center',
        fontSize: sx(13),
        letterSpacing: 2,
      }]}>
        0 КМ
      </Text>

      {/* Гейдж (пузыри) */}
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

      {/* ① Цифра бонусов — точно по центру гейджа */}
      <Text
        style={[s.bonusNum, {
          position: 'absolute',
          left: gaugeCX - sx(80),
          top:  gaugeCY - numSize * 0.65,
          width: sx(160),
          fontSize: numSize,
          lineHeight: numSize * 1.1,
        }]}
      >
        {bonusBalance}
      </Text>

      {/* «бонусов» */}
      <Text style={[s.label, {
        position: 'absolute',
        top: gaugeCY + numSize * 0.55,
        width: SW,
        textAlign: 'center',
        fontSize: sx(13),
        letterSpacing: 3,
      }]}>
        бонусов
      </Text>

      {/* «157 КМ» — справа от гейджа */}
      <View style={{
        position: 'absolute',
        top: sy(165),
        right: sx(18),
        alignItems: 'center',
      }}>
        <Text style={[s.labelBold, { fontSize: sx(16) }]}>157</Text>
        <Text style={[s.label,     { fontSize: sx(11), letterSpacing: 1 }]}>КМ</Text>
      </View>

      {/* ⑤ Датчик температуры */}
      <Image source={ASSETS.tempGauge} style={{
        position: 'absolute',
        left: sx(18),
        top:  sy(340),
        width:  sx(76),
        height: sx(76),
      }} resizeMode="contain" />

      {/* ⑤ Имя клиента — ниже гейджа с чётким отступом */}
      <Text style={[s.clientName, {
        position: 'absolute',
        top:  sy(340),
        width: SW,
        fontSize: sx(16),
      }]} numberOfLines={1}>
        {clientName}
      </Text>

      {/* Модель авто */}
      <Text style={[s.label, {
        position: 'absolute',
        top:  sy(364),
        width: SW,
        textAlign: 'center',
        fontSize: sx(16),
        letterSpacing: 1,
      }]}>
        БМВ М5
      </Text>

      {/* ⑤ Датчик топлива */}
      <Image source={ASSETS.fuelGauge} style={{
        position: 'absolute',
        right: sx(18),
        top:   sy(346),
        width:  sx(70),
        height: sx(46),
      }} resizeMode="contain" />

      {/* ─── ② ⑧ Зона кнопок — якорь к низу экрана ─── */}
      <View style={[s.buttonsZone, { height: sy(290) }]}>
        {/* Полупрозрачная подложка */}
        <View style={s.buttonsOverlay} />

        {/* Три кнопки слева */}
        <View style={s.leftCol}>
          <Pressable
            style={({ pressed }) => [s.glowBtn, pressed && s.pressed]}
            onPress={() =>
              void ensureBranchesLoaded().then(() => navigation.navigate('BookingTab'))
            }
          >
            <Image source={ASSETS.glowButton} style={[StyleSheet.absoluteFillObject, s.glowImg]} />
            <Text style={[s.btnText, { fontSize: sx(13) }]}>
              {'ЗАПИСАТЬСЯ\nНА РЕМОНТ'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.glowBtn, pressed && s.pressed]}
            onPress={() =>
              void ensureVisitsLoaded().then(() => navigation.navigate('VisitsTab'))
            }
          >
            <Image source={ASSETS.glowButton} style={[StyleSheet.absoluteFillObject, s.glowImg]} />
            <Text style={[s.btnText, { fontSize: sx(13) }]}>
              {'ИСТОРИЯ\nРЕМОНТА'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.glowBtn, pressed && s.pressed]}
            onPress={() =>
              void ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback'))
            }
          >
            <Image source={ASSETS.glowButton} style={[StyleSheet.absoluteFillObject, s.glowImg]} />
            <Text style={[s.btnText, { fontSize: sx(13) }]}>
              {'СИСТЕМА\nКЭШБЕКА'}
            </Text>
          </Pressable>
        </View>

        {/* Круглая кнопка ЧАТ справа */}
        <View style={s.rightCol}>
          <Pressable
            style={({ pressed }) => [s.fabBtn, {
              width:  sx(108),
              height: sx(108),
              borderRadius: sx(54),
            }, pressed && s.pressed]}
            onPress={() => navigation.navigate('ChatTab')}
          >
            <Text style={[s.btnText, { fontSize: sx(14), letterSpacing: 1 }]}>
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

  // ⑥ Тёмная подложка сверху скрывает текст с фото
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  mapRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapArrow: {
    color: '#fff',
    fontFamily: FONT,
    fontWeight: '700',
  },
  label: {
    color: '#fff',
    fontFamily: FONT,
  },
  labelBold: {
    color: '#fff',
    fontFamily: FONT_BOLD,
  },
  bonusNum: {
    color: '#fff',
    fontFamily: FONT_BOLD,
    textAlign: 'center',
    includeFontPadding: false,
  },
  clientName: {
    color: '#fff',
    fontFamily: FONT_BOLD,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // ② Зона кнопок якорится к низу
  buttonsZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingTop: 12,
  },
  buttonsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },

  leftCol: {
    flex: 1,
    justifyContent: 'space-around',
    gap: 8,
  },
  rightCol: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ⑧ Кнопки с cyan-свечением как в Figma
  glowBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.7)',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 10,
    shadowColor: '#00BCD4',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  glowImg: {
    borderRadius: 14,
  },
  fabBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(125,172,197,0.9)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#7DACC5',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontFamily: FONT,
    textAlign: 'center',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.6,
  },
});
