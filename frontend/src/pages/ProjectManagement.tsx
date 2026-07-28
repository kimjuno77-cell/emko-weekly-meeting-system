import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project, ProjectPhase } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { Plus, X, Calendar, Edit2 } from 'lucide-react';

const DEFAULT_PHASES = ['설계', '구매', '제작', '검사', '설치', '시운전'];

const ProjectManagement: React.FC = () => {
  const { userProfile } = useAuthStore();
  const [projects, setProjects] = useState<(Project & { phases: ProjectPhase[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchProjects();
  }, []);

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

      const combined = projectsData.map(p => ({
        ...p,
        phases: phasesData.filter(ph => ph.project_id === p.id)
      }));

      setProjects(combined);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error(`프로젝트 목록을 불러오는데 실패했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 1. 프로젝트 생성
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: newProjectName,
          description: newProjectDesc,
          created_by: userProfile?.id,
          status: 'active'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. 기본 페이즈 6개 자동 생성 (설계~시운전)
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

      toast.success('프로젝트가 성공적으로 생성되었습니다.');
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(`프로젝트 생성 실패: ${error.message}`);
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
            onClick={() => setIsModalOpen(true)}
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
                      project.status === 'active' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {project.status === 'active' ? '진행 중' : project.status}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                </div>
                {isAdmin && (
                  <button className="p-2 text-slate-400 hover:text-sky-600 bg-white rounded-lg border border-slate-200 hover:border-sky-300 transition shadow-sm">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Overall Schedule Phases</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {project.phases.map(phase => (
                    <div key={phase.id} className={`p-4 rounded-lg border ${getStatusColor(phase.status)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold">{phase.phase_name}</span>
                      </div>
                      <div className="space-y-1 mt-3">
                        <div className="flex items-center text-[11px] opacity-80">
                          <Calendar className="w-3 h-3 mr-1" />
                          예상: {phase.planned_end_date ? phase.planned_end_date : '미정'}
                        </div>
                        <div className="text-xs font-medium mt-1">
                          상태: {getStatusText(phase.status)}
                        </div>
                        <div className="text-[11px] font-medium pt-2 border-t border-black/10 mt-2">
                          필요 인원: {phase.required_personnel}명
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

      {/* 프로젝트 생성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">새 프로젝트 추가</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="createProjectForm" onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">프로젝트 명칭</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="예: 2024 해상풍력 발전기 설치 TF"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">프로젝트 설명</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="프로젝트의 주요 목표나 개요를 작성해주세요."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                  />
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 mt-2">
                  <p className="text-xs text-sky-800 font-medium">
                    💡 프로젝트를 생성하면 설계, 구매, 제작, 검사, 설치, 시운전 등 6개의 기본 스케줄(Phase)이 자동으로 생성됩니다.
                  </p>
                </div>
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
                form="createProjectForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition shadow-md shadow-sky-500/20 disabled:opacity-50"
              >
                {isSubmitting ? '생성 중...' : '프로젝트 만들기'}
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
