export interface WaveConfig {
  speed: number;
  elevation: number;
  frequency: { x: number; y: number };
  color: string;
  roughness: number;
  metalness: number;
}

export interface ThoughtResponse {
  reply: string;
  visualization: WaveConfig;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

// Default initial state for the wave
export const INITIAL_WAVE_CONFIG: WaveConfig = {
  speed: 0.5,
  elevation: 0.6,
  frequency: { x: 2, y: 1.5 },
  color: '#4f46e5', // Indigo-600
  roughness: 0.2,
  metalness: 0.8,
};
