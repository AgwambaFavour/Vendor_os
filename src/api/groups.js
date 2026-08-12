import { Router } from 'express';
import { supabase } from '../db/supabaseClient.js';

export function groupsRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const { data, error } = await supabase
      .from('groups')
      .select('id, jid, name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch groups:', error);
      return res.status(500).json({ message: 'Failed to fetch groups.' });
    }

    res.json(data);
  });

  return router;
}