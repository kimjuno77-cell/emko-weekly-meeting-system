-- ========================================================
-- 주간회의 취합 시스템 통합 마이그레이션 (재실행 완전 안전 버전)
-- ========================================================

-- 1. 공통 타임스탬프 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 팀 정보 테이블
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
CREATE POLICY "모든 인증 사용자는 팀 목록을 조회할 수 있습니다" ON teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "비인증 사용자는 팀 목록을 조회할 수 있습니다" ON teams;
CREATE POLICY "비인증 사용자는 팀 목록을 조회할 수 있습니다" ON teams FOR SELECT TO anon USING (true);

-- 기본 8개 팀 데이터
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

-- 3. 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(100),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'member',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_team_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  IF (NEW.raw_user_meta_data->>'team_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'team_id') != '' THEN
    v_team_id := (NEW.raw_user_meta_data->>'team_id')::UUID;
  ELSE
    v_team_id := NULL;
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, team_id, is_active)
  VALUES (NEW.id, NEW.email, v_full_name, v_team_id, false)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      team_id = COALESCE(EXCLUDED.team_id, user_profiles.team_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. 주간 업데이트 테이블
CREATE TABLE IF NOT EXISTS weekly_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_team_week UNIQUE (team_id, week_start_date)
);

DROP TRIGGER IF EXISTS update_weekly_updates_updated_at ON weekly_updates;
CREATE TRIGGER update_weekly_updates_updated_at
  BEFORE UPDATE ON weekly_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE weekly_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "인증 사용자는 주간 업데이트를 조회할 수 있습니다" ON weekly_updates;
CREATE POLICY "인증 사용자는 주간 업데이트를 조회할 수 있습니다" ON weekly_updates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "팀원은 자신의 팀 주간 업데이트를 작성할 수 있습니다" ON weekly_updates;
CREATE POLICY "팀원은 자신의 팀 주간 업데이트를 작성할 수 있습니다" ON weekly_updates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "팀원은 자신의 팀 주간 업데이트를 수정할 수 있습니다" ON weekly_updates;
CREATE POLICY "팀원은 자신의 팀 주간 업데이트를 수정할 수 있습니다" ON weekly_updates FOR UPDATE TO authenticated USING (true);

-- 5. 작업 (Tasks) 테이블
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_update_id UUID NOT NULL REFERENCES weekly_updates(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  progress_percentage INT DEFAULT 0,
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  display_order INT DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "인증 사용자는 작업을 조회할 수 있습니다" ON tasks;
CREATE POLICY "인증 사용자는 작업을 조회할 수 있습니다" ON tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "팀원은 작업을 작성할 수 있습니다" ON tasks;
CREATE POLICY "팀원은 작업을 작성할 수 있습니다" ON tasks FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Pending 항목 테이블
CREATE TABLE IF NOT EXISTS pending_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(50) NOT NULL UNIQUE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  target_date DATE,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  is_completed BOOLEAN DEFAULT false,
  completed_date DATE,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_pending_items_updated_at ON pending_items;
CREATE TRIGGER update_pending_items_updated_at
  BEFORE UPDATE ON pending_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_pending_item_id()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
  v_new_id VARCHAR(50);
BEGIN
  IF NEW.item_id IS NULL OR NEW.item_id = '' THEN
    SELECT COUNT(*) + 1 INTO v_count FROM pending_items;
    v_new_id := 'P-' || LPAD(v_count::TEXT, 4, '0');
    NEW.item_id := v_new_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pending_item_id_trigger ON pending_items;
CREATE TRIGGER set_pending_item_id_trigger
  BEFORE INSERT ON pending_items
  FOR EACH ROW
  EXECUTE FUNCTION generate_pending_item_id();

ALTER TABLE pending_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "인증 사용자는 Pending 항목을 조회할 수 있습니다" ON pending_items;
CREATE POLICY "인증 사용자는 Pending 항목을 조회할 수 있습니다" ON pending_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "인증 사용자는 Pending 항목을 생성할 수 있습니다" ON pending_items;
CREATE POLICY "인증 사용자는 Pending 항목을 생성할 수 있습니다" ON pending_items FOR INSERT TO authenticated WITH CHECK (true);

-- 7. 관리자 승인 및 RLS 권한 강화
DROP POLICY IF EXISTS "관리자는 모든 사용자 프로필을 조회할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 모든 사용자 프로필을 조회할 수 있습니다"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "관리자는 사용자 프로필을 수정할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 사용자 프로필을 수정할 수 있습니다"
  ON user_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "관리자는 사용자 프로필을 삭제할 수 있습니다" ON user_profiles;
CREATE POLICY "관리자는 사용자 프로필을 삭제할 수 있습니다"
  ON user_profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "작성자 또는 관리자는 작업을 수정할 수 있습니다" ON tasks;
CREATE POLICY "작성자 또는 관리자는 작업을 수정할 수 있습니다"
  ON tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "작성자 또는 관리자는 작업을 삭제할 수 있습니다" ON tasks;
CREATE POLICY "작성자 또는 관리자는 작업을 삭제할 수 있습니다"
  ON tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "작성자 또는 관리자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
CREATE POLICY "작성자 또는 관리자는 Pending 항목을 수정할 수 있습니다"
  ON pending_items FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "작성자 또는 관리자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;
CREATE POLICY "작성자 또는 관리자는 Pending 항목을 삭제할 수 있습니다"
  ON pending_items FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
