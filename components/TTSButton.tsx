import React from 'react';
import { Volume2 } from 'lucide-react';

interface TTSButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const TTSButton: React.FC<TTSButtonProps> = ({ text, label, className = "" }) => {
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop previous
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tarayıcınız seslendirmeyi desteklemiyor.");
    }
  };

  return (
    <button 
      onClick={handleSpeak}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium ${className}`}
    >
      <Volume2 size={16} />
      {label && <span>{label}</span>}
    </button>
  );
};

export default TTSButton;
