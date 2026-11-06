# Contributing to Kadal UI

Thanks for helping. Bug reports with a small example that reproduces them (a column definition
and a handful of rows is usually enough) are the most useful thing you can send; pull requests
are welcome too.

## Setup

You need [Bun](https://bun.sh) 1.3+ (the workspace's package manager and test runner) and
Node 20.19+ (what the published CLI runs on, and what the scripts use).

```sh
git clone https://github.com/kadalcc/ui && cd ui
bun install
bun run dev            # the site, http://localhost:5400, with every docs example live
bun run typecheck      # tsc in apps/www and packages/cli
bun run lint           # oxlint
bun run test           # bun test in every workspace
bun run build          # the CLI's dist/, the registry JSON and the site (apps/www/dist)
bun run test:e2e       # Playwright (apps/www/e2e); builds and previews the site itself on :5410
```

Two scripts in `apps/www` you will run by hand:

- `bun run registry:build` — `shadcn build` writes the registry JSON into `public/r`, which is what
  `npx shadcn add @kadal/data-grid` downloads. `public/r` is gitignored; dev and build run this.
- `bun run gen:examples` — after adding an example in `apps/www/registry/kadal/examples`, so the
  docs can hydrate it by name (it regenerates `src/components/docs/ExampleHost.astro`; dev and
  build run it too).

## Layout

| path | |
| --- | --- |
| `apps/www/registry/kadal/ui/data-grid` | the component source: the truth about the API. `index.ts` and `data-grid.tsx` re-export everything |
| `apps/www/registry/kadal/hooks`, `lib` | the `data-grid-url-state` hook and the demo data |
| `apps/www/registry/kadal/examples` | the live examples; `<Demo name="data-grid-sorting" />` in a page renders `data-grid-sorting.tsx` |
| `apps/www/registry.json` | the registry manifest: each item's files, dependencies and `meta.version` |
| `apps/www/src/content/docs` | the docs pages (Starlight) |
| `packages/cli` | `@kadal/ui`, the CLI on npm |
| `tools/` | the release workflow's scripts |
| `skills/kadal-ui` | the Agent Skill |

## How the registry works

The data grid is not an npm package. `npx shadcn@latest add @kadal/data-grid` downloads
`https://ui.kadal.cc/r/data-grid.json` and copies the files in it into the user's project, where
they are the user's to edit. That JSON is built by `shadcn build` from `apps/www/registry.json`
and the source under `apps/www/registry/kadal/`. So, to change the grid:

1. Edit the source under `apps/www/registry/kadal/ui/data-grid`. A new file goes into the item's
   `files` in `apps/www/registry.json` as well, or it won't be shipped.
2. For any change a user would notice, bump the item's `meta.version` in `apps/www/registry.json`
   (semver: a fix is a patch, a new option a minor, a changed default or renamed prop a major).
3. Add an entry to the root [CHANGELOG.md](CHANGELOG.md) under `Data grid <version> — <date>`.
4. `cd apps/www && bun run registry:build` and check `public/r/data-grid.json` carries the change;
   CI does the same.

Examples import from `@/registry/kadal/...`, so they run against the source in this repo. The
docs prose shows `@/components/ui/...`, which is where the files land in a user's project. Keep
the two apart.

## Adding a docs page

[docs/writing-the-docs.md](docs/writing-the-docs.md) has it: where pages live
(`apps/www/src/content/docs/docs/**/*.mdx`), the sidebar (`apps/www/src/data/sidebar.mjs`), the
voice, and how a `<Demo>` hooks up an example.

## The CLI and changesets

`packages/cli` is `@kadal/ui` on npm. A user-facing change there gets a changeset
(`bun run changeset`); releases are cut from `main` by the release workflow, which opens a
"Version packages" PR and, once that is merged, publishes to npm with provenance and makes a
GitHub release. The registry does not use changesets: its versions are the `meta.version` fields
above, and its changelog is written by hand.

## Pull requests

- Keep them focused, with a test where the behaviour can be tested (`*.test.ts` beside the
  source; `bun test` runs them).
- A changeset for a user-facing CLI change; a `meta.version` bump and a changelog entry for a
  user-facing registry change.
- `bun run typecheck`, `bun run lint` and `bun run test` pass; `bun run format` before you push.
- Never hand-edit `apps/www/public/r` or `ExampleHost.astro`; both are generated.
- The pull request template asks what changed, why, and how you checked it.

## Questions

Usage questions and "how do I…" go to [GitHub Discussions](https://github.com/kadalcc/ui/discussions)
(the Q&A category), feedback to its Feedback category, and quick questions to `#kadal-ui` on the
[Kadal Discord](https://discord.gg/pdWcSbxNKa). Security reports: [SECURITY.md](SECURITY.md).

## Licence of contributions

Kadal UI is MIT ([LICENSE](LICENSE)); by contributing you agree your contribution is licensed
the same way.

## Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
