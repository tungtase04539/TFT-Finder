'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

export default function HomePage() {
  const [roomCount, setRoomCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial room count
    const fetchRoomCount = async () => {
      const { count } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .in('status', ['forming', 'ready']);
      
      setRoomCount(count || 0);
      setIsLoading(false);
    };

    fetchRoomCount();

    // Subscribe to room changes
    const channel = supabase
      .channel('room-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          fetchRoomCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20">
        <Logo size="md" showText={true} href="/" />
        <Link href="/login" className="btn-tft-secondary text-sm">
          Đăng Nhập
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-3xl mx-auto">
          {/* Animated Icon */}
          <div className="animate-float mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-tft-gold/20 to-tft-teal/20 rounded-full flex items-center justify-center gold-glow">
              <span className="text-4xl">🎮</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-tft-gold-light mb-4">
            TFT FINDER
          </h1>
          
          <p className="text-xl text-tft-teal mb-6">
            Nền tảng tìm đồng đội TFT Custom Game
          </p>

          <p className="text-base text-tft-gold/70 mb-8 max-w-2xl mx-auto">
            Tạo phòng với luật chơi tùy chỉnh, tìm đồng đội nhanh chóng, 
            tự động phát hiện game và ghi nhận thành tích. 
            <br className="hidden md:block" />
            <span className="text-tft-gold-light">100% miễn phí, không quảng cáo!</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/register" className="btn-primary px-8 py-3 text-lg">
              🚀 Bắt Đầu Ngay
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-3 text-lg">
              🔑 Đăng Nhập
            </Link>
          </div>

          {/* Room Counter */}
          <div className="inline-block bg-tft-dark-secondary/50 border border-tft-gold/20 rounded-lg px-6 py-3">
            {isLoading ? (
              <span className="flex items-center gap-2 text-tft-gold/70">
                <div className="loading-spinner w-4 h-4 border-2"></div>
                Đang tải...
              </span>
            ) : (
              <span className="text-tft-gold-light">
                🏠 <span className="font-bold text-tft-teal">{roomCount}</span> phòng đang mở
              </span>
            )}
          </div>
        </div>
      </main>

      {/* How It Works */}
      <section className="px-6 py-16 bg-tft-dark-secondary/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-tft-gold text-center mb-12">
            📖 Cách Sử Dụng
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="card-tft p-6 rounded-xl text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-tft-teal rounded-full flex items-center justify-center text-tft-dark font-bold">
                1
              </div>
              <div className="text-4xl mb-4 mt-2">📝</div>
              <h3 className="text-tft-gold font-bold mb-2">Đăng Ký</h3>
              <p className="text-tft-gold/60 text-sm">
                Tạo tài khoản và xác minh Riot ID qua mã code
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-tft p-6 rounded-xl text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-tft-teal rounded-full flex items-center justify-center text-tft-dark font-bold">
                2
              </div>
              <div className="text-4xl mb-4 mt-2">🏠</div>
              <h3 className="text-tft-gold font-bold mb-2">Chọn Phòng</h3>
              <p className="text-tft-gold/60 text-sm">
                Xem danh sách phòng, chọn luật phù hợp hoặc tạo phòng mới
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-tft p-6 rounded-xl text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-tft-teal rounded-full flex items-center justify-center text-tft-dark font-bold">
                3
              </div>
              <div className="text-4xl mb-4 mt-2">🎮</div>
              <h3 className="text-tft-gold font-bold mb-2">Vào Game</h3>
              <p className="text-tft-gold/60 text-sm">
                Copy Riot ID, vào TFT Custom Game và bắt đầu chơi
              </p>
            </div>

            {/* Step 4 */}
            <div className="card-tft p-6 rounded-xl text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-tft-teal rounded-full flex items-center justify-center text-tft-dark font-bold">
                4
              </div>
              <div className="text-4xl mb-4 mt-2">🏆</div>
              <h3 className="text-tft-gold font-bold mb-2">Nhận Thành Tích</h3>
              <p className="text-tft-gold/60 text-sm">
                Hệ thống tự động ghi nhận kết quả và cập nhật win count
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-tft-gold text-center mb-12">
            ✨ Tính Năng Nổi Bật
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-tft p-6 rounded-xl">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-tft-gold font-bold mb-2">Luật Tùy Chỉnh</h3>
              <p className="text-tft-gold/60 text-sm">
                Tạo phòng với luật riêng, xem preview trước khi vào
              </p>
            </div>

            <div className="card-tft p-6 rounded-xl">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-tft-gold font-bold mb-2">Auto Detection</h3>
              <p className="text-tft-gold/60 text-sm">
                Tự động phát hiện ai đã vào game, kick người không tham gia
              </p>
            </div>

            <div className="card-tft p-6 rounded-xl">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-tft-gold font-bold mb-2">Thống Kê</h3>
              <p className="text-tft-gold/60 text-sm">
                Theo dõi số lần Top 1, tổng trận, tỷ lệ thắng chi tiết
              </p>
            </div>

            <div className="card-tft p-6 rounded-xl">
              <div className="text-3xl mb-3">🚨</div>
              <h3 className="text-tft-gold font-bold mb-2">Báo Cáo</h3>
              <p className="text-tft-gold/60 text-sm">
                Hệ thống báo cáo vi phạm với upload ảnh bằng chứng
              </p>
            </div>

            <div className="card-tft p-6 rounded-xl">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="text-tft-gold font-bold mb-2">An Toàn</h3>
              <p className="text-tft-gold/60 text-sm">
                Hệ thống ban tự động, blacklist Riot ID vi phạm nghiêm trọng
              </p>
            </div>

            <div className="card-tft p-6 rounded-xl">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-tft-gold font-bold mb-2">Realtime</h3>
              <p className="text-tft-gold/60 text-sm">
                Cập nhật trực tiếp, không cần refresh trang
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-tft-gold/10 text-center text-tft-gold/40 text-sm">
        TFT Finder - Không liên kết với Riot Games
      </footer>
    </div>
  );
}
