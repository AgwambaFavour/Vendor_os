import { supabase } from '../db/supabaseClient.js';

/**
 * Call this from onMessage for every incoming message. It no-ops for
 * anything that isn't a /addproduct command typed by you in self-chat.
 *
 * Format: /addproduct Name, Price[, Quantity]
 * e.g.    /addproduct Ankara Fabric, 5000, 20
 */
export async function handleAddProductCommand(msg, sock, { isSelfChat }) {
  if (!isSelfChat) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    '';

  if (!text.trim().toLowerCase().startsWith('/addproduct')) return;

  const args = text.slice(text.toLowerCase().indexOf('/addproduct') + '/addproduct'.length).trim();
  const parts = args.split(',').map((p) => p.trim()).filter(Boolean);
  const [name, priceStr, quantityStr] = parts;
  const price = Number(priceStr);
  const quantity = quantityStr ? Number(quantityStr) : 0;

  if (!name || !priceStr || Number.isNaN(price)) {
    await sock.sendMessage(msg.key.remoteJid, {
      text:
        '⚠️ Usage: /addproduct Name, Price, Quantity(optional)\n' +
        'Example: /addproduct Ankara Fabric, 5000, 20',
    });
    return;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      price_naira: price,
      quantity: Number.isNaN(quantity) ? 0 : quantity,
      status: quantity > 0 ? 'in_stock' : 'sold_out',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add product:', error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⚠️ Failed to add product — check the bot logs.',
    });
    return;
  }

  console.log(`Product added: ${data.name} (₦${data.price_naira})`);
  await sock.sendMessage(msg.key.remoteJid, {
    text:
      `✅ Added "${data.name}" — ₦${data.price_naira}` +
      (quantity ? ` (qty: ${quantity})` : '') +
      `\nCustomers can order by messaging its name.`,
  });
}