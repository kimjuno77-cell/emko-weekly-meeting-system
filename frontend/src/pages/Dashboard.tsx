// 설명: 대시보드 페이지 - 전체 팀 현황 한눈에 보기

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Users,
  AlertCircle,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { getAllTeams } from '@/services/teamService';
import { getPendingStats, getHighPriorityPendingItems } from '@/services/pendingService';
import { getCurrentWeekDates, getWeeklyUpdatesByWeek } from '@/services/weeklyUpdateService';
import { Team, PendingItem, WeeklyUpdate } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
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
  const { weekStartDate, weekEndDate } = getCurrentWeekDates();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [teamsData, statsData, highPriorityData, { data: projectsData }, updatesData] = await Promise.all([
        getAllTeams(),
        getPendingStats(),
        getHighPriorityPendingItems(),
        supabase.from('projects').select('*').order('name', { ascending: true }),
        getWeeklyUpdatesByWeek(weekStartDate),
      ]);
      
      setTeams(teamsData);
      setPendingStats(statsData);
      setHighPriorityItems(highPriorityData);
      setProjects(projectsData || []);
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
  const notStartedCount = Math.max(0, teams.length - currentUpdates.length);

  // 차트 데이터 가공 (팀별 완료율 & 작업 수)
  const chartData = teams.map(team => {
    // 팀의 모든 이번 주 업데이트들을 가져옴
    const teamUpdates = currentUpdates.filter(u => u.team_id === team.id);
    const tasks = teamUpdates.flatMap(u => u.tasks || []);
    const progressCount = tasks.filter(t => t.task_type === 'progress').length;
    const issueCount = tasks.filter(t => t.task_type === 'issue').length;
    const planCount = tasks.filter(t => t.task_type === 'plan').length;
    
    return {
      name: team.name,
      '진행사항': progressCount,
      '이슈사항': issueCount,
      '계획': planCount,
      '총 작업수': tasks.length
    };
  });

  // Pending 상태 분포 데이터 가공
  const pendingDistributionData = [
    { name: '진행 중', value: pendingStats.in_progress, color: '#0ea5e9' },
    { name: '대기 중', value: Math.max(0, pendingStats.total - pendingStats.in_progress - pendingStats.high_priority), color: '#eab308' },
    { name: '높은 우선순위', value: pendingStats.high_priority, color: '#ef4444' }
  ].filter(d => d.value > 0);

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

      {/* 팀 제출 현황 그리드 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">팀별 주간 업데이트 제출 현황</h2>
            <p className="text-xs text-slate-500 mt-1">월요일 회의 전까지 모든 팀이 제출을 완료해야 합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" /> 제출완료 ({submittedCount})
            </span>
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <Clock className="h-4 w-4" /> 작성중 ({draftCount})
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200"></span> 미작성 ({notStartedCount})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {teams.map((team) => {
            const teamUpdates = currentUpdates.filter(u => u.team_id === team.id);
            const isAllSubmitted = teamUpdates.length > 0 && teamUpdates.every(u => u.status === 'submitted' || u.status === 'reviewed');
            const hasDraft = teamUpdates.some(u => u.status === 'draft');
            const tasksCount = teamUpdates.flatMap(u => u.tasks || []).length;

            let statusBadge = (
              <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-md gap-1">
                미작성
              </span>
            );
            let borderStyle = "border-slate-100";
            let bgHover = "hover:border-slate-200 hover:shadow-sm";

            if (isAllSubmitted) {
              statusBadge = (
                <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 제출완료
                </span>
              );
              borderStyle = "border-emerald-100 bg-emerald-50/10";
            } else if (hasDraft) {
              statusBadge = (
                <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md gap-1">
                  <Clock className="h-3 w-3 animate-pulse" /> 작성중
                </span>
              );
              borderStyle = "border-amber-100 bg-amber-50/10";
            }

            return (
              <Link
                key={team.id}
                to={`/update?teamId=${team.id}`}
                className={`block p-5 border ${borderStyle} rounded-xl transition-all ${bgHover} cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{team.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{team.description || '주간 업무 보고'}</p>
                  </div>
                  {statusBadge}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-100 pt-3 text-xs text-slate-500">
                  <span>보고서 {teamUpdates.length}건, 작업 {tasksCount}건</span>
                  <span className="text-sky-600 font-medium hover:underline inline-flex items-center gap-0.5">
                    자세히 보기 <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 프로젝트 전용 (팀 없는) 업데이트 섹션 */}
        {currentUpdates.filter(u => !u.team_id && u.project_id).length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-800">프로젝트 공통 보고 현황</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                팀 미지정
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {currentUpdates
                .filter(u => !u.team_id && u.project_id)
                .map((update) => {
                  const proj = projects.find(p => p.id === update.project_id);
                  const isSubmitted = update.status === 'submitted' || update.status === 'reviewed';
                  const tasksCount = update.tasks?.length || 0;

                  let statusBadge = isSubmitted ? (
                    <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 제출완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md gap-1">
                      <Clock className="h-3 w-3 animate-pulse" /> 작성중
                    </span>
                  );
                  let borderStyle = isSubmitted ? "border-emerald-100 bg-emerald-50/10" : "border-amber-100 bg-amber-50/10";
                  let bgHover = "hover:border-slate-200 hover:shadow-sm";

                  return (
                    <Link
                      key={update.id}
                      to={`/update?projectId=${update.project_id}`}
                      className={`block p-5 border ${borderStyle} rounded-xl transition-all ${bgHover} cursor-pointer`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{proj?.name || '알 수 없는 프로젝트'}</h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">팀 미지정 프로젝트 보고</p>
                        </div>
                        {statusBadge}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-100 pt-3 text-xs text-slate-500">
                        <span>작업 {tasksCount}건</span>
                        <span className="text-sky-600 font-medium hover:underline inline-flex items-center gap-0.5">
                          자세히 보기 <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 비주얼 통계 & 높은 우선순위 Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 차트 영역 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">팀 / TF팀별 주간 작업 등록 현황</h2>
            <p className="text-xs text-slate-500 mt-1">이번 주 실적(Progress) 및 이슈(Issue) 건수</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="진행사항" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="이슈사항" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="계획" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending 상태 및 긴급 항목 */}
        <div className="space-y-6 lg:col-span-4">
          {/* Pending 분포 원형 차트 */}
          {pendingDistributionData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Pending 상태 분석</h2>
              <div className="flex items-center justify-between">
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pendingDistributionData}
                        innerRadius={25}
                        outerRadius={45}
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
              <h2 className="text-sm font-bold text-slate-900">🚨 긴급 조치 요망 항목</h2>
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
