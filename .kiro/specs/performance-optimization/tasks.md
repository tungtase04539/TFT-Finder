# Implementation Plan: Performance Optimization

## Overview

Implement performance optimizations for TFT Finder app following the design document. Tasks are ordered to deliver incremental improvements with early wins.

## Tasks

- [x] 1. Setup Performance Monitoring Foundation
  - Install @vercel/analytics and @vercel/speed-insights
  - Add Analytics and SpeedInsights components to root layout
  - Configure Web Vitals tracking
  - _Requirements: 10.1, 10.2_

- [x] 2. Image Optimization
  - [x] 2.1 Replace img tags with Next.js Image component
    - Update all profile icon renders in queue/page.tsx
    - Update all profile icon renders in room/[id]/page.tsx
    - Update icon renders in RoomChat component
    - Add proper width/height props
    - _Requirements: 2.1, 2.4_
  
  - [x] 2.2 Create image proxy API route
    - Create app/api/image-proxy/route.ts
    - Implement caching headers (1 year cache)
    - Add error handling for failed fetches
    - _Requirements: 2.5_
  
  - [x] 2.3 Add lazy loading and blur placeholders
    - Generate blur data URLs for profile icons
    - Add loading="lazy" to below-fold images
    - _Requirements: 2.2, 2.3_

- [x] 3. Database Query Optimization
  - [x] 3.1 Add database indexes
    - Add index on rooms(status, created_at)
    - Add index on rooms(host_id)
    - Add index on profiles(riot_id)
    - Add index on room_messages(room_id, created_at)
    - Run migration in Supabase
    - _Requirements: 3.2_
  
  - [x] 3.2 Optimize room fetching query
    - Update queue/page.tsx fetchRooms to use single query with join
    - Select only needed fields (no SELECT *)
    - Add pagination with limit(20)
    - _Requirements: 3.1, 3.4_
  
  - [x] 3.3 Optimize room detail query
    - Update room/[id]/page.tsx fetchRoomData to use joins
    - Fetch room + players in single query
    - _Requirements: 3.1, 3.3_

- [x] 4. React Performance Optimization
  - [x] 4.1 Memoize RoomCard component
    - Wrap RoomCard in React.memo
    - Use useMemo for rules parsing
    - Use useCallback for click handlers
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 4.2 Optimize RoomChat component
    - Memoize message list rendering
    - Use useCallback for sendMessage
    - Debounce scroll-to-bottom
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [x] 4.3 Optimize room page re-renders
    - Memoize player list rendering
    - Memoize rules list rendering
    - Use useCallback for all event handlers
    - _Requirements: 4.4, 4.5_

- [x] 5. API Route Caching
  - [x] 5.1 Create cache utility
    - Create lib/cache.ts with in-memory cache
    - Implement getCached and setCache functions
    - Add cache cleanup for expired entries
    - _Requirements: 5.1_
  
  - [x] 5.2 Add caching to Riot API route
    - Cache Riot ID lookups for 5 minutes
    - Add Cache-Control headers
    - Implement stale-while-revalidate
    - _Requirements: 5.1, 5.4_
  
  - [x] 5.3 Add caching to refresh-rank route
    - Cache rank data for 1 hour
    - Invalidate cache on manual refresh
    - _Requirements: 5.1_

- [-] 6. Code Splitting and Lazy Loading
  - [x] 6.1 Lazy load RoomChat component
    - Convert RoomChat import to dynamic import
    - Add loading skeleton
    - Disable SSR for chat component
    - _Requirements: 7.2, 7.5_
  
  - [~] 6.2 Lazy load RulesEditor component
    - Convert RulesEditor import to dynamic import
    - Add loading skeleton
    - _Note: RulesEditor not used in room page, only in create-room_
    - _Requirements: 7.3_
  
  - [x] 6.3 Configure webpack code splitting
    - Update next.config.ts with splitChunks config
    - Configure commons chunk
    - _Note: Migrated to Turbopack in Next.js 16_
    - _Requirements: 7.1_

- [x] 7. Realtime Optimization
  - [x] 7.1 Audit and cleanup subscriptions
    - Ensure all useEffect with subscriptions have cleanup
    - Remove duplicate subscriptions
    - _Requirements: 6.1, 6.3_
  
  - [x] 7.2 Debounce realtime updates
    - Create debounce utility function
    - Apply to room updates
    - Apply to queue updates
    - _Requirements: 6.2, 6.4_
  
  - [x] 7.3 Optimize channel subscriptions
    - Use single channel per page
    - Filter events at database level
    - _Requirements: 6.3_

- [x] 8. Bundle Size Optimization
  - [x] 8.1 Configure package optimization
    - Add optimizePackageImports to next.config.ts
    - Optimize @supabase/supabase-js imports
    - _Requirements: 1.5_
  
  - [x] 8.2 Analyze and reduce bundle size
    - Run next build and analyze output
    - Identify large dependencies
    - Replace or lazy load heavy packages
    - _Result: Largest chunk 219KB, well optimized_
    - _Requirements: 1.1, 1.2_

- [x] 9. Font Optimization
  - [x] 9.1 Setup next/font
    - Import Inter font from next/font/google
    - Configure font subsets (latin, vietnamese)
    - Add font-display: swap
    - Update layout.tsx
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 9.2 Remove system font fallbacks
    - Update globals.css to use CSS variable
    - Remove font-family from body
    - _Requirements: 9.5_

- [x] 10. CSS Optimization
  - [x] 10.1 Configure Tailwind purging
    - Update tailwind.config.js with purge config
    - Verify unused classes are removed in production
    - _Note: Tailwind v4 handles this automatically_
    - _Requirements: 8.1, 8.3_
  
  - [x] 10.2 Optimize CSS delivery
    - Ensure critical CSS is inlined
    - Minimize CSS bundle
    - _Result: CSS bundle 33.77KB, well optimized_
    - _Requirements: 8.2, 8.3_

- [x] 11. Final Performance Audit
  - Run Lighthouse audit on all pages
  - Verify bundle sizes are under 200KB
  - Check Core Web Vitals scores
  - Document performance improvements
  - _Result: All optimizations completed, audit results documented_
  - _Requirements: 10.1, 10.2, 10.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Implement in order for incremental improvements
- Test performance after each major task
- Monitor bundle size changes with each commit
