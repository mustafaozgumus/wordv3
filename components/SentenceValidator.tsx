import React, { useState } from 'react';
import { CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { validateSentence } from '../services/geminiService';
import { AIValidationResult } from '../types';

const SentenceValidator: React.FC<{ word: string }> = ({ word }) => {
    const [input, setInput] = useState("");
    const [result, setResult] = useState<AIValidationResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleValidate = async () => {
        if (!input.trim()) return;
        setLoading(true);
        const res = await validateSentence(word, input);
        setResult(res);
        setLoading(false);
    };

    const getScoreColor = (score: string) => {
        if (score === 'iyi') return 'text-green-600 dark:text-green-400';
        if (score === 'orta') return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Cümle Doğrulama</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`"${word}" ile bir cümle yaz...`}
                    className="flex-1 text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
                <button 
                    onClick={handleValidate}
                    disabled={loading}
                    className="bg-primary text-white px-3 rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                    {loading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> : <PlayCircle size={20} />}
                </button>
            </div>

            {result && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-left">
                    <div className={`font-bold flex items-center gap-2 ${getScoreColor(result.score)}`}>
                        {result.score === 'iyi' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                        <span>Sonuç: {result.score.toUpperCase()}</span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{result.explanation}</p>
                    {result.corrected && result.corrected !== input && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-bold text-slate-500">Doğrusu:</span>
                            <p className="text-primary dark:text-primary-light italic">{result.corrected}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SentenceValidator;
