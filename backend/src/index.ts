import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { WorldManager } from './world/WorldManager';
import { SocketHandler } from './networking/SocketHandler';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocols/messages';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const worldManager = new WorldManager();
const socketHandler = new SocketHandler(io, worldManager);
socketHandler.registerEvents();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'PolyWorld Arena Multiplayer Server',
    version: '1.0.0',
    stats: worldManager.getStats(),
  });
});

app.get('/api/players', (_req, res) => {
  res.json({
    count: worldManager.playerManager.getPlayerCount(),
    players: worldManager.playerManager.getAllPlayers(),
    crownHolderId: worldManager.crownHolderId,
  });
});

// Serve static frontend build in production for single-server deployment
const possibleFrontendPaths = [
  path.resolve(__dirname, '../../../../frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];

const frontendDist = possibleFrontendPaths.find((p) => fs.existsSync(path.join(p, 'index.html')));
if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`[PolyWorld Arena] Multiplayer Game Server running at http://localhost:${PORT}`);
});
