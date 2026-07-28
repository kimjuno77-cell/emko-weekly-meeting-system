import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectMobilization } from '../types';
import toast from 'react-hot-toast';

const MobilizationPlan: React.FC = () => {
  const [plans, setPlans] = useState<ProjectMobilization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // 향후 projects, user_profiles, project_phases 를 join해서 가져옵니다.
      const { data, error } = await supabase
        .from('project_mobilizations')
        .select(`
          *,
          project:projects(name),
          user:user_profiles(full_name, email),
          phase:project_phases(phase_name)
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching mobilization plans:', error);
      toast.error('인력 투입 계획을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">인력 투입 계획 (Mobilization Plan)</h1>
        <p className="text-slate-500 text-sm">
          프로젝트별 전체 일정(설계~시운전)에 맞춘 팀원 투입 일정을 관리하고 조회합니다.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            등록된 인력 투입 계획이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">프로젝트</th>
                  <th className="px-4 py-3">투입 단계</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">역할</th>
                  <th className="px-4 py-3">시작일</th>
                  <th className="px-4 py-3">종료일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {(plan as any).project?.name || '알 수 없음'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-md text-xs font-medium">
                        {(plan as any).phase?.phase_name || '전체'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {(plan as any).user?.full_name || '알 수 없음'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {plan.role_description || '-'}
                    </td>
                    <td className="px-4 py-3">{plan.start_date}</td>
                    <td className="px-4 py-3">{plan.end_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilizationPlan;
