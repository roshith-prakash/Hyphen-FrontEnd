import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../utils/axios";
import { useDBUser } from "../context/UserContext";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiEdit2, FiPlus, FiTrash2, FiArrowLeft } from "react-icons/fi";
import { SyncLoader } from "react-spinners";

// Types
interface TimeSlotData {
  time_start: string;
  time_end: string;
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

interface TimetableOCRResult {
  program: string;
  semester: string;
  effective_date: string;
  schedule: Record<string, TimeSlotData[]>;
}

export default function EditTimetable() {
  const navigate = useNavigate();
  const { dbUser } = useDBUser();

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const [totalWeeks, setTotalWeeks] = useState<string>("16");
  const [completedWeeks, setCompletedWeeks] = useState<string>("0");
  const [minAttendance, setMinAttendance] = useState<string>("75");
  const [userBatch, setUserBatch] = useState<string>("All");

  const [editedData, setEditedData] = useState<TimetableOCRResult | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{ day: string; index: number } | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      if (!dbUser?.id) return;

      try {
        const response = await axiosInstance.post("/timetable", {
          userId: dbUser.id,
        });

        const tt = response.data.timetable;
        if (!tt) {
          toast.error("No active timetable found");
          navigate("/profile");
          return;
        }

        setDocumentUrl(tt.documentUrl);
        setTotalWeeks(tt.totalWeeks.toString());
        setCompletedWeeks(tt.completedWeeks.toString());
        setMinAttendance(tt.minAttendance.toString());
        setUserBatch(tt.userBatch);

        // Map DB structure to OCR structure
        const schedule: Record<string, TimeSlotData[]> = {};
        tt.schedule.forEach((day: any) => {
          schedule[day.day] = day.slots.map((slot: any) => ({
            time_start: slot.timeStart,
            time_end: slot.timeEnd,
            type: slot.type,
            subject: slot.subject,
            faculty: slot.faculty,
            room: slot.room,
            batch: slot.batch,
            sessions: slot.sessions
          }));
        });

        setEditedData({
          program: tt.program,
          semester: tt.semester,
          effective_date: tt.effectiveDate,
          schedule
        });
      } catch (err) {
        console.error("Error fetching timetable:", err);
        toast.error("Failed to load timetable");
        navigate("/profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimetable();
  }, [dbUser?.id]);

  const handleConfirm = async () => {
    if (!editedData || !documentUrl || !dbUser?.id) return;

    // Validate inputs
    const weeks = parseInt(totalWeeks) || 16;
    const completed = parseInt(completedWeeks) || 0;
    const minAtt = parseInt(minAttendance) || 75;

    if (weeks < 1 || weeks > 52) {
      toast.error("Total weeks must be between 1 and 52");
      return;
    }
    if (completed < 0 || completed > weeks) {
      toast.error("Completed weeks must be between 0 and total weeks");
      return;
    }
    if (minAtt < 0 || minAtt > 100) {
      toast.error("Minimum attendance must be between 0 and 100");
      return;
    }

    setIsConfirming(true);

    try {
      // confirmTimetable backend route deactivates old and creates new
      // but it also carries over attendance data if subject names match!
      const response = await axiosInstance.post("/timetable/confirm", {
        userId: dbUser.id,
        ocrData: editedData,
        documentUrl: documentUrl,
        totalWeeks: weeks,
        completedWeeks: completed,
        minAttendance: minAtt,
        userBatch: userBatch,
      });

      if (response.data.success) {
        toast.success("Timetable updated");
        navigate("/profile");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditInfoField = (field: "program" | "semester" | "effective_date", value: string) => {
    if (editedData) {
      setEditedData({ ...editedData, [field]: value });
    }
  };

  const handleEditSlot = (day: string, index: number, field: keyof TimeSlotData, value: string) => {
    if (!editedData) return;

    const newSchedule = { ...editedData.schedule };
    const slots = [...newSchedule[day]];
    slots[index] = { ...slots[index], [field]: value };
    newSchedule[day] = slots;

    setEditedData({ ...editedData, schedule: newSchedule });
  };

  const handleDeleteSlot = (day: string, index: number) => {
    if (!editedData) return;

    const newSchedule = { ...editedData.schedule };
    const slots = [...newSchedule[day]];
    slots.splice(index, 1);
    newSchedule[day] = slots;

    setEditedData({ ...editedData, schedule: newSchedule });
    setEditingSlot(null);
  };

  const handleAddSlot = (day: string) => {
    if (!editedData) return;

    const newSlot: TimeSlotData = {
      time_start: "09:00",
      time_end: "10:00",
      type: "Lecture",
      subject: "",
      faculty: "",
      room: "",
      batch: "All",
    };

    const newSchedule = { ...editedData.schedule };
    newSchedule[day] = [...(newSchedule[day] || []), newSlot];

    setEditedData({ ...editedData, schedule: newSchedule });
    setEditingSlot({ day, index: newSchedule[day].length - 1 });
  };

  const getAvailableBatches = (): string[] => {
    const batches = new Set<string>(["All"]);
    if (editedData) {
      Object.values(editedData.schedule).forEach((slots) => {
        slots.forEach((slot) => {
          if (slot.batch && slot.batch !== "All") batches.add(slot.batch);
          if (slot.sessions) {
            slot.sessions.forEach((s) => batches.add(s.batch));
          }
        });
      });
    }
    return Array.from(batches);
  };

  const renderEditableSchedule = (schedule: Record<string, TimeSlotData[]>) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const existingDays = Object.keys(schedule);
    const allDays = [...new Set([...days.filter(d => existingDays.includes(d)), ...existingDays])];

    return (
      <div className="space-y-4">
        {allDays.map((day) => (
          <div
            key={day}
            className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
          >
            <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                {day}
              </h4>
              <button
                onClick={() => handleAddSlot(day)}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" />
                Add Slot
              </button>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(schedule[day] || []).map((slot, index) => {
                const isEditingThis = editingSlot?.day === day && editingSlot?.index === index;

                return (
                  <div key={index} className="p-3">
                    {isEditingThis ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Start</label>
                            <input
                              type="time"
                              value={slot.time_start}
                              onChange={(e) => handleEditSlot(day, index, "time_start", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">End</label>
                            <input
                              type="time"
                              value={slot.time_end}
                              onChange={(e) => handleEditSlot(day, index, "time_end", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Type</label>
                            <select
                              value={slot.type}
                              onChange={(e) => handleEditSlot(day, index, "type", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            >
                              <option value="Lecture">Lecture</option>
                              <option value="Lab">Lab</option>
                              <option value="Tutorial">Tutorial</option>
                              <option value="Break">Break</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Batch</label>
                            <input
                              type="text"
                              value={slot.batch}
                              onChange={(e) => handleEditSlot(day, index, "batch", e.target.value)}
                              placeholder="All"
                              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 mb-1 block">Subject</label>
                          <input
                            type="text"
                            value={slot.subject || ""}
                            onChange={(e) => handleEditSlot(day, index, "subject", e.target.value)}
                            placeholder="Subject name"
                            className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Faculty</label>
                            <input
                              type="text"
                              value={slot.faculty || ""}
                              onChange={(e) => handleEditSlot(day, index, "faculty", e.target.value)}
                              placeholder="Optional"
                              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Room</label>
                            <input
                              type="text"
                              value={slot.room || ""}
                              onChange={(e) => handleEditSlot(day, index, "room", e.target.value)}
                              placeholder="Optional"
                              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setEditingSlot(null)}
                            className="flex-1 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >
                            Done
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(day, index)}
                            className="px-3 py-1.5 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -m-3 p-3 rounded"
                        onClick={() => setEditingSlot({ day, index })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-zinc-400 dark:text-zinc-500 w-24">
                            {slot.time_start} – {slot.time_end}
                          </div>
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            {slot.type}
                          </span>
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">
                            {slot.subject || "(No subject)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          {slot.batch !== "All" && <span>{slot.batch}</span>}
                          <FiEdit2 className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <SyncLoader color="#71717a" size={10} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Timetable
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Modify your schedule for this semester
            </p>
          </div>
        </div>

        {editedData && (
          <div className="space-y-6">
            {/* Program & Semester */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  General Information
                </h3>
                <button
                  onClick={() => setIsEditingInfo(!isEditingInfo)}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
                >
                  <FiEdit2 className="w-3 h-3" />
                  {isEditingInfo ? "Done" : "Edit"}
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                    Program
                  </label>
                  {isEditingInfo ? (
                    <input
                      type="text"
                      value={editedData.program}
                      onChange={(e) => handleEditInfoField("program", e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  ) : (
                    <p className="text-zinc-900 dark:text-zinc-100">
                      {editedData.program}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                    Semester
                  </label>
                  {isEditingInfo ? (
                    <input
                      type="text"
                      value={editedData.semester}
                      onChange={(e) => handleEditInfoField("semester", e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  ) : (
                    <p className="text-zinc-900 dark:text-zinc-100">
                      {editedData.semester}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                    Semester Start Date
                  </label>
                  {isEditingInfo ? (
                    <input
                      type="date"
                      value={editedData.effective_date ? new Date(editedData.effective_date).toISOString().split('T')[0] : ""}
                      onChange={(e) => handleEditInfoField("effective_date", e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  ) : (
                    <p className="text-zinc-900 dark:text-zinc-100">
                      {editedData.effective_date ? new Date(editedData.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "Not set"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Semester Configuration */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                Semester Settings
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                    Total Weeks
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalWeeks}
                    onChange={(e) => setTotalWeeks(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                    Min. Attendance %
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 dark:text-zinc-500 mb-1">
                    Your Batch
                  </label>
                  <select
                    value={userBatch}
                    onChange={(e) => setUserBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-400"
                  >
                    {getAvailableBatches().map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Editable Schedule */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  Schedule
                </h3>
              </div>
              {renderEditableSchedule(editedData.schedule)}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/profile")}
                className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300 font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <FiX className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <SyncLoader color="#71717a" size={6} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
