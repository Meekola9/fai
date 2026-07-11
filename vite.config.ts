import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative assets keep the same build deployable on GitHub Pages, Vercel, or any
// static host mounted below a sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
