# Implementation Plan: Account Linking System

## Overview

Implement account linking system cho phép users chuyển đổi giữa Google OAuth và Email/Password authentication với email verification.

## QUAN TRỌNG: Setup Trước Khi Code

**BẠN PHẢI LÀM CÁC BƯỚC SAU TRƯỚC KHI BẮT ĐẦU CODE:**

### ✅ Bước 1: Setup Supabase Database
1. Vào Supabase Dashboard → SQL Editor
2. Chạy migration script trong design.md (tạo bảng verification_codes)
3. Update bảng profiles (thêm has_password, has_google, email fields)
4. Verify tables created successfully

### ✅ Bước 2: Setup Supabase Email
1. Vào Authentication → Email Templates
2. Tạo template "Verification Code" 
3. Test gửi email thử

### ✅ Bước 3: Setup Google Cloud Console
1. Tạo OAuth 2.0 Client ID
2. Configure OAuth Consent Screen
3. Add authorized redirect URIs
4. Copy Client ID và Client Secret

### ✅ Bước 4: Configure Supabase Google Provider
1. Vào Authentication → Providers → Google
2. Enable và paste Client ID + Secret
3. Save configuration

### ✅ Bước 5: Update Environment Variables
1. Add Google Client ID to `.env.local`
2. Add email SMTP settings (if using custom email)

**SAU KHI HOÀN THÀNH 5 BƯỚC TRÊN, BẮT ĐẦU CÁC TASKS DƯỚI ĐÂY:**

---

## Tasks

- [x] 1. Database Setup (MANUAL - Làm trước)
  - Run migration script in Supabase SQL Editor
  - Create verification_codes table
  - Update profiles table with new columns
  - Verify indexes created
  - Test RLS policies
  - _Requirements: All requirements_
  - _Note: Migration script created in `supabase/migration-verification-codes.sql`_

- [x] 2. Email Service Setup
  - [x] 2.1 Create email utility functions
    - Create `src/lib/email.ts`
    - Implement `sendVerificationCode(email, code)`
    - Implement `sendPasswordCreatedEmail(email)`
    - Implement `sendGoogleLinkedEmail(email)`
    - Use Supabase email or custom SMTP
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.2 Create verification code generator
    - Create `src/lib/verification.ts`
    - Implement `generateCode()` - 6 digit random
    - Implement `hashCode(code)` - bcrypt hash
    - Implement `verifyCode(code, hash)` - compare
    - _Requirements: 3.1, 3.6_

- [x] 3. API Routes - Verification System
  - [x] 3.1 Create send-verification-code API
    - Create `src/app/api/auth/send-verification-code/route.ts`
    - Validate email format
    - Check rate limiting (3 per 10 min)
    - Generate and hash code
    - Store in database with 10 min expiry
    - Send email
    - _Requirements: 3.1, 3.2, 3.3, 6.5_
  
  - [x] 3.2 Create verify-code API
    - Create `src/app/api/auth/verify-code/route.ts`
    - Find active code for email + purpose
    - Check expiration
    - Increment attempts (max 3)
    - Verify hashed code
    - Mark as used if valid
    - Return verification token
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 4. API Routes - Password Creation
  - [x] 4.1 Create create-password API
    - Create `src/app/api/auth/create-password/route.ts`
    - Verify verification token
    - Validate password strength (8+ chars, upper, lower, number)
    - Update Supabase auth user with password
    - Update profile: has_password = true
    - Send confirmation email
    - _Requirements: 1.3, 1.5_
  
  - [x] 4.2 Add password validation utility
    - Create `src/lib/password-validation.ts`
    - Check length >= 8
    - Check has uppercase
    - Check has lowercase
    - Check has number
    - Return validation errors
    - _Requirements: 1.5_

- [x] 5. API Routes - Google Linking
  - [x] 5.1 Create link-google API
    - Create `src/app/api/auth/link-google/route.ts`
    - Verify verification token
    - Validate Google OAuth token
    - Check Google email not already used
    - Link identity in Supabase
    - Update profile: has_google = true
    - Send confirmation email
    - _Requirements: 2.3, 2.4, 2.5, 6.1_

- [x] 6. API Routes - Registration
  - [x] 6.1 Create register API
    - Create `src/app/api/auth/register/route.ts`
    - Verify email verification code
    - Check email not already registered
    - Validate password strength
    - Create Supabase auth user
    - Create profile with has_password = true
    - Auto-login user
    - Send welcome email
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Frontend Components - Verification Code Input
  - [x] 7.1 Create VerificationCodeInput component
    - Create `src/components/auth/VerificationCodeInput.tsx`
    - 6-digit input with auto-focus
    - Auto-submit when complete
    - Show attempts remaining
    - Resend code button with cooldown
    - Error display
    - _Requirements: 3.3, 3.4_

- [x] 8. Frontend Components - Registration
  - [x] 8.1 Create RegisterForm component
    - Create `src/components/auth/RegisterForm.tsx`
    - Email + Password fields
    - Password strength indicator
    - Send verification code button
    - VerificationCodeInput integration
    - Submit registration
    - Error handling
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 8.2 Create register page
    - Create `src/app/register/page.tsx`
    - Use RegisterForm component
    - Redirect to queue after success
    - Link to login page
    - _Requirements: 4.5_

- [x] 9. Frontend Components - Create Password
  - [x] 9.1 Create CreatePasswordModal component
    - Create `src/components/auth/CreatePasswordModal.tsx`
    - Step 1: Request verification code
    - Step 2: Enter code + new password
    - Password strength indicator
    - Step 3: Success confirmation
    - Error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 10. Frontend Components - Link Google
  - [x] 10.1 Create LinkGoogleModal component
    - Create `src/components/auth/LinkGoogleModal.tsx`
    - Step 1: Initiate Google OAuth
    - Step 2: Enter verification code
    - Step 3: Success confirmation
    - Handle email mismatch
    - Error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 11. Frontend Components - Profile Settings
  - [x] 11.1 Create ProfileSettings page
    - Create `src/app/profile/page.tsx`
    - Display current auth methods
    - Show "Create Password" button if !has_password
    - Show "Link Google" button if !has_google
    - Show both as "Connected" when linked
    - Password change form if has_password
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 11.2 Create AuthMethodCard component
    - Create `src/components/profile/AuthMethodCard.tsx`
    - Display method icon (Google/Email)
    - Show connected status
    - Action button (Add/Change)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 12. Update Existing Auth Flow
  - [x] 12.1 Update login page
    - Update `src/app/login/page.tsx`
    - Add "Register" link
    - Support both Google and Email/Password
    - Handle linked accounts
    - _Requirements: 1.4, 2.6_
  
  - [x] 12.2 Update auth callback
    - Update `src/app/auth/callback/route.ts`
    - Detect auth method used
    - Update profile flags (has_google/has_password)
    - Sync email to profile
    - _Requirements: 1.4, 2.6_

- [ ] 13. Security & Rate Limiting
  - [x] 13.1 Implement rate limiting
    - Create `src/lib/rate-limit.ts`
    - Track requests by IP + email
    - 3 requests per 10 minutes for verification codes
    - Store in memory or Redis
    - _Requirements: 6.5_
    - _Note: Implemented in send-verification-code API route_
  
  - [ ] 13.2 Add security logging
    - Create `src/lib/audit-log.ts`
    - Log password creation
    - Log Google linking
    - Log failed verification attempts
    - Store in database
    - _Requirements: 6.3_

- [x] 14. Email Templates
  - [x] 14.1 Create email templates
    - Create `src/lib/email-templates.ts`
    - Verification code template
    - Password created template
    - Google linked template
    - Welcome email template
    - Use HTML with TFT styling
    - _Requirements: 3.2, 6.4_
    - _Note: Templates implemented directly in email.ts_

- [ ] 15. Testing & Validation
  - [ ] 15.1 Test registration flow
    - Register new account
    - Verify email code works
    - Check account created
    - Test login with email/password
    - _Requirements: 4.1-4.5_
  
  - [ ] 15.2 Test create password flow
    - Login with Google
    - Request password creation
    - Verify email code
    - Create password
    - Test login with email/password
    - _Requirements: 1.1-1.5_
  
  - [ ] 15.3 Test link Google flow
    - Login with email/password
    - Request Google linking
    - Complete OAuth
    - Verify email code
    - Test login with Google
    - _Requirements: 2.1-2.6_
  
  - [ ] 15.4 Test error scenarios
    - Expired code
    - Wrong code (3 attempts)
    - Rate limiting
    - Duplicate email
    - Weak password
    - Email mismatch
    - _Requirements: 3.4, 6.1, 6.2, 6.5_

- [ ] 16. Cleanup & Optimization
  - [ ] 16.1 Setup cron job for expired codes
    - Create Vercel cron or Supabase function
    - Run daily to delete expired codes
    - _Requirements: 3.3_
  
  - [ ] 16.2 Add loading states
    - Skeleton loaders
    - Button loading states
    - Disable forms during submission
    - _Requirements: All_
  
  - [ ] 16.3 Add success notifications
    - Toast notifications
    - Success messages
    - Redirect after success
    - _Requirements: All_

## Notes

- **CRITICAL**: Phải setup Supabase và Google Cloud Console trước khi code
- Mỗi API route cần error handling đầy đủ
- Tất cả verification codes phải được hash trước khi lưu
- Rate limiting là bắt buộc để prevent abuse
- Email templates phải có TFT branding
- Test thoroughly trước khi deploy production

## Testing Checklist

- [ ] User có thể đăng ký với email/password
- [ ] User có thể tạo password cho Google account
- [ ] User có thể link Google vào email account
- [ ] Verification codes expire sau 10 phút
- [ ] Max 3 attempts per code
- [ ] Rate limiting hoạt động (3 codes per 10 min)
- [ ] Emails được gửi thành công
- [ ] Password validation hoạt động
- [ ] Google OAuth hoạt động
- [ ] Profile settings hiển thị đúng auth methods
- [ ] Security logging hoạt động
- [ ] Error messages rõ ràng và hữu ích
