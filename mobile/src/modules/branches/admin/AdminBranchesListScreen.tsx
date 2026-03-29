import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { AppButton } from "../../../shared/ui/AppButton";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import type { AdminBranchesViewModel } from "./admin-branches-view-model";

type Props = {
  viewModel: AdminBranchesViewModel;
  onCreateBranch: () => void;
  onEditBranch: (branch: BranchMapItem) => void;
};

export function AdminBranchesListScreen(props: Props) {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchMapItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await props.viewModel.loadBranches();
        if (!mounted) return;
        setBranches(rows);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Не удалось загрузить филиалы");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [props.viewModel]);

  if (loading) return <ActivityIndicator />;

  return (
    <View style={styles.screen}>
      <AppButton label="Создать филиал" onPress={props.onCreateBranch} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={branches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => props.onEditBranch(item)}>
            <GlassCard style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <StatusBadge status={item.isActive ? "success" : "warning"} label={item.isActive ? "Активен" : "Неактивен"} />
              </View>
              <Text style={styles.meta}>{item.address}</Text>
              <Text style={styles.meta}>
                {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
              </Text>
            </GlassCard>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mobileTokens.color.background, padding: 12, gap: 10 },
  error: { color: mobileTokens.color.error, fontSize: 13 },
  row: {
    padding: 12,
    marginBottom: 8
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  name: { ...mobileTypography.headingSm },
  meta: { ...mobileTypography.bodySecondary, marginTop: 2 }
});
