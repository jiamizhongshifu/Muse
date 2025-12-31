export type Persona = "The 'Old Money'" | "The 'Cool Girl'" | "The 'Boss Lady'" | "The 'Golden Retriever'";

export interface RefinedOutput {
  professional: string;
  direct: string;
  nuanced: string;
}

export interface DailyDropContent {
  type: 'word' | 'culture';
  title: string;
  content: string;
  example: string;
}

export interface SubtextAnalysis {
  tone: string;
  analysis: string;
  suggestion: string;
}

export type Scenario = 'gallery' | 'brunch' | 'shopping' | 'networking' | 'dinner_party' | 'film_debate';

export interface ScenarioDetails {
  id: Scenario | string;
  title: string;
  description: string;
  setting: string;
  imageUrl: string;
}

export interface ConversationMessage {
  author: 'user' | 'ai';
  text: string;
  translation?: string;
  showTranslation?: boolean;
  isTranslating?: boolean;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export interface SuggestedReply {
  text: string;
  translation?: string;
  showTranslation?: boolean;
  isTranslating?: boolean;
}

export interface ConversationResponse {
  text: string;
  imageBase64Promise?: Promise<string | null>;
}

export interface WordDetails {
  definition: string;
  example: string;
  translation: string;
  phonetic: string;
}