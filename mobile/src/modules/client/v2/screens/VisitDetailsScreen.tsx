import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { colors } from '../../../../theme/colors';
import { useClientData } from '../ClientDataContext';

export function VisitDetailsScreen({ route, navigation }: any) {
  const { visits, repairDocuments } = useClientData();
  const visitId = route.params?.visitId;
  const visit = visits?.find(v => v.id === visitId);

  if (!visit) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
            <Text style={s.backIcon}>‹</Text>
          </Pressable>
          <Text style={s.headerTitle}>ДЕТАЛИ ЗАКАЗА</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.emptyCard}>
          <Text style={s.emptyTitle}>Заказ не найден</Text>
        </View>
      </View>
    );
  }

  const handleOpenAttachment = async (fileUrl?: string) => {
    if (!fileUrl) {
      Alert.alert('Ошибка', 'Ссылка на файл отсутствует.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть этот тип файла.');
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть файл.');
    }
  };

  const visitDateString = new Date(visit.visitDate).toLocaleDateString('ru-RU');
  const relatedDocs = repairDocuments?.filter(doc => 
    new Date(doc.createdAt).toLocaleDateString('ru-RU') === visitDateString
  ) || [];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ДЕТАЛИ ЗАКАЗА</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.orderDate}>
            {new Date(visit.visitDate).toLocaleDateString('ru-RU', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </Text>
          <Text style={s.orderTitle}>{visit.branchName || 'Ремонтные работы'}</Text>
          
          <View style={s.divider} />
          
          <Text style={s.sectionTitle}>ОКАЗАННЫЕ УСЛУГИ</Text>
          {visit.serviceNames && visit.serviceNames.length > 0 ? (
            visit.serviceNames.map((svc, i) => (
              <Text key={i} style={s.serviceItem}>• {svc}</Text>
            ))
          ) : (
            <Text style={s.serviceItem}>Нет данных об услугах</Text>
          )}

          <View style={s.divider} />

          <View style={s.footer}>
            <Text style={s.footerLabel}>Итоговая сумма:</Text>
            <Text style={s.orderSum}>{(visit.finalAmount ?? 0).toLocaleString('ru')} ₽</Text>
          </View>
        </View>

        {relatedDocs.map(doc => (
          doc.attachments?.map(att => (
            <Pressable 
              key={att.id} 
              style={({ pressed }) => [s.attachBtn, pressed && s.pressed]}
              onPress={() => handleOpenAttachment(att.fileUrl)}
            >
              <Text style={s.attachBtnText}>Открыть скан заказ-наряда</Text>
              <Text style={s.attachBtnSub}>{att.fileName}</Text>
            </Pressable>
          ))
        ))}

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
  scrollContent: { padding: 16, paddingBottom: 48, gap: 16 },

  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 20, gap: 8,
  },
  orderDate: { color: colors.textDim, fontSize: 13 },
  orderTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  
  sectionTitle: { color: colors.textDim, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  serviceItem: { color: colors.textSub, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  footerLabel: { color: colors.textSub, fontSize: 15 },
  orderSum: { color: colors.text, fontSize: 20, fontWeight: '700' },

  attachBtn: {
    backgroundColor: 'rgba(10,132,198,0.12)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(10,132,198,0.3)',
    padding: 16, alignItems: 'center', justifyContent: 'center',
  },
  attachBtnText: { color: colors.accent, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  attachBtnSub: { color: colors.accent, fontSize: 11, opacity: 0.7 },

  emptyCard: { padding: 32, alignItems: 'center' },
  emptyTitle: { color: colors.textSub, fontSize: 16 },
  
  pressed: { opacity: 0.65 },
});
