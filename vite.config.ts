import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
// Function to bypass proxy for HTML requests (Frontend routes)
const htmlBypass = (req: any, res: any, options: any) => {
  const accept = req.headers.accept;
  if (accept && accept.includes('text/html')) {
    return req.url;
  }
};

export default defineConfig({
  plugins: [vue()], // kích hoạt plugin hỗ trợ tệp .vue 
  resolve: {
    alias: {
      // cấu hình đường dẫn tắt để @/ trỏ thẳng vào thư mục src
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // cổng mặc định cho môi trường phát triển
    strictPort: true,
    proxy: {

      // Gateway API Proxy (để tránh CORS)
      '/gateway-api': {
        target: 'https://nda.trustid.com.vn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateway-api/, '/admin/v1')
      }
    },
  },
  build: {
    outDir: 'dist', // thư mục đầu ra khi build 
    chunkSizeWarningLimit: 1000,
  }
});