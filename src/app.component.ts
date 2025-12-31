import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ThoughtEqualizerComponent } from './components/thought-equalizer/thought-equalizer.component';
import { DailyDropComponent } from './components/daily-drop/daily-drop.component';
import { SubtextRadarComponent } from './components/subtext-radar/subtext-radar.component';
import { MicroScenariosComponent } from './components/micro-scenarios/micro-scenarios.component';
import { VocabularyVaultComponent } from './components/vocabulary-vault/vocabulary-vault.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ThoughtEqualizerComponent,
    DailyDropComponent,
    SubtextRadarComponent,
    MicroScenariosComponent,
    VocabularyVaultComponent
  ],
})
export class AppComponent {
  activeScenario = signal<'refine' | 'analyze' | 'daily_drop' | 'practice' | 'vocabulary' | null>(null);

  selectScenario(scenario: 'refine' | 'analyze' | 'daily_drop' | 'practice' | 'vocabulary' | null): void {
    this.activeScenario.set(scenario);
  }
}
