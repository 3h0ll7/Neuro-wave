import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Activity, Cpu, Wind } from 'lucide-react';
import { ChatMessage } from '../types';

interface InterfaceProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading: boolean;
  latestResponse: string | null;
}

const Interface: React.FC<InterfaceProps> = ({ onSubmit, isLoading, latestResponse }) => {
  const [inputText, setInputText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const latestResponseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    await onSubmit(inputText);
    setInputText('');
  };

  useEffect(() => {
    if (latestResponse && latestResponseRef.current) {
       setExpanded(true);
       // Auto-hide large text after a while or keep it? Let's keep it persistent until next.
    }
  }, [latestResponse]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 p-6 overflow-hidden">
      {/* Header */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            NeuroWave
          </h1>
          <p className="text-xs text-gray-400 mt-1 tracking-widest uppercase">
            Gemini-Powered Sentiment Visualizer
          </p>
        </div>
        
        <div className="flex gap-2">
            {/* Status Indicators */}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                <span className="text-xs font-mono text-gray-300">{isLoading ? 'PROCESSING' : 'ONLINE'}</span>
            </div>
        </div>
      </div>

      {/* AI Response Area */}
      <div className={`flex-1 flex items-center justify-center transition-opacity duration-1000 ${latestResponse ? 'opacity-100' : 'opacity-0'}`}>
        {latestResponse && (
          <div 
            ref={latestResponseRef}
            className="bg-black/30 backdrop-blur-lg border border-white/5 p-8 rounded-3xl max-w-2xl text-center shadow-2xl transform transition-all duration-500 hover:scale-105 pointer-events-auto"
          >
            <Cpu className="w-8 h-8 text-indigo-400 mx-auto mb-4 opacity-80" />
            <p className="text-xl md:text-3xl font-light leading-relaxed text-white/90 font-serif italic">
              "{latestResponse}"
            </p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="w-full max-w-xl mx-auto pointer-events-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe a feeling, a dream, or a thought..."
              className="w-full bg-transparent text-white placeholder-gray-500 px-6 py-4 rounded-2xl focus:outline-none text-lg"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className={`p-4 mr-2 rounded-xl transition-all duration-300 ${
                inputText.trim() && !isLoading 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Activity className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </form>
        <p className="text-center text-white/20 text-xs mt-4">
          Powered by Google Gemini 2.5 Flash & React Three Fiber
        </p>
      </div>
    </div>
  );
};

export default Interface;
