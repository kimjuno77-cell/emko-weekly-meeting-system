// ?ㅻ챸: ?묒뾽 ??ぉ 愿??API ?몄텧 ?쒕퉬??(UUID/?좏슚???먮룞 ?뺣━ 諛??ㅻ쪟 ?먮룞 蹂듦뎄 ?ы븿)

import { supabase } from '@/lib/supabase';
import { Task, TaskInput, TaskType } from '@/types';

// ?ㅻ챸: ?뱀젙 二쇨컙 ?낅뜲?댄듃??紐⑤뱺 ?묒뾽 ??ぉ 媛?몄삤湲?export const getTasksByWeeklyUpdate = async (
  weeklyUpdateId: string
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      weekly_update:weekly_updates(*),
      assignee:user_profiles!assigned_to(*)
    `)
    .eq('weekly_update_id', weeklyUpdateId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('?묒뾽 ??ぉ 議고쉶 ?ㅽ뙣:', error);
    throw new Error('?묒뾽 ??ぉ??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data || [];
};

// ?ㅻ챸: ?뱀젙 ??낆쓽 ?묒뾽 ??ぉ留?媛?몄삤湲?(吏꾪뻾?ы빆/?댁뒋/怨꾪쉷)
export const getTasksByType = async (
  weeklyUpdateId: string,
  taskType: TaskType
): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      weekly_update:weekly_updates(*),
      assignee:user_profiles!assigned_to(*)
    `)
    .eq('weekly_update_id', weeklyUpdateId)
    .eq('task_type', taskType)
    .order('display_order', { ascending: true });
  
  if (error) {
    console.error('?묒뾽 ??ぉ 議고쉶 ?ㅽ뙣:', error);
    throw new Error('?묒뾽 ??ぉ??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data || [];
};

// ?ㅻ챸: ???묒뾽 ??ぉ ?앹꽦 (UUID 諛??ㅽ궎留?罹먯떆 ?ㅻ쪟 ?먮룞 ?명솚)
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
      assignee:user_profiles!assigned_to(*)
    `)
    .single();
  
  if (error) {
    // 而щ읆 誘몄〈??PGRST204) ?먮뒗 ?ㅽ궎留?罹먯떆 ?댁뒋 諛쒖깮 ???좉퇋 而щ읆 ?쒖쇅 ?ъ떆??    if (error.code === 'PGRST204' || error.message.includes('column')) {
      delete sanitizedInput.assignee_name;
      delete sanitizedInput.is_carried_over;
      delete sanitizedInput.original_task_id;

      const { data: retryData, error: retryErr } = await supabase
        .from('tasks')
        .insert([sanitizedInput])
        .select(`
          *,
          weekly_update:weekly_updates(*),
          assignee:user_profiles!assigned_to(*)
        `)
        .single();

      if (retryErr) {
        console.error('?묒뾽 ??ぉ ?앹꽦 ?ъ떆???ㅽ뙣:', retryErr);
        throw new Error(retryErr.message || '?묒뾽 ??ぉ???앹꽦?섎뒗???ㅽ뙣?덉뒿?덈떎.');
      }
      return retryData;
    }

    console.error('?묒뾽 ??ぉ ?앹꽦 ?ㅽ뙣:', error);
    throw new Error(error.message || '?묒뾽 ??ぉ???앹꽦?섎뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data;
};

// ?ㅻ챸: ?묒뾽 ??ぉ ?섏젙 (UUID 諛??ㅽ궎留?罹먯떆 ?ㅻ쪟 ?먮룞 ?명솚)
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
      assignee:user_profiles!assigned_to(*)
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
          assignee:user_profiles!assigned_to(*)
        `)
        .single();

      if (retryErr) {
        console.error('?묒뾽 ??ぉ ?섏젙 ?ъ떆???ㅽ뙣:', retryErr);
        throw new Error(retryErr.message || '?묒뾽 ??ぉ???섏젙?섎뒗???ㅽ뙣?덉뒿?덈떎.');
      }
      data = retryData;
    } else {
      console.error('?묒뾽 ??ぉ ?섏젙 ?ㅽ뙣:', error);
      throw new Error(error.message || '?묒뾽 ??ぉ???섏젙?섎뒗???ㅽ뙣?덉뒿?덈떎.');
    }
  }

  // Pending ?곕룞 ?낅뜲?댄듃 (?곹깭 ?먮뒗 湲고? ?뺣낫 蹂寃???
  if (data) {
    const pendingUpdates: any = {};
    
    if (updates.title !== undefined) pendingUpdates.title = updates.title;
    if (updates.description !== undefined) pendingUpdates.description = updates.description;
    if (updates.priority !== undefined) pendingUpdates.priority = updates.priority;
    if (updates.assigned_to !== undefined) pendingUpdates.assigned_to = updates.assigned_to;
    
    if (updates.status !== undefined) {
      let pendingStatus = 'pending';
      if (updates.status === 'in_progress') pendingStatus = 'in_progress';
      else if (updates.status === 'completed') pendingStatus = 'completed';
      else if (updates.status === 'blocked') pendingStatus = 'waiting';
      else if (updates.status === 'cancelled') pendingStatus = 'cancelled';

      pendingUpdates.status = pendingStatus;
      pendingUpdates.is_completed = (updates.status === 'completed');
      pendingUpdates.completed_date = updates.status === 'completed' ? new Date().toISOString().split('T')[0] : null;
    }
    
    if (Object.keys(pendingUpdates).length > 0) {
      // 鍮꾨룞湲곕줈 ?덉쟾?섍쾶 Pending ??ぉ ?낅뜲?댄듃 ?ㅽ뻾 (?ㅽ뙣?대룄 Task ?낅뜲?댄듃???깃났 諛섑솚)
      supabase
        .from('pending_items')
        .update(pendingUpdates)
        .eq('related_task_id', taskId)
        .then(({ error }) => {
          if (error) console.error('Pending ??ぉ ?숆린???ㅽ뙣:', error);
        });
    }
  }
  
  return data;
};

// ?ㅻ챸: ?묒뾽 ??ぉ ??젣
export const deleteTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) {
    console.error('?묒뾽 ??ぉ ??젣 ?ㅽ뙣:', error);
    throw new Error('?묒뾽 ??ぉ????젣?섎뒗???ㅽ뙣?덉뒿?덈떎.');
  }
};

// ?ㅻ챸: ?묒뾽 ??ぉ 吏꾪뻾瑜??낅뜲?댄듃
export const updateTaskProgress = async (
  taskId: string,
  progressPercentage: number
): Promise<Task> => {
  // ?ㅻ챸: 吏꾪뻾瑜좎씠 100%?대㈃ ?곹깭瑜?'completed'濡??먮룞 蹂寃?  const status = progressPercentage === 100 ? 'completed' : 'in_progress';
  
  return updateTask(taskId, { progress_percentage: progressPercentage, status });
};

// ?ㅻ챸: ?щ윭 ?묒뾽 ??ぉ???쒖꽌 蹂寃?(?쒕옒洹????쒕∼)
export const reorderTasks = async (
  tasks: { id: string; display_order: number }[]
): Promise<void> => {
  // ?ㅻ챸: ?몃옖??뀡?쇰줈 紐⑤뱺 ?쒖꽌 ?낅뜲?댄듃
  const updates = tasks.map((task) =>
    supabase
      .from('tasks')
      .update({ display_order: task.display_order })
      .eq('id', task.id)
  );
  
  const results = await Promise.all(updates);
  
  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    console.error('?묒뾽 ??ぉ ?쒖꽌 蹂寃??ㅽ뙣:', errors);
    throw new Error('?묒뾽 ??ぉ ?쒖꽌瑜?蹂寃쏀븯?붾뜲 ?ㅽ뙣?덉뒿?덈떎.');
  }
};
