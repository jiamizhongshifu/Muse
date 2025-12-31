import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { SubtextAnalysis } from '../../models/muse.model';

@Component({
  selector: 'app-subtext-radar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtext-radar.component.html',
  styleUrls: ['./subtext-radar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubtextRadarComponent {
  private geminiService = inject(GeminiService);

  userInput = signal('');
  isLoading = signal(false);
  analysisResult = signal<SubtextAnalysis | null>(null);
  error = signal<string | null>(null);
  isMockMode = this.geminiService.mockMode;

  async analyze(): Promise<void> {
    if (!this.userInput().trim()) {
      this.error.set('Please enter some text to analyze.');
      return;
    }

    this.isLoading.set(true);
    this.analysisResult.set(null);
    this.error.set(null);

    try {
      const result = await this.geminiService.analyzeSubtext(this.userInput());
      this.analysisResult.set(result);
    } catch (e: any) {
      this.error.set(e.message || 'An unexpected error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
