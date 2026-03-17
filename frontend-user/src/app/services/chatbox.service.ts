import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface AskChatboxResponse {
  success: boolean;
  message: string;
  data: {
    answer: string;
    meta?: {
      usedProductContext?: boolean;
    };
  };
}

interface ChatboxHistoryResponse {
  success: boolean;
  message: string;
  data?: {
    messages?: ChatHistoryItem[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class ChatboxService {
  private apiUrl = `${environment.apiUrl}/chatbox`;

  constructor(private http: HttpClient) {}

  ask(question: string, history: ChatMessagePayload[]): Observable<string> {
    return this.http
      .post<AskChatboxResponse>(`${this.apiUrl}/ask`, { question, history })
      .pipe(
        map(
          (res) =>
            res?.data?.answer ||
            'Xin lỗi, tôi chưa thể phản hồi lúc này.',
        ),
      );
  }

  getHistory(): Observable<ChatHistoryItem[]> {
    return this.http
      .get<ChatboxHistoryResponse>(`${this.apiUrl}/history`)
      .pipe(map((res) => res?.data?.messages || []));
  }
}
