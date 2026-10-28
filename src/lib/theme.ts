export const C = {
  bg: "#F8F8F2",
  paper: "#FFFFFF",
  ink: "#263B30",
  muted: "#849085",
  green: "#285440",
  deep: "#244B3B",
  lime: "#E8EEA7",
  orange: "#EAA076",
  line: "#E4E7DD",
  soft: "#EEF0E6",
  red: "#C96762",
};
export const font = { body: "DMSans", display: "Outfit" };
export const TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;
export type PokemonType = (typeof TYPES)[number];
export const typeColors: Record<
  string,
  { bg: string; fg: string; card: string; icon: string }
> = {
  grass: { bg: "#DCEBCF", fg: "#578B4F", card: "#EDF3E6", icon: "leaf" },
  poison: { bg: "#E7D9ED", fg: "#9864A6", card: "#F0EAF4", icon: "flask" },
  fire: { bg: "#F7DBCD", fg: "#D68259", card: "#FCF0E7", icon: "flame" },
  water: { bg: "#D7E9F5", fg: "#5594BE", card: "#EAF2F8", icon: "water" },
  bug: { bg: "#E5EBCB", fg: "#8E9E4C", card: "#F0F3E5", icon: "bug" },
  flying: {
    bg: "#E2E4F0",
    fg: "#8B8DB9",
    card: "#F0F0F7",
    icon: "paper-plane",
  },
  normal: { bg: "#E9E6DF", fg: "#9B9585", card: "#F1EFE9", icon: "ellipse" },
  electric: { bg: "#F4EAB7", fg: "#BD9B33", card: "#FBF7DE", icon: "flash" },
  ground: { bg: "#EEDFC8", fg: "#AA8959", card: "#F5EFE4", icon: "trail-sign" },
  fairy: { bg: "#F3DAE7", fg: "#BE80A3", card: "#FCF0F5", icon: "sparkles" },
  fighting: { bg: "#EFDBD6", fg: "#B87566", card: "#F7ECE8", icon: "fitness" },
  psychic: { bg: "#F3D9E0", fg: "#C47891", card: "#FAEDF1", icon: "eye" },
  rock: { bg: "#E7E1CA", fg: "#A59A6B", card: "#F3F0E7", icon: "diamond" },
  ice: { bg: "#D7EEEB", fg: "#61A9A4", card: "#EAF7F4", icon: "snow" },
  ghost: { bg: "#E0DBEC", fg: "#8A77AA", card: "#F0ECF6", icon: "moon" },
  dragon: { bg: "#DDDDF2", fg: "#8074B9", card: "#ECECF8", icon: "bonfire" },
  dark: { bg: "#DFDCD8", fg: "#7C746C", card: "#EDEBE9", icon: "moon" },
  steel: { bg: "#DBE4E6", fg: "#7C969E", card: "#EDF2F3", icon: "shield" },
};
export const title = (s: string) =>
  s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
export const number = (id: number) => `#${String(id).padStart(3, "0")}`;
export const art = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
export const GENERATIONS = [
  { name: "All generations", start: 1, end: 9999 },
  { name: "I · Kanto", start: 1, end: 151 },
  { name: "II · Johto", start: 152, end: 251 },
  { name: "III · Hoenn", start: 252, end: 386 },
  { name: "IV · Sinnoh", start: 387, end: 493 },
  { name: "V · Unova", start: 494, end: 649 },
  { name: "VI · Kalos", start: 650, end: 721 },
  { name: "VII · Alola", start: 722, end: 809 },
  { name: "VIII · Galar", start: 810, end: 905 },
  { name: "IX · Paldea", start: 906, end: 9999 },
];
