import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class AboutComponent {
  services = [
    {
      icon: 'fas fa-cut',
      title: 'May Đo',
      description: 'Thiết kế riêng theo số đo',
      image: 'assets/images/pos1.jpg',
    },
    {
      icon: 'fas fa-store',
      title: 'Cho Thuê',
      description: 'Trang phục cổ truyền',
      image: 'assets/images/pos2.jpg',
    },
    {
      icon: 'fas fa-comments',
      title: 'Tư Vấn',
      description: 'Phối đồ chuyên nghiệp',
      image: 'assets/images/pos3.jpg',
    },
    {
      icon: 'fas fa-camera',
      title: 'Chụp Ảnh',
      description: 'Lưu giữ khoảnh khắc',
      image: 'assets/images/pos4.jpg',
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Bảo Hành',
      description: 'Cam kết chất lượng',
      image: 'assets/images/pos1.jpg',
    },
  ];

  stats = [
    { number: '10,000+', label: 'Giờ nghiên cứu các bản rập cổ tại bảo tàng' },
    { number: '50+', label: 'Nghệ nhân may đo thủ công lành nghề' },
    {
      number: '15',
      label: 'Loại lụa tơ tằm thượng hạng từ làng nghề truyền thống',
    },
  ];

  costumes = [
    {
      name: 'Nhật Bình',
      period: 'Thời Lý - Trần (1009-1400)',
      description: 'Trang phục của tầng lớp quý tộc và quan lại',
    },
    {
      name: 'Áo Tấc',
      period: 'Thời Nguyễn (1802-1945)',
      description: 'Lễ phục của hoàng gia và triều đình',
    },
    {
      name: 'Giao Lĩnh',
      period: 'Thời Hùng Vương - Đinh',
      description: 'Trang phục cổ xưa nhất của dân tộc Việt',
    },
  ];

  process = [
    {
      step: 1,
      title: 'Khảo cứu',
      description:
        'Tư vấn khách hàng về ý nghĩa lịch sử của từng loại áo để chọn bộ đồ phù hợp nhất với khí chất.',
    },
    {
      step: 2,
      title: 'Đo ni đóng giày',
      description:
        'Lấy số đo chuẩn xác, đảm bảo phom dáng áo ngũ thân, áo giao lĩnh tôn vinh vóc dáng người Việt.',
    },
    {
      step: 3,
      title: 'Tinh hoa chế tác',
      description:
        'May thủ công kết hợp thêu tay tỉ mỉ các họa tiết mây, sóng, phượng theo đúng điển tích triều đình.',
    },
  ];
}
