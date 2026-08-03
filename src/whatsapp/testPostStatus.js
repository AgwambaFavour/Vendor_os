/**
 * Milestone script: connect to WhatsApp and post ONE image to Status.
 *
 * Run: npm run test:status -- /path/to/image.jpg "Caption text" [phoneNumbers]
 *
 * phoneNumbers (optional): comma-separated, international format,
 * digits only, no "+". E.g. "2348012345678,2348098765432". If omitted,
 * the script falls back to whatever contacts have synced automatically
 * — which some accounts don't push at all, so passing numbers directly
 * is the more reliable path for testing.
 *
 * First run will print a QR code — scan it with the vendor's phone
 * under WhatsApp > Linked Devices. After that, the session persists
 * in auth_state/ and future runs connect automatically.
 */
import { connectWhatsApp } from './connection.js';
import fs from 'fs';

const [, , imagePath, caption, phoneNumbersArg] = process.argv;

if (!imagePath || !fs.existsSync(imagePath)) {
  console.error('Usage: npm run test:status -- /path/to/image.jpg "Caption text" [phoneNumbers]');
  process.exit(1);
}

const explicitJids = phoneNumbersArg
  ? phoneNumbersArg.split(',').map((n) => `${n.trim()}@s.whatsapp.net`)
  : [];

connectWhatsApp({
  onReady: async (sock) => {
    try {
      // WhatsApp Status broadcast uses the special JID "status@broadcast",
      // but WhatsApp's servers only deliver it to the JIDs you list in
      // statusJidList — an empty list delivers to no one, and this is
      // NOT optional the way group/DM sends are. We pull the synced
      // contact store and use every WhatsApp user we know about.
      let statusJidList = explicitJids;

      if (statusJidList.length === 0) {
        // Contact sync timing varies — poll instead of guessing a fixed delay.
        const waitForContacts = async (maxWaitMs = 20000) => {
          const start = Date.now();
          while (Date.now() - start < maxWaitMs) {
            if ((sock.knownContacts?.size || 0) > 0) return;
            await new Promise((r) => setTimeout(r, 1000));
          }
        };
        await waitForContacts();
        statusJidList = Array.from(sock.knownContacts || []);
      }

      if (statusJidList.length === 0) {
        console.error(
          'No contacts to post Status to. Your account isn\'t syncing ' +
          'contacts automatically — pass phone numbers directly instead:\n' +
          '  npm run test:status -- image.jpg "caption" 2348012345678,2348098765432'
        );
        process.exit(1);
      }

      console.log(`Posting ${imagePath} to Status (visible to ${statusJidList.length} contacts)...`);

      await sock.sendMessage(
        'status@broadcast',
        {
          image: fs.readFileSync(imagePath),
          caption: caption || '',
        },
        {
          statusJidList,
          broadcast: true,
        }
      );

      console.log('Status send call completed.');
      console.log(
        'IMPORTANT: Baileys has open, unresolved bugs where this call ' +
        'succeeds without error but the status never appears on the ' +
        "phone (see README 'Known risks'). Check the vendor's phone " +
        'directly to confirm it actually posted before trusting this path.'
      );
      process.exit(0);
    } catch (err) {
      console.error('Failed to post status:', err);
      process.exit(1);
    }
  },
});
