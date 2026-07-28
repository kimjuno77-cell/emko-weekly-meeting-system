-- 008_admin_approval_and_rls_policies.sql
-- 설명: 관리자 회원 승인/관리 RLS, 팀(부서) CRUD RLS 및 작성자별 수정/삭제 권한 RLS 강화

-- 1. teams 테이블 관리자 전용 INSERT, UPDATE, DELETE RLS 정책
DROP POLICY IF EXISTS "관리자는 팀을 추가할 수 있습니다" ON teams;
CREATE POLICY "관리자는 팀을 추가할 수 있습니다"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "관리자는 팀을 수정할 수 있습니다" ON teams;
CREATE POLICY "관리자는 팀을 수정할 수 있습니다"
  ON teams FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "관리자는 팀을 삭제할 수 있습니다" ON teams;
CREATE POLICY "관리자는 팀을 삭제할 수 있습니다"
  ON teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. user_profiles 테이블 RLS 강화
DROP POLICY IF EXISTS "관리자는 모든 사용자 프로필을 조회할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 모든 사용자 프로필을 조회할 수 있습니다"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "관리자는 사용자 프로필을 수정할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 사용자 프로필을 수정할 수 있습니다"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "관리자는 사용자 프로필을 삭제할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 사용자 프로필을 삭제할 수 있습니다"
  ON user_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. tasks 테이블 RLS 정책 (관리자는 전체 수정/삭제, 일반유저는 작성자/담당자만 수정/삭제)
DROP POLICY IF EXISTS "작성자 또는 관리자는 작업을 수정할 수 있습니다" ON tasks;
CREATE POLICY "작성자 또는 관리자는 작업을 수정할 수 있습니다"
  ON tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "작성자 또는 관리자는 작업을 삭제할 수 있습니다" ON tasks;
CREATE POLICY "작성자 또는 관리자는 작업을 삭제할 수 있습니다"
  ON tasks FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. pending_items 테이블 RLS 정책 (관리자는 전체 수정/삭제, 일반유저는 작성자/담당자만 수정/삭제)
DROP POLICY IF EXISTS "작성자 또는 관리자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
CREATE POLICY "작성자 또는 관리자는 Pending 항목을 수정할 수 있습니다"
  ON pending_items FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "작성자 또는 관리자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;
CREATE POLICY "작성자 또는 관리자는 Pending 항목을 삭제할 수 있습니다"
  ON pending_items FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
