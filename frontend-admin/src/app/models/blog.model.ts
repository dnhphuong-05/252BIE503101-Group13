export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId: string;
  category?: BlogCategory;
  authorId: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: BlogPostStatus;
  publishedAt?: Date;
  viewCount: number;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogComment {
  id: string;
  postId: string;
  post?: BlogPost;
  userId?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  guestName?: string;
  guestEmail?: string;
  content: string;
  status: CommentStatus;
  parentId?: string;
  replies?: BlogComment[];
  createdAt: Date;
  updatedAt: Date;
}

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SPAM = 'spam',
  TRASH = 'trash',
}

export interface CreateBlogPostRequest {
  title: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId: string;
  status: BlogPostStatus;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: Date;
}

export interface UpdateBlogPostRequest extends Partial<CreateBlogPostRequest> {
  id: string;
}

export interface CreateBlogCategoryRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateBlogCategoryRequest extends Partial<CreateBlogCategoryRequest> {
  id: string;
}
