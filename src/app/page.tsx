'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const [queueCount, setQueueCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial queue count
    const fetchQueueCount = async () => {
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');
      
      setQueueCount(count || 0);
      setIsLoading(false);
    };

    fetchQueueCount();

    // Subscribe to queue changes
    const channel = supabase
      .channel('queue-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchQueueCount();
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-tft-gold to-tft-gold-dark rounded-lg flex items-center justify-center">
            <span className="text-tft-dark font-bold text-xl">⬡</span>
          </div>
          <h1 className="text-xl font-bold text-tft-gold">TFT FINDER</h1>
        </div>
        <Link href="/login" className="btn-tft-secondary text-sm">
          Đăng Nhập
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-2xl mx-auto">
          {/* Animated Icon */}
          <div className="animate-float mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-tft-gold/20 to-tft-teal/20 rounded-full flex items-center justify-center gold-glow">
              <span className="text-5xl">🎮</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-bold text-tft-gold-light mb-4">
            TÌM TRẬN
            <span className="block text-tft-teal">ĐẤU TRƯỜNG CHÂN LÝ</span>
          </h2>
          
          <p className="text-lg text-tft-gold/70 mb-8">
            Ghép đủ 8 người để chơi custom game cùng nhau. 
            <br />Xác minh tài khoản, vào hàng chờ, và sẵn sàng chiến!
          </p>

          {/* CTA Button */}
          <Link href="/login" className="btn-tft-primary text-lg inline-block animate-glow-pulse">
            🔍 TÌM TRẬN NGAY
          </Link>

          {/* Queue Counter */}
          <div className="mt-8">
            <div className="queue-counter inline-block rounded-lg">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="loading-spinner w-5 h-5 border-2"></div>
                  Đang tải...
                </span>
              ) : (
                <span>👥 {queueCount} người đang chờ ghép</span>
              )}
            </div>
          </div>
        </div>

        {/* 8 Hexagon Slots Preview */}
        <div className="mt-16 flex flex-wrap justify-center gap-3 max-w-lg">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="hex-slot waiting opacity-50">
              <span className="text-tft-gold/40 text-2xl">?</span>
            </div>
          ))}
        </div>
        <p className="text-tft-gold/50 text-sm mt-4">8 vị trí đang chờ bạn...</p>
      </main>

      {/* Features */}
      <section className="px-6 py-12 border-t border-tft-gold/10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="card-tft p-6 rounded-lg text-center">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-tft-gold font-bold mb-2">Xác Minh Tài Khoản</h3>
            <p className="text-tft-gold/60 text-sm">
              Chứng minh tài khoản Riot chính chủ qua Icon Code
            </p>
          </div>
          <div className="card-tft p-6 rounded-lg text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-tft-gold font-bold mb-2">Ghép Nhanh</h3>
            <p className="text-tft-gold/60 text-sm">
              Tự động ghép khi đủ 8 người, real-time cập nhật
            </p>
          </div>
          <div className="card-tft p-6 rounded-lg text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-tft-gold font-bold mb-2">Custom Game</h3>
            <p className="text-tft-gold/60 text-sm">
              Nhận lobby code và vào game cùng nhau
            </p>
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
