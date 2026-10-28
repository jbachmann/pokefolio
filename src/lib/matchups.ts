import type { Pokemon } from "./api";
import typeData from "./types.json";
import { PokemonType, TYPES } from "./theme";

type Resource = { name: string; url: string };
type TypeInfo = { relations: Record<string, Resource[]>; ids: number[] };
export const typeInfo = typeData as Record<string, TypeInfo>;

export function effectiveness(attack: string, defenses: string[]): number {
  return defenses.reduce((damage, defense) => {
    const r = typeInfo[attack]?.relations;
    if (!r) return damage;
    if (r.no_damage_to.some((t) => t.name === defense)) return 0;
    if (r.double_damage_to.some((t) => t.name === defense)) return damage * 2;
    if (r.half_damage_to.some((t) => t.name === defense)) return damage / 2;
    return damage;
  }, 1);
}
export function analyzeTeam(members: Pokemon[]) {
  return TYPES.map((type) => {
    const defense = members.map((p) => effectiveness(type, p.types));
    return {
      type: type as PokemonType,
      weak: defense.filter((x) => x > 1).length,
      resistant: defense.filter((x) => x < 1).length,
      immune: defense.filter((x) => x === 0).length,
      coverage: members.filter((p) =>
        p.types.some((t) => effectiveness(t, [type]) > 1),
      ).length,
    };
  });
}
