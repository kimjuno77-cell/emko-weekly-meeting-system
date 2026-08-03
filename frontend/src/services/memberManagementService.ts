// 설명: 팀 및 프로젝트 멤버(다중 인원 등록)와 워크로드 관리를 위한 서비스

import { supabase } from '@/lib/supabase';
import { UserWorkload, Team, Project, UserProfile } from '@/types';

export const memberManagementService = {
  // 1. 특정 사용자를 팀에 추가
  async addTeamMember(teamId: string, userId: string, role: string = 'member') {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: userId, role })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('이미 이 팀에 등록된 사용자입니다.');
      throw error;
    }
    return data;
  },

  // 2. 특정 사용자를 팀에서 제거
  async removeTeamMember(teamId: string, userId: string) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // 3. 특정 사용자를 프로젝트에 추가
  async addProjectMember(projectId: string, userId: string, role: string = 'member') {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('이미 이 프로젝트에 등록된 사용자입니다.');
      throw error;
    }
    return data;
  },

  // 4. 특정 사용자를 프로젝트에서 제거
  async removeProjectMember(projectId: string, userId: string) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // 5. 전체 사용자의 워크로드 데이터 조회
  async getAllWorkloads(): Promise<UserWorkload[]> {
    // 1) 모든 활성 사용자 조회
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, team_id, team:teams(name)')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (userError) throw userError;

    // 2) 모든 팀 맵핑 데이터 조회
    const { data: teamMembers, error: tmError } = await supabase
      .from('team_members')
      .select('user_id, team:teams(id, name)');

    if (tmError) throw tmError;

    // 3) 모든 프로젝트 맵핑 데이터 조회
    const { data: projectMembers, error: pmError } = await supabase
      .from('project_members')
      .select('user_id, project:projects(id, name, status)');

    if (pmError) throw pmError;

    // 4) 데이터 조합
    const workloads: UserWorkload[] = users.map((user: any) => {
      // 본 소속(Primary Team)도 워크로드에 포함하는지? -> 일단 별도 표시용으로 사용
      const userTeamMembers = teamMembers.filter((tm) => tm.user_id === user.id);
      const userProjectMembers = projectMembers.filter((pm) => pm.user_id === user.id);

      const assignedTeams = userTeamMembers.map((tm) => tm.team) as unknown as Team[];
      const assignedProjects = userProjectMembers.map((pm) => pm.project) as unknown as Project[];

      return {
        user_id: user.id,
        full_name: user.full_name || '이름 없음',
        email: user.email,
        primary_team_name: user.team?.name || null,
        assigned_teams: assignedTeams,
        assigned_projects: assignedProjects,
        total_workload_count: assignedTeams.length + assignedProjects.length
      };
    });

    return workloads;
  },

  // 6. 모든 활성 사용자 목록 가져오기 (드롭다운용)
  async getAllActiveUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, team:teams(name)')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data as UserProfile[];
  },
  
  // 7. 모든 팀 및 활성 프로젝트 목록 가져오기
  async getTeamsAndProjects() {
    const { data: teams, error: tError } = await supabase.from('teams').select('*').order('display_order');
    if (tError) throw tError;

    const { data: projects, error: pError } = await supabase.from('projects').select('*').eq('status', 'active').order('name');
    if (pError) throw pError;

    return { teams, projects };
  }
};
