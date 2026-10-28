import { useWindowWidth } from "@/hooks/use-window-width";
import React from "react";
import { Link } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { Pokemon } from "@/lib/api";
import { art, C, font, number, title, typeColors } from "@/lib/theme";
import { useStore } from "@/providers/store";
import { FadeIn, Icon, Pokeball, T, TypeBadge } from "./ui";

export function PokemonCard({
  pokemon,
  index = 0,
}: {
  pokemon: Pokemon;
  index?: number;
}) {
  const width = useWindowWidth();
  const { favorites, toggleFavorite, pickTeam } = useStore();
  const color = typeColors[pokemon.types[0]] ?? typeColors.normal;
  const favorite = favorites.includes(pokemon.id);
  return (
    <FadeIn delay={Math.min(index, 7) * 35} style={{ flex: 1 }}>
      <View style={[styles.card, { backgroundColor: color.card }]}>
        <Link
          href={{ pathname: "/pokemon/[id]", params: { id: pokemon.id } }}
          asChild
        >
          <Pressable
            accessibilityLabel={"View " + title(pokemon.name)}
            style={styles.main}
          >
            <T style={styles.number}>{number(pokemon.id)}</T>
            <Pokeball
              size={137}
              color={color.fg}
              lineColor={color.card}
              style={styles.ball}
            />
            <Image
              source={{ uri: art(pokemon.id) }}
              style={styles.art}
              contentFit="contain"
              transition={250}
              accessibilityLabel={title(pokemon.name)}
            />
            <View style={styles.info}>
              <T
                numberOfLines={1}
                style={[styles.name, width < 650 && { fontSize: 18 }]}
              >
                {title(pokemon.name)}
              </T>
              <View style={styles.types}>
                {pokemon.types.map((type) => (
                  <TypeBadge type={type} small key={type} />
                ))}
              </View>
            </View>
          </Pressable>
        </Link>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            (favorite ? "Unfavorite " : "Favorite ") + title(pokemon.name)
          }
          accessibilityState={{ selected: favorite }}
          onPress={() => toggleFavorite(pokemon.id)}
          style={styles.heart}
        >
          <Icon
            name={favorite ? "heart" : "heart-outline"}
            size={19}
            color={favorite ? C.red : "#929D91"}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Add " + title(pokemon.name) + " to a team"}
          onPress={() => pickTeam(pokemon)}
          style={({ pressed, hovered }) => [
            styles.add,
            (pressed || hovered) && { backgroundColor: "#fff" },
          ]}
        >
          <Icon name="add" size={19} color={C.green} />
        </Pressable>
      </View>
    </FadeIn>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#374A3010",
  },
  main: { height: 254, padding: 20 },
  number: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8D998B",
    letterSpacing: 0.4,
  },
  ball: {
    position: "absolute",
    top: 38,
    right: 19,
    opacity: 0.075,
    transform: [{ rotate: "-18deg" }],
  },
  art: {
    position: "absolute",
    top: 25,
    left: "15%",
    width: "70%",
    height: 167,
  },
  info: { position: "absolute", bottom: 19, left: 19, right: 40 },
  name: {
    fontFamily: font.display,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.5,
    marginBottom: 9,
  },
  types: { flexDirection: "row", gap: 5 },
  heart: {
    position: "absolute",
    right: 10,
    top: 6,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    position: "absolute",
    right: 15,
    bottom: 18,
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: "#ADB9A260",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF60",
  },
});
