import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { axiosInstance } from "../utils/axios";
import { useDBUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import { SyncLoader } from "react-spinners";
import {
  FiUploadCloud,
  FiCalendar,
  FiBarChart2,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";

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
  totalWeeks: number;
  completedWeeks: number;
  minAttendance: number;
  userBatch: string;
  subjects: Subject[];
  schedule: DaySchedule[];
}

interface NextClassInfo {
  type: "next-class" | "no-more-classes" | "sunday" | "no-schedule";
  slot?: TimeSlot;
  message: string;
  subMessage?: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { dbUser } = useDBUser();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [hasTimetable, setHasTimetable] = useState(false);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Check if user has a timetable and fetch full schedule
  useEffect(() => {
    const fetchTimetable = async () => {
      if (!dbUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const checkResponse = await axiosInstance.post("/timetable/check", {
          userId: dbUser.id,
        });

        if (checkResponse.data.hasTimetable) {
          const fullResponse = await axiosInstance.post("/timetable", {
            userId: dbUser.id,
          });
          setHasTimetable(true);
          setTimetable(fullResponse.data.timetable);
        } else {
          setHasTimetable(false);
        }
      } catch (error) {
        console.error("Error fetching timetable:", error);
        setHasTimetable(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (dbUser?.id) {
      fetchTimetable();
    } else {
      setIsLoading(false);
    }
  }, [dbUser?.id]);

  // Get current day name
  const getDayName = (date: Date): string => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  // Parse time string to minutes since midnight
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Get next class info
  const getNextClass = (): NextClassInfo => {
    if (!timetable?.schedule) {
      return {
        type: "no-schedule",
        message: "No schedule available",
        subMessage: "Upload your timetable to see your classes",
      };
    }

    const today = getDayName(currentTime);
    const currentMinutes =
      currentTime.getHours() * 60 + currentTime.getMinutes();

    if (today === "Sunday") {
      return {
        type: "sunday",
        message: "It's Sunday",
        subMessage: "No classes scheduled. Enjoy your day off!",
      };
    }

    const todaySchedule = timetable.schedule.find((day) => day.day === today);

    if (!todaySchedule || todaySchedule.slots.length === 0) {
      return {
        type: "no-schedule",
        message: "No classes today",
        subMessage: `Free day on ${today}`,
      };
    }

    const userBatch = timetable.userBatch || "All";
    const classSlots = todaySchedule.slots
      .filter((slot) => {
        if (slot.type === "Break") return false;
        if (slot.sessions && Array.isArray(slot.sessions)) {
          return slot.sessions.some(
            (s) => s.batch === userBatch || userBatch === "All"
          );
        }
        return slot.batch === "All" || slot.batch === userBatch;
      })
      .sort((a, b) => parseTime(a.timeStart) - parseTime(b.timeStart));

    const nextSlot = classSlots.find(
      (slot) => parseTime(slot.timeStart) > currentMinutes
    );

    if (nextSlot) {
      let subjectName = nextSlot.subject;
      if (nextSlot.sessions && Array.isArray(nextSlot.sessions)) {
        const userSession = nextSlot.sessions.find(
          (s) => s.batch === userBatch || userBatch === "All"
        );
        subjectName = userSession?.subject || nextSlot.subject;
      }

      const minutesUntil = parseTime(nextSlot.timeStart) - currentMinutes;
      const hoursUntil = Math.floor(minutesUntil / 60);
      const minsUntil = minutesUntil % 60;

      let timeMessage = "";
      if (hoursUntil > 0) {
        timeMessage = `Starts in ${hoursUntil}h ${minsUntil}m`;
      } else {
        timeMessage = `Starts in ${minsUntil}m`;
      }

      return {
        type: "next-class",
        slot: { ...nextSlot, subject: subjectName },
        message: subjectName || "Class",
        subMessage: `${formatTime(nextSlot.timeStart)} – ${formatTime(
          nextSlot.timeEnd
        )} · ${timeMessage}`,
      };
    }

    const currentClass = classSlots.find(
      (slot) =>
        parseTime(slot.timeStart) <= currentMinutes &&
        parseTime(slot.timeEnd) > currentMinutes
    );

    if (currentClass) {
      let subjectName = currentClass.subject;
      if (currentClass.sessions && Array.isArray(currentClass.sessions)) {
        const userSession = currentClass.sessions.find(
          (s) => s.batch === userBatch || userBatch === "All"
        );
        subjectName = userSession?.subject || currentClass.subject;
      }

      const minutesLeft = parseTime(currentClass.timeEnd) - currentMinutes;

      return {
        type: "next-class",
        slot: { ...currentClass, subject: subjectName },
        message: subjectName || "Class",
        subMessage: `In progress · ${minutesLeft}m remaining`,
      };
    }

    return {
      type: "no-more-classes",
      message: "Done for today",
      subMessage: "All classes completed",
    };
  };

  // Calculate overall attendance percentage
  const calculateOverallAttendance = (): number => {
    if (!timetable?.subjects || timetable.subjects.length === 0) return 0;
    const totalAttended = timetable.subjects.reduce(
      (sum, s) => sum + s.attended,
      0
    );
    const totalHeld = timetable.subjects.reduce(
      (sum, s) => sum + s.totalHeld,
      0
    );
    if (totalHeld === 0) return 0;
    return Math.round((totalAttended / totalHeld) * 100);
  };

  // Get subjects at risk
  const getSubjectsAtRisk = (): Subject[] => {
    if (!timetable?.subjects) return [];
    return timetable.subjects.filter((s) => {
      if (s.totalHeld === 0) return false;
      const percentage = (s.attended / s.totalHeld) * 100;
      return percentage < timetable.minAttendance;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <SyncLoader color="#71717a" size={10} />
      </div>
    );
  }

  // Not logged in - Landing page
  if (!currentUser) {
    return (
      <div className="min-h-screen  flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-4xl md:text-5xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4 tracking-tight">
            Smart Attendance
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-10">
            Track and predict your attendance. Never fall below 75% again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/signin"
              className="px-6 py-3 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-3xl">
          <div className="text-center">
            <FiCalendar className="w-6 h-6 text-zinc-400 mx-auto mb-3" />
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Timetable Sync
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Upload once, track automatically
            </p>
          </div>
          <div className="text-center">
            <FiBarChart2 className="w-6 h-6 text-zinc-400 mx-auto mb-3" />
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Predictions
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Know how many classes you need
            </p>
          </div>
          <div className="text-center">
            <FiClock className="w-6 h-6 text-zinc-400 mx-auto mb-3" />
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              OCR Extraction
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              AI reads your attendance sheets
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but no timetable
  if (!hasTimetable) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            <FiUploadCloud className="w-7 h-7 text-zinc-400" />
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Welcome, {dbUser?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            Upload your timetable to get started with attendance tracking.
          </p>

          <button
            onClick={() => navigate("/timetable")}
            className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors inline-flex items-center gap-2"
          >
            Upload Timetable
            <FiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  const overallAttendance = calculateOverallAttendance();
  const subjectsAtRisk = getSubjectsAtRisk();
  const nextClass = getNextClass();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {dbUser?.name?.split(" ")[0] || "Dashboard"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {timetable?.program} · {timetable?.semester}
          </p>
        </div>

        {/* Next Class */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">
                {nextClass.type === "next-class" ? "Up Next" : "Today"}
              </p>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {nextClass.message}
              </h2>
              {nextClass.subMessage && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {nextClass.subMessage}
                </p>
              )}
            </div>
            {nextClass.slot && (
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded">
                {nextClass.slot.type}
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
              Attendance
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {overallAttendance}%
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
              At Risk
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {subjectsAtRisk.length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
              Weeks
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {timetable?.completedWeeks}/{timetable?.totalWeeks}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">
              Required
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {timetable?.minAttendance}%
            </p>
          </div>
        </div>

        {/* Subjects */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
              Subjects
            </h2>
            <Link
              to="/attendance/upload"
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Update →
            </Link>
          </div>

          {timetable?.subjects && timetable.subjects.length > 0 ? (
            <div className="space-y-3">
              {timetable.subjects.map((subject) => {
                const percentage =
                  subject.totalHeld > 0
                    ? Math.round((subject.attended / subject.totalHeld) * 100)
                    : 0;
                const isAtRisk = percentage < (timetable.minAttendance || 75);

                return (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        {subject.name}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {subject.attended}/{subject.totalHeld} · {subject.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          isAtRisk
                            ? "text-red-500"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {percentage}%
                      </p>
                      {isAtRisk && (
                        <p className="text-xs text-red-400">At risk</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
              No subjects found
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/attendance")}
            className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left"
          >
            <FiUploadCloud className="w-5 h-5 text-zinc-400 mb-2" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              Edit Attendance
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Mark present or absent
            </p>
          </button>
          <button
            onClick={() => navigate("/timetable")}
            className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left"
          >
            <FiCalendar className="w-5 h-5 text-zinc-400 mb-2" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              Update Timetable
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Change schedule settings
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}