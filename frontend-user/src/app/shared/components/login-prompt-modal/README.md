# Login Prompt Modal Component

Modal xác nhận đăng nhập để nhận ưu đãi - được sử dụng trong flow mua hàng.

## 📍 Location

```
frontend-user/src/app/shared/components/login-prompt-modal/
├── login-prompt-modal.ts
├── login-prompt-modal.html
└── login-prompt-modal.css
```

## 🎯 Usage

### Import Component

```typescript
import { LoginPromptModalComponent } from '../../shared/components/login-prompt-modal/login-prompt-modal';

@Component({
  imports: [LoginPromptModalComponent],
  // ...
})
```

### Template Usage

```html
<app-login-prompt-modal
  [show]="showLoginPrompt"
  [title]="'Đăng nhập để nhận ưu đãi?'"
  [message]="'Bạn có muốn đăng nhập để nhận thêm voucher và điểm tích luỹ không?'"
  (close)="closeLoginPrompt()"
  (continueAsGuest)="continueAsGuest()"
  (goToLogin)="goToLogin()"
></app-login-prompt-modal>
```

### Component Logic

```typescript
export class YourComponent {
  showLoginPrompt: boolean = false;

  // Show modal
  handleBuyNow() {
    if (!this.isLoggedIn) {
      this.showLoginPrompt = true;
    }
  }

  // Handle continue as guest
  continueAsGuest() {
    this.showLoginPrompt = false;
    // Navigate to guest checkout
    this.showGuestForm = true;
  }

  // Handle go to login
  goToLogin() {
    this.showLoginPrompt = false;
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  // Close modal
  closeLoginPrompt() {
    this.showLoginPrompt = false;
  }
}
```

## 📥 Inputs

| Input     | Type      | Default                       | Description        |
| --------- | --------- | ----------------------------- | ------------------ |
| `show`    | `boolean` | `false`                       | Hiển thị/ẩn modal  |
| `title`   | `string`  | `'Đăng nhập để nhận ưu đãi?'` | Tiêu đề modal      |
| `message` | `string`  | `'Bạn có muốn đăng nhập...'`  | Nội dung thông báo |

## 📤 Outputs

| Output            | Type                 | Description                                 |
| ----------------- | -------------------- | ------------------------------------------- |
| `close`           | `EventEmitter<void>` | Emit khi đóng modal (click X hoặc backdrop) |
| `continueAsGuest` | `EventEmitter<void>` | Emit khi click "Không, tiếp tục"            |
| `goToLogin`       | `EventEmitter<void>` | Emit khi click "Đăng nhập"                  |

## 🎨 Features

- ✅ Responsive design (mobile + desktop)
- ✅ Animation fade in/slide up
- ✅ Backdrop blur effect
- ✅ Click outside to close
- ✅ Accessible (ARIA labels)
- ✅ Customizable title & message
- ✅ Vietnamese text by default

## 🎯 Use Cases

### 1. Product Purchase Flow

```
Click "MUA NGAY"
  → Check if logged in
    → If not logged in: Show LoginPromptModal
      → User clicks "Không, tiếp tục": Show guest form
      → User clicks "Đăng nhập": Navigate to login page
```

### 2. Cart Checkout Flow

```
Click "Thanh toán"
  → Check if logged in
    → If not logged in: Show LoginPromptModal
      → User chooses option
```

### 3. Add to Wishlist Flow

```
Click "Yêu thích"
  → Check if logged in
    → If not logged in: Show LoginPromptModal
```

## 🎭 Custom Title & Message

```html
<app-login-prompt-modal
  [show]="showModal"
  [title]="'Bạn chưa đăng nhập!'"
  [message]="'Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích.'"
  (close)="closeModal()"
  (continueAsGuest)="skipLogin()"
  (goToLogin)="navigateToLogin()"
></app-login-prompt-modal>
```

## 🖼️ Visual Design

### Desktop View

- Modal width: `min(560px, 100%)`
- Border radius: `20px`
- Backdrop: `rgba(47, 27, 20, 0.55)` with `blur(2px)`
- Buttons: Pill-shaped (`border-radius: 999px`)

### Mobile View

- Full width buttons stacked vertically
- Reduced padding
- Touch-friendly button size

### Color Scheme

- Primary button: Gradient burgundy to dark maroon
- Ghost button: Light surface with hover effects
- Text: Deep wine for title, muted gray for message
- Border: Light wine color

## 🔧 Customization

### Override Styles

```css
/* In your component CSS */
::ng-deep .login-prompt-modal {
  /* Your custom styles */
  border-radius: 12px;
}

::ng-deep .login-prompt-btn.primary {
  /* Custom primary button */
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
}
```

### Change Animation Duration

```css
/* In login-prompt-modal.css */
@keyframes slideUp {
  /* Adjust timing */
}
```

## 🔗 Related Components

- [GuestFormComponent](../guest-form/README.md) - Form for guest checkout
- [OrderSuccessModalComponent](../order-success-modal/README.md) - Success confirmation

## 📝 Notes

- Modal uses `z-index: 999` to appear above other content
- Backdrop click emits `close` event
- Keyboard ESC support can be added if needed
- Component is standalone (no module required)

## 🐛 Troubleshooting

### Modal doesn't show

```typescript
// Check if show input is true
[show] = 'showLoginPrompt'; // Make sure this variable is true
```

### Backdrop doesn't close modal

```typescript
// Make sure close event is handled
close = 'closeLoginPrompt()'; // Method should set show = false
```

### Buttons don't work

```typescript
// Check if event handlers are connected
continueAsGuest = 'continueAsGuest()'(
  // Method should exist
  goToLogin,
) = 'goToLogin()'; // Method should exist
```

## 📊 Example Flow Diagram

```
User clicks "MUA NGAY"
        ↓
  Is user logged in?
   ↙          ↘
 YES           NO
  ↓             ↓
Proceed    Show LoginPromptModal
            ↙           ↘
    "Không, tiếp tục"  "Đăng nhập"
           ↓              ↓
     Guest Form    Login Page
           ↓              ↓
    Quick Order    Full Account
```

---

**Created:** February 12, 2026  
**Extracted from:** product-detail component  
**Purpose:** Reusable login prompt for purchase flow
