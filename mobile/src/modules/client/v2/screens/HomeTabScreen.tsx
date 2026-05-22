import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, Pressable, Image, Animated, Easing,
  StyleSheet, useWindowDimensions, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// ExpoLinearGradient скомпилирован в нативный бинарник при rebuild --device.
// Используем LinearGradient для настоящего diagonal gradient без круглых артефактов.
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useClientData } from '../ClientDataContext';
import { fetchSpbWeather, type WeatherData, type WeatherIcon } from '../../../../shared/api/weather-api';

// ─── Ассеты ──────────────────────────────────────────────────────────────────
const ASSETS = {
  bgCar:       require('../../../../../assets/images/bg_car.jpg'),
  gaugeBubble: require('../../../../../assets/images/gauge_bubble_static.png'),
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
    'Inter-Regular': require('../../../../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold':    require('../../../../../assets/fonts/Inter-Bold.ttf'),
    'Cormorant-Regular': require('../../../../../assets/fonts/CormorantGaramond_400Regular.ttf'),
    'Cormorant-Bold':    require('../../../../../assets/fonts/CormorantGaramond_700Bold.ttf'),
  });
  const F   = fontsReady ? 'Inter-Regular' : undefined;
  const FB  = fontsReady ? 'Inter-Bold'    : undefined;
  const FC  = fontsReady ? 'Cormorant-Regular' : undefined;
  const FCB = fontsReady ? 'Cormorant-Bold' : undefined;

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

  // Данные автомобиля из профиля
  const carLabel = (() => {
    const brand = me?.carBrand?.trim();
    const model = me?.carModel?.trim();
    if (brand && model) return `${brand} ${model}`.toUpperCase();
    if (brand) return brand.toUpperCase();
    if (model) return model.toUpperCase();
    return 'Автомобиль не указан';
  })();

  const odometerLabel = me?.odometerKm != null
    ? me.odometerKm.toLocaleString('ru-RU')
    : null;

  // Вместо «0 КМ» справа — госномер (если есть), иначе год, иначе ничего
  const sideLabelTop = me?.carPlate
    ? me.carPlate.toUpperCase()
    : me?.carYear
      ? String(me.carYear)
      : null;
  const sideLabelBottom = me?.carPlate
    ? null
    : me?.carYear
      ? 'Г.В.'
      : null;

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

  // ── Count-up анимация бонусного числа ────────────────────────────────────
  const [displayBonus, setDisplayBonus] = useState(0);
  const bonusAnim = useRef(new Animated.Value(0)).current;
  const prevTargetRef = useRef<number | null>(null);

  useEffect(() => {
    const target = Number(bonusBalance) || 0;

    // Всегда вешаем актуальный слушатель
    bonusAnim.removeAllListeners();
    bonusAnim.addListener(({ value }) => {
      setDisplayBonus(Math.round(value));
    });

    if (prevTargetRef.current === null) {
      // Первый рендер компонента
      if (target > 0) {
        // Если данные уже есть (например, из кэша), красиво набегаем с 0
        bonusAnim.setValue(0);
        Animated.timing(bonusAnim, {
          toValue: target,
          duration: 2500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      } else {
        // Иначе просто стоим на 0 (ждем данных сети)
        bonusAnim.setValue(0);
        setDisplayBonus(0);
      }
    } else if (prevTargetRef.current !== target) {
      // Значение изменилось в процессе работы приложения (начисление / сеть загрузила данные)
      Animated.timing(bonusAnim, {
        toValue: target,
        duration: 2500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      if (prevTargetRef.current !== null && target > prevTargetRef.current) {
        pulseAnim.setValue(0);
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]).start();
      }
    }

    prevTargetRef.current = target;

    return () => {
      bonusAnim.removeAllListeners();
    };
  }, [bonusBalance, bonusAnim, pulseAnim]);

  // ── Startup + loop animation ─────────────────────────────────────────────
  // boot (0→1, one-shot): стартовый reveal
  // rippleAnims: 4 волны, каждая scale 0.2→1.08 + opacity 0→1→0
  const boot = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const RIPPLE_N   = 4;
  const RIPPLE_DUR = 6000; // Медленный плавный поток
  const masterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Стартуем boot (проявление элементов)
    Animated.timing(boot, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Бесконечный цикл пузырей запускаем один раз
    Animated.loop(
      Animated.timing(masterAnim, {
        toValue: 1,
        duration: RIPPLE_DUR,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Gauge bubble: fades from 70% to 100% opacity (reveals full brightness)
  const bubbleOpacity = boot.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  // Gauge bubble: startup scale-in (0.95 → 1.0) + pulse bounce on accrual
  const gaugeScale = Animated.add(
    boot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
    }),
    pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.08], // slight pop
    })
  );

  // Cyan glow ring: peaks at 60% of animation, settles lower — "activation pulse" + extra glow on pulse
  const glowOpacity = Animated.add(
    boot.interpolate({
      inputRange: [0, 0.55, 1],
      outputRange: [0, 0.55, 0.22],
    }),
    pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.6], // bright flash on accrual
    })
  );

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
        position: 'absolute', top: -insets.top, left: 0, right: 0,
        height: topBlack + insets.top,
        backgroundColor: '#000',
      }} />

      {/* ── Diagonal ambient plane — LinearGradient ─────────────────────────
          Стоит ПОСЛЕ topBlack → видим поверх чёрного фона.
          start: правый верх (x=1, y=0) → graphite-steel tint
          end:   левый низ  (x=0, y=1) → прозрачный (чёрный фон)
          Никаких кругов или radial shapes — чистый linear diagonal. */}
      <LinearGradient
        colors={[
          'rgba(70,95,120,0.72)',
          'rgba(40,58,78,0.30)',
          'rgba(0,0,0,0.0)',
        ]}
        locations={[0, 0.52, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: -insets.top, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

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

      {/* ── Пробег клиента (верх, центр) — только если есть данные ── */}
      {odometerLabel && (
        <Text style={{
          position: 'absolute',
          top: sy(56), width: SW, textAlign: 'center',
          color: '#fff', fontFamily: F,
          fontSize: sx(13), letterSpacing: 2,
        }}>
          {odometerLabel} КМ
        </Text>
      )}

      {/* ── Гейдж (пузыри): startup reveal + бесконечное дыхание ── */}
      {/* ── Гейдж (пузыри): startup reveal + бесконечный радиальный поток ── */}
      <Animated.View style={{
        position: 'absolute',
        left: gaugeL, top: gaugeT,
        width: gaugeSize, height: gaugeSize,
        opacity: bubbleOpacity,
        transform: [{ scale: gaugeScale }],
      }}>
        {/* Clip-круг: все ripple-волны обрезаются по границе gauge */}
        <View style={{
          width: gaugeSize, height: gaugeSize,
          borderRadius: gaugeSize / 2,
          overflow: 'hidden',
          backgroundColor: '#050a10', // Тёмный фон, чтобы не просвечивала машина
        }}>
          {Array.from({ length: RIPPLE_N }).map((_, i) => {
            const phaseAnim = Animated.modulo(
              Animated.add(masterAnim, i / RIPPLE_N),
              1
            );
            const rippleScale = phaseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 1.15], // Рождается в центре и летит наружу
            });
            // Плавное перекрестное затухание расширяющихся слоёв
            const rippleOpacity = phaseAnim.interpolate({
              inputRange: [0, 0.3, 0.75, 1],
              outputRange: [0, 1, 1, 0],
            });
            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: gaugeSize,
                  height: gaugeSize,
                  borderRadius: gaugeSize / 2,
                  overflow: 'hidden',
                  opacity: rippleOpacity,
                  transform: [{ scale: rippleScale }],
                }}
              >
                <Image
                  source={ASSETS.gaugeBubble}
                  style={{ width: gaugeSize, height: gaugeSize }}
                  resizeMode="cover"
                />
              </Animated.View>
            );
          })}
        </View>
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
          borderColor: '#0A84C6',
          // Static shadow — View opacity drives visibility
          shadowColor: '#0A84C6',
          shadowOpacity: 1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
          elevation: 12,
          opacity: glowOpacity,
        }}
      />

      {/* ── Тёмный овал в центре гейджа ── */}
      {/* gauge_bubble.png содержит «65 KMH» в центре изображения.
          При opacity < 1 они просвечивали под бонусами.
          Полная непрозрачность (#000) полностью скрывает встроенный текст. */}
      <View style={{
        position: 'absolute',
        left: gaugeCX - sx(72),
        top:  gaugeCY - sx(72),
        width: sx(144), height: sx(144),
        borderRadius: sx(72),
        backgroundColor: '#000',
      }} />

      {/* ── Цифра бонусов + «бонусов» — по центру чёрного круга ── */}
      <Animated.View style={{
        position: 'absolute',
        left: gaugeCX - sx(72),
        top:  gaugeCY - sx(72),
        width: sx(144), height: sx(144),
        justifyContent: 'center', alignItems: 'center',
        opacity: dataOpacity,
      }}>
        <Animated.Text style={{
          fontSize: numSize + sx(10), lineHeight: numSize + sx(10),
          color: '#fff', fontFamily: FCB,
          includeFontPadding: false,
          textAlign: 'center',
        }}>
          {displayBonus}
        </Animated.Text>
        <Text style={{
          color: '#fff', fontFamily: F,
          fontSize: sx(15), letterSpacing: 2.0,
          textAlign: 'center', marginTop: sx(2),
          textTransform: 'uppercase',
        }}>
          бонусов
        </Text>
      </Animated.View>

      {/* ── Пробег / госномер справа ── */}
      {(odometerLabel || sideLabelTop) && (
        <View style={{
          position: 'absolute',
          top: sy(185), right: sx(18), alignItems: 'center',
        }}>
          {odometerLabel ? (
            <>
              <Text style={{ color: '#fff', fontSize: sx(17), fontFamily: FB, fontWeight: '700' }}>{odometerLabel}</Text>
              <Text style={{ color: '#fff', fontSize: sx(11), fontFamily: F,  letterSpacing: 1 }}>КМ</Text>
            </>
          ) : (
            <>
              <Text style={{ color: '#fff', fontSize: sx(14), fontFamily: FB, fontWeight: '700' }}>{sideLabelTop}</Text>
              {sideLabelBottom && <Text style={{ color: '#fff', fontSize: sx(11), fontFamily: F, letterSpacing: 1 }}>{sideLabelBottom}</Text>}
            </>
          )}
        </View>
      )}

      {/* ── Белая полуокружность справа (укороченная ~1/3 дуги) ── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: gaugeCX,
          top: gaugeCY - sx(95),
          width: sx(132),
          height: sx(190),
          overflow: 'hidden',
        }}
      >
        <View style={{
          position: 'absolute',
          left: -sx(132),
          top: -sx(37),
          width: sx(132) * 2,
          height: sx(132) * 2,
          borderRadius: sx(132),
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.7)',
        }} />
      </View>

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
          color: '#fff', fontFamily: FCB,
          fontSize: sx(24), letterSpacing: 1.5,
          textShadowColor: 'rgba(0,0,0,0.95)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        }} numberOfLines={1}>
          {clientName}
        </Text>

        {/* Модель авто */}
        <Text style={{
          position: 'absolute',
          top: sy(396), width: SW, textAlign: 'center',
          color: '#fff', fontFamily: F,
          fontSize: sx(15), letterSpacing: 1,
          textShadowColor: 'rgba(0,0,0,0.95)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        }}>
          {carLabel}
        </Text>

        {/* Датчик топлива — игла белая, выровнен по вертикали с tempGauge */}
        <Image source={ASSETS.fuelGauge} style={{
          position: 'absolute',
          right: sx(18), top: sy(368),
          width: sx(76), height: sx(76),
          tintColor: '#fff',
        }} resizeMode="contain" />

        {/* Кнопки навигации — текст + underline glow, без рамок */}
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
              width: sx(150), height: sy(64),
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              paddingTop: sy(8),
            }, pressed && s.pressed]}
            onPress={onPress}
          >
            <Text style={{
              color: '#fff', fontFamily: F,
              fontSize: sx(14), textAlign: 'left', lineHeight: 20,
            }}>
              {label}
            </Text>
            {/* Underline: bloom halo + core line, прямо под текстом */}
            <View style={{ marginTop: 5, alignSelf: 'flex-start' }}>
              {/* Bloom halo — абс. позиция, шире и выше core */}
              <View style={{
                position: 'absolute',
                top: -4, left: -3,
                height: 10, width: sx(116),
                borderRadius: 5,
                backgroundColor: 'rgba(10,132,198,0.25)',
              }} />
              {/* Core underline */}
              <View style={{
                height: 1.5, width: sx(110),
                borderRadius: 1,
                backgroundColor: '#0A84C6',
                shadowColor: '#0A84C6',
                shadowOpacity: 1,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 0 },
              }} />
            </View>
          </Pressable>
        ))}

        {/* FAB halo: BORDER-only кольца снаружи кнопки (no fill). */}
        {([
          { off:  8, bw: 1.5, bc: 'rgba(10,132,198,0.70)' },
          { off: 18, bw: 1,   bc: 'rgba(10,132,198,0.40)' },
          { off: 32, bw: 1,   bc: 'rgba(10,132,198,0.20)' },
          { off: 50, bw: 1.5, bc: 'rgba(10,132,198,0.09)' },
        ] as { off: number; bw: number; bc: string }[]).map(({ off, bw, bc }) => (
          <View key={off} pointerEvents="none" style={{
            position: 'absolute',
            left: sx(318 - off),
            top:  sy(822) - sx(off),
            width:  sx(88 + off * 2),
            height: sx(88 + off * 2),
            borderRadius: sx(44 + off),
            borderWidth: bw,
            borderColor: bc,
          }} />
        ))}

        {/* FAB "НАЧАТЬ ЧАТ": усиленный glow */}
        <Pressable
          style={({ pressed }) => [{
            position: 'absolute',
            left: sx(318), top: sy(822),
            width: sx(88), height: sx(88),
            borderRadius: sx(44),
            borderWidth: 2,
            borderColor: '#0A84C6',
            backgroundColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#0A84C6',
            shadowOpacity: 1,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 0 },
            elevation: 14,
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
