import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
                    chart: ['chart.js'],
                    email: ['@emailjs/browser']
                }
            }
        }
    },
    server: {
        port: 5173,
        open: true,
    }
});
