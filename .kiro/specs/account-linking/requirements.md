# Requirements Document: Account Linking

## Introduction

Hệ thống cho phép người dùng linh hoạt trong việc đăng nhập bằng nhiều phương thức khác nhau. Người dùng có thể bắt đầu với Google OAuth và sau đó thêm email/password, hoặc ngược lại.

## Glossary

- **System**: TFT Finder authentication system
- **User**: Người dùng của ứng dụng
- **Google_Account**: Tài khoản Google OAuth
- **Email_Password_Account**: Tài khoản với email và password
- **Verification_Code**: Mã xác thực 6 chữ số gửi qua email
- **Linked_Account**: Tài khoản đã được liên kết với cả Google và Email/Password

## Requirements

### Requirement 1: Create Password for Google Account

**User Story:** As a user who signed up with Google, I want to create a password for my account, so that I can login with email/password when Google login is not available.

#### Acceptance Criteria

1. WHEN a Google-authenticated user accesses profile settings, THE System SHALL display an option to create password
2. WHEN a user requests to create password, THE System SHALL send a verification code to their email
3. WHEN a user enters valid verification code and new password, THE System SHALL create email/password credentials for the account
4. WHEN password creation is successful, THE System SHALL allow user to login with both Google and email/password
5. THE System SHALL require password to be at least 8 characters with uppercase, lowercase, and numbers

### Requirement 2: Link Google Account to Email/Password Account

**User Story:** As a user who signed up with email/password, I want to link my Google account, so that I can login with Google for convenience.

#### Acceptance Criteria

1. WHEN an email/password user accesses profile settings, THE System SHALL display an option to link Google account
2. WHEN a user initiates Google linking, THE System SHALL redirect to Google OAuth flow
3. WHEN Google authentication succeeds, THE System SHALL send verification code to user's email
4. WHEN a user enters valid verification code, THE System SHALL link the Google account to existing account
5. IF the Google email differs from account email, THE System SHALL require additional confirmation
6. WHEN linking is successful, THE System SHALL allow user to login with both methods

### Requirement 3: Email Verification Code System

**User Story:** As a system administrator, I want to verify user actions via email codes, so that account security is maintained.

#### Acceptance Criteria

1. WHEN a verification code is needed, THE System SHALL generate a 6-digit numeric code
2. THE System SHALL send the code to user's verified email address
3. THE System SHALL set code expiration to 10 minutes
4. WHEN a user enters incorrect code 3 times, THE System SHALL invalidate the code and require new request
5. WHEN a code is used successfully, THE System SHALL invalidate it immediately
6. THE System SHALL store codes securely with hashing

### Requirement 4: Account Registration with Email Verification

**User Story:** As a new user, I want to register with email/password, so that I can access the application.

#### Acceptance Criteria

1. WHEN a user submits registration form, THE System SHALL validate email format and password strength
2. THE System SHALL send verification code to provided email
3. WHEN a user enters valid verification code, THE System SHALL create the account
4. THE System SHALL prevent duplicate email registrations
5. WHEN registration is complete, THE System SHALL automatically log the user in

### Requirement 5: Profile Settings UI

**User Story:** As a user, I want to manage my authentication methods in profile settings, so that I can control how I login.

#### Acceptance Criteria

1. WHEN a user accesses profile settings, THE System SHALL display current authentication methods
2. THE System SHALL show "Create Password" button for Google-only accounts
3. THE System SHALL show "Link Google" button for email/password-only accounts
4. THE System SHALL show both methods as "Connected" when account is fully linked
5. THE System SHALL allow users to update their password if one exists

### Requirement 6: Security and Validation

**User Story:** As a system, I want to ensure secure account linking, so that user accounts remain protected.

#### Acceptance Criteria

1. THE System SHALL prevent linking if Google email is already used by another account
2. THE System SHALL require re-authentication before sensitive operations
3. THE System SHALL log all account linking activities
4. THE System SHALL send email notifications when authentication methods change
5. THE System SHALL rate-limit verification code requests to prevent abuse

## Technical Notes

- Supabase Auth supports multiple auth providers per user
- Need to extend profiles table with linking status fields
- Email verification codes should be stored in separate table
- Consider using Supabase email templates for verification codes
