import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import registry from "../../registry.json";
import { SITES } from "../data/network";
import { docsOrder } from "../data/sidebar.mjs";
import { SITE } from "../data/site";
import { SPONSOR_URL, TIERS } from "../data/sponsors";

/** A plain-text map of the site for language models reading it on someone's behalf (llmstxt.org). */
export const GET: APIRoute = async () => {
  // In the sidebar's reading order; a page the sidebar doesn't list goes last.
  const rank = (id: string) => {
    const i = docsOrder.indexOf(id);
    return i < 0 ? docsOrder.length : i;
  };
  const docs = (await getCollection("docs"))
    .filter((d) => d.id.startsWith("docs"))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
  const link = (id: string) => new URL(`/${id}/`, SITE.url).href;
  const page = (path: string) => new URL(path, SITE.url).href;

  const items = registry.items.filter((i) => i.type !== "registry:example");
  const examples = registry.items.filter((i) => i.type === "registry:example");
  const kind = (t: string) => t.replace(/^registry:/, "");
  const monthly = TIERS.filter((t) => !t.oneTime);

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.tagline} Kadal UI is a shadcn registry, not an npm dependency: one command copies the TypeScript source into your project (components/ui/data-grid/ by default) and adds TanStack Table and TanStack Virtual to your package.json. From then on the code is yours to change; updates arrive as a diff you review. React 19, TypeScript, Tailwind v4, shadcn/ui on Base UI. Works with Next.js, Vite, Astro, Remix and TanStack Start.

Install: \`${SITE.install}\` (or \`${SITE.installCli}\`, which points components.json at the registry first). Update: \`${SITE.install} --diff\` shows what changed between your copy and the registry.

Licence: MIT, no paid tier, no licence keys. Source: ${SITE.repo}. Issues: ${SITE.issues}. Discussions: ${SITE.discussions}. Discord: ${SITE.discord}. The npm package ${SITE.npm} is only the CLI; the components ship through the registry. Made by ${SITE.tradingAs} (${SITE.location}). Postal address: ${SITE.address}. Contact: ${SITE.email}.

## Registry items (\`npx shadcn@latest add @kadal/<name>\`)

${items.map((i) => `- ${i.name} (${kind(i.type)}): ${i.description}`).join("\n")}

## Examples (\`npx shadcn@latest add @kadal/<name>\`; each also opens in the playground)

${examples.map((i) => `- ${i.name}: ${i.title}. ${i.description}`).join("\n")}

## Docs

${docs.map((d) => `- [${d.data.title}](${link(d.id)})${d.data.description ? `: ${d.data.description}` : ""}`).join("\n")}

## CLI (\`npx @kadal/ui <command>\`)

- init: point this project's components.json at the @kadal registry (runs \`shadcn init -b base\` first if there is no components.json)
- add <item...>: copy items into your source, e.g. \`npx @kadal/ui add data-grid\`
- list: everything in the registry
- docs <item>: the docs page for an item (--open opens it)
- diff <item>: what changed between your copy and the registry
- info: how this project is set up
- mcp [--client <name>]: set up the shadcn MCP server so an AI agent can add items
- Options: -y/--yes, -o/--overwrite, --dry-run, --path <dir>, --cwd <dir>, --json, -h/--help, -v/--version

Reference: ${page("/docs/cli/")}. For agents and MCP: ${page("/docs/ai-agents/")}.

## More

- [Playground](${page("/playground/")}): edit an example in the browser and copy the code
- [Changelog](${page("/changelog/")}): every change to the registry, by version
- [Sponsor](${page("/sponsor/")}): GitHub Sponsors at ${SPONSOR_URL}; monthly tiers ${monthly.map((t) => `${t.name} $${t.price}`).join(", ")}; one-time ${TIERS.filter(
    (t) => t.oneTime,
  )
    .map((t) => `$${t.price}`)
    .join(" or ")}. Sponsorships fund the time; the code stays MIT.

## More from Kadal

${SITES
  // Plain addresses, unlike the site's own links: an agent repeats these to people anywhere, and
  // ?ref=ui on them would credit this site with visits it never sent.
  .map((s) => `- [${s.name}](${s.url}): ${s.line}`)
  .join("\n")}

## Legal

- [Terms](${page("/terms/")}): code MIT, docs text CC BY 4.0, no accounts or payments
- [Privacy](${page("/privacy/")}): no analytics, no cookies; a theme and package-manager preference in localStorage
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
