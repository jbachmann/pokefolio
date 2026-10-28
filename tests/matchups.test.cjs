const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");

// Load the app's pure TypeScript module without a separate test dependency.
require.extensions[".ts"] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  module._compile(source, filename);
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
  for (const attack of TYPES)
    for (const defense of TYPES) {
      assert([0, 0.5, 1, 2].includes(effectiveness(attack, [defense])));
    }
});
test("team defense counts weaknesses, resistances and immunities separately", () => {
  const members = [
    { types: ["fire", "flying"] },
    { types: ["water", "ground"] },
  ];
  const analysis = analyzeTeam(members);
  assert.deepEqual(
    analysis.find((t) => t.type === "electric"),
    {
      type: "electric",
      weak: 1,
      resistant: 1,
      immune: 1,
      coverage: 1,
    },
  );
  assert.equal(analysis.find((t) => t.type === "rock").weak, 1);
  assert.equal(analysis.find((t) => t.type === "rock").resistant, 1);
});
test("offensive coverage counts each partner once, even with two effective types", () => {
  const analysis = analyzeTeam([{ types: ["fire", "flying"] }]);
  assert.equal(analysis.find((t) => t.type === "grass").coverage, 1);
  assert.equal(analysis.find((t) => t.type === "rock").coverage, 0);
});
test("an empty team has no advantages or weaknesses", () => {
  for (const row of analyzeTeam([])) {
    assert.equal(row.weak + row.resistant + row.immune + row.coverage, 0);
  }
});
test("a classic starter team covers expected threats", () => {
  const analysis = analyzeTeam(seed.filter((p) => [1, 4, 7].includes(p.id)));
  assert.equal(analysis.find((t) => t.type === "grass").coverage, 2);
  assert.equal(analysis.find((t) => t.type === "fire").coverage, 1);
  assert.equal(analysis.find((t) => t.type === "water").coverage, 1);
});
