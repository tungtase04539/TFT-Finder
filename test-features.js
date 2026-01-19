/**
 * Automated Feature Testing Script
 * Tests all implemented features for Game Management System
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function testFeature(name, description, steps) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`Testing: ${name}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
  log(`Description: ${description}`, 'cyan');
  log('');

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    log(`Step ${i + 1}/${steps.length}: ${step}`, 'yellow');
    
    const result = await ask('Did this step work correctly? (y/n): ');
    
    if (result === 'y' || result === 'yes') {
      log('✓ PASS', 'green');
    } else {
      log('✗ FAIL', 'red');
      const details = await ask('Please describe the issue: ');
      log(`Issue: ${details}`, 'red');
      return false;
    }
  }
  
  log(`\n✓ ${name} - ALL TESTS PASSED`, 'green');
  return true;
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     GAME MANAGEMENT SYSTEM - FEATURE TESTING SUITE        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {
    passed: [],
    failed: []
  };

  // Test 1: Copy Riot ID Feature
  const test1 = await testFeature(
    'Copy Riot ID Feature',
    'Test copy button functionality and timestamp recording',
    [
      'Open the app and login',
      'Create or join a room',
      'Wait for all players to agree to rules (room status should be "ready")',
      'Verify "📋 Copy ID" button appears next to each player\'s Riot ID',
      'Click the copy button on any player',
      'Verify visual feedback shows "Đang copy..." then "✓ Đã copy!"',
      'Paste clipboard content - verify it contains the full Riot ID',
      'Open Supabase and check rooms table - verify last_copy_action timestamp updated'
    ]
  );
  test1 ? results.passed.push('Copy Riot ID') : results.failed.push('Copy Riot ID');

  // Test 2: Copy Action Tracking & Timer
  const test2 = await testFeature(
    'Copy Action Tracking & Countdown Timer',
    'Test 3-minute countdown timer and progress bar',
    [
      'In a ready room, copy a Riot ID',
      'Verify countdown timer section appears with "⏱️ Thời gian mời người chơi"',
      'Verify it shows "Copy lần cuối: [timestamp]"',
      'Verify progress bar starts filling from left to right',
      'Verify timer displays in MM:SS format (e.g., "3:00", "2:59", etc.)',
      'Copy another Riot ID - verify timer resets to 3:00',
      'Wait for timer to reach 0:00 (or modify THREE_MINUTES_MS for faster testing)',
      'Verify warning message appears: "⚠️ Đã hết thời gian!"'
    ]
  );
  test2 ? results.passed.push('Copy Tracking') : results.failed.push('Copy Tracking');

  // Test 3: Auto Game Detection
  const test3 = await testFeature(
    'Auto Game Detection & Player Removal',
    'Test automatic game detection after 3 minutes',
    [
      'Create a room with at least 2 players',
      'All players agree to rules',
      'Copy Riot IDs to start timer',
      'Wait for 3-minute timer to expire',
      'Verify detection message appears: "Đang kiểm tra ai đã vào game..."',
      'If players are in a common match, verify detection works',
      'Verify players NOT in game are removed from room',
      'Verify room status updates to "playing" if ≥2 players remain',
      'Check Supabase rooms table - verify game_detected_at timestamp updated'
    ]
  );
  test3 ? results.passed.push('Game Detection') : results.failed.push('Game Detection');

  // Test 4: Report System - UI
  const test4 = await testFeature(
    'Report System - User Interface',
    'Test report modal and form validation',
    [
      'Join a room with other players',
      'Verify "🚨 Báo cáo" button appears next to OTHER players (not yourself)',
      'Verify report button does NOT appear next to your own name',
      'Click report button on another player',
      'Verify modal opens with title "🚨 Báo cáo vi phạm"',
      'Verify reported user\'s name displays correctly',
      'Try submitting without selecting violation type - verify error appears',
      'Select 2-3 violation types (game_sabotage, harassment, etc.)',
      'Add description text (test character counter - max 1000)',
      'Upload 1 image - verify preview appears',
      'Upload 2 more images - verify all 3 previews show',
      'Try uploading 4th image - verify error: "Chỉ được tải tối đa 3 hình ảnh"',
      'Remove one image using X button - verify it disappears',
      'Click submit button',
      'Verify loading state shows "Đang gửi..."',
      'Verify success alert appears',
      'Verify modal closes'
    ]
  );
  test4 ? results.passed.push('Report UI') : results.failed.push('Report UI');

  // Test 5: Report System - Backend
  const test5 = await testFeature(
    'Report System - Backend & Storage',
    'Test report creation and image upload',
    [
      'After submitting a report, open Supabase Dashboard',
      'Go to Table Editor → reports table',
      'Verify new report record exists',
      'Verify violation_types array contains selected types',
      'Verify description field contains your text',
      'Verify evidence_urls array contains image URLs',
      'Verify status = "pending"',
      'Verify reporter_id and reported_user_id are correct',
      'Go to Storage → report-evidence bucket',
      'Verify uploaded images exist',
      'Verify file naming: {userId}/{timestamp}_{index}_{filename}',
      'Click on image URL - verify image loads correctly'
    ]
  );
  test5 ? results.passed.push('Report Backend') : results.failed.push('Report Backend');

  // Test 6: Integration Test - Full Flow
  const test6 = await testFeature(
    'Integration Test - Copy → Detect → Report Flow',
    'Test complete end-to-end workflow',
    [
      'Create a new room with 2+ players',
      'All players agree to rules',
      'Room status changes to "ready"',
      'Copy Riot IDs - timer starts',
      'Wait 3 minutes - auto detection triggers',
      'Players are detected/removed correctly',
      'Room status updates to "playing"',
      'Report another player',
      'Report is created successfully',
      'All data saved correctly in database'
    ]
  );
  test6 ? results.passed.push('Integration') : results.failed.push('Integration');

  // Test 7: Error Handling
  const test7 = await testFeature(
    'Error Handling & Edge Cases',
    'Test error scenarios and validation',
    [
      'Try copying Riot ID when room status is "forming" - verify button hidden',
      'Try uploading image larger than 5MB - verify error message',
      'Try uploading non-image file - verify error message',
      'Try submitting report without authentication - verify error',
      'Test with slow network - verify loading states work',
      'Test detection with no common match - verify appropriate message',
      'Test detection with Riot API error - verify error handling'
    ]
  );
  test7 ? results.passed.push('Error Handling') : results.failed.push('Error Handling');

  // Test 8: Performance
  const test8 = await testFeature(
    'Performance Testing',
    'Test response times and smooth operation',
    [
      'Copy Riot ID - verify response within 500ms',
      'Verify timer updates smoothly every second (no lag)',
      'Submit report with 3 images - verify completes within 10 seconds',
      'Test with 8 players in room - verify no performance issues',
      'Rapidly click copy button multiple times - verify no crashes'
    ]
  );
  test8 ? results.passed.push('Performance') : results.failed.push('Performance');

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TEST SUMMARY                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nTotal Tests: ${results.passed.length + results.failed.length}`, 'blue');
  log(`Passed: ${results.passed.length}`, 'green');
  log(`Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');
  
  if (results.passed.length > 0) {
    log('\n✓ Passed Tests:', 'green');
    results.passed.forEach(test => log(`  - ${test}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log('\n✗ Failed Tests:', 'red');
    results.failed.forEach(test => log(`  - ${test}`, 'red'));
  }
  
  const successRate = ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (results.failed.length === 0) {
    log('\n🎉 ALL TESTS PASSED! System is ready for production.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review and fix issues before production.', 'yellow');
  }
  
  rl.close();
}

// Run tests
log('\nStarting automated feature testing...', 'cyan');
log('Please have the app open in your browser and be ready to test.', 'yellow');
log('Press Enter to begin...', 'yellow');

rl.question('', () => {
  runTests().catch(error => {
    log(`\nError running tests: ${error.message}`, 'red');
    rl.close();
  });
});
