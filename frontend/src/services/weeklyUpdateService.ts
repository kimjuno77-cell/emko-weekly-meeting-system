// 설명: 주간 업데이트 관련 API 및 2주 비교/미완료 항목 자동 이관 서비스

import { supabase } from '@/lib/supabase';
import { WeeklyUpdate, WeeklyUpdateInput, Task } from '@/types';
import { startOfWeek, endOfWeek, format, subDays, addDays, parseISO } from 'date-fns';

// 설명: 특정 주차의 주간 업데이트 가져오기 (모든 팀)
export const getWeeklyUpdatesByWeek = async (
  weekStartDate: string
): Promise<WeeklyUpdate[]> => {
  const { data, error } = await supabase
    .from('weekly_updates')
    .select(`
      *,
      team:teams(*),
      creator:user_profiles!created_by(*),
      last_updater:user_profiles!last_updated_by(*),
      tasks(*)
    `)
    .eq('week_start_date', weekStartDate)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('주간 업데이트 조회 실패:', error);
    throw new Error('주간 업데이트를 불러오는데 실패했습니다.');
  }
  
  return data || [];
};

// 설명: 특정 팀/프로젝트의 특정 주차 업데이트 가져오기
export const getWeeklyUpdateByTeamAndWeek = async (
  teamId: string | null,
  weekStartDate: string,
  projectId: string | null = null
): Promise<WeeklyUpdate | null> => {
  let query = supabase
    .from('weekly_updates')
    .select(`
      *,
      team:teams(*),
      project:projects(*),
      creator:user_profiles!created_by(*),
      last_updater:user_profiles!last_updated_by(*),
      tasks(*)
    `)
    .eq('week_start_date', weekStartDate);

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.is('team_id', null);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  } else {
    query = query.is('project_id', null);
  }

  const { data, error } = await query.single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('주간 업데이트 조회 실패:', error);
    throw new Error('주간 업데이트를 불러오는데 실패했습니다.');
  }
  
  return data;
};

// 설명: 현재/이전/다음 주차 시작일과 종료일 계산 함수들
export const getCurrentWeekDates = (targetDate: Date = new Date()) => {
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // 월요일 시작
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // 일요일 종료
  
  return {
    weekStartDate: format(weekStart, 'yyyy-MM-dd'),
    weekEndDate: format(weekEnd, 'yyyy-MM-dd'),
  };
};

export const getPrevWeekDates = (currentWeekStartDate: string) => {
  const currentStart = parseISO(currentWeekStartDate);
  const prevStart = subDays(currentStart, 7);
  return getCurrentWeekDates(prevStart);
};

export const getNextWeekDates = (currentWeekStartDate: string) => {
  const currentStart = parseISO(currentWeekStartDate);
  const nextStart = addDays(currentStart, 7);
  return getCurrentWeekDates(nextStart);
};

// 설명: 지난주 미완료(CLOSE 되지 않은) 작업 목록 가져오기
export const getUnclosedTasksFromPrevWeek = async (
  teamId: string | null,
  currentWeekStartDate: string,
  projectId: string | null = null
): Promise<Task[]> => {
  const { weekStartDate: prevWeekStartDate } = getPrevWeekDates(currentWeekStartDate);

  // 지난주 주간 보고서 조회
  const prevUpdate = await getWeeklyUpdateByTeamAndWeek(teamId, prevWeekStartDate, projectId);
  if (!prevUpdate || !prevUpdate.tasks) return [];

  // 상태가 'completed'가 아니고 진행률이 100 미만인 항목 필터링
  const unclosed = prevUpdate.tasks.filter(
    (t) => t.status !== 'completed' && (t.progress_percentage || 0) < 100
  );

  return unclosed;
};

// 설명: 새 주간 업데이트 생성 (중복 확인 및 안전 로직 포함)
export const createWeeklyUpdate = async (
  input: WeeklyUpdateInput
): Promise<WeeklyUpdate> => {
  const user = await supabase.auth.getUser();
  
  // 1. 이미 존재하는지 먼저 조회
  const existing = await getWeeklyUpdateByTeamAndWeek(input.team_id || null, input.week_start_date, input.project_id || null);
  if (existing) return existing;

  const insertPayload: any = {
    team_id: input.team_id || null,
    project_id: input.project_id || null,
    week_start_date: input.week_start_date,
    week_end_date: input.week_end_date,
    status: input.status || 'draft',
    notes: input.notes || '',
  };

  if (user.data.user?.id) {
    insertPayload.created_by = user.data.user.id;
    insertPayload.last_updated_by = user.data.user.id;
  }

  const { data, error } = await supabase
    .from('weekly_updates')
    .insert([insertPayload])
    .select(`
      *,
      team:teams(*),
      project:projects(*),
      creator:user_profiles!created_by(*),
      last_updater:user_profiles!last_updated_by(*)
    `)
    .single();
  
  if (error) {
    // 2. 오류 발생 시 다시 조회 시도
    const reCheck = await getWeeklyUpdateByTeamAndWeek(input.team_id || null, input.week_start_date, input.project_id || null);
    if (reCheck) return reCheck;

    console.error('주간 업데이트 생성 실패:', error);
    throw new Error(error.message || '주간 업데이트를 생성하는데 실패했습니다.');
  }
  
  return data;
};

// 설명: 주간 업데이트 수정
export const updateWeeklyUpdate = async (
  updateId: string,
  updates: Partial<WeeklyUpdateInput>
): Promise<WeeklyUpdate> => {
  const user = await supabase.auth.getUser();
  
  const updatePayload: any = {
    ...updates,
  };
  if (user.data.user?.id) {
    updatePayload.last_updated_by = user.data.user.id;
  }

  const { data, error } = await supabase
    .from('weekly_updates')
    .update(updatePayload)
    .eq('id', updateId)
    .select(`
      *,
      team:teams(*),
      creator:user_profiles!created_by(*),
      last_updater:user_profiles!last_updated_by(*)
    `)
    .single();
  
  if (error) {
    console.error('주간 업데이트 수정 실패:', error);
    throw new Error(error.message || '주간 업데이트를 수정하는데 실패했습니다.');
  }
  
  return data;
};

// 설명: 주간 업데이트 삭제
export const deleteWeeklyUpdate = async (updateId: string): Promise<void> => {
  const { error } = await supabase
    .from('weekly_updates')
    .delete()
    .eq('id', updateId);
  
  if (error) {
    console.error('주간 업데이트 삭제 실패:', error);
    throw new Error('주간 업데이트를 삭제하는데 실패했습니다.');
  }
};

// 설명: 주간 업데이트 상태 변경 (draft -> submitted -> reviewed)
export const changeWeeklyUpdateStatus = async (
  updateId: string,
  status: 'draft' | 'submitted' | 'reviewed'
): Promise<WeeklyUpdate> => {
  return updateWeeklyUpdate(updateId, { status });
};
