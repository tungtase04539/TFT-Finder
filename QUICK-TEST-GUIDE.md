# Quick Test Guide - 5 Minutes

## Prerequisites
✅ Database migration đã chạy thành công
✅ App đang chạy trên production/localhost

---

## Test 1: Copy Button (30 seconds)

1. Vào room → đợi status = "ready"
2. Thấy button "📋 Copy ID" bên cạnh mỗi player? ✓
3. Click copy → thấy "✓ Đã copy!"? ✓
4. Paste → có Riot ID? ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

## Test 2: Timer (1 minute)

1. Copy một Riot ID
2. Thấy countdown timer xuất hiện? ✓
3. Thấy progress bar chạy? ✓
4. Thấy thời gian đếm ngược (3:00 → 2:59...)? ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

## Test 3: Report Button (1 minute)

1. Thấy button "🚨 Báo cáo" bên cạnh players khác? ✓
2. KHÔNG thấy button bên cạnh tên mình? ✓
3. Click report → modal mở? ✓
4. Chọn violation type → submit → thành công? ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

## Test 4: Report với Images (2 minutes)

1. Mở report modal
2. Upload 1 ảnh → thấy preview? ✓
3. Upload thêm 2 ảnh → thấy 3 previews? ✓
4. Thử upload ảnh thứ 4 → bị chặn? ✓
5. Submit → thành công? ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

## Test 5: Database Check (30 seconds)

Mở Supabase Dashboard:

1. Table `rooms` → có `last_copy_action`? ✓
2. Table `reports` → có record mới? ✓
3. Storage `report-evidence` → có images? ✓

**Result**: ⬜ PASS / ⬜ FAIL

---

## Overall Result

- Tests Passed: ___/5
- Tests Failed: ___/5
- Success Rate: ___%

### Status:
⬜ ✅ ALL PASS - Ready for production
⬜ ⚠️ SOME FAIL - Need fixes
⬜ ❌ MOST FAIL - Major issues

---

## Common Issues & Fixes

### Copy button không hiện
- Check: Room status phải là "ready"
- Check: Database có column `last_copy_action`?

### Timer không chạy
- Check: Console có errors?
- Check: `useCopyTracking` hook được import?

### Report không submit được
- Check: Đã chọn violation type?
- Check: Storage bucket `report-evidence` đã tạo?
- Check: RLS policies đã set?

### Images không upload
- Check: File size < 5MB?
- Check: File type là image?
- Check: Storage bucket permissions?

---

## Next Steps

✅ All Pass → Continue với Task 7 (Admin Dashboard)
⚠️ Some Fail → Fix issues và test lại
❌ Most Fail → Review implementation

---

**Test Date**: _____________
**Tested By**: _____________
**Environment**: ⬜ Production ⬜ Localhost
