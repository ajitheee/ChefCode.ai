import { useEffect } from 'react';
import Navbar     from '../components/landing/Navbar';
import Hero       from '../components/landing/Hero';
import PainPoints from '../components/landing/PainPoints';
import HowItWorks from '../components/landing/HowItWorks';
import Stats      from '../components/landing/Stats';
import Features   from '../components/landing/Features';
import Security   from '../components/landing/Security';
import Pricing    from '../components/landing/Pricing';
import FinalCTA   from '../components/landing/FinalCTA';
import Footer     from '../components/landing/Footer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function LandingPage() {
  useDocumentTitle();

  // Honour the #anchor on arrival. This page is lazy-loaded, so when a visitor
  // lands on /#pricing the browser attempts its native jump before the section
  // exists, finds nothing, and leaves them at the top. That broke every
  // "/#features"-style link from the other pages, the footer, and any link to
  // a section pasted into an email. Runs once, after the sections are in the
  // DOM; an instant jump is right for arrival — smooth-scrolling down from the
  // hero on page load would just be motion for its own sake.
  //
  // Two details that matter:
  //  - behavior is explicit. Left out, scrollIntoView inherits the page's
  //    `scroll-behavior: smooth`, and a 4,700px glide needs animation frames to
  //    advance — so in a tab that isn't painting yet (opened in the background
  //    from an email) it simply never moves.
  //  - the jump is synchronous, not deferred to a requestAnimationFrame, for
  //    the same reason: frames are suspended until a tab is visible. An instant
  //    scroll forces layout itself and needs no frame.
  //
  // Web fonts can land after the jump and reflow the hero above the target,
  // nudging it off position, so it re-aligns once they are ready — unless the
  // visitor has started scrolling, in which case they are in control and the
  // page must not be yanked out from under them.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const jump = () =>
      document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    jump();

    let userTookOver = false;
    const takeOver = () => { userTookOver = true; };
    const intents = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
    intents.forEach((e) => window.addEventListener(e, takeOver, { passive: true }));

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled && !userTookOver) jump();
    });

    return () => {
      cancelled = true;
      intents.forEach((e) => window.removeEventListener(e, takeOver));
    };
  }, []);

  return (
    <>
      <Navbar />
      <Hero />
      <PainPoints />
      <HowItWorks />
      <Stats />
      <Features />
      <Security />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  );
}
