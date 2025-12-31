import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { Persona, RefinedOutput } from '../../models/muse.model';

@Component({
  selector: 'app-thought-equalizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thought-equalizer.component.html',
  styleUrls: ['./thought-equalizer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThoughtEqualizerComponent {
  private geminiService = inject(GeminiService);

  userInput = signal('I think this plan is not good.');
  selectedPersona = signal<Persona | 'Custom'>("The 'Old Money'");
  customPersonaInput = signal('');
  isLoading = signal(false);
  refinedOutput = signal<RefinedOutput | null>(null);
  error = signal<string | null>(null);
  copied = signal<string | null>(null);
  isMockMode = this.geminiService.mockMode;

  readonly personas: (Persona | 'Custom')[] = [
    "The 'Old Money'",
    "The 'Cool Girl'",
    "The 'Boss Lady'",
    "The 'Golden Retriever'",
    "Custom"
  ];

  readonly personaDescriptions: Record<Persona, string> = {
    "The 'Old Money'": "克制、用词考究、甚至带点英式冷幽默。Subtle, sophisticated, and uses understated language.",
    "The 'Cool Girl'": "松弛、极简、大量使用 vibey 的短句。Effortless, minimalist, with a touch of witty slang.",
    "The 'Boss Lady'": "果断、拒绝废话、强逻辑。Direct, confident, and focused on clear, powerful communication.",
    "The 'Golden Retriever'": "热情、高能量、充满积极情绪。Enthusiastic, warm, and brimming with positive energy."
  };

  async refineText(): Promise<void> {
    this.error.set(null);
    if (!this.userInput().trim()) {
      this.error.set('Please enter some text to refine.');
      return;
    }

    if (this.selectedPersona() === 'Custom' && !this.customPersonaInput().trim()) {
      this.error.set('Please describe your custom persona.');
      return;
    }

    this.isLoading.set(true);
    this.refinedOutput.set(null);

    try {
      const result = await this.geminiService.refineText(
        this.userInput(),
        this.selectedPersona(),
        this.customPersonaInput()
      );
      this.refinedOutput.set(result);
    } catch (e: any) {
      this.error.set(e.message || 'An unexpected error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }

  copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    this.copied.set(type);
    setTimeout(() => this.copied.set(null), 2000);
  }
}