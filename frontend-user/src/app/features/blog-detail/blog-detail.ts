import { Component, OnInit, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BlogService, BlogPost } from '../../services/blog.service';
import { ProductService, Product } from '../../services/product.service';
import { CommentService, BlogComment } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './blog-detail.html',
  styleUrls: ['./blog-detail.css'],
})
export class BlogDetailComponent implements OnInit {
  blog: BlogPost | null = null;
  safeContent: SafeHtml = '';
  relatedBlogs: BlogPost[] = [];
  sidebarProducts: Product[] = [];
  comments: BlogComment[] = [];
  commentsPagination = { page: 1, pages: 1, total: 0 };
  isLoading = false;
  isLoadingComments = false;
  error: string | null = null;
  isLoggedIn = false;
  featuredImageUrl: string = ''; // Cache featured image URL

  newComment = {
    comment: '',
    user_name: '',
  };
  isSubmittingComment = false;
  commentError: string | null = null;
  activeReplyId: string | null = null;
  replyDraft = {
    comment: '',
    user_name: '',
  };
  isSubmittingReply = false;
  replyError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private commentService: CommentService,
    private productService: ProductService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.authService.currentUser$.subscribe((user) => {
      this.isLoggedIn = !!user;
    });
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadBlogDetail(slug);
      }
    });
    this.loadSidebarProducts();
  }

  loadBlogDetail(slug: string) {
    this.isLoading = true;
    this.error = null;

    this.blogService.getPostBySlug(slug).subscribe({
      next: (response) => {
        this.blog = response.data;
        const cleanHtml =
          this.sanitizer.sanitize(SecurityContext.HTML, this.blog?.content || '') || '';
        this.safeContent = this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
        this.featuredImageUrl = this.extractFeaturedImage(); // Extract featured image once
        this.isLoading = false;

        if (this.blog) {
          this.blogService.incrementViews(this.blog.blog_id).subscribe();
          this.loadComments(this.blog.blog_id);
          this.loadRelatedBlogs(this.blog.category_id);
        }
      },
      error: (err) => {
        console.error('Error loading blog:', err);
        this.error = 'Không thể tải bài viết. Vui lòng thử lại sau.';
        this.isLoading = false;
      },
    });
  }

  loadComments(blogId: number) {
    this.isLoadingComments = true;

    this.commentService.getAllCommentsWithReplies(blogId).subscribe({
      next: (response) => {
        // Organize comments with their replies
        const allComments = response.data.items;
        const commentMap = new Map<string, BlogComment>();
        const rootComments: BlogComment[] = [];

        allComments.forEach((comment) => {
          comment.replies = [];
          const key = this.getCommentKey(comment);
          if (key) {
            commentMap.set(key, comment);
          }
        });

        allComments.forEach((comment) => {
          const parentKey = this.getParentKey(comment);
          if (!parentKey) {
            rootComments.push(comment);
            return;
          }

          const parent = commentMap.get(parentKey);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          } else {
            rootComments.push(comment);
          }
        });

        this.comments = rootComments;
        this.commentsPagination = {
          page: response.data.pagination.page,
          pages: response.data.pagination.pages,
          total: rootComments.length,
        };
        this.isLoadingComments = false;
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.isLoadingComments = false;
      },
    });
  }

  loadRelatedBlogs(categoryId: number) {
    this.blogService.getPublishedPosts({ categoryId, limit: 3 }).subscribe({
      next: (response) => {
        this.relatedBlogs = response.data.items.filter((b) => b._id !== this.blog?._id).slice(0, 3);
      },
      error: (err) => {
        console.error('Error loading related blogs:', err);
      },
    });
  }

  loadSidebarProducts() {
    this.productService
      .getAllProducts({
        page: 1,
        limit: 3,
        sortBy: 'rating_average',
        sortOrder: 'desc',
        status: 'active',
      })
      .subscribe({
        next: (response) => {
          this.sidebarProducts = response.data.items || [];
        },
        error: (err) => {
          console.error('Error loading sidebar products:', err);
          this.sidebarProducts = [];
        },
      });
  }

  submitComment() {
    if (!this.blog) return;

    // Validate comment content
    if (!this.newComment.comment.trim()) {
      this.commentError = 'Vui lòng nhập nội dung bình luận';
      return;
    }

    // Validate user_name only if not logged in
    if (!this.isLoggedIn && !this.newComment.user_name.trim()) {
      this.commentError = 'Vui lòng nhập tên của bạn';
      return;
    }

    this.isSubmittingComment = true;
    this.commentError = null;

    // Prepare comment data based on login status
    const commentData: any = {
      blog_id: this.blog.blog_id,
      blog_slug: this.blog.slug,
      comment: this.newComment.comment,
      parent_id: null,
    };

    // Only include user_name if guest user
    if (!this.isLoggedIn) {
      commentData.user_name = this.newComment.user_name;
    }

    this.commentService.createComment(commentData).subscribe({
      next: () => {
        this.newComment = { comment: '', user_name: '' };
        this.isSubmittingComment = false;
        this.toastService.success('Bình luận đã được gửi và đang chờ duyệt.');

        if (this.blog) {
          this.loadComments(this.blog.blog_id);
        }
      },
      error: (err) => {
        console.error('Error submitting comment:', err);
        this.commentError = 'Không thể gửi bình luận. Vui lòng thử lại sau.';
        this.isSubmittingComment = false;
      },
    });
  }

  startReply(comment: BlogComment) {
    const key = this.getCommentKey(comment);
    if (!key) return;

    this.activeReplyId = key;
    this.replyDraft.comment = '';
    if (!this.isLoggedIn && !this.replyDraft.user_name) {
      this.replyDraft.user_name = this.newComment.user_name || '';
    }
    this.replyError = null;
  }

  cancelReply() {
    this.activeReplyId = null;
    this.replyDraft = { comment: '', user_name: '' };
    this.replyError = null;
  }

  submitReply(parent: BlogComment) {
    if (!this.blog) return;

    if (!this.replyDraft.comment.trim()) {
      this.replyError = 'Vui lòng nhập nội dung phản hồi';
      return;
    }

    if (!this.isLoggedIn && !this.replyDraft.user_name.trim()) {
      this.replyError = 'Vui lòng nhập tên của bạn';
      return;
    }

    const parentKey = this.getCommentKey(parent);
    if (!parentKey) {
      this.replyError = 'Không xác định được bình luận gốc';
      return;
    }

    this.isSubmittingReply = true;
    this.replyError = null;

    const replyData: any = {
      blog_id: this.blog.blog_id,
      blog_slug: this.blog.slug,
      comment: this.replyDraft.comment,
      parent_id: parentKey,
    };

    if (!this.isLoggedIn) {
      replyData.user_name = this.replyDraft.user_name;
    }

    this.commentService.createComment(replyData).subscribe({
      next: () => {
        this.isSubmittingReply = false;
        this.cancelReply();
        this.toastService.success('Phản hồi đã được gửi và đang chờ duyệt.');
        if (this.blog) {
          this.loadComments(this.blog.blog_id);
        }
      },
      error: (err) => {
        console.error('Error submitting reply:', err);
        this.replyError = 'Không thể gửi phản hồi. Vui lòng thử lại sau.';
        this.isSubmittingReply = false;
      },
    });
  }

  isReplyingTo(comment: BlogComment): boolean {
    const key = this.getCommentKey(comment);
    return !!key && this.activeReplyId === key;
  }

  getCommentKey(comment: BlogComment): string | null {
    if (comment.comments_id) return comment.comments_id;
    if (comment.blog_id && comment.id != null) {
      return `bc_${comment.blog_id}_${comment.id}`;
    }
    return null;
  }

  private getParentKey(comment: BlogComment): string | null {
    const parentId = comment.parent_id;
    if (parentId === null || parentId === undefined || parentId === '') {
      return null;
    }

    if (typeof parentId === 'string') {
      if (/^\d+$/.test(parentId) && comment.blog_id) {
        return `bc_${comment.blog_id}_${parentId}`;
      }
      return parentId;
    }

    if (typeof parentId === 'number') {
      return comment.blog_id ? `bc_${comment.blog_id}_${parentId}` : `${parentId}`;
    }

    return null;
  }

  private getNumericCommentId(comment: BlogComment): number | null {
    if (comment.id != null) return comment.id;
    if (comment.comments_id) {
      const parsed = parseInt(comment.comments_id.split('_').pop() || '', 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  formatDate(dateString: string): string {
    return this.blogService.formatDate(dateString);
  }

  getAuthorName(): string {
    return this.blog?.author?.name || 'Tác giả ẩn danh';
  }

  getAuthorAvatar(): string {
    const name = encodeURIComponent(this.blog?.author?.name || 'User');
    return (
      this.blog?.author?.avatar ||
      `https://ui-avatars.com/api/?name=${name}&background=75162D&color=F2D9A0`
    );
  }

  getCategoryName(categoryId: number): string {
    const categories: { [key: number]: string } = {
      1: 'Lịch Sử Cổ Phục',
      2: 'Hướng Dẫn Mặc',
      3: 'Bảo Quản & Giặt Giũ',
      4: 'Xu Hướng & Phong Cách',
      5: 'May Đo & Cho Thuê',
    };
    return categories[categoryId] || 'Khác';
  }

  getFinalPrice(product: Product): number {
    return this.productService.getFinalPrice(product);
  }

  getDiscountPercentage(product: Product): number {
    return this.productService.getDiscountPercentage(product);
  }

  getProductImage(product: Product): string {
    if (product.thumbnail) return product.thumbnail;
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      return typeof firstImage === 'string'
        ? firstImage
        : (firstImage as any).url || 'assets/images/brand/logo-main.png';
    }
    return 'assets/images/brand/logo-main.png';
  }

  /**
   * Lấy ảnh thứ 2 từ content, nếu không có thì fallback về thumbnail
   */
  private extractFeaturedImage(): string {
    if (!this.blog) return '';

    // Extract tất cả các ảnh từ content HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.blog.content || '';
    const images = tempDiv.querySelectorAll('img');

    // Nếu có ít nhất 2 ảnh, lấy ảnh thứ 2 (index 1)
    if (images.length >= 2) {
      const secondImage = images[1] as HTMLImageElement;
      return secondImage.src || this.blog.thumbnail;
    }

    // Nếu chỉ có 1 ảnh, lấy ảnh đó
    if (images.length === 1) {
      const firstImage = images[0] as HTMLImageElement;
      return firstImage.src || this.blog.thumbnail;
    }

    // Nếu không có ảnh trong content, dùng thumbnail
    return this.blog.thumbnail;
  }

  getFeaturedImage(): string {
    return this.featuredImageUrl || this.blog?.thumbnail || '';
  }

  loadMoreComments() {
    if (this.commentsPagination.page < this.commentsPagination.pages && this.blog) {
      this.commentsPagination.page++;
      this.loadComments(this.blog.blog_id);
    }
  }

  likeComment(comment: BlogComment) {
    if (!this.isLoggedIn) {
      this.toastService.info('Vui lòng đăng nhập để thích bình luận.');
      return;
    }

    const commentId = this.getNumericCommentId(comment);
    if (!commentId) return;

    this.commentService.likeComment(commentId).subscribe({
      next: (response) => {
        comment.likes = response.data?.likes ?? comment.likes + 1;
      },
      error: (err) => {
        console.error('Error liking comment:', err);
      },
    });
  }

  shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  }

  shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(this.blog?.title || '');
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.toastService.success('Đã sao chép liên kết bài viết.');
    });
  }
}
