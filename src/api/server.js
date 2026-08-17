import express from 'express';
import cors from 'cors';
import { authRouter, requireAuth } from './auth.js';
import { ordersRouter } from './orders.js';
import { groupsRouter } from './groups.js';
import { productsRouter } from './products.js';
import { onboardingRouter } from './onboarding.js';

export function startApiServer(buildHandlers) {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json());

  app.use('/api/onboarding', onboardingRouter(buildHandlers));
  app.use('/api/auth', authRouter());
  app.use('/api/orders', requireAuth, ordersRouter());
  app.use('/api/products', requireAuth, productsRouter());
  app.use('/api/groups', requireAuth, groupsRouter());

  const port = process.env.API_PORT || 4000;
  app.listen(port, () => console.log(`Vendor OS API listening on http://localhost:${port}`));
}