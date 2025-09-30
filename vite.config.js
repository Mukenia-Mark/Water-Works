import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on "mode" in the current directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Explicitly define entry points
    build: {
      rollupOptions: {
        input: {
          main: './index.html',
          customerManagement: './customer-management.html',
          billing: './bill-customer.html',
          newCustomer: './new-customer.html'
        }
      }
    },
    server: {
      port: 3000
    },
    // Security headers
    preview: {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  };
});