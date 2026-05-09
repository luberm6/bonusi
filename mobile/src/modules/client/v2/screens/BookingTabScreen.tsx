import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { colors } from '../../../../theme/colors';

export function BookingTabScreen() {
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.avatarCircle}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
        <Text style={s.headerBrand}>PRECISION</Text>
        <Pressable style={s.bellBtn} hitSlop={8}>
          <Text style={s.bellIcon}>🔔</Text>
        </Pressable>
      </View>

      {/* ── Title ── */}
      <View style={s.titleBlock}>
        <Text style={s.title}>ЗАПИСАТЬСЯ НА РЕМОНТ</Text>
        <Text style={s.subtitle}>Выберите удобный способ связи с мастером</Text>
      </View>

      {/* ── Phone cards ── */}
      <View style={s.section}>
        <Pressable
          style={({ pressed }) => [s.phoneCard, pressed && s.pressed]}
          onPress={() => Linking.openURL('tel:+79313944747')}
        >
          <View style={s.phoneIconWrap}>
            <Text style={{ fontSize: 20 }}>📞</Text>
          </View>
          <View style={s.phoneInfo}>
            <Text style={s.phoneNumber}>+7 931 394 4747</Text>
            <Text style={s.phoneLabel}>ОСНОВНОЙ НОМЕР</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.phoneCard, pressed && s.pressed]}
          onPress={() => Linking.openURL('tel:+79313954747')}
        >
          <View style={s.phoneIconWrap}>
            <Text style={{ fontSize: 20 }}>📱</Text>
          </View>
          <View style={s.phoneInfo}>
            <Text style={s.phoneNumber}>+7 931 395 4747</Text>
            <Text style={s.phoneLabel}>ДИСПЕТЧЕР СЕРВИСА</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      </View>

      {/* ── Соцсети ── */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>МЕССЕНДЖЕРЫ И СОЦСЕТИ</Text>
        <View style={s.messengerGrid}>
          <Pressable
            style={({ pressed }) => [s.messengerCard, pressed && s.pressed]}
            onPress={() => Linking.openURL('https://vk.ru/radius812')}
          >
            <Text style={s.messengerIcon}>🔵</Text>
            <Text style={s.messengerName}>ВКОНТАКТЕ</Text>
            <Text style={s.messengerSub}>vk.ru/radius812</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.messengerCard, pressed && s.pressed]}
            onPress={() => Linking.openURL('tel:+79313944747')}
          >
            <Text style={s.messengerIcon}>✈️</Text>
            <Text style={s.messengerName}>ПОЗВОНИТЬ</Text>
            <Text style={s.messengerSub}>+7 931 394 4747</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
  },
  bellBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },

  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  title: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 0,
  },
  subtitle: {
    color: colors.textSub,
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 0.5,
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12,
  },

  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  phoneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneNumber: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  phoneLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 3,
    fontWeight: '600',
  },
  chevron: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '300',
  },

  messengerGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  messengerCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  messengerIcon: {
    fontSize: 28,
  },
  messengerName: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  messengerSub: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  contactFooter: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  contactIcon: {
    fontSize: 18,
  },
  contactText: {
    color: colors.textSub,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },

  pressed: {
    opacity: 0.65,
  },
});
