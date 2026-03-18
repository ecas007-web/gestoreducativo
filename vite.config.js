import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        open: false
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './setupTests.js',
        include: ['assets/js/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)']
    }
});
