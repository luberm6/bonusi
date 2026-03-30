import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTokens, mobileTypography } from "../../shared/design/tokens";
import { AppButton } from "../../shared/ui/AppButton";
import { GlassCard } from "../../shared/ui/GlassCard";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class MobileShellBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[mobile] shell boundary", error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <GlassCard elevated animated style={styles.card}>
            <Text style={styles.title}>Не удалось открыть приложение</Text>
            <Text style={styles.description}>
              Экран перезапустится без потери основных данных. Если ошибка повторится, закройте и снова откройте приложение.
            </Text>
            <AppButton label="Повторить" onPress={this.handleRetry} haptic="impactLight" />
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileTokens.color.background
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  card: {
    gap: mobileTokens.spacing[16],
    padding: mobileTokens.spacing[24]
  },
  title: {
    ...mobileTypography.headingLg
  },
  description: {
    ...mobileTypography.bodySecondary,
    lineHeight: 22
  }
});
