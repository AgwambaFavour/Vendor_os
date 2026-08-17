import { bootAllVendors } from './whatsapp/socketManager.js';
import { startScheduler } from './scheduler/scheduler.js';
import { startApiServer } from './api/server.js';
import { handleForwardedMedia } from './whatsapp/statusInbox.js';
import { handleGroupCommand } from './whatsapp/groupCommands.js';
import { handleAddProductCommand } from './whatsapp/productCommands.js';
import { handleOrderMessage } from './whatsapp/orderIntake.js';

function buildHandlers(vendor) {
  return {
    onReady: (sock) => {
      startScheduler(sock);
      console.log(`[${vendor.business_name || vendor.phone}] Ready.`);
    },
    onMessage: (msg, sock, meta) => {
      handleForwardedMedia(msg, sock, meta);
      handleGroupCommand(msg, sock, meta);
      handleAddProductCommand(msg, sock, meta);
      handleOrderMessage(msg, sock, meta);
    },
  };
}

startApiServer(buildHandlers); // runs immediately, not tied to any one vendor
await bootAllVendors(buildHandlers);