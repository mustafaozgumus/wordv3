import React, { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { fetchLiveExamples } from '../services/geminiService';
import TTSButton from './TTSButton';

const LiveExamples: React.FC<{ word: string }> = ({ word }) => {
    const [examples, setExamples] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleFetch = async () => {
        setLoading(true);
        const data = await fetchLiveExamples(word);
        setExamples(data);
        setLoading(false);
    };

    return (
        <div className="mt-4 w-full">
            <button 
                onClick={handleFetch}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {examples.length > 0 ? "Yeni Örnekler Getir" : "Canlı Örnek Cümle Getir (AI)"}
            </button>
            
            {examples.length > 0 && (
                <ul className="mt-3 space-y-2 text-left">
                    {examples.map((ex, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                           <span className="flex-1 mr-2">{ex}</span>
                           <TTSButton text={ex} className="scale-75 origin-right p-1" />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LiveExamples;
