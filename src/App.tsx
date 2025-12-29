import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { JobManagement } from "./components/JobManagement";
import { CreateEditJob } from "./components/CreateEditJob";
import { KanbanBoard } from "./components/KanbanBoard";
import { CandidateDetail } from "./components/CandidateDetail";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { AdminSettings } from "./components/AdminSettings";
import { PublicJobBoard } from "./components/PublicJobBoard";
import { ApplicationForm } from "./components/ApplicationForm";
import { CandidateList } from "./components/CandidateList";
import { User } from "./types";
import { api } from "./lib/api";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    // If we have a session user, go to dashboard, otherwise login
    // checking sessionStorage directly here is redundant but safe since state init runs once
    const saved = sessionStorage.getItem("currentUser");
    return saved ? "dashboard" : "login";
  });

  const [selectedJobId, setSelectedJobId] = useState<
    string | null
  >(null);
  const [selectedCandidateId, setSelectedCandidateId] =
    useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'total' | 'hired' | 'rejected'>('total');
  const [listStageFilter, setListStageFilter] = useState<string>('all');
  // const [candidates, setCandidates] = useState<any[]>([]); // Removed unused state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = (user: User) => {
    // Session storage survives refresh but is cleared on closing tab/window
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    setCurrentUser(user);
    setCurrentScreen("dashboard");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser");
    setCurrentUser(null);
    setCurrentScreen("login"); // Go back to login, not public jobs
  };

  const navigateTo = (
    screen: string,
    params?: { jobId?: string; candidateId?: string; filter?: 'total' | 'hired' | 'rejected'; stage?: string },
  ) => {
    setCurrentScreen(screen);
    if (params && 'jobId' in params) setSelectedJobId(params.jobId || null);
    if (params?.candidateId)
      setSelectedCandidateId(params.candidateId);
    if (params?.filter) setListFilter(params.filter);
    if (params?.stage) setListStageFilter(params.stage);
    else setListStageFilter('all'); // Reset if not provided
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  /* URL Parameter Parsing for Deep Linking (Source Tracking) */
  const [sourceParam, setSourceParam] = useState<string | null>(null);

  useEffect(() => {
    // Parse query parameters
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    const jobIdParam = params.get('jobId');
    const source = params.get('source');

    if (screenParam && jobIdParam) {
      setCurrentScreen(screenParam);
      setSelectedJobId(jobIdParam);
    }

    if (source) {
      setSourceParam(source);
    }

    // Refresh user profile if logged in
    if (currentUser) {
      api.users.getById(currentUser.id)
        .then((u: User) => {
          setCurrentUser(u);
          sessionStorage.setItem("currentUser", JSON.stringify(u));
        })
        .catch((err: any) => console.error("Failed to refresh profile:", err));
    }
  }, []);

  const handleApplicationSubmit = (_application: any) => {
    // In real app, this update is handled by Dashboard fetching fresh data
  };

  // Public portal screens (no login required)
  if (currentScreen === "public-jobs") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-5 shadow-lg sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-xl">{currentUser?.company?.substring(0, 1) || "A"}</span>
              </div>
              <h1 className="text-blue-600 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {currentUser?.company || "Recruitment HRMS"}
              </h1>
            </div>
            <button
              onClick={() => setCurrentScreen("login")}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Staff Login
            </button>
          </div>
        </div>
        <PublicJobBoard
          onApply={(jobId) => navigateTo("apply", { jobId })}
        />
      </div>
    );
  }

  if (currentScreen === "apply" && selectedJobId) {
    return (
      <ApplicationForm
        jobId={selectedJobId}
        initialSource={sourceParam || undefined}
        onBack={() => setCurrentScreen("public-jobs")}
        onSubmit={handleApplicationSubmit}
      />
    );
  }

  if (currentScreen === "login" || !currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onPublicAccess={() => setCurrentScreen("public-jobs")}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-40 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-lg">{currentUser?.company?.substring(0, 1) || "A"}</span>
            </div>
            <h1 className="text-blue-600 tracking-tight text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {currentUser?.company || "Recruitment HRMS"}
            </h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 mt-[57px]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl lg:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        mt-[57px] lg:mt-0
      `}>
        <div className="p-6 border-b border-gray-100/50 hidden lg:block bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30 ring-2 ring-blue-100">
              <span className="text-white font-bold text-xl">{currentUser?.company?.substring(0, 1) || "A"}</span>
            </div>
            <h1 className="text-blue-600 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {currentUser?.company || "Recruitment HRMS"}
            </h1>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-gray-900 text-sm">
              {currentUser.name}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {currentUser.email === 'administrator' ? 'Super HR' : currentUser.role}
            </p>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 lg:hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-gray-900 text-sm">
              {currentUser.name}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {currentUser.email === 'administrator' ? 'Super HR' : currentUser.role}
            </p>
          </div>
        </div>

        <nav className="px-4 space-y-1 py-4">
          <button
            onClick={() => navigateTo("dashboard")}
            className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 ${currentScreen === "dashboard"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigateTo("jobs")}
            className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 ${currentScreen === "jobs" ||
              currentScreen === "create-job"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
              }`}
          >
            Job Postings
          </button>
          <button
            onClick={() => navigateTo("pipeline")}
            className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 ${currentScreen === "pipeline"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
              }`}
          >
            Recruitment Pipeline
          </button>
          <button
            onClick={() => navigateTo("onboarding")}
            className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 ${currentScreen === "onboarding"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
              }`}
          >
            Onboarding
          </button>
          {(currentUser.role === "HR" || currentUser.canManageUsers) && (
            <button
              onClick={() => navigateTo("admin")}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all duration-200 ${currentScreen === "admin"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
                }`}
            >
              Admin Settings
            </button>
          )}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-[57px] lg:pt-0">
        {currentScreen === "dashboard" && (
          <Dashboard
            user={currentUser}
            navigateTo={navigateTo}
          />
        )}
        {currentScreen === "jobs" && (
          <JobManagement
            user={currentUser}
            navigateTo={navigateTo}
          />
        )}
        {currentScreen === "create-job" && (
          <CreateEditJob
            user={currentUser}
            navigateTo={navigateTo}
            jobId={selectedJobId}
          />
        )}
        {currentScreen === "pipeline" && (
          <KanbanBoard
            user={currentUser}
            navigateTo={navigateTo}
          />
        )}
        {currentScreen === "candidate-detail" &&
          selectedCandidateId && (
            <CandidateDetail
              user={currentUser}
              candidateId={selectedCandidateId}
              navigateTo={navigateTo}
            />
          )}
        {currentScreen === "candidate-list" && (
          <CandidateList
            user={currentUser}
            navigateTo={navigateTo}
            filter={listFilter}
            initialStage={listStageFilter}
          />
        )}
        {currentScreen === "onboarding" && (
          <OnboardingScreen
            user={currentUser}
            navigateTo={navigateTo}
          />
        )}
        {currentScreen === "admin" &&
          (currentUser.role === "HR" || currentUser.canManageUsers) && (
            <AdminSettings />
          )}
      </main>
    </div>
  );
}