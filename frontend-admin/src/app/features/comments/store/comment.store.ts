import { Injectable, signal, computed, inject } from '@angular/core';
import { CommentApiService, Comment, CommentFilters } from '../services';

@Injectable({
  providedIn: 'root',
})
export class CommentStore {
  private readonly commentApi = inject(CommentApiService);

  // State
  private readonly _comments = signal<Comment[]>([]);
  private readonly _loading = signal(false);
  private readonly _statusFilter = signal<'all' | 'approved' | 'spam'>('all');
  private readonly _replyFilter = signal<'all' | 'waiting' | 'replied'>('all');
  private readonly _search = signal('');
  private readonly _pagination = signal({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Selectors
  readonly comments = this._comments.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly replyFilter = this._replyFilter.asReadonly();
  readonly search = this._search.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  readonly filteredComments = computed(() => {
    let filtered = this._comments();

    const status = this._statusFilter();
    if (status === 'approved') {
      filtered = filtered.filter((c) => c.status === 'approved');
    } else if (status === 'spam') {
      filtered = filtered.filter((c) => c.status === 'spam');
    }

    const replyFilter = this._replyFilter();
    if (replyFilter === 'waiting') {
      filtered = filtered.filter((c) => c.reply?.responderRole !== 'admin');
    } else if (replyFilter === 'replied') {
      filtered = filtered.filter((c) => c.reply?.responderRole === 'admin');
    }

    const search = this._search().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.content.toLowerCase().includes(search) ||
          c.userName.toLowerCase().includes(search) ||
          (c.blogTitle || '').toLowerCase().includes(search),
      );
    }

    return filtered;
  });

  readonly visibleCount = computed(
    () => this._comments().filter((c) => c.status === 'approved').length,
  );

  readonly spamCount = computed(() => this._comments().filter((c) => c.status === 'spam').length);

  // Actions
  loadComments(filters: CommentFilters = {}): void {
    this._loading.set(true);

    const statusFilter = this._statusFilter();
    const requestFilters: CommentFilters = {
      ...filters,
      type: 'blog',
      status: statusFilter !== 'all' ? (statusFilter as 'approved' | 'spam') : undefined,
      search: this._search() || undefined,
      page: this._pagination().page,
      limit: this._pagination().limit,
    };

    this.commentApi.getComments(requestFilters).subscribe({
      next: (response) => {
        this._comments.set(response.data.comments);
        this._pagination.set(response.data.pagination);
        this._loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load comments:', error);
        this._loading.set(false);
      },
    });
  }

  approveComment(id: string): void {
    this.commentApi.approveComment(id).subscribe({
      next: () => {
        this._comments.update((comments) =>
          comments.map((c) => (c.id === id ? { ...c, status: 'approved' as const } : c)),
        );
      },
      error: (error) => {
        console.error('Failed to approve comment:', error);
      },
    });
  }

  rejectComment(id: string): void {
    this.commentApi.rejectComment(id).subscribe({
      next: () => {
        this._comments.update((comments) => comments.filter((c) => c.id !== id));
      },
      error: (error) => {
        console.error('Failed to reject comment:', error);
      },
    });
  }

  markAsSpam(id: string): void {
    this.commentApi.markAsSpam(id).subscribe({
      next: () => {
        this._comments.update((comments) =>
          comments.map((c) => (c.id === id ? { ...c, status: 'spam' as const } : c)),
        );
      },
      error: (error) => {
        console.error('Failed to mark as spam:', error);
      },
    });
  }

  deleteComment(id: string): void {
    this.commentApi.deleteComment(id).subscribe({
      next: () => {
        this._comments.update((comments) => comments.filter((c) => c.id !== id));
      },
      error: (error) => {
        console.error('Failed to delete comment:', error);
      },
    });
  }

  replyComment(id: string, content: string): void {
    this.commentApi.replyComment(id, content).subscribe({
      next: () => {
        // Handle reply success
        this.loadComments();
      },
      error: (error) => {
        console.error('Failed to reply comment:', error);
      },
    });
  }

  setStatusFilter(status: 'all' | 'approved' | 'spam'): void {
    this._statusFilter.set(status);
    this._pagination.update((p) => ({ ...p, page: 1 }));
    this.loadComments();
  }

  setReplyFilter(filter: 'all' | 'waiting' | 'replied'): void {
    this._replyFilter.set(filter);
  }

  setSearch(search: string): void {
    this._search.set(search);
    this._pagination.update((p) => ({ ...p, page: 1 }));
  }

  setPage(page: number): void {
    this._pagination.update((p) => ({ ...p, page }));
    this.loadComments();
  }
}
