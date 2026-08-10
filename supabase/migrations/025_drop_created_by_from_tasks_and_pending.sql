-- 025_drop_created_by_from_tasks_and_pending.sql
-- 설명: tasks 및 pending_items에서 created_by 컬럼을 삭제하여 Supabase의 관계 모호성 에러(Could not embed...)를 원천 차단합니다.

-- 1. 트리거 삭제 (존재하지 않는 컬럼을 참조하지 않도록)
DROP TRIGGER IF EXISTS trg_set_tasks_created_by ON tasks;
DROP FUNCTION IF EXISTS set_tasks_created_by();

-- 2. 기존 created_by를 참조하는 정책(Policy) 삭제
-- (023 마이그레이션에서 생성되었던 정책들)
DROP POLICY IF EXISTS "작성자, 담당자 및 관리자는 작업(Task)을 수정할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "작성자, 담당자 및 관리자는 작업(Task)을 삭제할 수 있습니다" ON tasks;
DROP POLICY IF EXISTS "작성자, 담당자 및 관리자는 Pending 항목을 수정할 수 있습니다" ON pending_items;
DROP POLICY IF EXISTS "작성자, 담당자 및 관리자는 Pending 항목을 삭제할 수 있습니다" ON pending_items;

-- 3. 컬럼 삭제
ALTER TABLE tasks DROP COLUMN IF EXISTS created_by;
ALTER TABLE pending_items DROP COLUMN IF EXISTS created_by;
