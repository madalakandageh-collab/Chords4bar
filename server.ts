import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientEntry {
  ws: WebSocket;
  clientId: string;
  role: 'leader' | 'member';
  deviceName: string;
  joinedAt: number;
}

interface RoomRecord {
  state: Record<string, unknown> | null;
  clients: Map<string, ClientEntry>;
}

const rooms = new Map<string, RoomRecord>();

function getOrCreateRoom(roomId: string): RoomRecord {
  const cleanId = (roomId || '4829').toUpperCase().slice(0, 16);
  let room = rooms.get(cleanId);
  if (!room) {
    room = {
      state: null,
      clients: new Map<string, ClientEntry>(),
    };
    rooms.set(cleanId, room);
  }
  return room;
}

function broadcastPresence(roomId: string, room: RoomRecord): void {
  const members: Array<{ clientId: string; role: 'leader' | 'member'; deviceName: string; joinedAt: number }> = [];
  let leaderConnected = false;
  let memberCount = 0;

  for (const client of room.clients.values()) {
    if (client.role === 'leader') {
      leaderConnected = true;
    } else {
      memberCount += 1;
    }
    members.push({
      clientId: client.clientId,
      role: client.role,
      deviceName: client.deviceName,
      joinedAt: client.joinedAt,
    });
  }

  const payload = JSON.stringify({
    type: 'room:presence',
    presence: {
      roomId,
      memberCount,
      leaderConnected,
      members,
    },
  });

  for (const client of room.clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function broadcastState(roomId: string, room: RoomRecord, excludeClientId?: string): void {
  if (!room.state) return;
  const payload = JSON.stringify({
    type: 'room:state',
    serverTime: Date.now(),
    state: room.state,
  });

  for (const client of room.clients.values()) {
    if (excludeClientId && client.clientId === excludeClientId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use('/cues', express.static(path.resolve(__dirname, 'public/cues')));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, serverTime: Date.now() });
  });

  app.get('/api/network-info', (_req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses: Array<{ name: string; address: string }> = [];

    for (const [name, list] of Object.entries(interfaces)) {
      if (!list) continue;
      for (const iface of list) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({ name, address: iface.address });
        }
      }
    }

    res.json({
      port,
      addresses,
      serverTime: Date.now(),
    });
  });

  app.get('/manifest-member.webmanifest', (req, res) => {
    const room = typeof req.query.room === 'string' ? req.query.room : '4829';
    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      id: `/?mode=member&room=${encodeURIComponent(room)}`,
      name: 'Chordbook Stage',
      short_name: 'Chord Stage',
      description: 'Read-only live stage chord & lyric view synced with your Band Leader.',
      theme_color: '#121212',
      background_color: '#121212',
      display: 'standalone',
      start_url: `/?mode=member&room=${encodeURIComponent(room)}`,
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const urlPath = (request.url || '').split('?')[0];
    if (urlPath === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    let joinedRoomId: string | null = null;
    let joinedClientId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        const msgType = typeof msg.type === 'string' ? msg.type : '';

        if (msgType === 'sync:ping') {
          ws.send(
            JSON.stringify({
              type: 'sync:pong',
              clientSendTime: msg.clientSendTime,
              serverTime: Date.now(),
            })
          );
          return;
        }

        if (msgType === 'room:join') {
          const roomId = (typeof msg.roomId === 'string' ? msg.roomId : '4829').toUpperCase().slice(0, 16);
          const clientId = typeof msg.clientId === 'string' ? msg.clientId : `client-${Math.random().toString(36).slice(2, 8)}`;
          const role = msg.role === 'leader' ? 'leader' : 'member';
          const deviceName = typeof msg.deviceName === 'string' ? msg.deviceName : role === 'leader' ? 'Band Leader' : 'Stage Phone';

          if (joinedRoomId && joinedClientId) {
            const prevRoom = rooms.get(joinedRoomId);
            if (prevRoom) {
              prevRoom.clients.delete(joinedClientId);
              broadcastPresence(joinedRoomId, prevRoom);
            }
          }

          joinedRoomId = roomId;
          joinedClientId = clientId;
          const room = getOrCreateRoom(roomId);
          room.clients.set(clientId, {
            ws,
            clientId,
            role,
            deviceName,
            joinedAt: Date.now(),
          });

          if (room.state) {
            ws.send(
              JSON.stringify({
                type: 'room:state',
                serverTime: Date.now(),
                state: room.state,
              })
            );
          }

          broadcastPresence(roomId, room);
          return;
        }

        if (msgType === 'leader:sync_state' && joinedRoomId) {
          const room = getOrCreateRoom(joinedRoomId);
          if (msg.state && typeof msg.state === 'object') {
            room.state = {
              ...(msg.state as Record<string, unknown>),
              roomId: joinedRoomId,
              updatedAt: Date.now(),
            };
            broadcastState(joinedRoomId, room, joinedClientId ?? undefined);
          }
          return;
        }

        if (msgType === 'leader:delta' && joinedRoomId) {
          const room = getOrCreateRoom(joinedRoomId);
          if (room.state && msg.patch && typeof msg.patch === 'object') {
            room.state = {
              ...room.state,
              ...(msg.patch as Record<string, unknown>),
              updatedAt: Date.now(),
            };
            broadcastState(joinedRoomId, room, joinedClientId ?? undefined);
          }
          return;
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      if (joinedRoomId && joinedClientId) {
        const room = rooms.get(joinedRoomId);
        if (room) {
          room.clients.delete(joinedClientId);
          broadcastPresence(joinedRoomId, room);
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`CHORDBOOK server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
