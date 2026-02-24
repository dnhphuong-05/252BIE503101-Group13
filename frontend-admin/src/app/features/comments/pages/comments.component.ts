import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CommentItem {
  id: number;
  type: 'product' | 'blog';
  user: string;
  content: string;
  rating?: number;
  product?: string;
  blogTitle?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'flagged';
}

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      .comments-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 20px;
      }
      .comment-list {
        display: grid;
        gap: 12px;
      }
      .comment-item {
        display: grid;
        gap: 8px;
        padding: 14px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .comment-item.active {
        border-color: rgba(37, 99, 235, 0.3);
        box-shadow: var(--shadow-sm);
      }
      .comment-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .comment-user {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #111827, #374151);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 12px;
      }
      .comment-body {
        color: var(--muted-strong);
        font-size: 13px;
        line-height: 1.5;
      }
      .detail-card {
        position: sticky;
        top: 96px;
      }
      .rating-stars {
        color: #f59e0b;
        font-size: 12px;
      }
      .filter-pill {
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        background: #fff;
        color: var(--muted-strong);
        cursor: pointer;
      }
      .filter-pill.active {
        background: var(--accent-soft);
        color: var(--accent);
        border-color: rgba(37, 99, 235, 0.3);
      }
    `,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <div class="page-title">Reviews & Comments</div>
        <div class="page-subtitle">Moderate product reviews and blog comments</div>
      </div>

      <div class="card soft flex items-center gap-2">
        @for (tab of tabs; track tab.value) {
          <button
            class="filter-pill"
            [class.active]="activeTab() === tab.value"
            (click)="setTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <div class="comments-layout">
        <div class="comment-list">
          @for (comment of filteredComments(); track comment.id) {
            <div
              class="comment-item"
              [class.active]="selectedComment()?.id === comment.id"
              (click)="selectedComment.set(comment)"
            >
              <div class="comment-meta">
                <div class="comment-user">
                  <div class="avatar">{{ comment.user[0] }}</div>
                  <div>
                    <div class="font-semibold text-primary-900">{{ comment.user }}</div>
                    <div class="text-xs text-primary-500">
                      {{ comment.type === 'product' ? comment.product : comment.blogTitle }}
                    </div>
                  </div>
                </div>
                <span [class]="statusMeta[comment.status]">{{ comment.status }}</span>
              </div>
              @if (comment.rating) {
                <div class="rating-stars">
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                  <i class="fas fa-star"></i>
                  <i class="far fa-star"></i>
                  <span class="ml-2 text-xs text-primary-500">{{ comment.rating }} / 5</span>
                </div>
              }
              <div class="comment-body">{{ comment.content }}</div>
              <div class="text-xs text-primary-500">Submitted {{ comment.createdAt }}</div>
            </div>
          }
        </div>

        <div class="card detail-card">
          <div class="card-title mb-2">Comment Detail</div>
          @if (selectedComment()) {
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="badge badge-info">{{ selectedComment()?.type }}</span>
                <span [class]="statusMeta[selectedComment()?.status || 'pending']">
                  {{ selectedComment()?.status }}
                </span>
              </div>
              <div class="font-semibold text-primary-900">
                {{
                  selectedComment()?.type === 'product'
                    ? selectedComment()?.product
                    : selectedComment()?.blogTitle
                }}
              </div>
              <div class="text-sm text-primary-600">By {{ selectedComment()?.user }}</div>
              <div class="comment-body">{{ selectedComment()?.content }}</div>
              <div class="flex gap-2">
                <button class="btn btn-primary btn-sm">Approve</button>
                <button class="btn btn-secondary btn-sm">Reply</button>
                <button class="btn btn-ghost btn-sm">Flag</button>
              </div>
            </div>
          } @else {
            <div class="text-sm text-primary-500">Select a comment to preview.</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class CommentsComponent {
  protected readonly tabs = [
    { label: 'All', value: 'all' },
    { label: 'Product Reviews', value: 'product' },
    { label: 'Blog Comments', value: 'blog' },
  ] as const;

  protected readonly statusMeta: Record<string, string> = {
    pending: 'badge badge-warning',
    approved: 'badge badge-success',
    flagged: 'badge badge-error',
  };

  protected readonly activeTab = signal<'all' | 'product' | 'blog'>('all');
  protected readonly selectedComment = signal<CommentItem | null>(null);

  protected readonly comments: CommentItem[] = [
    {
      id: 1,
      type: 'product',
      user: 'Samson Heathcote',
      product: 'Ao dai Le Phuc',
      rating: 4,
      content: 'Amazing fit and the embroidery looks premium. Delivery was on time.',
      createdAt: '8h ago',
      status: 'approved',
    },
    {
      id: 2,
      type: 'product',
      user: 'Maureen Russel',
      product: 'Ao ba ba Hue',
      rating: 3,
      content: 'Fabric is soft but the size chart needs more clarity.',
      createdAt: '14h ago',
      status: 'pending',
    },
    {
      id: 3,
      type: 'blog',
      user: 'Whitney Nicolas',
      blogTitle: 'Huong dan chon ao dai',
      content: 'Great article! Could you add more tips about accessories?',
      createdAt: '1 day ago',
      status: 'approved',
    },
    {
      id: 4,
      type: 'blog',
      user: 'Amani Rempel',
      blogTitle: 'Bao quan vai lua',
      content: 'I still see some stains after wash. Any extra advice?',
      createdAt: '2 days ago',
      status: 'flagged',
    },
  ];

  protected setTab(value: 'all' | 'product' | 'blog'): void {
    this.activeTab.set(value);
  }

  protected filteredComments(): CommentItem[] {
    const tab = this.activeTab();
    if (tab === 'all') return this.comments;
    return this.comments.filter((comment) => comment.type === tab);
  }
}
