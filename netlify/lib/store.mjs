import { getStore } from "@netlify/blobs";

export const getDb = () => getStore({ name: "reminders", consistency: "strong" });

export async function listTasks(db) {
  const { blobs } = await db.list({ prefix: "task:" });
  const tasks = await Promise.all(blobs.map((b) => db.get(b.key, { type: "json" })));
  return tasks.filter(Boolean);
}

// Read-modify-write guarded by etag so a UI edit and the scheduler never overwrite each other.
export async function updateTask(db, id, mutate) {
  const key = `task:${id}`;
  for (let i = 0; i < 5; i++) {
    const cur = await db.getWithMetadata(key, { type: "json" });
    if (!cur || !cur.data) return null;
    const next = mutate(structuredClone(cur.data));
    if (!next) return cur.data;
    const res = await db.setJSON(key, next, { onlyIfMatch: cur.etag });
    if (!res || res.modified !== false) return next;
  }
  throw new Error("Could not save task after retries");
}

export async function getGroups(db) {
  return (await db.get("groups", { type: "json" })) || [];
}
export const saveGroups = (db, groups) => db.setJSON("groups", groups);
