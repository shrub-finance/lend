const sharedConfig = require('../common/tailwind.shared.config.js');

module.exports = {
  ...sharedConfig,
  mode: "jit",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "media",
  plugins: [
    require('daisyui'),
    require("@tailwindcss/typography")
  ],
  daisyui: {
    styled: true,
    themes: [
    ],
    base: true,
    utils: true,
    logs: true,
    rtl: false,
  },
}
