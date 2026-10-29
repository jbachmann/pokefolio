const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validateWorkspace } = require("../scripts/check-e2e-specs.cjs");

const project = path.resolve(__dirname, "..");
function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pokefolio-specs-"));
  for (const entry of ["e2e/features", ".maestro", "app.json"]) {
    fs.cpSync(path.join(project, entry), path.join(root, entry), { recursive: true });
  }
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function edit(root, file, transform) {
  const filename = path.join(root, file);
  fs.writeFileSync(filename, transform(fs.readFileSync(filename, "utf8")));
}
const dexFlow = ".maestro/flows/DEX-001-browse-the-initial-collection.yaml";

test("all specifications map to flows; manual cases are explicitly accounted for", () => {
  assert.deepEqual(validateWorkspace(project), { automated: 22, manual: 3, smoke: 6 });
});
test("duplicate scenario IDs are rejected", (t) => {
  const root = workspace(t);
  edit(root, "e2e/features/pokedex.feature", (s) => s.replace("@DEX-002", "@DEX-001"));
  assert.throws(() => validateWorkspace(root), /Duplicate scenario ID/);
});
test("missing and orphaned flows are rejected", (t) => {
  const root = workspace(t);
  fs.renameSync(path.join(root, dexFlow), path.join(root, dexFlow + ".bak"));
  assert.throws(() => validateWorkspace(root), /Missing flow for DEX-001/);
  fs.renameSync(path.join(root, dexFlow + ".bak"), path.join(root, dexFlow));
  edit(root, dexFlow, (s) => s.replace("scenarioId: DEX-001", "scenarioId: DEX-999"));
  assert.throws(() => validateWorkspace(root), /orphaned flow DEX-999/);
});
test("duplicate flow mappings are rejected", (t) => {
  const root = workspace(t);
  fs.copyFileSync(path.join(root, dexFlow), path.join(root, dexFlow.replace(".yaml", "-copy.yaml")));
  assert.throws(() => validateWorkspace(root), /Duplicate flow for DEX-001/);
});
test("wrong feature paths and stale titles are rejected", (t) => {
  const root = workspace(t);
  edit(root, dexFlow, (s) => s.replace("e2e/features/pokedex.feature", "e2e/features/teams.feature"));
  assert.throws(() => validateWorkspace(root), /wrong feature reference/);
  edit(root, dexFlow, (s) => s.replace("e2e/features/teams.feature", "e2e/features/pokedex.feature").replace("DEX-001 Browse", "DEX-001 Old"));
  assert.throws(() => validateWorkspace(root), /stale scenario title/);
});
test("stale or reordered background and scenario comments are rejected", (t) => {
  const root = workspace(t);
  edit(root, dexFlow, (s) => s.replace("# Given I open Pokéfolio", "# Given I reopen Pokéfolio"));
  assert.throws(() => validateWorkspace(root), /ordered Gherkin step comments/);
});
test("a step comment without any implementation is rejected", (t) => {
  const root = workspace(t);
  edit(root, dexFlow, (s) => s.replace(/# And I can open Bulbasaur from its card[\s\S]*/, "# And I can open Bulbasaur from its card\n"));
  assert.throws(() => validateWorkspace(root), /step has no commands/);
});
test("manual cases require reasons and cannot claim automated coverage", (t) => {
  const root = workspace(t);
  edit(root, "e2e/features/pokedex.feature", (s) => s.replace("# Manual reason:", "# Note:"));
  assert.throws(() => validateWorkspace(root), /manual scenario needs/);
  edit(root, "e2e/features/pokedex.feature", (s) => s.replace("# Note:", "# Manual reason:"));
  edit(root, dexFlow, (s) => s.replace("scenarioId: DEX-001", "scenarioId: MANUAL-001"));
  assert.throws(() => validateWorkspace(root), /manual scenarios must not have automated flows/);
});
test("invalid Gherkin and YAML fail parsing", (t) => {
  const root = workspace(t);
  edit(root, dexFlow, (s) => s.replace("properties:", "properties: ["));
  assert.throws(() => validateWorkspace(root), /YAML|flow|collection|sequence/i);
  fs.copyFileSync(path.join(project, dexFlow), path.join(root, dexFlow));
  edit(root, "e2e/features/pokedex.feature", (s) => s.replace("Feature:", "Not a feature:"));
  assert.throws(() => validateWorkspace(root), /expected|Feature/i);
});
test("broken helpers, tag drift, and incorrect app IDs fail validation", (t) => {
  const root = workspace(t);
  edit(root, dexFlow, (s) => s.replace("fresh-launch.yaml", "missing.yaml"));
  assert.throws(() => validateWorkspace(root), /missing runFlow file/);
  fs.copyFileSync(path.join(project, dexFlow), path.join(root, dexFlow));
  edit(root, dexFlow, (s) => s.replace("- smoke", "- network"));
  assert.throws(() => validateWorkspace(root), /tags do not match/);
  fs.copyFileSync(path.join(project, dexFlow), path.join(root, dexFlow));
  edit(root, dexFlow, (s) => s.replace("com.anonymous.pokefolio", "com.wrong.app"));
  assert.throws(() => validateWorkspace(root), /appId does not match/);
});
