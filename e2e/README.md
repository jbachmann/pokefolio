# End-user behavior tests

The five [Gherkin features](features/) describe 22 automated scenarios and three
manual network-recovery scenarios. Maestro executes the YAML in
[`.maestro/flows/`](../.maestro/flows/). Six scenarios carry the `smoke` tag.
The suite targets the standalone iOS Release app, with real PokéAPI responses.

## Local setup and execution

Use Node 24, npm, Xcode with an installed iOS Simulator runtime, Java 21, and
**Maestro CLI 2.12.0**. Install Java from [Temurin](https://adoptium.net/temurin/releases/?version=21)
and set `JAVA_HOME` to that installation. Install the pinned Maestro release:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
curl -fL https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.12.0/maestro.zip -o /tmp/pokefolio-maestro.zip
mkdir -p /tmp/pokefolio-maestro-cli
unzip -q /tmp/pokefolio-maestro.zip -d /tmp/pokefolio-maestro-cli
export PATH="/tmp/pokefolio-maestro-cli/maestro/bin:$PATH"
java -version
maestro --version
npm ci
xcrun simctl list devices available
```

Choose an iPhone simulator UDID, then build and install the app:

```sh
npm run ios:release -- --device "<UDID>" --no-bundler
npm run test:e2e:specs
npm run test:e2e:smoke -- --device "<UDID>"
npm run test:e2e -- --device "<UDID>"
npm run test:e2e -- --flow TEAM-007 --device "<UDID>"
```

The build generates native projects through Expo. Do not edit generated native
files. The Release app contains its JavaScript bundle and needs no Metro server.
Local builds are explicitly authorized for this suite and its GitHub workflow.
The first native build can take several minutes.
Keep the simulator's software keyboard enabled: search submits through its
visible Search key. If necessary, use Simulator's I/O → Keyboard controls.

Use a simulator dedicated to testing: **each automated scenario clears all app
data**, including favorites, teams, and API caches. Every scenario builds its
own prerequisites through visible UI actions. Persistence scenarios restart
without clearing data within the same flow. Helpers are never discovered as
standalone tests. Run only one Maestro process per simulator.

The npm runner temporarily enables the simulator's **Reduce Motion** preference
and restores its previous value when the run exits. The app already respects
this accessibility setting. This keeps its perpetual artwork animation from
preventing Maestro from settling; the suite therefore verifies behavior with
reduced motion. Normal-motion animation appearance is not an acceptance check.
Direct `maestro test` invocations bypass this preparation.

Reports, diagnostics, and screenshots go under
`artifacts/maestro/<full|smoke|SCENARIO-ID>/`; `report.xml` is the JUnit report.
Artifacts are gitignored. Scenarios use up to 10 seconds for local transitions
and short scrolling, and up to 120 seconds for required remote content. Traversing
the long type-chart and team-analysis pages has a 30-second bound. Directory
traversal to its pagination footer or back to its controls allows 60 seconds. Internet access
to PokéAPI and artwork hosts is expected; a real API failure fails the affected
scenario. There are no mocked responses or automatic whole-flow retries.

## Keeping specifications and flows connected

1. Change the feature specification first. Keep stable scenario IDs such as
   `@TEAM-007`, even when renaming a scenario.
2. Keep exactly one YAML in `.maestro/flows/` per automated scenario, named
   `SCENARIO-ID-descriptive-title.yaml`.
3. Match the YAML `name` to `ID + space + Scenario title`. Set
   `properties.scenarioId` and `properties.feature`, and match its Gherkin tags.
   Custom properties also attach the ID and feature reference to JUnit results.
4. Copy the Background and Scenario steps, in order, as top-level
   `# Given ...`, `# When ...`, `# Then ...`, and `# And ...` comments.
   Implement each step directly below its comment, optionally with a helper.
5. Run `npm run test:e2e:specs` and `npm test`, then the affected Maestro flow.

The checker parses Gherkin and both YAML documents. It rejects missing,
duplicate, and orphaned mappings; title, tag, path, and comment drift; empty step
implementations; invalid syntax; broken helper references; and accidental helper
discovery. It validates structural traceability, not whether assertions correctly
express each behavior: review those together with the specification.

Selectors use visible text and accessibility labels where unambiguous.
Repeated elements and numerical cells have stable `testID` values. Avoid
coordinates, fixed sleeps, and storage seeding. Verify success using the saved
roster or favorites; notification disappearance is only a settling condition.

## GitHub Actions

[`e2e.yml`](../.github/workflows/e2e.yml) runs lint, typecheck, unit/checker tests,
and specification validation before the native job. The macOS 26 job installs
Node 24, Java 21, and pinned Maestro 2.12.0, chooses an available iPhone on the
newest installed iOS runtime, and builds the Release app locally using Expo.
No signing account, EAS project, or EXPO_TOKEN is required.

Pull requests run the six smoke scenarios. Pushes to `main` and manual workflow
runs execute all 22 automated scenarios. Superseded runs are cancelled. Build
logs and available Maestro reports/diagnostics/screenshots are uploaded even
after failure, with 14-day retention. A manual workflow run still excludes the
three scenarios tagged `@manual`: those require the procedure below.

## Manual outage and recovery

Maestro's [airplane-mode command](https://docs.maestro.dev/reference/commands-available/setairplanemode)
does nothing on iOS simulators. These three specifications are deliberately
manual, have a reason in their feature file, and have no automated YAML.

Use an HTTPS debugging proxy with manual request-blocking controls, such as
Charles or Proxyman. Configure the simulator to use that proxy, install and
trust its certificate in the simulator, and enable HTTPS inspection for
`pokeapi.co:443`. Confirm a successful request to
`https://pokeapi.co/api/v2/pokemon/25` appears in the proxy.

For each case:

1. Clear the app's data while retaining its installed Release binary:
   `maestro test .maestro/helpers/reset-app.yaml --device "<UDID>"`.
   Do this anew for every case: both on-device and in-memory caches can otherwise
   hide the outage. A process restart alone does not clear the seven-day cache.
2. In the proxy, block or abort **all requests to `pokeapi.co`**, including
   in-flight requests. Leave artwork hosts and unrelated host traffic alone.
   From simulator Safari, request the URL above and confirm failure; confirm
   the blocked request in the proxy log.
3. Return to Pokéfolio and perform the relevant case below. Allow the app's
   18-second request timeout to expire if the proxy drops rather than rejects.
4. Disable blocking, verify the same Safari request succeeds, return to
   Pokéfolio, and use the visible retry control.
5. Record the outcome and restore the original proxy/network configuration.

| ID | Actions and expected outcomes |
| --- | --- |
| MANUAL-001 | Search for Pikachu. The placeholder is followed by “Some Pokémon are still out exploring…” and “Try again.” Restore access and tap retry; the loaded card can open Pikachu. |
| MANUAL-002 | Run `xcrun simctl openurl "<UDID>" pokefolio://pokemon/25`. Expect “We couldn’t find this Pokémon right now…” and “Try again.” Restore access and retry; Pikachu's details load. The deep link avoids having to load its directory card first. |
| MANUAL-003 | Open bundled Bulbasaur. Its stats remain available while “Evolution notes couldn’t be loaded.” appears. Restore access and use the evolution section's “Try again”; the family loads. |

Record manual results with scenario ID, date, app commit, simulator/iOS version,
proxy blocking method, pass/fail, and relevant screenshot/log references.
**Initial status: all three manual scenarios are not executed.**

Android execution, snapshot comparisons, automatic proxy control, and EAS
configuration are outside this suite.
