# Deadline Reminders (Netlify + GREEN-API WhatsApp)

Add tasks with a deadline. A Netlify Scheduled Function runs every minute and sends WhatsApp reminders
(15 min, 20 min, 1 day, 2 days, or custom minutes before) to you and optionally to a WhatsApp group,
even when your browser and phone are closed.

## Sending service: GREEN-API (Developer plan, free)

CallMeBot's free API cannot send to groups (official page), so this version uses GREEN-API.
- Your own WhatsApp account is linked by QR code (like WhatsApp Web). Messages go out from your account.
- Free Developer plan: 3 chats total (contacts or groups), group support. Me + 1 group = 2 chats.
  A second group still fits; a 3rd chat does not. [unverified: whether your own number counts as a chat]
- Ban risk: unofficial-style gateway. A spare WhatsApp number is safer than your main one.

## Group mode: REAL GROUP SENDING (active)

GREEN-API sends to a group by its **group ID** (`1203630...@g.us`), not the invite link.
The app still accepts a pasted invite link (validated, invite code extracted, saved), but sending uses the group ID.
One-time steps to get it:
1. Your linked WhatsApp account must already be a member of the group.
2. In the app: pick "New group link…" in the group dropdown, click **Find my groups**,
   choose the group. Name and Group ID fill in. [unverified: depends on GREEN-API `getContacts`
   listing groups; if the list is empty, enter the ID by hand]
3. Click **Save group**. It now appears in the dropdown for later tasks.
Manual way to get the ID: GREEN-API console > your instance > API / Postman `getContacts`,
find your group, copy `id` ending in `@g.us`.

Group and "me" status are stored separately per reminder. A failed send stays pending and retries next minute.

## Files

```
public/index.html                    single page UI (HTML+CSS+JS, no build)
netlify/functions/tasks.mjs          task API: list, add, mark done, delete
netlify/functions/groups.mjs         saved groups: list, save, delete, lookup
netlify/functions/test-send.mjs      "Send test WhatsApp" / "Send test to group"
netlify/functions/send-reminders.mjs scheduled function, every minute
netlify/lib/*.mjs                    shared code (auth, store, message format, GREEN-API)
netlify.toml, package.json, .gitignore
```

## 1. GREEN-API setup

1. Sign up at console.green-api.com, create a Developer instance.
2. Open the instance. Status shows "Not Authorized" until linked.
3. Click the QR / authorization button. On the phone: WhatsApp > Settings > Linked devices > Link a device,
   scan the QR. Wait until Status becomes **Authorized**.
4. Copy: `apiUrl`, `idInstance`, `apiTokenInstance` (eye icon reveals the token). Never share the token publicly.

## 2. Environment variables (Netlify)

Site configuration > Environment variables. Add all five:

| Name | Value |
|---|---|
| `GREENAPI_URL` | your apiUrl, e.g. `https://7107.api.greenapi.com` |
| `GREENAPI_ID` | your idInstance |
| `GREENAPI_TOKEN` | your apiTokenInstance |
| `WHATSAPP_PHONE` | number that receives your reminders, with country code, e.g. `+923001234567` |
| `APP_PASSCODE` | any passcode you choose |

Secrets live only in Netlify env vars, never in frontend code. Redeploy after changing them.
Note: `WHATSAPP_PHONE` can be your own number (message to yourself) [unverified]. If that does not arrive,
use a different number.

## 3. Deploy from GitHub

1. Extract the ZIP, create a GitHub repo, push all files (keep folder structure).
2. Netlify > Add new site > Import an existing project > GitHub > pick the repo.
3. Build command: empty. Publish directory: `public`. Functions: `netlify/functions` (set in `netlify.toml`).
4. Deploy, add env variables, then trigger a redeploy.
5. Scheduled functions run only on the **published production deploy**. Check Logs > Functions > `send-reminders`.

## 4. Test

1. Open the site, enter the passcode. Click **Send test WhatsApp**. Message should arrive.
2. Group dropdown > "New group link…" > Find my groups > pick group > Save group.
3. With that group selected in the dropdown, click **Send test to group**. It posts in the group.
4. Add a task due in about 20 minutes (Asia/Karachi time), tick **15 min** and pick the group. Close the browser.
   Reminder arrives to you and the group 15 minutes before. Row shows "sent to me" and "sent to group".
5. Add a task whose reminder time already passed: it is skipped and a warning shows.

## Behaviour notes

- Deadlines are entered as Asia/Karachi time (UTC+5), stored as UTC, shown as Asia/Karachi.
- Each reminder marked sent only after GREEN-API returns a message id. On failure it stays pending, retried each minute until the deadline.
- Done or deleted tasks send nothing further.
- Each run sends at most 8 messages; the rest go out next minute.
- Message layout: first line "⏳ N unit remaining", then title, optional context, deadline. Same for me and group.

## Verification status

- GREEN-API request shape `{apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}` and group IDs ending `@g.us`: verified in GREEN-API docs.
- `sendMessage` body `{chatId, message}`, success returns `idMessage`: matches docs/SDK examples; exact response [unverified] on your instance.
- Developer plan: 3 chats, group support: verified on GREEN-API pricing pages. Plan terms may change.
- `getContacts` returning groups with `id`/`name`: [unverified].
- Messaging your own number via `...@c.us`: [unverified].
- Scheduled function via `export const config = { schedule }`, cron in UTC, production deploys only: verified in Netlify docs.
- Every-minute cron `* * * * *` accepted by Netlify: [unverified].
- Blobs API (`getStore`, `setJSON`, `get`, `getWithMetadata`, `list({prefix})`, `delete`, `consistency: "strong"`): verified in docs.
- `setJSON(..., { onlyIfMatch })` returning `{ modified }`: [unverified] exact return shape. Code tolerates a missing value.
- Free-tier cost of one invocation per minute (~43,200/month): [unverified]. Sources conflict (125,000 invocations vs 300 credits/month). Check Netlify Usage after a day.
- `@netlify/blobs` version range `>=8.1.0`: [unverified].
