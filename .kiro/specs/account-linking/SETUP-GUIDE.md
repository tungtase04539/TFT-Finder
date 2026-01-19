# Hướng Dẫn Setup Account Linking System

## ✅ Đã Hoàn Thành

### Backend Implementation
- ✅ Verification code generator (`src/lib/verification.ts`)
- ✅ Password validation utility (`src/lib/password-validation.ts`)
- ✅ Email service (`src/lib/email.ts`)
- ✅ API Routes:
  - `/api/auth/send-verification-code` - Gửi mã xác thực
  - `/api/auth/verify-code` - Xác thực mã
  - `/api/auth/create-password` - Tạo mật khẩu cho Google account
  - `/api/auth/link-google` - Liên kết Google vào email account
  - `/api/auth/register` - Đăng ký tài khoản mới

### Frontend Components
- ✅ `VerificationCodeInput` - Input 6 chữ số với auto-focus
- ✅ `RegisterForm` - Form đăng ký với email verification
- ✅ `CreatePasswordModal` - Modal tạo mật khẩu cho Google users
- ✅ `LinkGoogleModal` - Modal liên kết Google
- ✅ `AuthMethodCard` - Card hiển thị auth methods
- ✅ Profile Settings page (`/profile`)
- ✅ Register page (`/register`)
- ✅ Updated login page với link đến register
- ✅ Updated auth callback để sync profile flags

### Dependencies
- ✅ Installed `bcryptjs` và `@types/bcryptjs`

---

## 🔧 Bước Setup Cần Làm Manual

### Bước 1: Chạy Database Migration

**QUAN TRỌNG**: Bạn PHẢI chạy migration này trước khi test!

1. Vào **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/migration-verification-codes.sql`
3. Paste vào SQL Editor và click **Run**
4. Verify tables created:
   ```sql
   SELECT * FROM verification_codes LIMIT 1;
   SELECT has_password, has_google, email FROM profiles LIMIT 5;
   ```

### Bước 2: Cấu Hình Google OAuth (Nếu Chưa Làm)

#### 2.1. Google Cloud Console
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project hoặc tạo mới
3. **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
4. **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   https://your-project.supabase.co/auth/v1/callback
   ```
5. Copy **Client ID** và **Client Secret**

#### 2.2. Supabase Dashboard
1. **Authentication** → **Providers** → **Google**
2. Enable và paste Client ID + Secret
3. Save

### Bước 3: Test Email Sending

Email service hiện tại chỉ log ra console. Để gửi email thật:

#### Option A: Sử dụng Supabase Email (Recommended)
- Supabase tự động gửi email cho auth events
- Không cần config thêm

#### Option B: Custom SMTP (Gmail)
1. Vào [Google Account Settings](https://myaccount.google.com/)
2. **Security** → **2-Step Verification** → Enable
3. **App Passwords** → Tạo password cho "Mail"
4. Update `.env.local`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@tftfinder.com
   ```
5. Update `src/lib/email.ts` để sử dụng nodemailer hoặc similar

#### Option C: SendGrid/Resend
1. Đăng ký [SendGrid](https://sendgrid.com/) hoặc [Resend](https://resend.com/)
2. Tạo API key
3. Update `.env.local`:
   ```env
   SENDGRID_API_KEY=your-api-key
   # hoặc
   RESEND_API_KEY=your-api-key
   ```
4. Update `src/lib/email.ts` để sử dụng SDK

---

## 🧪 Testing Checklist

### Test 1: Registration Flow
1. ✅ Vào `/register`
2. ✅ Nhập email + password + Riot ID (optional)
3. ✅ Click "Tiếp tục"
4. ✅ Check console log cho verification code (hoặc email)
5. ✅ Nhập mã 6 số
6. ✅ Verify redirect to `/queue`
7. ✅ Check database: profile có `has_password = true`

### Test 2: Create Password (Google User)
1. ✅ Đăng nhập bằng Google
2. ✅ Vào `/profile`
3. ✅ Click "Tạo mật khẩu" trên Email & Password card
4. ✅ Nhập password mới (2 lần)
5. ✅ Click "Tiếp tục"
6. ✅ Check console log cho verification code
7. ✅ Nhập mã 6 số
8. ✅ Verify success message
9. ✅ Check database: profile có `has_password = true`
10. ✅ Đăng xuất và thử đăng nhập bằng email/password

### Test 3: Link Google (Email User)
1. ✅ Đăng nhập bằng email/password
2. ✅ Vào `/profile`
3. ✅ Click "Liên kết Google" trên Google card
4. ✅ Click "Tiếp tục"
5. ✅ Check console log cho verification code
6. ✅ Nhập mã 6 số
7. ✅ Verify success message
8. ✅ Check database: profile có `has_google = true`
9. ✅ Đăng xuất và thử đăng nhập bằng Google

### Test 4: Error Scenarios
- ✅ Expired code (wait 10 minutes)
- ✅ Wrong code (3 attempts)
- ✅ Rate limiting (request 4 codes in 10 minutes)
- ✅ Duplicate email registration
- ✅ Weak password
- ✅ Password mismatch

---

## 📝 Notes

### Rate Limiting
- Current implementation uses in-memory Map
- **Production**: Use Redis or similar for distributed rate limiting
- Limit: 3 verification codes per 10 minutes per email

### Verification Codes
- 6-digit numeric codes
- Hashed with bcrypt before storing
- 10 minutes expiration
- Max 3 attempts per code
- Single-use only

### Security
- ✅ Codes are hashed in database
- ✅ Rate limiting implemented
- ✅ Password strength validation
- ✅ Email format validation
- ⚠️ TODO: Add CSRF protection
- ⚠️ TODO: Add audit logging
- ⚠️ TODO: Setup cron job to cleanup expired codes

### Email Templates
- Current: Beautiful HTML templates with TFT styling
- Templates include:
  - Verification code email
  - Password created confirmation
  - Google linked confirmation
  - Welcome email for new users

---

## 🚀 Next Steps

### Immediate (Required for Production)
1. ⚠️ **Setup real email sending** (currently only logs to console)
2. ⚠️ **Run database migration** in Supabase
3. ⚠️ **Test all flows** thoroughly

### Short-term Improvements
1. Add CSRF protection to API routes
2. Add audit logging for security events
3. Setup Vercel cron job to cleanup expired codes
4. Add loading skeletons to profile page
5. Add toast notifications for success/error
6. Add password change functionality (for users who already have password)

### Long-term Enhancements
1. Add 2FA support
2. Add password reset flow
3. Add email change flow
4. Add account deletion
5. Add session management (view/revoke active sessions)
6. Add login history

---

## 🐛 Troubleshooting

### Email không gửi được
- Check console logs cho error messages
- Verify SMTP credentials nếu dùng custom SMTP
- Check spam folder
- Verify Supabase email settings

### Google OAuth không hoạt động
- Verify redirect URIs match exactly
- Check OAuth consent screen status
- Verify Client ID/Secret trong Supabase
- Check browser console for errors

### Verification code không hợp lệ
- Check code expiration (10 minutes)
- Verify code hasn't been used
- Check attempts count (max 3)
- Verify email matches

### Database errors
- Verify migration ran successfully
- Check RLS policies
- Verify user has proper permissions

---

## 📚 File Structure

```
src/
├── lib/
│   ├── verification.ts          # Code generation & validation
│   ├── password-validation.ts   # Password strength checker
│   └── email.ts                 # Email sending service
├── app/
│   ├── api/auth/
│   │   ├── send-verification-code/route.ts
│   │   ├── verify-code/route.ts
│   │   ├── create-password/route.ts
│   │   ├── link-google/route.ts
│   │   └── register/route.ts
│   ├── register/page.tsx        # Registration page
│   ├── profile/page.tsx         # Profile settings
│   └── auth/callback/route.ts   # Updated with profile sync
└── components/
    ├── auth/
    │   ├── VerificationCodeInput.tsx
    │   ├── RegisterForm.tsx
    │   ├── CreatePasswordModal.tsx
    │   └── LinkGoogleModal.tsx
    └── profile/
        └── AuthMethodCard.tsx

supabase/
└── migration-verification-codes.sql  # Database migration
```

---

**Status**: ✅ Implementation Complete - Ready for Testing
**Next**: Run database migration và test các flows
