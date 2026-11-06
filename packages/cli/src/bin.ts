#!/usr/bin/env node
import { createRequire } from "node:module";
import { resolve } from "node:path";

import {
  BUILT_IN_ITEMS,
  DOCS_URL,
  REGISTRY_NAMESPACE,
  REGISTRY_URL,
  REPO_URL,
  detectPackageManager,
  docsUrlFor,
  fetchItems,
  parseArgs,
  readComponentsJson,
  resolveItem,
  run,
  shadcnCommand,
  withKadalRegistry,
  writeComponentsJson,
} from "./index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const color = {
  bold: (s: string) => (process.stdout.isTTY ? `\u001b[1m${s}\u001b[22m` : s),
  dim: (s: string) => (process.stdout.isTTY ? `\u001b[2m${s}\u001b[22m` : s),
  teal: (s: string) => (process.stdout.isTTY ? `\u001b[36m${s}\u001b[39m` : s),
  red: (s: string) => (process.stdout.isTTY ? `\u001b[31m${s}\u001b[39m` : s),
};

const HELP = `${color.bold("kadal-ui")} ${version} — components you own, from ui.kadal.cc

${color.bold("Usage")}
  kadal-ui init                      point this project's components.json at the @kadal registry
                                     (runs \`shadcn init -b base\` first if there is no components.json)
  kadal-ui add <item...>             copy items into your source, e.g. \`kadal-ui add data-grid\`
  kadal-ui list                      everything in the registry
  kadal-ui docs <item>               the docs page for an item (--open opens it)
  kadal-ui diff <item>               what changed between your copy and the registry
  kadal-ui info                      how this project is set up
  kadal-ui mcp [--client <name>]     set up the shadcn MCP server so your AI agent can add items

${color.bold("Options")}
  -y, --yes         skip confirmations          -o, --overwrite   overwrite existing files
  --dry-run         show what would change      --path <dir>      where to put the files
  --cwd <dir>       the project directory       --json            machine-readable output
  -h, --help        this text                   -v, --version     print the version

${color.bold("Examples")}
  npx @kadal/ui add data-grid
  npx @kadal/ui add data-grid data-grid-url-state --overwrite
  npx shadcn@latest add @kadal/data-grid          ${color.dim("# the same thing, after \`kadal-ui init\`")}

Docs ${DOCS_URL}/ · Source ${REPO_URL} · MIT
`;

function fail(message: string, code = 1): never {
  console.error(color.red(`kadal-ui: ${message}`));
  process.exit(code);
}

async function ensureRegistry(cwd: string, { silent = false } = {}): Promise<void> {
  let config = readComponentsJson(cwd);
  if (!config) {
    const pm = detectPackageManager(cwd);
    const { command, args } = shadcnCommand(pm);
    if (!silent) {
      console.log(`No components.json here. Setting the project up with shadcn (Base UI) first…`);
    }
    const code = await run(command, [...args, "init", "-b", "base", "-y"], cwd);
    if (code !== 0)
      fail("`shadcn init` did not finish; run it yourself, then `kadal-ui init` again.", code);
    config = readComponentsJson(cwd);
    if (!config) fail("components.json still missing after `shadcn init`.");
  }
  const { config: next, changed } = withKadalRegistry(config);
  if (changed) {
    writeComponentsJson(cwd, next);
    if (!silent)
      console.log(
        `${color.teal("✔")} components.json: registered ${REGISTRY_NAMESPACE} → ${REGISTRY_URL}`,
      );
  } else if (!silent) {
    console.log(
      `${color.teal("✔")} components.json already knows the ${REGISTRY_NAMESPACE} registry.`,
    );
  }
}

async function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positionals;
  const cwd = resolve(typeof flags.cwd === "string" ? flags.cwd : process.cwd());
  const json = flags.json === true;

  if (flags.v || flags.version) {
    console.log(version);
    return;
  }
  if (!command || flags.h || flags.help || command === "help") {
    console.log(HELP);
    return;
  }

  switch (command) {
    case "init": {
      await ensureRegistry(cwd);
      console.log(
        `\nNext: ${color.bold("kadal-ui add data-grid")}   ${color.dim(`(or: npx shadcn@latest add ${REGISTRY_NAMESPACE}/data-grid)`)}`,
      );
      return;
    }

    case "add": {
      if (!rest.length) fail("tell me what to add, e.g. `kadal-ui add data-grid`.", 2);
      await ensureRegistry(cwd, { silent: true });
      const pm = detectPackageManager(cwd);
      const { command: bin, args } = shadcnCommand(pm);
      const passthrough: string[] = [];
      if (flags.y || flags.yes) passthrough.push("--yes");
      if (flags.o || flags.overwrite) passthrough.push("--overwrite");
      if (flags["dry-run"]) passthrough.push("--dry-run");
      if (flags.silent) passthrough.push("--silent");
      if (typeof flags.path === "string") passthrough.push("--path", flags.path);
      const items = rest.map(resolveItem);
      console.log(
        `${color.dim(`$ ${bin} ${[...args, "add", ...items, ...passthrough].join(" ")}`)}`,
      );
      const code = await run(bin, [...args, "add", ...items, ...passthrough, "--cwd", cwd], cwd);
      if (code !== 0) process.exit(code);
      for (const item of rest) {
        console.log(`${color.teal("✔")} ${item}: docs at ${docsUrlFor(item)}`);
      }
      return;
    }

    case "list":
    case "search": {
      const { items, live } = await fetchItems();
      if (json) {
        console.log(JSON.stringify({ registry: REGISTRY_URL, live, items }, null, 2));
        return;
      }
      console.log(
        `${color.bold("Kadal UI registry")} ${color.dim(live ? "(live)" : "(built-in list; the registry was not reachable)")}\n`,
      );
      const width = Math.max(...items.map((i) => i.name.length));
      for (const item of items) {
        console.log(
          `  ${color.teal(item.name.padEnd(width))}  ${item.title ?? ""} ${color.dim(item.type.replace("registry:", ""))}`,
        );
        if (item.description) console.log(`  ${" ".repeat(width)}  ${color.dim(item.description)}`);
      }
      console.log(`\nAdd one with ${color.bold("kadal-ui add <name>")}.`);
      return;
    }

    case "docs": {
      const item = rest[0] ?? "data-grid";
      const url = docsUrlFor(item);
      if (json) {
        console.log(JSON.stringify({ item, url }));
        return;
      }
      console.log(url);
      if (flags.open) {
        const opener =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        await run(opener, [url], cwd);
      }
      return;
    }

    case "diff": {
      if (!rest.length) fail("tell me what to diff, e.g. `kadal-ui diff data-grid`.", 2);
      await ensureRegistry(cwd, { silent: true });
      const { command: bin, args } = shadcnCommand(detectPackageManager(cwd));
      const code = await run(
        bin,
        [...args, "add", ...rest.map(resolveItem), "--diff", "--cwd", cwd],
        cwd,
      );
      process.exit(code);
    }

    case "info": {
      const config = readComponentsJson(cwd);
      const pm = detectPackageManager(cwd);
      const registry = config?.registries?.[REGISTRY_NAMESPACE];
      const info = {
        cwd,
        packageManager: pm,
        componentsJson: Boolean(config),
        kadalRegistry: typeof registry === "string" ? registry : (registry?.url ?? null),
        items: BUILT_IN_ITEMS.map((i) => i.name),
        docs: `${DOCS_URL}/`,
      };
      if (json) {
        console.log(JSON.stringify(info, null, 2));
        return;
      }
      console.log(`${color.bold("Project")}         ${cwd}`);
      console.log(`${color.bold("Package manager")} ${pm}`);
      console.log(
        `${color.bold("components.json")} ${config ? "yes" : "no (run `kadal-ui init`)"}`,
      );
      console.log(
        `${color.bold("@kadal registry")} ${info.kadalRegistry ?? "not registered (run `kadal-ui init`)"}`,
      );
      console.log(`${color.bold("Docs")}            ${info.docs}`);
      return;
    }

    case "mcp": {
      await ensureRegistry(cwd, { silent: true });
      const { command: bin, args } = shadcnCommand(detectPackageManager(cwd));
      const client = typeof flags.client === "string" ? flags.client : "claude";
      console.log(
        `The shadcn MCP server serves every registry in components.json, the ${REGISTRY_NAMESPACE} one included.\n` +
          `Setting it up for ${client}…`,
      );
      const code = await run(bin, [...args, "mcp", "init", "--client", client, "--cwd", cwd], cwd);
      if (code === 0) {
        console.log(
          `\nThen ask your agent: ${color.bold(`"add the ${REGISTRY_NAMESPACE}/data-grid component"`)}.`,
        );
      }
      process.exit(code);
    }

    default:
      fail(`unknown command "${command}". Try \`kadal-ui --help\`.`, 2);
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
