-- 021_allow_all_members_project_management.sql
-- 설명: 프로젝트 관리(프로젝트, 페이즈, 인력 투입)의 수정 및 삭제 권한을 모든 승인 회원(authenticated)에게 허용

-- 1. projects 테이블 권한 개방 (모든 인증된 사용자)
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트를 수정할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트를 삭제할 수 있습니다" ON projects;
DROP POLICY IF EXISTS "관리자는 프로젝트를 관리할 수 있습니다" ON projects;

CREATE POLICY "모든 인증된 사용자는 프로젝트를 수정할 수 있습니다"
  ON projects FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "모든 인증된 사용자는 프로젝트를 삭제할 수 있습니다"
  ON projects FOR DELETE TO authenticated
  USING (true);


-- 2. project_phases 테이블 권한 개방
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트 일정을 수정할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "작성자 및 관리자는 프로젝트 일정을 삭제할 수 있습니다" ON project_phases;
DROP POLICY IF EXISTS "관리자는 프로젝트 일정을 관리할 수 있습니다" ON project_phases;

CREATE POLICY "모든 인증된 사용자는 프로젝트 일정을 수정할 수 있습니다"
  ON project_phases FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "모든 인증된 사용자는 프로젝트 일정을 삭제할 수 있습니다"
  ON project_phases FOR DELETE TO authenticated
  USING (true);


-- 3. project_mobilizations 테이블 권한 개방 (인력 투입도 프로젝트 관리의 일부)
DROP POLICY IF EXISTS "작성자 및 관리자는 투입 계획을 수정할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "작성자 및 관리자는 투입 계획을 삭제할 수 있습니다" ON project_mobilizations;
DROP POLICY IF EXISTS "관리자는 투입 계획을 관리할 수 있습니다" ON project_mobilizations;

CREATE POLICY "모든 인증된 사용자는 투입 계획을 수정할 수 있습니다"
  ON project_mobilizations FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "모든 인증된 사용자는 투입 계획을 삭제할 수 있습니다"
  ON project_mobilizations FOR DELETE TO authenticated
  USING (true);
