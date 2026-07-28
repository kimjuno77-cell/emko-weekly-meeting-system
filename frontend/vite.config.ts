// 설명: Vite 빌드 도구 설정 (개발 서버 + GitHub Pages 배포 대응)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      // 설명: '@/' 경로 별칭으로 src 폴더를 가리킴 (import 경로 단축)
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 설명: GitHub Pages 배포 시 서브 디렉토리 경로에서 정상 동작하도록 base 설정
  // 로컬 개발(dev)에서는 '/', 프로덕션 빌드(build)에서는 리포지토리명 기반 경로 사용
  base: mode === 'production'
    ? (process.env.VITE_BASE_PATH || '/')
    : '/',
  server: {
    // 설명: 로컬 개발 서버 포트 (3000번)
    port: 3000,
    // 설명: 서버 시작 시 브라우저 자동 오픈
    open: true,
  },
  build: {
    // 설명: 빌드 결과물 출력 폴더
    outDir: 'dist',
    // 설명: 소스맵 생성 (디버깅용)
    sourcemap: false,
  },
}))
