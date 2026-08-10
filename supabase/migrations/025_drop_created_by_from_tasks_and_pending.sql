-- 025_drop_created_by_from_tasks_and_pending.sql
-- 설명: tasks 및 pending_items에서 created_by 컬럼을 삭제하여 Supabase의 관계 모호성 에러(Could not embed...)를 원천 차단합니다.

ALTER TABLE tasks DROP COLUMN IF EXISTS created_by;
ALTER TABLE pending_items DROP COLUMN IF EXISTS created_by;
