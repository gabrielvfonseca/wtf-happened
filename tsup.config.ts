import path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  sourcemap: true,
  clean: true,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  alias: {
    "@": path.resolve(__dirname, "src"),
  },
});
