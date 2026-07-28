import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectMobilization, Project, ProjectPhase, UserProfile } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { Plus, X, Calendar, Briefcase } from 'lucide-react';

const MobilizationPlan: React.FC = () => {
  const { userProfile } = useAuthStore();
  const [plans, setPlans] = useState<ProjectMobilization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchPlans();
    if (isAdmin) {
      fetchFormData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchPhasesForProject(selectedProjectId);
    } else {
      setPhases([]);
      setSelectedPhaseId('');
    }
  }, [selectedProjectId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_mobilizations')
        .select(`
          *,
          project:projects(name),
          user:user_profiles!project_mobilizations_user_id_fkey(full_name, email),
          phase:project_phases(phase_name)
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching mobilization plans:', error);
      toast.error(`불러오기 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        supabase.from('projects').select('*').eq('status', 'active'),
        supabase.from('user_profiles').select('*').eq('is_active', true)
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (userRes.data) setUsers(userRes.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const fetchPhasesForProject = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setPhases(data || []);
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedUserId || !startDate || !endDate) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (startDate > endDate) {
      toast.error('종료일이 시작일보다 빠를 수 없습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('project_mobilizations')
        .insert({
          project_id: selectedProjectId,
          user_id: selectedUserId,
          phase_id: selectedPhaseId || null,
          role_description: roleDesc,
          start_date: startDate,
          end_date: endDate,
          created_by: userProfile?.id,
        });

      if (error) throw error;

      toast.success('투입 계획이 성공적으로 추가되었습니다.');
      setIsModalOpen(false);
      resetForm();
      fetchPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast.error(`추가 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setSelectedPhaseId('');
    setSelectedUserId('');
    setRoleDesc('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">인력 투입(Mobilization) 계획</h1>
          <p className="text-slate-500 text-sm">
            프로젝트별 전체 일정(설계~시운전)에 맞춰 어느 팀원이 언제 투입되는지 계획하고 관리합니다.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>투입 계획 추가</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <UsersIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
            등록된 인력 투입 계획이 없습니다.
            {isAdmin && <p className="mt-2 text-sm text-slate-400">우측 상단의 버튼을 눌러 인력 투입을 계획해 보세요.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">프로젝트</th>
                  <th className="px-6 py-4">투입 단계(Phase)</th>
                  <th className="px-6 py-4">투입 인원</th>
                  <th className="px-6 py-4">담당 역할</th>
                  <th className="px-6 py-4">시작 예정일</th>
                  <th className="px-6 py-4">종료 예정일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/80 transition duration-150">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span>{(plan as any).project?.name || '알 수 없음'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(plan as any).phase?.phase_name ? (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-xs font-bold">
                          {(plan as any).phase.phase_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">전체 단계</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {(plan as any).user?.full_name?.[0] || 'U'}
                        </div>
                        <span className="font-semibold text-slate-700">
                          {(plan as any).user?.full_name || '알 수 없음'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {plan.role_description || '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{plan.start_date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{plan.end_date}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 투입 계획 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">인력 투입(Mobilization) 계획 추가</h2>
              <button 
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="createPlanForm" onSubmit={handleCreatePlan} className="space-y-4">
                {/* 프로젝트 선택 */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">대상 프로젝트 *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  >
                    <option value="">프로젝트를 선택하세요</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* 투입 단계 선택 (프로젝트 선택 시 활성화) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">투입 단계 (Phase)</label>
                  <select
                    value={selectedPhaseId}
                    onChange={(e) => setSelectedPhaseId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
                    disabled={!selectedProjectId || phases.length === 0}
                  >
                    <option value="">전체 기간 투입 (특정 단계 없음)</option>
                    {phases.map(ph => (
                      <option key={ph.id} value={ph.id}>{ph.phase_name}</option>
                    ))}
                  </select>
                </div>

                {/* 투입 인원 선택 */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">투입 인원 (팀원) *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  >
                    <option value="">투입할 인원을 선택하세요</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                {/* 담당 역할 입력 */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">담당 역할 / 업무 설명</label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="예: 배관 설계 메인 담당"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* 투입 기간 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">투입 시작일 *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">투입 종료(예정)일 *</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      required
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                form="createPlanForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition shadow-md shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSubmitting ? '저장 중...' : '투입 계획 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default MobilizationPlan;
