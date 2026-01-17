import { useState } from "react";
import { axiosInstance } from "../utils/axios";
import { FiZap, FiRefreshCw, FiClock } from "react-icons/fi";
import { SyncLoader } from "react-spinners";

interface AIGuidance {
  riskLevel: "low" | "medium" | "high";
  riskExplanation: string;
  immediateActions: string[];
  strategicAdvice: string[];
  motivationalMessage: string;
}

interface AIGuidancePanelProps {
  userId: string;
  compact?: boolean;
}

export default function AIGuidancePanel({ userId, compact = false }: AIGuidancePanelProps) {
  const [guidance, setGuidance] = useState<AIGuidance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchGuidance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post("/ai-guidance/analyze", { userId });
      setGuidance(response.data.guidance);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate AI guidance");
      console.error("AI Guidance error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "high":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";
    }
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border border-purple-200 dark:border-purple-800 p-3">
        <button
          onClick={fetchGuidance}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-colors disabled:opacity-50"
        >
          <FiZap className="w-4 h-4" />
          {loading ? "Generating AI Advice..." : "Get AI Attendance Advice"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/10 dark:via-blue-900/10 dark:to-indigo-900/10 rounded-xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <FiZap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI Attendance Advisor</h3>
              <p className="text-purple-100 text-sm">Personalized insights powered by Gemini</p>
            </div>
          </div>
          {!guidance && !loading && (
            <button
              onClick={fetchGuidance}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <FiZap className="w-4 h-4" />
              Get Advice
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <SyncLoader color="#9333ea" size={12} />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">
              Analyzing your attendance...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            <button
              onClick={fetchGuidance}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {guidance && !loading && (
          <div className="space-y-4">
            {/* Risk Assessment */}
            <div className={`rounded-xl border-2 p-4 ${getRiskColor(guidance.riskLevel)}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Risk Level</span>
                <span className="px-2 py-0.5 bg-white dark:bg-black/20 rounded-full text-xs font-bold">
                  {guidance.riskLevel.toUpperCase()}
                </span>
              </div>
              <p className="text-sm leading-relaxed font-medium">{guidance.riskExplanation}</p>
            </div>

            {/* Immediate Actions */}
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between mb-2 text-left"
              >
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span className="text-lg">📌</span>
                  Immediate Actions
                </h4>
                <span className="text-zinc-400">{expanded ? "▼" : "▶"}</span>
              </button>
              {expanded && (
                <ul className="space-y-2 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                  {guidance.immediateActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="text-purple-500 font-bold mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Strategic Advice */}
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                Strategic Plan
              </h4>
              <ul className="space-y-2 bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                {guidance.strategicAdvice.map((advice, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span>{advice}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Motivational Message */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium flex items-start gap-2">
                <span className="text-lg">💪</span>
                <span>{guidance.motivationalMessage}</span>
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <FiClock className="w-3 h-3" />
                <span>
                  Last updated: {lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                onClick={fetchGuidance}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-medium disabled:opacity-50"
              >
                <FiRefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
