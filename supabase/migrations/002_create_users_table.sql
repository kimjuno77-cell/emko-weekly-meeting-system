-- 002_create_users_table.sql
-- 설명: 사용자 프로필 테이블 및 트리거 생성 (재실행 완전 안전 버전)

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

DROP POLICY IF EXISTS "사용자는 자신의 프로필을 조회할 수 있습니다" ON user_profiles;
CREATE POLICY "사용자는 자신의 프로필을 조회할 수 있습니다" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "모든 사용자는 다른 사용자의 기본 정보를 조회할 수 있습니다" ON user_profiles;
CREATE POLICY "모든 사용자는 다른 사용자의 기본 정보를 조회할 수 있습니다" ON user_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "사용자는 자신의 프로필을 수정할 수 있습니다" ON user_profiles;
CREATE POLICY "사용자는 자신의 프로필을 수정할 수 있습니다" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

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
