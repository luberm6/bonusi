import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';

export function ChatTabScreen({ navigation }: any) {
  const { messages, sendMessage, chatLoading, ensureChatLoaded, session } = useClientData();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    ensureChatLoaded();
  }, [ensureChatLoaded]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setText(''); // очищаем сразу для отзывчивости
    const ok = await sendMessage(msg);
    setSending(false);
    if (ok) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } else {
      setText(msg); // возвращаем текст если не отправилось
      Alert.alert(
        'Не удалось отправить',
        'Проверьте подключение к интернету и попробуйте ещё раз.',
        [{ text: 'OK' }],
      );
    }
  };

  const myId = session?.userId;

  // Когда мастер прикрепляет документ — этот диалог показывается клиенту
  // (на стороне клиента — кнопка для запроса документа у мастера)
  const handleAttach = () => {
    Alert.alert(
      'Запрос документа',
      'Вы можете запросить у мастера документ. Укажите тип:',
      [
        {
          text: 'Заказ-наряд',
          onPress: () => {
            sendMessage('[Клиент запрашивает заказ-наряд]');
          },
        },
        {
          text: 'Смета на ремонт',
          onPress: () => {
            sendMessage('[Клиент запрашивает смету]');
          },
        },
        { text: 'Отмена', style: 'cancel' },
      ],
    );
  };

  // Диалог подтверждения сохранения документа в историю ремонта
  // Вызывается когда мастер присылает документ в чат
  const handleDocumentReceived = (messageText: string, messageId: string) => {
    Alert.alert(
      'Сохранить в историю ремонта?',
      `Мастер прислал документ:\n"${messageText}"\n\nСохранить его в Историю ремонта?`,
      [
        {
          text: 'Да, сохранить',
          onPress: () => {
            // TODO: вызов API для сохранения документа в историю
            // await markMessageAsRepairHistory(messageId);
            Alert.alert('Сохранено', 'Документ добавлен в Историю ремонта');
          },
        },
        {
          text: 'Нет (предварительный)',
          style: 'destructive',
          onPress: () => { /* не сохраняем */ },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>ЧАТ С МАСТЕРОМ</Text>
        <View style={s.onlineIndicator}>
          <View style={s.onlineDot} />
          <Text style={s.headerRightMenu}>⋮</Text>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={s.messageList}
        contentContainerStyle={s.messageListContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {chatLoading && (!messages || messages.length === 0) ? (
          <View style={s.loaderWrap}>
            <Text style={s.loaderText}>Загрузка чата...</Text>
          </View>
        ) : messages && messages.length > 0 ? (
          messages.map((m) => {
            const isMine = m.senderId === myId;
            return (
              <View
                key={m.id}
                style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}
              >
                <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
                  <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>
                    {m.text}
                  </Text>
                  <Text style={s.bubbleTime}>
                    {new Date(m.createdAt).toLocaleTimeString('ru', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {isMine && m.readAt ? '  ✓✓' : isMine ? '  ✓' : ''}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyText}>Нет сообщений</Text>
            <Text style={s.emptySubtext}>Напишите мастеру — он ответит в ближайшее время</Text>
          </View>
        )}

        {/* Estimate card */}
        <View style={s.estimateCard}>
          <Text style={s.estimateTitle}>📋 СМЕТА НА РЕМОНТ</Text>
          <Text style={s.estimateSubtitle}>Детальный расчёт стоимости работ</Text>
          <Pressable style={({ pressed }) => [s.estimateBtn, pressed && s.pressed]}>
            <Text style={s.estimateBtnText}>СМОТРЕТЬ СМЕТУ</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Composer ── */}
      <View style={s.composer}>
        <Pressable style={s.attachBtn} hitSlop={8} onPress={handleAttach}>
          <Text style={{ fontSize: 20 }}>📎</Text>
        </Pressable>
        <TextInput
          style={s.input}
          placeholder="Написать сообщение..."
          placeholderTextColor={colors.textDim}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={s.sendIcon}>➤</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.accent,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRightMenu: {
    color: colors.textSub,
    fontSize: 20,
    fontWeight: '700',
  },

  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },

  bubbleWrap: {
    marginVertical: 2,
  },
  bubbleWrapLeft: {
    alignItems: 'flex-start',
  },
  bubbleWrapRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    paddingBottom: 8,
  },
  bubbleOther: {
    backgroundColor: colors.surface3,
    borderRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
  },
  bubbleMine: {
    backgroundColor: '#1A2830',
    borderWidth: 1,
    borderColor: 'rgba(0,188,212,0.2)',
    borderRadius: 14,
    borderTopRightRadius: 4,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: colors.text,
  },
  bubbleTime: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },

  loaderWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textDim,
    fontSize: 13,
    letterSpacing: 1,
  },

  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    color: colors.textSub,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  emptySubtext: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },

  estimateCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  estimateTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  estimateSubtitle: {
    color: colors.textSub,
    fontSize: 12,
  },
  estimateBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,188,212,0.6)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  estimateBtnText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface3,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: colors.textDim,
  },
  sendIcon: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
});
