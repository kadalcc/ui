import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  REGISTRY_URL,
  detectPackageManager,
  docsUrlFor,
  fetchItems,
  parseArgs,
  resolveItem,
  shadcnCommand,
  withKadalRegistry,
} from "./index.ts";

describe("parseArgs", () => {
  test("positionals, boolean flags, valued flags", () => {
    const r = parseArgs([
      "add",
      "data-grid",
      "-y",
      "--overwrite",
      "--path",
      "src/ui",
      "--cwd=/tmp/x",
      "--json",
    ]);
    expect(r.positionals).toEqual(["add", "data-grid"]);
    expect(r.flags).toEqual({
      y: true,
      overwrite: true,
      path: "src/ui",
      cwd: "/tmp/x",
      json: true,
    });
  });
  test("combined short flags and --", () => {
    const r = parseArgs(["add", "-yo", "--", "--literal"]);
    expect(r.flags).toEqual({ y: true, o: true });
    expect(r.positionals).toEqual(["add", "--literal"]);
  });
});

describe("resolveItem", () => {
  test("qualifies bare names", () => {
    expect(resolveItem("data-grid")).toBe("@kadal/data-grid");
  });
  test("leaves namespaced names and urls alone", () => {
    expect(resolveItem("@acme/button")).toBe("@acme/button");
    expect(resolveItem("https://x.test/r/a.json")).toBe("https://x.test/r/a.json");
  });
});

describe("withKadalRegistry", () => {
  test("adds the registry once", () => {
    const first = withKadalRegistry({ style: "base-nova" });
    expect(first.changed).toBe(true);
    expect(first.config.registries).toEqual({ "@kadal": REGISTRY_URL });
    const second = withKadalRegistry(first.config);
    expect(second.changed).toBe(false);
  });
  test("keeps other registries", () => {
    const r = withKadalRegistry({ registries: { "@acme": "https://acme.test/{name}.json" } });
    expect(Object.keys(r.config.registries!)).toEqual(["@acme", "@kadal"]);
  });
});

describe("detectPackageManager", () => {
  test("reads the lockfile", () => {
    // An empty user agent: `undefined` would fall back to the agent running this test.
    const dir = mkdtempSync(join(tmpdir(), "kadal-ui-"));
    expect(detectPackageManager(dir, "")).toBe("npm");
    writeFileSync(join(dir, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(dir, "")).toBe("pnpm");
    writeFileSync(join(dir, "bun.lock"), "");
    expect(detectPackageManager(dir, "")).toBe("bun");
  });
  test("falls back to the user agent", () => {
    const dir = mkdtempSync(join(tmpdir(), "kadal-ui-"));
    expect(detectPackageManager(dir, "yarn/4.0.0 npm/? node/v22")).toBe("yarn");
  });
  test("maps to the right dlx command", () => {
    expect(shadcnCommand("pnpm")).toEqual({ command: "pnpm", args: ["dlx", "shadcn@latest"] });
    expect(shadcnCommand("npm").command).toBe("npx");
  });
});

describe("docsUrlFor", () => {
  test("known items", () => {
    expect(docsUrlFor("data-grid")).toBe("https://ui.kadal.cc/docs/data-grid/");
    expect(docsUrlFor("@kadal/data-grid-url-state")).toBe(
      "https://ui.kadal.cc/docs/data-grid/url-state/",
    );
  });
});

describe("fetchItems", () => {
  test("uses the live registry when it answers", async () => {
    const { items, live } = await fetchItems(
      (async () =>
        new Response(
          JSON.stringify({ items: [{ name: "x", type: "registry:ui", title: "X" }] }),
        )) as typeof fetch,
    );
    expect(live).toBe(true);
    expect(items).toEqual([{ name: "x", type: "registry:ui", title: "X", description: undefined }]);
  });
  test("falls back when offline", async () => {
    const { items, live } = await fetchItems((async () => {
      throw new Error("offline");
    }) as typeof fetch);
    expect(live).toBe(false);
    expect(items.map((i) => i.name)).toContain("data-grid");
  });
});
