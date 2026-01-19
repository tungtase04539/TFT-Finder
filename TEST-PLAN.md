# Test Plan - Game Management & Moderation System

## Test Date: 2025-01-19

## Features to Test

### ✅ 1. Copy Riot ID Feature (Task 2.1)
**Components**: `CopyRiotIdButton.tsx`

**Test Cases**:
- [ ] Copy button appears next to each player when room status = "ready"
- [ ] Copy button does NOT appear when room status = "forming"
- [ ] Clicking copy button copies Riot ID to clipboard
- [ ] Visual feedback shows "Đang copy..." → "Đã copy!"
- [ ] Copy action updates `room.last_copy_action` timestamp in database
- [ ] Multiple copy actions update timestamp correctly

**Expected Behavior**:
- Button only visible in "ready" status
- Clipboard contains full Riot ID (GameName#TAG)
- Database timestamp updates on each copy
- Visual feedback resets after 2 seconds

---

### ✅ 2. Copy Action Tracking (Task 3.1-3.2)
**Components**: `useCopyTracking.ts`, Room Page

**Test Cases**:
- [ ] Countdown timer appears when room status = "ready"
- [ ] Timer shows "Copy lần cuối: [time]"
- [ ] Progress bar fills from 0% to 100% over 3 minutes
- [ ] Timer displays MM:SS format correctly
- [ ] Timer resets when new copy action occurs
- [ ] Warning message appears when timer reaches 0
- [ ] Timer only active when room status = "ready"

**Expected Behavior**:
- Timer starts counting from last copy action
- Progress bar animates smoothly
- After 3 minutes, shows "⚠️ Đã hết thời gian!"
- Timer stops when room status changes from "ready"

---

### ✅ 3. Auto Game Detection (Task 4.1-4.3)
**Components**: `/api/detect-game-participants`, `game-detection.ts`, Room Page

**Test Cases**:
- [ ] Detection triggers automatically after 3 minutes without copy
- [ ] API correctly identifies players in common match
- [ ] API returns playersInGame and playersNotInGame arrays
- [ ] Players not in game are removed from room
- [ ] Room status updates to "playing" if ≥2 players remain
- [ ] Room status updates to "cancelled" if <2 players remain
- [ ] Detection message displays to users
- [ ] `game_detected_at` timestamp updates in database

**Expected Behavior**:
- Automatic detection after 3-minute timer expires
- Correct player filtering based on Riot API match data
- Database updates reflect removed players
- UI shows detection status and results

**Test Scenarios**:
1. **All players in game**: Room status → "playing", no removals
2. **Some players not in game**: Remove non-participants, status → "playing" if ≥2 remain
3. **Most players not in game**: Remove non-participants, status → "cancelled" if <2 remain
4. **No common match found**: Show message, no removals

---

### ✅ 4. Report System - Frontend (Task 5.1-5.3)
**Components**: `ReportModal.tsx`, `ReportButton.tsx`

**Test Cases**:
- [ ] Report button appears next to each player (except yourself)
- [ ] Report button does NOT appear next to your own name
- [ ] Clicking report button opens modal
- [ ] Modal displays reported user's name
- [ ] Can select multiple violation types
- [ ] Cannot submit without selecting at least one violation type
- [ ] Description textarea has 1000 character limit
- [ ] Can upload up to 3 images
- [ ] Cannot upload more than 3 images
- [ ] Cannot upload images larger than 5MB
- [ ] Image preview displays before upload
- [ ] Can remove uploaded images
- [ ] Submit button disabled when no violation type selected
- [ ] Submit button shows loading state during submission
- [ ] Success message appears after submission
- [ ] Modal closes after successful submission

**Expected Behavior**:
- Modal UI is responsive and user-friendly
- Validation works correctly
- Image upload respects limits
- Form submission works end-to-end

---

### ✅ 5. Report System - Backend (Task 6.1)
**Components**: `/api/reports/create`

**Test Cases**:
- [ ] API requires authentication
- [ ] API validates required fields (roomId, reportedUserId, violationTypes)
- [ ] API validates violation types are valid
- [ ] API validates image count (max 3)
- [ ] API validates image sizes (max 5MB each)
- [ ] Images upload to Supabase Storage bucket "report-evidence"
- [ ] Report record created in database with correct data
- [ ] Evidence URLs stored in report record
- [ ] Report status defaults to "pending"
- [ ] API returns success with reportId

**Expected Behavior**:
- Proper validation and error handling
- Images stored in correct storage bucket
- Database record created correctly
- API returns appropriate status codes

**Test Scenarios**:
1. **Valid report with images**: Success, images uploaded, record created
2. **Valid report without images**: Success, no images, record created
3. **Invalid violation types**: Error 400
4. **Too many images**: Error 400
5. **Oversized images**: Error 400
6. **Unauthenticated request**: Error 401

---

## Integration Tests

### End-to-End Flow 1: Copy → Detect → Kick
1. Create room with 4+ players
2. All players agree to rules → room status = "ready"
3. Copy Riot IDs to invite players
4. Wait 3 minutes without copying
5. System automatically detects game
6. Players not in game are removed
7. Room status updates to "playing"

**Expected Result**: Automatic detection works, correct players removed, status updated

---

### End-to-End Flow 2: Report Submission
1. Join room with other players
2. Click report button on another player
3. Select violation types
4. Add description
5. Upload 2 images
6. Submit report
7. Check database for report record
8. Check storage for uploaded images

**Expected Result**: Report created successfully, images uploaded, data stored correctly

---

## Database Verification

### Tables to Check:
- [ ] `rooms.last_copy_action` - Updates on copy
- [ ] `rooms.game_detected_at` - Updates on detection
- [ ] `rooms.players` - Players removed correctly
- [ ] `rooms.players_agreed` - Agreed players removed correctly
- [ ] `reports` - Report records created
- [ ] `reports.evidence_urls` - Image URLs stored

### Storage to Check:
- [ ] `report-evidence` bucket - Images uploaded
- [ ] File naming: `{userId}/{timestamp}_{index}_{filename}`
- [ ] Files accessible via public URL

---

## Performance Tests

- [ ] Copy action responds within 500ms
- [ ] Timer updates smoothly every second
- [ ] Game detection API responds within 5 seconds
- [ ] Report submission with 3 images completes within 10 seconds
- [ ] Image upload handles 5MB files without timeout

---

## Error Handling Tests

### Copy Feature:
- [ ] Network error during copy → Show error message
- [ ] Room not found → Prevent copy action

### Detection Feature:
- [ ] Riot API rate limit → Retry logic works
- [ ] No common match → Show appropriate message
- [ ] API timeout → Show error message

### Report Feature:
- [ ] Image upload fails → Show error, allow retry
- [ ] Network error → Show error message
- [ ] Invalid data → Show validation errors

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Mobile Responsiveness

- [ ] Copy button visible and clickable on mobile
- [ ] Timer displays correctly on mobile
- [ ] Report modal scrollable on mobile
- [ ] Image upload works on mobile
- [ ] All buttons accessible on mobile

---

## Security Tests

- [ ] Cannot report yourself
- [ ] Cannot submit report without authentication
- [ ] Cannot upload files other than images
- [ ] Cannot bypass image size limits
- [ ] Cannot bypass image count limits
- [ ] Storage bucket has correct RLS policies

---

## Status: READY FOR TESTING

All features implemented and built successfully. Ready for comprehensive testing.
