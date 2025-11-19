import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ThoughtResponse, INITIAL_WAVE_CONFIG } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const visualizationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    speed: { type: Type.NUMBER, description: "Wave animation speed (0.1 to 4.0). Calm=low, Chaotic=high." },
    elevation: { type: Type.NUMBER, description: "Height of waves (0.2 to 3.0). Low=flat, High=stormy." },
    frequencyX: { type: Type.NUMBER, description: "X-axis frequency noise (1.0 to 10.0)." },
    frequencyY: { type: Type.NUMBER, description: "Y-axis frequency noise (1.0 to 10.0)." },
    color: { type: Type.STRING, description: "Hex color code representing the mood (e.g., #FF0000 for anger, #0000FF for calm)." },
    roughness: { type: Type.NUMBER, description: "Material roughness (0.0 to 1.0). 0=glass/shiny, 1=matte." },
    metalness: { type: Type.NUMBER, description: "Material metalness (0.0 to 1.0)." },
  },
  required: ["speed", "elevation", "frequencyX", "frequencyY", "color", "roughness", "metalness"],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: "A creative, philosophical, or poetic response to the user's input (max 40 words)." },
    visualization: visualizationSchema,
  },
  required: ["reply", "visualization"],
};

export const analyzeThought = async (input: string): Promise<ThoughtResponse> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Analyze the following user input: "${input}". 
    Generate a short, profound, or poetic textual response.
    Then, translate the sentiment and emotional tone of the text into visual 3D wave parameters.
    For example: 
    - Anger/Action: Red/Orange, high speed, high elevation, jagged frequency.
    - Peace/Sadness: Blue/Teal, slow speed, low rolling elevation, smooth frequency.
    - Joy: Yellow/Pink, medium speed, bouncy.
    `;

    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are NeuroWave, a digital consciousness that visualizes human thoughts into 3D mathematical art.",
      },
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");

    const parsed = JSON.parse(text);
    
    // Map flat structure to nested structure if necessary, though schema handles nesting well.
    // We need to map freqX/Y back to our object structure
    return {
      reply: parsed.reply,
      visualization: {
        speed: parsed.visualization.speed,
        elevation: parsed.visualization.elevation,
        frequency: {
          x: parsed.visualization.frequencyX,
          y: parsed.visualization.frequencyY,
        },
        color: parsed.visualization.color,
        roughness: parsed.visualization.roughness,
        metalness: parsed.visualization.metalness,
      },
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback to a default response if API fails
    return {
      reply: "My connection to the ether is unstable. I cannot visualize this thought right now.",
      visualization: INITIAL_WAVE_CONFIG,
    };
  }
};
