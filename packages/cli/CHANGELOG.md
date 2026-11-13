# @kadal/ui

## 0.1.2

### Patch Changes

- 4ef2baf: The npm page says who makes Kadal UI and links to Kadal's contact page and office in Chennai.

## 0.1.1

### Patch Changes

- 2e0b2ce: Published through npm trusted publishing from the repository's release workflow, so the package
  carries a provenance attestation that links the tarball on npm to the commit and workflow run in
  kadalcc/ui that built it. No change to the commands.

## 0.1.0

### Minor Changes

- The first release of the `kadal-ui` CLI, a zero-dependency wrapper around the shadcn CLI that
  knows the registry at ui.kadal.cc:
  - `kadal-ui init` points the project's `components.json` at the `@kadal` registry, running
    `shadcn init -b base` first when there is no `components.json`.
  - `kadal-ui add <item...>` copies items into your source (`data-grid`, `data-grid-url-state`,
    `data-grid-demo-data`), with `--yes`, `--overwrite`, `--dry-run` and `--path` passed through.
  - `kadal-ui list` shows everything in the registry (live, with a built-in list when offline);
    `kadal-ui docs <item>` prints or opens the docs page; `kadal-ui diff <item>` shows what changed
    between your copy and the registry; `kadal-ui info` says how the project is set up.
  - `kadal-ui mcp [--client <name>]` sets up the shadcn MCP server so an AI agent can add items.
  - Detects npm, pnpm, Yarn and Bun from the lockfile; `--json` on `list`, `docs` and `info`.
