import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../services/contact.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class ContactComponent {
  // Loading state
  isSubmitting = false;

  // Form data
  contactForm = {
    name: '',
    phone: '',
    email: '',
    purpose: '',
    productType: '',
    message: '',
  };

  // Store information
  storeInfo = {
    name: 'PHUC',
    description:
      'Khám phá vẻ đẹp vượt thời gian của cổ phục Việt, nơi từng thiết kế được chăm chút tỉ mỉ bởi những nghệ nhân tài hoa, kết hợp hài hòa giữa giá trị truyền thống và tinh thần đương đại. Phục mong muốn mang đến những trang phục không chỉ tôn vinh vẻ đẹp hình thể, mà còn kể câu chuyện về văn hóa, lịch sử và bản sắc dân tộc — để mỗi lần khoác lên là một lần tự hào về nguồn cội.',
    contact: {
      phone: '0792 098 518',
      email: 'studio@phuc.vn',
      website: 'www.phuc.vn',
      address: '669 QL1A, Khu Phố 3, Thành phố Hồ Chí Minh',
    },
    social: {
      facebook: 'https://facebook.com/phuc',
      instagram: 'https://instagram.com/phuc',
      youtube: 'https://youtube.com/phuc',
      tiktok: 'https://tiktok.com/@phuc',
    },
  };

  constructor(
    private contactService: ContactService,
    private toastService: ToastService,
  ) {}

  // Handle form submission
  onSubmit() {
    // Validate form
    if (
      !this.contactForm.name ||
      !this.contactForm.email ||
      !this.contactForm.phone ||
      !this.contactForm.purpose ||
      !this.contactForm.message
    ) {
      this.toastService.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    // Validate purpose value
    const validPurposes = ['consult', 'rent', 'buy', 'custom'];
    if (!validPurposes.includes(this.contactForm.purpose)) {
      this.toastService.error('Vui lòng chọn mục đích liên hệ hợp lệ.');
      return;
    }

    // Validate phone number
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.contactForm.phone)) {
      this.toastService.error('Số điện thoại không hợp lệ (10-11 chữ số).');
      return;
    }

    // Validate email
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(this.contactForm.email)) {
      this.toastService.error('Email không hợp lệ.');
      return;
    }

    // Show loading state
    this.isSubmitting = true;

    // Prepare data for API
    const contactData = {
      full_name: this.contactForm.name,
      phone: this.contactForm.phone,
      email: this.contactForm.email,
      purpose: this.contactForm.purpose,
      message: this.contactForm.message,
    };

    // Debug log
    console.log('Gửi dữ liệu liên hệ:', contactData);

    // Call API
    this.contactService.sendContactMessage(contactData).subscribe({
      next: (response) => {
        // Show success message
        this.toastService.success(
          response.message ||
            'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
        );

        // Reset form
        this.contactForm = {
          name: '',
          phone: '',
          email: '',
          purpose: '',
          productType: '',
          message: '',
        };

        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error submitting contact form:', error);

        // Show error message
        const errorMessage =
          error.error?.message || 'Có lỗi xảy ra khi gửi liên hệ. Vui lòng thử lại sau.';
        this.toastService.error(errorMessage);

        this.isSubmitting = false;
      },
    });
  }
}
