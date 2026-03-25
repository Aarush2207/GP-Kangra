import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getBackendPort() {
  const envPath = path.resolve(__dirname, '../backend/.env');

  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const portMatch = envFile.match(/^PORT=(.+)$/m);

    if (portMatch?.[1]?.trim()) {
      return portMatch[1].trim();
    }
  } catch {
    // Fall back to the app default when the backend env file is unavailable.
  }

  return '3001';
}

const backendTarget =
  process.env.VITE_API_PROXY_TARGET || `http://localhost:${getBackendPort()}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      }
    }
  }
});
