// Shrinks large phone photos before they're sent for reading.
//
// Invoices now go through ChefCode's server, and Vercel refuses any request
// body over 4.5 MB. A modern phone photo is often 3–6 MB, which is 4–8 MB once
// base64-encoded, so an unmodified photo would simply fail to upload. Only
// images over the limit are touched; everything smaller is sent exactly as
// before. 2560px on the long side is still ~230 dpi across a letter-size
// invoice, plenty for small print.

const SEND_LIMIT = 3_000_000; // base64 characters (~2.2 MB file); server hard-limits 4.2M
const MAX_EDGE = 2560;

export async function prepareForUpload(base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> {
  if (base64.length <= SEND_LIMIT || !mimeType.startsWith('image/')) return { data: base64, mimeType };

  try {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64}`;
    await img.decode(); // throws for formats the browser can't draw (e.g. HEIC outside Safari)

    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { data: base64, mimeType };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Step quality down only if a very detailed image is still over the limit.
    for (const quality of [0.85, 0.75, 0.6]) {
      const data = canvas.toDataURL('image/jpeg', quality).split(',')[1] || '';
      if (data && data.length <= SEND_LIMIT) return { data, mimeType: 'image/jpeg' };
    }
  } catch {
    // Can't be redrawn here — send it as-is and let the server's size check
    // decide, which produces a plain "too large" message if needed.
  }
  return { data: base64, mimeType };
}
