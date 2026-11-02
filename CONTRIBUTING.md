# Contributing to PolyWorld Arena

Thank you for your interest in contributing to **PolyWorld Arena**!

## Development Workflow

1. **Fork & Clone the Repository**:
   git clone https://github.com/<your-username>/polyworld-arena.git
   cd polyworld-arena

2. **Install Dependencies**:
   cd frontend && npm install
   cd ../backend && npm install

3. **Run in Development Mode**:
   - Terminal 1 (Backend Socket.IO Server on :4000): npm run backend:dev
   - Terminal 2 (Frontend Vite Dev Server on :3000): npm run dev

4. **Pull Requests**:
   - Ensure both frontend and backend compile cleanly with npm run build.
   - Keep shared TypeScript interfaces in shared/types/ and Socket.IO event contracts in shared/protocols/messages.ts.
