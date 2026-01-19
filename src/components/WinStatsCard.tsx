interface WinStatsCardProps {
  winCount: number;
  totalGames: number;
}

export default function WinStatsCard({ winCount, totalGames }: WinStatsCardProps) {
  const winRate = totalGames > 0 ? ((winCount / totalGames) * 100).toFixed(1) : '0.0';
  const hasGames = totalGames > 0;

  return (
    <div className="bg-[#0f1923] border border-[#1e2328] rounded-lg p-6">
      <h2 className="text-xl font-bold text-[#f0e6d2] mb-4">
        📊 Thống kê trận đấu
      </h2>
      
      {hasGames ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Total Wins */}
          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              {winCount}
            </div>
            <div className="text-sm text-yellow-300/80">
              🏆 Top 1
            </div>
          </div>

          {/* Total Games */}
          <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {totalGames}
            </div>
            <div className="text-sm text-blue-300/80">
              🎮 Tổng trận
            </div>
          </div>

          {/* Win Rate */}
          <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {winRate}%
            </div>
            <div className="text-sm text-green-300/80">
              📈 Tỷ lệ thắng
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-[#a09080] text-lg">
            Chưa có trận đấu
          </p>
          <p className="text-[#a09080]/60 text-sm mt-2">
            Tham gia phòng custom để bắt đầu ghi nhận thành tích!
          </p>
        </div>
      )}
    </div>
  );
}
