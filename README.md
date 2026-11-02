# Deadline Reminders (Netlify + CallMeBot WhatsApp)

Add tasks with a deadline. A Netlify Scheduled Function runs every minute and sends WhatsApp reminders
(15 min, 20 min, 1 day, 2 days, or custom minutes before) even when your browser and phone are closed.

## Group mode: **FALLBACK (active)**

I checked the official CallMeBot WhatsApp page (callmebot.com/blog/free-api-whatsapp-messages/).
The free WhatsApp API is personal-use only and sends only to the phone that owns the apikey.
The same page lists "Send messages to Groups" as something it does **not** do (it points to paid
services). So there is no group ID to find, and a `chat.whatsapp.com` invite link cannot send messages.

What the app does instead (no unofficial or paid service is used):

1. For each due reminder on a task that has a group, you get the full message on WhatsApp.
2. In the task list that reminder shows **group: forward it** and a **Share to group** button.
3. The button opens a `wa.me` share link with the message pre-filled. Pick the group, tap send.

The pasted group link is validated (invite code extracted) and saved under a name so you can reuse it
from the dropdown. The status "sent to group" cannot be known by the app; it shows "forward it" instead.
In this mode one WhatsApp message to you covers both "me" and "group" for the same reminder
(no duplicate message). The two flags are still stored separately.

## Files

```
public/index.html                    single page UI (HTML+CSS+JS, no build)
netlify/functions/tasks.mjs          task API: list, add, mark done, delete
netlify/functions/groups.mjs         saved groups: list, delete
netlify/functions/test-send.mjs      "Send test WhatsApp" / "Send test to group"
netlify/functions/send-reminders.mjs scheduled function, every minute
netlify/lib/*.mjs                    shared code (auth, store, message format, CallMeBot)
netlify.toml, package.json, .gitignore
```

## 1. Get the CallMeBot apikey

1. Save the CallMeBot WhatsApp bot number as a contact. The number is shown on
   https://www.callmebot.com/blog/free-api-whatsapp-messages/ (the page currently says the bot can be
   full; if no number is shown, check back later).
2. From your WhatsApp, send it exactly: `I allow callmebot to send me messages`
3. Wait for the reply: "API Activated for your phone number. Your APIKEY is 123123".
   If nothing arrives in 2 minutes, try again after 24 hours.
4. Note the apikey and your phone number with country code, e.g. `+923001234567`.

## 2. Environment variables (Netlify)

Site configuration > Environment variables > Add a variable. Add all three:

| Name | Value |
|---|---|
| `WHATSAPP_PHONE` | your number with country code, e.g. `+923001234567` |
| `CALLMEBOT_APIKEY` | apikey from step 1 |
| `APP_PASSCODE` | any passcode you choose (you type it in the app) |

Secrets live only in Netlify env vars. They are never in the frontend. Redeploy after changing them.

## 3. Deploy from GitHub

1. Extract the ZIP, create a GitHub repo, push all files (keep the folder structure).
2. Netlify > Add new site > Import an existing project > GitHub > pick the repo.
3. Build command: leave empty. Publish directory: `public` (already set in `netlify.toml`).
   Functions directory: `netlify/functions` (already set).
4. Deploy. Add the env variables (step 2) and trigger a redeploy.
5. Scheduled functions run only on the **published production deploy**, not on deploy previews or
   branch deploys. Check Netlify > Logs > Functions > `send-reminders` to see it running each minute.

## 4. Test

1. Open the site, enter the passcode.
2. Click **Send test WhatsApp**. A message should arrive within about a minute.
3. Click **Send test to group**, then tap **Share to group** and send it to your group.
4. Add a task with deadline about 20 minutes from now (Asia/Karachi time) and tick **15 min**.
   Close the browser. The reminder arrives 15 minutes before the deadline and the task row shows "sent to me".
5. Add a task whose reminder time already passed: the reminder is skipped and a warning appears.

## Behaviour notes

- Deadlines are entered as Asia/Karachi time (UTC+5), stored as UTC, shown as Asia/Karachi.
- Each reminder is marked sent only after CallMeBot accepts it. On failure it stays pending and is retried
  on the next run (until the deadline passes).
- Done or deleted tasks send nothing further.
- Each run sends at most 6 messages to stay inside the function time limit; the rest go out next minute.
- Message layout: first line "⏳ N unit remaining", then title, optional context, deadline.

## Verification status

- CallMeBot has no WhatsApp group sending: verified on the official page (see above).
- CallMeBot GET endpoint `https://api.callmebot.com/whatsapp.php?phone=&text=&apikey=`: verified on the official page.
- CallMeBot success/error response text: [unverified]. The code treats HTTP errors or a body containing "error" as failure.
- Scheduled function via `export const config = { schedule: "..." }`, cron in UTC, production deploys only: verified in Netlify docs.
- Every-minute cron `* * * * *` accepted by Netlify: [unverified] (standard cron; docs show `@hourly` and `0 0 * * *` examples).
- Blobs API (`getStore`, `setJSON`, `get`, `getWithMetadata`, `list({prefix})`, `delete`, `consistency: "strong"`): verified in docs / package readme.
- `setJSON(..., { onlyIfMatch })` returning `{ modified }`: [unverified] exact return shape. Code tolerates a missing value.
- Free-tier cost of one invocation per minute (~43,200/month): [unverified]. Sources conflict: older plans list 125,000
  invocations, newer free accounts use 300 credits/month. Check Netlify > Usage after a day.
- `@netlify/blobs` version range `>=8.1.0` in `package.json`: [unverified]. Pin to the latest version npm shows if you prefer.
