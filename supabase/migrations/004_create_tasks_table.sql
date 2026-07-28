-- 004_create_tasks_table.sql
-- 설명: 주간 업데이트의 세부 항목(진행사항, 이슈, 계획)을 저장하는 테이블

-- 작업 항목 타입 ENUM 생성
CREATE TYPE task_type AS ENUM ('progress', 'issue', 'plan');

-- 작업 항목 상태 ENUM 생성
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'cancelled');

-- 우선순위 ENUM 생성
CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');

-- 작업 항목 테이블 생성
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_update_id UUID NOT NULL REFERENCES weekly_updates(id) ON DELETE CASCADE,
  task_type task_type NOT NULL, -- 'progress'(진행사항), 'issue'(이슈), 'plan'(계획)
  title VARCHAR(200) NOT NULL,
  description TEXT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  assigned_to UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status task_status DEFAULT 'pending',
  priority priority_level DEFAULT 'medium',
  due_date DATE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 설명: tasks 업데이트 시 updated_at 자동 갱신 트리거
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 설명: tasks 테이블에 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_weekly_update_id ON tasks(weekly_update_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- 설명: Row Level Security (RLS) 활성화
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 설명: 모든 인증된 사용자는 작업 항목을 조회할 수 있습니다
CREATE POLICY "모든 사용자는 작업 항목을 조회할 수 있습니다"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- 설명: 같은 팀 소속 사용자만 해당 팀의 작업 항목을 생성할 수 있습니다
CREATE POLICY "같은 팀 사용자는 작업 항목을 생성할 수 있습니다"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    weekly_update_id IN (
      SELECT wu.id FROM weekly_updates wu
      INNER JOIN user_profiles up ON wu.team_id = up.team_id
      WHERE up.id = auth.uid()
    )
  );

-- 설명: 같은 팀 소속 사용자만 해당 팀의 작업 항목을 수정할 수 있습니다
CREATE POLICY "같은 팀 사용자는 작업 항목을 수정할 수 있습니다"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    weekly_update_id IN (
      SELECT wu.id FROM weekly_updates wu
      INNER JOIN user_profiles up ON wu.team_id = up.team_id
      WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    weekly_update_id IN (
      SELECT wu.id FROM weekly_updates wu
      INNER JOIN user_profiles up ON wu.team_id = up.team_id
      WHERE up.id = auth.uid()
    )
  );

-- 설명: 같은 팀 소속 사용자만 해당 팀의 작업 항목을 삭제할 수 있습니다
CREATE POLICY "같은 팀 사용자는 작업 항목을 삭제할 수 있습니다"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    weekly_update_id IN (
      SELECT wu.id FROM weekly_updates wu
      INNER JOIN user_profiles up ON wu.team_id = up.team_id
      WHERE up.id = auth.uid()
    )
  );
