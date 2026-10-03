// ─────────────────────────────────────────────────────────────────────────────
// Site-wide contact destinations.
//
// Everything a prospect can click to reach a human lives here, so there is
// exactly one place to change it and no way for one button to drift dead while
// the other still works. (The previous mailto: pointed at sales@chefcode.ai —
// a domain that was never registered, so every Enterprise and demo lead
// bounced silently.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Where "Book a Demo" / "Book a 30-Min Demo" send people.
 *
 * If this ever changes, change it HERE and nowhere else — the landing page,
 * the pricing table, the login screen and the trial-upgrade banner all read
 * this one value. Keep the button copy's stated duration in step with the
 * Calendly event's real duration.
 *
 * scripts/check-cta-links.mjs fails the build if this is left unset.
 */
export const DEMO_BOOKING_URL = 'https://calendly.com/et-ajith2k/30min';

/** True once DEMO_BOOKING_URL has been pointed at a real https:// booking page. */
export const hasBookingLink = /^https:\/\//.test(DEMO_BOOKING_URL);
