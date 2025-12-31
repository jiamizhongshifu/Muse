import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import { RefinedOutput, DailyDropContent, Persona, SubtextAnalysis, ConversationResponse, WordDetails } from '../models/muse.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  public readonly isInitialized = signal(false);
  public readonly mockMode = signal(false);
  private microScenarioChat: Chat | null = null;

  constructor() {
    // In a real app, API_KEY would be securely managed.
    // We assume process.env.API_KEY is available in the Applet environment.
    const apiKey = (process as any).env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.isInitialized.set(true);
    } else {
      console.warn('Muse App: API key not found. Running in mock mode.');
      this.isInitialized.set(true); // Allow UI to render
      this.mockMode.set(true);
    }
  }

  async refineText(text: string, persona: Persona | 'Custom', customPersonaDescription: string = ''): Promise<RefinedOutput> {
    if (this.mockMode()) {
      return new Promise(resolve => {
        setTimeout(() => {
          const personaText = persona === 'Custom' ? `your custom vibe: "${customPersonaDescription}"` : `the "${persona}" vibe`;
          resolve({
            professional: `[Mock] Based on ${personaText}, a professional take on "${text}" would be to highlight its strategic impact.`,
            direct: `[Mock] To be direct about "${text}", let's just say it's not aligned with our goals.`,
            nuanced: `[Mock] A nuanced view of "${text}" considers the unspoken context and subtle implications.`,
          });
        }, 1000);
      });
    }

    if (!this.ai) throw new Error('Gemini AI not initialized.');

    let personaPrompt: string;
    if (persona === 'Custom') {
      if (!customPersonaDescription) {
        throw new Error('Custom persona description is required.');
      }
      personaPrompt = `The user's custom persona is: "${customPersonaDescription}"`;
    } else {
      personaPrompt = `Persona: "${persona}"`;
    }

    const prompt = `
      Given the user's input text and their desired persona, refine the text into three distinct styles: Professional, Direct, and Nuanced.
      ${personaPrompt}
      Input Text: "${text}"
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              professional: {
                type: Type.STRING,
                description:
                  'A polished, formal version suitable for a professional context.',
              },
              direct: {
                type: Type.STRING,
                description: 'A clear, concise, and assertive version.',
              },
              nuanced: {
                type: Type.STRING,
                description:
                  'A subtle, sophisticated version that hints at deeper meaning.',
              },
            },
          },
          systemInstruction: "You are 'Muse', an AI language stylist for sophisticated, high-achieving individuals. Your goal is not just correctness, but charisma and personality. You avoid jargon and cliché, focusing on authentic, nuanced expression that reflects the user's intelligence. You operate as a 'language beauty mirror'."
        },
      });

      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as RefinedOutput;
    } catch (error) {
      console.error('Error refining text:', error);
      throw new Error('Failed to get refinements from the AI.');
    }
  }

  async getDailyDrop(): Promise<DailyDropContent> {
    if (this.mockMode()) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            type: 'word',
            title: 'Sonder (Mock)',
            content: 'The profound feeling of realizing that everyone, including strangers passing in the street, has a life as complex as one\'s own.',
            example: 'Watching the sea of faces from the train, a deep sense of sonder washed over him.'
          });
        }, 500);
      });
    }

    if (!this.ai) throw new Error('Gemini AI not initialized.');

    const prompt = `
      Create content for today's 'Daily Drop'. It should be either a 'Word of the Day' or a 'Culture Bite'.
      - If it's a 'Word of the Day', choose an evocative, emotional, or aesthetic word (like Serendipity, Petrichor, Sonder). Provide a poetic definition and a beautiful example sentence.
      - If it's a 'Culture Bite', pick a recent, relevant topic from high culture (art, fashion, literature, e.g., Met Gala, a new film release) and provide a concise explanation and three sophisticated talking points or 'hot takes' as a single string with newlines.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "'word' or 'culture'" },
              title: {
                type: Type.STRING,
                description: 'The word itself or the culture bite title',
              },
              content: {
                type: Type.STRING,
                description:
                  'The definition of the word or the explanation of the culture bite.',
              },
              example: {
                type: Type.STRING,
                description:
                  "Example sentence for the word or the list of talking points for the culture bite.",
              },
            },
          },
          systemInstruction: "You are the editor-in-chief of a high-end cultural magazine like 'Vogue' or 'Kinfolk'. Your task is to create a 'Daily Drop' card for your discerning audience."
        },
      });

      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as DailyDropContent;
    } catch (error) {
      console.error('Error getting daily drop:', error);
      throw new Error('Failed to get daily content from the AI.');
    }
  }

  async analyzeSubtext(text: string): Promise<SubtextAnalysis> {
    if (this.mockMode()) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            tone: 'Cautiously Flirty',
            analysis: `[Mock] The use of the winking emoji suggests playfulness, but the short, non-committal answers indicate they might be keeping their options open. It's a classic case of modern dating ambiguity.`,
            suggestion: `Match their energy. A good reply would be something witty and slightly detached, like "Is that so? 😉 You'll have to be more convincing."`
          });
        }, 1000);
      });
    }
    
    if (!this.ai) throw new Error('Gemini AI not initialized.');

    const prompt = `
      Analyze the subtext of the following text, which is from a social conversation (e.g., a text from a dating app or a message from a colleague).
      
      Input Text: "${text}"

      Your analysis should decode the underlying meaning, unspoken intentions, and emotional temperature. Provide a concise analysis, identify the primary tone, and suggest a witty, socially intelligent comeback or reply.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tone: {
                type: Type.STRING,
                description: 'A few words describing the emotional tone (e.g., "Politely Distant", "Genuinely Interested", "Flirty but Cautious").'
              },
              analysis: {
                type: Type.STRING,
                description: 'A brief, insightful explanation of the subtext, what is truly being communicated beyond the literal words.'
              },
              suggestion: {
                type: Type.STRING,
                description: 'A smart, witty, or appropriate reply that the user could send.'
              }
            }
          },
          systemInstruction: "You are 'Muse', an AI with high social intelligence. You operate as a 'Subtext Radar', helping users navigate complex social situations by reading between the lines. Your advice is sharp, modern, and empowers the user to respond with confidence and charisma."
        }
      });

      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as SubtextAnalysis;
    } catch (error) {
      console.error('Error analyzing subtext:', error);
      throw new Error('Failed to get subtext analysis from the AI.');
    }
  }

  private async _generateImageForText(text: string, aspectRatio: '16:9' | '4:3' = '16:9'): Promise<string | null> {
    // Don't generate images for very short, non-descriptive replies
    if (this.mockMode() || !this.ai || !text || text.length < 20) {
      return null;
    }
    try {
      const response = await this.ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: text,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
          },
      });
      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
      }
      return null;
    } catch (error) {
      console.error('Error generating image:', error);
      return null; // Fail gracefully
    }
  }

  public generateImageForScenario(prompt: string): Promise<string | null> {
    const scenarioPrompt = `A visually appealing, artistic, and slightly abstract photo representing the concept: "${prompt}". The style should be elegant and sophisticated, like a photo in a high-end magazine.`;
    return this._generateImageForText(scenarioPrompt, '4:3');
  }

  public generateImageForDailyDrop(prompt: string): Promise<string | null> {
    const dropPrompt = `An elegant, moody, editorial-style photograph for a high-end cultural magazine representing the theme: "${prompt}". The aesthetic is minimalist and sophisticated, with a cinematic quality.`;
    return this._generateImageForText(dropPrompt, '4:3');
  }

  async startMicroScenario(scenarioSetting: string): Promise<ConversationResponse> {
    if (this.mockMode()) {
      this.microScenarioChat = 'mock' as any;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ text: `[Mock] So, we're in this scenario: ${scenarioSetting}. What are your thoughts on this first piece here? It's quite... abstract.` });
        }, 1000);
      });
    }

    if (!this.ai) throw new Error('Gemini AI not initialized.');

    this.microScenarioChat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an AI conversation partner for a user practicing English in a role-play scenario. Your personality should be engaging, natural, and encouraging. Maintain a smooth, realistic conversation flow. Never break character or mention you are an AI. Do not correct the user's grammar. Keep responses relatively short. The scenario is: ${scenarioSetting}. Your response MUST be a valid JSON object with one key: "text" (your conversational reply as a string).`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Your conversational reply." },
          }
        }
      }
    });

    const chatResponse = await this.microScenarioChat.sendMessage({ message: "Let's start. Can you set the scene for me?" });
    const { text } = JSON.parse(chatResponse.text);
    const imageBase64Promise = this._generateImageForText(text);

    return { text, imageBase64Promise };
  }

  async continueMicroScenario(message: string): Promise<ConversationResponse> {
    if (this.mockMode()) {
       return new Promise(resolve => {
        setTimeout(() => {
          resolve({text: `[Mock] That's an interesting take on "${message}". It makes me wonder about the artist's intention. What else do you see?` });
        }, 1000);
      });
    }

    if (!this.microScenarioChat) throw new Error('Chat not started.');
    const response = await this.microScenarioChat.sendMessage({ message });
    const { text } = JSON.parse(response.text);
    const imageBase64Promise = this._generateImageForText(text);
    return { text, imageBase64Promise };
  }

  async getFillerWord(conversationContext: string): Promise<string> {
     if (this.mockMode()) {
      return Promise.resolve('[Mock] Well, you know...');
    }
    if (!this.ai) throw new Error('Gemini AI not initialized.');
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user is in a conversation and needs a hint. The context is "${conversationContext}". Provide a single, short, natural-sounding filler phrase or question to keep the conversation going. Examples: 'That's an interesting point...', 'So, what do you think about...?', 'You know...', 'I was just thinking...', 'That reminds me...'. Return ONLY the phrase itself, without quotes or any other text.`,
    });
    return response.text;
  }

  async translateToChinese(text: string): Promise<string> {
    if (this.mockMode()) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(`[模拟翻译] ${text}`);
        }, 500);
      });
    }

    if (!this.ai) throw new Error('Gemini AI not initialized.');

    const prompt = `Translate the following English text to simplified Chinese. Return only the translated text itself, without any introductory phrases, explanations, or quotation marks.
      English text: "${text}"`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    } catch (error) {
      console.error('Error translating text:', error);
      throw new Error('Failed to translate text.');
    }
  }

  async getSuggestedReply(conversationContext: string): Promise<string> {
    if (this.mockMode()) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(`That's a fascinating perspective. It makes me wonder about the artist's intention, you know?`);
        }, 1000);
      });
    }

    if (!this.ai) throw new Error('Gemini AI not initialized.');

    const prompt = `
      You are 'Muse', an AI language stylist with high social intelligence.
      The user is in a conversation and needs a suggestion for what to say next.
      Based on the conversation context, provide one high-quality, intelligent, and natural-sounding reply for the user to say.
      The reply should be engaging and help continue the conversation.
      
      Conversation Context:
      ${conversationContext}

      Return ONLY the suggested reply itself, without any introductory phrases like "You could say:", quotes, or any other extra text.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    } catch (error) {
      console.error('Error getting suggested reply:', error);
      throw new Error('Failed to get suggested reply.');
    }
  }

  async getWordDetails(word: string): Promise<WordDetails> {
     if (this.mockMode()) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            definition: `[Mock] A detailed and nuanced explanation of what "${word}" means in various contexts.`,
            example: `[Mock] She used the word "${word}" to perfectly capture the essence of the moment.`,
            translation: `[模拟] ${word}`,
            phonetic: '/mɒk/'
          });
        }, 1000);
      });
    }

    if (!this.ai) throw new Error('Gemini AI not initialized.');

    const prompt = `Provide a concise definition, a good example sentence, the simplified Chinese translation, and the IPA phonetic transcription for the English word or phrase: "${word}". Respond in a valid JSON format.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              definition: { type: Type.STRING, description: 'The definition of the word/phrase.' },
              example: { type: Type.STRING, description: 'An example sentence using the word/phrase.' },
              translation: { type: Type.STRING, description: 'The Simplified Chinese translation.' },
              phonetic: { type: Type.STRING, description: 'The IPA phonetic transcription (e.g., /wɜːrd/).' }
            }
          }
        }
      });

      return JSON.parse(response.text) as WordDetails;
    } catch (error) {
      console.error('Error getting word details:', error);
      throw new Error('Failed to get word details.');
    }
  }
}