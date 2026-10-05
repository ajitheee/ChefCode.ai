// ─────────────────────────────────────────────────────────────────────────────
// Invoice extraction — the only place the Gemini API key is ever used.
//
// Why this runs on the server: the key used to be compiled into the website's
// JavaScript (a VITE_ variable), so anyone could copy it out of chefcode.cc.
// On 2026-10-04 Google suspended the project for "abusive activity consistent
// with hijacked resources". Now the browser sends the invoice here; this
// function checks the caller is a signed-in ChefCode user whose organization
// may process invoices, then calls Gemini with a key that never leaves Vercel.
//
//   POST /api/extract-invoice
//   Authorization: Bearer <Supabase access token>
//   { "file": { "data": "<base64>", "mimeType": "image/jpeg" }, "prompt": "…" }
//
//   200 → { "text": "<the model's JSON>" }
//   4xx/5xx → { "error": { "reason": "<CODE>" } }
//
// The response never carries Google's own error text. That text can quote the
// API key back (a suspended key's error does, word for word), and anything sent
// to the browser is readable by whoever is using it.
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

// An alias that follows Google's current Flash-Lite model, so a retirement
// doesn't take invoice reading down (gemini-2.0-flash's did in July 2026).
const MODEL = 'gemini-flash-lite-latest';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
]);
// Vercel rejects any request body over 4.5 MB before this code runs. Keep the
// file comfortably inside that, leaving room for the prompt and JSON wrapper.
const MAX_FILE_BASE64 = 4_200_000;
const MAX_PROMPT = 30_000;

export type Reason =
  | 'METHOD_NOT_ALLOWED' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'ORG_INACTIVE' | 'TRIAL_EXPIRED'
  | 'BAD_REQUEST' | 'UNSUPPORTED_FILE' | 'TOO_LARGE' | 'NOT_CONFIGURED'
  | 'AI_ACCESS' | 'AI_MODEL_GONE' | 'AI_QUOTA' | 'AI_BUSY' | 'AI_ERROR';

const fail = (status: number, reason: Reason) =>
  Response.json({ error: { reason } }, { status, headers: { 'Cache-Control': 'no-store' } });

// ── Who is calling, and may they? ────────────────────────────────────────────

/**
 * Verifies the Supabase session and applies the same rule as the invoices
 * INSERT policy in chefcode_trial_enforcement.sql: the organization must be
 * active, and either on a paid plan or inside its trial. A deactivated team
 * member is refused too. Reads go through Supabase with the caller's own token,
 * so row-level security limits them to the caller's own profile and org.
 * Returns null when the caller may proceed.
 */
export async function authorise(token: string): Promise<Reason | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return 'NOT_CONFIGURED';
  const headers = { apikey: anon, Authorization: `Bearer ${token}` };

  const userRes = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userRes.ok) return 'UNAUTHENTICATED';
  const user = await userRes.json();
  if (!user?.id) return 'UNAUTHENTICATED';

  const profileRes = await fetch(
    `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=org_id,is_active`, { headers });
  const [profile] = profileRes.ok ? await profileRes.json() : [];
  if (!profile?.org_id || profile.is_active === false) return 'FORBIDDEN';

  const orgRes = await fetch(
    `${url}/rest/v1/organizations?id=eq.${encodeURIComponent(profile.org_id)}&select=is_active,is_trial,trial_ends_at`,
    { headers });
  const [org] = orgRes.ok ? await orgRes.json() : [];
  if (!org) return 'FORBIDDEN';

  if (org.is_active === false) return 'ORG_INACTIVE';
  const trialOk = !org.is_trial || !org.trial_ends_at || new Date(org.trial_ends_at).getTime() > Date.now();
  return trialOk ? null : 'TRIAL_EXPIRED';
}

// ── Talking to Gemini ────────────────────────────────────────────────────────

const errStatus = (e: any): number | undefined => {
  const s = e?.status ?? e?.code ?? e?.error?.code;
  return typeof s === 'number' ? s : undefined;
};
const errText = (e: any) => String(e?.message || e?.error?.message || '').toLowerCase();

/** Maps a Gemini failure to a reason the browser can explain in plain words. */
export function classify(e: any): Reason {
  const s = errStatus(e);
  const m = errText(e);
  if (s === 401 || s === 403 || ['unauthenticated', 'permission_denied', 'api key not valid',
       'api_key_invalid', 'account_state_invalid', 'consumer_suspended', 'service account'].some(w => m.includes(w))) {
    return 'AI_ACCESS';
  }
  if (s === 404) return 'AI_MODEL_GONE';
  if (['quota', 'billing', 'exhausted', 'free_tier', 'credits', 'depleted', 'limit: 0'].some(w => m.includes(w))) {
    return 'AI_QUOTA';
  }
  if (s === 503 || s === 429 || ['unavailable', 'high demand', 'overloaded', 'rate limit'].some(w => m.includes(w))) {
    return 'AI_BUSY';
  }
  return 'AI_ERROR';
}

const INVOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vendorName: { type: Type.STRING },
    invoiceNumber: { type: Type.STRING },
    invoiceDate: { type: Type.STRING },
    deliveryAddress: { type: Type.STRING, description: 'The Ship To or Delivery Address found on the invoice' },
    matchedLocation: { type: Type.STRING, description: 'Exact name of the registered location the delivery address matches, or empty string if none' },
    totalAmount: { type: Type.NUMBER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          productNumber: { type: Type.STRING },
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          totalPrice: { type: Type.NUMBER },
          glCode: { type: Type.STRING },
          categoryName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          isDatabaseMatch: { type: Type.BOOLEAN, description: 'True if matched from Master DB, False if inferred' },
        },
        required: ['description', 'quantity', 'unitPrice', 'totalPrice', 'glCode', 'categoryName'],
      },
    },
  },
  required: ['vendorName', 'items', 'totalAmount'],
};

/** One extraction call, retrying brief overloads (not quota) with backoff. */
export async function generate(apiKey: string, file: { data: string; mimeType: string }, prompt: string) {
  const ai = new GoogleGenAI({ apiKey });
  const request = {
    model: MODEL,
    contents: { parts: [{ inlineData: { mimeType: file.mimeType, data: file.data } }, { text: prompt }] },
    config: {
      // Extraction is structured output, not reasoning, so ask for the least
      // thinking the model allows; thinking tokens bill at the output rate.
      // This used to be `thinkingBudget: 0`, which the current model rejects
      // outright (HTTP 400) — "minimal" is how it now takes the same request.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      responseMimeType: 'application/json',
      responseSchema: INVOICE_SCHEMA,
    },
  };
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await ai.models.generateContent(request);
      return { text: res.text ?? '', usage: res.usageMetadata };
    } catch (e) {
      if (classify(e) !== 'AI_BUSY' || attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); // 1s, 2s
    }
  }
}

/** For logs only. Even Vercel's private logs should never hold the key. */
function redact(s: string, key: string) {
  return String(s)
    .split(key).join('[KEY]')
    .replace(/AQ\.[A-Za-z0-9_-]{20,}/g, '[KEY]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[KEY]')
    .replace(/api_key:[^'"\s]+/g, 'api_key:[KEY]');
}

// ── The endpoint ─────────────────────────────────────────────────────────────

export interface Deps {
  authorise: (token: string) => Promise<Reason | null>;
  generate: typeof generate;
  apiKey: () => string | undefined;
}

const defaultDeps: Deps = {
  authorise,
  generate,
  // Deliberately NOT a VITE_ variable: those are compiled into the website.
  apiKey: () => process.env.GEMINI_API_KEY,
};

/** The whole request flow, with its dependencies injectable for tests. */
export async function handle(request: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED');

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return fail(401, 'UNAUTHENTICATED');

  const denied = await deps.authorise(token).catch(() => 'UNAUTHENTICATED' as Reason);
  if (denied === 'NOT_CONFIGURED') return fail(500, denied);
  if (denied === 'UNAUTHENTICATED') return fail(401, denied);
  if (denied) return fail(403, denied);

  let body: any;
  try { body = await request.json(); } catch { return fail(400, 'BAD_REQUEST'); }
  const data = body?.file?.data;
  const mimeType = String(body?.file?.mimeType || '').toLowerCase();
  const prompt = body?.prompt;
  if (typeof data !== 'string' || !data || typeof prompt !== 'string' || !prompt) return fail(400, 'BAD_REQUEST');
  if (prompt.length > MAX_PROMPT) return fail(400, 'BAD_REQUEST');
  if (!ALLOWED_TYPES.has(mimeType)) return fail(415, 'UNSUPPORTED_FILE');
  if (data.length > MAX_FILE_BASE64) return fail(413, 'TOO_LARGE');

  const key = deps.apiKey();
  if (!key) return fail(500, 'NOT_CONFIGURED');

  try {
    const { text, usage } = await deps.generate(key, { data, mimeType }, prompt);
    if (!text) return fail(502, 'AI_ERROR');
    console.log(`extract-invoice ok: in=${usage?.promptTokenCount ?? '?'} out=${usage?.candidatesTokenCount ?? '?'} thinking=${usage?.thoughtsTokenCount ?? 0}`);
    return Response.json({ text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    const reason = classify(e);
    console.error(`extract-invoice failed: ${reason} status=${errStatus(e) ?? '?'} ${redact(e?.message || '', key).slice(0, 300)}`);
    const status = reason === 'AI_BUSY' || reason === 'AI_QUOTA' ? 503 : 502;
    return fail(status, reason);
  }
}

export function POST(request: Request) {
  return handle(request);
}
