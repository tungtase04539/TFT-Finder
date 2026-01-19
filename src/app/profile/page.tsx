'use client';

/**
 * Profile Settings Page
 * Manage authentication methods and account settings
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { checkBanStatus } from '@/lib/ban-middleware';
import AuthMethodCard from '@/components/profile/AuthMethodCard';
import CreatePasswordModal from '@/components/auth/CreatePasswordModal';
import LinkGoogleModal from '@/components/auth/LinkGoogleModal';
import BanStatusCard from '@/components/BanStatusCard';

interface Profile {
  id: string;
  riot_id: string | null;
  email: string | null;
  has_password: boolean;
  has_google: boolean;
}

interface BanInfo {
  isBanned: boolean;
  banType: 'temporary' | 'permanent' | null;
  bannedUntil: string | null;
  banReason: string | null;
  violationTypes?: string[];
  banDate?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showLinkGoogle, setShowLinkGoogle] = useState(false);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);

  useEffect(() => {
    loadProfile();
    loadBanStatus();
  }, []);

  const loadBanStatus = async () => {
    const status = await checkBanStatus();
    if (status.isBanned) {
      // Get additional ban info from database
      const supabase = createClient();
      const { data: ban } = await supabase
        .from('bans')
        .select(`
          created_at,
          report:reports!report_id(violation_types)
        `)
        .eq('user_id', status.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Extract violation types from report (Supabase returns single object, not array)
      let violationTypes: string[] = [];
      if (ban?.report) {
        const report = ban.report as any;
        violationTypes = report.violation_types || [];
      }

      setBanInfo({
        isBanned: true,
        banType: status.banType,
        bannedUntil: status.bannedUntil,
        banReason: status.banReason,
        violationTypes,
        banDate: ban?.created_at
      });
    }
  };

  const loadProfile = async () => {
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, riot_id, email, has_password, has_google')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreatePassword = () => {
    setShowCreatePassword(true);
  };

  const handleLinkGoogle = () => {
    setShowLinkGoogle(true);
  };

  const handleSuccess = () => {
    loadProfile(); // Reload profile to update status
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#010a13] flex items-center justify-center">
        <div className="text-[#c8aa6e] text-lg">Đang tải...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#010a13] flex items-center justify-center">
        <div className="text-[#ff4655] text-lg">Không tìm thấy thông tin tài khoản</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010a13]">
      {/* Header */}
      <div className="bg-[#0f1923] border-b border-[#1e2328]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#c8aa6e] mb-2">
                Cài đặt tài khoản
              </h1>
              <p className="text-[#a09080]">
                Quản lý phương thức đăng nhập và thông tin cá nhân
              </p>
            </div>
            <button
              onClick={() => router.push('/queue')}
              className="px-4 py-2 bg-[#1e2328] text-[#f0e6d2] rounded hover:bg-[#3c3c41] transition-colors"
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Ban Status - Show if user is banned */}
          {banInfo?.isBanned && banInfo.banType && (
            <BanStatusCard
              banType={banInfo.banType}
              bannedUntil={banInfo.bannedUntil}
              banReason={banInfo.banReason}
              violationTypes={banInfo.violationTypes}
              banDate={banInfo.banDate}
            />
          )}

          {/* Account Info */}
          <div className="bg-[#0f1923] border border-[#1e2328] rounded-lg p-6">
            <h2 className="text-xl font-bold text-[#f0e6d2] mb-4">
              Thông tin tài khoản
            </h2>
            <div className="space-y-3">
              {profile.riot_id && (
                <div className="flex items-center gap-3">
                  <span className="text-[#a09080] w-24">Riot ID:</span>
                  <span className="text-[#f0e6d2] font-medium">{profile.riot_id}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-3">
                  <span className="text-[#a09080] w-24">Email:</span>
                  <span className="text-[#f0e6d2] font-medium">{profile.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Authentication Methods */}
          <div>
            <h2 className="text-xl font-bold text-[#f0e6d2] mb-4">
              Phương thức đăng nhập
            </h2>
            <div className="space-y-4">
              {/* Google */}
              <AuthMethodCard
                type="google"
                connected={profile.has_google}
                email={profile.has_google ? profile.email || undefined : undefined}
                onAction={handleLinkGoogle}
              />

              {/* Email/Password */}
              <AuthMethodCard
                type="password"
                connected={profile.has_password}
                email={profile.has_password ? profile.email || undefined : undefined}
                onAction={handleCreatePassword}
              />
            </div>
          </div>

          {/* Logout */}
          <div className="pt-6 border-t border-[#1e2328]">
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-[#ff4655] text-white font-medium rounded hover:bg-[#ff6b77] transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreatePassword && profile.email && (
        <CreatePasswordModal
          email={profile.email}
          onClose={() => setShowCreatePassword(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showLinkGoogle && profile.email && (
        <LinkGoogleModal
          email={profile.email}
          onClose={() => setShowLinkGoogle(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
