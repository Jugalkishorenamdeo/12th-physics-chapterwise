import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Database, 
  Settings as SettingsIcon, 
  Trophy, 
  Upload, 
  Trash2, 
  Plus, 
  Edit2, 
  Download,
  Search, 
  ArrowUp, 
  ArrowDown,
  Trash,
  Clock,
  Lock,
  ShieldAlert,
  ArrowUpDown,
  RotateCcw,
  RotateCw,
  CheckSquare,
  Square,
  Award,
  Filter,
  Save,
  GraduationCap,
  FileText,
  Eye,
  EyeOff,
  LogOut,
  BarChart3,
  PieChart,
  BookOpen,
  ArrowLeft,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { Question, Attempt, UserProfile, AppSettings } from '../types';
import { cn, formatDate } from '../lib/utils';
import { localDb } from '../lib/localDb';
import { useAuth } from '../contexts/AuthContext';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';

type AdminTab = 'scoreboard' | 'leaderstudent' | 'certificate' | 'vishleshan' | 'analysis' | 'shesh' | 'questions' | 'students' | 'settings';

interface AdminDashboardProps {
  onSettingsSave?: (settings: AppSettings) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSettingsSave }) => {
  const { logout, setStudentView } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('scoreboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    adminUsername: 'admin',
    adminPassword: 'admin123',
    appTitle: '12th Physics-chapterwise',
    quizTime: 20,
    maintenanceMode: false,
    maxAttempts: 5,
    leaveQuizEnabled: true,
    certificateMinPercentage: 70,
    isCertificateEnabled: true,
    maxAttemptsPerLevel: 2,
    certificateMessage: 'Completing Easy, Medium, and Hard challenges',
    randomizeQuestions: false,
    randomizeOptions: false,
    allowRemix: true
  });

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [sortKey, setSortKey] = useState<string>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Analysis Tabs State
  const [analysisSearchName, setAnalysisSearchName] = useState('');
  const [analysisTopic, setAnalysisTopic] = useState('');
  const [analysisDifficulty, setAnalysisDifficulty] = useState('');
  const [analysisQuestionId, setAnalysisQuestionId] = useState('');
  const [analysisSortKey, setAnalysisSortKey] = useState<string>('attempts');
  const [analysisSortDir, setAnalysisSortDir] = useState<'asc' | 'desc'>('desc');
  const [vishleshanSortKey, setVishleshanSortKey] = useState<string>('student');
  const [vishleshanSortDir, setVishleshanSortDir] = useState<'asc' | 'desc'>('asc');
  const [vishleshanFilters, setVishleshanFilters] = useState({
    student: '',
    topic: '',
    difficulty: '',
    question: ''
  });
  const [history, setHistory] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | null, type: string, item?: any } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportHelp, setShowImportHelp] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    topic: '',
    difficulty: 'Easy',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    remark: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueTopics = useMemo(() => {
    const topicSet = new Set<string>();
    questions.forEach(q => {
      if (q.topic && q.topic.trim()) {
        topicSet.add(q.topic.trim());
      }
    });
    return Array.from(topicSet).sort();
  }, [questions]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'scoreboard') {
      setSortKey('timestamp');
      setSortDir('desc');
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [qs, atts, us, sets] = await Promise.all([
        localDb.getQuestions(),
        localDb.getAttempts(),
        localDb.getUsers(),
        localDb.getSettings()
      ]);
      
      setQuestions(qs || []);
      setAttempts(atts || []);
      setStudents(us?.filter(u => u.role === 'student').map(u => ({ ...u, id: u.uid })) || []);
      if (sets) setSettings(prev => ({ ...prev, ...sets }));
    } catch (err: any) {
      toast.error('Data loading fail: ' + err.message);
    }
  };

  const saveToHistory = (currData?: any) => {
    // If currData is provided, use it, otherwise use current state
    const snapshot = currData || { questions, attempts, students };
    setHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(snapshot))]);
    setRedoStack([]);
  };

  const undo = async () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack(stack => [...stack.slice(-19), JSON.parse(JSON.stringify({ questions, attempts, students }))]);
    
    setQuestions(prev.questions || []);
    setAttempts(prev.attempts || []);
    setStudents(prev.students || []);
    
    const loadingToast = toast.loading('Undo working...');
    try {
      await Promise.all([
        localDb.saveQuestions(prev.questions || []),
        localDb.saveAttempts(prev.attempts || []),
        localDb.saveUsers(prev.students || [])
      ]);
      toast.dismiss(loadingToast);
      toast.success('Pichli stithi bahal (Undo Done)');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Undo fail: ' + err.message);
    }
    
    setHistory(prevHist => prevHist.slice(0, -1));
  };

  const redo = async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(stack => [...stack.slice(-19), JSON.parse(JSON.stringify({ questions, attempts, students }))]);

    setQuestions(next.questions || []);
    setAttempts(next.attempts || []);
    setStudents(next.students || []);

    const loadingToast = toast.loading('Redo working...');
    try {
      await Promise.all([
        localDb.saveQuestions(next.questions || []),
        localDb.saveAttempts(next.attempts || []),
        localDb.saveUsers(next.students || [])
      ]);
      toast.dismiss(loadingToast);
      toast.success('Agla stithi bahal (Redo Done)');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Redo fail: ' + err.message);
    }

    setRedoStack(prevRedo => prevRedo.slice(0, -1));
  };

  // Processing Data
  const processedQuestions = useMemo(() => {
    let q = questions.filter(item => 
      (item.question.toLowerCase().includes(searchTerm.toLowerCase()) || item.topic.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filterTopic || item.topic === filterTopic) &&
      (!filterDifficulty || item.difficulty === filterDifficulty)
    );
    return q.sort((a, b) => {
      const valA = (a[sortKey as keyof Question] || '').toString().toLowerCase();
      const valB = (b[sortKey as keyof Question] || '').toString().toLowerCase();
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [questions, searchTerm, filterTopic, filterDifficulty, sortKey, sortDir]);

  const processedAttempts = useMemo(() => {
    let a = attempts.filter(item => 
      (item.userName?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filterTopic || item.topic === filterTopic) &&
      (!filterDifficulty || item.difficulty === filterDifficulty)
    );
    return a.sort((a, b) => {
      let valA: any = a[sortKey as keyof Attempt] || '';
      let valB: any = b[sortKey as keyof Attempt] || '';
      if (sortKey === 'score') {
        valA = a.score / a.totalQuestions;
        valB = b.score / b.totalQuestions;
      }
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [attempts, searchTerm, filterTopic, filterDifficulty, sortKey, sortDir]);

  const sheshPryas = useMemo(() => {
    const results: any[] = [];
    const topics = Array.from(new Set(questions.map(q => q.topic)));
    
    students.forEach(s => {
      topics.forEach(t => {
        ['Easy', 'Medium', 'Hard'].forEach(d => {
          const count = attempts.filter(a => a.userId === s.uid && a.topic === t && a.difficulty === d).length;
          const limit = settings.maxAttemptsPerLevel || 2;
          if (count < limit) {
            results.push({
              id: `${s.uid}-${t}-${d}`,
              userId: s.uid,
              student: s.displayName,
              topic: t,
              difficulty: d,
              remaining: limit - count
            });
          }
        });
      });
    });

    return results.filter(r => 
      r.student.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!filterTopic || r.topic === filterTopic) &&
      (!filterDifficulty || r.difficulty === filterDifficulty)
    ).sort((a: any, b: any) => {
      const valA = a[sortKey] || '';
      const valB = b[sortKey] || '';
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [students, questions, attempts, searchTerm, filterTopic, filterDifficulty, sortKey, sortDir, settings]);

  const stats = useMemo(() => {
    const list = processedAttempts;
    if (list.length === 0) return { avg: 0, perc: 0 };
    const totalScore = list.reduce((sum, a) => sum + a.score, 0);
    const totalQ = list.reduce((sum, a) => sum + a.totalQuestions, 0);
    return {
      avg: (totalScore / list.length).toFixed(1),
      perc: Math.round((totalScore / totalQ) * 100) || 0
    };
  }, [processedAttempts]);

  const processedStudents = useMemo(() => {
    return students.filter(s => 
      (s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       s.uid.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a: any, b: any) => {
      const valA = (a[sortKey] || '').toString().toLowerCase();
      const valB = (b[sortKey] || '').toString().toLowerCase();
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [students, searchTerm, sortKey, sortDir]);

  const vishleshanData = useMemo(() => {
    const data: any[] = [];
    
    attempts.forEach(attempt => {
      attempt.answers?.forEach(ans => {
        // Find existing row for this student and question
        const qId = ans.questionId || ans.questionText;
        const studentId = attempt.userId;
        const key = `${studentId}-${qId}`;
        
        let existing = data.find(d => d.key === key);
        if (!existing) {
          const correspondingQuestion = questions.find(q => q.id === (ans.questionId || ''));
          const correctOptKey = correspondingQuestion?.correctOption;
          let correctOptText = '-';
          if (correspondingQuestion && correctOptKey) {
            if (correctOptKey === 'A') correctOptText = correspondingQuestion.optionA;
            else if (correctOptKey === 'B') correctOptText = correspondingQuestion.optionB;
            else if (correctOptKey === 'C') correctOptText = correspondingQuestion.optionC;
            else if (correctOptKey === 'D') correctOptText = correspondingQuestion.optionD;
          }

          existing = {
            key,
            student: attempt.userName || 'Unknown',
            topic: attempt.topic || 'General',
            difficulty: attempt.difficulty || 'Medium',
            question: ans.questionText || 'Question Text Missing',
            correctOption: correctOptText,
            attempts: 0,
            score: 0,
            avgScore: 0,
            percentage: 0
          };
          data.push(existing);
        }
        
        existing.attempts += 1;
        if (ans.isCorrect) existing.score += 1;
      });
    });

    // Calculate averages and apply filters
    const processed = data.map(d => ({
      ...d,
      avgScore: Number((d.score / d.attempts).toFixed(2)),
      percentage: Math.round((d.score / d.attempts) * 100)
    })).filter(d => {
      const matchStudent = !vishleshanFilters.student || d.student === vishleshanFilters.student;
      const matchTopic = !vishleshanFilters.topic || d.topic === vishleshanFilters.topic;
      const matchDifficulty = !vishleshanFilters.difficulty || d.difficulty === vishleshanFilters.difficulty;
      const matchQuestion = !vishleshanFilters.question || d.question === vishleshanFilters.question;
      return matchStudent && matchTopic && matchDifficulty && matchQuestion;
    });

    // Sort
    return processed.sort((a, b) => {
      let valA = a[vishleshanSortKey as keyof typeof a];
      let valB = b[vishleshanSortKey as keyof typeof b];
      
      if (typeof valA === 'string') {
        const res = valA.toLowerCase().localeCompare((valB as string).toLowerCase());
        return vishleshanSortDir === 'asc' ? res : -res;
      }
      
      return vishleshanSortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [attempts, vishleshanFilters, vishleshanSortKey, vishleshanSortDir]);

  const vishleshanStats = useMemo(() => {
    const totalRows = vishleshanData.length;
    const totalAttempts = vishleshanData.reduce((sum, d) => sum + d.attempts, 0);
    const totalScore = vishleshanData.reduce((sum, d) => sum + d.score, 0);
    const avgScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : "0.00";
    const successRate = totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 100) : 0;

    return {
      totalRows,
      totalAttempts,
      totalScore,
      avgScore,
      successRate
    };
  }, [vishleshanData]);

  const uniqueVishleshanQuestions = useMemo(() => {
    const qs = new Set<string>();
    attempts.forEach(a => a.answers?.forEach(ans => {
      if (ans.questionText) qs.add(ans.questionText);
    }));
    return Array.from(qs).sort();
  }, [attempts]);

  const analysisFilteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const qTopic = (q.topic || '').trim().toLowerCase();
      const qDiff = (q.difficulty || '').trim().toLowerCase();
      const sTopic = (analysisTopic || '').trim().toLowerCase();
      const sDiff = (analysisDifficulty || '').trim().toLowerCase();

      return (!analysisTopic || qTopic === sTopic) &&
             (!analysisDifficulty || qDiff === sDiff);
    });
  }, [questions, analysisTopic, analysisDifficulty]);

  const uniqueAttemptNames = useMemo(() => {
    return Array.from(new Set(attempts.map(a => a.userName).filter(Boolean))).sort();
  }, [attempts]);

  const leaderStudentData = useMemo(() => {
    const studentAggregation = new Map<string, { 
      userId: string;
      userName: string;
      testCount: number;
      totalScore: number;
      totalPossible: number;
    }>();

    attempts.forEach(a => {
      const existing = studentAggregation.get(a.userId);
      if (existing) {
        existing.testCount += 1;
        existing.totalScore += a.score;
        existing.totalPossible += a.totalQuestions;
      } else {
        studentAggregation.set(a.userId, {
          userId: a.userId,
          userName: a.userName || 'Unknown',
          testCount: 1,
          totalScore: a.score,
          totalPossible: a.totalQuestions
        });
      }
    });

    const results = Array.from(studentAggregation.values()).map(s => ({
      ...s,
      id: s.userId,
      percentage: s.totalPossible > 0 ? Math.round((s.totalScore / s.totalPossible) * 100) : 0
    }));

    let filtered = results.filter(s => 
      s.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let valA: any = a[sortKey as keyof typeof a];
      let valB: any = b[sortKey as keyof typeof b];
      if (valA === undefined) { valA = a.percentage; valB = b.percentage; }
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [attempts, searchTerm, sortKey, sortDir]);

  const certificateData = useMemo(() => {
    const results: any[] = [];
    
    // Group attempts by student
    const studentMap = new Map<string, Attempt[]>();
    attempts.forEach(a => {
      const list = studentMap.get(a.userId) || [];
      list.push(a);
      studentMap.set(a.userId, list);
    });

    studentMap.forEach((studentAttempts, userId) => {
      const userName = studentAttempts[0].userName || 'Unknown';
      
      // For each topic
      uniqueTopics.forEach(t => {
        const topicAttempts = studentAttempts.filter(a => a.topic === t);
        const hasE = topicAttempts.some(a => a.difficulty === 'Easy');
        const hasM = topicAttempts.some(a => a.difficulty === 'Medium');
        const hasH = topicAttempts.some(a => a.difficulty === 'Hard');

        if (hasE && hasM && hasH) {
          const getBestAttempt = (diff: string) => {
            const matching = topicAttempts.filter(a => a.difficulty === diff);
            return matching.sort((a, b) => (b.score / b.totalQuestions) - (a.score / a.totalQuestions))[0];
          };
          const bestE = getBestAttempt('Easy');
          const bestM = getBestAttempt('Medium');
          const bestH = getBestAttempt('Hard');
          
          const totalScore = bestE.score + bestM.score + bestH.score;
          const totalPossible = bestE.totalQuestions + bestM.totalQuestions + bestH.totalQuestions;
          const avg = totalScore / totalPossible;
          const latestTimestamp = [bestE.timestamp, bestM.timestamp, bestH.timestamp].sort().pop() || '';

          if ((avg * 100) >= (settings.certificateMinPercentage || 70)) {
            results.push({
              id: `${userId}-${t}`,
              userId,
              userName,
              topic: t,
              score: totalScore,
              totalQuestions: totalPossible,
              percentage: Math.round(avg * 100),
              timestamp: latestTimestamp
            });
          }
        }
      });
    });

    let filtered = results.filter(r => 
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!filterTopic || r.topic === filterTopic)
    );

    return filtered.sort((a, b) => {
      let valA: any = a[sortKey as keyof typeof a];
      let valB: any = b[sortKey as keyof typeof b];
      if (valA === undefined) { 
        valA = a.score / a.totalQuestions; 
        valB = b.score / b.totalQuestions; 
      }
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [attempts, searchTerm, filterTopic, sortKey, sortDir, settings.certificateMinPercentage, uniqueTopics]);

  const targetAnalysisAttempts = useMemo(() => {
    let filteredByStudent = attempts;
    if (analysisSearchName) {
      filteredByStudent = attempts.filter(a => (a.userName || '').trim().toLowerCase() === analysisSearchName.trim().toLowerCase());
    }

    const sTopic = (analysisTopic || '').trim().toLowerCase();
    const sDiff = (analysisDifficulty || '').trim().toLowerCase();

    return filteredByStudent.filter(a => {
      const aTopic = (a.topic || '').trim().toLowerCase();
      const aDiff = (a.difficulty || '').trim().toLowerCase();

      return (!analysisTopic || aTopic === sTopic) &&
             (!analysisDifficulty || aDiff === sDiff);
    });
  }, [attempts, analysisSearchName, analysisTopic, analysisDifficulty]);

  const analysisTallies = useMemo(() => {
    const tallies = new Map<string, { attempts: number; correct: number }>();
    analysisFilteredQuestions.forEach(q => tallies.set(q.id, { attempts: 0, correct: 0 }));

    let totalMatchAttempts = 0;
    let totalMatchCorrect = 0;

    targetAnalysisAttempts.forEach(attempt => {
      attempt.answers?.forEach(ans => {
        let matchedId = '';
        // Robust matching: Check ID first against our filtered set
        if (ans.questionId && tallies.has(ans.questionId)) {
          matchedId = ans.questionId;
        } else {
          // If ID doesn't match or is missing, try matching by question text
          const text = (ans.questionText || '').trim().toLowerCase();
          if (text) {
            for (const q of analysisFilteredQuestions) {
              if (q.question.trim().toLowerCase() === text) {
                matchedId = q.id;
                break;
              }
            }
          }
        }

        if (matchedId) {
          const t = tallies.get(matchedId)!;
          t.attempts++;
          if (ans.isCorrect) {
            t.correct++;
            totalMatchCorrect++;
          }
          totalMatchAttempts++;
        }
      });
    });

    return { tallies, totalMatchAttempts, totalMatchCorrect };
  }, [analysisFilteredQuestions, targetAnalysisAttempts]);

  const analysisTableData = useMemo(() => {
    const { tallies } = analysisTallies;

    // Create array using strictly current filtered questions
    // This ensures no "Multiple" or orphaned rows appear, as requested
    const dataArray = analysisFilteredQuestions.map(q => {
      const t = tallies.get(q.id) || { attempts: 0, correct: 0 };
      const percentage = t.attempts > 0 ? Math.round((t.correct / t.attempts) * 100) : 0;
      const avgScore = t.attempts > 0 ? (t.correct / t.attempts) : 0;

      const correctOptKey = q.correctOption;
      let correctOptText = '-';
      if (correctOptKey === 'A') correctOptText = q.optionA;
      else if (correctOptKey === 'B') correctOptText = q.optionB;
      else if (correctOptKey === 'C') correctOptText = q.optionC;
      else if (correctOptKey === 'D') correctOptText = q.optionD;
      
      return {
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        correctOption: correctOptText,
        attempts: t.attempts,
        correct: t.correct,
        percentage: percentage,
        avgScore: avgScore
      };
    }).filter(row => row.attempts > 0);

    return dataArray.sort((a: any, b: any) => {
      const valA = a[analysisSortKey];
      const valB = b[analysisSortKey];
      
      if (valA === undefined || valB === undefined) return 0;
      
      if (typeof valA === 'string') {
        const strA = valA.toLowerCase();
        const strB = valB.toLowerCase();
        return analysisSortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
      
      return analysisSortDir === 'asc' ? (valA - valB) : (valB - valA);
    });
  }, [analysisFilteredQuestions, analysisTallies, analysisSortKey, analysisSortDir]);

  const analysisStats = useMemo(() => {
    // If a specific question is selected, calculate stats for that question only
    if (analysisQuestionId) {
      const questionResults = {
        correct: 0,
        incorrect: 0,
        options: { A: 0, B: 0, C: 0, D: 0, '': 0 } as Record<string, number>,
        total: 0,
        totalQuestionAttempts: 0,
        avgScore: "0.00",
        performance: 0
      };

      const currentQuestion = questions.find(q => q.id === analysisQuestionId);

      // We only care about targetAnalysisAttempts that include this question
      targetAnalysisAttempts.forEach(attempt => {
        const answer = attempt.answers?.find(ans => {
          const idMatch = ans.questionId && analysisQuestionId && String(ans.questionId).trim() === String(analysisQuestionId).trim();
          const textMatch = ans.questionText && currentQuestion && 
                            ans.questionText.trim().toLowerCase() === currentQuestion.question.trim().toLowerCase();
          return idMatch || textMatch;
        });

        if (answer) {
          questionResults.total++;
          if (answer.isCorrect) questionResults.correct++;
          else questionResults.incorrect++;
          
          const opt = (answer.selectedOption || '') as string;
          if (opt && questionResults.options.hasOwnProperty(opt)) {
            questionResults.options[opt]++;
          } else {
            questionResults.options['']++;
          }
        }
      });

      questionResults.totalQuestionAttempts = questionResults.total;
      questionResults.avgScore = questionResults.total > 0 ? (questionResults.correct / questionResults.total).toFixed(2) : "0.00";
      questionResults.performance = questionResults.total > 0 ? Math.round((questionResults.correct / questionResults.total) * 100) : 0;

      return { type: 'question', data: questionResults };
    }

    const { totalMatchAttempts, totalMatchCorrect } = analysisTallies;
    const totalAttempts = targetAnalysisAttempts.length;

    return { 
      type: 'summary', 
      data: {
        totalAttempts,
        totalQuestionAttempts: totalMatchAttempts,
        avgScore: totalMatchAttempts > 0 ? (totalMatchCorrect / totalMatchAttempts).toFixed(2) : "0.00",
        performance: totalMatchAttempts > 0 ? Math.round((totalMatchCorrect / totalMatchAttempts) * 100) : 0,
      }
    };
  }, [targetAnalysisAttempts, analysisQuestionId, questions, analysisTallies, analysisTableData]);


  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question || !newQuestion.topic || !newQuestion.optionA || !newQuestion.optionB || !newQuestion.correctOption) {
      toast.error('Kripya sabhi jankari bharein.');
      return;
    }

    if (editingId) {
      const newList = questions.map(q => q.id === editingId ? { ...q, ...newQuestion } as Question : q);
      setQuestions(newList);
      await localDb.saveQuestions(newList);
      toast.success('Prashn update ho gaya!');
    } else {
      const q: Question = {
        ...newQuestion as Question,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };
      const newList = [...questions, q];
      setQuestions(newList);
      await localDb.saveQuestions(newList);
      toast.success('Saheja gaya! (Saved)');
    }
    
    setShowAddModal(false);
    setEditingId(null);
    setNewQuestion({ topic: '', difficulty: 'Easy', question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A', remark: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        let count = 0;
        const newQs: Question[] = [];
        try {
          if (!results.data || !Array.isArray(results.data)) {
             toast.error('CSV data invalid format');
             return;
          }
          
          for (const row of results.data as any[]) {
            const qText = row.Question || row.question || row.QUESTION;
            const topic = row.Topic || row.topic || row.TOPIC || 'General Physics';
            const difficulty = row.Difficulty || row.difficulty || row.DIFFICULTY || 'Medium';
            const optA = row['Option A'] || row['option a'] || row.optionA || row.OptionA;
            const optB = row['Option B'] || row['option b'] || row.optionB || row.OptionB;
            const optC = row['Option C'] || row['option c'] || row.optionC || row.OptionC;
            const optD = row['Option D'] || row['option d'] || row.optionD || row.OptionD;
            const correct = row['Correct Option'] || row['correct option'] || row.correctOption || row.CorrectOption || row.Answer || row.answer;

            if (!qText || !correct) continue;

            const newQ: Question = {
              id: Math.random().toString(36).substr(2, 9),
              topic: topic,
              difficulty: difficulty,
              question: qText,
              optionA: optA || '',
              optionB: optB || '',
              optionC: optC || '',
              optionD: optD || '',
              correctOption: correct.toString().trim().toUpperCase() as any,
              remark: row.Remark || row.remark || '',
              createdAt: new Date().toISOString()
            };
            newQs.push(newQ);
            count++;
          }
          
          if (newQs.length === 0) {
            toast.error('No valid questions found. Headers: Question, Option A, B, C, D, Correct Option');
            return;
          }

          saveToHistory({ questions });
          const newList = [...questions, ...newQs];
          setQuestions(newList);
          await localDb.saveQuestions(newList);
          toast.success(`${count} prashn import ho gaye!`);
          fetchData();
        } catch (err: any) {
          toast.error('Import Error: ' + err.message);
        }
      }
    });
  };

  const exportQuestions = () => {
    if (questions.length === 0) {
      toast.error('Export karne ke liye koi questions nahi hain.');
      return;
    }
    
    const sortedQs = [...questions].sort((a, b) => {
      if (a.topic !== b.topic) return (a.topic || '').localeCompare(b.topic || '');
      return (a.difficulty || '').localeCompare(b.difficulty || '');
    });
    
    const exportData = sortedQs.map(q => ({
      'Topic': q.topic || '',
      'Difficulty': q.difficulty || '',
      'Question': q.question || '',
      'Option A': q.optionA || '',
      'Option B': q.optionB || '',
      'Option C': q.optionC || '',
      'Option D': q.optionD || '',
      'Correct Option': q.correctOption || '',
      'Remark': q.remark || ''
    }));
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `question_bank_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Question Bank export ho gaya!');
  };

  const clearQuestions = async () => {
    if (!confirm('Kya aap sach mein sabhi questions delete karna chahte hain?')) return;
    
    const loadingToast = toast.loading('Clearing question bank...');
    try {
      saveToHistory({ questions });
      await localDb.clearQuestions();
      setQuestions([]);
      toast.dismiss(loadingToast);
      toast.success('Question bank clear ho gaya.');
      await fetchData();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Clear fail: ' + err.message);
    }
  };

  const loadDemoQuestions = async () => {
    const demoQs: Question[] = [
      { id: '1', topic: '2026', difficulty: 'Easy', question: 'What is the SI unit of electric charge?', optionA: 'Volt', optionB: 'Coulomb', optionC: 'Ampere', optionD: 'Ohm', correctOption: 'B', createdAt: new Date().toISOString() },
      { id: '2', topic: '2025', difficulty: 'Medium', question: 'The speed of light is maximum in?', optionA: 'Water', optionB: 'Glass', optionC: 'Vacuum', optionD: 'Diamond', correctOption: 'C', createdAt: new Date().toISOString() },
      { id: '3', topic: '2024', difficulty: 'Hard', question: 'The magnetic field inside a long straight solenoid carrying current is?', optionA: 'Zero', optionB: 'Same at all points', optionC: 'Decreases as move towards ends', optionD: 'Increases as move towards ends', correctOption: 'B', createdAt: new Date().toISOString() }
    ];
    saveToHistory({ questions });
    const newList = [...questions, ...demoQs];
    setQuestions(newList);
    await localDb.saveQuestions(newList);
    toast.success('Demo questions load ho gaye!');
    fetchData();
  };

  const handleDeleteRecord = async (targetItem?: any) => {
    const item = targetItem || confirmDelete?.item;
    if (!item) return;

    const loadingToast = toast.loading('Deleting...');
    try {
      saveToHistory(); // Capture state before delete
      const itemId = item.id || item.uid;
      const type = confirmDelete?.type || activeTab;
      
      if (type === 'scoreboard') {
        const idToDelete = itemId || item.id || item.uid;
        if (idToDelete) {
          await localDb.deleteAttempt(idToDelete);
        }
        toast.success('Record mita diya gaya');
      } else if (type === 'questions') {
        const idToDelete = itemId || item.id || item.uid;
        if (idToDelete) {
          await localDb.deleteQuestion(idToDelete);
        }
        toast.success('Prashn mita diya gaya');
      } else if (type === 'students') {
        if (item.uid) {
          await localDb.deleteUser(item.uid);
          toast.success('Student mita diya gaya');
        }
      } else if (type === 'shesh') {
        // Clear attempts for specific user/topic/difficulty
        const userAttempts = attempts.filter(a => a.userId === item.userId && a.topic === item.topic && a.difficulty === item.difficulty);
        const idsToDelete = userAttempts.map(a => a.id).filter(Boolean) as string[];
        if (idsToDelete.length > 0) {
          await localDb.deleteAttempts(idsToDelete);
        }
        toast.success('Student ke attempts clear ho gaye');
      }

      toast.dismiss(loadingToast);
      setConfirmDelete(null);
      await fetchData();
    } catch (err: any) {
      console.error('Delete error details:', err);
      toast.dismiss(loadingToast);
      toast.error('Mitaan fail: ' + (err.message || 'Unknown error'));
      setConfirmDelete(null);
    }
  };

  const handleEditRecord = (item: any) => {
    if (activeTab === 'questions') {
      setEditingId(item.id);
      setNewQuestion({
        topic: item.topic,
        difficulty: item.difficulty,
        question: item.question,
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD,
        correctOption: item.correctOption,
        remark: item.remark || ''
      });
      setShowAddModal(true);
    } else {
      toast.error('Is record ka edit available nahi hai.');
    }
  };

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    const currentList = activeTab === 'scoreboard' ? processedAttempts : 
                       activeTab === 'shesh' ? sheshPryas : 
                       activeTab === 'questions' ? processedQuestions : students;
    if (selectedIds.size === currentList.length && currentList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((i: any) => i.id || i.uid)));
    }
  };

  const TableHeader = ({ label, sortId }: { label: string, sortId?: string }) => (
    <th className={cn("px-4 py-4 font-black uppercase text-[10px] tracking-widest text-zinc-400 select-none whitespace-nowrap", sortId && "cursor-pointer hover:text-sky-600")} onClick={() => sortId && handleSort(sortId)}>
      <div className="flex items-center gap-1">
        {label}
        {sortId && <ArrowUpDown size={12} className={sortKey === sortId ? "text-sky-600" : "text-zinc-300"} />}
      </div>
    </th>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Utility Toolbar */}
      <div className="flex justify-center items-center gap-3 mb-8 bg-zinc-50 border border-zinc-100 p-3 rounded-[24px]">
          <div className="flex items-center gap-2">
            <button onClick={undo} className="btn-circle bg-white shadow-sm text-zinc-600 hover:text-sky-600 transition-all h-10 w-10 border border-zinc-100 flex items-center justify-center" title="Undo">
              <RotateCcw size={16} />
            </button>
            <button onClick={redo} className="btn-circle bg-white shadow-sm text-zinc-600 hover:text-sky-600 transition-all h-10 w-10 border border-zinc-100 flex items-center justify-center" title="Redo">
              <RotateCw size={16} />
            </button>
          </div>
          <div className="w-px h-6 bg-zinc-200 mx-1" />
          <button 
            onClick={() => {
              toast.success('Student View mode active');
              setStudentView(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.1em] hover:bg-sky-700 transition-all shadow-lg shadow-sky-200/50"
          >
            <LogOut size={14} /> Student Portal
          </button>
      </div>

      {/* Top Header */}
      <div className="flex flex-col gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="bg-sky-600 p-3.5 rounded-2xl text-white shadow-2xl shadow-sky-100 ring-4 ring-sky-50">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Admin Dashboard</h1>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Physics Quiz Control</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Dropdown */}
        <div className="w-full lg:w-72 flex flex-col gap-2 relative z-50">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2 px-4">Menu Select Karein</label>
          <div className="relative group">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as AdminTab)}
              className="w-full h-16 pl-14 pr-10 bg-white border-2 border-zinc-100 rounded-3xl font-black text-xs uppercase tracking-widest appearance-none cursor-pointer focus:border-sky-600 focus:ring-4 focus:ring-sky-50 transition-all outline-none shadow-sm hover:shadow-md"
            >
              <option value="scoreboard">Score Board</option>
              <option value="leaderstudent">Leader Board</option>
              <option value="certificate">Certificate</option>
              <option value="vishleshan">Vishleshan</option>
              <option value="analysis">Prashn Vishleshan</option>
              <option value="shesh">Shesh Pryas</option>
              <option value="questions">Question Bank</option>
              <option value="students">Student Manager</option>
              <option value="settings">Admin Settings</option>
            </select>
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-600 pointer-events-none transition-transform group-hover:scale-110">
              {activeTab === 'scoreboard' && <TableIcon />}
              {activeTab === 'leaderstudent' && <GraduationCap size={20} strokeWidth={2.5} />}
              {activeTab === 'certificate' && <Award size={20} strokeWidth={2.5} />}
              {activeTab === 'vishleshan' && <PieChart size={20} strokeWidth={2.5} />}
              {activeTab === 'analysis' && <BarChart3 size={20} strokeWidth={2.5} />}
              {activeTab === 'shesh' && <GraduationCap size={20} strokeWidth={2.5} />}
              {activeTab === 'questions' && <Database size={20} strokeWidth={2.5} />}
              {activeTab === 'students' && <Users size={20} strokeWidth={2.5} />}
              {activeTab === 'settings' && <SettingsIcon size={20} strokeWidth={2.5} />}
            </div>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none group-hover:text-sky-600 transition-all">
              <ArrowDown size={18} strokeWidth={3} />
            </div>
          </div>
          <div className="h-px bg-zinc-100 my-4 lg:hidden" />
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {/* Action & Filter Bar */}
          {activeTab !== 'settings' && activeTab !== 'analysis' && activeTab !== 'vishleshan' && (
            <div className="card p-6 flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-center gap-6">
                <div className="flex flex-col gap-2 w-full md:w-56">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">
                    {activeTab === 'questions' ? 'Prashn Chune' : 'Student Chune'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    {activeTab === 'questions' ? (
                      <input 
                        type="text" 
                        placeholder="Search Question..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-12 h-12 bg-zinc-50 border-zinc-100 hover:border-sky-300 transition-colors w-full"
                      />
                    ) : (
                      <select 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-12 h-12 bg-zinc-50 border-zinc-100 hover:border-sky-300 transition-colors w-full font-bold appearance-none cursor-pointer"
                      >
                        <option value="">{activeTab === 'students' ? "Student Chune" : "Sabhi Students"}</option>
                        {activeTab === 'students' ? (
                          students.map(s => (
                            <option key={s.uid} value={s.displayName || s.email || s.uid}>{(s.displayName || s.email || 'No Name').toUpperCase()}</option>
                          ))
                        ) : (
                          uniqueAttemptNames.map(name => (
                            <option key={name} value={name}>{name.toUpperCase()}</option>
                          ))
                        )}
                      </select>
                    )}
                  </div>
                </div>

                {activeTab !== 'leaderstudent' && activeTab !== 'students' && (
                  <div className="flex flex-col gap-2 w-full md:w-56">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Topic Filter</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                      <select 
                        value={filterTopic}
                        onChange={(e) => setFilterTopic(e.target.value)}
                        className="input pl-11 h-12 bg-zinc-50 border-zinc-100 hover:border-sky-300 transition-colors w-full font-bold appearance-none cursor-pointer"
                      >
                        <option value="">Sabhi Topics</option>
                        {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {activeTab !== 'certificate' && activeTab !== 'leaderstudent' && activeTab !== 'students' && (
                  <div className="flex flex-col gap-2 w-full md:w-56">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Kathinai Star</label>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                      <select 
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="input pl-11 h-12 bg-zinc-50 border-zinc-100 hover:border-sky-300 transition-colors w-full font-bold appearance-none cursor-pointer"
                      >
                        <option value="">Sabhi Levels</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>
                )}

                {(searchTerm || filterTopic || filterDifficulty) && (
                  <button 
                    onClick={() => { setSearchTerm(''); setFilterTopic(''); setFilterDifficulty(''); }}
                    className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mb-0.5"
                    title="Clear Filters"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
              </div>

                <div className="flex flex-wrap items-center gap-3">
                  {activeTab === 'scoreboard' && (
                    <button 
                      onClick={async () => {
                        if (!confirm('Kya aap sach mein sabhi attempts delete karna chahte hain?')) return;
                        const loadingToast = toast.loading('Clearing attempts...');
                        try {
                          await localDb.clearAttempts();
                          setAttempts([]);
                          toast.dismiss(loadingToast);
                          toast.success('Scoreboard clear ho gaya.');
                          fetchData();
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          toast.error('Clear fail: ' + err.message);
                        }
                      }} 
                      className="btn bg-red-50 text-red-600 h-12 px-5 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-2 border-red-100"
                    >
                      <Trash2 size={16} /> Clear All
                    </button>
                  )}
                  {activeTab === 'questions' && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full">
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                      
                      {/* Import Section with Help Button */}
                      <div className="flex items-center gap-1 relative">
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="btn btn-secondary h-12 flex-1 px-0 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Upload size={16} /> Import
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowImportHelp(!showImportHelp);
                            }}
                            className={cn(
                              "w-10 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all border-2",
                              showImportHelp ? "bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-100" : "bg-white text-sky-600 border-zinc-100 hover:border-sky-300"
                            )}
                            title="Import Guide"
                          >
                            !
                          </button>

                          <AnimatePresence>
                            {showImportHelp && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[60] bg-black/5" 
                                  onClick={() => setShowImportHelp(false)}
                                />
                                <motion.div 
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute right-0 top-full mt-3 z-[70] w-72 md:w-80 bg-zinc-900 text-white p-6 rounded-[28px] shadow-2xl border border-white/10"
                                >
                                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                      <HelpCircle size={14} className="text-sky-400" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">CSV Import Guide</span>
                                    </div>
                                    <button onClick={() => setShowImportHelp(false)} className="text-white/40 hover:text-white">✕</button>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-[9px] font-black text-sky-400 mb-1 uppercase tracking-wider">File Type</p>
                                      <p className="text-xs text-white/70">Keval <span className="text-white font-bold">.CSV</span> file format hi upload karein.</p>
                                    </div>

                                    <div>
                                      <p className="text-[9px] font-black text-sky-400 mb-1 uppercase tracking-wider">Column Names (Case Sensitive)</p>
                                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[9px] font-mono leading-relaxed text-sky-200">
                                        Topic, Difficulty, Question, Option A, Option B, Option C, Option D, Correct Option, Remark
                                      </div>
                                    </div>

                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                      <ul className="space-y-2 text-[10px] text-white/80">
                                        <li className="flex gap-2">
                                          <span className="text-sky-400 font-bold">•</span>
                                          <span><span className="text-white font-bold">Topic:</span> Keval saal (e.g. 2026, 2025...) likhein</span>
                                        </li>
                                        <li className="flex gap-2">
                                          <span className="text-sky-400 font-bold">•</span>
                                          <span><span className="text-white font-bold">Difficulty:</span> Easy, Medium ya Hard</span>
                                        </li>
                                        <li className="flex gap-2">
                                          <span className="text-sky-400 font-bold">•</span>
                                          <span><span className="text-white font-bold">Correct Option:</span> Keval A, B, C, ya D</span>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                  
                                  <button 
                                    onClick={() => setShowImportHelp(false)} 
                                    className="w-full mt-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20"
                                  >
                                    Samajh GAYA
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <button onClick={exportQuestions} className="btn bg-zinc-50 text-zinc-600 h-12 px-0 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-zinc-100">
                        <Download size={16} /> Export
                      </button>

                      <button onClick={clearQuestions} className="btn bg-red-50 text-red-600 h-12 px-0 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-red-100">
                        <Trash2 size={16} /> Clear
                      </button>

                      <button onClick={loadDemoQuestions} className="btn bg-zinc-100 text-zinc-600 h-12 px-0 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-zinc-200">
                        <FileText size={16} /> Sample
                      </button>

                      <button onClick={() => setShowAddModal(true)} className="btn btn-primary h-12 px-0 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 col-span-2 md:col-span-1">
                        <Plus size={16} /> Add New
                      </button>
                    </div>
                  )}
                  {activeTab === 'students' && (
                    <button 
                      onClick={() => setShowPasswords(!showPasswords)} 
                      className={cn(
                        "btn h-12 px-5 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-2 transition-all",
                        showPasswords ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      )}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                      {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button 
                      onClick={() => setConfirmDelete({ id: 'bulk', type: 'bulk' })}
                      className="btn bg-red-600 text-white h-12 px-5 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-2 border-red-500 shadow-lg shadow-red-100"
                    >
                      <Trash2 size={16} /> Delete ({selectedIds.size})
                    </button>
                  )}
                </div>
              </div>
          )}

          {activeTab === 'analysis' && (
            <div className="card p-8 flex flex-col gap-8 shadow-xl shadow-sky-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-2">Search By Name</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <select 
                      value={analysisSearchName}
                      onChange={(e) => setAnalysisSearchName(e.target.value)}
                      className="input pl-12 h-14 bg-zinc-50 border-zinc-100 font-bold text-xs"
                    >
                      <option value="">Sabhi Students</option>
                      {uniqueAttemptNames.map(name => (
                        <option key={name} value={name}>{name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-2">Topics Chune</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <select 
                      value={analysisTopic}
                      onChange={(e) => { setAnalysisTopic(e.target.value); setAnalysisQuestionId(''); }}
                      className="input pl-12 h-14 bg-zinc-50 border-zinc-100 font-bold text-xs"
                    >
                      <option value="">Sabhi Topics</option>
                      {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-2">Kathinai Star</label>
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <select 
                      value={analysisDifficulty}
                      onChange={(e) => { setAnalysisDifficulty(e.target.value); setAnalysisQuestionId(''); }}
                      className="input pl-12 h-14 bg-zinc-50 border-zinc-100 font-bold text-xs"
                    >
                      <option value="">Sabhi Level</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-2">Prashn Chune (Optionally)</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <select 
                      value={analysisQuestionId}
                      onChange={(e) => setAnalysisQuestionId(e.target.value)}
                      className="input pl-12 h-14 bg-zinc-50 border-zinc-100 font-bold text-xs"
                    >
                      <option value="">Prashn Chune</option>
                      {analysisFilteredQuestions.map(q => (
                        <option key={q.id} value={q.id}>{q.question.substring(0, 40)}...</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Display for Scoreboard/LeaderStudent/Certificate */}
          {(activeTab === 'scoreboard' || activeTab === 'leaderstudent' || activeTab === 'certificate') && (
            <div className="flex flex-wrap gap-6 px-2">
              <div className="flex-1 max-w-[180px]">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4 mb-2 block">Average Score</label>
                <div className="input h-14 bg-white border-zinc-200 flex items-center px-4 font-black text-sky-600 text-lg shadow-sm">
                  {activeTab === 'leaderstudent' ? (
                    (() => {
                      const totalScore = leaderStudentData.reduce((sum, s) => sum + s.totalScore, 0);
                      const totalPossible = leaderStudentData.reduce((sum, s) => sum + s.totalPossible, 0);
                      return totalPossible > 0 ? ((totalScore / totalPossible) * 10).toFixed(1) : "0.0";
                    })()
                  ) : activeTab === 'certificate' ? (
                    (() => {
                      const totalScore = certificateData.reduce((sum, s) => sum + s.score, 0);
                      const totalPossible = certificateData.reduce((sum, s) => sum + s.totalQuestions, 0);
                      return totalPossible > 0 ? ((totalScore / totalPossible) * 10).toFixed(1) : "0.0";
                    })()
                  ) : stats.avg}
                </div>
              </div>
              <div className="flex-1 max-w-[180px]">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4 mb-2 block">Percentage (%)</label>
                <div className="input h-14 bg-white border-zinc-200 flex items-center px-4 font-black text-sky-600 text-lg shadow-sm">
                  {activeTab === 'leaderstudent' ? (
                    (() => {
                      const totalScore = leaderStudentData.reduce((sum, s) => sum + s.totalScore, 0);
                      const totalPossible = leaderStudentData.reduce((sum, s) => sum + s.totalPossible, 0);
                      return totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
                    })()
                  ) : activeTab === 'certificate' ? (
                    (() => {
                      const totalScore = certificateData.reduce((sum, s) => sum + s.score, 0);
                      const totalPossible = certificateData.reduce((sum, s) => sum + s.totalQuestions, 0);
                      return totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
                    })()
                  ) : stats.perc}%
                </div>
              </div>
            </div>
          )}

          {/* Records Counter */}
          {activeTab === 'questions' && (
            <div className="flex justify-end px-2">
              <div className="px-4 py-2 bg-sky-50 rounded-xl border border-sky-100 text-sky-700 font-bold text-xs">
                Total Questions: {processedQuestions.length}
              </div>
            </div>
          )}

          {/* Records Table */}
          {activeTab !== 'settings' && activeTab !== 'analysis' && activeTab !== 'vishleshan' && (
            <div className="card overflow-hidden shadow-2xl shadow-zinc-100">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50/50 border-b border-zinc-100">
                        <tr>
                          <th className="px-6 py-4 w-12 cursor-pointer" onClick={toggleAll}>
                            {selectedIds.size > 0 ? <CheckSquare className="text-sky-600" size={18} /> : <Square className="text-zinc-200" size={18} />}
                          </th>
                          <TableHeader label="SN" />
                          
                          {/* Tab-dependent Headers */}
                          {activeTab === 'scoreboard' && (
                            <>
                              <TableHeader label="Student Name" sortId="userName" />
                              <TableHeader label="Topic" sortId="topic" />
                              <TableHeader label="Kathinai" sortId="difficulty" />
                              <TableHeader label="Score" sortId="score" />
                              <TableHeader label="%" sortId="percentage" />
                              <TableHeader label="Date & Time" sortId="timestamp" />
                            </>
                          )}
                          {activeTab === 'certificate' && (
                            <>
                              <TableHeader label="Student Name" sortId="userName" />
                              <TableHeader label="Topic" sortId="topic" />
                              <TableHeader label="Score" sortId="score" />
                              <TableHeader label="%" sortId="percentage" />
                              <TableHeader label="Date & Time" sortId="timestamp" />
                            </>
                          )}
                          {activeTab === 'leaderstudent' && (
                            <>
                              <TableHeader label="Student Name" sortId="userName" />
                              <TableHeader label="Test Count" sortId="testCount" />
                              <TableHeader label="Total Score" sortId="totalScore" />
                              <TableHeader label="Percentage" sortId="percentage" />
                            </>
                          )}
                          {activeTab === 'shesh' && (
                            <>
                              <TableHeader label="Student" sortId="student" />
                              <TableHeader label="Topic" sortId="topic" />
                              <TableHeader label="Kathinai" sortId="difficulty" />
                              <TableHeader label="Shesh Pryas" sortId="remaining" />
                            </>
                          )}
                          {activeTab === 'analysis' && (
                            <>
                              <TableHeader label="Topic" sortId="topic" />
                              <TableHeader label="Prashn" sortId="question" />
                              <TableHeader label="Jawab" />
                            </>
                          )}
                          {activeTab === 'questions' && (
                            <>
                              <TableHeader label="Topic" sortId="topic" />
                              <TableHeader label="Prashn (Question)" sortId="question" />
                              <TableHeader label="Kathinai" sortId="difficulty" />
                            </>
                          )}
                          {activeTab === 'students' && (
                            <>
                              <TableHeader label="Name" sortId="displayName" />
                              <TableHeader label="ID (UID)" sortId="uid" />
                              <TableHeader label="Password" />
                              <TableHeader label="Reg Date & TIME" sortId="createdAt" />
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {(activeTab === 'scoreboard' ? processedAttempts : 
                          activeTab === 'leaderstudent' ? leaderStudentData :
                          activeTab === 'certificate' ? certificateData :
                          activeTab === 'shesh' ? sheshPryas : 
                          activeTab === 'questions' ? processedQuestions : processedStudents).map((item: any, idx) => {
                          const dateObj = new Date(item.timestamp || item.createdAt);
                          return (
                            <tr key={item.id || item.uid} className="hover:bg-zinc-50/50 transition-colors group">
                              <td className="px-6 py-4 cursor-pointer" onClick={() => (activeTab !== 'leaderstudent') && toggleId(item.id || item.uid)}>
                                {activeTab !== 'leaderstudent' ? (
                                  selectedIds.has(item.id || item.uid) ? (
                                    <CheckSquare className="text-sky-600" size={18} />
                                  ) : (
                                    <Square className="text-zinc-100 group-hover:text-zinc-300" size={18} />
                                  )
                                ) : (
                                  <div className="w-[18px]" /> // Placeholder for Leader Student which doesn't need selection
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-[10px] text-zinc-400">{idx + 1}</td>
                              
                              {activeTab === 'scoreboard' && (
                                <>
                                  <td className="px-6 py-4 font-bold">{item.userName?.toUpperCase()}</td>
                                  <td className="px-6 py-4 text-xs font-medium">{item.topic}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                      item.difficulty === 'Easy' ? "bg-green-100 text-green-700" :
                                      item.difficulty === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    )}>{item.difficulty}</span>
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold">{item.score}/{item.totalQuestions}</td>
                                  <td className="px-6 py-4 font-black text-sky-600">{Math.round((item.score/item.totalQuestions)*100)}%</td>
                                  <td className="px-6 py-4 text-[11px] font-medium whitespace-nowrap leading-tight">
                                    {dateObj.toLocaleDateString('en-GB')},<br />
                                    <span className="text-zinc-400 font-normal">{dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </td>
                                </>
                              )}
                              {activeTab === 'certificate' && (
                                <>
                                  <td className="px-6 py-4 font-bold">{item.userName?.toUpperCase()}</td>
                                  <td className="px-6 py-4 text-xs font-medium">{item.topic}</td>
                                  <td className="px-6 py-4 font-mono font-bold">{item.score}/{item.totalQuestions}</td>
                                  <td className="px-6 py-4 font-black text-sky-600">{Math.round((item.score/item.totalQuestions)*100)}%</td>
                                  <td className="px-6 py-4 text-[11px] font-medium whitespace-nowrap leading-tight">
                                    {dateObj.toLocaleDateString('en-GB')},<br />
                                    <span className="text-zinc-400 font-normal">{dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </td>
                                </>
                              )}
                              {activeTab === 'leaderstudent' && (
                                <>
                                  <td className="px-6 py-4 font-bold">{item.userName?.toUpperCase()}</td>
                                  <td className="px-6 py-4 font-bold text-amber-600">{item.testCount} tests</td>
                                  <td className="px-6 py-4 font-mono font-bold">{item.totalScore}/{item.totalPossible}</td>
                                  <td className="px-6 py-4 font-black text-sky-600">{item.percentage}%</td>
                                </>
                              )}
                              {activeTab === 'shesh' && (
                                <>
                                  <td className="px-6 py-4 font-bold">{item.student?.toUpperCase()}</td>
                                  <td className="px-6 py-4 text-xs font-medium">{item.topic}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                      item.difficulty === 'Easy' ? "bg-green-100 text-green-700" :
                                      item.difficulty === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    )}>{item.difficulty}</span>
                                  </td>
                                  <td className="px-6 py-4 font-black text-amber-600">{item.remaining} attempts</td>
                                </>
                              )}
                              {activeTab === 'questions' && (
                                <>
                                  <td className="px-6 py-4 text-xs font-bold text-zinc-400">{item.topic}</td>
                                  <td className="px-6 py-4 max-w-sm truncate font-medium">{item.question}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                      item.difficulty === 'Easy' ? "bg-green-100 text-green-700" :
                                      item.difficulty === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    )}>{item.difficulty}</span>
                                  </td>
                                </>
                              )}
                              {activeTab === 'students' && (
                                <>
                                  <td className="px-6 py-4 font-bold">{item.displayName?.toUpperCase()}</td>
                                  <td className="px-6 py-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <span className="min-w-[80px]">
                                        {showPasswords || visiblePasswordIds.has(item.uid) ? item.uid : '********'}
                                      </span>
                                      <button 
                                        onClick={() => {
                                          const next = new Set(visiblePasswordIds);
                                          if (next.has(item.uid)) next.delete(item.uid);
                                          else next.add(item.uid);
                                          setVisiblePasswordIds(next);
                                        }}
                                        className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
                                      >
                                        {visiblePasswordIds.has(item.uid) ? <EyeOff size={14} /> : <Eye size={14} />}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span className="min-w-[60px]">
                                        {showPasswords || visiblePasswordIds.has(item.uid) ? (item.password || item.uid) : '********'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-[11px] font-medium whitespace-nowrap leading-tight">
                                    {dateObj.toLocaleDateString('en-GB')},<br />
                                    <span className="text-zinc-400 font-normal">{dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'vishleshan' && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8"
            >
              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6 bg-white border-zinc-100 flex flex-col justify-between group overflow-hidden relative border-2 border-dashed">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Total Student/Question Pairs</p>
                    <h3 className="text-4xl font-black tracking-tighter text-zinc-900">{vishleshanStats.totalRows}</h3>
                  </div>
                  <Users size={60} className="absolute -bottom-2 -right-2 opacity-5 text-zinc-900" />
                </div>

                <div className="card p-6 bg-sky-600 text-white flex flex-col justify-between group overflow-hidden relative shadow-lg shadow-sky-200">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Total Question Attempts</p>
                    <h3 className="text-4xl font-black tracking-tighter">{vishleshanStats.totalAttempts}</h3>
                  </div>
                  <HelpCircle size={60} className="absolute -bottom-2 -right-2 opacity-10" />
                </div>

                <div className="card p-6 bg-zinc-900 text-white flex flex-col justify-between group overflow-hidden relative shadow-lg shadow-zinc-200">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Average Score</p>
                    <h3 className="text-4xl font-black tracking-tighter">{vishleshanStats.avgScore}</h3>
                  </div>
                  <BarChart3 size={60} className="absolute -bottom-2 -right-2 opacity-10" />
                </div>

                <div className="card p-6 bg-indigo-600 text-white flex flex-col justify-between group overflow-hidden relative shadow-lg shadow-indigo-200">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Total Success Rate</p>
                    <h3 className="text-4xl font-black tracking-tighter">{vishleshanStats.successRate}%</h3>
                  </div>
                  <Trophy size={60} className="absolute -bottom-2 -right-2 opacity-10" />
                </div>
              </div>

              {/* Dropdown Filters */}
              <div className="card p-6 bg-zinc-50 border-zinc-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Student Filter</label>
                  <select 
                    className="input h-10 w-full text-xs font-bold bg-white"
                    value={vishleshanFilters.student}
                    onChange={(e) => setVishleshanFilters(prev => ({ ...prev, student: e.target.value }))}
                  >
                    <option value="">Sabhi Students</option>
                    {uniqueAttemptNames.map(name => <option key={name} value={name}>{name.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Topic Filter</label>
                  <select 
                    className="input h-10 w-full text-xs font-bold bg-white"
                    value={vishleshanFilters.topic}
                    onChange={(e) => setVishleshanFilters(prev => ({ ...prev, topic: e.target.value }))}
                  >
                    <option value="">Sabhi Topics</option>
                    {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Difficulty Filter</label>
                  <select 
                    className="input h-10 w-full text-xs font-bold bg-white"
                    value={vishleshanFilters.difficulty}
                    onChange={(e) => setVishleshanFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                  >
                    <option value="">Sabhi Kathinai</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Question Filter</label>
                  <select 
                    className="input h-10 w-full text-xs font-bold bg-white"
                    value={vishleshanFilters.question}
                    onChange={(e) => setVishleshanFilters(prev => ({ ...prev, question: e.target.value }))}
                  >
                    <option value="">Sabhi Prashn</option>
                    {uniqueVishleshanQuestions.map(q => <option key={q} value={q}>{q.slice(0, 50)}{q.length > 50 ? '...' : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="card overflow-hidden p-0 border-0 shadow-xl shadow-zinc-100 hover:shadow-2xl transition-shadow bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-6 py-5 text-left w-10">
                          <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
                        </th>
                        <th className="px-6 py-5 text-left w-16">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">SN</span>
                        </th>
                        {[
                          { label: 'Student', key: 'student' },
                          { label: 'Topic', key: 'topic' },
                          { label: 'Kathinai', key: 'difficulty' },
                          { label: 'Prashn Question', key: 'question' },
                          { label: 'Correct Option', key: 'correctOption' },
                          { label: 'Question Attempt', key: 'attempts' },
                          { label: 'Avg Score', key: 'avgScore' },
                          { label: 'Success %', key: 'percentage' }
                        ].map(head => (
                          <th 
                            key={head.key}
                            onClick={() => {
                              if (vishleshanSortKey === head.key) setVishleshanSortDir(vishleshanSortDir === 'asc' ? 'desc' : 'asc');
                              else { setVishleshanSortKey(head.key); setVishleshanSortDir('asc'); }
                            }}
                            className="px-6 py-5 text-left cursor-pointer group whitespace-nowrap"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-sky-600 transition-colors">
                                {head.label}
                              </span>
                              {vishleshanSortKey === head.key ? (
                                vishleshanSortDir === 'asc' ? <ArrowUp size={12} className="text-sky-600" /> : <ArrowDown size={12} className="text-sky-600" />
                              ) : (
                                <ArrowUpDown size={12} className="text-zinc-200 group-hover:text-zinc-400" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {vishleshanData.map((row, index) => (
                        <tr key={row.key} className="hover:bg-zinc-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-mono text-sm font-black text-zinc-400">{index + 1}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-black text-[10px] border border-sky-100 uppercase">
                                {row.student.charAt(0)}
                              </div>
                              <p className="text-sm font-black text-zinc-900 uppercase">{row.student?.toUpperCase()}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-white text-zinc-600 text-[9px] font-black rounded-lg border border-zinc-100 uppercase tracking-widest shadow-sm">{row.topic}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              row.difficulty === 'Easy' ? 'text-green-500' : 
                              row.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                            )}>
                              {row.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors">{row.question}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-sky-600">{row.correctOption}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-mono text-sm font-black text-zinc-900">{row.attempts}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                row.avgScore > 0.7 ? "bg-green-500" : row.avgScore > 0.4 ? "bg-amber-500" : "bg-red-500"
                              )} />
                              <p className="font-mono text-sm font-black text-zinc-600">{row.avgScore}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-black text-zinc-900 w-10">{row.percentage}%</span>
                              <div className="flex-1 min-w-[80px] h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${row.percentage}%` }}
                                  className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    row.percentage > 70 ? "bg-green-500" : row.percentage > 40 ? "bg-sky-500" : "bg-red-500"
                                  )}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {vishleshanData.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-20 h-20 bg-zinc-50 rounded-[32px] flex items-center justify-center text-zinc-200 border-2 border-dashed border-zinc-100">
                                <Search size={32} />
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-zinc-900 uppercase tracking-widest text-xs">Data Nahi Mila</p>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Kripya filters badlein ya quiz attempts ka intezar karein.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8"
            >
              {analysisQuestionId ? (() => {
                const currentQuestion = questions.find(q => q.id === analysisQuestionId);
                const correctOptKey = currentQuestion?.correctOption;
                let correctOptText = '-';
                if (currentQuestion && correctOptKey) {
                  if (correctOptKey === 'A') correctOptText = currentQuestion.optionA;
                  else if (correctOptKey === 'B') correctOptText = currentQuestion.optionB;
                  else if (correctOptKey === 'C') correctOptText = currentQuestion.optionC;
                  else if (correctOptKey === 'D') correctOptText = currentQuestion.optionD;
                }
                return (
                // Single Question Detailed Analysis
                <div className="space-y-6">
                  <button 
                    onClick={() => setAnalysisQuestionId('')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl font-bold text-sm hover:bg-sky-100 transition-all shadow-sm shadow-sky-50 w-fit mb-2 group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Table</span>
                  </button>
                  
                  <div className="max-w-5xl space-y-8">
                    <div className="space-y-4">
                      <div className="card p-8 bg-sky-600 text-white">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Selected Question</p>
                        <h3 className="text-xl font-black leading-tight">
                          {currentQuestion?.question}
                        </h3>
                      </div>

                      <div className="card p-6 bg-green-50 border-2 border-green-100 flex items-start gap-4">
                         <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-green-200">
                            <CheckCircle2 size={20} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-1">Correct Answer (Sahi Utter)</p>
                            <p className="text-base font-bold text-zinc-900">{correctOptText}</p>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="card p-5 flex items-center justify-between border-2 border-zinc-100 bg-white">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Engagement</p>
                            <p className="text-3xl font-black text-zinc-900">{analysisStats.data.total}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Total Students</p>
                         </div>
                         <div className="w-12 h-12 bg-zinc-50 text-zinc-400 rounded-2xl flex items-center justify-center border border-zinc-100">
                            <Users size={20} />
                         </div>
                      </div>

                      <div className="card p-5 flex items-center justify-between border-2 border-green-100 bg-green-50/30">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">Sahi Jawab (Correct)</p>
                            <p className="text-3xl font-black text-green-600">{analysisStats.data.correct}</p>
                         </div>
                         <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-sm shadow-green-200">
                            {analysisStats.data.total > 0 ? Math.round((analysisStats.data.correct / analysisStats.data.total) * 100) : 0}%
                         </div>
                      </div>

                      <div className="card p-5 flex items-center justify-between border-2 border-red-100 bg-red-50/30">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Asafalta Dar (Failure)</p>
                            <p className="text-3xl font-black text-red-600">{analysisStats.data.incorrect}</p>
                         </div>
                         <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-sm shadow-red-200">
                            {analysisStats.data.total > 0 ? Math.round((analysisStats.data.incorrect / analysisStats.data.total) * 100) : 0}%
                         </div>
                      </div>
                    </div>

                    <div className="card p-8 border-2 border-zinc-100 shadow-sm">
                      <h4 className="font-black text-xs uppercase tracking-widest text-zinc-400 mb-8 flex items-center gap-2">
                        <PieChart size={14} className="text-sky-500" /> Option-wise Statistics (Analysis)
                      </h4>
                      <div className="space-y-8">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const count = analysisStats.data.options[opt] || 0;
                          const total = analysisStats.data.total || 1;
                          const perc = Math.round((count / total) * 100);
                          const isCorrect = currentQuestion?.correctOption === opt;
                          const currentOptionText = currentQuestion ? (currentQuestion as any)[`option${opt}`] : '';
                          
                          return (
                            <div key={opt} className="space-y-2">
                              <div className="flex justify-between items-end gap-4">
                                <div className="space-y-1">
                                  <p className={cn("text-sm", isCorrect ? "text-green-600 font-bold" : "text-zinc-500 font-medium")}>
                                    <span className="font-normal">Option {opt}</span> {isCorrect && <span className="font-black text-[10px] uppercase ml-1">(Sahi Jawab)</span>}
                                  </p>
                                  <p className="text-sm font-black text-zinc-900 leading-tight">{currentOptionText}</p>
                                </div>
                                <p className="font-mono text-[10px] font-black text-zinc-400 whitespace-nowrap">{count} responses ({perc}%)</p>
                              </div>
                              <div className="h-3 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${perc}%` }}
                                  className={cn("h-full", isCorrect ? "bg-green-500" : "bg-red-400")}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                </div>
            )})() : (
                <div className="space-y-8">
                  {/* Information Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card p-6 bg-white border-zinc-100 flex flex-col justify-between group overflow-hidden relative border-2 border-dashed">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Total Questions Analysed</p>
                        <h3 className="text-4xl font-black tracking-tighter text-zinc-900">{analysisTableData.length}</h3>
                      </div>
                      <Database size={60} className="absolute -bottom-2 -right-2 opacity-5 text-zinc-900" />
                    </div>

                    <div className="card p-6 bg-sky-600 text-white flex flex-col justify-between group overflow-hidden relative shadow-lg shadow-sky-200">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Total Question Attempts</p>
                        <h3 className="text-4xl font-black tracking-tighter">{analysisStats.data.totalQuestionAttempts}</h3>
                      </div>
                      <HelpCircle size={60} className="absolute -bottom-2 -right-2 opacity-10" />
                    </div>

                    <div className="card p-6 bg-zinc-900 text-white flex flex-col justify-between group overflow-hidden relative shadow-lg shadow-zinc-200">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Average Score</p>
                        <h3 className="text-4xl font-black tracking-tighter">{analysisStats.data.avgScore}</h3>
                      </div>
                      <BarChart3 size={60} className="absolute -bottom-2 -right-2 opacity-10" />
                    </div>

                    <div className="card p-6 bg-indigo-600 text-white flex flex-col justify-between group overflow-hidden relative shadow-lg shadow-indigo-200">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Total Success Rate</p>
                        <h3 className="text-4xl font-black tracking-tighter">{analysisStats.data.performance}%</h3>
                      </div>
                      <Trophy size={60} className="absolute -bottom-2 -right-2 opacity-10" />
                    </div>
                  </div>

                  {/* Dropdown Filters */}
                  <div className="card p-6 bg-zinc-50 border-zinc-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Student Filter</label>
                      <select 
                        className="input h-10 w-full text-xs font-bold bg-white"
                        value={analysisSearchName}
                        onChange={(e) => setAnalysisSearchName(e.target.value)}
                      >
                        <option value="">Sabhi Students</option>
                        {uniqueAttemptNames.map(name => <option key={name} value={name}>{name.toUpperCase()}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Topic Filter</label>
                      <select 
                        className="input h-10 w-full text-xs font-bold bg-white"
                        value={analysisTopic}
                        onChange={(e) => setAnalysisTopic(e.target.value)}
                      >
                        <option value="">Sabhi Topics</option>
                        {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Difficulty Filter</label>
                      <select 
                        className="input h-10 w-full text-xs font-bold bg-white"
                        value={analysisDifficulty}
                        onChange={(e) => setAnalysisDifficulty(e.target.value)}
                      >
                        <option value="">Sabhi Kathinai</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Question Filter</label>
                      <select 
                        className="input h-10 w-full text-xs font-bold bg-white"
                        value={analysisQuestionId}
                        onChange={(e) => setAnalysisQuestionId(e.target.value)}
                      >
                        <option value="">Sabhi Prashn (Overview)</option>
                        {analysisFilteredQuestions.map(q => <option key={q.id} value={q.id}>{q.question.slice(0, 50)}{q.question.length > 50 ? '...' : ''}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Analysis Table */}
                  <div className="card overflow-hidden p-0 border-0 shadow-xl shadow-zinc-100 hover:shadow-2xl transition-shadow bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50/50">
                            <th className="px-6 py-5 text-left w-10">
                              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
                            </th>
                            <th className="px-6 py-5 text-left w-16">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">SN</span>
                            </th>
                            {[
                              { label: 'Topic', key: 'topic' },
                              { label: 'Kathinai', key: 'difficulty' },
                              { label: 'Prashn Question', key: 'question' },
                              { label: 'Correct Option', key: 'correctOption' },
                              { label: 'Question Attempt', key: 'attempts' },
                              { label: 'Avg Score', key: 'avgScore' },
                              { label: 'Success %', key: 'percentage' }
                            ].map(head => (
                              <th 
                                key={head.key}
                                onClick={() => {
                                  if (analysisSortKey === head.key) setAnalysisSortDir(analysisSortDir === 'asc' ? 'desc' : 'asc');
                                  else { setAnalysisSortKey(head.key); setAnalysisSortDir('asc'); }
                                }}
                                className="px-6 py-5 text-left cursor-pointer group whitespace-nowrap"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-sky-600 transition-colors">
                                    {head.label}
                                  </span>
                                  {analysisSortKey === head.key ? (
                                    analysisSortDir === 'asc' ? <ArrowUp size={12} className="text-sky-600" /> : <ArrowDown size={12} className="text-sky-600" />
                                  ) : (
                                    <ArrowUpDown size={12} className="text-zinc-200 group-hover:text-zinc-400" />
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {analysisTableData.map((row, index) => (
                            <tr 
                              key={row.id} 
                              className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                              onClick={() => setAnalysisQuestionId(row.id)}
                            >
                              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-mono text-sm font-black text-zinc-400">{index + 1}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 bg-white text-zinc-600 text-[9px] font-black rounded-lg border border-zinc-100 uppercase tracking-widest shadow-sm">{row.topic}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  row.difficulty === 'Easy' ? 'text-green-500' : 
                                  row.difficulty === 'Medium' ? 'text-amber-500' : 'text-red-500'
                                )}>
                                  {row.difficulty}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors">{row.question}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-sky-600">{row.correctOption}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-mono text-sm font-black text-zinc-900">{row.attempts}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    row.avgScore > 0.7 ? "bg-green-500" : row.avgScore > 0.4 ? "bg-amber-500" : "bg-red-500"
                                  )} />
                                  <p className="font-mono text-sm font-black text-zinc-600">{row.avgScore.toFixed(2)}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs font-black text-zinc-900 w-10">{row.percentage}%</span>
                                  <div className="flex-1 min-w-[80px] h-2 bg-zinc-100 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${row.percentage}%` }}
                                      className={cn(
                                        "h-full rounded-full transition-all duration-700",
                                        row.percentage > 70 ? "bg-green-500" : row.percentage > 40 ? "bg-sky-500" : "bg-red-500"
                                      )}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {analysisTableData.length === 0 && (
                            <tr>
                              <td colSpan={10} className="px-6 py-24 text-center">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="w-20 h-20 bg-zinc-50 rounded-[32px] flex items-center justify-center text-zinc-200 border-2 border-dashed border-zinc-100">
                                    <Search size={32} />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-black text-zinc-900 uppercase tracking-widest text-xs">Data Nahi Mila</p>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Kripya filters badlein ya quiz attempts ka intezar karein.</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Admin Settings Content */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card p-8 space-y-8 shadow-sm">
                  <div>
                    <h4 className="font-black text-xl mb-4 flex items-center gap-2 tracking-tighter">
                      <GraduationCap className="text-sky-600" size={20} /> Portal Configuration
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">App Quiz Title</p>
                        <input 
                          type="text" 
                          placeholder="App Title (e.g. 12th Physics-chapterwise)"
                          value={settings.appTitle || ''}
                          onChange={(e) => setSettings({...settings, appTitle: e.target.value})}
                          className="input h-14 font-bold border-zinc-100 bg-zinc-50/50"
                        />
                      </div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 leading-relaxed">This title is displayed on both Student &amp; Admin login panels and navigation headers.</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-xl mb-4 flex items-center gap-2 tracking-tighter">
                      <Lock className="text-sky-600" size={20} /> Admin Credentials
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Admin User ID</p>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                          <input 
                            type="text" 
                            placeholder="Admin User ID"
                            value={settings.adminUsername || ''}
                            onChange={(e) => setSettings({...settings, adminUsername: e.target.value})}
                            className="input pl-12 h-14 font-bold border-zinc-100 bg-zinc-50/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Admin Password</p>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                          <input 
                            type="text" 
                            placeholder="Naya Admin Password"
                            value={settings.adminPassword || ''}
                            onChange={(e) => setSettings({...settings, adminPassword: e.target.value})}
                            className="input pl-12 h-14 font-bold border-zinc-100 bg-zinc-50/50"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 leading-relaxed">Login ke liye isi User ID avam Password ka prayog hoga.</p>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <Clock className="text-sky-600" size={20} /> Quiz Time (Minutes)
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Default quiz samay</p>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-zinc-600">Minutes:</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSettings({...settings, quizTime: Math.max(1, settings.quizTime - 1)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">-</button>
                        <span className="text-xl font-black w-14 text-center text-sky-600">{settings.quizTime}</span>
                        <button onClick={() => setSettings({...settings, quizTime: settings.quizTime + 1})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <Award className="text-sky-600" size={20} /> Certificate Message
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Default message on certificate</p>
                    <textarea 
                      value={settings.certificateMessage || ''}
                      onChange={(e) => setSettings({...settings, certificateMessage: e.target.value})}
                      placeholder="Certificate message..."
                      className="input h-24 py-4 text-sm font-bold bg-white"
                    />
                  </div>
                </div>
                
                <div className="card p-8 space-y-8 shadow-sm">
                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <GraduationCap className="text-sky-600" size={20} /> Certificate Eligibility
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Minimum percentage required</p>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-zinc-600">Threshold %:</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSettings({...settings, certificateMinPercentage: Math.max(1, settings.certificateMinPercentage - 5)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">-</button>
                        <span className="text-xl font-black w-14 text-center text-sky-600">{settings.certificateMinPercentage}%</span>
                        <button onClick={() => setSettings({...settings, certificateMinPercentage: Math.min(100, settings.certificateMinPercentage + 5)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">+</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-2 tracking-tighter">
                      <Database className="text-sky-600" size={20} /> Per-Topic Limit
                    </h4>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 border-b pb-4">Max attempts per level star</p>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-zinc-600">Max Attempts:</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSettings({...settings, maxAttemptsPerLevel: Math.max(1, settings.maxAttemptsPerLevel - 1)})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">-</button>
                        <span className="text-xl font-black w-14 text-center text-sky-600">{settings.maxAttemptsPerLevel}</span>
                        <button onClick={() => setSettings({...settings, maxAttemptsPerLevel: settings.maxAttemptsPerLevel + 1})} className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black shadow-sm text-zinc-600 hover:border-sky-300 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1 card p-8 border-dashed border-2 border-zinc-100">
                   <h4 className="font-black text-xl mb-6 flex items-center gap-2 tracking-tighter">
                     <RotateCcw className="text-sky-600" size={20} /> Randomization Controls
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest text-zinc-600 mb-1">Random Questions</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Shuffles individual question order</p>
                        </div>
                        <input type="checkbox" checked={settings.randomizeQuestions} onChange={(e) => setSettings({...settings, randomizeQuestions: e.target.checked})} className="toggle toggle-lg" />
                      </div>
                      <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                        <div>
                          <p className="font-black text-sm uppercase tracking-widest text-zinc-600 mb-1">Random Options</p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Shuffles answers inside questions</p>
                        </div>
                        <input type="checkbox" checked={settings.randomizeOptions} onChange={(e) => setSettings({...settings, randomizeOptions: e.target.checked})} className="toggle toggle-lg" />
                      </div>
                   </div>
                 </div>

                 <div className="flex-1 card p-8 border-dashed border-2 border-zinc-100">
                   <h4 className="font-black text-lg mb-4 flex items-center gap-2"><Eye className="text-sky-600" size={20} /> Access Control</h4>
                   <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                        <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">Maintenance</p>
                        <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})} className="toggle" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                        <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">Allow Exit</p>
                        <input type="checkbox" checked={settings.leaveQuizEnabled} onChange={(e) => setSettings({...settings, leaveQuizEnabled: e.target.checked})} className="toggle" />
                      </div>
                   </div>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 card p-8 border-dashed border-2 border-zinc-100">
                  <h4 className="font-black text-lg mb-4 flex items-center gap-2"><ShieldAlert className="text-sky-600" size={20} /> Access Securities</h4>
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                       <div>
                         <p className="font-bold text-xs uppercase tracking-widest text-zinc-500">Allow Remix</p>
                         <p className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5">Toggle to prevent app remixing</p>
                       </div>
                       <input type="checkbox" checked={settings.allowRemix} onChange={(e) => setSettings({...settings, allowRemix: e.target.checked})} className="toggle toggle-info" />
                     </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                 <button onClick={async () => { 
                   await localDb.saveSettings(settings); 
                   if (onSettingsSave) onSettingsSave(settings);
                   toast.success('Settings Saheja gaya! (Saved)'); 
                 }} className="btn btn-primary w-full py-8 flex items-center justify-center gap-3 text-2xl font-black uppercase tracking-tighter shadow-xl shadow-sky-100 rounded-[32px]">
                    <Save size={28} /> Save All Settings
                 </button>
              </div>
            </div>
          )}
          {/* Add Question Modal */}
       <AnimatePresence>
         {confirmDelete && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-zinc-900/80 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[32px] p-10 text-center shadow-2xl">
               <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Trash2 size={40} />
               </div>
               <h3 className="text-2xl font-black tracking-tighter mb-2">Kya aap sach mein mita dena chahte hain?</h3>
               <p className="text-sm font-bold text-zinc-400 mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                 {confirmDelete.id === 'bulk' ? `Kya aap chune gaye ${selectedIds.size} records ko mita dena chahte hain?` : 
                  confirmDelete.id?.startsWith('clear-') ? 'Is action ko wapas nahi liya ja sakta.' :
                  'Yeh record permantently delete ho jayega.'}
               </p>
               
               <div className="flex gap-3">
                 <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1 py-5 font-black uppercase tracking-widest text-xs">CANCEL</button>
                 <button 
                   onClick={async () => {
                     if (confirmDelete.id === 'bulk') {
                        const loadingToast = toast.loading('Bulk deleting...');
                        try {
                          saveToHistory();
                          if (activeTab === 'scoreboard' || activeTab === 'leaderboard') {
                            await localDb.deleteAttempts(Array.from(selectedIds));
                          } else if (activeTab === 'questions') {
                            await localDb.deleteQuestions(Array.from(selectedIds));
                          } else if (activeTab === 'students') {
                            await localDb.deleteUsers(Array.from(selectedIds));
                          }
                          setSelectedIds(new Set());
                          toast.dismiss(loadingToast);
                          toast.success('Chune gaye records mita diye gaye');
                          setConfirmDelete(null);
                          await fetchData();
                        } catch (err: any) {
                          toast.dismiss(loadingToast);
                          toast.error('Mitaan fail: ' + err.message);
                        }
                     } else if (confirmDelete.id === 'clear-attempts') {
                       saveToHistory();
                       await localDb.clearAttempts();
                       setAttempts([]);
                       toast.success('Sabhi attempts mita diye gaye');
                       setConfirmDelete(null);
                       fetchData();
                     } else if (confirmDelete.id === 'clear-students') {
                       saveToHistory();
                       await localDb.clearStudents();
                       setStudents([]);
                       toast.success('Sabi students mita diye gaye');
                       setConfirmDelete(null);
                       fetchData();
                     } else if (confirmDelete.id === 'clear-questions') {
                       saveToHistory();
                       await localDb.clearQuestions();
                       setQuestions([]);
                       toast.success('Question bank clear ho gaya');
                       setConfirmDelete(null);
                       fetchData();
                     } else {
                       await handleDeleteRecord(confirmDelete.item);
                     }
                   }} 
                   className="btn bg-red-600 text-white flex-1 py-5 font-black uppercase tracking-widest text-xs shadow-lg shadow-red-100"
                 >
                   CONFIRM DELETE
                 </button>
               </div>
             </motion.div>
           </div>
         )}
         {showAddModal && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/80 backdrop-blur-2xl">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl p-12 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter">{editingId ? 'Prashn Sudharein (Edit)' : 'Naya Question Add Karein'}</h2>
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">{editingId ? 'Update Existing Entry' : 'Create Manual Entry'}</p>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setEditingId(null); setNewQuestion({ topic: '', difficulty: 'Easy', question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'A', remark: '' }); }} className="text-zinc-300 hover:text-zinc-900"><Plus className="rotate-45" size={32} /></button>
                </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Prashn (Question Text)</label>
                      <textarea value={newQuestion.question || ''} onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})} placeholder="Type question here..." className="input h-24 py-4" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Topic Name (Chapter/Year)</label>
                        <input 
                          type="text"
                          list="existing-topics"
                          value={newQuestion.topic || ''} 
                          onChange={(e) => setNewQuestion({...newQuestion, topic: e.target.value})} 
                          placeholder="Type or select topic..."
                          className="input font-bold"
                        />
                        <datalist id="existing-topics">
                          {uniqueTopics.map(topic => (
                            <option key={topic} value={topic} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Difficulty Level</label>
                        <select value={newQuestion.difficulty || 'Easy'} onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value as any})} className="input font-bold">
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <input value={newQuestion.optionA || ''} onChange={(e) => setNewQuestion({...newQuestion, optionA: e.target.value})} placeholder="Option A" className="input" />
                      <input value={newQuestion.optionB || ''} onChange={(e) => setNewQuestion({...newQuestion, optionB: e.target.value})} placeholder="Option B" className="input" />
                      <input value={newQuestion.optionC || ''} onChange={(e) => setNewQuestion({...newQuestion, optionC: e.target.value})} placeholder="Option C" className="input" />
                      <input value={newQuestion.optionD || ''} onChange={(e) => setNewQuestion({...newQuestion, optionD: e.target.value})} placeholder="Option D" className="input" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Sahi Option (A/B/C/D)</label>
                        <select value={newQuestion.correctOption || 'A'} onChange={(e) => setNewQuestion({...newQuestion, correctOption: e.target.value as any})} className="input font-black text-sky-600">
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-12 pt-6 border-t border-zinc-100">
                  <button onClick={() => { setShowAddModal(false); setEditingId(null); }} className="btn btn-secondary flex-1 py-6 font-black uppercase tracking-widest text-xs tracking-[0.2em]">CANCEL</button>
                  {editingId && (
                    <button 
                      onClick={() => {
                        handleDeleteRecord({ id: editingId });
                        setShowAddModal(false);
                      }}
                      className="btn bg-red-50 text-red-600 flex-1 py-6 font-black uppercase tracking-widest text-xs tracking-[0.2em] border-2 border-red-100 hover:bg-red-100 transition-all"
                    >
                      DELETE PERMANENTLY
                    </button>
                  )}
                  <button onClick={handleAddQuestion} className="btn btn-primary flex-1 py-6 font-black uppercase tracking-widest text-xs tracking-[0.2em]">{editingId ? 'UPDATE QUESTION' : 'SAVE TO BANK'}</button>
                </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 px-6 py-5 rounded-3xl font-black transition-all text-left",
      active 
        ? "bg-sky-600 text-white shadow-xl shadow-sky-100 ring-2 ring-sky-600 ring-offset-2" 
        : "text-zinc-500 hover:bg-zinc-100"
    )}
  >
    <Icon size={20} />
    <span className="flex-1 tracking-tighter">{label}</span>
  </button>
);

const TableIcon = (props: any) => (
  <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);
