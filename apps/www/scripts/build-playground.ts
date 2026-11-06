/**
 * Builds what the playground page loads:
 *   public/play/kadal-ui.js      every registry component, bundled for the browser
 *   public/play/<lib>.js         React and the libraries the examples import, each as an ES module
 *   public/play/chunk-*.js       what those share (one React, one lucide, …)
 *   public/play/kadal-ui.d.ts    the registry's types, one ambient module per file, for the editor
 *   public/play/styles.css       the theme + utilities, compiled by Tailwind
 *   public/play/examples/*.tsx   each example's source, with imports as a real project has them
 *   public/play/manifest.json    the example list and the import map the page uses
 *
 * Everything the sandbox imports comes from this site, at the versions in package.json: no CDN,
 * no second React, and the playground works wherever the site does.
 *
 * `bun scripts/build-playground.ts` — runs before `astro build` (see package.json).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { build } from "tsdown";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "public/play");
rmSync(out, { recursive: true, force: true });
mkdirSync(resolve(out, "examples"), { recursive: true });

// 1. The libraries the examples import by bare name. Each becomes its own module with real named
//    exports (ESM linking in the browser is static, so `export *` from a CommonJS React is not
//    enough); rolldown splits what they share into chunks, which is how React stays one copy.
const LIBS: Record<string, string> = {
  react: "react",
  "react/jsx-runtime": "react-jsx-runtime",
  "react/jsx-dev-runtime": "react-jsx-dev-runtime",
  "react-dom": "react-dom",
  "react-dom/client": "react-dom-client",
  "lucide-react": "lucide-react",
  "@tanstack/react-query": "tanstack-react-query",
  "@tanstack/react-table": "tanstack-react-table",
  "@tanstack/react-virtual": "tanstack-react-virtual",
  nuqs: "nuqs",
  "nuqs/adapters/react": "nuqs-adapters-react",
};
const entriesDir = resolve(root, "play/.entries");
rmSync(entriesDir, { recursive: true, force: true });
mkdirSync(entriesDir, { recursive: true });
const entry: Record<string, string> = { "kadal-ui": "play/entry.ts" };
const isIdentifier = (s: string) => /^[A-Za-z_$][\w$]*$/.test(s);
for (const [specifier, name] of Object.entries(LIBS)) {
  const mod = (await import(specifier)) as Record<string, unknown>;
  const names = Object.keys(mod)
    .filter((k) => k !== "default" && k !== "__esModule" && isIdentifier(k))
    .sort();
  const file = resolve(entriesDir, `${name}.ts`);
  writeFileSync(
    file,
    [
      `import * as m from ${JSON.stringify(specifier)};`,
      `const mod = m as Record<string, unknown>;`,
      `export default (mod.default ?? m) as unknown;`,
      ...names.map((n) => `export const ${n} = mod[${JSON.stringify(n)}] as unknown;`),
      "",
    ].join("\n"),
  );
  entry[name] = `play/.entries/${name}.ts`;
}

await build({
  cwd: root,
  entry,
  outDir: out,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  dts: false,
  sourcemap: false,
  clean: false,
  // tsdown treats package.json dependencies as external by default (library builds); this is an
  // app bundle, so everything comes along.
  deps: { alwaysBundle: () => true },
  alias: {
    "@/registry": resolve(root, "registry"),
    "@": resolve(root, "src"),
  },
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env.DEV": "false" },
  hash: false,
  outputOptions: { chunkFileNames: "chunk-[hash].js" },
  logLevel: "warn",
});
rmSync(entriesDir, { recursive: true, force: true });

// 2. The editor's types. `tsc` emits a declaration per registry file; each becomes an ambient
//    `declare module "@/…"` under the path a real project imports it by, and the lot is one file
//    LiveCodes loads into Monaco. Relative imports between them are rewritten to those names.
const dtsDir = resolve(root, "play/.dts");
rmSync(dtsDir, { recursive: true, force: true });
const tsc = Bun.spawnSync(
  [resolve(root, "node_modules/.bin/tsc"), "-p", "tsconfig.play-dts.json"],
  {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  },
);
if (tsc.exitCode !== 0) throw new Error("tsc (declarations) failed");
const moduleNameOf = (file: string): string | null => {
  const rel = relative(dtsDir, file)
    .replace(/\\/g, "/")
    .replace(/\.d\.ts$/, "");
  const m =
    rel.match(/^registry\/kadal\/ui\/(.+)$/)?.[1]?.replace(/^/, "@/components/ui/") ??
    rel
      .match(/^registry\/kadal\/(lib|hooks)\/(.+)$/)
      ?.slice(1)
      .join("/")
      ?.replace(/^/, "@/") ??
    rel.match(/^src\/lib\/(.+)$/)?.[1]?.replace(/^/, "@/lib/") ??
    null;
  return m?.replace(/\/index$/, "") ?? null;
};
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.name === "node_modules"
      ? []
      : d.isDirectory()
        ? walk(resolve(dir, d.name))
        : d.name.endsWith(".d.ts")
          ? [resolve(dir, d.name)]
          : [],
  );

/**
 * Turns a set of declaration files into `declare module "<name>" { … }` blocks. Relative imports
 * between them become the module names, so the blocks only depend on each other and on bare
 * packages; `declare` modifiers go (they are implied inside an ambient module).
 */
function ambientize(
  files: string[],
  nameOf: (file: string) => string | null,
  bare: (spec: string) => string = (s) => s,
): string[] {
  const known = new Map(files.map((f) => [nameOf(f), f]));
  const blocks: string[] = [];
  for (const file of files) {
    const name = nameOf(file);
    if (!name) continue;
    const resolveSpecifier = (spec: string): string => {
      if (!spec.startsWith(".")) return bare(spec);
      const target = resolve(dirname(file), spec).replace(/\.(d\.ts|tsx?|js|mjs|cjs)$/, "");
      const hit = [target + ".d.ts", resolve(target, "index.d.ts")].find((c) =>
        known.has(nameOf(c)),
      );
      return hit ? (nameOf(hit) as string) : spec;
    };
    const body = readFileSync(file, "utf8")
      .replace(/^\/\/\/\s*<reference[^\n]*\n/gm, "")
      .replace(
        /(from\s*|import\s*\(\s*|^import\s+|^export\s+\*\s+from\s+)(["'])([^"']+)\2/gm,
        (_, lead, q, spec) => `${lead}${q}${resolveSpecifier(spec)}${q}`,
      )
      .replace(/^(\s*)export declare /gm, "$1export ")
      .replace(/^(\s*)declare (?!module\b|global\b)/gm, "$1");
    blocks.push(`declare module ${JSON.stringify(name)} {\n${body.trimEnd()}\n}\n`);
  }
  return blocks;
}

// TanStack Table's own types too: the grid's column and table types extend them, and without them
// `size`, `cell` and the rest would read as excess properties in the editor. (The other libraries
// the registry imports stay unresolved: their shapes do not reach the examples' code.)
const packageRoot = (spec: string, from: string) => {
  let dir = dirname(Bun.resolveSync(spec, from));
  while (!existsSync(join(dir, "package.json"))) dir = dirname(dir);
  return dir;
};
function ambientizePackage(name: string, from: string): string[] {
  const root = packageRoot(name, from);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    types?: string;
    exports?: Record<string, string | { types?: string; import?: string; default?: string }>;
  };
  // Subpath exports name their files; everything else is named by its path inside the package.
  const byFile = new Map<string, string>();
  const entryFile = (
    v: string | { types?: string; import?: string; default?: string } | undefined,
  ) => {
    const p = typeof v === "string" ? v : (v?.types ?? v?.import ?? v?.default);
    return p ? resolve(root, p.replace(/\.(m?js|cjs)$/, ".d.ts")) : null;
  };
  for (const [key, v] of Object.entries(pkg.exports ?? {})) {
    const f = entryFile(v);
    if (f && key.startsWith(".") && !key.includes("*"))
      byFile.set(f, key === "." ? name : name + key.slice(1));
  }
  if (pkg.types) byFile.set(resolve(root, pkg.types), name);
  const nameOf = (file: string) =>
    byFile.get(file) ??
    `${name}/${relative(root, file)
      .replace(/\\/g, "/")
      .replace(/\.d\.ts$/, "")
      .replace(/\/index$/, "")}`;
  return ambientize(walk(root), nameOf);
}

const declarations = [
  ...ambientize(walk(dtsDir), moduleNameOf, (spec) =>
    spec
      .replace(/^@\/registry\/kadal\/ui\//, "@/components/ui/")
      .replace(/^@\/registry\/kadal\/(lib|hooks)\//, "@/$1/"),
  ),
  ...ambientizePackage("@tanstack/react-table", root),
  ...ambientizePackage("@tanstack/table-core", packageRoot("@tanstack/react-table", root)),
];
writeFileSync(
  resolve(out, "kadal-ui.d.ts"),
  `// Kadal UI playground types, generated by scripts/build-playground.ts. One ambient module per registry file.\n\n${declarations.join("\n")}`,
);
rmSync(dtsDir, { recursive: true, force: true });

// 3. The stylesheet.
const tailwind = Bun.spawnSync(
  [
    resolve(root, "node_modules/.bin/tailwindcss"),
    "-i",
    resolve(root, "play/styles.css"),
    "-o",
    resolve(out, "styles.css"),
    "--minify",
    "--cwd",
    root,
  ],
  { cwd: root, stdout: "inherit", stderr: "inherit" },
);
if (tailwind.exitCode !== 0) throw new Error("tailwindcss failed");

// 4. The examples, rewritten to a real project's import paths (the same rewrite the docs' Code tab does).
const rewrite = (source: string) =>
  source
    .replace(/@\/registry\/kadal\/ui\/data-grid\b/g, "@/components/ui/data-grid")
    .replace(/@\/registry\/kadal\/ui\//g, "@/components/ui/")
    .replace(/@\/registry\/kadal\/hooks\//g, "@/hooks/")
    .replace(/@\/registry\/kadal\/lib\//g, "@/lib/")
    .replace(/^"use client";\n\n/, "");

const examplesDir = resolve(root, "registry/kadal/examples");
const examples: { name: string; title: string }[] = [];
const specifiers = new Set<string>();
for (const file of readdirSync(examplesDir)
  .filter((f) => f.endsWith(".tsx"))
  .sort()) {
  const name = basename(file, ".tsx");
  const source = rewrite(readFileSync(resolve(examplesDir, file), "utf8"));
  writeFileSync(resolve(out, "examples", file), source);
  for (const m of source.matchAll(/from "(@\/[^"]+)"/g)) specifiers.add(m[1]!);
  const doc = source.match(/\/\*\*\s*([^*]+?)\s*\*\//);
  examples.push({ name, title: doc?.[1]?.trim() ?? name });
}
// Every path an example imports from, plus the folders the docs tell people about.
for (const s of [
  "@/components/ui/data-grid",
  "@/components/ui/button",
  "@/lib/utils",
  "@/lib/data-grid-demo-data",
  "@/hooks/use-data-grid-url-state",
]) {
  specifiers.add(s);
}

const imports: Record<string, string> = {};
for (const [specifier, name] of Object.entries(LIBS)) imports[specifier] = `./${name}.js`;
for (const s of [...specifiers].sort()) imports[s] = "./kadal-ui.js";
// The types file is loaded once (autoload) and declares every `@/…` module; the other keys exist
// so the editor never goes looking for "@/lib" on a CDN.
const types: Record<string, { url: string; autoload?: boolean }> = {
  "@/components/ui/data-grid": { url: "./kadal-ui.d.ts", autoload: true },
};
for (const s of [...specifiers].sort()) if (!(s in types)) types[s] = { url: "./empty.d.ts" };
writeFileSync(resolve(out, "empty.d.ts"), "// Declared in kadal-ui.d.ts.\n");

const versions = Object.fromEntries(
  [
    "react",
    "react-dom",
    "lucide-react",
    "@tanstack/react-query",
    "@tanstack/react-table",
    "nuqs",
  ].map((p) => [
    p,
    (
      JSON.parse(readFileSync(resolve(root, "node_modules", p, "package.json"), "utf8")) as {
        version: string;
      }
    ).version,
  ]),
);
writeFileSync(
  resolve(out, "manifest.json"),
  JSON.stringify(
    { builtAt: new Date().toISOString(), versions, examples, imports, types },
    null,
    2,
  ),
);
console.log(
  `playground: ${examples.length} examples, ${Object.keys(imports).length} import-map entries`,
);
