# 🌍 PolyWorld Arena (`polyworld-arena`)

[![Three.js](https://img.shields.io/badge/Three.js-r128%20%2F%200.160-black?logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)

**PolyWorld Arena** is an expansive, open-world **3D multiplayer social sandbox & arena web game** built with **Three.js**, **React**, **TypeScript**, and **Node.js + Socket.IO**. Players can explore a dense **1400m × 1400m** world filled with 12+ interconnected districts, 65+ neighborhood houses, geometric 3D sculptures, controllable sports cars, speedboats, aeroplanes, a rescue helicopter, an autonomous 8-seat Town Tour Bus, and interactive mini-games.

---

## ✨ Key Features

### 🌐 4-Layer Simultaneous Multiplayer Architecture
1. **Authoritative Socket.IO Server (`backend/`)**: Real-time 20Hz synchronization of player movement, rotations, skeletal animations, overhead chat bubbles, crystal pickups, and Crown Tag transfers.
2. **Instant Cross-Tab P2P Sync (`BroadcastChannel`)**: Open multiple browser tabs or windows on the same machine to play together immediately with zero server configuration.
3. **2-Player Split-Screen Co-op & PvP Mode**: Toggle **2P Split-Screen** in the top HUD bar to split the WebGL viewport into Left (`Player 1: WASD + Space`) and Right (`Player 2: Arrow Keys / IJKL + Enter`) cameras on a single screen.
4. **Autonomous AI Companions**: 5 smart AI explorers (*Nova*, *Zephyr*, *Lyra*, *Orion*, *Vega*) roam the world, ride the tour bus, and compete for Aether Shards.

### 🚌 Vehicles, Aircraft, Boats & Autonomous Transit
- **Autonomous 8-Seat Town Travel Bus**: Follows a dedicated 24-node obstacle-free **Ring Boulevard (`r = 110m`)** with 8 glass Bus Stop Shelters. Up to **8 players/bots** can sit together on the sightseeing deck while touring the entire town.
- **Controllable Sports Cars, Dune Buggy & 4x4 Rover**: Full throttle, reverse, steering, Nitro Boost (`Shift / F`), horn (`Space`), and **parabolic stunt-jump physics** off slanted highway ramps and overpasses.
- **Controllable 3D Aeroplanes & Rescue Helicopter**: Take off from **Aether Airport (`75, -55`)** in the **Skyhawk Turbo Biplane** or lift off vertically from the **Helipad (`28, -28`)** in the **Rescue Helicopter** (`Space` to climb, `Shift` to descend, `WASD` to bank & turn).
- **Controllable Speedboats & Navigable Water Canal**: Pilot speedboats across **Serene Crystal Lake**, through the bridged **Water Canal**, and out to **Coral Harbor Bay** (with strict water/land shoreline boundaries).

### 🪝 Action Gadgets, Sky-Train, Weather, Quests, Pets & Builder Mode
- **Camera Mouse Mode Option (`KeyM`) & 1st/3rd-Person View (`KeyV`)**: Choose between **Drag & Move Orbit** or **Free Mouse Move (Auto-Look)** in the Lobby or HUD, and switch between 3rd-Person, **1st-Person Cockpit/Eyes**, and Wide Cinematic views.
- **Grappling Hook (`KeyQ`) & Mid-Air Glider Parachute**: Fire a 3D grappling tether onto rooftops, and hold `Space` while falling from upper-floor windows or aircraft to unfold a 3D Hang-Glider wing.
- **Friendly Paintball Blaster (`KeyG`), Jetpack (`KeyJ`), & Street Hoverboard (`KeyH`)**: Tag rivals with colorful paintball orbs, fly with twin thruster flames, or cruise on a neon hoverboard.
- **Elevated 3rd-Floor Monorail Sky-Train (`🚈 Sky-Train`)**: Ride an automated 2-car neon sky-train looping at `y = 9.2m` around the skyscraper skyline.
- **Dynamic Weather (`🌦️ Clear / Rain / Snow / Rainbow`) & Aether Meteor Showers (`☄️ Meteor`)**: Toggle 3D rain, snow flurries, a giant 7-band 3D sky rainbow, or summon meteor showers that drop 100-XP Mega Shards.
- **NPC Quest Givers (`📜 Quests`), Time-Trial Race (`🏁 Time Trial`), Upgrade Shop (`🛒 Shop`), 3D Pets & Sandbox Builder (`KeyB`)**: Complete quests from 4 named NPCs, race through 8 checkpoints, equip a 3D Dragon/Drone/Pup pet, unlock Speed Boots/Moon Jump/Rainbow Trails (auto-saved in `localStorage`), and place custom 3D stunt ramps in the world.

### 🎮 Interactive Mini-Games, Playground Rides & Dense Neighborhoods
- **40+ Enterable Multi-Floor Towers & Walk-In Houses**: Run inside 2-, 3-, and 4-story buildings through open ground-floor doorways, climb interior staircases to upper floors, collect indoor Aether Shards, and **jump right out of the 3D upper-floor windows**!
- **65+ Neighborhood Houses & 70+ 3D Sculptures**: Full vehicle-to-building collision physics, residential streets, cottages, villas, modern lofts, rotating torus knots, polyhedron monuments, wind turbines, and floating hot air balloons.
- **Interactive Sports & Arcade Zones**:
  - ⚽ **Town Soccer Stadium (`-60, 65`)**: Kick or bump the physics-enabled 3D Soccer Ball into the goalposts for `+30 XP`.
  - 🎳 **10-Pin Bowling Alley (`34, 28`)**: Roll the bowling ball down the hardwood lane to knock down all 10 3D pins.
  - 🏀 **Basketball Court (`-34, 36`)**: Launch 3-point jump shots through the hoop.
  - 🎹 **Giant Walk-On Floor Piano (`-28, 22`)**: Walk or jump across 8 glowing keys to play a synthesized C-Major scale.
  - 💰 **14 Interactive Treasure Chests & 4 Mystic Teleport Portals**: Pop open golden chests across neighborhoods and warp between suburbs.
- **Amusement & Playground Rides**: Physics **Seesaws (Teeter-Totters)**, rotating **Merry-Go-Round Carousels**, **Park Swings**, and a **24m Giant Ferris Wheel** with self-leveling gondolas.

---

## 🕹️ Controls Reference

| Action | Player 1 (Single / Left Split-Screen) | Player 2 (Right Split-Screen) | Vehicle / Aircraft Mode |
| :--- | :--- | :--- | :--- |
| **Move / Steer** | `W` `A` `S` `D` *(or On-Screen D-Pad)* | `Arrow Keys` or `I` `J` `K` `L` | Throttle / Reverse / Turn (`A` `D`) |
| **Jump / Climb** | `Space` | `Enter` or `Numpad 0` | Car Jump & Horn / Aircraft Climb Up (`Space`) |
| **Sprint / Descend** | `Left Shift` | `Right Shift` or `O` | Car Nitro / Aircraft Descend (`Shift`) |
| **Dash / Afterburner**| `F` | — | Turbo Boost (`F`) |
| **Enter / Exit / Ride**| `E` *(or HUD Buttons)* | `U` | Exit Vehicle, Plane, Heli, Boat, Bus, or Ride (`E`) |
| **3D Emotes** | `1` Wave • `2` Dance • `3` Spin • `4` Sit | `P` (Dance / Wave) | — |
| **3D Camera Orbit** | `Click & Drag Mouse` + `Scroll Wheel` | Automatic 3rd-Person Follow | Orbit around Vehicle / Aircraft |

---

## 📂 Repository Structure

```text
polyworld-arena/
├── shared/                     # Shared TypeScript interfaces, constants & Socket.IO contracts
│   ├── constants/world.ts      # World bounds (1400x1400), physics & speed constants
│   ├── protocols/messages.ts   # Typed ClientToServerEvents & ServerToClientEvents
│   └── types/index.ts          # PlayerState, CharacterAppearance, CollectibleItem types
├── backend/                    # Authoritative Node.js + Express + Socket.IO Game Server
│   ├── src/
│   │   ├── index.ts            # Unified HTTP + WebSocket + static frontend server
│   │   ├── networking/         # SocketHandler (20Hz delta broadcast, Crown Tag, Shards)
│   │   ├── players/            # PlayerManager (spawn, movement validation, score/levels)
│   │   ├── world/              # WorldManager (authoritative crystal spawns & respawn timers)
│   │   └── chat/               # ChatManager (rate-limited real-time chat broadcasting)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React 18 + Three.js + Tailwind CSS Client
│   ├── src/
│   │   ├── components/         # LandingPage, CanvasView, HUD
│   │   ├── networking/         # Hybrid NetworkManager (Socket.IO + BroadcastChannel P2P)
│   │   ├── player/             # Articulated LocalPlayer & RemotePlayer 3D rigs
│   │   ├── scenes/             # WorldScene (biomes, lighting, vehicles, physics loop)
│   │   └── systems/            # InputManager & Web Audio API SoundManager
│   ├── dist/index.html         # Self-contained production single-file build
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile                  # Multi-stage production container build
├── .env.example                # Environment variable template
├── .gitignore                  # Standard Node/TypeScript/Vite ignore rules
├── CONTRIBUTING.md             # Contributor guide
├── LICENSE                     # MIT License
└── package.json                # Root workspace scripts
```

---

## 🚀 Getting Started

### Option 1: Instant Browser Play (Zero Setup)
Open `frontend/dist/index.html` (or `polyworld_arena.html`) directly in any modern browser. Open a second browser tab or click **🎮 2P Split-Screen** in the top bar to play multiplayer immediately!

### Option 2: Full-Stack Local Development
```bash
# 1. Install dependencies
cd frontend && npm install
cd ../backend && npm install

# 2. Start the Socket.IO multiplayer server (http://localhost:4000)
cd backend && npm run dev

# 3. Start the Vite frontend dev server (http://localhost:3000)
cd ../frontend && npm run dev
```

### Option 3: Single-Port Production Server / Docker Deployment
The backend automatically serves the compiled frontend from `frontend/dist` on the same port (`PORT=4000`), making deployment to **Render**, **Railway**, **Fly.io**, or **Docker** a single command:

```bash
# Build and start unified server on http://localhost:4000
cd backend && npm start
```

Or with Docker:
```bash
docker build -t polyworld-arena .
docker run -p 4000:4000 polyworld-arena
```

---

## 📄 License
Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.
