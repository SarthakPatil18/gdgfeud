import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { WebSocketServer } from 'ws';

function syncServerPlugin(): Plugin {
  let wss: WebSocketServer | null = null;
  let latestState: unknown = null;

  return {
    name: 'gdg-feud-sync-server',
    configureServer() {
      if (process.env.VITEST) return;
      if (!wss) {
        try {
          wss = new WebSocketServer({ port: 5174 });
          wss.on('error', (e) => {
            console.warn('Sync server on port 5174 note:', e.message);
          });
          console.log('📡 GDG Feud Real-time Sync WebSocket listening on ws://0.0.0.0:5174');

          wss.on('connection', (ws) => {
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
                wss?.clients.forEach((client) => {
                  if (client !== ws && client.readyState === ws.OPEN) {
                    client.send(JSON.stringify(msg));
                  }
                });
              } catch (e) {
                console.error('WS parse error:', e);
              }
            });
          });
        } catch (e) {
          console.warn('Sync server on port 5174 note:', e);
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    syncServerPlugin(),
  ],
});
