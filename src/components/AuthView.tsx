import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { GraduationCap, ShieldCheck, UserCircle, Chrome, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { localDb } from '../lib/localDb';

export const AuthView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [appTitle, setAppTitle] = useState('12th Physics-chapterwise');
  const { refreshProfile } = useAuth();

  useEffect(() => {
    localDb.getSettings().then(settings => {
      if (settings?.appTitle) {
        setAppTitle(settings.appTitle);
      }
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) throw new Error('Sign in failed - no user returned');

      // Check for user profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Show name prompt instead of auto-creating
        setTempUser(user);
        setStudentName((user.displayName || '').toUpperCase());
        setShowNamePrompt(true);
      } else {
        toast.success('Welcome back!');
        await refreshProfile();
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error message
        setLoading(false);
        return;
      }
      console.error('Auth error:', error);
      toast.error('Sign-in error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    if (!studentName.trim()) {
      toast.error('Kripya apna nam bharein');
      return;
    }
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', tempUser.uid);
      const isBootstrappedAdmin = tempUser.email === 'jugalkishorenamdeo@gmail.com';
      
      const newProfile: UserProfile = {
        uid: tempUser.uid,
        email: tempUser.email || '',
        displayName: studentName.trim().toUpperCase(),
        role: isBootstrappedAdmin ? 'admin' : 'student',
        attemptsRemaining: 5,
        totalAttempts: 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(userRef, newProfile);
      toast.success(`Welcome ${newProfile.displayName}! Account created.`);
      await refreshProfile();
    } catch (error: any) {
      toast.error('Error saving profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (showNamePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-sky-50 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md z-10 card p-10 shadow-2xl shadow-zinc-200/50"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-zinc-900">Student Name Batayein</h2>
            <p className="text-zinc-500 text-sm mt-2">Apna sahi nam bharein taaki records mein wahi dikhe.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Poora Nam (Full Name)</label>
              <input 
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value.toUpperCase())}
                placeholder="Enter Student Name"
                className="input h-14 bg-zinc-50 border-zinc-100 font-bold focus:border-sky-500 w-full"
                autoFocus
              />
            </div>

            <button 
              onClick={finalizeRegistration}
              disabled={loading}
              className="w-full h-14 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Shuru Karein (Get Started)'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-sky-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-sky-200/40 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-100/40 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-sky-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-sky-100 ring-8 ring-sky-50">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">
            {appTitle}
          </h1>
          <p className="text-zinc-500 font-medium">
            Sign in with Google to access your material
          </p>
        </div>

        <div className="card p-8 shadow-2xl shadow-zinc-200/50 flex flex-col items-center">
          <div className="mb-8 text-center uppercase tracking-widest">
            <h2 className="text-sm font-black text-zinc-400">Secure Access</h2>
          </div>

          <button 
            onClick={handleGoogleSignIn} 
            disabled={loading}
            className="w-full h-16 flex items-center justify-center gap-4 bg-white border-2 border-zinc-100 rounded-2xl hover:border-sky-500 hover:bg-sky-50 transition-all font-bold text-zinc-700 active:scale-95 shadow-sm group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                  <Chrome size={20} className="text-sky-600" />
                </div>
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-10 flex flex-col gap-4 w-full">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-100" />
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-300">Features</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <AuthFeature icon={Check} label="Real-time Stats" />
              <AuthFeature icon={ShieldCheck} label="Secure Progress" />
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[10px] uppercase tracking-widest font-black text-zinc-400">
          Powered by AI Studio & Firebase
        </p>
      </motion.div>
    </div>
  );
};

const AuthFeature = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <div className="flex items-center gap-2 p-3 bg-zinc-50/50 rounded-xl border border-zinc-100/50">
    <Icon size={14} className="text-sky-600" />
    <span className="text-[10px] font-bold text-zinc-500">{label}</span>
  </div>
);

