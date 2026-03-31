import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Comment } from '../../services';
import { CommentStatusBadgeComponent } from '../comment-status-badge/comment-status-badge';
import { CommentReplyBoxComponent } from '../comment-reply-box/comment-reply-box';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [CommonModule, CommentStatusBadgeComponent, CommentReplyBoxComponent],
  templateUrl: './comment-list.html',
  styleUrl: './comment-list.css',
})
export class CommentListComponent {
  comments = input.required<Comment[]>();
  loading = input<boolean>(false);

  approve = output<string>();
  markAsSpam = output<string>();
  delete = output<string>();
  reply = output<{ id: string; content: string }>();

  onApprove(id: string): void {
    this.approve.emit(id);
  }

  onMarkAsSpam(id: string): void {
    this.markAsSpam.emit(id);
  }

  onDelete(id: string): void {
    this.delete.emit(id);
  }

  onReply(id: string, content: string): void {
    this.reply.emit({ id, content });
  }

  hasAdminReply(comment: Comment): boolean {
    return comment.reply?.responderRole === 'admin';
  }

  getReplyLabel(comment: Comment): string {
    return this.hasAdminReply(comment) ? 'Phản hồi đã gửi' : 'Phản hồi từ người dùng';
  }
}
