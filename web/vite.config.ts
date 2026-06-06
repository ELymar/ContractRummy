import { defineConfig } from 'vite';

// The Phaser client is a thin renderer; the authoritative game engine runs in
// the Node WebSocket server (../server). Set VITE_WS_URL to point at it.
export default defineConfig({
  server: {
    port: 5173,
  },
});
