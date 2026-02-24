import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-comment-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-filters.html',
  styleUrl: './comment-filters.css',
})
export class CommentFiltersComponent {
  statusFilter = input.required<'all' | 'approved' | 'spam'>();
  replyFilter = input.required<'all' | 'waiting' | 'replied'>();

  statusFilterChange = output<'all' | 'approved' | 'spam'>();
  replyFilterChange = output<'all' | 'waiting' | 'replied'>();

  readonly statusOptions = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'approved' as const, label: 'Hiển thị' },
    { value: 'spam' as const, label: 'Spam' },
  ];

  readonly replyOptions = [
    { value: 'all' as const, label: 'Tất cả' },
    { value: 'waiting' as const, label: 'Chưa phản hồi' },
    { value: 'replied' as const, label: 'Đã phản hồi' },
  ];

  onStatusChange(value: string): void {
    this.statusFilterChange.emit(value as 'all' | 'approved' | 'spam');
  }

  onReplyChange(value: string): void {
    this.replyFilterChange.emit(value as 'all' | 'waiting' | 'replied');
  }
}
