/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            img: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
          },
        },
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@tailwindcss/typography'),
  ],
} 