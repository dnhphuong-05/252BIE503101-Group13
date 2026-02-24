import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-recently-viewed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">
          <i class="fas fa-history"></i>
          Đã xem gần đây
        </h1>
      </div>
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-history"></i></div>
        <h3>Chưa xem sản phẩm nào</h3>
        <p>Lịch sử xem sản phẩm của bạn sẽ hiển thị ở đây</p>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        animation: fadeIn 0.4s ease-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .page-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid rgba(139, 38, 53, 0.1);
      }
      .page-title {
        font-family: 'Noto Serif', 'Georgia', serif;
        font-size: 32px;
        font-weight: 700;
        color: #8b2635;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }
      .empty-icon {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: linear-gradient(
          135deg,
          rgba(139, 38, 53, 0.05) 0%,
          rgba(139, 38, 53, 0.1) 100%
        );
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
      }
      .empty-icon i {
        font-size: 48px;
        color: rgba(139, 38, 53, 0.3);
      }
      .empty-state h3 {
        font-family: 'Noto Serif', 'Georgia', serif;
        font-size: 24px;
        font-weight: 700;
        color: #8b2635;
        margin: 0 0 12px;
      }
      .empty-state p {
        font-family: 'Noto Sans', sans-serif;
        font-size: 15px;
        color: #666666;
        margin: 0;
      }
    `,
  ],
})
export class ProfileRecentlyViewedComponent {}
