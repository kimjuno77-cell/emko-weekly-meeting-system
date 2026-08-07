// 설명: 대시보드 페이지 - 전체 팀 현황 한눈에 보기

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Users,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { getAllTeams } from '@/services/teamService';
import { getPendingStats, getHighPriorityPendingItems } from '@/services/pendingService';
import { getCurrentWeekDates, getWeeklyUpdatesByWeek } from '@/services/weeklyUpdateService';
import { useAuthStore } from '@/stores/authStore';
import { Team, PendingItem, WeeklyUpdate } from '@/types';
import toast from 'react-hot-toast';
import GanttChart, { GanttItem, ViewMode } from '@/components/GanttChart';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = () => {
  const { userProfile } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentUpdates, setCurrentUpdates] = useState<WeeklyUpdate[]>([]);
  const [pendingStats, setPendingStats] = useState({
    total: 0,
    in_progress: 0,
    high_priority: 0,
  });
  const [highPriorityItems, setHighPriorityItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectPhases, setProjectPhases] = useState<any[]>([]);
  const [mobilizations, setMobilizations] = useState<any[]>([]);
  const [ganttViewMode, setGanttViewMode] = useState<ViewMode>('month');
  const [ganttDate, setGanttDate] = useState<Date>(new Date());
  
  const { weekStartDate, weekEndDate } = getCurrentWeekDates();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [teamsData, statsData, highPriorityData, projectsRes, phasesRes, mobRes, updatesData] = await Promise.all([
        getAllTeams(),
        getPendingStats(),
        getHighPriorityPendingItems(),
        supabase.from('projects').select('*').order('name', { ascending: true }),
        supabase.from('project_phases').select('*').order('display_order', { ascending: true }),
        supabase.from('project_mobilizations').select('*, user:user_profiles!project_mobilizations_user_id_fkey(full_name), offline:offline_personnel!project_mobilizations_offline_personnel_id_fkey(full_name), project:projects(name)').order('start_date', { ascending: true }),
        getWeeklyUpdatesByWeek(weekStartDate),
      ]);
      
      setTeams(teamsData);
      setPendingStats(statsData);
      setHighPriorityItems(highPriorityData);
      setProjects(projectsRes.data || []);
      setProjectPhases(phasesRes.data || []);
      setMobilizations(mobRes.data || []);
      setCurrentUpdates(updatesData);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-500"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-sky-500">로딩중</div>
        </div>
      </div>
    );
  }

  // 제출 완료한 팀의 수 계산
  const submittedUpdates = currentUpdates.filter(u => u.status === 'submitted' || u.status === 'reviewed');
  const submittedCount = submittedUpdates.length;
  const draftCount = currentUpdates.filter(u => u.status === 'draft').length;

  // Pending 상태 분포 데이터 가공
  const pendingDistributionData = [
    { name: '진행 중', value: pendingStats.in_progress, color: '#0ea5e9' },
    { name: '대기 중', value: Math.max(0, pendingStats.total - pendingStats.in_progress - pendingStats.high_priority), color: '#eab308' },
    { name: '높은 우선순위', value: pendingStats.high_priority, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // 간트차트 데이터 가공
  const ganttItems: GanttItem[] = projects.map(proj => {
    const phases = projectPhases.filter(p => p.project_id === proj.id);
    return {
      id: proj.id,
      label: proj.name,
      subLabel: proj.status === 'completed' ? '완료' : proj.status === 'on_hold' ? '보류' : '진행 중',
      tasks: phases.filter(p => p.planned_start_date).map(p => {
        let colorClass = 'bg-sky-500';
        if (p.status === 'completed') colorClass = 'bg-emerald-500';
        else if (p.status === 'delayed') colorClass = 'bg-red-500';
        else if (p.status === 'ahead') colorClass = 'bg-blue-600';
        
        return {
          id: p.id,
          name: p.phase_name,
          startDate: p.planned_start_date,
          endDate: p.planned_end_date,
          colorClass
        };
      })
    };
  }).filter(item => item.tasks.length > 0); // 시작일이 있는 페이즈가 하나라도 있는 프로젝트만 표시

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 웰컴 배너 */}
      <div className="relative bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden border border-white/5">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              안녕하세요, {userProfile?.full_name || '사용자'}님! 👋
            </h1>
            <p className="mt-2 text-sm text-sky-200/80 max-w-xl">
              {weekStartDate} ~ {weekEndDate} 회의 준비 현황입니다. 주간 회의 업데이트가 순차적으로 수집되고 있습니다.
            </p>
            {userProfile?.team_id ? (
              <Link
                to="/update"
                className="mt-4 sm:mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center"
              >
                주간업무 작성하기 <ArrowRight className="h-3 w-3 ml-1.5" />
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/report"
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95"
            >
              주간회의 리포트 요약 📄
            </Link>
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 소속 팀</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{teams.length}개 팀</p>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl">
              <Users className="h-6 w-6 text-sky-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-500">{submittedCount}개 팀 제출 완료</span>
            <span>/ {draftCount}개 작성중</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">미해결 Pending</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{pendingStats.total}건</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <ClipboardList className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            실시간 추적 중인 전체 미해결 항목 수
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">진행 중 (In Progress)</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{pendingStats.in_progress}건</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span>추적 및 조치 중인 태스크</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">긴급 조치 요망 (High)</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{pendingStats.high_priority}건</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 text-xs text-red-600 font-medium">
            우선순위 높음 등급의 Pending 사항
          </div>
        </div>
      </div>

      {/* 프로젝트 간트 차트 (메인) */}
      <div className="h-[600px] border-t border-slate-100 pt-6">
        <GanttChart
          items={ganttItems}
          viewMode={ganttViewMode}
          onViewModeChange={setGanttViewMode}
          currentDate={ganttDate}
          onDateChange={setGanttDate}
          title="프로젝트 스케줄 현황 (Gantt)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 인력 투입 계획 (M-Plan) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">프로젝트 주요 인력 투입 현황 (M-Plan)</h2>
              <p className="text-xs text-slate-500 mt-1">프로젝트별 투입 인원 및 스케줄 요약</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">프로젝트</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">담당자 (역할)</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">투입 기간</th>
                  <th className="py-3 px-4 text-xs font-semibold text-slate-500">상태</th>
                </tr>
              </thead>
              <tbody>
                {mobilizations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      등록된 인력 투입 계획이 없습니다.
                    </td>
                  </tr>
                ) : (
                  mobilizations.slice(0, 5).map((mob) => {
                    const today = new Date();
                    const start = new Date(mob.start_date);
                    const end = new Date(mob.end_date);
                    const isActive = today >= start && today <= end;
                    
                    return (
                      <tr key={mob.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{mob.project?.name || '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {mob.user?.full_name || mob.offline?.full_name || '미지정'} 
                          {mob.role_description && <span className="text-xs text-slate-400 ml-1">({mob.role_description})</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {mob.start_date} ~ {mob.end_date}
                        </td>
                        <td className="py-3 px-4">
                          {isActive ? (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-md">투입중</span>
                          ) : today > end ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-md">완료</span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-md">예정</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {mobilizations.length > 5 && (
              <div className="mt-4 text-center">
                <Link to="/projects" className="text-xs text-indigo-600 font-semibold hover:underline">
                  모든 투입 계획 보기 ({mobilizations.length}건)
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Pending 상태 및 긴급 항목 */}
        <div className="space-y-6 lg:col-span-4">
          
          {/* 미제출 조직 요약 (축소된 형태) */}
          <div className="bg-rose-50/50 rounded-2xl border border-rose-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600" /> 주간 업데이트 미제출
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {teams
                .filter(team => {
                   // 팀에 대해 제출(submitted/reviewed)된 주간 업데이트가 하나라도 있는지 확인
                   const hasSubmitted = currentUpdates.some(cu => cu.team_id === team.id && cu.status !== 'draft');
                   return !hasSubmitted;
                })
                .map(team => (
                  <Link key={team.id} to={`/update?teamId=${team.id}`} className="px-2.5 py-1.5 bg-white border border-rose-200 text-rose-700 text-xs font-medium rounded-md hover:bg-rose-50 transition">
                    {team.name}
                  </Link>
                ))
              }
              {teams.filter(t => !currentUpdates.some(cu => cu.team_id === t.id && cu.status !== 'draft')).length === 0 && (
                <span className="text-xs text-emerald-600 font-medium">🎉 모든 팀이 제출을 완료했습니다!</span>
              )}
            </div>
          </div>

          {/* Pending 분포 원형 차트 */}
          {pendingDistributionData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Pending 상태 현황</h2>
              <div className="flex items-center justify-between">
                <div className="h-24 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pendingDistributionData}
                        innerRadius={20}
                        outerRadius={35}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pendingDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 pl-4 space-y-2 text-xs">
                  {pendingDistributionData.map((entry, _index) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                        {entry.name}
                      </span>
                      <span className="font-bold text-slate-900">{entry.value}건</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 긴급 Pending 목록 */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">🚨 긴급 이슈 목록 (Pending)</h2>
              <Link to="/pending" className="text-xs text-sky-600 hover:underline">전체보기</Link>
            </div>
            
            <div className="space-y-3">
              {highPriorityItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  현재 해결이 필요한 긴급 항목이 없습니다.
                </div>
              ) : (
                highPriorityItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3 bg-red-50/30 border border-red-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">{item.item_id}</span>
                      <span className="text-slate-500 font-medium">{item.team?.name}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">{item.title}</h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-red-100/50">
                      <span>담당: {item.assignee?.full_name || '미정'}</span>
                      <span className="flex items-center text-red-600 font-medium">
                        <Clock className="h-3 w-3 mr-0.5" /> {item.target_date || '기한 없음'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
