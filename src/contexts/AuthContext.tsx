import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { localDb } from '../lib/localDb';
import { safeLocalStorage } from '../lib/safeStorage';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStudentView: boolean;
  logout: () => Promise<void>;
  setStudentView: (val: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isStudentView: false,
  logout: async () => {},
  setStudentView: () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStudentView, setIsStudentView] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        // Pre-fill from local cache for instant zero-latency load
        const cached = safeLocalStorage.getItem(`user_profile_${currentUser.uid}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setProfile(parsed);
            localDb.setCurrentUser(parsed);
          } catch {}
        }

        // Use onSnapshot for real-time updates and to catch doc creation
        try {
          unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);
              localDb.setCurrentUser(data);
              safeLocalStorage.setItem(`user_profile_${currentUser.uid}`, JSON.stringify(data));
            } else {
              // If not found in Firestore doc but user is admin email, grant fallback admin
              const isAdminEmail = currentUser.email === 'jugalkishorenamdeo@gmail.com';
              const cachedExisting = safeLocalStorage.getItem(`user_profile_${currentUser.uid}`);
              if (!cachedExisting && isAdminEmail) {
                const autoProfile: UserProfile = {
                  uid: currentUser.uid,
                  email: currentUser.email || '',
                  displayName: (currentUser.displayName || 'Admin').toUpperCase(),
                  role: 'admin',
                  attemptsRemaining: 999,
                  totalAttempts: 0,
                  createdAt: new Date().toISOString()
                };
                setProfile(autoProfile);
                localDb.setCurrentUser(autoProfile);
              }
            }
            setLoading(false);
          }, (error) => {
            console.warn('Profile snapshot notice (using offline/cached profile if available):', error.message);
            const cachedFallback = safeLocalStorage.getItem(`user_profile_${currentUser.uid}`);
            if (cachedFallback) {
              try {
                const p = JSON.parse(cachedFallback);
                setProfile(p);
                localDb.setCurrentUser(p);
              } catch {}
            } else {
              const isAdminEmail = currentUser.email === 'jugalkishorenamdeo@gmail.com';
              const autoProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: (currentUser.displayName || currentUser.email?.split('@')[0] || 'Student').toUpperCase(),
                role: isAdminEmail ? 'admin' : 'student',
                attemptsRemaining: 5,
                totalAttempts: 0,
                createdAt: new Date().toISOString()
              };
              setProfile(autoProfile);
              localDb.setCurrentUser(autoProfile);
            }
            setLoading(false);
          });
        } catch {
          setLoading(false);
        }
      } else {
        setProfile(null);
        localDb.setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) (unsubscribeProfile as () => void)();
    };
  }, []);

  const logout = async () => {
    try {
      if (user?.uid) {
        safeLocalStorage.removeItem(`user_profile_${user.uid}`);
      }
      await signOut(auth);
      setProfile(null);
      localDb.setCurrentUser(null);
      setIsStudentView(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          localDb.setCurrentUser(data);
          safeLocalStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Refresh profile notice:', err);
      }
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user,
      profile, 
      loading, 
      isAdmin,
      isStudentView: isAdmin && isStudentView,
      logout,
      setStudentView: setIsStudentView,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

