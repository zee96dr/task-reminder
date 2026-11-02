import { timingSafeEqual } from "node:crypto";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Passcode comes from env APP_PASSCODE, sent by the page in the x-passcode header.
export function authorized(req) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  const got = req.headers.get("x-passcode") || "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unauthorized = () => json({ error: "Wrong or missing passcode" }, 401);
