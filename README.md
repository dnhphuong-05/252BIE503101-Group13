# Phục | Hồi Cổ Phong Hoa - Khơi Màu Gấm Vóc - Hệ Thống E-Commerce Áo Dài Truyền Thống

Hệ thống website bán áo dài truyền thống Việt Nam, bao gồm giao diện người dùng, trang quản trị admin và API backend.

## Mục Lục

- [Giới Thiệu](#giới-thiệu)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt](#cài-đặt)
- [Cấu Hình](#cấu-hình)
- [Chạy Ứng Dụng](#chạy-ứng-dụng)
- [Cấu Trúc Project](#cấu-trúc-project)
- [Tính Năng Chính](#tính-năng-chính)

## Giới Thiệu

**Việt Phục** là hệ thống thương mại điện tử chuyên về áo dài truyền thống Việt Nam, cung cấp:

- **Frontend User**: Giao diện mua sắm cho khách hàng
- **Frontend Admin**: Trang quản trị cho admin/nhân viên
- **Backend API**: RESTful API xử lý logic và database

## Công Nghệ Sử Dụng

### Backend
- **Node.js** + **Express.js** - Framework backend
- **MongoDB** - Database NoSQL
- **JWT** - Xác thực và phân quyền
- **Cloudinary** - Lưu trữ hình ảnh
- **Nodemailer** - Gửi email
- **Google OAuth** - Đăng nhập Google

### Frontend
- **Angular 20** - Framework frontend
- **TypeScript** - Ngôn ngữ lập trình
- **RxJS** - Quản lý bất đồng bộ
- **Angular Router** - Điều hướng
- **Standalone Components** - Kiến trúc component

## Yêu Cầu Hệ Thống

Trước khi cài đặt, đảm bảo máy tính đã cài:

- **Node.js**: >= 18.x (khuyến nghị 20.x)
- **npm**: >= 9.x
- **MongoDB**: >= 6.0 (hoặc MongoDB Atlas)
- **Git**: Để clone project

## Cài Đặt

### 1. Clone Repository

```bash
git clone <repository-url>
cd 252BIE503101-Group13
```

### 2. Cài Đặt Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend User
```bash
cd frontend-user
npm install
```

#### Frontend Admin
```bash
cd frontend-admin
npm install
```

## Cấu Hình

### Backend Configuration

1. Copy file mẫu cấu hình:
```bash
cd backend
copy .env.example .env
```

2. Mở file `.env` và điền thông tin:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/viet_phuc_db

# JWT Secret (dùng lệnh npm run generate:keys để tạo)
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-key-here

# Email (Gmail App Password)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Cloudinary (đăng ký tại cloudinary.com)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (tùy chọn)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

3. Tạo JWT secrets tự động:
```bash
npm run generate:keys
```

4. Tạo tài khoản Super Admin:
```bash
npm run seed:superadmin
```

### Frontend Configuration

Frontend đã được cấu hình sẵn để kết nối với backend local (localhost:3000). Nếu cần thay đổi:

- **Frontend User**: `frontend-user/src/environments/environment.ts`
- **Frontend Admin**: `frontend-admin/src/environments/environment.ts`

## Chạy Ứng Dụng

### Chạy Toàn Bộ Hệ Thống

Mở 3 terminal riêng biệt:

#### Terminal 1 - Backend (Port 3000)
```bash
cd backend
npm start
# Hoặc chạy với nodemon (auto-reload)
npm run dev
```

#### Terminal 2 - Frontend User (Port 4200)
```bash
cd frontend-user
ng serve --port 4200 -o
```

#### Terminal 3 - Frontend Admin (Port 4201)
```bash
cd frontend-admin
ng serve --port 4201 -o
```

### Truy Cập Ứng Dụng

- **Frontend User**: http://localhost:4200
- **Frontend Admin**: http://localhost:4201
- **Backend API**: http://localhost:3000/api

### Tài Khoản Mặc Định

Sau khi chạy `npm run seed:superadmin`, sử dụng tài khoản:

- **Email**: `superadmin@vietphuc.com`
- **Password**: Xem trong console khi chạy seed script

## Cấu Trúc Project

```
252BIE503101-Group13/
│
├── backend/                    # Backend API
│   ├── src/
│   │   ├── config/            # Cấu hình (database, cloudinary...)
│   │   ├── controllers/       # Xử lý logic request
│   │   ├── models/            # Schema MongoDB
│   │   ├── routes/            # Định tuyến API
│   │   ├── services/          # Business logic
│   │   ├── middlewares/       # Auth, validation...
│   │   ├── utils/             # Helper functions
│   │   └── validators/        # Validate dữ liệu
│   ├── scripts/               # Scripts tiện ích
│   ├── .env.example          # File mẫu cấu hình
│   └── package.json
│
├── frontend-user/             # Giao diện người dùng
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/     # Các tính năng chính
│   │   │   ├── services/     # API services
│   │   │   ├── shared/       # Components dùng chung
│   │   │   └── guards/       # Route guards
│   │   ├── assets/           # Hình ảnh, icons, videos
│   │   └── environments/     # Cấu hình môi trường
│   └── package.json
│
└── frontend-admin/            # Trang quản trị
    ├── src/
    │   ├── app/
    │   │   ├── features/     # Quản lý sản phẩm, đơn hàng...
    │   │   ├── core/         # Services, guards, interceptors
    │   │   └── shared/       # Components dùng chung
    │   ├── assets/           # Tài nguyên tĩnh
    │   └── environments/     # Cấu hình môi trường
    └── package.json
```

## Tính Năng Chính

### Frontend User (Khách Hàng)

- **Mua Sắm**
  - Xem danh sách sản phẩm với bộ lọc và tìm kiếm
  - Xem chi tiết sản phẩm, đánh giá, review
  - Thêm vào giỏ hàng, mua ngay
  - Thanh toán VNPay

- **Thuê Áo Dài**
  - Thuê áo dài theo ngày
  - Tính tiền cọc và tiền thuê tự động
  - Quản lý đơn thuê

- **Tài Khoản**
  - Đăng ký, đăng nhập (email + Google OAuth)
  - Quản lý thông tin cá nhân, avatar
  - Xem lịch sử đơn hàng
  - Quản lý địa chỉ giao hàng
  - Tích điểm thành viên (loyalty points)

- **Blog**
  - Đọc bài viết về áo dài, văn hóa
  - Comment, like bài viết

- **Liên Hệ**
  - Gửi tin nhắn cho admin
  - Xem thông tin cửa hàng

### Frontend Admin (Quản Trị)

- **Dashboard**
  - Thống kê doanh thu, đơn hàng
  - Biểu đồ và báo cáo

- **Quản Lý Sản Phẩm**
  - Thêm/sửa/xóa sản phẩm
  - Upload hình ảnh lên Cloudinary
  - Quản lý kho, biến thể (màu, size)
  - Xem và trả lời đánh giá sản phẩm

- **Quản Lý Đơn Hàng**
  - Xem danh sách đơn hàng (mua/thuê)
  - Cập nhật trạng thái đơn hàng
  - In hóa đơn

- **Quản Lý Người Dùng**
  - Xem danh sách khách hàng
  - Phân quyền (Admin, Staff, Customer)
  - Xem lịch sử tích điểm

- **Quản Lý Blog**
  - Tạo/sửa/xóa bài viết
  - Quản lý comments
  - Upload ảnh bài viết

- **Quản Lý Liên Hệ**
  - Xem tin nhắn từ khách hàng
  - Trả lời qua email

### Backend API

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Staff, Customer)
  - Refresh token mechanism
  - Google OAuth integration

- **RESTful APIs**
  - Products, Orders, Users
  - Cart, Checkout
  - Blog, Comments
  - Reviews, Ratings
  - Notifications
  - Loyalty Points

- **Email Service**
  - Xác nhận đơn hàng
  - Reset mật khẩu
  - Thông báo

- **File Upload**
  - Upload hình ảnh lên Cloudinary
  - Resize, optimize tự động

## Scripts Hữu Ích

### Backend

```bash
# Tạo JWT keys tự động
npm run generate:keys

# Kiểm tra biến môi trường
npm run validate:env

# Tạo tài khoản Super Admin
npm run seed:superadmin

# Đồng bộ điểm thưởng từ đơn hàng
npm run sync:loyalty

# Kill port 3000 và restart
npm run restart
```

### Frontend

```bash
# Build production
npm run build

# Watch mode (auto-rebuild)
npm run watch
```

## Lưu Ý

1. **MongoDB**: Phải chạy MongoDB trước khi start backend
2. **Port**: Đảm bảo port 3000, 4200, 4201 không bị chiếm
3. **Node Version**: Khuyến nghị dùng Node.js 20.x
4. **.env**: KHÔNG được commit file `.env` lên git
5. **Cloudinary**: Cần đăng ký tài khoản miễn phí tại [cloudinary.com](https://cloudinary.com)

## Xử Lý Lỗi Thường Gặp

### Backend không start được
```bash
# Kiểm tra MongoDB đã chạy chưa
# Kiểm tra file .env đã cấu hình đúng chưa
npm run validate:env
```

### Frontend lỗi CORS
- Kiểm tra backend đã chạy chưa
- Kiểm tra `CORS_ORIGIN` trong file `.env` backend

### Port đã bị chiếm
```bash
# Backend
npm run kill:port

# Hoặc thủ công (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Nhóm Phát Triển 
1. Đặng Ngọc Hoài Phương - K234111362
2. Quan Toại Công - K234111326
3. Phan Gia Huy - K234111334
4. Trần Nguyễn Hoàng Long - K234111346


**Group 13** - 252BIE503101

## License

ISC License

---

Made with love by Group 13
