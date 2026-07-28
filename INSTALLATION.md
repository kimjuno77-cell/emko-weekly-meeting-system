# 주간회의 업데이트 취합 시스템 - 팀원 배포 및 설치 가이드

> **최종 업데이트**: 2026-07-27  
> **배포 버전**: v1.0.0

---

## 📋 시스템 요구사항

| 항목 | 최소 버전 |
|---|---|
| **Node.js** | 18.0 이상 |
| **npm** | 9.0 이상 |
| **운영체제** | Windows 10/11 |

> 💡 Node.js가 설치되어 있지 않다면 [https://nodejs.org](https://nodejs.org) 에서 **LTS 버전**을 다운로드하여 설치하세요.

---

## 🚀 팀원용 빠른 시작 (5분 설치)

### 1단계: 프로젝트 폴더 복사

Google 드라이브의 `weekly-meeting-system` 폴더를 로컬 PC의 원하는 위치(예: `C:\weekly-meeting-system`)에 복사합니다.

```
G:\내 드라이브\weekly-meeting-system  →  C:\weekly-meeting-system
```

> ⚠️ **중요**: Google 드라이브에서 직접 실행하면 속도가 매우 느립니다. 반드시 로컬 드라이브(C: 또는 D:)에 복사 후 실행하세요.

---

### 2단계: 패키지 설치

명령 프롬프트(CMD) 또는 PowerShell을 열고:

```bash
cd C:\weekly-meeting-system\frontend
npm install
```

> 최초 설치 시 약 1~3분 소요됩니다.

---

### 3단계: 개발 서버 실행

```bash
npm run dev
```

아래와 같은 메시지가 표시되면 성공입니다:

```
  VITE v5.4.21  ready in 500 ms

  ➜  Local:   http://localhost:3000/
```

---

### 4단계: 브라우저 접속

브라우저(Chrome 권장)에서 아래 주소로 접속합니다:

```
http://localhost:3000
```

> 포트가 사용 중일 경우 `3001`, `3002` 등 다른 포트가 자동 배정됩니다.  
> 터미널에 표시된 `Local:` 주소를 확인하세요.

---

### 5단계: 회원가입 및 로그인

1. 로그인 화면에서 **"회원가입"** 탭 클릭
2. 이름, 이메일, 비밀번호, 소속 팀 입력 후 가입
3. 관리자 승인 후 로그인 가능

> 관리자 계정은 이미 설정되어 있습니다. 관리자에게 승인을 요청하세요.

---

## 📌 주요 기능 안내

| 메뉴 | 기능 설명 |
|---|---|
| **대시보드** | 전체 팀의 주간 업무 현황 한눈에 보기 |
| **팀 업데이트** | 팀별 주간 업무 진행사항/이슈/계획 작성 |
| **Pending 추적** | 미해결 과제 등록 및 추적 관리 |
| **주간회의 리포트** | 전체 주간보고서 조회 및 인쇄 |
| **회원 승인 관리** | (관리자 전용) 가입 승인, 팀 관리, 백업 |

---

## 🔧 문제 해결

### `npm install` 실행 시 에러가 발생합니다

```bash
# 캐시 정리 후 재시도
npm cache clean --force
npm install
```

### 포트가 이미 사용 중입니다 (Port in use)

```bash
# 다른 포트로 실행
npm run dev -- --port 3100
```

### 로그인 후 빈 화면이 나옵니다

- 관리자에게 회원 승인 요청을 해주세요
- 관리자 → 회원 승인 관리 → 승인 버튼 클릭

### `npm run dev` 실행 시 "'tsc' is not recognized" 에러

```bash
# TypeScript를 전역 설치
npm install -g typescript
```

---

## 🏗️ 관리자 전용: Supabase 데이터베이스 설정

> ⚠️ 이 섹션은 **최초 1회 관리자만** 수행합니다. 이미 설정 완료되었습니다.

### Supabase 프로젝트 정보

- **Project URL**: `https://qlvnroublnpotfukedji.supabase.co`
- **Region**: Northeast Asia (Seoul)
- **Free Tier**: 500MB 스토리지 (주간보고 텍스트 기준 200년 이상 저장 가능)

### 데이터베이스 마이그레이션

Supabase 대시보드 → SQL Editor에서 아래 파일들을 **순서대로** 실행:

```
supabase/migrations/
├── 001_create_teams_table.sql
├── 002_create_users_table.sql
├── 003_create_weekly_updates_table.sql
├── 004_create_tasks_table.sql
└── 005_create_pending_items_table.sql
```

### 관리자 계정 정보

- **이메일**: yjkim@emko.co.kr
- **역할**: admin (관리자)
- 관리자 계정은 비활성화/삭제가 보호됩니다

---

## 📦 데이터 저장 위치 안내

| 데이터 종류 | 저장 위치 |
|---|---|
| 팀 업데이트, Pending 항목, 사용자 정보 | **Supabase Cloud DB** (서울 리전) |
| 소스코드 (마스터 원본) | **Google 드라이브** `G:\내 드라이브\weekly-meeting-system` |
| 로컬 실행 환경 | **각 PC 로컬** `C:\weekly-meeting-system` |
| JSON 백업 파일 | 관리자 화면 → 백업 & 복원 → 로컬 PC에 다운로드 |

---

## 🔄 업데이트 방법

소스코드가 업데이트되면:

1. Google 드라이브의 `weekly-meeting-system` 폴더에서 변경된 파일 확인
2. 로컬 폴더에 덮어쓰기 복사
3. 터미널에서:

```bash
cd C:\weekly-meeting-system\frontend
npm install    # 새로운 패키지가 추가된 경우
npm run dev    # 서버 재시작
```

---

## 🎉 설치 완료!

이제 주간회의 업데이트 취합 시스템을 사용할 준비가 되었습니다.  
추가 도움이 필요하시면 관리자에게 문의해 주세요.
