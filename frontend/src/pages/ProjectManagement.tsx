import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project, ProjectPhase } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

const ProjectManagement: React.FC = () => {
  const { userProfile } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('프로젝트 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">프로젝트 관리</h1>
        <p className="text-slate-500 text-sm">
          진행 중인 프로젝트 현황과 스케줄(설계, 구매, 제작, 검사, 설치, 시운전)을 한눈에 파악합니다.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            등록된 프로젝트가 없습니다.
            {isAdmin && <p className="mt-2 text-sm">우측 상단의 버튼을 눌러 프로젝트를 추가해주세요.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="border border-slate-100 p-4 rounded-lg flex justify-between items-center hover:bg-slate-50 transition">
                <div>
                  <h3 className="font-semibold text-slate-800">{project.name}</h3>
                  <p className="text-sm text-slate-500">{project.description || '설명 없음'}</p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-700' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {project.status === 'active' ? '진행 중' : project.status === 'completed' ? '완료' : '보류'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManagement;
