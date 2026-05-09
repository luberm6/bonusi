import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';

export function VisitsTabScreen({ navigation }: any) {
  const { visits, visitsLoading, ensureVisitsLoaded,
    repairDocuments, repairDocumentsLoading, ensureRepairDocumentsLoaded } = useClientData();

  React.useEffect(() => {
    ensureVisitsLoaded();
    ensureRepairDocumentsLoaded();
  }, [ensureVisitsLoaded, ensureRepairDocumentsLoaded]);

  const total = visits?.length ?? 0;
  const totalSum = visits?.reduce((acc, v) => acc + (v.finalAmount ?? 0), 0) ?? 0;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ИСТОРИЯ РЕМОНТА</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Сводка */}
        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{total}</Text>
            <Text style={s.summaryLabel}>Заказ-нарядов</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>
              {totalSum > 0 ? `${totalSum.toLocaleString('ru')} ₽` : '—'}
            </Text>
            <Text style={s.summaryLabel}>Общая сумма</Text>
          </View>
        </View>

        {/* Документы из чата (помечены мастером "Сохранить в историю") */}
        {repairDocumentsLoading ? null : repairDocuments && repairDocuments.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>📋 ДОКУМЕНТЫ ИЗ ЧАТА</Text>
            {repairDocuments.map((doc) => (
              <View key={doc.id} style={s.docCard}>
                <Text style={s.docDate}>
                  {new Date(doc.createdAt).toLocaleDateString('ru-RU', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </Text>
                {doc.text ? <Text style={s.docText}>{doc.text}</Text> : null}
                {doc.attachments?.map((att) => (
                  <Text key={att.id} style={s.docAttachment}>📎 {att.fileName}</Text>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {/* Список заказ-нарядов */}
        {visitsLoading ? (
          <View style={s.loaderWrap}>
            <Text style={s.loaderText}>Загрузка заказ-нарядов...</Text>
          </View>
        ) : visits && visits.length > 0 ? (
          visits.map((v, idx) => (
            <Pressable
              key={v.id}
              style={({ pressed }) => [s.orderCard, pressed && s.pressed]}
              onPress={() => navigation.navigate('VisitDetails', { visitId: v.id })}
            >
              {/* Шапка */}
              <View style={s.orderHeader}>
                <View style={s.orderNumWrap}>
                  <Text style={s.orderNumLabel}>ЗАКАЗ-НАРЯД</Text>
                  <Text style={s.orderNum}>#{String(idx + 1).padStart(3, '0')}</Text>
                </View>
                <View style={s.statusBadge}>
                  <Text style={s.statusText}>ВЫПОЛНЕН</Text>
                </View>
              </View>

              {/* Дата */}
              <Text style={s.orderDate}>
                {new Date(v.visitDate).toLocaleDateString('ru-RU', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </Text>

              {/* Название */}
              <Text style={s.orderTitle}>{v.branchName || 'Ремонтные работы'}</Text>

              {/* Услуги */}
              {v.serviceNames && v.serviceNames.length > 0 && (
                <Text style={s.orderServices} numberOfLines={2}>
                  {v.serviceNames.join(' · ')}
                </Text>
              )}

              {/* Сумма */}
              <View style={s.orderFooter}>
                <View>
                  {v.bonusAccrualAmount ? (
                    <Text style={s.bonusLine}>+{v.bonusAccrualAmount} баллов начислено</Text>
                  ) : null}
                </View>
                {v.finalAmount ? (
                  <Text style={s.orderSum}>{v.finalAmount.toLocaleString('ru')} ₽</Text>
                ) : null}
              </View>
            </Pressable>
          ))
        ) : (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>Заказ-нарядов пока нет</Text>
            <Text style={s.emptyDesc}>
              После выполнения ремонта здесь появятся все ваши заказ-наряды
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.accent, fontSize: 28, lineHeight: 30, fontWeight: '300' },
  headerTitle: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48, gap: 12 },

  // Сводка
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,188,212,0.2)',
    flexDirection: 'row', overflow: 'hidden',
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  summaryValue: { color: colors.accent, fontSize: 28, fontWeight: '700' },
  summaryLabel: { color: colors.textDim, fontSize: 11, marginTop: 4, letterSpacing: 1 },
  summaryDivider: { width: 1, backgroundColor: colors.border, marginVertical: 12 },

  // Инфо
  infoCard: {
    backgroundColor: 'rgba(0,188,212,0.06)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,188,212,0.2)',
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 24, marginTop: 2 },
  infoTexts: { flex: 1 },
  infoTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  infoDesc: { color: colors.textSub, fontSize: 12, lineHeight: 18, marginTop: 4 },

  // Карточка заказ-наряда
  orderCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumWrap: {},
  orderNumLabel: { color: colors.textDim, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  orderNum: { color: colors.accent, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  statusBadge: {
    backgroundColor: 'rgba(0,188,212,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { color: colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  orderDate: { color: colors.textDim, fontSize: 11 },
  orderTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  orderServices: { color: colors.textSub, fontSize: 12, lineHeight: 18 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  bonusLine: { color: colors.accent, fontSize: 12 },
  orderSum: { color: colors.text, fontSize: 18, fontWeight: '700' },

  loaderWrap: { paddingTop: 40, alignItems: 'center' },
  loaderText: { color: colors.textDim, fontSize: 13, letterSpacing: 1 },
  emptyWrap: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: colors.textSub, fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: colors.textDim, fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 19 },
  pressed: { opacity: 0.65 },

  sectionLabel: {
    color: colors.textDim, fontSize: 11, letterSpacing: 2,
    fontWeight: '700', marginTop: 4,
  },
  docCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,188,212,0.2)',
    padding: 14, gap: 6,
  },
  docDate: { color: colors.textDim, fontSize: 11 },
  docText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  docAttachment: { color: colors.accent, fontSize: 12 },

  // infoCard removed — now replaced by actual docCards when data exists
  infoCard: { display: 'none' },
  infoIcon: { display: 'none' },
  infoTexts: { display: 'none' },
  infoTitle: { display: 'none' },
  infoDesc: { display: 'none' },
});
