import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/omniprocess-lunch-radar/',
  plugins: [react()],
});