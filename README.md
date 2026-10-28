# Pokéfolio

A mobile-first Pokémon field guide built with Expo SDK 58, React Native, and Expo Router. Forest green, warm ivory, official Pokémon artwork, and gentle motion make browsing feel like a little adventure.

## Run

Requires Node.js 20.19+ and npm.

    npm install
    npm start

Use the Expo terminal to open iOS, Android, or web. For a web-only preview:

    npm run web

## Explore

- Browse all 1,025 Pokémon species. Search by name or Pokédex number, filter by type and generation, sort, or switch between grid and list views.
- Save favorites on your device.
- Open a Pokémon to see its base stats, abilities, size, English field notes, type weaknesses, and evolution family, including branches and evolution conditions.
- Create and rename multiple teams, add up to six unique Pokémon, and remove partners or delete a team.
- Explore team offensive coverage, defensive risks, individual multipliers, immunities, and combined base stats.
- Use the interactive 18-type matchup chart.
- Animations respect reduced-motion settings. Artwork uses Expo Image caching, and directory cards use a virtualized list.

## Data and storage

Data comes from [PokéAPI v2](https://pokeapi.co/docs/v2/). The app bundles a compact species index, the first 24 entries, and current-generation type data for immediate browsing. Other Pokémon, species descriptions, and evolution chains load on demand. Requests are deduplicated, fetched in batches of at most six, and cached locally for seven days. Pokémon detail responses are reduced before storage.

Teams and favorites use AsyncStorage and stay on the current device/browser. There is no account or cloud sync. Uncached data and remote artwork require a connection; failures offer retry controls.

Team defense multiplies both defending types, preserving 4× weaknesses, ¼× resistances, and 0× immunities. Resistance counts include immunities. Offensive coverage considers the best matchup from each member's own types against a single defending type. Analysis excludes movesets, abilities, items, and battle conditions, so it is a type-planning guide rather than a battle simulator.

## Checks

    npm run lint
    npm run typecheck
    npm test

The matchup tests cover all 324 single-type pairs, dual-type multipliers, immunity precedence, aggregate team defense, offensive coverage, and empty teams.

    npx expo export --platform web
    npx expo serve

The existing server web output uses Expo SDK 58 server rendering. Hosting the web export requires a server runtime. Native projects use Continuous Native Generation; configure native behavior in app.json rather than creating ios/ or android/ manually.

## Project

- src/app/ — Expo Router screens
- src/components/ — reusable interface, artwork cards, and animations
- src/lib/api.ts — cached PokéAPI access and compact data models
- src/lib/matchups.ts — pure type and team calculations
- src/lib/theme.ts — shared visual tokens
- src/providers/store.tsx — saved collection and team picker
- tests/ — matchup regression checks

## Credits

Pokémon names, artwork, and related marks belong to Nintendo, Game Freak, and The Pokémon Company. Official artwork is served from [PokéAPI's sprites repository](https://github.com/PokeAPI/sprites). This is an unofficial fan project.

DM Sans and Outfit are distributed under the SIL Open Font License; their licenses are included in assets/fonts/.
