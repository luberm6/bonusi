import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { mobileTokens } from "../design/tokens";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  animated?: boolean;
};

export function GlassCard(props: Props) {
  const opacity = useRef(new Animated.Value(props.animated ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(props.animated ? 10 : 0)).current;

  useEffect(() => {
    if (!props.animated) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start();
  }, [opacity, props.animated, translateY]);

  return (
    <Animated.View
      style={[
        styles.base,
        props.elevated ? styles.elevated : styles.soft,
        { opacity, transform: [{ translateY }] },
        props.style
      ]}
    >
      {props.children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: mobileTokens.color.glass,
    borderRadius: mobileTokens.radius[20],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: mobileTokens.color.borderSoft
  },
  elevated: {
    ...mobileTokens.shadow.glass
  },
  soft: {
    ...mobileTokens.shadow.soft
  }
});
