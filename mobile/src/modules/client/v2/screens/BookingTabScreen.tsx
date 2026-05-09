import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { colors } from '../../../../theme/colors';

const PHONE_1 = '+7 931 394 4747';
const PHONE_2 = '+7 931 395 4747';
const VK_URL  = 'https://vk.ru/radius812';
const TG_URL  = 'https://t.me/CentrRadius';
const WEBSITE = 'https://radius47.tilda.ws';

function TelegramLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[s.logoBox, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#2AABEE' }]}>
      {/* Paper plane — horizontal right arrow + diagonal */}
      <View style={{ width: size * 0.52, height: size * 0.08, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '-35deg' }, { translateX: size * 0.02 }, { translateY: -size * 0.02 }] }} />
      <View style={{ width: size * 0.32, height: size * 0.08, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '20deg' }, { translateX: -size * 0.01 }, { translateY: size * 0.1 }] }} />
    </View>
  );
}

function VKLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[s.logoBox, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: '#0077FF' }]}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800', letterSpacing: -0.5 }}>VK</Text>
    </View>
  );
}

export function BookingTabScreen({ navigation }: any) {
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation?.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ЗАПИСАТЬСЯ НА РЕМОНТ</Text>
        <View style={{ width: 36 }} />
      </View>

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Заголовок ── */}
      <View style={s.titleBlock}>
        <Text style={s.subtitle}>Позвоните нам или напишите в мессенджер</Text>
      </View>

      {/* ── Два номера КРУПНО ── */}
      <View style={s.phonesBlock}>
        <Pressable
          style={({ pressed }) => [s.bigPhone, pressed && s.pressed]}
          onPress={() => Linking.openURL(`tel:${PHONE_1.replace(/\s/g, '')}`)}
        >
          <Text style={s.bigPhoneIcon}>📞</Text>
          <Text style={s.bigPhoneNumber}>{PHONE_1}</Text>
          <Text style={s.bigPhoneLabel}>Основной номер</Text>
        </Pressable>

        <View style={s.phoneDivider} />

        <Pressable
          style={({ pressed }) => [s.bigPhone, pressed && s.pressed]}
          onPress={() => Linking.openURL(`tel:${PHONE_2.replace(/\s/g, '')}`)}
        >
          <Text style={s.bigPhoneIcon}>📱</Text>
          <Text style={s.bigPhoneNumber}>{PHONE_2}</Text>
          <Text style={s.bigPhoneLabel}>Диспетчер сервиса</Text>
        </Pressable>
      </View>

      {/* ── Соцсети ── */}
      <Text style={s.sectionLabel}>МЕССЕНДЖЕРЫ И СОЦСЕТИ</Text>
      <View style={s.socialRow}>
        <Pressable
          style={({ pressed }) => [s.socialCard, pressed && s.pressed]}
          onPress={() => Linking.openURL(TG_URL)}
        >
          <TelegramLogo size={44} />
          <Text style={s.socialName}>Telegram</Text>
          <Text style={s.socialHandle}>@CentrRadius</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.socialCard, pressed && s.pressed]}
          onPress={() => Linking.openURL(VK_URL)}
        >
          <VKLogo size={44} />
          <Text style={s.socialName}>ВКонтакте</Text>
          <Text style={s.socialHandle}>radius812</Text>
        </Pressable>
      </View>

      {/* ── Сайт ── */}
      <View style={s.infoBlock}>
        <Pressable
          style={({ pressed }) => [s.infoRow, pressed && s.pressed]}
          onPress={() => Linking.openURL(WEBSITE)}
        >
          <Text style={s.infoIcon}>🌐</Text>
          <View style={s.infoTexts}>
            <Text style={s.infoLabel}>Официальный сайт</Text>
            <Text style={s.infoValue}>radius47.tilda.ws</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 16, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.accent, fontSize: 28, lineHeight: 30, fontWeight: '300' },
  headerTitle: {
    flex: 1,
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },

  logoBox: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

  titleBlock: { paddingHorizontal: 24, marginBottom: 24 },
  subtitle: {
    color: colors.textSub,
    fontSize: 14,
    marginTop: 8,
  },

  // ── Большие телефоны ──
  phonesBlock: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 28,
  },
  bigPhone: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  bigPhoneIcon: { fontSize: 32, marginBottom: 10 },
  bigPhoneNumber: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bigPhoneLabel: {
    color: colors.textDim,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  phoneDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 24,
  },

  // ── Соцсети ──
  sectionLabel: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginHorizontal: 24,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  socialCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
  },
  socialName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  socialHandle: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // ── Почта / сайт ──
  infoBlock: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  infoIcon: { fontSize: 22 },
  infoTexts: { flex: 1 },
  infoLabel: { color: colors.textDim, fontSize: 11, letterSpacing: 1 },
  infoValue: { color: colors.text, fontSize: 14, marginTop: 2, fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  chevron: { color: colors.accent, fontSize: 22 },
  pressed: { opacity: 0.65 },
});
