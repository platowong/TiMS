const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const clients = {}; // { socket.id: { role, id, name, currentURL } }

function updateAdminClientList() {
  const clientList = Object.values(clients)
    .filter(c => c.role === 'client')
    .map(c => ({
      id: c.id,
      name: c.name,
      currentURL: c.currentURL
    }));

  for (const [id, client] of Object.entries(clients)) {
    if (client.role === 'admin') {
      io.to(id).emit('clientListUpdate', clientList);
    }
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (role, id, name) => {
    if (!role) {
      console.log(`Rejected connection ${socket.id}: no role specified`);
      return;
    }

    clients[socket.id] = {
      role,
      id: id || socket.id,
      name: name || id || socket.id,
      currentURL: ''
    };
    console.log(`${role} registered as id: ${id || socket.id}, name: ${name || id || socket.id}`);

    updateAdminClientList();
  });

  socket.on('sendURL', ({ targetID, url }) => {
    for (const [socketId, client] of Object.entries(clients)) {
      if (client.id === targetID && client.role === 'client') {
        io.to(socketId).emit('updateURL', url);
        client.currentURL = url;
      }
    }
    updateAdminClientList();
  });

  socket.on('updateClientName', ({ targetID, newName }) => {
    for (const [socketId, client] of Object.entries(clients)) {
      if (client.id === targetID && client.role === 'client') {
        clients[socketId].name = newName;
        io.to(socketId).emit('clientNameUpdate', newName);
        updateAdminClientList();
      }
    }
  });

  socket.on('updateCurrentURL', (currentURL) => {
    if (clients[socket.id] && clients[socket.id].role === 'client') {
      clients[socket.id].currentURL = currentURL;
      updateAdminClientList();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete clients[socket.id];
    updateAdminClientList();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
