import express from 'express';
import cors from 'cors';
import { authRouter, requireAuth } from './auth.js';
import { ordersRouter } from './orders.js';
import { groupsRouter } from './groups.js';
import { productsRouter } from './products.js';

export function startApiServer(sock) {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/api/auth', authRouter(sock));
  app.use('/api/orders', requireAuth, ordersRouter());
  app.use('/api/groups', requireAuth, groupsRouter());
  app.use('/api/products', requireAuth, productsRouter());
  const port = process.env.API_PORT || 4000;
  app.listen(port, () => {
    console.log(`Vendor OS API listening on http://localhost:${port}`);
  });
}