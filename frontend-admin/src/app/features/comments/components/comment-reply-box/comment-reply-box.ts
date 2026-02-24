import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-comment-reply-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-reply-box.html',
  styleUrl: './comment-reply-box.css',
})
export class CommentReplyBoxComponent {
  send = output<string>();
  cancel = output<void>();

  protected readonly replyContent = signal('');

  onSend(): void {
    const content = this.replyContent().trim();
    if (content) {
      this.send.emit(content);
      this.replyContent.set('');
    }
  }

  onCancel(): void {
    this.replyContent.set('');
    this.cancel.emit();
  }
}
