import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthView } from './components/AuthView';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, GraduationCap, ShieldCheck } from 'lucide-react';
import { cn } from './lib/utils';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { Lock, ShieldAlert, Users as UsersIcon, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { localDb } from './lib/localDb';
import { AppSettings } from './types';
import { safeLocalStorage, safeSessionStorage } from './lib/safeStorage';

const MainApp: React.FC = () => {
  const { profile, loading, isAdmin, logout, isStudentView, setStudentView } = useAuth();
  
  const [isAuthorized, setIsAuthorized] = React.useState(() => {
    return safeSessionStorage.getItem('admin_authorized') === 'true';
  });
  const [loginForm, setLoginForm] = React.useState({ username: '', password: '' });
  const [loginError, setLoginError] = React.useState(false);
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [adminSettings, setAdminSettings] = React.useState<AppSettings | null>(null);
  const [isRemixBlocked, setIsRemixBlocked] = React.useState(false);
  const [showSafetyNotice, setShowSafetyNotice] = React.useState(false);

  React.useEffect(() => {
    const isDismissed = safeLocalStorage.getItem('safety_notice_dismissed') || safeSessionStorage.getItem('safety_notice_dismissed');
    if (isDismissed !== 'true') {
      setShowSafetyNotice(true);
    } else {
      document.body.classList.add('hide-banners');
    }
  }, []);

  const dismissNotice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSafetyNotice(false);
    safeLocalStorage.setItem('safety_notice_dismissed', 'true');
    safeSessionStorage.setItem('safety_notice_dismissed', 'true');
    document.body.classList.add('hide-banners');
    toast.success('Notice dismissed');
  };

  React.useEffect(() => {
    const checkRemix = async () => {
      const settings = await localDb.getSettings();
      setAdminSettings(settings);
      
      if (settings && !settings.allowRemix) {
        const authorizedHosts = [
          'ais-dev-l6bzquakx5qtydem5nhr7l-625200999999.asia-southeast1.run.app',
          'ais-pre-l6bzquakx5qtydem5nhr7l-625200999999.asia-southeast1.run.app',
          'ais-dev-l6bzquakx5qtydem5nhr7l-625200999999',
          'ais-pre-l6bzquakx5qtydem5nhr7l-625200999999',
          'ais-dev-rchnzxeimrognemvlipd5q-625200999999.asia-southeast1.run.app',
          'ais-pre-rchnzxeimrognemvlipd5q-625200999999.asia-southeast1.run.app',
          'ais-dev-rchnzxeimrognemvlipd5q-625200999999',
          'ais-pre-rchnzxeimrognemvlipd5q-625200999999',
          'localhost',
          '127.0.0.1'
        ];
        
        const currentHost = window.location.hostname;
        const isAuthorized = authorizedHosts.some(host => 
          currentHost === host || currentHost.startsWith(host + '.')
        );

        if (!isAuthorized) {
          setIsRemixBlocked(true);
        }
      }
    };
    
    checkRemix();
  }, []);

  React.useEffect(() => {
    if (isAdmin && !isStudentView && !isAuthorized && !adminSettings) {
      localDb.getSettings().then(setAdminSettings);
    }
  }, [isAdmin, isStudentView, isAuthorized, adminSettings]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetUser = adminSettings?.adminUsername || 'admin';
    const targetPass = adminSettings?.adminPassword || 'admin123';

    if (loginForm.username === targetUser && loginForm.password === targetPass) {
      setIsAuthorized(true);
      safeSessionStorage.setItem('admin_authorized', 'true');
      toast.success('Admin access granted');
    } else {
      setLoginError(true);
      toast.error('Invalid credentials');
    }
  };

  if (isRemixBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[40px] shadow-2xl max-w-lg border-b-8 border-red-600"
        >
          <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ShieldAlert size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 mb-4">REMIX BLOCKED</h1>
          <p className="text-lg font-bold text-zinc-500 uppercase tracking-widest leading-relaxed mb-8">
            You are not allowed to Remix
          </p>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
               The owner has disabled copying for this application.
             </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-8 h-8 bg-sky-600/20 rounded-full flex items-center justify-center"
        >
          <div className="w-4 h-4 bg-sky-600 rounded-full" />
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return <AuthView />;
  }

  const showAdminUI = isAdmin && !isStudentView;

  if (showAdminUI && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="card p-8 border-2 border-zinc-100 shadow-xl shadow-zinc-200/50 bg-white">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-sky-200">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Admin Console</h2>
              <p className="text-sm font-bold text-zinc-500 mt-1 uppercase tracking-widest text-[10px]">Restricted Access</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">User ID</label>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    required
                    value={loginForm.username}
                    onChange={e => {
                      setLoginForm(prev => ({ ...prev, username: e.target.value }));
                      setLoginError(false);
                    }}
                    className={cn(
                      "w-full bg-zinc-50 border-2 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none transition-all",
                      loginError ? "border-red-200 focus:border-red-500" : "border-zinc-100 focus:border-sky-500"
                    )}
                    placeholder="Enter admin ID"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Password</label>
                <div className="relative">
                  <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type={showAdminPassword ? "text" : "password"} 
                    required
                    value={loginForm.password}
                    onChange={e => {
                      setLoginForm(prev => ({ ...prev, password: e.target.value }));
                      setLoginError(false);
                    }}
                    className={cn(
                      "w-full bg-zinc-50 border-2 rounded-xl py-3 pl-10 pr-12 text-sm font-bold outline-none transition-all",
                      loginError ? "border-red-200 focus:border-red-500" : "border-zinc-100 focus:border-sky-500"
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-zinc-900 text-white rounded-xl py-3.5 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 mt-2"
              >
                Verify Credentials
              </button>

              <div className="pt-4 flex items-center justify-center gap-2">
                <LogOut size={12} className="text-zinc-400" />
                <button 
                 type="button"
                 onClick={() => logout()}
                 className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => {
              if (isAdmin && isStudentView) {
                setStudentView(false);
              } else {
                window.location.reload();
              }
            }} 
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center ${showAdminUI ? 'bg-sky-600' : 'bg-sky-600'}`}>
              {showAdminUI ? <ShieldCheck size={20} /> : <GraduationCap size={20} />}
            </div>
            <div>
              <h2 className={cn("font-bold tracking-tight", showAdminUI ? "text-sky-900" : "text-zinc-900")}>
                {adminSettings?.appTitle || '12th Physics-chapterwise'}
              </h2>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold leading-none">
                {showAdminUI ? 'Admin Console' : (isAdmin ? 'Admin (Student View)' : 'Student Portal')}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{profile.displayName}</p>
              <p className="text-xs text-zinc-500">{profile.email || profile.uid}</p>
            </div>
            
            {isAdmin && isStudentView && (
              <button 
                onClick={() => setStudentView(false)}
                className="px-3 py-1.5 bg-sky-600 text-white text-[10px] uppercase font-black tracking-widest rounded-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100"
              >
                Exit Student View
              </button>
            )}

            <button 
              onClick={() => logout()}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-20">
        <AnimatePresence mode="wait">
          {showAdminUI ? (
            <AdminDashboard key="admin" onSettingsSave={(newSettings) => setAdminSettings(newSettings)} />
          ) : (
            <StudentDashboard key="student" />
          )}
        </AnimatePresence>
      </main>

      {showSafetyNotice && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-zinc-200 p-3 z-[9999] flex flex-col sm:flex-row items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)] gap-3 animate-in fade-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
              <ShieldAlert size={18} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-zinc-600 leading-tight">
              Safety Note: This app is for educational purposes. Some platform warnings may appear for security.
            </p>
          </div>
          <button 
            onClick={dismissNotice}
            className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-700 transition-all active:scale-95 shadow-lg shadow-zinc-200 cursor-pointer pointer-events-auto"
          >
            Got it, Dismiss All
          </button>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
