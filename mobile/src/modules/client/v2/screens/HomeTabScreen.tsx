import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, Pressable, Image, Animated, Easing,
  StyleSheet, useWindowDimensions, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useClientData } from '../ClientDataContext';
import { fetchSpbWeather, type WeatherData, type WeatherIcon } from '../../../../shared/api/weather-api';

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

  // Погода — загружается один раз при монтировании
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    fetchSpbWeather().then(setWeather);
  }, []);

  // Геометрия гейджа (Figma: left=109, top=84, w=240, h=234)
  const gaugeSize = sx(240);
  const gaugeL    = sx(109);
  const gaugeT    = sy(84);
  const gaugeCX   = gaugeL + gaugeSize / 2;
  const gaugeCY   = gaugeT + gaugeSize / 2;
  const numSize   = sx(55);

  // Чёрная зона сверху: минимум 42%, но всегда закрывает весь круг пузырьков + отступ
  const topBlack = Math.max(contentH * 0.42, gaugeT + gaugeSize + sy(12));

  // ── Одноразовая count-up анимация бонусного числа ────────────────────────
  // Если bonusBalance = 0 → показываем 0 статично.
  // Если bonusBalance > 0 → один раз анимируем от 0 до N (0.8–1с).
  // При повторном открытии экрана анимация НЕ повторяется.
  const [displayBonus, setDisplayBonus] = useState(0);
  const bonusAnimRef = useRef<{ lastTarget: number; done: boolean }>({ lastTarget: -1, done: false });
  const bonusAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = Number(bonusBalance) || 0;
    const prev   = bonusAnimRef.current;

    if (target === prev.lastTarget) return; // значение не изменилось
    prev.lastTarget = target;

    if (target === 0) {
      setDisplayBonus(0);
      return;
    }

    if (prev.done) {
      // Уже анимировали — просто показать новое значение без анимации
      setDisplayBonus(target);
      return;
    }

    // Первый раз с ненулевым значением — count-up
    prev.done = true;
    bonusAnim.setValue(0);
    const listenerId = bonusAnim.addListener(({ value }) => setDisplayBonus(Math.round(value)));
    Animated.timing(bonusAnim, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      bonusAnim.removeListener(listenerId);
      setDisplayBonus(target);
    });
  }, [bonusBalance]);

  // ── Startup + loop animation ─────────────────────────────────────────────
  // boot (0→1, one-shot): управляет стартовым reveal всех элементов
  // pulse (0→1→0→…, infinite): плавное живое дыхание пузырькового круга
  const boot  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(boot, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Бесшовный loop: одна timing 0→1 за 6000мс, Easing.linear.
      // outputRange симметричный [1.0, 1.018, 1.0] → при сбросе pulse с 1→0
      // scale остаётся 1.0 с обеих сторон → нет прыжка.
      // Easing.linear убирает замедление на концах → нет паузы.
      // Sequence НЕ используется → нет JS-кадра между итерациями.
      Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    });
  }, []);

  // Gauge bubble: fades from 70% to 100% opacity (reveals full brightness)
  const bubbleOpacity = boot.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  // Gauge bubble: startup scale-in (0.95 → 1.0)
  const gaugeScale = boot.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  // Bubble loop: симметричный [1.0→1.018→1.0] за 6с, Easing.linear.
  // pulse=0 → scale=1.0, pulse=1 → scale=1.0: loop-reset невидим.
  // Середина цикла (pulse=0.5) — пик масштаба 1.018 (±1.8%).
  const pulseScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.0, 1.018, 1.0],
  });

  // Cyan glow ring: peaks at 60% of animation, settles lower — "activation pulse"
  const glowOpacity = boot.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0.55, 0.22],
  });

  // Bonus number + "бонусов": delayed fade-in (feels like data loading)
  const dataOpacity = boot.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });

  // Bottom content (gauges, name, buttons): subtle slide-up fade-in
  const contentOpacity = boot.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0, 1],
  });
  const contentTranslateY = boot.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <View style={s.root}>

      {/* ── Фото авто (руль Bentley) — Figma lower section proportions ── */}
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

      {/* ── Сплошной чёрный верх ── */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: topBlack,
        backgroundColor: '#000',
      }} />

      {/* ── MAP ── */}
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

      {/* ── Виджет погоды (правый верхний угол) — рендерится всегда ── */}
      <View style={{ position: 'absolute', top: sy(12), right: sx(18), alignItems: 'flex-end' }}>
        <WeatherWidget weather={weather} sx={sx} F={F} FB={FB} />
      </View>

      {/* ── «0 КМ» ── */}
      <Text style={{
        position: 'absolute',
        top: sy(56), width: SW, textAlign: 'center',
        color: '#fff', fontFamily: F,
        fontSize: sx(13), letterSpacing: 2,
      }}>
        0 КМ
      </Text>

      {/* ── Гейдж (пузыри): startup reveal + бесконечное дыхание ── */}
      {/* Внешний View: startup opacity + startup scale (boot-driven) */}
      <Animated.View style={{
        position: 'absolute',
        left: gaugeL, top: gaugeT,
        width: gaugeSize, height: gaugeSize,
        opacity: bubbleOpacity,
        transform: [{ scale: gaugeScale }],
      }}>
        {/* Внутренний View: loop breathing scale (pulse-driven, ±1.8%) */}
        <Animated.View style={{
          width: gaugeSize, height: gaugeSize,
          transform: [{ scale: pulseScale }],
        }}>
          {/* Clip-View: на iOS overflow:hidden на Image ненадёжен —
              используем отдельный View с borderRadius для надёжной обрезки */}
          <View style={{
            width: gaugeSize, height: gaugeSize,
            borderRadius: gaugeSize / 2,
            overflow: 'hidden',
          }}>
            <Image
              source={ASSETS.gaugeBubble}
              style={{ width: gaugeSize, height: gaugeSize }}
              resizeMode="cover"
            />
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Cyan glow ring — activation pulse around gauge ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: gaugeL - sx(6),
          top: gaugeT - sx(6),
          width: gaugeSize + sx(12),
          height: gaugeSize + sx(12),
          borderRadius: (gaugeSize + sx(12)) / 2,
          borderWidth: 1.5,
          borderColor: '#00BCD4',
          // Static shadow — View opacity drives visibility
          shadowColor: '#00BCD4',
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          elevation: 12,
          opacity: glowOpacity,
        }}
      />

      {/* ── Тёмный овал в центре гейджа ── */}
      <View style={{
        position: 'absolute',
        left: gaugeCX - sx(82),
        top:  gaugeCY - sx(58),
        width: sx(164), height: sx(100),
        borderRadius: sx(50),
        backgroundColor: 'rgba(0,0,0,0.85)',
      }} />

      {/* ── Цифра бонусов (delayed fade-in, count-up один раз) ── */}
      <Animated.Text style={{
        position: 'absolute',
        left: gaugeCX - sx(82),
        top:  gaugeCY - numSize * 0.68,
        width: sx(164), textAlign: 'center',
        fontSize: numSize, lineHeight: numSize,
        color: '#fff', fontFamily: FB,
        fontWeight: fontsReady ? undefined : '700',
        includeFontPadding: false,
        opacity: dataOpacity,
      }}>
        {displayBonus}
      </Animated.Text>

      {/* ── «бонусов» (delayed fade-in) ── */}
      <Animated.Text style={{
        position: 'absolute',
        top: gaugeCY + numSize * 0.42,
        width: SW, textAlign: 'center',
        color: '#fff', fontFamily: F,
        fontSize: sx(13), letterSpacing: 2.5,
        opacity: dataOpacity,
      }}>
        бонусов
      </Animated.Text>

      {/* ── «157 КМ» справа ── */}
      <View style={{
        position: 'absolute',
        top: sy(185), right: sx(18), alignItems: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: sx(17), fontFamily: FB, fontWeight: '700' }}>157</Text>
        <Text style={{ color: '#fff', fontSize: sx(11), fontFamily: F,  letterSpacing: 1 }}>КМ</Text>
      </View>

      {/* ── Тонкие дуги справа от bubble: subtle dashboard decoration ── */}
      {/* Клип-ширина sx(52) << r → видно ~25° дуги сверху и снизу, не полуокружность */}
      {[sx(126), sx(137)].map((r, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: gaugeCX,
            top: gaugeCY - r,
            width: sx(52),
            height: r * 2,
            overflow: 'hidden',
          }}
        >
          <View style={{
            position: 'absolute',
            left: -r,
            top: 0,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            borderWidth: 1,
            borderColor: `rgba(255,255,255,${0.22 - i * 0.08})`,
          }} />
        </View>
      ))}

      {/* ── Нижний блок: датчики, имя, модель, кнопки (slide-up fade) ── */}
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
        opacity: contentOpacity,
        transform: [{ translateY: contentTranslateY }],
      }} pointerEvents="box-none">

        {/* Датчик температуры — игла белая */}
        <Image source={ASSETS.tempGauge} style={{
          position: 'absolute',
          left: sx(18), top: sy(368),
          width: sx(76), height: sx(76),
          tintColor: '#fff',
        }} resizeMode="contain" />

        {/* Имя клиента */}
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

        {/* Модель авто */}
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

        {/* Датчик топлива — игла белая, выровнен по вертикали с tempGauge */}
        <Image source={ASSETS.fuelGauge} style={{
          position: 'absolute',
          right: sx(18), top: sy(368),
          width: sx(76), height: sx(76),
          tintColor: '#fff',
        }} resizeMode="contain" />

        {/* Кнопки навигации — текст + подчёркивание с glow, без рамки */}
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
              width: sx(150), height: sy(59),
              justifyContent: 'center',
              alignItems: 'flex-start',
            }, pressed && s.pressed]}
            onPress={onPress}
          >
            <Text style={{
              color: '#fff', fontFamily: F,
              fontSize: sx(14), textAlign: 'left', lineHeight: 20,
            }}>
              {label}
            </Text>
            {/* Underline — два слоя: ambient halo + яркая core-линия */}
            {/* Слой 1: широкое ambient свечение (полупрозрачный фон + большой shadow) */}
            <View style={{
              height: 4,
              width: sx(120),
              borderRadius: 2,
              backgroundColor: 'rgba(125,172,197,0.30)',
              marginTop: sx(5),
              shadowColor: '#7DACC5',
              shadowOpacity: 1,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            }} />
            {/* Слой 2: яркая тонкая core-линия (overlap на слой 1) */}
            <View style={{
              height: 1.5,
              width: sx(112),
              borderRadius: 1,
              backgroundColor: '#A8D4E8',
              marginTop: -2.75,
              shadowColor: '#7DACC5',
              shadowOpacity: 1,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            }} />
          </Pressable>
        ))}

        {/* FAB: слой 1 — широкий ambient glow (самый нижний) */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: sx(299), top: sy(802),
            width: sx(127), height: sx(127),
            borderRadius: sx(63.5),
            backgroundColor: 'rgba(125,172,197,0.10)',
            shadowColor: '#7DACC5',
            shadowOpacity: 1,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        {/* FAB: слой 2 — outer ring */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: sx(309), top: sy(812),
            width: sx(107), height: sx(107),
            borderRadius: sx(53.5),
            borderWidth: 1,
            borderColor: 'rgba(125,172,197,0.85)',
            shadowColor: '#7DACC5',
            shadowOpacity: 0.80,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        {/* FAB "НАЧАТЬ ЧАТ" — слой 3: кнопка с усиленным glow */}
        <Pressable
          style={({ pressed }) => [{
            position: 'absolute',
            left: sx(318), top: sy(822),
            width: sx(88), height: sx(88),
            borderRadius: sx(44),
            borderWidth: 1.5,
            borderColor: '#7DACC5',
            backgroundColor: 'rgba(0,0,0,0.25)',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#7DACC5',
            shadowOpacity: 1,
            shadowRadius: 36,
            shadowOffset: { width: 0, height: 0 },
            elevation: 12,
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

      </Animated.View>

    </View>
  );
}

// ── Погодный виджет ───────────────────────────────────────────────────────────
function WeatherIconGlyph({ icon, size }: { icon: WeatherIcon; size: number }) {
  const color = '#fff';
  const r = size / 2;

  if (icon === 'sun') {
    // Круг + 8 лучей
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Лучи */}
        {[0, 45, 90, 135].map((angle) => (
          <View key={angle} style={{
            position: 'absolute',
            width: 1.5,
            height: size * 0.38,
            backgroundColor: color,
            borderRadius: 1,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        ))}
        {/* Диск */}
        <View style={{
          width: r,
          height: r,
          borderRadius: r / 2,
          backgroundColor: color,
        }} />
      </View>
    );
  }

  if (icon === 'rain') {
    // Полукруг + 3 капли
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: size * 0.78,
          height: size * 0.42,
          borderRadius: size * 0.3,
          backgroundColor: color,
          marginBottom: size * 0.06,
        }} />
        {[-size * 0.2, 0, size * 0.2].map((offset, i) => (
          <View key={i} style={{
            position: 'absolute',
            bottom: 0,
            left: r + offset - 1,
            width: 2,
            height: size * 0.28,
            backgroundColor: color,
            borderRadius: 1,
            transform: [{ rotate: '-15deg' }],
          }} />
        ))}
      </View>
    );
  }

  if (icon === 'snow') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {[0, 60, 120].map((angle) => (
          <View key={angle} style={{
            position: 'absolute',
            width: 1.5,
            height: size * 0.85,
            backgroundColor: color,
            borderRadius: 1,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        ))}
      </View>
    );
  }

  if (icon === 'storm') {
    // Молния — ломаная линия через 2 прямоугольника
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: size * 0.32,
          height: size * 0.5,
          backgroundColor: color,
          transform: [{ rotate: '20deg' }, { translateX: size * 0.08 }],
          borderRadius: 1,
        }} />
        <View style={{
          width: size * 0.32,
          height: size * 0.5,
          backgroundColor: color,
          marginTop: -size * 0.18,
          transform: [{ rotate: '20deg' }, { translateX: -size * 0.08 }],
          borderRadius: 1,
        }} />
      </View>
    );
  }

  if (icon === 'fog') {
    // 3 горизонтальные полоски
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: size * 0.12 }}>
        {[size * 0.9, size * 0.75, size * 0.55].map((w, i) => (
          <View key={i} style={{
            width: w,
            height: 1.5,
            backgroundColor: color,
            borderRadius: 1,
          }} />
        ))}
      </View>
    );
  }

  // cloud / overcast — облако из 2 View
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.82,
        height: size * 0.5,
        borderRadius: size * 0.25,
        backgroundColor: color,
        marginTop: size * 0.12,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.05,
        left: size * 0.15,
        width: size * 0.42,
        height: size * 0.42,
        borderRadius: size * 0.21,
        backgroundColor: color,
      }} />
    </View>
  );
}

function WeatherWidget({
  weather,
  sx,
  F,
  FB,
}: {
  weather: WeatherData | null;
  sx: (v: number) => number;
  F: string | undefined;
  FB: string | undefined;
}) {
  const iconSize = sx(18);
  const tempText = weather?.temperatureC != null
    ? `${weather.temperatureC > 0 ? '+' : ''}${weather.temperatureC}°C`
    : '—°C';
  const icon = weather?.icon ?? 'cloud';

  const shadow = {
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <WeatherIconGlyph icon={icon} size={iconSize} />
      <Text style={{
        color: '#fff',
        fontFamily: FB,
        fontWeight: '700',
        fontSize: sx(15),
        letterSpacing: 0.5,
        marginLeft: sx(5),
        ...shadow,
      }}>
        {tempText}
      </Text>
    </View>
  );
}

// ── MAP навигационная стрелка ─────────────────────────────────────────────────
// Пропорции взяты из Figma SVG viewBox 30.97 × 26.28:
//  • стебель ~19% ширины (был 10% → выглядел тонкой ниткой)
//  • наконечник ~48% ширины, центр на 31.6% высоты
//  • вертикальный хвост начинается на 43% высоты
function MapArrow({ size }: { size: number }) {
  const H = size;
  const W = H * (30.97 / 26.28);  // aspect ratio из SVG
  const stem = W * 0.19;           // жирный стебель

  const headH       = H * 0.59;
  const headW       = W * 0.48;
  const headCenterY = H * 0.316;
  const bodyTopY    = H * 0.216;
  const bodyLen     = W * 0.52;
  const tailTopY    = H * 0.432;

  return (
    <View style={{ width: W, height: H }}>
      {/* Вертикальный хвост (нижний-левый) */}
      <View style={{
        position: 'absolute', left: 0, top: tailTopY,
        width: stem, height: H - tailTopY,
        backgroundColor: '#fff',
        borderBottomLeftRadius: stem / 2,
        borderBottomRightRadius: stem / 2,
      }} />
      {/* Горизонтальный стебель */}
      <View style={{
        position: 'absolute', left: 0, top: bodyTopY,
        width: bodyLen, height: stem,
        backgroundColor: '#fff',
      }} />
      {/* Вертикальный коннектор (угол L) */}
      <View style={{
        position: 'absolute', left: 0, top: bodyTopY,
        width: stem, height: tailTopY + stem - bodyTopY,
        backgroundColor: '#fff',
      }} />
      {/* Наконечник-треугольник вправо */}
      <View style={{
        position: 'absolute', right: 0,
        top: headCenterY - headH / 2,
        width: 0, height: 0,
        borderTopWidth: headH / 2,
        borderBottomWidth: headH / 2,
        borderLeftWidth: headW,
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
