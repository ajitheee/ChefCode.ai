import React from 'react';
import ReactDOM from 'react-dom/client';
import Router from './src/Router';

// Capture the auth flow from the URL hash BEFORE Supabase loads and consumes
// it (detectSessionInUrl clears the hash while establishing the session, which
// otherwise dropped invited / password-reset users onto the login screen).
// This runs before the lazy app/supabase chunks load, so the hash is intact.
try {
  const h = window.location.hash || '';
  if (h.includes('type=recovery') || h.includes('type=invite')) {
    sessionStorage.setItem('chefcode_pw_flow', '1');
  }
} catch { /* sessionStorage unavailable — ignore */ }

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);