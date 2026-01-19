# Design Document: Performance Optimization

## Overview

This document outlines the technical design for optimizing TFT Finder application performance across multiple dimensions: bundle size, image loading, database queries, React rendering, API responses, realtime updates, code splitting, CSS delivery, font loading, and performance monitoring.

## Architecture

### Current Architecture Issues
- Large initial bundle (~500KB+)
- Unoptimized images loading from external CDN
- N+1 query problems in room/player fetching
- Unnecessary re-renders in React components
- No caching for Riot API calls
- Multiple realtime subscriptions per page
- No code splitting beyond route-level
- Unused Tailwind classes in production
- System fonts causing layout shifts
- No performance monitoring

### Optimized Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Route Chunks │  │ Lazy Loaded  │  │   Cached     │ │
│  │  (50-100KB)  │  │  Components  │  │   Images     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Next.js Edge/Server                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ API Routes   │  │  Image Opt   │  │   Redis      │ │
│  │  + Cache     │  │  (Next/Image)│  │   Cache      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase + Riot API                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Optimized   │  │   Indexed    │  │  Realtime    │ │
│  │   Queries    │  │   Tables     │  │  Channels    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Bundle Size Optimization

**Implementation:**
- Use dynamic imports for heavy components
- Implement route-based code splitting
- Tree-shake unused dependencies
- Use production builds with minification

**Code Changes:**
```typescript
// Before: Import everything
import RoomChat from '@/components/RoomChat';

// After: Lazy load chat
const RoomChat = dynamic(() => import('@/components/RoomChat'), {
  loading: () => <ChatSkeleton />,
  ssr: false
});
```

**next.config.ts additions:**
```typescript
module.exports = {
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2,
        },
      },
    };
    return config;
  },
};
```

### 2. Image Optimization

**Implementation:**
- Replace `<img>` with Next.js `<Image>`
- Add image caching headers
- Use WebP format with fallback
- Implement lazy loading

**Code Changes:**
```typescript
// Before
<img src={getIconUrl(iconId)} alt="icon" />

// After
<Image
  src={getIconUrl(iconId)}
  alt="icon"
  width={40}
  height={40}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..."
/>
```

**Image Proxy API:**
```typescript
// app/api/image-proxy/route.ts
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

### 3. Database Query Optimization

**Implementation:**
- Select only needed fields
- Use joins instead of multiple queries
- Implement pagination
- Add database indexes

**Optimized Queries:**
```typescript
// Before: N+1 problem
const rooms = await supabase.from('rooms').select('*');
for (const room of rooms) {
  const host = await supabase.from('profiles').select('*').eq('id', room.host_id);
}

// After: Single query with join
const rooms = await supabase
  .from('rooms')
  .select(`
    id,
    status,
    players,
    players_agreed,
    rules_text,
    created_at,
    host:profiles!host_id(riot_id, profile_icon_id, tft_tier)
  `)
  .in('status', ['forming', 'ready'])
  .order('created_at', { ascending: false })
  .limit(20);
```

**Database Indexes (add to schema.sql):**
```sql
CREATE INDEX IF NOT EXISTS idx_rooms_status_created ON public.rooms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_profiles_riot_id ON public.profiles(riot_id);
```

### 4. React Performance Optimization

**Implementation:**
- Use React.memo for expensive components
- Implement useMemo for computed values
- Use useCallback for event handlers
- Avoid inline object/array creation

**Code Changes:**
```typescript
// Before
function RoomCard({ room }) {
  const rules = room.rules_text?.split('\n').filter(l => l.length > 0) || [];
  return <div onClick={() => router.push(`/room/${room.id}`)}>{...}</div>;
}

// After
const RoomCard = React.memo(function RoomCard({ room, onNavigate }) {
  const rules = useMemo(
    () => room.rules_text?.split('\n').filter(l => l.length > 0) || [],
    [room.rules_text]
  );
  
  const handleClick = useCallback(() => {
    onNavigate(room.id);
  }, [room.id, onNavigate]);
  
  return <div onClick={handleClick}>{...}</div>;
});
```

### 5. API Route Optimization

**Implementation:**
- Add response caching
- Implement rate limiting
- Use compression
- Cache Riot API responses

**Caching Layer:**
```typescript
// lib/cache.ts
const cache = new Map<string, { data: any; expires: number }>();

export function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function setCache<T>(key: string, data: T, ttlSeconds: number) {
  cache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000,
  });
}
```

**API Route with Cache:**
```typescript
// app/api/riot/route.ts
export async function GET(request: NextRequest) {
  const riotId = request.nextUrl.searchParams.get("riotId");
  const cacheKey = `riot:${riotId}`;
  
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  
  // Fetch from Riot API
  const data = await fetchRiotData(riotId);
  
  // Cache for 5 minutes
  setCache(cacheKey, data, 300);
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

### 6. Realtime Optimization

**Implementation:**
- Cleanup subscriptions properly
- Debounce frequent updates
- Use single channel per page
- Batch updates

**Optimized Realtime:**
```typescript
// Before: Multiple subscriptions
useEffect(() => {
  const channel1 = supabase.channel('rooms').subscribe();
  const channel2 = supabase.channel('queue').subscribe();
  const channel3 = supabase.channel('messages').subscribe();
  // No cleanup!
}, []);

// After: Single subscription with cleanup
useEffect(() => {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      debounce((payload) => {
        fetchRoomData();
      }, 500)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [roomId]);
```

### 7. Code Splitting

**Implementation:**
- Split by route (automatic in Next.js)
- Lazy load heavy components
- Preload critical routes
- Use Suspense boundaries

**Dynamic Imports:**
```typescript
// app/room/[id]/page.tsx
const RoomChat = dynamic(() => import('@/components/RoomChat'), {
  loading: () => <div className="animate-pulse h-64 bg-tft-dark-secondary rounded-lg" />,
  ssr: false,
});

const RulesEditor = dynamic(() => import('@/components/RulesEditor'), {
  loading: () => <div className="animate-pulse h-40 bg-tft-dark-secondary rounded-lg" />,
});
```

### 8. CSS Optimization

**Implementation:**
- Configure Tailwind purging
- Remove unused CSS
- Inline critical CSS
- Use CSS variables

**tailwind.config.js:**
```javascript
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Purge unused styles in production
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
  },
};
```

### 9. Font Optimization

**Implementation:**
- Use next/font for optimization
- Preload critical fonts
- Use font-display: swap
- Subset fonts

**Font Setup:**
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### 10. Monitoring and Metrics

**Implementation:**
- Track Core Web Vitals
- Monitor bundle sizes
- Log API performance
- Track database query times

**Web Vitals Tracking:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Data Models

### Performance Metrics Model
```typescript
interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  bundleSize: number;
  apiResponseTime: number;
  dbQueryTime: number;
}
```

### Cache Entry Model
```typescript
interface CacheEntry<T> {
  key: string;
  data: T;
  expires: number;
  createdAt: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Bundle Size Constraint
*For any* production build, the initial bundle size should be less than 200KB (gzipped)
**Validates: Requirements 1.1**

### Property 2: Image Lazy Loading
*For any* image below the fold, it should only load when scrolled into viewport
**Validates: Requirements 2.2**

### Property 3: Query Field Selection
*For any* database query, only explicitly needed fields should be selected (no SELECT *)
**Validates: Requirements 3.1**

### Property 4: Memoization Consistency
*For any* memoized value, it should only recompute when dependencies change
**Validates: Requirements 4.2**

### Property 5: Cache Hit Rate
*For any* cached API response, subsequent requests within TTL should return cached data
**Validates: Requirements 5.1**

### Property 6: Subscription Cleanup
*For any* realtime subscription, it should be cleaned up when component unmounts
**Validates: Requirements 6.1**

### Property 7: Code Split Coverage
*For any* route, it should have its own code chunk separate from other routes
**Validates: Requirements 7.1**

### Property 8: CSS Purging
*For any* production build, unused Tailwind classes should be removed
**Validates: Requirements 8.1**

### Property 9: Font Preloading
*For any* critical font, it should be preloaded in the document head
**Validates: Requirements 9.2**

### Property 10: Metrics Collection
*For any* page load, Core Web Vitals should be measured and reported
**Validates: Requirements 10.1**

## Error Handling

### Bundle Size Errors
- Build fails if bundle exceeds threshold
- Warning logs for large chunks
- Automatic code splitting suggestions

### Image Loading Errors
- Fallback to placeholder on load failure
- Retry mechanism for failed loads
- Error boundary for image components

### Database Query Errors
- Timeout handling for slow queries
- Fallback to cached data
- Error logging with query details

### Cache Errors
- Graceful degradation when cache unavailable
- Automatic cache invalidation on errors
- Fallback to direct API calls

## Testing Strategy

### Unit Tests
- Test memoization hooks
- Test cache get/set functions
- Test image URL generation
- Test query builders

### Property-Based Tests
- Test bundle size constraints (run on every build)
- Test cache TTL behavior with random timestamps
- Test memoization with random dependency changes
- Test subscription cleanup with random mount/unmount cycles

### Integration Tests
- Test full page load performance
- Test API caching end-to-end
- Test realtime subscription lifecycle
- Test image loading pipeline

### Performance Tests
- Lighthouse CI on every PR
- Bundle size tracking
- API response time monitoring
- Database query performance profiling

**Testing Configuration:**
- Each property test runs minimum 100 iterations
- Performance tests run on staging before production
- Automated alerts for performance regressions
- Weekly performance reports
