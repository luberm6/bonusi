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
  ActionSheetIOS,
  Image as RNImage,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useClientData } from '../ClientDataContext';
import { colors } from '../../../../theme/colors';
import { mobileEnv } from '../../../../shared/config/mobile-env';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type PendingFile = {
  uri: string;
  base64: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export function ChatTabScreen({ navigation }: any) {
  const { messages, sendMessage, chatLoading, ensureChatLoaded, session,
    accessToken, activeConversationId, presentToast } = useClientData();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    ensureChatLoaded();
  }, [ensureChatLoaded]);

  const myId = session?.userId;

  // ── Загрузка файла на сервер ──────────────────────────────────────────────
  const uploadFile = async (convId: string, messageId: string, file: PendingFile) => {
    const res = await fetch(`${mobileEnv.apiBaseUrl}/files/upload`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messageId,
        fileName: file.fileName,
        fileType: file.mimeType,
        size: file.size,
        contentBase64: file.base64,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error('files_disabled');
      throw new Error(data.message || 'Ошибка загрузки');
    }
  };

  // ── Отправка сообщения (с вложением или без) ─────────────────────────────
  const handleSend = async () => {
    const msg = text.trim();
    if (!msg && !pendingFile) return;
    if (sending) return;

    setSending(true);
    const fileToSend = pendingFile;
    setText('');
    setPendingFile(null);

    if (fileToSend) {
      // Шаг 1: отправить текстовое сообщение (обязательно нужен текст или вложение)
      // Используем текст пользователя или название файла как placeholder
      const msgText = msg || fileToSend.fileName;
      let convId = activeConversationId;

      try {
        // Ensure conversation exists
        if (!convId) {
          await sendMessage(msgText);
          setSending(false);
          return;
        }

        // Создаём сообщение напрямую, чтобы получить messageId
        const createRes = await fetch(
          `${mobileEnv.apiBaseUrl}/chat/conversations/${encodeURIComponent(convId)}/messages`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ clientMessageId: generateUUID(), text: msgText }),
          }
        );
        if (!createRes.ok) throw new Error('Не удалось отправить сообщение');
        const data = await createRes.json();
        const messageId: string = data?.message?.id;

        if (messageId) {
          try {
            await uploadFile(convId, messageId, fileToSend);
          } catch (e: any) {
            if (e.message === 'files_disabled') {
              presentToast('error', 'Отправка файлов пока недоступна на сервере');
            } else {
              presentToast('error', 'Файл не загружен: ' + e.message);
            }
          }
        }

        // Обновляем список сообщений
        await ensureChatLoaded();
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } catch {
        presentToast('error', 'Сообщение не отправлено');
        setText(msgText);
        setPendingFile(fileToSend);
      }
    } else {
      // Только текст
      const ok = await sendMessage(msg);
      if (ok) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setText(msg);
        Alert.alert('Не удалось отправить', 'Попробуйте ещё раз.', [{ text: 'OK' }]);
      }
    }

    setSending(false);
  };

  // ── Выбор вложения ────────────────────────────────────────────────────────
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.75,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName || `photo_${Date.now()}.jpg`;
      setPendingFile({
        uri: asset.uri,
        base64: asset.base64 ?? '',
        fileName: name,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || (asset.base64 ? Math.round(asset.base64.length * 0.75) : 0),
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = `photo_${Date.now()}.jpg`;
      setPendingFile({
        uri: asset.uri,
        base64: asset.base64 ?? '',
        fileName: name,
        mimeType: 'image/jpeg',
        size: asset.fileSize || (asset.base64 ? Math.round(asset.base64.length * 0.75) : 0),
      });
    }
  };

  const handleAttach = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Отмена', 'Фото из галереи', 'Сделать фото'],
        cancelButtonIndex: 0,
      },
      (idx) => {
        if (idx === 1) pickFromLibrary();
        if (idx === 2) takePhoto();
      }
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
                  {m.text ? (
                    <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>
                      {m.text}
                    </Text>
                  ) : null}
                  {m.attachments?.map((att) =>
                    att.fileType === 'image' ? (
                      <RNImage
                        key={att.id}
                        source={{ uri: att.fileUrl }}
                        style={s.attachmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View key={att.id} style={s.attachmentPdf}>
                        <Text style={s.attachmentPdfIcon}>📄</Text>
                        <Text style={s.attachmentPdfName} numberOfLines={1}>{att.fileName}</Text>
                      </View>
                    )
                  )}
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
      </ScrollView>

      {/* ── Pending file preview ── */}
      {pendingFile ? (
        <View style={s.previewBar}>
          <RNImage source={{ uri: pendingFile.uri }} style={s.previewThumb} resizeMode="cover" />
          <Text style={s.previewName} numberOfLines={1}>{pendingFile.fileName}</Text>
          <Pressable onPress={() => setPendingFile(null)} hitSlop={8} style={s.previewRemove}>
            <Text style={s.previewRemoveText}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ── Composer ── */}
      <View style={s.composer}>
        <Pressable style={s.attachBtn} hitSlop={8} onPress={handleAttach}>
          <Text style={s.attachIcon}>📎</Text>
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
          style={[s.sendBtn, (!text.trim() && !pendingFile || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={(!text.trim() && !pendingFile) || sending}
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
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.accent, fontSize: 28, lineHeight: 30, fontWeight: '300' },
  headerTitle: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  onlineIndicator: { width: 36, alignItems: 'flex-end', justifyContent: 'center' },
  onlineDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50', shadowOpacity: 0.8, shadowRadius: 4, elevation: 2,
  },

  messageList: { flex: 1 },
  messageListContent: { padding: 16, paddingBottom: 8, gap: 8 },

  bubbleWrap: { marginVertical: 2 },
  bubbleWrapLeft: { alignItems: 'flex-start' },
  bubbleWrapRight: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, paddingBottom: 8 },
  bubbleOther: {
    backgroundColor: colors.surface3, borderRadius: 4,
    borderTopRightRadius: 14, borderBottomRightRadius: 14, borderBottomLeftRadius: 14,
  },
  bubbleMine: {
    backgroundColor: '#1A2830', borderWidth: 1, borderColor: 'rgba(0,188,212,0.2)',
    borderRadius: 14, borderTopRightRadius: 4, borderBottomLeftRadius: 14,
  },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: colors.text },
  bubbleTime: { color: colors.textDim, fontSize: 10, marginTop: 4, textAlign: 'right' },

  attachmentImage: { width: 200, height: 150, borderRadius: 8, marginTop: 4 },
  attachmentPdf: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8,
    padding: 8, marginTop: 4,
  },
  attachmentPdfIcon: { fontSize: 20 },
  attachmentPdfName: { color: colors.text, fontSize: 13, flex: 1 },

  loaderWrap: { paddingTop: 40, alignItems: 'center' },
  loaderText: { color: colors.textDim, fontSize: 13, letterSpacing: 1 },

  emptyWrap: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: colors.textSub, fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  emptySubtext: {
    color: colors.textDim, fontSize: 12, textAlign: 'center',
    paddingHorizontal: 40, lineHeight: 18,
  },

  previewBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  previewThumb: { width: 44, height: 44, borderRadius: 6 },
  previewName: { flex: 1, color: colors.text, fontSize: 13 },
  previewRemove: { padding: 4 },
  previewRemoveText: { color: colors.textDim, fontSize: 16 },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface, gap: 10,
  },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1, backgroundColor: colors.surface3, borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    color: colors.text, fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: colors.textDim },
  sendIcon: { color: '#000000', fontSize: 16, fontWeight: '700' },
});
