import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Timer, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Send,
  LogOut,
  BookOpen
} from 'lucide-react';
import { localDb } from '../lib/localDb';
import { Question, AppSettings, Attempt } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface QuizProps {
  topic: string;
  difficulty: string;
  onComplete: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ topic, difficulty, onComplete }) => {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const startQuiz = async () => {
      // Fetch settings locally
      const s = await localDb.getSettings();
      setSettings(s);
      setTimeLeft(s.quizTime * 60);

      // Fetch questions locally
      let allQuestions = await localDb.getQuestions();
      
      // Try specific filter first
      let filtered = allQuestions.filter(q => q.difficulty === difficulty);
      if (topic) {
        filtered = filtered.filter(q => q.topic === topic);
      }
      
      // Fallback: If no questions match specific filters, show any available questions
      if (filtered.length === 0) {
        filtered = allQuestions;
      }
      
      // Randomize Questions if setting enabled
      if (s.randomizeQuestions) {
        filtered = filtered.sort(() => Math.random() - 0.5);
      }
      
      setQuestions(filtered.slice(0, 10));
      setLoading(false);
    };

    startQuiz();
  }, [topic, difficulty]);

  useEffect(() => {
    if (timeLeft <= 0 || isFinished) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    if (timeLeft === 0) finishQuiz();
    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const finishQuiz = async () => {
    if (isFinished) return;
    setIsFinished(true);

    let score = 0;
    const attemptAnswers: { questionId: string; questionText?: string; selectedOption: string; isCorrect: boolean }[] = [];
    
    questions.forEach(q => {
      const isCorrect = answers[q.id] === q.correctOption;
      if (isCorrect) {
        score++;
      }
      attemptAnswers.push({
        questionId: q.id,
        questionText: q.question,
        selectedOption: answers[q.id] || '',
        isCorrect
      });
    });
    setFinalScore(score);

    // Save attempt locally
    if (profile) {
      try {
        const attempt: Attempt = {
          id: Math.random().toString(36).substr(2, 9),
          userId: profile.uid,
          userName: profile.displayName,
          topic: topic || 'General Physics',
          difficulty,
          score,
          totalQuestions: questions.length,
          answers: attemptAnswers,
          timestamp: new Date().toISOString()
        };

        await localDb.saveAttempt(attempt);
        toast.success('Quiz completed successfully!');
      } catch (err) {
        console.error(err);
        toast.error('Could not save attempt');
      }
    }
  };

  const [optionOrder, setOptionOrder] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchSettingsAndOrder = async () => {
      const settings = await localDb.getSettings();
      const orderMap: Record<string, string[]> = {};
      
      questions.forEach(q => {
        const standardOrder = ['A', 'B', 'C', 'D'];
        if (settings.randomizeOptions) {
          orderMap[q.id] = [...standardOrder].sort(() => Math.random() - 0.5);
        } else {
          orderMap[q.id] = standardOrder;
        }
      });
      setOptionOrder(orderMap);
    };
    
    if (questions.length > 0) {
      fetchSettingsAndOrder();
    }
  }, [questions]);

  if (loading || (questions.length > 0 && Object.keys(optionOrder).length === 0)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center py-20">
        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
        <h2 className="text-2xl font-bold mb-4">Questions Nahi Mile</h2>
        <p className="text-zinc-500 mb-6">Chuna gaya topic ya difficulty ke liye questions bank mein nahi hain. Kripya Admin panel se questions upload karein ya Settings mein "Load Demo Questions" par click karein.</p>
        <button onClick={onComplete} className="btn btn-primary px-8">Dashboard Wapas Jaye</button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-6xl mx-auto p-3 py-4 md:p-4 md:py-8"
      >
        <div className="card p-3 md:p-10 text-center mx-auto">
          <div className="p-0.5 md:p-4">
            <div className="grid grid-cols-2 gap-1 mb-2">
              <div className="bg-sky-600 rounded-lg py-1 px-3 text-white flex flex-col items-center justify-center shadow-lg shadow-sky-100">
                <p className="text-[7px] font-black uppercase tracking-widest opacity-70 mb-0">Score</p>
                <p className="text-lg font-black leading-tight">{finalScore}/{questions.length}</p>
              </div>
              <div className="bg-sky-600 rounded-lg py-1 px-3 text-white flex flex-col items-center justify-center shadow-lg shadow-sky-100">
                <p className="text-[7px] font-black uppercase tracking-widest opacity-70 mb-0">Percent</p>
                <p className="text-lg font-black leading-tight">{Math.round((finalScore / questions.length) * 100)}%</p>
              </div>
            </div>
          </div>
          
          <div className="text-left mb-8 overflow-hidden rounded-2xl border border-zinc-100 w-full">
            <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-100 font-bold flex items-center gap-2 text-sm">
              <BookOpen size={16} className="text-sky-600" />
              Review Your Answers
            </div>
            <div className="max-h-[500px] overflow-auto bg-white">
              {questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correctOption;
                return (
                  <div key={q.id} className="p-4 border-b border-zinc-50 last:border-0 text-left">
                    <div className="flex gap-2 mb-3">
                      <span className="font-black text-zinc-400 text-sm mt-0.5 whitespace-nowrap">
                        {idx + 1}.
                      </span>
                      <p className="font-bold text-zinc-900 text-sm leading-tight">{q.question}</p>
                    </div>
                    <div className="ml-2 space-y-2">
                      <div className={cn(
                        "p-3 rounded-xl border text-[11px] shadow-sm",
                        isCorrect ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
                      )}>
                        <p className="opacity-70 font-bold uppercase tracking-wider mb-0.5">Aapka Jawab</p>
                        <p className="font-bold">({userAnswer || '-'}) {userAnswer ? q[`option${userAnswer}` as keyof Question] : 'Nahi Diya'}</p>
                      </div>
                      {!isCorrect && (
                        <div className="p-3 rounded-xl border border-green-100 bg-green-50 text-green-700 text-[11px] shadow-sm">
                          <p className="opacity-70 font-bold uppercase tracking-wider mb-0.5">Sahi Jawab</p>
                          <p className="font-bold">({q.correctOption}) {q[`option${q.correctOption}` as keyof Question]}</p>
                        </div>
                      )}
                      {q.remark && (
                        <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-sky-800 text-[10px] italic">
                           <span className="font-bold uppercase block mb-0.5">Remark:</span>
                           {q.remark}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={onComplete} className="btn btn-primary w-full py-4 text-lg">
            Dashboard Check Karein
          </button>
        </div>
      </motion.div>
    );
  }

  const currentQ = questions[currentIndex];
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-2 py-0 md:py-8">
      {/* Quiz Header - Balanced Single Row at Top */}
      <div className="sticky top-0 bg-zinc-50/95 backdrop-blur z-40 py-1 border-b border-zinc-100 mb-1">
        <div className="grid grid-cols-3 gap-1 items-center px-1">
          <div className="flex justify-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-white border border-zinc-200 px-2 py-1.5 rounded-lg whitespace-nowrap shadow-sm w-full text-center">
              Q {currentIndex + 1}/{questions.length}
            </div>
          </div>
          
          <div className="flex justify-center px-0.5">
            <div className="text-[9px] font-black text-zinc-500 px-2 py-1.5 rounded-lg bg-zinc-200 uppercase truncate w-full text-center">
              {topic || 'Quiz'} {difficulty}
            </div>
          </div>

          <div className="flex justify-center">
            <div className={cn(
              "flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-mono text-xs font-black w-full shadow-sm",
              timeLeft < 60 ? "bg-red-100 text-red-600 animate-pulse" : "bg-sky-600 text-white"
            )}>
              <Timer size={12} />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar - Tighter spacing */}
      <div className="w-full h-1 bg-zinc-200 rounded-full mb-3 overflow-hidden px-1">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          className="h-full bg-sky-600" 
        />
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="card p-3 md:p-10 mb-3"
        >
          <h2 className="text-base md:text-2xl font-bold leading-tight mb-4 text-zinc-800">
            {currentQ.question}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {(optionOrder[currentQ.id] || ['A', 'B', 'C', 'D']).map((opt, idx) => {
              const optKey = `option${opt}` as keyof Question;
              const isSelected = answers[currentQ.id] === opt;
              const hasAnswered = !!answers[currentQ.id];
              const isCorrect = opt === currentQ.correctOption;
              
              return (
                <button
                  key={opt}
                  disabled={hasAnswered}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: opt }))}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all group",
                    !hasAnswered && isSelected && "border-sky-600 bg-sky-600 text-white shadow-xl shadow-sky-100",
                    !hasAnswered && !isSelected && "border-zinc-100 hover:border-sky-200 hover:bg-sky-50",
                    hasAnswered && isCorrect && "border-green-500 bg-green-50 text-green-900",
                    hasAnswered && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-900",
                    hasAnswered && !isSelected && !isCorrect && "border-zinc-100 opacity-50"
                  )}
                >
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors shrink-0",
                    isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-sky-100",
                    hasAnswered && isCorrect && "bg-green-600 text-white",
                    hasAnswered && isSelected && !isCorrect && "bg-red-600 text-white"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-xs sm:text-sm">{currentQ[optKey] as string}</p>
                  </div>
                  {hasAnswered && isCorrect && <CheckCircle2 size={14} className="text-green-600" />}
                  {hasAnswered && isSelected && !isCorrect && <XCircle size={14} className="text-red-600" />}
                </button>
              );
            })}
          </div>

          {/* Remark Section */}
          <AnimatePresence>
            {answers[currentQ.id] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-4 p-3 rounded-xl border flex items-start gap-3",
                  answers[currentQ.id] === currentQ.correctOption 
                    ? "bg-green-50 border-green-100" 
                    : "bg-amber-50 border-amber-100"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  answers[currentQ.id] === currentQ.correctOption ? "bg-green-100" : "bg-amber-100"
                )}>
                  <BookOpen size={14} className={answers[currentQ.id] === currentQ.correctOption ? "text-green-600" : "text-amber-600"} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">Answer & Explanation</p>
                  <p className="text-xs font-bold text-zinc-800">
                    Sahi Jawab: <span className="text-green-600">
                      {(() => {
                        const physIndex = (optionOrder[currentQ.id] || ['A', 'B', 'C', 'D']).indexOf(currentQ.correctOption);
                        return String.fromCharCode(65 + physIndex);
                      })()}
                    </span>
                  </p>
                  {currentQ.remark && (
                    <p className="text-zinc-600 text-[11px] italic mt-1 leading-snug">{currentQ.remark}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Single Row for mobile */}
      <div className="pt-1 border-t border-zinc-200">
        <div className="flex items-center justify-between gap-1 px-0.5">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn btn-secondary flex items-center justify-center gap-1 py-1 px-1 h-9 flex-1 text-[9px] font-black uppercase tracking-tighter"
          >
            <ChevronLeft size={12} /> Back
          </button>

          <button 
             onClick={() => {
               if(confirm('Khatam karain?')) onComplete();
             }}
             className="btn bg-zinc-100 text-zinc-400 hover:text-red-500 flex items-center justify-center gap-1 h-9 px-1 flex-1 font-black text-[9px] uppercase tracking-tighter rounded-xl"
          >
            <LogOut size={12} /> Exit
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={() => {
                if (!answers[currentQ.id]) {
                  toast.error("Pehle Option chune!");
                  return;
                }
                finishQuiz();
              }}
              className="btn bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1 py-1 px-1 shadow-lg h-9 flex-1 text-[9px] font-black uppercase tracking-tighter"
            >
              Finish <Send size={12} />
            </button>
          ) : (
            <button
              onClick={() => {
                if (!answers[currentQ.id]) {
                  toast.error("Pehle Option chune!");
                  return;
                }
                setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
              }}
              className="btn btn-primary flex items-center justify-center gap-1 py-1 px-1 shadow-lg h-9 flex-1 text-[9px] font-black uppercase tracking-tighter"
            >
              Next <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
