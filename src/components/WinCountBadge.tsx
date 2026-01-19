interface WinCountBadgeProps {
  winCount: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function WinCountBadge({ winCount, size = 'md' }: WinCountBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const hasWins = winCount > 0;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded font-semibold
        ${sizeClasses[size]}
        ${hasWins 
          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }
      `}
    >
      {hasWins ? '🏆' : '⭐'} {winCount} Top 1
    </span>
  );
}
