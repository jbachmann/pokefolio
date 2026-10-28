import { useWindowWidth } from "@/hooks/use-window-width";
import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Image } from "expo-image";
import { directory, getPokemon, pokemonCache, typeIds } from "@/lib/api";
import {
  art,
  C,
  font,
  GENERATIONS,
  number,
  title,
  typeColors,
  TYPES,
} from "@/lib/theme";
import { Header, Footer, layout } from "@/components/shell";
import { Hero } from "@/components/hero";
import { PokemonCard } from "@/components/pokemon-card";
import {
  Button,
  Icon,
  IconButton,
  Pokeball,
  Select,
  T,
  TypeBadge,
} from "@/components/ui";
import { useStore } from "@/providers/store";

const SHORT_SORTS = ["Number ↑", "Number ↓", "Name A–Z", "Name Z–A"];
const SORTS = [
  "Number: lowest first",
  "Number: highest first",
  "Name: A to Z",
  "Name: Z to A",
];
export default function Index() {
  const width = useWindowWidth();
  const mobile = width < 650;
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [type, setType] = useState("all");
  const [generation, setGeneration] = useState(0);
  const [sort, setSort] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [limit, setLimit] = useState(24);
  const [revision, setRevision] = useState(0);
  const [failure, setFailure] = useState({ key: "", message: "" });
  const [retryCount, setRetryCount] = useState(0);
  const { favorites, pickTeam } = useStore();
  const ref = useRef<FlatList>(null);
  const columns = listMode ? 1 : width > 1000 ? 4 : width > 720 ? 3 : 2;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#0*/, "");
    const ids = type !== "all" ? typeIds(type) : null;
    const gen = GENERATIONS[generation];
    const result = directory.filter(
      (p) =>
        p.id >= gen.start &&
        p.id <= gen.end &&
        (!ids || ids.has(p.id)) &&
        (!onlyFavorites || favorites.includes(p.id)) &&
        (!q || p.name.includes(q) || String(p.id) === q),
    );
    return result.sort((a, b) =>
      sort === 0
        ? a.id - b.id
        : sort === 1
          ? b.id - a.id
          : sort === 2
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name),
    );
  }, [search, type, generation, sort, onlyFavorites, favorites]);
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const requestKey = visible.map((p) => p.id).join(",");
  const error = failure.key === requestKey ? failure.message : "";
  const loading = !error && visible.some((p) => !pokemonCache.has(p.id));
  function updateFilter(action: () => void) {
    setLimit(24);
    action();
  }
  useEffect(() => {
    let active = true;
    const missing = visible.filter((p) => !pokemonCache.has(p.id));
    if (!missing.length) return;
    (async () => {
      let failures = 0;
      for (let i = 0; i < missing.length && active; i += 6) {
        const results = await Promise.allSettled(
          missing.slice(i, i + 6).map((p) => getPokemon(p.id)),
        );
        failures += results.filter((r) => r.status === "rejected").length;
        if (active) setRevision((r) => r + 1);
      }
      if (active)
        setFailure({
          key: requestKey,
          message: failures
            ? "Some Pokémon are still out exploring. Check your connection and try again."
            : "",
        });
    })();
    return () => {
      active = false;
    };
  }, [visible, requestKey, retryCount]);
  function reset() {
    setQuery("");
    setType("all");
    setGeneration(0);
    setOnlyFavorites(false);
  }
  function retry() {
    setFailure({ key: "", message: "" });
    setRetryCount((n) => n + 1);
  }
  const header = (
    <View>
      <View style={{ marginTop: mobile ? 22 : 30 }}>
        <Hero
          onExplore={() =>
            ref.current?.scrollToOffset({
              offset: mobile ? 515 : 390,
              animated: true,
            })
          }
        />
      </View>
      <View style={[styles.directoryTitle, mobile && { marginTop: 31 }]}>
        <View>
          <View style={styles.eyebrow}>
            <View style={styles.smallLine} />
            <T style={styles.kicker}>THE POKÉDEX</T>
          </View>
          <T style={[styles.heading, mobile && { fontSize: 28 }]}>
            Find your next favorite.
          </T>
          <T style={styles.subtitle}>
            Familiar faces. New discoveries. All in one place.
          </T>
        </View>
        <View style={styles.speciesCount}>
          <Pokeball size={15} color="#86967A" />
          <T style={{ fontSize: 11, color: "#7A8975" }}>
            {directory.length.toLocaleString("en-US")} Pokémon, endless
            possibilities
          </T>
        </View>
      </View>
      <View style={[styles.filters, mobile && { flexWrap: "wrap" }]}>
        <View style={[styles.search, mobile && { minWidth: "100%" }]}>
          <Icon name="search-outline" size={19} color="#899283" />
          <TextInput
            accessibilityLabel="Search Pokémon by name or number"
            value={query}
            onChangeText={(text) => updateFilter(() => setQuery(text))}
            placeholder="Search by name or number..."
            placeholderTextColor="#9AA193"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && (
            <IconButton
              name="close"
              label="Clear search"
              onPress={() => setQuery("")}
              style={{ width: 28, height: 30 }}
            />
          )}
        </View>
        <Select
          label="Choose a generation"
          value={GENERATIONS[generation].name}
          options={GENERATIONS.map((g) => g.name)}
          onChange={(n) => updateFilter(() => setGeneration(n))}
        />
        <Select
          label="Sort Pokémon"
          value={(mobile ? SHORT_SORTS : SORTS)[sort]}
          options={mobile ? SHORT_SORTS : SORTS}
          onChange={(n) => updateFilter(() => setSort(n))}
          icon="swap-vertical"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show favorites"
          accessibilityState={{ selected: onlyFavorites }}
          onPress={() => updateFilter(() => setOnlyFavorites((v) => !v))}
          style={[
            styles.favorites,
            onlyFavorites && {
              borderColor: "#CEAAA0",
              backgroundColor: "#FAEFEC",
            },
          ]}
        >
          <Icon
            name={onlyFavorites ? "heart" : "heart-outline"}
            size={17}
            color={onlyFavorites ? C.red : C.muted}
          />
          {!mobile && (
            <T style={{ fontSize: 12, color: onlyFavorites ? C.red : C.ink }}>
              Favorites
            </T>
          )}
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFilters}
      >
        {[
          "all",
          "grass",
          "fire",
          "water",
          "electric",
          "bug",
          "normal",
          "poison",
          "flying",
          ...TYPES.filter(
            (t) =>
              ![
                "grass",
                "fire",
                "water",
                "electric",
                "bug",
                "normal",
                "poison",
                "flying",
              ].includes(t),
          ),
        ].map((t) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: type === t }}
            key={t}
            onPress={() => updateFilter(() => setType(t))}
            style={[
              styles.typePill,
              type === t && { backgroundColor: C.green, borderColor: C.green },
            ]}
          >
            <Icon
              name={
                t === "all"
                  ? "apps-outline"
                  : (typeColors[t].icon as React.ComponentProps<
                      typeof Icon
                    >["name"])
              }
              size={13}
              color={type === t ? "#F1F4DC" : (typeColors[t]?.fg ?? C.muted)}
            />
            <T
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: type === t ? "#F1F4DC" : "#78816E",
              }}
            >
              {t === "all" ? "All types" : title(t)}
            </T>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.resultBar}>
        <T style={{ fontSize: 11, color: "#8C9587" }}>
          Showing{" "}
          <T style={{ fontSize: 11, fontWeight: "700", color: "#596C52" }}>
            {Math.min(limit, filtered.length)}
          </T>{" "}
          of {filtered.length.toLocaleString("en-US")} Pokémon
          {onlyFavorites ? " · Your favorites" : ""}
        </T>
        <View style={styles.viewToggle}>
          <IconButton
            name="grid-outline"
            label="Grid view"
            color={!listMode ? C.green : "#A4AD9C"}
            onPress={() => setListMode(false)}
            style={[
              styles.viewButton,
              !listMode && { backgroundColor: "#E7ECDF" },
            ]}
          />
          <IconButton
            name="list-outline"
            label="List view"
            color={listMode ? C.green : "#A4AD9C"}
            onPress={() => setListMode(true)}
            style={[
              styles.viewButton,
              listMode && { backgroundColor: "#E7ECDF" },
            ]}
          />
        </View>
      </View>
    </View>
  );
  return (
    <View style={layout.page}>
      <Header />
      <FlatList
        ref={ref}
        key={"columns-" + columns}
        data={visible}
        extraData={revision}
        keyExtractor={(item) => String(item.id)}
        numColumns={columns}
        style={{ flex: 1 }}
        contentContainerStyle={[layout.container, mobile && layout.mobile]}
        columnWrapperStyle={columns > 1 ? { gap: mobile ? 10 : 18 } : undefined}
        ItemSeparatorComponent={() => (
          <View style={{ height: mobile ? 10 : 18 }} />
        )}
        ListHeaderComponent={header}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const pokemon = pokemonCache.get(item.id);
          if (!pokemon)
            return (
              <View style={[styles.skeleton, { flex: 1 }]}>
                <Pokeball size={65} color="#DCE3D2" />
                <T style={{ marginTop: 16, color: C.muted }}>
                  {title(item.name)}
                </T>
                {loading && (
                  <ActivityIndicator
                    style={{ marginTop: 15 }}
                    color={C.green}
                  />
                )}
              </View>
            );
          if (!listMode) return <PokemonCard pokemon={pokemon} index={index} />;
          return (
            <View style={styles.listCard}>
              <Link
                href={{ pathname: "/pokemon/[id]", params: { id: pokemon.id } }}
                asChild
              >
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    flex: 1,
                  }}
                >
                  <Image
                    source={{ uri: art(pokemon.id) }}
                    style={{ width: 65, height: 65 }}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 10, color: C.muted }}>
                      {number(pokemon.id)}
                    </T>
                    <T
                      style={{
                        fontFamily: font.display,
                        fontSize: 20,
                        fontWeight: "600",
                      }}
                    >
                      {title(pokemon.name)}
                    </T>
                  </View>
                  <View
                    style={{ flexDirection: mobile ? "column" : "row", gap: 4 }}
                  >
                    {pokemon.types.map((t) => (
                      <TypeBadge type={t} small key={t} />
                    ))}
                  </View>
                </Pressable>
              </Link>
              <IconButton
                name="add-circle-outline"
                label={"Add " + pokemon.name + " to team"}
                onPress={() => pickTeam(pokemon)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search-outline" size={36} color="#95A384" />
            <T
              style={{ fontFamily: font.display, fontSize: 25, marginTop: 16 }}
            >
              No Pokémon on this trail.
            </T>
            <T style={{ color: C.muted, marginVertical: 12 }}>
              Try a different name, type, or generation.
            </T>
            <Button variant="outline" onPress={reset}>
              Clear filters
            </Button>
          </View>
        }
        ListFooterComponent={
          <View>
            {!!error && (
              <View style={styles.error}>
                <T style={{ flex: 1, color: C.red, fontSize: 12 }}>{error}</T>
                <Button variant="outline" onPress={retry}>
                  Try again
                </Button>
              </View>
            )}
            {visible.length < filtered.length && (
              <View style={styles.loadMore}>
                <Button
                  variant="outline"
                  onPress={() => setLimit((l) => l + 24)}
                  icon={loading ? undefined : "add"}
                  disabled={loading}
                >
                  {loading ? "Finding Pokémon…" : "Discover more Pokémon"}
                </Button>
                <T style={{ fontSize: 10, color: C.muted, marginTop: 12 }}>
                  There’s always someone new to meet.
                </T>
              </View>
            )}
            <View
              style={[
                styles.teamBanner,
                mobile && { padding: 23, flexWrap: "wrap" },
              ]}
            >
              <View
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 25,
                  backgroundColor: "#E2E8CE",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="people-outline" size={22} color={C.green} />
              </View>
              <View style={{ flex: 1, minWidth: 190 }}>
                <T
                  style={{
                    fontFamily: font.display,
                    fontWeight: "600",
                    fontSize: 21,
                  }}
                >
                  Better together.
                </T>
                <T style={{ fontSize: 11, color: "#879076", marginTop: 4 }}>
                  Six Pokémon. One great adventure. Build a team that’s yours.
                </T>
              </View>
              <Link href="/teams" asChild>
                <Pressable style={styles.teamLink}>
                  <T style={{ fontSize: 12, fontWeight: "700" }}>
                    Build your dream team
                  </T>
                  <Icon name="arrow-forward" size={16} />
                </Pressable>
              </Link>
            </View>
            <Footer />
          </View>
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  directoryTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 37,
    marginBottom: 25,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
  },
  smallLine: { width: 17, height: 1, backgroundColor: "#899E70" },
  kicker: {
    fontSize: 8,
    letterSpacing: 1.8,
    fontWeight: "600",
    color: "#849577",
  },
  heading: {
    fontFamily: font.display,
    fontSize: 33,
    fontWeight: "500",
    letterSpacing: -0.9,
  },
  subtitle: { color: "#929989", fontSize: 11, marginTop: 7 },
  speciesCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
    flexShrink: 1,
    display: "none",
  },
  filters: { flexDirection: "row", gap: 10 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 9,
    paddingHorizontal: 14,
    minHeight: 45,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 12,
    color: C.ink,
    paddingVertical: 12,
    outlineWidth: 0,
  },
  favorites: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
    borderRadius: 9,
    paddingHorizontal: 14,
    minHeight: 45,
  },
  typeFilters: { gap: 8, paddingTop: 17, paddingBottom: 17 },
  typePill: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E3E6DB",
    paddingVertical: 8,
    paddingHorizontal: 13,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  resultBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingVertical: 13,
  },
  viewToggle: { flexDirection: "row", gap: 4 },
  viewButton: { borderRadius: 5, width: 27, height: 25 },
  skeleton: {
    height: 254,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.soft,
    borderRadius: 15,
  },
  listCard: {
    padding: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 10,
  },
  empty: { paddingVertical: 60, alignItems: "center" },
  loadMore: { paddingTop: 32, alignItems: "center" },
  error: {
    padding: 15,
    backgroundColor: "#F7E7E0",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 20,
  },
  teamBanner: {
    marginTop: 40,
    padding: 27,
    borderRadius: 14,
    backgroundColor: "#EDF0E2",
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  teamLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
  },
});

export function generateMetadata() {
  return {
    title: "Pokéfolio · A world of Pokémon",
    description:
      "Discover 1,025 Pokémon, explore stats and evolutions, and build your dream team.",
  };
}
