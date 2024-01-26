module.exports = {
  mode: "jit",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        'shrub-green-900': '#0A4736',
        'shrub-green-500': '#17725C',
        'shrub-green': '#38f6c9',
        'shrub-green-200':'#3ccb7f',
        'shrub-green-100': '#8ACCA4',
        'shrub-green-50':'#f0fdf9',

        'shrub-blue': '#101828',


        'shrub-grey-light': '#FCFCFD',
        'shrub-grey-light2': '#EAECF0',
        'shrub-grey-light3': '#F9F5FF',
        'shrub-grey-50': '#D0D5DD',
        'shrub-grey-100': '#98A2B3',
        'shrub-grey-200':'#667085',
        'shrub-grey': '#475467',
        'shrub-grey-700': '#344054',
        'shrub-grey-900': '#202939',




// #2dcaa4
},
      boxShadow: {
        'shrub': '0px 4px 250px rgba(138, 204, 164, 0.25)',
        'shrub-thin': '0px 1px 2px rgba(16, 24, 40, 0.05), 0px 0px 0px 4px #CCFBEF'
      }
    },

  },
  plugins: [
    require('daisyui'),
    require("@tailwindcss/typography")
  ],
  daisyui: {
    styled: true,
    themes: [

      {
        'lend': {
          fontFamily: {
            display: ['Inter, sans-serif'],
            body: ['Inter, sans-serif'],
          },
          'primary': '#000000',           /* Primary color */
          'primary-focus': '#16B364',     /* Primary color - focused */
          'primary-content': '#ffffff',   /* Foreground content color to use on primary color */

          'secondary': '#808080',         /* Secondary color */
          'secondary-focus': '#f3cc30',   /* Secondary color - focused */
          'secondary-content': '#ffffff', /* Foreground content color to use on secondary color */

          'accent': '#33a382',            /* Accent color */
          'accent-focus': '#2aa79b',      /* Accent color - focused */
          'accent-content': '#ffffff',    /* Foreground content color to use on accent color */

          'neutral': '#2b2b2b',           /* Neutral color */
          'neutral-focus': '#2a2e37',     /* Neutral color - focused */
          'neutral-content': '#ffffff',   /* Foreground content color to use on neutral color */

          'base-100': '#000000',          /* Base color of page, used for blank backgrounds */
          'base-200': '#35363a',          /* Base color, a little darker */
          'base-300': '#222222',          /* Base color, even more dark */
          'base-content': '#f9fafb',      /* Foreground content color to use on base color */

          'info': '#2094f3',              /* Info */
          'success': '#16B364',           /* Success */
          'warning': '#ff9900',           /* Warning */
          'error': '#ff5724',             /* Error */
        },
      },
      // backup themes:
      // 'dark',
      // 'synthwave'
    ],
    base: true,
    utils: true,
    logs: true,
    rtl: false,
  },
}
