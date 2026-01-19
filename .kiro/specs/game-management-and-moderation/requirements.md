# Requirements Document: Game Management and Moderation System

## Introduction

Hệ thống quản lý game và kiểm duyệt cho phép host mời người chơi, tự động phát hiện ai đã vào game, kick người không tham gia, và xử lý các báo cáo vi phạm từ người dùng thông qua admin dashboard.

## Glossary

- **System**: TFT Finder Application
- **Host**: Người tạo phòng và có quyền quản lý
- **Player**: Người chơi trong phòng
- **Admin**: Tài khoản quản trị viên có quyền xem dashboard và duyệt report
- **Report**: Báo cáo vi phạm từ người dùng
- **Copy_Action**: Hành động sao chép Riot ID để mời người chơi
- **Game_Detection**: Quá trình phát hiện người chơi đã vào game
- **Riot_ID**: Tên game của người chơi (format: GameName#TAG)
- **Win_Count**: Số lần đạt top 1 qua app
- **Match_Tracking**: Theo dõi kết quả trận đấu sau 1 tiếng

## Requirements

### Requirement 1: Copy Riot ID to Invite Players

**User Story:** As a player, I want to copy other players' Riot IDs, so that I can invite them to the TFT game lobby.

#### Acceptance Criteria

1. WHEN a player views the player list in a room, THE System SHALL display a copy button next to each player's Riot ID
2. WHEN a player clicks the copy button, THE System SHALL copy the full Riot ID (GameName#TAG) to clipboard
3. WHEN a copy action occurs, THE System SHALL record the timestamp of the copy action
4. WHEN a copy action occurs, THE System SHALL show a visual confirmation to the user
5. WHEN displaying Riot IDs, THE System SHALL format them as "GameName#TAG"

### Requirement 2: Track Copy Actions for Game Detection

**User Story:** As the system, I want to track when players copy Riot IDs after all players agree to rules, so that I can determine when invitation phase is complete.

#### Acceptance Criteria

1. WHEN all players have agreed to rules, THE System SHALL change room status to "ready"
2. WHEN the room status is "ready", THE System SHALL begin tracking copy actions
3. WHEN a copy action occurs in a "ready" room, THE System SHALL store the copy timestamp
4. WHEN 3 minutes pass without any copy action in a "ready" room, THE System SHALL trigger game detection
5. WHEN a new copy action occurs, THE System SHALL reset the 3-minute timer
6. WHEN room status is not "ready", THE System SHALL NOT track copy actions
7. WHEN room status changes from "ready" to another status, THE System SHALL clear the copy action timer

### Requirement 3: Auto-Detect Players in Game

**User Story:** As the system, I want to automatically detect which players have joined the game after the invitation phase, so that I can identify who is actually playing.

#### Acceptance Criteria

1. WHEN 3 minutes pass without copy actions in a "ready" room, THE System SHALL check which players are in a common match
2. WHEN checking for players in game, THE System SHALL query Riot API for recent matches of all room players
3. WHEN players are found in a common match, THE System SHALL identify which room players are present in that match
4. WHEN some players are not in the match, THE System SHALL mark them as "not joined"
5. WHEN at least 2 players are in the match, THE System SHALL proceed with game detection
6. WHEN all players are in the match, THE System SHALL update room status to "playing"

### Requirement 4: Remove Players Not in Game

**User Story:** As a host, I want players who didn't join the game to be automatically removed, so that the room only contains active players.

#### Acceptance Criteria

1. WHEN game detection identifies players not in the match, THE System SHALL remove them from the room's player list
2. WHEN a player is removed for not joining, THE System SHALL update the room's players array
3. WHEN a player is removed for not joining, THE System SHALL update the room's players_agreed array
4. WHEN a player is removed for not joining, THE System SHALL notify remaining players
5. WHEN a player is removed for not joining, THE System SHALL record the removal reason

### Requirement 5: Report System - Submit Reports

**User Story:** As a player, I want to report other players for violations, so that inappropriate behavior can be addressed.

#### Acceptance Criteria

1. WHEN viewing a player in the room, THE System SHALL display a report button
2. WHEN a player clicks report, THE System SHALL show a report form with violation type options
3. WHEN submitting a report, THE System SHALL require the reporter to select at least one violation type
4. WHEN submitting a report, THE System SHALL allow the reporter to add text description
5. WHEN submitting a report, THE System SHALL allow the reporter to upload image evidence (optional)
6. WHEN a report is submitted, THE System SHALL store the report with status "pending"
7. WHEN a report is submitted, THE System SHALL include room_id, reporter_id, reported_user_id, and timestamp

### Requirement 6: Report Violation Types

**User Story:** As a player, I want to select specific violation types when reporting, so that my report is categorized correctly.

#### Acceptance Criteria

1. THE System SHALL support violation type "game_sabotage" (phá game)
2. THE System SHALL support violation type "rule_violation" (phá luật)
3. THE System SHALL support violation type "harassment" (lăng mạ)
4. THE System SHALL support violation type "discrimination" (phân biệt)
5. WHEN displaying violation types, THE System SHALL show Vietnamese labels
6. WHEN submitting a report, THE System SHALL allow multiple violation types to be selected

### Requirement 7: Report Image Upload

**User Story:** As a player, I want to attach screenshot evidence to my report, so that admins can see proof of violations.

#### Acceptance Criteria

1. WHEN uploading report evidence, THE System SHALL accept image files (PNG, JPG, JPEG, WebP)
2. WHEN uploading report evidence, THE System SHALL limit file size to 5MB per image
3. WHEN uploading report evidence, THE System SHALL allow up to 3 images per report
4. WHEN an image is uploaded, THE System SHALL store it in Supabase Storage
5. WHEN an image is uploaded, THE System SHALL generate a secure URL for admin viewing

### Requirement 8: Admin Account Creation

**User Story:** As a system administrator, I want a dedicated admin account, so that I can access moderation features.

#### Acceptance Criteria

1. THE System SHALL create an admin account with email "admin@admin.com"
2. THE System SHALL set the admin account password to "Anhtung1998"
3. WHEN the admin account is created, THE System SHALL set the role to "admin" in profiles table
4. WHEN the admin account is created, THE System SHALL mark it as verified
5. THE System SHALL prevent regular users from having "admin" role

### Requirement 9: Admin Dashboard - Overview

**User Story:** As an admin, I want to view app statistics on a dashboard, so that I can monitor platform health.

#### Acceptance Criteria

1. WHEN an admin logs in, THE System SHALL display a dashboard link in navigation
2. WHEN accessing the dashboard, THE System SHALL verify the user has "admin" role
3. WHEN a non-admin tries to access dashboard, THE System SHALL redirect to home page
4. WHEN displaying the dashboard, THE System SHALL show total users count
5. WHEN displaying the dashboard, THE System SHALL show total rooms created count
6. WHEN displaying the dashboard, THE System SHALL show active rooms count
7. WHEN displaying the dashboard, THE System SHALL show pending reports count
8. WHEN displaying the dashboard, THE System SHALL show total bans count

### Requirement 10: Admin Dashboard - Report Management

**User Story:** As an admin, I want to review and process user reports, so that I can take action on violations.

#### Acceptance Criteria

1. WHEN viewing the dashboard, THE System SHALL display a list of pending reports
2. WHEN displaying reports, THE System SHALL show reporter name, reported user name, violation types, and timestamp
3. WHEN displaying reports, THE System SHALL show report description text
4. WHEN displaying reports, THE System SHALL show uploaded image evidence
5. WHEN viewing a report, THE System SHALL allow admin to approve or reject it
6. WHEN admin approves a report, THE System SHALL update report status to "approved"
7. WHEN admin rejects a report, THE System SHALL update report status to "rejected"
8. WHEN admin approves a report, THE System SHALL allow admin to apply a ban

### Requirement 11: Ban System - First Offense

**User Story:** As an admin, I want to ban users for 24 hours on first offense, so that violations have consequences.

#### Acceptance Criteria

1. WHEN admin bans a user for the first time, THE System SHALL create a ban record with duration 24 hours
2. WHEN a first-time ban is applied, THE System SHALL set ban_count to 1 in user profile
3. WHEN a first-time ban is applied, THE System SHALL set banned_until timestamp to 24 hours from now
4. WHEN a first-time ban is applied, THE System SHALL record the ban reason
5. WHEN a banned user tries to join queue, THE System SHALL prevent them and show ban message

### Requirement 12: Ban System - Second Offense

**User Story:** As an admin, I want to permanently ban users on second offense, so that repeat offenders are removed.

#### Acceptance Criteria

1. WHEN admin bans a user who already has ban_count >= 1, THE System SHALL create a permanent ban
2. WHEN a permanent ban is applied, THE System SHALL set banned_until to NULL (permanent)
3. WHEN a permanent ban is applied, THE System SHALL set ban_count to 2
4. WHEN a permanent ban is applied, THE System SHALL also ban the user's Riot ID
5. WHEN a permanently banned user tries to login, THE System SHALL show permanent ban message

### Requirement 13: Ban System - Riot ID Ban

**User Story:** As an admin, I want to ban Riot IDs on permanent bans, so that users cannot create new accounts with the same game identity.

#### Acceptance Criteria

1. WHEN a permanent ban is applied, THE System SHALL add the user's Riot ID to banned_riot_ids table
2. WHEN a user tries to verify with a banned Riot ID, THE System SHALL reject verification
3. WHEN checking for banned Riot IDs, THE System SHALL match against the full Riot ID (name + tag)
4. WHEN displaying ban reason to user, THE System SHALL show "Riot ID đã bị cấm vĩnh viễn"
5. THE System SHALL maintain a list of all banned Riot IDs with ban date and reason

### Requirement 14: Admin Dashboard - Ban Management

**User Story:** As an admin, I want to view and manage all bans, so that I can review ban history and make adjustments.

#### Acceptance Criteria

1. WHEN viewing the dashboard, THE System SHALL display a list of all active bans
2. WHEN displaying bans, THE System SHALL show user name, Riot ID, ban type (24h or permanent), and ban date
3. WHEN displaying bans, THE System SHALL show time remaining for temporary bans
4. WHEN viewing a ban, THE System SHALL show the associated report and reason
5. WHEN viewing a permanent ban, THE System SHALL allow admin to unban if needed
6. WHEN admin unbans a user, THE System SHALL remove the ban record and reset ban_count

### Requirement 15: User Ban Status Display

**User Story:** As a banned user, I want to see my ban status and reason, so that I understand why I cannot use the platform.

#### Acceptance Criteria

1. WHEN a banned user logs in, THE System SHALL display their ban status on profile page
2. WHEN displaying ban status, THE System SHALL show ban type (24h or permanent)
3. WHEN displaying a temporary ban, THE System SHALL show time remaining
4. WHEN displaying ban reason, THE System SHALL show the violation types
5. WHEN a temporary ban expires, THE System SHALL automatically allow user to access platform again

### Requirement 16: Track Match Results After Game Start

**User Story:** As the system, I want to track match results 1 hour after game starts, so that I can record player achievements.

#### Acceptance Criteria

1. WHEN game detection confirms match has started, THE System SHALL schedule a result check for 1 hour later
2. WHEN 1 hour has passed since game start, THE System SHALL query Riot API for match results
3. WHEN match results are retrieved, THE System SHALL identify the winner (placement = 1)
4. WHEN a winner is identified, THE System SHALL increment their win_count in profiles table
5. WHEN match results are retrieved, THE System SHALL store all player placements
6. WHEN match results cannot be retrieved after 1 hour, THE System SHALL retry up to 3 times with 10-minute intervals

### Requirement 17: Display Win Count Achievement

**User Story:** As a player, I want to see my win count displayed in player lists, so that others can see my achievements.

#### Acceptance Criteria

1. WHEN displaying a player in any player list, THE System SHALL show their win_count
2. WHEN a player has win_count = 0, THE System SHALL display "0 Top 1"
3. WHEN a player has win_count > 0, THE System SHALL display "{count} Top 1"
4. WHEN displaying player info in room, THE System SHALL replace "Unranked" text with win count
5. WHEN displaying player info in queue, THE System SHALL show win count below Riot ID
6. WHEN displaying player info in profile, THE System SHALL prominently show total win count

### Requirement 18: Win Count Statistics

**User Story:** As a player, I want to see detailed win statistics on my profile, so that I can track my performance.

#### Acceptance Criteria

1. WHEN viewing profile page, THE System SHALL display total wins (top 1 count)
2. WHEN viewing profile page, THE System SHALL display total games played through the app
3. WHEN viewing profile page, THE System SHALL calculate and display win rate percentage
4. WHEN a player has played 0 games, THE System SHALL display "Chưa có trận đấu"
5. WHEN calculating win rate, THE System SHALL use formula: (win_count / total_games) * 100

### Requirement 19: Single Room Constraint

**User Story:** As the system, I want to ensure users can only be in one room at a time, so that there are no conflicts or duplicate participation.

#### Acceptance Criteria

1. WHEN a user joins a new room, THE System SHALL check if they are already in another active room
2. WHEN a user is already in an active room, THE System SHALL automatically remove them from the old room before joining the new one
3. WHEN checking for active rooms, THE System SHALL consider rooms with status "forming", "editing", "ready", or "playing"
4. WHEN a user is removed from old room due to joining new room, THE System SHALL update both rooms' player lists
5. WHEN a user creates a new room, THE System SHALL remove them from any existing active room first
6. WHEN displaying room list in queue, THE System SHALL not show rooms the user is already in

## Notes

- Copy action tracking sử dụng room state hoặc Supabase realtime
- Game detection tích hợp với match detection system đã có
- Report images lưu trong Supabase Storage bucket "report-evidence"
- Admin role được lưu trong profiles.role column
- Ban system cần migration để thêm các columns: ban_count, banned_until, role
- Cần tạo tables: reports, bans, banned_riot_ids
- Win tracking cần thêm columns: win_count, total_games vào profiles table
- Match result tracking sử dụng scheduled job hoặc background task (1 hour delay)
- Win count hiển thị thay cho "Unranked" text trong player lists
