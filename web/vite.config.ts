import { defineConfig } from 'vite';

// The Phaser client is a thin renderer; the authoritative game engine runs in
// the Node WebSocket server (../server). Set VITE_WS_URL to point at it.
export default defineConfig({
  // Relative asset paths: itch.io serves the game from a CDN subdirectory,
  // so absolute (/assets/...) URLs would 404 there.
  base: './',
  server: {
    port: 5173,
    host: true, // listen on IPv4 + IPv6, not just ::1 (macOS resolves localhost oddly)
  },
});
