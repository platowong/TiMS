const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const clients = {}; // { socket.id: { role, name } }

function updateAdminClientList() {
  const clientList = Object.values(clients)
    .filter(c => c.role === 'client')
    .map(c => c.name);
  
  // Notify all admins about the updated client list
  for (const [id, client] of Object.entries(clients)) {
    if (client.role === 'admin') {
      io.to(id).emit('clientListUpdate', clientList);
    }
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (role, name) => {
    clients[socket.id] = { role, name };
    console.log(`${role} registered as ${name} (${socket.id})`);

    updateAdminClientList();
  });

  socket.on('sendURL', ({ targetName, url }) => {
    for (const [id, client] of Object.entries(clients)) {
      if (client.name === targetName && client.role === 'client') {
        io.to(id).emit('updateURL', url);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete clients[socket.id];
    updateAdminClientList();
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
