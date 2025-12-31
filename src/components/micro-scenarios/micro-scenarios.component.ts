import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy, AfterViewInit, ViewChild, ElementRef, effect, Renderer2, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { TtsService } from '../../services/tts.service';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { VocabularyService } from '../../services/vocabulary.service';
import { ConversationMessage, ScenarioDetails, SuggestedReply, ConversationResponse } from '../../models/muse.model';

interface SelectionPopoverData {
  text: string;
  top: number;
  left: number;
  translation?: string;
  phonetic?: string;
  isFetchingDetails?: boolean;
}

@Component({
  selector: 'app-micro-scenarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './micro-scenarios.component.html',
  styleUrls: ['./micro-scenarios.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicroScenariosComponent implements OnDestroy, AfterViewInit, OnInit {
  private geminiService = inject(GeminiService);
  private vocabularyService = inject(VocabularyService);
  private renderer = inject(Renderer2);
  ttsService = inject(TtsService);
  speechService = inject(SpeechRecognitionService);

  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('suggestionContainer') private suggestionContainer!: ElementRef;
  private unlistenMouseUp: (() => void) | null = null;

  scenarios = signal<ScenarioDetails[]>([
    { id: 'gallery', title: 'At the Gallery', description: '评论抽象艺术', setting: 'You are at a modern art gallery, discussing an abstract painting with an acquaintance.', imageUrl: '' },
    { id: 'brunch', title: 'Brunch Date', description: '聊星座与 MBTI', setting: 'You are on a brunch date, making small talk about lighthearted topics like astrology and personality types.', imageUrl: '' },
    { id: 'shopping', title: 'Shopping', description: '在买手店询问面料材质', setting: 'You are in a high-end boutique, asking a sales associate about the materials and craftsmanship of a garment.', imageUrl: '' },
    { id: 'networking', title: 'Tech Mixer', description: '在科技派对上社交', setting: 'You are at a tech industry networking event, trying to make a good impression on a potential contact.', imageUrl: '' },
    { id: 'dinner_party', title: 'Dinner Party', description: '与朋友的朋友闲聊', setting: 'You are at a small dinner party, seated next to someone you\'ve just met. Make polite small talk.', imageUrl: '' },
    { id: 'film_debate', title: 'Film Debate', description: '讨论一部争议电影', setting: 'You are having a friendly debate with a friend about a film you just watched that you have differing opinions on.', imageUrl: '' }
  ]);

  activeScenario = signal<ScenarioDetails | null>(null);
  conversation = signal<ConversationMessage[]>([]);
  isLoading = signal(false);
  userInput = signal('');
  customScenarioInput = signal('');
  hint = signal<string | null>(null);
  error = signal<string | null>(null);
  suggestedReply = signal<SuggestedReply | null>(null);
  isSuggestingReply = signal(false);
  selectionPopover = signal<SelectionPopoverData | null>(null);
  
  isSpeaking = this.ttsService.isSpeaking;

  constructor() {
    effect(() => {
      const newTranscript = this.speechService.transcript();
      if (newTranscript) {
        this.userInput.update(currentValue => (currentValue ? currentValue + ' ' : '') + newTranscript);
      }
    });

     effect(() => {
      const speechError = this.speechService.error();
      if(speechError) {
        this.hint.set(speechError);
        setTimeout(() => this.hint.set(null), 4000);
      }
    });
  }

  ngOnInit(): void {
    this.loadScenarioImages();
  }

  ngAfterViewInit(): void {
    this.unlistenMouseUp = this.renderer.listen('document', 'mouseup', this.handleMouseUp.bind(this));
  }

  ngOnDestroy(): void {
    this.ttsService.cancel();
    this.speechService.stop();
    this.unlistenMouseUp?.();
  }

  private loadScenarioImages(): void {
    const initialScenarios = this.scenarios();
    initialScenarios.forEach((scenario, index) => {
        const cachedImage = this.vocabularyService.getScenarioImage(scenario.id);
        if (cachedImage) {
            this.scenarios.update(currentScenarios => {
                const newScenarios = [...currentScenarios];
                newScenarios[index].imageUrl = cachedImage;
                return newScenarios;
            });
        } else {
            this.geminiService.generateImageForScenario(scenario.setting)
                .then(imageBase64 => {
                    if (imageBase64) {
                        const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
                        this.vocabularyService.cacheScenarioImage(scenario.id, imageUrl);
                        this.scenarios.update(currentScenarios => {
                            const newScenarios = [...currentScenarios];
                            newScenarios[index].imageUrl = imageUrl;
                            return newScenarios;
                        });
                    } else {
                      this.setFallbackImage(index);
                    }
                })
                .catch(err => {
                  console.error(`Failed to load image for ${scenario.title}`, err)
                  this.setFallbackImage(index);
                });
        }
    });
  }

  private setFallbackImage(index: number): void {
    this.scenarios.update(currentScenarios => {
        const newScenarios = [...currentScenarios];
        // Use a placeholder to indicate failure, but still show something.
        newScenarios[index].imageUrl = `https://picsum.photos/seed/${newScenarios[index].id}/400/300`;
        return newScenarios;
    });
  }

  selectScenario(scenario: ScenarioDetails): void {
    this.isLoading.set(true);
    this.activeScenario.set(scenario);
    this.conversation.set([]);
    this.error.set(null);
    this.hint.set(null);

    this.geminiService.startMicroScenario(scenario.setting)
      .then(response => {
        this.addMessage('ai', response);
        this.ttsService.speak(response.text);
      })
      .catch(e => {
        this.error.set('Failed to start scenario. Please try again.');
        console.error(e);
      })
      .finally(() => this.isLoading.set(false));
  }

  startCustomScenario(): void {
    const customSetting = this.customScenarioInput().trim();
    if (!customSetting) {
      this.error.set('Please describe your custom scenario.');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    const customScenarioDetails: ScenarioDetails = {
      id: 'custom',
      title: 'Custom Scenario',
      description: customSetting.length > 50 ? customSetting.substring(0, 50) + '...' : customSetting,
      setting: `You are in a scenario described by the user: "${customSetting}"`,
      imageUrl: 'https://picsum.photos/seed/custom/400/300'
    };
    
    this.selectScenario(customScenarioDetails);
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput().trim();
    if (!text || this.isLoading()) return;

    this.addMessage('user', { text });
    this.userInput.set('');
    this.isLoading.set(true);
    this.hint.set(null);
    this.suggestedReply.set(null);
    this.speechService.stop();

    try {
      const response = await this.geminiService.continueMicroScenario(text);
      this.addMessage('ai', response);
      this.ttsService.speak(response.text);
    } catch (e) {
      this.addMessage('ai', { text: 'Sorry, I encountered an error. Please try again.'});
      console.error(e);
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  async getHint(): Promise<void> {
    this.hint.set('Getting hint...');
    this.suggestedReply.set(null);
    const context = this.conversation()
      .map(m => `${m.author}: ${m.text}`)
      .join('\n');
      
    try {
      const hintText = await this.geminiService.getFillerWord(context);
      this.hint.set(`Try saying: "${hintText}"`);
    } catch(e) {
      this.hint.set('Could not get a hint.');
    }
  }

  async getSuggestion(): Promise<void> {
    this.isSuggestingReply.set(true);
    this.suggestedReply.set(null);
    this.hint.set(null);

    const context = this.conversation()
      .map(m => `${m.author}: ${m.text}`)
      .join('\n');
      
    try {
      const suggestion = await this.geminiService.getSuggestedReply(context);
      this.suggestedReply.set({ text: suggestion });
    } catch(e) {
      this.hint.set('Could not get a suggestion.');
      console.error(e);
    } finally {
        this.isSuggestingReply.set(false);
    }
  }

  useSuggestion(): void {
    if (this.suggestedReply()) {
        this.userInput.set(this.suggestedReply()!.text);
        this.suggestedReply.set(null);
    }
  }

  dismissSuggestion(): void {
      this.suggestedReply.set(null);
  }
  
  private async addMessage(author: 'user' | 'ai', content: { text: string; imageBase64Promise?: Promise<string | null> }): Promise<void> {
    const message: ConversationMessage = { 
      author, 
      text: content.text,
      isGeneratingImage: author === 'ai' && !!content.imageBase64Promise,
    };
    
    this.conversation.update(current => [...current, message]);
    const messageIndex = this.conversation().length - 1;
    this.scrollToBottom();

    if (author === 'ai' && content.imageBase64Promise) {
      try {
        const imageBase64 = await content.imageBase64Promise;
        this.conversation.update(current => {
          const newConversation = [...current];
          if (newConversation[messageIndex]) {
            newConversation[messageIndex] = {
              ...newConversation[messageIndex],
              imageUrl: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
              isGeneratingImage: false,
            };
          }
          return newConversation;
        });
      } catch (e) {
        console.error("Failed to generate image for message", e);
        this.conversation.update(current => {
          const newConversation = [...current];
          if (newConversation[messageIndex]) {
            newConversation[messageIndex].isGeneratingImage = false;
          }
          return newConversation;
        });
      }
    }
  }

  async toggleTranslation(index: number): Promise<void> {
    const message = this.conversation()[index];
    if (!message || message.author !== 'ai') return;

    if (message.translation) {
      this.conversation.update(current => {
        const newConversation = [...current];
        newConversation[index] = { ...message, showTranslation: !message.showTranslation };
        return newConversation;
      });
      return;
    }

    this.conversation.update(current => {
      const newConversation = [...current];
      newConversation[index] = { ...message, isTranslating: true };
      return newConversation;
    });

    try {
      const translation = await this.geminiService.translateToChinese(message.text);
      this.conversation.update(current => {
        const newConversation = [...current];
        newConversation[index] = { ...message, isTranslating: false, translation, showTranslation: true };
        return newConversation;
      });
    } catch (e) {
      console.error('Translation failed:', e);
      this.conversation.update(current => {
        const newConversation = [...current];
        newConversation[index] = { ...message, isTranslating: false, translation: '翻译失败', showTranslation: true };
        return newConversation;
      });
    }
  }

  async toggleSuggestionTranslation(): Promise<void> {
    const suggestion = this.suggestedReply();
    if (!suggestion) return;

    if (suggestion.translation) {
      this.suggestedReply.update(s => s ? { ...s, showTranslation: !s.showTranslation } : null);
      return;
    }

    this.suggestedReply.update(s => s ? { ...s, isTranslating: true } : null);

    try {
      const translation = await this.geminiService.translateToChinese(suggestion.text);
      this.suggestedReply.update(s => s ? { ...s, isTranslating: false, translation, showTranslation: true } : null);
    } catch (e) {
      console.error('Translation failed:', e);
      this.suggestedReply.update(s => s ? { ...s, isTranslating: false, translation: '翻译失败', showTranslation: true } : null);
    }
  }

  goBackToSelection(): void {
    this.activeScenario.set(null);
    this.conversation.set([]);
    this.ttsService.cancel();
    this.speechService.stop();
  }

  toggleListening(): void {
    if (!this.speechService.isSupported()) {
      this.hint.set('Voice input is not supported in your browser.');
      return;
    }
    if (this.speechService.isListening()) {
      this.speechService.stop();
    } else {
      this.speechService.start();
    }
  }

  handleMouseUp(event: MouseEvent): void {
    const popoverEl = document.querySelector('.selection-popover');
    if (popoverEl?.contains(event.target as Node)) {
        return; 
    }

    const isChatContainer = this.chatContainer?.nativeElement.contains(event.target as Node);
    const isSuggestionContainer = this.suggestionContainer?.nativeElement.contains(event.target as Node);

    if (!isChatContainer && !isSuggestionContainer) {
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
                        return {
                            ...current,
                            ...details,
                            isFetchingDetails: false,
                        };
                    }
                    return current;
                });
            })
            .catch(e => {
                console.error("Failed to get word details", e);
                // Handle error in popover, maybe show a message
                this.selectionPopover.update(current => {
                    if (current && current.text === text) {
                        return { ...current, isFetchingDetails: false }; // Stop loading
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

  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.chatContainer) {
          this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        }
      }, 0);
    } catch (err) { 
      console.error("Could not scroll to bottom:", err);
    }
  }
}