const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateWorkspace } = require("./check-e2e-specs.cjs");

const root = path.resolve(__dirname, "..");

function parseOptions(argv) {
  const options = { smoke: false };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--smoke") {
      options.smoke = true;
    } else if (["--flow", "--device"].includes(argument) && argv[index + 1]) {
      options[argument.slice(2)] = argv[++index];
    } else {
      throw new Error("Usage: npm run test:e2e -- [--smoke] [--flow SCENARIO-ID] [--device UDID]");
    }
  }
  return options;
}

// Artwork animations keep Maestro from settling. Use the app's existing
// accessibility behavior and return a cleanup function for the caller's finally.
function enableReduceMotion(device) {
  const target = device ?? "booted";
  function runDefaults(action, ...values) {
    return spawnSync("xcrun", [
      "simctl", "spawn", target, "defaults", action,
      "com.apple.Accessibility", "ReduceMotionEnabled", ...values,
    ], { encoding: "utf8" });
  }

  const previous = runDefaults("read");
  // null means the preference was unset; restore that by deleting the override.
  const previousValue = previous.status === 0 ? previous.stdout.trim() : null;
  if (previousValue !== null && !["0", "1"].includes(previousValue)) {
    throw new Error(`Unexpected Reduce Motion preference: ${previousValue}`);
  }

  const prepared = runDefaults("write", "-bool", "true");
  if (prepared.status !== 0) {
    throw new Error(`Could not configure the booted iOS simulator. ${prepared.stderr}`);
  }
  console.log("Temporarily enabling Reduce Motion on the test simulator; the previous preference will be restored.");

  return () => {
    const restored = previousValue === null
      ? runDefaults("delete")
      : runDefaults("write", "-bool", previousValue === "1" ? "true" : "false");
    if (restored.status !== 0) {
      console.error(`Could not restore the simulator's Reduce Motion preference: ${restored.stderr}`);
      process.exitCode = 1;
    }
  };
}

function main() {
  let restoreMotion = () => {};
  try {
    validateWorkspace(root);
    const options = parseOptions(process.argv.slice(2));
    const suite = options.flow ?? (options.smoke ? "smoke" : "full");
    const flows = fs.readdirSync(path.join(root, ".maestro/flows"));
    const selectedFlow = options.flow && flows.find((file) => file.startsWith(`${options.flow}-`));
    if (options.flow && !selectedFlow) throw new Error(`No automated flow for ${options.flow}`);

    // Keep reports and debug output separate for full, smoke, and single-flow runs.
    const outputDirectory = path.join(root, "artifacts/maestro", suite);
    fs.mkdirSync(outputDirectory, { recursive: true });
    const args = [
      "test", selectedFlow ? `.maestro/flows/${selectedFlow}` : ".maestro",
      "--format", "junit",
      "--output", path.join(outputDirectory, "report.xml"),
      "--test-output-dir", outputDirectory,
      "--debug-output", path.join(outputDirectory, "debug"),
      "--test-suite-name", `Pokéfolio ${suite}`,
    ];
    if (options.smoke) args.push("--include-tags", "smoke");
    if (options.device) args.push("--device", options.device);

    if (process.platform === "darwin") {
      restoreMotion = enableReduceMotion(options.device);
    }
    const result = spawnSync("maestro", args, {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        MAESTRO_CLI_NO_ANALYTICS: "1",
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
      },
    });
    if (result.error) {
      throw new Error(
        "Could not start Maestro. Install CLI 2.12.0 and Java 21, and add maestro to PATH. " + result.error.message,
      );
    }
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    // Restore the simulator preference even when Maestro fails to start or test.
    restoreMotion();
  }
}

main();
