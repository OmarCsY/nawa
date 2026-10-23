import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Tree-shaken ECharts (~550 kB) loads only with the dashboard; Swagger UI (~1.4 MB) only with /docs.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        // ECharts gets its own long-cacheable chunk, loaded only by the dashboard. Do NOT add manual groups for
        // swagger-ui or @supabase: shared CJS helpers land in the group and the entry then preloads all of it.
        codeSplitting: {
          groups: [
            { name: 'echarts', test: /node_modules[\/](echarts|zrender)[\/]/ },
          ],
        },
      },
    },
  },
})
