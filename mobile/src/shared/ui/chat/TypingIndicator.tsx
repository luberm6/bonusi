import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { mobileTokens } from "../../design/tokens";

export function TypingIndicator() {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (node: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(node, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(node, { toValue: 0.3, duration: 260, useNativeDriver: true })
        ])
      );
    const p1 = pulse(a, 0);
    const p2 = pulse(b, 90);
    const p3 = pulse(c, 180);
    p1.start();
    p2.start();
    p3.start();
    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [a, b, c]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: mobileTokens.color.glassStrong,
    borderWidth: 1,
    borderColor: mobileTokens.color.borderSoft
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: mobileTokens.color.textSecondary
  }
});
