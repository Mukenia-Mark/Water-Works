import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        customer: resolve(__dirname, 'customer-management.html'),
        newCustomer: resolve(__dirname, 'new-customer.html'),
        billing: resolve(__dirname, 'bill-customer.html')
      }
    },
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000
  },
  publicDir: false
});