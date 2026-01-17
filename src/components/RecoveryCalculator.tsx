import { useState } from "react";
import type { Subject } from "../pages/Dashboard";
import { FiTarget, FiTrendingUp } from "react-icons/fi";

interface RecoveryCalculatorProps {
  subjects: Subject[];
  minAttendance: number;
  remainingWeeks: number;
}

interface RecoveryInfo {
  subjectId: string;
  subjectName: string;
  currentPercentage: number;
  classesNeeded: number;
  canRecover: boolean;
  remainingClasses: number;
  afterRecoveryPercentage: number;
  attended: number;
  totalHeld: number;
}

export default function RecoveryCalculator({ subjects, minAttendance, remainingWeeks }: RecoveryCalculatorProps) {
  const [showOnlyAtRisk, setShowOnlyAtRisk] = useState(true);

  // Calculate recovery info for each subject
  const recoveryData: RecoveryInfo[] = subjects
    .map(subject => {
      const remainingClasses = subject.classesPerWeek * remainingWeeks;
      const currentPercentage = subject.totalHeld > 0 ? (subject.attended / subject.totalHeld) * 100 : 0;
      
      // Calculate classes needed to reach minAttendance
      const projectedTotal = subject.totalHeld + remainingClasses;
      const requiredAttended = (minAttendance / 100) * projectedTotal;
      const classesNeeded = Math.ceil(requiredAttended - subject.attended);
      const canRecover = classesNeeded <= remainingClasses && classesNeeded >= 0;
      
      // Calculate percentage after attending needed classes
      const afterRecoveryAttended = subject.attended + (canRecover ? classesNeeded : remainingClasses);
      const afterRecoveryTotal = subject.totalHeld + (canRecover ? classesNeeded : remainingClasses);
      const afterRecoveryPercentage = afterRecoveryTotal > 0 ? (afterRecoveryAttended / afterRecoveryTotal) * 100 : 0;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        currentPercentage,
        classesNeeded: Math.max(0, classesNeeded),
        canRecover,
        remainingClasses,
        afterRecoveryPercentage,
        attended: subject.attended,
        totalHeld: subject.totalHeld,
      };
    })
    .filter(data => !showOnlyAtRisk || data.currentPercentage < minAttendance)
    .sort((a, b) => a.currentPercentage - b.currentPercentage); // Sort by most critical first

  if (recoveryData.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-2">
          <FiTrendingUp className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-green-700 dark:text-green-300 font-semibold mb-1">
          All subjects are on track! 🎉
        </p>
        <p className="text-sm text-green-600 dark:text-green-400">
          You're meeting the {minAttendance}% goal across all subjects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiTarget className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Recovery Calculator
          </h3>
        </div>
        <button
          onClick={() => setShowOnlyAtRisk(!showOnlyAtRisk)}
          className="text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {showOnlyAtRisk ? 'Show All' : 'Show At Risk Only'}
        </button>
      </div>

      {/* Recovery Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {recoveryData.map(data => (
          <div
            key={data.subjectId}
            className={`rounded-xl border p-4 ${
              data.canRecover
                ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            }`}
          >
            {/* Subject Name */}
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                {data.subjectName}
              </h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                data.canRecover
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {data.canRecover ? 'Recoverable' : 'Critical'}
              </span>
            </div>

            {/* Current Status */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mb-0.5">
                  Current
                </p>
                <p className="text-xl font-black text-red-500">
                  {data.currentPercentage.toFixed(1)}%
                </p>
                <p className="text-[10px] text-zinc-500">
                  {data.attended}/{data.totalHeld} classes
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase mb-0.5">
                  Target
                </p>
                <p className="text-xl font-black text-green-500">
                  {minAttendance}%
                </p>
                <p className="text-[10px] text-zinc-500">
                  goal
                </p>
              </div>
            </div>

            {/* Recovery Plan */}
            {data.canRecover ? (
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    Classes to attend consecutively:
                  </span>
                  <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                    {data.classesNeeded}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    After recovery:
                  </span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {data.afterRecoveryPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                    style={{ width: `${(data.classesNeeded / data.remainingClasses) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 text-center">
                  {data.classesNeeded} out of {data.remainingClasses} remaining classes
                </p>
              </div>
            ) : (
              <div className="bg-red-100 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium text-center">
                  ⚠️ Recovery not possible
                </p>
                <p className="text-[10px] text-red-600 dark:text-red-400 text-center mt-1">
                  Even with perfect attendance, max achievable: {data.afterRecoveryPercentage.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>💡 Pro tip:</strong> The calculator shows the minimum number of consecutive classes you need to attend to reach {minAttendance}%. 
          Missing even one class during recovery will require additional classes.
        </p>
      </div>
    </div>
  );
}
