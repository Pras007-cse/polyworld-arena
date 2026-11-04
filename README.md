# 🌍 PolyWorld Arena

<div align="center">

[![Node.js Version](https://img.shields.io/badge/Node.js-20.x%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)

**An expansive, deployable 3D multiplayer social sandbox & arena web game built with Three.js, React, TypeScript, and Node.js + Socket.IO.**

[Features](#-features) • [Quick Start](#-quick-start) • [Docker Deployment](#-docker-deployment) • [Controls](#-controls-reference) • [Architecture](#-system-architecture) • [API & Protocols](#-networking--api-protocols)

</div>

---

## 📖 Overview

**PolyWorld Arena** immerses players into a vibrant **1400m × 1400m** low-poly open world featuring 12+ interconnected districts, 65+ explorable buildings, dynamic stunt ramps, interactive sports mini-games, and a full suite of drivable vehicles (sports cars, dune buggies, biplanes, rescue helicopters, speedboats, and an autonomous 8-seat tour bus).

Designed for zero-friction accessibility, the platform runs natively inside any modern WebGL browser with **four simultaneous multiplayer layers**—from single-server cloud instances down to zero-configuration cross-tab local play and 2-Player split-screen.

---

## ✨ Features

### 🌐 Multi-Tiered Multiplayer Engine
- **Authoritative Socket.IO Server**: 20Hz state synchronization handling position deltas, rotations, character bone animations, overhead chat bubbles, collectible crystals, and dynamic Crown Tag ownership.
- **Cross-Tab P2P Sync (`BroadcastChannel`)**: Open several browser tabs or windows on the same machine to instantly connect with zero server latency or network configuration.
- **2-Player Split-Screen Mode**: One-click split viewport for local co-op and PvP on a single keyboard (Left: `WASD + Space`, Right: `Arrows / IJKL + Enter`).
- **Autonomous AI Companions**: 5 intelligent bots (*Nova*, *Zephyr*, *Lyra*, *Orion*, *Vega*) roam the streets, board the tour bus, and collect Aether Shards.

### 🚗 Land, Sea & Air Vehicles
- **Sports Cars, Dune Buggies & Rovers**: Physics-driven acceleration, drift steering, parabolic stunt jumps off highway ramps, horn, and nitro afterburners.
- **Aeroplanes & Rescue Helicopter**: Take off from Aether Airport in the Skyhawk Turbo Biplane or ascend vertically from the rooftop helipad with realistic pitch, bank, and altitude controls.
- **Speedboats & Canals**: Pilot motorboats through Serene Crystal Lake, the central canal locks, and into Coral Harbor Bay.
- **Autonomous 8-Seat Tour Bus**: Continuous 24-waypoint transit loop circling Ring Boulevard (`r = 110m`) with 8 sheltered stations, allowing up to 8 players to tour together.

### 🪝 Gadgets, Movement & Customization
- **Grappling Hook & Mid-Air Glider**: Tether to rooftops and deploy a 3D hang-glider parachute to glide safely from heights.
- **Jetpack, Hoverboard & Blasters**: Cruise at high speeds on neon hoverboards, fly with twin thrusters, and tag other players with non-lethal paintball blasters.
- **Camera Modes**: Toggle between 3rd-Person Follow, 1st-Person Cockpit, and Cinematic Wide Orbit (`KeyV`), plus Auto-Look Mouse Lock (`KeyM`).
- **Character Customization**: Customize colors, accessories (crowns, hats, capes, halos, headphones), and trigger 3D animations/emotes.

### 🎪 Interactive Mini-Games & Open World
- **Enterable Architecture**: 40+ multi-story walk-in towers, suburban houses, and villas with climbable staircases and jump-out windows.
- **Interactive Sports & Arcades**:
  - ⚽ **Soccer Stadium**: Physics-driven soccer ball with goal scoring and XP rewards.
  - 🎳 **10-Pin Bowling**: Working bowling lane with pin knockdown physics.
  - 🏀 **Basketball Court**: Launch 3-point shots into glowing hoops.
  - 🎹 **Walk-On Floor Piano**: 8-key interactive keyboard synthesizing a C-Major scale.
- **Weather & Cosmic Events**: Real-time rain flurries, snow, 7-band sky rainbows, and random Aether Meteor Showers dropping mega-XP shards.
- **NPC Quests, Time Trials & Pets**: Complete NPC missions, race time-trial checkpoints, unlock speed upgrades, and adopt 3D pet companions.

---

## 🕹️ Controls Reference

| Action | Player 1 (Solo / Left Split-Screen) | Player 2 (Right Split-Screen) | Vehicle & Aircraft Mode |
| :--- | :--- | :--- | :--- |
| **Move / Steer** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> *(or Virtual D-Pad)* | <kbd>▲</kbd> <kbd>◀</kbd> <kbd>▼</kbd> <kbd>▶</kbd> / <kbd>I</kbd> <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> | Steer <kbd>A</kbd> <kbd>D</kbd> • Throttle <kbd>W</kbd> • Reverse <kbd>S</kbd> |
| **Jump / Climb** | <kbd>Space</kbd> | <kbd>Enter</kbd> / <kbd>Numpad 0</kbd> | Car Jump & Horn • Aircraft Ascend (<kbd>Space</kbd>) |
| **Sprint / Descend** | <kbd>Left Shift</kbd> | <kbd>Right Shift</kbd> / <kbd>O</kbd> | Car Nitro Boost • Aircraft Descend (<kbd>Shift</kbd>) |
| **Dash / Turbo** | <kbd>F</kbd> | — | Afterburner Boost (<kbd>F</kbd>) |
| **Enter / Exit / Ride**| <kbd>E</kbd> | <kbd>U</kbd> | Board / Disembark Vehicle or Ride (<kbd>E</kbd>) |
| **Grappling Hook** | <kbd>Q</kbd> | — | Grapple to target point |
| **Jetpack / Hoverboard**| <kbd>J</kbd> *(Jetpack)* • <kbd>H</kbd> *(Hoverboard)* | — | Toggle aerial or ground transit gear |
| **Paintball Blaster** | <kbd>G</kbd> *(or Left Click)* | — | Fire paintball projectile |
| **Sandbox Builder** | <kbd>B</kbd> | — | Place custom stunt ramps in the world |
| **Camera View** | <kbd>V</kbd> *(1st/3rd Person)* • <kbd>M</kbd> *(Mouse Lock)* | — | Orbit: `Click + Drag` • Zoom: `Scroll Wheel` |
| **Emotes** | <kbd>1</kbd> Wave • <kbd>2</kbd> Dance • <kbd>3</kbd> Spin • <kbd>4</kbd> Sit | <kbd>P</kbd> *(Dance / Wave)* | — |

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          PolyWorld Arena                               │
└────────────────────────────────────────────────────────────────────────┘
          │                                           │
    (Web Browser)                               (Web Browser)
   Player Client 1                             Player Client 2
          │                                           │
          ├────────────── Local BroadcastChannel ─────┤ (Zero-latency P2P)
          │                                           │
          └───────────── WebSocket / HTTP ────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │        Authoritative Backend Server       │
        │             (Express + Socket.IO)         │
        ├───────────────────────────────────────────┤
        │ • SocketHandler  (20Hz state broadcast)   │
        │ • WorldManager   (Item spawns, Crown Tag) │
        │ • PlayerManager  (Collision & validation) │
        │ • Static Server  (Serves /frontend/dist)  │
        └───────────────────────────────────────────┘
```

The game is structured as a TypeScript monorepo with strict separation of concerns:
- **`shared/`**: Contains immutable protocol schemas, Socket.IO payload definitions, and world constants used by both frontend and backend.
- **`backend/`**: Node.js/Express server handling authoritative simulation, player lifecycle, chat broadcast rate-limiting, and static file serving.
- **`frontend/`**: Vite + React 18 application with Three.js rendering pipeline, sound synthesis, custom procedural shaders, and articulated character rigs.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ LTS recommended)
- **npm**: `v9.0.0` or higher
- **Docker**: *(Optional)* For containerized deployment

### Local Development (Live Reload)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/polyworld-arena.git
   cd polyworld-arena
   ```

2. **Install dependencies:**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   cd ..
   ```

3. **Start the development servers:**
   - **Backend Server** (runs on `http://localhost:4000`):
     ```bash
     npm run backend:dev
     ```
   - **Frontend Dev Server** (in a separate terminal, runs on `http://localhost:3000`):
     ```bash
     npm run dev
     ```

4. Open your browser at **`http://localhost:3000`**.

---

## 🐳 Docker Deployment

The repository includes an optimized multi-stage [Dockerfile](./Dockerfile) using `node:20-slim`. It compiles the frontend and backend in isolated build stages and produces a lightweight, production-ready container that serves the full game over a single port.

### Build and Run with Docker

```bash
# 1. Build the Docker image
docker build -t polyworld-arena .

# 2. Run the container on port 4000
docker run -d -p 4000:4000 --name polyworld polyworld-arena
```

Access the application in your browser at **`http://localhost:4000`**.

### Stop or Remove Container

```bash
docker stop polyworld
docker rm polyworld
```

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `.env` to configure deployment settings:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | HTTP and WebSocket port for the unified backend server |
| `NODE_ENV` | `production` | Environment mode (`development` or `production`) |
| `VITE_SERVER_URL` | `http://localhost:4000` | Optional backend server address for standalone frontend development |

---

## 📡 Networking & API Protocols

### HTTP Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server status, version, and live world stats (players, active items) |
| `GET` | `/api/players` | Returns active player list, count, and the current Crown Tag holder |
| `GET` | `/*` | Serves the single-page production frontend application (`dist/index.html`) |

### Socket.IO Real-Time Events

| Channel | Event | Direction | Payload |
| :--- | :--- | :--- | :--- |
| **Lifecycle** | `player_join` | Client ➔ Server | `{ username, appearance }` |
| | `player_joined` | Server ➔ Client | Broadcast of new player joining world |
| | `player_left` | Server ➔ Client | Broadcast when player disconnects |
| **Movement** | `player_move` | Client ➔ Server | `{ position, rotation, animation, velocity }` |
| | `world_delta` | Server ➔ Client | 20Hz compressed world state sync to all clients |
| **Interaction**| `chat_message` | Client ➔ Server | `{ text }` (rate-limited broadcast) |
| | `collect_item` | Client ➔ Server | `{ itemId }` (crystal shard collection) |
| | `claim_crown` | Client ➔ Server | `{ targetPlayerId }` (Crown Tag transfer) |

---

## 📂 Repository Structure

```text
polyworld-arena/
├── shared/                     # Shared TypeScript interfaces & Socket.IO contracts
│   ├── constants/world.ts      # World bounds (1400x1400), vehicle physics & speed rules
│   ├── protocols/messages.ts   # ClientToServerEvents & ServerToClientEvents specifications
│   └── types/index.ts          # PlayerState, CharacterAppearance, CollectibleItem types
├── backend/                    # Authoritative Node.js + Express + Socket.IO Server
│   ├── src/
│   │   ├── index.ts            # HTTP server, WebSocket orchestrator & static asset hosting
│   │   ├── networking/         # SocketHandler (delta broadcasting, crown tag logic)
│   │   ├── players/            # PlayerManager (position validation, score/level tracking)
│   │   ├── world/              # WorldManager (authoritative shard spawns & respawn timers)
│   │   └── chat/               # ChatManager (rate-limited chat broadcasting)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React 18 + Three.js + Vite Client
│   ├── src/
│   │   ├── components/         # LandingPage, CanvasView, HUD, SplitScreen controls
│   │   ├── networking/         # Hybrid NetworkManager (Socket.IO + BroadcastChannel fallback)
│   │   ├── player/             # LocalPlayer controller & RemotePlayer interpolation rigs
│   │   ├── scenes/             # WorldScene (districts, lighting, vehicles, collision loop)
│   │   └── systems/            # InputManager & Web Audio API SoundManager
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile                  # Multi-stage production container build (node:20-slim)
├── .dockerignore               # Optimized Docker build context exclusions
├── .env.example                # Environment variable configuration template
├── CONTRIBUTING.md             # Contribution and development guidelines
├── LICENSE                     # MIT License
└── package.json                # Root orchestration scripts
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/polyworld-arena/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
