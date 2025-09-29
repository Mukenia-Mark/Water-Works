import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        customer: 'customer-management.html',
        newCustomer: 'new-customer.html',
        billing: 'bill-customer.html'
      }
    }
  },
  server: {
    port: 3000
  }
});