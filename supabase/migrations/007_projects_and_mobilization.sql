-- 007_projects_and_mobilization.sql
-- 설명: 프로젝트, 스케줄(페이즈), 인력 투입 계획(Mobilization) 테이블 생성

-- 1. Projects 테이블
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, on_hold
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 기존 테이블 수정 (weekly_updates에 project_id 추가)
ALTER TABLE weekly_updates ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE weekly_updates ALTER COLUMN team_id DROP NOT NULL;

-- 기존 유니크 제약조건 삭제 및 새로운 인덱스로 대체 (team_id 또는 project_id별로 주간 단위 1개)
ALTER TABLE weekly_updates DROP CONSTRAINT IF EXISTS unique_team_week;
DROP INDEX IF EXISTS unique_team_week_idx;
DROP INDEX IF EXISTS unique_project_week_idx;

CREATE UNIQUE INDEX unique_team_week_idx ON weekly_updates (team_id, week_start_date) WHERE team_id IS NOT NULL;
CREATE UNIQUE INDEX unique_project_week_idx ON weekly_updates (project_id, week_start_date) WHERE project_id IS NOT NULL;

-- 3. Project Phases (프로젝트 단계별 일정: 설계, 구매, 제작, 검사, 설치, 시운전)
CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name VARCHAR(100) NOT NULL, 
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, delayed, ahead, completed
  required_personnel INT DEFAULT 0,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Project Mobilizations (인력 투입 계획)
CREATE TABLE IF NOT EXISTS project_mobilizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  role_description VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 업데이트 트리거 등록
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_phases_updated_at ON project_phases;
CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_mobilizations_updated_at ON project_mobilizations;
CREATE TRIGGER update_project_mobilizations_updated_at BEFORE UPDATE ON project_mobilizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 보안 규칙 (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_mobilizations ENABLE ROW LEVEL SECURITY;

-- 정책: 읽기는 모두 가능, 생성/수정/삭제는 관리자(admin)만 가능
DROP POLICY IF EXISTS "모든 사용자는 프로젝트를 조회할 수 있습니다" ON projects;
CREATE POLICY "모든 사용자는 프로젝트를 조회할 수 있습니다" ON projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "관리자는 프로젝트를 관리할 수 있습니다" ON projects;
CREATE POLICY "관리자는 프로젝트를 관리할 수 있습니다" ON projects FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "모든 사용자는 프로젝트 일정을 조회할 수 있습니다" ON project_phases;
CREATE POLICY "모든 사용자는 프로젝트 일정을 조회할 수 있습니다" ON project_phases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "관리자는 프로젝트 일정을 관리할 수 있습니다" ON project_phases;
CREATE POLICY "관리자는 프로젝트 일정을 관리할 수 있습니다" ON project_phases FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "모든 사용자는 투입 계획을 조회할 수 있습니다" ON project_mobilizations;
CREATE POLICY "모든 사용자는 투입 계획을 조회할 수 있습니다" ON project_mobilizations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "관리자는 투입 계획을 관리할 수 있습니다" ON project_mobilizations;
CREATE POLICY "관리자는 투입 계획을 관리할 수 있습니다" ON project_mobilizations FOR ALL TO authenticated USING (public.is_admin());
