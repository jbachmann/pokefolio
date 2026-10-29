const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateWorkspace } = require("./check-e2e-specs.cjs");

const root = path.resolve(__dirname, "..");
let restoreMotion = () => {};
try {
  validateWorkspace(root);
  const options = { smoke: false };
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--smoke") options.smoke = true;
    else if (["--flow", "--device"].includes(argv[index]) && argv[index + 1]) {
      options[argv[index].slice(2)] = argv[++index];
    } else throw new Error("Usage: npm run test:e2e -- [--smoke] [--flow SCENARIO-ID] [--device UDID]");
  }
  const suite = options.flow ?? (options.smoke ? "smoke" : "full");
  const flows = fs.readdirSync(path.join(root, ".maestro/flows"));
  const selected = options.flow && flows.find((file) => file.startsWith(options.flow + "-"));
  if (options.flow && !selected) throw new Error("No automated flow for " + options.flow);
  const output = path.join(root, "artifacts/maestro", suite);
  fs.mkdirSync(output, { recursive: true });
  const args = [
    "test", selected ? ".maestro/flows/" + selected : ".maestro",
    "--format", "junit", "--output", output + "/report.xml",
    "--test-output-dir", output, "--debug-output", output + "/debug",
    "--test-suite-name", "Pokéfolio " + suite,
  ];
  if (options.smoke) args.push("--include-tags", "smoke");
  if (options.device) args.push("--device", options.device);
  // Exercise the existing accessibility preference, without app-specific hooks.
  // Perpetual artwork animation otherwise prevents Maestro from settling.
  if (process.platform === "darwin") {
    const target = options.device ?? "booted";
    const defaults = ["simctl", "spawn", target, "defaults"];
    const previous = spawnSync("xcrun", [...defaults, "read", "com.apple.Accessibility", "ReduceMotionEnabled"], { encoding: "utf8" });
    const value = previous.status === 0 ? previous.stdout.trim() : null;
    if (value !== null && !["0", "1"].includes(value)) throw new Error("Unexpected Reduce Motion preference: " + value);
    const prepared = spawnSync("xcrun", [...defaults, "write", "com.apple.Accessibility", "ReduceMotionEnabled", "-bool", "true"], { encoding: "utf8" });
    if (prepared.status !== 0) throw new Error("Could not configure the booted iOS simulator. " + prepared.stderr);
    restoreMotion = () => {
      const command = value === null
        ? [...defaults, "delete", "com.apple.Accessibility", "ReduceMotionEnabled"]
        : [...defaults, "write", "com.apple.Accessibility", "ReduceMotionEnabled", "-bool", value === "1" ? "true" : "false"];
      const restored = spawnSync("xcrun", command, { encoding: "utf8" });
      if (restored.status !== 0) {
        console.error("Could not restore the simulator's Reduce Motion preference: " + restored.stderr);
        process.exitCode = 1;
      }
    };
    console.log("Temporarily enabling Reduce Motion on the test simulator; the previous preference will be restored.");
  }
  const result = spawnSync("maestro", args, {
    cwd: root, stdio: "inherit",
    env: { ...process.env, MAESTRO_CLI_NO_ANALYTICS: "1", MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true" },
  });
  if (result.error) throw new Error("Could not start Maestro. Install CLI 2.12.0 and Java 21, and add maestro to PATH. " + result.error.message);
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  restoreMotion();
}
