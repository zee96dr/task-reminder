// GREEN-API (green-api.com) sender. Request shape: {apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}
// Secrets only from env: GREENAPI_URL, GREENAPI_ID, GREENAPI_TOKEN, WHATSAPP_PHONE.
function cfg() {
  const url = (process.env.GREENAPI_URL || "").replace(/\/+$/, "");
  const id = process.env.GREENAPI_ID;
  const token = process.env.GREENAPI_TOKEN;
  return url && id && token ? { url, id, token } : null;
}

async function call(method, httpMethod = "POST", body) {
  const c = cfg();
  if (!c) return { ok: false, error: "GREENAPI_URL / GREENAPI_ID / GREENAPI_TOKEN not set" };
  try {
    const r = await fetch(`${c.url}/waInstance${c.id}/${method}/${c.token}`, {
      method: httpMethod,
      headers: { "content-type": "application/json" },
      body: httpMethod === "POST" ? JSON.stringify(body || {}) : undefined,
      signal: AbortSignal.timeout(12000),
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    if (!r.ok) return { ok: false, error: `GREEN-API ${r.status}: ${text.slice(0, 200)}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export async function sendText(chatId, text) {
  const r = await call("sendMessage", "POST", { chatId, message: text });
  if (!r.ok) return r;
  if (!r.data || !r.data.idMessage) return { ok: false, error: "GREEN-API gave no idMessage (is the instance authorized?)" };
  return { ok: true };
}

export function myChatId() {
  const d = String(process.env.WHATSAPP_PHONE || "").replace(/\D/g, "");
  return d ? `${d}@c.us` : null;
}
export function sendToMe(text) {
  const id = myChatId();
  return id ? sendText(id, text) : Promise.resolve({ ok: false, error: "WHATSAPP_PHONE not set" });
}
export const sendToGroup = (chatId, text) => sendText(chatId, text);

// Lists groups the linked WhatsApp account is in (to find the real group ID). [unverified] response shape.
export async function listGroups() {
  const r = await call("getContacts", "GET");
  if (!r.ok) return r;
  const arr = Array.isArray(r.data) ? r.data : [];
  const groups = arr
    .filter((c) => c && typeof c.id === "string" && c.id.endsWith("@g.us"))
    .map((c) => ({ id: c.id, name: c.name || c.contactName || c.id }));
  return { ok: true, groups };
}

export const isGroupId = (s) => /^[0-9]+(-[0-9]+)?@g\.us$/.test(String(s || "").trim());

export function extractInviteCode(link) {
  const m = /chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]{10,})/.exec(String(link || "").trim());
  return m ? m[1] : null;
}
