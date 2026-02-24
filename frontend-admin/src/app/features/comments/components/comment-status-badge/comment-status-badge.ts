import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-comment-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-status-badge.html',
  styleUrl: './comment-status-badge.css',
})
export class CommentStatusBadgeComponent {
  status = input.required<'pending' | 'approved' | 'spam'>();

  protected readonly badgeConfig = computed(() => {
    const status = this.status();
    const configs = {
      pending: { label: 'Đang duyệt', class: 'badge-warning' },
      approved: { label: 'Hiển thị', class: 'badge-success' },
      spam: { label: 'Spam', class: 'badge-error' },
    };
    return configs[status];
  });
}
