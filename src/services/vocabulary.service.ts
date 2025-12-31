import { Injectable, signal, effect } from '@angular/core';

const VOCABULARY_STORAGE_KEY = 'muse_vocabulary_vault';
const SCENARIO_IMAGES_STORAGE_KEY = 'muse_scenario_images';

@Injectable({
  providedIn: 'root',
})
export class VocabularyService {
  vocabulary = signal<string[]>([]);
  scenarioImages = signal<{ [id: string]: string }>({});

  constructor() {
    this.loadFromStorage();
    this.loadScenarioImagesFromStorage();

    // Persist changes to localStorage whenever the signals change
    effect(() => {
      this.saveToStorage(this.vocabulary());
      this.saveScenarioImagesToStorage(this.scenarioImages());
    });
  }

  private loadFromStorage(): void {
    try {
      const savedVocabulary = localStorage.getItem(VOCABULARY_STORAGE_KEY);
      if (savedVocabulary) {
        const parsed = JSON.parse(savedVocabulary);
        if (Array.isArray(parsed)) {
          this.vocabulary.set(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load vocabulary from storage', e);
    }
  }

  private saveToStorage(words: string[]): void {
    try {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(words));
    } catch (e) {
      console.error('Failed to save vocabulary to storage', e);
    }
  }

  addWord(word: string): void {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    this.vocabulary.update(currentWords => {
      // Avoid duplicates, case-insensitive check
      if (currentWords.some(w => w.toLowerCase() === trimmedWord.toLowerCase())) {
        return currentWords;
      }
      return [...currentWords, trimmedWord].sort(); // Keep it sorted
    });
  }

  removeWord(wordToRemove: string): void {
    this.vocabulary.update(currentWords =>
      currentWords.filter(w => w.toLowerCase() !== wordToRemove.toLowerCase())
    );
  }
  
  private loadScenarioImagesFromStorage(): void {
    try {
      const savedImages = localStorage.getItem(SCENARIO_IMAGES_STORAGE_KEY);
      if (savedImages) {
        const parsed = JSON.parse(savedImages);
        if (typeof parsed === 'object' && parsed !== null) {
          this.scenarioImages.set(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load scenario images from storage', e);
    }
  }

  private saveScenarioImagesToStorage(images: { [id: string]: string }): void {
    try {
      localStorage.setItem(SCENARIO_IMAGES_STORAGE_KEY, JSON.stringify(images));
    } catch (e) {
      console.error('Failed to save scenario images to storage', e);
    }
  }

  getScenarioImage(id: string): string | undefined {
    return this.scenarioImages()[id];
  }

  cacheScenarioImage(id: string, imageDataUrl: string): void {
    this.scenarioImages.update(currentImages => ({
      ...currentImages,
      [id]: imageDataUrl,
    }));
  }
}