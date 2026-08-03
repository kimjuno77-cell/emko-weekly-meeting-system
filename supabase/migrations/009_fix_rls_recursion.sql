-- 009_fix_rls_recursion.sql

-- 1. is_admin() 함수 생성 (SECURITY DEFINER로 설정하여 무한 루프(Recursion) 방지)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. teams 테이블 RLS 정책 수정 (is_admin() 함수 사용)
DROP POLICY IF EXISTS "관리자는 팀을 추가할 수 있습니다" ON teams;
CREATE POLICY "관리자는 팀을 추가할 수 있습니다"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "관리자는 팀을 수정할 수 있습니다" ON teams;
CREATE POLICY "관리자는 팀을 수정할 수 있습니다"
  ON teams FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "관리자는 팀을 삭제할 수 있습니다" ON teams;
CREATE POLICY "관리자는 팀을 삭제할 수 있습니다"
  ON teams FOR DELETE TO authenticated
  USING (public.is_admin());

-- 3. user_profiles 테이블 RLS 정책 수정 (무한 루프 방지)
DROP POLICY IF EXISTS "관리자는 모든 사용자 프로필을 조회할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 모든 사용자 프로필을 조회할 수 있습니다"
  ON user_profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "관리자는 사용자 프로필을 수정할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 사용자 프로필을 수정할 수 있습니다"
  ON user_profiles FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "관리자는 사용자 프로필을 삭제할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 사용자 프로필을 삭제할 수 있습니다"
  ON user_profiles FOR DELETE TO authenticated
  USING (public.is_admin());
