import { useMemo } from 'react';
import { X, Printer } from 'lucide-react';

interface YearlyProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  mobilizations: any[];
}

export default function YearlyProjectModal({ isOpen, onClose, projectId, projectName, mobilizations }: YearlyProjectModalProps) {
  const yearlyData = useMemo(() => {
    if (!isOpen || !projectId) return { years: [] };

    const projectMobUsers = new Set<string>();
    mobilizations.forEach(mob => {
      if (mob.project_id === projectId) {
        const pId = mob.user_id || mob.offline_personnel_id;
        if (pId) projectMobUsers.add(pId);
      }
    });

    if (projectMobUsers.size === 0) return { years: [] };

    const yearlyPersonHours = new Map<number, Map<string, number>>();
    const personDetails = new Map<string, { name: string, isOffline: boolean }>();

    mobilizations.forEach(mob => {
      const pId = mob.user_id || mob.offline_personnel_id;
      if (pId && projectMobUsers.has(pId)) {
        if (!personDetails.has(pId)) {
          personDetails.set(pId, {
            name: mob.user ? mob.user.full_name : (mob.offline ? mob.offline.full_name : '알 수 없음'),
            isOffline: !mob.user_id
          });
        }
      }
    });

    let minTime = Infinity;
    let maxTime = -Infinity;
    mobilizations.forEach(mob => {
      if (mob.project_id === projectId) {
        const s = new Date(mob.start_date).getTime();
        const e = new Date(mob.end_date).getTime();
        if (s < minTime) minTime = s;
        if (e > maxTime) maxTime = e;
      }
    });

    if (minTime === Infinity) return { years: [] };

    const startDay = new Date(minTime);
    startDay.setHours(0,0,0,0);
    const endDay = new Date(maxTime);
    endDay.setHours(0,0,0,0);

    const relevantMobs = mobilizations.filter(mob => {
      const pId = mob.user_id || mob.offline_personnel_id;
      return pId && projectMobUsers.has(pId);
    });

    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const time = d.getTime();
      const dayPersonProjects = new Map<string, Set<string>>();

      relevantMobs.forEach(mob => {
        const s = new Date(mob.start_date).setHours(0,0,0,0);
        const e = new Date(mob.end_date).setHours(0,0,0,0);
        if (time >= s && time <= e) {
          const pId = mob.user_id || mob.offline_personnel_id;
          if (pId) {
            if (!dayPersonProjects.has(pId)) {
              dayPersonProjects.set(pId, new Set());
            }
            dayPersonProjects.get(pId)!.add(mob.project_id);
          }
        }
      });

      const year = d.getFullYear();

      dayPersonProjects.forEach((projSet, pId) => {
        if (projSet.has(projectId)) {
          const n = projSet.size;
          const hoursForTargetProj = 8 / n;

          if (!yearlyPersonHours.has(year)) {
            yearlyPersonHours.set(year, new Map());
          }
          
          const yearMap = yearlyPersonHours.get(year)!;
          yearMap.set(pId, (yearMap.get(pId) || 0) + hoursForTargetProj);
        }
      });
    }

    const result = Array.from(yearlyPersonHours.entries()).map(([year, personMap]) => {
      let yearTotal = 0;
      const personsBreakdown = Array.from(personMap.entries()).map(([pId, hours]) => {
        yearTotal += hours;
        return { details: personDetails.get(pId)!, hours };
      }).sort((a, b) => b.hours - a.hours);

      return { year, yearTotal, personsBreakdown };
    }).sort((a, b) => b.year - a.year);

    return { years: result };
  }, [isOpen, projectId, mobilizations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl flex flex-col shadow-2xl max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-white print-text-black">
            {projectName} <span className="text-slate-400 text-sm font-medium ml-2">연도별 누적 M/H</span>
          </h2>
          <div className="flex items-center space-x-2 print:hidden">
            <button 
              onClick={() => window.print()}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="인쇄"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 print-content print-bg-white">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-content, .print-content * { visibility: visible; }
              .print-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; }
              .print-text-black { color: black !important; }
              .print-border-gray { border-color: #ccc !important; }
              .print-bg-gray { background-color: #f3f4f6 !important; }
              .print-bg-white { background-color: #ffffff !important; }
            }
          `}</style>
          
          <h1 className="hidden print:block text-2xl font-bold mb-6 text-black border-b pb-4">
            {projectName} 연도별 누적 Man/Hour 현황
          </h1>

          {yearlyData.years.length === 0 ? (
            <div className="text-center py-10 text-slate-500 print-text-black">
              투입 이력이 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
              {yearlyData.years.map((yearData) => (
                <div key={yearData.year} className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden print-border-gray">
                  <div className="bg-slate-800 px-4 py-3 flex justify-between items-center print-bg-gray print-text-black">
                    <h3 className="text-lg font-bold text-sky-400 print-text-black">{yearData.year}년</h3>
                    <div className="text-emerald-400 font-bold font-mono print-text-black text-base">
                      총 {Number.isInteger(yearData.yearTotal) ? yearData.yearTotal : yearData.yearTotal.toFixed(1)} 시간
                    </div>
                  </div>
                  <div className="p-4 print-bg-white">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr>
                          <th className="pb-2 font-medium text-slate-400 print-text-black border-b border-slate-700 print-border-gray w-2/3">투입 인원</th>
                          <th className="pb-2 font-medium text-slate-400 print-text-black border-b border-slate-700 print-border-gray text-right w-1/3">누적 시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearData.personsBreakdown.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-700/30 print-border-gray last:border-0">
                            <td className="py-2.5 text-slate-300 print-text-black flex items-center gap-1.5">
                              {p.details.name}
                              {p.details.isOffline && <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1 rounded border border-amber-500/30 font-medium">미가입</span>}
                            </td>
                            <td className="py-2.5 text-slate-300 print-text-black font-mono text-right">
                              {Number.isInteger(p.hours) ? p.hours : p.hours.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
