import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { C, font, title, typeColors } from "@/lib/theme";

export function T({
  children,
  style,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text {...props} style={[s.text, style]}>
      {children}
    </Text>
  );
}
export function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessible={false}
      aria-hidden
    />
  );
}
export function Button({
  children,
  onPress,
  icon,
  variant = "primary",
  style,
  disabled = false,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  variant?: "primary" | "light" | "outline";
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
}) {
  const light = variant === "light";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "primary"
          ? { backgroundColor: C.green }
          : light
            ? { backgroundColor: C.lime }
            : {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: C.line,
              },
        style,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <T
        style={{
          fontWeight: "700",
          color: variant === "primary" ? "#fff" : C.ink,
        }}
      >
        {children}
      </T>
      {icon && (
        <Icon
          name={icon}
          size={17}
          color={variant === "primary" ? "#fff" : C.ink}
        />
      )}
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
  color = C.ink,
  style,
  testID,
  selected,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  selected?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        style,
        { opacity: pressed ? 0.5 : 1 },
      ]}
    >
      <Icon name={name} color={color} size={20} />
    </Pressable>
  );
}
export function TypeBadge({
  type,
  small = false,
  testID,
}: {
  type: string;
  small?: boolean;
  testID?: string;
}) {
  const c = typeColors[type] ?? typeColors.normal;
  return (
    <View
      testID={testID}
      style={[
        s.badge,
        { backgroundColor: c.bg },
        small && { paddingHorizontal: 7, paddingVertical: 4 },
      ]}
    >
      <Icon
        name={c.icon as React.ComponentProps<typeof Ionicons>["name"]}
        size={small ? 11 : 13}
        color={c.fg}
      />
      <T style={{ color: c.fg, fontSize: small ? 10 : 12, fontWeight: "700" }}>
        {title(type)}
      </T>
    </View>
  );
}
export function Pokeball({
  size = 32,
  color = C.green,
  lineColor = C.bg,
  style,
}: {
  size?: number;
  color?: string;
  lineColor?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          height: size * 0.09,
          width: "100%",
          backgroundColor: lineColor,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: size,
          backgroundColor: lineColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            height: size * 0.18,
            width: size * 0.18,
            borderRadius: size,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const progress = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    let disposed = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (disposed) return;
      if (reduced) progress.setValue(1);
      else
        Animated.timing(progress, {
          toValue: 1,
          duration: 480,
          delay,
          useNativeDriver: Platform.OS !== "web",
          easing: Easing.out(Easing.cubic),
        }).start();
    });
    return () => {
      disposed = true;
      progress.stopAnimation();
    };
  }, [delay, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
export function Float({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const y = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let disposed = false;
    const start = (reduced: boolean) => {
      animation?.stop();
      y.setValue(0);
      if (!reduced && !disposed) {
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(y, {
              toValue: -9,
              duration: 2400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
            Animated.timing(y, {
              toValue: 0,
              duration: 2400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: Platform.OS !== "web",
            }),
          ]),
        );
        animation.start();
      }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(start);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      start,
    );
    return () => {
      disposed = true;
      animation?.stop();
      sub.remove();
    };
  }, [y]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: y }] }]}>
      {children}
    </Animated.View>
  );
}
export function Sheet({
  visible,
  onClose,
  children,
  heading,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heading: string;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={s.sheet}>
          <View style={s.sheetHeader}>
            <T style={s.sheetTitle}>{heading}</T>
            <IconButton testID="dialog-close" name="close" label="Close dialog" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingTop: 4 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Select({
  value,
  options,
  onChange,
  icon = "chevron-down",
  label,
}: {
  value: string;
  options: string[];
  onChange: (index: number) => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={s.select}
      >
        <T style={{ fontSize: 12, fontWeight: "600" }}>{value}</T>
        <Icon name={icon} size={14} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} heading={label}>
        {options.map((option, i) => (
          <Pressable
            key={option}
            onPress={() => {
              onChange(i);
              setOpen(false);
            }}
            style={[s.option, value === option && { backgroundColor: C.soft }]}
          >
            <T>{option}</T>
            {value === option && <Icon name="checkmark" size={18} />}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
export const heading: TextStyle = {
  fontFamily: font.display,
  fontWeight: "600",
  color: C.ink,
};
export const s = StyleSheet.create({
  text: { fontFamily: font.body, color: C.ink, fontSize: 14 },
  button: {
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#12271DB3",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  sheet: {
    backgroundColor: C.bg,
    borderRadius: 24,
    maxWidth: 470,
    width: "100%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 14,
  },
  sheetTitle: { ...heading, fontSize: 25 },
  select: {
    minHeight: 45,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: C.paper,
  },
  option: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
