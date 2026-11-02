import { authorized, unauthorized, json } from "../lib/auth.mjs";
import { sendToMe, sendToGroup, isGroupId } from "../lib/whatsapp.mjs";

export const config = { path: "/api/test" };

export default async (req) => {
  if (!authorized(req)) return unauthorized();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const { target, chatId } = await req.json().catch(() => ({}));

  if (target === "group") {
    if (!isGroupId(chatId)) return json({ ok: false, error: "Pick a saved group first" }, 400);
    const r = await sendToGroup(chatId, "🧪 Test message from Deadline Reminders. Group sending works.");
    return r.ok ? json({ ok: true }) : json({ ok: false, error: r.error }, 502);
  }
  const r = await sendToMe("✅ Test from your Deadline Reminders app. WhatsApp sending works.");
  return r.ok ? json({ ok: true }) : json({ ok: false, error: r.error }, 502);
};
