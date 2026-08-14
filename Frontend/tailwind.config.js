/** @type {import('tailwindcss').Config} */

/**
 * BuildRight Cameroon design tokens.
 * Spec: docs/design/01-foundations.md
 *
 * Two layers:
 *  1. Ramps (green/red/amber/blue/neutral) are fixed hex, derived in OKLCH. Charts and
 *     one-off encodings may read these directly.
 *  2. Semantic tokens (canvas/surface/fg/line/status) resolve to CSS variables defined in
 *     index.css, so light and dark are one file edit and never a second set of classes.
 *
 * Components must use layer 2. Layer 1 is for the chart palette only.
 */

// rgb(var(--x) / <alpha-value>) keeps Tailwind opacity modifiers working on themed colors.
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ---------- Layer 1: tonal ramps ----------
        green: {
          50: '#F4F8F6', 100: '#E3F0EC', 200: '#C2E6DA', 300: '#8DDAC1',
          400: '#51C4A2', 500: '#0BAB85', 600: '#00916C', 700: '#007C5A',
          800: '#006345', 900: '#004C33', 950: '#002C1A',
        },
        red: {
          50: '#FBF5F5', 100: '#FFE6E6', 200: '#FFCDCC', 300: '#FFADAA',
          400: '#FF7F7B', 500: '#F74E4C', 600: '#DD2826', 700: '#C20F06',
          800: '#A00000', 900: '#7C0000', 950: '#4A0000',
        },
        amber: {
          50: '#F9F8E3', 100: '#F6EFBA', 200: '#F6DD66', 300: '#ECC400',
          400: '#D0A700', 500: '#B58C00', 600: '#9C7300', 700: '#875F00',
          800: '#6F4A00', 900: '#54380A', 950: '#2F1F0C',
        },
        blue: {
          50: '#F4F7F9', 100: '#E4EEF7', 200: '#C7E0F8', 300: '#9CCCFE',
          400: '#73B0F6', 500: '#5694E2', 600: '#3D7ACE', 700: '#2E64BC',
          800: '#234DA1', 900: '#193784', 950: '#0A185B',
        },
        neutral: {
          50: '#F6F7F7', 100: '#ECEDEC', 200: '#D9DDDC', 300: '#C2C9C6',
          400: '#A4AFAB', 500: '#899691', 600: '#717E79', 700: '#5E6B66',
          800: '#495651', 900: '#36413D', 950: '#1C2522', 975: '#131D19',
          1000: '#0E1613',
        },

        // ---------- Layer 2: semantic surfaces ----------
        canvas: themed('canvas'),
        surface: themed('surface'),
        raised: themed('raised'),
        sunken: themed('sunken'),

        // Text. Named `fg` so `text-fg` reads correctly and `text-primary` can keep
        // meaning "brand green" for the pages not yet migrated.
        fg: {
          DEFAULT: themed('fg'),
          secondary: themed('fg-secondary'),
          tertiary: themed('fg-tertiary'),
          placeholder: themed('fg-placeholder'),
          disabled: themed('fg-disabled'),
          inverse: themed('fg-inverse'),
        },

        // Borders. `line` avoids the `border-border` stutter.
        line: {
          DEFAULT: themed('line'),
          subtle: themed('line-subtle'),
          strong: themed('line-strong'),
        },
        input: themed('line-input'),

        // Intent
        // `DEFAULT` is the text/icon value; `fill` is the button surface. They differ in
        // dark mode, where a text-legible green is too dim to carry a filled control.
        accent: {
          DEFAULT: themed('accent'),
          fill: themed('accent-fill'),
          'fill-hover': themed('accent-fill-hover'),
          fg: themed('accent-fg'),
          subtle: themed('accent-subtle'),
        },
        danger: {
          DEFAULT: themed('danger'),
          fill: themed('danger-fill'),
          'fill-hover': themed('danger-fill-hover'),
          fg: themed('danger-fg'),
          subtle: themed('danger-subtle'),
        },
        warning: themed('warning'),
        info: themed('info'),
        focus: themed('focus-ring'),

        // ---------- Status tokens (Phase 1 section 2.5) ----------
        planned: { bg: themed('planned-bg'), fg: themed('planned-fg'), line: themed('planned-line') },
        progress: { bg: themed('progress-bg'), fg: themed('progress-fg'), line: themed('progress-line') },
        delayed: { bg: themed('delayed-bg'), fg: themed('delayed-fg'), line: themed('delayed-line') },
        done: { bg: themed('done-bg'), fg: themed('done-fg'), line: themed('done-line') },
        over: { bg: themed('over-bg'), fg: themed('over-fg'), line: themed('over-line') },
        stalled: { bg: themed('stalled-bg'), fg: themed('stalled-fg'), line: themed('stalled-line') },

        // ---------- Legacy aliases ----------
        // Kept so unmigrated pages keep rendering during the Phase 5 refactor.
        // `secondary` was raw flag red used as a brand fill; it now resolves to the
        // danger token, which is the only correct meaning for red in this system.
        primary: themed('accent'),
        secondary: themed('danger'),
        dark: themed('fg'),
      },

      // Spacing is Tailwind's default 4pt scale, which already matches the spec exactly.
      // No overrides, so there is one scale and arbitrary values stand out in review.

      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Source Serif 4 Variable', 'Source Serif 4', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      // Size, line-height, tracking and weight travel together, so a role cannot be
      // half-applied. Spec: 01-foundations.md section 3.2.
      fontSize: {
        display: ['clamp(2.75rem, 1.9rem + 3.4vw, 4.25rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '620' }],
        h1: ['clamp(2rem, 1.65rem + 1.5vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.022em', fontWeight: '600' }],
        h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.016em', fontWeight: '600' }],
        h3: ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.011em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65', letterSpacing: '-0.005em', fontWeight: '400' }],
        body: ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        caption: ['0.8125rem', { lineHeight: '1.45', letterSpacing: '0.005em', fontWeight: '450' }],
        overline: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600' }],
      },

      borderRadius: {
        none: '0',
        xs: '4px',
        DEFAULT: '6px', // = sm, so the 32 legacy `rounded` usages land on the scale
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },

      // Layered shadows, neutral-950 tinted. The sm/md/lg/xl aliases map the six legacy
      // shadow values onto the four real elevations without touching any page.
      boxShadow: {
        e1: '0 1px 2px -1px rgb(28 37 34 / 0.10), 0 1px 1px rgb(28 37 34 / 0.06)',
        e2: '0 2px 4px -2px rgb(28 37 34 / 0.10), 0 4px 8px -2px rgb(28 37 34 / 0.08), 0 0 0 1px rgb(28 37 34 / 0.04)',
        e3: '0 4px 8px -4px rgb(28 37 34 / 0.10), 0 12px 20px -6px rgb(28 37 34 / 0.10), 0 0 0 1px rgb(28 37 34 / 0.05)',
        e4: '0 8px 16px -8px rgb(28 37 34 / 0.12), 0 24px 40px -12px rgb(28 37 34 / 0.14), 0 0 0 1px rgb(28 37 34 / 0.06)',
        DEFAULT: '0 1px 2px -1px rgb(28 37 34 / 0.10), 0 1px 1px rgb(28 37 34 / 0.06)',
        sm: '0 1px 2px -1px rgb(28 37 34 / 0.10), 0 1px 1px rgb(28 37 34 / 0.06)',
        md: '0 2px 4px -2px rgb(28 37 34 / 0.10), 0 4px 8px -2px rgb(28 37 34 / 0.08), 0 0 0 1px rgb(28 37 34 / 0.04)',
        lg: '0 4px 8px -4px rgb(28 37 34 / 0.10), 0 12px 20px -6px rgb(28 37 34 / 0.10), 0 0 0 1px rgb(28 37 34 / 0.05)',
        xl: '0 8px 16px -8px rgb(28 37 34 / 0.12), 0 24px 40px -12px rgb(28 37 34 / 0.14), 0 0 0 1px rgb(28 37 34 / 0.06)',
        none: 'none',
      },

      transitionDuration: {
        instant: '100ms',
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
        ambient: '700ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        out: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        in: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
        emphasis: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },

      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        fadeOut: { from: { opacity: '1' }, to: { opacity: '0' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.98) translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        // One continuous push in — never out. Linear, because any easing on a short pan
        // reads as the image stalling at one end or the other. The travel is deliberately
        // small: the frame resets to 1 when the next slide takes over, so the smaller the
        // total zoom, the less that reset can register as a bounce.
        heroZoom: { from: { transform: 'scale(1)' }, to: { transform: 'scale(1.08)' } },
        // Live socket arrival: reads as "this just changed" without moving anything.
        valueFlash: { '0%': { backgroundColor: 'rgb(var(--accent) / 0.12)' }, '100%': { backgroundColor: 'transparent' } },
        shimmer: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        breathe: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },
      animation: {
        'fade-in': 'fadeIn 250ms cubic-bezier(0.05, 0.7, 0.1, 1)',
        'fade-out': 'fadeOut 150ms cubic-bezier(0.3, 0, 0.8, 0.15)',
        'scale-in': 'scaleIn 250ms cubic-bezier(0.05, 0.7, 0.1, 1)',
        'sheet-up': 'sheetUp 250ms cubic-bezier(0.05, 0.7, 0.1, 1)',
        // Runs for the slide's hold PLUS its fade out, so the outgoing frame is still
        // moving inward while it dissolves. If it froze at the end instead, the incoming
        // frame starting back at scale 1 would read as a zoom out.
        // Duration must stay equal to HERO_INTERVAL_MS + HERO_FADE_MS in pages/Home.jsx.
        'hero-zoom': 'heroZoom 4600ms linear forwards',
        'value-flash': 'valueFlash 400ms cubic-bezier(0.05, 0.7, 0.1, 1)',
        shimmer: 'shimmer 1.2s ease-in-out infinite',
        breathe: 'breathe 2s ease-in-out infinite',
      },

      screens: {
        '3xl': '1920px',
      },
      maxWidth: {
        prose: '68ch',      // editorial measure
        content: '1440px',  // public portal
        admin: '1760px',    // dense tables
      },
      aspectRatio: {
        plot: '21 / 9',     // chart plot area, desktop
        photo: '4 / 3',     // construction photography
        cover: '16 / 9',    // card cover crop: shorter, so more cards fit above the fold
      },
    },

    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem', '2xl': '4rem' },
      screens: { sm: '100%', md: '720px', lg: '960px', xl: '1200px', '2xl': '1360px', '3xl': '1440px' },
    },
  },
  plugins: [],
};
