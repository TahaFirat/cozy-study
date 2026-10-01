import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function cozyLiveRelayPlugin(): Plugin {
  const clients = new Map<string, { res: any; buddy?: any; lastSeen: number }>();
  const recentMessages: any[] = [];

  function broadcast(eventName: string, data: any, excludeId?: string) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of clients.entries()) {
      if (excludeId && id === excludeId) continue;
      if (client.res) {
        try {
          client.res.write(payload);
        } catch {
          clients.delete(id);
        }
      }
    }
  }

  function getActiveBuddies() {
    const threshold = Date.now() - 15000;
    const map = new Map<string, any>();
    for (const [id, client] of clients.entries()) {
      if (client.lastSeen < threshold) {
        clients.delete(id);
      } else if (client.buddy) {
        const key = client.buddy.id || client.buddy.sessionId || id;
        map.set(key, client.buddy);
      }
    }
    return Array.from(map.values());
  }

  return {
    name: 'cozy-live-relay-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost');

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        // 1. Live SSE Stream for Instant Real-Time Cross-Window / Incognito Sync
        if (url.pathname === '/api/live-stream') {
          const clientId = url.searchParams.get('clientId') || `client-${Date.now()}`;
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });

          clients.set(clientId, { res, lastSeen: Date.now() });

          res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

          // Send current active buddies immediately to newly connected client
          const buddies = getActiveBuddies();
          res.write(`event: presence_sync\ndata: ${JSON.stringify({ count: Math.max(1, buddies.length), buddies })}\n\n`);

          req.on('close', () => {
            clients.delete(clientId);
            const remaining = getActiveBuddies();
            broadcast('presence_sync', { count: Math.max(1, remaining.length), buddies: remaining });
          });
          return;
        }

        // 2. Presence Heartbeat Endpoint
        if (url.pathname === '/api/presence' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data.clientId) {
                const existing = clients.get(data.clientId);
                if (existing) {
                  existing.buddy = data.buddy;
                  existing.lastSeen = Date.now();
                } else {
                  clients.set(data.clientId, { res: null, buddy: data.buddy, lastSeen: Date.now() });
                }
                const buddies = getActiveBuddies();
                broadcast('presence_sync', { count: Math.max(1, buddies.length), buddies });
              }
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ success: true, count: clients.size }));
            } catch {
              res.writeHead(400);
              res.end('Invalid JSON');
            }
          });
          return;
        }

        // 2.5 Presence Leave Endpoint
        if (url.pathname === '/api/presence-leave' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data.clientId) {
                clients.delete(data.clientId);
                const buddies = getActiveBuddies();
                broadcast('presence_sync', { count: Math.max(1, buddies.length), buddies });
              }
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.writeHead(200);
              res.end('OK');
            }
          });
          return;
        }

        // 3. Instant Chat Broadcast Endpoint
        if (url.pathname === '/api/chat' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              recentMessages.push(data.message);
              if (recentMessages.length > 50) recentMessages.shift();
              broadcast('chat_message', data.message, data.clientId);
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.writeHead(400);
              res.end('Invalid JSON');
            }
          });
          return;
        }

        // 4. Boss Attack Broadcast Endpoint
        if (url.pathname === '/api/boss-attack' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              broadcast('boss_attack', data.attack, data.clientId);
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.writeHead(400);
              res.end('Invalid JSON');
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cozyLiveRelayPlugin(),
  ],
  server: {
    watch: {
      ignored: ['**/scratch/**', '**/dist/**', '**/.git/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
