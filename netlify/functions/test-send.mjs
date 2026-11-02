import { authorized, unauthorized, json } from "../lib/auth.mjs";
import { sendToMe } from "../lib/whatsapp.mjs";

export const config = { path: "/api/test" };

export default async (req) => {
  if (!authorized(req)) return unauthorized();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { target } = await req.json().catch(() => ({}));

  if (target === "group") {
    // Fallback mode: message goes to me, page shows a "Share to group" button.
    const text = "🧪 Test message for the group.\nIf you can read this in the group, sharing works.";
    const r = await sendToMe(text);
    return r.ok ? json({ ok: true, mode: "fallback", shareText: text }) : json({ ok: false, error: r.error }, 502);
  }

  const r = await sendToMe("✅ Test from your Task Reminder app. WhatsApp sending works.");
  return r.ok ? json({ ok: true }) : json({ ok: false, error: r.error }, 502);
};
