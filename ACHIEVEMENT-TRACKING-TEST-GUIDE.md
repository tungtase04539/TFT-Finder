# Achievement Tracking - Test Guide

## 🎯 Features to Test

### 1. Match Result Tracking
- ✅ Automatic tracking 1 hour after game detected
- ✅ Win count increment for winner
- ✅ Total games increment for all players
- ✅ Match results stored in database

### 2. Win Count Badge Display
- ✅ Shows in room page player list
- ✅ Shows in queue page (host info)
- ✅ Shows in profile page
- ✅ Different sizes (sm, md, lg)
- ✅ Gold color for wins > 0, gray for 0 wins

### 3. Win Statistics Card
- ✅ Shows total wins
- ✅ Shows total games
- ✅ Shows win rate percentage
- ✅ Shows "Chưa có trận đấu" if no games

## 📝 Test Scenarios

### Scenario 1: View Win Count in Room
1. Go to `/queue`
2. Join or create a room
3. Go to room page
4. **Expected**: See win count badge below each player's Riot ID
5. **Badge format**: "🏆 X Top 1" (gold) or "⭐ 0 Top 1" (gray)

### Scenario 2: View Win Count in Queue
1. Go to `/queue`
2. Browse available rooms
3. **Expected**: See win count badge below host's name in each room card
4. **Badge format**: Small size, shows host's win count

### Scenario 3: View Win Statistics on Profile
1. Go to `/profile`
2. **Expected**: See two new sections:
   - Win count badge (large size) in "Thông tin tài khoản"
   - Win statistics card showing:
     * Total wins (🏆 Top 1)
     * Total games (🎮 Tổng trận)
     * Win rate (📈 Tỷ lệ thắng)
3. **If no games**: Shows "Chưa có trận đấu" message

### Scenario 4: Match Result Tracking (Full Flow)
1. Create a room with 2+ players
2. All players agree to rules
3. Copy Riot IDs and start a TFT game
4. Wait for game detection (auto after 3 minutes)
5. **Expected**: See "🎮 Đang theo dõi trận đấu..." status
6. When game detected, see "⏱️ Đang chờ ghi nhận kết quả" status
7. **Expected**: Shows game start time and 1-hour countdown
8. After 1 hour, system tracks match result
9. **Expected**: See "✅ Đã ghi nhận kết quả" status
10. Winner's win_count increments by 1
11. All players' total_games increments by 1
12. Check profile page to see updated statistics

### Scenario 5: Win Rate Calculation
1. Go to `/profile`
2. Check win statistics card
3. **Expected**: Win rate = (win_count / total_games) * 100
4. **Example**: 
   - 3 wins, 10 games → 30.0% win rate
   - 0 wins, 5 games → 0.0% win rate
   - 0 wins, 0 games → "Chưa có trận đấu"

## 🔍 Database Verification

### Check Win Count in Database
```sql
-- View player statistics
SELECT 
  riot_id,
  win_count,
  total_games,
  CASE 
    WHEN total_games > 0 THEN ROUND((win_count::numeric / total_games) * 100, 1)
    ELSE 0
  END as win_rate
FROM profiles
WHERE verified = true
ORDER BY win_count DESC;
```

### Check Match Results
```sql
-- View match results
SELECT 
  mr.match_id,
  mr.placement,
  p.riot_id,
  mr.recorded_at
FROM match_results mr
JOIN profiles p ON p.id = mr.player_id
ORDER BY mr.recorded_at DESC;
```

### Check Tracking Status
```sql
-- View rooms with game detected
SELECT 
  id,
  status,
  game_detected_at,
  game_detected_at + INTERVAL '1 hour' as scheduled_tracking_time
FROM rooms
WHERE game_detected_at IS NOT NULL
ORDER BY game_detected_at DESC;
```

## 🐛 Known Issues / Edge Cases

### 1. Match Not Found After 1 Hour
- **Cause**: Match data not available yet from Riot API
- **Solution**: System retries automatically
- **Manual fix**: Call `/api/track-match-result` with roomId and matchId

### 2. Multiple Players with Same Placement
- **Cause**: Riot API sometimes returns duplicate placements
- **Solution**: System picks first player with placement = 1 as winner
- **Note**: This is rare and usually resolves itself

### 3. Player Left Before Game Ended
- **Cause**: Player was removed from room before match completed
- **Solution**: Only players in room when game detected are tracked
- **Note**: This is expected behavior

## ✅ Success Criteria

- [ ] Win count badge displays correctly in all locations
- [ ] Win count badge shows correct size (sm/md/lg)
- [ ] Win count badge shows correct color (gold/gray)
- [ ] Win statistics card displays on profile
- [ ] Win rate calculation is correct
- [ ] Match result tracking works after 1 hour
- [ ] Winner's win_count increments
- [ ] All players' total_games increments
- [ ] "Chưa có trận đấu" shows when no games played

## 🚀 Next Steps

After testing:
1. Verify all features work correctly
2. Check database for correct data
3. Test edge cases (0 games, 100% win rate, etc.)
4. Push to production
5. Monitor for any issues

## 📊 Expected Results

### Before Any Games:
- Win count: 0 Top 1 (gray badge)
- Total games: 0
- Win rate: "Chưa có trận đấu"

### After 1 Game (Lost):
- Win count: 0 Top 1 (gray badge)
- Total games: 1
- Win rate: 0.0%

### After 1 Game (Won):
- Win count: 1 Top 1 (gold badge)
- Total games: 1
- Win rate: 100.0%

### After 10 Games (3 Wins):
- Win count: 3 Top 1 (gold badge)
- Total games: 10
- Win rate: 30.0%

---

**Last Updated**: January 2026
**Status**: Ready for Testing ✅
