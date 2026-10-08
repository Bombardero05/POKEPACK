import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Mismo puerto que con Create React App: la partida se guarda en el navegador
  // por dirección (localhost:3000), así que cambiar de puerto la "perdería".
  server: { port: 3000 },
  // Configuración de las pruebas (Vitest usa este mismo archivo).
  test: {
    environment: 'jsdom', // localStorage y window, como en el navegador
    globals: true, // describe, test y expect sin importarlos
  },
});
