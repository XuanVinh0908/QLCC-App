import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // <-- Bắt đầu cấu hình server
    proxy: { // <-- Bắt đầu cấu hình proxy
      // Nếu có yêu cầu đến '/api'
      '/api': {
        // Chuyển tiếp đến backend
        target: 'http://localhost:5000', 
        // Thay đổi origin header thành target URL (quan trọng)
        changeOrigin: true, 
         // Bỏ '/api' khỏi đường dẫn khi chuyển tiếp (tùy chọn, nhưng thường cần)
        // rewrite: (path) => path.replace(/^\/api/, '') 
        // Nếu API backend của bạn *không* có tiền tố /api (vd: http://localhost:5000/login), thì bật dòng rewrite.
        // Nếu API backend của bạn *có* tiền tố /api (vd: http://localhost:5000/api/login), thì để nguyên dòng rewrite bị comment.
        // DỰ ÁN CỦA CHÚNG TA CÓ /api, NÊN KHÔNG CẦN REWRITE.
      }
    }
  } // <-- Kết thúc cấu hình server
})