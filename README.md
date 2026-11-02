# PolyWorld Arena — 3D Multiplayer Web Game

A complete, deployable 3D multiplayer social & arena web game built with **Three.js**, **React**, **TypeScript**, and **Node.js + Socket.IO**, featuring hybrid multi-transport networking.

## Key Features
- **Hybrid Multi-Player Networking (Zero-Error Simultaneous Play)**:
  1. **Authoritative Socket.IO Server (`backend/`)**: Real-time 20Hz position, rotation, animation, chat, crystal pickup, and Crown Tag synchronization across devices.
  2. **Instant Cross-Tab / Same-Device P2P Sync (`BroadcastChannel` + `localStorage`)**: Open multiple browser tabs or windows to play together immediately with zero server setup.
  3. **2-Player Split-Screen Co-op & PvP Mode**: Toggle **2P Split-Screen** in the HUD so two players can play together simultaneously on one screen (`WASD + Space` vs `Arrow Keys + Enter`).
  4. **Autonomous AI Rivals/Companions**: Smart 3D bots roam biomes, collect Aether Shards, contest the Golden Crown, use jump pads, and emote.
- **Articulated 3D Characters & 8 Procedural Animations**:
  - Customizable skin tone, outfit preset, shirt/pants colors, and 3D headwear accessories (`Crown`, `Wizard Hat`, `Cyber Visor`, `Explorer Cap`, `Halo`).
  - Smooth procedural skeletal animations: `idle` (breathing + blinking), `walk`, `run`/`dash` (forward lean + speed trail), `jump` (launch & landing squash), `wave`, `dance`, `spin`, and `sit`.
- **3 Game Modes in One Shared World**:
  - **Crystal Rush**: Collect Cyan (+10), Gold (+25), and Amethyst (+50) 3D Aether Shards with auto-respawning and particle bursts.
  - **Crown Tag Arena**: Claim the Golden Crown to earn +5 pts every 2 seconds while other players try to dash-tag you to steal it.
  - **Free Explore & Parkour**: Discover 5 biomes (Central Plaza, Crystal Lake Shrine, Whispering Pine Forest, Sunlit Village Windmill, Neon Sky-Citadel) with Jump Pads, Speed Boost Rings, Sit-able Benches, and Day/Sunset/Night lighting.

## Quick Start (Development & Production)

### 1. Instant Browser Play (Standalone Single-File Build)
Open `polyworld_arena.html` directly in any modern browser (or multiple tabs to test instant cross-tab multiplayer and 2P Split-Screen).

### 2. Full-Stack Server Deployment (Node.js + Socket.IO + React)
```bash
# Install and build frontend + backend
cd frontend && npm install && npm run build
cd ../backend && npm install && npm run build

# Start unified production server on port 4000 (serves both WebSocket API & static frontend)
npm start
```
Then open `http://localhost:4000` in multiple browsers or devices!
