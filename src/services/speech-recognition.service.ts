import { Injectable, signal } from '@angular/core';

// This API is still prefixed in many browsers
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

@Injectable({
  providedIn: 'root',
})
export class SpeechRecognitionService {
  isSupported = signal(!!SpeechRecognition);
  isListening = signal(false);
  // This signal emits the final transcript once the user stops talking
  transcript = signal('');
  error = signal<string | null>(null);

  private recognition: any; // Using `any` as SpeechRecognition types can be inconsistent

  constructor() {
    if (this.isSupported()) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Captures a single utterance
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false; // We only want the final result

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.transcript.set('');
        this.error.set(null);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };

      this.recognition.onerror = (event: any) => {
        let errorMessage = 'An unknown speech recognition error occurred.';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech was detected. Please try again.';
        } else if (event.error === 'audio-capture') {
          errorMessage = 'Audio capture failed. Please check your microphone.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access was denied. Please allow permission to use this feature.';
        }
        this.error.set(errorMessage);
        console.error('Speech recognition error:', event.error);
        this.isListening.set(false);
      };

      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        this.transcript.set(text.trim());
        this.stop(); // Automatically stop after getting a result
      };
    } else {
        console.warn('Speech recognition is not supported in this browser.');
    }
  }

  start(): void {
    if (this.isSupported() && !this.isListening()) {
      this.recognition.start();
    }
  }

  stop(): void {
    if (this.isSupported() && this.isListening()) {
      this.recognition.stop();
    }
  }
}
