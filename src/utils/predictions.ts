import type { Subject } from "../pages/Dashboard";

export interface PredictionResult {
  subjectId: string;
  subjectName: string;
  
  // Current state
  currentAttended: number;
  currentTotal: number;
  currentPercentage: number;
  
  // Future projections
  remainingClasses: number;
  
  // Scenario 1: Perfect attendance
  projectedAttended: number;
  projectedTotal: number;
  projectedPercentage: number;
  
  // Scenario 2: After X absences
  afterAbsences: {
    absences: number;
    attended: number;
    total: number;
    percentage: number;
  };
  
  // Recovery analysis
  status: 'safe' | 'at-risk' | 'shortage';
  classesNeededToReachGoal: number | null;
  canRecover: boolean;
  recoveryMessage: string;
  maxAbsencesAllowed: number; // How many more classes can be missed while staying safe
}

export interface OverallPrediction {
  currentPercentage: number;
  projectedPercentage: number;
  afterAbsencesPercentage: number;
  status: 'safe' | 'at-risk' | 'shortage';
  totalAttended: number;
  totalHeld: number;
  totalRemaining: number;
}

export function calculatePrediction(
  subject: Subject,
  remainingWeeks: number,
  minAttendance: number,
  simulatedAbsences: number = 0
): PredictionResult {
  const remainingClasses = subject.classesPerWeek * remainingWeeks;
  
  // Perfect attendance scenario
  const projectedAttended = subject.attended + remainingClasses;
  const projectedTotal = subject.totalHeld + remainingClasses;
  const projectedPercentage = projectedTotal > 0 ? (projectedAttended / projectedTotal) * 100 : 0;
  
  // After X absences scenario
  const attendedAfterAbsences = subject.attended + Math.max(0, remainingClasses - simulatedAbsences);
  const totalAfterAbsences = subject.totalHeld + remainingClasses;
  const percentageAfterAbsences = totalAfterAbsences > 0 ? (attendedAfterAbsences / totalAfterAbsences) * 100 : 0;
  
  // Calculate classes needed to reach goal
  // Formula: (attended + x) / (totalHeld + remainingClasses) >= minAttendance / 100
  // Solve for x: x >= (minAttendance/100 * (totalHeld + remaining)) - attended
  const requiredAttended = (minAttendance / 100) * projectedTotal;
  const classesNeeded = Math.ceil(requiredAttended - subject.attended);
  const canRecover = classesNeeded <= remainingClasses;
  
  // Calculate max absences allowed while staying safe
  // (attended + remainingClasses - maxAbsences) / (totalHeld + remainingClasses) >= minAttendance / 100
  // maxAbsences <= attended + remainingClasses - (minAttendance/100 * (totalHeld + remainingClasses))
  const maxAbsencesAllowed = Math.max(0, Math.floor(projectedAttended - requiredAttended));
  
  // Determine status
  let status: 'safe' | 'at-risk' | 'shortage';
  const currentPercentage = subject.totalHeld > 0 ? (subject.attended / subject.totalHeld) * 100 : 0;
  
  if (projectedPercentage >= minAttendance) {
    status = 'safe';
  } else if (canRecover && projectedPercentage >= minAttendance - 5) {
    status = 'at-risk';
  } else {
    status = 'shortage';
  }
  
  // Generate helpful message
  let recoveryMessage = '';
  if (status === 'safe') {
    if (maxAbsencesAllowed === 0) {
      recoveryMessage = `Perfect! You must attend all remaining ${remainingClasses} classes to maintain ${minAttendance}%`;
    } else if (maxAbsencesAllowed === 1) {
      recoveryMessage = `You can miss 1 more class and still maintain ${minAttendance}%`;
    } else {
      recoveryMessage = `You can miss up to ${maxAbsencesAllowed} more classes and still maintain ${minAttendance}%`;
    }
  } else if (canRecover) {
    recoveryMessage = `Attend the next ${classesNeeded} consecutive classes to reach ${minAttendance}%`;
  } else {
    recoveryMessage = `Recovery not possible - projected final: ${projectedPercentage.toFixed(1)}%`;
  }
  
  return {
    subjectId: subject.id,
    subjectName: subject.name,
    currentAttended: subject.attended,
    currentTotal: subject.totalHeld,
    currentPercentage,
    remainingClasses,
    projectedAttended,
    projectedTotal,
    projectedPercentage,
    afterAbsences: {
      absences: simulatedAbsences,
      attended: attendedAfterAbsences,
      total: totalAfterAbsences,
      percentage: percentageAfterAbsences,
    },
    status,
    classesNeededToReachGoal: canRecover ? classesNeeded : null,
    canRecover,
    recoveryMessage,
    maxAbsencesAllowed,
  };
}

export function calculateOverallPrediction(
  subjects: Subject[],
  remainingWeeks: number,
  minAttendance: number,
  simulatedAbsences: number = 0
): OverallPrediction {
  let totalAttended = 0;
  let totalHeld = 0;
  let totalRemaining = 0;
  let totalProjectedAttended = 0;
  let totalProjectedHeld = 0;
  let totalAfterAbsencesAttended = 0;
  let totalAfterAbsencesHeld = 0;
  
  subjects.forEach(subject => {
    const remainingClasses = subject.classesPerWeek * remainingWeeks;
    
    totalAttended += subject.attended;
    totalHeld += subject.totalHeld;
    totalRemaining += remainingClasses;
    
    // Perfect attendance
    totalProjectedAttended += subject.attended + remainingClasses;
    totalProjectedHeld += subject.totalHeld + remainingClasses;
    
    // After absences (distribute proportionally)
    const subjectAbsences = Math.floor((remainingClasses / totalRemaining) * simulatedAbsences);
    totalAfterAbsencesAttended += subject.attended + Math.max(0, remainingClasses - subjectAbsences);
    totalAfterAbsencesHeld += subject.totalHeld + remainingClasses;
  });
  
  const currentPercentage = totalHeld > 0 ? (totalAttended / totalHeld) * 100 : 0;
  const projectedPercentage = totalProjectedHeld > 0 ? (totalProjectedAttended / totalProjectedHeld) * 100 : 0;
  const afterAbsencesPercentage = totalAfterAbsencesHeld > 0 ? (totalAfterAbsencesAttended / totalAfterAbsencesHeld) * 100 : 0;
  
  let status: 'safe' | 'at-risk' | 'shortage';
  if (projectedPercentage >= minAttendance) {
    status = 'safe';
  } else if (projectedPercentage >= minAttendance - 5) {
    status = 'at-risk';
  } else {
    status = 'shortage';
  }
  
  return {
    currentPercentage,
    projectedPercentage,
    afterAbsencesPercentage,
    status,
    totalAttended,
    totalHeld,
    totalRemaining,
  };
}
