# WhatsApp Vendor OS — Phase 1 MVP

Single-vendor scaffold: WhatsApp connection layer, Postgres schema, and a
cron-based scheduler for Status posts and group messages. Built to run
on your machine (not in a sandbox) since it needs a real connection to
WhatsApp's servers.

## Setup

1. `npm install`
2. Create a Supabase project, then run `sql/schema.sql` in its SQL editor.
3. `cp .env.example .env` and fill in `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings.
4. Test the connection + one Status post:
   ```
   npm run test:status -- /path/to/image.jpg "Your caption here"
   ```
   First run prints a QR code in the terminal — scan it from the
   vendor's phone under **WhatsApp > Linked Devices**. The session is
   saved to `auth_state/` so you won't need to re-scan on future runs
   (as long as the phone stays connected to the internet at least
   once every ~2 weeks — WhatsApp expires unused linked sessions).
5. Once that works, `npm start` runs the full connection + scheduler.

## Known risks — read before you rely on this in production

- **This uses Baileys, not WhatsApp's official Business API.** It
  connects the way WhatsApp Web does. This is how virtually every
  informal WhatsApp automation tool works, but it's outside WhatsApp's
  terms of service, and accounts can get rate-limited or banned —
  more likely with heavy send volume. Consider giving vendors a
  secondary/dedicated number rather than their main line, at least
  until you've seen how stable this is in practice.
- **Status posting specifically has open, unresolved bugs in Baileys**
  as of mid-2026 — some users report `sendMessage` to `status@broadcast`
  returning success with nothing appearing on the phone. The test
  script in `testPostStatus.js` handles the API correctly (populated
  `statusJidList` + `broadcast: true`, which many broken examples online
  get wrong), but you should manually verify on the vendor's actual
  phone every time you test — don't trust a clean exit code alone.
- **The contact list needs a moment to sync** after a fresh QR scan
  before `statusJidList` has anything in it. If the test script says
  "no contacts found," wait a minute and try again.

## Forward-to-Status workflow

Once `npm start` is running, forward product photos to your own WhatsApp
number and they'll automatically post to Status:

1. `npm start` (leave it running)
2. In WhatsApp, open your own chat (message yourself) and forward one or
   more photos into it
3. Each photo gets downloaded and posted to Status, one at a time (a
   short delay between posts if you forward several at once, so it
   doesn't look like a burst to WhatsApp)
4. Whatever text you attach as a caption on the forward carries over as
   the Status caption

**Who sees the post:** pulled from the `customers` table by default —
add rows there as you get real customers. For testing before you have
any, set `STATUS_JID_LIST` in `.env` to your own number (or a friend's)
so you have something to verify against. To broadcast to your entire
WhatsApp contact list instead, set `STATUS_BROADCAST_ALL_CONTACTS=true`
— but note this requires a **fresh QR pairing**: delete `auth_state/`
and re-scan, since full contact sync is only pushed once, at pairing
time, not on every reconnect.

## Project layout

- `src/whatsapp/connection.js` — Baileys connection, session persistence, reconnect logic
- `src/whatsapp/testPostStatus.js` — milestone script: connect + post one Status image
- `src/scheduler/scheduler.js` — polls `scheduled_posts` every minute and sends due posts
- `src/db/supabaseClient.js` — Supabase client (service role, backend-only)
- `sql/schema.sql` — products, customers, orders, order_items, scheduled_posts

## What's next (not built yet)

- Group automation (scheduled greetings/promos to customer groups) —
  the `scheduler.js` already handles `post_type: 'group_message'`,
  you just need a way to insert rows into `scheduled_posts`.
- Product catalogue + order intake from incoming messages (hook into
  `onMessage` in `src/index.js`).
- Invoice generation (PDF) after order status moves to `packed`.
- The web dashboard (React) for the vendor to manage all of this
  without touching the database directly.
