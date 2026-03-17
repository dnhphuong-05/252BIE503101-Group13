export interface BlogAuthor {
  id?: string;
  author_id?: number;
  name: string;
  role?: string;
  avatar?: string;
  bio?: string;
}

export interface BlogSeo {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string | string[];
  og_image?: string;
}

export interface BlogPost {
  id: string;
  blog_id?: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  thumbnail?: string;
  categoryId: string;
  category_id?: number;
  category?: BlogCategory;
  authorId: string;
  author?: BlogAuthor;
  status: BlogPostStatus;
  is_featured?: boolean;
  is_published?: boolean;
  is_archived?: boolean;
  publishedAt?: Date;
  published_at?: string | Date;
  viewCount: number;
  views?: number;
  readingTime?: number;
  reading_time?: number;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  seo?: BlogSeo;
  createdAt: Date;
  updatedAt: Date;
  created_at?: string | Date;
  updated_at?: string | Date;
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
  slug?: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  thumbnail?: string;
  categoryId: string;
  category_id?: number;
  status: BlogPostStatus;
  tags: string[];
  reading_time?: number;
  is_featured?: boolean;
  published_at?: string | Date;
  author?: BlogAuthor;
  seoTitle?: string;
  seoDescription?: string;
  seo?: BlogSeo;
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
