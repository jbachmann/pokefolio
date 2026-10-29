import { useWindowWidth } from "@/hooks/use-window-width";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { effectiveness } from "@/lib/api";
import { C, font, title, TYPES } from "@/lib/theme";
import { Header, Footer, layout } from "@/components/shell";
import { FadeIn, Icon, T, TypeBadge } from "@/components/ui";

export default function TypeChart() {
  const [selected, setSelected] = useState("grass");
  const width = useWindowWidth();
  const mobile = width < 650;
  const strong = TYPES.filter((t) => effectiveness(selected, [t]) > 1);
  const weak = TYPES.filter((t) => effectiveness(t, [selected]) > 1);
  const immune = TYPES.filter((t) => effectiveness(t, [selected]) === 0);
  return (
    <View style={layout.page}>
      <Header />
      <ScrollView
        contentContainerStyle={[layout.container, mobile && layout.mobile]}
      >
        <View style={{ marginTop: 43, marginBottom: 30 }}>
          <T style={styles.kicker}>A LITTLE KNOWLEDGE GOES A LONG WAY</T>
          <T style={[styles.title, mobile && { fontSize: 36 }]}>
            Find your type of advantage.
          </T>
          <T style={styles.subtitle}>
            Eighteen types. A world of possibilities. Get to know every matchup.
          </T>
        </View>
        <ScrollView
          testID="type-options"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, marginBottom: 22 }}
        >
          {TYPES.map((type) => (
            <Pressable
              testID={"type-select-" + type}
              key={type}
              onPress={() => setSelected(type)}
              accessibilityLabel={"Explore " + type + " matchups"}
              accessibilityState={{ selected: selected === type }}
              style={{
                padding: 4,
                borderWidth: 1,
                borderColor: selected === type ? "#93A87B" : "transparent",
                borderRadius: 10,
              }}
            >
              <TypeBadge type={type} />
            </Pressable>
          ))}
        </ScrollView>
        <FadeIn key={selected}>
          <View style={[styles.summary, mobile && { flexDirection: "column" }]}>
            <View style={{ flex: 0.8 }}>
              <Icon name="sparkles-outline" color="#819967" size={26} />
              <T
                testID="type-summary-name"
                style={{
                  fontFamily: font.display,
                  fontSize: 31,
                  fontWeight: "500",
                  marginTop: 15,
                }}
              >
                {title(selected)}, at a glance.
              </T>
              <T
                style={{
                  color: C.muted,
                  fontSize: 12,
                  lineHeight: 21,
                  marginTop: 9,
                }}
              >
                Every type has its moment to shine. Here’s where {selected}-type
                Pokémon feel most at home.
              </T>
            </View>
            <View style={{ flex: 1, gap: 20 }}>
              <View>
                <T style={styles.smallLabel}>SUPER EFFECTIVE AGAINST · 2×</T>
                <View style={styles.badges}>
                  {strong.length ? (
                    strong.map((t) => <TypeBadge testID={"type-strong-" + t} key={t} type={t} />)
                  ) : (
                    <T style={styles.subtitle}>No super-effective matchups</T>
                  )}
                </View>
              </View>
              <View>
                <T style={styles.smallLabel}>WEAK TO · 2× INCOMING DAMAGE</T>
                <View style={styles.badges}>
                  {weak.length ? (
                    weak.map((t) => <TypeBadge testID={"type-weak-" + t} key={t} type={t} />)
                  ) : (
                    <T style={styles.subtitle}>No type weaknesses</T>
                  )}
                </View>
              </View>
              {!!immune.length && (
                <View>
                  <T style={styles.smallLabel}>IMMUNE TO · 0×</T>
                  <View style={styles.badges}>
                    {immune.map((t) => (
                      <TypeBadge testID={"type-immune-" + t} key={t} type={t} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </FadeIn>
        <View style={styles.chartPanel}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 15,
              marginBottom: 22,
            }}
          >
            <View>
              <T
                style={{
                  fontFamily: font.display,
                  fontSize: 27,
                  fontWeight: "500",
                }}
              >
                The whole picture.
              </T>
              <T style={styles.subtitle}>
                Attacking types down the left. Defending types across the top.
              </T>
            </View>
            <View style={{ flexDirection: "row", gap: 15 }}>
              <T style={{ fontSize: 10, color: "#70945C" }}>2× Strong</T>
              <T style={{ fontSize: 10, color: "#BF856B" }}>½× Resisted</T>
              <T style={{ fontSize: 10, color: "#8F87A1" }}>0× Immune</T>
            </View>
          </View>
          <ScrollView testID="type-matrix" horizontal showsHorizontalScrollIndicator>
            <View style={{ paddingBottom: 10 }}>
              <View style={styles.row}>
                <View style={styles.label}>
                  <Icon name="arrow-forward" size={14} color={C.muted} />
                  <T style={{ fontSize: 8, color: C.muted, marginTop: 6 }}>
                    DEFENDING →
                  </T>
                </View>
                {TYPES.map((t) => (
                  <Pressable
                    testID={"type-heading-" + t}
                    key={t}
                    onPress={() => setSelected(t)}
                    style={styles.cell}
                  >
                    <T
                      style={{
                        fontSize: 8,
                        fontWeight: "600",
                        color: selected === t ? C.green : C.muted,
                        transform: [{ rotate: "-35deg" }],
                        paddingVertical: 15,
                      }}
                    >
                      {title(t)}
                    </T>
                  </Pressable>
                ))}
              </View>
              {TYPES.map((attack) => (
                <View
                  style={[
                    styles.row,
                    attack === selected && { backgroundColor: "#F1F5EB" },
                  ]}
                  key={attack}
                >
                  <Pressable
                    onPress={() => setSelected(attack)}
                    style={styles.label}
                  >
                    <TypeBadge type={attack} small />
                  </Pressable>
                  {TYPES.map((defense) => {
                    const value = effectiveness(attack, [defense]);
                    return (
                      <View style={styles.cell} key={defense}>
                        <View
                          testID={"type-cell-" + attack + "-" + defense}
                          accessible
                          accessibilityLabel={
                            attack +
                            " against " +
                            defense +
                            ": " +
                            value +
                            " times damage"
                          }
                          style={[
                            styles.value,
                            {
                              backgroundColor:
                                value === 2
                                  ? "#E1EDD8"
                                  : value === 0.5
                                    ? "#F4E1D7"
                                    : value === 0
                                      ? "#E8E3EE"
                                      : "#F5F5EF",
                            },
                          ]}
                        >
                          <T
                            style={{
                              fontSize: 9,
                              color:
                                value === 2
                                  ? "#70935C"
                                  : value === 0.5
                                    ? "#B78167"
                                    : value === 0
                                      ? "#8F82A3"
                                      : "#C1C6B8",
                              fontWeight: "600",
                            }}
                          >
                            {value === 1 ? "·" : value === 0.5 ? "½" : value}
                          </T>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
          <T
            style={{
              color: C.muted,
              fontSize: 10,
              marginTop: 15,
              lineHeight: 18,
            }}
          >
            Current-generation type matchups. For dual-type Pokémon, multiply
            both defending-type values. A 0× immunity always takes priority. Tap
            a type to explore.
          </T>
        </View>
        <Footer />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  kicker: {
    color: "#879A75",
    letterSpacing: 1.8,
    fontSize: 9,
    marginBottom: 13,
  },
  title: {
    fontFamily: font.display,
    fontWeight: "500",
    fontSize: 43,
    letterSpacing: -1.1,
  },
  subtitle: { color: C.muted, fontSize: 12, lineHeight: 21, marginTop: 9 },
  summary: {
    backgroundColor: "#EDF0E3",
    borderRadius: 18,
    padding: 32,
    flexDirection: "row",
    gap: 35,
  },
  smallLabel: {
    color: "#859775",
    letterSpacing: 1,
    fontSize: 8,
    fontWeight: "600",
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chartPanel: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    backgroundColor: "#fff",
    padding: 25,
    marginTop: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 39,
    borderBottomWidth: 1,
    borderColor: "#F1F2EC",
  },
  label: { width: 100, alignItems: "flex-start" },
  cell: { width: 48, alignItems: "center", justifyContent: "center" },
  value: {
    width: 33,
    height: 27,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});

export function generateMetadata() {
  return {
    title: "Type chart · Pokéfolio",
    description:
      "Explore all eighteen Pokémon types with an interactive current-generation matchup chart.",
  };
}
