import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VocabularyService } from '../../services/vocabulary.service';
import { GeminiService } from '../../services/gemini.service';
import { WordDetails } from '../../models/muse.model';
import { TtsService } from '../../services/tts.service';

interface SelectedWord extends WordDetails {
  word: string;
}

@Component({
  selector: 'app-vocabulary-vault',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vocabulary-vault.component.html',
  styleUrls: ['./vocabulary-vault.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VocabularyVaultComponent {
  vocabularyService = inject(VocabularyService);
  geminiService = inject(GeminiService);
  ttsService = inject(TtsService);

  savedWords = this.vocabularyService.vocabulary;
  isSpeaking = this.ttsService.isSpeaking;
  
  selectedWord = signal<SelectedWord | null>(null);
  isLoadingDefinition = signal(false);
  error = signal<string | null>(null);

  async showDefinition(word: string): Promise<void> {
    if (this.selectedWord()?.word === word && !this.isLoadingDefinition()) {
      this.selectedWord.set(null); // Toggle off if the same word is clicked
      return;
    }

    this.isLoadingDefinition.set(true);
    this.selectedWord.set(null);
    this.error.set(null);

    try {
      const result = await this.geminiService.getWordDetails(word);
      this.selectedWord.set({ word, ...result });
    } catch (e) {
      this.error.set(`Could not get details for "${word}".`);
      console.error(e);
    } finally {
      this.isLoadingDefinition.set(false);
    }
  }

  playWordAudio(word: string): void {
      this.ttsService.speak(word);
  }

  removeWord(word: string): void {
    if (this.selectedWord()?.word === word) {
        this.selectedWord.set(null);
    }
    this.vocabularyService.removeWord(word);
  }
}