import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { UserProfile, Question, Attempt, AppSettings } from '../types';

const COLLECTIONS = {
  USERS: 'users',
  QUESTIONS: 'questions',
  ATTEMPTS: 'chapterwise_responses',
  SETTINGS: 'settings'
};

export const localDb = {
  // --- AUTH ---
  getCurrentUser: (): UserProfile | null => {
    // Relying on Firebase Auth state is better
    return null; 
  },

  setCurrentUser: (_user: UserProfile | null) => {
    // No-op, managed by AuthContext
  },

  saveUser: async (user: UserProfile) => {
    try {
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

  getUsers: async (): Promise<UserProfile[]> => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      return snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.USERS);
      return [];
    }
  },

  deleteUser: async (uid: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.USERS}/${uid}`);
    }
  },

  deleteUsers: async (uids: string[]) => {
    try {
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
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student')));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.USERS);
    }
  },

  // --- QUESTIONS ---
  getQuestions: async (): Promise<Question[]> => {
    try {
      const snapshot = await getDocs(query(collection(db, COLLECTIONS.QUESTIONS), orderBy('createdAt', 'desc')));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.QUESTIONS);
      return [];
    }
  },

  saveQuestions: async (questions: Question[]) => {
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
    try {
      const id = q.id || Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, COLLECTIONS.QUESTIONS, id), {
        ...q,
        id,
        createdAt: q.createdAt || new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTIONS.QUESTIONS);
    }
  },

  deleteQuestion: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.QUESTIONS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.QUESTIONS}/${id}`);
    }
  },

  deleteQuestions: async (ids: string[]) => {
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
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.QUESTIONS));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.QUESTIONS);
    }
  },

  // --- ATTEMPTS ---
  getAttempts: async (): Promise<Attempt[]> => {
    try {
      const user = auth.currentUser;
      if (!user) return [];
      
      const adminDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      const isAdmin = adminDoc.exists() && adminDoc.data()?.role === 'admin';

      let q;
      if (isAdmin) {
        q = query(collection(db, COLLECTIONS.ATTEMPTS), orderBy('timestamp', 'desc'));
      } else {
        q = query(
          collection(db, COLLECTIONS.ATTEMPTS), 
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Attempt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ATTEMPTS);
      return [];
    }
  },

  saveAttempt: async (attempt: Attempt) => {
    try {
      const id = attempt.id || Math.random().toString(36).substr(2, 9);
      const attemptRef = doc(db, COLLECTIONS.ATTEMPTS, id);
      
      const batch = writeBatch(db);
      batch.set(attemptRef, {
        ...attempt,
        id,
        timestamp: new Date().toISOString() // Use client date for display but can be serverTimestamp in rules if needed
      });

      // Update user attempts
      if (attempt.userId) {
        const userRef = doc(db, COLLECTIONS.USERS, attempt.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          batch.update(userRef, {
            attemptsRemaining: (userData.attemptsRemaining || 5) - 1,
            totalAttempts: (userData.totalAttempts || 0) + 1
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch/saveAttempt');
    }
  },

  deleteAttempt: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ATTEMPTS, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTIONS.ATTEMPTS}/${id}`);
    }
  },

  deleteAttempts: async (ids: string[]) => {
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
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.ATTEMPTS));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.ATTEMPTS);
    }
  },

  saveAttempts: async (attempts: Attempt[]) => {
    // This looks like a bulk reset/save, handle with care in Firestore
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
  getSettings: async (): Promise<AppSettings> => {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'config'));
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        return {
          appTitle: '12th Physics-chapterwise', // Fallback for existing documents without this field
          ...data
        };
      }
      // Return default if not exists
      return { 
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
    } catch (error) {
      console.error('Settings fetch error:', error);
      return { 
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
    }
  },

  saveSettings: async (settings: AppSettings) => {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'config'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/config`);
    }
  }
};
