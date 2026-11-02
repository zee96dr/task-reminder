import { getDb, listTasks, updateTask } from "../lib/store.mjs";
import { buildMessage } from "../lib/format.mjs";
import { sendToMe } from "../lib/whatsapp.mjs";

// Runs every minute (cron is evaluated in UTC; "* * * * *" is timezone-independent).
export const config = { schedule: "* * * * *" };

const MAX_SENDS_PER_RUN = 6; // keep run short; leftovers go out on the next minute

export default async () => {
  const db = getDb();
  const now = Date.now();
  const tasks = await listTasks(db);
  tasks.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
  let sends = 0;

  outer: for (const task of tasks) {
    if (task.done) continue;
    if (now > Date.parse(task.deadline)) continue; // deadline passed: nothing more to send
    for (const r of task.reminders) {
      if (r.me !== "pending" || Date.parse(r.fireAt) > now) continue;
      if (sends >= MAX_SENDS_PER_RUN) break outer;
      sends++;

      const res = await sendToMe(buildMessage(task, r.minutes));
      if (!res.ok) {
        console.error(`send failed task=${task.id} min=${r.minutes}: ${res.error}`); // stays pending, retried next run
        continue;
      }
      // Fallback group mode: the same message that reached me is what gets forwarded,
      // so the group flag becomes "ready" (UI shows Share to group) together with "me".
      await updateTask(db, task.id, (t) => {
        const x = t.reminders.find((q) => q.minutes === r.minutes);
        if (!x || x.me !== "pending") return null;
        x.me = "sent";
        if (x.group === "pending") x.group = "ready";
        return t;
      });
    }
  }
  console.log(`run done: ${sends} send attempt(s)`);
};
