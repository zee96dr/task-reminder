import { authorized, unauthorized, json } from "../lib/auth.mjs";
import { getDb, getGroups, saveGroups } from "../lib/store.mjs";
import { listGroups, isGroupId, extractInviteCode } from "../lib/whatsapp.mjs";

export const config = { path: ["/api/groups", "/api/groups/:id"] };

export default async (req, context) => {
  if (!authorized(req)) return unauthorized();
  const db = getDb();
  let id = context.params && context.params.id;
  try { if (id) id = decodeURIComponent(id); } catch {}
  try {
    if (req.method === "GET" && id === "lookup") {
      const r = await listGroups();
      return r.ok ? json({ groups: r.groups }) : json({ error: r.error }, 502);
    }
    if (req.method === "GET" && !id) return json({ groups: await getGroups(db) });

    if (req.method === "POST" && !id) {
      const b = await req.json();
      const chatId = String(b.chatId || "").trim();
      if (!isGroupId(chatId)) return json({ error: "Group ID must look like 1203630...@g.us" }, 400);
      let link = null, code = null;
      if (b.link && String(b.link).trim()) {
        code = extractInviteCode(b.link);
        if (!code) return json({ error: "That is not a WhatsApp group invite link" }, 400);
        link = `https://chat.whatsapp.com/${code}`;
      }
      const name = String(b.name || "Group").trim().slice(0, 60) || "Group";
      const groups = await getGroups(db);
      const i = groups.findIndex((g) => g.chatId === chatId);
      const g = { name, chatId, link, code };
      if (i >= 0) groups[i] = g; else groups.push(g);
      await saveGroups(db, groups);
      return json({ groups }, 201);
    }

    if (req.method === "DELETE" && id) {
      const groups = (await getGroups(db)).filter((g) => g.chatId !== id);
      await saveGroups(db, groups);
      return json({ groups });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: String(e.message || e) }, 500);
  }
};
