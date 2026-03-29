import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { BranchMapItem } from "../../../shared/types/map";
import { mobileTokens, mobileTypography } from "../../../shared/design/tokens";
import { AppButton } from "../../../shared/ui/AppButton";
import { AppInput } from "../../../shared/ui/AppInput";
import { GlassCard } from "../../../shared/ui/GlassCard";
import { MapLibreMap } from "../../map/ui/MapLibreMap";
import type { BranchFormViewModel } from "./branch-form-view-model";

type Props = {
  viewModel: BranchFormViewModel;
  initialBranch?: BranchMapItem;
  onSaved: (branch: BranchMapItem) => void;
};

export function BranchFormScreen(props: Props) {
  const vm = props.viewModel;
  const [state, setState] = useState(() => vm.fromBranch(props.initialBranch));
  const [error, setError] = useState<string | null>(null);
  const marker = useMemo(
    () => (state.lat !== null && state.lng !== null ? { lat: state.lat, lng: state.lng } : undefined),
    [state.lat, state.lng]
  );

  async function onFindOnMap() {
    try {
      setError(null);
      const geo = await vm.geocodeAddress(state.address);
      setState((s) => ({
        ...s,
        address: geo.normalizedAddress,
        lat: geo.lat,
        lng: geo.lng
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось определить координаты");
    }
  }

  async function onSave() {
    try {
      setError(null);
      const saved = await vm.save(state, props.initialBranch);
      props.onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить филиал");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <GlassCard style={styles.card} elevated animated>
        <Text style={styles.sectionTitle}>Данные филиала</Text>
        <AppInput label="Название" value={state.name} onChangeText={(v) => setState((s) => ({ ...s, name: v }))} />
        <AppInput label="Адрес" value={state.address} onChangeText={(v) => setState((s) => ({ ...s, address: v }))} />
        <AppButton label="Найти на карте" variant="secondary" onPress={onFindOnMap} />
      </GlassCard>

      <GlassCard style={styles.card} elevated>
        <Text style={styles.sectionTitle}>Точка на карте</Text>
        <MapLibreMap
          branches={[]}
          editableMarker={marker}
          onMarkerDragEnd={(coords) => setState((s) => vm.applyManualMarker(s, coords))}
        />
        <Text style={styles.coords}>
          {state.lat !== null && state.lng !== null
            ? `Координаты: ${state.lat.toFixed(6)}, ${state.lng.toFixed(6)}`
            : "Координаты не выбраны"}
        </Text>
      </GlassCard>

      <GlassCard style={styles.card} elevated>
        <Text style={styles.sectionTitle}>Контакты</Text>
        <AppInput label="Телефон" value={state.phone} onChangeText={(v) => setState((s) => ({ ...s, phone: v }))} />
        <AppInput
          label="Описание"
          multiline
          numberOfLines={4}
          style={styles.textarea}
          value={state.description}
          onChangeText={(v) => setState((s) => ({ ...s, description: v }))}
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>Активен</Text>
          <Switch value={state.isActive} onValueChange={(v) => setState((s) => ({ ...s, isActive: v }))} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label="Сохранить филиал" onPress={onSave} />
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mobileTokens.color.background },
  content: { padding: 14, gap: 12 },
  card: { padding: 12, gap: 10 },
  sectionTitle: { ...mobileTypography.headingSm },
  label: { ...mobileTypography.body, fontWeight: "600" },
  textarea: { minHeight: 90, textAlignVertical: "top" as const },
  coords: { ...mobileTypography.caption },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  error: { color: mobileTokens.color.error }
});
