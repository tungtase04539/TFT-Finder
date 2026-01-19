import Link from 'next/link';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#010a13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#c8aa6e] mb-2">
            ⬡ TFT FINDER
          </h1>
          <p className="text-[#a09080]">
            Tìm Trận Đấu Trường Chân Lý
          </p>
        </div>

        {/* Register form */}
        <div className="bg-[#0f1923] border border-[#1e2328] rounded-lg p-8">
          <RegisterForm />
        </div>

        {/* Login link */}
        <div className="text-center mt-6">
          <p className="text-[#a09080] text-sm">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="text-[#c8aa6e] hover:text-[#f0e6d2] font-medium transition-colors"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
