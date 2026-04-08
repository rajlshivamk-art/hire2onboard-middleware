import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { LoginPage } from "./components/LoginPage";
import { ResetPasswordPage } from './components/ResetPasswordPage';
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
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { RecruiterPerformanceReport } from "./components/RecruiterPerformance";
import { Toaster } from 'react-hot-toast';
import { User } from "./types";
import { api } from "./lib/api";
import { OnboardingUploadPage } from "./components/DocsUpload";
import { RegisterPage } from "./components/RegisterPage";

const urlParams = new URLSearchParams(window.location.search);
const resetToken = urlParams.get('token');
const uploadToken = urlParams.get("uploadToken");

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    const saved = sessionStorage.getItem("currentUser");
    return saved ? "dashboard" : "login";
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'total' | 'hired' | 'rejected'>('total');
  const [listStageFilter, setListStageFilter] = useState<string>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sourceParam, setSourceParam] = useState<string | null>(null);

  useEffect(() => {
    if (resetToken) {
      setCurrentScreen("reset-password");
      return;
    }
    if (uploadToken) {
      setCurrentScreen("onboarding-upload");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    const jobIdParam = params.get('jobId');
    const source = params.get('source');
    if (screenParam && jobIdParam) {
      setCurrentScreen(screenParam);
      setSelectedJobId(jobIdParam);
    }
    if (source) setSourceParam(source);
    if (currentUser) {
      api.users.getById(currentUser.id)
        .then((u: User) => {
          setCurrentUser(u);
          sessionStorage.setItem("currentUser", JSON.stringify(u));
        })
        .catch(err => console.error("Failed to refresh profile:", err));
    }
  }, []);

  const handleLogin = (user: User) => {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    setCurrentUser(user);
    setCurrentScreen("dashboard");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser");
    setCurrentUser(null);
    setCurrentScreen("login");
    setSelectedJobId(null);
    setSelectedCandidateId(null);
  };

  const navigateTo = (
    screen: string,
    params?: { jobId?: string; candidateId?: string; filter?: 'total' | 'hired' | 'rejected'; stage?: string },
  ) => {
    setCurrentScreen(screen);
    if (params?.jobId) setSelectedJobId(params.jobId);
    if (params?.candidateId) setSelectedCandidateId(params.candidateId);
    if (params?.filter) setListFilter(params.filter);
    setListStageFilter(params?.stage || 'all');
    setIsMobileMenuOpen(false);
  };

  const handleApplicationSubmit = (_application: any) => {};

  // ── NAV ITEMS ──
  const navItems = [
    { key: "dashboard",       label: "Dashboard",             screens: ["dashboard"] },
    { key: "jobs",            label: "Job Postings",          screens: ["jobs", "create-job"] },
    { key: "pipeline",        label: "Recruitment Pipeline",  screens: ["pipeline"] },
    { key: "onboarding",      label: "Onboarding",            screens: ["onboarding"] },
    { key: "recruiter-report",label: "Recruiter Report",      screens: ["recruiter-report"] },
  ];

  // ── PUBLIC SCREENS ──
  if (currentScreen === "public-jobs") {
    return (
      <div className="min-h-screen">
        <div className="glass-nav sticky top-0 z-10 px-6 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-gradient rounded-xl flex items-center justify-center shadow-primary">
                <span className="text-white font-bold text-xl">
                  {currentUser?.company?.substring(0, 1) || "A"}
                </span>
              </div>
              <h1 className="text-white font-medium tracking-tight">
                {currentUser?.company || "Recruitment HRMS"}
              </h1>
            </div>
            <button
              onClick={() => setCurrentScreen("login")}
              className="btn-glass-primary px-6 py-2.5 rounded-xl"
            >
              Staff Login
            </button>
          </div>
        </div>
        <PublicJobBoard onApply={(jobId) => navigateTo("apply", { jobId })} />
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

  // ── RESET PASSWORD ──
  if (currentScreen === "reset-password" && resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onSuccess={() => setCurrentScreen("login")}
      />
    );
  }

  // ── FORGOT PASSWORD ──
  if (currentScreen === "forgot-password") {
    return <ForgotPasswordPage onBack={() => setCurrentScreen("login")} />;
  }

  // ── ONBOARDING UPLOAD ──
  if (currentScreen === "onboarding-upload" && uploadToken) {
    return <OnboardingUploadPage uploadToken={uploadToken} />;
  }

  if (currentScreen === "register") {
  return (
    <RegisterPage
      onRegisterSuccess={() => setCurrentScreen("login")}
    />
  );
}

  // ── LOGIN ──
  if (currentScreen === "login" || !currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onPublicAccess={() => setCurrentScreen("public-jobs")}
        onForgotPassword={() => setCurrentScreen("forgot-password")}
        onRegister={() => setCurrentScreen("register")} 
      />
    );
  }

  // ── MAIN APP ──
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            zIndex: 9999,
            background: 'rgba(12, 10, 48, 0.92)',
            backdropFilter: 'blur(16px)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            padding: '10px 16px',
            fontSize: '13px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
          },
        }}
      />

      <div className="flex h-screen overflow-hidden">

        {/* ── Mobile top bar ── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 glass-nav z-40 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-gradient rounded-xl flex items-center justify-center shadow-primary">
                <span className="text-white font-bold text-sm">
                  {currentUser?.company?.substring(0, 1) || "A"}
                </span>
              </div>
              <span className="text-white font-medium text-base tracking-tight">
                {currentUser?.company || "Recruitment HRMS"}
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 btn-glass-ghost rounded-xl"
            >
              {isMobileMenuOpen
                ? <X className="w-5 h-5 text-white/80" />
                : <Menu className="w-5 h-5 text-white/80" />
              }
            </button>
          </div>
        </div>

        {/* ── Mobile overlay ── */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 mt-[57px]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 glass-sidebar
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          mt-[57px] lg:mt-0
        `}>

          {/* Logo + company — desktop only */}
          <div className="p-5 border-b border-white/10 hidden lg:block">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-gradient rounded-xl flex items-center justify-center shadow-primary flex-shrink-0">
                <span className="text-white font-bold text-xl">
                  {currentUser?.company?.substring(0, 1) || "A"}
                </span>
              </div>
              <span className="text-white font-medium tracking-tight leading-tight">
                {currentUser?.company || "Recruitment HRMS"}
              </span>
            </div>

            {/* User card */}
            <div className="glass rounded-xl p-3">
              <p className="text-white/90 text-sm font-medium truncate">
                {currentUser.name}
              </p>
              <p className="text-white/45 text-xs mt-0.5">
                {currentUser.email === 'administrator' ? 'Super HR' : currentUser.role}
              </p>
            </div>
          </div>

          {/* User card — mobile only */}
          <div className="p-4 border-b border-white/10 lg:hidden">
            <div className="glass rounded-xl p-3">
              <p className="text-white/90 text-sm font-medium truncate">
                {currentUser.name}
              </p>
              <p className="text-white/45 text-xs mt-0.5">
                {currentUser.email === 'administrator' ? 'Super HR' : currentUser.role}
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const isActive = item.screens.includes(currentScreen);
              return (
                <button
                  key={item.key}
                  onClick={() => navigateTo(item.key)}
                  className={`
                    w-full text-left px-4 py-2.5 rounded-xl text-sm
                    transition-all duration-200
                    ${isActive ? 'nav-item-active' : 'nav-item-inactive'}
                  `}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Admin — role gated */}
            {(currentUser.role === "HR" || currentUser.canManageUsers) && (
              <button
                onClick={() => navigateTo("admin")}
                className={`
                  w-full text-left px-4 py-2.5 rounded-xl text-sm
                  transition-all duration-200
                  ${currentScreen === "admin" ? 'nav-item-active' : 'nav-item-inactive'}
                `}
              >
                Admin Settings
              </button>
            )}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm
                text-red-400 hover:bg-red-500/10 hover:text-red-300
                transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto pt-[57px] lg:pt-0">
          {currentScreen === "dashboard" && (
            <Dashboard user={currentUser} navigateTo={navigateTo} />
          )}
          {currentScreen === "recruiter-report" && (
            <RecruiterPerformanceReport />
          )}
          {currentScreen === "jobs" && (
            <JobManagement user={currentUser} navigateTo={navigateTo} />
          )}
          {currentScreen === "create-job" && (
            <CreateEditJob
              user={currentUser}
              navigateTo={navigateTo}
              jobId={selectedJobId}
            />
          )}
          {currentScreen === "pipeline" && (
            <KanbanBoard user={currentUser} navigateTo={navigateTo} />
          )}
          {currentScreen === "candidate-detail" && selectedCandidateId && (
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
            <OnboardingScreen user={currentUser} navigateTo={navigateTo} />
          )}
          {currentScreen === "admin" &&
            (currentUser.role === "HR" || currentUser.canManageUsers) && (
              <AdminSettings />
            )}
        </main>
      </div>
    </>
  );
}