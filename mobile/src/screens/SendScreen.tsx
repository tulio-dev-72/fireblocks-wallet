import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, type TransferResult } from "../api";
import { theme } from "../theme";

const TERMINAL = ["COMPLETED", "FAILED", "REJECTED", "CANCELLED", "BLOCKED"];

function statusColor(status: string) {
  if (status === "COMPLETED") return theme.good;
  if (TERMINAL.includes(status)) return theme.danger;
  return theme.warn;
}

export function SendScreen() {
  const [source, setSource] = useState("0");
  const [dest, setDest] = useState("1");
  const [asset, setAsset] = useState("ETH_TEST5");
  const [amount, setAmount] = useState("0.0001");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function send() {
    setError(null);
    setResult(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const res = await api.createTransfer({
        sourceVaultId: source,
        destVaultId: dest,
        assetId: asset,
        amount,
        note: "Sent from mobile wallet",
        idempotencyKey,
      });
      setResult(res);
      setStatus(res.status);

      // Live status: poll the backend until the transaction reaches a terminal state.
      poll.current = setInterval(async () => {
        try {
          const s = await api.getTransfer(res.txId);
          if (s.status) setStatus(s.status);
          if (s.status && TERMINAL.includes(s.status) && poll.current) {
            clearInterval(poll.current);
            poll.current = null;
          }
        } catch {
          /* keep polling */
        }
      }, 2500);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Field label="From vault" value={source} onChangeText={setSource} keyboardType="number-pad" />
      <Field label="To vault" value={dest} onChangeText={setDest} keyboardType="number-pad" />
      <Field label="Asset" value={asset} onChangeText={setAsset} autoCapitalize="characters" />
      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

      <Pressable style={[styles.button, submitting && { opacity: 0.6 }]} onPress={send} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send</Text>}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.receipt}>
          <Row label="Transaction" value={result.txId} mono />
          <Row label="Status">
            <View style={[styles.badge, { backgroundColor: statusColor(status ?? result.status) }]}>
              <Text style={styles.badgeText}>{status ?? result.status}</Text>
            </View>
          </Row>
          {result.requiresApproval && (
            <Text style={styles.governance}>
              ⚑ Above approval threshold — in production this routes to an approver (segregation of duties).
            </Text>
          )}
          {status && !TERMINAL.includes(status) && (
            <Text style={styles.dim}>Tracking live status…</Text>
          )}
        </View>
      )}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={theme.textDim} {...rest} />
    </View>
  );
}

function Row({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {value ? <Text style={[styles.value, mono && styles.mono]} numberOfLines={1}>{value}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16, gap: 12 },
  field: { gap: 6 },
  label: { color: theme.textDim, fontSize: 13 },
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { color: theme.danger },
  receipt: { backgroundColor: theme.cardAlt, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.border },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  value: { color: theme.text, flexShrink: 1 },
  mono: { fontFamily: "Courier", fontSize: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  governance: { color: theme.warn, fontSize: 13, lineHeight: 18 },
  dim: { color: theme.textDim },
});
