# 🎯 Supabase 설정 완벽 가이드 (초보자용)

처음 Supabase를 사용하시나요? 걱정 마세요! 이 가이드를 따라하면 **10분 안에** 설정을 완료할 수 있습니다.

---

## 📋 목차

1. [Supabase 계정 생성](#1-supabase-계정-생성)
2. [새 프로젝트 만들기](#2-새-프로젝트-만들기)
3. [데이터베이스 마이그레이션](#3-데이터베이스-마이그레이션)
4. [API 키 확인](#4-api-키-확인)
5. [첫 사용자 생성](#5-첫-사용자-생성)

---

## 1️⃣ Supabase 계정 생성

### 1-1. Supabase 웹사이트 접속

1. 브라우저에서 https://supabase.com 접속
2. 우측 상단 **"Start your project"** 또는 **"Sign in"** 클릭

### 1-2. 계정 생성 방법 선택

**옵션 A: GitHub 계정으로 가입 (권장)**
- "Continue with GitHub" 버튼 클릭
- GitHub 로그인
- Supabase 권한 승인

**옵션 B: 이메일로 가입**
- 이메일 주소 입력
- 비밀번호 설정
- 이메일 인증

### 1-3. 조직 생성 (Organization)

1. 조직 이름 입력 (예: "우리회사")
2. "Create organization" 클릭

---

## 2️⃣ 새 프로젝트 만들기

### 2-1. 프로젝트 생성 시작

1. 대시보드에서 **"New project"** 버튼 클릭
2. 조직 선택 (방금 만든 조직)

### 2-2. 프로젝트 정보 입력

```
┌─────────────────────────────────────────┐
│ Create a new project                    │
├─────────────────────────────────────────┤
│ Name: weekly-meeting-system             │
│                                         │
│ Database Password: ****************     │
│ (안전한 곳에 저장하세요!)                  │
│                                         │
│ Region: Northeast Asia (Seoul)          │
│ (한국이라면 Seoul 권장)                   │
│                                         │
│ Pricing Plan: Free                      │
│                                         │
│         [Create new project]            │
└─────────────────────────────────────────┘
```

**중요! 데이터베이스 비밀번호 저장하기**
- 생성 시 입력한 비밀번호를 **반드시 저장**하세요
- 나중에 복구 불가능합니다
- 메모장이나 비밀번호 관리 앱에 저장 권장

### 2-3. 프로젝트 생성 대기

- 프로젝트 생성 중... (약 1-2분 소요)
- 초록색 "Active" 표시가 나타날 때까지 대기
- 생성 완료 후 자동으로 프로젝트 대시보드로 이동

---

## 3️⃣ 데이터베이스 마이그레이션

### 3-1. SQL Editor 열기

```
좌측 메뉴:
┌─────────────────────┐
│ 🏠 Home             │
│ 📊 Table Editor     │
│ 🔧 SQL Editor  ←── 클릭 │
│ 🔐 Authentication   │
│ 📁 Storage          │
│ ⚙️  Settings        │
└─────────────────────┘
```

### 3-2. 첫 번째 마이그레이션 (001)

**단계:**
1. "New query" 버튼 클릭
2. 로컬에서 `001_create_teams_table.sql` 파일 열기
3. 파일 내용 **전체 선택** (Ctrl+A)
4. **복사** (Ctrl+C)
5. SQL Editor에 **붙여넣기** (Ctrl+V)
6. 우측 하단 **"Run"** 버튼 클릭 (또는 Ctrl+Enter)

**성공 확인:**
```
하단 Results 창:
✅ Success. No rows returned
```

### 3-3. 팀 데이터 확인

새 쿼리 창에서 실행:
```sql
SELECT * FROM teams;
```

**예상 결과:**
```
id                                    | name    | display_order
--------------------------------------|---------|---------------
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Team 1  | 1
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Team 2  | 2
...
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Team 8  | 8
```

### 3-4. 나머지 마이그레이션 (002 ~ 005)

**동일한 방법으로 순서대로 실행:**

1. **002_create_users_table.sql**
   - New query → 복사 → 붙여넣기 → Run

2. **003_create_weekly_updates_table.sql**
   - New query → 복사 → 붙여넣기 → Run

3. **004_create_tasks_table.sql**
   - New query → 복사 → 붙여넣기 → Run

4. **005_create_pending_items_table.sql**
   - New query → 복사 → 붙여넣기 → Run

### 3-5. 최종 확인

모든 마이그레이션 완료 후 실행:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**예상 결과 (5개 테이블):**
```
pending_items
tasks
teams
user_profiles
weekly_updates
```

---

## 4️⃣ API 키 확인

### 4-1. Settings 메뉴 이동

```
좌측 메뉴 하단:
┌─────────────────────┐
│ ...                 │
│ ⚙️  Settings  ←── 클릭 │
└─────────────────────┘
```

### 4-2. API 설정 페이지

좌측 서브메뉴에서 **"API"** 클릭

### 4-3. 정보 복사

**필요한 정보 2가지:**

1. **Project URL**
```
Configuration > URL:
https://xxxxxxxxxxxxx.supabase.co
                     ↑ 복사하세요
```

2. **anon public key**
```
Project API keys > anon public:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ...
↑ 전체 복사하세요 (매우 긴 문자열)
```

**⚠️ 주의:**
- **service_role key**는 복사하지 마세요!
- **anon public key**만 사용합니다

### 4-4. 안전하게 저장

```
메모장이나 텍스트 파일에 저장:

VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5️⃣ 첫 사용자 생성

### 5-1. Authentication 메뉴 이동

```
좌측 메뉴:
┌─────────────────────┐
│ 🔐 Authentication ←── 클릭 │
└─────────────────────┘
```

### 5-2. Users 탭 선택

상단 탭에서 **"Users"** 선택

### 5-3. 새 사용자 추가

1. 우측 상단 **"Add user"** 버튼 클릭
2. 드롭다운에서 **"Create new user"** 선택

### 5-4. 사용자 정보 입력

```
┌─────────────────────────────────────┐
│ Create new user                     │
├─────────────────────────────────────┤
│ Email:                              │
│ admin@example.com                   │
│                                     │
│ Password:                           │
│ ****************                    │
│                                     │
│ ✅ Auto Confirm User  ←── 체크 필수!  │
│                                     │
│ Metadata (optional):                │
│ {                                   │
│   "full_name": "관리자"              │
│ }                                   │
│                                     │
│         [Create user]               │
└─────────────────────────────────────┘
```

**중요 포인트:**
- ✅ "Auto Confirm User" **반드시 체크**
- 이메일과 비밀번호 기억하기 (로그인 시 사용)

### 5-5. 사용자에게 팀 배정

SQL Editor에서 실행:

```sql
-- 생성한 사용자에게 Team 1 배정
UPDATE user_profiles
SET team_id = (SELECT id FROM teams WHERE name = 'Team 1' LIMIT 1),
    role = 'admin'
WHERE email = 'admin@example.com';
```

### 5-6. 배정 확인

```sql
SELECT 
  up.email,
  up.full_name,
  up.role,
  t.name as team_name
FROM user_profiles up
LEFT JOIN teams t ON up.team_id = t.id
WHERE up.email = 'admin@example.com';
```

**예상 결과:**
```
email              | full_name | role  | team_name
-------------------|-----------|-------|----------
admin@example.com  | 관리자     | admin | Team 1
```

---

## ✅ 설정 완료 체크리스트

모든 단계를 완료했는지 확인하세요:

- [ ] Supabase 계정 생성
- [ ] 새 프로젝트 생성 (Status: Active)
- [ ] 5개 마이그레이션 파일 모두 실행
- [ ] 5개 테이블 생성 확인
- [ ] Project URL 복사 완료
- [ ] anon public key 복사 완료
- [ ] 첫 사용자 생성 완료
- [ ] 사용자에게 팀 배정 완료

---

## 🎯 다음 단계

Supabase 설정이 완료되었습니다! 이제:

1. **프론트엔드 설정**으로 이동
2. `.env` 파일에 복사한 URL과 KEY 입력
3. 애플리케이션 실행!

자세한 내용은 `INSTALLATION.md` 참조

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1. 프로젝트 생성 시 어느 Region을 선택해야 하나요?
**A:** 사용자가 주로 있는 지역과 가장 가까운 곳을 선택하세요.
- 한국: Northeast Asia (Seoul)
- 일본: Northeast Asia (Tokyo)
- 미국: US West (Oregon) 또는 US East (N. Virginia)

### Q2. 데이터베이스 비밀번호를 잊어버렸어요!
**A:** Supabase에서는 비밀번호를 복구할 수 없습니다. 
- Settings > Database > Reset database password로 **새 비밀번호 설정** 가능
- ⚠️ 주의: 기존 연결이 모두 끊어질 수 있습니다

### Q3. 마이그레이션 실행 시 "already exists" 에러가 나요.
**A:** 이미 테이블이 존재합니다.
```sql
-- 기존 테이블 삭제 후 다시 실행
DROP TABLE IF EXISTS [테이블명] CASCADE;
```

### Q4. API 키를 잘못 복사한 것 같아요.
**A:** Settings > API 페이지로 가서 다시 복사하세요.
- anon public key는 공개해도 안전합니다 (RLS로 보호됨)
- service_role key는 절대 공개하면 안 됩니다!

### Q5. 사용자 생성 시 "Email already exists" 에러
**A:** 해당 이메일로 이미 사용자가 존재합니다.
- 다른 이메일 사용
- 또는 기존 사용자 삭제 후 재생성

---

## 🔧 문제 해결

### 프로젝트가 "Paused" 상태인 경우
- Free 플랜은 1주일간 활동이 없으면 일시 중지됨
- "Resume project" 버튼 클릭하여 재시작

### SQL Editor가 느린 경우
- 브라우저 새로고침 (F5)
- 캐시 삭제 후 재접속
- 다른 브라우저 사용 (Chrome 권장)

### 테이블이 보이지 않는 경우
1. Table Editor 메뉴 클릭
2. 좌측 테이블 목록 확인
3. 없다면 SQL Editor에서 쿼리로 확인:
```sql
SELECT * FROM pg_tables WHERE schemaname = 'public';
```

---

## 📞 추가 도움말

더 자세한 SQL 마이그레이션 가이드: `SQL_MIGRATION_GUIDE.md` 참조

Supabase 공식 문서: https://supabase.com/docs

---

## 🎉 축하합니다!

Supabase 설정을 성공적으로 완료했습니다! 🎊

이제 주간회의 시스템의 백엔드가 준비되었습니다.
프론트엔드 설정을 진행하세요!
