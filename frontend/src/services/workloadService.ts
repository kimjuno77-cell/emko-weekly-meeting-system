import { UserProfile } from '../types';

export interface WorkloadRanking {
  id: string;
  name: string;
  email: string | null;
  isOffline: boolean;
  cumulativeHours: number;
  currentConcurrentProjects: number;
}

function calculateManHours(personMobs: any[], startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  
  let totalHours = 0;
  const startDay = new Date(startDateStr);
  startDay.setHours(0,0,0,0);
  const endDay = new Date(endDateStr);
  endDay.setHours(0,0,0,0);
  
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const time = d.getTime();
    const activeProjects = new Set<string>();
    
    for (const mob of personMobs) {
      const s = new Date(mob.start_date).setHours(0,0,0,0);
      const e = new Date(mob.end_date).setHours(0,0,0,0);
      if (time >= s && time <= e) {
        activeProjects.add(mob.project_id);
      }
    }
    
    if (activeProjects.size > 0) {
      totalHours += 8;
    }
  }
  return totalHours;
}

export const calculateWorkloadRanking = (
  mobilizations: any[],
  users: UserProfile[],
  offlinePersonnel: any[],
  weekStartDate: string,
  weekEndDate: string
): WorkloadRanking[] => {
  const allPersonnel = [
    ...users.map(u => ({ id: u.id, name: u.full_name || '알 수 없음', email: u.email, isOffline: false })),
    ...offlinePersonnel.map(o => ({ id: o.id, name: o.full_name || '알 수 없음', email: null, isOffline: true }))
  ];
  
  const today = new Date().getTime();

  const rankings: WorkloadRanking[] = allPersonnel.map(person => {
    const personMobs = mobilizations.filter(m => 
      (person.isOffline ? m.offline_personnel_id === person.id : m.user_id === person.id)
    );
    
    const cumulativeHours = calculateManHours(personMobs, weekStartDate, weekEndDate);
    
    const currentConcurrentProjects = personMobs.filter(m => {
      const s = new Date(m.start_date).getTime();
      const e = new Date(m.end_date).getTime();
      return today >= s && today <= e;
    }).length;
    
    return {
      ...person,
      cumulativeHours,
      currentConcurrentProjects
    };
  });
  
  // 누적 시간이 높은 순서 -> 동일하면 중복 프로젝트가 많은 순서
  return rankings.sort((a, b) => {
    if (b.cumulativeHours !== a.cumulativeHours) {
      return b.cumulativeHours - a.cumulativeHours;
    }
    return b.currentConcurrentProjects - a.currentConcurrentProjects;
  });
};

export const recommendPersonnel = (
  startDate: string,
  endDate: string,
  mobilizations: any[],
  users: UserProfile[],
  offlinePersonnel: any[]
): WorkloadRanking[] => {
  if (!startDate || !endDate) return [];
  
  const allPersonnel = [
    ...users.map(u => ({ id: u.id, name: u.full_name || '알 수 없음', email: u.email, isOffline: false })),
    ...offlinePersonnel.map(o => ({ id: o.id, name: o.full_name || '알 수 없음', email: null, isOffline: true }))
  ];
  
  const rankings: WorkloadRanking[] = allPersonnel.map(person => {
    const personMobs = mobilizations.filter(m => 
      (person.isOffline ? m.offline_personnel_id === person.id : m.user_id === person.id)
    );
    
    const cumulativeHours = calculateManHours(personMobs, startDate, endDate);
    
    return {
      ...person,
      cumulativeHours,
      currentConcurrentProjects: 0
    };
  });
  
  // 누적 시간이 가장 적은 순서 (여유가 많은 사람 우선 추천)
  return rankings.sort((a, b) => a.cumulativeHours - b.cumulativeHours).slice(0, 5);
};
