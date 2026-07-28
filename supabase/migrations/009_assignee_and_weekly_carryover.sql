-- 009_assignee_and_weekly_carryover.sql
-- 설명: 담당자 DB 연동 보강, 미완료 항목 이관 플래그 및 주차 관련 칼럼 추가

-- 1. tasks 테이블에 담당자명(assignee_name), 이관 플래그(is_carried_over), 원본 작업 ID(original_task_id) 추가
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- 2. pending_items 테이블에 담당자명(assignee_name), 이관 플래그(is_carried_over) 추가
ALTER TABLE pending_items
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN DEFAULT false;

-- 3. 지난주 미완료 항목 조회 및 자동 이관을 위한 헬퍼 함수
CREATE OR REPLACE FUNCTION get_unclosed_tasks_from_prev_week(
  p_team_id UUID,
  p_current_week_start DATE
)
RETURNS TABLE (
  id UUID,
  task_type VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  progress_percentage INT,
  assigned_to UUID,
  assignee_name VARCHAR(100),
  status VARCHAR(50),
  priority VARCHAR(50)
) AS $$
DECLARE
  v_prev_week_start DATE;
BEGIN
  v_prev_week_start := p_current_week_start - INTERVAL '7 days';

  RETURN QUERY
  SELECT 
    t.id,
    t.task_type,
    t.title,
    t.description,
    t.progress_percentage,
    t.assigned_to,
    t.assignee_name,
    t.status,
    t.priority
  FROM tasks t
  JOIN weekly_updates wu ON t.weekly_update_id = wu.id
  WHERE wu.team_id = p_team_id
    AND wu.week_start_date = v_prev_week_start
    AND (t.status != 'completed' AND COALESCE(t.progress_percentage, 0) < 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
