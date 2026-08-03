-- 012_create_team_project_members.sql
-- 설명: 다중 소속 인원 관리를 위한 team_members 및 project_members 테이블 생성

-- 1. 팀 다중 소속 테이블 (겸직/파견)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member, leader, viewer
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id) -- 동일 팀에 중복 등록 방지
);

-- 2. 프로젝트 다중 소속 테이블 (프로젝트 참여)
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- member, leader, viewer
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id) -- 동일 프로젝트에 중복 등록 방지
);

-- 업데이트 트리거 등록
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_members_updated_at ON project_members;
CREATE TRIGGER update_project_members_updated_at BEFORE UPDATE ON project_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 보안 규칙 (RLS)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 정책: 읽기는 모두 가능, 생성/수정/삭제는 관리자(admin)만 가능
DROP POLICY IF EXISTS "모든 사용자는 팀 멤버를 조회할 수 있습니다" ON team_members;
CREATE POLICY "모든 사용자는 팀 멤버를 조회할 수 있습니다" ON team_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "관리자는 팀 멤버를 관리할 수 있습니다" ON team_members;
CREATE POLICY "관리자는 팀 멤버를 관리할 수 있습니다" ON team_members FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "모든 사용자는 프로젝트 멤버를 조회할 수 있습니다" ON project_members;
CREATE POLICY "모든 사용자는 프로젝트 멤버를 조회할 수 있습니다" ON project_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "관리자는 프로젝트 멤버를 관리할 수 있습니다" ON project_members;
CREATE POLICY "관리자는 프로젝트 멤버를 관리할 수 있습니다" ON project_members FOR ALL TO authenticated USING (public.is_admin());

-- 사용자 삭제시 또는 팀/프로젝트 삭제시 CASCADE로 인해 자동 삭제됨
