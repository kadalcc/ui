# Working on Kadal UI

This repository is Kadal UI (MIT): a power-user React data grid on TanStack Table v9 and
shadcn/ui (Base UI), shipped as a shadcn registry from ui.kadal.cc; the site that documents it;
and the `@kadal/ui` CLI. Using the grid in someone's project rather than changing it? Read
`skills/kadal-ui/SKILL.md` instead.

## Commands (Bun 1.3+, Node 20.19+)

```sh
bun install
bun run dev              # the site with live examples, http://localhost:5400
bun run typecheck        # tsc in apps/www (after gen:examples) and packages/cli
bun run lint             # oxlint apps packages tools
bun run test             # bun test in every workspace
bun run build            # packages/cli dist/, the registry JSON, the site (apps/www/dist)
bun run test:e2e         # Playwright (apps/www/e2e); builds and previews the site itself on :5410
cd apps/www && bun run registry:build   # shadcn build registry.json -o public/r
cd apps/www && bun run gen:examples     # ExampleHost.astro from registry/kadal/examples
```

TypeScript 7 (tsgo) is the compiler, so `astro check` is not available: typecheck is `tsc` over
the React and registry source, and the `.astro` files are checked by `astro build`.

## Map

| path | |
| --- | --- |
| `apps/www/registry/kadal/ui/data-grid` | the component, 21 files. `index.ts` and `data-grid.tsx` re-export everything. `use-data-grid.tsx` is the hook and every option; `data-grid-columns.tsx` the column builder (`createDataGridColumns`); `data-grid-table.tsx`, `-toolbar.tsx`, `-pagination.tsx`, `-filters.tsx`, `-editing.tsx`, `-cells.tsx`, `-column-header.tsx`, `-context.tsx` the parts; `-features.ts`, `-format.ts`, `-keyboard.ts`, `-export.ts`, `-persist.ts`, `-pinning.ts`, `-labels.ts`, `-types.ts`, `-utils.ts` the logic without JSX |
| `apps/www/registry/kadal/hooks/use-data-grid-url-state.ts` | the `data-grid-url-state` item (on nuqs) |
| `apps/www/registry/kadal/lib/data-grid-demo-data.ts` | seeded demo rows: `makePeople(n, seed)`, `STATUS_OPTIONS`, `PLAN_OPTIONS`, `Person` |
| `apps/www/registry/kadal/examples/*.tsx` | the live examples; `<Demo name="x" />` in a docs page renders `x.tsx` |
| `apps/www/registry.json` | the registry manifest: every item, its files, dependencies and `meta.version`. `shadcn build` reads it and writes `apps/www/public/r/*.json` (gitignored). The root `registry.json` only includes it |
| `apps/www/scripts/gen-examples.mjs` | generates `apps/www/src/components/docs/ExampleHost.astro`: the static imports Astro needs to hydrate an example by name |
| `apps/www/src/content/docs/docs/**/*.mdx` | the docs (Starlight); `apps/www/src/data/sidebar.mjs` is the navigation; `docs/writing-the-docs.md` says how a page is written |
| `apps/www/src/pages`, `components`, `layouts`, `demos` | the landing page, the playground and the sponsor page |
| `apps/www/wrangler.jsonc` | the `kadal-ui` Worker serving `dist/` at ui.kadal.cc (deploy.yml) |
| `packages/cli` | `@kadal/ui`: `src/bin.ts` (the commands), `src/index.ts` (the logic, with tests); built with tsdown |
| `tools/publish.mjs`, `tools/github-release.mjs` | the release workflow's publish and GitHub-release steps |
| `skills/kadal-ui`, `.claude-plugin/marketplace.json` | the Agent Skill and the Claude Code plugin marketplace that exposes it |
| `CHANGELOG.md`, `packages/cli/CHANGELOG.md` | the registry's changelog (written by hand) and the CLI's (written by changesets) |

## Rules

- Never edit `apps/www/public/r` or `apps/www/src/components/docs/ExampleHost.astro` by hand.
  Both are generated (`registry:build`, `gen:examples`); the first is gitignored.
- Every user-facing change to a registry item bumps its `meta.version` in `apps/www/registry.json`
  and gets an entry in the root `CHANGELOG.md`. A new file in the component is also a new entry in
  the item's `files`, or it won't ship.
- Examples import from `@/registry/kadal/...` (they run against this repo's source). Docs prose
  and code blocks show `@/components/ui/...` (where the files land in a user's project). Don't mix
  the two.
- `package.json` files must survive `npm pkg fix` unchanged (CI checks it; npm 11 drops `bin`
  paths that start with `./`).
- A user-facing CLI change gets a changeset (`bun run changeset`). The registry doesn't use
  changesets.
- British spelling in prose and docs (colour, licence, behaviour); plain voice, sentence-case
  headings, no emoji.
- `bun run format` is oxfmt over `apps`, `packages` and `tools`; `.astro` and `.mdx` are left
  alone.
