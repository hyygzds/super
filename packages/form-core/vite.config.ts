import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: resolve(rootDir, "tsconfig.json"),
      exclude: ["**/*.test.*"],
    }),
  ],
  build: {
    lib: {
      entry: resolve(rootDir, "src/index.ts"),
      name: "ComponentAiFormCore",
      formats: ["es"],
      fileName: "index",
    },
  },
});
