import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: resolve(rootDir, "tsconfig.json"),
      exclude: ["**/*.test.*", "**/vitest.setup.ts"],
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(rootDir, "src/index.ts"),
      name: "ComponentAiReactUi",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        assetFileNames: "style.css",
      },
    },
  },
});
