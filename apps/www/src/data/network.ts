/**
 * The Kadal network: the other properties, as the rest of Kadal's sites describe them. The Kadal
 * monorepo keeps the canonical list in its `@stack/network` package; this is that list, for a
 * repository that lives outside it. Keep the two in step.
 */
export type SiteId = "store" | "deck" | "sanket" | "ooru" | "studio" | "home" | "keeper";
export type SiteKind = "home" | "studio" | "product" | "research" | "person";

export interface KadalSite {
  id: SiteId;
  name: string;
  short: string;
  url: string;
  /** One sentence for a stranger, under ~80 characters. */
  line: string;
  kind: SiteKind;
  /** The plain-words category, for a product whose name doesn't say what it is. */
  tagline?: string;
  /** Paid: the ones to point people at from a free, open-source site. */
  paid?: boolean;
}

export const SITES: readonly KadalSite[] = [
  {
    id: "deck",
    name: "Kadal Deck",
    short: "Deck",
    url: "https://deck.kadal.cc",
    tagline: "The AI presentation app.",
    line: "Build a slide deck with AI, then present it with your phone as the remote.",
    kind: "product",
    paid: true,
  },
  {
    id: "store",
    name: "Kadal Store",
    short: "Store",
    url: "https://store.kadal.cc",
    tagline: "Printable planners, sounds and design assets.",
    line: "Printable planners, music, sound effects, shaders and 3D. Pay once, keep the files.",
    kind: "product",
    paid: true,
  },
  {
    id: "sanket",
    name: "Sanket",
    short: "Sanket",
    url: "https://sanket.kadal.cc",
    line: "Indian Sign Language recognition that runs in your browser and uploads nothing.",
    kind: "research",
  },
  {
    id: "ooru",
    name: "Ooru",
    short: "Ooru",
    url: "https://ooru.kadal.cc",
    line: "A three-word address for every 12.5 m of Chennai, and a live map of power cuts.",
    kind: "product",
  },
  {
    id: "studio",
    name: "Kadal Studio",
    short: "Studio",
    url: "https://work.kadal.cc",
    line: "The studio behind these: we build AI products end to end, for your team too.",
    kind: "studio",
  },
  {
    id: "home",
    name: "kadal.cc",
    short: "kadal.cc",
    url: "https://kadal.cc",
    line: "Everything we have shipped, as a sea you swim down through.",
    kind: "home",
  },
  {
    id: "keeper",
    name: "pmithunish.com",
    short: "pmithunish.com",
    url: "https://pmithunish.com",
    line: "Mithunish Prabhakaran, who builds all of it.",
    kind: "person",
  },
] as const;

/** The two that take money read `?ref=`, so they learn which site sent a visitor who stays. */
const COUNTS_REF: ReadonlySet<SiteId> = new Set(["deck", "store"]);

export const linkTo = (site: KadalSite, from = "ui"): string =>
  COUNTS_REF.has(site.id) ? `${site.url}/?ref=${encodeURIComponent(from)}` : site.url;

export const PAID_PRODUCTS = SITES.filter((s) => s.paid);
