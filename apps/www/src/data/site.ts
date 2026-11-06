/**
 * Facts that appear on more than one page. Change them here, not in the pages.
 */
export const SITE = {
  url: "https://ui.kadal.cc",
  name: "Kadal UI",
  tagline: "Components you own.",
  /** What it is, in the words someone would type into a search box. */
  category: "Open-source React components for power users",
  description:
    "Kadal UI is a set of open-source React components for power users, starting with a data grid built on TanStack Table v9 and shadcn/ui: sorting, filtering, grouping, virtualization, inline editing, keyboard navigation and more. One command copies the source into your project. MIT.",
  repo: "https://github.com/kadalcc/ui",
  npm: "https://www.npmjs.com/package/@kadal/ui",
  issues: "https://github.com/kadalcc/ui/issues",
  newBug: "https://github.com/kadalcc/ui/issues/new?template=bug.yml",
  newFeature: "https://github.com/kadalcc/ui/issues/new?template=feature.yml",
  feedback: "https://github.com/kadalcc/ui/discussions/new?category=general",
  discussions: "https://github.com/kadalcc/ui/discussions",
  discord: "https://discord.gg/pdWcSbxNKa",
  sponsor: "https://github.com/sponsors/pmithunish",
  /** The legal operator: an individual, trading as Kadal. */
  seller: "Mithunish Prabhakaran",
  tradingAs: "Kadal",
  location: "Chennai, Tamil Nadu, India",
  email: "hello@kadal.cc",
  support: "support@kadal.cc",
  home: "https://kadal.cc",
  studio: "https://work.kadal.cc",
  deck: "https://deck.kadal.cc",
  store: "https://store.kadal.cc",
  /** The install command people copy. */
  install: "npx shadcn@latest add @kadal/data-grid",
  installCli: "npx @kadal/ui add data-grid",
} as const;

export const NAV: readonly { href: string; label: string }[] = [
  { href: "/docs/", label: "Docs" },
  { href: "/docs/data-grid/", label: "Data grid" },
  { href: "/playground/", label: "Playground" },
  { href: "/changelog/", label: "Changelog" },
  { href: "/sponsor/", label: "Sponsor" },
];

/** Kadal's own channels, the same list every Kadal site shows. */
export const SOCIALS: readonly { name: string; href: string; icon: string }[] = [
  { name: "X", href: "https://x.com/kadalstudio", icon: "brand-x" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/kadalcc/", icon: "brand-linkedin" },
  { name: "Instagram", href: "https://www.instagram.com/kadalstudio/", icon: "brand-instagram" },
  { name: "Threads", href: "https://www.threads.com/@kadalstudio", icon: "brand-threads" },
  { name: "Facebook", href: "https://www.facebook.com/kadalcc", icon: "brand-facebook" },
  { name: "YouTube", href: "https://www.youtube.com/@kadalcc", icon: "brand-youtube" },
  { name: "Bluesky", href: "https://bsky.app/profile/kadal.cc", icon: "brand-bluesky" },
  { name: "Telegram", href: "https://t.me/kadalcc", icon: "brand-telegram" },
  {
    name: "WhatsApp",
    href: "https://whatsapp.com/channel/0029VbE31xk1Hspu4KGxUR28",
    icon: "brand-whatsapp",
  },
  { name: "Discord", href: "https://discord.gg/pdWcSbxNKa", icon: "discord" },
  { name: "DEV", href: "https://dev.to/kadalcc", icon: "brand-devto" },
  { name: "GitHub", href: "https://github.com/kadalcc", icon: "brand-github" },
];
