/**
 * Riot API Icon Utilities
 * Handles profile icon URLs with fallback support and proxy
 */

// Default fallback icon ID (a common icon that always exists)
export const FALLBACK_ICON_ID = 29;

// Latest stable Data Dragon version
export const DDRAGON_VERSION = '15.1.1';

/**
 * Get profile icon URL through our image proxy
 * This ensures CORS compatibility and better caching
 * @param iconId - Profile icon ID from Riot API
 * @returns Proxied URL to the icon image
 */
export function getProfileIconUrl(iconId?: number | null): string {
  const id = iconId && iconId > 0 ? iconId : FALLBACK_ICON_ID;
  const originalUrl = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${id}.png`;
  // Use our image proxy to avoid CORS and ensure availability
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Get fallback icon URL through proxy
 * @returns Proxied URL to the default fallback icon
 */
export function getFallbackIconUrl(): string {
  const originalUrl = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${FALLBACK_ICON_ID}.png`;
  return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Handle icon load error by returning fallback URL
 * Use this in onError handlers for img/Image components
 */
export function handleIconError(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  // Only set fallback once to avoid infinite loop
  if (!img.src.includes(`profileicon/${FALLBACK_ICON_ID}.png`)) {
    img.src = getFallbackIconUrl();
  }
}

