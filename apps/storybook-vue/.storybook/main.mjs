import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

const storybookDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(storybookDir, "..", "..", "..");

/** @type {import("@storybook/vue3-vite").StorybookConfig} */
const config = {
  stories: ["../../../packages/vue-ui/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/vue3-vite",
    options: {},
  },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    return mergeConfig(config, {
      plugins: [vue(), vueJsx(), tailwindcss()],
      server: {
        fs: { allow: [monorepoRoot] },
      },
    });
  },
};

export default config;
