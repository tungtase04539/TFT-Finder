/**
 * Email Service for TFT Finder
 * Handles sending verification codes and notification emails
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using Supabase (or custom SMTP if configured)
 */
async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  try {
    // For now, we'll use Supabase's built-in email
    // In production, you might want to use SendGrid, Resend, or custom SMTP
    
    // TODO: Implement actual email sending
    // This is a placeholder - Supabase handles auth emails automatically
    console.log(`[EMAIL] Sending to ${to}: ${subject}`);
    console.log(`[EMAIL] Content: ${html}`);
    
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send:', error);
    return false;
  }
}

/**
 * Send verification code email
 */
export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: 'create_password' | 'link_google' | 'register' | 'reset_password'
): Promise<boolean> {
  const purposeText = {
    create_password: 'tạo mật khẩu',
    link_google: 'liên kết tài khoản Google',
    register: 'đăng ký tài khoản',
    reset_password: 'đặt lại mật khẩu',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background-color: #010a13;
          color: #f0e6d2;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0f1923;
          border: 1px solid rgba(200, 170, 110, 0.2);
          border-radius: 8px;
          padding: 40px;
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #c8aa6e;
          font-size: 24px;
          margin: 0;
        }
        .code {
          text-align: center;
          font-size: 48px;
          letter-spacing: 12px;
          color: #c8aa6e;
          background: rgba(200, 170, 110, 0.1);
          padding: 20px;
          border-radius: 8px;
          margin: 30px 0;
          font-weight: bold;
        }
        .message {
          color: #f0e6d2;
          line-height: 1.6;
          margin: 20px 0;
        }
        .warning {
          color: #ff4655;
          font-size: 14px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          color: #a09080;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid rgba(200, 170, 110, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>⬡ TFT FINDER</h1>
        </div>
        
        <div class="message">
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu ${purposeText[purpose]}. Mã xác thực của bạn là:</p>
        </div>
        
        <div class="code">${code}</div>
        
        <div class="message">
          <p>Mã này sẽ <strong>hết hạn sau 10 phút</strong>.</p>
          <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
        </div>
        
        <div class="warning">
          ⚠️ Không chia sẻ mã này với bất kỳ ai!
        </div>
        
        <div class="footer">
          <p>TFT Finder - Tìm Trận Đấu Trường Chân Lý</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Mã xác thực TFT Finder: ${code}`,
    html,
  });
}

/**
 * Send password created confirmation email
 */
export async function sendPasswordCreatedEmail(email: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background-color: #010a13;
          color: #f0e6d2;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0f1923;
          border: 1px solid rgba(200, 170, 110, 0.2);
          border-radius: 8px;
          padding: 40px;
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #c8aa6e;
          font-size: 24px;
          margin: 0;
        }
        .success {
          text-align: center;
          font-size: 48px;
          margin: 20px 0;
        }
        .message {
          color: #f0e6d2;
          line-height: 1.6;
          margin: 20px 0;
        }
        .methods {
          background: rgba(10, 200, 185, 0.1);
          border: 1px solid rgba(10, 200, 185, 0.3);
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .methods ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .methods li {
          color: #0ac8b9;
          margin: 8px 0;
        }
        .footer {
          text-align: center;
          color: #a09080;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid rgba(200, 170, 110, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>⬡ TFT FINDER</h1>
        </div>
        
        <div class="success">✅</div>
        
        <div class="message">
          <h2 style="color: #0ac8b9; text-align: center;">Mật khẩu đã được tạo thành công!</h2>
          <p>Tài khoản TFT Finder của bạn đã được cập nhật với mật khẩu mới.</p>
        </div>
        
        <div class="methods">
          <p><strong>Bạn có thể đăng nhập bằng:</strong></p>
          <ul>
            <li>Email và mật khẩu</li>
            <li>Google (nếu đã liên kết)</li>
          </ul>
        </div>
        
        <div class="message">
          <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
        </div>
        
        <div class="footer">
          <p>TFT Finder - Tìm Trận Đấu Trường Chân Lý</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Mật khẩu TFT Finder đã được tạo',
    html,
  });
}

/**
 * Send Google account linked confirmation email
 */
export async function sendGoogleLinkedEmail(email: string, googleEmail: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background-color: #010a13;
          color: #f0e6d2;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0f1923;
          border: 1px solid rgba(200, 170, 110, 0.2);
          border-radius: 8px;
          padding: 40px;
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #c8aa6e;
          font-size: 24px;
          margin: 0;
        }
        .success {
          text-align: center;
          font-size: 48px;
          margin: 20px 0;
        }
        .message {
          color: #f0e6d2;
          line-height: 1.6;
          margin: 20px 0;
        }
        .google-info {
          background: rgba(10, 200, 185, 0.1);
          border: 1px solid rgba(10, 200, 185, 0.3);
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .google-info p {
          margin: 8px 0;
          color: #0ac8b9;
        }
        .methods {
          background: rgba(200, 170, 110, 0.1);
          border: 1px solid rgba(200, 170, 110, 0.3);
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .methods ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .methods li {
          color: #c8aa6e;
          margin: 8px 0;
        }
        .footer {
          text-align: center;
          color: #a09080;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid rgba(200, 170, 110, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>⬡ TFT FINDER</h1>
        </div>
        
        <div class="success">✅</div>
        
        <div class="message">
          <h2 style="color: #0ac8b9; text-align: center;">Tài khoản Google đã được liên kết!</h2>
          <p>Tài khoản Google của bạn đã được liên kết thành công với TFT Finder.</p>
        </div>
        
        <div class="google-info">
          <p><strong>Tài khoản Google:</strong> ${googleEmail}</p>
        </div>
        
        <div class="methods">
          <p><strong>Bạn có thể đăng nhập bằng:</strong></p>
          <ul>
            <li>Google (${googleEmail})</li>
            <li>Email và mật khẩu (nếu đã tạo)</li>
          </ul>
        </div>
        
        <div class="message">
          <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
        </div>
        
        <div class="footer">
          <p>TFT Finder - Tìm Trận Đấu Trường Chân Lý</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Tài khoản Google đã được liên kết - TFT Finder',
    html,
  });
}

/**
 * Send welcome email for new registrations
 */
export async function sendWelcomeEmail(email: string, riotId: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background-color: #010a13;
          color: #f0e6d2;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #0f1923;
          border: 1px solid rgba(200, 170, 110, 0.2);
          border-radius: 8px;
          padding: 40px;
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #c8aa6e;
          font-size: 32px;
          margin: 0;
        }
        .welcome {
          text-align: center;
          font-size: 48px;
          margin: 20px 0;
        }
        .message {
          color: #f0e6d2;
          line-height: 1.6;
          margin: 20px 0;
        }
        .cta {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          background: linear-gradient(180deg, #c8aa6e 0%, #785a28 100%);
          color: #010a13;
          padding: 15px 40px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .footer {
          text-align: center;
          color: #a09080;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid rgba(200, 170, 110, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>⬡ TFT FINDER</h1>
        </div>
        
        <div class="welcome">🎮</div>
        
        <div class="message">
          <h2 style="color: #c8aa6e; text-align: center;">Chào mừng đến với TFT Finder!</h2>
          <p>Xin chào <strong>${riotId}</strong>,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản TFT Finder. Bạn đã sẵn sàng để tìm đủ 8 người chơi custom game Đấu Trường Chân Lý!</p>
        </div>
        
        <div class="cta">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/queue" class="button">
            Bắt đầu tìm trận →
          </a>
        </div>
        
        <div class="message">
          <p><strong>Tính năng nổi bật:</strong></p>
          <ul>
            <li>Tìm phòng custom game nhanh chóng</li>
            <li>Tạo phòng với luật chơi tùy chỉnh</li>
            <li>Chat với người chơi trong phòng</li>
            <li>Xác minh Riot ID để đảm bảo an toàn</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>TFT Finder - Tìm Trận Đấu Trường Chân Lý</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Chào mừng đến với TFT Finder! 🎮',
    html,
  });
}
