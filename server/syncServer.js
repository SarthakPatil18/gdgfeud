import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 5174;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ status: 'ok', service: 'gdg-feud-sync-server' }));
});

const wss = new WebSocketServer({ server });

let latestState = null;

wss.on('connection', (ws) => {
  // If we have an active game state, immediately hydrate new client
  if (latestState) {
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      payload: latestState,
      senderId: 'server-hydration',
      timestamp: Date.now(),
    }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'STATE_UPDATE') {
        latestState = msg.payload;
      }

      // Broadcast message to all other connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 GDG Feud Real-time Sync Server listening on ws://0.0.0.0:${PORT}`);
});
