/**
 * Demo data for the examples: deterministic (seeded), so every build and every test sees the same
 * rows, and large enough to show virtualization. Nothing here is real.
 */
export type Status = "active" | "invited" | "paused" | "churned";
export type Plan = "free" | "pro" | "team" | "enterprise";

export interface Person {
  id: string;
  name: string;
  email: string;
  team: string;
  role: string;
  status: Status;
  plan: Plan;
  mrr: number;
  seats: number;
  usage: number;
  active: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  tags: string[];
  website: string;
  country: string;
  notes: string;
  subRows?: Person[];
}

const FIRST = [
  "Aarav", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Meera", "Rohan", "Saanvi", "Vihaan",
  "Amelia", "Noah", "Olivia", "Liam", "Sofia", "Mateo", "Chloe", "Lucas", "Yuki", "Haruto",
  "Zara", "Omar", "Leila", "Idris", "Nia", "Kwame", "Freya", "Elias", "Mia", "Theo",
];
const LAST = [
  "Prabhakaran", "Iyer", "Menon", "Sharma", "Reddy", "Nair", "Patel", "Bose", "Khan", "Das",
  "Smith", "Garcia", "Müller", "Rossi", "Tanaka", "Kim", "Nguyen", "Silva", "Okafor", "Dubois",
];
const TEAMS = ["Platform", "Growth", "Design", "Data", "Support", "Finance", "Sales", "Research"];
const ROLES = ["Engineer", "Designer", "PM", "Analyst", "Lead", "Manager", "Intern", "Director"];
const STATUSES: Status[] = ["active", "active", "active", "invited", "paused", "churned"];
const PLANS: Plan[] = ["free", "free", "pro", "pro", "team", "enterprise"];
const TAGS = ["beta", "vip", "eu", "apac", "us", "partner", "trial", "legacy", "nps-9", "churn-risk"];
const COUNTRIES = ["India", "Germany", "USA", "Japan", "Brazil", "Nigeria", "France", "Canada", "Australia", "Singapore"];
const DOMAINS = ["example.com", "mail.test", "corp.example", "team.dev"];

/** mulberry32: small, fast, deterministic. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePeople(count: number, seed = 42, { tree = false } = {}): Person[] {
  const rnd = seeded(seed);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!;
  const start = Date.UTC(2023, 0, 1);
  const span = Date.UTC(2026, 10, 1) - start;
  const make = (i: number, depth: number): Person => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const status = pick(STATUSES);
    const plan = pick(PLANS);
    const joined = new Date(start + Math.floor(rnd() * span));
    const lastSeen = new Date(joined.getTime() + Math.floor(rnd() * (Date.UTC(2026, 10, 6) - joined.getTime())));
    const seats = plan === "free" ? 1 : plan === "pro" ? 1 + Math.floor(rnd() * 4) : 5 + Math.floor(rnd() * 60);
    const unit = plan === "free" ? 0 : plan === "pro" ? 12 : plan === "team" ? 29 : 79;
    const tagCount = Math.floor(rnd() * 3);
    const tags = Array.from(new Set(Array.from({ length: tagCount }, () => pick(TAGS))));
    const person: Person = {
      id: `${depth ? "s" : "p"}${i.toString(36).padStart(5, "0")}`,
      name: `${first} ${last}`,
      email: `${first}.${last}@${pick(DOMAINS)}`.toLowerCase().replace(/ü/g, "u"),
      team: pick(TEAMS),
      role: pick(ROLES),
      status,
      plan,
      mrr: status === "churned" ? 0 : seats * unit,
      seats,
      usage: Math.round(rnd() * 1000) / 1000,
      active: status === "active",
      joinedAt: joined,
      lastSeenAt: lastSeen,
      tags,
      website: `https://${first.toLowerCase()}-${last.toLowerCase().replace(/ü/g, "u")}.example.com`,
      country: pick(COUNTRIES),
      notes: rnd() > 0.7 ? pick(["Wants SSO.", "Asked about invoices.", "Renewal in Q1.", "Speaks at meetups.", "Needs onboarding call."]) : "",
    };
    if (tree && depth === 0 && rnd() > 0.6) {
      const n = 1 + Math.floor(rnd() * 4);
      person.subRows = Array.from({ length: n }, (_, j) => make(i * 10 + j, depth + 1));
    }
    return person;
  };
  return Array.from({ length: count }, (_, i) => make(i, 0));
}

export const STATUS_OPTIONS: { value: Status; label: string; className?: string }[] = [
  { value: "active", label: "Active", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { value: "invited", label: "Invited", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { value: "paused", label: "Paused", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { value: "churned", label: "Churned", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
];

export const PLAN_OPTIONS: { value: Plan; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "team", label: "Team" },
  { value: "enterprise", label: "Enterprise" },
];

export const TEAM_OPTIONS = TEAMS.map((t) => ({ value: t, label: t }));
