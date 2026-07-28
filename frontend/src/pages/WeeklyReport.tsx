// 설명: 주간회의 리포트 페이지 컴포넌트 (PDF 및 Excel 다운로드 포함)

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getWeeklyUpdatesByWeek } from '@/services/weeklyUpdateService';
import { getAllTeams } from '@/services/teamService';
import { Team, WeeklyUpdate, PendingItem, ProjectMobilization } from '@/types';
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  FileSpreadsheet
} from 'lucide-react';

// Third-party packages for export
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

const WeeklyReport = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weeklyUpdates, setWeeklyUpdates] = useState<WeeklyUpdate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [highPriorityPending, setHighPriorityPending] = useState<PendingItem[]>([]);
  
  // M-Plan Data for Excel Export
  const [mobilizations, setMobilizations] = useState<ProjectMobilization[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekStartDateStr = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    fetchReportData();
  }, [currentDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const updates = await getWeeklyUpdatesByWeek(weekStartDateStr);
      setWeeklyUpdates(updates);

      const teamsList = await getAllTeams();
      setTeams(teamsList);

      const { data: pendingData } = await supabase
        .from('pending_items')
        .select('*, team:teams(*), assignee:user_profiles!assigned_to(*)')
        .eq('is_completed', false)
        .eq('priority', 'high');
      
      if (pendingData) setHighPriorityPending(pendingData);

      // Fetch M-Plan data for Excel Export
      const { data: mobData } = await supabase
        .from('project_mobilizations')
        .select('*, project:projects(name), user:user_profiles!project_mobilizations_user_id_fkey(full_name), phase:project_phases(phase_name)');
      
      if (mobData) setMobilizations(mobData as ProjectMobilization[]);

    } catch (error) {
      console.error('리포트 조회 실패:', error);
      toast.error('리포트 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setCurrentDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate((prev) => addWeeks(prev, 1));
  const handleCurrentWeek = () => setCurrentDate(new Date());

  // PDF Export
  const downloadPDF = () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    const element = reportRef.current;
    const opt = {
      margin:       10,
      filename:     `Weekly_Report_${format(weekStart, 'yyyyMMdd')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
      toast.success('PDF 다운로드가 완료되었습니다.');
    });
  };

  // Excel Export
  const downloadExcel = () => {
    try {
      setIsExporting(true);
      const wb = XLSX.utils.book_new();

      // 1. 종합 현황 (Summary)
      const summaryData = [
        ['주간 업무 보고서 요약'],
        ['기간', `${format(weekStart, 'yyyy-MM-dd')} ~ ${format(weekEnd, 'yyyy-MM-dd')}`],
        ['보고 제출', `${submittedCount} / ${teams.length}개 팀`],
        ['진행 사항', `${progressCount}건`],
        ['발생 이슈', `${issueCount}건`],
        ['차주 계획', `${planCount}건`]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, '종합 요약');

      // 2. 주요 이슈 (Issues)
      const issuesData = [['소속 팀', '이슈 제목', '이슈 상세내용', '우선순위', '상태']];
      criticalIssues.forEach(issue => {
        issuesData.push([
          issue.teamName || '',
          issue.title,
          issue.description || '',
          issue.priority,
          issue.status
        ]);
      });
      const wsIssues = XLSX.utils.aoa_to_sheet(issuesData);
      XLSX.utils.book_append_sheet(wb, wsIssues, '주요 이슈');

      // 3. 주간 업데이트 상세 (Tasks)
      const tasksData = [['소속 팀', '구분', '제목', '상세내용', '진척도(%)', '담당자']];
      weeklyUpdates.forEach(update => {
        update.tasks?.forEach(task => {
          tasksData.push([
            update.team?.name || '',
            task.task_type === 'progress' ? '진행' : task.task_type === 'issue' ? '이슈' : '계획',
            task.title,
            task.description || '',
            task.progress_percentage.toString(),
            task.assignee_name || ''
          ]);
        });
      });
      const wsTasks = XLSX.utils.aoa_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(wb, wsTasks, '주간 업데이트 상세');

      // 4. 프로젝트 M-Plan (Mobilizations)
      const mplanData = [['프로젝트명', '투입 단계(Phase)', '투입 인원', '역할 설명', '시작일', '종료일']];
      mobilizations.forEach((mob) => {
        mplanData.push([
          mob.project?.name || '',
          mob.phase?.phase_name || '전체',
          mob.user?.full_name || '',
          mob.role_description || '',
          mob.start_date || '',
          mob.end_date || ''
        ]);
      });
      const wsMPlan = XLSX.utils.aoa_to_sheet(mplanData);
      XLSX.utils.book_append_sheet(wb, wsMPlan, '프로젝트 투입(M-Plan)');

      XLSX.writeFile(wb, `Weekly_Report_Data_${format(weekStart, 'yyyyMMdd')}.xlsx`);
      toast.success('엑셀 다운로드가 완료되었습니다.');
    } catch (e) {
      console.error(e);
      toast.error('엑셀 생성에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const criticalIssues = weeklyUpdates.flatMap((update) => {
    return (update.tasks || [])
      .filter((t) => t.task_type === 'issue')
      .map((t) => ({ ...t, teamName: update.team?.name }));
  });

  const progressCount = weeklyUpdates.reduce((sum, u) => sum + (u.tasks?.filter((t) => t.task_type === 'progress').length || 0), 0);
  const issueCount = weeklyUpdates.reduce((sum, u) => sum + (u.tasks?.filter((t) => t.task_type === 'issue').length || 0), 0);
  const planCount = weeklyUpdates.reduce((sum, u) => sum + (u.tasks?.filter((t) => t.task_type === 'plan').length || 0), 0);
  const submittedCount = weeklyUpdates.filter((u) => u.status === 'submitted' || u.status === 'reviewed').length;

  return (
    <div className="space-y-6">
      {/* 주차 탐색 및 액션 바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-slate-800">
            <Calendar className="h-4 w-4 text-sky-500" />
            <span>{format(weekStart, 'yyyy년 MM월 dd일')} ~ {format(weekEnd, 'MM월 dd일')}</span>
          </div>
          <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={handleCurrentWeek} className="text-xs font-bold text-sky-600 hover:bg-sky-50 px-2.5 py-1.5 rounded-lg transition">
            이번 주
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={downloadExcel}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl gap-2 shadow transition active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> 엑셀 다운로드
          </button>
          <button
            onClick={downloadPDF}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl gap-2 shadow transition active:scale-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> PDF 다운로드
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl gap-2 shadow transition active:scale-95"
          >
            <Printer className="h-4 w-4" /> 인쇄
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      ) : (
        <div id="report-content" ref={reportRef} className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 sm:p-10 space-y-10 print:border-0 print:shadow-none print:p-0">
          <div className="text-center pb-8 border-b-2 border-slate-900/10 space-y-2 relative">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">주 간 업 무 보 고 서</h1>
            <p className="text-sm sm:text-base font-bold text-slate-500">
              기간: {format(weekStart, 'yyyy년 MM월 dd일')} ~ {format(weekEnd, 'yyyy년 MM월 dd일')}
            </p>
            <div className="absolute right-0 bottom-2 text-xs font-semibold text-slate-400 print:hidden">
              제출률: {submittedCount} / {teams.length}개 팀
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-l-4 border-slate-900 pl-2">Ⅰ. 종합 현황 요약</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-400">보고 제출</p>
                <p className="text-2xl font-black text-slate-800">{submittedCount} <span className="text-xs font-semibold text-slate-500">/ {teams.length}</span></p>
              </div>
              <div className="text-center space-y-1 border-l border-slate-200">
                <p className="text-xs font-bold text-slate-400">진행 사항</p>
                <p className="text-2xl font-black text-sky-600">{progressCount}건</p>
              </div>
              <div className="text-center space-y-1 border-l border-slate-200">
                <p className="text-xs font-bold text-slate-400">발생 이슈</p>
                <p className="text-2xl font-black text-rose-500">{issueCount}건</p>
              </div>
              <div className="text-center space-y-1 border-l border-slate-200">
                <p className="text-xs font-bold text-slate-400">차주 계획</p>
                <p className="text-2xl font-black text-emerald-600">{planCount}건</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-l-4 border-rose-500 pl-2">Ⅱ. 주요 이슈 및 장애 리스크</h2>
            {criticalIssues.length === 0 ? (
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl text-center text-xs text-slate-500">이번 주차에 보고된 특별한 지연 사항이 없습니다.</div>
            ) : (
              <div className="border border-rose-100 rounded-2xl overflow-hidden shadow-sm print:border-0 print:shadow-none">
                <table className="min-w-full divide-y divide-rose-100 text-left text-xs">
                  <thead className="bg-rose-50/50 font-bold text-rose-700">
                    <tr>
                      <th className="px-4 py-3 w-28">소속 팀</th>
                      <th className="px-4 py-3">이슈 사항</th>
                      <th className="px-4 py-3 w-24 text-center">우선순위</th>
                      <th className="px-4 py-3 w-24 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 bg-white">
                    {criticalIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-rose-50/10">
                        <td className="px-4 py-3 font-bold text-slate-900">{issue.teamName}</td>
                        <td className="px-4 py-3 space-y-1">
                          <p className="font-bold text-slate-800">{issue.title}</p>
                          {issue.description && <p className="text-slate-500 whitespace-pre-wrap">{issue.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                            {issue.priority === 'high' ? '높음' : issue.priority === 'medium' ? '중간' : '낮음'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">
                            {issue.status === 'blocked' ? '지연' : '진행'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-l-4 border-amber-500 pl-2">Ⅲ. 중점 관리 Pending 항목</h2>
            {highPriorityPending.length === 0 ? (
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl text-center text-xs text-slate-500">추적 중인 중요 Pending 과제가 없습니다.</div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm print:border-0 print:shadow-none">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3 w-20">ID</th>
                      <th className="px-4 py-3 w-28">담당 부서</th>
                      <th className="px-4 py-3">업무 내용</th>
                      <th className="px-4 py-3 w-24">담당자</th>
                      <th className="px-4 py-3 w-28 text-center">목표 기한</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {highPriorityPending.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-amber-700">{item.item_id}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.team?.name}</td>
                        <td className="px-4 py-3 space-y-1">
                          <p className="font-bold text-slate-800">{item.title}</p>
                          {item.description && <p className="text-slate-500 whitespace-pre-wrap">{item.description}</p>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.assignee?.full_name || '미배정'}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600">{item.target_date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6 break-before-page">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-l-4 border-slate-900 pl-2">Ⅳ. 팀별 주간업무 상세 사항</h2>
            <div className="space-y-8">
              {teams.map((team) => {
                const update = weeklyUpdates.find((u) => u.team_id === team.id);
                const teamTasks = update?.tasks || [];
                const progressList = teamTasks.filter((t) => t.task_type === 'progress');
                const issueList = teamTasks.filter((t) => t.task_type === 'issue');
                const planList = teamTasks.filter((t) => t.task_type === 'plan');

                return (
                  <div key={team.id} className="border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm hover:border-slate-300 transition break-inside-avoid">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-base font-black text-slate-900">{team.name}</h3>
                        <span className="text-[11px] text-slate-500">{team.description || '주간 업무 회의 보고'}</span>
                      </div>
                      {update ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">보고 제출완료</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-400 rounded">미제출</span>
                      )}
                    </div>
                    {!update ? (
                      <p className="text-xs text-slate-400 py-4 text-center">이번 주차에 등록된 업무 상세 사항이 없습니다.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded">✓ 주요 진행 사항</h4>
                          {progressList.length === 0 ? <p className="text-[11px] text-slate-400 pl-2">진행 업무가 없습니다.</p> : (
                            <ul className="space-y-2 pl-2">
                              {progressList.map((t) => (
                                <li key={t.id} className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                                  <span className="font-bold text-slate-800">{t.title}</span>
                                  {t.progress_percentage > 0 && <span className="ml-1 text-[10px] text-sky-600 font-semibold">({t.progress_percentage}%)</span>}
                                  {t.description && <p className="text-[10px] text-slate-500 pl-4 leading-normal">{t.description}</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded">✓ 주요 이슈 및 장해요인</h4>
                          {issueList.length === 0 ? <p className="text-[11px] text-slate-400 pl-2">특이사항이 없습니다.</p> : (
                            <ul className="space-y-2 pl-2">
                              {issueList.map((t) => (
                                <li key={t.id} className="text-xs text-rose-700 list-disc list-inside space-y-0.5">
                                  <span className="font-bold text-slate-800">{t.title}</span>
                                  {t.description && <p className="text-[10px] text-slate-500 pl-4 leading-normal">{t.description}</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">✓ 차주 업무 계획</h4>
                          {planList.length === 0 ? <p className="text-[11px] text-slate-400 pl-2">다음 주 계획이 없습니다.</p> : (
                            <ul className="space-y-2 pl-2">
                              {planList.map((t) => (
                                <li key={t.id} className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                                  <span className="font-bold text-slate-800">{t.title}</span>
                                  {t.description && <p className="text-[10px] text-slate-500 pl-4 leading-normal">{t.description}</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;
