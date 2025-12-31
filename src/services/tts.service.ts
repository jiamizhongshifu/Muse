import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  isSupported = signal(false);
  isSpeaking = signal(false);
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if ('speechSynthesis' in window) {
      this.isSupported.set(true);
      this.utterance = new SpeechSynthesisUtterance();
      this.utterance.onstart = () => this.isSpeaking.set(true);
      this.utterance.onend = () => this.isSpeaking.set(false);
      this.utterance.onerror = () => this.isSpeaking.set(false);
    } else {
      console.warn('Text-to-Speech is not supported in this browser.');
    }
  }

  speak(text: string): void {
    if (!this.isSupported() || !this.utterance) {
      return;
    }

    // If speaking, cancel the current utterance before starting a new one
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // Find a suitable voice
    const voices = window.speechSynthesis.getVoices();
    // Prefer a Google US English voice if available, otherwise default
    let selectedVoice = voices.find(voice => voice.name === 'Google US English');
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
    }

    this.utterance.text = text;
    this.utterance.voice = selectedVoice || null;
    this.utterance.pitch = 1;
    this.utterance.rate = 1;
    
    this.isSpeaking.set(true); // Manually set for immediate UI feedback
    window.speechSynthesis.speak(this.utterance);
  }

  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking.set(false);
    }
  }
}
