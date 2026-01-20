'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Kiểm tra email để xác nhận tài khoản!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        // Check if user has verified Riot account or is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('verified, role')
          .single();

        console.log('Profile data:', profile);
        console.log('Profile error:', profileError);

        // Admin accounts don't need verification
        if (profile?.role === 'admin') {
          console.log('Redirecting to admin dashboard');
          router.push('/admin/dashboard');
        } else if (profile?.verified) {
          console.log('Redirecting to queue');
          router.push('/queue');
        } else {
          console.log('Redirecting to verify');
          router.push('/verify');
        }
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-tft-gold/20">
        <Logo size="md" showText={true} href="/" />
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="card-tft p-8 rounded-xl w-full max-w-md gold-glow">
          <h2 className="text-2xl font-bold text-tft-gold-light text-center mb-6">
            {isSignUp ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
          </h2>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg flex items-center justify-center gap-3 text-white transition-all mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-tft-gold/20"></div>
            <span className="text-tft-gold/50 text-sm">hoặc</span>
            <div className="flex-1 h-px bg-tft-gold/20"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-tft-gold text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-tft w-full rounded-lg"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-tft-gold text-sm mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-tft w-full rounded-lg"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-tft-teal/20 border border-tft-teal/50 rounded-lg text-tft-teal text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-tft-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="loading-spinner w-5 h-5 border-2"></div>
                  Đang xử lý...
                </span>
              ) : isSignUp ? (
                'Đăng Ký'
              ) : (
                'Đăng Nhập'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-tft-teal hover:text-tft-teal/80 text-sm block w-full"
            >
              {isSignUp
                ? 'Đã có tài khoản? Đăng nhập'
                : 'Chưa có tài khoản? Đăng ký nhanh'}
            </button>
            
            {!isSignUp && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-tft-gold/20"></div>
                  <span className="text-tft-gold/50 text-xs">hoặc</span>
                  <div className="flex-1 h-px bg-tft-gold/20"></div>
                </div>
                
                <Link
                  href="/register"
                  className="block text-tft-gold hover:text-tft-gold-light text-sm"
                >
                  Đăng ký với email verification (bảo mật hơn) →
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
