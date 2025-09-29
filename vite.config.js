import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        customer: 'customer-management.html',
        newCustomer: 'new-customer.html',
        billing: 'bill-customer.html'
      }
    },
    outDir: 'dist'
  },
  server: {
    port: 3000
  },
  publicDir: false
});