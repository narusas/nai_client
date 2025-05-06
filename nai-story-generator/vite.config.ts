import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // GitHub Pages 배포를 위한 base 경로 설정
  // 레포지토리 이름이 'nai_client'인 경우 '/nai_client/'로 설정
  // 사용자 페이지(username.github.io)에 배포하는 경우 '/'로 설정
  base: '/nai_client/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
