import { UserProfile } from '../types';

export interface WorkloadRanking {
  id: string;
  name: string;
  email: string | null;
  isOffline: boolean;
  maxConcurrentProjects: number;
  currentConcurrentProjects: number;
}

/**
 * 특정 기간 내에 최대 동시 투입 수를 계산합니다.
 */
const calculatePeakWorkload = (mobilizations: any[], startBoundary?: Date, endBoundary?: Date) => {
  const events: { date: number, type: 'start' | 'end' }[] = [];
  
  mobilizations.forEach(m => {
    const s = new Date(m.start_date).getTime();
    const e = new Date(m.end_date).getTime();
    
    if (startBoundary && endBoundary) {
      if (e < startBoundary.getTime() || s > endBoundary.getTime()) return;
    }
    
    events.push({ date: s, type: 'start' });
    events.push({ date: e, type: 'end' });
  });
  
  events.sort((a, b) => {
    if (a.date === b.date) {
      return a.type === 'end' ? -1 : 1;
    }
    return a.date - b.date;
  });
  
  let currentLoad = 0;
  let peakLoad = 0;
  
  events.forEach(ev => {
    if (ev.type === 'start') currentLoad++;
    else currentLoad--;
    
    if (currentLoad > peakLoad) peakLoad = currentLoad;
  });
  
  return peakLoad;
};

export const calculateWorkloadRanking = (
  mobilizations: any[],
  users: UserProfile[],
  offlinePersonnel: any[]
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
    
    const maxConcurrentProjects = calculatePeakWorkload(personMobs);
    
    const currentConcurrentProjects = personMobs.filter(m => {
      const s = new Date(m.start_date).getTime();
      const e = new Date(m.end_date).getTime();
      return today >= s && today <= e;
    }).length;
    
    return {
      ...person,
      maxConcurrentProjects,
      currentConcurrentProjects
    };
  });
  
  return rankings.sort((a, b) => {
    if (b.currentConcurrentProjects !== a.currentConcurrentProjects) {
      return b.currentConcurrentProjects - a.currentConcurrentProjects;
    }
    return b.maxConcurrentProjects - a.maxConcurrentProjects;
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
  
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  
  const allPersonnel = [
    ...users.map(u => ({ id: u.id, name: u.full_name || '알 수 없음', email: u.email, isOffline: false })),
    ...offlinePersonnel.map(o => ({ id: o.id, name: o.full_name || '알 수 없음', email: null, isOffline: true }))
  ];
  
  const rankings: WorkloadRanking[] = allPersonnel.map(person => {
    const personMobs = mobilizations.filter(m => 
      (person.isOffline ? m.offline_personnel_id === person.id : m.user_id === person.id)
    );
    
    const peakDuringPeriod = calculatePeakWorkload(personMobs, sDate, eDate);
    
    return {
      ...person,
      maxConcurrentProjects: peakDuringPeriod,
      currentConcurrentProjects: 0
    };
  });
  
  return rankings.sort((a, b) => a.maxConcurrentProjects - b.maxConcurrentProjects).slice(0, 5);
};
