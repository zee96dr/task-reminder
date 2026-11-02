import { getDb, listTasks, updateTask } from "../lib/store.mjs";
import { buildMessage } from "../lib/format.mjs";
import { sendToMe, sendToGroup } from "../lib/whatsapp.mjs";

// Runs every minute (cron evaluated in UTC; "* * * * *" is timezone-independent).
export const config = { schedule: "* * * * *" };

const MAX_SENDS_PER_RUN = 8; // keep run short; leftovers go out next minute

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
      if (Date.parse(r.fireAt) > now) continue;
      const text = buildMessage(task, r.minutes);

      for (const who of ["me", "group"]) {
        if (who === "group" && !task.group) continue;
        if (r[who] !== "pending") continue;
        if (sends >= MAX_SENDS_PER_RUN) break outer;
        sends++;

        const res = who === "me" ? await sendToMe(text) : await sendToGroup(task.group.chatId, text);
        if (!res.ok) {
          console.error(`send failed task=${task.id} min=${r.minutes} to=${who}: ${res.error}`); // stays pending, retried next run
          continue;
        }
        // Mark only this recipient, so a failure on one never blocks or repeats the other.
        await updateTask(db, task.id, (t) => {
          const x = t.reminders.find((q) => q.minutes === r.minutes);
          if (!x || x[who] !== "pending") return null;
          x[who] = "sent";
          return t;
        });
      }
    }
  }
  console.log(`run done: ${sends} send attempt(s)`);
};
