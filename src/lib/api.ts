import AsyncStorage from "@react-native-async-storage/async-storage";
import seed from "./seed.json";
import directoryData from "./directory.json";
import { typeInfo } from "./matchups";

export type Pokemon = {
  id: number;
  name: string;
  types: string[];
  height: number;
  weight: number;
  stats: number[];
  abilities: string[];
  species: string;
};
export type Resource = { name: string; url: string };
export type Species = {
  flavor_text_entries: { flavor_text: string; language: Resource }[];
  genera: { genus: string; language: Resource }[];
  evolution_chain: { url: string };
  habitat: Resource | null;
  capture_rate: number;
  is_legendary: boolean;
  is_mythical: boolean;
  varieties: { is_default: boolean; pokemon: Resource }[];
};
export type EvolutionDetail = {
  min_level: number | null;
  item: Resource | null;
  held_item: Resource | null;
  trigger: Resource;
  min_happiness: number | null;
  time_of_day: string;
  known_move: Resource | null;
  location: Resource | null;
  gender: number | null;
};
export type Evolution = {
  species: Resource;
  evolution_details: EvolutionDetail[];
  evolves_to: Evolution[];
};
export const directory = directoryData;
export const pokemonCache = new Map<number, Pokemon>(
  (seed as Pokemon[]).map((p) => [p.id, p]),
);
const memory = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();
const BASE = "https://pokeapi.co/api/v2/";
export async function api<T, Raw = T>(
  path: string,
  transform?: (raw: Raw) => T,
): Promise<T> {
  const url = path.startsWith("https://") ? path : BASE + path;
  if (memory.has(url)) return memory.get(url) as T;
  if (pending.has(url)) return pending.get(url) as Promise<T>;
  const request = (async () => {
    const key = "pokefolio:api:v2:" + url;
    try {
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        const entry = JSON.parse(saved);
        if (Date.now() - entry.time < 604800000) {
          memory.set(url, entry.data);
          return entry.data as T;
        }
      }
    } catch {
      /* A cache miss should never prevent a network request. */
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(18000) });
    if (!response.ok)
      throw new Error(
        "The Pokémon field guide is taking a little break. Please try again.",
      );
    const raw: Raw = await response.json();
    const data = transform ? transform(raw) : (raw as unknown as T);
    memory.set(url, data);
    AsyncStorage.setItem(key, JSON.stringify({ time: Date.now(), data })).catch(
      () => {},
    );
    return data;
  })();
  pending.set(url, request);
  try {
    return await request;
  } finally {
    pending.delete(url);
  }
}
export async function getPokemon(id: number): Promise<Pokemon> {
  if (pokemonCache.has(id)) return pokemonCache.get(id)!;
  const result = await api<
    Pokemon,
    {
      id: number;
      name: string;
      types: { type: Resource }[];
      height: number;
      weight: number;
      stats: { base_stat: number }[];
      abilities: { ability: Resource }[];
      species: Resource;
    }
  >("pokemon/" + id, (p) => ({
    id: p.id,
    name: p.name,
    types: p.types.map((t) => t.type.name),
    height: p.height,
    weight: p.weight,
    stats: p.stats.map((s) => s.base_stat),
    abilities: p.abilities.map((a) => a.ability.name),
    species: p.species.url,
  }));
  pokemonCache.set(id, result);
  return result;
}
export { effectiveness, analyzeTeam } from "./matchups";
export const typeIds = (type: string) => new Set(typeInfo[type]?.ids ?? []);
