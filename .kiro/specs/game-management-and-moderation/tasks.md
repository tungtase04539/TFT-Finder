# Implementation Plan: Game Management and Moderation System

## Overview

Implement hệ thống quản lý game và kiểm duyệt bao gồm: copy Riot ID, auto-detect game, kick players, report system, admin dashboard, ban system, và achievement tracking.

## Tasks

- [ ] 1. Database Migration - Add Required Tables and Columns
  - Create migration script for all new tables and columns
  - Add columns to profiles: role, ban_count, banned_until, win_count, total_games
  - Add columns to rooms: last_copy_action, game_detected_at
  - Create reports table with indexes
  - Create bans table with indexes
  - Create banned_riot_ids table
  - Create match_results table
  - Create Supabase Storage bucket for report-evidence
  - Add RLS policies for admin access
  - _Requirements: All requirements_

- [ ] 2. Copy Riot ID Feature
  - [ ] 2.1 Create CopyRiotIdButton component
    - Display copy button next to each player's Riot ID
    - Copy full Riot ID (GameName#TAG) to clipboard
    - Show visual confirmation (toast notification)
    - Record copy action timestamp to room.last_copy_action
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 2.2 Write unit tests for CopyRiotIdButton
    - Test clipboard copy functionality
    - Test visual feedback display
    - Test timestamp recording
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Copy Action Tracking System
  - [ ] 3.1 Create useCopyTracking hook
    - Track last_copy_action timestamp from room
    - Calculate time since last copy
    - Return shouldTriggerDetection flag (true if > 3 minutes)
    - Only active when room status = "ready"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 3.2 Integrate useCopyTracking into room page
    - Use hook to monitor copy actions
    - Trigger game detection when shouldTriggerDetection = true
    - Display countdown timer showing time until detection
    - _Requirements: 2.4, 2.5_

  - [ ] 3.3 Write property test for copy tracking
    - **Property 1: Copy Action Tracking Only When Ready**
    - **Validates: Requirements 2.2, 2.6**

  - [ ] 3.4 Write property test for detection trigger
    - **Property 2: Game Detection Trigger After 3 Minutes**
    - **Validates: Requirements 2.4**

- [ ] 4. Auto Game Detection and Player Removal
  - [ ] 4.1 Create API route /api/detect-game-participants
    - Accept roomId and puuids array
    - Query Riot API for recent matches
    - Find common match among players
    - Identify players in game vs not in game
    - Return playersInGame and playersNotInGame arrays
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.2 Create removePlayersNotInGame function
    - Remove players from room.players array
    - Remove players from room.players_agreed array
    - Update room in database
    - Notify remaining players via realtime
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 4.3 Integrate game detection into room page
    - Call detect-game-participants when timer triggers
    - Display detection status to users
    - Show list of players removed
    - Update room status to "playing" if successful
    - _Requirements: 3.5, 3.6, 4.4_

  - [ ] 4.4 Write property test for player removal
    - **Property 3: Players Not in Game Are Removed**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 5. Report System - Frontend Components
  - [ ] 5.1 Create ReportModal component
    - Display violation type checkboxes (game_sabotage, rule_violation, harassment, discrimination)
    - Text description textarea (optional)
    - Image upload input (max 3 files, 5MB each)
    - Image preview before upload
    - Submit button
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3_

  - [ ] 5.2 Create ReportButton component
    - Display report icon/button next to player name
    - Open ReportModal on click
    - Pass reported user info to modal
    - _Requirements: 5.1_

  - [ ] 5.3 Integrate ReportButton into PlayerList
    - Add report button to each player card
    - Cannot report yourself
    - _Requirements: 5.1_

  - [ ] 5.4 Write unit tests for ReportModal
    - Test violation type selection
    - Test image upload validation (size, count)
    - Test form submission
    - _Requirements: 5.3, 7.2, 7.3_

  - [ ] 5.5 Write property test for report validation
    - **Property 4: Report Requires Violation Type**
    - **Validates: Requirements 5.3**

  - [ ] 5.6 Write property test for image limits
    - **Property 5: Image Upload Limits**
    - **Validates: Requirements 7.2, 7.3**

- [ ] 6. Report System - Backend API
  - [ ] 6.1 Create API route /api/reports/create
    - Validate user is authenticated
    - Validate violation types array
    - Upload evidence files to Supabase Storage (report-evidence bucket)
    - Generate secure URLs for uploaded images
    - Create report record in database
    - Return success with reportId
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 7.4, 7.5_

  - [ ] 6.2 Write unit tests for report creation API
    - Test authentication check
    - Test violation type validation
    - Test image upload to storage
    - Test database record creation
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 7. Admin Account Setup
  - [ ] 7.1 Create admin account creation script
    - Create account with email admin@admin.com
    - Set password to Anhtung1998
    - Set role to "admin" in profiles table
    - Mark as verified
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 7.2 Create admin middleware
    - Check if user has role = "admin"
    - Redirect non-admins to home page
    - Apply to /admin/* routes
    - _Requirements: 9.2, 9.3_

  - [ ] 7.3 Write property test for admin access
    - **Property 10: Admin Role Required for Dashboard**
    - **Validates: Requirements 9.2, 9.3**

- [ ] 8. Admin Dashboard - Overview Page
  - [ ] 8.1 Create /admin/dashboard page
    - Protected route with admin middleware
    - Display statistics cards:
      * Total users count
      * Total rooms created count
      * Active rooms count
      * Pending reports count
      * Total bans count
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ] 8.2 Create API route /api/admin/stats
    - Query database for all statistics
    - Return counts for dashboard
    - Verify admin role
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ] 8.3 Write unit tests for admin stats API
    - Test admin role verification
    - Test statistics calculation
    - Test non-admin access denial
    - _Requirements: 9.2, 9.3_

- [ ] 9. Admin Dashboard - Report Management
  - [ ] 9.1 Create ReportCard component
    - Display reporter name, reported user name
    - Display violation types with Vietnamese labels
    - Display description text
    - Display evidence images in gallery
    - Approve and Reject buttons
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 9.2 Create BanModal component
    - Show user's current ban_count
    - Suggest ban type based on ban_count (0 → 24h, >=1 → permanent)
    - Confirm button to apply ban
    - _Requirements: 11.1, 11.2, 11.3, 12.1, 12.2_

  - [ ] 9.3 Integrate report management into dashboard
    - Display list of pending reports
    - Use ReportCard for each report
    - Open BanModal when approve clicked
    - Update report status when reject clicked
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 9.4 Write unit tests for report management
    - Test report list display
    - Test approve/reject actions
    - Test ban modal opening
    - _Requirements: 10.5, 10.6, 10.7_

- [ ] 10. Ban System - Backend
  - [ ] 10.1 Create API route /api/admin/apply-ban
    - Verify admin role
    - Get user's current ban_count
    - If temporary: set banned_until = now + 24 hours, ban_count++
    - If permanent: set banned_until = NULL, ban_count = 2, add Riot ID to banned list
    - Create ban record in bans table
    - Update report status to "approved"
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 13.1_

  - [ ] 10.2 Write property test for first ban
    - **Property 6: First Ban is 24 Hours**
    - **Validates: Requirements 11.1, 11.3**

  - [ ] 10.3 Write property test for second ban
    - **Property 7: Second Ban is Permanent**
    - **Validates: Requirements 12.1, 12.2**

  - [ ] 10.4 Write property test for Riot ID ban
    - **Property 8: Permanent Ban Includes Riot ID**
    - **Validates: Requirements 12.4, 13.1**

- [ ] 11. Ban System - Enforcement
  - [ ] 11.1 Create ban check middleware
    - Check if user is banned on every protected route
    - If banned and ban not expired, show ban message
    - If temporary ban expired, clear ban
    - _Requirements: 11.5, 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 11.2 Update verification to check banned Riot IDs
    - Query banned_riot_ids table during verification
    - Reject verification if Riot ID is banned
    - Show "Riot ID đã bị cấm vĩnh viễn" message
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [ ] 11.3 Write property test for banned Riot ID check
    - **Property 9: Banned Riot ID Prevents Verification**
    - **Validates: Requirements 13.2, 13.3**

  - [ ] 11.4 Write unit tests for ban enforcement
    - Test ban check on protected routes
    - Test temporary ban expiration
    - Test permanent ban enforcement
    - _Requirements: 11.5, 15.5_

- [ ] 12. Admin Dashboard - Ban Management
  - [ ] 12.1 Create BanList component
    - Display all active bans
    - Show user name, Riot ID, ban type, ban date
    - Show time remaining for temporary bans
    - Show associated report and reason
    - Unban button for each ban
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ] 12.2 Create API route /api/admin/unban
    - Verify admin role
    - Remove ban record
    - Reset user's ban_count
    - Remove Riot ID from banned list if permanent ban
    - _Requirements: 14.6_

  - [ ] 12.3 Integrate ban management into dashboard
    - Display BanList component
    - Handle unban action
    - Refresh ban list after unban
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ] 12.4 Write unit tests for ban management
    - Test ban list display
    - Test unban action
    - Test Riot ID removal on unban
    - _Requirements: 14.6_

- [ ] 13. User Ban Status Display
  - [ ] 13.1 Create BanStatusCard component
    - Display ban type (24h or permanent)
    - Show time remaining for temporary bans
    - Show violation types that led to ban
    - Show ban date
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 13.2 Integrate ban status into profile page
    - Display BanStatusCard if user is banned
    - Show prominent warning
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 13.3 Write unit tests for ban status display
    - Test temporary ban display
    - Test permanent ban display
    - Test time remaining calculation
    - _Requirements: 15.2, 15.3_

- [ ] 14. Achievement Tracking - Match Result Recording
  - [ ] 14.1 Create API route /api/track-match-result
    - Accept roomId and matchId
    - Query Riot API for match details
    - Extract player placements
    - Find winner (placement = 1)
    - Increment winner's win_count
    - Increment all players' total_games
    - Store results in match_results table
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ] 14.2 Create scheduleMatchResultTracking function
    - Store scheduled_check_at timestamp in rooms table (1 hour after game start)
    - Client polls to check if time reached
    - Call /api/track-match-result when time reached
    - Retry up to 3 times if match data not available
    - _Requirements: 16.1, 16.6_

  - [ ] 14.3 Integrate match result tracking into room page
    - Schedule tracking when game detection confirms match started
    - Poll every minute to check if scheduled time reached
    - Display tracking status to users
    - _Requirements: 16.1, 16.2_

  - [ ] 14.4 Write property test for win count increment
    - **Property 11: Win Count Increments for Winner**
    - **Validates: Requirements 16.3, 16.4**

  - [ ] 14.5 Write property test for total games increment
    - **Property 12: Total Games Increments for All Players**
    - **Validates: Requirements 16.5**

- [ ] 15. Achievement Display - Win Count Badge
  - [ ] 15.1 Create WinCountBadge component
    - Display "{count} Top 1" format
    - Gold color for wins > 0
    - Different sizes (sm, md, lg)
    - _Requirements: 17.1, 17.2, 17.3_

  - [ ] 15.2 Replace "Unranked" with win count in PlayerList
    - Use WinCountBadge instead of tft_tier display
    - Show below Riot ID
    - _Requirements: 17.4_

  - [ ] 15.3 Add win count to queue page player list
    - Display WinCountBadge for each player
    - _Requirements: 17.5_

  - [ ] 15.4 Add win count to profile page
    - Display prominently at top of profile
    - Use large size badge
    - _Requirements: 17.6_

  - [ ] 15.5 Write unit tests for win count display
    - Test badge rendering with different counts
    - Test size variations
    - Test color styling
    - _Requirements: 17.1, 17.2, 17.3_

- [ ] 16. Achievement Display - Win Statistics
  - [ ] 16.1 Create WinStatsCard component
    - Display total wins (win_count)
    - Display total games (total_games)
    - Calculate and display win rate percentage
    - Show "Chưa có trận đấu" if total_games = 0
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 16.2 Integrate WinStatsCard into profile page
    - Display prominently on profile
    - Show statistics in cards
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ] 16.3 Write property test for win rate calculation
    - **Property 13: Win Rate Calculation**
    - **Validates: Requirements 18.5**

  - [ ] 16.4 Write unit tests for win stats display
    - Test win rate calculation
    - Test zero games display
    - Test statistics formatting
    - _Requirements: 18.3, 18.4, 18.5_

- [ ] 17. Checkpoint - Test All Features
  - Ensure all tests pass
  - Test copy → detect → kick flow end-to-end
  - Test report → admin review → ban flow end-to-end
  - Test match result tracking → win count update
  - Test admin dashboard functionality
  - Test ban enforcement
  - Ask the user if questions arise

- [ ] 18. Final Integration and Polish
  - [ ] 18.1 Add loading states to all async operations
    - Copy button loading
    - Report submission loading
    - Ban application loading
    - _Requirements: All_

  - [ ] 18.2 Add error handling and user feedback
    - Toast notifications for success/error
    - Error messages for failed operations
    - Retry mechanisms for API failures
    - _Requirements: All_

  - [ ] 18.3 Add Vietnamese translations for all UI text
    - Violation type labels
    - Ban messages
    - Admin dashboard labels
    - _Requirements: 6.5, 13.4, 15.4_

  - [ ] 18.4 Write integration tests
    - Test full copy → detect → kick flow
    - Test full report → ban flow
    - Test full match tracking flow
    - _Requirements: All_

- [ ] 19. Final Checkpoint
  - Ensure all tests pass
  - Verify all features work correctly
  - Test on production environment
  - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows

