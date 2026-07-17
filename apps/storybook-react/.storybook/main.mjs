import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const storybookDir = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(storybookDir, "..", "..", "..");

/** @type {import("@storybook/react-vite").StorybookConfig} */
const config = {
  // Relative to `.storybook/` — absolute Windows paths break Storybook's glob.
  stories: [
    "../../../packages/react-ui/src/**/*.stories.@(ts|tsx)",
    "../../../packages/ai-chat/src/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      server: {
        fs: { allow: [monorepoRoot] },
      },
    });
  },
};

export default config;
