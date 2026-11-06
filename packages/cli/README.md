# @kadal/ui

> **Kadal UI** — power-user React components you own, from a shadcn registry. This is its CLI.
>
> [Docs](https://ui.kadal.cc/docs/) · [The data grid](https://ui.kadal.cc/docs/data-grid/) · [Source](https://github.com/kadalcc/ui)

[![npm](https://img.shields.io/npm/v/@kadal/ui?color=0e7490)](https://www.npmjs.com/package/@kadal/ui)
[![downloads](https://img.shields.io/npm/dm/@kadal/ui?color=0e7490)](https://www.npmjs.com/package/@kadal/ui)
[![CI](https://img.shields.io/github/actions/workflow/status/kadalcc/ui/ci.yml?branch=main&label=CI)](https://github.com/kadalcc/ui/actions/workflows/ci.yml)
[![Licence](https://img.shields.io/badge/licence-MIT-0e7490)](https://github.com/kadalcc/ui/blob/main/LICENSE)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%99%A5-db61a2?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/pmithunish)

The components are not in this package. `kadal-ui add data-grid` copies the data grid's source
into your project through the shadcn CLI, the way `npx shadcn@latest add` does, so you own the
code and change it like the rest of your app. This package is the thin, zero-dependency wrapper
that knows the registry at [ui.kadal.cc](https://ui.kadal.cc), keeps `components.json` pointed at
it, and answers `list`, `docs` and `diff` without you remembering URLs.

```sh
npx @kadal/ui add data-grid
```

That is the same as, once `components.json` knows the registry (`npx @kadal/ui init` does that):

```sh
npx shadcn@latest add @kadal/data-grid
```

## Commands

| | |
| --- | --- |
| `kadal-ui init` | point this project's `components.json` at the `@kadal` registry (runs `shadcn init -b base` first if there is no `components.json`) |
| `kadal-ui add <item...>` | copy items into your source: `data-grid`, `data-grid-url-state`, `data-grid-demo-data` |
| `kadal-ui list` | everything in the registry |
| `kadal-ui docs <item>` | the docs page for an item (`--open` opens it) |
| `kadal-ui diff <item>` | what changed between your copy and the registry |
| `kadal-ui info` | how this project is set up |
| `kadal-ui mcp [--client <name>]` | set up the shadcn MCP server so your AI agent can add items |

Options: `-y, --yes` · `-o, --overwrite` · `--dry-run` · `--path <dir>` · `--cwd <dir>` ·
`--json` (on `list`, `docs` and `info`) · `-h, --help` · `-v, --version`. npm, pnpm, Yarn and Bun
are told apart by the lockfile.

## Requirements

A React 19 project set up with shadcn/ui on Base UI (`npx shadcn@latest init -b base`) and
Tailwind CSS v4. The CLI runs on Node 20.19+.

## Changelog

[packages/cli/CHANGELOG.md](https://github.com/kadalcc/ui/blob/main/packages/cli/CHANGELOG.md)
for the CLI; the registry's own changelog is
[at the root](https://github.com/kadalcc/ui/blob/main/CHANGELOG.md).

## Sponsor

Kadal UI is MIT and paid for by its [sponsors](https://github.com/sponsors/pmithunish). The
tiers are on [ui.kadal.cc/sponsor](https://ui.kadal.cc/sponsor/).

## More from Kadal

[Kadal Deck](https://deck.kadal.cc), the AI presentation app · [Kadal Store](https://store.kadal.cc)

## Licence

MIT.
