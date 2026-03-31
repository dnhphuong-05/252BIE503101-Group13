import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentStore } from '../../store';
import { CommentListComponent } from '../../components/comment-list/comment-list';
import { CommentFiltersComponent } from '../../components/comment-filters/comment-filters';

@Component({
  selector: 'app-comment-moderation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommentListComponent,
    CommentFiltersComponent,
  ],
  templateUrl: './comment-moderation.html',
  styleUrl: './comment-moderation.css',
})
export class CommentModerationComponent implements OnInit {
  protected readonly commentStore = inject(CommentStore);
  protected readonly searchQuery = signal('');

  ngOnInit(): void {
    this.commentStore.loadComments();
  }

  onStatusFilterChange(status: 'all' | 'approved' | 'spam'): void {
    this.commentStore.setStatusFilter(status);
  }

  onReplyFilterChange(filter: 'all' | 'waiting' | 'replied'): void {
    this.commentStore.setReplyFilter(filter);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.commentStore.setSearch(value);
    this.commentStore.loadComments();
  }

  onApprove(id: string): void {
    this.commentStore.approveComment(id);
  }

  onMarkAsSpam(id: string): void {
    if (confirm('Bạn có chắc muốn đánh dấu bình luận này là spam?')) {
      this.commentStore.markAsSpam(id);
    }
  }

  onDelete(id: string): void {
    if (confirm('Bạn có chắc muốn xóa bình luận này?')) {
      this.commentStore.deleteComment(id);
    }
  }

  onReply(id: string, content: string): void {
    this.commentStore.replyComment(id, content);
  }

  onPageChange(page: number): void {
    const totalPages = this.commentStore.pagination().totalPages;
    if (page < 1 || page > totalPages) return;
    this.commentStore.setPage(page);
  }
}
