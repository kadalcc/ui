/**
 * GitHub Sponsors for Kadal UI. The URL is the maintainer's own profile for now (the kadalcc
 * organisation would need a GSTIN to receive sponsorships); the pages never name the person behind
 * it. The tiers here must match the ones on GitHub and the table in the README of kadalcc/ui; the
 * sponsors list must match BACKERS.md at the repo root. Only list someone whose sponsorship is
 * public on GitHub.
 */
export const SPONSOR_URL = "https://github.com/sponsors/pmithunish";

export type Tier = {
  id: string;
  name: string;
  /** US dollars: a month, or once for a one-time tier. */
  price: number;
  oneTime?: boolean;
  for: "individual" | "company";
  perks: string[];
  /** The tier's id on GitHub Sponsors (Sponsor tiers → edit tier, in the URL). */
  github: number;
};

/** GitHub's checkout for one tier. */
export const tierUrl = (t: Tier) => `${SPONSOR_URL}/sponsorships?tier_id=${t.github}`;

export const TIERS: Tier[] = [
  {
    id: "supporter",
    github: 667040,
    name: "Supporter",
    price: 3,
    for: "individual",
    perks: ["Our thanks", "The sponsor badge on your GitHub profile"],
  },
  {
    id: "backer",
    github: 667041,
    name: "Backer",
    price: 10,
    for: "individual",
    perks: [
      "Everything in Supporter",
      "Your name in the backers list in the README of kadalcc/ui and on ui.kadal.cc",
    ],
  },
  {
    id: "patron",
    github: 667042,
    name: "Patron",
    price: 25,
    for: "individual",
    perks: ["Everything in Backer", "Your avatar in the README of kadalcc/ui and on ui.kadal.cc"],
  },
  {
    id: "bronze",
    github: 667044,
    name: "Bronze",
    price: 100,
    for: "company",
    perks: ["Your logo in the README of kadalcc/ui and on ui.kadal.cc, linked to your site"],
  },
  {
    id: "silver",
    github: 667045,
    name: "Silver",
    price: 250,
    for: "company",
    perks: ["A larger logo in the README of kadalcc/ui and on ui.kadal.cc, the docs included"],
  },
  {
    id: "gold",
    github: 667046,
    name: "Gold",
    price: 500,
    for: "company",
    perks: [
      "The largest logo, at the top of the README of kadalcc/ui and of ui.kadal.cc",
      "Priority on your issues",
      "A monthly 30-minute call with the Kadal team",
    ],
  },
  {
    id: "coffee",
    github: 667047,
    name: "A coffee",
    price: 10,
    oneTime: true,
    for: "individual",
    perks: ["A one-time thank-you"],
  },
  {
    id: "thanks",
    github: 667048,
    name: "A thank-you",
    price: 50,
    oneTime: true,
    for: "individual",
    perks: ["A one-time thank-you", "Your name on ui.kadal.cc"],
  },
];

export type Sponsor = { name: string; href: string; logo?: string; tier: Tier["id"] };

/** Public sponsors, newest first within a tier. Empty until the first one arrives. */
export const SPONSORS: Sponsor[] = [];
