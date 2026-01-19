# Design Document: Account Linking System

## Overview

Hệ thống Account Linking cho phép người dùng linh hoạt chuyển đổi giữa các phương thức đăng nhập (Google OAuth và Email/Password). Người dùng có thể bắt đầu với một phương thức và sau đó thêm phương thức khác, tất cả đều được bảo vệ bằng email verification.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Authentication                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Google     │         │    Email     │                 │
│  │   OAuth      │◄───────►│   Password   │                 │
│  └──────────────┘         └──────────────┘                 │
│         │                         │                         │
│         └────────┬────────────────┘                         │
│                  │                                          │
│                  ▼                                          │
│         ┌─────────────────┐                                │
│         │  Supabase Auth  │                                │
│         └─────────────────┘                                │
│                  │                                          │
│                  ▼                                          │
│         ┌─────────────────┐                                │
│         │  User Profile   │                                │
│         └─────────────────┘                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Email Verification Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Action → Generate Code → Send Email → Verify Code    │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │ Request  │──►│ Generate │──►│   Send   │──►│ Verify  │ │
│  │ Linking  │   │  6-digit │   │   Email  │   │  Code   │ │
│  └──────────┘   └──────────┘   └──────────┘   └─────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema

#### New Table: `verification_codes`

```sql
CREATE TABLE public.verification_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,  -- Hashed 6-digit code
  purpose TEXT NOT NULL CHECK (purpose IN ('create_password', 'link_google', 'register', 'reset_password')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_expires ON verification_codes(expires_at);
```

#### Update Table: `profiles`

```sql
ALTER TABLE public.profiles 
  ADD COLUMN has_password BOOLEAN DEFAULT false,
  ADD COLUMN has_google BOOLEAN DEFAULT false,
  ADD COLUMN email TEXT,
  ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

### 2. API Routes

#### `/api/auth/send-verification-code`
- **Method**: POST
- **Body**: `{ email, purpose, userId? }`
- **Response**: `{ success: boolean, expiresAt: string }`
- **Logic**:
  1. Validate email format
  2. Check rate limiting (max 3 requests per 10 minutes)
  3. Generate 6-digit code
  4. Hash and store in database
  5. Send email via Supabase
  6. Return success

#### `/api/auth/verify-code`
- **Method**: POST
- **Body**: `{ email, code, purpose }`
- **Response**: `{ success: boolean, token?: string }`
- **Logic**:
  1. Find active code for email + purpose
  2. Check expiration
  3. Increment attempts
  4. Verify hashed code
  5. Mark as used if valid
  6. Return result

#### `/api/auth/create-password`
- **Method**: POST
- **Body**: `{ verificationToken, password }`
- **Response**: `{ success: boolean }`
- **Logic**:
  1. Verify token from previous step
  2. Validate password strength
  3. Update Supabase auth user with password
  4. Update profile: `has_password = true`
  5. Send confirmation email

#### `/api/auth/link-google`
- **Method**: POST
- **Body**: `{ verificationToken, googleToken }`
- **Response**: `{ success: boolean }`
- **Logic**:
  1. Verify email verification token
  2. Validate Google OAuth token
  3. Check if Google email matches or get confirmation
  4. Link identity in Supabase
  5. Update profile: `has_google = true`
  6. Send confirmation email

#### `/api/auth/register`
- **Method**: POST
- **Body**: `{ email, password, verificationCode, riotId }`
- **Response**: `{ success: boolean, session }`
- **Logic**:
  1. Verify email code
  2. Check email not already registered
  3. Create Supabase auth user
  4. Create profile with `has_password = true`
  5. Auto-login user
  6. Send welcome email

### 3. Frontend Components

#### `ProfileSettings` Component
```typescript
interface AuthMethod {
  type: 'google' | 'password';
  connected: boolean;
  email?: string;
}

// Shows current auth methods
// Buttons to add missing methods
// Password change form if has_password
```

#### `CreatePasswordModal` Component
```typescript
// Step 1: Request verification code
// Step 2: Enter code + new password
// Step 3: Success confirmation
```

#### `LinkGoogleModal` Component
```typescript
// Step 1: Initiate Google OAuth
// Step 2: Enter verification code
// Step 3: Success confirmation
```

#### `RegisterForm` Component
```typescript
// Email + Password fields
// Send verification code button
// Code input field
// Submit registration
```

#### `VerificationCodeInput` Component
```typescript
// 6-digit code input with auto-focus
// Resend code button (with cooldown)
// Error display
// Attempts remaining indicator
```

## Data Models

### VerificationCode Model
```typescript
interface VerificationCode {
  id: string;
  user_id?: string;
  email: string;
  code: string; // Hashed
  purpose: 'create_password' | 'link_google' | 'register' | 'reset_password';
  attempts: number;
  max_attempts: number;
  expires_at: string;
  used_at?: string;
  created_at: string;
}
```

### Profile Model (Extended)
```typescript
interface Profile {
  // ... existing fields
  has_password: boolean;
  has_google: boolean;
  email: string;
  email_verified: boolean;
}
```

## Email Templates

### Verification Code Email
```
Subject: Mã xác thực TFT Finder

Xin chào,

Mã xác thực của bạn là: **123456**

Mã này sẽ hết hạn sau 10 phút.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

---
TFT Finder Team
```

### Password Created Email
```
Subject: Mật khẩu đã được tạo

Xin chào,

Mật khẩu cho tài khoản TFT Finder của bạn đã được tạo thành công.

Bạn có thể đăng nhập bằng:
- Email và mật khẩu
- Google (nếu đã liên kết)

---
TFT Finder Team
```

### Google Linked Email
```
Subject: Tài khoản Google đã được liên kết

Xin chào,

Tài khoản Google của bạn đã được liên kết thành công với TFT Finder.

Bạn có thể đăng nhập bằng:
- Google
- Email và mật khẩu (nếu đã tạo)

---
TFT Finder Team
```

## Security Considerations

### 1. Code Generation
- Use cryptographically secure random number generator
- 6-digit numeric code (000000-999999)
- Hash before storing (bcrypt or similar)
- Never log or display unhashed codes

### 2. Rate Limiting
- Max 3 verification code requests per 10 minutes per email
- Max 3 verification attempts per code
- Exponential backoff on failed attempts

### 3. Code Expiration
- 10 minutes validity
- Auto-cleanup expired codes (cron job)
- Single-use only

### 4. Email Validation
- Validate email format
- Check against disposable email domains
- Verify email ownership before linking

### 5. Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Optional: special characters

### 6. Google OAuth Security
- Verify Google token server-side
- Check token audience and issuer
- Validate email from Google matches or get explicit confirmation
- Prevent account takeover via email mismatch

## Error Handling

### Common Errors
1. **Code Expired**: "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới."
2. **Invalid Code**: "Mã xác thực không đúng. Còn X lần thử."
3. **Max Attempts**: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới."
4. **Rate Limited**: "Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau X phút."
5. **Email Already Exists**: "Email này đã được đăng ký."
6. **Google Already Linked**: "Tài khoản Google này đã được liên kết với tài khoản khác."
7. **Weak Password**: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số."

## Testing Strategy

### Unit Tests
- Code generation and hashing
- Email validation
- Password strength validation
- Rate limiting logic
- Code expiration logic

### Integration Tests
- Full registration flow
- Create password flow
- Link Google flow
- Email sending
- Database operations

### E2E Tests
- User registers with email
- User creates password for Google account
- User links Google to email account
- Error scenarios (expired code, wrong code, etc.)

---

# HƯỚNG DẪN SETUP CHI TIẾT

## Bước 1: Cấu hình Supabase

### 1.1. Chạy Database Migration

Vào **Supabase Dashboard** → **SQL Editor** → Chạy script sau:

```sql
-- Create verification_codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('create_password', 'link_google', 'register', 'reset_password')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- RLS Policies
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own codes" 
  ON public.verification_codes FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage codes" 
  ON public.verification_codes FOR ALL 
  USING (true);

-- Update profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_google BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Function to cleanup expired codes (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.2. Cấu hình Email Templates

Vào **Supabase Dashboard** → **Authentication** → **Email Templates**

#### Template: Verification Code
```html
<h2>Mã xác thực TFT Finder</h2>
<p>Xin chào,</p>
<p>Mã xác thực của bạn là:</p>
<h1 style="font-size: 32px; letter-spacing: 8px; color: #c8aa6e;">{{ .Code }}</h1>
<p>Mã này sẽ hết hạn sau 10 phút.</p>
<p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
<hr>
<p style="color: #666;">TFT Finder Team</p>
```

### 1.3. Cấu hình Auth Settings

Vào **Supabase Dashboard** → **Authentication** → **Settings**

1. **Enable Email Provider**: ✅ ON
2. **Enable Google Provider**: ✅ ON
3. **Confirm Email**: ✅ OFF (we handle verification manually)
4. **Secure Email Change**: ✅ ON
5. **Email Rate Limit**: 3 per hour

## Bước 2: Cấu hình Google Cloud Console

### 2.1. Tạo OAuth 2.0 Credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project hoặc tạo project mới
3. Vào **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**

### 2.2. Cấu hình OAuth Consent Screen

1. Chọn **External** user type
2. Điền thông tin:
   - **App name**: TFT Finder
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
3. **Scopes**: Thêm `email` và `profile`
4. **Test users**: Thêm email của bạn để test

### 2.3. Tạo OAuth Client ID

1. **Application type**: Web application
2. **Name**: TFT Finder Web Client
3. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://your-domain.com
   ```
4. **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   https://your-project.supabase.co/auth/v1/callback
   ```
5. Click **Create**
6. **Copy Client ID và Client Secret**

### 2.4. Cấu hình trong Supabase

1. Vào **Supabase Dashboard** → **Authentication** → **Providers**
2. Tìm **Google**
3. Enable và điền:
   - **Client ID**: (từ Google Cloud Console)
   - **Client Secret**: (từ Google Cloud Console)
4. Click **Save**

## Bước 3: Cấu hình Environment Variables

Thêm vào `.env.local`:

```env
# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth (optional, Supabase handles this)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@tftfinder.com
```

## Bước 4: Setup Email Sending

### Option 1: Sử dụng Supabase Email (Recommended)

Supabase tự động gửi email, không cần config thêm.

### Option 2: Sử dụng Custom SMTP (Gmail)

1. Vào [Google Account Settings](https://myaccount.google.com/)
2. **Security** → **2-Step Verification** → Enable
3. **App Passwords** → Tạo password mới cho "Mail"
4. Copy password vào `SMTP_PASS` trong `.env.local`

### Option 3: Sử dụng SendGrid/Resend

1. Đăng ký [SendGrid](https://sendgrid.com/) hoặc [Resend](https://resend.com/)
2. Tạo API key
3. Thêm vào `.env.local`:
   ```env
   SENDGRID_API_KEY=your-api-key
   # hoặc
   RESEND_API_KEY=your-api-key
   ```

## Bước 5: Testing

### Test Registration Flow
1. Vào `/register`
2. Nhập email + password
3. Click "Gửi mã xác thực"
4. Check email inbox
5. Nhập mã 6 số
6. Verify account created

### Test Create Password (Google Account)
1. Đăng nhập bằng Google
2. Vào Profile Settings
3. Click "Tạo mật khẩu"
4. Nhập mã xác thực từ email
5. Tạo password mới
6. Đăng xuất và thử đăng nhập bằng email/password

### Test Link Google (Email Account)
1. Đăng nhập bằng email/password
2. Vào Profile Settings
3. Click "Liên kết Google"
4. Authorize Google
5. Nhập mã xác thực từ email
6. Verify Google linked
7. Đăng xuất và thử đăng nhập bằng Google

## Bước 6: Security Checklist

- [ ] Rate limiting enabled
- [ ] Codes are hashed in database
- [ ] HTTPS enabled in production
- [ ] Email verification required
- [ ] Password strength validation
- [ ] Google token validation
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Audit logging enabled

## Troubleshooting

### Email không gửi được
- Check Supabase email settings
- Verify SMTP credentials
- Check spam folder
- Check email rate limits

### Google OAuth không hoạt động
- Verify redirect URIs match exactly
- Check OAuth consent screen status
- Verify Client ID/Secret
- Check browser console for errors

### Verification code không hợp lệ
- Check code expiration (10 minutes)
- Verify code hasn't been used
- Check attempts count
- Verify email matches

---

**Tổng kết**: Feature này cần setup cả Supabase (database + auth + email) và Google Cloud Console (OAuth). Sau khi setup xong, bạn sẽ có hệ thống authentication linh hoạt với email verification bảo mật.
