import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

export function productsRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch products:', error);
      return res.status(500).json({ message: 'Failed to fetch products.' });
    }
    res.json(data);
  });

  router.post('/', async (req, res) => {
    const { name, description, price_naira, quantity } = req.body;

    if (!name || price_naira == null) {
      return res.status(400).json({ message: 'Name and price are required.' });
    }

    const qty = Number(quantity) || 0;

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        description: description || null,
        price_naira: Number(price_naira),
        quantity: qty,
        status: qty > 0 ? 'in_stock' : 'sold_out',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create product:', error);
      return res.status(500).json({ message: 'Failed to create product.' });
    }
    res.json(data);
  });

  router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price_naira, quantity, status } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price_naira !== undefined) updates.price_naira = Number(price_naira);
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update product:', error);
      return res.status(500).json({ message: 'Failed to update product.' });
    }
    res.json(data);
  });

  return router;
}