import React, { useState, useEffect, lazy, Suspense } from 'react';
import './index.css'; // Tailwind build with brand colors for landing page

// Lazy-load pages so none blocks the others
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SetupGuide = lazy(() => import('./pages/SetupGuide'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const SecurityOverview = lazy(() => import('./pages/SecurityOverview'));
const DataProcessing = lazy(() => import('./pages/DataProcessing'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Policy pages, matched exactly. None collides with the landing page's
// #security anchor — that's a hash, not a path. Kept in one table so adding a
// page is one line here plus one entry in vercel.json's rewrites.
const LEGAL_ROUTES: Array<[string, React.LazyExoticComponent<() => JSX.Element>]> = [
  ['/privacy', Privacy],
  ['/terms', Terms],
  ['/security', SecurityOverview],
  ['/dpa', DataProcessing],
];
// Note: the file is named MainApp.tsx (not App.tsx) on purpose — on Windows
// the dev server resolved the URL /app to App.tsx case-insensitively and
// served raw source instead of the SPA.
const ExistingApp = lazy(() => import('../MainApp'));

/** Minimal hash-free router — no extra dependencies needed. */
export default function Router() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  // Matching is exact, not prefix. With startsWith, /setupfoo or
  // /security-team rendered a real page while the server (vercel.json) answered
  // the same URL with a 404 — two halves of the site disagreeing about which
  // pages exist. These rules must stay in step with the rewrites there.
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;

  // The product: /app, plus anything beneath it (auth redirects land on /app).
  if (clean === '/app' || clean.startsWith('/app/')) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ExistingApp />
      </Suspense>
    );
  }

  if (clean === '/setup') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SetupGuide />
      </Suspense>
    );
  }

  const legal = LEGAL_ROUTES.find(([route]) => clean === route);
  if (legal) {
    const Page = legal[1];
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Page />
      </Suspense>
    );
  }

  if (clean === '/' || clean === '/index.html') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LandingPage />
      </Suspense>
    );
  }

  // Anything else is not a page.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <NotFound />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-brand-800/75">Loading…</p>
      </div>
    </div>
  );
}
