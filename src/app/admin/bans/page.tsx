'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAdminAccess } from '@/lib/admin-middleware';
import BanList from '@/components/admin/BanList';

interface Ban {
  id: string;
  user_id: string;
  ban_type: 'temporary' | 'permanent';
  reason: string;
  created_at: string;
  expires_at: string | null;
  user_profile?: {
    riot_id: string;
  };
  report?: {
    violation_types: string[];
  };
}

export default function AdminBansPage() {
  const router = useRouter();
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'temporary' | 'permanent'>('all');

  useEffect(() => {
    const checkAccess = async () => {
      const { isAdmin } = await checkAdminAccess();
      if (!isAdmin) {
        router.push('/');
        return;
      }
      fetchBans();
    };
    checkAccess();
  }, [router, filter]);

  const fetchBans = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/bans?filter=${filter}`);
      const data = await response.json();

      if (response.ok) {
        setBans(data.bans || []);
      } else {
        console.error('Failed to fetch bans:', data.error);
      }
    } catch (error) {
      console.error('Error fetching bans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (
    banId: string,
    userId: string,
    riotId: string,
    isPermanent: boolean
  ) => {
    try {
      const response = await fetch('/api/admin/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banId, userId, riotId, isPermanent })
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh ban list
        fetchBans();
      } else {
        alert(`Lỗi: ${data.error}`);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Lỗi khi gỡ ban');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tft-dark via-tft-dark-light to-tft-dark">
      {/* Header */}
      <header className="border-b border-tft-gold/20 bg-tft-dark-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="text-tft-gold hover:text-tft-gold-light transition-colors"
              >
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-tft-gold">
                Quản Lý Lệnh Cấm
              </h1>
            </div>

            <Link
              href="/queue"
              className="text-tft-teal hover:text-tft-teal/80 text-sm"
            >
              Về Hàng Chờ →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-tft-gold text-tft-dark'
                : 'bg-tft-dark-secondary text-tft-gold hover:bg-tft-dark'
            }`}
          >
            Tất cả ({bans.length})
          </button>
          <button
            onClick={() => setFilter('temporary')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'temporary'
                ? 'bg-orange-500 text-white'
                : 'bg-tft-dark-secondary text-orange-400 hover:bg-tft-dark'
            }`}
          >
            Tạm thời
          </button>
          <button
            onClick={() => setFilter('permanent')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'permanent'
                ? 'bg-red-500 text-white'
                : 'bg-tft-dark-secondary text-red-400 hover:bg-tft-dark'
            }`}
          >
            Vĩnh viễn
          </button>
        </div>

        {/* Ban List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <BanList bans={bans} onUnban={handleUnban} />
        )}
      </main>
    </div>
  );
}
