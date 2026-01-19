'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProfileIconProps {
  iconId?: number | null;
  size?: number;
  className?: string;
  alt?: string;
}

// Default fallback icon ID (a common icon that always exists)
const FALLBACK_ICON_ID = 29;

// Latest stable Data Dragon version
const DDRAGON_VERSION = '15.1.1';

export function getIconUrl(iconId?: number | null): string {
  const id = iconId || FALLBACK_ICON_ID;
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${id}.png`;
}

export function getFallbackIconUrl(): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${FALLBACK_ICON_ID}.png`;
}

export default function ProfileIcon({ 
  iconId, 
  size = 48, 
  className = '', 
  alt = 'Profile Icon' 
}: ProfileIconProps) {
  const [imgSrc, setImgSrc] = useState(getIconUrl(iconId));
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(getFallbackIconUrl());
    }
  };

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      onError={handleError}
      unoptimized // Avoid Next.js image optimization issues with external images
    />
  );
}

// Simple img tag version for cases where Next Image doesn't work well
export function ProfileIconImg({ 
  iconId, 
  size = 48, 
  className = '', 
  alt = 'Profile Icon' 
}: ProfileIconProps) {
  const [imgSrc, setImgSrc] = useState(getIconUrl(iconId));

  const handleError = () => {
    setImgSrc(getFallbackIconUrl());
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      onError={handleError}
    />
  );
}
