import { authorized, unauthorized, json } from "../lib/auth.mjs";
import { getDb, listTasks, updateTask, getGroups, saveGroups } from "../lib/store.mjs";
import { buildMessage } from "../lib/format.mjs";
import { extractInviteCode, isGroupId } from "../lib/whatsapp.mjs";

export const config = { path: ["/api/tasks", "/api/tasks/:id"] };

const withText = (t) => ({
  ...t,
  reminders: t.reminders.map((r) => ({ ...r, text: buildMessage(t, r.minutes) })),
});

export default async (req, context) => {
  if (!authorized(req)) return unauthorized();
  const db = getDb();
  const id = context.params && context.params.id;

  try {
    if (req.method === "GET" && !id) {
      const tasks = await listTasks(db);
      tasks.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
      return json({ tasks: tasks.map(withText) });
    }

    if (req.method === "POST" && !id) {
      const b = await req.json();
      const title = String(b.title || "").trim().slice(0, 200);
      const note = String(b.note || "").trim().slice(0, 1000);
      const deadlineMs = Date.parse(b.deadline);
      if (!title) return json({ error: "Title is required" }, 400);
      if (Number.isNaN(deadlineMs)) return json({ error: "Deadline is invalid" }, 400);

      const mins = [...new Set((b.reminders || []).map(Number))].filter(
        (m) => Number.isInteger(m) && m >= 1 && m <= 525600
      );
      if (!mins.length) return json({ error: "Pick at least one reminder" }, 400);

      let group = null;
      if (b.group) {
        const chatId = String(b.group.chatId || "").trim();
        if (!isGroupId(chatId)) return json({ error: "Group ID is missing or invalid (use Find my groups)" }, 400);
        let link = null, code = null;
        if (b.group.link && String(b.group.link).trim()) {
          code = extractInviteCode(b.group.link);
          if (!code) return json({ error: "That is not a WhatsApp group invite link" }, 400);
          link = `https://chat.whatsapp.com/${code}`;
        }
        group = { name: String(b.group.name || "Group").trim().slice(0, 60) || "Group", chatId, link, code };
        const groups = await getGroups(db);
        const i = groups.findIndex((g) => g.chatId === chatId);
        if (i >= 0) groups[i] = { ...groups[i], name: group.name, link: link || groups[i].link, code: code || groups[i].code };
        else groups.push(group);
        await saveGroups(db, groups);
      }

      const now = Date.now();
      const warnings = [];
      const reminders = mins
        .sort((a, b) => b - a)
        .map((m) => {
          const fireAt = deadlineMs - m * 60000;
          const past = fireAt <= now;
          if (past) warnings.push(`Reminder ${m} min before: time already passed, skipped.`);
          return {
            minutes: m,
            fireAt: new Date(fireAt).toISOString(),
            me: past ? "skipped" : "pending",
            group: group ? (past ? "skipped" : "pending") : null,
          };
        });

      const task = {
        id: crypto.randomUUID(),
        title,
        note,
        deadline: new Date(deadlineMs).toISOString(),
        done: false,
        createdAt: new Date().toISOString(),
        group,
        reminders,
      };
      await db.setJSON(`task:${task.id}`, task);
      return json({ task: withText(task), warnings }, 201);
    }

    if (req.method === "PATCH" && id) {
      const b = await req.json();
      const t = await updateTask(db, id, (x) => {
        x.done = !!b.done;
        return x;
      });
      return t ? json({ task: withText(t) }) : json({ error: "Not found" }, 404);
    }

    if (req.method === "DELETE" && id) {
      await db.delete(`task:${id}`);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: String(e.message || e) }, 500);
  }
};
