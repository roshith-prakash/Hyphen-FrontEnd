import {
  Signup,
  Login,
  Onboarding,
  Signout,
  ForgotPassword,
  AuthAction,
  Profile,
  EditProfile,
  NotFound,
  Home,
  TimetableUpload,
  Attendance,
  EditTimetable,
  Dashboard,
} from "./pages/index";
import { useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { axiosInstance } from "./utils/axios";
import { SyncLoader } from "react-spinners";
import { Navbar, Footer } from "./components";
import { Toaster } from "react-hot-toast";
import { type ContextValue, useDarkMode } from "./context/DarkModeContext";
import Protector from "./components/Protector";

function App() {
  const { isDarkMode } = useDarkMode() as ContextValue;

  // Check if server is active / keep server active
  const { data, isLoading } = useQuery({
    queryKey: ["check"],
    queryFn: () => {
      return axiosInstance.get("/");
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    retry: 10,
  });

  return (
    <div
      className={`bg-whitebg dark:bg-darkbg font-body dark:text-darkmodetext dark:placeholder:text-darkmodetext`}
    >
      {/* Toaster for toasts */}
      <Toaster
        toastOptions={{
          style: {
            background: isDarkMode ? "#333" : "#fff",
            color: isDarkMode ? "#fff" : "#000",
          },
        }}
      />

      {/* If server isn't ready for use, show a loading indicator */}
      {isLoading && (
        <div className="min-h-screen w-full flex flex-col gap-y-10 justify-center items-center">
          <img
            src="https://res.cloudinary.com/do8rpl9l4/image/upload/v1724056376/sleep_hyhact.webp"
            className="w-52 pointer-events-none"
          />
          {/* Three dots loading indicator */}
          <SyncLoader
            color={"#9b0ced"}
            loading={isLoading}
            size={65}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
          {/* Typewriter effect to show 4 different texts. Gradient text */}
          <p className="text-center px-5 max-w-2xl lml-3 font-medium mb-10 text-xl">
            Loading....
          </p>
        </div>
      )}

      {/* When server responds, allow the user to use the app */}
      {data?.data && (
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Home Page */}
                <Route path="/" element={<Home />} />

                {/* Auth Routes */}
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/signout" element={<Signout />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth-action" element={<AuthAction />} />

                {/* Protected routes - Logged In User required. */}

                <Route
                  path="/edit-profile"
                  element={
                    <Protector>
                      <EditProfile />
                    </Protector>
                  }
                />

                {/* View your profile */}
                <Route
                  path="/profile"
                  element={
                    <Protector>
                      <Profile />
                    </Protector>
                  }
                />

                {/* Timetable Upload */}
                <Route
                  path="/timetable"
                  element={
                    <Protector>
                      <TimetableUpload />
                    </Protector>
                  }
                />
                <Route
                  path="/edit-timetable"
                  element={
                    <Protector>
                      <EditTimetable />
                    </Protector>
                  }
                />

                {/* Attendance */}
                <Route
                  path="/attendance"
                  element={
                    <Protector>
                      <Attendance />
                    </Protector>
                  }
                />

                {/* Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <Protector>
                      <Dashboard />
                    </Protector>
                  }
                />

                {/* 404 error page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      )}
    </div>
  );
}

export default App;