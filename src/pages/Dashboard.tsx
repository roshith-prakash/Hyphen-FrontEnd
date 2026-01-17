import { useDBUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { axiosInstance } from "../utils/axios";
import dayjs from "dayjs";
import { FiArrowLeft, FiTrendingUp, FiPieChart, FiBarChart2, FiTarget } from "react-icons/fi";
import { SyncLoader } from "react-spinners";
import AttendancePredictor from "../components/AttendancePredictor";
import RecoveryCalculator from "../components/RecoveryCalculator";
import AIGuidancePanel from "../components/AIGuidancePanel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ReferenceArea,
} from "recharts";

export interface Subject {
  id: string;
  name: string;
  type: string;
  weight: number;
  attended: number;
  totalHeld: number;
  classesPerWeek: number;
}

interface DailyAttendanceRecord {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  subjectName: string;
  subjectType: string;
  status: "present" | "absent" | "not-conducted";
}

interface Timetable {
  id: string;
  minAttendance: number;
  totalWeeks: number;
  completedWeeks: number;
  subjects: Subject[];
}

const COLORS = ["#10b981", "#ef4444", "#71717a"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { dbUser } = useDBUser();

  const [isLoading, setIsLoading] = useState(true);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [allRecords, setAllRecords] = useState<DailyAttendanceRecord[]>([]);

  useEffect(() => {
    document.title = "Dashboard | Safezone";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!dbUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch timetable with subjects
        const timetableRes = await axiosInstance.post("/timetable", {
          userId: dbUser.id,
        });
        setTimetable(timetableRes.data.timetable);

        // Fetch all daily attendance records
        const recordsRes = await axiosInstance.post("/attendance/all", {
          userId: dbUser.id,
        });
        setAllRecords(recordsRes.data.records || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dbUser?.id]);

  // Calculate overall stats
  const totalAttended = timetable?.subjects?.reduce((acc, s) => acc + s.attended, 0) || 0;
  const totalHeld = timetable?.subjects?.reduce((acc, s) => acc + s.totalHeld, 0) || 0;
  const overallPercentage = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;

  // Pie chart data for overall status
  const pieData = [
    { name: "Present", value: totalAttended },
    { name: "Absent", value: totalHeld - totalAttended },
  ];

  // Bar chart data per subject
  const subjectBarData = timetable?.subjects
    ?.filter((s) => s.totalHeld > 0)
    ?.map((s) => ({
      name: s.name.length > 12 ? s.name.substring(0, 12) + "..." : s.name,
      fullName: s.name,
      percentage: s.totalHeld > 0 ? Math.round((s.attended / s.totalHeld) * 100) : 0,
      attended: s.attended,
      total: s.totalHeld,
    })) || [];

  const trendData = (() => {
    const days: { date: string; label: string; present: number; absent: number; total: number; percentage: number | null }[] = [];

    for (let i = 13; i >= 0; i--) {
      const date = dayjs().subtract(i, "day");
      const dateStr = date.format("YYYY-MM-DD");
      const dayRecords = allRecords.filter(
        (r) => dayjs(r.date).format("YYYY-MM-DD") === dateStr && r.status !== "not-conducted"
      );

      const present = dayRecords.filter((r) => r.status === "present").length;
      const absent = dayRecords.filter((r) => r.status === "absent").length;
      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : null;

      days.push({
        date: dateStr,
        label: date.format("MMM D"),
        present,
        absent,
        total,
        percentage,
      });
    }

    return days;
  })();

  // Cumulative trend (running attendance %)
  const cumulativeTrend = (() => {
    let runningPresent = 0;
    let runningTotal = 0;

    return trendData.map((d) => {
      runningPresent += d.present;
      runningTotal += d.total;
      return {
        ...d,
        cumulative: runningTotal > 0 ? Math.round((runningPresent / runningTotal) * 100) : 0,
      };
    });
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <SyncLoader color="#71717a" size={10} />
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <FiBarChart2 className="w-16 h-16 mx-auto text-zinc-200 dark:text-zinc-700 mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No Data Available
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Upload your timetable and start tracking attendance to see analytics.
          </p>
          <button
            onClick={() => navigate("/timetable")}
            className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Upload Timetable
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Week {(timetable.completedWeeks || 0) + 1} of {timetable.totalWeeks} · Visualize your attendance patterns and trends
            </p>
          </div>
        </div>

        {/* AI Guidance - Hero Section */}
        <AIGuidancePanel userId={dbUser?.id} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Overall</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{overallPercentage}%</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Attended</p>
            <p className="text-3xl font-black text-green-500">{totalAttended}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Missed</p>
            <p className="text-3xl font-black text-red-500">{totalHeld - totalAttended}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Goal</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{timetable.minAttendance}%</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Attendance Trend */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="w-4 h-4 text-zinc-400" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">14-Day Trend</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeTrend}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={{ stroke: "#27272a" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#fafafa" }}
                    formatter={(value) => [`${value ?? 0}%`, "Attendance"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCumulative)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overall Distribution */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FiPieChart className="w-4 h-4 text-zinc-400" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Attendance Distribution</h3>
            </div>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) => [value ?? 0, name ?? ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Subject Breakdown Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FiBarChart2 className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Subject-wise Attendance</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectBarData} layout="vertical">
                {/* Safezone background */}
                <ReferenceArea
                  x1={timetable.minAttendance}
                  x2={100}
                  fill="#10b981"
                  fillOpacity={0.1}
                />
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, _, props) => [
                    `${value ?? 0}% (${props.payload?.attended ?? 0}/${props.payload?.total ?? 0})`,
                    props.payload?.fullName ?? "",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="percentage"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  name="Attendance %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiBarChart2 className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Daily Attendance % (Last 14 Days)</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData.filter(d => d.percentage !== null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, _, props) => [
                    `${value ?? 0}% (${props.payload?.present ?? 0}/${props.payload?.total ?? 0} classes)`,
                    "Attendance",
                  ]}
                />
                <Bar
                  dataKey="percentage"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Attendance %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recovery Calculator */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <RecoveryCalculator
            subjects={timetable.subjects}
            minAttendance={timetable.minAttendance}
            remainingWeeks={timetable.totalWeeks - timetable.completedWeeks}
          />
        </div>

        {/* Attendance Predictions */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiTarget className="w-4 h-4 text-zinc-400" />
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Attendance Predictions</h3>
          </div>
          <AttendancePredictor
            subjects={timetable.subjects}
            timetable={{
              totalWeeks: timetable.totalWeeks,
              completedWeeks: timetable.completedWeeks,
              minAttendance: timetable.minAttendance,
            }}
            mode="detailed"
          />
        </div>
      </div>
    </div>
  );
}
