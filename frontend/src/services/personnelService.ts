import { supabase } from '../lib/supabase';
import { OfflinePersonnel, UserProfile } from '../types';

export const personnelService = {
  // 모든 인력(가입 유저 + 오프라인 팀원) 조회 및 병합
  async getAllPersonnel(): Promise<{ users: UserProfile[], offline: OfflinePersonnel[] }> {
    const { data: usersData, error: usersError } = await supabase
      .from('user_profiles')
      .select('*, team:teams(*)')
      .eq('is_active', true)
      .order('full_name');
      
    if (usersError) throw usersError;

    const { data: offlineData, error: offlineError } = await supabase
      .from('offline_personnel')
      .select('*, team:teams(*)')
      .order('full_name');

    if (offlineError) throw offlineError;

    return {
      users: (usersData || []) as UserProfile[],
      offline: (offlineData || []) as OfflinePersonnel[]
    };
  },

  // 새로운 미가입 인력 추가
  async createOfflinePersonnel(personnel: { full_name: string, email?: string | null, team_id?: string | null, role?: string, created_by?: string }): Promise<OfflinePersonnel> {
    const { data, error } = await supabase
      .from('offline_personnel')
      .insert([personnel])
      .select('*, team:teams(*)')
      .single();

    if (error) throw error;
    return data as OfflinePersonnel;
  },

  // 미가입 인력 삭제
  async deleteOfflinePersonnel(id: string): Promise<void> {
    const { error } = await supabase
      .from('offline_personnel')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
