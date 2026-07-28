-- 003_create_weekly_updates_table.sql
-- 설명: 주간 업데이트 메타 정보를 저장하는 테이블 (주차별)

-- 주간 업데이트 테이블 생성
CREATE TABLE IF NOT EXISTS weekly_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- 주의 시작일 (월요일)
  week_end_date DATE NOT NULL,   -- 주의 종료일 (일요일)
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed'
  notes TEXT, -- 특이사항 및 건의사항
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 설명: 동일 팀의 동일 주차에 대한 중복 업데이트 방지
  CONSTRAINT unique_team_week UNIQUE (team_id, week_start_date)
);

-- 설명: weekly_updates 업데이트 시 updated_at 자동 갱신 트리거
CREATE TRIGGER update_weekly_updates_updated_at
  BEFORE UPDATE ON weekly_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 설명: weekly_updates 테이블에 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_weekly_updates_team_id ON weekly_updates(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_updates_week_start ON weekly_updates(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_updates_status ON weekly_updates(status);
CREATE INDEX IF NOT EXISTS idx_weekly_updates_created_by ON weekly_updates(created_by);

-- 설명: Row Level Security (RLS) 활성화
ALTER TABLE weekly_updates ENABLE ROW LEVEL SECURITY;

-- 설명: 모든 인증된 사용자는 주간 업데이트를 조회할 수 있습니다
CREATE POLICY "모든 사용자는 주간 업데이트를 조회할 수 있습니다"
  ON weekly_updates
  FOR SELECT
  TO authenticated
  USING (true);

-- 설명: 같은 팀 소속 사용자만 해당 팀의 주간 업데이트를 생성할 수 있습니다
CREATE POLICY "같은 팀 사용자는 주간 업데이트를 생성할 수 있습니다"
  ON weekly_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 설명: 같은 팀 소속 사용자만 해당 팀의 주간 업데이트를 수정할 수 있습니다
CREATE POLICY "같은 팀 사용자는 주간 업데이트를 수정할 수 있습니다"
  ON weekly_updates
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- 설명: 관리자만 주간 업데이트를 삭제할 수 있습니다 (추후 구현)
-- CREATE POLICY "관리자만 주간 업데이트를 삭제할 수 있습니다"
--   ON weekly_updates
--   FOR DELETE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_profiles 
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );
