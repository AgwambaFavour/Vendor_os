import { supabase } from '../db/supabaseClient.js';
import { findOrCreateCustomer } from '../db/customers.js';

// Pulls a leading/trailing quantity out of order text, e.g.
// "2x Ankara Fabric" or "Ankara Fabric x2" → { quantity: 2, productText: "Ankara Fabric" }
function parseOrderText(text) {
  const trimmed = text.trim();
  let quantity = 1;
  let productText = trimmed;

  const leadingMatch = trimmed.match(/^(\d+)\s*x?\s*/i);
  const trailingMatch = trimmed.match(/\s*x\s*(\d+)$/i);

  if (leadingMatch) {
    quantity = parseInt(leadingMatch[1], 10);
    productText = trimmed.slice(leadingMatch[0].length);
  } else if (trailingMatch) {
    quantity = parseInt(trailingMatch[1], 10);
    productText = trimmed.slice(0, trimmed.length - trailingMatch[0].length);
  }

  return { quantity: quantity || 1, productText: productText.trim() };
}

/**
 * Call this from onMessage for every incoming message. It no-ops unless
 * the message looks like an order from a customer — a DM to the vendor
 * number, or a text message inside a registered group — that matches a
 * product name in the catalogue.
 */
export async function handleOrderMessage(msg, sock, { isSelfChat, isGroupChat }) {
  if (msg.key.fromMe) return;   // only customers place orders
  if (isSelfChat) return;       // self-chat is the photo/video intake channel

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    '';

  if (!text.trim() || text.trim().startsWith('/')) return;

  const { quantity, productText } = parseOrderText(text);
  if (!productText) return;

  const { data: matches, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', `%${productText}%`)
    .limit(1);

  if (error) {
    console.error('Failed to search products for order intake:', error);
    return;
  }

  if (!matches || matches.length === 0) return; // no match — probably not an order attempt

  const product = matches[0];
  const chatJid = msg.key.remoteJid;
  const customerJid = isGroupChat ? msg.key.participant : chatJid;
  if (!customerJid) return;

  const customer = await findOrCreateCustomer(customerJid, msg.pushName);
  if (!customer) return;

  const unitPrice = Number(product.price_naira);
  const total = unitPrice * quantity;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ customer_id: customer.id, total_naira: total })
    .select()
    .single();

  if (orderError) {
    console.error('Failed to create order:', orderError);
    return;
  }

  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    quantity,
    unit_price_naira: unitPrice,
  });

  if (itemError) {
    console.error('Failed to create order item:', itemError);
    return;
  }

  console.log(`Order created: ${quantity}x "${product.name}" for ${customerJid} (₦${total})`);

  await sock.sendMessage(chatJid, {
    text:
      `✅ Order received: ${quantity}x ${product.name} — ₦${total.toLocaleString()}\n` +
      `We'll be in touch shortly to confirm delivery.`,
  });
}