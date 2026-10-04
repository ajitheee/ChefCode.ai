// Turns a failure from the AI provider into a sentence a person can act on.
//
// The Gemini SDK's error message is Google's raw JSON response body. Before
// this existed, any failure that wasn't "quota" or "busy" was rethrown as-is
// and rendered on the invoice screen — e.g. a chef saw
//   {"error":{"code":401,"message":"The bound service account is deleted or
//   disabled...","status":"UNAUTHENTICATED", ...}}
// when the API key died. People must never see provider JSON: they need to
// know what failed, that it isn't their fault, and who to tell.
//
// No imports beyond the contact address, so it can be tested on its own
// against a real SDK error.

import { PRIVACY_CONTACT_EMAIL } from '../src/siteConfig';

const status = (err: any): number | undefined => {
  const s = err?.status ?? err?.code ?? err?.error?.code;
  return typeof s === 'number' ? s : undefined;
};

const text = (err: any): string =>
  String(err?.message || err?.error?.message || '').toLowerCase();

/** The key was rejected: invalid, revoked, or its Google account disabled. */
export const isAccessProblem = (err: any): boolean => {
  const s = status(err);
  const m = text(err);
  return (
    s === 401 || s === 403 ||
    m.includes('unauthenticated') || m.includes('permission_denied') ||
    m.includes('api key not valid') || m.includes('api_key_invalid') ||
    m.includes('account_state_invalid') || m.includes('service account')
  );
};

/** The model ChefCode asks for no longer exists (retired or renamed). */
export const isModelGone = (err: any): boolean => {
  const m = text(err);
  return status(err) === 404 || (m.includes('not_found') && m.includes('model'));
};

/**
 * Anything carrying an HTTP status or a JSON body came from the provider.
 * ChefCode's own errors are plain `new Error("...")` sentences and are left
 * alone so their wording survives.
 */
export const isProviderError = (err: any): boolean => {
  const raw = String(err?.message || '');
  return status(err) !== undefined || /^\s*[{[]/.test(raw) || raw.includes('"error"');
};

const support = `email ChefCode support at ${PRIVACY_CONTACT_EMAIL}`;

/** Plain-language replacement for a provider failure, or null to rethrow as-is. */
export const describeAiFailure = (err: any): string | null => {
  if (isAccessProblem(err)) {
    return `Invoice reading is down right now: the AI service rejected ChefCode's access key. Your invoice is fine. Please ${support} so we can restore it.`;
  }
  if (isModelGone(err)) {
    return `Invoice reading is down right now: the AI model ChefCode uses has been retired by its provider. Your invoice is fine. Please ${support} so we can restore it.`;
  }
  if (isProviderError(err)) {
    return `ChefCode couldn't read this invoice because the AI service returned an error. Please try again, and if it keeps happening, ${support}.`;
  }
  return null;
};
