'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAdminAccess } from '@/lib/admin-middleware';
import ReportCard from '@/components/admin/ReportCard';
import BanModal from '@/components/admin/BanModal';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  room_id: string;
  violation_types: string[];
  description: string | null;
  evidence_urls: string[];
  status: string;
  created_at: string;
  reporter?: {
    riot_id: string;
    profile_icon_id: number;
  };
  reported_user?: {
    riot_id: string;
    profile_icon_id: number;
    ban_count: number;
  };
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  // Ban modal state
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{
    reportId: string;
    userId: string;
    userName: string;
    banCount: number;
    violationTypes: string[];
  } | null>(null);

  useEffect(() => {
    const checkAccessAndFetch = async () => {
      // Check if user is admin
      const { isAdmin, error: accessError } = await checkAdminAccess();

      if (!isAdmin) {
        console.error('[ADMIN REPORTS] Access denied:', accessError);
        router.push('/');
        return;
      }

      // Fetch reports
      await fetchReports();
    };

    checkAccessAndFetch();
  }, [router, filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/reports?status=${filter === 'all' ? '' : filter}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('[ADMIN REPORTS] Error fetching reports:', err);
      setError('Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (reportId: string, userId: string, banCount: number) => {
    // Find the report to get violation types and user name
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    setSelectedReport({
      reportId,
      userId,
      userName: report.reported_user?.riot_id || 'Unknown',
      banCount,
      violationTypes: report.violation_types
    });
    setBanModalOpen(true);
  };

  const handleConfirmBan = async (banType: 'temporary' | 'permanent') => {
    if (!selectedReport) return;

    try {
      const response = await fetch('/api/admin/apply-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.reportId,
          userId: selectedReport.userId,
          banType,
          violationTypes: selectedReport.violationTypes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply ban');
      }

      // Refresh reports list
      await fetchReports();
      
      // Close modal
      setBanModalOpen(false);
      setSelectedReport(null);

      alert('Đã áp dụng lệnh cấm thành công!');
    } catch (error) {
      console.error('[ADMIN REPORTS] Error applying ban:', error);
      alert('Có lỗi xảy ra khi áp dụng lệnh cấm');
    }
  };

  const handleReject = async (reportId: string) => {
    if (!confirm('Bạn có chắc muốn từ chối báo cáo này?')) return;

    try {
      const response = await fetch('/api/admin/reject-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject report');
      }

      // Refresh reports list
      await fetchReports();
      
      alert('Đã từ chối báo cáo!');
    } catch (error) {
      console.error('[ADMIN REPORTS] Error rejecting report:', error);
      alert('Có lỗi xảy ra khi từ chối báo cáo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-tft-gold">Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <Link href="/admin/dashboard" className="btn-primary">
            Quay lại dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredReports = reports;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20 bg-tft-dark-secondary">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-tft-gold to-tft-gold-dark rounded-lg flex items-center justify-center">
            <span className="text-tft-dark font-bold text-xl">⬡</span>
          </div>
          <h1 className="text-xl font-bold text-tft-gold">TFT FINDER - ADMIN</h1>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/dashboard"
            className="text-tft-teal hover:text-tft-teal/80 text-sm"
          >
            ← Quay lại dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-tft-gold mb-2">
            📋 Quản lý báo cáo
          </h2>
          <p className="text-tft-gold/60">
            Duyệt và xử lý báo cáo vi phạm từ người dùng
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-tft-dark-secondary text-tft-gold/60 border border-tft-gold/20 hover:border-yellow-500/30'
            }`}
          >
            ⏳ Chờ duyệt ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'approved'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-tft-dark-secondary text-tft-gold/60 border border-tft-gold/20 hover:border-green-500/30'
            }`}
          >
            ✅ Đã duyệt ({reports.filter(r => r.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'rejected'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-tft-dark-secondary text-tft-gold/60 border border-tft-gold/20 hover:border-red-500/30'
            }`}
          >
            ❌ Đã từ chối ({reports.filter(r => r.status === 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-tft-teal/20 text-tft-teal border border-tft-teal/30'
                : 'bg-tft-dark-secondary text-tft-gold/60 border border-tft-gold/20 hover:border-tft-teal/30'
            }`}
          >
            📊 Tất cả ({reports.length})
          </button>
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-tft-dark-secondary border border-tft-gold/20 rounded-lg">
            <p className="text-tft-gold/60 text-lg">
              {filter === 'pending' ? '🎉 Không có báo cáo nào chờ duyệt!' : 
               filter === 'approved' ? 'Chưa có báo cáo nào được duyệt' :
               filter === 'rejected' ? 'Chưa có báo cáo nào bị từ chối' :
               'Chưa có báo cáo nào'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </main>

      {/* Ban Modal */}
      {selectedReport && (
        <BanModal
          isOpen={banModalOpen}
          onClose={() => {
            setBanModalOpen(false);
            setSelectedReport(null);
          }}
          onConfirm={handleConfirmBan}
          userName={selectedReport.userName}
          currentBanCount={selectedReport.banCount}
          violationTypes={selectedReport.violationTypes}
        />
      )}
    </div>
  );
}
