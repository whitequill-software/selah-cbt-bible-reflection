import { useState, useEffect, FormEvent, MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Heart,
  Sparkles,
  Trash2,
  Plus,
  ChevronDown,
  Loader2,
  Calendar,
  Info,
  Check,
  BookMarked,
  HelpCircle,
  TrendingUp,
  Smile,
  AlertCircle
} from "lucide-react";
import { ReflectionEntry, ReflectionResult } from "./types";

const SUGGESTED_THOUGHTS = [
  {
    label: "Fear of Failure",
    text: "I'm going to fail this standard and everyone will see I have no idea what I'm doing."
  },
  {
    label: "Anxious Worry",
    text: "My friend hasn't messaged me back in hours. I must have done or said something to upset them."
  },
  {
    label: "Self-Critical",
    text: "I should have worked harder today. I'm so lazy and useless."
  },
  {
    label: "Hopeless Future",
    text: "Things are never going to improve. I am completely stuck in this stressful cycle."
  }
];

const MOOD_DESCRIPTIONS = [
  { value: 1, label: "Deeply Anxious", color: "text-rose-500 border-rose-300 bg-rose-50" },
  { value: 2, label: "Tense/Restless", color: "text-amber-500 border-amber-300 bg-amber-50" },
  { value: 3, label: "Neutral/Flustered", color: "text-slate-500 border-slate-300 bg-slate-50" },
  { value: 4, label: "Mostly Peaceful", color: "text-emerald-500 border-emerald-300 bg-emerald-50" },
  { value: 5, label: "Deeply Grounded", color: "text-teal-600 border-teal-300 bg-teal-50" }
];

export default function App() {
  const [thought, setThought] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [peaceBefore, setPeaceBefore] = useState<number>(2);
  const [peaceAfter, setPeaceAfter] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"reflect" | "journal">("reflect");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<ReflectionResult | null>(null);
  const [hasSavedCurrent, setHasSavedCurrent] = useState(false);

  // Saved reflections journal
  const [savedEntries, setSavedEntries] = useState<ReflectionEntry[]>([]);
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);
  const [selectedFilterDistortion, setSelectedFilterDistortion] = useState<string>("all");

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cbt_bible_reflections");
      if (stored) {
        setSavedEntries(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading from local storage", e);
    }
  }, []);

  // Sync back to local storage
  const saveToLocalStorage = (entries: ReflectionEntry[]) => {
    try {
      localStorage.setItem("cbt_bible_reflections", JSON.stringify(entries));
      setSavedEntries(entries);
    } catch (e) {
      console.error("Error writing to local storage", e);
    }
  };

  // Loading animation messages rotating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    "Listening tenderly to your concern...",
    "Highlighting standard cognitive distortion patterns...",
    "Seeking guidance from Holy Scripture...",
    "Formulating a gentle, balanced reframe..."
  ];

  const handleReflect = async (e: FormEvent) => {
    e.preventDefault();
    if (!thought.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setPeaceAfter(null);
    setHasSavedCurrent(false);

    try {
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process reflection model.");
      }

      setResult({
        distortionName: data.distortionName,
        distortionExplanation: data.distortionExplanation,
        reframe: data.reframe,
        bibleVerse: data.bibleVerse,
        bibleVerseReference: data.bibleVerseReference,
        prayerOrQuestion: data.prayerOrQuestion
      });
      // Set peacefulness after to one level higher than before to guide prompt, or let user pick freely
      setPeaceAfter(Math.min(5, peaceBefore + 1));
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "An error occurred. Please check your setup.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add suggestion helper
  const handleApplySuggestion = (text: string) => {
    setThought(text);
    setErrorMsg(null);
    setResult(null);
  };

  // Save entry to journal
  const handleSaveReflection = () => {
    if (!result) return;

    const newEntry: ReflectionEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      originalThought: thought,
      distortionName: result.distortionName,
      distortionExplanation: result.distortionExplanation,
      reframe: result.reframe,
      bibleVerse: result.bibleVerse,
      bibleVerseReference: result.bibleVerseReference,
      prayerOrQuestion: result.prayerOrQuestion,
      peaceRatingBefore: peaceBefore,
      peaceRatingAfter: peaceAfter || undefined
    };

    const updated = [newEntry, ...savedEntries];
    saveToLocalStorage(updated);
    setHasSavedCurrent(true);
    
    // Auto-expand this new reflection in the list or set active tab
    setExpandedJournalId(newEntry.id);
  };

  // Delete entry from journal
  const handleDeleteEntry = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = savedEntries.filter((item) => item.id !== id);
    saveToLocalStorage(updated);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you would like to clear your entire Reflection Journal? This cannot be undone.")) {
      saveToLocalStorage([]);
    }
  };

  // Gather unique distortions from journal for filtering
  const existingDistortions: string[] = Array.from(
    new Set(savedEntries.map((e) => e.distortionName.split(",")[0].trim()))
  );

  const filteredEntries = savedEntries.filter((entry) => {
    if (selectedFilterDistortion === "all") return true;
    return entry.distortionName.toLowerCase().includes(selectedFilterDistortion.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#faf9f5] text-stone-800 font-sans flex flex-col antialiased">
      {/* Soft Header Banner */}
      <header className="border-b border-stone-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-10 w-full" id="header-nav">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm" id="logo-icon">
              <BookOpen className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h1 className="text-xl font-semibold font-display tracking-tight text-stone-950 flex items-center gap-2">
                Selah <span className="text-xs font-medium font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">CBT Reflection</span>
              </h1>
              <p className="text-xs text-stone-500">Thy Word is a lamp unto my feet.</p>
            </div>
          </div>

          {/* Navigation Control */}
          <div className="flex bg-stone-100/80 p-0.5 rounded-lg border border-stone-200/50" id="tab-controls">
            <button
              onClick={() => setActiveTab("reflect")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeTab === "reflect"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
              id="tab-reflect"
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              New Reflection
            </button>
            <button
              onClick={() => setActiveTab("journal")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 relative ${
                activeTab === "journal"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
              id="tab-journal"
            >
              <BookMarked className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Reflection Log
              {savedEntries.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-700 text-white font-mono text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                  {savedEntries.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-start" id="main-content">
        
        {/* Active Tab 1: New reflection processing */}
        {activeTab === "reflect" && (
          <div className="space-y-8 animate-fade-in">
            {/* Compassionate Explainer */}
            <div className="text-center max-w-2xl mx-auto space-y-2 mt-4">
              <h2 className="text-3xl font-display font-medium text-stone-900 tracking-tight">
                Cast your burdens in peaceful reflection
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Bring thoughts that cause sadness, anxiety, or self-criticism into a warm environment of Cognitive Behavioral Therapy combined with comforting Bible truth.
              </p>
            </div>

            {/* suggestions bank */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-sand-300 shadow-sm max-w-3xl mx-auto space-y-2.5">
              <h3 className="text-xs uppercase font-semibold text-stone-500 tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-stone-400" />
                Suggested reflections to try
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_THOUGHTS.map((suggest, index) => (
                  <button
                    key={index}
                    onClick={() => handleApplySuggestion(suggest.text)}
                    className="p-2.5 rounded-lg border border-stone-200/70 bg-white text-left hover:border-emerald-700/40 hover:bg-emerald-50/20 text-xs transition-all duration-200 flex flex-col group"
                  >
                    <span className="font-semibold text-stone-700 group-hover:text-emerald-900 transition-colors">
                      {suggest.label}
                    </span>
                    <span className="text-stone-500 line-clamp-1 mt-0.5 text-[11px] font-sans">
                      "{suggest.text}"
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-md p-6 max-w-3xl mx-auto" id="input-card">
              <form onSubmit={handleReflect} className="space-y-6">
                
                {/* Text area */}
                <div className="space-y-2">
                  <label htmlFor="thought-textarea" className="block text-sm font-semibold text-stone-800">
                    My Troubling Thought
                  </label>
                  <textarea
                    id="thought-textarea"
                    placeholder="E.g., I'm letting everyone down at work and they all think I'm failing..."
                    rows={4}
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/40 focus:border-emerald-700 bg-[#FAF9F6]/30 transition-all"
                    maxLength={1000}
                  ></textarea>
                  <div className="flex justify-between text-xs text-stone-400 font-mono">
                    <span>Be completely honest; this is a safe, quiet space.</span>
                    <span>{thought.length}/1000</span>
                  </div>
                </div>

                {/* Peace Meter before */}
                <div className="space-y-3 bg-[#fbfbf8] p-4 rounded-xl border border-stone-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                      What is your peace/calm level right now?
                    </span>
                    <span className="text-xs bg-stone-100 px-2 py-0.5 text-stone-600 rounded">
                      Level: <span className="font-mono font-bold text-stone-800">{peaceBefore}/5</span>
                    </span>
                  </div>
                  
                  {/* Slider */}
                  <div className="space-y-4">
                    <input
                      title="Heart Peace Level"
                      type="range"
                      min={1}
                      max={5}
                      value={peaceBefore}
                      onChange={(e) => setPeaceBefore(Number(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-800 focus:outline-none"
                    />
                    <div className="grid grid-cols-5 gap-1 pt-1 justify-items-center">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPeaceBefore(num)}
                          className={`flex flex-col items-center gap-1 p-1 rounded-md transition-all ${
                            peaceBefore === num
                              ? "scale-105 font-medium"
                              : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          <span className={`text-[10px] uppercase tracking-wider font-semibold font-mono ${peaceBefore === num ? 'text-emerald-800 font-bold' : 'text-stone-500'}`}>
                            {num === 1 && "Restless"}
                            {num === 2 && "Anxious"}
                            {num === 3 && "Neutral"}
                            {num === 4 && "Calmer"}
                            {num === 5 && "Peaceful"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reflect Button or Loading Indicator */}
                <div className="flex flex-col items-center justify-center gap-3">
                  {isLoading ? (
                    <div className="w-full py-6 flex flex-col items-center gap-3 bg-emerald-50/25 border border-emerald-100/50 rounded-xl" id="loading-box">
                      <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-emerald-900 animate-pulse">
                          {loadingMessages[loadingStep]}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-1">Reflecting with Biblical Counsel...</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!thought.trim()}
                      className={`w-full py-3.5 px-6 rounded-xl font-display font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                        thought.trim()
                          ? "bg-stone-900 text-[#faf9f5] hover:bg-stone-850 active:scale-[0.99] cursor-pointer"
                          : "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                      }`}
                      id="reflect-button"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Begin Reflection
                    </button>
                  )}
                </div>

              </form>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="max-w-3xl mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5" id="error-card">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Unable to generate reflection</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Results Display */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 max-w-3xl mx-auto"
                  id="results-section"
                >
                  <div className="text-center pt-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#2d4a43] bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      Reflection Generated Successfully
                    </span>
                  </div>

                  {/* Combined Result Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-12">
                    
                    {/* Left Pane: CBT Distortion and Balanced Reframe */}
                    <div className="p-6 md:p-8 md:col-span-7 space-y-6 border-b md:border-b-0 md:border-r border-stone-100">
                      
                      {/* Distortion */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-xs font-bold bg-[#FAF9F5] uppercase tracking-wider text-rose-700 border border-rose-100 rounded-full">
                            {result.distortionName}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-400">Identified Cognitive Distortion</span>
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed bg-stone-50/70 p-3.5 rounded-xl border border-stone-100">
                          {result.distortionExplanation}
                        </p>
                      </div>

                      {/* Balanced Reframe */}
                      <div className="space-y-2">
                        <h4 className="text-xs uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Balanced CBT Reframe
                        </h4>
                        <div className="border-l-2 border-emerald-700 pl-4 py-1">
                          <p className="text-stone-800 text-sm leading-relaxed italic font-medium">
                            "{result.reframe}"
                          </p>
                        </div>
                        <p className="text-[11px] text-stone-400">A gentler, more authentic and reasonable perspective on your thought.</p>
                      </div>
                    </div>

                    {/* Right Pane: Bible Verse and Devotion / Prayer */}
                    <div className="p-6 md:p-8 md:col-span-12 lg:col-span-5 bg-gradient-to-br from-[#fbfbfa] to-[#f4f7f5] space-y-6 flex flex-col justify-between">
                      
                      {/* scripture Card */}
                      <div className="space-y-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm relative overflow-hidden">
                        {/* decorative quote mark */}
                        <div className="absolute -top-1 -right-1 w-12 h-12 bg-emerald-50 border-b border-l border-emerald-100/50 rounded-bl-3xl flex items-center justify-center opacity-70">
                          <BookOpen className="w-4 h-4 text-emerald-700" />
                        </div>
                        
                        <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">Scripture Comfort</p>
                        
                        <blockquote className="text-stone-900 font-serif text-[15px] italic leading-relaxed pt-1">
                          “{result.bibleVerse}”
                        </blockquote>
                        <cite className="block text-right text-xs font-medium text-stone-600 font-display not-italic">
                          — {result.bibleVerseReference}
                        </cite>
                      </div>

                      {/* Prayer / Reflection Question */}
                      <div className="space-y-2 bg-emerald-800/5 p-4 rounded-xl border border-emerald-800/10">
                        <h4 className="text-xs uppercase font-bold text-[#2d4a43] tracking-widest flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-emerald-700 fill-emerald-100" />
                          Prayer & reflection
                        </h4>
                        <p className="text-stone-700 text-xs leading-relaxed italic">
                          {result.prayerOrQuestion}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Peace Scale After Reflection & Save */}
                  <div className="bg-emerald-950 text-[#faf9f5] rounded-2xl shadow-md p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-display font-medium text-base flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          Check-in: How is your heart now?
                        </h4>
                        <p className="text-xs text-stone-300">
                          Take a slow breath. Select a rating to capture your peace level after reading the reflection.
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => setPeaceAfter(num)}
                            className={`w-10 h-10 rounded-full text-xs font-mono font-bold transition-all flex items-center justify-center border ${
                              peaceAfter === num
                                ? "bg-emerald-500 text-white border-emerald-400 scale-105 shadow"
                                : "text-stone-300 border-emerald-900 bg-emerald-900/40 hover:bg-emerald-900"
                            }`}
                            id={`heart-peace-${num}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-900 flex flex-col sm:flex-row justify-between items-center gap-4">
                      {peaceAfter && (
                        <p className="text-xs text-[#b8dfcd] flex items-center gap-1.5 font-sans">
                          {peaceAfter > peaceBefore ? (
                            <>
                              <Smile className="w-4 h-4 text-emerald-400" />
                              <span>Your peace shifted from <strong>{peaceBefore}</strong> to <strong>{peaceAfter}</strong>. Thank God for comfort.</span>
                            </>
                          ) : (
                            <span>Gently holding space for your feelings of level {peaceAfter}.</span>
                          )}
                        </p>
                      )}

                      <div className="ml-auto flex items-center gap-3">
                        {hasSavedCurrent ? (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-900/50 px-3 py-1.5 rounded-lg border border-emerald-800 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-450" /> Saved to Reflection Log
                          </span>
                        ) : (
                          <button
                            onClick={handleSaveReflection}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs font-semibold font-display px-5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            id="save-reflection"
                          >
                            <BookMarked className="w-3.5 h-3.5" />
                            Save reflection to Journal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Active Tab 2: Journal Timeline */}
        {activeTab === "journal" && (
          <div className="space-y-6 animate-fade-in mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-2xl font-display font-medium text-stone-900">Your Reflection Log</h2>
                <p className="text-xs text-stone-400">Keep track of your thought patterns and peace breakthroughs.</p>
              </div>

              {savedEntries.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-stone-400 hover:text-rose-600 flex items-center gap-1 transition-colors bg-white px-3 py-1.5 rounded-lg border border-stone-250 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear entire log
                </button>
              )}
            </div>

            {savedEntries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 max-w-xl mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border border-emerald-100">
                  <BookMarked className="w-8 h-8 text-emerald-800 opacity-60" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#2d4a43]">No saved reflections yet</h3>
                  <p className="text-stone-400 text-xs max-w-xs mx-auto leading-relaxed">
                    Write down a troubling thought and process it to see your chronological reflection timeline here.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => setActiveTab("reflect")}
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Write first entry
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Filter section */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Filter by pattern:</span>
                  <button
                    onClick={() => setSelectedFilterDistortion("all")}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                      selectedFilterDistortion === "all"
                        ? "bg-stone-900 text-white border-stone-900 font-medium"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    All patterns ({savedEntries.length})
                  </button>
                  {existingDistortions.map((distortion) => (
                    <button
                      key={distortion}
                      onClick={() => setSelectedFilterDistortion(distortion)}
                      className={`px-3 py-1 text-xs rounded-full border transition-all ${
                        selectedFilterDistortion.toLowerCase() === distortion.toLowerCase()
                          ? "bg-emerald-800 text-white border-emerald-800 font-medium"
                          : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {distortion}
                    </button>
                  ))}
                </div>

                {/* Timeline Grid */}
                <div className="space-y-4">
                  {filteredEntries.map((entry, idx) => {
                    const isExpanded = expandedJournalId === entry.id;
                    const date_formatted = new Date(entry.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });
                    const time_formatted = new Date(entry.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div
                        key={entry.id}
                        className={`bg-white rounded-2xl border border-stone-200/80 transition-all duration-350 hover:shadow-sm select-none overflow-hidden ${
                          isExpanded ? "ring-1 ring-emerald-800/15 shadow-sm" : ""
                        }`}
                      >
                        {/* Entry Header */}
                        <div
                          onClick={() => setExpandedJournalId(isExpanded ? null : entry.id)}
                          className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#faf9f5]/5 transition-colors"
                        >
                          <div className="space-y-2 flex-grow">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                {entry.distortionName}
                              </span>
                              
                              <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-stone-400" />
                                {date_formatted} at {time_formatted}
                              </span>
                            </div>

                            <p className="text-stone-800 font-medium text-sm line-clamp-1 italic">
                              "{entry.originalThought}"
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Mood tracker score representation */}
                            {entry.peaceRatingBefore && entry.peaceRatingAfter && (
                              <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100">
                                <span className="text-[10px] uppercase text-stone-500 font-bold font-mono">Calm</span>
                                <span className="text-xs font-bold text-stone-600">{entry.peaceRatingBefore}</span>
                                <span className="text-stone-450">➔</span>
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">{entry.peaceRatingAfter}</span>
                              </div>
                            )}

                            <button
                              onClick={(e) => handleDeleteEntry(entry.id, e)}
                              className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete reflection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <ChevronDown
                              className={`w-5 h-5 text-stone-400 transition-transform ${
                                isExpanded ? "rotate-180 text-emerald-800" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* Expandable Body */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-stone-100"
                            >
                              <div className="p-5 md:p-6 bg-[#FCFAF6]/60 grid grid-cols-1 md:grid-cols-12 gap-6 leading-relaxed">
                                
                                {/* Left Section */}
                                <div className="space-y-4 md:col-span-6 border-b md:border-b-0 md:border-r border-stone-200/50 pb-4 md:pb-0 md:pr-6">
                                  <div className="space-y-1">
                                    <h5 className="text-[10px] text-stone-450 font-bold uppercase tracking-widest">Your raw concern</h5>
                                    <p className="text-xs text-stone-700 italic bg-white p-3 rounded-xl border border-stone-150">
                                      "{entry.originalThought}"
                                    </p>
                                  </div>

                                  <div className="space-y-1 pt-1">
                                    <h5 className="text-[10px] text-stone-450 font-bold uppercase tracking-widest">CBT Pattern analysis</h5>
                                    <p className="text-xs text-stone-600">
                                      {entry.distortionExplanation}
                                    </p>
                                  </div>

                                  <div className="space-y-1.5 pt-2">
                                    <h5 className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> Balanced Reframe
                                    </h5>
                                    <p className="text-stone-900 font-medium text-xs bg-white/80 p-3.5 rounded-xl border border-emerald-800/10 italic">
                                      "{entry.reframe}"
                                    </p>
                                  </div>
                                </div>

                                {/* Right Section */}
                                <div className="space-y-4 md:col-span-6 flex flex-col justify-between">
                                  <div className="bg-white p-4 rounded-xl border border-stone-200 relative">
                                    <h5 className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest mb-1.5">Bible Comfort</h5>
                                    <p className="text-stone-900 font-serif text-sm italic font-medium">
                                      “{entry.bibleVerse}”
                                    </p>
                                    <p className="text-xs text-stone-500 font-display text-right mt-1.5 font-semibold">
                                      — {entry.bibleVerseReference}
                                    </p>
                                  </div>

                                  <div className="bg-emerald-950/5 p-3.5 rounded-xl border border-emerald-800/8 space-y-1">
                                    <h5 className="text-[10px] text-[#2d4a43] font-bold uppercase tracking-widest">Prayer / Reflection Question</h5>
                                    <p className="text-xs text-stone-700 italic">
                                      {entry.prayerOrQuestion}
                                    </p>
                                  </div>
                                </div>

                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 mt-12 w-full text-center" id="footer-section">
        <div className="max-w-4xl mx-auto px-4 text-xs text-stone-400 space-y-2">
          <p className="font-medium">Selah reflection journal is designed to support mental clarity, CBT therapy, and devotional practice.</p>
          <p>© 2026 Selah Bible CBT. Bring your thoughts to peaceful resting.</p>
        </div>
      </footer>
    </div>
  );
}

