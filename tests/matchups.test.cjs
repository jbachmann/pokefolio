const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// Compile the app's pure TypeScript modules when Node loads them. These tests
// need no Expo runtime or additional test dependency; this does not typecheck.
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  module._compile(compiled.outputText, filename);
};
const { effectiveness, analyzeTeam } = require("../src/lib/matchups.ts");
const { TYPES } = require("../src/lib/theme.ts");
const seed = require("../src/lib/seed.json");

test("single types include advantages, resistances and neutral damage", () => {
  assert.equal(effectiveness("fire", ["grass"]), 2);
  assert.equal(effectiveness("fire", ["water"]), 0.5);
  assert.equal(effectiveness("fire", ["normal"]), 1);
});

test("dual types multiply weaknesses and resistances", () => {
  // Two weaknesses compound, two resistances compound, and opposites cancel.
  assert.equal(effectiveness("rock", ["fire", "flying"]), 4);
  assert.equal(effectiveness("grass", ["fire", "flying"]), 0.25);
  assert.equal(effectiveness("electric", ["water", "dragon"]), 1);
});

test("an immunity takes precedence regardless of type order", () => {
  assert.equal(effectiveness("electric", ["water", "ground"]), 0);
  assert.equal(effectiveness("electric", ["ground", "water"]), 0);
  assert.equal(effectiveness("ground", ["steel", "flying"]), 0);
  assert.equal(effectiveness("dragon", ["dragon", "fairy"]), 0);
});

test("all 324 type pairs have a valid current-generation multiplier", () => {
  const allowedMultipliers = [0, 0.5, 1, 2];
  for (const attackType of TYPES) {
    for (const defenseType of TYPES) {
      const multiplier = effectiveness(attackType, [defenseType]);
      assert.ok(
        allowedMultipliers.includes(multiplier),
        `${attackType} attacking ${defenseType}: unexpected multiplier ${multiplier}`,
      );
    }
  }
});

test("team defense counts weaknesses, resistances, and immunities", () => {
  const members = [
    { types: ["fire", "flying"] },
    { types: ["water", "ground"] },
  ];
  const analysis = analyzeTeam(members);
  const electric = analysis.find((matchup) => matchup.type === "electric");
  const rock = analysis.find((matchup) => matchup.type === "rock");

  // Fire/Flying is weak to Electric; Water/Ground is immune and can hit back.
  // The resistant count includes immune members as well as partial resistances.
  assert.deepEqual(electric, {
    type: "electric",
    weak: 1,
    resistant: 1,
    immune: 1,
    coverage: 1,
  });
  assert.equal(rock.weak, 1);
  assert.equal(rock.resistant, 1);
});

test("offensive coverage counts each partner once, even with two effective types", () => {
  const analysis = analyzeTeam([{ types: ["fire", "flying"] }]);
  const grass = analysis.find((matchup) => matchup.type === "grass");
  const rock = analysis.find((matchup) => matchup.type === "rock");

  // Both Fire and Flying beat Grass, but they belong to the same team member.
  assert.equal(grass.coverage, 1);
  assert.equal(rock.coverage, 0);
});

test("an empty team has no advantages or weaknesses", () => {
  for (const matchup of analyzeTeam([])) {
    assert.deepEqual(matchup, {
      type: matchup.type,
      weak: 0,
      resistant: 0,
      immune: 0,
      coverage: 0,
    });
  }
});

test("a classic starter team covers expected threats", () => {
  const starterIds = [1, 4, 7]; // Bulbasaur, Charmander, and Squirtle.
  const members = seed.filter((pokemon) => starterIds.includes(pokemon.id));
  const analysis = analyzeTeam(members);
  const grass = analysis.find((matchup) => matchup.type === "grass");
  const fire = analysis.find((matchup) => matchup.type === "fire");
  const water = analysis.find((matchup) => matchup.type === "water");

  assert.equal(grass.coverage, 2);
  assert.equal(fire.coverage, 1);
  assert.equal(water.coverage, 1);
});
