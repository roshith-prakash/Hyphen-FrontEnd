import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../utils/axios";
import { useDBUser } from "../context/UserContext";
import { SyncLoader } from "react-spinners";
import { FiCheck, FiX, FiMinus, FiPlus, FiArrowLeft, FiClock, FiCalendar, FiUpload } from "react-icons/fi";
import toast from "react-hot-toast";
import dayjs from "dayjs";

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

interface Subject {
  id: string;
  name: string;
  type: string;
  classesPerWeek: number;
  totalExpected: number;
  weight: number; // Weight multiplier (Lab=2.0, Lecture=1.0)
  attended: number; // Weighted attended count
  totalHeld: number; // Weighted total held count
}

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

interface TodayClass {
  slot: TimeSlot;
  subjectName: string;
  subjectId: string | null;
  isPast: boolean;
  isNow: boolean;
  slotKey: string;
}

interface DailyAttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  subjectName: string;
  subjectType: string;
  status: "present" | "absent" | "not-conducted";
}

export default function Attendance() {
  const navigate = useNavigate();
  const { dbUser } = useDBUser();

  const [isLoading, setIsLoading] = useState(true);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [markedClasses, setMarkedClasses] = useState<
    Record<string, "present" | "absent" | "not-conducted">
  >({});
  const [initialRecordsLoaded, setInitialRecordsLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraForm, setExtraForm] = useState({
    subjectId: "",
    date: dayjs().format("YYYY-MM-DD"),
    timeStart: "09:00",
    timeEnd: "10:00",
    status: "present" as "present" | "absent" | "not-conducted",
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // No longer needed, using dayjs() for 'now' in logic
  /*
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  */

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

  // No helper needed, using dayjs directly in effects

  // Fetch timetable and today's attendance
  const fetchData = async () => {
    if (!dbUser?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setInitialRecordsLoaded(false);
      // Fetch timetable if not already fetched
      if (!timetable) {
        const timetableRes = await axiosInstance.post("/timetable", {
          userId: dbUser.id,
        });
        console.log("Subjects in timetable:", timetableRes.data.timetable?.subjects);
        console.log("Full subject details:");
        timetableRes.data.timetable?.subjects?.forEach((s: any) => {
          console.log(`  ${s.name} (${s.type}): ${s.attended}/${s.totalHeld} = ${Math.round((s.attended / s.totalHeld) * 100) || 0}%`);
        });
        setTimetable(timetableRes.data.timetable);
        setSubjects(timetableRes.data.timetable?.subjects || []);
      }

      // Fetch attendance for selectedDate from database
      const attendanceRes = await axiosInstance.post("/attendance/date", {
        userId: dbUser.id,
        date: selectedDate.startOf("day").toISOString(),
      });

      // Build marked classes map from database records
      const records: DailyAttendanceRecord[] = attendanceRes.data.records || [];
      const markedMap: Record<string, "present" | "absent"> = {};

      for (const record of records) {
        const slotKey = `${record.timeStart}_${record.subjectName}_${record.subjectType}`;
        markedMap[slotKey] = record.status as "present" | "absent";
      }

      setMarkedClasses(markedMap);
      setInitialRecordsLoaded(true);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dbUser) fetchData();
  }, [dbUser, selectedDate]);

  // Auto-mark past classes as present (only if viewed date is today)
  useEffect(() => {
    if (!initialRecordsLoaded || !timetable?.schedule || subjects.length === 0 || !dbUser?.id) return;

    // Only auto-mark if we are looking at today
    if (!selectedDate.isSame(dayjs(), 'day')) return;

    const autoMarkPastClasses = async () => {
      const dayName = selectedDate.format("dddd"); // e.g. "Friday"

      if (dayName === "Sunday") return;

      const todaySchedule = timetable.schedule.find((d) => d.day === dayName);
      if (!todaySchedule) return;

      const userBatch = timetable.userBatch || "All";
      const now = dayjs();
      const currentMinutes = now.hour() * 60 + now.minute();

      // Get past classes that haven't been marked yet
      for (const slot of todaySchedule.slots) {
        if (slot.type === "Break") continue;

        let isForUser = false;
        let subjectName = slot.subject || "";

        if (slot.sessions && Array.isArray(slot.sessions)) {
          const userSession = slot.sessions.find(
            (s) => s.batch === userBatch || userBatch === "All"
          );
          if (userSession) {
            isForUser = true;
            subjectName = userSession.subject || "";
          }
        } else if (userBatch === "All" || slot.batch === "All" || slot.batch === userBatch) {
          isForUser = true;
        }

        if (!isForUser || !subjectName) continue;

        const slotEnd = parseTime(slot.timeEnd);
        const isPast = slotEnd <= currentMinutes;

        if (!isPast) continue;

        const slotKey = `${slot.timeStart}_${subjectName}_${slot.type}`;

        // Check if already marked
        if (markedClasses[slotKey]) continue;

        // Find matching subject
        const matchingSubject = subjects.find(
          (s) =>
            s.name.toLowerCase() === subjectName.toLowerCase() &&
            s.type === slot.type
        );

        if (matchingSubject) {
          // Mark as present in database
          try {
            await axiosInstance.post("/attendance/mark", {
              userId: dbUser.id,
              subjectId: matchingSubject.id,
              date: selectedDate.startOf("day").toISOString(),
              timeStart: slot.timeStart,
              timeEnd: slot.timeEnd,
              subjectName: subjectName,
              subjectType: slot.type,
              status: "present",
            });

            setMarkedClasses((prev) => ({ ...prev, [slotKey]: "present" }));

            // Update local subject state
            setSubjects((prev: Subject[]) =>
              prev.map((s: Subject) =>
                s.id === matchingSubject.id
                  ? { ...s, attended: s.attended + 1, totalHeld: s.totalHeld + 1 }
                  : s
              )
            );
          } catch (err) {
            console.error("Failed to auto-mark:", err);
          }
        }
      }
    };

    // Small delay to ensure state is ready
    const timer = setTimeout(autoMarkPastClasses, 500);
    return () => clearTimeout(timer);
  }, [timetable, subjects.length > 0, dbUser?.id, initialRecordsLoaded, selectedDate]);

  // Get classes for selected date from schedule
  const getSelectedDayClasses = (): TodayClass[] => {
    if (!timetable?.schedule) return [];

    const dayName = selectedDate.format("dddd");
    const dayData = timetable.schedule.find((d) => d.day === dayName);

    if (!dayData) {
      return [];
    }

    const userBatch = timetable.userBatch || "All";
    const now = dayjs();
    const isActuallyToday = selectedDate.isSame(now, "day");
    const currentMinutes = now.hour() * 60 + now.minute();

    return dayData.slots
      .map((slot) => {
        let isForUser = false;
        let subjectName = slot.subject || "";

        if (slot.sessions && Array.isArray(slot.sessions)) {
          const userSession = slot.sessions.find(
            (s) => s.batch === userBatch || userBatch === "All"
          );
          if (userSession) {
            isForUser = true;
            subjectName = userSession.subject || "";
          }
        } else if (userBatch === "All" || slot.batch === "All" || slot.batch === userBatch) {
          // If user is in "All" batch, show all slots
          // If slot is for "All" batches, show to everyone
          // If slot batch matches user batch, show it
          isForUser = true;
        }

        if (!isForUser || !subjectName) {
          return null;
        }

        const matchingSubject = subjects.find(
          (s) =>
            s.name.toLowerCase() === subjectName.toLowerCase() &&
            s.type === slot.type
        );

        if (!matchingSubject) {
          console.log(`⚠️ No matching subject found for: "${subjectName}" (${slot.type})`);
          console.log("Available subjects:", subjects.map(s => `${s.name} (${s.type})`));
        }

        const slotStart = parseTime(slot.timeStart);
        const slotEnd = parseTime(slot.timeEnd);

        let isPast = false;
        let isNow = false;

        if (isActuallyToday) {
          isPast = slotEnd <= currentMinutes;
          isNow = slotStart <= currentMinutes && slotEnd > currentMinutes;
        } else if (selectedDate.isBefore(now, "day")) {
          isPast = true;
        }

        const slotKey = `${slot.timeStart}_${subjectName}_${slot.type}`;

        return {
          slot,
          subjectName,
          subjectId: matchingSubject?.id || null,
          isPast,
          isNow,
          slotKey,
        };
      })
      .filter((tc): tc is TodayClass => tc !== null)
      .sort((a, b) => parseTime(a.slot.timeStart) - parseTime(b.slot.timeStart));
  };

  const markClass = async (
    subjectId: string,
    status: "present" | "absent" | "not-conducted",
    slotKey: string,
    slot: TimeSlot,
    subjectName: string,
    overrideDate?: dayjs.Dayjs
  ) => {
    if (!dbUser?.id) return;

    const targetDate = overrideDate || selectedDate;

    setIsSaving(true);
    try {
      const response = await axiosInstance.post("/attendance/mark", {
        userId: dbUser.id,
        subjectId,
        date: targetDate.startOf("day").toISOString(),
        timeStart: slot.timeStart,
        timeEnd: slot.timeEnd,
        subjectName,
        subjectType: slot.type,
        status,
      });

      // Update local state ONLY if the marked date is the selected date
      if (targetDate.isSame(selectedDate, 'day')) {
        setMarkedClasses((prev) => ({ ...prev, [slotKey]: status }));
      }

      if (response.data.subject) {
        setSubjects((prev: Subject[]) =>
          prev.map((s: Subject) =>
            s.id === subjectId ? response.data.subject : s
          )
        );
      }

      const statusMessages = {
        present: "Marked present",
        absent: "Marked absent",
        "not-conducted": "Marked not conducted",
      };
      toast.success(statusMessages[status]);
    } catch (err) {
      console.error("Error marking:", err);
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const addExtraLecture = async () => {
    if (!extraForm.subjectId || !extraForm.timeStart || !extraForm.timeEnd || isSaving) {
      if (!isSaving) toast.error("Please fill all fields");
      return;
    }

    const subject = subjects.find(s => s.id === extraForm.subjectId);
    if (!subject) return;

    // A virtual slot to match the behavior of markClass
    const virtualSlot: any = {
      timeStart: extraForm.timeStart,
      timeEnd: extraForm.timeEnd,
      type: subject.type,
      batch: "All",
    };

    const slotKey = `${extraForm.timeStart}_${subject.name}_${subject.type}`;

    await markClass(
      extraForm.subjectId,
      extraForm.status,
      slotKey,
      virtualSlot,
      subject.name,
      dayjs(extraForm.date)
    );

    setIsExtraModalOpen(false);
    setExtraForm({
      subjectId: "",
      date: dayjs().format("YYYY-MM-DD"),
      timeStart: "09:00",
      timeEnd: "10:00",
      status: "present",
    });
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dbUser?.id) return;

    if (!file.type.includes("pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    try {
      setUploadingReport(true);
      setUploadProgress("Uploading PDF...");

      // Send file directly to backend
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", dbUser.id);

      setUploadProgress("Processing report...");

      // Send to backend for processing
      const response = await axiosInstance.post("/attendance/upload-report", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { results, reportInfo } = response.data;

      // Show success message
      toast.success(
        `Synced ${results.created} records! ${results.duplicates} duplicates skipped.`,
        { duration: 5000 }
      );
      if (results.unmatched.length > 0) {
        console.warn("Unmatched subjects:", results.unmatched);
        toast.error(`Could not match ${results.unmatched.length} subjects`);
      }

      // Refresh data completely
      setTimetable(null);
      await fetchData();
      setShowUploadModal(false);
    } catch (err: any) {
      console.error("Error uploading report:", err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || "Failed to process report";
      toast.error(errorMessage);
    } finally {
      setUploadingReport(false);
      setUploadProgress("");
    }
  };

  // Calculate percentage
  const getPercentage = (attended: number, totalHeld: number): number => {
    if (totalHeld === 0) return 0;
    return Math.round((attended / totalHeld) * 100);
  };

  // Render localized date selector
  const renderDateSelector = () => {
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(dayjs().add(i, "day"));
    }

    return (
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-6 overflow-x-auto scroller-hidden">
        {/* Full Date Picker Toggle */}
        <div
          onClick={() => {
            // Fallback for browsers where showPicker is not supported or working
            dateInputRef.current?.click();
            // Modern browsers
            try { dateInputRef.current?.showPicker(); } catch (e) { }
          }}
          className="relative mr-2 pr-4 border-r border-zinc-100 dark:border-zinc-800 flex-shrink-0 cursor-pointer"
        >
          <input
            ref={dateInputRef}
            type="date"
            className="absolute inset-0 opacity-0 pointer-events-none"
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(dayjs(e.target.value));
              }
            }}
          />
          <button className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors pointer-events-none">
            <FiCalendar className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 min-w-0">
          {dates.map((date) => {
            const isSelected = date.isSame(selectedDate, "day");
            const isToday = date.isSame(dayjs(), "day");

            return (
              <button
                key={date.toString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center min-w-[3.5rem] py-2 rounded-lg transition-all ${isSelected
                  ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-tighter mb-1">
                  {date.format("ddd")}
                </span>
                <span className={`text-lg font-bold leading-none ${isToday && !isSelected ? "text-zinc-900 dark:text-zinc-100 underline decoration-2 underline-offset-4" : ""}`}>
                  {date.format("D")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const dayClasses = getSelectedDayClasses();
  const isSelectedDateSunday = selectedDate.format("dddd") === "Sunday";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <SyncLoader color="#71717a" size={10} />
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            No timetable found
          </p>
          <button
            onClick={() => navigate("/timetable")}
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            Upload timetable →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Attendance
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {selectedDate.format("dddd")},{" "}
              {selectedDate.format("MMM D")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <FiUpload className="w-3.5 h-3.5" />
              Upload Report
            </button>
            <button
              onClick={() => setIsExtraModalOpen(true)}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <FiPlus className="w-3.5 h-3.5" />
              Extra Lecture
            </button>
          </div>
        </div>

        {renderDateSelector()}

        {/* Selected Day's Classes */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            {selectedDate.isSame(dayjs(), 'day') ? "Today's" : selectedDate.format("dddd, MMM D['s]")} Schedule
          </h2>
          {!isSelectedDateSunday && (
            <span className="text-[10px] text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {dayClasses.length} SESSIONS
            </span>
          )}
        </div>

        {isSelectedDateSunday && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center mb-6">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400 transition-transform hover:scale-110">
              ☕
            </div>
            <h3 className="text-zinc-900 dark:text-zinc-100 font-medium">Sunday Break</h3>
            <p className="text-sm text-zinc-500 mt-1">No scheduled classes. Rest up!</p>
          </div>
        )}

        {!isSelectedDateSunday && dayClasses.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center mb-6">
            <h3 className="text-zinc-900 dark:text-zinc-100 font-medium">Clear Schedule</h3>
            <p className="text-sm text-zinc-500 mt-1">No classes found for this day.</p>
          </div>
        )}

        {!isSelectedDateSunday && dayClasses.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-1 overflow-hidden mb-6">
            <div className="space-y-1">
              {dayClasses.map((tc, index) => {
                const markedStatus = markedClasses[tc.slotKey];
                const isMarked = !!markedStatus;

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-all ${isMarked
                      ? markedStatus === "present"
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                        : markedStatus === "absent"
                          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50"
                      : tc.isNow
                        ? "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 animate-pulse"
                        : "border-zinc-100 dark:border-zinc-800"
                      }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {tc.subjectName}
                        </p>
                        {isMarked && (
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${markedStatus === "present"
                              ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200"
                              : markedStatus === "absent"
                                ? "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                              }`}
                          >
                            {markedStatus === "present" ? "Present" : markedStatus === "absent" ? "Absent" : "Not Conducted"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <FiClock className="w-3 h-3" />
                        {formatTime(tc.slot.timeStart)} –{" "}
                        {formatTime(tc.slot.timeEnd)}
                        {tc.isNow && (
                          <span className="text-blue-500 font-bold ml-1">
                            LIVE
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {tc.subjectId && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              markClass(tc.subjectId!, "present", tc.slotKey, tc.slot, tc.subjectName)
                            }
                            disabled={isSaving}
                            className={`p-2 rounded-lg transition-colors ${markedStatus === "present"
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                              : "text-zinc-400 hover:text-green-500 bg-zinc-50 dark:bg-zinc-800 hover:bg-green-50 dark:hover:bg-green-900/30"
                              }`}
                            title="Mark Present"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              markClass(tc.subjectId!, "absent", tc.slotKey, tc.slot, tc.subjectName)
                            }
                            disabled={isSaving}
                            className={`p-2 rounded-lg transition-colors ${markedStatus === "absent"
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                              : "text-zinc-400 hover:text-red-500 bg-zinc-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                              }`}
                            title="Mark Absent"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              markClass(tc.subjectId!, "not-conducted", tc.slotKey, tc.slot, tc.subjectName)
                            }
                            disabled={isSaving}
                            className={`p-2 rounded-lg transition-colors ${markedStatus === "not-conducted"
                              ? "bg-zinc-500 text-white shadow-lg shadow-zinc-500/20"
                              : "text-zinc-400 hover:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              }`}
                            title="Not Conducted"
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isSelectedDateSunday && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 mb-6 text-center">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiCalendar className="text-zinc-400 w-6 h-6" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Sunday's a Break!</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No classes scheduled for today.</p>
          </div>
        )}

        {!isSelectedDateSunday && dayClasses.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 mb-6 text-center">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiCalendar className="text-zinc-400 w-6 h-6" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Clear Schedule</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No classes found for this date.</p>
          </div>
        )}

        {/* All Subjects */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            All Subjects
          </h2>
          <div className="space-y-4">
            {subjects
              .filter((subject: Subject) => subject.totalHeld > 0)
              .map((subject: Subject) => {
                const percentage = getPercentage(
                  subject.attended,
                  subject.totalHeld
                );
                const isAtRisk = percentage < (timetable?.minAttendance || 75);

                return (
                  <div
                    key={subject.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {subject.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {subject.type}
                          </p>
                          {subject.weight && subject.weight !== 1.0 && (
                            <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {subject.weight}× weight
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${isAtRisk
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

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                            Attended
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {Math.round(subject.attended / (subject.weight || 1))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                            Conducted
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {Math.round(subject.totalHeld / (subject.weight || 1))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Extra Lecture Modal */}
        {isExtraModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Extra Lecture</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Subject</label>
                  <select
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    value={extraForm.subjectId}
                    onChange={(e) => setExtraForm({ ...extraForm, subjectId: e.target.value })}
                  >
                    <option value="">Select a subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                    value={extraForm.date}
                    onChange={(e) => setExtraForm({ ...extraForm, date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Starts At</label>
                    <input
                      type="time"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                      value={extraForm.timeStart}
                      onChange={(e) => setExtraForm({ ...extraForm, timeStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Ends At</label>
                    <input
                      type="time"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                      value={extraForm.timeEnd}
                      onChange={(e) => setExtraForm({ ...extraForm, timeEnd: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Initial Status</label>
                  <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    {["present", "absent", "not-conducted"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setExtraForm({ ...extraForm, status: s as any })}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${extraForm.status === s
                          ? s === "present" ? "bg-green-500 text-white" : s === "absent" ? "bg-red-500 text-white" : "bg-zinc-500 text-white"
                          : "text-zinc-400"
                          }`}
                      >
                        {s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsExtraModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addExtraLecture}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold shadow-lg shadow-zinc-900/10 dark:shadow-none hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {isSaving ? "Adding..." : "Add Lecture"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Report Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Upload Attendance Report
              </h3>

              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Upload your official attendance PDF report from ERP. The app will automatically
                sync all records and match them to your timetable subjects.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Select PDF Report
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleReportUpload}
                  disabled={uploadingReport}
                  className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              {uploadingReport && (
                <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <SyncLoader size={8} color="#71717a" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {uploadProgress}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadingReport}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
