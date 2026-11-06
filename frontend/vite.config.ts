import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), tailwindcss()],
  define: { __KIOSK_DEVELOPMENT__: JSON.stringify(command === 'serve' && !isPreview) },
}));
