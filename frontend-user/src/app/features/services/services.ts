import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Service {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css'],
})
export class ServicesComponent implements OnInit, OnDestroy {
  services: Service[] = [
    {
      title: 'Cổ Phục Truyền Thống',
      description:
        'Thiết kế và cung cấp các mẫu cổ phục Việt Nam như Nhật Bình, Áo Tấc, Ngũ Thân, Giao Lĩnh dựa trên tư liệu lịch sử.',
      icon: 'assets/icons/traditional.png',
    },
    {
      title: 'May Đo Theo Yêu Cầu',
      description:
        'May đo cổ phục theo số đo cá nhân, bối cảnh sử dụng và yêu cầu thẩm mỹ hiện đại.',
      icon: 'assets/icons/tailor.png',
    },
    {
      title: 'Dịch Vụ Cho Thuê',
      description:
        'Cho thuê cổ phục trọn gói cho chụp ảnh, sự kiện, biểu diễn, lễ hội và dự án sáng tạo.',
      icon: 'assets/icons/rental.png',
    },
    {
      title: 'Thiết Kế & Truyền Thông',
      description:
        'Thiết kế đồ họa, minh họa, bộ nhận diện và nội dung truyền thông lấy cảm hứng từ cổ phục Việt.',
      icon: 'assets/icons/design.png',
    },
  ];

  // Slider functionality
  heroImages: string[] = [
    'assets/images/brochure-mat-truoc.png',
    'assets/images/mat-sau-brochure.png',
  ];
  currentSlideIndex: number = 0;
  slideDirection: string = 'next';
  private autoSlideInterval: any;

  ngOnInit() {
    this.startAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 3000); // 3 giây
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  nextSlide() {
    this.slideDirection = 'next';
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.heroImages.length;
  }

  prevSlide() {
    this.slideDirection = 'next'; // Vẫn luôn lướt từ phải sang trái
    this.currentSlideIndex =
      (this.currentSlideIndex - 1 + this.heroImages.length) % this.heroImages.length;
  }

  goToSlide(index: number) {
    this.slideDirection = 'next';
    this.currentSlideIndex = index;
  }
}
