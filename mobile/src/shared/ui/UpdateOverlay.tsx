import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { mobileTokens } from "../design/tokens";
import { AppUpdateMetadata } from "../services/UpdateService";

type UpdateOverlayProps = {
  visible: boolean;
  metadata: AppUpdateMetadata;
  onUpdate: () => void;
  onDismiss: () => void;
};

export function UpdateOverlay({ visible, metadata, onUpdate, onDismiss }: UpdateOverlayProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.glassContainer}>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Найдена новая версия!</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{metadata.versionName}</Text>
            </View>
            
            <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesLabel}>Что нового:</Text>
              <Text style={styles.notesText}>{metadata.releaseNotes || "Улучшения и исправления"}</Text>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable 
                style={({ pressed }) => [styles.btnLater, pressed && styles.btnPressed]} 
                onPress={onDismiss}
              >
                <Text style={styles.btnLaterText}>Позже</Text>
              </Pressable>
              
              <Pressable 
                style={({ pressed }) => [styles.btnUpdate, pressed && styles.btnPressed]} 
                onPress={onUpdate}
              >
                <Text style={styles.btnUpdateText}>ОБНОВИТЬ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  glassContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 24,
    overflow: "hidden"
  },
  content: {
    alignItems: "center"
  },
  title: {
    color: mobileTokens.color.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5
  },
  badge: {
    backgroundColor: mobileTokens.color.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 20
  },
  badgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900"
  },
  notesContainer: {
    maxHeight: 200,
    width: "100%",
    marginBottom: 24,
    paddingHorizontal: 4
  },
  notesLabel: {
    color: mobileTokens.color.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1
  },
  notesText: {
    color: mobileTokens.color.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%"
  },
  btnLater: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  btnLaterText: {
    color: mobileTokens.color.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  btnUpdate: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: mobileTokens.color.primary
  },
  btnUpdateText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  }
});
