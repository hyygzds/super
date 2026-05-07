import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: resolve(rootDir, "tsconfig.json"),
      exclude: ["**/*.test.*"],
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(rootDir, "src/index.ts"),
      name: "ComponentAiVueUi",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        assetFileNames: "style.css",
      },
    },
  },
});
