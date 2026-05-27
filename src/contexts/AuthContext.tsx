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
        // Use onSnapshot for real-time updates and to catch doc creation
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            localDb.setCurrentUser(data);
          } else {
            setProfile(null);
            localDb.setCurrentUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Profile snapshot error:', error);
          setLoading(false);
        });
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
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        localDb.setCurrentUser(data);
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
