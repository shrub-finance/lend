// Assuming the shared config is located at packages/shared-config/tailwind.shared.config.ts
import sharedConfig from '../common/tailwind.shared.config';
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Spread sharedConfig.theme to merge it, then extend further as needed
    ...sharedConfig.theme,
    extend: {
      ...sharedConfig.theme.extend,
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require('daisyui')],
};

export default config;
