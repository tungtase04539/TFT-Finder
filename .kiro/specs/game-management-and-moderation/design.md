# Design Document: Game Management and Moderation System

## Overview

Hệ thống quản lý game và kiểm duyệt bao gồm 4 module chính:
1. **Copy & Invite System** - Cho phép copy Riot ID và track invitation phase
2. **Auto Game Detection** - Tự động phát hiện ai đã vào game và kick người không tham gia
3. **Report & Moderation System** - Cho phép report vi phạm với text + hình ảnh
4. **Admin Dashboard** - Quản lý reports, bans, và xem thống kê
5. **Achievement Tracking** - Theo dõi và hiển thị thành tích top 1

## Architecture

### Database Schema Changes

#### Profiles Table - Add Columns
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0;
```

#### Rooms Table - Add Columns
```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_copy_action TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_detected_at TIMESTAMPTZ;
```

#### Reports Table - New
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  violation_types TEXT[] NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
```

#### Bans Table - New
```sql
CREATE TABLE bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  ban_type TEXT NOT NULL, -- temporary, permanent
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id),
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_bans_user_id ON bans(user_id);
CREATE INDEX idx_bans_active ON bans(is_active) WHERE is_active = TRUE;
```

#### Banned Riot IDs Table - New
```sql
CREATE TABLE banned_riot_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_id TEXT UNIQUE NOT NULL,
  puuid TEXT,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES profiles(id),
  banned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banned_riot_ids_riot_id ON banned_riot_ids(riot_id);
```

#### Match Results Table - New
```sql
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  placement INTEGER NOT NULL,
  level INTEGER,
  gold_left INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

CREATE INDEX idx_match_results_room_id ON match_results(room_id);
CREATE INDEX idx_match_results_player_id ON match_results(player_id);
```

### Supabase Storage Bucket

```sql
-- Create storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false);

-- RLS policy for report evidence
CREATE POLICY "Admins can view all evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-evidence' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

CREATE POLICY "Users can upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-evidence' AND
  auth.uid() = owner
);
```

## Components and Interfaces

### 1. Copy & Invite System

#### Component: CopyRiotIdButton
```typescript
interface CopyRiotIdButtonProps {
  riotId: string;
  roomId: string;
  onCopy?: () => void;
}

// Features:
// - Copy full Riot ID (GameName#TAG) to clipboard
// - Show visual confirmation (toast/checkmark)
// - Record copy action timestamp to room
// - Reset 3-minute timer
```

#### Hook: useCopyTracking
```typescript
interface UseCopyTrackingOptions {
  roomId: string;
  roomStatus: string;
  enabled: boolean;
}

interface UseCopyTrackingReturn {
  lastCopyTime: Date | null;
  timeSinceLastCopy: number; // milliseconds
  shouldTriggerDetection: boolean; // true if > 3 minutes
}

// Features:
// - Track last copy action timestamp
// - Calculate time since last copy
// - Trigger game detection after 3 minutes
// - Only active when room status = "ready"
```

### 2. Auto Game Detection

#### API Route: /api/detect-game-participants
```typescript
POST /api/detect-game-participants
Request: {
  roomId: string;
  puuids: string[];
}

Response: {
  matchFound: boolean;
  matchId?: string;
  playersInGame: string[]; // PUUIDs
  playersNotInGame: string[]; // PUUIDs
  message: string;
}

// Logic:
// 1. Query Riot API for recent matches of all players
// 2. Find common match
// 3. Identify who is in the match
// 4. Return list of players in/not in game
```

#### Function: removePlayersNotInGame
```typescript
async function removePlayersNotInGame(
  roomId: string,
  playersToRemove: string[]
): Promise<void> {
  // 1. Get current room data
  // 2. Remove players from players array
  // 3. Remove players from players_agreed array
  // 4. Update room in database
  // 5. Notify remaining players via realtime
}
```

### 3. Report System

#### Component: ReportModal
```typescript
interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  roomId: string;
  onClose: () => void;
  onSubmit: () => void;
}

// Features:
// - Select violation types (multiple)
// - Text description (optional)
// - Upload images (max 3, 5MB each)
// - Submit report
```

#### Component: ReportButton
```typescript
interface ReportButtonProps {
  userId: string;
  userName: string;
  roomId: string;
}

// Features:
// - Show report icon/button
// - Open ReportModal on click
// - Disabled if already reported this user in this room
```

#### API Route: /api/reports/create
```typescript
POST /api/reports/create
Request: {
  roomId: string;
  reportedUserId: string;
  violationTypes: string[]; // ['game_sabotage', 'harassment', etc]
  description?: string;
  evidenceFiles?: File[]; // Max 3 files
}

Response: {
  success: boolean;
  reportId: string;
  message: string;
}

// Logic:
// 1. Validate user is authenticated
// 2. Validate violation types
// 3. Upload evidence files to Supabase Storage
// 4. Create report record in database
// 5. Return success
```

### 4. Admin Dashboard

#### Page: /admin/dashboard
```typescript
// Protected route - only accessible by role = 'admin'

// Sections:
// 1. Statistics Cards
//    - Total Users
//    - Total Rooms
//    - Active Rooms
//    - Pending Reports
//    - Total Bans
//
// 2. Pending Reports List
//    - Reporter name
//    - Reported user name
//    - Violation types
//    - Description
//    - Evidence images
//    - Approve/Reject buttons
//
// 3. Active Bans List
//    - User name
//    - Riot ID
//    - Ban type (24h / permanent)
//    - Time remaining (for temporary)
//    - Unban button
```

#### Component: ReportCard
```typescript
interface ReportCardProps {
  report: Report;
  onApprove: (reportId: string) => void;
  onReject: (reportId: string) => void;
}

// Features:
// - Display report details
// - Show evidence images in gallery
// - Approve button → opens BanModal
// - Reject button → updates status to rejected
```

#### Component: BanModal
```typescript
interface BanModalProps {
  userId: string;
  reportId: string;
  currentBanCount: number;
  onConfirm: (banType: 'temporary' | 'permanent') => void;
  onClose: () => void;
}

// Features:
// - Show user's current ban count
// - If ban_count = 0 → suggest 24h ban
// - If ban_count >= 1 → suggest permanent ban
// - Confirm button applies ban
```

#### API Route: /api/admin/apply-ban
```typescript
POST /api/admin/apply-ban
Request: {
  userId: string;
  reportId: string;
  banType: 'temporary' | 'permanent';
  reason: string;
}

Response: {
  success: boolean;
  message: string;
}

// Logic:
// 1. Verify admin role
// 2. Get user's current ban_count
// 3. If temporary: set banned_until = now + 24 hours
// 4. If permanent: set banned_until = NULL, add Riot ID to banned list
// 5. Increment ban_count
// 6. Create ban record
// 7. Update report status to approved
```

### 5. Achievement Tracking

#### API Route: /api/track-match-result
```typescript
POST /api/track-match-result
Request: {
  roomId: string;
  matchId: string;
}

Response: {
  success: boolean;
  winner: {
    userId: string;
    riotId: string;
    newWinCount: number;
  };
  placements: Array<{
    userId: string;
    placement: number;
  }>;
}

// Logic:
// 1. Query Riot API for match details
// 2. Extract player placements
// 3. Find winner (placement = 1)
// 4. Increment winner's win_count
// 5. Increment all players' total_games
// 6. Store match results in match_results table
```

#### Function: scheduleMatchResultTracking
```typescript
async function scheduleMatchResultTracking(
  roomId: string,
  matchId: string,
  gameStartTime: Date
): Promise<void> {
  // Schedule API call for 1 hour after game start
  // Options:
  // 1. Use Supabase Edge Functions with cron
  // 2. Use client-side setTimeout (not reliable)
  // 3. Use background job queue (Vercel Cron, etc)
  
  // For MVP: Store scheduled_check_at in rooms table
  // Client polls and triggers check when time is reached
}
```

#### Component: WinCountBadge
```typescript
interface WinCountBadgeProps {
  winCount: number;
  size?: 'sm' | 'md' | 'lg';
}

// Features:
// - Display "{count} Top 1"
// - Replace "Unranked" text
// - Show in player lists (room, queue, profile)
// - Gold color for wins > 0
```

## Data Models

### Report Model
```typescript
interface Report {
  id: string;
  roomId: string | null;
  reporterId: string;
  reportedUserId: string;
  violationTypes: ViolationType[];
  description: string | null;
  evidenceUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

type ViolationType = 
  | 'game_sabotage'
  | 'rule_violation'
  | 'harassment'
  | 'discrimination';
```

### Ban Model
```typescript
interface Ban {
  id: string;
  userId: string;
  reportId: string | null;
  banType: 'temporary' | 'permanent';
  reason: string;
  bannedBy: string;
  bannedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}
```

### Match Result Model
```typescript
interface MatchResult {
  id: string;
  roomId: string;
  matchId: string;
  playerId: string;
  placement: number;
  level: number;
  goldLeft: number;
  recordedAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Copy Action Tracking Only When Ready
*For any* room, copy actions should only be tracked when room status equals "ready"
**Validates: Requirements 2.2, 2.6**

### Property 2: Game Detection Trigger After 3 Minutes
*For any* room in "ready" status, if 3 minutes pass without a copy action, game detection should be triggered
**Validates: Requirements 2.4**

### Property 3: Players Not in Game Are Removed
*For any* game detection result, all players identified as "not in game" should be removed from the room's player list
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: Report Requires Violation Type
*For any* report submission, at least one violation type must be selected
**Validates: Requirements 5.3**

### Property 5: Image Upload Limits
*For any* report with evidence, the number of images should not exceed 3 and each image size should not exceed 5MB
**Validates: Requirements 7.2, 7.3**

### Property 6: First Ban is 24 Hours
*For any* user with ban_count = 0, when banned, the ban duration should be 24 hours
**Validates: Requirements 11.1, 11.3**

### Property 7: Second Ban is Permanent
*For any* user with ban_count >= 1, when banned, the ban should be permanent (banned_until = NULL)
**Validates: Requirements 12.1, 12.2**

### Property 8: Permanent Ban Includes Riot ID
*For any* permanent ban, the user's Riot ID should be added to the banned_riot_ids table
**Validates: Requirements 12.4, 13.1**

### Property 9: Banned Riot ID Prevents Verification
*For any* verification attempt, if the Riot ID exists in banned_riot_ids table, verification should be rejected
**Validates: Requirements 13.2, 13.3**

### Property 10: Admin Role Required for Dashboard
*For any* dashboard access attempt, the user must have role = 'admin'
**Validates: Requirements 9.2, 9.3**

### Property 11: Win Count Increments for Winner
*For any* match result where a player has placement = 1, that player's win_count should increment by 1
**Validates: Requirements 16.3, 16.4**

### Property 12: Total Games Increments for All Players
*For any* match result, all players in the match should have their total_games incremented by 1
**Validates: Requirements 16.5**

### Property 13: Win Rate Calculation
*For any* player with total_games > 0, win rate should equal (win_count / total_games) * 100
**Validates: Requirements 18.5**

## Error Handling

### Copy Action Errors
- Network failure during copy tracking → Retry with exponential backoff
- Room not found → Show error message to user
- User not in room → Prevent copy action

### Game Detection Errors
- Riot API rate limit → Wait and retry
- No common match found → Continue polling
- Match data incomplete → Retry up to 3 times

### Report Submission Errors
- Image upload failure → Show error, allow retry
- Invalid violation type → Show validation error
- User already reported → Show "Already reported" message

### Ban Application Errors
- User not found → Show error to admin
- Ban already exists → Update existing ban
- Riot ID ban failure → Log error, continue with user ban

### Achievement Tracking Errors
- Match result not available after 1 hour → Retry 3 times with 10-minute intervals
- Riot API error → Log error, schedule retry
- Database update failure → Rollback and retry

## Testing Strategy

### Unit Tests
- Test copy action tracking logic
- Test 3-minute timer calculation
- Test game detection player filtering
- Test ban duration calculation (24h vs permanent)
- Test win rate calculation
- Test image upload validation (size, count)
- Test violation type validation

### Property-Based Tests
- Property 1: Copy tracking only when ready
- Property 2: Game detection after 3 minutes
- Property 3: Players not in game removed
- Property 4: Report requires violation type
- Property 5: Image upload limits
- Property 6: First ban is 24h
- Property 7: Second ban is permanent
- Property 8: Permanent ban includes Riot ID
- Property 9: Banned Riot ID prevents verification
- Property 10: Admin role required
- Property 11: Win count increments for winner
- Property 12: Total games increments for all
- Property 13: Win rate calculation

### Integration Tests
- Test full copy → detect → kick flow
- Test report submission → admin review → ban flow
- Test match result tracking → win count update flow
- Test admin dashboard data loading
- Test ban enforcement (prevent queue join, show ban message)

### Manual Testing
- Test copy button UX and visual feedback
- Test report modal with image upload
- Test admin dashboard UI and workflows
- Test ban message display for banned users
- Test win count display in various locations

## Implementation Notes

### Copy Tracking Implementation
- Use Supabase realtime to sync last_copy_action across clients
- Client-side timer checks every 10 seconds if 3 minutes passed
- When timer triggers, call game detection API

### Game Detection Implementation
- Reuse existing /api/check-match-started logic
- Add filtering to identify who is NOT in the match
- Call removePlayersNotInGame function
- Update room status to "playing" if at least 2 players in game

### Report Image Upload
- Use Supabase Storage client-side upload
- Generate unique filenames: `{reportId}/{timestamp}_{filename}`
- Store URLs in reports.evidence_urls array
- Implement image preview before upload

### Admin Dashboard
- Server-side rendering for better SEO
- Use Supabase RLS to enforce admin-only access
- Real-time updates for new reports (Supabase realtime)
- Pagination for reports and bans lists

### Achievement Tracking
- Store scheduled_check_at timestamp in rooms table
- Client polls every minute to check if time reached
- When reached, call /api/track-match-result
- Handle race conditions (multiple clients checking)
- Use database transaction for win_count increment

### Ban Enforcement
- Check ban status on every protected route
- Middleware to verify user is not banned
- Show ban message with time remaining
- Auto-unban when temporary ban expires (cron job or check on login)
