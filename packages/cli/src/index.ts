/**
 * @kadal/ui — the CLI for the Kadal UI registry (ui.kadal.cc).
 *
 * The components are not an npm dependency: `kadal-ui add data-grid` copies the source into your
 * project through the shadcn CLI, the way `npx shadcn add` does, so you own the code. This package
 * is the thin, zero-dependency wrapper that knows the registry, keeps `components.json` configured,
 * and answers `list`, `docs` and `diff` without you remembering URLs.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

export const REGISTRY_NAMESPACE = "@kadal";
export const REGISTRY_URL = "https://ui.kadal.cc/r/{name}.json";
export const REGISTRY_INDEX_URL = "https://ui.kadal.cc/r/registry.json";
export const DOCS_URL = "https://ui.kadal.cc/docs";
export const REPO_URL = "https://github.com/kadalcc/ui";

export interface RegistryItemSummary {
  name: string;
  type: string;
  title?: string;
  description?: string;
}

/** What the registry held when this version shipped; `list` refreshes it from the network. */
export const BUILT_IN_ITEMS: RegistryItemSummary[] = [
  {
    name: "data-grid",
    type: "registry:ui",
    title: "Data Grid",
    description:
      "A power-user data grid on TanStack Table v9 and shadcn/ui (Base UI): typed columns, filters, search, selection, pinning, reorder, resize, tree data, grouping, virtualization, inline editing, cell selection, export, saved views.",
  },
  {
    name: "data-grid-url-state",
    type: "registry:hook",
    title: "Data Grid URL state",
    description: "Keeps the grid's filters, search and page in the URL with nuqs.",
  },
  {
    name: "data-grid-demo-data",
    type: "registry:lib",
    title: "Data Grid demo data",
    description: "The seeded demo dataset the examples use.",
  },
];

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Which package manager the project uses, by its lockfile; npm when unsure. */
export function detectPackageManager(
  cwd: string,
  userAgent = process.env.npm_config_user_agent,
): PackageManager {
  if (existsSync(join(cwd, "bun.lock")) || existsSync(join(cwd, "bun.lockb"))) return "bun";
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";
  if (userAgent?.startsWith("bun")) return "bun";
  if (userAgent?.startsWith("pnpm")) return "pnpm";
  if (userAgent?.startsWith("yarn")) return "yarn";
  return "npm";
}

/** The command that runs the shadcn CLI for a package manager. */
export function shadcnCommand(pm: PackageManager): { command: string; args: string[] } {
  switch (pm) {
    case "bun":
      return { command: "bunx", args: ["--bun", "shadcn@latest"] };
    case "pnpm":
      return { command: "pnpm", args: ["dlx", "shadcn@latest"] };
    case "yarn":
      return { command: "yarn", args: ["dlx", "shadcn@latest"] };
    default:
      return { command: "npx", args: ["--yes", "shadcn@latest"] };
  }
}

/** `data-grid` → `@kadal/data-grid`; already-qualified names and URLs pass through. */
export function resolveItem(name: string): string {
  if (name.startsWith("@") || name.startsWith("http://") || name.startsWith("https://"))
    return name;
  return `${REGISTRY_NAMESPACE}/${name}`;
}

export interface ComponentsJson {
  registries?: Record<string, string | { url: string; headers?: Record<string, string> }>;
  [key: string]: unknown;
}

/** Adds the @kadal registry to a components.json object; returns whether anything changed. */
export function withKadalRegistry(config: ComponentsJson): {
  config: ComponentsJson;
  changed: boolean;
} {
  const registries = { ...(config.registries ?? {}) };
  const current = registries[REGISTRY_NAMESPACE];
  const existing = typeof current === "string" ? current : current?.url;
  if (existing === REGISTRY_URL) return { config, changed: false };
  registries[REGISTRY_NAMESPACE] = REGISTRY_URL;
  return { config: { ...config, registries }, changed: true };
}

export function readComponentsJson(cwd: string): ComponentsJson | null {
  const file = join(cwd, "components.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ComponentsJson;
  } catch {
    throw new Error(`components.json is not valid JSON (${file}).`);
  }
}

export function writeComponentsJson(cwd: string, config: ComponentsJson): void {
  writeFileSync(join(cwd, "components.json"), `${JSON.stringify(config, null, 2)}\n`);
}

/** Runs a command, inheriting stdio; resolves with the exit code. */
export function run(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

/** The live catalogue, or the built-in one when offline. */
export async function fetchItems(
  fetchImpl: typeof fetch = fetch,
): Promise<{ items: RegistryItemSummary[]; live: boolean }> {
  try {
    const res = await fetchImpl(REGISTRY_INDEX_URL, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { items?: RegistryItemSummary[] };
    if (!Array.isArray(json.items)) throw new Error("no items");
    return {
      items: json.items.map(({ name, type, title, description }) => ({
        name,
        type,
        title,
        description,
      })),
      live: true,
    };
  } catch {
    return { items: BUILT_IN_ITEMS, live: false };
  }
}

export function docsUrlFor(item: string): string {
  const name = item.replace(/^@kadal\//, "");
  if (name === "data-grid") return `${DOCS_URL}/data-grid/`;
  if (name.startsWith("data-grid-url-state")) return `${DOCS_URL}/data-grid/url-state/`;
  if (name.startsWith("data-grid-")) return `${DOCS_URL}/data-grid/`;
  return `${DOCS_URL}/`;
}

/** A tiny argv parser: `--flag`, `--key value`, `--key=value`, and positionals. */
export function parseArgs(argv: string[]): {
  positionals: string[];
  flags: Record<string, string | boolean>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (
          next !== undefined &&
          !next.startsWith("-") &&
          ["cwd", "path", "client"].includes(a.slice(2))
        ) {
          flags[a.slice(2)] = next;
          i++;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else if (a.startsWith("-") && a.length > 1) {
      for (const ch of a.slice(1)) flags[ch] = true;
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}
