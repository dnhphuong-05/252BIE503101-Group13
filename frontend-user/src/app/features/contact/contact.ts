import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class ContactComponent {
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
    name: 'MAHA GAURI',
    description:
      'Discover the timeless elegance of authentic Indian sarees. Each piece is carefully handcrafted by skilled artisans, featuring intricate designs and premium fabrics that celebrate traditional Indian craftsmanship. We are committed to bringing you the finest collection of sarees for every special occasion.',
    contact: {
      phone: '+84 (028) 3724 5678',
      email: 'contact@mahagauri.vn',
      website: 'www.mahagauri.vn',
      address: '669 QL1A, Khu Phố 3, Thủ Đức, TP. Hồ Chí Minh',
    },
    social: {
      facebook: 'https://facebook.com/mahagauri',
      twitter: 'https://twitter.com/mahagauri',
      instagram: 'https://instagram.com/mahagauri',
      youtube: 'https://youtube.com/mahagauri',
    },
  };

  // Handle form submission
  onSubmit() {
    if (this.contactForm.name && this.contactForm.email && this.contactForm.message) {
      console.log('Form submitted:', this.contactForm);
      alert('Thank you for contacting us! We will get back to you soon.');
      // Reset form
      this.contactForm = {
        name: '',
        phone: '',
        email: '',
        purpose: '',
        productType: '',
        message: '',
      };
    } else {
      alert('Please fill in all fields.');
    }
  }
}
