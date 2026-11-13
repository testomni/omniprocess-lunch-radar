import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/omni-lunch-radar/',
  plugins: [react()],
});