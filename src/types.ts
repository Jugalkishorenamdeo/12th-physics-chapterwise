export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  attemptsRemaining: number;
  totalAttempts: number;
  createdAt: string;
}

export interface Question {
  id: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  remark?: string;
  createdAt: string;
}

export interface Attempt {
  id: string;
  userId: string;
  userName: string;
  topic: string;
  difficulty: string;
  score: number;
  totalQuestions: number;
  answers?: {
    questionId: string;
    questionText?: string;
    selectedOption: string;
    isCorrect: boolean;
  }[];
  timestamp: string;
}

export interface AppSettings {
  adminUsername?: string;
  adminPassword?: string;
  appTitle?: string;
  quizTime: number; // minutes
  maintenanceMode: boolean;
  maxAttempts: number;
  leaveQuizEnabled: boolean;
  certificateSignatory?: string;
  certificateMinPercentage: number;
  isCertificateEnabled: boolean;
  maxAttemptsPerLevel: number;
  certificateMessage?: string;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowRemix: boolean;
}
