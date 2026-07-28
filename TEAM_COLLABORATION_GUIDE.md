# 🤝 팀 공동작업 & 배포 최적 솔루션 가이드

## 📌 목차
1. [공동작업 방식: GitHub 기반 협업](#1-공동작업-방식-github-기반-협업)
2. [데이터 취합 & 저장: Supabase 실시간 동기화](#2-데이터-취합--저장-supabase-실시간-동기화)
3. [데이터 백업: JSON Export + Git 이력 관리](#3-데이터-백업-json-export--git-이력-관리)
4. [배포 & 업로드: GitHub Pages 자동 배포](#4-배포--업로드-github-pages-자동-배포)
5. [팀원 환경 설정 체크리스트](#5-팀원-환경-설정-체크리스트)
6. [보안 키 관리 가이드](#6-보안-키-관리-가이드)

---

## 1. 공동작업 방식: GitHub 기반 협업

### 왜 GitHub인가?

| 비교 항목 | 구글 드라이브 공유 | GitHub |
|-----------|-------------------|--------|
| 버전 관리 | ❌ 파일 덮어쓰기 위험 | ✅ 모든 변경 이력 추적 |
| 충돌 관리 | ❌ 동시 수정 시 데이터 손실 | ✅ 자동 충돌 감지 & 병합 |
| 코드 리뷰 | ❌ 불가능 | ✅ Pull Request로 체계적 리뷰 |
| 자동 배포 | ❌ 수동 업로드 | ✅ Push만 하면 자동 배포 |
| 롤백 | ❌ 어려움 | ✅ 특정 시점으로 즉시 복원 |

### GitHub 초기 설정 (최초 1회)

```bash
# 1. 프로젝트 폴더로 이동
cd "g:\내 드라이브\weekly-meeting-system"

# 2. Git 저장소 초기화
git init

# 3. 모든 파일 스테이징 (.gitignore에 등록된 파일은 자동 제외)
git add .

# 4. 첫 커밋
git commit -m "feat: 주간회의 시스템 초기 버전"

# 5. GitHub에서 새 리포지토리 생성 후 원격 연결
git remote add origin https://github.com/kimjuno77-cell/emko-weekly-meeting-system.git

# 6. 첫 푸시
git branch -M main
git push -u origin main
```

### 팀원 합류 절차

```bash
# 1. 리포지토리 클론
git clone https://github.com/kimjuno77-cell/emko-weekly-meeting-system.git
cd weekly-meeting-system/frontend

# 2. 의존성 설치
npm install

# 3. .env 파일 설정 (팀 리더에게 키 전달받아 입력)
cp .env.example .env
# → .env 파일을 열어 실제 Supabase URL과 Key 입력

# 4. 로컬 개발 서버 실행
npm run dev
```

### 일상 작업 흐름

```bash
# 1. 최신 코드 받기
git pull origin main

# 2. 작업 브랜치 생성
git checkout -b feature/대시보드-차트-개선

# 3. 코드 작성 후 커밋
git add .
git commit -m "feat: 대시보드에 팀별 완료율 차트 추가"

# 4. 원격에 푸시
git push origin feature/대시보드-차트-개선

# 5. GitHub에서 Pull Request 생성 → 리뷰 → 머지
```

---

## 2. 데이터 취합 & 저장: Supabase 실시간 동기화

### 현재 아키텍처의 강점

```
[팀원 A 브라우저] ──┐
[팀원 B 브라우저] ──┤──→ [Supabase 클라우드 DB] ←── 실시간 동기화
[팀원 C 브라우저] ──┘         │
                              ├── 자동 백업 (Supabase 내장)
                              ├── RLS 보안 정책
                              └── PostgreSQL 기반 안정성
```

- **동시 접속**: 모든 팀원이 동시에 접속하여 각자 팀 데이터 입력 가능
- **실시간 취합**: 각 팀이 입력한 데이터가 즉시 대시보드와 리포트에 반영
- **데이터 안전성**: Supabase가 클라우드에서 자동으로 데이터 보호

### Supabase 키 공유 방법

모든 팀원이 **같은 Supabase 프로젝트**를 사용합니다:

1. 관리자가 Supabase 프로젝트 1개 운영
2. `.env.example` 파일에 키 형식만 기재
3. 실제 키는 **사내 메신저**(카카오워크, 슬랙, Teams 등)로 별도 전달
4. 각 팀원이 자기 PC의 `.env` 파일에 입력

---

## 3. 데이터 백업: JSON Export + Git 이력 관리

### 3-1. 시스템 내장 백업 (JSON Export)

관리자 페이지(`/admin`) → **백업 관리** 탭에서:

- **내보내기**: 전체 데이터를 JSON 파일로 다운로드
  - 파일명 예: `weekly_meeting_backup_20260728_1430.json`
  - 포함 데이터: 팀 정보, 사용자, 주간 보고서, 작업 항목, Pending 항목
  
- **가져오기**: JSON 파일로 데이터 복원 (upsert 방식으로 안전)

### 3-2. 권장 백업 주기

| 시점 | 백업 방법 | 비고 |
|------|-----------|------|
| 매주 월요일 회의 전 | JSON Export (관리자) | 회의 전 데이터 스냅샷 |
| 주요 기능 변경 후 | Git 커밋 & 푸시 | 코드 변경 이력 보존 |
| 매월 1일 | JSON Export + 구글 드라이브 보관 | 월간 아카이브 |

### 3-3. Supabase 자체 백업

Supabase는 자동으로:
- **일일 자동 백업** (Pro 플랜: 7일 보관)
- **Point-in-Time Recovery** (Pro 플랜)
- 무료 플랜에서도 수동 SQL Dump 가능

---

## 4. 배포 & 업로드: GitHub Pages 자동 배포

### 자동 배포 흐름

```
코드 수정 → git push → GitHub Actions 자동 실행 → 빌드 → GitHub Pages 배포
                                                           │
                                                           ↓
                                                  https://<조직명>.github.io/weekly-meeting-system/
```

### GitHub Secrets 설정 (최초 1회)

GitHub Pages 배포를 위해 GitHub 리포지토리에 환경 변수를 등록해야 합니다:

1. GitHub 리포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭
3. 다음 2개 시크릿 추가:

| Secret Name | 값 |
|-------------|-----|
| `VITE_SUPABASE_URL` | `https://qlvnroublnpotfukedji.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 실제 anon key 값 |

### GitHub Pages 활성화

1. GitHub 리포지토리 → **Settings** → **Pages**
2. **Source**: `GitHub Actions` 선택
3. `main` 브랜치에 Push하면 자동 배포 시작

### 수동 배포 (Vercel 대안)

GitHub Pages 대신 Vercel을 사용할 수도 있습니다:

```bash
# Vercel CLI 설치 및 배포
npx vercel
```

---

## 5. 팀원 환경 설정 체크리스트

팀원에게 이 체크리스트를 공유하세요:

- [ ] **Node.js 20 이상** 설치 확인: `node -v`
- [ ] **Git** 설치 확인: `git --version`
- [ ] GitHub 계정 생성 및 리포지토리 접근 권한 확인
- [ ] `git clone` 후 `cd weekly-meeting-system/frontend`
- [ ] `npm install` 실행
- [ ] `.env` 파일 생성 (관리자에게 키 전달받기)
- [ ] `npm run dev` 실행 → `http://localhost:3000` 접속 확인
- [ ] 시스템 회원가입 → 관리자 승인 대기 → 로그인 성공 확인

---

## 6. 보안 키 관리 가이드

### ✅ 안전한 키 전달 방법

| 방법 | 보안 수준 | 권장 |
|------|-----------|------|
| 사내 메신저 DM (1:1 대화) | ⭐⭐⭐ | ✅ 추천 |
| 이메일 (암호화) | ⭐⭐ | ⚠️ 보통 |
| 공유 문서 (구글독스 등) | ⭐ | ❌ 비추 |
| Git에 커밋 | ❌ 위험 | ❌ 절대 금지 |

### ❌ 절대 하면 안 되는 것

1. `.env` 파일을 Git에 커밋하기
2. Supabase 키를 소스코드에 하드코딩하기
3. 공개 채널(단체 채팅방)에 키 공유하기

### 🔑 현재 프로젝트 보안 조치 현황

- [x] `.gitignore`에 `.env` 등록 완료
- [x] `.env.example` 템플릿 파일 제공
- [x] Supabase RLS (Row Level Security) 정책 적용
- [x] 회원가입 승인 시스템으로 무단 접근 차단
- [x] 관리자 비밀번호 변경 기능 제공
