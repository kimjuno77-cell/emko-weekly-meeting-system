import { useState, useEffect } from 'react';
import { Users, UserPlus, Briefcase, X, AlertTriangle } from 'lucide-react';
import { memberManagementService } from '@/services/memberManagementService';
import { personnelService } from '@/services/personnelService';
import { UserWorkload, Team, Project } from '@/types';
import toast from 'react-hot-toast';

export default function WorkloadDashboard() {
  const [workloads, setWorkloads] = useState<UserWorkload[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // 배정 모달 상태
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assignType, setAssignType] = useState<'team' | 'project'>('project');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // 미가입 인력 등록 모달 상태
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineName, setOfflineName] = useState('');
  const [offlineEmail, setOfflineEmail] = useState('');
  const [offlineTeamId, setOfflineTeamId] = useState('');
  const [isAddingOffline, setIsAddingOffline] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workloadsData, _, { teams: teamsData, projects: projectsData }] = await Promise.all([
        memberManagementService.getAllWorkloads(),
        memberManagementService.getAllActiveUsers(),
        memberManagementService.getTeamsAndProjects()
      ]);
      setWorkloads(workloadsData);
      setTeams(teamsData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error(error);
      toast.error('데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId || !selectedEntityId) {
      toast.error('사용자와 배정할 팀/프로젝트를 선택해주세요.');
      return;
    }

    setIsAssigning(true);
    try {
      if (assignType === 'team') {
        await memberManagementService.addTeamMember(selectedEntityId, selectedUserId);
        toast.success('팀에 배정되었습니다.');
      } else {
        await memberManagementService.addProjectMember(selectedEntityId, selectedUserId);
        toast.success('프로젝트에 배정되었습니다.');
      }
      setIsAssignModalOpen(false);
      setSelectedEntityId('');
      fetchData(); // 데이터 새로고침
    } catch (error: any) {
      toast.error(error.message || '배정 중 오류가 발생했습니다.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (userId: string, entityId: string, type: 'team' | 'project') => {
    if (!confirm('정말로 이 배정을 해제하시겠습니까?')) return;

    try {
      if (type === 'team') {
        await memberManagementService.removeTeamMember(entityId, userId);
      } else {
        await memberManagementService.removeProjectMember(entityId, userId);
      }
      toast.success('배정이 해제되었습니다.');
      fetchData();
    } catch (error) {
      toast.error('해제 중 오류가 발생했습니다.');
    }
  };

  const handleAddOfflinePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineName.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    
    setIsAddingOffline(true);
    try {
      await personnelService.createOfflinePersonnel({
        full_name: offlineName,
        email: offlineEmail || null,
        team_id: offlineTeamId || null,
        role: 'member'
      });
      toast.success('미가입 인력이 등록되었습니다.');
      setIsOfflineModalOpen(false);
      setOfflineName('');
      setOfflineEmail('');
      setOfflineTeamId('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || '인력 등록에 실패했습니다.');
    } finally {
      setIsAddingOffline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-sky-500" />
            팀 및 인력 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            인원별 다중 소속(팀/프로젝트) 현황과 워크로드를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            미가입 인력 추가
          </button>
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-sm"
          >
            <Briefcase className="w-4 h-4" />
            다중 소속 배정
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">이름 (이메일)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">배정된 팀 및 프로젝트</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">워크로드 개수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workloads.map((wl) => (
                <tr key={wl.user_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{wl.full_name}</div>
                    <div className="text-xs text-slate-500">{wl.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {/* Assigned Teams */}
                      {wl.assigned_teams.map(team => (
                        <div key={`team-${team.id}`} className="group/tag inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                          {team.name}
                          <button 
                            onClick={() => handleRemove(wl.user_id, team.id, 'team')}
                            className="ml-1 text-sky-400 hover:text-rose-500 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                            title="배정 해제"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Assigned Projects */}
                      {wl.assigned_projects.map(proj => (
                        <div key={`proj-${proj.id}`} className="group/tag inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Briefcase className="w-3 h-3 text-indigo-400" />
                          {proj.name}
                          <button 
                            onClick={() => handleRemove(wl.user_id, proj.id, 'project')}
                            className="ml-1 text-indigo-400 hover:text-rose-500 opacity-0 group-hover/tag:opacity-100 transition-opacity"
                            title="투입 해제"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {(wl.assigned_teams.length === 0 && wl.assigned_projects.length === 0) && (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg font-black text-sm ${
                      wl.total_workload_count > 3 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                        : wl.total_workload_count > 0
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-slate-50 text-slate-400'
                    }`}>
                      {wl.total_workload_count > 3 && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                      {wl.total_workload_count}
                    </div>
                  </td>
                </tr>
              ))}
              {workloads.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-medium">
                    사용자 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 배정 모달 */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">인원 배정</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">사용자 선택</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  <option value="">-- 사용자 선택 --</option>
                  {workloads.map(wl => (
                    <option key={wl.user_id} value={wl.user_id}>{wl.full_name} ({wl.primary_team_name || '소속없음'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">배정 유형</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="assignType" checked={assignType === 'project'} onChange={() => { setAssignType('project'); setSelectedEntityId(''); }} className="text-sky-600 focus:ring-sky-500" />
                    <span className="text-sm font-medium text-slate-700">프로젝트에 투입</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="assignType" checked={assignType === 'team'} onChange={() => { setAssignType('team'); setSelectedEntityId(''); }} className="text-sky-600 focus:ring-sky-500" />
                    <span className="text-sm font-medium text-slate-700">타 팀에 겸직</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {assignType === 'team' ? '팀 선택' : '프로젝트 선택'}
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                >
                  <option value="">-- {assignType === 'team' ? '팀' : '프로젝트'} 선택 --</option>
                  {assignType === 'team' 
                    ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    : projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                  }
                </select>
              </div>
            </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
                >
                  취소
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isAssigning}
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isAssigning ? '배정 중...' : '배정 완료'}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* 미가입 인력 등록 모달 */}
      {isOfflineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                미가입 인력 추가
              </h2>
              <button 
                onClick={() => setIsOfflineModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form id="offlineForm" onSubmit={handleAddOfflinePersonnel} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 text-amber-800 text-sm mb-4">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>이곳에서 추가한 인력은 시스템 로그인은 불가능하며, 프로젝트 인력 투입(M-Plan) 배정 목적으로만 사용됩니다.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">이름 (필수)</label>
                  <input
                    type="text"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">이메일 (선택 - 추후 회원가입 시 연동용)</label>
                  <input
                    type="email"
                    value={offlineEmail}
                    onChange={(e) => setOfflineEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">소속 팀 (선택)</label>
                  <select
                    value={offlineTeamId}
                    onChange={(e) => setOfflineTeamId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">소속 없음</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsOfflineModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
                disabled={isAddingOffline}
              >
                취소
              </button>
              <button
                type="submit"
                form="offlineForm"
                disabled={isAddingOffline}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition shadow-md shadow-sky-500/20 disabled:opacity-50"
              >
                {isAddingOffline ? '등록 중...' : '등록 완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
