import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { colors } from '../../../../theme/colors';

const PHONE_1 = '+7 931 394 4747';
const PHONE_2 = '+7 931 395 4747';
const VK_URL  = 'https://vk.ru/radius812';
const TG_URL  = 'https://t.me/CentrRadius';
const EMAIL   = 'radius812@mail.ru';        // ← уточни или замени
const WEBSITE = 'https://vk.ru/radius812';  // ← уточни или замени

export function BookingTabScreen() {
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Заголовок ── */}
      <View style={s.titleBlock}>
        <Text style={s.title}>ЗАПИСАТЬСЯ НА РЕМОНТ</Text>
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
          <Text style={s.socialEmoji}>✈️</Text>
          <Text style={s.socialName}>Telegram</Text>
          <Text style={s.socialHandle}>@CentrRadius</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.socialCard, pressed && s.pressed]}
          onPress={() => Linking.openURL(VK_URL)}
        >
          <Text style={s.socialEmoji}>🔵</Text>
          <Text style={s.socialName}>ВКонтакте</Text>
          <Text style={s.socialHandle}>radius812</Text>
        </Pressable>
      </View>

      {/* ── Почта и сайт ── */}
      <View style={s.infoBlock}>
        <Pressable
          style={({ pressed }) => [s.infoRow, pressed && s.pressed]}
          onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
        >
          <Text style={s.infoIcon}>✉️</Text>
          <View style={s.infoTexts}>
            <Text style={s.infoLabel}>Электронная почта</Text>
            <Text style={s.infoValue}>{EMAIL}</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>

        <View style={s.infoDivider} />

        <Pressable
          style={({ pressed }) => [s.infoRow, pressed && s.pressed]}
          onPress={() => Linking.openURL(WEBSITE)}
        >
          <Text style={s.infoIcon}>🌐</Text>
          <View style={s.infoTexts}>
            <Text style={s.infoLabel}>Официальный сайт</Text>
            <Text style={s.infoValue}>vk.ru/radius812</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 60, paddingBottom: 48 },

  titleBlock: { paddingHorizontal: 24, marginBottom: 32 },
  title: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
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
  socialEmoji: { fontSize: 32 },
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
