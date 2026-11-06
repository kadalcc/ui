#!/usr/bin/env node
/**
 * One GitHub release per CLI version, after tools/publish.mjs has put it on npm: the tag
 * `v<version>`, titled "Kadal UI <version>", with the changelog entry for that version and the
 * package that went out. The per-package tag (`@kadal/ui@<version>`) stays, because changesets
 * reads it.
 *
 * The notes come from `## <version>` in packages/cli/CHANGELOG.md (written by `changeset version`).
 * The root CHANGELOG.md is the registry's and is versioned apart, so it is not a fallback here.
 * Running it twice does nothing the second time.
 *
 *   PUBLISHED_PACKAGES  changesets/action's `publishedPackages` output (JSON); optional
 *   GITHUB_SHA          the commit to tag; defaults to the commit of `@kadal/ui@<version>`
 *   GH_TOKEN            for `gh` (the workflow's GITHUB_TOKEN, with contents: write)
 *
 * It also pushes this version's per-package tags, which nothing else in the workflow does.
 *
 * Locally: `git fetch --tags && node tools/github-release.mjs` (with `gh` signed in).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const run = (cmd, args, opts = {}) =>
  (execFileSync(cmd, args, { cwd: root, encoding: "utf8", ...opts }) ?? "").trim();

const { name, version } = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8"));
const tag = `v${version}`;

// tools/publish.mjs tags each package it publishes, but changesets/action doesn't push those tags
// with createGithubReleases off, so they go up here.
const packageTags = run("git", ["tag", "--list", `@kadal/*@${version}`])
  .split("\n")
  .filter(Boolean);
if (packageTags.length)
  run("git", ["push", "origin", ...packageTags.map((t) => `refs/tags/${t}`)], { stdio: "inherit" });

try {
  run("gh", ["release", "view", tag], { stdio: ["ignore", "pipe", "ignore"] });
  console.log(`${tag} is already released`);
  process.exit(0);
} catch {
  // not released yet
}

/** The body of `## <version>` in a changelog, without the heading, or null. */
const entry = (file) => {
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, "utf8").split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
};
const notes =
  entry(join(root, "packages/cli/CHANGELOG.md")) ??
  `See the [changelog](https://github.com/kadalcc/ui/blob/main/packages/cli/CHANGELOG.md).`;

const published = process.env.PUBLISHED_PACKAGES
  ? JSON.parse(process.env.PUBLISHED_PACKAGES)
  : packageTags.map((t) => ({ name: t.slice(0, t.lastIndexOf("@")), version }));
if (!published.length) published.push({ name, version });
published.sort((a, b) => a.name.localeCompare(b.name));

const body = `${notes}

### Packages

${published
  .map(
    (p) => `- [\`${p.name}@${p.version}\`](https://www.npmjs.com/package/${p.name}/v/${p.version})`,
  )
  .join("\n")}

Published from [release.yml](https://github.com/kadalcc/ui/actions/workflows/release.yml) through npm trusted publishing, with provenance.

The components themselves are a [shadcn registry](https://ui.kadal.cc/docs/installation/), not this package:

\`\`\`sh
npx shadcn@latest add @kadal/data-grid        # the data grid, into your own source
npx @kadal/ui@${version} add data-grid             # the same, through this CLI
\`\`\`
`;

// The tag goes up with git, not with `gh release create --target`: GitHub refuses to create a ref
// through the API on a commit that touches .github/workflows unless the token has the `workflow`
// scope, which a git push of the tag doesn't need.
if (!run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`])) {
  const target =
    process.env.GITHUB_SHA || run("git", ["rev-list", "-n", "1", `${name}@${version}`]);
  run("git", ["tag", "--force", tag, target]);
  run("git", ["push", "origin", `refs/tags/${tag}`], { stdio: "inherit" });
}
const file = join(mkdtempSync(join(tmpdir(), "kadal-ui-release-")), "notes.md");
writeFileSync(file, body);
const args = ["release", "create", tag, "--verify-tag", "--title", `Kadal UI ${version}`];
args.push("--notes-file", file, version.includes("-") ? "--prerelease" : "--latest");
run("gh", args, { stdio: "inherit" });
console.log(`Released ${tag}`);
