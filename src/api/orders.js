import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

export function ordersRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, status, total_naira, delivery_notes, created_at,
        customers ( id, whatsapp_jid, display_name ),
        order_items ( id, quantity, unit_price_naira, products ( name ) )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch orders:', error);
      return res.status(500).json({ message: 'Failed to fetch orders.' });
    }

    res.json(data);
  });

  return router;
}