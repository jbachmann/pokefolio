import { useSyncExternalStore } from "react";
import { Dimensions } from "react-native";

function subscribe(onChange: () => void) {
  const subscription = Dimensions.addEventListener("change", onChange);
  return () => subscription.remove();
}

const getWidth = () => Dimensions.get("window").width;
const getServerWidth = () => 1024;

/** Keep the server and initial browser render identical, then track real resizes. */
export function useWindowWidth() {
  return useSyncExternalStore(subscribe, getWidth, getServerWidth);
}
