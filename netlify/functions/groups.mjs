import { authorized, unauthorized, json } from "../lib/auth.mjs";
import { getDb, getGroups, saveGroups } from "../lib/store.mjs";

export const config = { path: ["/api/groups", "/api/groups/:code"] };

export default async (req, context) => {
  if (!authorized(req)) return unauthorized();
  const db = getDb();
  const code = context.params && context.params.code;
  try {
    if (req.method === "GET" && !code) return json({ groups: await getGroups(db) });
    if (req.method === "DELETE" && code) {
      const groups = (await getGroups(db)).filter((g) => g.code !== code);
      await saveGroups(db, groups);
      return json({ groups });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: String(e.message || e) }, 500);
  }
};
