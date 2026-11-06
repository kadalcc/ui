import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", bin: "src/bin.ts" },
  format: "esm",
  platform: "node",
  target: "node20",
  dts: { entry: "src/index.ts" },
  clean: true,
});
