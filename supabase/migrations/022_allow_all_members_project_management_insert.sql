-- 022_allow_all_members_project_management_insert.sql
-- 설명: 프로젝트, 페이즈, 인력 투입 테이블에 대해 모든 인증된 팀원에게 INSERT 권한 추가 부여

-- 1. projects 테이블 INSERT 권한 개방
DROP POLICY IF EXISTS "모든 인증된 사용자는 프로젝트를 생성할 수 있습니다" ON projects;

CREATE POLICY "모든 인증된 사용자는 프로젝트를 생성할 수 있습니다"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. project_phases 테이블 INSERT 권한 개방
DROP POLICY IF EXISTS "모든 인증된 사용자는 프로젝트 일정을 생성할 수 있습니다" ON project_phases;

CREATE POLICY "모든 인증된 사용자는 프로젝트 일정을 생성할 수 있습니다"
  ON project_phases FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. project_mobilizations 테이블 INSERT 권한 개방
DROP POLICY IF EXISTS "모든 인증된 사용자는 투입 계획을 생성할 수 있습니다" ON project_mobilizations;

CREATE POLICY "모든 인증된 사용자는 투입 계획을 생성할 수 있습니다"
  ON project_mobilizations FOR INSERT TO authenticated
  WITH CHECK (true);