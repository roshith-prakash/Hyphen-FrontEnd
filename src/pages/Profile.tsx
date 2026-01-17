import { useDBUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { axiosInstance } from "../utils/axios";
import { auth } from "../firebase/firebase";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import { FiCalendar, FiClock, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { SyncLoader } from "react-spinners";
import AttendancePredictor from "../components/AttendancePredictor";

// Types
interface TimeSlot {
  id: string;
  timeStart: string;
  timeEnd: string;
  type: string;
  subject?: string;
  faculty?: string;
  room?: string;
  batch: string;
  sessions?: Array<{
    batch: string;
    subject: string;
    faculty?: string;
    room?: string;
  }>;
}

interface DaySchedule {
  id: string;
  day: string;
  slots: TimeSlot[];
}

import type { Subject } from "./Dashboard";

interface Timetable {
  id: string;
  program: string;
  semester: string;
  effectiveDate: string;
  totalWeeks: number;
  completedWeeks: number;
  minAttendance: number;
  userBatch: string;
  documentUrl: string;
  schedule: DaySchedule[];
  subjects: Subject[];
  createdAt: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { dbUser, setDbUser } = useDBUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    document.title = `${dbUser?.name || "Profile"} | Smart Attendance`;
  }, [dbUser]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const fetchTimetable = async () => {
      if (!dbUser?.id) {
        setIsLoadingTimetable(false);
        return;
      }

      try {
        const response = await axiosInstance.post("/timetable", {
          userId: dbUser.id,
        });
        setTimetable(response.data.timetable);
      } catch {
        setTimetable(null);
      } finally {
        setIsLoadingTimetable(false);
      }
    };

    if (dbUser?.id) {
      fetchTimetable();
    }
  }, [dbUser?.id]);

  const deleteUser = async () => {
    setIsDeleting(true);
    const user = auth.currentUser;

    try {
      await user?.delete();
      await axiosInstance.post("/user/delete-user", { userId: dbUser?.id });
      toast.success("Account deleted");
      setDbUser(null);
      navigate("/");
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (String(err?.message).includes("auth/requires-recent-login")) {
        toast.error("Please login again before deleting");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const sortedSchedule = timetable?.schedule?.sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  );

  // Calculate total attendance
  const totalAttended = timetable?.subjects?.reduce((acc, sub) => acc + sub.attended, 0) || 0;
  const totalHeld = timetable?.subjects?.reduce((acc, sub) => acc + sub.totalHeld, 0) || 0;
  const totalPercentage = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;
  const isAtRisk = totalPercentage < (timetable?.minAttendance || 75);

  // Calculate semester dates
  const currentWeek = (timetable?.completedWeeks || 0) + 1;
  const semesterStartDate = timetable?.effectiveDate ? dayjs(timetable.effectiveDate) : null;
  const semesterEndDate = semesterStartDate && timetable ? semesterStartDate.add(timetable.totalWeeks, 'week') : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {dbUser?.photoURL ? (
                <img
                  src={dbUser.photoURL}
                  alt={dbUser.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <span className="text-xl font-medium text-zinc-400">
                    {dbUser?.name?.charAt(0) || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {dbUser?.name}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                {dbUser?.email}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                Joined {dayjs(dbUser?.createdAt).format("MMM D, YYYY")}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/edit-profile")}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                title="Edit profile"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                title="Delete account"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 mb-6">
            <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
              Delete Account?
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">
              This will permanently delete your account and all data.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteUser}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Timetable Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-zinc-400" />
              Timetable
            </h2>
            {timetable ? (
              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/edit-timetable")}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
                >
                  <FiEdit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => navigate("/timetable")}
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400"
                >
                  Re-upload →
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/timetable")}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Upload →
              </button>
            )}
          </div>

          {isLoadingTimetable ? (
            <div className="flex justify-center py-8">
              <SyncLoader color="#71717a" size={8} />
            </div>
          ) : timetable ? (
            <div className="space-y-4">
              {/* Total Attendance Highlight */}
              <div className={`rounded-xl p-4 border ${
                isAtRisk 
                ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/50" 
                : "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/50"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      isAtRisk ? "text-red-500" : "text-green-500"
                    }`}>Overall Attendance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{totalPercentage}%</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">of {totalHeld} sessions</span>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                    isAtRisk 
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" 
                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  }`}>
                    {isAtRisk ? "Below Goal" : "On Track"}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-4 overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${isAtRisk ? "bg-red-500" : "bg-green-500"}`}
                     style={{ width: `${Math.min(100, totalPercentage)}%` }}
                   />
                </div>
                
                {/* Compact Predictions */}
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <AttendancePredictor
                    subjects={timetable.subjects}
                    timetable={{
                      totalWeeks: timetable.totalWeeks,
                      completedWeeks: timetable.completedWeeks,
                      minAttendance: timetable.minAttendance,
                    }}
                    mode="compact"
                  />
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">
                    Current Week
                  </p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Week {currentWeek} of {timetable.totalWeeks}
                  </p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">
                    Goal
                  </p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {timetable.minAttendance}%
                  </p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">
                    Semester Start
                  </p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {semesterStartDate ? semesterStartDate.format("MMM D, YYYY") : "Not set"}
                  </p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">
                    Semester End
                  </p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {semesterEndDate ? semesterEndDate.format("MMM D, YYYY") : "Not set"}
                  </p>
                </div>
              </div>

              {/* Each Subject Breakdown */}
              {timetable.subjects && timetable.subjects.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Subject Breakdown</p>
                  <div className="grid gap-2">
                    {timetable.subjects.map((subject) => {
                      const percentage = subject.totalHeld > 0 ? Math.round((subject.attended / subject.totalHeld) * 100) : 0;
                      const isSubAtRisk = percentage < (timetable?.minAttendance || 75);
                      
                      return (
                        <div 
                          key={subject.id}
                          className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{subject.name}</h4>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">{subject.type}</p>
                            </div>
                            <div className="text-right ml-4">
                              <span className={`text-sm font-black ${isSubAtRisk ? "text-red-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                                {percentage}%
                              </span>
                              <div className="text-[10px] text-zinc-400 font-medium">
                                {subject.attended}/{subject.totalHeld}
                              </div>
                            </div>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${isSubAtRisk ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle Schedule */}
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full py-2.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FiClock className="w-4 h-4" />
                {showSchedule ? "Hide" : "View"} Schedule
                {showSchedule ? (
                  <FiChevronUp className="w-4 h-4" />
                ) : (
                  <FiChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Schedule */}
              {showSchedule && sortedSchedule && (
                <div className="space-y-3 pt-2">
                  {sortedSchedule.map((day) => (
                    <div
                      key={day.id}
                      className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden"
                    >
                      <div className="bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {day.day}
                        </h4>
                      </div>
                      <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {day.slots
                          .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
                          .map((slot) => (
                            <div
                              key={slot.id}
                              className="px-3 py-2 flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                  {slot.subject || slot.type}
                                </p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                  {slot.timeStart} – {slot.timeEnd}
                                  {slot.room && ` · ${slot.room}`}
                                </p>
                              </div>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                {slot.type}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FiCalendar className="w-8 h-8 mx-auto text-zinc-200 dark:text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-3">
                No timetable uploaded
              </p>
              <button
                onClick={() => navigate("/timetable")}
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
              >
                Upload now →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
