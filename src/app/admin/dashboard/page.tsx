'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAdminAccess } from '@/lib/admin-middleware';
import Logo from '@/components/Logo';

interface DashboardStats {
  totalUsers: number;
  totalRooms: number;
  activeRooms: number;
  pendingReports: number;
  totalBans: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      // Check if user is admin
      const { isAdmin, error: accessError } = await checkAdminAccess();

      if (!isAdmin) {
        console.error('[ADMIN] Access denied:', accessError);
        router.push('/');
        return;
      }

      // Fetch dashboard stats
      try {
        const response = await fetch('/api/admin/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('[ADMIN] Error fetching stats:', err);
        setError('Không thể tải thống kê');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-tft-gold">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Link href="/" className="btn-primary">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20 bg-tft-dark-secondary">
        <Logo size="md" showText={true} href="/" admin={true} />
        <div className="flex items-center gap-4">
          <Link 
            href="/queue"
            className="text-tft-teal hover:text-tft-teal/80 text-sm"
          >
            🏠 Về trang chủ
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-tft-gold mb-2">
            🛡️ Admin Dashboard
          </h2>
          <p className="text-tft-gold/60">
            Quản lý hệ thống, báo cáo và người dùng
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-tft-gold/60 text-sm">Tổng người dùng</span>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-tft-gold">
              {stats?.totalUsers || 0}
            </p>
          </div>

          {/* Total Rooms */}
          <div className="bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-tft-gold/60 text-sm">Tổng phòng</span>
              <span className="text-2xl">🏠</span>
            </div>
            <p className="text-3xl font-bold text-tft-gold">
              {stats?.totalRooms || 0}
            </p>
          </div>

          {/* Active Rooms */}
          <div className="bg-tft-dark-secondary border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400/80 text-sm">Phòng đang hoạt động</span>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {stats?.activeRooms || 0}
            </p>
          </div>

          {/* Pending Reports */}
          <div className="bg-tft-dark-secondary border border-yellow-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400/80 text-sm">Báo cáo chờ duyệt</span>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">
              {stats?.pendingReports || 0}
            </p>
          </div>

          {/* Total Bans */}
          <div className="bg-tft-dark-secondary border border-red-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400/80 text-sm">Tổng lệnh cấm</span>
              <span className="text-2xl">🚫</span>
            </div>
            <p className="text-3xl font-bold text-red-400">
              {stats?.totalBans || 0}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Reports Management */}
          <Link
            href="/admin/reports"
            className="bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6 hover:border-tft-teal/50 transition-colors group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                📋
              </div>
              <div>
                <h3 className="text-xl font-semibold text-tft-gold group-hover:text-tft-teal transition-colors">
                  Quản lý báo cáo
                </h3>
                <p className="text-sm text-tft-gold/60">
                  Duyệt và xử lý báo cáo vi phạm
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-yellow-400 font-semibold">
                {stats?.pendingReports || 0} chờ duyệt
              </span>
              <span className="text-tft-teal group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Link>

          {/* Ban Management */}
          <Link
            href="/admin/bans"
            className="bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6 hover:border-tft-teal/50 transition-colors group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-2xl">
                🚫
              </div>
              <div>
                <h3 className="text-xl font-semibold text-tft-gold group-hover:text-tft-teal transition-colors">
                  Quản lý lệnh cấm
                </h3>
                <p className="text-sm text-tft-gold/60">
                  Xem và quản lý người dùng bị cấm
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-400 font-semibold">
                {stats?.totalBans || 0} lệnh cấm
              </span>
              <span className="text-tft-teal group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Link>

          {/* User Management */}
          <Link
            href="/admin/users"
            className="bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6 hover:border-tft-teal/50 transition-colors group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <h3 className="text-xl font-semibold text-tft-gold group-hover:text-tft-teal transition-colors">
                  Quản lý người dùng
                </h3>
                <p className="text-sm text-tft-gold/60">
                  Xem danh sách và thông tin người dùng
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-semibold">
                {stats?.totalUsers || 0} người dùng
              </span>
              <span className="text-tft-teal group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Link>
        </div>

        {/* System Info */}
        <div className="mt-8 bg-tft-dark-secondary border border-tft-gold/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-tft-gold mb-4">
            ℹ️ Thông tin hệ thống
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-tft-gold/60">Phiên bản:</span>
              <span className="ml-2 text-tft-gold">1.0.0</span>
            </div>
            <div>
              <span className="text-tft-gold/60">Cập nhật lần cuối:</span>
              <span className="ml-2 text-tft-gold">{new Date().toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
