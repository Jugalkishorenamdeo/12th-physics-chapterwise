import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { UserProfile, Question, Attempt, AppSettings } from '../types';
import { safeLocalStorage } from './safeStorage';

const COLLECTIONS = {
  USERS: 'users',
  QUESTIONS: 'questions',
  ATTEMPTS: 'chapterwise_responses',
  SETTINGS: 'settings'
};

const DEFAULT_SETTINGS: AppSettings = {
  adminUsername: 'admin',
  adminPassword: 'admin123',
  appTitle: '12th Physics-chapterwise',
  quizTime: 15,
  maintenanceMode: false,
  maxAttempts: 5,
  leaveQuizEnabled: true,
  certificateMinPercentage: 70,
  isCertificateEnabled: true,
  maxAttemptsPerLevel: 2,
  certificateMessage: 'By completing Easy, Medium, and Hard challenges',
  randomizeQuestions: false,
  randomizeOptions: false,
  allowRemix: false
};

const SAMPLE_FALLBACK_QUESTIONS: Question[] = [
  {
    id: 'sample-q1',
    topic: 'Electric Charges and Fields',
    difficulty: 'Easy',
    question: 'What is the SI unit of electric charge?',
    optionA: 'Coulomb',
    optionB: 'Ampere',
    optionC: 'Volt',
    optionD: 'Ohm',
    correctOption: 'A',
    remark: 'Electric charge is measured in Coulombs (C).',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-q2',
    topic: 'Electrostatic Potential and Capacitance',
    difficulty: 'Easy',
    question: 'The capacitance of a parallel plate capacitor increases when:',
    optionA: 'Plate area increases',
    optionB: 'Distance between plates increases',
    optionC: 'Dielectric constant decreases',
    optionD: 'Plate potential decreases',
    correctOption: 'A',
    remark: 'C = (ε₀ * A) / d, so increasing area A increases capacitance.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-q3',
    topic: 'Current Electricity',
    difficulty: 'Medium',
    question: 'Kirchhoff’s first rule (junction rule) is based on the conservation of:',
    optionA: 'Energy',
    optionB: 'Charge',
    optionC: 'Momentum',
    optionD: 'Angular Momentum',
    correctOption: 'B',
    remark: 'Kirchhoff’s Current Law (KCL) is based on the conservation of electric charge.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-q4',
    topic: 'Moving Charges and Magnetism',
    difficulty: 'Medium',
    question: 'The magnetic force acting on a stationary charge in a magnetic field is:',
    optionA: 'qvB',
    optionB: 'Zero',
    optionC: 'q/B',
    optionD: 'qv²/B',
    correctOption: 'B',
    remark: 'F = q(v × B). Since velocity v = 0, magnetic force is zero.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-q5',
    topic: 'Electromagnetic Induction',
    difficulty: 'Hard',
    question: 'Lenz’s law is a consequence of the law of conservation of:',
    optionA: 'Charge',
    optionB: 'Energy',
    optionC: 'Mass',
    optionD: 'Magnetic Flux',
    correctOption: 'B',
    remark: 'Lenz’s law directly follows the conservation of energy.',
    createdAt: new Date().toISOString()
  }
];

// In-memory cache store with timestamp to minimize Firestore read units
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache: {
  settings?: CacheEntry<AppSettings>;
  questions?: CacheEntry<Question[]>;
  users?: CacheEntry<UserProfile[]>;
  attempts?: Record<string, CacheEntry<Attempt[]>>;
} = {};

const CACHE_TTL_MS = 25000; // 25 seconds in-memory TTL to conserve quota

export const localDb = {
  // --- AUTH / USER MANAGEMENT ---
  getCurrentUser: (): UserProfile | null => {
    return null; 
  },

  setCurrentUser: (user: UserProfile | null) => {
    if (user?.uid) {
      safeLocalStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(user));
    }
  },

  saveUser: async (user: UserProfile) => {
    try {
      safeLocalStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(user));
      // Invalidate users cache
      delete memoryCache.users;

      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        ...user,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.USERS}/${user.uid}`);
    }
  },

  saveUsers: async (users: UserProfile[]) => {
    try {
      delete memoryCache.users;
      safeLocalStorage.setItem('app_cached_users', JSON.stringify(users));

      const batch = writeBatch(db);
      users.forEach(user => {
        const userRef = doc(db, COLLECTIONS.USERS, user.uid);
        batch.set(userRef, { ...user, updatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.USERS);
    }
  },

  getUsers: async (forceRefresh = false): Promise<UserProfile[]> => {
    const now = Date.now();
    if (!forceRefresh && memoryCache.users && (now - memoryCache.users.timestamp < CACHE_TTL_MS)) {
      return memoryCache.users.data;
    }

    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      const users = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));
      
      memoryCache.users = { data: users, timestamp: now };
      safeLocalStorage.setItem('app_cached_users', JSON.stringify(users));
      return users;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.USERS);
      const cached = safeLocalStorage.getItem('app_cached_users');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          memoryCache.users = { data: parsed, timestamp: now };
          return parsed;
        } catch {
          // ignore parsing error
        }
      }
      return [];
    }
  },

  deleteUser: async (uid: string) => {
    try {
      delete memoryCache.users;
      await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.USERS}/${uid}`);
    }
  },

  deleteUsers: async (uids: string[]) => {
    try {
      delete memoryCache.users;
      const batch = writeBatch(db);
      uids.forEach(uid => {
        batch.delete(doc(db, COLLECTIONS.USERS, uid));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.USERS);
    }
  },

  clearStudents: async () => {
    try {
      delete memoryCache.users;
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student')));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.USERS);
    }
  },

  // --- QUESTIONS ---
  getQuestions: async (forceRefresh = false): Promise<Question[]> => {
    const now = Date.now();
    if (!forceRefresh && memoryCache.questions && (now - memoryCache.questions.timestamp < CACHE_TTL_MS)) {
      return memoryCache.questions.data;
    }

    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.QUESTIONS));
      let questions = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Question));
      
      if (questions.length === 0) {
        const cached = safeLocalStorage.getItem('app_cached_questions');
        if (cached) {
          try {
            questions = JSON.parse(cached);
          } catch {
            questions = SAMPLE_FALLBACK_QUESTIONS;
          }
        } else {
          questions = SAMPLE_FALLBACK_QUESTIONS;
        }
      }

      questions.sort((a, b) => {
        const timeA = a.createdAt || '';
        const timeB = b.createdAt || '';
        return timeB.localeCompare(timeA);
      });

      memoryCache.questions = { data: questions, timestamp: now };
      safeLocalStorage.setItem('app_cached_questions', JSON.stringify(questions));
      return questions;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.QUESTIONS);
      
      const cached = safeLocalStorage.getItem('app_cached_questions');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Question[];
          memoryCache.questions = { data: parsed, timestamp: now };
          return parsed;
        } catch {
          // fallback
        }
      }
      return SAMPLE_FALLBACK_QUESTIONS;
    }
  },

  saveQuestions: async (questions: Question[]) => {
    delete memoryCache.questions;
    safeLocalStorage.setItem('app_cached_questions', JSON.stringify(questions));

    try {
      const batch = writeBatch(db);
      questions.forEach(q => {
        const qRef = doc(db, COLLECTIONS.QUESTIONS, q.id || Math.random().toString(36).substr(2, 9));
        batch.set(qRef, { ...q, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.QUESTIONS);
    }
  },

  addQuestion: async (q: Question) => {
    delete memoryCache.questions;
    const id = q.id || Math.random().toString(36).substr(2, 9);
    const newQ: Question = {
      ...q,
      id,
      createdAt: q.createdAt || new Date().toISOString()
    };

    // Update local cache immediately
    const cached = safeLocalStorage.getItem('app_cached_questions');
    let list: Question[] = [];
    if (cached) {
      try { list = JSON.parse(cached); } catch {}
    }
    list.unshift(newQ);
    safeLocalStorage.setItem('app_cached_questions', JSON.stringify(list));

    try {
      await setDoc(doc(db, COLLECTIONS.QUESTIONS, id), newQ);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTIONS.QUESTIONS);
    }
  },

  deleteQuestion: async (id: string) => {
    delete memoryCache.questions;
    const cached = safeLocalStorage.getItem('app_cached_questions');
    if (cached) {
      try {
        const list = JSON.parse(cached) as Question[];
        safeLocalStorage.setItem('app_cached_questions', JSON.stringify(list.filter(q => q.id !== id)));
      } catch {}
    }

    try {
      await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.QUESTIONS}/${id}`);
    }
  },

  deleteQuestions: async (ids: string[]) => {
    delete memoryCache.questions;
    const cached = safeLocalStorage.getItem('app_cached_questions');
    if (cached) {
      try {
        const idSet = new Set(ids);
        const list = JSON.parse(cached) as Question[];
        safeLocalStorage.setItem('app_cached_questions', JSON.stringify(list.filter(q => !idSet.has(q.id))));
      } catch {}
    }

    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, COLLECTIONS.QUESTIONS, id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.QUESTIONS);
    }
  },

  clearQuestions: async () => {
    delete memoryCache.questions;
    safeLocalStorage.removeItem('app_cached_questions');

    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.QUESTIONS));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.QUESTIONS);
    }
  },

  // --- ATTEMPTS ---
  getAttempts: async (forceRefresh = false): Promise<Attempt[]> => {
    const user = auth.currentUser;
    const cacheKey = user ? user.uid : 'all';
    const now = Date.now();

    if (!memoryCache.attempts) memoryCache.attempts = {};

    if (!forceRefresh && memoryCache.attempts[cacheKey] && (now - memoryCache.attempts[cacheKey].timestamp < CACHE_TTL_MS)) {
      return memoryCache.attempts[cacheKey].data;
    }

    if (!user) {
      const cached = safeLocalStorage.getItem(`app_cached_attempts_${cacheKey}`);
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
      return [];
    }

    try {
      let isAdmin = false;
      try {
        const adminDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
        isAdmin = adminDoc.exists() && adminDoc.data()?.role === 'admin';
      } catch {
        // Check local profile
        const cachedProfile = safeLocalStorage.getItem(`user_profile_${user.uid}`);
        if (cachedProfile) {
          try {
            const p = JSON.parse(cachedProfile);
            isAdmin = p.role === 'admin';
          } catch {}
        }
      }

      let q;
      if (isAdmin) {
        q = collection(db, COLLECTIONS.ATTEMPTS);
      } else {
        q = query(
          collection(db, COLLECTIONS.ATTEMPTS), 
          where('userId', '==', user.uid)
        );
      }
      
      const snapshot = await getDocs(q);
      const attempts = snapshot.docs.map(d => ({ ...(d.data() as any), id: d.id } as Attempt));
      attempts.sort((a, b) => {
        const timeA = a.timestamp || '';
        const timeB = b.timestamp || '';
        return timeB.localeCompare(timeA);
      });

      memoryCache.attempts[cacheKey] = { data: attempts, timestamp: now };
      safeLocalStorage.setItem(`app_cached_attempts_${cacheKey}`, JSON.stringify(attempts));
      return attempts;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ATTEMPTS);
      const cached = safeLocalStorage.getItem(`app_cached_attempts_${cacheKey}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          memoryCache.attempts[cacheKey] = { data: parsed, timestamp: now };
          return parsed;
        } catch {}
      }
      return [];
    }
  },

  saveAttempt: async (attempt: Attempt) => {
    const id = attempt.id || Math.random().toString(36).substr(2, 9);
    const newAttempt: Attempt = {
      ...attempt,
      id,
      timestamp: attempt.timestamp || new Date().toISOString()
    };

    // Update local cache
    const cacheKey = attempt.userId || 'all';
    const cached = safeLocalStorage.getItem(`app_cached_attempts_${cacheKey}`);
    let list: Attempt[] = [];
    if (cached) {
      try { list = JSON.parse(cached); } catch {}
    }
    list.unshift(newAttempt);
    safeLocalStorage.setItem(`app_cached_attempts_${cacheKey}`, JSON.stringify(list));
    if (memoryCache.attempts) delete memoryCache.attempts[cacheKey];

    try {
      const attemptRef = doc(db, COLLECTIONS.ATTEMPTS, id);
      const batch = writeBatch(db);
      batch.set(attemptRef, newAttempt);

      // Update user attempts if possible
      if (attempt.userId) {
        const userRef = doc(db, COLLECTIONS.USERS, attempt.userId);
        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            batch.update(userRef, {
              attemptsRemaining: Math.max(0, (userData.attemptsRemaining || 5) - 1),
              totalAttempts: (userData.totalAttempts || 0) + 1
            });
          }
        } catch {
          // continue with attempt write
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch/saveAttempt');
    }
  },

  deleteAttempt: async (id: string) => {
    if (memoryCache.attempts) memoryCache.attempts = {};
    try {
      await deleteDoc(doc(db, COLLECTIONS.ATTEMPTS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.ATTEMPTS}/${id}`);
    }
  },

  deleteAttempts: async (ids: string[]) => {
    if (memoryCache.attempts) memoryCache.attempts = {};
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, COLLECTIONS.ATTEMPTS, id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.ATTEMPTS);
    }
  },

  clearAttempts: async () => {
    if (memoryCache.attempts) memoryCache.attempts = {};
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.ATTEMPTS));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.ATTEMPTS);
    }
  },

  saveAttempts: async (attempts: Attempt[]) => {
    if (memoryCache.attempts) memoryCache.attempts = {};
    try {
      const batch = writeBatch(db);
      attempts.forEach(a => {
        const aRef = doc(db, COLLECTIONS.ATTEMPTS, a.id || Math.random().toString(36).substr(2, 9));
        batch.set(aRef, a);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.ATTEMPTS);
    }
  },

  // --- SETTINGS ---
  getSettings: async (forceRefresh = false): Promise<AppSettings> => {
    const now = Date.now();
    if (!forceRefresh && memoryCache.settings && (now - memoryCache.settings.timestamp < CACHE_TTL_MS)) {
      return memoryCache.settings.data;
    }

    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'config'));
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        const result: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...data
        };
        memoryCache.settings = { data: result, timestamp: now };
        safeLocalStorage.setItem('app_cached_settings', JSON.stringify(result));
        return result;
      }
      
      memoryCache.settings = { data: DEFAULT_SETTINGS, timestamp: now };
      safeLocalStorage.setItem('app_cached_settings', JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    } catch {
      // Offline / quota limit fallback
      const cached = safeLocalStorage.getItem('app_cached_settings');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as AppSettings;
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          memoryCache.settings = { data: merged, timestamp: now };
          return merged;
        } catch {
          // fallback to default
        }
      }
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (settings: AppSettings) => {
    delete memoryCache.settings;
    safeLocalStorage.setItem('app_cached_settings', JSON.stringify(settings));

    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'config'), settings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/config`);
    }
  }
};

