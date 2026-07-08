import React, { useState, useEffect, lazy, Suspense } from 'react';
import './index.css'; // Tailwind build with brand colors for landing page

// Lazy-load pages so none blocks the others
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SetupGuide = lazy(() => import('./pages/SetupGuide'));
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

  // Any path starting with /app loads the existing product
  if (path.startsWith('/app')) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <ExistingApp />
      </Suspense>
    );
  }

  // Setup guide page
  if (path.startsWith('/setup')) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SetupGuide />
      </Suspense>
    );
  }

  // Everything else shows the landing page
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LandingPage />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
