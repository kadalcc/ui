import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import { sidebar } from "./src/data/sidebar.mjs";

// ui.kadal.cc: the landing page, playground, sponsor and legal pages are plain Astro pages under
// src/pages; the docs are Starlight, whose content lives in src/content/docs/docs/ so every page is
// /docs/…. The live demos are React islands that import the registry source directly, so the docs
// always show the exact code `shadcn add @kadal/data-grid` installs.
export default defineConfig({
  site: "https://ui.kadal.cc",
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  compressHTML: true,
  server: { port: 5400 },
  // Dev only: the playground runs inside LiveCodes' sandbox, another origin, and imports the grid
  // bundle from the dev server. Astro's dev middleware blocks cross-site subresource requests unless
  // the Origin is listed here, and Vite must add the CORS header on top. Production is static files
  // behind the headers in public/_headers, so neither setting matters there.
  security: {
    allowedDomains: [
      { hostname: "livecodes-sandbox.pages.dev", protocol: "https" },
      { hostname: "livecodes.io", protocol: "https" },
      { hostname: "**.livecodes.io", protocol: "https" },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    server: { cors: true },
    // Everything the islands import, known up front: Vite otherwise discovers them one page at a
    // time, re-optimises mid-session and hands React to two bundles ("Invalid hook call" in dev).
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "@tanstack/react-table",
        "@tanstack/react-virtual",
        "@tanstack/react-query",
        "@dnd-kit/react",
        "@dnd-kit/react/sortable",
        "@dnd-kit/dom",
        "@dnd-kit/dom/modifiers",
        "@base-ui/react",
        "@base-ui/react/select",
        "nuqs",
        "nuqs/adapters/react",
        "lucide-react",
        "cmdk",
        "cn",
        "class-variance-authority",
        "livecodes",
      ],
    },
  },
  integrations: [
    react(),
    starlight({
      title: "Kadal UI docs",
      description:
        "A power-user data grid for React on TanStack Table v9 and shadcn/ui, installed into your own source with one command.",
      logo: { src: "./src/assets/mark.svg", replacesTitle: false },
      favicon: "/favicon.svg",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/kadalcc/ui" },
        { icon: "discord", label: "Discord", href: "https://discord.gg/pdWcSbxNKa" },
      ],
      customCss: ["./src/styles/starlight.css"],
      disable404Route: true,
      lastUpdated: false,
      pagination: true,
      editLink: { baseUrl: "https://github.com/kadalcc/ui/edit/main/apps/www/" },
      components: {
        SocialIcons: "./src/components/DocsHeaderLinks.astro",
        Footer: "./src/components/docs/Footer.astro",
      },
      sidebar,
      head: [
        { tag: "meta", attrs: { property: "og:image", content: "https://ui.kadal.cc/og/docs.png" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
      ],
    }),
    sitemap(),
  ],
});
