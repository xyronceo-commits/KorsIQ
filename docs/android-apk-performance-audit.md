# Android APK / Mobile Web Performance Audit & Optimization

## Scope
This repository contains the KorsIQ web application (`React 19` + `Vite 6` + `Express 5` + `Supabase`) which is wrapped by the Android APK (via TWA/WebView using `public/manifest.json`). No native Android/Kotlin/Capacitor project exists inside this repository.

## Bottlenecks Identified
1. **3.1 MB Monolithic Entry Bundle**: `App.tsx` statically imported every route/page (`AcademicStudio`, `StudyHub`, `StudyGroups`, `CGPACalculator`, `AdminApp`, `LandingPage`, `Onboarding`) and heavy export libraries (`jspdf`, `pptxgenjs`, `jszip`), forcing Android WebView to parse and compile `3,106.28 kB` (`745.14 kB` gzip) on every cold start.
2. **Cold-Start Auth & Supabase Waterfall**: `App.tsx` blocked initial UI behind `"Loading session..."` until `getProfile` completed and then `Promise.all([getCourses, getSchedule, getHubs, getGroups])` completed, ignoring existing local cache (`DBService`) during startup.
3. **3 Wasted Startup Write-Backs**: After `loadUserData` populated `profile`, `courses`, and `schedule`, `App.tsx` `useEffect` hooks immediately wrote all three back to Supabase on startup.
4. **Duplicate Tab-Switch Queries**: Switching between `Overview`, `Study Hub`, `Academic Studio`, and `Planner` unmounted views and re-fetched `getAcademicDocuments` and `getTasks` repeatedly.
5. **Render-Blocking `<head>` & Splash Mismatch**: `index.html` lacked `preconnect` hints for `cdn.tailwindcss.com` and `fonts.googleapis.com`, included an unused `esm.sh` importmap, and `public/manifest.json` used `#020617` dark background while the app is light-first (`#F8FAFC`).

## Fixes Applied
- **Code Splitting (`vite.config.ts`, `App.tsx`)**: Added `manualChunks` (`vendor-react`, `vendor-supabase`, `vendor-exports`, `vendor-charts`, `vendor-motion`, `vendor-markdown`) and converted 15 secondary/heavy views to `React.lazy` + `Suspense` with a lightweight `PageSkeleton`.
- **Instant Cache Hydration & Non-Blocking Secondary Fetch (`services/db.ts`, `App.tsx`)**: Added `DBService.readUserCacheSnapshot(uid)` to hydrate returning users immediately on cold start, prioritized `getProfile`/`getCourses`/`getSchedule` before background `getHubs`/`getGroups`, and eliminated the 3 startup write-backs via `skip*SyncRef`.
- **Navigation Query Deduplication (`services/db.ts`)**: Added `withShortTtl` (20s TTL + in-flight deduplication, invalidated on mutations and sign-out) for `getAcademicDocuments` and `getTasks`.
- **Visibility-Aware Health Check (`App.tsx`)**: Replaced unconditional 30s `checkConnection()` polling with `online`/`offline` event listeners and a 60s visibility-gated check.
- **App Shell & Manifest (`index.html`, `public/manifest.json`)**: Added `preconnect` links, removed unused importmap, added an instant inline `#root` loading shell, and aligned `manifest.json` `background_color` (`#F8FAFC`) and `theme_color` (`#2563EB`).

## Measured Build Results
- **Entry JS Bundle (`dist/assets/index-*.js`)**:
  - Before: `3,106.28 kB` (`745.14 kB` gzip)
  - After: `668.60 kB` (`174.62 kB` gzip) — **78.5% smaller raw entry** (`76.6%` smaller gzipped).
- **Split Vendor & Route Chunks**:
  - `vendor-exports`: `766.68 kB` (`255.42 kB` gzip) — deferred until Studio/export
  - `AcademicStudio`: `295.06 kB` (`49.85 kB` gzip) — lazy-loaded
  - `StudyHub`: `200.44 kB` (`30.73 kB` gzip) — lazy-loaded
  - `CGPACalculator`: `114.35 kB` (`17.48 kB` gzip) — lazy-loaded

## Remaining Limitations & Android Testing
- `index.html` still loads `https://cdn.tailwindcss.com` at runtime; migrating Tailwind to a build-time PostCSS step in a future pass would eliminate that external script download on 3G/4G cold starts.
- Physical Android APK cold-start and Nigerian mobile network latency should be verified on a real Android device after deploying this build.
