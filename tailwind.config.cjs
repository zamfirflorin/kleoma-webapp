/** Design tokens come from the Stitch design (design/stitch_google.html). Dark only, like the design. */
module.exports = {
  content: ['./src/**/*.{html,js}', './scripts/**/*.mjs'],
  // :hover utilities only apply where the primary input can hover (no sticky hover after a tap)
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        'primary-fixed': '#ffdea6', 'outline-variant': '#4e4638', 'surface-container-highest': '#2d3448',
        'surface-dim': '#0c1325', background: '#0c1325', 'on-background': '#dbe2fb', outline: '#9a8f7e',
        error: '#ffb4ab', 'on-surface': '#dbe2fb', 'on-primary-container': '#705000', 'surface-bright': '#32394c',
        'surface-container': '#181f31', 'surface-container-high': '#232a3c', 'surface-container-low': '#141b2d',
        'primary-fixed-dim': '#edc069', 'secondary-fixed-dim': '#acc7ff', 'secondary-fixed': '#d7e2ff',
        primary: '#ffe3b5', secondary: '#acc7ff', surface: '#0c1325', tertiary: '#d8e8ff',
        'on-surface-variant': '#d2c5b2', 'on-primary': '#412d00', 'primary-container': '#f2c46d',
        'on-secondary-container': '#99b9f9', 'surface-container-lowest': '#070e1f',
        'secondary-container': '#254881', 'surface-variant': '#2d3448',
      },
      borderRadius: { DEFAULT: '1rem', lg: '2rem', xl: '3rem', full: '9999px' },
      spacing: { gutter: '1rem', 'space-md': '1rem', margin: '1.25rem', 'space-xs': '0.25rem', 'space-lg': '1.5rem', 'space-sm': '0.5rem', 'space-xl': '2rem' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      // size, line height and tracking belong together: large text is tighter, small caps text is looser
      fontSize: {
        'headline-sm': ['18px', { lineHeight: '26px', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
        'body-sm': ['14px', { lineHeight: '21px', fontWeight: '400' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '600' }],
        display: ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['15px', { lineHeight: '23px', fontWeight: '400' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    },
  },
  plugins: [],
};
