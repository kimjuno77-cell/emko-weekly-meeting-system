# 주간회의 업데이트 취합 시스템

## 📋 프로젝트 개요

8개 팀의 주간 업데이트를 효율적으로 취합하고 Pending 사항을 추적 관리하는 웹 애플리케이션

## 🎯 주요 기능

- ✅ 8개 팀별 주간 업데이트 입력 (진행사항, 이슈, 차주계획)
- ✅ 실시간 통합 대시보드 및 차트 시각화
- ✅ Pending 추적 시스템 (담당자, 기한, 우선순위, 상태 관리)
- ✅ 주간회의 리포트 자동 생성 및 A4 인쇄 최적화
- ✅ 지난주 미완료 항목 → 이번주 자동 이관 기능
- ✅ 2주간 비교 뷰 (지난주 계획 vs 이번주 실적)
- ✅ 관리자 회원가입 승인 시스템
- ✅ 전체 데이터 백업/복원 (JSON Export/Import)
- ✅ 관리자 비밀번호 변경 기능

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | React 18 + TypeScript + Vite |
| **스타일링** | Tailwind CSS 3 |
| **라우팅** | React Router v6 |
| **상태관리** | Zustand |
| **차트** | Recharts |
| **아이콘** | Lucide React |
| **알림** | React Hot Toast |
| **Backend** | Supabase (PostgreSQL + Auth + RLS) |
| **배포** | GitHub Pages (CI/CD: GitHub Actions) |

## 📦 프로젝트 구조

```
weekly-meeting-system/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages 자동 배포 워크플로우
├── frontend/                    # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx       # 전체 레이아웃 (사이드바 + 헤더)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # 대시보드 (전체 팀 현황)
│   │   │   ├── TeamUpdate.tsx   # 팀별 주간 업데이트 작성
│   │   │   ├── PendingTracker.tsx # Pending 추적 관리
│   │   │   ├── WeeklyReport.tsx # 주간회의 리포트 (인쇄용)
│   │   │   ├── AdminPage.tsx    # 관리자 전용 페이지
│   │   │   └── Login.tsx        # 로그인 및 회원가입
│   │   ├── services/
│   │   │   ├── teamService.ts       # 팀 CRUD API
│   │   │   ├── weeklyUpdateService.ts # 주간 업데이트 API
│   │   │   ├── taskService.ts       # 작업 항목 API
│   │   │   ├── pendingService.ts    # Pending 항목 API
│   │   │   └── backupService.ts     # 데이터 백업/복원
│   │   ├── stores/
│   │   │   └── authStore.ts     # 인증 상태 관리 (Zustand)
│   │   ├── lib/
│   │   │   └── supabase.ts      # Supabase 클라이언트 설정
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript 타입 정의
│   │   ├── App.tsx              # 메인 앱 컴포넌트 & 라우팅
│   │   ├── main.tsx             # 앱 진입점
│   │   └── index.css            # 전역 CSS 스타일
│   ├── .env.example             # 환경 변수 템플릿 (팀원 배포용)
│   ├── package.json             # 의존성 목록
│   ├── tsconfig.json            # TypeScript 설정
│   ├── vite.config.ts           # Vite 빌드 설정
│   ├── tailwind.config.js       # Tailwind CSS 설정
│   └── postcss.config.js        # PostCSS 설정
├── supabase/
│   └── migrations/              # 데이터베이스 마이그레이션 SQL
│       ├── 001_create_teams_table.sql
│       ├── 002_create_users_table.sql
│       ├── 003_create_weekly_updates_table.sql
│       ├── 004_create_tasks_table.sql
│       ├── 005_create_pending_items_table.sql
│       ├── 006 ~ 009_*.sql      # 추가 마이그레이션
│       └── all_in_one_migration.sql  # 통합 마이그레이션
├── .gitignore
├── README.md                    # ← 현재 파일
├── QUICK_START.md               # 빠른 시작 가이드
├── INSTALLATION.md              # 상세 설치 가이드
├── USER_GUIDE.md                # 사용자 매뉴얼
├── SUPABASE_SETUP_GUIDE.md      # Supabase 설정 가이드
├── SQL_MIGRATION_GUIDE.md       # SQL 마이그레이션 가이드
└── PROJECT_SUMMARY.md           # 프로젝트 요약
```

## 🚀 빠른 시작 (팀원용)

### 1단계: 레포지토리 클론

```bash
git clone https://github.com/kimjuno77-cell/emko-weekly-meeting-system.git
cd weekly-meeting-system/frontend
```

### 2단계: 의존성 설치

```bash
npm install
```

### 3단계: 환경 변수 설정

```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env
```

`.env` 파일을 열고 Supabase 프로젝트 정보 입력:
```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> ⚠️ **주의**: `.env` 파일에는 실제 인증 키가 포함되므로 **절대 Git에 커밋하지 마세요!** (`.gitignore`에 이미 등록되어 있습니다)

### 4단계: 로컬 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 로그인 화면 표시

### 5단계: 프로덕션 빌드 (선택)

```bash
npm run build
npm run preview  # 빌드 결과 미리보기
```

## 👥 팀 공동 작업 가이드

### Git 브랜치 전략
- `main`: 안정 버전 (배포용)
- `develop`: 개발 통합 브랜치
- `feature/<기능명>`: 기능별 작업 브랜치

### 작업 흐름
1. `develop` 브랜치에서 새 브랜치 생성: `git checkout -b feature/새기능`
2. 코드 작성 후 커밋: `git commit -m "feat: 새 기능 추가"`
3. Pull Request 생성 → 코드 리뷰 → `develop`에 머지

## 📅 사용 워크플로우

1. **주중**: 각 팀 담당자가 팀별 입력 페이지에서 업데이트 작성
2. **매주 월요일 오전**: 시스템에서 회의 알림 발송
3. **회의 전**: 관리자가 통합 대시보드 및 리포트 확인
4. **회의 중**: 주간회의 리포트 화면 공유 (A4 인쇄 최적화 지원)
5. **회의 후**: Pending 항목 체크 및 다음 주 계획 확인

## 🔒 보안 주의사항

- Supabase Row Level Security (RLS) 적용
- `.env` 파일은 **절대 Git에 커밋 금지** (`.gitignore` 등록 완료)
- Supabase Anon Key는 `VITE_` 접두사로 클라이언트에 노출되지만, RLS 정책으로 보호됨
- 팀원 간 `.env` 키 공유는 별도 보안 채널(사내 메신저 등) 사용 권장

## 📝 라이선스

MIT License

## 👨‍💻 개발자

귀하의 조직

## 📞 문의

문의사항이 있으시면 연락주세요.
