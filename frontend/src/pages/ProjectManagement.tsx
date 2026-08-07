import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project, ProjectPhase } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { Plus, X, Calendar, Edit2, Trash2 } from 'lucide-react';

import { personnelService } from '../services/personnelService';
import { recommendPersonnel } from '../services/workloadService';

const DEFAULT_PHASES = ['설계', '구매', '제작', '검사', '설치', '시운전'];

const ProjectManagement: React.FC = () => {
  const { userProfile } = useAuthStore();
  const [projects, setProjects] = useState<(Project & { phases: (ProjectPhase & { mobilizations: any[] })[] })[]>([]);
  const [users, setUsers] = useState<any[]>([]); // 합쳐진 사용자(정식+오프라인) 목록
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectStatus, setProjectStatus] = useState<'active' | 'completed' | 'on_hold'>('active');
  
  // Phase Edit State
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [phasePlannedStart, setPhasePlannedStart] = useState('');
  const [phasePlannedEnd, setPhasePlannedEnd] = useState('');
  const [phaseActualStart, setPhaseActualStart] = useState('');
  const [phaseActualEnd, setPhaseActualEnd] = useState('');
  const [phaseStatus, setPhaseStatus] = useState<'pending'|'in_progress'|'delayed'|'ahead'|'completed'>('pending');
  const [phasePersonnel, setPhasePersonnel] = useState(0);
  const [selectedPhaseUsers, setSelectedPhaseUsers] = useState<string[]>([]);
  const [originalPhaseUsers, setOriginalPhaseUsers] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { users, offline } = await personnelService.getAllPersonnel();
      // 두 리스트를 합침
      const combined = [
        ...users.map(u => ({ ...u, isOffline: false })),
        ...offline.map(o => ({ ...o, isOffline: true, email: '(미가입 인력)' }))
      ];
      setUsers(combined);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .order('display_order', { ascending: true });

      if (phasesError) throw phasesError;

      const { data: mobilizationsData, error: mobError } = await supabase
        .from('project_mobilizations')
        .select('*');

      if (mobError) throw mobError;

      const combined = projectsData.map(p => ({
        ...p,
        phases: phasesData.filter(ph => ph.project_id === p.id).map(ph => ({
          ...ph,
          mobilizations: mobilizationsData.filter(m => m.phase_id === ph.id)
        }))
      }));

      setProjects(combined);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error(`프로젝트 목록을 불러오는데 실패했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditProjectId(null);
    setProjectName('');
    setProjectDesc('');
    setProjectStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditProjectId(project.id);
    setProjectName(project.name);
    setProjectDesc(project.description || '');
    setProjectStatus(project.status as any);
    setIsModalOpen(true);
  };

  const openPhaseModal = (phase: any) => {
    setEditingPhase(phase);
    setPhasePlannedStart(phase.planned_start_date || '');
    setPhasePlannedEnd(phase.planned_end_date || '');
    setPhaseActualStart(phase.actual_start_date || '');
    setPhaseActualEnd(phase.actual_end_date || '');
    setPhaseStatus(phase.status as any);
    setPhasePersonnel(phase.required_personnel || 0);
    // 기존 유저 아이디와 오프라인 인력 아이디를 합쳐서 세팅
    const existingUsers = phase.mobilizations?.map((m: any) => m.user_id || m.offline_personnel_id).filter(Boolean) || [];
    setSelectedPhaseUsers(existingUsers);
    setOriginalPhaseUsers(existingUsers);
    setIsPhaseModalOpen(true);
  };

  const handleSavePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('project_phases')
        .update({
          planned_start_date: phasePlannedStart || null,
          planned_end_date: phasePlannedEnd || null,
          actual_start_date: phaseActualStart || null,
          actual_end_date: phaseActualEnd || null,
          status: phaseStatus,
          required_personnel: phasePersonnel
        })
        .eq('id', editingPhase.id);

      if (error) throw error;

      // Handle mobilization changes
      const addedUsers = selectedPhaseUsers.filter(u => !originalPhaseUsers.includes(u));
      const removedUsers = originalPhaseUsers.filter(u => !selectedPhaseUsers.includes(u));

      if (removedUsers.length > 0) {
        // user_id 에 해당하거나 offline_personnel_id 에 해당하는 데이터를 모두 삭제
        await supabase.from('project_mobilizations')
          .delete()
          .eq('phase_id', editingPhase.id)
          .or(`user_id.in.(${removedUsers.join(',')}),offline_personnel_id.in.(${removedUsers.join(',')})`);
      }

      if (addedUsers.length > 0) {
        const plansToInsert = addedUsers.map(id => {
          // 사용자가 오프라인 인력인지 확인
          const userObj = users.find(u => u.id === id);
          const isOffline = userObj?.isOffline;

          return {
            project_id: editingPhase.project_id,
            user_id: isOffline ? null : id,
            offline_personnel_id: isOffline ? id : null,
            phase_id: editingPhase.id,
            role_description: editingPhase.phase_name + ' 투입 (자동 배정)',
            start_date: phasePlannedStart || new Date().toISOString().split('T')[0],
            end_date: phasePlannedEnd || new Date().toISOString().split('T')[0],
            created_by: userProfile?.id,
          };
        });
        await supabase.from('project_mobilizations').insert(plansToInsert);
      }

      toast.success('스케줄(Phase) 및 투입 인원이 업데이트되었습니다.');
      setIsPhaseModalOpen(false);
      fetchProjects();
    } catch (error: any) {
      console.error('Error saving phase:', error);
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 프로젝트를 정말 삭제하시겠습니까?\n하위 페이즈(Phase) 및 연관된 인력 투입 계획도 모두 삭제됩니다.`)) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('프로젝트가 삭제되었습니다.');
      fetchProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(`삭제 실패: ${error.message}`);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editProjectId) {
        // 수정
        const { error } = await supabase
          .from('projects')
          .update({
            name: projectName,
            description: projectDesc,
            status: projectStatus,
          })
          .eq('id', editProjectId);

        if (error) throw error;
        toast.success('프로젝트가 수정되었습니다.');
      } else {
        // 신규 생성
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: projectName,
            description: projectDesc,
            created_by: userProfile?.id,
            status: projectStatus
          })
          .select()
          .single();

        if (projectError) throw projectError;

        // 기본 페이즈 자동 생성
        const phasesToInsert = DEFAULT_PHASES.map((phaseName, index) => ({
          project_id: projectData.id,
          phase_name: phaseName,
          display_order: index,
          status: 'pending'
        }));

        const { error: phaseError } = await supabase
          .from('project_phases')
          .insert(phasesToInsert);

        if (phaseError) throw phaseError;
        
        // 추가 요구사항: 프로젝트 생성 시, 프로젝트 이름으로 팀 자동 생성
        try {
          await supabase.from('teams').insert({
            name: projectName,
            description: '프로젝트 전담 팀 (자동 생성)'
          });
        } catch (teamErr) {
          console.warn('팀 자동 생성 중 오류 발생 (이미 존재하는 이름일 수 있습니다):', teamErr);
        }

        toast.success('프로젝트가 성공적으로 생성되었습니다.');
      }

      setIsModalOpen(false);
      fetchProjects();
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ahead': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'delayed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'ahead': return '조기 달성';
      case 'in_progress': return '진행 중';
      case 'delayed': return '지연됨';
      default: return '대기 중';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">프로젝트 현황 및 스케줄 관리</h1>
          <p className="text-slate-500 text-sm">
            설계부터 시운전까지 전체 프로세스의 일정 지연(Delay) 및 선행(Ahead) 여부를 트래킹합니다.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-md shadow-sky-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>새 프로젝트 추가</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
            <RocketIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            등록된 프로젝트가 없습니다.<br/>
            새 프로젝트를 추가하여 관리를 시작하세요.
          </div>
        ) : (
          projects.map(project => (
            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                    <span>{project.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      project.status === 'active' ? 'bg-sky-100 text-sky-700' : 
                      project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {project.status === 'active' ? '진행 중' : project.status === 'completed' ? '완료' : '보류'}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                </div>
                {isAdmin && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => openEditModal(project)}
                      className="p-2 text-slate-400 hover:text-sky-600 bg-white rounded-lg border border-slate-200 hover:border-sky-300 transition shadow-sm"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-lg border border-slate-200 hover:border-red-300 transition shadow-sm"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Overall Schedule Phases</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {project.phases.map(phase => (
                    <div key={phase.id} className={`p-4 rounded-lg border relative group ${getStatusColor(phase.status)}`}>
                      {isAdmin && (
                        <button
                          onClick={() => openPhaseModal(phase)}
                          className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-sky-600 border border-slate-200 hover:border-sky-300"
                          title="스케줄 수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold">{phase.phase_name}</span>
                      </div>
                      <div className="space-y-1 mt-3">
                        <div className="flex items-center text-[11px] opacity-80">
                          <Calendar className="w-3 h-3 mr-1" />
                          예상: {phase.planned_start_date ? `${phase.planned_start_date} ~ ` : ''}{phase.planned_end_date ? phase.planned_end_date : '미정'}
                        </div>
                        {(phase.actual_start_date || phase.actual_end_date) && (
                          <div className="flex items-center text-[10px] opacity-70">
                            <Calendar className="w-3 h-3 mr-1" />
                            실제: {phase.actual_start_date ? `${phase.actual_start_date} ~ ` : ''}{phase.actual_end_date ? phase.actual_end_date : '진행중'}
                          </div>
                        )}
                        <div className="text-xs font-medium mt-1">
                          상태: {getStatusText(phase.status)}
                        </div>
                        <div className="text-[11px] font-medium pt-2 border-t border-black/10 mt-2 flex justify-between items-center">
                          <span>필요 인원: {phase.required_personnel}명</span>
                          <span className={`px-1.5 py-0.5 rounded ${phase.mobilizations?.length >= phase.required_personnel ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            투입: {phase.mobilizations?.length || 0}명
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 프로젝트 생성/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editProjectId ? '프로젝트 수정' : '새 프로젝트 추가'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="projectForm" onSubmit={handleSaveProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">프로젝트 명칭</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="예: 2024 해상풍력 발전기 설치 TF"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">상태</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="active">진행 중</option>
                    <option value="completed">완료</option>
                    <option value="on_hold">보류</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">프로젝트 설명</label>
                  <textarea
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="프로젝트의 주요 목표나 개요를 작성해주세요."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                  />
                </div>
                {!editProjectId && (
                  <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 mt-2">
                    <p className="text-xs text-sky-800 font-medium">
                      💡 프로젝트를 생성하면 설계, 구매, 제작, 검사, 설치, 시운전 등 6개의 기본 스케줄(Phase)이 자동으로 생성됩니다.
                    </p>
                  </div>
                )}
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                form="projectForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition shadow-md shadow-sky-500/20 disabled:opacity-50"
              >
                {isSubmitting ? '저장 중...' : (editProjectId ? '수정 완료' : '프로젝트 만들기')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 수정 모달 */}
      {isPhaseModalOpen && editingPhase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingPhase.phase_name} 스케줄 편집
              </h2>
              <button 
                onClick={() => setIsPhaseModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="phaseForm" onSubmit={handleSavePhase} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">예정 시작일</label>
                    <input
                      type="date"
                      value={phasePlannedStart}
                      onChange={(e) => setPhasePlannedStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">예정 종료일</label>
                    <input
                      type="date"
                      value={phasePlannedEnd}
                      onChange={(e) => setPhasePlannedEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">실제 시작일</label>
                    <input
                      type="date"
                      value={phaseActualStart}
                      onChange={(e) => setPhaseActualStart(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">실제 종료일</label>
                    <input
                      type="date"
                      value={phaseActualEnd}
                      onChange={(e) => setPhaseActualEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">상태</label>
                    <select
                      value={phaseStatus}
                      onChange={(e) => setPhaseStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    >
                      <option value="pending">대기 중</option>
                      <option value="in_progress">진행 중</option>
                      <option value="ahead">조기 달성</option>
                      <option value="delayed">지연됨</option>
                      <option value="completed">완료</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">필요 인원수</label>
                    <input
                      type="number"
                      min="0"
                      value={phasePersonnel}
                      onChange={(e) => setPhasePersonnel(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                  </div>
                </div>

                {/* 인원 배정 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">투입 인원 (M-PLAN 연동)</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!phasePlannedStart || !phasePlannedEnd) {
                            toast.error('예정 시작일과 종료일을 먼저 입력해주세요.');
                            return;
                          }
                          const allMobs = projects.flatMap(p => p.phases.flatMap(ph => ph.mobilizations || []));
                          const offline = users.filter(u => u.isOffline);
                          const regular = users.filter(u => !u.isOffline);
                          const recommended = recommendPersonnel(phasePlannedStart, phasePlannedEnd, allMobs, regular, offline);
                          if (recommended.length > 0) {
                            const newUsers = [...new Set([...selectedPhaseUsers, ...recommended.map(r => r.id)])];
                            setSelectedPhaseUsers(newUsers);
                            toast.success('WORK LOAD 기반 가장 한가한 5명이 추가로 선택되었습니다.');
                          }
                        }}
                        className="text-[10px] bg-sky-100 text-sky-700 px-2 py-1 rounded hover:bg-sky-200 font-bold transition"
                      >
                        추천 인원 추가 (Top 5)
                      </button>
                      <span className="text-xs text-sky-600 font-bold">{selectedPhaseUsers.length}명 선택됨</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
                    {users.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-2">등록된 사용자가 없습니다.</p>
                    ) : (
                      users.map(u => (
                        <label key={u.id} className="flex items-center space-x-3 cursor-pointer hover:bg-slate-100 p-1.5 rounded transition">
                          <input
                            type="checkbox"
                            checked={selectedPhaseUsers.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPhaseUsers(prev => [...prev, u.id]);
                              } else {
                                setSelectedPhaseUsers(prev => prev.filter(id => id !== u.id));
                              }
                            }}
                            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                          />
                          <span className="text-sm text-slate-700 flex items-center gap-2">
                            {u.full_name} 
                            <span className="text-[10px] text-slate-400">({u.email})</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                    <span className="text-sky-500 font-bold">💡</span>
                    이곳에서 인원을 선택하면 투입계획(M-PLAN)에 이 페이즈의 기간으로 자동 등록됩니다.
                  </p>
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPhaseModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition text-sm"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                form="phaseForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition shadow-md shadow-sky-500/20 disabled:opacity-50 text-sm"
              >
                {isSubmitting ? '저장 중...' : '스케줄 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RocketIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

export default ProjectManagement;
