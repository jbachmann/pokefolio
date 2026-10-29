const fs = require("node:fs");
const path = require("node:path");
const { Parser, AstBuilder, GherkinClassicTokenMatcher } = require("@cucumber/gherkin");
const { IdGenerator } = require("@cucumber/messages");
const YAML = require("yaml");

function filesIn(dir, extension) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(dir, entry.name);
    return entry.isDirectory()
      ? filesIn(filename, extension)
      : filename.endsWith(extension) ? [filename] : [];
  }).sort();
}

function readScenarios(root) {
  const scenarios = [];
  for (const filename of filesIn(path.join(root, "e2e/features"), ".feature")) {
    const source = fs.readFileSync(filename, "utf8");
    const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher());
    const document = parser.parse(source);
    if (!document.feature) throw new Error(filename + ": missing Feature");
    const background = document.feature.children.find((child) => child.background)?.background;
    for (const child of document.feature.children) {
      if (child.background) continue;
      const scenario = child.scenario;
      if (!scenario || scenario.examples.length) {
        throw new Error(filename + ": use explicit Scenarios, without Rules or Scenario Outlines");
      }
      const tags = [...document.feature.tags, ...scenario.tags].map((tag) => tag.name.slice(1));
      const ids = tags.filter((tag) => /^[A-Z]+-\d{3}$/.test(tag));
      if (ids.length !== 1) throw new Error(filename + ": each scenario needs exactly one stable ID");
      const manual = tags.includes("manual");
      const tagLine = Math.min(...scenario.tags.map((tag) => tag.location.line));
      const reason = document.comments.find((comment) =>
        comment.location.line === tagLine - 1 && /^\s*# Manual reason: \S/.test(comment.text));
      if (manual && !reason) throw new Error(ids[0] + ": manual scenario needs a preceding '# Manual reason: ...'");
      const steps = [...(background?.steps ?? []), ...scenario.steps].map((step) => step.keyword + step.text);
      if (!scenario.steps.length) throw new Error(ids[0] + ": scenario has no steps");
      scenarios.push({
        id: ids[0], name: scenario.name, manual, steps,
        tags: tags.filter((tag) => tag !== ids[0]),
        feature: path.relative(root, filename).split(path.sep).join("/"),
      });
    }
  }
  return scenarios;
}

function readYaml(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const documents = YAML.parseAllDocuments(source);
  const errors = documents.flatMap((document) => document.errors);
  if (errors.length) throw new Error(filename + ": " + errors.map((error) => error.message).join("; "));
  return { source, documents: documents.map((document) => document.toJSON()) };
}

function validateWorkspace(root) {
  const scenarios = readScenarios(root);
  const errors = [];
  const byId = new Map();
  for (const scenario of scenarios) {
    if (byId.has(scenario.id)) errors.push("Duplicate scenario ID: " + scenario.id);
    byId.set(scenario.id, scenario);
  }
  const mapped = new Set();
  const appId = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo.ios.bundleIdentifier;
  const flowDir = path.join(root, ".maestro/flows");
  const yamlFiles = filesIn(path.join(root, ".maestro"), ".yaml");
  for (const filename of yamlFiles) {
    const { source, documents } = readYaml(filename);
    const isFlow = filename.startsWith(flowDir + path.sep);
    if (filename === path.join(root, ".maestro/config.yaml")) continue;
    const [header, commands] = documents;
    if (documents.length !== 2 || !Array.isArray(commands) || !commands.length) {
      errors.push(filename + ": expected a header and nonempty command list");
      continue;
    }
    if (header.appId !== appId) errors.push(filename + ": appId does not match app.json");
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      if (value.runFlow) {
        const file = typeof value.runFlow === "string" ? value.runFlow : value.runFlow.file;
        if (file && !fs.existsSync(path.resolve(path.dirname(filename), file))) {
          errors.push(filename + ": missing runFlow file " + file);
        }
      }
      Object.values(value).forEach(visit);
    };
    visit(commands);
    if (!isFlow) continue;
    const id = header.properties?.scenarioId;
    const scenario = byId.get(id);
    if (!scenario) { errors.push(filename + ": orphaned flow " + id); continue; }
    if (mapped.has(id)) errors.push("Duplicate flow for " + id);
    mapped.add(id);
    if (scenario.manual) errors.push(id + ": manual scenarios must not have automated flows");
    if (!path.basename(filename).startsWith(id + "-")) errors.push(id + ": filename must start with scenario ID");
    if (header.name !== id + " " + scenario.name) errors.push(id + ": stale scenario title");
    if (header.properties.feature !== scenario.feature) errors.push(id + ": wrong feature reference");
    const expectedTags = scenario.tags.filter((tag) => tag !== "manual").sort();
    if (JSON.stringify([...(header.tags ?? [])].sort()) !== JSON.stringify(expectedTags)) {
      errors.push(id + ": flow tags do not match Gherkin tags");
    }
    const comments = [...source.matchAll(/^# ((?:Given|When|Then|And|But) .+)$/gm)];
    if (JSON.stringify(comments.map((match) => match[1])) !== JSON.stringify(scenario.steps)) {
      errors.push(id + ": stale or missing ordered Gherkin step comments");
    }
    comments.forEach((match, index) => {
      const end = comments[index + 1]?.index ?? source.length;
      if (!/^- \w/m.test(source.slice(match.index + match[0].length, end))) {
        errors.push(id + ": step has no commands: " + match[1]);
      }
    });
  }
  for (const scenario of scenarios) {
    if (!scenario.manual && !mapped.has(scenario.id)) errors.push("Missing flow for " + scenario.id);
  }
  const config = readYaml(path.join(root, ".maestro/config.yaml")).documents[0];
  if (JSON.stringify(config.flows) !== JSON.stringify(["flows/*.yaml"])) {
    errors.push("config.yaml must discover only flows/*.yaml, excluding helpers");
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    automated: scenarios.filter((scenario) => !scenario.manual).length,
    manual: scenarios.filter((scenario) => scenario.manual).length,
    smoke: scenarios.filter((scenario) => scenario.tags.includes("smoke") && !scenario.manual).length,
  };
}

if (require.main === module) {
  try {
    const result = validateWorkspace(path.resolve(__dirname, ".."));
    console.log("Gherkin ↔ Maestro: " + result.automated + " automated, " + result.smoke + " smoke, " + result.manual + " manual (not executed).");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateWorkspace, readScenarios };
