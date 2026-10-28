import "../global.css";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider } from "@/providers/store";
import { C } from "@/lib/theme";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans: require("../../assets/fonts/DMSans.ttf"),
    Outfit: require("../../assets/fonts/Outfit.ttf"),
  });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.bg },
            animation: "fade",
          }}
        />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
