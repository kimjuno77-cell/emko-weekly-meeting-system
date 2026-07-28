-- 005_create_pending_items_table.sql
-- 설명: Pending 항목을 추적 관리하는 테이블 (담당자, 기한 포함)

-- Pending 항목 상태 ENUM 생성
CREATE TYPE pending_status AS ENUM ('pending', 'in_progress', 'waiting', 'completed', 'cancelled');

-- Pending 항목 테이블 생성
CREATE TABLE IF NOT EXISTS pending_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(50) UNIQUE, -- 예: P001, P002 (사용자 친화적 ID)
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  registered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE, -- 목표 완료일
  completed_date DATE, -- 실제 완료일
  status pending_status DEFAULT 'pending',
  priority priority_level DEFAULT 'medium',
  is_completed BOOLEAN DEFAULT false,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- 관련 작업 항목 연결
  notes TEXT, -- 추가 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 설명: pending_items 업데이트 시 updated_at 자동 갱신 트리거
CREATE TRIGGER update_pending_items_updated_at
  BEFORE UPDATE ON pending_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 설명: is_completed가 true로 변경되면 completed_date를 자동으로 설정하는 트리거
CREATE OR REPLACE FUNCTION set_completed_date()
RETURNS TRIGGER AS $$
BEGIN
  -- 설명: 완료 상태로 변경 시 완료일 자동 기록
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    NEW.completed_date = CURRENT_DATE;
    NEW.status = 'completed';
  END IF;
  
  -- 설명: 완료 상태 해제 시 완료일 제거
  IF NEW.is_completed = false AND OLD.is_completed = true THEN
    NEW.completed_date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_completed_date
  BEFORE UPDATE ON pending_items
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_date();

-- 설명: Pending 항목 ID 자동 생성 함수 (P001, P002, ...)
CREATE OR REPLACE FUNCTION generate_pending_item_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
  new_item_id VARCHAR(50);
BEGIN
  -- 설명: 가장 큰 숫자 ID를 찾아서 +1
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_id FROM 2) AS INTEGER)), 0) + 1
  INTO next_id
  FROM pending_items
  WHERE item_id ~ '^P[0-9]+$';
  
  -- 설명: P + 3자리 숫자 형식으로 생성 (예: P001, P002, ...)
  new_item_id := 'P' || LPAD(next_id::TEXT, 3, '0');
  
  NEW.item_id := new_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_pending_item_id
  BEFORE INSERT ON pending_items
  FOR EACH ROW
  WHEN (NEW.item_id IS NULL)
  EXECUTE FUNCTION generate_pending_item_id();

-- 설명: pending_items 테이블에 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pending_items_team_id ON pending_items(team_id);
CREATE INDEX IF NOT EXISTS idx_pending_items_assigned_to ON pending_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pending_items_status ON pending_items(status);
CREATE INDEX IF NOT EXISTS idx_pending_items_priority ON pending_items(priority);
CREATE INDEX IF NOT EXISTS idx_pending_items_is_completed ON pending_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_pending_items_target_date ON pending_items(target_date);
CREATE INDEX IF NOT EXISTS idx_pending_items_item_id ON pending_items(item_id);

-- 설명: Row Level Security (RLS) 활성화
ALTER TABLE pending_items ENABLE ROW LEVEL SECURITY;

-- 설명: 모든 인증된 사용자는 Pending 항목을 조회할 수 있습니다
CREATE POLICY "모든 사용자는 Pending 항목을 조회할 수 있습니다"
  ON pending_items
  FOR SELECT
  TO authenticated
  USING (true);

-- 설명: 인증된 사용자는 Pending 항목을 생성할 수 있습니다
CREATE POLICY "인증된 사용자는 Pending 항목을 생성할 수 있습니다"
  ON pending_items
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 설명: 같은 팀 소속 사용자 또는 담당자는 Pending 항목을 수정할 수 있습니다
CREATE POLICY "같은 팀 또는 담당자는 Pending 항목을 수정할 수 있습니다"
  ON pending_items
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM user_profiles WHERE id = auth.uid()
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- 설명: 생성자 또는 관리자만 Pending 항목을 삭제할 수 있습니다
CREATE POLICY "생성자는 Pending 항목을 삭제할 수 있습니다"
  ON pending_items
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
