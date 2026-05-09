import React from 'react';
import {
  View, Text, Pressable, Image,
  StyleSheet, useWindowDimensions, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useClientData } from '../ClientDataContext';

// ─── Ассеты ──────────────────────────────────────────────────────────────────
const ASSETS = {
  bgCar:       require('../../../../../assets/images/bg_car.jpg'),
  gaugeBubble: require('../../../../../assets/images/gauge_bubble.png'),
  tempGauge:   require('../../../../../assets/images/temp_gauge.png'),
  fuelGauge:   require('../../../../../assets/images/fuel_gauge.png'),
} as const;

// Figma baseline: 440 × 956 pt
const FW = 440;
const FH = 956;

export function HomeTabScreen({ navigation }: any) {
  const { width: SW, height: SH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [fontsReady] = useFonts({
    'Mont-Regular': require('../../../../../assets/fonts/Montserrat-Regular.ttf'),
    'Mont-Bold':    require('../../../../../assets/fonts/Montserrat-Bold.ttf'),
  });
  const F  = fontsReady ? 'Mont-Regular' : undefined;
  const FB = fontsReady ? 'Mont-Bold'    : undefined;

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

  // Геометрия гейджа (Figma: left=109, top=84, w=240, h=234)
  const gaugeSize = sx(240);
  const gaugeL    = sx(109);
  const gaugeT    = sy(84);
  const gaugeCX   = gaugeL + gaugeSize / 2;
  const gaugeCY   = gaugeT + gaugeSize / 2;
  const numSize   = sx(55);

  // Верх экрана (до начала фото авто) — 45% высоты
  // Чёрный верх — только до конца гейджа (40% экрана)
  const topBlack = contentH * 0.40;

  return (
    <View style={s.root}>

      {/* ── Фото авто (руль Bentley) — точные пропорции нижней секции Figma.
          Figma lower section: left=-230, top=141, w=927, h=649 в 440×956-фрейме.
          Container aspect (927/649=1.428) ≈ image aspect (2022/1414=1.430) →
          cover показывает почти весь оригинал без сильного кропа. */}
      <Image
        source={ASSETS.bgCar}
        style={{
          position: 'absolute',
          left: sx(-230),
          top: sy(141),
          width: sx(927),
          height: sy(649),
        }}
        resizeMode="cover"
      />

      {/* ── Сплошной чёрный верх (скрывает спидометр/POWER/D) ── */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: topBlack,
        backgroundColor: '#000',
      }} />

      {/* ── MAP → открывает Яндекс.Карты (Центр Radius Service) ── */}
      <Pressable
        style={[s.mapRow, { top: sy(16), left: sx(24) }]}
        onPress={() => Linking.openURL('https://yandex.com/maps/org/centr_radius_service/2364390942/')}
        hitSlop={12}
      >
        <MapArrow size={sx(22)} />
        <Text style={{
          color: '#fff', fontFamily: F,
          fontSize: sx(14), marginLeft: sx(8), letterSpacing: 1.5,
        }}>
          MAP
        </Text>
      </Pressable>

      {/* ── «0 КМ» ── */}
      <Text style={{
        position: 'absolute',
        top: sy(56), width: SW, textAlign: 'center',
        color: '#fff', fontFamily: F,
        fontSize: sx(13), letterSpacing: 2,
      }}>
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

      {/* ── Тёмный овал в центре гейджа — скрывает спидометр KMH ── */}
      <View style={{
        position: 'absolute',
        left: gaugeCX - sx(82),
        top:  gaugeCY - sx(58),
        width: sx(164), height: sx(100),
        borderRadius: sx(50),
        backgroundColor: 'rgba(0,0,0,0.85)',
      }} />

      {/* ── Цифра бонусов ── */}
      <Text style={{
        position: 'absolute',
        left: gaugeCX - sx(82),
        top:  gaugeCY - numSize * 0.68,
        width: sx(164), textAlign: 'center',
        fontSize: numSize, lineHeight: numSize,
        color: '#fff', fontFamily: FB,
        fontWeight: fontsReady ? undefined : '700',
        includeFontPadding: false,
      }}>
        {bonusBalance}
      </Text>

      {/* ── «бонусов» ── */}
      <Text style={{
        position: 'absolute',
        top: gaugeCY + numSize * 0.42,
        width: SW, textAlign: 'center',
        color: '#fff', fontFamily: F,
        fontSize: sx(13), letterSpacing: 2.5,
      }}>
        бонусов
      </Text>

      {/* ── «157 КМ» справа ── */}
      <View style={{
        position: 'absolute',
        top: sy(185), right: sx(18), alignItems: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: sx(17), fontFamily: FB, fontWeight: '700' }}>157</Text>
        <Text style={{ color: '#fff', fontSize: sx(11), fontFamily: F,  letterSpacing: 1 }}>КМ</Text>
      </View>

      {/* ── Датчик температуры ── */}
      <Image source={ASSETS.tempGauge} style={{
        position: 'absolute',
        left: sx(18), top: sy(368),
        width: sx(76), height: sx(76),
      }} resizeMode="contain" />

      {/* ── Имя клиента ── */}
      <Text style={{
        position: 'absolute',
        top: sy(365), width: SW, textAlign: 'center',
        color: '#fff', fontFamily: FB,
        fontWeight: '700', fontSize: sx(16), letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.95)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      }} numberOfLines={1}>
        {clientName}
      </Text>

      {/* ── Модель авто ── */}
      <Text style={{
        position: 'absolute',
        top: sy(388), width: SW, textAlign: 'center',
        color: '#fff', fontFamily: F,
        fontSize: sx(15), letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.95)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      }}>
        БМВ М5
      </Text>

      {/* ── Датчик топлива ── */}
      <Image source={ASSETS.fuelGauge} style={{
        position: 'absolute',
        right: sx(18), top: sy(376),
        width: sx(70), height: sx(46),
      }} resizeMode="contain" />

      {/* ── Кнопки навигации (Figma: rounded rect, border #7dacc5) ── */}
      {([
        ['ЗАПИСАТЬСЯ\nНА РЕМОНТ', () => void ensureBranchesLoaded().then(() => navigation.navigate('Booking')), sy(717)],
        ['ИСТОРИЯ\nРЕМОНТА',     () => void ensureVisitsLoaded().then(() => navigation.navigate('Visits')),    sy(786)],
        ['СИСТЕМА\nКЭШБЕКА',     () => void ensureBonusHistoryLoaded().then(() => navigation.navigate('Cashback')), sy(860)],
      ] as [string, () => void, number][]).map(([label, onPress, top]) => (
        <Pressable
          key={label}
          style={({ pressed }) => [{
            position: 'absolute',
            left: sx(21), top,
            width: sx(135), height: sy(59),
            borderRadius: sx(15),
            borderWidth: 1,
            borderColor: '#7dacc5',
            justifyContent: 'center',
            alignItems: 'center',
          }, pressed && s.pressed]}
          onPress={onPress}
        >
          <Text style={{
            color: '#fff', fontFamily: F,
            fontSize: sx(14), textAlign: 'center', lineHeight: 20,
          }}>
            {label}
          </Text>
        </Pressable>
      ))}

      {/* ── FAB "НАЧАТЬ ЧАТ" (Figma: два концентрических кольца) ── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: sx(309), top: sy(812),
          width: sx(107), height: sx(107),
          borderRadius: sx(53.5),
          borderWidth: 1,
          borderColor: 'rgba(125,172,197,0.55)',
        }}
      />
      <Pressable
        style={({ pressed }) => [{
          position: 'absolute',
          left: sx(318), top: sy(822),
          width: sx(88), height: sx(88),
          borderRadius: sx(44),
          borderWidth: 1.5,
          borderColor: 'rgba(125,172,197,0.85)',
          backgroundColor: 'rgba(0,0,0,0.2)',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#7DACC5',
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 5,
        }, pressed && s.pressed]}
        onPress={() => navigation.navigate('Chat')}
      >
        <Text style={{
          color: '#fff', fontFamily: F,
          fontSize: sx(14), textAlign: 'center', lineHeight: 20,
        }}>
          {'НАЧАТЬ\nЧАТ'}
        </Text>
      </Pressable>

    </View>
  );
}

// ── MAP навигационная стрелка (точная копия Figma SVG Vector 5) ──────────────
function MapArrow({ size }: { size: number }) {
  const w = size;           // ширина ≈ 22px
  const h = size * 0.849;   // высота пропорционально 26.28/30.97
  const arm = w * 0.52;     // длина вертикальной части
  const thick = w * 0.1;    // толщина линии

  return (
    <View style={{ width: w, height: h }}>
      {/* Вертикальная часть (ствол стрелки вверх) */}
      <View style={{
        position: 'absolute',
        left: 0, bottom: 0,
        width: thick, height: arm,
        backgroundColor: '#fff',
        borderTopLeftRadius: thick,
        borderTopRightRadius: thick,
      }} />
      {/* Горизонтальная часть (вправо) */}
      <View style={{
        position: 'absolute',
        left: 0, top: 0,
        width: w * 0.6, height: thick,
        backgroundColor: '#fff',
        borderTopRightRadius: thick / 2,
        borderBottomRightRadius: thick / 2,
      }} />
      {/* Угол (соединение) */}
      <View style={{
        position: 'absolute',
        left: 0, top: 0,
        width: thick, height: thick,
        backgroundColor: '#fff',
      }} />
      {/* Наконечник стрелки → */}
      <View style={{
        position: 'absolute',
        right: 0, top: -w * 0.12,
        width: 0, height: 0,
        borderTopWidth: h * 0.42,
        borderBottomWidth: h * 0.42,
        borderLeftWidth: w * 0.42,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#fff',
      }} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'visible' },
  mapRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: { opacity: 0.6 },
});
