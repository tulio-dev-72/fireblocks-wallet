import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, type Vault } from "../api";
import { theme } from "../theme";

export function BalancesScreen() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { vaults } = await api.listVaults();
      setVaults(vaults);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>Can’t reach backend: {error}</Text>}
      <FlatList
        data={vaults}
        keyExtractor={(v) => v.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.accent} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.vaultName}>{item.name}</Text>
              <Text style={styles.vaultId}>#{item.id}</Text>
            </View>
            {item.assets.length === 0 && <Text style={styles.dim}>No assets</Text>}
            {item.assets.map((a) => (
              <View key={a.assetId} style={styles.assetRow}>
                <Text style={styles.assetId}>{a.assetId}</Text>
                <Text style={styles.amount}>{a.available}</Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg },
  card: { backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  vaultName: { color: theme.text, fontSize: 16, fontWeight: "700" },
  vaultId: { color: theme.textDim, fontSize: 13 },
  assetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  assetId: { color: theme.textDim, fontSize: 14 },
  amount: { color: theme.text, fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  dim: { color: theme.textDim },
  error: { color: theme.danger, padding: 16 },
});
