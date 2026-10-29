const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validateWorkspace } = require("../scripts/check-e2e-specs.cjs");

const projectRoot = path.resolve(__dirname, "..");
const pokedexFeature = "e2e/features/pokedex.feature";
const dexFlow = ".maestro/flows/DEX-001-browse-the-initial-collection.yaml";

// Copy only the validator's inputs. Each test can change its own files without
// touching the project or needing to restore fixtures before the next assertion.
function createWorkspace(testContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pokefolio-specs-"));
  testContext.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const entry of ["e2e/features", ".maestro", "app.json"]) {
    fs.cpSync(path.join(projectRoot, entry), path.join(root, entry), { recursive: true });
  }
  return root;
}

function editFile(root, file, transform) {
  const filename = path.join(root, file);
  const source = fs.readFileSync(filename, "utf8");
  fs.writeFileSync(filename, transform(source));
}

test("all specifications map to flows; manual cases are explicitly accounted for", () => {
  assert.deepEqual(validateWorkspace(projectRoot), { automated: 22, manual: 3, smoke: 6 });
});

test("duplicate scenario IDs are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, pokedexFeature, (source) => source.replace("@DEX-002", "@DEX-001"));

  assert.throws(() => validateWorkspace(root), /Duplicate scenario ID/);
});

test("automated scenarios require a flow", (testContext) => {
  const root = createWorkspace(testContext);
  fs.rmSync(path.join(root, dexFlow));

  assert.throws(() => validateWorkspace(root), /Missing flow for DEX-001/);
});

test("flows referencing an unknown scenario are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("scenarioId: DEX-001", "scenarioId: DEX-999"));

  assert.throws(() => validateWorkspace(root), /orphaned flow DEX-999/);
});

test("duplicate flow mappings are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  const duplicateFlow = dexFlow.replace(".yaml", "-copy.yaml");
  fs.copyFileSync(path.join(root, dexFlow), path.join(root, duplicateFlow));

  assert.throws(() => validateWorkspace(root), /Duplicate flow for DEX-001/);
});

test("flows referencing the wrong feature are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace(pokedexFeature, "e2e/features/teams.feature"));

  assert.throws(() => validateWorkspace(root), /wrong feature reference/);
});

test("stale scenario titles are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("DEX-001 Browse", "DEX-001 Old"));

  assert.throws(() => validateWorkspace(root), /stale scenario title/);
});

test("stale background step comments are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("# Given I open Pokéfolio", "# Given I reopen Pokéfolio"));

  assert.throws(() => validateWorkspace(root), /ordered Gherkin step comments/);
});

test("a step comment without any implementation is rejected", (testContext) => {
  const root = createWorkspace(testContext);
  // Keep the final step's comment but remove all commands that follow it.
  editFile(root, dexFlow, (source) => source.replace(
    /# And I can open Bulbasaur from its card[\s\S]*/,
    "# And I can open Bulbasaur from its card\n",
  ));

  assert.throws(() => validateWorkspace(root), /step has no commands/);
});

test("manual scenarios require an explicit reason", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, pokedexFeature, (source) => source.replace("# Manual reason:", "# Note:"));

  assert.throws(() => validateWorkspace(root), /manual scenario needs/);
});

test("manual scenarios cannot claim automated coverage", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("scenarioId: DEX-001", "scenarioId: MANUAL-001"));

  assert.throws(() => validateWorkspace(root), /manual scenarios must not have automated flows/);
});

test("invalid YAML fails parsing", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("properties:", "properties: ["));

  assert.throws(() => validateWorkspace(root), /YAML|flow|collection|sequence/i);
});

test("invalid Gherkin fails parsing", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, pokedexFeature, (source) => source.replace("Feature:", "Not a feature:"));

  assert.throws(() => validateWorkspace(root), /expected|Feature/i);
});

test("references to missing flow helpers are rejected", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("fresh-launch.yaml", "missing.yaml"));

  assert.throws(() => validateWorkspace(root), /missing runFlow file/);
});

test("flow tags must match Gherkin tags", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("- smoke", "- network"));

  assert.throws(() => validateWorkspace(root), /tags do not match/);
});

test("flow app IDs must match app.json", (testContext) => {
  const root = createWorkspace(testContext);
  editFile(root, dexFlow, (source) => source.replace("com.anonymous.pokefolio", "com.wrong.app"));

  assert.throws(() => validateWorkspace(root), /appId does not match/);
});
