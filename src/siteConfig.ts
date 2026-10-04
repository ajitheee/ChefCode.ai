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

/**
 * Where privacy, security and data-deletion requests go.
 *
 * ⚠️  This is currently the booking link, because there is no working mailbox
 *     on chefcode.cc (no MX records) and chefcode.ai was never registered.
 *     Privacy law expects a contact channel a person can actually reach, so
 *     set up a real mailbox (privacy@chefcode.cc) and put it here.
 */
export const PRIVACY_CONTACT_URL = DEMO_BOOKING_URL;
export const PRIVACY_CONTACT_LABEL = 'Book a call with us';

/** Legal entity named in the policies. */
export const LEGAL_ENTITY = 'ChefCode.ai';
export const LEGAL_JURISDICTION = 'the State of California, United States';

/** Effective date stamped on the policy pages (ISO, YYYY-MM-DD). */
export const POLICY_UPDATED = '2026-10-03';
