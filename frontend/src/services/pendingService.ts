// ?ㅻ챸: Pending ??ぉ 愿??API ?몄텧 ?쒕퉬??(UUID/?좎쭨 ?좏슚???먮룞 ?뺣━ 諛??ㅻ쪟 ?먮룞 蹂듦뎄 ?ы븿)

import { supabase } from '@/lib/supabase';
import { PendingItem, PendingItemInput } from '@/types';

// ?ㅻ챸: 紐⑤뱺 Pending ??ぉ 媛?몄삤湲?(?꾨즺?섏? ?딆? ??ぉ留?
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
    .order('priority', { ascending: true }) // high媛 癒쇱?
    .order('target_date', { ascending: true }); // 紐⑺몴?쇱씠 鍮좊Ⅸ 寃?癒쇱?
  
  if (error) {
    console.error('Pending ??ぉ 議고쉶 ?ㅽ뙣:', error);
    throw new Error('Pending ??ぉ??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data || [];
};

// ?ㅻ챸: ?뱀젙 ???Pending ??ぉ 媛?몄삤湲?export const getPendingItemsByTeam = async (
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
  
  // ?ㅻ챸: ?꾨즺????ぉ ?ы븿 ?щ?
  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }
  
  const { data, error } = await query
    .order('priority', { ascending: true })
    .order('target_date', { ascending: true });
  
  if (error) {
    console.error('?蹂?Pending ??ぉ 議고쉶 ?ㅽ뙣:', error);
    throw new Error('Pending ??ぉ??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data || [];
};

// ?ㅻ챸: ?곗꽑?쒖쐞 ?믪? Pending ??ぉ 媛?몄삤湲?export const getHighPriorityPendingItems = async (): Promise<PendingItem[]> => {
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
    console.error('?곗꽑?쒖쐞 ?믪? Pending ??ぉ 議고쉶 ?ㅽ뙣:', error);
    throw new Error('Pending ??ぉ??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data || [];
};

// ?ㅻ챸: 湲고븳???꾨컯??Pending ??ぉ 媛?몄삤湲?(3???대궡)
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
    console.error('?꾨컯??Pending ??ぉ 議고쉶 ?ㅽ뙣:', error);
    throw new Error('Pending ??ぉ??遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data || [];
};

// ?ㅻ챸: ??Pending ??ぉ ?앹꽦 (UUID 諛??좎쭨 ?꾨뱶 ?먮룞 ?뺣━)
export const createPendingItem = async (
  input: PendingItemInput
): Promise<PendingItem> => {
  const user = await supabase.auth.getUser();

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
        console.error('Pending ??ぉ ?앹꽦 ?ъ떆???ㅽ뙣:', retryErr);
        throw new Error(retryErr.message || 'Pending ??ぉ???앹꽦?섎뒗???ㅽ뙣?덉뒿?덈떎.');
      }
      return retryData;
    }

    console.error('Pending ??ぉ ?앹꽦 ?ㅽ뙣:', error);
    throw new Error(error.message || 'Pending ??ぉ???앹꽦?섎뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return data;
};

// ?ㅻ챸: Pending ??ぉ ?섏젙 (UUID 諛??좎쭨 ?꾨뱶 ?먮룞 ?뺣━)
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
        console.error('Pending ??ぉ ?섏젙 ?ъ떆???ㅽ뙣:', retryErr);
        throw new Error(retryErr.message || 'Pending ??ぉ???섏젙?섎뒗???ㅽ뙣?덉뒿?덈떎.');
      }
      return retryData;
    }

    console.error('Pending ??ぉ ?섏젙 ?ㅽ뙣:', error);
    throw new Error(error.message || 'Pending ??ぉ???섏젙?섎뒗???ㅽ뙣?덉뒿?덈떎.');
  }

  // ?곌???Task媛 ?덈떎硫??숆린???낅뜲?댄듃
  if (data && data.related_task_id) {
    let taskStatus = 'pending';
    if (data.status === 'in_progress') taskStatus = 'in_progress';
    else if (data.status === 'completed') taskStatus = 'completed';
    else if (data.status === 'waiting') taskStatus = 'blocked';
    else if (data.status === 'cancelled') taskStatus = 'cancelled';

    // 鍮꾨룞湲??ㅽ뻾 (?ㅽ뙣?대룄 Pending ?낅뜲?댄듃 ?깃났 ?좎?)
    supabase.from('tasks').update({
      title: data.title,
      description: data.description,
      status: taskStatus,
      priority: data.priority,
      assigned_to: data.assigned_to,
      progress_percentage: data.status === 'completed' ? 100 : (data.status === 'pending' ? 0 : undefined)
    }).eq('id', data.related_task_id).then(({ error }) => {
      if (error) console.error('?곌???Task ?낅뜲?댄듃 ?ㅽ뙣:', error);
    });
  }
  
  return data;
};

// ?ㅻ챸: Pending ??ぉ ?꾨즺 泥섎━
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
    console.error('Pending ??ぉ ?꾨즺 泥섎━ ?ㅽ뙣:', error);
    throw new Error('Pending ??ぉ ?꾨즺 泥섎━???ㅽ뙣?덉뒿?덈떎.');
  }

  // ?곌???Task ?꾨즺 泥섎━ ?숆린??  if (data && data.related_task_id) {
    supabase.from('tasks').update({
      status: 'completed',
      progress_percentage: 100
    }).eq('id', data.related_task_id).then(({ error }) => {
      if (error) console.error('?곌???Task ?낅뜲?댄듃 ?ㅽ뙣:', error);
    });
  }
  
  return data;
};

// ?ㅻ챸: Pending ??ぉ ??젣
export const deletePendingItem = async (itemId: string): Promise<void> => {
  // ?곌???Task ID ?뺤씤
  const { data: item } = await supabase.from('pending_items').select('related_task_id').eq('id', itemId).single();

  const { error } = await supabase
    .from('pending_items')
    .delete()
    .eq('id', itemId);
  
  if (error) {
    console.error('Pending ??ぉ ??젣 ?ㅽ뙣:', error);
    throw new Error('Pending ??ぉ????젣?섎뒗???ㅽ뙣?덉뒿?덈떎.');
  }

  // ?곌???Task媛 ?덉뿀?ㅻ㈃ ?④퍡 ??젣 (?좏깮??
  if (item && item.related_task_id) {
    supabase.from('tasks').delete().eq('id', item.related_task_id).then(({ error }) => {
      if (error) console.error('?곌???Task ??젣 ?ㅽ뙣:', error);
    });
  }
};

// ?ㅻ챸: Pending ??ぉ ?듦퀎 媛?몄삤湲?export const getPendingStats = async () => {
  // ?ㅻ챸: ?꾩껜 Pending ??ぉ ??  const { count: totalCount, error: totalError } = await supabase
    .from('pending_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false);
  
  // ?ㅻ챸: 吏꾪뻾 以묒씤 Pending ??ぉ ??  const { count: inProgressCount, error: inProgressError } = await supabase
    .from('pending_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false)
    .eq('status', 'in_progress');
  
  // ?ㅻ챸: ?곗꽑?쒖쐞 ?믪? Pending ??ぉ ??  const { count: highPriorityCount, error: highPriorityError } = await supabase
    .from('pending_items')
    .select('*', { count: 'exact', head: true })
    .eq('is_completed', false)
    .eq('priority', 'high');
  
  if (totalError || inProgressError || highPriorityError) {
    console.error('Pending ?듦퀎 議고쉶 ?ㅽ뙣');
    throw new Error('Pending ?듦퀎瑜?遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.');
  }
  
  return {
    total: totalCount || 0,
    in_progress: inProgressCount || 0,
    high_priority: highPriorityCount || 0,
  };
};
