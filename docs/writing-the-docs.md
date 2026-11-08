# Writing the docs

How a page of ui.kadal.cc is written, so every page reads like the same person wrote it and every
example is one a reader can paste.

## Where things are

| path | |
| --- | --- |
| `apps/www/src/content/docs/docs/**/*.mdx` | the pages (Starlight; `docs/data-grid/sorting.mdx` is `/docs/data-grid/sorting/`) |
| `apps/www/src/data/sidebar.mjs` | the navigation; every slug there must have a file |
| `apps/www/registry/kadal/examples/*.tsx` | the live examples; `<Demo name="data-grid-sorting" />` renders `data-grid-sorting.tsx` |
| `apps/www/registry/kadal/ui/data-grid/*` | the component source: **the truth about the API**, read it before describing an option |
| `apps/www/registry/kadal/lib/data-grid-demo-data.ts` | seeded demo rows (`makePeople(n, seed)`, `STATUS_OPTIONS`, `PLAN_OPTIONS`, `Person`) |
| `apps/www/src/components/docs/Demo.astro` | the live-example component (Preview / Code tabs, "Open in playground") |

## The voice

- Plain, second person, present tense. "Click a header to sort" rather than "Users are able to sort".
- Say what it does and when you would want it, in that order. No adjectives doing the work of facts.
- British spelling, as the rest of Kadal: *colour, licence, initialise, behaviour*.
- Short paragraphs. Lists for parallel things. Tables for options.
- Never promise what the code does not do. If a page needs a feature the grid lacks, say so and link the issue tracker.
- No emoji in body text. Headings are sentence case.

## The shape of a feature page

```mdx
---
title: Sorting
description: One sentence, under 160 characters, that works as the search snippet.
---

import { Aside, Steps, Tabs, TabItem } from "@astrojs/starlight/components";
import Demo from "../../../../components/docs/Demo.astro";

One or two sentences: what the feature is and the one thing a reader should know.

<Demo name="data-grid-sorting" />

## Use it
What the reader does: the prop, the column option, the menu item. Code first, prose second.

## How it behaves
Edge cases, defaults, interactions with other features (sorting + grouping, say).

## Keyboard
A small table, only when the feature has keys.

## Options
A table: option | type | default | what it does. Column options and grid options in separate tables.

## See also
Two or three links.
```

Pages under `docs/data-grid/` import Demo from `../../../../components/docs/Demo.astro`; pages
under `docs/` directly use `../../../components/docs/Demo.astro`.

Code in the docs shows what the **reader's** project has, so imports are
`@/components/ui/data-grid`, never `@/registry/...`. (The Demo component rewrites example source
for the Code tab automatically; hand-written snippets must use the reader's paths themselves.)

## Writing an example

- One file per example in `apps/www/registry/kadal/examples/`, named `data-grid-<topic>.tsx`,
  default-exporting a React component, starting with `"use client";`.
- Imports use the registry paths: `@/registry/kadal/ui/data-grid`, `@/registry/kadal/ui/button`,
  `@/registry/kadal/lib/data-grid-demo-data`, `@/registry/kadal/hooks/...`.
- Deterministic data: `makePeople(n, seed)` with a seed unique to the example; small (40–200 rows)
  unless the page is about scale.
- Focused: show the one thing the page is about; the kitchen sink is `data-grid-demo.tsx`.
  Under ~80 lines. A `name` unique to the example (`name: "sorting"`) on `useDataGrid`/`DataGrid`.
- Do not use `persist` in examples (it would leak state between pages) unless the page is about persistence,
  and then use a `persist` key unique to the page.
- Any new example must also be registered in `apps/www/registry.json` as a `registry:example` item
  (copy the shape of `data-grid-basic`), so `shadcn add @kadal/<name>` works. If you cannot edit that
  file (another agent owns it), list the examples you added in your final report.

## Checking a page

1. `cd apps/www && ../../node_modules/.bin/tsc --noEmit -p tsconfig.json` must stay at 0 errors.
2. The dev server runs at `http://127.0.0.1:5400` (don't start another on that port). Open the page:
   `node scripts/dev-probe.mjs http://127.0.0.1:5400/docs/data-grid/sorting/` prints console errors
   and page errors and writes a screenshot to the scratchpad path printed in the script.
3. Read the page as a reader would: does the first screen tell you what it is and show it working?

## Starlight bits you can use

`Aside` (note / tip / caution / danger), `Steps`, `Tabs` + `TabItem` (`syncKey="installer"`
for package-manager tabs), `Code` (with `title=` and `ins={}`/`del={}` line marks), `Card`,
`CardGrid`, `LinkCard`, `Badge`. `kbd` elements render as keycaps.
