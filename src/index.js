import { connectWhatsApp } from './whatsapp/connection.js';
import { startScheduler } from './scheduler/scheduler.js';
import { handleForwardedImage } from './whatsapp/statusInbox.js';
import { handleGroupCommand } from './whatsapp/groupCommands.js'; // add this

connectWhatsApp({
  onReady: (sock) => {
    startScheduler(sock);
    console.log('Ready. Forward product photos to your own number to post them to Status.');
  },
  onMessage: (msg, sock, meta) => {
    handleForwardedImage(msg, sock, meta);
    handleGroupCommand(msg, sock);
    // Phase 2: order intake, FAQ auto-replies from customers, etc.
    // will hook in here too.
  },
});