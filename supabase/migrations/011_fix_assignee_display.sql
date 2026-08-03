-- 010_fix_assignee_display.sql
-- 설명: 수동 입력한 담당자 이름이 저장되지 않는 문제(DB 컬럼 누락) 및 일반 사용자가 동료 목록을 볼 수 없게 된 RLS 문제 해결

-- 1. tasks 테이블에 담당자명 관련 컬럼 추가
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- 2. pending_items 테이블에 담당자명 관련 컬럼 추가
ALTER TABLE pending_items
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN DEFAULT false;

-- 3. user_profiles 테이블 조회 권한 수정 (일반 사용자도 동료를 담당자로 지정할 수 있도록 조회 허용)
DROP POLICY IF EXISTS "관리자는 모든 사용자 프로필을 조회할 수 있습니다" ON user_profiles;
CREATE POLICY "모든 사용자는 사용자 프로필을 조회할 수 있습니다"
  ON user_profiles FOR SELECT TO authenticated
  USING (true);
