import cron from 'node-cron';
import { supabase } from '../db/supabaseClient.js';

/**
 * Polls scheduled_posts every minute for anything due, and sends it
 * through the given WhatsApp socket. This is the Phase 1 scheduler —
 * simple polling is fine at this volume. If you later add delayed
 * follow-ups or retries with backoff, move this to BullMQ + Redis
 * instead of scaling up cron.
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
export function startScheduler(sock) {
  cron.schedule('* * * * *', async () => {
    const { data: duePosts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (error) {
      console.error('Scheduler: failed to fetch due posts:', error);
      return;
    }

    for (const post of duePosts) {
      await sendScheduledPost(sock, post);
    }
  });

  console.log('Scheduler started (checking every minute).');
}

async function sendScheduledPost(sock, post) {
  try {
    const target = post.post_type === 'status' ? 'status@broadcast' : post.target_group_jid;

    const content = post.media_url
      ? { image: { url: post.media_url }, caption: post.content_text || '' }
      : { text: post.content_text || '' };

    const options =
      post.post_type === 'status'
        ? { statusJidList: Array.from(sock.knownContacts || []), broadcast: true }
        : {};

    await sock.sendMessage(target, content, options);

    await supabase
      .from('scheduled_posts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', post.id);

    console.log(`Scheduler: sent post ${post.id} (${post.post_type}).`);
  } catch (err) {
    console.error(`Scheduler: failed to send post ${post.id}:`, err);
    await supabase.from('scheduled_posts').update({ status: 'failed' }).eq('id', post.id);
  }
}
