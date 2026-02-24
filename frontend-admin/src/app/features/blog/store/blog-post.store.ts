import { Injectable, signal, computed } from '@angular/core';
import { BlogPost, BlogPostStatus, ListQueryParams } from '../../../models';
import { BlogPostService } from '../services/blog-post.service';
import { tap } from 'rxjs';

interface BlogPostStoreState {
  posts: BlogPost[];
  selectedPost: BlogPost | null;
  isLoading: boolean;
  total: number;
  currentPage: number;
  filters: ListQueryParams;
}

@Injectable({
  providedIn: 'root',
})
export class BlogPostStore {
  private readonly stateSignal = signal<BlogPostStoreState>({
    posts: [],
    selectedPost: null,
    isLoading: false,
    total: 0,
    currentPage: 1,
    filters: {
      page: 1,
      limit: 10,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  });

  // Computed signals
  public readonly posts = computed(() => this.stateSignal().posts);
  public readonly selectedPost = computed(() => this.stateSignal().selectedPost);
  public readonly isLoading = computed(() => this.stateSignal().isLoading);
  public readonly total = computed(() => this.stateSignal().total);
  public readonly currentPage = computed(() => this.stateSignal().currentPage);
  public readonly filters = computed(() => this.stateSignal().filters);

  // Statistics
  public readonly publishedCount = computed(
    () => this.posts().filter((p) => p.status === BlogPostStatus.PUBLISHED).length,
  );

  public readonly draftCount = computed(
    () => this.posts().filter((p) => p.status === BlogPostStatus.DRAFT).length,
  );

  constructor(private readonly blogPostService: BlogPostService) {}

  loadPosts(params?: ListQueryParams): void {
    this.stateSignal.update((state) => ({ ...state, isLoading: true }));

    const queryParams = { ...this.stateSignal().filters, ...params };

    this.blogPostService
      .getAll(queryParams)
      .pipe(
        tap((response) => {
          const data = response.data;
          if (response.success && data) {
            this.stateSignal.update((state) => ({
              ...state,
              posts: data.items,
              total: data.pagination.total,
              currentPage: data.pagination.page,
              filters: queryParams,
              isLoading: false,
            }));
          } else {
            this.stateSignal.update((state) => ({ ...state, isLoading: false }));
          }
        }),
      )
      .subscribe();
  }

  loadPost(id: string): void {
    this.stateSignal.update((state) => ({ ...state, isLoading: true }));

    this.blogPostService
      .getById(id)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.stateSignal.update((state) => ({
              ...state,
              selectedPost: response.data!,
              isLoading: false,
            }));
          } else {
            this.stateSignal.update((state) => ({ ...state, isLoading: false }));
          }
        }),
      )
      .subscribe();
  }

  clearSelectedPost(): void {
    this.stateSignal.update((state) => ({ ...state, selectedPost: null }));
  }

  updateFilters(filters: Partial<ListQueryParams>): void {
    this.stateSignal.update((state) => ({
      ...state,
      filters: { ...state.filters, ...filters },
    }));
    this.loadPosts();
  }

  reset(): void {
    this.stateSignal.set({
      posts: [],
      selectedPost: null,
      isLoading: false,
      total: 0,
      currentPage: 1,
      filters: {
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    });
  }
}
