import { connectWhatsApp } from './whatsapp/connection.js';
import { startScheduler } from './scheduler/scheduler.js';
import { handleForwardedMedia } from './whatsapp/statusInbox.js';
import { handleGroupCommand } from './whatsapp/groupCommands.js';
import { handleAddProductCommand } from './whatsapp/productCommands.js';
import { handleOrderMessage } from './whatsapp/orderIntake.js';
import { startApiServer } from './api/server.js';

connectWhatsApp({
  onReady: (sock) => {
    startScheduler(sock);
    startApiServer(sock);
    console.log('Ready. Forward product photos or videos to your own number to post them to Status.');
  },
  onMessage: (msg, sock, meta) => {
    handleForwardedMedia(msg, sock, meta);
    handleGroupCommand(msg, sock);
    handleAddProductCommand(msg, sock, meta);
    handleOrderMessage(msg, sock, meta);
  },
});