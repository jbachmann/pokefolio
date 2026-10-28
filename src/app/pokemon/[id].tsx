import { useWindowWidth } from "@/hooks/use-window-width";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { GenerateMetadataFunction } from "expo-router/server";
import { Link, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import {
  api,
  directory,
  effectiveness,
  Evolution,
  EvolutionDetail,
  getPokemon,
  Pokemon,
  pokemonCache,
  Species,
} from "@/lib/api";
import { art, C, font, number, title, typeColors, TYPES } from "@/lib/theme";
import { Header, Footer, layout } from "@/components/shell";
import {
  Button,
  FadeIn,
  Float,
  Icon,
  IconButton,
  Pokeball,
  T,
  TypeBadge,
} from "@/components/ui";
import { useStore } from "@/providers/store";

function evolutionCondition(d: EvolutionDetail) {
  const parts = [];
  if (d.min_level) parts.push("Level " + d.min_level);
  if (d.item) parts.push(title(d.item.name));
  if (d.held_item) parts.push("Holding " + title(d.held_item.name));
  if (d.min_happiness) parts.push("High friendship");
  if (d.time_of_day) parts.push(title(d.time_of_day));
  if (d.known_move) parts.push("Knows " + title(d.known_move.name));
  if (d.location) parts.push(title(d.location.name));
  if (d.gender) parts.push(d.gender === 1 ? "Female" : "Male");
  const extra = d as EvolutionDetail & {
    min_affection?: number;
    min_beauty?: number;
    needs_overworld_rain?: boolean;
    party_species?: { name: string };
    party_type?: { name: string };
    trade_species?: { name: string };
    turn_upside_down?: boolean;
    known_move_type?: { name: string };
    relative_physical_stats?: number | null;
  };
  if (extra.min_affection) parts.push("High affection");
  if (extra.min_beauty) parts.push("High beauty");
  if (extra.needs_overworld_rain) parts.push("While raining");
  if (extra.party_species)
    parts.push("With " + title(extra.party_species.name));
  if (extra.party_type) parts.push(title(extra.party_type.name) + " in party");
  if (extra.trade_species)
    parts.push("Trade for " + title(extra.trade_species.name));
  if (extra.turn_upside_down) parts.push("Turn device upside down");
  if (extra.known_move_type)
    parts.push("Knows a " + title(extra.known_move_type.name) + " move");
  if (extra.relative_physical_stats != null)
    parts.push(
      extra.relative_physical_stats === 0
        ? "Attack = Defense"
        : extra.relative_physical_stats > 0
          ? "Attack > Defense"
          : "Attack < Defense",
    );
  if (d.trigger?.name === "trade") parts.unshift("Trade");
  return parts.join(" · ") || title(d.trigger?.name ?? "Special condition");
}
function EvolutionTree({
  chain,
  selected,
}: {
  chain: Evolution;
  selected: number;
}) {
  const nodes: { node: Evolution; parent: string | null; depth: number }[] = [];
  function visit(node: Evolution, parent: string | null, depth: number) {
    nodes.push({ node, parent, depth });
    node.evolves_to.forEach((child) =>
      visit(child, node.species.name, depth + 1),
    );
  }
  visit(chain, null, 0);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 16, paddingVertical: 12 }}
    >
      {nodes.map(({ node, parent, depth }) => {
        const id = Number(node.species.url.split("/").filter(Boolean).pop());
        const conditions = [
          ...new Set(node.evolution_details.map(evolutionCondition)),
        ];
        return (
          <React.Fragment key={id}>
            {depth > 0 && (
              <View style={{ alignSelf: "center" }}>
                <Icon name="arrow-forward" size={18} color="#9AA98C" />
              </View>
            )}
            <Link
              href={{ pathname: "/pokemon/[id]", params: { id } }}
              replace
              asChild
            >
              <Pressable
                style={StyleSheet.flatten([
                  styles.evolutionCard,
                  selected === id && {
                    borderColor: "#93AB78",
                    backgroundColor: "#EFF3E7",
                  },
                ])}
              >
                <T style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>
                  {parent ? "EVOLUTION" : "FIRST PARTNER"}
                </T>
                <Image
                  source={{ uri: art(id) }}
                  style={{ width: 115, height: 115 }}
                  contentFit="contain"
                />
                <T
                  style={{
                    fontFamily: font.display,
                    fontSize: 20,
                    fontWeight: "600",
                  }}
                >
                  {title(node.species.name)}
                </T>
                <T style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                  {number(id)}
                </T>
                {parent && (
                  <T
                    style={{
                      fontSize: 10,
                      color: "#879079",
                      marginTop: 10,
                      textAlign: "center",
                    }}
                  >
                    From {title(parent)}
                  </T>
                )}
                <T
                  style={{
                    fontSize: 10,
                    color: C.green,
                    lineHeight: 16,
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  {conditions.join(" / ") || "The beginning of the journey"}
                </T>
              </Pressable>
            </Link>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}
export default function PokemonDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  return <PokemonDetailsContent key={params.id} id={Number(params.id)} />;
}
function PokemonDetailsContent({ id }: { id: number }) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(
    pokemonCache.get(id) ?? null,
  );
  const [species, setSpecies] = useState<Species | null>(null);
  const [chain, setChain] = useState<Evolution | null>(null);
  const [error, setError] = useState(
    directory.some((p) => p.id === id)
      ? ""
      : "This Pokémon hasn’t been discovered in our field guide.",
  );
  const [evolutionError, setEvolutionError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const width = useWindowWidth();
  const mobile = width < 750;
  const { favorites, toggleFavorite, pickTeam } = useStore();
  useEffect(() => {
    let active = true;
    if (!directory.some((p) => p.id === id)) return;
    getPokemon(id)
      .then(async (p) => {
        if (!active) return;
        setPokemon(p);
        setError("");
        try {
          const sp = await api<Species>(p.species);
          if (!active) return;
          setSpecies(sp);
          const evolution = await api<{ chain: Evolution }>(
            sp.evolution_chain.url,
          );
          if (active) {
            setChain(evolution.chain);
            setEvolutionError(false);
          }
        } catch {
          if (active) setEvolutionError(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "We couldn’t find this Pokémon right now. Check your connection and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);
  const color = typeColors[pokemon?.types[0] ?? "grass"];
  const description = species?.flavor_text_entries
    .find((t) => t.language.name === "en")
    ?.flavor_text.replace(/[\n\f\r]+/g, " ");
  const genus = species?.genera.find((g) => g.language.name === "en")?.genus;
  const weaknesses = pokemon
    ? TYPES.map((t) => ({
        type: t,
        value: effectiveness(t, pokemon.types),
      })).filter((t) => t.value > 1)
    : [];
  return (
    <View style={layout.page}>
      <Header />
      <ScrollView
        contentContainerStyle={[layout.container, width < 650 && layout.mobile]}
      >
        <View style={styles.breadcrumb}>
          <Link href="/" asChild>
            <Pressable
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <Icon name="arrow-back" size={17} />
              <T style={{ fontSize: 12, fontWeight: "600" }}>Back to Pokédex</T>
            </Pressable>
          </Link>
          <T style={{ fontSize: 11, color: C.muted }}>
            FIELD NOTES / {number(id || 0)}
          </T>
        </View>
        {!!error ? (
          <View style={{ paddingVertical: 80, alignItems: "center", gap: 20 }}>
            <Pokeball size={70} color="#CAD5BE" />
            <T>{error}</T>
            <Button
              onPress={() => {
                setError("");
                setEvolutionError(false);
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </Button>
          </View>
        ) : !pokemon ? (
          <ActivityIndicator
            size="large"
            color={C.green}
            style={{ marginVertical: 100 }}
          />
        ) : (
          <>
            <FadeIn>
              <View
                style={[styles.main, mobile && { flexDirection: "column" }]}
              >
                <View
                  style={[
                    styles.artPanel,
                    { backgroundColor: color.card },
                    mobile && { minHeight: 320, flex: undefined },
                  ]}
                >
                  <Pokeball
                    size={270}
                    color={color.fg}
                    lineColor={color.card}
                    style={{
                      position: "absolute",
                      alignSelf: "center",
                      top: 50,
                      opacity: 0.075,
                    }}
                  />
                  <T style={styles.giantNumber}>{number(id)}</T>
                  <IconButton
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 16,
                      zIndex: 2,
                      backgroundColor: "#FFFFFF80",
                    }}
                    name={favorites.includes(id) ? "heart" : "heart-outline"}
                    color={favorites.includes(id) ? C.red : C.green}
                    label="Toggle favorite"
                    onPress={() => toggleFavorite(id)}
                  />
                  <Float style={{ width: "100%", height: mobile ? 285 : 350 }}>
                    <Image
                      source={{ uri: art(id) }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                      transition={200}
                    />
                  </Float>
                  <T style={{ fontSize: 9, letterSpacing: 2, color: color.fg }}>
                    A CLOSER LOOK
                  </T>
                </View>
                <View style={styles.bio}>
                  <T
                    style={{ fontSize: 10, color: "#8B9B7E", letterSpacing: 2 }}
                  >
                    MEET YOUR NEXT FAVORITE
                  </T>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <T style={styles.name}>{title(pokemon.name)}</T>
                    {(species?.is_legendary || species?.is_mythical) && (
                      <View
                        style={{
                          padding: 6,
                          backgroundColor: "#EDE8C9",
                          borderRadius: 6,
                        }}
                      >
                        <T style={{ fontSize: 10, color: "#9C8940" }}>
                          {species.is_legendary ? "Legendary" : "Mythical"}
                        </T>
                      </View>
                    )}
                  </View>
                  <T style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
                    {genus || number(id)}
                  </T>
                  <View style={{ flexDirection: "row", gap: 7, marginTop: 19 }}>
                    {pokemon.types.map((t) => (
                      <TypeBadge type={t} key={t} />
                    ))}
                  </View>
                  <T
                    style={{
                      fontSize: 14,
                      lineHeight: 24,
                      color: "#7F8A78",
                      marginTop: 22,
                    }}
                  >
                    {description ||
                      (evolutionError
                        ? "Their story is waiting to be discovered. Reconnect to read the full field notes."
                        : "Opening the field notes…")}
                  </T>
                  <View style={styles.facts}>
                    {[
                      {
                        label: "HEIGHT",
                        value: pokemon.height / 10 + " m",
                        icon: "resize-outline",
                      },
                      {
                        label: "WEIGHT",
                        value: pokemon.weight / 10 + " kg",
                        icon: "barbell-outline",
                      },
                      {
                        label: "HABITAT",
                        value: title(species?.habitat?.name || "Unknown"),
                        icon: "leaf-outline",
                      },
                    ].map((f) => (
                      <View style={{ flex: 1 }} key={f.label}>
                        <T
                          style={{
                            fontSize: 9,
                            color: "#93A087",
                            letterSpacing: 1,
                          }}
                        >
                          {f.label}
                        </T>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 9,
                          }}
                        >
                          <Icon
                            name={
                              f.icon as React.ComponentProps<
                                typeof Icon
                              >["name"]
                            }
                            size={14}
                            color="#86967A"
                          />
                          <T style={{ fontSize: 13, fontWeight: "600" }}>
                            {f.value}
                          </T>
                        </View>
                      </View>
                    ))}
                  </View>
                  <T
                    style={{ fontSize: 9, color: "#93A087", letterSpacing: 1 }}
                  >
                    ABILITIES
                  </T>
                  <T style={{ marginTop: 8, fontSize: 13 }}>
                    {pokemon.abilities.map(title).join("  ·  ")}
                  </T>
                  <Button
                    onPress={() => pickTeam(pokemon)}
                    icon="add"
                    style={{ marginTop: 24, alignSelf: "flex-start" }}
                  >
                    Add to a team
                  </Button>
                </View>
              </View>
            </FadeIn>
            <View
              style={[styles.infoRow, mobile && { flexDirection: "column" }]}
            >
              <FadeIn delay={100} style={styles.statsPanel}>
                <View style={styles.sectionHeader}>
                  <T style={styles.sectionTitle}>
                    A little strength in numbers.
                  </T>
                  <T style={{ color: C.muted, fontSize: 10 }}>BASE STATS</T>
                </View>
                {[
                  "HP",
                  "Attack",
                  "Defense",
                  "Sp. Attack",
                  "Sp. Defense",
                  "Speed",
                ].map((label, i) => (
                  <View key={label} style={styles.stat}>
                    <T style={{ width: 78, fontSize: 11, color: C.muted }}>
                      {label}
                    </T>
                    <T style={{ width: 32, fontSize: 12, fontWeight: "700" }}>
                      {pokemon.stats[i]}
                    </T>
                    <View style={styles.track}>
                      <View
                        style={{
                          backgroundColor:
                            i === 0
                              ? "#A9BC7D"
                              : i === 5
                                ? "#E2B16F"
                                : "#719B81",
                          width: ((pokemon.stats[i] / 255) * 100 +
                            "%") as DimensionValue,
                          height: "100%",
                          borderRadius: 5,
                        }}
                      />
                    </View>
                  </View>
                ))}
                <View style={styles.total}>
                  <T style={{ fontWeight: "700", fontSize: 12 }}>Total</T>
                  <T
                    style={{
                      fontFamily: font.display,
                      fontSize: 24,
                      fontWeight: "600",
                    }}
                  >
                    {pokemon.stats.reduce((a, b) => a + b, 0)}
                  </T>
                </View>
              </FadeIn>
              <FadeIn delay={170} style={styles.weaknessPanel}>
                <Icon name="shield-half-outline" size={25} color="#9AAB86" />
                <T style={[styles.sectionTitle, { marginTop: 14 }]}>
                  Know their matchups.
                </T>
                <T
                  style={{
                    fontSize: 12,
                    lineHeight: 21,
                    color: C.muted,
                    marginTop: 9,
                  }}
                >
                  These attack types deal extra damage to {title(pokemon.name)}.
                  Every great partner has room for a little support.
                </T>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 22,
                  }}
                >
                  {weaknesses.length ? (
                    weaknesses.map((w) => (
                      <View
                        key={w.type}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <TypeBadge type={w.type} />
                        <T
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: C.red,
                          }}
                        >
                          {w.value}×
                        </T>
                      </View>
                    ))
                  ) : (
                    <T>No type weaknesses. A rare little advantage!</T>
                  )}
                </View>
              </FadeIn>
            </View>
            <FadeIn delay={220}>
              <View style={styles.evolutions}>
                <View style={styles.sectionHeader}>
                  <View>
                    <T
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.8,
                        color: "#93A087",
                        marginBottom: 7,
                      }}
                    >
                      GROWING TOGETHER
                    </T>
                    <T style={styles.sectionTitle}>
                      Every journey has its stages.
                    </T>
                  </View>
                  <Icon name="git-branch-outline" color="#91A37E" size={24} />
                </View>
                <T
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 8,
                    marginBottom: 12,
                  }}
                >
                  Follow the evolution family. Tap a Pokémon to explore their
                  story.
                </T>
                {chain ? (
                  <EvolutionTree chain={chain} selected={id} />
                ) : evolutionError ? (
                  <View
                    style={{
                      paddingVertical: 22,
                      gap: 15,
                      alignItems: "flex-start",
                    }}
                  >
                    <T style={{ color: C.muted }}>
                      Evolution notes couldn’t be loaded.
                    </T>
                    <Button
                      variant="outline"
                      onPress={() => {
                        setError("");
                        setEvolutionError(false);
                        setAttempt((a) => a + 1);
                      }}
                    >
                      Try again
                    </Button>
                  </View>
                ) : (
                  <ActivityIndicator
                    color={C.green}
                    style={{ marginVertical: 40 }}
                  />
                )}
              </View>
            </FadeIn>
            <View style={styles.previousNext}>
              {id > 1 ? (
                <Link
                  href={{ pathname: "/pokemon/[id]", params: { id: id - 1 } }}
                  replace
                  asChild
                >
                  <Pressable style={styles.neighbor}>
                    <Icon name="arrow-back" size={17} />
                    <View>
                      <T style={{ fontSize: 9, color: C.muted }}>
                        PREVIOUS POKÉMON
                      </T>
                      <T
                        style={{
                          marginTop: 4,
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        {title(
                          directory.find((p) => p.id === id - 1)?.name ?? "",
                        )}
                      </T>
                    </View>
                  </Pressable>
                </Link>
              ) : (
                <View />
              )}
              {id < directory.length && (
                <Link
                  href={{ pathname: "/pokemon/[id]", params: { id: id + 1 } }}
                  replace
                  asChild
                >
                  <Pressable style={styles.neighbor}>
                    <View>
                      <T
                        style={{
                          fontSize: 9,
                          color: C.muted,
                          textAlign: "right",
                        }}
                      >
                        NEXT POKÉMON
                      </T>
                      <T
                        style={{
                          marginTop: 4,
                          fontWeight: "600",
                          fontSize: 13,
                          textAlign: "right",
                        }}
                      >
                        {title(
                          directory.find((p) => p.id === id + 1)?.name ?? "",
                        )}
                      </T>
                    </View>
                    <Icon name="arrow-forward" size={17} />
                  </Pressable>
                </Link>
              )}
            </View>
          </>
        )}
        <Footer />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 28,
  },
  main: { flexDirection: "row", gap: 35 },
  artPanel: {
    flex: 1,
    borderRadius: 22,
    minHeight: 425,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingBottom: 20,
  },
  giantNumber: {
    position: "absolute",
    left: 22,
    top: 18,
    fontFamily: font.display,
    fontSize: 45,
    fontWeight: "600",
    color: "#78956830",
  },
  bio: { flex: 1, paddingVertical: 15 },
  name: {
    fontFamily: font.display,
    fontWeight: "600",
    fontSize: 49,
    letterSpacing: -1.4,
    marginTop: 11,
  },
  facts: {
    flexDirection: "row",
    paddingVertical: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
    marginVertical: 22,
  },
  infoRow: { flexDirection: "row", gap: 22, marginTop: 28 },
  statsPanel: {
    flex: 1.3,
    borderWidth: 1,
    borderColor: C.line,
    padding: 26,
    borderRadius: 18,
    backgroundColor: "#fff",
  },
  weaknessPanel: {
    flex: 1,
    backgroundColor: "#EDF0E2",
    borderRadius: 18,
    padding: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  stat: { flexDirection: "row", alignItems: "center", marginTop: 18, gap: 7 },
  track: {
    flex: 1,
    height: 7,
    backgroundColor: "#EDF0E8",
    borderRadius: 5,
    overflow: "hidden",
  },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: C.line,
    marginTop: 20,
    paddingTop: 13,
  },
  evolutions: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 25,
  },
  evolutionCard: {
    width: 180,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    alignItems: "center",
    backgroundColor: C.bg,
  },
  previousNext: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  neighbor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingVertical: 12,
  },
});

export const generateMetadata: GenerateMetadataFunction = (
  _request,
  params,
) => {
  const pokemon = directory.find((p) => String(p.id) === String(params.id));
  const name = pokemon ? title(pokemon.name) : "Pokémon";
  return {
    title: name + " · Pokéfolio",
    description:
      "Explore " +
      name +
      " stats, abilities, type matchups, and evolution family.",
  };
};
