import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { chatWithBot } from '../services/geminiService';

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([
      { text: "Merhaba! İngilizce ile ilgili her şeyi bana sorabilirsin.", isUser: false }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // For API history format
  const historyRef = useRef<{role: string, parts: {text: string}[]}[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { text: userMsg, isUser: true }]);
    setIsLoading(true);

    try {
        const reply = await chatWithBot(historyRef.current, userMsg);
        
        // Update history for next call
        historyRef.current.push({ role: "user", parts: [{ text: userMsg }] });
        historyRef.current.push({ role: "model", parts: [{ text: reply }] });

        setMessages(prev => [...prev, { text: reply, isUser: false }]);
    } catch (e) {
        setMessages(prev => [...prev, { text: "Üzgünüm, bir hata oluştu.", isUser: false }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-110"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-6 w-80 md:w-96 h-96 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 transform origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-primary p-4 text-white font-bold flex items-center gap-2">
            <MessageCircle size={20} />
            <span>AI Asistan</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-dark">
            {messages.map((m, i) => (
                <div key={i} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        m.isUser 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-bl-none'
                    }`}>
                        {m.text}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-2xl text-xs animate-pulse dark:text-slate-300">
                        Yazıyor...
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card flex gap-2">
            <input 
                type="text" 
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary dark:bg-slate-800 dark:text-white"
                placeholder="Bir şeyler sor..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-primary text-white p-2 rounded-full hover:bg-primary-dark disabled:opacity-50"
            >
                <Send size={18} />
            </button>
        </div>
      </div>
    </>
  );
};

export default ChatBot;
