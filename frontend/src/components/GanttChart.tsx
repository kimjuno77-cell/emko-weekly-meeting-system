import React, { useMemo } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, eachMonthOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, differenceInDays, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type ViewMode = 'month' | 'week';

export interface GanttTask {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  colorClass?: string;
  onClick?: () => void;
}

export interface GanttItem {
  id: string;
  label: string;
  subLabel?: string;
  tasks: GanttTask[];
}

interface GanttChartProps {
  items: GanttItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  title?: string;
}

const GanttChart: React.FC<GanttChartProps> = ({
  items,
  viewMode,
  onViewModeChange,
  currentDate,
  onDateChange,
  title = '간트차트'
}) => {
  // Calculate the time window (e.g. 6 months or 12 weeks)
  const timeWindow = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfMonth(subMonths(currentDate, 2));
      const end = endOfMonth(addMonths(currentDate, 3));
      return { start, end };
    } else {
      const start = startOfWeek(subWeeks(currentDate, 2), { weekStartsOn: 1 });
      const end = endOfWeek(addWeeks(currentDate, 6), { weekStartsOn: 1 });
      return { start, end };
    }
  }, [currentDate, viewMode]);

  const totalDays = differenceInDays(timeWindow.end, timeWindow.start) + 1;

  // Generate headers
  const headers = useMemo(() => {
    if (viewMode === 'month') {
      return eachMonthOfInterval({ start: timeWindow.start, end: timeWindow.end }).map(month => ({
        label: format(month, 'yyyy년 M월', { locale: ko }),
        date: month,
        days: differenceInDays(endOfMonth(month), startOfMonth(month)) + 1
      }));
    } else {
      return eachWeekOfInterval({ start: timeWindow.start, end: timeWindow.end }, { weekStartsOn: 1 }).map(week => ({
        label: format(week, 'M/d') + ' 주차',
        date: week,
        days: 7
      }));
    }
  }, [timeWindow, viewMode]);

  const handlePrev = () => {
    onDateChange(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const handleNext = () => {
    onDateChange(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
        <h3 className="font-bold text-slate-800 text-base">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1.5 ${viewMode === 'week' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              주(Week)
            </button>
            <div className="w-px bg-slate-200"></div>
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1.5 ${viewMode === 'month' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              월(Month)
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={handlePrev} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600">
              오늘
            </button>
            <button onClick={handleNext} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Chart Content */}
      <div className="overflow-x-auto flex-1 relative">
        <div className="min-w-[800px] flex flex-col">
          {/* Time Headers */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 sticky top-0 z-10">
            <div className="w-48 sm:w-64 flex-shrink-0 p-3 border-r border-slate-200 flex items-center">
              항목
            </div>
            <div className="flex-1 flex">
              {headers.map((header, idx) => (
                <div 
                  key={idx} 
                  className="flex-shrink-0 border-r border-slate-200 p-2 text-center"
                  style={{ width: `${(header.days / totalDays) * 100}%` }}
                >
                  {header.label}
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">표시할 데이터가 없습니다.</div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id} className={`flex border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                  {/* Row Label */}
                  <div className="w-48 sm:w-64 flex-shrink-0 p-3 border-r border-slate-200 flex flex-col justify-center">
                    <div className="font-bold text-slate-800 text-sm truncate" title={item.label}>{item.label}</div>
                    {item.subLabel && <div className="text-[10px] text-slate-500 truncate" title={item.subLabel}>{item.subLabel}</div>}
                  </div>
                  
                  {/* Timeline Area */}
                  <div className="flex-1 relative min-h-[48px] py-2">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {headers.map((header, hIdx) => (
                        <div 
                          key={hIdx} 
                          className="border-r border-slate-100/50 h-full"
                          style={{ width: `${(header.days / totalDays) * 100}%` }}
                        ></div>
                      ))}
                    </div>

                    {/* Today Indicator */}
                    {(() => {
                      const today = new Date();
                      if (today >= timeWindow.start && today <= timeWindow.end) {
                        const leftPerc = (differenceInDays(today, timeWindow.start) / totalDays) * 100;
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-rose-400 z-0 pointer-events-none"
                            style={{ left: `${leftPerc}%` }}
                          ></div>
                        );
                      }
                      return null;
                    })()}

                    {/* Tasks */}
                    {(() => {
                      // Calculate tracks to prevent overlapping
                      const tasksWithPos = item.tasks
                        .filter(t => t.startDate)
                        .map(task => {
                          const tStart = parseISO(task.startDate);
                          const tEnd = task.endDate ? parseISO(task.endDate) : tStart;
                          return { ...task, tStart, tEnd, trackIdx: 0 };
                        })
                        .filter(t => !(t.tEnd < timeWindow.start || t.tStart > timeWindow.end))
                        .sort((a, b) => a.tStart.getTime() - b.tStart.getTime());
                        
                      const tracks: typeof tasksWithPos[] = [];
                      tasksWithPos.forEach(task => {
                        let placed = false;
                        for (let i = 0; i < tracks.length; i++) {
                          const track = tracks[i];
                          const lastTaskInTrack = track[track.length - 1];
                          // If there's at least 1 day gap, put in same track
                          if (lastTaskInTrack.tEnd < task.tStart) {
                            track.push(task);
                            task.trackIdx = i;
                            placed = true;
                            break;
                          }
                        }
                        if (!placed) {
                          task.trackIdx = tracks.length;
                          tracks.push([task]);
                        }
                      });

                      const maxTrack = tracks.length;
                      
                      return (
                        <div className="relative w-full" style={{ minHeight: `${Math.max(1, maxTrack) * 32 + 16}px` }}>
                          {/* Background Grid Lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {headers.map((header, hIdx) => (
                              <div 
                                key={hIdx} 
                                className="border-r border-slate-100/50 h-full"
                                style={{ width: `${(header.days / totalDays) * 100}%` }}
                              ></div>
                            ))}
                          </div>

                          {/* Today Indicator */}
                          {(() => {
                            const today = new Date();
                            if (today >= timeWindow.start && today <= timeWindow.end) {
                              const leftPerc = (differenceInDays(today, timeWindow.start) / totalDays) * 100;
                              return (
                                <div 
                                  className="absolute top-0 bottom-0 w-px bg-rose-400 z-0 pointer-events-none"
                                  style={{ left: `${leftPerc}%` }}
                                ></div>
                              );
                            }
                            return null;
                          })()}
                          
                          {tasksWithPos.map((task, tIdx) => {
                            const visibleStart = task.tStart < timeWindow.start ? timeWindow.start : task.tStart;
                            const visibleEnd = task.tEnd > timeWindow.end ? timeWindow.end : task.tEnd;
                            
                            const leftPerc = (differenceInDays(visibleStart, timeWindow.start) / totalDays) * 100;
                            const widthPerc = ((differenceInDays(visibleEnd, visibleStart) + 1) / totalDays) * 100;
                            
                            const roundedClass = [];
                            if (task.tStart >= timeWindow.start) roundedClass.push('rounded-l-md');
                            if (task.tEnd <= timeWindow.end) roundedClass.push('rounded-r-md');
                            
                            return (
                              <div
                                key={task.id || tIdx}
                                onClick={task.onClick}
                                className={`absolute h-7 flex items-center px-2 text-[10px] font-bold text-white overflow-hidden shadow-sm hover:shadow-md hover:brightness-110 transition-all cursor-pointer z-10 ${roundedClass.join(' ')} ${task.colorClass || 'bg-indigo-500'}`}
                                style={{ 
                                  top: `${(task.trackIdx || 0) * 32 + 8}px`,
                                  left: `${Math.max(0, leftPerc)}%`, 
                                  width: `${Math.min(100 - leftPerc, widthPerc)}%`,
                                }}
                                title={`${task.name} (${task.startDate} ~ ${task.endDate || '미정'})`}
                              >
                                <span className="truncate drop-shadow-sm">{task.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
