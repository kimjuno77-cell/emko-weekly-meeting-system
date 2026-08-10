// 설명: Pending 항목 관련 API 호출 서비스 (UUID/날짜 유효성 자동 정리 및 오류 자동 복구 포함)

import { supabase } from '@/lib/supabase';
import { PendingItem, PendingItemInput } from '@/types';

// 설명: 모든 Pending 항목 가져오기 (완료되지 않은 항목만)
export const getAllPendingItems = async (): Promise<PendingItem[]> => {
  const { data, error } = await supabase
    .from('pending_items')
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .eq('is_completed', false)
    .order('priority', { ascending: true }) // high가 먼저
    .order('target_date', { ascending: true }); // 목표일이 빠른 것 먼저
  
  if (error) {
    console.error('Pending 항목 조회 실패:', error);
    throw new Error('Pending 항목을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 특정 팀의 Pending 항목 가져오기
export const getPendingItemsByTeam = async (
  teamId: string,
  includeCompleted: boolean = false
): Promise<PendingItem[]> => {
  let query = supabase
    .from('pending_items')
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .eq('team_id', teamId);
  
  // 설명: 완료된 항목 포함 여부
  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }
  
  const { data, error } = await query
    .order('priority', { ascending: true })
    .order('target_date', { ascending: true });
  
  if (error) {
    console.error('팀별 Pending 항목 조회 실패:', error);
    throw new Error('Pending 항목을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 우선순위 높은 Pending 항목 가져오기
export const getHighPriorityPendingItems = async (): Promise<PendingItem[]> => {
  const { data, error } = await supabase
    .from('pending_items')
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .eq('is_completed', false)
    .eq('priority', 'high')
    .order('target_date', { ascending: true });
  
  if (error) {
    console.error('우선순위 높은 Pending 항목 조회 실패:', error);
    throw new Error('Pending 항목을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 기한이 임박한 Pending 항목 가져오기 (3일 이내)
export const getUpcomingPendingItems = async (): Promise<PendingItem[]> => {
  const today = new Date();
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);
  
  const { data, error } = await supabase
    .from('pending_items')
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .eq('is_completed', false)
    .lte('target_date', threeDaysLater.toISOString().split('T')[0])
    .order('target_date', { ascending: true });
  
  if (error) {
    console.error('임박한 Pending 항목 조회 실패:', error);
    throw new Error('Pending 항목을 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 새 Pending 항목 생성 (UUID 및 날짜 필드 자동 정리)
export const createPendingItem = async (
  input: PendingItemInput
): Promise<PendingItem> => {
  const sanitizedInput: any = {
    ...input,
    assigned_to: input.assigned_to ? input.assigned_to : null,
    target_date: input.target_date ? input.target_date : null,
  };

  const { data, error } = await supabase
    .from('pending_items')
    .insert([sanitizedInput])
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .single();
  
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column')) {
      delete sanitizedInput.assignee_name;
      delete sanitizedInput.is_carried_over;
      delete sanitizedInput.original_task_id;

      const { data: retryData, error: retryErr } = await supabase
        .from('pending_items')
        .insert([sanitizedInput])
        .select(`
          *,
          team:teams(*),
          assignee:user_profiles!assigned_to(*),
          related_task:tasks(*)
        `)
        .single();

      if (retryErr) {
        console.error('Pending 항목 생성 재시도 실패:', retryErr);
        throw new Error(retryErr.message || 'Pending 항목을 생성하는데 실패했습니다.');
      }
      return retryData;
    }

    console.error('Pending 항목 생성 실패:', error);
    throw new Error(error.message || 'Pending 항목을 생성하는데 실패했습니다.');
  }
  
  return data;
};

// 설명: Pending 항목 수정 (UUID 및 날짜 필드 자동 정리)
export const updatePendingItem = async (
  itemId: string,
  updates: Partial<PendingItemInput>
): Promise<PendingItem> => {
  const sanitizedUpdates: any = {
    ...updates,
    assigned_to: updates.assigned_to ? updates.assigned_to : null,
    target_date: updates.target_date ? updates.target_date : null,
  };

  const { data, error } = await supabase
    .from('pending_items')
    .update(sanitizedUpdates)
    .eq('id', itemId)
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .single();
  
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column')) {
      delete sanitizedUpdates.assignee_name;
      delete sanitizedUpdates.is_carried_over;
      delete sanitizedUpdates.original_task_id;

      const { data: retryData, error: retryErr } = await supabase
        .from('pending_items')
        .update(sanitizedUpdates)
        .eq('id', itemId)
        .select(`
          *,
          team:teams(*),
          assignee:user_profiles!assigned_to(*),
          related_task:tasks(*)
        `)
        .single();

      if (retryErr) {
        console.error('Pending 항목 수정 재시도 실패:', retryErr);
        throw new Error(retryErr.message || 'Pending 항목을 수정하는데 실패했습니다.');
      }
      return retryData;
    }

    console.error('Pending 항목 수정 실패:', error);
    throw new Error(error.message || 'Pending 항목을 수정하는데 실패했습니다.');
  }

  // 연관된 Task가 있다면 동기화 업데이트
  if (data && data.related_task_id) {
    let taskStatus = 'pending';
    if (data.status === 'in_progress') taskStatus = 'in_progress';
    else if (data.status === 'completed') taskStatus = 'completed';
    else if (data.status === 'waiting') taskStatus = 'blocked';
    else if (data.status === 'cancelled') taskStatus = 'cancelled';

    // 비동기 실행 (실패해도 Pending 업데이트 성공 유지)
    supabase.from('tasks').update({
      title: data.title,
      description: data.description,
      status: taskStatus,
      priority: data.priority,
      assigned_to: data.assigned_to,
      progress_percentage: data.status === 'completed' ? 100 : (data.status === 'pending' ? 0 : undefined)
    }).eq('id', data.related_task_id).then(({ error }) => {
      if (error) console.error('연관된 Task 업데이트 실패:', error);
    });
  }
  
  return data;
};

// 설명: Pending 항목 완료 처리
export const completePendingItem = async (itemId: string): Promise<PendingItem> => {
  const { data, error } = await supabase
    .from('pending_items')
    .update({
      is_completed: true,
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', itemId)
    .select(`
      *,
      team:teams(*),
      assignee:user_profiles!assigned_to(*),
      related_task:tasks(*)
    `)
    .single();
  
  if (error) {
    console.error('Pending 항목 완료 처리 실패:', error);
    throw new Error('Pending 항목 완료 처리에 실패했습니다.');
  }

  // 연관된 Task 완료 처리 동기화
  if (data && data.related_task_id) {
    supabase.from('tasks').update({
      status: 'completed',
      progress_percentage: 100
    }).eq('id', data.related_task_id).then(({ error }) => {
      if (error) console.error('연관된 Task 업데이트 실패:', error);
    });
  }
  
  return data;
};

// 설명: Pending 항목 삭제
export const deletePendingItem = async (itemId: string): Promise<void> => {
  // 연관된 Task ID 확인
  const { data: item } = await supabase.from('pending_items').select('related_task_id').eq('id', itemId).single();

  const { error } = await supabase
    .from('pending_items')
    .delete()
    .eq('id', itemId);
  
  if (error) {
    console.error('Pending 항목 삭제 실패:', error);
    throw new Error('Pending 항목을 삭제하는데 실패했습니다.');
  }

  // 연관된 Task가 있었다면 함께 삭제 (선택적)
  if (item && item.related_task_id) {
    supabase.from('tasks').delete().eq('id', item.related_task_id).then(({ error }) => {
      if (error) console.error('연관된 Task 삭제 실패:', error);
    });
  }
};

// 설명: Pending 항목 통계 가져오기
export const getPendingStats = async () => {
  // 설명: 전체 Pending 항목 수
  const { count: totalCount, error: totalError } = await supabase
    .from('pending_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false);
  
  // 설명: 진행 중인 Pending 항목 수
  const { count: inProgressCount, error: inProgressError } = await supabase
    .from('pending_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false)
    .eq('status', 'in_progress');
  
  // 설명: 우선순위 높은 Pending 항목 수
  const { count: highPriorityCount, error: highPriorityError } = await supabase
    .from('pending_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false)
    .eq('priority', 'high');
  
  if (totalError || inProgressError || highPriorityError) {
    console.error('Pending 통계 조회 실패');
    throw new Error('Pending 통계를 불러오는데 실패했습니다.');
  }
  
  return {
    total: totalCount || 0,
    in_progress: inProgressCount || 0,
    high_priority: highPriorityCount || 0,
  };
};
