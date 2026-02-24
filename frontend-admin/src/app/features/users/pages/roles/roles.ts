import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RoleRow {
  role: string;
  description: string;
  permissions: string[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesComponent {
  protected readonly roles: RoleRow[] = [
    {
      role: 'Super Admin',
      description: 'Toàn quyền quản trị, quản lý người dùng và dữ liệu nhạy cảm.',
      permissions: ['Users', 'Roles & Permissions', 'Delete vĩnh viễn', 'Cấu hình hệ thống'],
    },
    {
      role: 'Admin',
      description: 'Quản lý sản phẩm, đơn hàng, blog, comments, contacts.',
      permissions: ['Products', 'Orders', 'Blog', 'Comments', 'Contacts'],
    },
    {
      role: 'Staff',
      description: 'Thực thi nghiệp vụ được phân công.',
      permissions: ['Orders', 'Contacts', 'Comments'],
    },
  ];
}
