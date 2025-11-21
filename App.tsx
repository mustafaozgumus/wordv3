import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Settings, GraduationCap, List as ListIcon, RefreshCw, Check, X, Shuffle, Filter } from 'lucide-react';
import { fullVocabularyList } from './data';
import { Vocabulary, SRSData, DifficultyLevel } from './types';
import { generateSentence } from './services/geminiService';
import TTSButton from './components/TTSButton';
import ChatBot from './components/ChatBot';
import LiveExamples from './components/LiveExamples';
import SentenceValidator from './components/SentenceValidator';

// --- Utility ---
const CHUNK_SIZE = 20;
const SRS_INTERVALS = [0, 4 * 3600000, 8 * 3600000, 24 * 3600000, 3 * 24 * 3600000, 7 * 24 * 3600000, 14 * 24 * 3600000, 30 * 24 * 3600000];

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // Global State
  const [unknownIDs, setUnknownIDs] = useState<number[]>(() => JSON.parse(localStorage.getItem('unknownWords') || '[]'));
  const [srsMap, setSrsMap] = useState<Record<number, SRSData>>(() => JSON.parse(localStorage.getItem('srsData') || '{}'));
  const [aiLevel, setAiLevel] = useState<DifficultyLevel>(DifficultyLevel.A2);

  // Persist Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('unknownWords', JSON.stringify(unknownIDs));
  }, [unknownIDs]);

  useEffect(() => {
    localStorage.setItem('srsData', JSON.stringify(srsMap));
  }, [srsMap]);

  // --- Handlers ---
  const toggleUnknown = (id: number) => {
    if (unknownIDs.includes(id)) {
      setUnknownIDs(prev => prev.filter(uid => uid !== id));
      // SRS reset or improve? If manually marking 'known', increase SRS
      handleRateWord(id, true); 
    } else {
      setUnknownIDs(prev => [...prev, id]);
      // Reset SRS
      handleRateWord(id, false);
    }
  };

  const handleRateWord = (id: number, known: boolean) => {
    setSrsMap(prev => {
      const current = prev[id] || { level: 0, nextReview: 0 };
      let newLevel = known ? current.level + 1 : 1; // Reset to 1 if wrong, inc if right
      if (newLevel >= SRS_INTERVALS.length) newLevel = SRS_INTERVALS.length - 1;
      
      const nextReview = Date.now() + SRS_INTERVALS[newLevel];
      return { ...prev, [id]: { level: newLevel, nextReview } };
    });
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Header */}
        <header className="glass sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-primary to-purple-500 p-2 rounded-lg text-white">
                <GraduationCap size={24} />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Kelime Çalış
            </h1>
          </div>
          <div className="flex items-center gap-3">
             {/* Select Level */}
             <select 
                value={aiLevel} 
                onChange={(e) => setAiLevel(e.target.value as DifficultyLevel)}
                className="text-xs bg-slate-200 dark:bg-slate-700 dark:text-white border-none rounded-lg px-2 py-1 outline-none cursor-pointer"
             >
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
             </select>

            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-slate-600" size={20} />}
            </button>
          </div>
        </header>

        {/* Nav */}
        <nav className="flex justify-center gap-4 my-4">
          <NavLink to="/" icon={<Shuffle size={18} />} label="Çalış" />
          <NavLink to="/list" icon={<ListIcon size={18} />} label="Liste" />
          <NavLink to="/srs" icon={<RefreshCw size={18} />} label="SRS Modu" />
        </nav>

        {/* Toast */}
        <ToastContainer />

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 pb-24">
          <Routes>
            <Route path="/" element={
              <StudyMode 
                data={fullVocabularyList} 
                unknownIDs={unknownIDs} 
                onToggleUnknown={toggleUnknown}
                onRate={handleRateWord}
                aiLevel={aiLevel}
              />
            } />
            <Route path="/list" element={
              <ListMode 
                data={fullVocabularyList} 
                unknownIDs={unknownIDs} 
                onToggleUnknown={toggleUnknown} 
              />
            } />
            <Route path="/srs" element={
              <SRSMode 
                data={fullVocabularyList} 
                srsMap={srsMap}
                onRate={handleRateWord}
                aiLevel={aiLevel}
              />
            } />
          </Routes>
        </main>

        <ChatBot />
      </div>
    </HashRouter>
  );
}

// --- Navigation Components ---

const NavLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all ${
      isActive 
        ? 'bg-primary text-white shadow-lg shadow-indigo-500/30' 
        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`}>
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  )
}

// --- Study Mode (Original Logic + Modern UI) ---

function StudyMode({ data, unknownIDs, onToggleUnknown, onRate, aiLevel }: any) {
  const [part, setPart] = useState(0);
  const [isAll, setIsAll] = useState(false);
  const [filteredUnknown, setFilteredUnknown] = useState(false);
  
  const activeList = useMemo(() => {
    let list = isAll ? [...data] : data.slice(part * CHUNK_SIZE, (part + 1) * CHUNK_SIZE);
    if (filteredUnknown) {
      list = list.filter((w: Vocabulary) => unknownIDs.includes(w.id));
    }
    return list;
  }, [data, part, isAll, filteredUnknown, unknownIDs]);

  const [shuffledList, setShuffledList] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setShuffledList([...activeList]);
    setCurrentIndex(0);
  }, [activeList]);

  const shuffle = () => {
    const array = [...activeList];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    setShuffledList(array);
    setCurrentIndex(0);
    showToast("Liste karıştırıldı");
  };

  const handleNext = () => setCurrentIndex(prev => (prev + 1) % shuffledList.length);

  const partsCount = Math.ceil(data.length / CHUNK_SIZE);

  if (shuffledList.length === 0) {
    return (
      <div className="text-center mt-20 p-10 glass rounded-2xl mx-auto max-w-md">
        <h2 className="text-xl font-bold mb-2">Kelime Bulunamadı</h2>
        <p className="text-slate-500 dark:text-slate-400">Bu filtrede görüntülenecek kelime yok.</p>
        <button onClick={() => setFilteredUnknown(false)} className="mt-4 text-primary font-bold">Tümüne Dön</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col items-center">
      {/* Filters */}
      <div className="w-full mb-6 flex flex-col gap-3">
        <div className="flex gap-2">
            <select 
                className="flex-1 p-3 rounded-xl border-2 border-primary/20 bg-white dark:bg-slate-800 dark:text-white font-semibold outline-none focus:border-primary transition-colors disabled:opacity-50"
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if(val === -1) setIsAll(true);
                    else { setIsAll(false); setPart(val); }
                }}
                disabled={filteredUnknown}
                value={isAll ? -1 : part}
            >
                <option value={-1}>Tüm Kelimeler</option>
                {Array.from({length: partsCount}).map((_, i) => (
                    <option key={i} value={i}>Parça {i+1} ({i*CHUNK_SIZE+1}-{(i+1)*CHUNK_SIZE})</option>
                ))}
            </select>
            <button onClick={shuffle} className="p-3 bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200">
                <Shuffle size={20} />
            </button>
        </div>
        
        <button 
            onClick={() => setFilteredUnknown(!filteredUnknown)}
            className={`w-full py-2 rounded-xl font-bold text-sm transition-all border-2 ${
                filteredUnknown 
                ? 'bg-danger text-white border-danger' 
                : 'bg-transparent text-danger border-danger hover:bg-danger/10'
            }`}
        >
            {filteredUnknown ? 'Tümüne Dön' : `🧠 Sadece Zorlandıklarım (${unknownIDs.length})`}
        </button>
      </div>

      {/* Card Area */}
      <FlashCard 
        word={shuffledList[currentIndex]} 
        onNext={handleNext} 
        total={shuffledList.length}
        current={currentIndex + 1}
        isUnknown={unknownIDs.includes(shuffledList[currentIndex].id)}
        onToggleUnknown={() => onToggleUnknown(shuffledList[currentIndex].id)}
        onRate={onRate}
        aiLevel={aiLevel}
      />
    </div>
  );
}

// --- SRS Mode ---

function SRSMode({ data, srsMap, onRate, aiLevel }: any) {
    const dueWords = useMemo(() => {
        const now = Date.now();
        return data.filter((w: Vocabulary) => {
            const srs = srsMap[w.id];
            // If never seen (undefined) or due time is passed
            if (!srs) return true; 
            return srs.nextReview <= now;
        });
    }, [data, srsMap]);

    const [currentIndex, setCurrentIndex] = useState(0);

    const handleResult = (id: number, success: boolean) => {
        onRate(id, success);
        // If success, remove from session list visually or just move next
        // For standard SRS, we usually just move next.
        if (currentIndex < dueWords.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // End of session
            setCurrentIndex(prev => prev + 1); 
        }
    };

    if (dueWords.length === 0 || currentIndex >= dueWords.length) {
        return (
            <div className="text-center mt-20 glass p-10 rounded-3xl mx-auto max-w-md">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Tebrikler!</h2>
                <p className="text-slate-600 dark:text-slate-300">Bugün tekrar etmen gereken tüm kelimeleri tamamladın.</p>
                <Link to="/" className="mt-6 inline-block px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">
                    Normal Çalışmaya Dön
                </Link>
            </div>
        );
    }

    const word = dueWords[currentIndex];

    return (
        <div className="max-w-md mx-auto flex flex-col items-center mt-6">
             <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-1 rounded-full text-xs font-bold mb-4">
                SRS Tekrarı: {currentIndex + 1} / {dueWords.length}
             </div>
             <FlashCard 
                word={word} 
                onNext={() => {}} 
                total={dueWords.length}
                current={currentIndex + 1}
                isUnknown={false} // Hide badge in SRS usually
                onToggleUnknown={() => {}}
                onRate={(id, success) => handleResult(id, success)}
                srsMode={true}
                aiLevel={aiLevel}
            />
        </div>
    )
}

// --- List Mode ---
function ListMode({ data, unknownIDs, onToggleUnknown }: any) {
    const [search, setSearch] = useState("");

    const filtered = data.filter((w: Vocabulary) => 
        w.en.toLowerCase().includes(search.toLowerCase()) || 
        w.tr.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-2xl mx-auto">
            <div className="sticky top-20 z-30 mb-6">
                <input 
                    type="text" 
                    placeholder="Kelime ara..." 
                    className="w-full p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                {filtered.map((w: Vocabulary) => {
                    const isUnknown = unknownIDs.includes(w.id);
                    return (
                        <div key={w.id} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex flex-col">
                                <span className={`text-lg font-bold ${isUnknown ? 'text-danger' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {w.en}
                                </span>
                                <span className="text-slate-500 text-sm">{w.tr}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TTSButton text={w.en} className="!p-2 !rounded-full" />
                                <button 
                                    onClick={() => onToggleUnknown(w.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                        isUnknown 
                                        ? 'bg-danger/10 text-danger border border-danger' 
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                    }`}
                                >
                                    {isUnknown ? 'Zorlanıyorum' : 'İşaretle'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// --- Core Component: FlashCard ---

function FlashCard({ word, onNext, total, current, isUnknown, onToggleUnknown, onRate, srsMode, aiLevel }: any) {
  const [flipped, setFlipped] = useState(false);
  const [sentence, setSentence] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  // Reset state when word changes
  useEffect(() => {
    setFlipped(false);
    setSentence("");
  }, [word]);

  const handleFlip = () => setFlipped(!flipped);

  const fetchSentence = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sentence) return; // Already have it
    setLoadingAi(true);
    const s = await generateSentence(word.en, aiLevel);
    setSentence(s);
    setLoadingAi(false);
  };

  const highlightWord = (text: string, target: string) => {
    const parts = text.split(new RegExp(`(${target})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === target.toLowerCase() ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white rounded px-1">{part}</mark> : part
        )}
      </span>
    );
  }

  const handleAction = (e: React.MouseEvent, success: boolean) => {
    e.stopPropagation();
    if (srsMode) {
        onRate(word.id, success);
    } else {
        if (!success) {
             // "Bilemedim" logic
             if(!isUnknown) onToggleUnknown(); // Add to unknowns
             showToast("Tekrar listesine eklendi");
        } else {
             // "Biliyorum" logic
             if(isUnknown) onToggleUnknown(); // Remove from unknowns
             showToast("Öğrenildi!");
        }
        setTimeout(onNext, 200);
    }
  };

  return (
    <div className="w-full perspective-1000 group">
      <div className="text-center text-slate-400 text-xs font-bold mb-2 tracking-widest">{current} / {total}</div>
      
      {/* The Card */}
      <div 
        onClick={handleFlip}
        className={`relative w-full h-[420px] transition-all duration-500 transform-style-3d cursor-pointer ${flipped ? 'rotate-y-180' : ''}`}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden rounded-3xl shadow-2xl bg-white dark:bg-dark-card border border-white/20 flex flex-col items-center justify-center p-6">
          {isUnknown && !srsMode && (
            <span className="absolute top-4 right-4 bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
              Zorlandım
            </span>
          )}
          
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-primary to-purple-600 mb-4 text-center">
            {word.en}
          </h2>
          
          <div className="flex gap-2 mb-6">
            <TTSButton text={word.en} label="Dinle" />
          </div>

          {/* AI Sentence Section Front */}
          <div className="mt-4 w-full px-4">
            {!sentence ? (
                <button 
                    onClick={fetchSentence}
                    className="w-full py-2 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    {loadingAi ? "Üretiliyor..." : `✨ Örnek Cümle (${aiLevel})`}
                </button>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                     <p className="text-slate-700 dark:text-slate-300 text-sm italic leading-relaxed">
                        "{highlightWord(sentence, word.en)}"
                     </p>
                     <div className="mt-2 flex justify-center">
                        <TTSButton text={sentence} className="scale-75" />
                     </div>
                </div>
            )}
          </div>

        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl shadow-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex flex-col items-center justify-start pt-10 px-6 overflow-y-auto">
          <h2 className="text-3xl font-bold mb-2 text-center">{word.tr}</h2>
          <div className="w-16 h-1 bg-white/30 rounded-full mb-6"></div>
          
          <div onClick={e => e.stopPropagation()} className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h4 className="text-xs font-bold uppercase opacity-70 mb-2">Aksiyonlar</h4>
            <LiveExamples word={word.en} />
            <SentenceValidator word={word.en} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-8 px-2">
        <button 
            onClick={(e) => handleAction(e, false)}
            className="flex-1 py-4 bg-white dark:bg-dark-card border-2 border-danger text-danger rounded-2xl font-bold text-lg hover:bg-danger hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
            <X size={24} /> Bilemedim
        </button>
        <button 
            onClick={(e) => handleAction(e, true)}
            className="flex-1 py-4 bg-success text-white rounded-2xl font-bold text-lg hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 active:scale-95 flex items-center justify-center gap-2"
        >
            <Check size={24} /> Biliyorum
        </button>
      </div>
    </div>
  );
}

// --- Toast Logic ---
let toastTimeout: any;
function showToast(msg: string) {
    const el = document.getElementById('toast-notification');
    if(el) {
        el.innerText = msg;
        el.classList.remove('translate-y-20', 'opacity-0');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            el.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }
}

const ToastContainer = () => (
    <div 
        id="toast-notification" 
        className="fixed bottom-24 left-1/2 transform -translate-x-1/2 translate-y-20 opacity-0 bg-slate-900/90 text-white px-6 py-3 rounded-full font-semibold shadow-2xl z-50 transition-all duration-300 pointer-events-none backdrop-blur-md"
    >
        Bildirim
    </div>
)

export default App;
