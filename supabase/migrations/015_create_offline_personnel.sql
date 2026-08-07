-- 015_create_offline_personnel.sql
-- 설명: 시스템에 가입하지 않은 오프라인 인력을 저장하고 프로젝트에 투입(M-Plan)할 수 있도록 지원합니다.

-- 1. 오프라인 인력 테이블 생성
CREATE TABLE IF NOT EXISTS offline_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'member',
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 업데이트 트리거 등록
DROP TRIGGER IF EXISTS update_offline_personnel_updated_at ON offline_personnel;
CREATE TRIGGER update_offline_personnel_updated_at 
  BEFORE UPDATE ON offline_personnel 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS (보안 규칙)
ALTER TABLE offline_personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "모든 인증된 사용자는 오프라인 인력을 조회할 수 있습니다" ON offline_personnel;
CREATE POLICY "모든 인증된 사용자는 오프라인 인력을 조회할 수 있습니다" 
  ON offline_personnel FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "모든 인증된 사용자는 오프라인 인력을 생성할 수 있습니다" ON offline_personnel;
CREATE POLICY "모든 인증된 사용자는 오프라인 인력을 생성할 수 있습니다" 
  ON offline_personnel FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "오프라인 인력 수정 권한" ON offline_personnel;
CREATE POLICY "오프라인 인력 수정 권한" 
  ON offline_personnel FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "오프라인 인력 삭제 권한" ON offline_personnel;
CREATE POLICY "오프라인 인력 삭제 권한" 
  ON offline_personnel FOR DELETE TO authenticated USING (true);

-- 4. project_mobilizations (투입 인력) 테이블 구조 변경
-- 기존 user_id 필수를 해제하고, offline_personnel_id 열 추가
ALTER TABLE project_mobilizations ALTER COLUMN user_id DROP NOT NULL;

-- 만약 컬럼이 없다면 추가
ALTER TABLE project_mobilizations ADD COLUMN IF NOT EXISTS offline_personnel_id UUID REFERENCES offline_personnel(id) ON DELETE CASCADE;

-- 무결성 제약조건: user_id와 offline_personnel_id 둘 중 하나만 존재해야 함 (또는 최소 하나는 존재해야 함)
ALTER TABLE project_mobilizations DROP CONSTRAINT IF EXISTS chk_mobilization_user;
ALTER TABLE project_mobilizations ADD CONSTRAINT chk_mobilization_user 
  CHECK (
    (user_id IS NOT NULL AND offline_personnel_id IS NULL) OR 
    (user_id IS NULL AND offline_personnel_id IS NOT NULL)
  );
