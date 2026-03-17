import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';
import { ReviewService, Review } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { GuestCustomerService, GuestCustomerPayload } from '../../services/guest-customer.service';
import { QuickOrderService } from '../../services/quick-order.service';
import { BuyOrderService, CreateBuyOrderPayload } from '../../services/buy-order.service';
import { CartService, CartItem } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { Subject, takeUntil } from 'rxjs';
import { GuestFormComponent } from '../../shared/components/guest-form/guest-form';
import { OrderSuccessModalComponent } from '../../shared/components/order-success-modal/order-success-modal';
import { LoginPromptModalComponent } from '../../shared/components/login-prompt-modal/login-prompt-modal';

type ReviewFilter = 'all' | 'media' | 1 | 2 | 3 | 4 | 5;

interface PendingReviewMedia {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  name: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    GuestFormComponent,
    OrderSuccessModalComponent,
    LoginPromptModalComponent,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  relatedProducts: Product[] = [];
  reviews: Review[] = [];
  reviewStats: any = null;
  selectedImage: string = '';
  selectedSize: string = '';
  selectedColor: string = '';
  quantity: number = 1;
  isLoading: boolean = true;
  loadError: string | null = null;
  activeTab: string = 'description';

  // Review filters and pagination
  reviewPage: number = 1;
  reviewLimit: number = 5;
  reviewTotal: number = 0;
  reviewPages: number = 0;
  reviewFilterRating: number | null = null;
  reviewHasMediaOnly: boolean = false;
  reviewSortBy: string = 'created_at';
  reviewSortOrder: 'asc' | 'desc' = 'desc';

  // Image gallery
  currentImageIndex: number = 0;
  showLightbox: boolean = false;
  isZoomed: boolean = false;
  isThumbDragging: boolean = false;
  private thumbsStartX: number = 0;
  private thumbsScrollLeft: number = 0;
  private thumbsMoved: boolean = false;
  private blockThumbClick: boolean = false;

  @ViewChild('thumbsScroller') thumbsScroller?: ElementRef<HTMLDivElement>;

  // Sticky header
  showStickyCart: boolean = false;

  // Auth + Guest checkout flow
  isLoggedIn: boolean = false;
  showLoginPrompt: boolean = false;
  showGuestForm: boolean = false;
  showSuccessModal: boolean = false;
  orderResult: any = null;

  // Write review
  showReviewForm: boolean = false;
  canWriteReview: boolean = false;
  hasCompletedPurchase: boolean = false;
  reviewEligibilityLoaded: boolean = false;
  existingUserReview: Review | null = null;
  reviewActionMessage: string = '';
  reviewActionError: string = '';
  isSubmittingReview: boolean = false;
  selectedReviewMedia: PendingReviewMedia[] = [];
  newReview = {
    rating: 0,
    comment: '',
  };

  // Social sharing
  shareUrl: string = '';

  private destroy$ = new Subject<void>();
  private pendingReviewPrompt: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public productService: ProductService,
    public reviewService: ReviewService,
    private authService: AuthService,
    private guestCustomerService: GuestCustomerService,
    private quickOrderService: QuickOrderService,
    private buyOrderService: BuyOrderService,
    private cartService: CartService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.isLoggedIn = !!user;
      if (this.product) {
        this.loadMyReviewEligibility(this.product.product_id.toString());
      }
    });

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.pendingReviewPrompt = params.get('writeReview') === '1';
      if (params.get('tab') === 'reviews' || this.pendingReviewPrompt) {
        this.activeTab = 'reviews';
      }
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const productId = params['id'];
      if (productId) {
        this.loadProductDetail(productId);
        this.loadReviews(productId);
        this.loadReviewStats(productId);
        this.shareUrl = window.location.href;

        // Save to recently viewed (localStorage)
        this.saveToRecentlyViewed(productId);
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const offset = window.pageYOffset || document.documentElement.scrollTop;
    this.showStickyCart = offset > 600;
  }

  ngOnDestroy() {
    this.clearSelectedReviewMedia();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProductDetail(productId: string) {
    this.isLoading = true;
    this.loadError = null;

    this.productService.getProductById(productId).subscribe({
      next: (response) => {
        this.product = response.data;

        // Set default selections
        if (this.product.images && this.product.images.length > 0) {
          this.selectedImage = this.getImageUrl(this.product.images[0]);
        } else if (this.product.thumbnail) {
          this.selectedImage = this.getImageUrl(this.product.thumbnail);
        }
        if (
          this.product.attributes &&
          this.product.attributes.sizes &&
          this.product.attributes.sizes.length > 0
        ) {
          this.selectedSize = this.product.attributes.sizes[0];
        }
        if (
          this.product.attributes &&
          this.product.attributes.colors &&
          this.product.attributes.colors.length > 0
        ) {
          this.selectedColor = this.product.attributes.colors[0];
        }

        this.loadMyReviewEligibility(this.product.product_id.toString());

        // Load related products
        this.loadRelatedProducts();

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.loadError = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
        this.isLoading = false;
      },
    });
  }

  // Related products pagination
  relatedPage: number = 1;
  relatedLimit: number = 20; // 4 cards per row x 5 rows
  relatedTotal: number = 0;
  relatedPages: number = 0;

  loadRelatedProducts(page: number = 1) {
    if (!this.product) return;

    this.productService
      .getRelatedProducts(this.product.product_id.toString(), this.relatedLimit)
      .subscribe({
        next: (response) => {
          // Handle both array and object responses
          if (Array.isArray(response.data)) {
            this.relatedProducts = response.data;
            this.relatedTotal = response.data.length;
          } else if (response.data.items) {
            this.relatedProducts = response.data.items;
            this.relatedTotal = response.data.pagination?.total || response.data.items.length;
          } else {
            this.relatedProducts = [];
            this.relatedTotal = 0;
          }

          this.relatedPages = Math.ceil(this.relatedTotal / this.relatedLimit);
          this.relatedPage = page;

          console.log(
            'Related products loaded:',
            this.relatedProducts.length,
            'Total:',
            this.relatedTotal,
          );
        },
        error: (error) => {
          console.error('Error loading related products:', error);
          this.relatedProducts = [];
          this.relatedTotal = 0;
        },
      });
  }

  onRelatedPageChange(page: number) {
    if (page >= 1 && page <= this.relatedPages) {
      this.loadRelatedProducts(page);
      window.scrollTo({
        top: document.querySelector('.related-products')?.scrollTop || 0,
        behavior: 'smooth',
      });
    }
  }

  selectImage(imageUrl: string) {
    this.selectedImage = imageUrl;
  }

  onThumbClick(imageUrl: string) {
    if (this.blockThumbClick) return;
    this.selectImage(imageUrl);
  }

  scrollThumbs(direction: 'left' | 'right') {
    const el = this.thumbsScroller?.nativeElement;
    if (!el) return;
    const amount = Math.max(120, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  onThumbsPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const el = this.thumbsScroller?.nativeElement;
    if (!el) return;
    this.isThumbDragging = true;
    this.thumbsMoved = false;
    this.thumbsStartX = event.clientX;
    this.thumbsScrollLeft = el.scrollLeft;
  }

  onThumbsPointerMove(event: PointerEvent) {
    if (!this.isThumbDragging) return;
    const el = this.thumbsScroller?.nativeElement;
    if (!el) return;
    const delta = event.clientX - this.thumbsStartX;
    if (Math.abs(delta) > 5) {
      this.thumbsMoved = true;
    }
    el.scrollLeft = this.thumbsScrollLeft - delta;
  }

  onThumbsPointerUp(event: PointerEvent) {
    if (!this.isThumbDragging) return;
    this.isThumbDragging = false;
    if (this.thumbsMoved) {
      this.blockThumbClick = true;
      setTimeout(() => {
        this.blockThumbClick = false;
      }, 0);
    }
  }

  selectSize(size: string) {
    this.selectedSize = size;
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  increaseQuantity() {
    if (this.product && this.quantity < this.product.stock_quantity) {
      this.quantity++;
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(redirectToCart: boolean = true) {
    if (!this.product) return;

    if (this.getProductSizes().length > 0 && !this.selectedSize) {
      this.toastService.info('Vui lòng chọn kích thước trước khi thêm vào giỏ hàng.');
      return;
    }

    if (this.getProductColors().length > 0 && !this.selectedColor) {
      this.toastService.info('Vui lòng chọn màu sắc trước khi thêm vào giỏ hàng.');
      return;
    }

    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const item = this.buildCartItem();
    if (!item) return;

    this.cartService
      .addItem(item.product_id, item.quantity, item.size ?? null, item.color ?? null)
      .subscribe({
        next: () => {
          if (redirectToCart) {
            this.router.navigate(['/cart']);
            return;
          }
          this.toastService.success('Đã thêm sản phẩm vào giỏ hàng.');
        },
        error: (err) => {
          console.error('Add to cart failed:', err);
          this.toastService.error('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
        },
      });
  }

  handleBuyNow() {
    if (!this.product) return;

    if (this.getProductSizes().length > 0 && !this.selectedSize) {
      this.toastService.info('Vui lòng chọn kích thước trước khi mua ngay.');
      return;
    }

    if (this.getProductColors().length > 0 && !this.selectedColor) {
      this.toastService.info('Vui lòng chọn màu sắc trước khi mua ngay.');
      return;
    }

    const item = this.buildCartItem();
    if (!item) return;

    this.cartService.setBuyNowItems([item]);
    this.router.navigate(['/check-out']);
  }

  continueAsGuest() {
    this.showLoginPrompt = false;
    this.showGuestForm = true;
  }

  goToLogin() {
    this.showLoginPrompt = false;
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  closeLoginPrompt() {
    this.showLoginPrompt = false;
  }

  closeGuestForm() {
    this.showGuestForm = false;
  }

  onGuestFormSubmitSuccess(guestData: any) {
    if (!this.product) return;

    // Validate required fields
    const productId = this.getProductId();
    if (!productId) {
      console.error('Product ID is missing');
      this.toastService.error('Không tìm thấy mã sản phẩm. Vui lòng tải lại trang.');
      return;
    }

    const imageUrl = this.getImageUrl(this.product.thumbnail);

    // Chuẩn bị dữ liệu đơn hàng
    const orderPayload = {
      customer: {
        full_name: guestData.full_name,
        phone: guestData.phone,
        email: guestData.email || null,
        address: guestData.address,
      },
      items: [
        {
          product_id: productId.toString(),
          name: this.product.name || 'Sản phẩm',
          price: this.product.price_buy || 0,
          quantity: this.quantity,
          image: imageUrl || undefined,
          attributes: {
            ...(this.selectedSize && { size: this.selectedSize }),
            ...(this.selectedColor && { color: this.selectedColor }),
          },
        },
      ],
      shippingFee: 30000,
      note: '',
    };

    // Log payload for debugging
    console.log('Creating quick order with payload:', orderPayload);

    // Gọi API tạo đơn hàng
    this.quickOrderService.createQuickOrder(orderPayload).subscribe({
      next: (response) => {
        console.log('Order created successfully:', response);
        this.showGuestForm = false;
        this.orderResult = response.data;
        this.showSuccessModal = true;

        // Lưu vào localStorage để backup
        localStorage.setItem('lastOrder', JSON.stringify(response.data));
      },
      error: (error) => {
        console.error('Error creating order:', error);

        // Show detailed error message
        let errorMessage =
          'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại sau hoặc liên hệ hotline để được hỗ trợ.';

        if (error.error?.message) {
          errorMessage = error.error.message;
        }

        // Log validation errors if present
        if (error.error?.errors) {
          console.error('Validation errors:', error.error.errors);
        }

        this.toastService.error(errorMessage);
      },
    });
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.orderResult = null;
  }

  private buildCartItem(): CartItem | null {
    if (!this.product) return null;

    const finalPrice = this.getFinalPrice();
    const originalPrice = this.getProductPrice() || finalPrice;

    return {
      product_id: Number(this.getProductId()),
      product_name_snapshot: this.product.name,
      thumbnail_snapshot: this.getImageUrl(this.product.thumbnail),
      price_snapshot: finalPrice,
      original_price_snapshot: originalPrice,
      product_discount_snapshot: Math.max(0, originalPrice - finalPrice),
      size: this.selectedSize || null,
      color: this.selectedColor || null,
      quantity: this.quantity,
    };
  }

  rentNow() {
    if (!this.product) return;

    if (
      (this.getProductSizes().length > 0 && !this.selectedSize) ||
      (this.getProductColors().length > 0 && !this.selectedColor)
    ) {
      this.toastService.info('Vui lòng chọn đầy đủ biến thể sản phẩm trước khi đặt thuê.');
      return;
    }

    const productId = this.getProductId();
    if (!productId) {
      this.toastService.error('Không tìm thấy mã sản phẩm. Vui lòng tải lại trang.');
      return;
    }

    const rentalState = {
      productId: productId.toString(),
      name: this.product.name,
      sku: this.product.sku || this.generateSKU(this.product, this.selectedSize, this.selectedColor),
      thumbnail: this.getImageUrl(this.product.thumbnail || this.product.images?.[0]),
      rentPricePerDay: this.getRentPrice(),
      depositAmount: this.getDepositAmount(),
      color: this.selectedColor,
      size: this.selectedSize,
      quantity: this.quantity,
      inStock: this.isInStock(),
    };

    sessionStorage.setItem('rentalCheckout', JSON.stringify(rentalState));

    this.router.navigate(['/rental-checkout'], {
      queryParams: { productId: productId.toString() },
      state: { rental: rentalState },
    });
  }

  // ============= Guest checkout flow handlers =============

  /**
   * Đóng login prompt modal
   */
  onLoginPromptClose(): void {
    this.showLoginPrompt = false;
  }

  /**
   * Khi guest chọn "Không, tiếp tục" -> hiển thị guest form
   */
  onContinueAsGuest(): void {
    this.showLoginPrompt = false;
    this.showGuestForm = true;
  }

  /**
   * Khi guest chọn "Đăng nhập" -> chuyển đến trang login
   */
  onGoToLogin(): void {
    this.showLoginPrompt = false;
    // TODO: Lưu thông tin sản phẩm vào sessionStorage để quay lại sau khi đăng nhập
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  /**
   * Đóng guest form
   */
  onGuestFormClose(): void {
    this.showGuestForm = false;
  }

  /**
   * Xử lý khi guest submit form
   * Flow:
   * 1. Tạo guest customer (đã được xử lý trong guest-form component)
   * 2. Tạo buy order với guest_id
   * 3. Gửi email xác nhận (xử lý ở backend)
   * 4. Hiển thị order success modal
   */
  onGuestFormSubmit(guestData: any): void {
    if (!this.product) return;

    console.log('Guest data received:', guestData);

    // Đóng guest form
    this.showGuestForm = false;

    // Chuẩn bị dữ liệu order
    const orderPayload: CreateBuyOrderPayload = {
      guest_id: guestData.guest_id,
      customer_info: {
        full_name: guestData.full_name,
        phone: guestData.phone,
        email: guestData.email,
        address: guestData.address,
      },
      items: [
        {
          product_id: this.product.product_id.toString(),
          sku: this.product.sku || `${this.product.product_id}`,
          name: this.product.name,
          thumbnail: this.product.thumbnail,
          price: Number(this.product.price_buy || this.product.price),
          quantity: this.quantity,
          total_price: Number(this.product.price_buy || this.product.price) * this.quantity,
          size: this.selectedSize,
          color: this.selectedColor,
        },
      ],
      payment_method: 'cod',
      note: '',
    };

    console.log('Creating buy order with payload:', orderPayload);

    // Tạo buy order
    this.buyOrderService.createBuyOrder(orderPayload).subscribe({
      next: (response) => {
        console.log('Buy order created successfully:', response);

        // Lưu kết quả để hiển thị trong success modal
        this.orderResult = {
          orderCode: response.data.order.order_code,
          total: response.data.order.total_amount,
          emailSent: response.data.emailSent || false,
        };

        // Hiển thị success modal
        this.showSuccessModal = true;
      },
      error: (error) => {
        console.error('Error creating buy order:', error);
        this.toastService.error(
          error.error?.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.',
        );
      },
    });
  }

  /**
   * Đóng order success modal
   */
  onOrderSuccessClose(): void {
    this.showSuccessModal = false;
    this.orderResult = null;

    // Reset form
    this.selectedSize = '';
    this.selectedColor = '';
    this.quantity = 1;
  }

  /**
   * Generate SKU từ product info
   */
  private generateSKU(product: Product, size: string, color: string): string {
    let sku = product.product_id.toString();
    if (size) {
      sku += `-${size}`;
    }
    if (color) {
      sku += `-${color}`;
    }
    return sku;
  }

  // ============= End Guest checkout flow handlers =============

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  goBack() {
    this.router.navigate(['/products']);
  }

  viewRelatedProduct(productId: string | number) {
    this.router.navigate(['/products', productId.toString()]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Review methods
  loadReviews(productId: string) {
    this.reviewService
      .getProductReviews(
        productId,
        this.reviewPage,
        this.reviewLimit,
        this.reviewSortBy,
        this.reviewSortOrder,
        this.reviewFilterRating || undefined,
        this.reviewHasMediaOnly,
      )
      .subscribe({
        next: (response) => {
          const data = response.data as any;
          this.reviews = data.reviews || data.items || [];
          this.reviewTotal = data.pagination?.total ?? this.reviews.length;
          this.reviewPages = data.pagination?.pages ?? (this.reviewTotal > 0 ? 1 : 0);
        },
        error: (err: any) => {
          console.error('Error loading reviews:', err);
        },
      });
  }

  loadReviewStats(productId: string) {
    this.reviewService.getReviewStats(productId).subscribe({
      next: (response) => {
        this.reviewStats = response.data;
      },
      error: (err: any) => {
        console.error('Error loading review stats:', err);
      },
    });
  }

  loadMyReviewEligibility(productId: string) {
    if (!this.isLoggedIn) {
      this.reviewEligibilityLoaded = true;
      this.canWriteReview = false;
      this.hasCompletedPurchase = false;
      this.existingUserReview = null;
      this.handlePendingReviewPrompt();
      return;
    }

    this.reviewService.getMyReviewEligibility(productId).subscribe({
      next: (response) => {
        const data = response?.data;
        this.reviewEligibilityLoaded = true;
        this.canWriteReview = !!data?.can_review;
        this.hasCompletedPurchase = !!data?.has_completed_purchase;
        this.existingUserReview = data?.review || null;
        this.reviewActionError = '';

        this.handlePendingReviewPrompt();
      },
      error: () => {
        this.reviewEligibilityLoaded = true;
        this.canWriteReview = false;
        this.hasCompletedPurchase = false;
        this.existingUserReview = null;
        this.reviewActionError = '';
        this.handlePendingReviewPrompt();
      },
    });
  }

  onReviewPageChange(page: number) {
    if (page >= 1 && page <= this.reviewPages && this.product) {
      this.reviewPage = page;
      this.loadReviews(this.product.product_id.toString());
    }
  }

  markReviewHelpful(reviewId: string) {
    this.reviewService.markReviewHelpful(reviewId).subscribe({
      next: () => {
        if (this.product) {
          this.loadReviews(this.product.product_id.toString());
        }
      },
      error: (err: any) => {
        console.error('Error marking review as helpful:', err);
      },
    });
  }

  // Utility methods
  getFinalPrice(): number {
    return this.product ? this.productService.getFinalPrice(this.product) : 0;
  }

  getDiscountPercentage(): number {
    return this.product ? this.productService.getDiscountPercentage(this.product) : 0;
  }

  isInStock(): boolean {
    return this.product ? this.productService.isInStock(this.product) : false;
  }

  getCategoryName(): string {
    return this.product
      ? this.productService.getCategoryDisplayName(
          this.product.category || this.product.category_name || '',
        )
      : '';
  }

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }

  getTimeAgo(date?: string): string {
    if (!date) return '';
    return this.reviewService.getTimeAgo(date);
  }

  // Helper methods for template
  getImageUrl(image: string | any): string {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image?.secure_url || image?.url || image?.path || '';
  }

  getImageAlt(image: string | any): string {
    return typeof image === 'string' ? '' : image?.alt || '';
  }

  getRatingAverage(): number {
    if (this.reviewStats && typeof this.reviewStats.rating_average === 'number') {
      return this.reviewStats.rating_average;
    }
    return this.product?.rating?.average || this.product?.rating_average || 0;
  }

  getProductPrice(): number {
    return this.product?.price || this.product?.price_buy || 0;
  }

  getRentPrice(): number {
    return this.product?.price_rent || 0;
  }

  getDepositAmount(): number {
    return (this.product as any)?.deposit_amount || 0;
  }

  getProductId(): string | number {
    return this.product?.product_id || this.product?.productId || '';
  }

  getProductStock(): number {
    return this.product?.stock || this.product?.stock_quantity || 0;
  }

  getSoldCount(): number {
    return this.product?.soldCount || this.product?.sold_count || 0;
  }

  getViewCount(): number {
    return this.product?.views || (this.product as any)?.view_count || 0;
  }

  getProductColors(): string[] {
    return this.product?.colors || this.product?.attributes?.colors || [];
  }

  getColorIcon(color: string): string {
    // Return color icon based on color name
    // For now, using placeholder icon. You can replace with actual color icons
    const colorMap: { [key: string]: string } = {
      Red: 'https://via.placeholder.com/30/FF0000/FF0000',
      Black: 'https://via.placeholder.com/30/000000/000000',
      White: 'https://via.placeholder.com/30/FFFFFF/FFFFFF',
      Blue: 'https://via.placeholder.com/30/0000FF/0000FF',
      Green: 'https://via.placeholder.com/30/00FF00/00FF00',
    };
    return colorMap[color] || 'https://via.placeholder.com/30/CCCCCC/CCCCCC';
  }

  getProductSizes(): string[] {
    return this.product?.sizes || this.product?.attributes?.sizes || [];
  }

  getFeatureList(): string[] {
    if (!this.product) return [];

    const features = (this.product.attributes?.features || []).filter(Boolean);
    if (features.length > 0) return features;

    const list: string[] = [];
    if (this.product.material) list.push(`Chất liệu: ${this.product.material}`);
    if (this.product.origin) list.push(`Xuất xứ: ${this.product.origin}`);

    const colors = this.getProductColors();
    if (colors.length > 0) list.push(`Màu sắc: ${colors.join(', ')}`);

    const sizes = this.getProductSizes();
    if (sizes.length > 0) list.push(`Kích cỡ: ${sizes.join(', ')}`);

    if (this.getProductStock() > 0) {
      list.push(`Tồn kho: ${this.getProductStock()} sản phẩm`);
    }

    return list;
  }

  getReviewerName(review: any): string {
    return review?.user?.fullName || review?.user_name || 'Ẩn danh';
  }

  // ========== NEW METHODS FOR ENHANCED FEATURES ==========

  // Image Gallery Methods
  selectImageByIndex(index: number) {
    if (this.product && this.product.images && this.product.images[index]) {
      this.currentImageIndex = index;
      this.selectedImage = this.getImageUrl(this.product.images[index]);
    }
  }

  previousImage() {
    if (!this.product || !this.product.images) return;
    this.currentImageIndex =
      this.currentImageIndex > 0 ? this.currentImageIndex - 1 : this.product.images.length - 1;
    this.selectedImage = this.getImageUrl(this.product.images[this.currentImageIndex]);
  }

  nextImage() {
    if (!this.product || !this.product.images) return;
    this.currentImageIndex =
      this.currentImageIndex < this.product.images.length - 1 ? this.currentImageIndex + 1 : 0;
    this.selectedImage = this.getImageUrl(this.product.images[this.currentImageIndex]);
  }

  openLightbox(index: number) {
    this.currentImageIndex = index;
    this.selectedImage = this.getImageUrl(this.product!.images[index]);
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.showLightbox = false;
    document.body.style.overflow = 'auto';
  }

  toggleZoom() {
    this.isZoomed = !this.isZoomed;
  }

  // Review Filter & Sort Methods
  setReviewFilter(filter: ReviewFilter) {
    this.reviewPage = 1;
    this.reviewFilterRating = typeof filter === 'number' ? filter : null;
    this.reviewHasMediaOnly = filter === 'media';

    if (this.product) {
      this.loadReviews(this.product.product_id.toString());
    }
  }

  isReviewFilterActive(filter: ReviewFilter): boolean {
    if (filter === 'all') {
      return !this.reviewFilterRating && !this.reviewHasMediaOnly;
    }

    if (filter === 'media') {
      return this.reviewHasMediaOnly;
    }

    return this.reviewFilterRating === filter && !this.reviewHasMediaOnly;
  }

  changeReviewSort(sortBy: string) {
    if (this.reviewSortBy === sortBy) {
      this.reviewSortOrder = this.reviewSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      this.reviewSortBy = sortBy;
      this.reviewSortOrder = 'desc';
    }
    this.reviewPage = 1;
    if (this.product) {
      this.loadReviews(this.product.product_id.toString());
    }
  }

  onReviewMediaSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const fileList = input?.files;
    if (!fileList?.length) return;

    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-m4v',
    ]);
    const incomingFiles = Array.from(fileList).filter((file) => allowedMimeTypes.has(file.type));
    const remainingSlots = Math.max(0, 6 - this.selectedReviewMedia.length);

    if (remainingSlots <= 0) {
      this.reviewActionError = 'Bạn chỉ có thể tải tối đa 6 ảnh hoặc video.';
      if (input) input.value = '';
      return;
    }

    if (!incomingFiles.length) {
      this.reviewActionError = 'Định dạng file không hợp lệ. Vui lòng chọn ảnh hoặc video được hỗ trợ.';
      if (input) input.value = '';
      return;
    }

    const acceptedFiles = incomingFiles.slice(0, remainingSlots);
    const invalidFiles = incomingFiles.length - acceptedFiles.length;

    acceptedFiles.forEach((file) => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const previewUrl = URL.createObjectURL(file);
      this.selectedReviewMedia.push({
        file,
        previewUrl,
        type,
        name: file.name,
      });
    });

    if (invalidFiles > 0) {
      this.reviewActionError = 'Bạn chỉ có thể tải tối đa 6 ảnh hoặc video.';
    } else {
      this.reviewActionError = '';
    }

    if (input) input.value = '';
  }

  removeSelectedReviewMedia(index: number) {
    const media = this.selectedReviewMedia[index];
    if (!media) return;

    URL.revokeObjectURL(media.previewUrl);
    this.selectedReviewMedia.splice(index, 1);
  }

  private clearSelectedReviewMedia() {
    this.selectedReviewMedia.forEach((media) => URL.revokeObjectURL(media.previewUrl));
    this.selectedReviewMedia = [];
  }

  private handlePendingReviewPrompt() {
    if (!this.pendingReviewPrompt) return;

    this.activeTab = 'reviews';

    if (!this.isLoggedIn) {
      this.reviewActionError = 'Vui lòng đăng nhập để đánh giá sản phẩm.';
      this.showLoginPrompt = true;
      this.pendingReviewPrompt = false;
      return;
    }

    if (!this.reviewEligibilityLoaded) return;

    if (this.existingUserReview) {
      this.reviewActionMessage = '';
      this.reviewActionError = 'Bạn đã đánh giá sản phẩm này rồi.';
      this.pendingReviewPrompt = false;
      return;
    }

    if (!this.canWriteReview) {
      this.reviewActionMessage = '';
      this.reviewActionError = 'Chỉ có thể đánh giá khi đơn mua của bạn đã hoàn thành.';
      this.pendingReviewPrompt = false;
      return;
    }

    this.pendingReviewPrompt = false;
    this.openReviewForm();
  }

  promptReviewLogin() {
    this.reviewActionMessage = '';
    this.reviewActionError = 'Vui lòng đăng nhập để đánh giá sản phẩm.';
    this.showLoginPrompt = true;
  }

  getWriteReviewButtonLabel(): string {
    if (!this.isLoggedIn) {
      return 'Đăng nhập để đánh giá';
    }

    if (this.existingUserReview) {
      return 'Bạn đã đánh giá';
    }

    return 'Viết đánh giá';
  }

  // Write Review Methods
  openReviewForm() {
    this.activeTab = 'reviews';
    this.reviewActionMessage = '';

    if (!this.isLoggedIn) {
      this.promptReviewLogin();
      return;
    }

    if (this.existingUserReview) {
      this.reviewActionError = 'Bạn đã đánh giá sản phẩm này rồi.';
      this.showReviewForm = false;
      return;
    }

    if (!this.canWriteReview) {
      this.reviewActionError = 'Chỉ có thể đánh giá khi đơn mua của bạn đã hoàn thành.';
      this.showReviewForm = false;
      return;
    }

    this.reviewActionError = '';
    this.clearSelectedReviewMedia();
    this.showReviewForm = true;
    this.newReview = {
      rating: 0,
      comment: '',
    };
  }

  closeReviewForm() {
    this.showReviewForm = false;
    this.reviewActionError = '';
    this.clearSelectedReviewMedia();
    this.newReview = {
      rating: 0,
      comment: '',
    };
  }

  setNewReviewRating(rating: number) {
    this.newReview.rating = rating;
  }

  submitReview() {
    if (!this.product) return;
    this.reviewActionMessage = '';
    const normalizedComment = this.newReview.comment.trim();

    const createReview = (images: string[] = [], videos: string[] = []) => {
      const reviewPayload = {
        rating: this.newReview.rating,
        comment: normalizedComment,
        images,
        videos,
      };

      this.reviewActionError = '';
      this.isSubmittingReview = true;
      this.reviewService.createReview(this.product!.product_id.toString(), reviewPayload).subscribe({
        next: () => {
          this.closeReviewForm();
          this.isSubmittingReview = false;
          this.reviewActionMessage = 'Đánh giá của bạn đã được gửi thành công.';
          this.loadReviews(this.product!.product_id.toString());
          this.loadReviewStats(this.product!.product_id.toString());
          this.loadMyReviewEligibility(this.product!.product_id.toString());
        },
        error: (err: any) => {
          console.error('Error submitting review:', err);
          this.isSubmittingReview = false;
          this.reviewActionError =
            err?.error?.message || 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.';
        },
      });
    };

    if (!this.newReview.rating) {
      this.reviewActionError = 'Vui lòng chọn số sao đánh giá.';
      return;
    }

    if (!normalizedComment) {
      this.reviewActionError = 'Vui lòng nhập nội dung đánh giá.';
      return;
    }

    if (normalizedComment.length < 10) {
      this.reviewActionError = 'Nội dung đánh giá phải có ít nhất 10 ký tự.';
      return;
    }

    if (!this.canWriteReview || this.existingUserReview) {
      this.reviewActionError = 'Bạn không đủ điều kiện để đánh giá sản phẩm này.';
      return;
    }

    if (!this.selectedReviewMedia.length) {
      createReview();
      return;
    }

    this.isSubmittingReview = true;
    this.reviewActionError = '';
    this.reviewService
      .uploadReviewMedia(this.selectedReviewMedia.map((media) => media.file))
      .subscribe({
        next: (response) => {
          createReview(response.data?.images || [], response.data?.videos || []);
        },
        error: (err: any) => {
          console.error('Error uploading review media:', err);
          this.isSubmittingReview = false;
          this.reviewActionError =
            err?.error?.message || 'Không thể tải ảnh hoặc video đánh giá. Vui lòng thử lại.';
        },
      });
  }

  // Social Sharing Methods
  shareOnFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  shareOnTwitter() {
    const text = `${this.product?.name} - ${this.product?.short_description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.toastService.success('Đã sao chép liên kết sản phẩm.');
    });
  }

  // Recently Viewed Methods
  saveToRecentlyViewed(productId: string) {
    try {
      let recentlyViewed: string[] = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

      // Remove if already exists
      recentlyViewed = recentlyViewed.filter((id) => id !== productId);

      // Add to beginning
      recentlyViewed.unshift(productId);

      // Keep only last 10
      recentlyViewed = recentlyViewed.slice(0, 10);

      localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    } catch (error) {
      console.error('Error saving to recently viewed:', error);
    }
  }

  // Get rating percentage for distribution bars
  getRatingPercentage(count: number): number {
    if (!this.reviewStats || this.reviewStats.rating_count === 0) return 0;
    return (count / this.reviewStats.rating_count) * 100;
  }

  getRatingCount(star?: number): number {
    if (star && this.reviewStats?.rating_distribution) {
      return this.reviewStats.rating_distribution[`${star}_star`] || 0;
    }
    return this.reviewStats?.rating_count || this.reviewTotal;
  }

  // Get star count for distribution (convert from '5_star' to 5)
  getStarCounts(): { star: number; count: number }[] {
    if (!this.reviewStats || !this.reviewStats.rating_distribution) return [];

    return [
      { star: 5, count: this.reviewStats.rating_distribution['5_star'] || 0 },
      { star: 4, count: this.reviewStats.rating_distribution['4_star'] || 0 },
      { star: 3, count: this.reviewStats.rating_distribution['3_star'] || 0 },
      { star: 2, count: this.reviewStats.rating_distribution['2_star'] || 0 },
      { star: 1, count: this.reviewStats.rating_distribution['1_star'] || 0 },
    ];
  }

  // Review Images Methods
  getReviewImages(review: Review): string[] {
    if (!review) return [];

    const images = review.images || review.image_urls || review.imageUrls || [];

    return images
      .map((img) => {
        if (typeof img === 'string') {
          return img;
        }
        if (typeof img === 'object' && img !== null) {
          // Try different property names
          return img.secure_url || img.url || img.path || '';
        }
        return '';
      })
      .filter((url) => url && url.trim() !== '');
  }

  getReviewVideos(review: Review): string[] {
    if (!review?.videos) return [];

    return review.videos
      .map((video) => {
        if (typeof video === 'string') {
          return video;
        }

        if (typeof video === 'object' && video !== null) {
          return video.secure_url || video.url || video.path || '';
        }

        return '';
      })
      .filter((url) => url && url.trim() !== '');
  }

  getReviewImageAlt(review: Review, index: number): string {
    return `${this.getReviewerName(review)} - Hình ảnh ${index + 1}`;
  }

  getReviewReply(
    review: Review,
  ): { content: string; responder?: string; respondedAt?: string } | null {
    if (!review) return null;
    const adminReply = (review as Review & {
      admin_reply?: {
        reply_text?: string;
        replied_by?: { full_name?: string };
        created_at?: string;
        updated_at?: string;
        is_deleted?: boolean;
      };
    }).admin_reply;

    if (adminReply?.reply_text && !adminReply.is_deleted) {
      return {
        content: adminReply.reply_text,
        responder: adminReply.replied_by?.full_name || 'Shop',
        respondedAt: adminReply.updated_at || adminReply.created_at,
      };
    }
    const response =
      review.seller_response ||
      (review as unknown as { sellerResponse?: { content?: string; responded_at?: string; responder_name?: string } })
        .sellerResponse;

    if (!response || !response.content) return null;
    return {
      content: response.content,
      responder: response.responder_name || 'Shop',
      respondedAt: response.responded_at,
    };
  }

  viewReviewImage(imageUrl: string): void {
    // Open image in a new window or lightbox
    // For now, open in new tab
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  }

  Math = Math;
}


