# 📘 SQL 마이그레이션 실행 가이드

Supabase SQL Editor에서 데이터베이스 마이그레이션 파일을 실행하는 **단계별 상세 가이드**입니다.

---

## 🎯 개요

마이그레이션 파일을 실행하면:
- 데이터베이스 테이블 생성
- 팀 데이터 자동 삽입
- 보안 정책 설정
- 자동화 트리거 설정

**소요 시간**: 약 5-10분

---

## 📋 사전 준비

### 1. Supabase 프로젝트 생성 확인

1. https://app.supabase.com 접속
2. 좌측 상단에 프로젝트명이 표시되는지 확인
3. 프로젝트 상태가 "Active" (초록색)인지 확인

### 2. SQL Editor 접근

1. 좌측 메뉴에서 **"SQL Editor"** 클릭
2. 화면 중앙에 SQL 코드를 입력할 수 있는 에디터가 표시됨

---

## 🚀 단계별 실행 가이드

### ✅ 1단계: 001_create_teams_table.sql 실행

#### 1-1. 파일 열기
```bash
# 로컬 컴퓨터에서 파일 경로:
weekly-meeting-system/supabase/migrations/001_create_teams_table.sql
```

#### 1-2. 파일 내용 복사
- 파일을 텍스트 에디터로 열기 (VS Code, 메모장 등)
- **전체 내용 선택** (Ctrl+A 또는 Cmd+A)
- **복사** (Ctrl+C 또는 Cmd+C)

#### 1-3. Supabase SQL Editor에 붙여넣기
1. Supabase SQL Editor에서 **"New query"** 버튼 클릭
2. 에디터 창에 **붙여넣기** (Ctrl+V 또는 Cmd+V)
3. 좌측 상단의 쿼리 이름을 `001_create_teams_table`로 변경 (선택사항)

#### 1-4. 실행
1. 우측 하단의 **"Run"** 버튼 클릭 (또는 Ctrl+Enter)
2. 하단에 **"Success. No rows returned"** 메시지 확인

#### ✅ 실행 성공 확인
```sql
-- 이 쿼리를 실행하여 팀 테이블이 생성되었는지 확인
SELECT * FROM teams;
```
**결과**: 8개 팀 데이터가 표시되어야 함
```
Team 1, Team 2, Team 3, ..., Team 8
```

---

### ✅ 2단계: 002_create_users_table.sql 실행

#### 2-1. 새 쿼리 생성
- **"New query"** 버튼 다시 클릭

#### 2-2. 파일 내용 복사 및 붙여넣기
```bash
파일: 002_create_users_table.sql
```
- 전체 내용 복사 → SQL Editor에 붙여넣기

#### 2-3. 실행
- **"Run"** 버튼 클릭

#### ✅ 실행 성공 확인
```sql
-- 사용자 프로필 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles';
```
**결과**: `user_profiles` 테이블이 존재해야 함

---

### ✅ 3단계: 003_create_weekly_updates_table.sql 실행

#### 3-1. 파일 복사 및 실행
```bash
파일: 003_create_weekly_updates_table.sql
```
1. "New query" 클릭
2. 파일 내용 복사 → 붙여넣기
3. "Run" 실행

#### ✅ 실행 성공 확인
```sql
SELECT * FROM weekly_updates;
```
**결과**: 빈 테이블 (데이터 없음은 정상)

---

### ✅ 4단계: 004_create_tasks_table.sql 실행

#### 4-1. 파일 복사 및 실행
```bash
파일: 004_create_tasks_table.sql
```
1. "New query" 클릭
2. 파일 내용 복사 → 붙여넣기
3. "Run" 실행

#### ✅ 실행 성공 확인
```sql
-- ENUM 타입 확인
SELECT typname FROM pg_type WHERE typname IN ('task_type', 'task_status', 'priority_level');
```
**결과**: 3개의 ENUM 타입이 표시되어야 함

---

### ✅ 5단계: 005_create_pending_items_table.sql 실행

#### 5-1. 파일 복사 및 실행
```bash
파일: 005_create_pending_items_table.sql (마지막!)
```
1. "New query" 클릭
2. 파일 내용 복사 → 붙여넣기
3. "Run" 실행

#### ✅ 실행 성공 확인
```sql
SELECT * FROM pending_items;
```
**결과**: 빈 테이블 (데이터 없음은 정상)

---

## 🎉 전체 마이그레이션 완료 확인

모든 단계를 완료했다면 아래 쿼리로 최종 확인:

```sql
-- 모든 테이블 목록 조회
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### ✅ 예상 결과 (5개 테이블)
```
pending_items
tasks
teams
user_profiles
weekly_updates
```

---

## 📸 스크린샷 가이드

### SQL Editor 화면 구성
```
┌─────────────────────────────────────────────────────┐
│  Supabase                                           │
├─────────────────────────────────────────────────────┤
│ [New query] [Snippets] [History]                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  -- 여기에 SQL 코드를 붙여넣습니다                    │
│  CREATE TABLE IF NOT EXISTS teams (                │
│    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  │
│    ...                                             │
│  );                                                │
│                                                     │
│                                            [Run] ▶  │
├─────────────────────────────────────────────────────┤
│ Results:                                            │
│ ✓ Success. No rows returned                        │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 각 마이그레이션 파일의 역할

### 001_create_teams_table.sql
**생성 내용:**
- ✅ `teams` 테이블
- ✅ 8개 팀 데이터 자동 삽입
- ✅ 자동 업데이트 트리거
- ✅ Row Level Security 정책

**확인 방법:**
```sql
SELECT COUNT(*) FROM teams;
-- 결과: 8
```

---

### 002_create_users_table.sql
**생성 내용:**
- ✅ `user_profiles` 테이블
- ✅ 신규 사용자 자동 프로필 생성 트리거
- ✅ 사용자별 RLS 정책

**확인 방법:**
```sql
SELECT * FROM user_profiles;
-- 결과: 아직 사용자가 없으므로 빈 테이블
```

---

### 003_create_weekly_updates_table.sql
**생성 내용:**
- ✅ `weekly_updates` 테이블
- ✅ 주차별 중복 방지 제약조건
- ✅ 팀별 접근 제어 RLS

**확인 방법:**
```sql
\d weekly_updates
-- 테이블 구조 확인
```

---

### 004_create_tasks_table.sql
**생성 내용:**
- ✅ `tasks` 테이블
- ✅ 3개 ENUM 타입 (task_type, task_status, priority_level)
- ✅ 진행률 제약조건 (0-100%)
- ✅ 작업 항목별 RLS

**확인 방법:**
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'task_type'::regtype;
-- 결과: progress, issue, plan
```

---

### 005_create_pending_items_table.sql
**생성 내용:**
- ✅ `pending_items` 테이블
- ✅ 자동 ID 생성 함수 (P001, P002...)
- ✅ 완료일 자동 기록 트리거
- ✅ Pending 항목 RLS

**확인 방법:**
```sql
-- Pending 항목 추가 테스트 (선택사항)
INSERT INTO pending_items (team_id, title, created_by)
SELECT id, '테스트 Pending', (SELECT id FROM auth.users LIMIT 1)
FROM teams LIMIT 1;

SELECT item_id FROM pending_items;
-- 결과: P001 (자동 생성된 ID)
```

---

## ❌ 문제 해결

### 에러 1: "relation already exists"
**원인**: 테이블이 이미 존재함  
**해결**:
```sql
-- 기존 테이블 삭제 후 다시 실행
DROP TABLE IF EXISTS [테이블명] CASCADE;
```

### 에러 2: "syntax error"
**원인**: SQL 코드가 잘못 복사됨  
**해결**:
- 파일 전체 내용을 다시 복사
- 숨겨진 문자나 줄바꿈 확인
- UTF-8 인코딩 확인

### 에러 3: "permission denied"
**원인**: 권한 부족  
**해결**:
- Supabase 프로젝트 소유자 계정으로 로그인했는지 확인
- 프로젝트가 "Active" 상태인지 확인

### 에러 4: "foreign key constraint"
**원인**: 실행 순서가 잘못됨  
**해결**:
- 반드시 001 → 002 → 003 → 004 → 005 순서로 실행
- 건너뛴 파일이 있다면 해당 파일부터 다시 실행

---

## 🔧 고급: 한 번에 모든 마이그레이션 실행

### 방법 1: 파일 합치기 (권장하지 않음)
5개 파일을 하나로 합쳐서 실행할 수 있지만, 에러 발생 시 어느 부분에서 문제인지 찾기 어렵습니다.

### 방법 2: Supabase CLI 사용 (고급)
```bash
# Supabase CLI 설치
npm install -g supabase

# 로컬에서 마이그레이션 실행
supabase db push
```

---

## ✅ 최종 체크리스트

마이그레이션 완료 후 확인:

- [ ] `teams` 테이블에 8개 팀 존재
- [ ] `user_profiles` 테이블 생성됨
- [ ] `weekly_updates` 테이블 생성됨
- [ ] `tasks` 테이블 생성됨
- [ ] `pending_items` 테이블 생성됨
- [ ] ENUM 타입 생성됨 (task_type, task_status, priority_level, pending_status)
- [ ] 에러 메시지 없음

---

## 📚 다음 단계

마이그레이션 완료 후:

1. **첫 사용자 생성**: Supabase Dashboard > Authentication > Users
2. **환경 변수 설정**: 프론트엔드 `.env` 파일에 API 키 입력
3. **프론트엔드 실행**: `npm run dev`

자세한 내용은 `INSTALLATION.md` 참조!

---

## 🎊 완료!

축하합니다! 데이터베이스 마이그레이션이 성공적으로 완료되었습니다! 🎉

이제 프론트엔드 애플리케이션을 실행할 준비가 되었습니다.
