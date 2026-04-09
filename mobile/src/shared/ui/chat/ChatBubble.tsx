import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { mobileTokens } from "../../design/tokens";

type Props = {
  text: string;
  outgoing: boolean;
  status?: "sending" | "sent" | "failed" | "read";
};

export function ChatBubble(props: Props) {
  return (
    <View style={[styles.wrap, props.outgoing ? styles.outgoingWrap : styles.incomingWrap]}>
      <View style={[styles.bubble, props.outgoing ? styles.outgoing : styles.incoming]}>
        <Text style={[styles.text, props.outgoing ? styles.outgoingText : styles.incomingText]}>{props.text}</Text>
      </View>
      {props.status ? <Text style={styles.status}>{props.status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: "84%",
    marginBottom: 10
  },
  outgoingWrap: {
    alignSelf: "flex-end"
  },
  incomingWrap: {
    alignSelf: "flex-start"
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  outgoing: {
    backgroundColor: mobileTokens.color.primary
  },
  incoming: {
    backgroundColor: mobileTokens.color.glassStrong,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft
  },
  text: {
    fontSize: 15,
    lineHeight: 20
  },
  outgoingText: {
    color: "#F8FAFC"
  },
  incomingText: {
    color: mobileTokens.color.textPrimary
  },
  status: {
    marginTop: 4,
    fontSize: 11,
    color: mobileTokens.color.textSecondary,
    alignSelf: "flex-end"
  }
});
