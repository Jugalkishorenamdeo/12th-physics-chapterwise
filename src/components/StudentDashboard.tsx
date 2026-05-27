import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  History, 
  Award, 
  ChevronRight, 
  Trophy,
  BrainCircuit,
  Filter,
  ArrowUpDown,
  Download,
  Settings2,
  UserCircle,
  Edit2,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { localDb } from '../lib/localDb';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Attempt, Question, AppSettings } from '../types';
import { cn, formatDate } from '../lib/utils';
import { Quiz } from './Quiz';

type Tab = 'start' | 'attempts' | 'remaining' | 'certificates';
type SortField = 'topic' | 'difficulty' | 'score' | 'percentage' | 'timestamp';

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('start');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isQuizzing, setIsQuizzing] = useState(false);
  const [quizConfig, setQuizConfig] = useState({ topic: '', difficulty: '' });
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName || '');
  
  // Filters for attempts and remaining
  const [filters, setFilters] = useState({ topic: '', difficulty: '' });
  const [sort, setSort] = useState<{ field: SortField, direction: 'asc' | 'desc' }>({ field: 'topic', direction: 'asc' });

  const { refreshProfile } = useAuth();

  const handleUpdateName = async () => {
    if (!newName.trim() || !profile) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { displayName: newName.trim() });
      await refreshProfile();
      setIsEditingName(false);
      toast.success('Nam badal diya gaya hai');
    } catch (err) {
      toast.error('Error updating name');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      
      try {
        const allAttempts = await localDb.getAttempts();
        setAttempts(allAttempts.filter(a => a.userId === profile.uid));
      } catch (err) {
        console.error("Failed to load attempts:", err);
      }

      try {
        const qs = await localDb.getQuestions();
        setQuestions(qs);
      } catch (err) {
        console.error("Failed to load questions:", err);
      }

      try {
        const sets = await localDb.getSettings();
        setSettings(sets);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    fetchData();
  }, [profile, isQuizzing]);

  const topics = useMemo(() => {
    const topicSet = new Set<string>();
    questions.forEach(q => {
      if (q.topic && q.topic.trim()) {
        topicSet.add(q.topic.trim());
      }
    });
    return Array.from(topicSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [questions]);

  const filteredAttempts = useMemo(() => {
    let result = attempts.filter(a => {
      const topicMatch = !filters.topic || a.topic === filters.topic;
      const diffMatch = !filters.difficulty || a.difficulty === filters.difficulty;
      return topicMatch && diffMatch;
    });

      return [...result].sort((a, b) => {
        const field = sort.field as keyof Attempt;
        let valA: any = a[field] ?? '';
        let valB: any = b[field] ?? '';

        if (sort.field === 'percentage') {
          valA = a.score / a.totalQuestions;
          valB = b.score / b.totalQuestions;
        }
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          if (sort.field === 'difficulty') {
            const order: Record<string, number> = { 'Easy': 1, 'easy': 1, 'Medium': 2, 'medium': 2, 'Hard': 3, 'hard': 3 };
            const ordA = order[valA] || 99;
            const ordB = order[valB] || 99;
            return sort.direction === 'asc' ? ordA - ordB : ordB - ordA;
          }
          if (sort.field === 'topic') {
            const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            if (comp !== 0) {
              return sort.direction === 'asc' ? comp : -comp;
            }
            // fallback to difficulty
            const order: Record<string, number> = { 'Easy': 1, 'easy': 1, 'Medium': 2, 'medium': 2, 'Hard': 3, 'hard': 3 };
            const ordA = order[a.difficulty] || 99;
            const ordB = order[b.difficulty] || 99;
            return ordA - ordB; // default to ascending difficulty
          }
          return sort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [attempts, filters, sort]);

  const stats = useMemo(() => {
    if (filteredAttempts.length === 0) return { avgScore: 0, avgPercentage: 0 };
    const totalScore = filteredAttempts.reduce((sum, a) => sum + a.score, 0);
    const totalPossible = filteredAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const avg = totalScore / filteredAttempts.length;
    // Truncate to 1 decimal place without rounding
    const truncatedAvg = Math.floor(avg * 10) / 10;
    const formattedAvg = Number.isInteger(avg) ? avg : truncatedAvg;
    return {
      avgScore: formattedAvg,
      avgPercentage: Math.round((totalScore / totalPossible) * 100)
    };
  }, [filteredAttempts]);

  const remainingCombinations = useMemo(() => {
    const allCombos: { topic: string, difficulty: string, remaining: number }[] = [];
    topics.forEach(t => {
      ['Easy', 'Medium', 'Hard'].forEach(d => {
        const count = attempts.filter(a => a.topic === t && a.difficulty === d).length;
        const limit = settings?.maxAttemptsPerLevel || 2;
        if (count < limit) {
          allCombos.push({ topic: t, difficulty: d, remaining: limit - count });
        }
      });
    });

    const filtered = allCombos.filter(c => {
      const topicMatch = !filters.topic || c.topic === filters.topic;
      const diffMatch = !filters.difficulty || c.difficulty === filters.difficulty;
      return topicMatch && diffMatch;
    });

    return [...filtered].sort((a, b) => {
      let fieldKey = sort.field as any;
      // Default to topic if sorting by a field that doesn't exist in remaining combos
      if (!['topic', 'difficulty', 'remaining'].includes(fieldKey)) {
        fieldKey = 'topic';
      }
      
      let valA: any = (a as any)[fieldKey] ?? '';
      let valB: any = (b as any)[fieldKey] ?? '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        if (fieldKey === 'difficulty') {
          const order: Record<string, number> = { 'Easy': 1, 'easy': 1, 'Medium': 2, 'medium': 2, 'Hard': 3, 'hard': 3 };
          const ordA = order[valA] || 99;
          const ordB = order[valB] || 99;
          return sort.direction === 'asc' ? ordA - ordB : ordB - ordA;
        }
        if (fieldKey === 'topic') {
          const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
          if (comp !== 0) {
            return sort.direction === 'asc' ? comp : -comp;
          }
          // fallback to difficulty
          const order: Record<string, number> = { 'Easy': 1, 'easy': 1, 'Medium': 2, 'medium': 2, 'Hard': 3, 'hard': 3 };
          const ordA = order[a.difficulty] || 99;
          const ordB = order[b.difficulty] || 99;
          return ordA - ordB;
        }
        return sort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [topics, attempts, filters, sort, settings]);

  const certificateTopics = useMemo(() => {
    if (!settings?.isCertificateEnabled) return [];
    const results: { topic: string, score: number, totalQuestions: number, percentage: number, timestamp: string }[] = [];
    topics.forEach(t => {
      const topicAttempts = attempts.filter(a => a.topic === t);
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
            topic: t,
            score: totalScore,
            totalQuestions: totalPossible,
            percentage: Math.round(avg * 100),
            timestamp: latestTimestamp
          });
        }
      }
    });
    return results;
  }, [topics, attempts, settings]);

  const downloadCertificate = (topic: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Border
    doc.setDrawColor(14, 165, 233); // sky-600
    doc.setLineWidth(10);
    doc.rect(5, 5, width - 10, height - 10);
    doc.setLineWidth(1);
    doc.rect(10, 10, width - 20, height - 20);

    // Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(14, 165, 233);
    doc.text('CERTIFICATE OF MASTERY', width / 2, 50, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.setTextColor(80, 80, 80);
    doc.text('This is to certify that', width / 2, 75, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    doc.text(profile?.displayName?.toUpperCase() || 'STUDENT', width / 2, 95, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(80, 80, 80);
    doc.text(`has successfully mastered the topic of`, width / 2, 115, { align: 'center' });

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(24);
    doc.setTextColor(14, 165, 233);
    doc.text(topic, width / 2, 135, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    const msg = settings?.certificateMessage || 'By completing Easy, Medium, and Hard challenges';
    doc.text(msg, width / 2, 155, { align: 'center' });
    doc.text(`with excellence on ${new Date().toLocaleDateString()}`, width / 2, 165, { align: 'center' });

    // Footer signature
    doc.line(width / 2 - 40, height - 40, width / 2 + 40, height - 40);
    doc.setFontSize(12);
    doc.text('Physics Quiz Portal Admin', width / 2, height - 32, { align: 'center' });

    doc.save(`Certificate_${topic}.pdf`);
  };

  if (isQuizzing) {
    return (
      <Quiz 
        topic={quizConfig.topic} 
        difficulty={quizConfig.difficulty} 
        onComplete={() => setIsQuizzing(false)} 
      />
    );
  }

  const tabs = [
    { id: 'start', label: 'Start Quiz', icon: Play },
    { id: 'attempts', label: 'Mere Pryash', icon: History },
    { id: 'remaining', label: 'Shesh Pryas', icon: Trophy },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ];

  const handleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-2 py-3 md:py-12">
      <div className="flex flex-col gap-3 md:gap-8">
        <div className="w-full flex justify-end">
          <div className="relative group w-full md:w-60">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              className="w-full h-10 pl-9 pr-8 bg-white border-2 border-zinc-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-500 shadow-sm hover:border-sky-500 transition-all appearance-none cursor-pointer"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Play, { size: 14 })}
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'start' && (
              <motion.div key="start" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 md:space-y-8">
                {/* Profile Section */}
                <div className="bg-white border-2 border-zinc-100 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-1 w-full max-w-xs">
                          <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value.toUpperCase())}
                            className="input h-8 py-0 px-3 font-bold text-sm"
                            autoFocus
                          />
                          <button onClick={handleUpdateName} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => { setIsEditingName(false); setNewName(profile?.displayName?.toUpperCase() || ''); }} className="p-1.5 bg-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-300 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-sm font-black text-zinc-900 tracking-tight">{profile?.displayName?.toUpperCase()}</h2>
                          <button 
                            onClick={() => setIsEditingName(true)} 
                            className="p-1 text-zinc-300 hover:text-sky-600 hover:bg-sky-50 rounded transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-sky-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-30" />
                <div className="relative z-10 space-y-5 md:space-y-10 max-w-lg mx-auto">
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Topic Chune</label>
                    <select 
                      value={quizConfig.topic} 
                      onChange={(e) => setQuizConfig({ ...quizConfig, topic: e.target.value })} 
                      className="w-full h-11 px-4 bg-sky-50 border-2 border-sky-100 rounded-xl text-sm font-bold focus:border-sky-500 transition-all cursor-pointer text-sky-900"
                    >
                      <option value="">Sabhi Topic</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Difficulty level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {l:'Easy', active: 'bg-green-600 border-green-700', inactive: 'bg-green-50 border-green-100 text-green-600'}, 
                        {l:'Medium', active: 'bg-orange-600 border-orange-700', inactive: 'bg-orange-50 border-orange-100 text-orange-600'}, 
                        {l:'Hard', active: 'bg-red-600 border-red-700', inactive: 'bg-red-50 border-red-100 text-red-600'}
                      ].map(lvl => (
                        <button 
                          key={lvl.l} 
                          onClick={() => setQuizConfig({ ...quizConfig, difficulty: lvl.l })} 
                          className={cn(
                            "py-2 rounded-lg border-2 font-black transition-all text-[10px] uppercase tracking-wider",
                            quizConfig.difficulty === lvl.l 
                              ? `${lvl.active} text-white shadow-md scale-105` 
                              : `${lvl.inactive}`
                          )}
                        >
                          {lvl.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      if (!quizConfig.topic) {
                        toast.error('Kripya Topic chune');
                        return;
                      }
                      if (!quizConfig.difficulty) {
                        toast.error('Kripya Level chune');
                        return;
                      }
                      
                      const allAttempts = await localDb.getAttempts();
                      const userAttempts = allAttempts.filter(a => a.userId === profile?.uid);
                      const count = userAttempts.filter(a => a.topic === quizConfig.topic && a.difficulty === quizConfig.difficulty).length;
                      const limit = settings?.maxAttemptsPerLevel || 2;
                      
                      if (count >= limit) {
                        toast('You have completed this test', {
                          icon: '✅',
                          style: {
                            borderRadius: '16px',
                            background: '#333',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          },
                        });
                        return;
                      }
                      
                      setIsQuizzing(true);
                    }}
                    className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-100 mt-2"
                  >
                    <span className="text-sm font-black uppercase tracking-widest">Start Quiz</span>
                    <Play fill="currentColor" size={14} className="ml-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

            {(activeTab === 'attempts' || activeTab === 'remaining') && (
              <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* Stats Boxes for Attempts */}
                {activeTab === 'attempts' && (
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-sky-600 rounded-2xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden shadow-lg shadow-sky-100/50">
                        <div className="absolute -right-2 -bottom-2 opacity-10"><Trophy size={60} /></div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Avg Score</p>
                        <p className="text-2xl font-black">{stats.avgScore}</p>
                      </div>
                      <div className="bg-sky-600 rounded-2xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden shadow-lg shadow-sky-100/50">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Percentage</p>
                        <div className="flex items-end gap-1">
                          <p className="text-2xl font-black">{stats.avgPercentage}</p>
                          <span className="text-sm font-black text-sky-200">%</span>
                        </div>
                      </div>
                   </div>
                )}

                {/* Filters */}
                <div className="flex gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 min-w-[140px] flex-1">
                      <Filter size={12} className="text-zinc-400" />
                      <select value={filters.topic} onChange={(e) => setFilters({...filters, topic: e.target.value})} className="bg-transparent font-bold text-[10px] uppercase tracking-wider outline-none w-full">
                        <option value="">Topics</option>
                        {topics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 min-w-[100px] border-l border-zinc-200 pl-2">
                      <Settings2 size={12} className="text-zinc-400" />
                      <select value={filters.difficulty} onChange={(e) => setFilters({...filters, difficulty: e.target.value})} className="bg-transparent font-bold text-[10px] uppercase tracking-wider outline-none w-full">
                        <option value="">Levels</option>
                        {['Easy', 'Medium', 'Hard'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border-2 border-zinc-100 rounded-[32px] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-zinc-50/50 border-b border-zinc-100">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 w-16 text-center">SN</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer group" onClick={() => handleSort('topic')}>
                          <div className={cn("flex items-center gap-1 group-hover:text-sky-600 transition-colors", sort.field === 'topic' && "text-sky-600")}>
                            Topic <ArrowUpDown size={12} className={cn(sort.field === 'topic' && "opacity-100", "opacity-40")} />
                          </div>
                        </th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer group" onClick={() => handleSort('difficulty')}>
                          <div className={cn("flex items-center gap-1 group-hover:text-sky-600 transition-colors", sort.field === 'difficulty' && "text-sky-600")}>
                            Level <ArrowUpDown size={12} className={cn(sort.field === 'difficulty' && "opacity-100", "opacity-40")} />
                          </div>
                        </th>
                        {activeTab === 'attempts' ? (
                          <>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer group" onClick={() => handleSort('score')}>
                              <div className={cn("flex items-center gap-1 group-hover:text-sky-600 transition-colors", sort.field === 'score' && "text-sky-600")}>
                                Score <ArrowUpDown size={12} className={cn(sort.field === 'score' && "opacity-100", "opacity-40")} />
                              </div>
                            </th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer group" onClick={() => handleSort('percentage')}>
                              <div className={cn("flex items-center gap-1 group-hover:text-sky-600 transition-colors", sort.field === 'percentage' && "text-sky-600")}>
                                % <ArrowUpDown size={12} className={cn(sort.field === 'percentage' && "opacity-100", "opacity-40")} />
                              </div>
                            </th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 cursor-pointer group" onClick={() => handleSort('timestamp')}>
                              <div className={cn("flex items-center gap-1 group-hover:text-sky-600 transition-colors", sort.field === 'timestamp' && "text-sky-600")}>
                                Date & Time <ArrowUpDown size={12} className={cn(sort.field === 'timestamp' && "opacity-100", "opacity-40")} />
                              </div>
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Shesh Pryas</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Action</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {(activeTab === 'attempts' ? filteredAttempts : remainingCombinations).map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/30 transition-colors group">
                          <td className="px-6 py-5 text-center font-bold text-zinc-400 text-[10px]">{idx + 1}</td>
                          <td className="px-6 py-5 font-bold text-sm tracking-tight">{item.topic}</td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider",
                              item.difficulty === 'Easy' ? "bg-green-50 text-green-600 border border-green-100" :
                              item.difficulty === 'Medium' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-red-50 text-red-600 border border-red-100"
                            )}>{item.difficulty}</span>
                          </td>
                          {activeTab === 'attempts' ? (
                            <>
                              <td className="px-6 py-5 text-sm font-bold text-zinc-600">{(item as Attempt).score}/{(item as Attempt).totalQuestions}</td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[10px] font-black text-sky-600">
                                    <span>{Math.round(((item as Attempt).score / (item as Attempt).totalQuestions) * 100)}%</span>
                                  </div>
                                  <div className="w-20 h-1 bg-zinc-100 rounded-full overflow-hidden">
                                     <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(item as Attempt).score / (item as Attempt).totalQuestions * 100}%` }}
                                      className="h-full bg-sky-500" 
                                     />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-xs font-bold text-zinc-400 whitespace-nowrap">{formatDate((item as Attempt).timestamp)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-5">
                                <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-xs font-bold">
                                  {item.remaining} attempts left
                                </span>
                              </td>
                          <td className="px-6 py-5 text-right">
                             <button onClick={async () => {
                               // Fetch fresh attempts to ensure accuracy
                               const allAttempts = await localDb.getAttempts();
                               const userAttempts = allAttempts.filter(a => a.userId === profile?.uid);
                               const count = userAttempts.filter(a => a.topic === item.topic && a.difficulty === item.difficulty).length;
                               const limit = settings?.maxAttemptsPerLevel || 2;

                               if (count >= limit) {
                                  toast('You have completed this test', {
                                    icon: '✅',
                                    style: {
                                      borderRadius: '16px',
                                      background: '#333',
                                      color: '#fff',
                                      fontWeight: 'bold',
                                      fontSize: '14px'
                                    },
                                  });
                                  return;
                               }

                               setQuizConfig({ topic: item.topic, difficulty: item.difficulty });
                               setIsQuizzing(true);
                             }} className="h-10 px-4 bg-sky-50 text-sky-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-sky-600 hover:text-white transition-all ml-auto">
                               Start <ChevronRight size={14}/>
                             </button>
                          </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  {(activeTab === 'attempts' ? filteredAttempts : remainingCombinations).length === 0 && (
                    <div className="p-12 text-center text-zinc-400 text-sm">Koi records nahi mile.</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'certificates' && (
              <motion.div key="certificates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!settings?.isCertificateEnabled ? (
                   <div className="card p-12 text-center text-zinc-500">
                      <Award size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Certificate system abhi disabled hai.</p>
                   </div>
                ) : (
                  <div className="bg-white border-2 border-zinc-100 rounded-[32px] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[500px]">
                        <thead>
                          <tr className="bg-zinc-50/50 border-b border-zinc-100">
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center w-24">SN</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Topic</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Score</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">%</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right w-44">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {certificateTopics.map((item, idx) => (
                            <tr key={item.topic} className="hover:bg-zinc-50/30 transition-colors group">
                              <td className="px-6 py-5 text-center font-bold text-zinc-400 text-[10px]">{idx + 1}</td>
                              <td className="px-6 py-5 font-black text-sm tracking-tight">{item.topic}</td>
                              <td className="px-6 py-5 font-bold text-zinc-600 text-sm whitespace-nowrap">{item.score}/{item.totalQuestions}</td>
                              <td className="px-6 py-5 font-black text-sky-600 text-sm">{item.percentage}%</td>
                              <td className="px-6 py-5 text-right">
                                <button 
                                  onClick={() => downloadCertificate(item.topic)}
                                  className="inline-flex items-center gap-2 h-10 px-4 bg-sky-50 text-sky-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                                >
                                  Download <Download size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {certificateTopics.length === 0 && (
                      <div className="p-20 text-center text-zinc-500">
                        <Award size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="max-w-md mx-auto">Kissi bhi Topic ke teeno levels (Easy, Medium, Hard) clear karein avg. {settings?.certificateMinPercentage}% score ke sath certificate eligibility ke liye.</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
