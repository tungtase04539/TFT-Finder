# Admin Account Setup Guide

## Tạo Admin Account

Admin account cần được tạo thủ công trong Supabase Dashboard.

### Bước 1: Tạo User trong Supabase Dashboard

⚠️ **QUAN TRỌNG**: Bạn PHẢI tạo user trong Supabase Dashboard trước khi chạy SQL script!

1. Mở Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào **Authentication** > **Users**
4. Click **Add User** (nút màu xanh ở góc phải)
5. Điền thông tin:
   - **Email**: `admin@admin.com`
   - **Password**: `Anhtung1998`
   - **Auto Confirm User**: ✅ **PHẢI TICK** (nếu không tick, user sẽ không thể login!)
6. Click **Create User**

✅ Sau bước này, bạn sẽ thấy user `admin@admin.com` trong danh sách Users với status "Confirmed"

### Bước 2: Chạy SQL Script để Set Admin Role

1. Vào **SQL Editor** trong Supabase Dashboard
2. Mở file `supabase/create-admin-account.sql`
3. Copy toàn bộ nội dung
4. Paste vào SQL Editor
5. Click **Run** hoặc nhấn `Ctrl+Enter`

Script sẽ:
- Tìm user với email `admin@admin.com`
- Tạo/cập nhật profile với role = 'admin'
- Set verified = true
- Hiển thị thông tin xác nhận

### Bước 3: Verify Admin Account

Sau khi chạy script, bạn sẽ thấy output:

```
Admin user found with ID: [uuid]
Admin profile created/updated successfully!
Email: admin@admin.com
Password: Anhtung1998
Role: admin
```

Nếu thấy message "Admin user not found", có nghĩa là bạn chưa tạo user trong Dashboard (quay lại Bước 1).

### Bước 4: Test Admin Access

1. Đăng nhập vào app với:
   - Email: `admin@admin.com`
   - Password: `Anhtung1998`

2. Truy cập Admin Dashboard:
   - URL: `/admin/dashboard`
   - Hoặc thêm link vào navigation

3. Bạn sẽ thấy:
   - Thống kê tổng quan (users, rooms, reports, bans)
   - Quick actions (Reports, Bans, Users)
   - System info

## Admin Features

### Dashboard (`/admin/dashboard`)
- Tổng số người dùng
- Tổng số phòng
- Phòng đang hoạt động
- Báo cáo chờ duyệt
- Tổng lệnh cấm

### Report Management (`/admin/reports`)
- Xem danh sách báo cáo
- Duyệt/từ chối báo cáo
- Áp dụng lệnh cấm

### Ban Management (`/admin/bans`)
- Xem danh sách người bị cấm
- Unban người dùng
- Xem lịch sử cấm

### User Management (`/admin/users`)
- Xem danh sách người dùng
- Xem thông tin chi tiết
- Quản lý tài khoản

## Security

### Middleware Protection

Tất cả admin routes được bảo vệ bởi middleware:

```typescript
// src/lib/admin-middleware.ts
export async function checkAdminAccess()
```

Middleware kiểm tra:
1. User đã đăng nhập chưa
2. User có role = 'admin' không
3. Redirect về home nếu không phải admin

### API Protection

Tất cả admin API routes kiểm tra:
1. Authentication token
2. Admin role trong database
3. Return 401/403 nếu không có quyền

## Troubleshooting

### "Invalid login credentials" error

**Nguyên nhân**: User `admin@admin.com` chưa được tạo trong Supabase Dashboard

**Giải pháp**:
1. Vào Supabase Dashboard > Authentication > Users
2. Kiểm tra xem có user `admin@admin.com` không
3. Nếu không có, làm theo Bước 1 để tạo user
4. Nếu có nhưng status là "Unconfirmed", xóa user đó và tạo lại với "Auto Confirm User" = YES

### Không thể đăng nhập

1. Kiểm tra email/password đúng chưa: `admin@admin.com` / `Anhtung1998`
2. Kiểm tra user đã được confirm chưa trong Supabase Dashboard (status phải là "Confirmed")
3. Kiểm tra profile đã được tạo chưa (chạy SQL script ở Bước 2)
4. Kiểm tra role = 'admin' trong profiles table

### Không thể truy cập dashboard

1. Kiểm tra role = 'admin' trong profiles table
2. Kiểm tra console log để xem lỗi
3. Verify middleware đang hoạt động

### Stats không hiển thị

1. Kiểm tra API route `/api/admin/stats` hoạt động chưa
2. Kiểm tra RLS policies cho admin
3. Kiểm tra console log

## Database Schema

Admin account cần các columns sau trong `profiles` table:

```sql
- id: uuid (primary key, references auth.users)
- role: text (default: 'user', admin: 'admin')
- verified: boolean (must be true)
- riot_id: text (placeholder: 'Admin#ADMIN')
- puuid: text (placeholder: 'admin-puuid-placeholder')
```

## Next Steps

Sau khi setup admin account:

1. ✅ Test đăng nhập
2. ✅ Test truy cập dashboard
3. ⏳ Implement Report Management (Task 9)
4. ⏳ Implement Ban System (Task 10-12)
5. ⏳ Implement User Management

## Notes

- Chỉ nên có 1 admin account
- Không share password admin
- Có thể tạo thêm admin bằng cách update role trong database
- Admin có full access vào tất cả features
