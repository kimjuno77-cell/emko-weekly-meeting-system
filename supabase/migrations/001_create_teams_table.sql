-- 001_create_teams_table.sql
-- 설명: 8개 팀 정보 및 RLS 테이블 생성 (재실행 완전 안전 버전)

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "모든 인증 사용자는 팀 목록을 조회할 수 있습니다" ON teams;
CREATE POLICY "모든 인증 사용자는 팀 목록을 조회할 수 있습니다"
  ON teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "비인증 사용자는 팀 목록을 조회할 수 있습니다" ON teams;
CREATE POLICY "비인증 사용자는 팀 목록을 조회할 수 있습니다"
  ON teams FOR SELECT TO anon USING (true);

INSERT INTO teams (name, description, display_order) VALUES
  ('Team 1', '팀 1', 1),
  ('Team 2', '팀 2', 2),
  ('Team 3', '팀 3', 3),
  ('Team 4', '팀 4', 4),
  ('Team 5', '팀 5', 5),
  ('Team 6', '팀 6', 6),
  ('Team 7', '팀 7', 7),
  ('Team 8', '팀 8', 8)
ON CONFLICT (name) DO NOTHING;
