# Security

Please report vulnerabilities privately to **support@kadal.cc** with "Kadal UI security" in the
subject, or through [GitHub's private vulnerability reporting](https://github.com/kadalcc/ui/security/advisories/new),
rather than in a public issue. Include what is affected (the data grid or another registry item,
the `@kadal/ui` CLI, or the site at ui.kadal.cc), how to reproduce it, and its impact.

You'll get an acknowledgement within three working days and a plan within ten. Fixes ship as a
new registry version (and a patch release of the CLI where it is involved) with a changelog entry
crediting you, unless you'd rather not be named.

Supported versions: the latest version of each registry item at ui.kadal.cc, and the latest
release of `@kadal/ui`. A registry item lives in your project once added, so a fix reaches you
when you add it again (`npx shadcn@latest add @kadal/data-grid --overwrite`); the changelog says
which version has it.
