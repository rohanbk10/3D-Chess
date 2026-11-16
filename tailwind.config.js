/** Tailwind is only used at build time; the generated css/tailwind.css is committed. */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Cinzel', 'serif']
      },
      colors: {
        md: {
          bg: '#131316',
          surface: '#1C1B20',
          surfaceContainer: '#222127',
          surfaceHigh: '#2C2B33',
          primary: '#D0BCFF',
          onPrimary: '#381E72',
          primaryContainer: '#4F378B',
          onPrimaryContainer: '#EADDFF',
          secondary: '#CCC2DC',
          secondaryContainer: '#4A4458',
          tertiary: '#EFB8C8',
          outline: '#938F99',
          danger: '#F2B8B5',
          onDanger: '#601410'
        }
      }
    }
  }
};
