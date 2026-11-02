// CallMeBot free API: personal use, sends only to the phone that owns the apikey.
// It does NOT support WhatsApp groups (see README), so group reminders use the fallback
// (message to me + "Share to group" button).
export async function sendToMe(text) {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return { ok: false, error: "WHATSAPP_PHONE / CALLMEBOT_APIKEY not set" };
  const url = "https://api.callmebot.com/whatsapp.php?" + new URLSearchParams({ phone, text, apikey });
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const body = (await r.text()).replace(/<[^>]*>/g, " ").trim();
    if (!r.ok || /error/i.test(body)) {
      return { ok: false, error: `CallMeBot ${r.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export function extractInviteCode(link) {
  const m = /chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]{10,})/.exec(String(link || "").trim());
  return m ? m[1] : null;
}
