import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        'customer-management': './customer-management.html',
        'bill-customer': './bill-customer.html',
        'new-customer': './new-customer.html'
      }
    }
  },
  server: {
    port: 3000
  }
});