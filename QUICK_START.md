# 🚀 빠른 시작 가이드

주간회의 업데이트 취합 시스템을 5분 안에 실행해보세요!

---

## ⚡ 3단계로 시작하기

### 1️⃣ 프로젝트 다운로드

압축 파일을 다운로드하고 압축 해제:

```bash
tar -xzf weekly-meeting-system.tar.gz
cd weekly-meeting-system
```

### 2️⃣ Supabase 설정 (5분)

1. **Supabase 계정 생성**: https://supabase.com
2. **새 프로젝트 생성**
3. **SQL Editor에서 마이그레이션 실행**:
   - `supabase/migrations/` 폴더의 SQL 파일을 순서대로 실행
   - 001 → 002 → 003 → 004 → 005 순서

4. **API 키 복사**:
   - Settings > API에서 URL과 anon key 복사

### 3️⃣ 프론트엔드 실행

```bash
cd frontend

# 패키지 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 Supabase URL과 KEY 입력

# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 접속!

---

## 🎯 첫 사용자 생성

### Supabase 대시보드에서:

1. Authentication > Users 메뉴
2. "Add user" > "Create new user"
3. 이메일: `admin@example.com`
4. 비밀번호: 원하는 비밀번호 입력
5. "Auto Confirm User" 체크
6. "Create user" 클릭

### 팀 배정:

```sql
UPDATE user_profiles
SET team_id = (SELECT id FROM teams WHERE name = 'Team 1' LIMIT 1),
    role = 'admin'
WHERE email = 'admin@example.com';
```

---

## ✅ 완료!

로그인 페이지에서 생성한 계정으로 로그인하세요.

---

## 📚 더 자세한 정보

- **설치 가이드**: `INSTALLATION.md`
- **사용자 가이드**: `USER_GUIDE.md`
- **프로젝트 구조**: `PROJECT_SUMMARY.md`

---

## 🆘 문제 해결

**"Supabase URL이 설정되지 않았습니다"**
→ `.env` 파일이 `frontend/` 디렉토리에 있는지 확인

**로그인 실패**
→ Supabase에서 사용자가 "Confirmed" 상태인지 확인

**빈 화면**
→ 브라우저 콘솔(F12)에서 에러 메시지 확인

---

## 🎉 즐거운 사용 되세요!
