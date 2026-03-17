import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProductService, Product } from '../../services/product.service';
import { ReviewService, Review } from '../../services/review.service';

interface CustomerReviewSpotlight {
  product: Product;
  reviews: Review[];
}

interface CustomerReviewSlide {
  product: Product;
  review: Review;
}

interface CustomerVoiceBackgroundPalette {
  base: string;
  soft: string;
  rgb: string;
}

interface LookbookFrame {
  image: string;
  title: string;
  caption: string;
  alt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') private heroVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('brandShowcase') private brandShowcase?: ElementRef<HTMLElement>;
  featuredProducts: Product[] = [];
  newArrivalProducts: Product[] = [];
  customerReviewSpotlights: CustomerReviewSpotlight[] = [];
  customerReviewSlides: CustomerReviewSlide[] = [];
  quickShopCosmeticProducts: Product[] = [];
  quickShopSkincareProducts: Product[] = [];
  currentCustomerReviewSlide = 0;
  currentShowcaseSlide = 0;
  currentCustomerVoiceBackgroundBase = '#eef2fb';
  currentCustomerVoiceBackgroundSoft = '#e8eefb';
  currentCustomerVoiceBackgroundRgb = '187, 203, 231';
  isBrandShowcaseVisible = false;
  readonly reviewStars: number[] = [1, 2, 3, 4, 5];
  readonly showcaseSlides: string[] = [
    'assets/images/pos1.jpg',
    'assets/images/pos2.jpg',
    'assets/images/pos3.jpg',
    'assets/images/pos4.jpg',
  ];
  isLoading = false;
  isLoadingCustomerReviewSpotlights = false;
  loadError: string | null = null;
  heroVideoFailed = false;
  readonly reviewLookbookFrames: LookbookFrame[] = [
    {
      image: 'assets/images/pos1.jpg',
      title: 'Nhật Bình',
      caption: 'Là trang phục cung đình dành cho quý tộc triều Nguyễn, biểu trưng cho vẻ đẹp thanh cao và phẩm vị hoàng gia.',
      alt: 'Lookbook image pos1',
    },
    {
      image: 'assets/images/pos2.jpg',
      title: 'Ngũ Thân Tay Chẽn',
      caption: 'Là trang phục thời Nguyễn tuợng trưng cho đạo lý ngũ thường, thể hiện sự trang nghiêm và nền nếp xưa.',
      alt: 'Lookbook image pos2',
    },
    {
      image: 'assets/images/pos3.jpg',
      title: 'Áo Tấc',
      caption: 'Là lễ phục ngũ thân tay phụng gắn liền với sĩ tử và quan lại thời Nguyễn, dung hào vẻ đẹp đoan trang và khí chât học giả.',
      alt: 'Lookbook image pos3',
    },
    {
      image: 'assets/images/pos4.jpg',
      title: 'Giao Lĩnh',
      caption: 'Là áo cổ chéo tay thụng gắn liền với hình ảnh phụ nữ thời Lý - Trần, tôn lên vẻ đẹp nền nã, thanh cao, và tinh thần nền văn hoá Việt.',
      alt: 'Lookbook image pos4',
    },
    {
      image: 'assets/images/ananas-collab.png',
      title: 'Ananas Collab',
      caption: 'Một frame collab để mở rộng tinh thần, kết nối cổ phục với ngữ cảnh đương đại.',
      alt: 'Lookbook image ananas collab',
    },
  ];
  readonly ribbonWords: string[] = [
    'PHUC ATELIER',
    'BO SUU TAP 2026',
    'TRANG PHUC VIET',
    'THIET KE THU CONG',
    'SAN PHAM BAN CHAY',
  ];
  readonly preferredCustomerReviewProductNames: string[] = [
    'Áo Tấc Lụa Trượt Chéo Loại 1',
    'Nhật Bình Lan Hồ Điệp Hồ Điệp Hồng',
    'Áo Ngũ Thân Vải Sa Hàn Nam',
    'Nhật Bình Hoa Đào Đỏ',
    'Nhật Bình Gấm Đen Mã 002',
    'Thuyền Hài Thêu Hoa Anh Đào - Hồng',
  ];

  constructor(
    private productService: ProductService,
    private reviewService: ReviewService,
  ) {}

  ngOnInit(): void {
    this.loadFeaturedProducts();
    this.startShowcaseSlider();
  }

  ngAfterViewInit(): void {
    this.ensureHeroVideoPlayback();
    this.initHomeScrollReveal();
    this.observeBrandShowcase();
  }

  ngOnDestroy(): void {
    if (this.showcaseSliderTimer) {
      clearInterval(this.showcaseSliderTimer);
      this.showcaseSliderTimer = null;
    }

    if (this.brandShowcaseObserver) {
      this.brandShowcaseObserver.disconnect();
      this.brandShowcaseObserver = null;
    }

    this.cleanupHomeScrollReveal();
    this.clearBrandShowcaseVisibilityListeners();
    this.clearHeroVideoInteractionListeners();
  }

  loadFeaturedProducts(): void {
    this.isLoading = true;
    this.loadError = null;

    forkJoin({
      bestSellers: this.productService.getAllProducts({
        page: 1,
        limit: 24,
        sortBy: 'sold_count',
        sortOrder: 'desc',
        status: 'active',
      }),
      newArrivals: this.productService.getAllProducts({
        page: 1,
        limit: 24,
        sortBy: 'created_at',
        sortOrder: 'desc',
        status: 'active',
      }),
    }).subscribe({
      next: ({ bestSellers, newArrivals }) => {
        const bestSellerResponse = bestSellers as any;
        const newArrivalResponse = newArrivals as any;
        this.featuredProducts =
          bestSellerResponse?.data?.items || bestSellerResponse?.data?.products || [];
        this.newArrivalProducts =
          newArrivalResponse?.data?.items || newArrivalResponse?.data?.products || [];
        this.updateQuickShopProducts();
        this.loadCustomerReviewSpotlights();
        this.isLoading = false;
        this.queueHomeRevealRefresh();
      },
      error: (error) => {
        if (error.status === 0) {
          this.loadError = 'Khong the ket noi may chu. Vui long kiem tra backend da chay.';
        } else if (error.status >= 500) {
          this.loadError = 'May chu dang tam thoi qua tai. Vui long thu lai sau.';
        } else {
          this.loadError = error.error?.message || 'Khong the tai san pham luc nay.';
        }
        this.featuredProducts = [];
        this.newArrivalProducts = [];
        this.customerReviewSpotlights = [];
        this.customerReviewSlides = [];
        this.resetCustomerVoiceBackground();
        this.updateQuickShopProducts();
        this.isLoading = false;
        this.queueHomeRevealRefresh();
      },
    });
  }

  getFinalPrice(product: Product): number {
    return this.productService.getFinalPrice(product);
  }

  getDiscountPercentage(product: Product): number {
    return this.productService.getDiscountPercentage(product);
  }

  getImageUrl(product: Product): string {
    if (product.thumbnail) {
      return product.thumbnail;
    }

    const candidates = product.images?.length ? product.images : product.gallery;
    if (candidates && candidates.length > 0) {
      const firstImage = candidates[0] as any;
      return typeof firstImage === 'string'
        ? firstImage
        : firstImage?.url || 'assets/images/placeholder.jpg';
    }

    return 'assets/images/placeholder.jpg';
  }

  trackByProduct(index: number, product: Product): string | number {
    return product.product_id || product._id || index;
  }

  trackByImage(index: number): number {
    return index;
  }

  goToShowcaseSlide(index: number): void {
    this.currentShowcaseSlide = index;
  }

  goToCustomerReviewSlide(index: number): void {
    if (index < 0 || index >= this.customerReviewSlides.length) return;
    this.setCurrentCustomerReviewSlide(index);
  }

  previousCustomerReviewSlide(): void {
    if (this.customerReviewSlides.length < 2) return;

    this.setCurrentCustomerReviewSlide(
      (this.currentCustomerReviewSlide - 1 + this.customerReviewSlides.length) %
        this.customerReviewSlides.length,
    );
  }

  nextCustomerReviewSlide(): void {
    if (this.customerReviewSlides.length < 2) return;

    this.setCurrentCustomerReviewSlide(
      (this.currentCustomerReviewSlide + 1) % this.customerReviewSlides.length,
    );
  }

  get popularNewArrivalProducts(): Product[] {
    return this.newArrivalProducts.slice(0, 6);
  }

  get bestSellerProducts(): Product[] {
    return this.featuredProducts.slice(0, 8);
  }

  get orderedReviewLookbookFrames(): LookbookFrame[] {
    const collabIndex = this.reviewLookbookFrames.findIndex((frame) =>
      frame.image.includes('ananas-collab'),
    );

    if (collabIndex === -1 || collabIndex === 2) {
      return this.reviewLookbookFrames;
    }

    const orderedFrames = [...this.reviewLookbookFrames];
    const [collabFrame] = orderedFrames.splice(collabIndex, 1);
    orderedFrames.splice(2, 0, collabFrame);
    return orderedFrames;
  }

  get activeCustomerReviewSlide(): CustomerReviewSlide | null {
    return this.customerReviewSlides[this.currentCustomerReviewSlide] ?? null;
  }

  getReviewAuthor(review: Review): string {
    return review.user?.fullName || review.user?.name || review.user_name || 'Khách hàng';
  }

  getReviewInitials(review: Review): string {
    return this.reviewService.getInitials(this.getReviewAuthor(review));
  }

  getReviewTimeAgo(review: Review): string {
    const reviewDate = review.created_at || review.createdAt;
    if (!reviewDate) return 'Gần đây';
    return this.reviewService.getTimeAgo(reviewDate);
  }

  private updateQuickShopProducts(): void {
    const productPool =
      this.newArrivalProducts.length > 0 ? this.newArrivalProducts : this.featuredProducts;
    this.quickShopCosmeticProducts = this.getQuickShopProducts(productPool, 0);
    this.quickShopSkincareProducts = this.getQuickShopProducts(productPool, 3);
  }

  private getQuickShopProducts(products: Product[], offset: number): Product[] {
    const total = products.length;
    if (!total) return [];

    const count = Math.min(3, total);
    const previews: Product[] = [];

    for (let i = 0; i < count; i += 1) {
      previews.push(products[(offset + i) % total]);
    }

    return previews;
  }

  private loadCustomerReviewSpotlights(): void {
    this.isLoadingCustomerReviewSpotlights = true;

    forkJoin(
      this.preferredCustomerReviewProductNames.map((productName) =>
        this.productService
          .getAllProducts({
            page: 1,
            limit: 12,
            search: this.getPreferredProductSearchTerm(productName),
            status: 'active',
          })
          .pipe(
            map((response) => {
              const anyResponse = response as any;
              const items = anyResponse?.data?.items || anyResponse?.data?.products || [];
              return this.pickPreferredCustomerReviewProduct(items, productName);
            }),
            catchError(() =>
              of(null),
            ),
          ),
      ),
    ).subscribe({
      next: (products) => {
        const candidateProducts = products.reduce<Product[]>((acc, product) => {
          if (!product) return acc;

          const productKey = String(product.product_id || product._id || product.name);
          if (acc.some((item) => String(item.product_id || item._id || item.name) === productKey)) {
            return acc;
          }

          acc.push(product);
          return acc;
        }, []);

        if (!candidateProducts.length) {
          this.customerReviewSpotlights = [];
          this.customerReviewSlides = [];
          this.resetCustomerVoiceBackground();
          this.currentCustomerReviewSlide = 0;
          this.isLoadingCustomerReviewSpotlights = false;
          this.queueHomeRevealRefresh();
          return;
        }

        forkJoin(
          candidateProducts.map((product) =>
            this.reviewService
              .getProductReviews(product.product_id.toString(), 1, 3, 'helpful_count', 'desc', 5)
              .pipe(
                map((response) => {
                  const data = response?.data;
                  const reviews = (data?.reviews || data?.items || []).filter(
                    (review: Review) => review.rating === 5,
                  );

                  return {
                    product,
                    reviews: reviews.slice(0, 1),
                  } as CustomerReviewSpotlight;
                }),
                catchError(() =>
                  of({
                    product,
                    reviews: [],
                  } as CustomerReviewSpotlight),
                ),
              ),
          ),
        ).subscribe({
          next: (results) => {
            this.customerReviewSpotlights = results.filter((item) => item.reviews.length > 0);
            this.customerReviewSlides = this.customerReviewSpotlights.flatMap((item) =>
              item.reviews.map((review) => ({
                product: item.product,
                review,
              })),
            );
            this.preloadCustomerVoiceBackgrounds();
            this.setCurrentCustomerReviewSlide(this.getDefaultCustomerReviewSlideIndex());
            this.isLoadingCustomerReviewSpotlights = false;
            this.queueHomeRevealRefresh();
          },
          error: () => {
            this.customerReviewSpotlights = [];
            this.customerReviewSlides = [];
            this.resetCustomerVoiceBackground();
            this.currentCustomerReviewSlide = 0;
            this.isLoadingCustomerReviewSpotlights = false;
            this.queueHomeRevealRefresh();
          },
        });
      },
      error: () => {
        this.customerReviewSpotlights = [];
        this.customerReviewSlides = [];
        this.resetCustomerVoiceBackground();
        this.currentCustomerReviewSlide = 0;
        this.isLoadingCustomerReviewSpotlights = false;
        this.queueHomeRevealRefresh();
      },
    });
  }

  private getPreferredProductSearchTerm(productName: string): string {
    const words = productName.replace(/\s*-\s*/g, ' ').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, Math.min(5, words.length)).join(' ');
  }

  private pickPreferredCustomerReviewProduct(
    products: Product[],
    preferredName: string,
  ): Product | null {
    if (!products.length) {
      return null;
    }

    const normalizedPreferredName = this.normalizeText(preferredName);
    const exactMatch = products.find(
      (product) => this.normalizeText(product.name) === normalizedPreferredName,
    );

    if (exactMatch) {
      return exactMatch;
    }

    return [...products]
      .sort(
        (left, right) =>
          this.getPreferredNameMatchScore(right.name, preferredName) -
          this.getPreferredNameMatchScore(left.name, preferredName),
      )
      .find((product) => this.getPreferredNameMatchScore(product.name, preferredName) > 0) || null;
  }

  private getPreferredNameMatchScore(productName: string, preferredName: string): number {
    const normalizedProductName = this.normalizeText(productName);
    const normalizedPreferredName = this.normalizeText(preferredName);

    if (normalizedProductName === normalizedPreferredName) {
      return 1000;
    }

    let score = 0;

    if (
      normalizedProductName.includes(normalizedPreferredName) ||
      normalizedPreferredName.includes(normalizedProductName)
    ) {
      score += 300;
    }

    for (const token of normalizedPreferredName.split(' ')) {
      if (token && normalizedProductName.includes(token)) {
        score += 10;
      }
    }

    return score;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .toLowerCase();
  }

  private showcaseSliderTimer: ReturnType<typeof setInterval> | null = null;
  private brandShowcaseObserver: IntersectionObserver | null = null;
  private brandShowcaseViewportCleanup: Array<() => void> = [];
  private homeRevealObserver: IntersectionObserver | null = null;
  private homeRevealMutationObserver: MutationObserver | null = null;
  private homeRevealRefreshFrame: number | null = null;
  private readonly observedRevealElements = new WeakSet<HTMLElement>();
  private heroVideoInteractionCleanup: Array<() => void> = [];
  private readonly customerVoiceBackgroundCache = new Map<string, CustomerVoiceBackgroundPalette>();
  private readonly customerVoiceBackgroundTasks = new Map<
    string,
    Promise<CustomerVoiceBackgroundPalette>
  >();

  private setCurrentCustomerReviewSlide(index: number): void {
    this.currentCustomerReviewSlide = index;
    this.updateCustomerVoiceBackground();
  }

  private getDefaultCustomerReviewSlideIndex(): number {
    return this.customerReviewSlides.length > 1 ? 1 : 0;
  }

  private preloadCustomerVoiceBackgrounds(): void {
    for (const slide of this.customerReviewSlides) {
      void this.ensureCustomerVoiceBackground(slide.product);
    }
  }

  private updateCustomerVoiceBackground(): void {
    const activeSlide = this.activeCustomerReviewSlide;
    if (!activeSlide) {
      this.resetCustomerVoiceBackground();
      return;
    }

    const imageUrl = this.getImageUrl(activeSlide.product);
    const cachedPalette = this.customerVoiceBackgroundCache.get(imageUrl);
    if (cachedPalette) {
      this.applyCustomerVoiceBackground(cachedPalette);
      return;
    }

    void this.ensureCustomerVoiceBackground(activeSlide.product).then((palette) => {
      const currentSlide = this.activeCustomerReviewSlide;
      if (!currentSlide || this.getImageUrl(currentSlide.product) !== imageUrl) {
        return;
      }

      this.applyCustomerVoiceBackground(palette);
    });
  }

  private ensureCustomerVoiceBackground(product: Product): Promise<CustomerVoiceBackgroundPalette> {
    const imageUrl = this.getImageUrl(product);
    const cachedPalette = this.customerVoiceBackgroundCache.get(imageUrl);
    if (cachedPalette) {
      return Promise.resolve(cachedPalette);
    }

    const existingTask = this.customerVoiceBackgroundTasks.get(imageUrl);
    if (existingTask) {
      return existingTask;
    }

    const task = this.loadCustomerVoiceBackgroundPalette(imageUrl)
      .then((palette) => {
        this.customerVoiceBackgroundCache.set(imageUrl, palette);
        this.customerVoiceBackgroundTasks.delete(imageUrl);
        return palette;
      })
      .catch(() => {
        const fallbackPalette = this.getFallbackCustomerVoiceBackgroundPalette();
        this.customerVoiceBackgroundCache.set(imageUrl, fallbackPalette);
        this.customerVoiceBackgroundTasks.delete(imageUrl);
        return fallbackPalette;
      });

    this.customerVoiceBackgroundTasks.set(imageUrl, task);
    return task;
  }

  private loadCustomerVoiceBackgroundPalette(
    imageUrl: string,
  ): Promise<CustomerVoiceBackgroundPalette> {
    const fallbackPalette = this.getFallbackCustomerVoiceBackgroundPalette();

    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';

      image.onload = () => {
        try {
          resolve(this.buildCustomerVoiceBackgroundPalette(image));
        } catch {
          resolve(fallbackPalette);
        }
      };

      image.onerror = () => resolve(fallbackPalette);
      image.src = imageUrl;
    });
  }

  private buildCustomerVoiceBackgroundPalette(
    image: HTMLImageElement,
  ): CustomerVoiceBackgroundPalette {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return this.getFallbackCustomerVoiceBackgroundPalette();
    }

    const size = 24;
    canvas.width = size;
    canvas.height = size;
    context.drawImage(image, 0, 0, size, size);

    const imageData = context.getImageData(0, 0, size, size).data;
    const dominantColor =
      this.pickDominantCustomerVoiceColor(imageData) ?? { r: 187, g: 203, b: 231 };

    return this.createCustomerVoiceBackgroundPalette(dominantColor);
  }

  private pickDominantCustomerVoiceColor(
    imageData: Uint8ClampedArray,
  ): { r: number; g: number; b: number } | null {
    return (
      this.collectDominantCustomerVoiceColor(imageData, true) ??
      this.collectDominantCustomerVoiceColor(imageData, false)
    );
  }

  private collectDominantCustomerVoiceColor(
    imageData: Uint8ClampedArray,
    ignoreLightPixels: boolean,
  ): { r: number; g: number; b: number } | null {
    const buckets = new Map<
      string,
      { r: number; g: number; b: number; weight: number; count: number }
    >();

    for (let index = 0; index < imageData.length; index += 4) {
      const alpha = imageData[index + 3];
      if (alpha < 160) {
        continue;
      }

      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const { saturation, lightness } = this.getCustomerVoiceColorMetrics(r, g, b);

      if (ignoreLightPixels) {
        if (lightness > 0.84 && saturation < 0.24) {
          continue;
        }

        if (lightness > 0.94) {
          continue;
        }
      }

      const bucketKey = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const existingBucket = buckets.get(bucketKey) ?? { r: 0, g: 0, b: 0, weight: 0, count: 0 };
      const weight = 1 + saturation * 2.4 + Math.max(0, 0.88 - Math.abs(lightness - 0.52));

      existingBucket.r += r * weight;
      existingBucket.g += g * weight;
      existingBucket.b += b * weight;
      existingBucket.weight += weight;
      existingBucket.count += 1;

      buckets.set(bucketKey, existingBucket);
    }

    let bestBucket: { r: number; g: number; b: number; weight: number; count: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!bestBucket || bucket.weight > bestBucket.weight) {
        bestBucket = bucket;
      }
    }

    if (!bestBucket || bestBucket.weight <= 0) {
      return null;
    }

    return {
      r: Math.round(bestBucket.r / bestBucket.weight),
      g: Math.round(bestBucket.g / bestBucket.weight),
      b: Math.round(bestBucket.b / bestBucket.weight),
    };
  }

  private getCustomerVoiceColorMetrics(
    r: number,
    g: number,
    b: number,
  ): { saturation: number; lightness: number } {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;

    if (max === min) {
      return { saturation: 0, lightness };
    }

    const diff = max - min;
    const saturation = diff / (1 - Math.abs(2 * lightness - 1));
    return { saturation, lightness };
  }

  private createCustomerVoiceBackgroundPalette(color: {
    r: number;
    g: number;
    b: number;
  }): CustomerVoiceBackgroundPalette {
    const base = this.mixCustomerVoiceColor(color, { r: 255, g: 255, b: 255 }, 0.58);
    const soft = this.mixCustomerVoiceColor(color, { r: 255, g: 255, b: 255 }, 0.76);

    return {
      base: this.customerVoiceRgbToCss(base),
      soft: this.customerVoiceRgbToCss(soft),
      rgb: `${color.r}, ${color.g}, ${color.b}`,
    };
  }

  private mixCustomerVoiceColor(
    source: { r: number; g: number; b: number },
    target: { r: number; g: number; b: number },
    targetRatio: number,
  ): { r: number; g: number; b: number } {
    const sourceRatio = 1 - targetRatio;

    return {
      r: Math.round(source.r * sourceRatio + target.r * targetRatio),
      g: Math.round(source.g * sourceRatio + target.g * targetRatio),
      b: Math.round(source.b * sourceRatio + target.b * targetRatio),
    };
  }

  private customerVoiceRgbToCss(color: { r: number; g: number; b: number }): string {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  private applyCustomerVoiceBackground(palette: CustomerVoiceBackgroundPalette): void {
    this.currentCustomerVoiceBackgroundBase = palette.base;
    this.currentCustomerVoiceBackgroundSoft = palette.soft;
    this.currentCustomerVoiceBackgroundRgb = palette.rgb;
  }

  private resetCustomerVoiceBackground(): void {
    this.applyCustomerVoiceBackground(this.getFallbackCustomerVoiceBackgroundPalette());
  }

  private getFallbackCustomerVoiceBackgroundPalette(): CustomerVoiceBackgroundPalette {
    return {
      base: '#eef2fb',
      soft: '#e8eefb',
      rgb: '187, 203, 231',
    };
  }

  private startShowcaseSlider(): void {
    if (this.showcaseSlides.length < 2) return;

    if (this.showcaseSliderTimer) {
      clearInterval(this.showcaseSliderTimer);
    }

    this.showcaseSliderTimer = setInterval(() => {
      this.currentShowcaseSlide = (this.currentShowcaseSlide + 1) % this.showcaseSlides.length;
    }, 3500);
  }

  private initHomeScrollReveal(): void {
    const root = this.getHomeRootElement();
    if (!root) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.revealAllHomeTargets();
      return;
    }

    this.homeRevealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.intersectionRatio < 0.12) {
            continue;
          }

          const target = entry.target as HTMLElement;
          target.classList.add('is-revealed');
          this.homeRevealObserver?.unobserve(target);
        }
      },
      {
        threshold: [0, 0.12, 0.24],
        rootMargin: '0px 0px -10% 0px',
      },
    );

    this.refreshHomeRevealTargets();

    if (typeof MutationObserver !== 'undefined') {
      this.homeRevealMutationObserver = new MutationObserver(() => {
        this.queueHomeRevealRefresh();
      });
      this.homeRevealMutationObserver.observe(root, {
        childList: true,
        subtree: true,
      });
    }
  }

  private getHomeRootElement(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>('app-home .home-page') ??
      document.querySelector<HTMLElement>('.home-page')
    );
  }

  private queueHomeRevealRefresh(): void {
    if (this.homeRevealRefreshFrame !== null) {
      return;
    }

    this.homeRevealRefreshFrame = requestAnimationFrame(() => {
      this.homeRevealRefreshFrame = null;
      this.refreshHomeRevealTargets();
    });
  }

  private refreshHomeRevealTargets(): void {
    const root = this.getHomeRootElement();
    if (!root) {
      return;
    }

    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!this.homeRevealObserver) {
      targets.forEach((target) => target.classList.add('is-revealed'));
      return;
    }

    targets.forEach((target) => {
      if (target.classList.contains('is-revealed') || this.observedRevealElements.has(target)) {
        return;
      }

      this.observedRevealElements.add(target);
      this.homeRevealObserver?.observe(target);
    });
  }

  private revealAllHomeTargets(): void {
    const root = this.getHomeRootElement();
    if (!root) {
      return;
    }

    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((target) => {
      target.classList.add('is-revealed');
    });
  }

  private cleanupHomeScrollReveal(): void {
    if (this.homeRevealObserver) {
      this.homeRevealObserver.disconnect();
      this.homeRevealObserver = null;
    }

    if (this.homeRevealMutationObserver) {
      this.homeRevealMutationObserver.disconnect();
      this.homeRevealMutationObserver = null;
    }

    if (this.homeRevealRefreshFrame !== null) {
      cancelAnimationFrame(this.homeRevealRefreshFrame);
      this.homeRevealRefreshFrame = null;
    }
  }

  private observeBrandShowcase(): void {
    const showcase = this.brandShowcase?.nativeElement;
    if (!showcase) {
      return;
    }

    const revealIfVisible = () => {
      if (this.isBrandShowcaseVisible) {
        return;
      }

      const rect = showcase.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleRatio = visibleHeight / Math.max(rect.height, 1);

      if (visibleRatio >= 0.18 || (rect.top <= viewportHeight * 0.82 && rect.bottom >= 0)) {
        this.revealBrandShowcase();
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      this.revealBrandShowcase();
      return;
    }

    if (this.brandShowcaseObserver) {
      this.brandShowcaseObserver.disconnect();
    }

    this.brandShowcaseObserver = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some(
          (entry) => entry.isIntersecting || entry.intersectionRatio >= 0.12,
        );
        if (isIntersecting) {
          this.revealBrandShowcase();
        }
      },
      {
        threshold: [0, 0.12, 0.25],
        rootMargin: '0px 0px -12% 0px',
      },
    );

    this.brandShowcaseObserver.observe(showcase);

    const passiveOptions = { passive: true } as AddEventListenerOptions;
    window.addEventListener('scroll', revealIfVisible, passiveOptions);
    window.addEventListener('resize', revealIfVisible, passiveOptions);
    this.brandShowcaseViewportCleanup.push(() => {
      window.removeEventListener('scroll', revealIfVisible);
    });
    this.brandShowcaseViewportCleanup.push(() => {
      window.removeEventListener('resize', revealIfVisible);
    });

    requestAnimationFrame(revealIfVisible);
  }

  private revealBrandShowcase(): void {
    if (this.isBrandShowcaseVisible) {
      return;
    }

    this.isBrandShowcaseVisible = true;

    if (this.brandShowcaseObserver) {
      this.brandShowcaseObserver.disconnect();
      this.brandShowcaseObserver = null;
    }

    this.clearBrandShowcaseVisibilityListeners();
  }

  private clearBrandShowcaseVisibilityListeners(): void {
    for (const cleanup of this.brandShowcaseViewportCleanup) {
      cleanup();
    }
    this.brandShowcaseViewportCleanup = [];
  }

  private ensureHeroVideoPlayback(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) return;

    this.clearHeroVideoInteractionListeners();
    video.controls = false;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;

    let hasAttemptedPlayback = false;
    const playVideo = (muted: boolean): Promise<void> => {
      video.muted = muted;
      video.defaultMuted = muted;
      video.volume = muted ? 0 : 1;

      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        return playPromise.then(() => undefined);
      }

      return Promise.resolve();
    };

    const tryPlay = () => {
      if (hasAttemptedPlayback) return;
      hasAttemptedPlayback = true;

      playVideo(false).catch(() => {
        this.registerHeroVideoInteractionFallback(video);
        void playVideo(true).catch(() => undefined);
      });
    };

    const handlePlaybackError = () => {
      this.clearHeroVideoInteractionListeners();
      this.heroVideoFailed = true;
    };

    video.addEventListener('loadeddata', tryPlay, { once: true });
    video.addEventListener('canplay', tryPlay, { once: true });
    video.addEventListener('error', handlePlaybackError, { once: true });

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
    }
  }

  private registerHeroVideoInteractionFallback(video: HTMLVideoElement): void {
    this.clearHeroVideoInteractionListeners();

    const resumeWithSound = () => {
      this.clearHeroVideoInteractionListeners();
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;

      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          this.heroVideoFailed = true;
        });
      }
    };

    const interactionEvents: Array<keyof DocumentEventMap> = [
      'pointerdown',
      'touchstart',
      'keydown',
    ];
    for (const eventName of interactionEvents) {
      document.addEventListener(eventName, resumeWithSound, { once: true });
      this.heroVideoInteractionCleanup.push(() => {
        document.removeEventListener(eventName, resumeWithSound);
      });
    }
  }

  private clearHeroVideoInteractionListeners(): void {
    for (const cleanup of this.heroVideoInteractionCleanup) {
      cleanup();
    }

    this.heroVideoInteractionCleanup = [];
  }
}
