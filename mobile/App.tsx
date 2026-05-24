import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { BalancesScreen } from "./src/screens/BalancesScreen";
import { SendScreen } from "./src/screens/SendScreen";
import { theme } from "./src/theme";

type Tab = "balances" | "send";

export default function App() {
  const [tab, setTab] = useState<Tab>("balances");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Fireblocks Wallet</Text>
        <Text style={styles.subtitle}>Sandbox · enterprise demo</Text>
      </View>

      <View style={styles.body}>{tab === "balances" ? <BalancesScreen /> : <SendScreen />}</View>

      <View style={styles.tabbar}>
        <TabButton label="Balances" active={tab === "balances"} onPress={() => setTab("balances")} />
        <TabButton label="Send" active={tab === "send"} onPress={() => setTab("send")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  body: { flex: 1 },
  tabbar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: theme.accent },
});
