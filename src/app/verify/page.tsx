'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { handleIconError } from '@/lib/riot-icons';
import Logo from '@/components/Logo';

export default function VerifyPage() {
  const [riotId, setRiotId] = useState('');
  const [originalIconId, setOriginalIconId] = useState<number | null>(null);
  const [currentIconId, setCurrentIconId] = useState<number | null>(null);
  const [puuid, setPuuid] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('verified, riot_id, puuid')
        .eq('id', user.id)
        .single();

      if (profile?.verified) {
        router.push('/queue');
        return;
      }

      if (profile?.riot_id) {
        setRiotId(profile.riot_id);
      }

      setChecking(false);
    };

    checkAuth();
  }, [router]);

  const handleSubmitRiotId = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!riotId.includes('#')) {
      setError('Riot ID phải có định dạng: TênGame#TAG (VD: TungPro#VN2)');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/riot?riotId=${encodeURIComponent(riotId)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Không thể tìm thấy tài khoản này');
        setLoading(false);
        return;
      }

      // Use the EXACT gameName#tagLine from Riot API (not user input)
      const correctRiotId = `${data.data.gameName}#${data.data.tagLine}`;

      // Check if this Riot ID is banned
      const supabase = createClient();
      const { data: bannedRiotId } = await supabase
        .from('banned_riot_ids')
        .select('riot_id')
        .eq('riot_id', correctRiotId)
        .single();

      if (bannedRiotId) {
        setError('Riot ID này đã bị cấm vĩnh viễn do vi phạm nghiêm trọng quy định hệ thống.');
        setLoading(false);
        return;
      }

      // Save original icon to compare later
      setOriginalIconId(data.data.profileIconId);
      setCurrentIconId(data.data.profileIconId);
      setPuuid(data.data.puuid);

      setRiotId(correctRiotId); // Update input to show correct ID

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            riot_id: correctRiotId, // Save the correct ID from API
            puuid: data.data.puuid,
            summoner_name: correctRiotId,
          });
      }

      setStep('verify');
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối. Vui lòng thử lại.');
    }

    setLoading(false);
  };

  const handleVerify = async () => {
    setVerifyStatus('checking');
    setError('');

    try {
      // Get current icon and check if it changed
      const response = await fetch(`/api/riot?riotId=${encodeURIComponent(riotId)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Lỗi xác minh');
        setVerifyStatus('failed');
        return;
      }

      const newIconId = data.data.profileIconId;
      setCurrentIconId(newIconId);

      // Check if icon has CHANGED (any change = verified)
      if (newIconId !== originalIconId) {
        // Double-check Riot ID is not banned before marking as verified
        const supabase = createClient();
        const { data: bannedRiotId } = await supabase
          .from('banned_riot_ids')
          .select('riot_id')
          .eq('riot_id', riotId)
          .single();

        if (bannedRiotId) {
          setError('Riot ID này đã bị cấm vĩnh viễn do vi phạm nghiêm trọng quy định hệ thống.');
          setVerifyStatus('failed');
          return;
        }

        setVerifyStatus('success');
        
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Save all profile data including TFT rank
          await supabase
            .from('profiles')
            .update({
              verified: true,
              verified_at: new Date().toISOString(),
              summoner_id: data.data.summonerId,
              profile_icon_id: newIconId,
              summoner_level: data.data.summonerLevel,
              // TFT Rank data
              tft_tier: data.data.tftRank?.tier || 'UNRANKED',
              tft_rank: data.data.tftRank?.rank || '',
              tft_lp: data.data.tftRank?.lp || 0,
              tft_wins: data.data.tftRank?.wins || 0,
              tft_losses: data.data.tftRank?.losses || 0,
              tft_rank_updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }

        setTimeout(() => {
          router.push('/queue');
        }, 2000);
      } else {
        setVerifyStatus('failed');
        setError('Icon chưa thay đổi! Hãy đổi sang bất kỳ icon nào khác rồi nhấn Xác Minh lại.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setVerifyStatus('failed');
    }
  };

  const getIconUrl = (iconId: number) => {
    const { getProfileIconUrl } = require('@/lib/riot-icons');
    return getProfileIconUrl(iconId);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20">
        <Logo size="md" showText={true} href="/" />
      </header>

      {/* Verification Flow */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="card-tft p-8 rounded-xl w-full max-w-lg gold-glow">
          <h2 className="text-2xl font-bold text-tft-gold-light text-center mb-2">
            🔐 Xác Minh Tài Khoản Riot
          </h2>
          <p className="text-tft-gold/60 text-center mb-8">
            Chứng minh bạn sở hữu tài khoản này
          </p>

          {step === 'input' ? (
            <form onSubmit={handleSubmitRiotId} className="space-y-6">
              <div>
                <label className="block text-tft-gold text-sm mb-2">
                  Riot ID của bạn
                </label>
                <input
                  type="text"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  className="input-tft w-full rounded-lg"
                  placeholder="VD: TungPro#VN2"
                  required
                />
                <p className="text-tft-gold/40 text-xs mt-2">
                  Nhập đúng Riot ID + Tag (có thể xem trong LOL Client)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-tft-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="loading-spinner w-5 h-5 border-2"></div>
                    Đang kiểm tra...
                  </span>
                ) : (
                  'Tiếp Tục →'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {verifyStatus === 'success' ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-tft-teal mb-2">Xác minh thành công!</h3>
                  <p className="text-tft-gold/70">Đang chuyển đến hàng chờ...</p>
                </div>
              ) : (
                <>
                  {/* Current Icon Display */}
                  <div className="bg-tft-dark-secondary p-6 rounded-lg border border-tft-gold/30 text-center">
                    <p className="text-tft-gold/60 text-sm mb-3">Icon hiện tại của bạn</p>
                    <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border-2 border-tft-gold/50 gold-glow">
                      {currentIconId && (
                        <Image
                          src={getIconUrl(currentIconId)}
                          alt={`Icon ${currentIconId}`}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          onError={handleIconError}
                        />
                      )}
                    </div>
                    <p className="text-tft-gold font-mono text-sm mt-2">#{currentIconId}</p>
                  </div>

                  {/* Simple Instructions */}
                  <div className="bg-tft-teal/10 border border-tft-teal/30 p-4 rounded-lg">
                    <h3 className="text-tft-teal font-bold mb-2 flex items-center gap-2">
                      <span>💡</span> Cách xác minh đơn giản
                    </h3>
                    <p className="text-tft-gold-light/80 text-sm">
                      Đổi sang <strong>bất kỳ icon nào khác</strong> trong LOL Client, 
                      sau đó quay lại đây nhấn <strong>Xác Minh</strong>.
                    </p>
                  </div>

                  {/* Steps */}
                  <div className="bg-tft-dark p-4 rounded-lg text-sm text-tft-gold/80">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Mở <strong>LOL Client</strong></li>
                      <li>Click vào <strong>Avatar</strong> của bạn (góc trên)</li>
                      <li>Chọn <strong>bất kỳ icon nào khác</strong></li>
                      <li>Quay lại đây và nhấn <strong>Xác Minh</strong></li>
                    </ol>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setStep('input');
                        setError('');
                        setVerifyStatus('idle');
                      }}
                      className="btn-tft-secondary flex-1"
                    >
                      ← Quay Lại
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={verifyStatus === 'checking'}
                      className="btn-tft-primary flex-1"
                    >
                      {verifyStatus === 'checking' ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="loading-spinner w-5 h-5 border-2"></div>
                          Đang kiểm tra...
                        </span>
                      ) : (
                        '✓ Xác Minh'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
