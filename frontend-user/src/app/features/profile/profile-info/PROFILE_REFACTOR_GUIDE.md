# Profile Page Refactor - Hướng dẫn

## Tổng quan

Trang User Profile đã được refactor hoàn toàn theo chuẩn E-commerce hiện đại với layout 2 cột và component hóa.

## Cấu trúc mới

### 1. Layout 2 cột (Desktop)

- **Sidebar trái (23%)**: Avatar + tên + menu tài khoản
- **Main content phải (77%)**: Thông tin chi tiết

### 2. Components đã tạo

#### ProfileSidebarComponent

- **Path**: `components/profile-sidebar/`
- **Chức năng**:
  - Hiển thị avatar người dùng
  - Tên và email
  - Badge member
  - Menu điều hướng (Tổng quan, Thông tin cơ bản, Bảo mật, Số đo, Địa chỉ)
- **Input**: `currentUser`, `activeTab`

#### ProfileOverviewComponent

- **Path**: `components/profile-overview/`
- **Chức năng**:
  - Banner cover với gradient
  - Avatar lớn và thông tin liên hệ
  - Nút "Chỉnh sửa hồ sơ"
  - Stats (Đơn hàng, Yêu thích, Điểm thưởng)
- **Input**: `currentUser`
- **Output**: `editProfile` event

#### BasicInfoFormComponent

- **Path**: `components/basic-info-form/`
- **Chức năng**:
  - Form chỉnh sửa thông tin cơ bản (Họ tên, SĐT, Email)
  - Upload avatar với preview
  - Validation form
  - Toggle chế độ edit/view
- **Input**: `currentUser`
- **Output**: `saveProfile`, `uploadAvatar` events

#### SecurityFormComponent

- **Path**: `components/security-form/`
- **Chức năng**:
  - Trạng thái bảo mật tài khoản
  - Form đổi mật khẩu
  - Password strength indicator
  - Show/hide password
  - Security tips
- **Output**: `changePassword` event

### 3. Main content sections

1. **Profile Overview**: Thông tin tổng quan với avatar lớn và stats
2. **Basic Info Card**: Form chỉnh sửa thông tin cá nhân
3. **Security Card**: Đổi mật khẩu và bảo mật
4. **Customer ID Card**: Hiển thị Customer ID và Role

## Tính năng

### ✅ Đã hoàn thành

- ✅ Layout 2 cột responsive
- ✅ Component hóa đầy đủ
- ✅ Load dữ liệu từ API backend
- ✅ Upload avatar với Cloudinary
- ✅ Cập nhật thông tin profile
- ✅ Đổi mật khẩu
- ✅ Password strength indicator
- ✅ Form validation
- ✅ Loading states
- ✅ Toast notifications
- ✅ Responsive design (Desktop, Tablet, Mobile)

### 🎨 UI/UX Features

- Modern card design với shadow và border-radius
- Gradient backgrounds
- Smooth transitions và animations
- Icon từ Font Awesome
- Color scheme phù hợp với brand (Burgundy #8b2635)
- Spacing rộng, dễ đọc
- Avatar với status badge
- Stats display với icons

### 📱 Responsive

- **Desktop (>1024px)**: 2 cột, sidebar sticky
- **Tablet (768px-1024px)**: Sidebar ở trên, main content dưới
- **Mobile (<768px)**: Stack layout, full width

## API Integration

### Endpoints sử dụng:

1. **GET** `/users/profile` - Lấy thông tin profile
2. **PUT** `/users/profile` - Cập nhật profile
3. **POST** `/users/profile/avatar` - Upload avatar
4. **PUT** `/users/profile/password` - Đổi mật khẩu

### Services:

- `AuthService`: Quản lý authentication và current user
- `UserService`: CRUD operations cho user profile
- `ToastService`: Hiển thị thông báo

## Cách sử dụng

### Trong route config:

```typescript
{
  path: 'profile/info',
  component: ProfileInfoComponent,
  canActivate: [AuthGuard]
}
```

### Trong template:

```html
<app-profile-info></app-profile-info>
```

Component sẽ tự động:

1. Load current user từ AuthService
2. Hiển thị các section tương ứng
3. Xử lý các events từ child components
4. Gọi API để save changes

## Styling

### Bảng màu chính:

- **Primary**: `#8b2635` (Burgundy)
- **Primary Gradient**: `linear-gradient(135deg, #8b2635 0%, #a63446 100%)`
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Error**: `#ef4444` (Red)
- **Gray Scale**: `#1f2937`, `#4b5563`, `#6b7280`, `#9ca3af`, `#e5e7eb`, `#f9fafb`

### Typography:

- **Headings**: `'Noto Serif', serif` (700)
- **Body**: `'Noto Sans', sans-serif` (400-600)
- **Monospace**: `'Courier New', monospace` (Customer ID)

## Dependencies

Các dependencies cần có trong `package.json`:

```json
{
  "@angular/common": "^18.x",
  "@angular/forms": "^18.x",
  "@fortawesome/fontawesome-free": "^6.x"
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lazy loading cho các components
- Efficient change detection
- Optimized images
- CSS animations với GPU acceleration
- Debounced API calls

## Bảo mật

- Validation ở cả client và server
- Password strength checking
- HTTPS cho avatar upload
- JWT token authentication
- XSS protection

## Future Enhancements

Các tính năng có thể thêm sau:

1. Two-factor authentication (2FA)
2. Activity log / Login history
3. Social media connections
4. Privacy settings
5. Account deletion
6. Notification settings
7. Theme customization

## Testing

### Manual Testing Checklist:

- [ ] Load profile data successfully
- [ ] Update profile info (name, phone)
- [ ] Upload new avatar
- [ ] Change password với validation
- [ ] Form validation messages
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive trên các devices
- [ ] Toast notifications
- [ ] Back button navigation

### Unit Tests (Recommended):

```typescript
describe('ProfileInfoComponent', () => {
  it('should load user data on init', () => {});
  it('should update profile successfully', () => {});
  it('should upload avatar', () => {});
  it('should change password', () => {});
  it('should show validation errors', () => {});
});
```

## Troubleshooting

### Issue: Avatar không upload

**Solution**: Kiểm tra cấu hình Cloudinary trong `backend/.env`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Issue: Form validation không hoạt động

**Solution**: Đảm bảo `ReactiveFormsModule` được import

### Issue: Responsive không đúng

**Solution**: Kiểm tra viewport meta tag trong `index.html`

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

## Maintainers

- Refactored by: GitHub Copilot
- Date: February 2026
- Version: 2.0.0

## License

MIT License - Free to use and modify
