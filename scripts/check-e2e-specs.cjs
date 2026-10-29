const fs = require("node:fs");
const path = require("node:path");
const { isDeepStrictEqual } = require("node:util");
const { Parser, AstBuilder, GherkinClassicTokenMatcher } = require("@cucumber/gherkin");
const { IdGenerator } = require("@cucumber/messages");
const YAML = require("yaml");

// Include nested folders, with a stable order for validation messages.
function findFiles(directory, extension) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(filename, extension));
    } else if (filename.endsWith(extension)) {
      files.push(filename);
    }
  }
  return files.sort();
}

// Gherkin is the source of truth for scenario IDs, titles, tags, and steps.
function readScenarios(root) {
  const scenarios = [];
  for (const filename of findFiles(path.join(root, "e2e/features"), ".feature")) {
    const source = fs.readFileSync(filename, "utf8");
    const parser = new Parser(
      new AstBuilder(IdGenerator.incrementing()),
      new GherkinClassicTokenMatcher(),
    );
    const { feature, comments } = parser.parse(source);
    if (!feature) throw new Error(`${filename}: missing Feature`);

    const background = feature.children.find((child) => child.background)?.background;
    for (const child of feature.children) {
      if (child.background) continue;
      const scenario = child.scenario;
      if (!scenario || scenario.examples.length) {
        throw new Error(`${filename}: use explicit Scenarios, without Rules or Scenario Outlines`);
      }

      const tags = [...feature.tags, ...scenario.tags].map((tag) => tag.name.slice(1));
      const scenarioIds = tags.filter((tag) => /^[A-Z]+-\d{3}$/.test(tag));
      if (scenarioIds.length !== 1) {
        throw new Error(`${filename}: each scenario needs exactly one stable ID`);
      }
      const [id] = scenarioIds;
      const manual = tags.includes("manual");

      // A manual reason must sit immediately above the scenario's first tag.
      if (manual) {
        const firstTagLine = Math.min(...scenario.tags.map((tag) => tag.location.line));
        const hasReason = comments.some((comment) =>
          comment.location.line === firstTagLine - 1 && /^\s*# Manual reason: \S/.test(comment.text));
        if (!hasReason) {
          throw new Error(`${id}: manual scenario needs a preceding '# Manual reason: ...'`);
        }
      }

      if (!scenario.steps.length) throw new Error(`${id}: scenario has no steps`);
      // Background steps run before every scenario and need flow comments too.
      const steps = [...(background?.steps ?? []), ...scenario.steps].map((step) => step.keyword + step.text);
      scenarios.push({
        id,
        name: scenario.name,
        manual,
        steps,
        tags: tags.filter((tag) => tag !== id),
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
  if (errors.length) {
    throw new Error(`${filename}: ${errors.map((error) => error.message).join("; ")}`);
  }
  return { source, documents: documents.map((document) => document.toJSON()) };
}

function validateRunFlowFiles(value, filename, errors) {
  if (!value || typeof value !== "object") return;

  // runFlow accepts either a filename or an object containing a file field.
  if (value.runFlow) {
    const file = typeof value.runFlow === "string" ? value.runFlow : value.runFlow.file;
    if (file && !fs.existsSync(path.resolve(path.dirname(filename), file))) {
      errors.push(`${filename}: missing runFlow file ${file}`);
    }
  }

  // Commands can be nested inside conditionals, repeats, and inline flows.
  for (const child of Object.values(value)) {
    validateRunFlowFiles(child, filename, errors);
  }
}

function validateStepComments(source, scenario, errors) {
  const comments = [...source.matchAll(/^# ((?:Given|When|Then|And|But) .+)$/gm)];
  const commentedSteps = comments.map((match) => match[1]);
  if (!isDeepStrictEqual(commentedSteps, scenario.steps)) {
    errors.push(`${scenario.id}: stale or missing ordered Gherkin step comments`);
  }

  // Each step's comment must be followed by a command before the next step.
  comments.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = comments[index + 1]?.index ?? source.length;
    if (!/^- \w/m.test(source.slice(start, end))) {
      errors.push(`${scenario.id}: step has no commands: ${match[1]}`);
    }
  });
}

function validateWorkspace(root) {
  const scenarios = readScenarios(root);
  const errors = [];
  const scenariosById = new Map();
  for (const scenario of scenarios) {
    if (scenariosById.has(scenario.id)) errors.push(`Duplicate scenario ID: ${scenario.id}`);
    scenariosById.set(scenario.id, scenario);
  }

  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const appId = app.expo.ios.bundleIdentifier;
  const flowsDirectory = path.join(root, ".maestro/flows");
  const configFilename = path.join(root, ".maestro/config.yaml");
  const mappedScenarioIds = new Set();

  for (const filename of findFiles(path.join(root, ".maestro"), ".yaml")) {
    const { source, documents } = readYaml(filename);
    if (filename === configFilename) continue;

    // Both scenario flows and shared helpers use a header, then commands.
    const [header, commands] = documents;
    if (documents.length !== 2 || !Array.isArray(commands) || !commands.length) {
      errors.push(`${filename}: expected a header and nonempty command list`);
      continue;
    }
    if (header.appId !== appId) errors.push(`${filename}: appId does not match app.json`);
    validateRunFlowFiles(commands, filename, errors);

    // Helpers are reusable commands; only files in flows/ map to scenarios.
    const isFlow = filename.startsWith(flowsDirectory + path.sep);
    if (!isFlow) continue;
    const id = header.properties?.scenarioId;
    const scenario = scenariosById.get(id);
    if (!scenario) {
      errors.push(`${filename}: orphaned flow ${id}`);
      continue;
    }

    if (mappedScenarioIds.has(id)) errors.push(`Duplicate flow for ${id}`);
    mappedScenarioIds.add(id);
    if (scenario.manual) errors.push(`${id}: manual scenarios must not have automated flows`);
    if (!path.basename(filename).startsWith(`${id}-`)) {
      errors.push(`${id}: filename must start with scenario ID`);
    }
    if (header.name !== `${id} ${scenario.name}`) errors.push(`${id}: stale scenario title`);
    if (header.properties.feature !== scenario.feature) errors.push(`${id}: wrong feature reference`);

    // Tag order is irrelevant, but Gherkin step order must match exactly.
    const expectedTags = scenario.tags.filter((tag) => tag !== "manual").sort();
    const actualTags = [...(header.tags ?? [])].sort();
    if (!isDeepStrictEqual(actualTags, expectedTags)) {
      errors.push(`${id}: flow tags do not match Gherkin tags`);
    }
    validateStepComments(source, scenario, errors);
  }

  for (const scenario of scenarios) {
    if (!scenario.manual && !mappedScenarioIds.has(scenario.id)) {
      errors.push(`Missing flow for ${scenario.id}`);
    }
  }

  const config = readYaml(configFilename).documents[0];
  if (!isDeepStrictEqual(config.flows, ["flows/*.yaml"])) {
    errors.push("config.yaml must discover only flows/*.yaml, excluding helpers");
  }
  // Report all coverage mismatches together so they can be fixed in one pass.
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
    console.log(
      `Gherkin ↔ Maestro: ${result.automated} automated, ${result.smoke} smoke, ${result.manual} manual (not executed).`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateWorkspace, readScenarios };
