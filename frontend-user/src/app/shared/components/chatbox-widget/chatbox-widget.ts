import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import {
  ChatHistoryItem,
  ChatboxService,
} from '../../../services/chatbox.service';
import { AuthService, User } from '../../../services/auth.service';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: Date;
  isNew?: boolean;
}

const CHATBOX_WELCOME_MESSAGE =
  'Xin chào! Mình là trợ lý AI của shop. Bạn có thể hỏi linh tinh hoặc hỏi về sản phẩm như giá cao nhất, đánh giá cao nhất, sản phẩm bán chạy...';

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  [index: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

@Component({
  selector: 'app-chatbox-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbox-widget.html',
  styleUrl: './chatbox-widget.css',
})
export class ChatboxWidgetComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer')
  private messagesContainer?: ElementRef<HTMLDivElement>;

  isOpen = false;
  isLoading = false;
  isListening = false;
  hasMicrophoneSupport = false;
  inputText = '';
  errorMessage = '';
  messages: ChatMessage[] = [];
  userAvatarUrl = '';

  private shouldScrollToBottom = false;
  private recognition: SpeechRecognitionLike | null = null;
  private speechBaseText = '';
  private speechAutoSendArmed = false;
  private hasShownWelcomeMessage = false;
  private authSubscription?: Subscription;
  private currentUser: User | null = null;
  private loadingHistory = false;
  private historyLoadedForUserId: string | null = null;

  constructor(
    private chatboxService: ChatboxService,
    private authService: AuthService,
    private hostRef: ElementRef<HTMLElement>,
    private ngZone: NgZone,
  ) {
    this.setupSpeechRecognition();

    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      const prevUserId = this.getCurrentUserId(this.currentUser);
      const nextUserId = this.getCurrentUserId(user);

      this.currentUser = user;
      this.userAvatarUrl = this.resolveUserAvatar(user);

      if (prevUserId !== nextUserId) {
        this.historyLoadedForUserId = null;
        this.messages = [];
        this.hasShownWelcomeMessage = false;

        if (this.isOpen) {
          if (nextUserId) {
            this.loadHistoryForCurrentUser();
          } else {
            this.ensureWelcomeMessage();
            this.shouldScrollToBottom = true;
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollMessagesToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && this.hostRef.nativeElement.contains(target)) {
      return;
    }

    this.closePopup();
  }

  get isLoggedIn(): boolean {
    return !!this.getCurrentUserId(this.currentUser);
  }

  toggleOpen(): void {
    if (this.isOpen) {
      this.closePopup();
      return;
    }

    this.isOpen = true;

    if (this.isLoggedIn) {
      this.loadHistoryForCurrentUser();
    } else {
      this.ensureWelcomeMessage();
      this.shouldScrollToBottom = true;
    }
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.messages.push(this.createMessage('user', text));
    this.inputText = '';
    this.shouldScrollToBottom = true;

    const history = this.messages.map((item) => ({
      role: item.role,
      content: item.content,
      createdAt: item.createdAt.toISOString(),
    }));

    this.isLoading = true;
    this.chatboxService
      .ask(text, history)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (answer) => {
          this.messages.push(this.createMessage('assistant', answer));
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'Không thể kết nối chatbot. Vui lòng thử lại.';
        },
      });
  }

  toggleMicrophone(): void {
    if (!this.recognition) {
      this.errorMessage = 'Trình duyệt chưa hỗ trợ nhập giọng nói.';
      return;
    }

    this.errorMessage = '';
    if (this.isListening) {
      this.speechAutoSendArmed = false;
      this.recognition.stop();
      this.isListening = false;
      return;
    }

    this.speechBaseText = this.inputText.trim();
    this.speechAutoSendArmed = true;
    this.recognition.start();
    this.isListening = true;
  }

  onEnterPress(event: Event): void {
    event.preventDefault();
    this.sendMessage();
  }

  get hasDraft(): boolean {
    return this.inputText.trim().length > 0;
  }

  get showSendAction(): boolean {
    return !this.isListening && this.hasDraft;
  }

  handlePrimaryAction(): void {
    if (this.isListening) {
      this.toggleMicrophone();
      return;
    }

    if (this.hasDraft) {
      this.sendMessage();
      return;
    }

    this.toggleMicrophone();
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private setupSpeechRecognition(): void {
    const browserWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    const SpeechRecognitionConstructor =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      this.hasMicrophoneSupport = false;
      return;
    }

    this.hasMicrophoneSupport = true;
    this.recognition = new SpeechRecognitionConstructor();
    this.recognition.lang = 'vi-VN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const resultLength = event?.results?.length || 0;
      let transcript = '';

      for (let i = 0; i < resultLength; i += 1) {
        transcript += ` ${event?.results?.[i]?.[0]?.transcript || ''}`;
      }

      const normalizedTranscript = transcript.trim();
      const lastResult = resultLength > 0 ? event?.results?.[resultLength - 1] : null;

      this.ngZone.run(() => {
        if (normalizedTranscript) {
          this.inputText = [this.speechBaseText, normalizedTranscript]
            .filter(Boolean)
            .join(' ')
            .trim();
        }

        if (lastResult?.isFinal) {
          this.isListening = false;
          if (normalizedTranscript && this.speechAutoSendArmed) {
            this.speechAutoSendArmed = false;
            this.scheduleAutoSendFromSpeech();
          }
        }
      });
    };

    this.recognition.onerror = () => {
      this.ngZone.run(() => {
        this.errorMessage = 'Khong nhan dien duoc giong noi. Ban thu lai giup minh nhe.';
        this.isListening = false;
        this.speechAutoSendArmed = false;
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.isListening = false;
        this.speechAutoSendArmed = false;
      });
    };
  }
  private scheduleAutoSendFromSpeech(): void {
    setTimeout(() => {
      if (!this.inputText.trim() || this.isLoading) {
        return;
      }

      this.sendMessage();
    }, 120);
  }
  private ensureWelcomeMessage(): void {
    if (this.hasShownWelcomeMessage) {
      return;
    }

    this.messages.push(this.createMessage('assistant', CHATBOX_WELCOME_MESSAGE));
    this.hasShownWelcomeMessage = true;
  }

  private loadHistoryForCurrentUser(): void {
    const userId = this.getCurrentUserId(this.currentUser);
    if (!userId) {
      this.ensureWelcomeMessage();
      this.shouldScrollToBottom = true;
      return;
    }

    if (this.historyLoadedForUserId === userId) {
      if (this.messages.length === 0) {
        this.ensureWelcomeMessage();
      }
      this.shouldScrollToBottom = true;
      return;
    }

    if (this.loadingHistory) {
      return;
    }

    this.loadingHistory = true;
    this.chatboxService
      .getHistory()
      .pipe(
        finalize(() => {
          this.loadingHistory = false;
        }),
      )
      .subscribe({
        next: (items) => {
          const mapped = items
            .map((item) => this.toChatMessage(item))
            .filter((item) => item.content.length > 0);

          if (mapped.length > 0) {
            this.messages = mapped;
            this.hasShownWelcomeMessage = true;
          } else {
            this.messages = [];
            this.hasShownWelcomeMessage = false;
            this.ensureWelcomeMessage();
          }

          this.historyLoadedForUserId = userId;
          this.shouldScrollToBottom = true;
        },
        error: () => {
          if (this.messages.length === 0) {
            this.ensureWelcomeMessage();
            this.shouldScrollToBottom = true;
          }
        },
      });
  }

  private toChatMessage(item: ChatHistoryItem): ChatMessage {
    const parsedDate = item?.createdAt ? new Date(item.createdAt) : new Date();
    return {
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content || '').trim(),
      createdAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      isNew: false,
    };
  }

  private getCurrentUserId(user: User | null): string | null {
    if (!user) return null;

    const typedUser = user as User & { user_id?: string };
    return typedUser.customerId || typedUser.user_id || typedUser._id || null;
  }

  private resolveUserAvatar(user: User | null): string {
    if (!user) return '';

    const typedUser = user as User & {
      profile?: {
        avatar?: string;
        full_name?: string;
      };
    };

    const avatar = typedUser.avatar || typedUser.profile?.avatar || '';
    if (avatar) {
      return avatar;
    }

    const name = typedUser.fullName || typedUser.profile?.full_name || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B2635&color=fff&size=80`;
  }

  private createMessage(role: ChatRole, content: string): ChatMessage {
    const message: ChatMessage = {
      role,
      content,
      createdAt: new Date(),
      isNew: true,
    };

    setTimeout(() => {
      message.isNew = false;
    }, 380);

    return message;
  }

  private scrollMessagesToBottom(): void {
    if (!this.messagesContainer?.nativeElement) {
      return;
    }

    const container = this.messagesContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
  }

  private closePopup(): void {
    this.isOpen = false;

    if (this.isListening) {
      this.speechAutoSendArmed = false;
      this.recognition?.stop();
      this.isListening = false;
    }
  }
}
