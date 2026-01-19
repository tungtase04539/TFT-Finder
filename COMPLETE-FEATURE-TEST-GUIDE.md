# 📋 HƯỚNG DẪN TEST TOÀN BỘ TÍNH NĂNG - TFT FINDER

## 🎯 Mục đích
Guide này tổng hợp **TẤT CẢ** tính năng từ User đến Admin với cơ chế hoạt động chi tiết để test từng cái một.

---

# PHẦN 1: TÍNH NĂNG USER (7 Features)

## ✅ Feature 1: COPY RIOT ID & AUTO DETECTION

### 📍 Vị trí: Room Page (`/room/[id]`)

### 🔧 Cơ chế hoạt động:

#### Bước 1: Copy Riot ID
1. **Điều kiện**: Room status = "ready" (tất cả players đã agree rules)
2. **UI**: Button "📋 Copy ID" xuất hiện bên cạnh mỗi player
3. **Action**: Click button → Copy Riot ID (GameName#TAG) vào clipboard
4. **Feedback**: Toast notification "Đã copy Riot ID!"
5. **Database**: Update `rooms.last_copy_action` = current timestamp

**Code flow**:
```
User clicks Copy → CopyRiotIdButton.tsx
→ Copy to clipboard
→ Call API to update last_copy_action
→ Show toast notification
→ Trigger useCopyTracking hook
```

#### Bước 2: Countdown Timer (3 phút)
1. **Trigger**: Sau khi copy lần đầu
2. **UI**: 
   - Progress bar từ 0% → 100%
   - Timer đếm ngược 3:00 → 0:00
   - Text "Copy lần cuối: X phút trước"
3. **Reset**: Copy lại → timer reset về 3:00
4. **Warning**: Khi hết thời gian → "⚠️ Đã hết thời gian!"

**Code flow**:
```
useCopyTracking.ts monitors last_copy_action
→ Calculate time elapsed
→ Update progress bar (0-100%)
→ Update countdown display
→ When >= 3 minutes → shouldTriggerDetection = true
```


#### Bước 3: Auto Game Detection
1. **Trigger**: Tự động sau 3 phút không copy
2. **Process**:
   - Call API `/api/detect-game-participants`
   - Query Riot API với PUUID của tất cả players
   - Tìm match chung (recent matches trong 5 phút)
   - Phân loại: playersInGame vs playersNotInGame
3. **Result**:
   - **Nếu tìm thấy match**: Kick players không trong game
   - **Nếu không tìm thấy**: Show message "Không tìm thấy game chung"

**Code flow**:
```
Timer reaches 0 → Auto trigger detection
→ /api/detect-game-participants
→ Get all player PUUIDs
→ Query Riot API: /lol/match/v5/matches/by-puuid/{puuid}/ids
→ Find common matchId
→ Query match details: /lol/match/v5/matches/{matchId}
→ Check which players are in match
→ Return playersInGame + playersNotInGame
```

#### Bước 4: Kick Players
1. **Condition**: Có players không trong game
2. **Action**:
   - Remove từ `rooms.players` array
   - Remove từ `rooms.players_agreed` array
   - Update database
3. **Status Update**:
   - **≥2 players còn lại**: status = "playing"
   - **<2 players còn lại**: status = "cancelled"
4. **Notification**: Realtime update cho tất cả players

**Code flow**:
```
removePlayersNotInGame() function
→ Filter out players not in game
→ Update room.players
→ Update room.players_agreed
→ Update room.status
→ Save to database
→ Supabase realtime broadcasts changes
```

### 🧪 Test Steps:

**Test 1: Copy Button**
1. Tạo room với 2+ players
2. Tất cả agree rules → status = "ready"
3. ✓ Thấy button "📋 Copy ID" bên cạnh mỗi player
4. Click copy → ✓ Toast "Đã copy Riot ID!"
5. Paste → ✓ Có Riot ID đầy đủ (GameName#TAG)
6. Check database: ✓ `rooms.last_copy_action` updated

**Test 2: Timer**
1. Copy một Riot ID
2. ✓ Progress bar xuất hiện và chạy
3. ✓ Timer đếm ngược 3:00 → 2:59 → ...
4. Copy lại → ✓ Timer reset về 3:00
5. Đợi hết 3 phút → ✓ "⚠️ Đã hết thời gian!"

**Test 3: Auto Detection** (cần game thật)
1. Copy Riot IDs và start TFT game với 2+ players
2. Đợi 3 phút → ✓ Detection tự động trigger
3. ✓ Thấy "🔍 Đang kiểm tra game..."
4. ✓ Players không trong game bị kick
5. ✓ Room status → "playing"
6. Check database: ✓ `rooms.game_detected_at` updated

**Test 4: Edge Cases**
- Copy khi room status ≠ "ready" → ✓ Button không hiện
- Không có game chung → ✓ Message "Không tìm thấy"
- <2 players sau kick → ✓ Room cancelled

---

## ✅ Feature 2: REPORT SYSTEM

### 📍 Vị trí: Room Page (`/room/[id]`)

### 🔧 Cơ chế hoạt động:

#### Bước 1: Report Button
1. **UI**: Button "🚨 Báo cáo" bên cạnh mỗi player (trừ bản thân)
2. **Condition**: Không thể report chính mình
3. **Action**: Click → Mở ReportModal

**Code flow**:
```
ReportButton.tsx
→ Check: reportedUserId !== currentUserId
→ If true: Show button
→ onClick: Open ReportModal with reportedUser info
```


#### Bước 2: Report Modal
1. **Violation Types** (chọn ít nhất 1):
   - ☐ Phá game (game_sabotage)
   - ☐ Vi phạm quy tắc (rule_violation)
   - ☐ Quấy rối (harassment)
   - ☐ Phân biệt đối xử (discrimination)

2. **Description** (optional):
   - Textarea, max 1000 characters
   - Mô tả chi tiết vi phạm

3. **Evidence Images** (optional):
   - Upload max 3 images
   - Max 5MB per image
   - Preview trước khi submit
   - Có thể remove images đã upload

4. **Validation**:
   - ✓ Phải chọn ít nhất 1 violation type
   - ✓ Max 3 images
   - ✓ Max 5MB per image
   - ✓ Chỉ accept image files

**Code flow**:
```
ReportModal.tsx
→ User selects violation types (checkboxes)
→ User enters description (optional)
→ User uploads images (optional)
  → Validate: count <= 3
  → Validate: size <= 5MB each
  → Show preview
→ User clicks Submit
  → Validate: at least 1 violation type
  → If valid: Call API
  → If invalid: Show toast error
```

#### Bước 3: Submit Report
1. **API Call**: `/api/reports/create`
2. **Process**:
   - Validate authentication
   - Validate violation types
   - Upload images to Supabase Storage (`report-evidence` bucket)
   - Generate secure URLs
   - Create report record in database
3. **Database**:
   - Table: `reports`
   - Fields: reporter_id, reported_user_id, room_id, violation_types, description, evidence_urls, status="pending"
4. **Response**: Toast "Đã gửi báo cáo thành công!"

**Code flow**:
```
Submit → /api/reports/create
→ Check authentication
→ Validate violation_types array
→ For each image:
  → Upload to storage: report-evidence/{userId}/{timestamp}_{index}_{filename}
  → Get public URL
→ Create report record:
  {
    reporter_id,
    reported_user_id,
    room_id,
    violation_types: ['game_sabotage', ...],
    description,
    evidence_urls: ['url1', 'url2', ...],
    status: 'pending'
  }
→ Return success
```

### 🧪 Test Steps:

**Test 1: Report Button**
1. Vào room với players khác
2. ✓ Thấy "🚨 Báo cáo" bên cạnh players khác
3. ✓ KHÔNG thấy button bên cạnh tên mình
4. Click report → ✓ Modal mở

**Test 2: Violation Types**
1. Mở modal
2. ✓ Thấy 4 checkboxes
3. Không chọn gì → Submit → ✓ Toast error "Vui lòng chọn loại vi phạm"
4. Chọn 1 type → ✓ Submit button enabled
5. Chọn nhiều types → ✓ Tất cả được lưu

**Test 3: Description**
1. Nhập text vào description
2. ✓ Max 1000 characters
3. ✓ Optional (có thể bỏ trống)

**Test 4: Image Upload**
1. Upload 1 ảnh → ✓ Preview hiện
2. Upload thêm 2 ảnh → ✓ 3 previews
3. Thử upload ảnh thứ 4 → ✓ Toast warning "Tối đa 3 ảnh"
4. Upload ảnh >5MB → ✓ Toast error "Ảnh quá lớn"
5. Upload file không phải ảnh → ✓ Toast error
6. Click X trên preview → ✓ Ảnh bị remove

**Test 5: Submit**
1. Chọn violation types + upload ảnh
2. Click Submit → ✓ Loading state
3. ✓ Toast "Đã gửi báo cáo thành công!"
4. ✓ Modal đóng
5. Check database:
   - ✓ `reports` table có record mới
   - ✓ `evidence_urls` có URLs
6. Check storage:
   - ✓ `report-evidence` bucket có images
   - ✓ Path: `{userId}/{timestamp}_{index}_{filename}`

---

## ✅ Feature 3: BAN ENFORCEMENT (User Side)

### 📍 Vị trí: Queue, Create Room, Room, Profile

### 🔧 Cơ chế hoạt động:

#### Ban Check Middleware
1. **Trigger**: Mỗi khi user access protected routes
2. **Check**:
   - Query `profiles.banned_until`
   - Query `profiles.ban_count`
3. **Logic**:
   - **Temporary ban**: `banned_until` > now → Banned
   - **Permanent ban**: `banned_until` = NULL && `ban_count` >= 2 → Banned
   - **Expired ban**: `banned_until` < now → Clear ban, allow access

**Code flow**:
```
User visits /queue or /create-room or /room
→ ban-middleware.ts runs
→ Query user profile
→ Check banned_until:
  → If NULL && ban_count >= 2: Permanent ban
  → If banned_until > now: Temporary ban (still active)
  → If banned_until < now: Expired ban (clear it)
→ If banned: Show BanMessage component
→ If not banned: Allow access
```


#### BanMessage Component
1. **Display**: Khi user bị ban
2. **Content**:
   - Icon cảnh báo
   - "Tài khoản của bạn đã bị cấm"
   - Ban type (24h hoặc vĩnh viễn)
   - Time remaining (nếu temporary)
   - Lý do ban
3. **Block**: Không thể access queue/create room/join room

#### BanStatusCard Component (Profile)
1. **Display**: Trên profile page nếu bị ban
2. **Content**:
   - Ban type badge (24h hoặc Vĩnh viễn)
   - Time remaining với countdown
   - Violation types
   - Ban date
   - Warning message

**Code flow**:
```
Profile page loads
→ Query user's ban info from bans table
→ If banned:
  → Show BanStatusCard
  → Display ban details
  → If temporary: Show countdown timer
  → If permanent: Show "Vĩnh viễn"
```

### 🧪 Test Steps:

**Test 1: Temporary Ban (24h)**
1. Admin ban user với "Cấm 24 giờ"
2. User logout → login lại
3. Vào `/queue` → ✓ Thấy BanMessage
4. ✓ "Tài khoản đã bị cấm 24 giờ"
5. ✓ Time remaining: "23 giờ 59 phút"
6. Vào `/create-room` → ✓ Thấy BanMessage
7. Vào `/profile` → ✓ Thấy BanStatusCard
8. ✓ Countdown timer chạy

**Test 2: Permanent Ban**
1. Admin ban user với "Cấm vĩnh viễn"
2. User logout → login lại
3. Vào `/queue` → ✓ Thấy BanMessage
4. ✓ "Tài khoản đã bị cấm vĩnh viễn"
5. ✓ Không có time remaining
6. Vào `/profile` → ✓ Thấy BanStatusCard
7. ✓ Badge "Vĩnh viễn"

**Test 3: Ban Expiration**
1. User có temporary ban
2. Đợi 24 giờ (hoặc manually update database)
3. User access `/queue` → ✓ Ban tự động clear
4. ✓ Có thể access queue bình thường
5. Check database:
   - ✓ `banned_until` = NULL
   - ✓ `ban_count` vẫn giữ nguyên

**Test 4: Riot ID Blacklist**
1. User bị permanent ban
2. Admin ban → Riot ID vào blacklist
3. User tạo account mới
4. Vào verification → nhập Riot ID đã bị ban
5. ✓ Error "Riot ID này đã bị cấm vĩnh viễn"
6. ✓ Không thể verify

---

## ✅ Feature 4: ACHIEVEMENT TRACKING

### 📍 Vị trí: Room Page, Profile Page

### 🔧 Cơ chế hoạt động:

#### Bước 1: Game Detection
1. **Trigger**: Khi auto detection tìm thấy match
2. **Action**: 
   - Update `rooms.game_detected_at` = current timestamp
   - Update `rooms.status` = "playing"
   - Store matchId

**Code flow**:
```
Game detected → Update room:
{
  game_detected_at: now,
  status: 'playing',
  match_id: 'VN2_123456789'
}
```

#### Bước 2: Schedule Tracking (1 hour later)
1. **Trigger**: Sau khi game detected
2. **Schedule**: game_detected_at + 1 hour
3. **UI**: 
   - "⏱️ Đang chờ ghi nhận kết quả"
   - Game start time
   - Countdown 1 hour
4. **Polling**: Client poll mỗi phút để check

**Code flow**:
```
useMatchResultTracking.ts
→ Monitor game_detected_at
→ Calculate scheduled_time = game_detected_at + 1 hour
→ Poll every minute:
  → If now >= scheduled_time:
    → Call /api/track-match-result
```

#### Bước 3: Track Match Result
1. **API Call**: `/api/track-match-result`
2. **Process**:
   - Query Riot API: `/lol/match/v5/matches/{matchId}`
   - Extract player placements
   - Find winner (placement = 1)
   - Update winner: `win_count++`
   - Update all players: `total_games++`
   - Store in `match_results` table
3. **Retry**: Nếu match data chưa có, retry sau 5 phút (max 3 lần)

**Code flow**:
```
/api/track-match-result
→ Get matchId from room
→ Query Riot API: /lol/match/v5/matches/{matchId}
→ Parse match data:
  {
    participants: [
      { puuid: 'xxx', placement: 1 },
      { puuid: 'yyy', placement: 2 },
      ...
    ]
  }
→ Find winner (placement = 1)
→ Update profiles:
  → Winner: win_count = win_count + 1
  → All players: total_games = total_games + 1
→ Insert match_results:
  {
    match_id,
    player_id,
    placement,
    recorded_at: now
  }
```


### 🧪 Test Steps:

**Test 1: Game Detection**
1. Tạo room, start game, trigger detection
2. ✓ Room status → "playing"
3. ✓ Thấy "⏱️ Đang chờ ghi nhận kết quả"
4. ✓ Thấy game start time
5. ✓ Thấy countdown 1:00:00
6. Check database:
   - ✓ `rooms.game_detected_at` có timestamp
   - ✓ `rooms.status` = "playing"

**Test 2: Tracking After 1 Hour**
1. Đợi 1 giờ (hoặc manually update `game_detected_at` = now - 1 hour)
2. ✓ System tự động call tracking API
3. ✓ Status → "✅ Đã ghi nhận kết quả"
4. Check database:
   - ✓ Winner's `win_count` +1
   - ✓ All players' `total_games` +1
   - ✓ `match_results` table có records

**Test 3: Manual Tracking** (for testing)
```sql
-- Update game_detected_at to 1 hour ago
UPDATE rooms 
SET game_detected_at = NOW() - INTERVAL '1 hour'
WHERE id = 'your-room-id';

-- Then refresh room page → tracking should trigger
```

---

## ✅ Feature 5: WIN COUNT BADGE

### 📍 Vị trí: Room Page, Queue Page, Profile Page

### 🔧 Cơ chế hoạt động:

#### WinCountBadge Component
1. **Props**:
   - `count`: win_count từ profile
   - `size`: 'sm' | 'md' | 'lg'
2. **Display**:
   - **count > 0**: "🏆 {count} Top 1" (gold color)
   - **count = 0**: "⭐ 0 Top 1" (gray color)
3. **Sizes**:
   - `sm`: Small (queue page)
   - `md`: Medium (room page)
   - `lg`: Large (profile page)

**Code flow**:
```
WinCountBadge.tsx
→ Receive count and size props
→ Determine color:
  → count > 0: gold (#FFD700)
  → count = 0: gray (#9CA3AF)
→ Determine icon:
  → count > 0: 🏆
  → count = 0: ⭐
→ Render badge with appropriate styling
```

#### Display Locations:

**1. Room Page** (`/room/[id]`):
- Below each player's Riot ID
- Size: `md`
- Replaces old "Unranked" text

**2. Queue Page** (`/queue`):
- Below host's name in room card
- Size: `sm`
- Shows host's win count

**3. Profile Page** (`/profile`):
- In "Thông tin tài khoản" section
- Size: `lg`
- Prominent display

### 🧪 Test Steps:

**Test 1: Room Page**
1. Vào room với players
2. ✓ Thấy win count badge dưới mỗi Riot ID
3. ✓ Size medium
4. ✓ Gold nếu >0 wins, gray nếu 0 wins
5. ✓ Format: "🏆 X Top 1" hoặc "⭐ 0 Top 1"

**Test 2: Queue Page**
1. Vào `/queue`
2. Browse rooms
3. ✓ Thấy win count badge dưới host name
4. ✓ Size small
5. ✓ Correct color based on count

**Test 3: Profile Page**
1. Vào `/profile`
2. ✓ Thấy win count badge (large size)
3. ✓ Prominent display
4. ✓ Correct count from database

**Test 4: Different Counts**
1. User với 0 wins → ✓ "⭐ 0 Top 1" (gray)
2. User với 1 win → ✓ "🏆 1 Top 1" (gold)
3. User với 10 wins → ✓ "🏆 10 Top 1" (gold)
4. User với 100 wins → ✓ "🏆 100 Top 1" (gold)

---

## ✅ Feature 6: WIN STATISTICS CARD

### 📍 Vị trí: Profile Page (`/profile`)

### 🔧 Cơ chế hoạt động:

#### WinStatsCard Component
1. **Data Source**: Profile's `win_count` và `total_games`
2. **Display**:
   - 🏆 Top 1: {win_count}
   - 🎮 Tổng trận: {total_games}
   - 📈 Tỷ lệ thắng: {win_rate}%
3. **Win Rate Calculation**:
   - Formula: `(win_count / total_games) * 100`
   - Round to 1 decimal place
   - If total_games = 0: Show "Chưa có trận đấu"

**Code flow**:
```
WinStatsCard.tsx
→ Receive win_count and total_games props
→ Calculate win_rate:
  → If total_games = 0: return null (show "Chưa có trận đấu")
  → Else: (win_count / total_games) * 100
  → Round to 1 decimal: 30.5%
→ Render 3 stat cards:
  1. Total wins
  2. Total games
  3. Win rate
```

### 🧪 Test Steps:

**Test 1: No Games**
1. User chưa chơi game nào
2. Vào `/profile`
3. ✓ Thấy "Chưa có trận đấu"
4. ✓ Không hiện statistics

**Test 2: With Games**
1. User có games (manually update database)
2. Vào `/profile`
3. ✓ Thấy WinStatsCard
4. ✓ 3 cards: Top 1, Tổng trận, Tỷ lệ thắng

**Test 3: Win Rate Calculation**
```sql
-- Test case 1: 0 wins, 0 games
win_count = 0, total_games = 0
→ "Chưa có trận đấu"

-- Test case 2: 0 wins, 5 games
win_count = 0, total_games = 5
→ Win rate = 0.0%

-- Test case 3: 1 win, 1 game
win_count = 1, total_games = 1
→ Win rate = 100.0%

-- Test case 4: 3 wins, 10 games
win_count = 3, total_games = 10
→ Win rate = 30.0%

-- Test case 5: 7 wins, 20 games
win_count = 7, total_games = 20
→ Win rate = 35.0%
```

**Test 4: Real-time Update**
1. User có 5 wins, 10 games
2. Win a game → tracking updates
3. Refresh profile → ✓ 6 wins, 11 games
4. ✓ Win rate updated correctly

---

## ✅ Feature 7: TOAST NOTIFICATIONS

### 📍 Vị trí: Toàn bộ app

### 🔧 Cơ chế hoạt động:

#### Toast System
1. **Types**:
   - ✅ Success (green)
   - ❌ Error (red)
   - ⚠️ Warning (yellow)
   - ℹ️ Info (blue)

2. **Behavior**:
   - Slide in from top-right
   - Auto-dismiss after 3 seconds
   - Can manually close (X button)
   - Multiple toasts stack vertically

3. **Usage Locations**:
   - Copy Riot ID → Success
   - Report submission → Success/Error
   - Admin actions → Success/Error
   - Validation errors → Error/Warning

**Code flow**:
```
toast.ts utility
→ showToast(message, type)
→ Create toast element
→ Add to DOM (top-right)
→ Animate slide-in
→ Auto-dismiss after 3s
→ Animate slide-out
→ Remove from DOM
```


### 🧪 Test Steps:

**Test 1: Success Toast**
1. Copy Riot ID → ✓ Green toast "Đã copy Riot ID!"
2. Submit report → ✓ Green toast "Đã gửi báo cáo thành công!"
3. ✓ Icon: ✅
4. ✓ Auto-dismiss after 3s

**Test 2: Error Toast**
1. Report without violation type → ✓ Red toast "Vui lòng chọn loại vi phạm"
2. Upload ảnh >5MB → ✓ Red toast "Ảnh quá lớn"
3. ✓ Icon: ❌
4. ✓ Auto-dismiss after 3s

**Test 3: Warning Toast**
1. Upload >3 ảnh → ✓ Yellow toast "Tối đa 3 ảnh"
2. ✓ Icon: ⚠️
3. ✓ Auto-dismiss after 3s

**Test 4: Multiple Toasts**
1. Trigger 3 toasts liên tiếp
2. ✓ Stack vertically
3. ✓ Each auto-dismisses independently
4. ✓ Smooth animations

**Test 5: Manual Close**
1. Show toast
2. Click X button → ✓ Toast closes immediately
3. ✓ Slide-out animation

---

# PHẦN 2: TÍNH NĂNG ADMIN (6 Features)

## 🔐 Admin Access

### Login Info:
- **Email**: admin@admin.com
- **Password**: Anhtung1998
- **Role**: admin

### Protected Routes:
- `/admin/dashboard` - Overview
- `/admin/reports` - Report management
- `/admin/bans` - Ban management

### Middleware Protection:
```
User visits /admin/*
→ admin-middleware.ts runs
→ Check user.role = 'admin'
→ If not admin: Redirect to home
→ If admin: Allow access
```

---

## ✅ Feature 8: ADMIN DASHBOARD

### 📍 Vị trí: `/admin/dashboard`

### 🔧 Cơ chế hoạt động:

#### Statistics Cards
1. **API Call**: `/api/admin/stats`
2. **Queries**:
   ```sql
   -- Total users
   SELECT COUNT(*) FROM profiles WHERE verified = true
   
   -- Total rooms
   SELECT COUNT(*) FROM rooms
   
   -- Active rooms
   SELECT COUNT(*) FROM rooms WHERE status IN ('forming', 'ready', 'playing')
   
   -- Pending reports
   SELECT COUNT(*) FROM reports WHERE status = 'pending'
   
   -- Total bans
   SELECT COUNT(*) FROM bans
   ```
3. **Display**: 5 stat cards với icons

#### Quick Actions
1. **Xem báo cáo** → `/admin/reports`
2. **Quản lý cấm** → `/admin/bans`
3. **Quản lý người dùng** → (future feature)

**Code flow**:
```
Dashboard loads
→ Call /api/admin/stats
→ Verify admin role
→ Query all statistics
→ Return counts
→ Display in cards
→ Show quick action buttons
```

### 🧪 Test Steps:

**Test 1: Access Control**
1. Login với non-admin account
2. Vào `/admin/dashboard` → ✓ Redirect to home
3. Login với admin account
4. Vào `/admin/dashboard` → ✓ Access granted

**Test 2: Statistics**
1. Vào dashboard
2. ✓ Thấy 5 stat cards
3. ✓ Total users count
4. ✓ Total rooms count
5. ✓ Active rooms count
6. ✓ Pending reports count
7. ✓ Total bans count
8. Check database → ✓ Numbers match

**Test 3: Quick Actions**
1. Click "Xem báo cáo" → ✓ Navigate to `/admin/reports`
2. Click "Quản lý cấm" → ✓ Navigate to `/admin/bans`

**Test 4: Real-time Updates**
1. Note current stats
2. Create new report (as user)
3. Refresh dashboard → ✓ Pending reports +1
4. Ban a user
5. Refresh dashboard → ✓ Total bans +1

---

## ✅ Feature 9: REPORT MANAGEMENT

### 📍 Vị trí: `/admin/reports`

### 🔧 Cơ chế hoạt động:

#### Filter Tabs
1. **Chờ xử lý** (pending)
2. **Đã phê duyệt** (approved)
3. **Đã từ chối** (rejected)

**Code flow**:
```
/api/admin/reports?status=pending
→ Verify admin role
→ Query reports:
  SELECT * FROM reports
  WHERE status = 'pending'
  ORDER BY created_at DESC
→ Join with profiles for user info
→ Return reports array
```

#### ReportCard Component
1. **Display**:
   - Reporter name + avatar
   - Reported user name + avatar
   - Violation types (Vietnamese labels)
   - Description
   - Evidence images (gallery)
   - Created date
   - Actions: Phê duyệt / Từ chối

2. **Violation Type Labels**:
   - `game_sabotage` → "Phá game"
   - `rule_violation` → "Vi phạm quy tắc"
   - `harassment` → "Quấy rối"
   - `discrimination` → "Phân biệt đối xử"

**Code flow**:
```
ReportCard.tsx
→ Display report info
→ Map violation_types to Vietnamese
→ Show evidence images in gallery
→ Buttons:
  → Phê duyệt: Open BanModal
  → Từ chối: Call /api/admin/reject-report
```


#### Approve Report (Ban User)
1. **Action**: Click "Phê duyệt"
2. **Modal**: BanModal opens
3. **Display**:
   - User's current `ban_count`
   - Suggested ban type:
     - `ban_count = 0` → "Cấm 24 giờ" (recommended)
     - `ban_count >= 1` → "Cấm vĩnh viễn" (recommended)
4. **Options**:
   - ⏰ Cấm 24 giờ (temporary)
   - 🚫 Cấm vĩnh viễn (permanent)

**Code flow**:
```
Click Phê duyệt
→ Open BanModal
→ Query user's ban_count
→ Suggest ban type
→ Admin selects ban type
→ Click Xác nhận
→ Call /api/admin/apply-ban
```

#### Reject Report
1. **Action**: Click "Từ chối"
2. **API Call**: `/api/admin/reject-report`
3. **Process**:
   - Update report status = "rejected"
   - No ban applied
4. **Feedback**: Toast "Đã từ chối báo cáo"

**Code flow**:
```
Click Từ chối
→ /api/admin/reject-report
→ UPDATE reports SET status = 'rejected' WHERE id = reportId
→ Return success
→ Show toast
→ Refresh report list
```

### 🧪 Test Steps:

**Test 1: Filter Tabs**
1. Vào `/admin/reports`
2. ✓ Default tab: "Chờ xử lý"
3. ✓ Thấy pending reports
4. Click "Đã phê duyệt" → ✓ Show approved reports
5. Click "Đã từ chối" → ✓ Show rejected reports

**Test 2: Report Display**
1. Tab "Chờ xử lý"
2. ✓ Thấy reporter name
3. ✓ Thấy reported user name
4. ✓ Violation types (Vietnamese)
5. ✓ Description text
6. ✓ Evidence images (gallery)
7. ✓ Created date
8. ✓ 2 buttons: Phê duyệt / Từ chối

**Test 3: Reject Report**
1. Click "Từ chối" on a report
2. ✓ Toast "Đã từ chối báo cáo"
3. ✓ Report disappears from "Chờ xử lý"
4. ✓ Report appears in "Đã từ chối"
5. Check database:
   - ✓ `reports.status` = "rejected"

**Test 4: Approve Report (covered in Feature 10)**

---

## ✅ Feature 10: BAN SYSTEM (Admin Side)

### 📍 Vị trí: `/admin/reports` (BanModal)

### 🔧 Cơ chế hoạt động:

#### BanModal Component
1. **Trigger**: Click "Phê duyệt" on report
2. **Display**:
   - Reported user info
   - Current ban count
   - Ban type options
   - Suggested ban (highlighted)

**Code flow**:
```
BanModal.tsx
→ Receive reportedUser and report info
→ Query ban_count from profile
→ Determine suggestion:
  → ban_count = 0: Suggest "Cấm 24 giờ"
  → ban_count >= 1: Suggest "Cấm vĩnh viễn"
→ Show radio buttons
→ Admin selects ban type
→ Click Xác nhận
```

#### Apply Ban API
**Endpoint**: `/api/admin/apply-ban`

**Process**:

**1. Temporary Ban (24h)**:
```
→ Update profile:
  {
    banned_until: NOW() + INTERVAL '24 hours',
    ban_count: ban_count + 1
  }
→ Create ban record:
  {
    user_id,
    report_id,
    ban_type: 'temporary',
    reason: violation_types,
    banned_at: NOW(),
    expires_at: NOW() + INTERVAL '24 hours'
  }
→ Update report status = 'approved'
```

**2. Permanent Ban**:
```
→ Update profile:
  {
    banned_until: NULL,
    ban_count: 2
  }
→ Create ban record:
  {
    user_id,
    report_id,
    ban_type: 'permanent',
    reason: violation_types,
    banned_at: NOW(),
    expires_at: NULL
  }
→ Add to blacklist:
  INSERT INTO banned_riot_ids (riot_id, reason)
  VALUES (user.riot_id, violation_types)
→ Update report status = 'approved'
```

**Code flow**:
```
/api/admin/apply-ban
→ Verify admin role
→ Get user's current ban_count
→ If ban_type = 'temporary':
  → Set banned_until = now + 24h
  → Increment ban_count
  → Create temporary ban record
→ If ban_type = 'permanent':
  → Set banned_until = NULL
  → Set ban_count = 2
  → Create permanent ban record
  → Add riot_id to banned_riot_ids table
→ Update report status = 'approved'
→ Return success
```

### 🧪 Test Steps:

**Test 1: First Offense (24h Ban)**
1. User chưa bị ban (ban_count = 0)
2. Admin approve report
3. ✓ BanModal shows "Lần vi phạm: 0"
4. ✓ Suggested: "Cấm 24 giờ" (highlighted)
5. Select "Cấm 24 giờ" → Click Xác nhận
6. ✓ Toast "Đã cấm người dùng thành công"
7. Check database:
   - ✓ `profiles.ban_count` = 1
   - ✓ `profiles.banned_until` = now + 24h
   - ✓ `bans` table có record (type = 'temporary')
   - ✓ `reports.status` = 'approved'
8. User side:
   - ✓ Cannot access queue
   - ✓ See BanMessage "Cấm 24 giờ"

**Test 2: Second Offense (Permanent Ban)**
1. User đã bị ban 1 lần (ban_count = 1)
2. Admin approve report mới
3. ✓ BanModal shows "Lần vi phạm: 1"
4. ✓ Suggested: "Cấm vĩnh viễn" (highlighted)
5. Select "Cấm vĩnh viễn" → Click Xác nhận
6. ✓ Toast "Đã cấm người dùng vĩnh viễn"
7. Check database:
   - ✓ `profiles.ban_count` = 2
   - ✓ `profiles.banned_until` = NULL
   - ✓ `bans` table có record (type = 'permanent')
   - ✓ `banned_riot_ids` table có Riot ID
   - ✓ `reports.status` = 'approved'
8. User side:
   - ✓ Cannot access queue
   - ✓ See BanMessage "Cấm vĩnh viễn"
   - ✓ Riot ID blacklisted

**Test 3: Override Suggestion**
1. User có ban_count = 0 (suggest 24h)
2. Admin chọn "Cấm vĩnh viễn" instead
3. ✓ Can override suggestion
4. ✓ Permanent ban applied
5. ✓ Riot ID blacklisted

---

## ✅ Feature 11: BAN MANAGEMENT

### 📍 Vị trí: `/admin/bans`

### 🔧 Cơ chế hoạt động:

#### Filter Tabs
1. **Tất cả** (all)
2. **Tạm thời** (temporary)
3. **Vĩnh viễn** (permanent)

**Code flow**:
```
/api/admin/bans?type=all
→ Verify admin role
→ Query bans:
  SELECT * FROM bans
  WHERE (type = 'all' OR ban_type = type)
  ORDER BY banned_at DESC
→ Join with profiles and reports
→ Return bans array
```


#### BanList Component
1. **Display per ban**:
   - User name + avatar
   - Riot ID
   - Ban type badge (24h / Vĩnh viễn)
   - Time remaining (if temporary)
   - Ban date
   - Associated report link
   - Violation types
   - Unban button

2. **Time Remaining Calculation**:
   ```
   If temporary:
     remaining = expires_at - now
     Display: "X giờ Y phút"
   If permanent:
     Display: "Vĩnh viễn"
   ```

**Code flow**:
```
BanList.tsx
→ Receive bans array
→ For each ban:
  → Display user info
  → Calculate time remaining (if temporary)
  → Show violation types
  → Show unban button
```

#### Unban User
**Endpoint**: `/api/admin/unban`

**Process**:
```
→ Delete ban record from bans table
→ Update profile:
  {
    banned_until: NULL,
    ban_count: 0  // Reset to 0
  }
→ If permanent ban:
  → Delete from banned_riot_ids table
→ Return success
```

**Code flow**:
```
Click Gỡ cấm
→ /api/admin/unban
→ Verify admin role
→ Get ban info
→ DELETE FROM bans WHERE id = banId
→ UPDATE profiles SET banned_until = NULL, ban_count = 0
→ If ban_type = 'permanent':
  → DELETE FROM banned_riot_ids WHERE riot_id = user.riot_id
→ Return success
→ Show toast "Đã gỡ cấm thành công"
→ Refresh ban list
```

### 🧪 Test Steps:

**Test 1: Filter Tabs**
1. Vào `/admin/bans`
2. ✓ Default tab: "Tất cả"
3. ✓ Show all bans
4. Click "Tạm thời" → ✓ Show only temporary bans
5. Click "Vĩnh viễn" → ✓ Show only permanent bans

**Test 2: Ban Display**
1. Tab "Tất cả"
2. For each ban:
   - ✓ User name + avatar
   - ✓ Riot ID
   - ✓ Ban type badge
   - ✓ Time remaining (if temporary)
   - ✓ Ban date
   - ✓ Report link (clickable)
   - ✓ Violation types
   - ✓ Unban button

**Test 3: Time Remaining**
1. Temporary ban
2. ✓ Shows countdown: "23 giờ 45 phút"
3. ✓ Updates in real-time
4. Permanent ban
5. ✓ Shows "Vĩnh viễn"

**Test 4: Unban Temporary**
1. Click "Gỡ cấm" on temporary ban
2. ✓ Toast "Đã gỡ cấm thành công"
3. ✓ Ban disappears from list
4. Check database:
   - ✓ `bans` record deleted
   - ✓ `profiles.banned_until` = NULL
   - ✓ `profiles.ban_count` = 0
5. User side:
   - ✓ Can access queue again

**Test 5: Unban Permanent**
1. Click "Gỡ cấm" on permanent ban
2. ✓ Toast "Đã gỡ cấm thành công"
3. ✓ Ban disappears from list
4. Check database:
   - ✓ `bans` record deleted
   - ✓ `profiles.banned_until` = NULL
   - ✓ `profiles.ban_count` = 0
   - ✓ `banned_riot_ids` record deleted
5. User side:
   - ✓ Can access queue again
   - ✓ Riot ID no longer blacklisted

**Test 6: Report Link**
1. Click report link on ban
2. ✓ Navigate to report detail
3. ✓ Show full report info

---

## ✅ Feature 12: RIOT ID BLACKLIST

### 📍 Vị trí: Verification Page

### 🔧 Cơ chế hoạt động:

#### Blacklist Check
1. **Trigger**: User verifies Riot ID
2. **Process**:
   ```sql
   SELECT * FROM banned_riot_ids 
   WHERE riot_id = 'GameName#TAG'
   ```
3. **Result**:
   - **Found**: Reject verification, show error
   - **Not found**: Allow verification

**Code flow**:
```
User submits Riot ID for verification
→ /api/verify (or similar)
→ Query banned_riot_ids table
→ If found:
  → Return error: "Riot ID này đã bị cấm vĩnh viễn"
  → Block verification
→ If not found:
  → Proceed with normal verification
```

#### Add to Blacklist
1. **Trigger**: Admin applies permanent ban
2. **Process**:
   ```sql
   INSERT INTO banned_riot_ids (riot_id, banned_at, reason)
   VALUES ('GameName#TAG', NOW(), 'violation_types')
   ```

#### Remove from Blacklist
1. **Trigger**: Admin unbans permanent ban
2. **Process**:
   ```sql
   DELETE FROM banned_riot_ids 
   WHERE riot_id = 'GameName#TAG'
   ```

### 🧪 Test Steps:

**Test 1: Add to Blacklist**
1. Admin applies permanent ban to user
2. Check database:
   - ✓ `banned_riot_ids` table có record
   - ✓ riot_id = user's Riot ID
   - ✓ banned_at = current timestamp
   - ✓ reason = violation types

**Test 2: Verification Block**
1. User bị permanent ban (Riot ID in blacklist)
2. User tạo account mới
3. Vào verification page
4. Nhập Riot ID đã bị ban
5. ✓ Error: "Riot ID này đã bị cấm vĩnh viễn"
6. ✓ Cannot proceed with verification

**Test 3: Remove from Blacklist**
1. Admin unbans permanent ban
2. Check database:
   - ✓ `banned_riot_ids` record deleted
3. User với Riot ID đó
4. Vào verification page
5. Nhập Riot ID
6. ✓ Verification proceeds normally

**Test 4: Different Riot ID**
1. User A bị permanent ban (Riot ID: "Player1#VN2")
2. User B với Riot ID khác ("Player2#VN2")
3. User B verify → ✓ Success (not blocked)
4. Only exact Riot ID match is blocked

---

# PHẦN 3: DATABASE VERIFICATION

## 📊 Database Tables

### 1. profiles (Updated)
```sql
-- New columns
role VARCHAR DEFAULT 'user'  -- 'user' or 'admin'
ban_count INTEGER DEFAULT 0
banned_until TIMESTAMP NULL
win_count INTEGER DEFAULT 0
total_games INTEGER DEFAULT 0
```

**Test Queries**:
```sql
-- Check admin account
SELECT email, role FROM profiles WHERE role = 'admin';

-- Check banned users
SELECT riot_id, ban_count, banned_until 
FROM profiles 
WHERE banned_until IS NOT NULL OR ban_count >= 2;

-- Check win statistics
SELECT riot_id, win_count, total_games,
  CASE 
    WHEN total_games > 0 THEN ROUND((win_count::numeric / total_games) * 100, 1)
    ELSE 0
  END as win_rate
FROM profiles
WHERE verified = true
ORDER BY win_count DESC;
```

### 2. rooms (Updated)
```sql
-- New columns
last_copy_action TIMESTAMP NULL
game_detected_at TIMESTAMP NULL
```

**Test Queries**:
```sql
-- Check copy tracking
SELECT id, status, last_copy_action,
  EXTRACT(EPOCH FROM (NOW() - last_copy_action))/60 as minutes_since_copy
FROM rooms
WHERE last_copy_action IS NOT NULL;

-- Check game detection
SELECT id, status, game_detected_at,
  game_detected_at + INTERVAL '1 hour' as scheduled_tracking
FROM rooms
WHERE game_detected_at IS NOT NULL;
```


### 3. reports (New)
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id),
  reported_user_id UUID REFERENCES profiles(id),
  room_id UUID REFERENCES rooms(id),
  violation_types TEXT[],
  description TEXT,
  evidence_urls TEXT[],
  status VARCHAR DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Test Queries**:
```sql
-- Check pending reports
SELECT r.*, 
  reporter.riot_id as reporter_name,
  reported.riot_id as reported_name
FROM reports r
JOIN profiles reporter ON r.reporter_id = reporter.id
JOIN profiles reported ON r.reported_user_id = reported.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- Check report with evidence
SELECT id, evidence_urls, array_length(evidence_urls, 1) as image_count
FROM reports
WHERE evidence_urls IS NOT NULL;
```

### 4. bans (New)
```sql
CREATE TABLE bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  report_id UUID REFERENCES reports(id),
  ban_type VARCHAR,  -- 'temporary' or 'permanent'
  reason TEXT[],
  banned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL
);
```

**Test Queries**:
```sql
-- Check all bans
SELECT b.*,
  p.riot_id,
  CASE 
    WHEN b.ban_type = 'temporary' THEN 
      EXTRACT(EPOCH FROM (b.expires_at - NOW()))/3600 || ' hours'
    ELSE 'Permanent'
  END as time_remaining
FROM bans b
JOIN profiles p ON b.user_id = p.id
ORDER BY b.banned_at DESC;

-- Check expired bans
SELECT * FROM bans
WHERE ban_type = 'temporary' 
AND expires_at < NOW();
```

### 5. banned_riot_ids (New)
```sql
CREATE TABLE banned_riot_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_id VARCHAR UNIQUE,
  banned_at TIMESTAMP DEFAULT NOW(),
  reason TEXT[]
);
```

**Test Queries**:
```sql
-- Check blacklist
SELECT * FROM banned_riot_ids
ORDER BY banned_at DESC;

-- Check if Riot ID is banned
SELECT * FROM banned_riot_ids
WHERE riot_id = 'GameName#TAG';
```

### 6. match_results (New)
```sql
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id VARCHAR,
  player_id UUID REFERENCES profiles(id),
  placement INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

**Test Queries**:
```sql
-- Check match results
SELECT mr.*,
  p.riot_id,
  CASE WHEN mr.placement = 1 THEN 'Winner' ELSE 'Player' END as result
FROM match_results mr
JOIN profiles p ON mr.player_id = p.id
ORDER BY mr.recorded_at DESC;

-- Check winners
SELECT p.riot_id, COUNT(*) as wins
FROM match_results mr
JOIN profiles p ON mr.player_id = p.id
WHERE mr.placement = 1
GROUP BY p.riot_id
ORDER BY wins DESC;
```

---

# PHẦN 4: STORAGE VERIFICATION

## 📦 Supabase Storage

### Bucket: report-evidence

**Configuration**:
- Public: Yes
- Max file size: 5MB
- Allowed types: Images only

**File Structure**:
```
report-evidence/
  {userId}/
    {timestamp}_0_{filename}
    {timestamp}_1_{filename}
    {timestamp}_2_{filename}
```

**Test Queries**:
```sql
-- Check storage bucket
SELECT * FROM storage.buckets 
WHERE name = 'report-evidence';

-- Check uploaded files
SELECT * FROM storage.objects
WHERE bucket_id = 'report-evidence'
ORDER BY created_at DESC;
```

**Test Steps**:
1. Upload report với 3 ảnh
2. Check Supabase Storage dashboard
3. ✓ Bucket `report-evidence` exists
4. ✓ Files uploaded to correct path
5. ✓ Files accessible via public URL
6. ✓ File naming correct: `{timestamp}_{index}_{filename}`

---

# PHẦN 5: API ENDPOINTS

## 🔌 User APIs

### 1. Copy Riot ID
- **Endpoint**: Internal (updates via Supabase client)
- **Method**: UPDATE
- **Action**: Update `rooms.last_copy_action`

### 2. Detect Game
- **Endpoint**: `/api/detect-game-participants`
- **Method**: POST
- **Body**: `{ roomId, puuids }`
- **Response**: `{ playersInGame, playersNotInGame, matchId }`

### 3. Create Report
- **Endpoint**: `/api/reports/create`
- **Method**: POST
- **Body**: `{ roomId, reportedUserId, violationTypes, description, images }`
- **Response**: `{ success, reportId }`

### 4. Track Match Result
- **Endpoint**: `/api/track-match-result`
- **Method**: POST
- **Body**: `{ roomId, matchId }`
- **Response**: `{ success, winner, results }`

---

## 🔐 Admin APIs

### 1. Get Statistics
- **Endpoint**: `/api/admin/stats`
- **Method**: GET
- **Auth**: Admin only
- **Response**: `{ totalUsers, totalRooms, activeRooms, pendingReports, totalBans }`

### 2. Get Reports
- **Endpoint**: `/api/admin/reports?status=pending`
- **Method**: GET
- **Auth**: Admin only
- **Response**: `{ reports: [...] }`

### 3. Apply Ban
- **Endpoint**: `/api/admin/apply-ban`
- **Method**: POST
- **Auth**: Admin only
- **Body**: `{ userId, reportId, banType }`
- **Response**: `{ success }`

### 4. Reject Report
- **Endpoint**: `/api/admin/reject-report`
- **Method**: POST
- **Auth**: Admin only
- **Body**: `{ reportId }`
- **Response**: `{ success }`

### 5. Get Bans
- **Endpoint**: `/api/admin/bans?type=all`
- **Method**: GET
- **Auth**: Admin only
- **Response**: `{ bans: [...] }`

### 6. Unban User
- **Endpoint**: `/api/admin/unban`
- **Method**: POST
- **Auth**: Admin only
- **Body**: `{ banId }`
- **Response**: `{ success }`

---

# PHẦN 6: TESTING CHECKLIST

## ✅ Complete Test Checklist

### Setup (One-time)
- [ ] Run database migration: `cleanup-then-migrate.sql`
- [ ] Create admin account: `create-admin-account.sql`
- [ ] Verify admin login works
- [ ] Verify storage bucket exists

### User Features (7)
- [ ] Feature 1: Copy Riot ID & Auto Detection
  - [ ] Copy button works
  - [ ] Timer counts down
  - [ ] Auto detection triggers
  - [ ] Players kicked correctly
- [ ] Feature 2: Report System
  - [ ] Report button shows
  - [ ] Modal validation works
  - [ ] Image upload works
  - [ ] Report submits successfully
- [ ] Feature 3: Ban Enforcement
  - [ ] Temporary ban blocks access
  - [ ] Permanent ban blocks access
  - [ ] Ban expires correctly
  - [ ] Riot ID blacklist works
- [ ] Feature 4: Achievement Tracking
  - [ ] Game detection records timestamp
  - [ ] Tracking triggers after 1 hour
  - [ ] Win count increments
  - [ ] Total games increments
- [ ] Feature 5: Win Count Badge
  - [ ] Shows in room page
  - [ ] Shows in queue page
  - [ ] Shows in profile page
  - [ ] Correct colors (gold/gray)
- [ ] Feature 6: Win Statistics Card
  - [ ] Shows on profile
  - [ ] Win rate calculates correctly
  - [ ] "Chưa có trận đấu" shows when 0 games
- [ ] Feature 7: Toast Notifications
  - [ ] Success toasts work
  - [ ] Error toasts work
  - [ ] Warning toasts work
  - [ ] Auto-dismiss works

### Admin Features (6)
- [ ] Feature 8: Admin Dashboard
  - [ ] Access control works
  - [ ] Statistics display correctly
  - [ ] Quick actions work
- [ ] Feature 9: Report Management
  - [ ] Filter tabs work
  - [ ] Reports display correctly
  - [ ] Reject report works
- [ ] Feature 10: Ban System
  - [ ] First offense (24h) works
  - [ ] Second offense (permanent) works
  - [ ] Ban modal shows correct suggestion
- [ ] Feature 11: Ban Management
  - [ ] Filter tabs work
  - [ ] Bans display correctly
  - [ ] Time remaining calculates
  - [ ] Unban works (temporary)
  - [ ] Unban works (permanent)
- [ ] Feature 12: Riot ID Blacklist
  - [ ] Adds to blacklist on permanent ban
  - [ ] Blocks verification
  - [ ] Removes from blacklist on unban

### Database Verification
- [ ] All tables created
- [ ] All columns added
- [ ] RLS policies work
- [ ] Storage bucket configured

---

# 🎉 HOÀN TẤT!

Đây là guide tổng hợp **TẤT CẢ** tính năng với cơ chế hoạt động chi tiết. Bạn có thể test từng feature một theo thứ tự hoặc test theo priority.

**Recommended Test Order**:
1. Setup (database + admin)
2. User Features 1-2 (Copy + Report)
3. Admin Features 8-10 (Dashboard + Reports + Ban)
4. User Feature 3 (Ban Enforcement)
5. User Features 4-6 (Achievement + Win Count + Stats)
6. Feature 7 (Toast) - test throughout

Chúc bạn test thành công! 🚀

