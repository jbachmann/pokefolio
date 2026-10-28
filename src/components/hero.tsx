import { useWindowWidth } from "@/hooks/use-window-width";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { C, font, art } from "@/lib/theme";
import { Button, FadeIn, Float, Icon, Pokeball, T } from "./ui";

export function Hero({ onExplore }: { onExplore: () => void }) {
  const width = useWindowWidth();
  const mobile = width < 650;
  return (
    <FadeIn>
      <View style={[styles.hero, mobile && { padding: 27, minHeight: 480 }]}>
        <View
          style={[
            styles.ring,
            {
              width: 440,
              height: 440,
              right: mobile ? -165 : 33,
              top: mobile ? 250 : -45,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              width: 340,
              height: 340,
              right: mobile ? -116 : 83,
              top: mobile ? 300 : 5,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              width: 240,
              height: 240,
              right: mobile ? -66 : 133,
              top: mobile ? 350 : 55,
            },
          ]}
        />
        <View style={{ zIndex: 2, maxWidth: mobile ? "100%" : "57%" }}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <T style={styles.eyebrowText}>
              A LITTLE CURIOSITY. A WORLD OF DISCOVERY.
            </T>
          </View>
          <T
            style={[styles.heading, mobile && { fontSize: 43, lineHeight: 46 }]}
          >
            A big world.{"\n"}A little closer.
          </T>
          <T
            style={[
              styles.description,
              mobile && { maxWidth: 245, fontSize: 12 },
            ]}
          >
            Every Pokémon has a story. Discover your favorites,{!mobile && "\n"}{" "}
            build your dream team, and find your next adventure.
          </T>
          <Button
            variant="light"
            icon="arrow-forward"
            onPress={onExplore}
            style={{
              alignSelf: "flex-start",
              marginTop: 22,
              minHeight: 44,
              paddingHorizontal: 20,
            }}
          >
            Let’s explore
          </Button>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.artContainer,
            mobile && { top: 265, right: -18, width: 260, height: 230 },
          ]}
        >
          <Float style={{ width: "100%", height: "100%" }}>
            <Image
              source={{ uri: art(1) }}
              contentFit="contain"
              style={{ width: "100%", height: "100%" }}
              transition={400}
            />
          </Float>
        </View>
        <View
          style={[
            styles.annotation,
            mobile && {
              top: 308,
              right: 190,
              transform: [{ rotate: "-9deg" }],
            },
          ]}
        >
          <Icon name="sparkles-outline" size={15} color={C.lime} />
          <T style={styles.annotationText}>a good place to start</T>
        </View>
        {!mobile && (
          <View style={styles.featured}>
            <Pokeball size={23} color="#DFE8B5" lineColor={C.deep} />
            <View>
              <T style={{ fontSize: 12, color: "#EEF3DE", fontWeight: "600" }}>
                Bulbasaur
              </T>
              <T style={{ fontSize: 9, color: "#B4C5A8", marginTop: 2 }}>
                #001 · THE SEED POKÉMON
              </T>
            </View>
            <View style={styles.featuredDivider} />
            <Icon name="leaf-outline" size={17} color="#B7D79B" />
          </View>
        )}
        <T style={[styles.decor, mobile && { bottom: 17, left: 25 }]}>
          EST. 1996 / ALWAYS EXPLORING
        </T>
      </View>
    </FadeIn>
  );
}
const styles = StyleSheet.create({
  hero: {
    backgroundColor: C.deep,
    minHeight: 338,
    borderRadius: 20,
    padding: 39,
    paddingHorizontal: 45,
    overflow: "hidden",
    position: "relative",
  },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 4, backgroundColor: C.lime },
  eyebrowText: {
    color: "#C5D5B6",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 1.45,
  },
  heading: {
    fontFamily: font.display,
    fontSize: 56,
    fontWeight: "500",
    color: "#F1F1CA",
    lineHeight: 58,
    letterSpacing: -1.8,
    marginTop: 20,
  },
  description: {
    color: "#C4D0BE",
    fontSize: 12,
    lineHeight: 21,
    marginTop: 14,
  },
  ring: {
    position: "absolute",
    borderRadius: 300,
    borderWidth: 1,
    borderColor: "#D8E7B711",
  },
  artContainer: {
    position: "absolute",
    width: 350,
    height: 310,
    right: 70,
    top: 6,
    zIndex: 1,
  },
  annotation: {
    position: "absolute",
    right: 32,
    top: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    transform: [{ rotate: "9deg" }],
    zIndex: 2,
  },
  annotationText: { fontSize: 10, color: "#CED8B9", fontStyle: "italic" },
  featured: {
    position: "absolute",
    bottom: 25,
    right: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#173E2DD9",
    borderWidth: 1,
    borderColor: "#A1BC8233",
    padding: 13,
    paddingHorizontal: 17,
    borderRadius: 12,
    zIndex: 2,
  },
  featuredDivider: {
    width: 1,
    height: 25,
    backgroundColor: "#A1BC8233",
    marginHorizontal: 4,
  },
  decor: {
    position: "absolute",
    bottom: 19,
    left: 45,
    fontSize: 7,
    letterSpacing: 1.9,
    color: "#94AE8B",
  },
});
