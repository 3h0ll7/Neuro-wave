import React, { useState, useCallback } from 'react';
import WaveScene from './components/WaveScene';
import Interface from './components/Interface';
import { analyzeThought } from './services/geminiService';
import { WaveConfig, INITIAL_WAVE_CONFIG } from './types';

const App: React.FC = () => {
  const [waveConfig, setWaveConfig] = useState<WaveConfig>(INITIAL_WAVE_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [latestResponse, setLatestResponse] = useState<string | null>(null);

  const handleThoughtSubmit = useCallback(async (input: string) => {
    setIsLoading(true);
    try {
      // Reset response briefly for visual effect
      setLatestResponse(null);
      
      const response = await analyzeThought(input);
      
      setWaveConfig(response.visualization);
      setLatestResponse(response.reply);
    } catch (error) {
      console.error("Error processing thought:", error);
      setLatestResponse("I encountered static in the connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0">
        <WaveScene config={waveConfig} />
      </div>

      {/* UI Foreground Layer */}
      <Interface 
        onSubmit={handleThoughtSubmit} 
        isLoading={isLoading}
        latestResponse={latestResponse}
      />
    </div>
  );
};

export default App;
