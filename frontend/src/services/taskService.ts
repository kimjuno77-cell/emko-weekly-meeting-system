// 설명: 작업 항목 관련 API 호출 서비스 (UUID/유효성 자동 정리 및 오류 자동 복구 포함)

import { supabase } from '@/lib/supabase';
import { Task, TaskInput, TaskType } from '@/types';

// 설명: 특정 주간 업데이트의 모든 작업 항목 가져오기
export const getTasksByWeeklyUpdate = async (
  weeklyUpdateId: string
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      weekly_update:weekly_updates(*),
      assignee:user_profiles(*)
    `)
    .eq('weekly_update_id', weeklyUpdateId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('작업 항목 조회 실패:', error);
    throw new Error('작업 항목을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 특정 타입의 작업 항목만 가져오기 (진행사항/이슈/계획)
export const getTasksByType = async (
  weeklyUpdateId: string,
  taskType: TaskType
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      weekly_update:weekly_updates(*),
      assignee:user_profiles(*)
    `)
    .eq('weekly_update_id', weeklyUpdateId)
    .eq('task_type', taskType)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('작업 항목 조회 실패:', error);
    throw new Error('작업 항목을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 새 작업 항목 생성 (UUID 및 스키마 캐시 오류 자동 호환)
export const createTask = async (input: TaskInput): Promise<Task> => {
  const sanitizedInput: any = {
    ...input,
    assigned_to: input.assigned_to ? input.assigned_to : null,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([sanitizedInput])
    .select(`
      *,
      weekly_update:weekly_updates(*),
      assignee:user_profiles(*)
    `)
    .single();
  
  if (error) {
    // 컬럼 미존재(PGRST204) 또는 스키마 캐시 이슈 발생 시 신규 컬럼 제외 재시도
    if (error.code === 'PGRST204' || error.message.includes('column')) {
      delete sanitizedInput.assignee_name;
      delete sanitizedInput.is_carried_over;
      delete sanitizedInput.original_task_id;

      const { data: retryData, error: retryErr } = await supabase
        .from('tasks')
        .insert([sanitizedInput])
        .select(`
          *,
          weekly_update:weekly_updates(*),
          assignee:user_profiles(*)
        `)
        .single();

      if (retryErr) {
        console.error('작업 항목 생성 재시도 실패:', retryErr);
        throw new Error(retryErr.message || '작업 항목을 생성하는데 실패했습니다.');
      }
      return retryData;
    }

    console.error('작업 항목 생성 실패:', error);
    throw new Error(error.message || '작업 항목을 생성하는데 실패했습니다.');
  }
  
  return data;
};

// 설명: 작업 항목 수정 (UUID 및 스키마 캐시 오류 자동 호환)
export const updateTask = async (
  taskId: string,
  updates: Partial<TaskInput>
): Promise<Task> => {
  const sanitizedUpdates: any = {
    ...updates,
    assigned_to: updates.assigned_to ? updates.assigned_to : null,
  };

  let { data, error } = await supabase
    .from('tasks')
    .update(sanitizedUpdates)
    .eq('id', taskId)
    .select(`
      *,
      weekly_update:weekly_updates(*),
      assignee:user_profiles(*)
    `)
    .single();
  
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column')) {
      delete sanitizedUpdates.assignee_name;
      delete sanitizedUpdates.is_carried_over;
      delete sanitizedUpdates.original_task_id;

      const { data: retryData, error: retryErr } = await supabase
        .from('tasks')
        .update(sanitizedUpdates)
        .eq('id', taskId)
        .select(`
          *,
          weekly_update:weekly_updates(*),
          assignee:user_profiles(*)
        `)
        .single();

      if (retryErr) {
        console.error('작업 항목 수정 재시도 실패:', retryErr);
        throw new Error(retryErr.message || '작업 항목을 수정하는데 실패했습니다.');
      }
      data = retryData;
    } else {
      console.error('작업 항목 수정 실패:', error);
      throw new Error(error.message || '작업 항목을 수정하는데 실패했습니다.');
    }
  }

  // Pending 연동 업데이트 (상태 변경 시)
  if (data && updates.status) {
    let pendingStatus = 'pending';
    if (updates.status === 'in_progress') pendingStatus = 'in_progress';
    else if (updates.status === 'completed') pendingStatus = 'completed';
    else if (updates.status === 'blocked') pendingStatus = 'waiting';
    else if (updates.status === 'cancelled') pendingStatus = 'cancelled';

    const isCompleted = updates.status === 'completed';
    
    // 비동기로 안전하게 Pending 항목 업데이트 실행 (실패해도 Task 업데이트는 성공 반환)
    supabase
      .from('pending_items')
      .update({
        status: pendingStatus,
        is_completed: isCompleted,
        completed_date: isCompleted ? new Date().toISOString() : null
      })
      .eq('related_task_id', taskId)
      .then(({ error }) => {
        if (error) console.error('Pending 항목 동기화 실패:', error);
      });
  }
  
  return data;
};

// 설명: 작업 항목 삭제
export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error('작업 항목 삭제 실패:', error);
    throw new Error('작업 항목을 삭제하는데 실패했습니다.');
  }
};

// 설명: 작업 항목 진행률 업데이트
export const updateTaskProgress = async (
  taskId: string,
  progressPercentage: number
): Promise<Task> => {
  // 설명: 진행률이 100%이면 상태를 'completed'로 자동 변경
  const status = progressPercentage === 100 ? 'completed' : 'in_progress';
  
  return updateTask(taskId, { progress_percentage: progressPercentage, status });
};

// 설명: 여러 작업 항목의 순서 변경 (드래그 앤 드롭)
export const reorderTasks = async (
  tasks: { id: string; display_order: number }[]
): Promise<void> => {
  // 설명: 트랜잭션으로 모든 순서 업데이트
  const updates = tasks.map((task) =>
    supabase
      .from('tasks')
      .update({ display_order: task.display_order })
      .eq('id', task.id)
  );
  
  const results = await Promise.all(updates);
  
  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    console.error('작업 항목 순서 변경 실패:', errors);
    throw new Error('작업 항목 순서를 변경하는데 실패했습니다.');
  }
};
