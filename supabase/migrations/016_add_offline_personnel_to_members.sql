-- 016_add_offline_personnel_to_members.sql
-- 설명: 미가입 인력도 팀과 프로젝트에 다중 소속 배정될 수 있도록 team_members와 project_members를 확장합니다.

-- 1. team_members 테이블 수정
ALTER TABLE team_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS offline_personnel_id UUID REFERENCES offline_personnel(id) ON DELETE CASCADE;

-- 무결성 조건: user_id와 offline_personnel_id 중 오직 하나만 존재해야 함
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS chk_team_member_identity;
ALTER TABLE team_members ADD CONSTRAINT chk_team_member_identity CHECK (
  (user_id IS NOT NULL AND offline_personnel_id IS NULL) OR 
  (user_id IS NULL AND offline_personnel_id IS NOT NULL)
);

-- 미가입 인력이 동일 팀에 중복 배정되는 것을 방지하는 제약조건
DROP INDEX IF EXISTS team_members_offline_unique;
CREATE UNIQUE INDEX team_members_offline_unique ON team_members (team_id, offline_personnel_id) WHERE offline_personnel_id IS NOT NULL;


-- 2. project_members 테이블 수정
ALTER TABLE project_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS offline_personnel_id UUID REFERENCES offline_personnel(id) ON DELETE CASCADE;

-- 무결성 조건
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS chk_project_member_identity;
ALTER TABLE project_members ADD CONSTRAINT chk_project_member_identity CHECK (
  (user_id IS NOT NULL AND offline_personnel_id IS NULL) OR 
  (user_id IS NULL AND offline_personnel_id IS NOT NULL)
);

-- 미가입 인력이 동일 프로젝트에 중복 배정되는 것을 방지하는 제약조건
DROP INDEX IF EXISTS project_members_offline_unique;
CREATE UNIQUE INDEX project_members_offline_unique ON project_members (project_id, offline_personnel_id) WHERE offline_personnel_id IS NOT NULL;
