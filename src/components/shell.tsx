import { useWindowWidth } from "@/hooks/use-window-width";
import React from "react";
import Head from "expo-router/head";
import { directory } from "@/lib/api";
import { Link, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { C, font } from "@/lib/theme";
import { useStore } from "@/providers/store";
import { Icon, Pokeball, T } from "./ui";

export function Header() {
  const pathname = usePathname();
  const width = useWindowWidth();
  const mobile = width < 650;
  const { teams } = useStore();
  const pokemon = pathname.startsWith("/pokemon/")
    ? directory.find((p) => String(p.id) === pathname.split("/").pop())
    : null;
  const pageTitle = pokemon
    ? pokemon.name.charAt(0).toUpperCase() +
      pokemon.name.slice(1) +
      " · Pokéfolio"
    : pathname === "/teams"
      ? "My teams · Pokéfolio"
      : pathname === "/type-chart"
        ? "Type chart · Pokéfolio"
        : "Pokéfolio · A world of Pokémon";
  return (
    <>
      {/* Browser metadata only; native Head requires a configured Handoff origin. */}
      {Platform.OS === "web" && (
        <Head>
          <title>{pageTitle}</title>
          <meta name="theme-color" content={C.bg} />
        </Head>
      )}
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View
          style={[
            styles.headerInner,
            mobile && { paddingHorizontal: 20, height: 72 },
          ]}
        >
          <Link href="/" asChild>
            <Pressable accessibilityLabel="Pokéfolio home" style={styles.brand}>
              <Pokeball size={31} />
              <T style={styles.wordmark}>
                pokéfolio
                <T
                  style={{
                    color: "#91A674",
                    fontFamily: font.display,
                    fontSize: 29,
                  }}
                >
                  .
                </T>
              </T>
            </Pressable>
          </Link>
          <View style={[styles.nav, mobile && { gap: 20 }]}>
            {(
              [
                { href: "/", label: "Pokédex", icon: "grid-outline" },
                { href: "/teams", label: "My teams", icon: "people-outline" },
                {
                  href: "/type-chart",
                  label: "Type chart",
                  icon: "pie-chart-outline",
                },
              ] as const
            ).map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/pokemon")
                  : pathname === item.href;
              return (
                <Link href={item.href} key={item.href} asChild>
                  <Pressable
                    testID={"nav-" + (item.href === "/" ? "pokedex" : item.href.slice(1))}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    style={StyleSheet.flatten([
                      styles.navItem,
                      active && styles.navActive,
                    ])}
                  >
                    {mobile ? (
                      <Icon
                        name={item.icon}
                        color={active ? C.green : C.muted}
                        size={22}
                      />
                    ) : (
                      <T
                        style={{
                          fontSize: 13,
                          fontWeight: active ? "700" : "500",
                          color: active ? C.green : "#7D857C",
                        }}
                      >
                        {item.label}
                      </T>
                    )}
                    {item.href === "/teams" && teams.length > 0 && !mobile && (
                      <View style={styles.count}>
                        <T style={{ fontSize: 9, color: C.green }}>
                          {teams.length}
                        </T>
                      </View>
                    )}
                  </Pressable>
                </Link>
              );
            })}
          </View>
          {width > 1000 && (
            <View style={styles.trainer}>
              <View style={styles.statusDot} />
              <T style={{ color: "#7B857B", fontSize: 11 }}>
                A little curiosity goes a long way
              </T>
              <View style={styles.avatar}>
                <Icon name="person-outline" size={17} color={C.green} />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}
export function Footer() {
  const insets = useSafeAreaInsets();
  const width = useWindowWidth();
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(27, insets.bottom + 14) },
        width < 650 && {
          flexDirection: "column",
          gap: 14,
          alignItems: "flex-start",
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <Pokeball size={18} color="#A5ADA0" />
        <T style={{ color: C.muted, fontSize: 11 }}>
          Made for the love of Pokémon.
        </T>
      </View>
      <T style={{ color: C.muted, fontSize: 10 }}>
        Powered by{" "}
        <Link
          href="https://pokeapi.co/"
          style={{ textDecorationLine: "underline" }}
        >
          PokéAPI
        </Link>{" "}
        · Pokémon © Nintendo / Game Freak
      </T>
    </View>
  );
}
export const layout = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  container: {
    width: "100%",
    maxWidth: 1256,
    alignSelf: "center",
    paddingHorizontal: 48,
  },
  mobile: { paddingHorizontal: 20 },
});
const styles = StyleSheet.create({
  header: {
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  headerInner: {
    height: 88,
    paddingHorizontal: 48,
    maxWidth: 1440,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: {
    fontFamily: font.display,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -1.3,
  },
  nav: { flexDirection: "row", gap: 35, height: "100%", alignItems: "center" },
  navItem: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderColor: "transparent",
    paddingTop: 2,
  },
  navActive: { borderBottomColor: C.green },
  count: {
    backgroundColor: "#E4EAD9",
    borderRadius: 10,
    width: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  trainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#86A779",
  },
  avatar: {
    marginLeft: 12,
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: "#E7EBDD",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginTop: 48,
    paddingVertical: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
