// Turns a failed invoice upload into a sentence a person can act on.
//
// Invoice reading now happens on ChefCode's server (api/extract-invoice.ts),
// which answers a failure with a short reason code and never with the AI
// provider's own text — that text can quote the API key back. This file maps
// each reason to what the person should actually do. Before it existed, a
// chef whose upload failed saw Google's raw JSON on screen.

import { PRIVACY_CONTACT_EMAIL } from '../src/siteConfig';

const support = `email ChefCode support at ${PRIVACY_CONTACT_EMAIL}`;

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Your sign-in has expired. Sign out and back in, then upload the invoice again.',
  FORBIDDEN: "Your account isn't set up to process invoices. Ask your ChefCode account owner to check your access.",
  ORG_INACTIVE: `Your organization's ChefCode account is paused, so new invoices can't be processed. Please ${support}.`,
  TRIAL_EXPIRED: 'Your trial has expired. Please upgrade to continue processing invoices.',
  UNSUPPORTED_FILE: "This file type can't be read. Upload a JPG, PNG or PDF of the invoice.",
  TOO_LARGE: 'This file is too large to upload. The limit is about 3 MB, so please upload a smaller PDF or photo.',
  BAD_REQUEST: "ChefCode couldn't send this invoice for reading. Please try again.",
  NOT_CONFIGURED: `Invoice reading isn't set up on ChefCode's server right now. Please ${support}.`,
  AI_ACCESS: `Invoice reading is down right now: the AI service rejected ChefCode's access key. Your invoice is fine. Please ${support} so we can restore it.`,
  AI_MODEL_GONE: `Invoice reading is down right now: the AI model ChefCode uses has been retired by its provider. Your invoice is fine. Please ${support} so we can restore it.`,
  AI_QUOTA: `Invoice reading is paused because the AI usage limit has been reached. Please try again later, and if this continues, ${support}.`,
  AI_BUSY: 'The AI service is busy right now. Please wait a few seconds and try again.',
  AI_ERROR: `ChefCode couldn't read this invoice because the AI service returned an error. Please try again, and if it keeps happening, ${support}.`,
  SERVER_TIMEOUT: "ChefCode's server took too long to read this invoice. Please try again in a moment.",
  NETWORK: "ChefCode couldn't reach its server. Check your internet connection and try again.",
};

/** Plain-language sentence for a reason code from the extraction endpoint. */
export const describeExtractionFailure = (reason: string): string =>
  MESSAGES[reason] ?? MESSAGES.AI_ERROR;

/** An upload failure that already carries its plain-language message. */
export class ExtractionError extends Error {
  constructor(public readonly reason: string) {
    super(describeExtractionFailure(reason));
    this.name = 'ExtractionError';
  }
}
