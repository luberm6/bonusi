import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { styles } from "../styles";
import { useClientData } from "../ClientDataContext";

export function ChatTabScreen({ navigation }: any) {
  const { messages, sendMessage, chatLoading, ensureChatLoaded } = useClientData();
  const [text, setText] = useState("");

  React.useEffect(() => {
    ensureChatLoaded();
  }, [ensureChatLoaded]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const ok = await sendMessage(text.trim());
    if (ok) setText("");
  };

  return (
    <View style={styles.screenWrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>СЛУЖБА ПОДДЕРЖКИ</Text>
      </View>
      <ScrollView style={styles.messagesList} contentContainerStyle={{ paddingBottom: 120 }}>
        {chatLoading && (!messages || messages.length === 0) ? (
          <Text style={styles.loaderText}>Загрузка чата...</Text>
        ) : messages && messages.length > 0 ? (
          messages.map((m) => (
            <View key={m.id} style={[styles.messageBubble, m.senderId ? styles.messageMine : styles.messageOther]}>
              <Text style={styles.messageText}>{m.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyTitle}>Нет сообщений</Text>
        )}
      </ScrollView>
      <View style={styles.chatComposer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Ваше сообщение..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={text}
          onChangeText={setText}
        />
        <Pressable onPress={handleSend} style={styles.sendButton}>
          <Text style={{ fontSize: 24 }}>🚀</Text>
        </Pressable>
      </View>
    </View>
  );
}
