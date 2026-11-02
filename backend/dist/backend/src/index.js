"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const WorldManager_1 = require("./world/WorldManager");
const SocketHandler_1 = require("./networking/SocketHandler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
});
const worldManager = new WorldManager_1.WorldManager();
const socketHandler = new SocketHandler_1.SocketHandler(io, worldManager);
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
const possibleFrontendPaths = [
    path_1.default.resolve(__dirname, '../../../../frontend/dist'),
    path_1.default.resolve(__dirname, '../../../frontend/dist'),
    path_1.default.resolve(process.cwd(), 'frontend/dist'),
    path_1.default.resolve(process.cwd(), '../frontend/dist'),
];
const frontendDist = possibleFrontendPaths.find((p) => fs_1.default.existsSync(path_1.default.join(p, 'index.html')));
if (frontendDist) {
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path === '/health') {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`[PolyWorld Arena] Multiplayer Game Server running at http://localhost:${PORT}`);
});
