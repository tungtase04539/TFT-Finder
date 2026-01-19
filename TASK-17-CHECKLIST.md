# Task 17: Checkpoint - Test All Features ✅

## 🎯 Mục tiêu
Kiểm tra tất cả tính năng hoạt động đúng end-to-end trước khi hoàn thành dự án.

---

## ✅ Checklist Kiểm tra

### 1. Copy → Detect → Kick Flow (5 phút)

#### Setup:
- [ ] Database migration đã chạy (`cleanup-then-migrate.sql`)
- [ ] Admin account đã tạo (`create-admin-account.sql`)
- [ ] App đang chạy (production hoặc localhost)

#### Test Steps:
1. **Tạo room với 2+ players**
   - [ ] Vào `/queue`
   - [ ] Tạo room mới
   - [ ] Mời thêm players (hoặc dùng nhiều accounts)
   - [ ] Tất cả players agree rules
   - [ ] Room status = "ready" ✓

2. **Test Copy Button**
   - [ ] Thấy button "📋 Copy ID" bên cạnh mỗi player ✓
   - [ ] Click copy → thấy toast "Đã copy Riot ID!" ✓
   - [ ] Paste → có Riot ID đầy đủ (GameName#TAG) ✓
   - [ ] Database: `rooms.last_copy_action` đã update ✓

3. **Test Countdown Timer**
   - [ ] Thấy countdown timer xuất hiện ✓
   - [ ] Progress bar chạy từ 0% → 100% ✓
   - [ ] Thời gian đếm ngược 3:00 → 0:00 ✓
   - [ ] Copy lại → timer reset về 3:00 ✓

4. **Test Auto Detection** (cần có game thật)
   - [ ] Copy Riot IDs và start TFT game
   - [ ] Đợi 3 phút → detection tự động trigger ✓
   - [ ] Thấy message "🔍 Đang kiểm tra game..." ✓
   - [ ] Players không trong game bị kick ✓
   - [ ] Room status → "playing" (nếu ≥2 players) ✓
   - [ ] Database: `rooms.game_detected_at` đã update ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

### 2. Report → Admin Review → Ban Flow (10 phút)

#### Test Steps:

1. **Test Report Button**
   - [ ] Vào room với players khác
   - [ ] Thấy button "🚨 Báo cáo" bên cạnh players khác ✓
   - [ ] KHÔNG thấy button bên cạnh tên mình ✓
   - [ ] Click report → modal mở ✓

2. **Test Report Modal**
   - [ ] Chọn violation types (có thể chọn nhiều) ✓
   - [ ] Nhập description (optional, max 1000 chars) ✓
   - [ ] Upload 1 ảnh → thấy preview ✓
   - [ ] Upload thêm 2 ảnh → thấy 3 previews ✓
   - [ ] Thử upload ảnh thứ 4 → bị chặn với toast warning ✓
   - [ ] Thử upload ảnh >5MB → bị chặn với toast warning ✓
   - [ ] Submit → thấy toast "Đã gửi báo cáo thành công!" ✓
   - [ ] Database: `reports` table có record mới ✓
   - [ ] Storage: `report-evidence` bucket có images ✓

3. **Test Admin Dashboard**
   - [ ] Login với admin account (admin@admin.com / Anhtung1998)
   - [ ] Vào `/admin/dashboard` ✓
   - [ ] Thấy statistics cards:
     - [ ] Total users ✓
     - [ ] Total rooms ✓
     - [ ] Active rooms ✓
     - [ ] Pending reports ✓
     - [ ] Total bans ✓

4. **Test Report Management**
   - [ ] Click "Xem báo cáo" → vào `/admin/reports` ✓
   - [ ] Thấy report vừa tạo trong tab "Chờ xử lý" ✓
   - [ ] Thấy đầy đủ thông tin:
     - [ ] Reporter name ✓
     - [ ] Reported user name ✓
     - [ ] Violation types (Vietnamese labels) ✓
     - [ ] Description ✓
     - [ ] Evidence images (gallery) ✓
   - [ ] Click "Từ chối" → thấy toast "Đã từ chối báo cáo" ✓
   - [ ] Report chuyển sang tab "Đã từ chối" ✓

5. **Test Ban System - First Offense (24h)**
   - [ ] Tạo report mới cho user chưa bị ban
   - [ ] Click "Phê duyệt" → BanModal mở ✓
   - [ ] Thấy "Lần vi phạm: 0" ✓
   - [ ] Thấy suggestion "Cấm 24 giờ" ✓
   - [ ] Chọn "Cấm 24 giờ" → click "Xác nhận" ✓
   - [ ] Thấy toast "Đã cấm người dùng thành công" ✓
   - [ ] Database check:
     - [ ] `profiles.ban_count` = 1 ✓
     - [ ] `profiles.banned_until` = now + 24h ✓
     - [ ] `bans` table có record mới ✓
     - [ ] `reports.status` = "approved" ✓

6. **Test Ban System - Second Offense (Permanent)**
   - [ ] Tạo report mới cho user đã bị ban 1 lần
   - [ ] Click "Phê duyệt" → BanModal mở ✓
   - [ ] Thấy "Lần vi phạm: 1" ✓
   - [ ] Thấy suggestion "Cấm vĩnh viễn" ✓
   - [ ] Chọn "Cấm vĩnh viễn" → click "Xác nhận" ✓
   - [ ] Thấy toast "Đã cấm người dùng vĩnh viễn" ✓
   - [ ] Database check:
     - [ ] `profiles.ban_count` = 2 ✓
     - [ ] `profiles.banned_until` = NULL ✓
     - [ ] `banned_riot_ids` table có Riot ID ✓
     - [ ] `bans` table có record mới (type = "permanent") ✓

7. **Test Ban Enforcement**
   - [ ] Logout admin, login với banned user
   - [ ] Vào `/queue` → thấy BanMessage component ✓
   - [ ] Không thể access queue ✓
   - [ ] Vào `/create-room` → thấy BanMessage ✓
   - [ ] Không thể create room ✓
   - [ ] Vào `/profile` → thấy BanStatusCard ✓
   - [ ] BanStatusCard hiển thị:
     - [ ] Ban type (24h hoặc vĩnh viễn) ✓
     - [ ] Time remaining (nếu 24h) ✓
     - [ ] Violation types ✓
     - [ ] Ban date ✓

8. **Test Ban Management**
   - [ ] Login lại admin
   - [ ] Vào `/admin/bans` ✓
   - [ ] Thấy list of all bans ✓
   - [ ] Filter tabs work (Tất cả / Tạm thời / Vĩnh viễn) ✓
   - [ ] Thấy đầy đủ thông tin:
     - [ ] User name ✓
     - [ ] Riot ID ✓
     - [ ] Ban type ✓
     - [ ] Time remaining (nếu temporary) ✓
     - [ ] Associated report ✓
     - [ ] Violation types ✓
   - [ ] Click "Gỡ cấm" → thấy toast "Đã gỡ cấm thành công" ✓
   - [ ] Database check:
     - [ ] `bans` record deleted ✓
     - [ ] `profiles.ban_count` reset to 0 ✓
     - [ ] `profiles.banned_until` = NULL ✓
     - [ ] `banned_riot_ids` record deleted (nếu permanent) ✓

9. **Test Banned Riot ID Prevention**
   - [ ] Tạo account mới
   - [ ] Vào verification
   - [ ] Nhập Riot ID đã bị ban vĩnh viễn
   - [ ] Thấy error "Riot ID này đã bị cấm vĩnh viễn" ✓
   - [ ] Không thể verify ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

### 3. Match Result Tracking → Win Count Update (60+ phút)

#### Test Steps:

1. **Test Match Result Tracking**
   - [ ] Tạo room với 2+ players
   - [ ] Start game và trigger detection
   - [ ] Khi game detected, thấy status "⏱️ Đang chờ ghi nhận kết quả" ✓
   - [ ] Thấy game start time ✓
   - [ ] Thấy countdown 1 hour ✓
   - [ ] Database: `rooms.game_detected_at` có timestamp ✓

2. **Test After 1 Hour** (hoặc test manually bằng cách update database)
   - [ ] Sau 1 giờ, system tự động track match result ✓
   - [ ] Thấy status "✅ Đã ghi nhận kết quả" ✓
   - [ ] Database check:
     - [ ] Winner's `win_count` +1 ✓
     - [ ] All players' `total_games` +1 ✓
     - [ ] `match_results` table có records ✓

3. **Test Win Count Badge Display**
   - [ ] Vào room page → thấy win count badge dưới Riot ID ✓
   - [ ] Badge format: "🏆 X Top 1" (gold) hoặc "⭐ 0 Top 1" (gray) ✓
   - [ ] Vào `/queue` → thấy win count badge ở host info ✓
   - [ ] Vào `/profile` → thấy win count badge (large size) ✓

4. **Test Win Statistics Card**
   - [ ] Vào `/profile` ✓
   - [ ] Thấy WinStatsCard với:
     - [ ] Total wins (🏆 Top 1) ✓
     - [ ] Total games (🎮 Tổng trận) ✓
     - [ ] Win rate (📈 Tỷ lệ thắng) ✓
   - [ ] Win rate calculation đúng: (wins / total_games) * 100 ✓
   - [ ] Nếu chưa có game → thấy "Chưa có trận đấu" ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

### 4. Toast Notification System (2 phút)

#### Test Steps:

1. **Test Toast Types**
   - [ ] Copy Riot ID → thấy success toast (green) ✓
   - [ ] Report validation error → thấy error toast (red) ✓
   - [ ] Report success → thấy success toast (green) ✓
   - [ ] Admin ban success → thấy success toast (green) ✓
   - [ ] Admin unban success → thấy success toast (green) ✓

2. **Test Toast Behavior**
   - [ ] Toast slides in from top-right ✓
   - [ ] Toast auto-dismisses after 3 seconds ✓
   - [ ] Multiple toasts stack vertically ✓
   - [ ] Toast has correct icon for each type ✓
   - [ ] Toast has close button (X) ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

## 📊 Overall Results

### Summary:
- **Copy → Detect → Kick Flow**: ⬜ PASS / ⬜ FAIL
- **Report → Admin → Ban Flow**: ⬜ PASS / ⬜ FAIL
- **Match Tracking → Win Count**: ⬜ PASS / ⬜ FAIL
- **Toast Notifications**: ⬜ PASS / ⬜ FAIL

### Total Score: ___/4 (___%)

---

## 🎉 Success Criteria

Task 17 PASS nếu:
- ✅ All 4 flows PASS
- ✅ No critical bugs
- ✅ Database updates correctly
- ✅ Toast notifications work
- ✅ Admin dashboard functional

---

## 🐛 Issues Found

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
| | | | |

---

## ✅ Next Steps

Sau khi Task 17 PASS:
1. Mark Task 17 as complete
2. Skip Task 18.4 (Integration tests - optional)
3. Proceed to Task 19 (Final Checkpoint)
4. Deploy to production
5. Monitor for issues

---

**Test Date**: _______________
**Tested By**: _______________
**Environment**: ⬜ Production ⬜ Localhost
**Status**: ⬜ PASS ⬜ FAIL ⬜ IN PROGRESS

