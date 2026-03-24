# Phục | Hồi Cổ Phong Hoa - Khơi Màu Gấm Vóc - Hệ Thống E-Commerce Cổ Phục Việt Nam

Dự án xây dựng hệ thống bán hàng trực tuyến cho **Cổ Phục Việt Nam**, gồm:
- `frontend-user`: giao diện người dùng
- `frontend-admin`: trang quản trị
- `backend`: API và xử lý dữ liệu

## Chạy Dự Án

Bạn có thể chạy dự án theo 2 cách:

1. Chạy local trên máy cá nhân
2. Truy cập bản đã triển khai online

## Link Triển Khai

- User: [https://co-phuc.vercel.app](https://co-phuc.vercel.app)
- Admin: [https://adminphuc.vercel.app](https://adminphuc.vercel.app)

## Chạy Local

### 1. Cài dependencies

```bash
cd backend && npm install
cd ../frontend-user && npm install
cd ../frontend-admin && npm install
```

### 2. Cấu hình backend

```bash
cd backend
copy .env.example .env
```

Sau đó cập nhật các biến cần thiết trong `.env` (đặc biệt là `MONGODB_URI`, `JWT_SECRET`, Cloudinary, SMTP nếu dùng).

### 3. Chạy từng service

Mở 3 terminal:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend-user
npm start
```

```bash
# Terminal 3
cd frontend-admin
npm start
```

## Cổng Mặc Định

- Backend API: `http://localhost:3000/api`
- Frontend User: `http://localhost:4200`
- Frontend Admin: `http://localhost:4201`

## Công Nghệ Chính

- Backend: Node.js, Express, MongoDB
- Frontend: Angular 20 (User/Admin)
- Tích hợp: JWT, Cloudinary, Nodemailer, Google OAuth

## Nhóm Phát Triển 
1. Đặng Ngọc Hoài Phương - K234111362
2. Quan Toại Công - K234111326
3. Phan Gia Huy - K234111334
4. Trần Nguyễn Hoàng Long - K234111346


**Group 13** - 252BIE503101
