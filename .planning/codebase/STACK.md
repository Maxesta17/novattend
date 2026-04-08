# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- JavaScript (ES2020+, ESM) - All frontend and backend code
- JSX - React component syntax

**Secondary:**
- CSS - Custom keyframe animations in `src/styles/animations.css`
- HTML - Single entry point `index.html`

**No TypeScript.** The project uses plain JS/JSX throughout. `@types/react` and `@types/react-dom` are installed as devDependencies (likely for IDE IntelliSense) but no `.ts`/`.tsx` files exist.

## Runtime

**Environment:**
- Node.js 18+ (stated requirement in CLAUDE.md)
- Browser target: modern browsers (ECMAScript 2020)
- Google Apps Script V8 runtime (backend)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React `^19.2.0` - UI library
- React DOM `^19.2.0` - DOM rendering
- React Router DOM `^7.13.0` - Client-side routing (SPA mode)

**Testing:**
- Vitest `^4.0.18` - Test runner (integrated with Vite)
- @testing-library/react `^16.3.2` - Component testing utilities
- @testing-library/jest-dom `^6.9.1` - Custom DOM matchers
- @testing-library/user-event `^14.6.1` - User interaction simulation
- jsdom `^28.1.0` - DOM environment for tests

**Build/Dev:**
- Vite `^7.3.1` - Build tool and dev server
- @vitejs/plugin-react `^5.1.1` - React Fast Refresh + JSX transform
- vite-plugin-pwa `^1.2.0` - PWA service worker generation (Workbox)

**Styling:**
- Tailwind CSS `^3.4.19` - Utility-first CSS framework
- PostCSS `^8.5.6` - CSS processing pipeline
- Autoprefixer `^10.4.24` - Vendor prefix automation

**Linting:**
- ESLint `^9.39.1` - Flat config format
- eslint-plugin-react-hooks `^7.0.1` - Hooks rules
- eslint-plugin-react-refresh `^0.4.24` - Fast Refresh compliance
- globals `^16.5.0` - Global variable definitions

## Key Dependencies

**Critical (production):**
- `react` `^19.2.0` - Core UI framework
- `react-dom` `^19.2.0` - DOM renderer
- `react-router-dom` `^7.13.0` - SPA routing with `ProtectedRoute` guards

**Note:** Only 3 production dependencies. The app is intentionally lightweight with no state management library, no HTTP client library (uses native `fetch`), and no UI component library.

**Infrastructure (dev only):**
- `vite` `^7.3.1` - Dev server on port 5173, production bundler
- `vite-plugin-pwa` `^1.2.0` - Generates service worker with Workbox strategies
- `tailwindcss` `^3.4.19` - All styling via utility classes
- `vitest` `^4.0.18` - Unit testing framework

## Configuration

**Environment:**
- `.env` file present (DO NOT read - contains secrets)
- Key env var: `VITE_API_URL` - Google Apps Script Web App URL
- Accessed via `import.meta.env.VITE_API_URL` in `src/config/api.js`
- When `VITE_API_URL` is empty/missing, app falls back to local mock data

**Build Configuration Files:**
- `vite.config.js` - Vite + React plugin + PWA plugin + Vitest config
- `tailwind.config.js` - Custom color tokens + font families
- `postcss.config.js` - Tailwind CSS + Autoprefixer pipeline
- `eslint.config.js` - ESLint flat config with React hooks/refresh plugins

**Tailwind Custom Tokens (in `tailwind.config.js`):**
- Colors: `burgundy`, `burgundy-dark`, `burgundy-light`, `burgundy-soft`, `gold`, `gold-light`, `gold-dark`, `gold-soft`, `off-white`, `cream`, `text-dark`, `text-body`, `text-muted`, `text-light`, `border`, `border-light`, `success`, `success-soft`, `warning`, `warning-soft`, `error`, `error-soft`, `dark-bg`
- Fonts: `font-cinzel` (Cinzel, serif), `font-montserrat` (Montserrat, sans-serif)

**PWA Configuration (in `vite.config.js`):**
- Register type: `autoUpdate`
- App shell precache: `**/*.{js,css,html,png,svg,ico,woff2}`
- Navigate fallback: `/offline.html`
- Runtime caching: Google Fonts (CacheFirst, 1yr), Google Apps Script API (NetworkFirst, 10s timeout)

**Vitest Configuration (in `vite.config.js`):**
- Environment: jsdom
- Globals: enabled (no need to import `describe`/`it`/`expect`)
- Setup file: `src/tests/setup.js` (imports `@testing-library/jest-dom`)

## Platform Requirements

**Development:**
- Node.js 18+
- npm (any recent version)
- `npm install` then `npm run dev` -> http://localhost:5173

**Production:**
- Static hosting (Vercel or similar) - outputs to `dist/`
- PWA-capable (service worker, manifest, offline fallback)
- Backend: Google Apps Script Web App (separate deployment)

**Dev Commands:**
- `npm run dev` - Vite dev server
- `npm run build` - Production build
- `npm run lint` - ESLint check (mandatory before delivery)
- `npm run preview` - Preview production build locally
- `npm test` - Run all tests (`vitest run`)
- `npm run test:watch` - Tests in watch mode

---

*Stack analysis: 2026-03-30*
