'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getProfileIconUrl, getFallbackIconUrl } from '@/lib/riot-icons';

interface ProfileIconProps {
  iconId?: number | null;
  size?: number;
  className?: string;
  alt?: string;
}

export default function ProfileIcon({ 
  iconId, 
  size = 48, 
  className = '', 
  alt = 'Profile Icon' 
}: ProfileIconProps) {
  const [imgSrc, setImgSrc] = useState(getProfileIconUrl(iconId));
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
      unoptimized
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
  const [imgSrc, setImgSrc] = useState(getProfileIconUrl(iconId));
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(getFallbackIconUrl());
    }
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
