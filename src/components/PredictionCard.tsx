import type { PredictionResult } from "../utils/predictions";
import StatusIndicator from "./StatusIndicator";
import RecoveryBadge from "./RecoveryBadge";

interface PredictionCardProps {
  prediction: PredictionResult;
  showAbsenceScenario?: boolean;
}

export default function PredictionCard({ prediction, showAbsenceScenario = false }: PredictionCardProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
          {prediction.subjectName}
        </h4>
        <StatusIndicator status={prediction.status} size="sm" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
            Current
          </p>
          <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">
            {prediction.currentPercentage.toFixed(1)}%
          </p>
          <p className="text-[10px] text-zinc-500">
            {prediction.currentAttended}/{prediction.currentTotal}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
            Projected
          </p>
          <p className={`text-lg font-black ${
            prediction.projectedPercentage >= 75 
              ? 'text-green-500' 
              : prediction.projectedPercentage >= 70 
              ? 'text-yellow-500' 
              : 'text-red-500'
          }`}>
            {prediction.projectedPercentage.toFixed(1)}%
          </p>
          <p className="text-[10px] text-zinc-500">
            if perfect
          </p>
        </div>

        {showAbsenceScenario && prediction.afterAbsences.absences > 0 && (
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
              After {prediction.afterAbsences.absences} {prediction.afterAbsences.absences === 1 ? 'absence' : 'absences'}
            </p>
            <p className={`text-lg font-black ${
              prediction.afterAbsences.percentage >= 75 
                ? 'text-green-500' 
                : prediction.afterAbsences.percentage >= 70 
                ? 'text-yellow-500' 
                : 'text-red-500'
            }`}>
              {prediction.afterAbsences.percentage.toFixed(1)}%
            </p>
          </div>
        )}

        {!showAbsenceScenario && (
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
              Remaining
            </p>
            <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              {prediction.remainingClasses}
            </p>
            <p className="text-[10px] text-zinc-500">
              classes
            </p>
          </div>
        )}
      </div>

      {/* Recovery Message */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-2.5 mb-3">
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {prediction.recoveryMessage}
        </p>
      </div>

      {/* Recovery Badge */}
      {prediction.classesNeededToReachGoal !== null && prediction.classesNeededToReachGoal > 0 && (
        <div className="flex justify-center">
          <RecoveryBadge 
            count={prediction.classesNeededToReachGoal} 
            variant={prediction.status === 'at-risk' ? 'warning' : 'info'}
          />
        </div>
      )}
    </div>
  );
}
