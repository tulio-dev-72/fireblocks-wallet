import { Platform } from "react-native";

// The app ONLY ever talks to our backend — never to Fireblocks directly,
// and it never holds the API secret. That separation is the whole point.
//
// iOS simulator can reach the host via localhost. Android emulator uses
// 10.0.2.2. A physical device (Expo Go) must use your machine's LAN IP —
// set EXPO_PUBLIC_API_BASE_URL to e.g. http://192.168.1.50:4000.
const fallback =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? fallback;
