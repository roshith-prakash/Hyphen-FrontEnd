import { useState } from "react";
import { calculatePrediction, calculateOverallPrediction } from "../utils/predictions";
import PredictionCard from "./PredictionCard";
import StatusIndicator from "./StatusIndicator";
import type { Subject } from "../pages/Dashboard";

interface AttendancePredictorProps {
  subjects: Subject[];
  timetable: {
    totalWeeks: number;
    completedWeeks: number;
    minAttendance: number;
  };
  mode?: 'compact' | 'detailed';
}

export default function AttendancePredictor({ subjects, timetable, mode = 'detailed' }: AttendancePredictorProps) {
  const [viewMode, setViewMode] = useState<'subjects' | 'overall'>('subjects');
  const [simulatedAbsences, setSimulatedAbsences] = useState(0);
  const [customAbsences, setCustomAbsences] = useState<string>('');

  const remainingWeeks = timetable.totalWeeks - timetable.completedWeeks;

  // Calculate predictions for all subjects
  const predictions = subjects.map(subject =>
    calculatePrediction(subject, remainingWeeks, timetable.minAttendance, simulatedAbsences)
  );

  // Calculate overall prediction
  const overallPrediction = calculateOverallPrediction(
    subjects,
    remainingWeeks,
    timetable.minAttendance,
    simulatedAbsences
  );

  const handleAbsenceChange = (value: string) => {
    if (value === 'custom') {
      setCustomAbsences('');
    } else {
      const absences = parseInt(value);
      setSimulatedAbsences(isNaN(absences) ? 0 : absences);
      setCustomAbsences('');
    }
  };

  const handleCustomAbsenceSubmit = () => {
    const absences = parseInt(customAbsences);
    if (!isNaN(absences) && absences >= 0) {
      setSimulatedAbsences(absences);
    }
  };

  if (mode === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Projected (perfect attendance)
          </span>
          <span className={`text-sm font-bold ${
            overallPrediction.projectedPercentage >= timetable.minAttendance 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {overallPrediction.projectedPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${
              overallPrediction.projectedPercentage >= timetable.minAttendance 
                ? 'bg-green-500' 
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, overallPrediction.projectedPercentage)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* View Toggle */}
        <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('subjects')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'subjects'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            By Subject
          </button>
          <button
            onClick={() => setViewMode('overall')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'overall'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Overall
          </button>
        </div>

        {/* Absence Simulator */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            Simulate:
          </label>
          <select
            value={customAbsences ? 'custom' : simulatedAbsences}
            onChange={(e) => handleAbsenceChange(e.target.value)}
            className="text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <option value="0">Perfect Attendance</option>
            <option value="1">After 1 Absence</option>
            <option value="2">After 2 Absences</option>
            <option value="3">After 3 Absences</option>
            <option value="5">After 5 Absences</option>
            <option value="custom">Custom...</option>
          </select>
          {customAbsences !== '' && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={customAbsences}
                onChange={(e) => setCustomAbsences(e.target.value)}
                placeholder="Enter absences"
                className="w-24 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5"
              />
              <button
                onClick={handleCustomAbsenceSubmit}
                className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm rounded-lg hover:opacity-90"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'subjects' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {predictions.map(prediction => (
            <PredictionCard
              key={prediction.subjectId}
              prediction={prediction}
              showAbsenceScenario={simulatedAbsences > 0}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Overall Attendance
              </h3>
              <StatusIndicator status={overallPrediction.status} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Current
                </p>
                <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                  {overallPrediction.currentPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {overallPrediction.totalAttended}/{overallPrediction.totalHeld} classes
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  Projected
                </p>
                <p className={`text-3xl font-black ${
                  overallPrediction.projectedPercentage >= timetable.minAttendance
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}>
                  {overallPrediction.projectedPercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  if perfect
                </p>
              </div>

              {simulatedAbsences > 0 && (
                <div className="text-center">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    After {simulatedAbsences}
                  </p>
                  <p className={`text-3xl font-black ${
                    overallPrediction.afterAbsencesPercentage >= timetable.minAttendance
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}>
                    {overallPrediction.afterAbsencesPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {simulatedAbsences === 1 ? 'absence' : 'absences'}
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">Attendance Progress</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {overallPrediction.totalRemaining} classes remaining
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    overallPrediction.projectedPercentage >= timetable.minAttendance
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, overallPrediction.projectedPercentage)}%` }}
                />
              </div>
            </div>

            {/* Status Message */}
            <div className={`rounded-lg p-4 ${
              overallPrediction.status === 'safe'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : overallPrediction.status === 'at-risk'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <p className={`text-sm font-medium ${
                overallPrediction.status === 'safe'
                  ? 'text-green-700 dark:text-green-300'
                  : overallPrediction.status === 'at-risk'
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {overallPrediction.status === 'safe' && simulatedAbsences === 0 && (
                  `You're on track! Attending all ${overallPrediction.totalRemaining} remaining classes will give you ${overallPrediction.projectedPercentage.toFixed(1)}%.`
                )}
                {overallPrediction.status === 'safe' && simulatedAbsences > 0 && (
                  `Even with ${simulatedAbsences} ${simulatedAbsences === 1 ? 'absence' : 'absences'}, you'll have ${overallPrediction.afterAbsencesPercentage.toFixed(1)}% - still above the ${timetable.minAttendance}% goal!`
                )}
                {overallPrediction.status === 'at-risk' && (
                  `Attention needed! You need to attend most remaining classes to reach ${timetable.minAttendance}%.`
                )}
                {overallPrediction.status === 'shortage' && (
                  `Critical: Even with perfect attendance, you'll only reach ${overallPrediction.projectedPercentage.toFixed(1)}%. Focus on individual subjects that can still recover.`
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
