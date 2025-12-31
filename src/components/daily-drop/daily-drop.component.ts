import { ChangeDetectionStrategy, Component, inject, OnInit, signal, OnDestroy, AfterViewInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { DailyDropContent } from '../../models/muse.model';
import { VocabularyService } from '../../services/vocabulary.service';
import { TtsService } from '../../services/tts.service';

interface SelectionPopoverData {
  text: string;
  top: number;
  left: number;
  translation?: string;
  phonetic?: string;
  isFetchingDetails?: boolean;
}

@Component({
  selector: 'app-daily-drop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-drop.component.html',
  styleUrls: ['./daily-drop.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyDropComponent implements OnInit, OnDestroy, AfterViewInit {
  private geminiService = inject(GeminiService);
  private vocabularyService = inject(VocabularyService);
  private ttsService = inject(TtsService);
  private renderer = inject(Renderer2);

  @ViewChild('dailyDropContainer') private dailyDropContainer!: ElementRef;
  private unlistenMouseUp: (() => void) | null = null;
  
  isLoading = signal(true);
  dailyContent = signal<DailyDropContent | null>(null);
  error = signal<string | null>(null);
  imageUrl = signal<string | null>(null);
  selectionPopover = signal<SelectionPopoverData | null>(null);

  isInitialized = this.geminiService.isInitialized;

  ngOnInit(): void {
    this.loadDailyDrop();
  }

  ngAfterViewInit(): void {
    this.unlistenMouseUp = this.renderer.listen('document', 'mouseup', this.handleMouseUp.bind(this));
  }

  ngOnDestroy(): void {
    this.unlistenMouseUp?.();
  }

  async loadDailyDrop(): Promise<void> {
    if (!this.isInitialized()) {
        this.error.set("Service not initialized.");
        this.isLoading.set(false);
        return;
    }
    
    this.isLoading.set(true);
    this.error.set(null);
    this.dailyContent.set(null);
    this.imageUrl.set(null);

    try {
      const content = await this.geminiService.getDailyDrop();
      this.dailyContent.set(content);
      
      const cachedImage = this.vocabularyService.getScenarioImage(content.title);
      if (cachedImage) {
        this.imageUrl.set(cachedImage);
      } else {
        this.geminiService.generateImageForDailyDrop(content.title)
          .then(imageBase64 => {
            if (imageBase64) {
              const newImageUrl = `data:image/jpeg;base64,${imageBase64}`;
              this.vocabularyService.cacheScenarioImage(content.title, newImageUrl);
              this.imageUrl.set(newImageUrl);
            }
          });
      }

    } catch (e: any) {
      this.error.set('Could not fetch today\'s drop.');
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  handleMouseUp(event: MouseEvent): void {
    const popoverEl = document.querySelector('.selection-popover');
    if (popoverEl?.contains(event.target as Node)) {
        return; 
    }

    if (!this.dailyDropContainer?.nativeElement.contains(event.target as Node)) {
        this.dismissSelectionPopover();
        return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 1 && text.length < 80) {
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        this.selectionPopover.set({
            text: text,
            top: rect.bottom + 5,
            left: rect.left + rect.width / 2,
            isFetchingDetails: true,
        });

        this.geminiService.getWordDetails(text)
            .then(details => {
                this.selectionPopover.update(current => {
                    if (current && current.text === text) {
                        return { ...current, ...details, isFetchingDetails: false };
                    }
                    return current;
                });
            })
            .catch(e => {
                console.error("Failed to get word details", e);
                this.selectionPopover.update(current => {
                    if (current && current.text === text) {
                        return { ...current, isFetchingDetails: false };
                    }
                    return current;
                });
            });

    } else {
        this.dismissSelectionPopover();
    }
  }

  saveSelection(): void {
      const popover = this.selectionPopover();
      if (popover) {
          this.vocabularyService.addWord(popover.text);
          this.selectionPopover.set(null);
      }
  }

  playSelectedWordAudio(): void {
      const popover = this.selectionPopover();
      if (popover && popover.text) {
          this.ttsService.speak(popover.text);
      }
  }

  dismissSelectionPopover(): void {
      this.selectionPopover.set(null);
  }
}